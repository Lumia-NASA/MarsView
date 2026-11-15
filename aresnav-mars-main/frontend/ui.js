/* Casca da interface: mapa em tela cheia com painéis flutuantes.
   Cuida do que é só de layout: recolher painéis, busca de lugares, controles do mapa
   (capacete, 2D/3D, norte, zoom), troca rápida da imagem de fundo, gaveta de dados e barra de estado. */
(function () {
'use strict';
const A = App, $ = A.$;
const body = document.body;

/* ---------- painéis laterais ---------- */
function setSide(side, open) {
  body.classList.toggle(side + '-collapsed', !open);
  const b = $('#' + side + 'Toggle');
  b.setAttribute('aria-expanded', open);
  b.textContent = (side === 'left') === open ? '‹' : '›';
  setTimeout(() => window.dispatchEvent(new Event('resize')), 220);
}
['left', 'right'].forEach(side => { $('#' + side + 'Toggle').onclick = () => setSide(side, body.classList.contains(side + '-collapsed')); });
if (window.innerWidth < 1100) { setSide('left', false); if (window.innerWidth < 800) setSide('right', false); }

/* ---------- modo atual no <body>, para o CSS esconder o que não faz sentido em cada tela ---------- */
A.on('view', v => {
  body.dataset.view = v;
  $('#btnTele').setAttribute('aria-pressed', v === 'telemetry');
  const three = A.state.plannerView !== 'map';
  $('#ctl3d').textContent = three ? '3D' : '2D'; $('#ctl3d').setAttribute('aria-pressed', three);
});
let mapView = 'globe';
$('#ctl3d').onclick = () => { mapView = A.state.view === 'globe' ? 'map' : 'globe'; A.setView(mapView); };
$('#btnTele').onclick = () => A.setView(A.state.view === 'telemetry' ? mapView : 'telemetry');
/* Bonequinho: 1º clique arma o "soltar"; aí é só clicar em qualquer ponto de Marte.
   Clicar de novo no bonequinho entra no capacete onde o astronauta da missão está. */
$('#ctlHelmet').onclick = () => {
  if (A.state.dropMode) { A.setDropMode(false); A.setView('helmet'); return; }
  if (A.state.view !== 'globe' && A.state.view !== 'map') A.setView(mapView);
  A.setDropMode(true);
};
A.on('drop', on => { $('#dropHint').hidden = !on; $('#ctlHelmet').setAttribute('aria-pressed', on); });
A.on('view', v => { if (v !== 'globe' && v !== 'map' && A.state.dropMode) A.setDropMode(false); });
/* Exagero vertical do relevo: 1× é a escala real */
$('#ctlEx').onclick = () => { const v = A.globe.setExaggeration(A.globe.exaggeration === 1 ? 2.5 : 1); $('#ctlEx').textContent = v === 1 ? '1×' : A.num(v, 1) + '×'; $('#ctlEx').setAttribute('aria-pressed', v !== 1); };
A.on('view', v => { if (v === 'globe' || v === 'map') mapView = v; });

/* ---------- zoom e norte ---------- */
const onMap = () => A.state.view === 'map';
$('#ctlIn').onclick = () => onMap() ? A.map.zoomIn(1) : A.globe.zoom(0.5);
$('#ctlOut').onclick = () => onMap() ? A.map.zoomOut(1) : A.globe.zoom(2);
$('#ctlNorth').onclick = () => { if (!onMap()) A.globe.north(); };

/* ---------- troca rápida da imagem de fundo ---------- */
const BASE_LABEL = { global: 'Global Mars', fub: 'Cor natural', hirise: 'HiRISE', mosaic: 'Mosaico', relief: 'Relevo' };
function syncBase() {
  const v = document.querySelector('input[name="base"]:checked').value;
  $('#basePickLabel').textContent = BASE_LABEL[v]; $('#basePick').dataset.base = v;
}
$('#basePick').onclick = () => {
  const radios = [...document.querySelectorAll('input[name="base"]')], i = radios.findIndex(r => r.checked);
  const next = radios[(i + 1) % radios.length]; next.checked = true; next.dispatchEvent(new Event('change', { bubbles: true }));
};
A.on('layers', syncBase);

/* ---------- idioma ---------- */
document.title = 'MarsView · Jezero';

/* ---------- gaveta de dados ---------- */
const drawer = $('#dataDrawer');
function setDrawer(open) { drawer.hidden = !open; $('#btnData').setAttribute('aria-pressed', open); if (open) setPois(false); }
$('#btnData').onclick = () => setDrawer(drawer.hidden);
$('#dataClose').onclick = () => setDrawer(false);

/* ---------- aba de pontos de referência: lista com coordenadas e atalhos ---------- */
const poiDrawer = $('#poiDrawer'), poiList = $('#poiList');
const coordText = p => { const en = window.LANG === 'en'; return `${A.num(Math.abs(p.lat), 5)}° ${p.lat >= 0 ? 'N' : 'S'} · ${A.num(Math.abs(p.lon), 5)}° ${p.lon >= 0 ? (en ? 'E' : 'L') : (en ? 'W' : 'O')}`; };
const coordPlain = p => p.lat.toFixed(5) + ', ' + p.lon.toFixed(5);   // formato que a busca aceita
function el(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
/* itens da aba: os pontos de referência de Jezero e, depois deles, os radares de Marte (relief.js) */
const poiItems = () => A.POIS.map(p => ({ p, radar: false })).concat((A.RADARS || []).map(p => ({ p, radar: true })));
function renderPois() {
  poiList.textContent = '';
  poiItems().forEach(({ p, radar }, k) => {
    if (radar && k === A.POIS.length) poiList.append(el('li', 'poisep', 'Radares'));
    const li = el('li', 'poicard'), head = el('div', 'poihead'), dot = el('span', 'dot');
    dot.style.setProperty('--c', radar ? '#8EC3CB' : A.KIND[p.k]);
    head.append(dot, el('b', '', p.n), el('span', 'tag', p.src));
    const facts = el('div', 'poifacts mono');
    facts.append(el('span', 'poicoord', coordText(p)));
    const h = A.heightAt(p.lat, p.lon);
    if (Number.isFinite(h)) facts.append(el('span', '', 'Altitude ' + A.num(h, 0) + ' m'));
    if (!radar && p.k !== 'base') facts.append(el('span', '', A.fmtKm(A.metersBetween(A.BASE.lat, A.BASE.lon, p.lat, p.lon)) + ' ' + T('da base')));
    const acts = el('div', 'poiacts');
    [['go', 'Ver no mapa'], !radar && p.k !== 'base' && ['goal', 'Definir como destino'], !radar && ['drop', 'Descer aqui'], ['copy', 'Copiar coordenadas']].filter(Boolean)
      .forEach(([a, label], i) => { const b = el('button', i === 0 ? 'primary' : '', label); b.dataset.a = a; b.dataset.k = k; acts.append(b); });
    li.append(head, el('p', '', p.why), facts, acts);
    poiList.append(li);
  });
}
function setPois(open) {
  if (open) { setDrawer(false); renderPois(); }
  poiDrawer.hidden = !open; $('#btnPois').setAttribute('aria-pressed', open);
}
$('#btnPois').onclick = () => setPois(poiDrawer.hidden);
$('#poiClose').onclick = () => setPois(false);
poiList.addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  const item = poiItems()[+b.dataset.k], p = item.p, a = b.dataset.a;
  const far = item.radar && p.kind === 'orbit';                // detecção orbital: mostra a região inteira
  if (a === 'copy') {
    const done = ok => { b.textContent = ok ? 'Copiado' : coordPlain(p); setTimeout(() => { b.textContent = 'Copiar coordenadas'; }, 1600); };
    try { navigator.clipboard.writeText(coordPlain(p)).then(() => done(true), () => done(false)); } catch (err) { done(false); }
    return;
  }
  setPois(false);
  if (a === 'drop') { A.dropAt(p.lat, p.lon); return; }
  if (a === 'goal') A.setGoalPoi(p);
  if (A.state.view !== 'globe' && A.state.view !== 'map') A.setView(mapView);
  if (onMap()) A.map.flyTo([p.lat, p.lon], far ? 5 : 15); else A.globe.flyTo(p.lat, p.lon, far ? 1200 : 4);
});

/* ---------- busca de lugares em Marte ---------- */
const PLACES = [
  ['Cratera Jezero', 18.44, 77.45, 60, 'Local de pouso do Perseverance'],
  ['Olympus Mons', 18.65, -133.8, 900, 'Maior vulcão do Sistema Solar'],
  ['Valles Marineris', -13.9, -59.2, 1500, 'Sistema de cânions'],
  ['Cratera Gale', -4.59, 137.44, 200, 'Local de pouso do Curiosity'],
  ['Cratera Gusev', -14.57, 175.47, 220, 'Local de pouso do Spirit'],
  ['Meridiani Planum', -1.95, -5.53, 300, 'Local de pouso do Opportunity'],
  ['Elysium Planitia', 4.5, 135.62, 400, 'Local de pouso do InSight'],
  ['Chryse Planitia', 22.27, -47.95, 500, 'Local de pouso da Viking 1'],
  ['Utopia Planitia', 47.64, -134.29, 600, 'Local de pouso da Viking 2'],
  ['Hellas Planitia', -42.4, 70.5, 2500, 'Maior bacia de impacto visível'],
  ['Tharsis Montes', 1.57, -112.58, 1800, 'Cadeia de vulcões'],
  ['Elysium Mons', 25.02, 147.21, 700, 'Vulcão'],
  ['Syrtis Major', 8.4, 69.5, 1500, 'Planalto escuro ao lado de Jezero'],
  ['Calota polar norte', 86, 0, 2200, 'Planum Boreum'],
  ['Calota polar sul', -86, 0, 2200, 'Planum Australe']
];
A.places = PLACES;
const input = $('#search');
window.addEventListener('keydown', e => {
  if (e.key === 'Escape') { setDrawer(false); setPois(false); if (A.state.dropMode) A.setDropMode(false); }
  if (e.key === '/' && !/INPUT|SELECT|TEXTAREA/.test(e.target.tagName)) { e.preventDefault(); input.focus(); }
});

/* ---------- barra de estado: altitude da câmera e agulha do norte ---------- */
const fmtAlt = km => km >= 100 ? Math.round(km).toLocaleString(LOC) + ' km' : km >= 1 ? km.toLocaleString(LOC, { maximumFractionDigits: 1 }) + ' km' : Math.round(km * 1000) + ' m';
setInterval(() => {
  const el = $('#camInfo');
  if (A.state.view === 'globe') { const c = A.globe.cam(); if (c) { el.textContent = 'Câmera: ' + fmtAlt(c.km); $('#ctlNeedle').style.transform = `rotate(${-c.heading}deg)`; } }
  else if (A.state.view === 'map' && A.map) { el.textContent = 'Zoom ' + A.map.getZoom().toLocaleString(LOC); $('#ctlNeedle').style.transform = ''; }
  else el.textContent = '';
}, 500);
})();
