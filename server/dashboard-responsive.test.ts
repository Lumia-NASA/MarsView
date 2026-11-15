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
  it('keeps the selected panel and original inputs across screen sizes', () => {
    button('layers').click();
    const layer = document.querySelector<HTMLInputElement>('#ov-slope')!;
    layer.checked = false;
    const mapControls = document.querySelector('.mapctl');
    expect(mapControls?.parentElement).toBe(document.body);
    media.matches = false; resize();
    expect(mapControls?.parentElement).toBe(document.body);
    expect(document.body.dataset.compactPanel).toBe('layers');
    expect(document.querySelector('#ov-slope')).toBe(layer);
    expect(layer.checked).toBe(false);
    media.matches = true; resize();
    expect(document.querySelector('.mapctl')).toBe(mapControls);
    expect(document.body.dataset.compactPanel).toBe('layers');
  });
  it('removes simulation controls from the visible and accessible workspace', () => {
    const dock = document.querySelector<HTMLElement>('.dock')!;
    expect(dock.hidden).toBe(true);
    expect(dock.inert).toBe(true);
    expect(document.querySelector('[data-panel="simulation"]')).toBeNull();
  });
  it('keeps view selection reachable through Tools on a phone', () => {
    vi.stubGlobal('innerWidth', 390);
    media.matches = true; resize();
    expect(document.querySelector('.opmode')?.closest('#compactTools')).not.toBeNull();
    button('tools').click();
    expect(document.querySelector<HTMLElement>('#compactTools')!.hidden).toBe(false);
    vi.stubGlobal('innerWidth', 1366);
    media.matches = false; resize();
    expect(document.querySelector('.opmode')?.parentElement?.className).toBe('workspace-toolbar');
  });
  it('closes the sheet when the view changes and returns focus through its close button', () => {
    button('tools').focus(); button('tools').click();
    document.querySelector<HTMLButtonElement>('#compactTools .compact-close')!.click();
    expect(document.activeElement).toBe(button('tools'));
    button('layers').click(); viewChange();
    expect(document.body.dataset.compactPanel).toBe('');
    expect(button('layers').getAttribute('aria-expanded')).toBe('false');
  });
});
