/* Spherical routing on Mars. Coordinates are always latitude, east longitude.
   Terrain routing minimizes distance plus grade cost within a sampled corridor.
   Its precision is limited by the elevation data, not the density of this grid. */
(function (root) {
  'use strict';
  const RADIUS = 3389500, RAD = Math.PI / 180;
  const wrap = lon => ((lon + 180) % 360 + 360) % 360 - 180;
  function coordinate(text) {
    const match = /^\s*([+-]?\d+(?:\.\d+)?)\s*[,;\s]\s*([+-]?\d+(?:\.\d+)?)\s*$/.exec(text);
    if (!match) return null;
    const lat = Number(match[1]), lon = Number(match[2]);
    if (Math.abs(lat) > 90 || Math.abs(lon) > 360) return null;
    return { lat, lon: wrap(lon) };
  }
  const vector = p => [Math.cos(p.lat * RAD) * Math.cos(p.lon * RAD), Math.cos(p.lat * RAD) * Math.sin(p.lon * RAD), Math.sin(p.lat * RAD)];
  const dot = (a, b) => a.reduce((sum, v, i) => sum + v * b[i], 0);
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const unit = v => { const length = Math.hypot(...v); return v.map(x => x / length); };
  function distance(a, b) {
    const u = vector(a), v = vector(b);
    return RADIUS * Math.atan2(Math.hypot(...cross(u, v)), dot(u, v));
  }
  function frame(start, end) {
    const u = vector(start), v = vector(end), normal = cross(u, v);
    const angle = Math.atan2(Math.hypot(...normal), dot(u, v));
    // Antipodes have infinitely many shortest arcs. Choose a stable orthogonal axis.
    const n = Math.hypot(...normal) > 1e-10 ? unit(normal) : unit(cross(u, Math.abs(u[2]) < .9 ? [0, 0, 1] : [1, 0, 0]));
    const tangent = cross(n, u);
    return { angle, at(t, offset = 0) {
      const a = angle * t, c = Math.cos(offset), s = Math.sin(offset);
      const p = u.map((value, i) => (value * Math.cos(a) + tangent[i] * Math.sin(a)) * c + n[i] * s);
      return { lat: Math.atan2(p[2], Math.hypot(p[0], p[1])) / RAD, lon: wrap(Math.atan2(p[1], p[0]) / RAD) };
    } };
  }
  function shortest(start, end) {
    const arc = frame(start, end), count = Math.max(2, Math.ceil(arc.angle / (Math.PI / 180)));
    const path = Array.from({ length: count + 1 }, (_, i) => arc.at(i / count));
    path[0] = { ...start }; path[count] = { ...end };
    return path;
  }
  function terrainRoute(start, end, elevation) {
    const arc = frame(start, end);
    if (arc.angle * RADIUS < 1) return [{ ...start }, { ...end }];
    const columns = 129, rows = 33, mid = (rows - 1) / 2;
    const width = Math.min(.55, Math.max(arc.angle * .25, 20 / RADIUS));
    const points = [], heights = [];
    for (let column = 0; column < columns; column++) {
      for (let row = 0; row < rows; row++) {
        const p = arc.at(column / (columns - 1), (row - mid) / mid * width);
        points.push(p); heights.push(elevation(p.lat, p.lon));
      }
    }
    const first = mid, last = (columns - 1) * rows + mid;
    points[first] = { ...start }; points[last] = { ...end };
    heights[first] = elevation(start.lat, start.lon); heights[last] = elevation(end.lat, end.lon);
    if (!heights.every(Number.isFinite)) throw new Error('Elevation data is unavailable for this route.');
    const costs = new Float64Array(points.length).fill(Infinity);
    const parents = new Int32Array(points.length).fill(-1), closed = new Uint8Array(points.length);
    const heap = [];
    function push(id, score) {
      let i = heap.length; heap.push({ id, score });
      while (i > 0) {
        const parent = (i - 1) >> 1;
        if (heap[parent].score <= score) break;
        heap[i] = heap[parent]; i = parent;
      }
      heap[i] = { id, score };
    }
    function pop() {
      const top = heap[0], tail = heap.pop();
      if (heap.length) {
        let i = 0;
        while (i * 2 + 1 < heap.length) {
          let child = i * 2 + 1;
          if (child + 1 < heap.length && heap[child + 1].score < heap[child].score) child++;
          if (heap[child].score >= tail.score) break;
          heap[i] = heap[child]; i = child;
        }
        heap[i] = tail;
      }
      return top.id;
    }
    costs[first] = 0; push(first, distance(start, end));
    while (heap.length) {
      const id = pop();
      if (closed[id]) continue;
      if (id === last) break;
      closed[id] = 1;
      const column = Math.floor(id / rows), row = id % rows;
      for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) {
        if ((!dx && !dy) || column + dx < 0 || column + dx >= columns || row + dy < 0 || row + dy >= rows) continue;
        const next = (column + dx) * rows + row + dy;
        if (closed[next]) continue;
        const length = distance(points[id], points[next]);
        if (length < 1e-5) continue;
        const middle = frame(points[id], points[next]).at(.5);
        const height = elevation(middle.lat, middle.lon);
        if (!Number.isFinite(height)) continue;
        const grade = Math.max(Math.abs(height - heights[id]), Math.abs(heights[next] - height)) / (length / 2);
        const cost = costs[id] + length * (1 + (grade / .07) ** 2);
        if (cost >= costs[next]) continue;
        costs[next] = cost; parents[next] = id;
        push(next, cost + distance(points[next], end));
      }
    }
    if (parents[last] < 0) throw new Error('No route found in the available terrain.');
    const path = [];
    for (let id = last; id >= 0; id = parents[id]) path.push(points[id]);
    return path.reverse();
  }
  // Leaflet needs continuous longitudes to draw a short crossing of the date line.
  function unwrap(path) {
    let longitude = path[0].lon;
    return path.map(p => { longitude += wrap(p.lon - longitude); return [p.lat, longitude]; });
  }
  root.MarsNavigation = { coordinate, wrap, distance, shortest, terrainRoute, unwrap };
})(typeof window === 'undefined' ? globalThis : window);
