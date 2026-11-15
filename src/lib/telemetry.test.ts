import { describe, expect, it } from "vitest";
import { coordinate, parseTelemetry } from "./telemetry";

// A captured NASA REMS row; tests never depend on the network or latest sol.
export const nasaRow = {
  sol: "4995",
  terrestrial_date: "2026-08-25",
  min_temp: "-71",
  max_temp: "-5",
  min_gts_temp: "-84",
  max_gts_temp: "4",
  pressure: "777",
};

describe("NASA REMS boundary", () => {
  it("preserves published units, air/ground distinction and observation date", () => {
    expect(parseTelemetry({ soles: [nasaRow] })).toEqual({
      airMinC: -71,
      airMaxC: -5,
      groundMinC: -84,
      groundMaxC: 4,
      pressurePa: 777,
      sol: 4995,
      observedAt: "2026-08-25",
    });
  });
  it("selects the newest sol regardless of feed ordering", () => {
    const earlier = { ...nasaRow, sol: "4994", terrestrial_date: "2026-08-24" };
    expect(parseTelemetry({ soles: [earlier, nasaRow, earlier] }).sol).toBe(
      4995,
    );
  });
  it.each([
    null,
    {},
    { soles: [] },
    { soles: [{ ...nasaRow, sol: "1.5" }] },
    { soles: [{ ...nasaRow, terrestrial_date: "2026-02-30" }] },
    { soles: [{ ...nasaRow, terrestrial_date: "2099-01-01" }] },
  ])("rejects a response without valid dated observations: %j", (input) => {
    expect(() => parseTelemetry(input)).toThrow();
  });
  it.each([
    "--",
    "",
    " ",
    null,
    undefined,
    "invalid",
    NaN,
    Infinity,
    {},
    99999,
  ])(
    "does not coerce missing or invalid measurements into zero: %j",
    (missing) => {
      const reading = parseTelemetry({
        soles: [{ ...nasaRow, min_temp: missing, pressure: missing }],
      });
      expect(reading.airMinC).toBeNull();
      expect(reading.pressurePa).toBeNull();
    },
  );
  it("retains legitimate zero temperatures and rejects inverted ranges", () => {
    expect(
      parseTelemetry({ soles: [{ ...nasaRow, max_temp: "0" }] }).airMaxC,
    ).toBe(0);
    const reading = parseTelemetry({
      soles: [{ ...nasaRow, min_temp: "10", max_temp: "-10" }],
    });
    expect(reading.airMinC).toBeNull();
    expect(reading.airMaxC).toBeNull();
  });
  it("does not fill a missing latest value with an older day's data", () => {
    const reading = parseTelemetry({
      soles: [
        { ...nasaRow, pressure: "--" },
        { ...nasaRow, sol: "4994" },
      ],
    });
    expect(reading.sol).toBe(4995);
    expect(reading.pressurePa).toBeNull();
  });
  it("formats both hemispheres without negative coordinate labels", () => {
    expect(coordinate(-14, "latitude")).toBe("14.0000° S");
    expect(coordinate(-133.8, "longitude")).toBe("133.8000° W");
  });
});
