import {
  ArrowUpRight,
  Gauge,
  RefreshCw,
  Thermometer,
  Radio,
} from "lucide-react";
import { useTelemetry } from "../hooks/useTelemetry";
import { NASA_WEATHER_URL } from "../lib/telemetry";
import { TiltCard } from "./TiltCard";

function value(number: number | null | undefined) {
  return number == null ? "—" : String(number).replace("-", "−");
}

function TemperatureRange({
  min,
  max,
}: {
  min: number | null | undefined;
  max: number | null | undefined;
}) {
  return (
    <div className="mt-8 grid grid-cols-2 gap-4">
      {[
        ["Low", min],
        ["High", max],
      ].map(([label, temperature]) => (
        <div key={String(label)}>
          <p className="mb-3 text-xs text-muted">{label}</p>
          <p className="whitespace-nowrap font-mono text-[32px] leading-none tracking-[-.035em] tabular-nums lg:text-[38px]">
            {value(temperature as number | null | undefined)}
            <span className="ml-1 text-sm text-muted">°C</span>
          </p>
          {temperature == null && (
            <p className="mt-3 text-xs text-muted">Not reported</p>
          )}
        </div>
      ))}
    </div>
  );
}

export function Telemetry() {
  const { reading, loading, error, refresh, checkedAt } = useTelemetry();
  const status = error
    ? "SOURCE UNAVAILABLE"
    : loading
      ? "CHECKING NASA"
      : "PUBLISHED OBSERVATIONS";
  return (
    <section
      id="telemetry"
      aria-labelledby="telemetry-title"
      className="relative overflow-hidden border-y border-white/[.07] bg-[#090807] py-24 sm:py-28"
    >
      <div className="page-width relative">
        <div
          data-scroll-heading
          className="mb-8 flex flex-col justify-between gap-6 sm:flex-row sm:items-end"
        >
          <div>
            <h2
              id="telemetry-title"
              className="text-[32px] leading-[1.2] font-light tracking-[-.035em] sm:text-5xl"
            >
              A pulse from
              <br />
              <span className="text-muted">another world.</span>
            </h2>
            <p className="mt-5 max-w-lg text-sm leading-7 text-muted">
              Measured on Mars by Curiosity. Air, ground and atmosphere at Gale
              crater, recorded by the REMS instrument.
            </p>
          </div>
          <p
            role="status"
            className="technical inline-flex w-fit shrink-0 items-center gap-2.5 rounded-full border border-copper/30 px-4 py-2.5 text-copper"
          >
            <Radio size={14} aria-hidden="true" />
            {status}
          </p>
        </div>

        <div className="mb-6 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 border-y border-white/10 py-4 text-sm">
          <p>
            {reading ? (
              <>
                <time dateTime={reading.observedAt}>
                  {new Date(reading.observedAt).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                    timeZone: "UTC",
                  })}
                </time>
                <span className="ml-3 font-mono text-copper">
                  SOL {reading.sol}
                </span>
              </>
            ) : (
              "Awaiting NASA observations"
            )}
          </p>
          <p className="text-xs text-muted">
            {error && reading
              ? "Last successfully retrieved record"
              : "Latest dated record in the source"}{" "}
            · Not a live feed
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-3" aria-busy={loading}>
          <TiltCard cursorMode="explore" className="glass-panel p-6 lg:p-7">
            <div className="flex items-center justify-between">
              <h3 className="text-sm text-muted">Air temperature</h3>
              <Thermometer
                size={19}
                strokeWidth={1.3}
                className="text-copper"
              />
            </div>
            <TemperatureRange min={reading?.airMinC} max={reading?.airMaxC} />
            <p className="mt-8 border-t border-white/10 pt-4 font-mono text-[10px] text-muted">
              REPORTED SOL MINIMUM / MAXIMUM
            </p>
          </TiltCard>
          <TiltCard cursorMode="explore" className="glass-panel p-6 lg:p-7">
            <div className="flex items-center justify-between">
              <h3 className="text-sm text-muted">Ground temperature</h3>
              <Thermometer
                size={19}
                strokeWidth={1.3}
                className="text-copper"
              />
            </div>
            <TemperatureRange
              min={reading?.groundMinC}
              max={reading?.groundMaxC}
            />
            <p className="mt-8 border-t border-white/10 pt-4 font-mono text-[10px] text-muted">
              REPORTED SOL MINIMUM / MAXIMUM
            </p>
          </TiltCard>
          <TiltCard cursorMode="explore" className="glass-panel p-6 lg:p-7">
            <div className="flex items-center justify-between">
              <h3 className="text-sm text-muted">Atmospheric pressure</h3>
              <Gauge size={19} strokeWidth={1.3} className="text-copper" />
            </div>
            <div className="mt-8">
              <p className="mb-3 text-xs text-muted">Reported pressure</p>
              <p className="font-mono text-[32px] leading-none tracking-[-.035em] tabular-nums lg:text-[38px]">
                {value(reading?.pressurePa)}
                <span className="ml-2 text-sm text-muted">Pa</span>
              </p>
              {reading && reading.pressurePa === null && (
                <p className="mt-3 text-xs text-muted">Not reported</p>
              )}
            </div>
            <p className="mt-8 border-t border-white/10 pt-4 font-mono text-[10px] text-muted">
              AT CURIOSITY'S LOCATION
            </p>
          </TiltCard>
        </div>

        <div className="mt-6 flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
          <div className="max-w-[650px] text-xs leading-6 text-muted">
            <a
              href={NASA_WEATHER_URL}
              target="_blank"
              rel="noreferrer"
              className="quiet-link text-copper"
            >
              Source: NASA / JPL · REMS / Centro de Astrobiología{" "}
              <ArrowUpRight size={13} />
            </a>
            <p className="mt-2">
              Real observations published for public outreach. Measurements are
              intermittent; missing values remain unreported. The Earth date
              corresponds to the sol's Martian midday.
            </p>
            {checkedAt && (
              <p className="mt-1">
                Source checked:{" "}
                <time dateTime={checkedAt}>
                  {new Date(checkedAt).toLocaleString("en-GB", {
                    timeZone: "UTC",
                  })}{" "}
                  UTC
                </time>
                . This is the retrieval time, not the measurement time.
              </p>
            )}
          </div>
          <button
            onClick={refresh}
            disabled={loading}
            className="button-secondary shrink-0 px-4 text-[11px]"
          >
            <RefreshCw
              size={13}
              className={
                loading ? "animate-spin motion-reduce:animate-none" : ""
              }
            />
            {loading ? "Checking source…" : "Refresh observations"}
          </button>
        </div>
        {error && (
          <p
            role="status"
            className="mt-4 rounded-xl border border-copper/30 bg-copper/5 p-4 text-sm text-copper"
          >
            {error}{" "}
            {reading
              ? "The last successful observation remains visible with its original date."
              : "No measurements are shown until the source is available."}
          </p>
        )}
      </div>
    </section>
  );
}
