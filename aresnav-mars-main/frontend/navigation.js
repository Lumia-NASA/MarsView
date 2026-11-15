/* Search, point inspection and A-to-B directions share one map overlay. */
(function () {
  'use strict';
  const A = App, N = MarsNavigation, $ = A.$;
  const search = $('#search'), container = search.closest('.search');
  const english = window.LANG === 'en';
  const text = (en, pt) => english ? en : pt;
  const normalize = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const coords = p => `${p.lat.toFixed(5)}, ${p.lon.toFixed(5)}`;
  const label = p => p.n || coords(p);
  const points = { from: null, to: null };
  let selected = null, picking = null, result = null, calculation = 0;
  let cesiumEntities = [], leafletGroup = null;
  $('#searchResults').remove();
  search.placeholder = text('Search Mars or coordinates', 'Buscar em Marte ou coordenadas');
  search.setAttribute('aria-expanded', 'false');
  search.setAttribute('aria-controls', 'navigationPanel');
  const panel = document.createElement('section');
  panel.id = 'navigationPanel'; panel.className = 'navigation-panel'; panel.hidden = true;
  panel.setAttribute('aria-label', text('Search and directions', 'Pesquisa e rotas'));
  panel.innerHTML = `
    <div class="navigation-head">
      <button type="button" id="navExplore" aria-pressed="true">${text('Explore', 'Explorar')}</button>
      <button type="button" id="navDirections" aria-pressed="false">${text('Directions', 'Rotas')}</button>
      <button type="button" id="navClose" class="nav-icon" aria-label="${text('Close search', 'Fechar pesquisa')}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg></button>
    </div>
    <div id="navExploreBody">
      <ul id="navSearchResults" class="navigation-suggestions" aria-label="${text('Places', 'Lugares')}"></ul>
      <div id="navPlace" class="navigation-place" hidden>
        <h2 id="navPlaceName"></h2><p id="navPlaceCoords"></p>
        <div class="navigation-actions">
          <button type="button" id="navStart">${text('Start here', 'Partir daqui')}</button>
          <button type="button" id="navEnd">${text('Directions here', 'Rota até aqui')}</button>
          <button type="button" id="navSurface">${text('Surface view', 'Ver superfície')}</button>
        </div>
        <p class="navigation-note">${text('3D terrain at this coordinate. Rover photos are available at photographed sites.', 'Terreno 3D nesta coordenada. Fotos dos rovers estão disponíveis nos locais fotografados.')}</p>
      </div>
    </div>
    <form id="navRouteForm" hidden>
      <div class="navigation-field"><label for="navFrom">${text('Starting point', 'Ponto de partida')}</label>
        <div><input id="navFrom" autocomplete="off" placeholder="${text('Place or latitude, longitude', 'Lugar ou latitude, longitude')}"><button type="button" id="navPickFrom" class="nav-icon" aria-label="${text('Choose starting point on map', 'Escolher partida no mapa')}"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="6"/><path d="M12 2v4m0 12v4M2 12h4m12 0h4"/></svg></button></div>
        <ul id="navFromResults" class="navigation-suggestions" hidden></ul>
      </div>
      <button type="button" id="navSwap" class="navigation-swap">${text('Swap starting point and destination', 'Inverter partida e chegada')}</button>
      <div class="navigation-field"><label for="navTo">${text('Destination', 'Ponto de chegada')}</label>
        <div><input id="navTo" autocomplete="off" placeholder="${text('Place or latitude, longitude', 'Lugar ou latitude, longitude')}"><button type="button" id="navPickTo" class="nav-icon" aria-label="${text('Choose destination on map', 'Escolher chegada no mapa')}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z"/><circle cx="12" cy="10" r="2"/></svg></button></div>
        <ul id="navToResults" class="navigation-suggestions" hidden></ul>
      </div>
      <label class="navigation-method" for="navMethod">${text('Route preference', 'Preferência da rota')}<select id="navMethod"><option value="terrain">${text('Favor gentler terrain', 'Priorizar terreno suave')}</option><option value="shortest">${text('Shortest distance', 'Menor distância')}</option></select></label>
      <div class="navigation-actions"><button type="submit" id="navCalculate" class="primary">${text('Get directions', 'Traçar rota')}</button><button type="button" id="navClear">${text('Clear', 'Limpar')}</button></div>
      <p id="navRouteStatus" class="navigation-note" role="status">${text('Choose two places, enter coordinates, or select points on the map.', 'Escolha dois lugares, informe coordenadas ou selecione pontos no mapa.')}</p>
      <div id="navRouteResult" class="navigation-route-result" hidden><strong id="navDistance"></strong><p id="navRouteSource" class="navigation-note"></p>
        <div class="navigation-actions"><button type="button" id="navFit">${text('Show route', 'Mostrar rota')}</button><button type="button" id="navWalk">${text('Surface at destination', 'Superfície no destino')}</button></div>
      </div>
    </form>`;
  container.append(panel);
  const pickHint = document.createElement('div');
  pickHint.className = 'navigation-pick-hint'; pickHint.hidden = true;
  const pickText = document.createElement('span'), cancelPick = document.createElement('button');
  pickText.setAttribute('role', 'status'); cancelPick.type = 'button'; cancelPick.textContent = text('Cancel', 'Cancelar');
  pickHint.append(pickText, cancelPick); document.body.append(pickHint);
  const fields = { from: $('#navFrom'), to: $('#navTo') };
  const lists = { from: $('#navFromResults'), to: $('#navToResults') };

  function mapView() {
    if (A.state.view !== 'map' && A.state.view !== 'globe') A.setView('globe');
  }
  function open(tab = 'explore') {
    A.workspace.open(null);
    panel.hidden = false; search.setAttribute('aria-expanded', 'true');
    const directions = tab === 'directions';
    $('#navExploreBody').hidden = directions; $('#navRouteForm').hidden = !directions;
    $('#navExplore').setAttribute('aria-pressed', String(!directions));
    $('#navDirections').setAttribute('aria-pressed', String(directions));
  }
  function close() { panel.hidden = true; search.setAttribute('aria-expanded', 'false'); }
  function cancelPicking() { picking = null; pickHint.hidden = true; document.body.classList.remove('navigation-picking'); }
  function matches(value, defaults = false) {
    const q = normalize(value.trim()), found = [];
    const coordinate = N.coordinate(value);
    if (coordinate) found.push({ ...coordinate, n: coords(coordinate), sub: text('Coordinates', 'Coordenadas'), range: 40 });
    const places = A.POIS.map(p => ({ ...p, n: T(p.n), sub: T(p.src), range: 4 }))
      .concat(A.places.map(([n, lat, lon, range, sub]) => ({ n: T(n), lat, lon, range, sub: T(sub) })));
    for (const p of places) if ((q && normalize(p.n).includes(q)) || (!q && defaults && p.range > 4)) found.push(p);
    return found.slice(0, 6);
  }
  function suggestions(list, input, choose, defaults = true) {
    const hits = matches(input.value, defaults); list.replaceChildren(); list.hidden = false;
    if (!hits.length) {
      const item = document.createElement('li'); item.className = 'navigation-empty';
      item.textContent = text('Enter a place or latitude, longitude. Example: 18.45, 77.40.', 'Informe um lugar ou latitude, longitude. Exemplo: 18.45, 77.40.'); list.append(item);
    }
    for (const hit of hits) {
      const item = document.createElement('li'), button = document.createElement('button'); button.type = 'button';
      const name = document.createElement('b'), detail = document.createElement('small');
      name.textContent = hit.n; detail.textContent = hit.sub || coords(hit);
      button.append(name, detail); button.onclick = () => choose(hit); item.append(button); list.append(item);
    }
    input.setAttribute('aria-expanded', 'true');
  }
  function attachSuggestions(input, list, choose, isMain = false) {
    input.setAttribute('aria-controls', list.id);
    input.addEventListener('input', () => {
      if (isMain) { selected = null; $('#navPlace').hidden = true; open(); }
      else { points[input === fields.from ? 'from' : 'to'] = null; invalidate(); }
      suggestions(list, input, choose);
    });
    input.addEventListener('focus', () => {
      if (isMain) open();
      else Object.values(lists).forEach(other => { other.hidden = true; });
      suggestions(list, input, choose);
    });
    input.addEventListener('keydown', event => {
      if (event.key === 'ArrowDown') { event.preventDefault(); list.querySelector('button')?.focus(); }
      if (event.key === 'Enter' && !list.hidden) { event.preventDefault(); list.querySelector('button')?.click(); }
    });
    list.addEventListener('keydown', event => {
      const buttons = [...list.querySelectorAll('button')], index = buttons.indexOf(document.activeElement);
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault(); buttons[(index + (event.key === 'ArrowDown' ? 1 : buttons.length - 1)) % buttons.length]?.focus();
      }
      if (event.key === 'Escape') { list.hidden = true; input.focus(); }
    });
  }
  function showPoint(point, travel = true) {
    selected = { ...point, lon: N.wrap(point.lon) }; search.value = label(selected);
    cancelPicking(); mapView(); open();
    $('#navSearchResults').hidden = true; $('#navPlace').hidden = false;
    $('#navPlaceName').textContent = label(selected); $('#navPlaceCoords').textContent = coords(selected);
    if (travel) {
      if (A.state.view === 'map') A.map.flyTo([selected.lat, selected.lon], point.range > 100 ? 5 : 11);
      else A.globe.flyTo(selected.lat, selected.lon, point.range || 40);
    }
    render();
  }
  function invalidate() {
    calculation++; result = null; $('#navRouteResult').hidden = true;
    $('#navCalculate').disabled = false; render();
  }
  function setPoint(key, point) {
    points[key] = { ...point, lon: N.wrap(point.lon) }; fields[key].value = label(points[key]);
    lists[key].hidden = true; fields[key].setAttribute('aria-expanded', 'false');
    invalidate(); $('#navRouteStatus').textContent = text('Ready when both points are selected.', 'Selecione os dois pontos para traçar a rota.');
    render();
  }
  function beginPick(key) {
    cancelPicking(); mapView(); A.setDropMode(false); A.workspace.open(null); close(); picking = key;
    pickText.textContent = key === 'from' ? text('Select a starting point on Mars', 'Selecione a partida em Marte') : text('Select a destination on Mars', 'Selecione o destino em Marte');
    pickHint.hidden = false; document.body.classList.add('navigation-picking');
  }
  function resolve(key) {
    if (points[key] && fields[key].value === label(points[key])) return points[key];
    const coordinate = N.coordinate(fields[key].value);
    if (coordinate) return coordinate;
    return matches(fields[key].value).find(p => normalize(p.n) === normalize(fields[key].value.trim())) || null;
  }
  async function calculate(event) {
    event?.preventDefault();
    const from = resolve('from'), to = resolve('to');
    invalidate();
    if (!from || !to) {
      $('#navRouteStatus').textContent = text('Select a suggestion or enter valid latitude (−90 to 90) and longitude (−360 to 360) for both points.', 'Selecione uma sugestão ou informe latitude (−90 a 90) e longitude (−360 a 360) válidas nos dois campos.');
      fields[from ? 'to' : 'from'].focus(); return;
    }
    if (N.distance(from, to) < 1) { $('#navRouteStatus').textContent = text('The two points are the same. Choose another destination.', 'Os dois pontos são iguais. Escolha outro destino.'); return; }
    points.from = from; points.to = to; fields.from.value = label(from); fields.to.value = label(to);
    Object.values(lists).forEach(list => { list.hidden = true; });
    const run = calculation, method = $('#navMethod').value;
    $('#navCalculate').disabled = true; $('#navRouteStatus').textContent = text('Calculating route…', 'Calculando rota…');
    await new Promise(resolve => setTimeout(resolve, 30));
    if (run !== calculation) return;
    try {
      let path, source;
      const first = A.cellOf(from.lat, from.lon), last = A.cellOf(to.lat, to.lon);
      if (method === 'shortest') {
        path = N.shortest(from, to);
        source = text('Shortest arc on the Mars reference sphere. Terrain obstacles are not evaluated.', 'Menor arco na esfera de referência de Marte. Obstáculos do terreno não são avaliados.');
      } else if (first >= 0 && last >= 0 && A.HGT && A.SL) {
        const cells = A.route(first, last, 'safe');
        if (!cells) throw new Error(text('No route meets the current mission slope limit. Adjust the mission payload or choose different points.', 'Nenhuma rota atende ao limite de declive da missão. Ajuste a carga ou escolha outros pontos.'));
        path = [from, ...cells.map(id => { const [lat, lon] = A.cellLL(id); return { lat, lon }; }), to];
        source = text('HRSC/MOLA · 200 m regional grid. Lowest terrain cost on the sampled grid, with the mission slope limit.', 'HRSC/MOLA · grade regional de 200 m. Menor custo no terreno amostrado, com o limite de declive da missão.');
      } else {
        if (!A.globalTerrainReady) throw new Error(text('Global elevation data is unavailable. Try again after it loads, or select Shortest distance.', 'O relevo global está indisponível. Tente novamente após carregar ou selecione Menor distância.'));
        path = N.terrainRoute(from, to, A.heightAt);
        source = text('MOLA global · up to 21 km sampling at the equator. Lowest terrain cost in the sampled corridor. Local obstacles require higher-resolution data.', 'MOLA global · amostragem de até 21 km no equador. Menor custo no corredor amostrado. Obstáculos locais exigem dados de maior resolução.');
      }
      if (run !== calculation) return;
      const distance = path.slice(1).reduce((sum, p, i) => sum + N.distance(path[i], p), 0);
      result = { path, distance, source };
      $('#navDistance').textContent = A.fmtKm(distance);
      $('#navRouteSource').textContent = source;
      $('#navRouteStatus').textContent = text('Route estimate ready', 'Estimativa de rota pronta');
      $('#navRouteResult').hidden = false; mapView(); render(); fit();
    } catch (error) { $('#navRouteStatus').textContent = error.message; }
    finally { if (run === calculation) $('#navCalculate').disabled = false; }
  }
  function render() {
    const viewer = A.globe?.viewer;
    if (viewer) cesiumEntities.forEach(entity => viewer.entities.remove(entity));
    cesiumEntities = [];
    if (leafletGroup) leafletGroup.clearLayers();
    if (A.map && !leafletGroup) leafletGroup = L.layerGroup().addTo(A.map);
    const markers = [];
    if (selected) markers.push([selected, '']);
    if (points.from) markers.push([points.from, 'A']);
    if (points.to) markers.push([points.to, 'B']);
    for (const [p, name] of markers) {
      if (viewer) cesiumEntities.push(viewer.entities.add({ position: Cesium.Cartesian3.fromDegrees(p.lon, p.lat),
        point: { pixelSize: 11, color: Cesium.Color.fromCssColorString('#e5b29a'), outlineColor: Cesium.Color.BLACK, outlineWidth: 2, heightReference: Cesium.HeightReference.CLAMP_TO_GROUND },
        label: { text: name, font: '600 14px sans-serif', fillColor: Cesium.Color.WHITE, showBackground: true, backgroundColor: Cesium.Color.fromCssColorString('#202124'), pixelOffset: new Cesium.Cartesian2(0, -24), heightReference: Cesium.HeightReference.CLAMP_TO_GROUND } }));
      if (leafletGroup) {
        const marker = L.circleMarker([p.lat, p.lon], { radius: 7, color: '#202124', fillColor: '#e5b29a', fillOpacity: 1, weight: 2 }).addTo(leafletGroup);
        if (name) marker.bindTooltip(name, { permanent: true, direction: 'top' });
      }
    }
    if (result) {
      if (viewer) cesiumEntities.push(viewer.entities.add({ polyline: {
        positions: Cesium.Cartesian3.fromDegreesArray(result.path.flatMap(p => [p.lon, p.lat])), width: 5, clampToGround: true,
        material: new Cesium.PolylineOutlineMaterialProperty({ color: Cesium.Color.fromCssColorString('#e5b29a'), outlineColor: Cesium.Color.fromCssColorString('#202124'), outlineWidth: 2 }) } }));
      if (leafletGroup) {
        const route = N.unwrap(result.path);
        L.polyline(route, { color: '#202124', weight: 8, interactive: false }).addTo(leafletGroup);
        L.polyline(route, { color: '#e5b29a', weight: 4, interactive: false }).addTo(leafletGroup);
        // Match endpoint markers to the same world copy as a date-line crossing.
        [route[0], route[route.length - 1]].forEach((p, i) => L.circleMarker(p, { radius: 7, color: '#202124', fillColor: '#e5b29a', fillOpacity: 1, weight: 2 }).bindTooltip(i ? 'B' : 'A', { permanent: true, direction: 'top' }).addTo(leafletGroup));
      }
    }
    cesiumEntities.forEach(entity => { entity.show = A.state.view === 'globe'; });
    viewer?.scene.requestRender();
  }
  function fit() {
    if (!result) return;
    mapView();
    if (A.state.view === 'map') A.map.fitBounds(N.unwrap(result.path), { padding: [40, 40], maxZoom: 15 });
    else A.globe.fitRoute(result.path);
  }
  function surface(point) { if (!point) return; close(); cancelPicking(); A.dropAt(point.lat, point.lon); }
  attachSuggestions(search, $('#navSearchResults'), showPoint, true);
  for (const key of ['from', 'to']) attachSuggestions(fields[key], lists[key], point => { setPoint(key, point); if (points.from && points.to) calculate(); });
  $('#navExplore').onclick = () => { open(); suggestions($('#navSearchResults'), search, showPoint); };
  $('#navDirections').onclick = () => { open('directions'); fields.from.focus(); };
  $('#navClose').onclick = () => { close(); search.focus(); close(); };
  $('#navStart').onclick = () => { setPoint('from', selected); open('directions'); fields.to.focus(); };
  $('#navEnd').onclick = () => { setPoint('to', selected); open('directions'); fields.from.focus(); };
  $('#navSurface').onclick = () => surface(selected);
  $('#navWalk').onclick = () => surface(points.to);
  $('#navPickFrom').onclick = () => beginPick('from'); $('#navPickTo').onclick = () => beginPick('to');
  cancelPick.onclick = () => { cancelPicking(); open('directions'); };
  $('#navSwap').onclick = () => {
    [points.from, points.to] = [points.to, points.from]; [fields.from.value, fields.to.value] = [fields.to.value, fields.from.value];
    invalidate(); if (resolve('from') && resolve('to')) calculate();
  };
  $('#navClear').onclick = () => {
    points.from = points.to = selected = null; fields.from.value = fields.to.value = search.value = '';
    invalidate(); cancelPicking(); Object.values(lists).forEach(list => { list.hidden = true; });
    $('#navPlace').hidden = true; $('#navRouteStatus').textContent = text('Choose a starting point and a destination.', 'Escolha a partida e o destino.');
  };
  $('#navMethod').onchange = () => { invalidate(); if (resolve('from') && resolve('to')) calculate(); };
  $('#navRouteForm').onsubmit = calculate; $('#navFit').onclick = fit;
  document.addEventListener('pointerdown', event => {
    if (!container.contains(event.target)) close();
    for (const key of ['from', 'to']) if (!fields[key].closest('.navigation-field').contains(event.target)) lists[key].hidden = true;
  });
  document.addEventListener('keydown', event => { if (event.key === 'Escape') { close(); cancelPicking(); } });
  A.on('view', () => { close(); cancelPicking(); render(); });
  A.on('drop', on => { if (on) { close(); cancelPicking(); A.workspace.open(null); } });
  A.on('ready', render);
  A.navigation = {
    pick(lat, lon) {
      const p = { lat, lon: N.wrap(lon) };
      if (picking) {
        const key = picking; cancelPicking(); setPoint(key, p); open('directions');
        if (points.from && points.to) calculate();
      } else showPoint(p, false);
    },
    get result() { return result; }, get points() { return points; }
  };
})();
