// Real WebGL regression: run with the dashboard server running (default Vite URL).
// node aresnav-mars-main/tests/helmet-navigation-test.cjs
// Optional: DASHBOARD_TEST_URL, CHROME_PATH, HELMET_SHOTS (an existing output directory).
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const puppeteer = require('../backend/node_modules/puppeteer-core');
const browserPath = [process.env.CHROME_PATH,
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  '/usr/bin/chromium', '/usr/bin/google-chrome',
].filter(Boolean).find(file => fs.existsSync(file));
const url = process.env.DASHBOARD_TEST_URL || 'http://127.0.0.1:5173/dashboard/';
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

(async () => {
  assert.ok(browserPath, 'Install Chrome/Edge or set CHROME_PATH');
  const browser = await puppeteer.launch({ executablePath: browserPath, headless: true,
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--mute-audio'] });
  const errors = [];
  try {
    const page = await browser.newPage();
    page.on('pageerror', error => errors.push(error.message));
    await page.setViewport({ width: 1366, height: 650 });
    // Hold the panorama index to exercise leaving before asynchronous entry finishes.
    let delayed;
    await page.setRequestInterception(true);
    page.on('request', request => {
      if (request.url().endsWith('/data/pano/index.json') && !delayed) delayed = request;
      else void request.continue();
    });
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => typeof App !== 'undefined' && App.state.ready && App.globe.viewer, { timeout: 60000 });
    await page.evaluate(() => {
      window.helmetRenderErrors = [];
      App.globe.viewer.scene.renderError.addEventListener((_scene, error) => helmetRenderErrors.push(error.message));
      window.helmetFrames = 0;
      App.globe.viewer.scene.postRender.addEventListener(() => helmetFrames++);
    });
    const state = () => page.evaluate(() => {
      const v = App.globe.viewer, c = v.camera;
      return { view: App.state.view, walk: App.globe.walk.on,
        parent: document.querySelector('#globe').parentElement.id,
        inputs: v.scene.screenSpaceCameraController.enableInputs, loop: v.useDefaultRenderLoop,
        position: [c.positionWC.x, c.positionWC.y, c.positionWC.z],
        direction: [c.directionWC.x, c.directionWC.y, c.directionWC.z],
        finite: [c.position.x, c.position.y, c.position.z, c.frustum.fov, c.frustum.aspectRatio].every(Number.isFinite),
        frames: helmetFrames, errors: helmetRenderErrors.slice(),
      };
    });
    async function healthy(label) {
      const before = await state(); await sleep(450); const s = await state();
      assert.equal(s.view, 'globe', label);
      assert.equal(s.parent, 'view-globe', label);
      assert.equal(s.walk, false, label); assert.equal(s.inputs, true, label);
      assert.equal(s.finite, true, label); assert.equal(s.loop, true, label);
      assert.ok(s.frames > before.frames, label + ': render loop must advance');
      assert.deepEqual(s.errors, [], label);
    }
    async function mode(name, mobile) {
      if (mobile) await page.click('[data-panel="tools"]');
      await page.click(`[data-op="${name}"]`);
      await sleep(350);
    }
    // A pending drop must not move the shared renderer into a now-hidden helmet.
    await page.evaluate(() => { App.helmet.dropAt(18.462, 77.415); App.setView('globe'); });
    assert.ok(delayed, 'Panorama request was intercepted'); await delayed.continue();
    await sleep(900); await healthy('cancelled asynchronous helmet entry');
    console.log('PASS delayed entry cancellation');

    for (const [width, height] of [[1366, 650], [390, 844]]) {
      const mobile = width < 481;
      await page.setViewport({ width, height }); await sleep(350);
      for (let cycle = 0; cycle < 3; cycle++) {
        await mode('helmet', mobile);
        assert.equal((await state()).finite, true, 'Hidden camera must stay finite');
        await mode('planner', mobile); await healthy(`${width}: photo return ${cycle}`);
      }
      // Use an intentionally chosen orbit, then retain it through terrain entry/exit.
      await page.click('#ctlIn'); await sleep(250);
      const original = await state();
      await mode('helmet', mobile);
      await page.click('[data-panel="tools"]');
      await page.click('[data-mode="terrain"]');
      await page.waitForFunction(() => App.globe.walk.on);
      await sleep(600);
      // Tools is already open here; both desktop and mobile mode selectors are reachable.
      await page.click('[data-op="planner"]'); await healthy(`${width}: terrain return`);
      const restored = await state();
      const distance = Math.hypot(...original.position.map((x, i) => x - restored.position[i]));
      assert.ok(distance < 1, `Saved orbit restored (difference ${distance}m)`);
      assert.ok(original.direction.every((x, i) => Math.abs(x - restored.direction[i]) < 1e-6), `Saved orientation restored: ${JSON.stringify({ original: original.direction, restored: restored.direction })}`);
      // Pointer input must actually change the camera, beyond an enabled flag.
      const bounds = await page.$eval('#globe', e => { const r = e.getBoundingClientRect(); return { x:r.x, y:r.y, w:r.width, h:r.height }; });
      await page.mouse.move(bounds.x + bounds.w * .5, bounds.y + bounds.h * .5);
      await page.mouse.down(); await page.mouse.move(bounds.x + bounds.w * .65, bounds.y + bounds.h * .55, { steps: 14 });
      await page.mouse.up(); await sleep(450);
      const dragged = await state();
      assert.ok(Math.hypot(...dragged.position.map((x, i) => x - restored.position[i])) > 10, 'Dragging rotates Mars after helmet exit');
      await healthy(`${width}: pointer interaction`);
      if (process.env.HELMET_SHOTS) await page.screenshot({ path: path.join(process.env.HELMET_SHOTS, `helmet-fixed-${width}.png`) });
      console.log(`PASS ${width}: repeated photo/terrain transitions, saved camera and pointer controls`);
    }
    // Resize while hidden, and leave terrain through the photo and 2D views.
    await page.evaluate(() => App.setView('helmet'));
    await page.setViewport({ width: 844, height: 390 }); await sleep(300);
    await page.evaluate(() => App.setView('globe')); await healthy('hidden resize');
    await page.evaluate(() => App.helmet.dropAt(18.462, 77.415));
    await page.waitForFunction(() => App.globe.walk.on);
    await page.evaluate(() => document.querySelector('[data-mode="photo"]').click()); await sleep(300);
    assert.equal((await state()).finite, true);
    await page.evaluate(() => App.setView('map')); await sleep(150);
    await page.evaluate(() => App.setView('globe')); await healthy('terrain to photo to map to globe');
    assert.deepEqual(errors, [], 'No browser exceptions');
    console.log('PASS hidden resize and alternate exit paths; no render errors');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
