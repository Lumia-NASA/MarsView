import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { describe, expect, it } from 'vitest';

type Point = { lat: number; lon: number };
const context: any = {};
runInNewContext(readFileSync('aresnav-mars-main/frontend/navigation-core.js', 'utf8'), context);
const navigation = context.MarsNavigation;

describe('planetary directions', () => {
  it('validates coordinates and normalizes east and west longitudes', () => {
    const point = navigation.coordinate('18.45, 77.40');
    expect(point.lat).toBe(18.45);
    expect(point.lon).toBeCloseTo(77.4, 10);
    expect(navigation.coordinate('-90; -359')).toEqual({ lat: -90, lon: 1 });
    for (const input of ['91, 0', '0, 361', 'NaN, 20', 'Olympus', '1, 2, 3']) expect(navigation.coordinate(input)).toBeNull();
  });
  it('crosses the date line along the short arc, including the 2D world copy', () => {
    const path = navigation.shortest({ lat: 0, lon: 179 }, { lat: 0, lon: -179 });
    const length = path.slice(1).reduce((sum: number, p: Point, i: number) => sum + navigation.distance(path[i], p), 0);
    expect(length).toBeCloseTo(3389500 * Math.PI / 90, 4);
    const unwrapped = navigation.unwrap(path);
    expect(unwrapped.at(-1)[1]).toBeCloseTo(181);
    expect(unwrapped.every((p: number[], i: number) => i === 0 || Math.abs(p[1] - unwrapped[i - 1][1]) < 2)).toBe(true);
  });
  it.each([
    [{ lat: 90, lon: 0 }, { lat: -90, lon: 0 }],
    [{ lat: 0, lon: 0 }, { lat: 0, lon: 180 }],
    [{ lat: 89.9, lon: 170 }, { lat: 89.9, lon: -170 }],
    [{ lat: -20, lon: 179.5 }, { lat: -21, lon: -179.5 }],
  ])('keeps antipodal, polar and date-line terrain routes finite', (start, end) => {
    const path = navigation.terrainRoute(start, end, () => 0);
    expect(path[0]).toEqual(start);
    expect(path.at(-1)).toEqual(end);
    expect(path.every((p: Point) => Number.isFinite(p.lat) && Number.isFinite(p.lon) && Math.abs(p.lat) <= 90)).toBe(true);
  });
  it('routes around a steep ridge instead of following the direct line', () => {
    const elevation = (lat: number, lon: number) => Math.abs(lon) < .025 && Math.abs(lat) < .04 ? 4000 : 0;
    const path = navigation.terrainRoute({ lat: 0, lon: -.2 }, { lat: 0, lon: .2 }, elevation);
    expect(path.some((p: Point) => Math.abs(p.lat) >= .04)).toBe(true);
    expect(path.every((p: Point) => elevation(p.lat, p.lon) === 0)).toBe(true);
  });
  it('rejects unavailable terrain instead of treating missing heights as flat land', () => {
    expect(() => navigation.terrainRoute({ lat: 0, lon: 0 }, { lat: 1, lon: 1 }, () => NaN)).toThrow('Elevation');
  });
});
