/* Responsive shell: preserve mission controls, reveal one panel at a time. */
(function () {
  'use strict';
  const body = document.body;
  const compact = matchMedia('(max-width: 1100px), (max-height: 600px)');
  const $ = selector => document.querySelector(selector);
  const english = () => window.LANG === 'en';
  const text = (en, pt) => english() ? en : pt;
  let active = null;
  let previousFocus = null;
  const left = $('#leftPanel'), right = $('#rightPanel'), dock = $('.dock');
  const mapControls = $('.mapctl'), base = $('#basePick');
  const controlsHome = document.createComment('map controls');
  const baseHome = document.createComment('base picker');
  mapControls.before(controlsHome); base.before(baseHome);
  dock.id = 'simulationPanel';

  const menuButton = document.createElement('button');
  menuButton.type = 'button'; menuButton.className = 'compact-menu pillbtn';
  menuButton.textContent = text('Menu', 'Menu');
  menuButton.setAttribute('aria-expanded', 'false');
  menuButton.setAttribute('aria-controls', 'dashboardActions');
  $('.topactions').id = 'dashboardActions';
  $('.topbar').append(menuButton);

  const tools = document.createElement('section');
  tools.id = 'compactTools'; tools.className = 'compact-tools';
  const toolsHeader = document.createElement('header');
  const title = document.createElement('h2'); title.textContent = text('Map tools', 'Ferramentas do mapa');
  toolsHeader.append(title); tools.append(toolsHeader); body.append(tools);
  const helmetTools = document.createElement('div'); helmetTools.className = 'compact-helmet-tools';
  tools.append(helmetTools);
  const helmetControls = ['.hud-target', '.hud-source', '.hud-sols', '.hud-fx', '.hud-hint'].map(selector => {
    const node = $(selector);
    if (!node) return null;
    const home = document.createComment('helmet control'); node.before(home);
    return { node, home };
  }).filter(Boolean);
  const simulationHeader = document.createElement('header'); simulationHeader.className = 'compact-sheet-heading';
  const simulationTitle = document.createElement('h2'); simulationTitle.textContent = text('Walk simulation', 'Simulação da caminhada');
  simulationHeader.append(simulationTitle); dock.prepend(simulationHeader);

  const backdrop = document.createElement('button');
  backdrop.type = 'button'; backdrop.className = 'compact-backdrop'; backdrop.hidden = true;
  backdrop.tabIndex = -1; backdrop.setAttribute('aria-label', text('Close panel', 'Fechar painel')); body.append(backdrop);
  const nav = document.createElement('nav'); nav.className = 'compact-nav';
  nav.setAttribute('aria-label', text('Mission panels', 'Painéis da missão'));
  const panels = { prepare: left, plan: right, simulation: dock, tools };
  const labels = { prepare: text('Prepare', 'Preparar'), plan: text('Plan', 'Plano'), simulation: text('Simulation', 'Simulação'), tools: text('Tools', 'Ferramentas') };
  const buttons = {};
  for (const [name, panel] of Object.entries(panels)) {
    const button = document.createElement('button'); button.type = 'button';
    button.textContent = labels[name]; button.dataset.panel = name;
    button.setAttribute('aria-controls', panel.id); button.setAttribute('aria-expanded', 'false');
    button.onclick = () => open(active === name ? null : name);
    nav.append(button); buttons[name] = button;
    const close = document.createElement('button'); close.type = 'button'; close.className = 'compact-close';
    close.setAttribute('aria-label', text('Close panel', 'Fechar painel'));
    close.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>';
    close.onclick = () => open(null, true);
    (panel.querySelector('header') || panel).append(close);
  }
  body.append(nav);

  function menu(show) {
    body.classList.toggle('compact-menu-open', show);
    menuButton.setAttribute('aria-expanded', String(show));
    menuButton.textContent = show ? text('Close', 'Fechar') : 'Menu';
    $('.topactions').inert = compact.matches && !show;
  }
  function open(name, returnFocus = false) {
    if (!compact.matches) return;
    menu(false);
    if (name) {
      for (const [panel, close] of [['#dataDrawer', '#dataClose'], ['#poiDrawer', '#poiClose'], ['#ares', '#aresClose'], ['#truth', '#truthClose']]) {
        if ($(panel) && !$(panel).hidden) $(close)?.click();
      }
    }
    if (name && !active) previousFocus = document.activeElement;
    active = name;
    body.dataset.compactPanel = name || '';
    backdrop.hidden = !name;
    body.classList.toggle('left-collapsed', name !== 'prepare');
    body.classList.toggle('right-collapsed', name !== 'plan');
    for (const [key, panel] of Object.entries(panels)) {
      panel.inert = name !== key;
      buttons[key].setAttribute('aria-expanded', String(name === key));
    }
    if (name) panels[name].querySelector('.compact-close').focus({ preventScroll: true });
    else if (returnFocus && previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
    requestAnimationFrame(() => window.dispatchEvent(new Event('resize')));
  }
  menuButton.onclick = () => { const show = !body.classList.contains('compact-menu-open'); open(null); menu(show); };
  backdrop.onclick = () => open(null, true);
  $('.topactions').addEventListener('click', event => { if (event.target.closest('button')) menu(false); });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && compact.matches) { open(null, true); menu(false); }
  });
  // Secondary dialogs retain their own controls and close the small-screen sheet.
  const observer = new MutationObserver(() => {
    if (compact.matches && ['#dataDrawer', '#poiDrawer', '#ares', '#truth'].some(selector => {
      const node = $(selector); return node && !node.hidden;
    }) && active) open(null);
  });
  ['#dataDrawer', '#poiDrawer', '#ares', '#truth'].forEach(selector => {
    const node = $(selector); if (node) observer.observe(node, { attributes: true, attributeFilter: ['hidden'] });
  });
  App.on('view', () => { if (compact.matches) { open(null); menu(false); } });

  function adapt() {
    body.classList.toggle('compact-layout', compact.matches);
    menu(false);
    if (compact.matches) {
      tools.append(mapControls, base);
      helmetControls.forEach(({ node }) => helmetTools.append(node));
      open(null);
    } else {
      controlsHome.after(mapControls); baseHome.after(base);
      helmetControls.forEach(({ node, home }) => home.after(node));
      active = null; body.dataset.compactPanel = ''; backdrop.hidden = true;
      for (const panel of Object.values(panels)) panel.inert = false;
      body.classList.remove('left-collapsed', 'right-collapsed');
    }
    $('#leftToggle').setAttribute('aria-expanded', String(!compact.matches));
    $('#rightToggle').setAttribute('aria-expanded', String(!compact.matches));
    requestAnimationFrame(() => window.dispatchEvent(new Event('resize')));
  }
  compact.addEventListener('change', adapt);
  adapt();
})();
