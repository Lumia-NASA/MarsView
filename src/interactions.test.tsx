// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import { useTelemetry } from "./hooks/useTelemetry";

vi.mock("./components/MarsGlobe", () => ({
  default: ({
    zoom = 1,
    grid,
    region,
    paused = false,
    allowMotion = false,
  }: {
    zoom?: number;
    grid?: boolean;
    region?: { name: string };
    paused?: boolean;
    allowMotion?: boolean;
  }) => (
    <div
      data-testid="globe"
      data-zoom={zoom}
      data-grid={grid}
      data-paused={paused}
      data-motion-enabled={allowMotion}
    >
      {region?.name}
    </div>
  ),
}));

let root: Root;
let container: HTMLDivElement;
beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  window.history.replaceState(null, "", "/");
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn(() => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  });
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
  window.scrollTo = vi.fn();
  Element.prototype.scrollIntoView = vi.fn();
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

async function click(selector: string) {
  const element = container.querySelector<HTMLElement>(selector);
  expect(element, selector).not.toBeNull();
  await act(async () => element!.click());
}

describe("landing interactions", () => {
  it("keeps hero motion active without pause or motion toggles", async () => {
    vi.mocked(window.matchMedia).mockImplementation(
      (query) =>
        ({
          matches: query.includes("prefers-reduced-motion"),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
        }) as unknown as MediaQueryList,
    );
    await act(async () => root.render(<App />));
    const globe = container.querySelector('#home [data-testid="globe"]');
    expect(globe?.getAttribute("data-paused")).toBe("false");
    expect(globe?.getAttribute("data-motion-enabled")).toBe("true");
    expect(
      container.querySelector('[aria-label="Pause globe rotation"]'),
    ).toBeNull();
    expect(container.querySelector(".experience-toggle")).toBeNull();
  });
  it("opens and closes mobile navigation with accessible state", async () => {
    await act(async () => root.render(<App />));
    await click('[aria-label="Open navigation"]');
    expect(
      container
        .querySelector('[aria-controls="mobile-navigation"]')
        ?.getAttribute("aria-expanded"),
    ).toBe("true");
    await act(async () =>
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" })),
    );
    expect(container.querySelector("#mobile-navigation")).toBeNull();
  });
  it("switches the surface preview and pauses the ticker", async () => {
    await act(async () => root.render(<App />));
    const inspect = Array.from(container.querySelectorAll("button")).find(
      (button) => button.textContent?.includes("Inspect the surface"),
    )!;
    await act(async () => inspect.click());
    expect(inspect.textContent).toContain("Return to panorama");
    await click('[aria-label="Pause mission ticker"]');
    expect(
      container
        .querySelector('[aria-label="Resume mission ticker"]')
        ?.getAttribute("aria-pressed"),
    ).toBe("true");
  });
  it("keeps dashboard links without rendering the removed explorer", async () => {
    await act(async () => root.render(<App />));
    expect(container.querySelectorAll('a[href="/dashboard/"]').length).toBeGreaterThan(0);
    expect(container.querySelectorAll('a[href^="#explorer"]')).toHaveLength(0);
    await act(async () => {
      window.history.pushState(null, "", "#explorer/olympus");
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    });
    expect(container.querySelector("#hero-title")?.textContent).toBe(
      "MARSVIEW",
    );
    expect(document.title).toBe("MarsView — A new perspective on Mars");
  });
});

function TelemetryProbe() {
  const state = useTelemetry();
  return (
    <div>
      <output>
        {JSON.stringify({
          reading: state.reading,
          error: state.error,
          loading: state.loading,
          checkedAt: state.checkedAt,
        })}
      </output>
      <button onClick={state.refresh}>Refresh</button>
    </div>
  );
}
const readState = () =>
  JSON.parse(container.querySelector("output")!.textContent!);

const nasaFeed = {
  soles: [
    {
      sol: "4995",
      terrestrial_date: "2026-08-25",
      min_temp: "-71",
      max_temp: "-5",
      min_gts_temp: "-84",
      max_gts_temp: "4",
      pressure: "777",
    },
  ],
};

describe("telemetry lifecycle", () => {
  it("fetches real NASA data by default without a key", async () => {
    vi.stubEnv("VITE_TELEMETRY_URL", "");
    const fetcher = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => nasaFeed });
    vi.stubGlobal("fetch", fetcher);
    await act(async () => root.render(<TelemetryProbe />));
    expect(fetcher.mock.calls[0][0]).toBe(
      "/api/mars-weather",
    );
    expect(readState().reading.sol).toBe(4995);
    expect(readState().checkedAt).not.toBeNull();
  });
  it("retains the last sourced reading and its date after a failed refresh", async () => {
    vi.stubEnv("VITE_TELEMETRY_URL", "/api/telemetry");
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => nasaFeed })
      .mockRejectedValueOnce(new Error("offline"));
    vi.stubGlobal("fetch", fetcher);
    await act(async () => root.render(<TelemetryProbe />));
    const before = readState();
    await click("button");
    expect(readState().error).toContain("could not be refreshed");
    expect(readState().reading).toEqual(before.reading);
    expect(readState().checkedAt).toBe(before.checkedAt);
    expect(readState().loading).toBe(false);
  });
  it("shows no invented fallback when the initial request fails and allows retry", async () => {
    const fetcher = vi
      .fn()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce({ ok: true, json: async () => nasaFeed });
    vi.stubGlobal("fetch", fetcher);
    await act(async () => root.render(<TelemetryProbe />));
    expect(readState().reading).toBeNull();
    expect(readState().error).toBeTruthy();
    await click("button");
    expect(readState().reading.pressurePa).toBe(777);
    expect(readState().error).toBeNull();
  });
  it("aborts a pending request on unmount", async () => {
    const fetcher = vi.fn().mockImplementation(() => new Promise(() => {}));
    vi.stubGlobal("fetch", fetcher);
    await act(async () => root.render(<TelemetryProbe />));
    const signal = fetcher.mock.calls[0][1].signal;
    await act(async () => root.render(<div />));
    expect(signal.aborted).toBe(true);
  });
});
