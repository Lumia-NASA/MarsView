// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const html = readFileSync("aresnav-mars-main/frontend/index.html", "utf8");
const script = readFileSync("aresnav-mars-main/frontend/responsive.js", "utf8");
let resize: () => void;
let viewChange: () => void;
let media: { matches: boolean; addEventListener: ReturnType<typeof vi.fn> };
const button = (panel: string) => document.querySelector<HTMLButtonElement>(`[data-panel="${panel}"]`)!;
beforeEach(() => {
  document.body.innerHTML = html.match(/<body[^>]*>([\s\S]*)<\/body>/)![1].replace(/<script[\s\S]*?<\/script>/g, "");
  document.body.className = 'ge';
  media = { matches: true, addEventListener: vi.fn((_event, listener) => { resize = listener; }) };
  vi.stubGlobal('matchMedia', () => media);
  vi.stubGlobal('requestAnimationFrame', vi.fn());
  vi.stubGlobal('App', { on: (_event: string, listener: () => void) => { viewChange = listener; } });
  new Function(script)();
});
afterEach(() => { vi.unstubAllGlobals(); document.body.innerHTML = ''; });

describe('responsive mission panels', () => {
  it('starts with a clear map and opens only one panel at a time', () => {
    expect(document.body.dataset.compactPanel).toBe('');
    button('prepare').click();
    expect(document.body.dataset.compactPanel).toBe('prepare');
    expect(document.querySelector<HTMLElement>('#leftPanel')!.inert).toBe(false);
    button('plan').click();
    expect(document.body.dataset.compactPanel).toBe('plan');
    expect(button('prepare').getAttribute('aria-expanded')).toBe('false');
    expect(document.querySelector<HTMLElement>('#leftPanel')!.inert).toBe(true);
    expect(document.querySelector<HTMLElement>('#rightPanel')!.inert).toBe(false);
  });
  it('preserves the original simulation and map controls when changing screen sizes', () => {
    const slider = document.querySelector('#simSlider');
    const mapControls = document.querySelector('.mapctl');
    expect(mapControls?.parentElement?.id).toBe('compactTools');
    media.matches = false; resize();
    expect(mapControls?.parentElement).toBe(document.body);
    expect(document.querySelector('#simSlider')).toBe(slider);
    expect(document.body.classList.contains('left-collapsed')).toBe(false);
    media.matches = true; resize();
    expect(document.querySelector('.mapctl')).toBe(mapControls);
    expect(mapControls?.parentElement?.id).toBe('compactTools');
  });
  it('closes the sheet when the view changes and returns focus through its close button', () => {
    button('tools').focus(); button('tools').click();
    document.querySelector<HTMLButtonElement>('#compactTools .compact-close')!.click();
    expect(document.activeElement).toBe(button('tools'));
    button('simulation').click(); viewChange();
    expect(document.body.dataset.compactPanel).toBe('');
    expect(button('simulation').getAttribute('aria-expanded')).toBe('false');
  });
});
