import { EventEmitter } from "node:events";
import type { IncomingMessage, ServerResponse } from "node:http";
import { afterEach, describe, expect, it, vi } from "vitest";
import { nasaWeather, NASA_WEATHER_URL } from "./nasa-weather.mjs";

afterEach(() => vi.unstubAllGlobals());

async function request(method = "GET", url = "/api/mars-weather") {
  const response = Object.assign(new EventEmitter(), {
    destroyed: false, writableEnded: false,
    setHeader: vi.fn(), writeHead: vi.fn().mockReturnThis(), end: vi.fn(),
  });
  const next = vi.fn();
  await nasaWeather({ method, url } as IncomingMessage, response as unknown as ServerResponse, next);
  return { response, next };
}

describe("NASA server route", () => {
  it("uses a fixed NASA upstream and preserves the published response", async () => {
    const payload = { soles: [{ sol: "4995", pressure: "777" }] };
    const fetcher = vi.fn().mockResolvedValue({ ok: true, json: async () => payload });
    vi.stubGlobal("fetch", fetcher);
    const { response } = await request("GET", "/api/mars-weather?url=https://example.com");
    expect(fetcher.mock.calls[0][0]).toBe(NASA_WEATHER_URL);
    expect(response.writeHead).toHaveBeenCalledWith(200);
    expect(JSON.parse(response.end.mock.calls[0][0])).toEqual(payload);
  });
  it.each([
    { ok: false, status: 503 },
    { ok: true, json: async () => ({ soles: [] }) },
    { ok: true, json: async () => { throw new Error("invalid JSON"); } },
  ])("returns an error without fallback measurements on upstream failure", async result => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(result));
    const { response } = await request();
    expect(response.writeHead).toHaveBeenCalledWith(502);
    expect(JSON.parse(response.end.mock.calls[0][0])).toEqual({ error: "NASA observations are temporarily unavailable." });
  });
  it("rejects writes and passes unrelated routes to the asset server", async () => {
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    expect((await request("POST")).response.writeHead).toHaveBeenCalledWith(405);
    expect((await request("GET", "/")).next).toHaveBeenCalledOnce();
    expect(fetcher).not.toHaveBeenCalled();
  });
});
