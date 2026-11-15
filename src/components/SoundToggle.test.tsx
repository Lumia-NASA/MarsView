// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SoundToggle } from "./SoundToggle";

const soundState = vi.hoisted(() => {
  let muted = false;
  return {
    isMuted: vi.fn(() => muted),
    getError: vi.fn(() => null),
    mount: vi.fn(() => () => {}),
    subscribe: vi.fn(() => () => {}),
    toggleMute: vi.fn(() => {
      muted = !muted;
      return muted;
    }),
  };
});

vi.mock("../lib/sound", () => ({ sound: soundState }));

let root: Root;
let container: HTMLDivElement;

beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.clearAllMocks();
});

describe("SoundToggle", () => {
  it("updates the visible state immediately when the mute setting changes", async () => {
    await act(async () => root.render(<SoundToggle />));
    const button = container.querySelector("button")!;
    expect(button.textContent).toContain("AUDIO: ON");

    await act(async () => button.click());
    expect(button.textContent).toContain("AUDIO: OFF");
    expect(button.getAttribute("aria-pressed")).toBe("false");

    await act(async () => button.click());
    expect(button.textContent).toContain("AUDIO: ON");
    expect(button.getAttribute("aria-pressed")).toBe("true");
  });
});
