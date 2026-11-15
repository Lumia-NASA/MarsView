/* Map-first workspace. Reuse the mission inputs and their existing handlers. */
(function () {
  'use strict';
  const body = document.body;
  const compact = matchMedia('(max-width: 700px), (max-height: 500px)');
  const $ = selector => document.querySelector(selector);
  const text = (en, pt) => window.LANG === 'en' ? en : pt;
  let active = null, previousFocus = null;
  const left = $('#leftPanel'), right = $('#rightPanel');
  // Legacy calculation modules still update these nodes. They are not workspace UI.
  $('.dock').hidden = true;
  $('.dock').inert = true;
  body.classList.add('map-workspace');
  const toolbar = document.createElement('div');
  toolbar.className = 'workspace-toolbar';
  toolbar.append($('.search'), $('.opmode'));
  $('.topbar').after(toolbar);
  const context = document.createElement('span');
  context.className = 'workspace-context';
  context.textContent = text('Mars explorer', 'Explorador de Marte');
  $('.brand').after(context);
  const menuButton = document.createElement('button');
  menuButton.type = 'button'; menuButton.className = 'compact-menu pillbtn';
  menuButton.textContent = 'Menu';
  menuButton.setAttribute('aria-expanded', 'false');
  menuButton.setAttribute('aria-controls', 'dashboardActions');
  $('.topactions').id = 'dashboardActions';
  $('.topbar').append(menuButton);
  function makePanel(id, titleText) {
    const panel = document.createElement('section');
    panel.id = id; panel.className = 'workspace-panel';
    const header = document.createElement('header'); header.className = 'sidehead';
    const title = document.createElement('h2'); title.textContent = titleText;
    header.append(title);
    const content = document.createElement('div'); content.className = 'sidebody';
    panel.append(header, content); body.append(panel);
    return panel;
  }
  const layers = makePanel('layersPanel', text('Map layers', 'Camadas do mapa'));
  layers.querySelector('.sidebody').append(left.querySelectorAll('.block')[1]);
  const tools = makePanel('compactTools', text('Map tools', 'Ferramentas do mapa'));
  const toolsBody = tools.querySelector('.sidebody');
  const modes = $('.opmode');
  toolsBody.append($('#basePick'));
  const hint = document.createElement('p'); hint.className = 'tools-note';
  hint.textContent = text('Drag to explore. Scroll to zoom. Use the compass to face north.', 'Arraste para explorar. Role para aproximar. Use a bússola para orientar ao norte.');
  toolsBody.append(hint);
  const helmetTools = document.createElement('div'); helmetTools.className = 'compact-helmet-tools';
  toolsBody.append(helmetTools);
  ['.hud-target', '.hud-source', '.hud-sols', '.hud-fx', '.hud-hint'].forEach(selector => {
    const node = $(selector); if (node) helmetTools.append(node);
  });
  left.querySelector('h2').textContent = text('Mission setup', 'Preparar missão');
  left.querySelector('.sub').textContent = text('Readiness, payload and destination', 'Condições, carga e destino');
  right.querySelector('h2').textContent = text('Route plan', 'Plano da rota');
  right.querySelector('.sub').textContent = text('Terrain, timing and route conditions', 'Terreno, horários e condições da rota');
  const panels = { prepare: left, layers, plan: right, tools };
  const labels = { prepare: text('Mission', 'Missão'), layers: text('Layers', 'Camadas'), plan: text('Route', 'Rota'), tools: text('Tools', 'Ajustes') };
  const paths = {
    prepare: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V2h6v2M9 10h6M9 15h6"/>',
    layers: '<path d="m12 3 9 5-9 5-9-5 9-5ZM3 12l9 5 9-5M3 16l9 5 9-5"/>',
    plan: '<circle cx="6" cy="6" r="3"/><circle cx="18" cy="18" r="3"/><path d="M9 6h6a4 4 0 0 1 0 8H9a4 4 0 0 0-4 4h10"/>',
    tools: '<path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="3"/><circle cx="15" cy="17" r="3"/>'
  };
  const nav = document.createElement('nav'); nav.className = 'compact-nav';
  nav.setAttribute('aria-label', text('Workspace panels', 'Painéis do mapa'));
  const buttons = {};
  for (const [name, panel] of Object.entries(panels)) {
    const button = document.createElement('button'); button.type = 'button'; button.dataset.panel = name;
    button.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true">' + paths[name] + '</svg><span></span>';
    button.querySelector('span').textContent = labels[name];
    button.setAttribute('aria-controls', panel.id); button.setAttribute('aria-expanded', 'false');
    button.onclick = () => open(active === name ? null : name);
    nav.append(button); buttons[name] = button;
    const close = document.createElement('button'); close.type = 'button'; close.className = 'compact-close';
    close.setAttribute('aria-label', text('Close panel', 'Fechar painel'));
    close.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg>';
    close.onclick = () => open(null, true);
    panel.querySelector('header').append(close);
  }
  body.append(nav);
  const drawers = [['#dataDrawer', '#dataClose'], ['#poiDrawer', '#poiClose'], ['#ares', '#aresClose'], ['#truth', '#truthClose']];
  function menu(show) {
    body.classList.toggle('compact-menu-open', show);
    menuButton.setAttribute('aria-expanded', String(show));
    menuButton.textContent = show ? text('Close', 'Fechar') : 'Menu';
    $('.topactions').inert = (innerWidth <= 1100 || innerHeight <= 500) && !show;
  }
  function open(name, returnFocus = false) {
    menu(false);
    if (name) {
      drawers.forEach(([panel, close]) => { if ($(panel) && !$(panel).hidden) $(close)?.click(); });
      if (App.state?.view === 'telemetry') App.setView('globe');
      if (!active) previousFocus = document.activeElement;
    }
    active = name;
    body.dataset.compactPanel = name || '';
    body.classList.toggle('workspace-panel-open', !!name);
    body.classList.toggle('left-collapsed', name !== 'prepare');
    body.classList.toggle('right-collapsed', name !== 'plan');
    for (const [key, panel] of Object.entries(panels)) {
      panel.inert = name !== key; panel.hidden = name !== key;
      buttons[key].setAttribute('aria-expanded', String(name === key));
    }
    if (name) panels[name].querySelector('.compact-close').focus({ preventScroll: true });
    else if (returnFocus && previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
    requestAnimationFrame(() => window.dispatchEvent(new Event('resize')));
  }
  menuButton.onclick = () => { const show = !body.classList.contains('compact-menu-open'); open(null); menu(show); };
  $('.topactions').addEventListener('click', event => { if (event.target.closest('button')) menu(false); });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') { open(null, true); menu(false); }
  });
  document.addEventListener('pointerdown', event => {
    if (body.classList.contains('compact-menu-open') && !event.target.closest('.topbar')) menu(false);
  });
  const observer = new MutationObserver(() => {
    if (active && drawers.some(([selector]) => $(selector) && !$(selector).hidden)) open(null);
  });
  drawers.forEach(([selector]) => { if ($(selector)) observer.observe($(selector), { attributes: true, attributeFilter: ['hidden'] }); });
  App.on('view', () => { open(null); menu(false); });
  function adapt() {
    body.classList.toggle('compact-layout', compact.matches);
    const modeParent = innerWidth <= 480 ? toolsBody : toolbar;
    if (modes.parentElement !== modeParent) modeParent === toolbar ? toolbar.append(modes) : toolsBody.prepend(modes);
    // Preserve selection and the user's inputs while resizing the window.
    menu(false);
  }
  compact.addEventListener('change', adapt);
  window.addEventListener('resize', () => {
    const modeParent = innerWidth <= 480 ? toolsBody : toolbar;
    if (modes.parentElement !== modeParent) modeParent === toolbar ? toolbar.append(modes) : toolsBody.prepend(modes);
    $('.topactions').inert = (innerWidth <= 1100 || innerHeight <= 500) && !body.classList.contains('compact-menu-open');
  });
  App.workspace = { open };
  open(null); adapt();
})();
