export const NASA_WEATHER_URL =
  "https://mars.nasa.gov/rss/api/?feed=weather&category=msl&feedtype=json";

export interface TelemetryReading {
  airMinC: number | null;
  airMaxC: number | null;
  groundMinC: number | null;
  groundMaxC: number | null;
  pressurePa: number | null;
  sol: number;
  observedAt: string;
}

function measurement(value: unknown, min: number, max: number): number | null {
  if (value == null || value === "--" || value === "") return null;
  if (typeof value !== "number" && typeof value !== "string") return null;
  if (typeof value === "string" && !/^-?\d+(\.\d+)?$/.test(value.trim()))
    return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= min && number <= max
    ? number
    : null;
}

// Preserve missing fields in the newest sol; never borrow older measurements.
export function parseTelemetry(input: unknown): TelemetryReading {
  if (
    !input ||
    typeof input !== "object" ||
    !("soles" in input) ||
    !Array.isArray(input.soles)
  )
    throw new Error("Invalid NASA REMS response.");
  let latest: TelemetryReading | null = null;
  for (const row of input.soles) {
    if (!row || typeof row !== "object") continue;
    const sol = measurement(row.sol, 0, 100000);
    const date = row.terrestrial_date;
    if (
      sol === null ||
      !Number.isInteger(sol) ||
      typeof date !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(date)
    )
      continue;
    const time = Date.parse(date);
    if (
      !Number.isFinite(time) ||
      new Date(time).toISOString().slice(0, 10) !== date ||
      time > Date.now()
    )
      continue;
    if (latest && latest.sol >= sol) continue;
    const airMinC = measurement(row.min_temp, -160, 60);
    const airMaxC = measurement(row.max_temp, -160, 60);
    const groundMinC = measurement(row.min_gts_temp, -160, 80);
    const groundMaxC = measurement(row.max_gts_temp, -160, 80);
    const airInvalid =
      airMinC !== null && airMaxC !== null && airMinC > airMaxC;
    const groundInvalid =
      groundMinC !== null && groundMaxC !== null && groundMinC > groundMaxC;
    latest = {
      airMinC: airInvalid ? null : airMinC,
      airMaxC: airInvalid ? null : airMaxC,
      groundMinC: groundInvalid ? null : groundMinC,
      groundMaxC: groundInvalid ? null : groundMaxC,
      pressurePa: measurement(row.pressure, 1, 2000),
      sol,
      observedAt: date,
    };
  }
  if (!latest)
    throw new Error("No dated NASA REMS observations were returned.");
  return latest;
}

export function coordinate(value: number, axis: "latitude" | "longitude") {
  return `${Math.abs(value).toFixed(4)}° ${axis === "latitude" ? (value < 0 ? "S" : "N") : value < 0 ? "W" : "E"}`;
}
