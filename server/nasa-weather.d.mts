import type { IncomingMessage, ServerResponse } from "node:http";
export const NASA_WEATHER_URL: string;
export function nasaWeather(req: IncomingMessage, res: ServerResponse, next: () => void): Promise<void>;
