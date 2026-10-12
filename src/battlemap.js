'use strict';
// Battle Map Maker: describe a scene, get a gridded top-down battle map.
// A map is plain JSON (schema in CLAUDE_PROMPT below). The offline generator,
// Claude, or a person writes it; this file renders it as SVG on an exact
// 5 ft grid and exports PNG (for a VTT or printing) or JSON (to edit later).

const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const f = (n) => Math.round(n * 100) / 100;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const store = {
  get(k, d) { try { const v = localStorage.getItem('bm:' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem('bm:' + k, JSON.stringify(v)); } catch { /* private window */ } },
  del(k) { try { localStorage.removeItem('bm:' + k); } catch { /* ignore */ } },
};
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const hashSeed = (...n) => n.reduce((h, v) => Math.imul(h ^ Math.round(v * 97), 2654435761) >>> 0, 2166136261);

// ---------------------------------------------------------------- terrain
const TERRAIN = {
  grass: { color: '#5f7d3c', natural: true, specks: ['#4e6b30', '#739149', '#68883e', '#56742f'], blades: true },
  dirt: { color: '#8a6a46', natural: true, specks: ['#765838', '#9b7a52', '#80623f'] },
  sand: { color: '#d4ba82', natural: true, specks: ['#c4a86f', '#e0c995', '#cbb176'] },
  snow: { color: '#e6ecf1', natural: true, specks: ['#d3dce5', '#f6f9fb', '#dde5ec'] },
  mud: { color: '#5e4c36', natural: true, specks: ['#4f3f2c', '#6d5a42', '#574632'] },
  cavefloor: { color: '#6f665a', natural: true, specks: ['#615a4f', '#7d7366', '#686054'] },
  rock: { color: '#37322d', natural: true, specks: ['#2c2824', '#433d37', '#3c3631'] },
  water: { color: '#3d6e8e', natural: true, water: true },
  deepwater: { color: '#284d6b', natural: true, water: true },
  lava: { color: '#c2410c', natural: true, lava: true },
  stone: { color: '#8e8a82', pattern: 'flagstone' },
  cobble: { color: '#7c776f', pattern: 'cobble' },
  wood: { color: '#8a5a2e', pattern: 'planks' },
  carpet: { color: '#7b2b35', pattern: 'carpet' },
  roof: { color: '#6e3b2a', pattern: 'shingles', edge: '#3d1f15' },
  void: { color: '#0e0d10' },
};
const terrainOf = (t) => (TERRAIN[t] ? t : 'dirt');

function terrainPattern(id, key) {
  const T = TERRAIN[key], rnd = mulberry32(hashSeed(key.length, key.charCodeAt(0), key.charCodeAt(1)));
  const R = (a, b) => a + rnd() * (b - a);
  let s = '';
  const shade = (hex, amt) => {
    const n = parseInt(hex.slice(1), 16), c = (v) => clamp(Math.round(v + amt), 0, 255);
    return `rgb(${c(n >> 16)},${c((n >> 8) & 255)},${c(n & 255)})`;
  };
  if (T.pattern === 'flagstone') {
    s += `<rect width="3" height="3" fill="#57534d"/>`;
    for (let y = 0; y < 3; y++) for (let x = 0; x < 3; x++) s += `<rect x="${x + 0.03}" y="${y + 0.03}" width="0.94" height="0.94" rx="0.05" fill="${shade(T.color, R(-14, 12))}"/><path d="M${x + 0.1} ${y + R(0.3, 0.8)}l${R(0.2, 0.5)} ${R(-0.1, 0.1)}" stroke="rgba(0,0,0,.18)" stroke-width="0.03"/>`;
    return `<pattern id="${id}" patternUnits="userSpaceOnUse" width="3" height="3">${s}</pattern>`;
  }
  if (T.pattern === 'cobble') {
    s += `<rect width="2" height="2" fill="#4f4b45"/>`;
    for (let y = 0; y < 5; y++) for (let x = 0; x < 5; x++) s += `<ellipse cx="${f(x * 0.4 + 0.2 + (y % 2) * 0.2 + R(-0.03, 0.03))}" cy="${f(y * 0.4 + 0.2)}" rx="${f(R(0.15, 0.19))}" ry="${f(R(0.14, 0.18))}" fill="${shade(T.color, R(-16, 16))}"/>`;
    return `<pattern id="${id}" patternUnits="userSpaceOnUse" width="2" height="2">${s}</pattern>`;
  }
  if (T.pattern === 'planks') {
    s += `<rect width="4" height="1" fill="${T.color}"/>`;
    for (let r = 0; r < 4; r++) {
      const y = r * 0.25;
      s += `<rect y="${y}" width="4" height="0.25" fill="${shade(T.color, R(-12, 10))}"/><path d="M0 ${y}H4" stroke="#4a2e14" stroke-width="0.025"/>`;
      const j = R(0.3, 2.5); s += `<path d="M${f(j)} ${y}v0.25M${f(j + R(1.2, 1.6))} ${y}v0.25" stroke="#4a2e14" stroke-width="0.025"/>`;
      s += `<path d="M${f(R(0, 3))} ${f(y + 0.12)}h${f(R(0.4, 0.9))}" stroke="rgba(0,0,0,.12)" stroke-width="0.02"/>`;
    }
    return `<pattern id="${id}" patternUnits="userSpaceOnUse" width="4" height="1">${s}</pattern>`;
  }
  if (T.pattern === 'carpet') {
    s += `<rect width="1" height="1" fill="${T.color}"/><path d="M0.5 0.1L0.9 0.5 0.5 0.9 0.1 0.5Z" fill="none" stroke="#a8803a" stroke-width="0.03" opacity=".6"/>`;
    return `<pattern id="${id}" patternUnits="userSpaceOnUse" width="1" height="1">${s}</pattern>`;
  }
  if (T.pattern === 'shingles') {
    s += `<rect width="1" height="1" fill="${T.color}"/>`;
    for (let r = 0; r < 3; r++) {
      const y = r / 3; s += `<path d="M0 ${f(y)}H1" stroke="#3d1f15" stroke-width="0.03"/>`;
      for (let x = (r % 2) * 0.25; x < 1; x += 0.5) s += `<path d="M${f(x)} ${f(y)}v${f(1 / 3)}" stroke="#4c271a" stroke-width="0.02"/>`;
    }
    return `<pattern id="${id}" patternUnits="userSpaceOnUse" width="1" height="1">${s}</pattern>`;
  }
  s += `<rect width="4" height="4" fill="${T.color}"/>`;
  if (T.water) {
    for (let i = 0; i < 9; i++) { const x = R(0, 3.6), y = R(0.2, 3.8); s += `<path d="M${f(x)} ${f(y)}q0.2 -0.12 0.4 0" fill="none" stroke="rgba(255,255,255,.18)" stroke-width="0.04"/>`; }
  } else if (T.lava) {
    for (let i = 0; i < 10; i++) s += `<circle cx="${f(R(0, 4))}" cy="${f(R(0, 4))}" r="${f(R(0.1, 0.35))}" fill="#f59e0b" opacity=".55"/>`;
  } else if (T.specks) {
    for (let i = 0; i < 70; i++) {
      const c = T.specks[i % T.specks.length], x = R(0, 4), y = R(0, 4);
      s += T.blades && i % 2
        ? `<path d="M${f(x)} ${f(y)}l${f(R(-0.06, 0.06))} -0.14" stroke="${c}" stroke-width="0.035" stroke-linecap="round"/>`
        : `<circle cx="${f(x)}" cy="${f(y)}" r="${f(R(0.03, 0.11))}" fill="${c}"/>`;
    }
  }
  return `<pattern id="${id}" patternUnits="userSpaceOnUse" width="4" height="4">${s}</pattern>`;
}

// ---------------------------------------------------------------- objects
// Each draws centred on 0,0 in a w x h box measured in squares.
const OBJ = {
  tree: { w: 2, h: 2, draw(w, h, R) {
    const r = Math.min(w, h) / 2, g = ['#2f5a24', '#3b6b2b', '#467a31'];
    let s = `<circle cx="${f(r * 0.18)}" cy="${f(r * 0.22)}" r="${f(r * 0.95)}" fill="rgba(0,0,0,.33)"/>`;
    const n = 7; for (let i = 0; i < n; i++) { const a = (i / n) * 6.283 + R(-0.3, 0.3), d = r * R(0.38, 0.5); s += `<circle cx="${f(Math.cos(a) * d)}" cy="${f(Math.sin(a) * d)}" r="${f(r * R(0.45, 0.55))}" fill="${g[i % 3]}" stroke="#22401a" stroke-width="0.04"/>`; }
    return s + `<circle r="${f(r * 0.45)}" fill="#4f8636"/><circle cx="${f(-r * 0.15)}" cy="${f(-r * 0.15)}" r="${f(r * 0.22)}" fill="#629a44" opacity=".8"/>`;
  } },
  pine: { w: 2, h: 2, draw(w, h, R) {
    const r = Math.min(w, h) / 2; let s = `<circle cx="${f(r * 0.2)}" cy="${f(r * 0.25)}" r="${f(r * 0.9)}" fill="rgba(0,0,0,.33)"/>`;
    for (const [k, c] of [[1, '#1f4a2c'], [0.7, '#2a5e37'], [0.4, '#357043']]) {
      let p = ''; for (let i = 0; i < 16; i++) { const a = (i / 16) * 6.283, d = r * k * (i % 2 ? 0.55 : 1) * R(0.9, 1.05); p += `${f(Math.cos(a) * d)},${f(Math.sin(a) * d)} `; }
      s += `<polygon points="${p}" fill="${c}" stroke="#163a22" stroke-width="0.03"/>`;
    }
    return s;
  } },
  bush: { w: 1, h: 1, draw(w, h, R) {
    const r = Math.min(w, h) / 2; let s = `<circle cx="0.08" cy="0.1" r="${f(r * 0.9)}" fill="rgba(0,0,0,.28)"/>`;
    for (let i = 0; i < 5; i++) { const a = (i / 5) * 6.283 + R(0, 1); s += `<circle cx="${f(Math.cos(a) * r * 0.4)}" cy="${f(Math.sin(a) * r * 0.4)}" r="${f(r * 0.5)}" fill="${i % 2 ? '#4d7a32' : '#5a8a3a'}" stroke="#2d4d1e" stroke-width="0.03"/>`; }
    return s;
  } },
  rock: { w: 1, h: 1, draw(w, h, R) {
    let p = ''; const n = 8; for (let i = 0; i < n; i++) { const a = (i / n) * 6.283, d = R(0.36, 0.5); p += `${f(Math.cos(a) * d * w)},${f(Math.sin(a) * d * h)} `; }
    return `<polygon points="${p}" transform="translate(0.08 0.1)" fill="rgba(0,0,0,.35)"/><polygon points="${p}" fill="#8b867d" stroke="#4b4741" stroke-width="0.05"/><ellipse cx="${f(-w * 0.12)}" cy="${f(-h * 0.12)}" rx="${f(w * 0.18)}" ry="${f(h * 0.12)}" fill="#a7a299"/>`;
  } },
  boulder: { w: 2, h: 2, draw(w, h, R) { return OBJ.rock.draw(w, h, R); } },
  rubble: { w: 2, h: 2, draw(w, h, R) {
    let s = ''; for (let i = 0; i < 9; i++) { const x = R(-w / 2 + 0.2, w / 2 - 0.2), y = R(-h / 2 + 0.2, h / 2 - 0.2), r = R(0.08, 0.22); s += `<circle cx="${f(x + 0.04)}" cy="${f(y + 0.05)}" r="${f(r)}" fill="rgba(0,0,0,.3)"/><circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" fill="${i % 2 ? '#8b867d' : '#77736b'}" stroke="#4b4741" stroke-width="0.03"/>`; }
    return s;
  } },
  table: { w: 2, h: 1, draw(w, h) {
    return `<rect x="${f(-w / 2 + 0.08)}" y="${f(-h / 2 + 0.1)}" width="${w - 0.1}" height="${h - 0.1}" fill="rgba(0,0,0,.3)"/><rect x="${f(-w / 2 + 0.05)}" y="${f(-h / 2 + 0.05)}" width="${w - 0.1}" height="${h - 0.1}" rx="0.06" fill="#9a6b3a" stroke="#5a3a1c" stroke-width="0.05"/><path d="M${f(-w / 2 + 0.1)} 0H${f(w / 2 - 0.1)}" stroke="#7a5229" stroke-width="0.03"/>`;
  } },
  roundtable: { w: 1.5, h: 1.5, draw(w) {
    const r = w / 2 - 0.05; return `<circle cx="0.07" cy="0.09" r="${f(r)}" fill="rgba(0,0,0,.3)"/><circle r="${f(r)}" fill="#9a6b3a" stroke="#5a3a1c" stroke-width="0.05"/><circle r="${f(r * 0.6)}" fill="none" stroke="#7a5229" stroke-width="0.03"/>`;
  } },
  chair: { w: 0.5, h: 0.5, draw(w, h) { return `<rect x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}" rx="0.05" fill="#7a5128" stroke="#4a2f14" stroke-width="0.04"/><rect x="${-w / 2}" y="${-h / 2}" width="${w}" height="0.1" fill="#4a2f14"/>`; } },
  bench: { w: 2, h: 0.5, draw(w, h) { return `<rect x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}" rx="0.05" fill="#7a5128" stroke="#4a2f14" stroke-width="0.04"/>`; } },
  counter: { w: 4, h: 1, draw(w, h) { return `<rect x="${f(-w / 2 + 0.08)}" y="${f(-h / 2 + 0.1)}" width="${w}" height="${h}" fill="rgba(0,0,0,.3)"/><rect x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}" fill="#6b4423" stroke="#3d2511" stroke-width="0.06"/><rect x="${f(-w / 2 + 0.1)}" y="${f(-h / 2 + 0.1)}" width="${f(w - 0.2)}" height="${f(h * 0.45)}" fill="#8a5a2e"/>`; } },
  barrel: { w: 0.8, h: 0.8, draw(w) { const r = w / 2; return `<circle cx="0.05" cy="0.07" r="${f(r)}" fill="rgba(0,0,0,.3)"/><circle r="${f(r)}" fill="#8a5a2b" stroke="#4a2f14" stroke-width="0.05"/><circle r="${f(r * 0.7)}" fill="none" stroke="#5b3a1a" stroke-width="0.04"/><circle r="${f(r * 0.3)}" fill="#6f4520"/>`; } },
  crate: { w: 0.9, h: 0.9, draw(w, h) { const x = -w / 2, y = -h / 2; return `<rect x="${f(x + 0.06)}" y="${f(y + 0.08)}" width="${w}" height="${h}" fill="rgba(0,0,0,.3)"/><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#a77b45" stroke="#5a3a1c" stroke-width="0.05"/><path d="M${f(x + 0.08)} ${f(y + 0.08)}L${f(-x - 0.08)} ${f(-y - 0.08)}M${f(-x - 0.08)} ${f(y + 0.08)}L${f(x + 0.08)} ${f(-y - 0.08)}" stroke="#6b4a24" stroke-width="0.05"/>`; } },
  chest: { w: 1, h: 0.7, draw(w, h) { const x = -w / 2, y = -h / 2; return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="0.06" fill="#7a4a20" stroke="#3d2511" stroke-width="0.05"/><path d="M${f(x + w * 0.25)} ${y}v${h}M${f(-x - w * 0.25)} ${y}v${h}" stroke="#c9a227" stroke-width="0.07"/><rect x="-0.07" y="-0.08" width="0.14" height="0.16" fill="#e1c35a"/>`; } },
  bed: { w: 1, h: 2, draw(w, h) { const x = -w / 2, y = -h / 2; return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="0.05" fill="#6b4423" stroke="#3d2511" stroke-width="0.05"/><rect x="${f(x + 0.08)}" y="${f(y + 0.08)}" width="${f(w - 0.16)}" height="${f(h - 0.16)}" fill="#d9d2c3"/><rect x="${f(x + 0.15)}" y="${f(y + 0.12)}" width="${f(w - 0.3)}" height="0.35" rx="0.08" fill="#f2eee6"/><rect x="${f(x + 0.08)}" y="${f(y + h * 0.38)}" width="${f(w - 0.16)}" height="${f(h * 0.54)}" fill="#6c3b4a"/>`; } },
  bookshelf: { w: 2, h: 0.5, draw(w, h) { const x = -w / 2, y = -h / 2, cs = ['#7b2b35', '#2c4f6d', '#3d6b2b', '#a8803a', '#5b3a6e']; let s = `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#4a2f14"/>`; for (let i = 0, bx = x + 0.08; bx < -x - 0.12; i++, bx += 0.14) s += `<rect x="${f(bx)}" y="${f(y + 0.08)}" width="0.11" height="${f(h - 0.16)}" fill="${cs[i % 5]}"/>`; return s; } },
  campfire: { w: 1, h: 1, light: 6, draw() { let s = ''; for (let i = 0; i < 8; i++) { const a = (i / 8) * 6.283; s += `<circle cx="${f(Math.cos(a) * 0.36)}" cy="${f(Math.sin(a) * 0.36)}" r="0.1" fill="#777" stroke="#444" stroke-width="0.03"/>`; } return s + `<circle r="0.26" fill="#3a2a1a"/><circle r="0.22" fill="#e8590c"/><circle r="0.12" fill="#fcc419"/>`; } },
  fireplace: { w: 2, h: 0.8, light: 5, draw(w, h) { const x = -w / 2, y = -h / 2; return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#6d6862" stroke="#3a3632" stroke-width="0.06"/><rect x="${f(x + 0.3)}" y="${f(y + 0.15)}" width="${f(w - 0.6)}" height="${f(h - 0.3)}" fill="#2a2420"/><ellipse cy="0" rx="${f(w * 0.25)}" ry="${f(h * 0.2)}" fill="#e8590c"/><ellipse rx="${f(w * 0.12)}" ry="${f(h * 0.1)}" fill="#fcc419"/>`; } },
  torch: { w: 0.4, h: 0.4, light: 4, draw() { return `<circle r="0.15" fill="#5a3a1c"/><circle r="0.1" fill="#fd7e14"/><circle r="0.05" fill="#ffe066"/>`; } },
  tent: { w: 2, h: 2, draw(w, h) { const x = -w / 2, y = -h / 2; return `<rect x="${f(x + 0.12)}" y="${f(y + 0.15)}" width="${w}" height="${h}" fill="rgba(0,0,0,.3)"/><rect x="${x}" y="${y}" width="${f(w / 2)}" height="${h}" fill="#b9a27a" stroke="#6b5a3a" stroke-width="0.05"/><rect x="0" y="${y}" width="${f(w / 2)}" height="${h}" fill="#9c865e" stroke="#6b5a3a" stroke-width="0.05"/><path d="M0 ${y}V${-y}" stroke="#5a4a2e" stroke-width="0.08"/>`; } },
  wagon: { w: 2, h: 3, draw(w, h) { const x = -w / 2, y = -h / 2; let s = `<rect x="${f(x + 0.1)}" y="${f(y + 0.15)}" width="${w}" height="${h}" fill="rgba(0,0,0,.3)"/>`; for (const yy of [y + 0.35, -y - 0.75]) s += `<rect x="${f(x - 0.12)}" y="${f(yy)}" width="0.18" height="0.4" fill="#2f2a25"/><rect x="${f(-x - 0.06)}" y="${f(yy)}" width="0.18" height="0.4" fill="#2f2a25"/>`; s += `<rect x="${x}" y="${f(y + 0.1)}" width="${w}" height="${f(h - 0.2)}" fill="#8a5a2e" stroke="#4a2f14" stroke-width="0.05"/><rect x="${f(x + 0.1)}" y="${f(y + 0.3)}" width="${f(w - 0.2)}" height="${f(h - 0.6)}" rx="0.3" fill="#d8cfb8" stroke="#9b917a" stroke-width="0.04"/>`; for (let i = 1; i < 4; i++) s += `<path d="M${f(x + 0.1)} ${f(y + 0.3 + (i * (h - 0.6)) / 4)}h${f(w - 0.2)}" stroke="#b5ab93" stroke-width="0.04"/>`; return s + `<path d="M0 ${f(y + 0.1)}v-0.6" stroke="#4a2f14" stroke-width="0.08"/>`; } },
  cart: { w: 1.5, h: 2, draw(w, h) { const x = -w / 2, y = -h / 2; return `<rect x="${f(x - 0.1)}" y="${f(-0.2)}" width="0.15" height="0.4" fill="#2f2a25"/><rect x="${f(-x - 0.05)}" y="${f(-0.2)}" width="0.15" height="0.4" fill="#2f2a25"/><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#8a5a2e" stroke="#4a2f14" stroke-width="0.05"/><rect x="${f(x + 0.12)}" y="${f(y + 0.12)}" width="${f(w - 0.24)}" height="${f(h - 0.24)}" fill="#a77b45"/>`; } },
  pillar: { w: 1, h: 1, draw(w) { const r = w * 0.42; return `<circle cx="0.1" cy="0.12" r="${f(r)}" fill="rgba(0,0,0,.4)"/><circle r="${f(r)}" fill="#a19c93" stroke="#5f5a53" stroke-width="0.06"/><circle r="${f(r * 0.65)}" fill="none" stroke="#7d7870" stroke-width="0.04"/>`; } },
  statue: { w: 1, h: 1, draw(w, h) { return `<rect x="${f(-w / 2 + 0.1)}" y="${f(-h / 2 + 0.12)}" width="${w}" height="${h}" fill="rgba(0,0,0,.35)"/><rect x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}" fill="#8f8a83" stroke="#55514b" stroke-width="0.05"/><circle r="${f(w * 0.28)}" fill="#b5b0a6" stroke="#6b665e" stroke-width="0.04"/><circle cy="${f(-w * 0.05)}" r="${f(w * 0.12)}" fill="#c8c3b9"/>`; } },
  altar: { w: 2, h: 1, draw(w, h) { const x = -w / 2, y = -h / 2; return `<rect x="${f(x + 0.08)}" y="${f(y + 0.1)}" width="${w}" height="${h}" fill="rgba(0,0,0,.35)"/><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#9a958c" stroke="#55514b" stroke-width="0.06"/><rect x="${f(-w * 0.15)}" y="${y}" width="${f(w * 0.3)}" height="${h}" fill="#7b2b35"/><circle cx="${f(x + 0.25)}" r="0.08" fill="#ffe066"/><circle cx="${f(-x - 0.25)}" r="0.08" fill="#ffe066"/>`; } },
  coffin: { w: 1, h: 2, draw(w, h) { const x = -w / 2, y = -h / 2; return `<rect x="${f(x + 0.08)}" y="${f(y + 0.1)}" width="${w}" height="${h}" fill="rgba(0,0,0,.35)"/><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="0.08" fill="#8a857c" stroke="#4b4741" stroke-width="0.06"/><rect x="${f(x + 0.15)}" y="${f(y + 0.15)}" width="${f(w - 0.3)}" height="${f(h - 0.3)}" rx="0.06" fill="#9f9a91" stroke="#6b665e" stroke-width="0.03"/><path d="M0 ${f(y + 0.4)}v${f(h * 0.4)}M-0.15 ${f(y + 0.6)}h0.3" stroke="#6b665e" stroke-width="0.05"/>`; } },
  stairs: { w: 1, h: 2, draw(w, h) { const x = -w / 2, y = -h / 2, n = Math.max(3, Math.round(h * 3)); let s = `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#55514b"/>`; for (let i = 0; i < n; i++) { const c = Math.round(160 - (i * 90) / n); s += `<rect x="${x}" y="${f(y + (i * h) / n)}" width="${w}" height="${f(h / n - 0.03)}" fill="rgb(${c},${c - 4},${c - 10})"/>`; } return s; } },
  well: { w: 1.5, h: 1.5, draw(w) { const r = w / 2 - 0.1; return `<circle cx="0.08" cy="0.1" r="${f(r + 0.05)}" fill="rgba(0,0,0,.35)"/><circle r="${f(r)}" fill="#1f3a52" stroke="#8f8a83" stroke-width="0.22"/><circle r="${f(r)}" fill="none" stroke="#5f5a53" stroke-width="0.03"/>`; } },
  fountain: { w: 3, h: 3, draw(w) { const r = w / 2 - 0.1; return `<circle cx="0.1" cy="0.12" r="${f(r)}" fill="rgba(0,0,0,.35)"/><circle r="${f(r)}" fill="#3d6e8e" stroke="#a19c93" stroke-width="0.25"/><circle r="${f(r * 0.3)}" fill="#a19c93" stroke="#5f5a53" stroke-width="0.05"/><circle r="${f(r * 0.6)}" fill="none" stroke="rgba(255,255,255,.3)" stroke-width="0.04"/>`; } },
  log: { w: 2, h: 0.5, draw(w, h) { return `<rect x="${f(-w / 2 + 0.06)}" y="${f(-h / 2 + 0.08)}" width="${w}" height="${h}" rx="${f(h / 2)}" fill="rgba(0,0,0,.3)"/><rect x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}" rx="${f(h / 2)}" fill="#6b4423" stroke="#3d2511" stroke-width="0.04"/><path d="M${f(-w / 2 + 0.3)} ${f(-h * 0.15)}h${f(w * 0.5)}" stroke="#4a2f14" stroke-width="0.03"/><ellipse cx="${f(w / 2 - h / 2)}" rx="${f(h * 0.3)}" ry="${f(h * 0.42)}" fill="#a77b45" stroke="#5a3a1c" stroke-width="0.03"/>`; } },
  stall: { w: 2, h: 2, draw(w, h) { const x = -w / 2, y = -h / 2; let s = `<rect x="${f(x + 0.1)}" y="${f(y + 0.12)}" width="${w}" height="${h}" fill="rgba(0,0,0,.3)"/>`; const n = 6; for (let i = 0; i < n; i++) s += `<rect x="${f(x + (i * w) / n)}" y="${y}" width="${f(w / n)}" height="${h}" fill="${i % 2 ? '#e9e1cf' : '#b23a48'}"/>`; return s + `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="#5a3a1c" stroke-width="0.05"/>`; } },
  fence: { w: 3, h: 0.2, draw(w) { let s = `<path d="M${-w / 2} 0H${w / 2}" stroke="#6b4423" stroke-width="0.1"/>`; for (let x = -w / 2; x <= w / 2 + 0.01; x += 1) s += `<rect x="${f(x - 0.08)}" y="-0.08" width="0.16" height="0.16" fill="#4a2f14"/>`; return s; } },
  bridge: { w: 5, h: 2, draw(w, h) { const x = -w / 2, y = -h / 2; let s = `<rect x="${f(x + 0.1)}" y="${f(y + 0.15)}" width="${w}" height="${h}" fill="rgba(0,0,0,.35)"/><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#8a5a2e"/>`; for (let px = x + 0.25; px < -x; px += 0.25) s += `<path d="M${f(px)} ${y}v${h}" stroke="#5a3a1c" stroke-width="0.03"/>`; return s + `<rect x="${x}" y="${y}" width="${w}" height="0.15" fill="#4a2f14"/><rect x="${x}" y="${f(-y - 0.15)}" width="${w}" height="0.15" fill="#4a2f14"/>`; } },
  reeds: { w: 1, h: 1, draw(w, h, R) { let s = ''; for (let i = 0; i < 7; i++) { const x = R(-0.35, 0.35), y = R(-0.3, 0.35); s += `<path d="M${f(x)} ${f(y)}l${f(R(-0.12, 0.12))} -0.35" stroke="${i % 2 ? '#6b8a3a' : '#8a9a4a'}" stroke-width="0.05" stroke-linecap="round"/>`; } return s; } },
  bones: { w: 1, h: 1, draw(w, h, R) { let s = ''; for (let i = 0; i < 4; i++) { const x = R(-0.3, 0.3), y = R(-0.3, 0.3), a = R(0, 180); s += `<g transform="translate(${f(x)} ${f(y)}) rotate(${f(a)})"><path d="M-0.18 0H0.18" stroke="#e8e2d0" stroke-width="0.06"/><circle cx="-0.18" r="0.05" fill="#e8e2d0"/><circle cx="0.18" r="0.05" fill="#e8e2d0"/></g>`; } return s; } },
};
const OBJ_ALIASES = { tree_large: 'tree', oak: 'tree', palm: 'tree', stalagmite: 'rock', sarcophagus: 'coffin', bar: 'counter', shelf: 'bookshelf', 'round table': 'roundtable', round_table: 'roundtable', stool: 'chair', lantern: 'torch', brazier: 'campfire', column: 'pillar', box: 'crate', hay: 'crate', tomb: 'coffin', cot: 'bed', stall_market: 'stall' };
const objType = (t) => { const k = String(t || '').toLowerCase(); return OBJ[k] ? k : OBJ_ALIASES[k] || null; };

// ---------------------------------------------------------------- normalize
function normalizeMap(m) {
  m = m && typeof m === 'object' ? m : {};
  const W = clamp(Math.round(+m.width || 30), 5, 120), H = clamp(Math.round(+m.height || 20), 5, 120);
  const num = (v, d = 0) => (Number.isFinite(+v) ? +v : d);
  const pt = (p) => (Array.isArray(p) ? [num(p[0]), num(p[1])] : [num(p?.x), num(p?.y)]);
  const regions = (Array.isArray(m.regions) ? m.regions : []).map((r) => {
    const shape = { polygon: 'poly', line: 'path', polyline: 'path', river: 'path', road: 'path' }[r.shape] || r.shape || (r.points ? (r.width ? 'path' : 'poly') : r.r ? 'circle' : 'rect');
    const o = { terrain: terrainOf(r.terrain), shape };
    if (shape === 'circle') Object.assign(o, { x: num(r.x), y: num(r.y), r: Math.max(0.2, num(r.r, 1)) });
    else if (shape === 'poly' || shape === 'path') { o.points = (r.points || []).map(pt); if (shape === 'path') o.width = Math.max(0.3, num(r.width, 2)); }
    else Object.assign(o, { shape: 'rect', x: num(r.x), y: num(r.y), w: Math.max(0.2, num(r.w ?? r.width, 1)), h: Math.max(0.2, num(r.h ?? r.height, 1)) });
    if (r.walls) o.walls = true;
    return o;
  }).filter((r) => !r.points || r.points.length >= 2);
  const walls = (Array.isArray(m.walls) ? m.walls : []).map((w) => (Array.isArray(w) ? w : w?.points || []).map(pt)).filter((w) => w.length >= 2);
  const doors = (Array.isArray(m.doors) ? m.doors : []).map((d) => ({ x: Math.round(num(d.x)), y: Math.round(num(d.y)), dir: d.dir === 'v' ? 'v' : 'h' }));
  const objects = (Array.isArray(m.objects) ? m.objects : []).map((o) => {
    const t = objType(o.type) || String(o.type || 'marker');
    const d = OBJ[t] || { w: 1, h: 1 };
    const s = num(o.size, 0);
    return { type: t, x: num(o.x), y: num(o.y), w: num(o.w, s || d.w), h: num(o.h, s || d.h), rot: num(o.rot) };
  });
  const labels = (Array.isArray(m.labels) ? m.labels : []).map((l) => ({ text: String(l.text ?? ''), x: num(l.x), y: num(l.y) })).filter((l) => l.text);
  return {
    name: String(m.name || 'Untitled map'), width: W, height: H, feetPerSquare: num(m.feetPerSquare, 5) || 5,
    base: terrainOf(m.base || 'grass'), lighting: ['day', 'dusk', 'night'].includes(m.lighting) ? m.lighting : 'day',
    regions, walls, doors, objects, labels,
  };
}

// ---------------------------------------------------------------- render
function smoothPath(pts, closed) {
  const n = pts.length;
  if (n < 3) return `M${pts.map((p) => `${f(p[0])} ${f(p[1])}`).join(' L')}${closed ? 'Z' : ''}`;
  const P = (i) => (closed ? pts[(i + n) % n] : pts[clamp(i, 0, n - 1)]);
  let d = `M${f(P(0)[0])} ${f(P(0)[1])}`;
  for (let i = 0; i < (closed ? n : n - 1); i++) {
    const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
    d += ` C${f(p1[0] + (p2[0] - p0[0]) / 6)} ${f(p1[1] + (p2[1] - p0[1]) / 6)} ${f(p2[0] - (p3[0] - p1[0]) / 6)} ${f(p2[1] - (p3[1] - p1[1]) / 6)} ${f(p2[0])} ${f(p2[1])}`;
  }
  return d + (closed ? 'Z' : '');
}
function regionSvg(r) {
  const T = TERRAIN[r.terrain], paint = `url(#t-${r.terrain})`;
  const shape = (attrs) => {
    if (r.shape === 'circle') return `<circle cx="${f(r.x)}" cy="${f(r.y)}" r="${f(r.r)}" ${attrs}/>`;
    if (r.shape === 'poly') return T.natural ? `<path d="${smoothPath(r.points, true)}" ${attrs}/>` : `<polygon points="${r.points.map((p) => `${f(p[0])},${f(p[1])}`).join(' ')}" ${attrs}/>`;
    return `<rect x="${f(r.x)}" y="${f(r.y)}" width="${f(r.w)}" height="${f(r.h)}" ${attrs}/>`;
  };
  if (r.shape === 'path') {
    const d = smoothPath(r.points, false), cap = 'fill="none" stroke-linecap="round" stroke-linejoin="round"';
    return `<g${T.natural ? ' filter="url(#rough)"' : ''}><path d="${d}" ${cap} stroke="rgba(0,0,0,.25)" stroke-width="${f(r.width + 0.35)}"/><path d="${d}" ${cap} stroke="${paint}" stroke-width="${f(r.width)}"/></g>`;
  }
  if (T.natural) return `<g filter="url(#rough)">${shape('fill="none" stroke="rgba(0,0,0,.25)" stroke-width="0.35"')}${shape(`fill="${paint}"`)}</g>`;
  return shape(`fill="${paint}"${T.edge ? ` stroke="${T.edge}" stroke-width="0.12"` : ''}`);
}
function objectSvg(o) {
  const def = OBJ[o.type];
  const R = (() => { const r = mulberry32(hashSeed(o.x, o.y, o.w)); return (a, b) => a + r() * (b - a); })();
  const inner = def ? def.draw(o.w, o.h, R) : `<circle r="${f(Math.min(o.w, o.h) * 0.4)}" fill="#c9a227" stroke="#5a3a1c" stroke-width="0.05"/><text y="0.12" font-size="0.35" text-anchor="middle" fill="#1a1408" font-family="sans-serif">${esc(o.type.slice(0, 3))}</text>`;
  return `<g transform="translate(${f(o.x)} ${f(o.y)})${o.rot ? ` rotate(${f(o.rot)})` : ''}">${inner}</g>`;
}
function rectWall(r) { return [[r.x, r.y], [r.x + r.w, r.y], [r.x + r.w, r.y + r.h], [r.x, r.y + r.h], [r.x, r.y]]; }
const colName = (i) => (i < 26 ? '' : String.fromCharCode(64 + Math.floor(i / 26))) + String.fromCharCode(65 + (i % 26));

function renderSvg(map, opts = {}) {
  const { width: W, height: H } = map;
  const px = opts.px || 40;
  const used = new Set([map.base, ...map.regions.map((r) => r.terrain)]);
  let defs = [...used].map((t) => terrainPattern(`t-${t}`, t)).join('');
  defs += `<filter id="rough" x="-30%" y="-30%" width="160%" height="160%"><feTurbulence type="fractalNoise" baseFrequency="0.7" numOctaves="2" seed="4" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="0.55" xChannelSelector="R" yChannelSelector="G"/></filter>`;
  defs += `<filter id="grain" filterUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}"><feTurbulence type="fractalNoise" baseFrequency="0.18" numOctaves="3" seed="9"/><feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  1.8 0 0 0 -0.72"/></filter>`;
  let body = `<rect width="${W}" height="${H}" fill="url(#t-${map.base})"/>`;
  body += map.regions.map(regionSvg).join('');
  body += `<rect width="${W}" height="${H}" filter="url(#grain)" opacity="0.45"/>`;
  const walls = [...map.walls, ...map.regions.filter((r) => r.walls && r.shape === 'rect').map(rectWall)];
  if (walls.length) {
    const d = walls.map((w) => `M${w.map((p) => `${f(p[0])} ${f(p[1])}`).join(' L')}`).join(' ');
    body += `<path d="${d}" fill="none" stroke="rgba(0,0,0,.35)" stroke-width="0.6" stroke-linecap="square" transform="translate(0.08 0.1)"/>`;
    body += `<path d="${d}" fill="none" stroke="#24201c" stroke-width="0.34" stroke-linecap="square" stroke-linejoin="miter"/>`;
    body += `<path d="${d}" fill="none" stroke="#615950" stroke-width="0.16" stroke-linecap="square" stroke-linejoin="miter"/>`;
  }
  for (const dr of map.doors) {
    body += dr.dir === 'h'
      ? `<rect x="${dr.x + 0.08}" y="${dr.y - 0.16}" width="0.84" height="0.32" fill="#a0672e" stroke="#3d2511" stroke-width="0.05"/><path d="M${dr.x + 0.5} ${dr.y - 0.16}v0.32" stroke="#3d2511" stroke-width="0.03"/>`
      : `<rect x="${dr.x - 0.16}" y="${dr.y + 0.08}" width="0.32" height="0.84" fill="#a0672e" stroke="#3d2511" stroke-width="0.05"/><path d="M${dr.x - 0.16} ${dr.y + 0.5}h0.32" stroke="#3d2511" stroke-width="0.03"/>`;
  }
  body += map.objects.map(objectSvg).join('');
  if (opts.lighting !== false && map.lighting === 'night') {
    const lights = map.objects.filter((o) => OBJ[o.type]?.light);
    defs += `<radialGradient id="lg"><stop offset="0" stop-color="#000"/><stop offset="0.55" stop-color="#000" stop-opacity="0.7"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>`;
    defs += `<mask id="lm" maskUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="#fff"/>${lights.map((o) => `<circle cx="${f(o.x)}" cy="${f(o.y)}" r="${OBJ[o.type].light}" fill="url(#lg)"/>`).join('')}</mask>`;
    body += `<rect width="${W}" height="${H}" fill="#0b1230" opacity="0.62" mask="url(#lm)"/>`;
  } else if (opts.lighting !== false && map.lighting === 'dusk') {
    body += `<rect width="${W}" height="${H}" fill="#ff8a3d" opacity="0.13"/><rect width="${W}" height="${H}" fill="#2a1a40" opacity="0.16"/>`;
  }
  if (opts.grid !== false) {
    let g = ''; for (let x = 1; x < W; x++) g += `M${x} 0V${H}`; for (let y = 1; y < H; y++) g += `M0 ${y}H${W}`;
    body += `<path d="${g}" stroke="rgba(0,0,0,.42)" stroke-width="0.035"/><path d="${g}" stroke="rgba(255,255,255,.08)" stroke-width="0.015" transform="translate(0.03 0.03)"/>`;
    body += `<rect width="${W}" height="${H}" fill="none" stroke="rgba(0,0,0,.6)" stroke-width="0.08"/>`;
  }
  const txt = (x, y, s, size, anchor = 'middle') => `<text x="${f(x)}" y="${f(y)}" font-size="${size}" text-anchor="${anchor}" font-family="Georgia, serif" font-weight="700" fill="#fff" stroke="#000" stroke-width="${f(size * 0.18)}" paint-order="stroke" stroke-linejoin="round">${esc(s)}</text>`;
  if (opts.coords) {
    for (let x = 0; x < W; x++) body += txt(x + 0.5, 0.42, colName(x), 0.32);
    for (let y = 1; y < H; y++) body += txt(0.08, y + 0.62, y + 1, 0.32, 'start');
  }
  body += map.labels.map((l) => txt(l.x, l.y, l.text, 0.6)).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W * px}" height="${H * px}" shape-rendering="geometricPrecision"><defs>${defs}</defs>${body}</svg>`;
}

// ---------------------------------------------------------------- offline generator
const SIZES = { small: [20, 15], medium: [30, 20], large: [40, 28] };
function generate(desc, seed, sizeKey) {
  const rnd = mulberry32(seed);
  const R = (a, b) => a + rnd() * (b - a);
  const RI = (a, b) => Math.floor(R(a, b + 1));
  const pick = (a) => a[Math.floor(rnd() * a.length)];
  const t = ` ${String(desc).toLowerCase()} `;
  const has = (re) => re.test(t);
  const [W, H] = SIZES[sizeKey] || SIZES.medium;
  const words = String(desc).trim().split(/\s+/).slice(0, 6).join(' ');
  const map = { name: words ? words[0].toUpperCase() + words.slice(1) : 'Battle map', width: W, height: H, feetPerSquare: 5, base: 'grass', lighting: 'day', regions: [], walls: [], doors: [], objects: [], labels: [] };
  if (has(/\b(night|midnight|moonlit|moonlight|nighttime)\b/)) map.lighting = 'night';
  else if (has(/\b(dusk|sunset|evening|twilight)\b/)) map.lighting = 'dusk';
  const biome = has(/\b(snow|snowy|winter|frozen|ice|icy|tundra|arctic)\b/) ? 'snow' : has(/\b(desert|dunes?|sandy|badlands|wasteland)\b/) ? 'desert' : has(/\b(swamp|marsh|bog|fen|bayou)\b/) ? 'swamp' : 'grass';
  map.base = { snow: 'snow', desert: 'sand', swamp: 'mud', grass: 'grass' }[biome];

  // occupancy so scattered things don't land on roads, rivers or each other
  const occ = [];
  const segDist = (px, py, a, b) => {
    const dx = b[0] - a[0], dy = b[1] - a[1], l = dx * dx + dy * dy || 1;
    const k = clamp(((px - a[0]) * dx + (py - a[1]) * dy) / l, 0, 1);
    return Math.hypot(px - a[0] - k * dx, py - a[1] - k * dy);
  };
  const blocked = (x, y, r) => occ.some((o) => {
    if (o.k === 'c') return Math.hypot(x - o.x, y - o.y) < r + o.r;
    if (o.k === 'r') return x + r > o.x && x - r < o.x + o.w && y + r > o.y && y - r < o.y + o.h;
    for (let i = 1; i < o.pts.length; i++) if (segDist(x, y, o.pts[i - 1], o.pts[i]) < r + o.wd / 2) return true;
    return false;
  });
  const obj = (type, x, y, extra = {}) => { const o = { type, x: f(x), y: f(y), ...extra }; map.objects.push(o); const d = OBJ[type]; occ.push({ k: 'c', x, y, r: Math.max(extra.w ?? extra.size ?? d.w, extra.h ?? extra.size ?? d.h) / 2 }); return o; };
  const scatter = (type, n, o = {}) => {
    const area = o.area || [0, 0, W, H];
    let placed = 0;
    for (let tries = 0; tries < n * 25 && placed < n; tries++) {
      const size = o.size ? f(R(o.size[0], o.size[1])) : undefined;
      const r = (size ?? OBJ[type].w) / 2 * (o.spacing ?? 0.85);
      const pad = o.area ? r : 0;
      const x = R(area[0] + pad, area[0] + area[2] - pad), y = R(area[1] + pad, area[1] + area[3] - pad);
      if (o.inside && !o.inside(x, y)) continue;
      if (blocked(x, y, r)) continue;
      obj(type, x, y, { ...(size ? { size } : {}), ...(o.rot ? { rot: Math.round(R(0, 360)) } : {}) });
      placed++;
    }
  };
  const meander = (a, b, n, wob) => {
    const pts = [a]; const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy), nx = -dy / len, ny = dx / len;
    let off = 0;
    for (let i = 1; i < n; i++) { off = clamp(off + R(-wob, wob), -wob * 1.5, wob * 1.5); pts.push([f(a[0] + (dx * i) / n + nx * off), f(a[1] + (dy * i) / n + ny * off)]); }
    pts.push(b); return pts;
  };
  const blob = (cx, cy, r, n = 10) => Array.from({ length: n }, (_, i) => { const a = (i / n) * 6.283, d = r * R(0.7, 1.15); return [f(cx + Math.cos(a) * d), f(cy + Math.sin(a) * d)]; });
  const region = (r) => { map.regions.push(r); return r; };
  const pathRegion = (terrain, pts, width) => { region({ terrain, shape: 'path', points: pts, width }); occ.push({ k: 'p', pts, wd: width + 0.6 }); };
  const xAt = (pts, y) => { for (let i = 1; i < pts.length; i++) { const a = pts[i - 1], b = pts[i]; if ((a[1] - y) * (b[1] - y) <= 0) return a[0] + ((y - a[1]) / (b[1] - a[1] || 1)) * (b[0] - a[0]); } return pts[0][0]; };
  const yAt = (pts, x) => { for (let i = 1; i < pts.length; i++) { const a = pts[i - 1], b = pts[i]; if ((a[0] - x) * (b[0] - x) <= 0) return a[1] + ((x - a[0]) / (b[0] - a[0] || 1)) * (b[1] - a[1]); } return pts[0][1]; };
  const treeType = biome === 'snow' ? 'pine' : 'tree';
  const density = has(/\b(dense|thick|deep|overgrown|old[- ]growth|jungle)\b/) ? 0.075 : has(/\b(sparse|light|thin|scattered|few)\b/) ? 0.022 : 0.045;

  // ---- shared outdoor features
  function outdoor({ river = has(/\b(river|stream|creek|brook|ford)\b/), road = has(/\b(road|trail|path|highway|track)\b/), bridge = has(/\bbridge\b/), trees = biome === 'desert' ? 0 : 0.03, center = null } = {}) {
    let riverPts = null, roadPts = null;
    if (river || bridge) {
      const width = has(/\b(stream|creek|brook)\b/) ? 2.2 : 4;
      riverPts = meander([R(W * 0.35, W * 0.65), -2], [R(W * 0.35, W * 0.65), H + 2], 7, 1.6);
      pathRegion('water', riverPts, width);
      if (width >= 4) region({ terrain: 'deepwater', shape: 'path', points: riverPts, width: width - 2 });
      if (has(/\bford\b/)) { const y = H / 2; for (let i = -2; i <= 2; i++) obj('rock', xAt(riverPts, y) + i * 0.9, y + R(-0.3, 0.3), { size: 0.8 }); }
      riverPts.width = width;
    }
    if (road || bridge) {
      const wd = has(/\b(trail|path|track)\b/) && !has(/\broad\b/) ? 2 : 3;
      roadPts = meander([-2, R(H * 0.4, H * 0.6)], [W + 2, R(H * 0.4, H * 0.6)], 6, 0.9);
      pathRegion(biome === 'desert' ? 'dirt' : biome === 'swamp' ? 'dirt' : 'dirt', roadPts, wd);
      roadPts.width = wd;
      if (riverPts) {
        const bx = xAt(riverPts, H / 2), by = yAt(roadPts, bx);
        obj('bridge', bx, by, { w: riverPts.width + 3, h: wd });
      }
    }
    if (has(/\b(pond|lake|pool|spring|oasis)\b/)) {
      for (let k = 0; k < 30; k++) {
        const r = has(/\blake\b/) ? R(4, 6) : R(2.5, 3.5), x = R(r + 1, W - r - 1), y = R(r + 1, H - r - 1);
        if (blocked(x, y, r)) continue;
        region({ terrain: 'water', shape: 'poly', points: blob(x, y, r) }); occ.push({ k: 'c', x, y, r: r + 0.5 });
        scatter('reeds', 4, { area: [x - r - 1, y - r - 1, 2 * r + 2, 2 * r + 2], inside: (px, py) => Math.abs(Math.hypot(px - x, py - y) - r) < 0.8 });
        break;
      }
    }
    if (center) occ.push(center);
    return { riverPts, roadPts };
  }
  function vegetation(d) {
    const area = W * H;
    if (biome === 'desert') { scatter('boulder', Math.round(area * 0.006), { size: [1.5, 3] }); scatter('rock', Math.round(area * 0.02)); return; }
    if (biome === 'swamp') { scatter('reeds', Math.round(area * 0.03)); }
    scatter(treeType, Math.round(area * d), { size: [1.8, 3.2] });
    scatter('bush', Math.round(area * d * 0.7), { size: [0.8, 1.4] });
    scatter('rock', Math.round(area * 0.008), { size: [0.7, 1.3] });
    if (d > 0.03) scatter('log', Math.round(area * 0.002), { rot: true });
  }
  function swampPools() {
    for (let i = 0; i < Math.round((W * H) / 70); i++) {
      const r = R(1.5, 3.5), x = R(1, W - 1), y = R(1, H - 1);
      if (blocked(x, y, r + 0.3)) continue;
      region({ terrain: i % 4 ? 'water' : 'deepwater', shape: 'poly', points: blob(x, y, r) }); occ.push({ k: 'c', x, y, r });
    }
  }

  // ---- interiors: carve a cell grid, then walls fall out of its outline
  const cellsToWalls = (floor) => {
    const out = [], isF = (x, y) => x >= 0 && y >= 0 && x < W && y < H && floor[y][x];
    for (let y = 0; y <= H; y++) { let s = null; for (let x = 0; x <= W; x++) { const e = x < W && isF(x, y) !== isF(x, y - 1); if (e && s == null) s = x; if (!e && s != null) { out.push([[s, y], [x, y]]); s = null; } } }
    for (let x = 0; x <= W; x++) { let s = null; for (let y = 0; y <= H; y++) { const e = y < H && isF(x, y) !== isF(x - 1, y); if (e && s == null) s = y; if (!e && s != null) { out.push([[x, s], [x, y]]); s = null; } } }
    return out;
  };
  function dungeon(kind) {
    map.base = kind === 'ruins' ? map.base : 'rock';
    const floor = Array.from({ length: H }, () => Array(W).fill(false)), rooms = [];
    const want = Math.round((W * H) / 110) + 2;
    for (let tries = 0; tries < 400 && rooms.length < want; tries++) {
      const w = RI(4, Math.min(9, W / 3)), h = RI(4, Math.min(8, H / 3)), x = RI(1, W - w - 1), y = RI(1, H - h - 1);
      if (rooms.some((r) => x < r.x + r.w + 2 && x + w + 2 > r.x && y < r.y + r.h + 2 && y + h + 2 > r.y)) continue;
      rooms.push({ x, y, w, h });
    }
    rooms.sort((a, b) => a.x + a.y / 2 - (b.x + b.y / 2));
    const inRoom = (x, y) => rooms.find((r) => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h);
    for (const r of rooms) { for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) floor[y][x] = true; region({ terrain: 'stone', shape: 'rect', x: r.x, y: r.y, w: r.w, h: r.h }); }
    const doorAt = new Set();
    for (let i = 1; i < rooms.length; i++) {
      const a = rooms[i - 1], b = rooms[i];
      const ax = a.x + Math.floor(a.w / 2), ay = a.y + Math.floor(a.h / 2), bx = b.x + Math.floor(b.w / 2), by = b.y + Math.floor(b.h / 2);
      const path = [], hFirst = rnd() < 0.5;
      let x = ax, y = ay; path.push([x, y]);
      const stepTo = (tx, ty) => { while (x !== tx || y !== ty) { if (x !== tx) x += Math.sign(tx - x); else y += Math.sign(ty - y); path.push([x, y]); } };
      if (hFirst) { stepTo(bx, ay); stepTo(bx, by); } else { stepTo(ax, by); stepTo(bx, by); }
      for (let k = 1; k < path.length; k++) {
        const [px, py] = path[k - 1], [cx, cy] = path[k];
        const pr = inRoom(px, py), cr = inRoom(cx, cy);
        if (!floor[cy][cx]) { floor[cy][cx] = true; region({ terrain: 'stone', shape: 'rect', x: cx, y: cy, w: 1, h: 1 }); }
        if (!!pr !== !!cr && rnd() < 0.75) {
          const corr = pr ? [cx, cy] : [px, py];
          const horiz = cy === py;
          const side = horiz ? [[corr[0], corr[1] - 1], [corr[0], corr[1] + 1]] : [[corr[0] - 1, corr[1]], [corr[0] + 1, corr[1]]];
          if (side.every(([sx, sy]) => !inRoom(sx, sy) && !(floor[sy]?.[sx]))) {
            const d = horiz ? { x: Math.max(px, cx), y: cy, dir: 'v' } : { x: cx, y: Math.max(py, cy), dir: 'h' };
            const key = `${d.x},${d.y},${d.dir}`; if (!doorAt.has(key)) { doorAt.add(key); map.doors.push(d); }
          }
        }
      }
    }
    // later corridor cells may have widened a doorway: drop doors whose sides are now open
    map.doors = map.doors.filter((d) => d.dir === 'v' ? !(floor[d.y - 1]?.[d.x] && floor[d.y - 1]?.[d.x - 1]) && !(floor[d.y + 1]?.[d.x] && floor[d.y + 1]?.[d.x - 1]) : !(floor[d.y]?.[d.x - 1] && floor[d.y - 1]?.[d.x - 1]) && !(floor[d.y]?.[d.x + 1] && floor[d.y - 1]?.[d.x + 1]));
    let walls = cellsToWalls(floor);
    if (kind === 'ruins') {
      // break walls into unit pieces and knock out runs of them
      const pieces = [];
      for (const [[x1, y1], [x2, y2]] of walls) { const n = Math.abs(x2 - x1) + Math.abs(y2 - y1); for (let i = 0; i < n; i++) pieces.push([[x1 + Math.sign(x2 - x1) * i, y1 + Math.sign(y2 - y1) * i], [x1 + Math.sign(x2 - x1) * (i + 1), y1 + Math.sign(y2 - y1) * (i + 1)]]); }
      walls = []; let keep = true;
      for (const p of pieces) { if (rnd() < 0.18) keep = !keep; if (keep) walls.push(p); else if (rnd() < 0.3) obj('rubble', (p[0][0] + p[1][0]) / 2, (p[0][1] + p[1][1]) / 2, { size: 1.2 }); }
      map.doors = [];
      for (const r of rooms) for (let i = 0; i < Math.round((r.w * r.h) / 8); i++) region({ terrain: map.base, shape: 'circle', x: f(R(r.x, r.x + r.w)), y: f(R(r.y, r.y + r.h)), r: f(R(0.6, 1.6)) });
    }
    map.walls = walls;
    for (const r of rooms) occ.push({ k: 'r', x: r.x - 0.6, y: r.y - 0.6, w: r.w + 1.2, h: r.h + 1.2 });
    const free = (r, type, n, o = {}) => { occ.splice(occ.findIndex((q) => q.k === 'r' && q.x === r.x - 0.6 && q.y === r.y - 0.6), 1); scatter(type, n, { area: [r.x + 0.6, r.y + 0.6, r.w - 1.2, r.h - 1.2], ...o }); occ.push({ k: 'r', x: r.x - 0.6, y: r.y - 0.6, w: r.w + 1.2, h: r.h + 1.2 }); };
    const big = [...rooms].sort((a, b) => b.w * b.h - a.w * a.h)[0];
    const holy = has(/\b(temple|shrine|sanctum|chapel|cathedral|church|altar)\b/), tomb = has(/\b(crypt|tomb|catacombs?|mausoleum|barrow|graveyard)\b/);
    if (rooms[0]) obj('stairs', rooms[0].x + 0.5, rooms[0].y + 1, { w: 1, h: 2 });
    for (const r of rooms) {
      const cx = r.x + r.w / 2, cy = r.y + r.h / 2;
      if (r === big && (holy || tomb)) {
        obj('altar', cx, r.y + 1.2);
        if (r.w >= 6) for (let y = r.y + 2.5; y < r.y + r.h - 1; y += 2) { obj('pillar', r.x + 1.5, y); obj('pillar', r.x + r.w - 1.5, y); }
        continue;
      }
      if (r === rooms[0]) continue;
      const role = tomb && rnd() < 0.6 ? 'tomb' : pick(['store', 'guard', 'empty', 'bunk', 'treasure', 'collapsed']);
      if (role === 'tomb') { for (let x = r.x + 1; x + 1 <= r.x + r.w - 1; x += 2) for (let y = r.y + 1; y + 2 <= r.y + r.h - 1; y += 3) obj('coffin', x + 0.5, y + 1); }
      else if (role === 'store') { free(r, 'crate', RI(3, 6)); free(r, 'barrel', RI(2, 5)); }
      else if (role === 'guard') { obj('table', cx, cy); obj('chair', cx - 0.6, cy - 0.8); obj('chair', cx + 0.6, cy + 0.8); free(r, 'barrel', 1); }
      else if (role === 'bunk') { for (let x = r.x + 0.5; x + 1 <= r.x + r.w; x += 1.5) obj('bed', x + 0.5, r.y + 1); }
      else if (role === 'treasure') { obj('chest', cx, r.y + 0.8); free(r, 'rubble', 1); }
      else if (role === 'collapsed') { free(r, 'rubble', RI(2, 4)); free(r, 'boulder', 1); }
      if (!holy && rnd() < 0.5) obj('torch', r.x + 0.3, r.y + 0.3);
    }
    if (kind === 'ruins') { vegetation(density * 0.8); }
  }
  function cave() {
    map.base = 'rock';
    const chambers = [], n = Math.round((W * H) / 120) + 2;
    for (let tries = 0; tries < 200 && chambers.length < n; tries++) {
      const r = R(2.5, Math.min(5, H / 4)), x = R(r + 1, W - r - 1), y = R(r + 1, H - r - 1);
      if (chambers.some((c) => Math.hypot(c.x - x, c.y - y) < c.r + r + 1)) continue;
      chambers.push({ x, y, r });
    }
    chambers.sort((a, b) => a.x - b.x);
    const tunnels = [];
    const edge = chambers[0];
    tunnels.push(meander([-1, edge.y + R(-1, 1)], [edge.x, edge.y], 4, 0.8));
    for (let i = 1; i < chambers.length; i++) tunnels.push(meander([chambers[i - 1].x, chambers[i - 1].y], [chambers[i].x, chambers[i].y], 5, 1));
    for (const tp of tunnels) region({ terrain: 'cavefloor', shape: 'path', points: tp, width: f(R(2.4, 3.4)) });
    for (const c of chambers) region({ terrain: 'cavefloor', shape: 'poly', points: blob(c.x, c.y, c.r, 12) });
    const inside = (x, y) => chambers.some((c) => Math.hypot(c.x - x, c.y - y) < c.r * 0.75) || tunnels.some((tp) => tp.some((p, i) => i && segDist(x, y, tp[i - 1], p) < 0.8));
    if (has(/\b(water|pool|lake|underground river|stream|spring)\b/)) {
      const c = pick(chambers); region({ terrain: 'water', shape: 'poly', points: blob(c.x, c.y, c.r * 0.5, 9) }); occ.push({ k: 'c', x: c.x, y: c.y, r: c.r * 0.55 });
    }
    if (has(/\blava\b/)) { const c = pick(chambers); region({ terrain: 'lava', shape: 'poly', points: blob(c.x, c.y, c.r * 0.45, 9) }); occ.push({ k: 'c', x: c.x, y: c.y, r: c.r * 0.5 }); }
    scatter('rock', Math.round(chambers.length * 3), { inside, size: [0.6, 1.2] });
    scatter('boulder', chambers.length, { inside, size: [1.4, 2] });
    if (has(/\b(den|lair|nest|beast|wolf|wolves|bear|wendigo|monster|dragon)\b/)) scatter('bones', chambers.length * 2, { inside });
    if (has(/\b(mine|mining|dwarf|dwarven)\b/)) { scatter('cart', 2, { inside }); scatter('crate', 3, { inside }); scatter('torch', chambers.length, { inside }); }
    if (has(/\b(camp|bandit|goblin|kobold|hideout)\b/)) { const c = chambers[Math.floor(chambers.length / 2)]; obj('campfire', c.x, c.y); scatter('crate', 3, { inside }); scatter('bed', 2, { inside, rot: true }); }
  }
  function tavern() {
    const saloon = has(/\b(saloon|frontier|western|wild west)\b/);
    map.base = saloon || biome === 'desert' ? 'dirt' : map.base;
    const x0 = 2, y0 = 2, w = W - 4, h = H - 6, kw = Math.max(5, Math.round(w * 0.22)), kx = x0 + w - kw;
    region({ terrain: 'dirt', shape: 'rect', x: 0, y: y0 + h, w: W, h: H - y0 - h });
    region({ terrain: 'wood', shape: 'rect', x: x0, y: y0, w, h, walls: true });
    region({ terrain: 'stone', shape: 'rect', x: kx, y: y0, w: kw, h });
    const midY = y0 + Math.floor(h / 2);
    map.walls.push([[kx, y0], [kx, midY]], [[kx, midY + 1], [kx, y0 + h]]);
    map.doors.push({ x: kx, y: midY, dir: 'v' }, { x: x0 + Math.floor((kx - x0) / 2), y: y0 + h, dir: 'h' }, { x: kx + Math.floor(kw / 2), y: y0, dir: 'h' });
    const bw = Math.min(7, kx - x0 - 4);
    obj('counter', x0 + 1.5 + bw / 2, y0 + 2.5, { w: bw, h: 1 });
    for (let x = x0 + 0.6; x < x0 + 1 + bw; x += 0.9) obj('barrel', x, y0 + 0.6);
    for (let x = x0 + 2; x < x0 + 1 + bw; x += 1.3) obj('chair', x, y0 + 3.4);
    obj('fireplace', x0 + 0.45, y0 + h / 2 + 1, { rot: 90 });
    obj('stairs', x0 + 1, y0 + h - 1.5, { w: 2, h: 3 });
    occ.push({ k: 'r', x: x0, y: y0, w: bw + 2, h: 4 }, { k: 'r', x: x0, y: y0 + h - 3.5, w: 3, h: 3.5 }, { k: 'r', x: kx - 1, y: y0, w: kw + 1, h }, { k: 'r', x: x0 + Math.floor((kx - x0) / 2) - 1, y: y0 + h - 2, w: 3, h: 2 });
    for (let y = y0 + 5.5; y < y0 + h - 1.5; y += 3.5) for (let x = x0 + 4; x < kx - 1.5; x += 3.6) {
      const jx = x + R(-0.4, 0.4), jy = y + R(-0.3, 0.3);
      if (blocked(jx, jy, 1.2)) continue;
      if (rnd() < 0.6) { obj('roundtable', jx, jy); for (let k = 0; k < 4; k++) { const a = k * 1.571 + R(-0.3, 0.3); map.objects.push({ type: 'chair', x: f(jx + Math.cos(a) * 1.1), y: f(jy + Math.sin(a) * 1.1), rot: Math.round(a * 57.3 + 90) }); } }
      else { obj('table', jx, jy); for (const sx of [-0.5, 0.5]) { map.objects.push({ type: 'chair', x: f(jx + sx), y: f(jy - 0.85) }); map.objects.push({ type: 'chair', x: f(jx + sx), y: f(jy + 0.85), rot: 180 }); } }
    }
    obj('table', kx + kw / 2, y0 + h / 2 + 2.5, { w: 2, h: 1 });
    obj('fireplace', kx + kw - 0.45, y0 + 2, { rot: 90 });
    for (let i = 0; i < 3; i++) obj('crate', kx + 0.8 + i, y0 + h - 0.8);
    obj('barrel', kx + kw - 0.7, y0 + h - 0.7);
    occ.push({ k: 'r', x: x0, y: y0, w, h });
    scatter('barrel', 3, { area: [0, y0 + h + 0.5, W, H - y0 - h - 0.5] });
    if (saloon) { obj('fence', x0 + w / 2 - 6, H - 1, { w: 3 }); obj('wagon', W - 3, H - 2.2, { rot: 90 }); }
    vegetation(density * 0.2);
  }
  function town() {
    map.base = biome === 'grass' ? 'grass' : map.base;
    const sq = { x: W / 2 - Math.min(6, W / 5), y: H / 2 - Math.min(4.5, H / 5) }; sq.w = (W / 2 - sq.x) * 2; sq.h = (H / 2 - sq.y) * 2;
    for (const end of [[-2, H / 2 + R(-2, 2)], [W + 2, H / 2 + R(-2, 2)], [W / 2 + R(-3, 3), -2], [W / 2 + R(-3, 3), H + 2]]) pathRegion('cobble', meander([W / 2, H / 2], end, 3, 0.4), 3);
    region({ terrain: 'cobble', shape: 'rect', x: sq.x, y: sq.y, w: sq.w, h: sq.h });
    occ.push({ k: 'r', x: sq.x - 0.5, y: sq.y - 0.5, w: sq.w + 1, h: sq.h + 1 });
    for (let tries = 0; tries < 300; tries++) {
      const w = RI(4, 7), h = RI(4, 6), x = RI(0, W - w), y = RI(0, H - h);
      if (blocked(x + w / 2, y + h / 2, Math.max(w, h) / 2 + 0.3) || occ.some((o) => o.k === 'r' && x < o.x + o.w && x + w > o.x && y < o.y + o.h && y + h > o.y)) continue;
      region({ terrain: 'roof', shape: 'rect', x, y, w, h }); occ.push({ k: 'r', x: x - 0.5, y: y - 0.5, w: w + 1, h: h + 1 });
    }
    obj(has(/\bfountain\b/) ? 'fountain' : 'well', W / 2, H / 2);
    if (has(/\b(market|bazaar|fair|stalls?|merchants?)\b/)) { for (let i = 0; i < 6; i++) { const a = (i / 6) * 6.283; obj('stall', W / 2 + Math.cos(a) * (sq.w / 2 - 1.5), H / 2 + Math.sin(a) * (sq.h / 2 - 1.5), { rot: Math.round(a * 57.3 + 90) }); } }
    const sqArea = [sq.x, sq.y, sq.w, sq.h];
    occ.splice(occ.findIndex((o) => o.k === 'r' && o.x === sq.x - 0.5), 1);
    scatter('crate', 4, { area: sqArea }); scatter('barrel', 4, { area: sqArea });
    if (has(/\b(cart|wagon|caravan)\b/)) scatter('cart', 1, { area: sqArea, rot: true });
    scatter('tree', Math.round((W * H) / 120), { size: [1.8, 2.6] }); scatter('bush', Math.round((W * H) / 80));
  }
  function camp(center) {
    const r = Math.min(W, H) * 0.22;
    region({ terrain: 'dirt', shape: 'poly', points: blob(center[0], center[1], r, 12) });
    obj('campfire', center[0], center[1]);
    for (let i = 0; i < 3; i++) { const a = i * 2.094 + R(0, 0.5); obj('log', center[0] + Math.cos(a) * 1.7, center[1] + Math.sin(a) * 1.7, { rot: Math.round(a * 57.3 + 90) }); }
    const nt = RI(3, 5); for (let i = 0; i < nt; i++) { const a = (i / nt) * 6.283 + R(-0.3, 0.3); obj('tent', center[0] + Math.cos(a) * (r - 1.5), center[1] + Math.sin(a) * (r - 1.5), { rot: Math.round(a * 57.3 + 90) }); }
    scatter('crate', 3, { area: [center[0] - r, center[1] - r, 2 * r, 2 * r] }); scatter('barrel', 2, { area: [center[0] - r, center[1] - r, 2 * r, 2 * r] });
    if (has(/\b(wagon|caravan|cart|merchant|bandit)\b/)) scatter('wagon', 1, { area: [center[0] - r, center[1] - r, 2 * r, 2 * r], rot: true });
    occ.push({ k: 'c', x: center[0], y: center[1], r: r + 0.5 });
  }

  // ---- pick a scene
  if (has(/\b(tavern|inn|saloon|pub|alehouse|taproom|bar)\b/)) tavern();
  else if (has(/\b(cave|cavern|grotto|mine|tunnels?|underdark|lair|den)\b/)) cave();
  else if (has(/\b(ruins?|ruined|abandoned)\b/)) { outdoor(); dungeon('ruins'); }
  else if (has(/\b(dungeon|crypt|tomb|catacombs?|vault|temple|sanctum|shrine|keep|fortress|castle|mausoleum|prison|sewers?)\b/)) dungeon('dungeon');
  else if (has(/\b(town|village|street|square|market|plaza|city|hamlet|bazaar)\b/)) town();
  else {
    const isCamp = has(/\b(camp|campsite|encampment|campfire|bivouac)\b/);
    const { roadPts } = outdoor({ center: isCamp ? null : has(/\b(clearing|glade|meadow)\b/) ? { k: 'c', x: W / 2, y: H / 2, r: Math.min(W, H) * 0.28 } : null });
    if (biome === 'swamp') swampPools();
    if (isCamp) camp([W / 2 + R(-W / 8, W / 8), roadPts ? clamp(yAt(roadPts, W / 2) + (rnd() < 0.5 ? -1 : 1) * H * 0.28, H * 0.25, H * 0.75) : H / 2]);
    if (roadPts && has(/\b(ambush|wagon|caravan|cart|merchant|coach|wreck)\b/)) {
      const x = W * R(0.35, 0.65), y = yAt(roadPts, x);
      obj('wagon', x, y, { rot: 90 + Math.round(R(-15, 15)) });
      scatter('crate', 3, { area: [x - 4, y - 3, 8, 6] }); scatter('barrel', 2, { area: [x - 4, y - 3, 8, 6] });
      if (has(/\bambush\b/)) obj('log', x + 6, yAt(roadPts, x + 6), { w: 3, h: 0.6, rot: 80 });
    }
    const forest = has(/\b(forest|woods?|woodland|grove|clearing|glade|jungle|trees)\b/);
    vegetation(forest ? density : has(/\b(field|plains?|meadow|hills?|farm|grassland)\b/) ? 0.012 : biome === 'swamp' ? 0.018 : 0.025);
  }
  return normalizeMap(map);
}

// ---------------------------------------------------------------- Claude
const CLAUDE_PROMPT = `You design top-down D&D battle maps as JSON for a renderer that draws them on a square grid (1 square = 5 ft).

Return ONLY one JSON object, no prose, in this shape:
{
  "name": "short title",
  "width": 30, "height": 20,          // in squares; 15-50 each
  "base": "grass",                    // terrain that fills the whole map
  "lighting": "day" | "dusk" | "night",
  "regions": [                        // painted in order; later ones on top
    {"terrain": "water", "shape": "path", "points": [[x,y],[x,y],...], "width": 3},   // rivers, roads, corridors (curved through the points)
    {"terrain": "wood", "shape": "rect", "x": 4, "y": 3, "w": 10, "h": 7, "walls": true}, // a room; "walls": true outlines it with walls
    {"terrain": "dirt", "shape": "circle", "x": 15, "y": 10, "r": 4},
    {"terrain": "water", "shape": "poly", "points": [[x,y],...]}                   // ponds, cave chambers (smoothed when natural)
  ],
  "walls": [[[x,y],[x,y],...], ...],  // extra wall polylines, on grid intersections (integers)
  "doors": [{"x": 8, "y": 10, "dir": "h"}], // "h": door spans (x,y)-(x+1,y); "v": spans (x,y)-(x,y+1). Put doors on wall lines.
  "objects": [{"type": "tree", "x": 5.5, "y": 7.5, "size": 2, "rot": 0}], // x,y = CENTRE in squares; optional w/h instead of size; rot in degrees
  "labels": [{"text": "A", "x": 12, "y": 4}]
}

Coordinates: origin top-left, x to the right, y down, in squares. The centre of the square in column 3, row 5 is (3.5, 5.5).
Terrains: grass, dirt, sand, snow, mud, cavefloor, rock (solid cave rock), water, deepwater, lava, stone (flagstone floor), cobble, wood (plank floor), carpet, roof, void.
Objects (default size in squares): tree 2, pine 2, bush 1, rock 1, boulder 2, rubble 2, log 2x0.5, reeds 1, bones 1, table 2x1, roundtable 1.5, chair 0.5, bench 2x0.5, counter 4x1, barrel 0.8, crate 0.9, chest 1x0.7, bed 1x2, bookshelf 2x0.5, campfire 1, fireplace 2x0.8, torch 0.4, tent 2, wagon 2x3, cart 1.5x2, pillar 1, statue 1, altar 2x1, coffin 1x2, stairs 1x2, well 1.5, fountain 3, stall 2, fence 3x0.2, bridge 5x2 (planks run across its width; rotate to fit).
Campfire, fireplace and torch light up night maps.

Design it as a playable encounter, not just a picture: give cover (trees, crates, pillars), chokepoints, difficult terrain (water, rubble, mud), two or more approaches, and room to move. Keep everything inside the map bounds, keep objects from overlapping walls, and make sure every room is reachable through a door or opening. Use labels sparingly for key spots (e.g. "1", "2" or "Altar").`;

function claudeUserMessage(desc, sizeKey) {
  const [W, H] = SIZES[sizeKey] || SIZES.medium;
  return `Scene: ${desc.trim() || 'a forest clearing'}\nMap size: about ${W} x ${H} squares.`;
}
function extractJson(text) {
  const s = text.indexOf('{'), e = text.lastIndexOf('}');
  if (s < 0 || e <= s) throw new Error('No JSON object found in the reply.');
  return JSON.parse(text.slice(s, e + 1));
}
// Raw fetch rather than the SDK: this page is a single offline HTML file with no build step or package manager.
async function askClaude(desc, sizeKey, key, model) {
  const fallback = model !== 'claude-haiku-5-5';
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
      ...(fallback ? { 'anthropic-beta': 'server-side-fallback-2026-07-01' } : {}),
    },
    body: JSON.stringify({
      model, max_tokens: 16000, output_config: { effort: 'medium' },
      ...(fallback ? { fallbacks: 'default' } : {}),
      system: CLAUDE_PROMPT,
      messages: [{ role: 'user', content: claudeUserMessage(desc, sizeKey) }],
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error?.message || `HTTP ${res.status}`);
  if (data.stop_reason === 'refusal') throw new Error('Claude declined this description. Try rewording it.');
  if (data.stop_reason === 'max_tokens') throw new Error('The reply was cut off. Try a smaller map.');
  const text = (data.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('');
  return { map: extractJson(text), usage: data.usage };
}

// ---------------------------------------------------------------- app
const S = {
  map: null, seed: 1, undo: [], tool: 'none',
  opts: store.get('opts', { grid: true, coords: false, lighting: true }),
  zoom: store.get('zoom', 0),
};
function setMap(m, { push = true } = {}) {
  if (push && S.map) { S.undo.push(JSON.stringify(S.map)); if (S.undo.length > 60) S.undo.shift(); }
  S.map = normalizeMap(m);
  store.set('map', S.map);
  draw();
}
function draw() {
  const host = $('#map'), wrap = $('#mapwrap');
  const fit = Math.max(8, Math.min((wrap.clientWidth - 24) / S.map.width, (wrap.clientHeight - 24) / S.map.height));
  const px = S.zoom || fit;
  host.innerHTML = renderSvg(S.map, { ...S.opts, px });
  $('#mapTitle').textContent = S.map.name;
  $('#mapMeta').textContent = `${S.map.width} × ${S.map.height} squares · ${S.map.width * S.map.feetPerSquare} × ${S.map.height * S.map.feetPerSquare} ft`;
  const ta = $('#jsonText'); if ($('#jsonBox').open && document.activeElement !== ta) ta.value = JSON.stringify(S.map, null, 1);
  $('#btnUndo').disabled = !S.undo.length;
}
function toast(msg, ms = 3200) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('show'), ms);
}
function download(blob, name) {
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
  document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
const fileBase = () => S.map.name.replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '-').toLowerCase() || 'battle-map';
function exportPng() {
  const px = +$('#pngPx').value, m = S.map;
  const svg = renderSvg(m, { ...S.opts, px });
  const img = new Image();
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
  img.onload = () => {
    const c = document.createElement('canvas'); c.width = m.width * px; c.height = m.height * px;
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    URL.revokeObjectURL(url);
    c.toBlob((b) => download(b, `${fileBase()}-${m.width}x${m.height}-${px}px.png`), 'image/png');
  };
  img.onerror = () => toast('Could not render the PNG in this browser.');
  img.src = url;
}
function mapPoint(e) {
  const svg = $('#map svg'); const p = svg.createSVGPoint(); p.x = e.clientX; p.y = e.clientY;
  const q = p.matrixTransform(svg.getScreenCTM().inverse()); return [q.x, q.y];
}
function initEditing() {
  const host = $('#map');
  let painting = false, last = null;
  const paintAt = (x, y, first) => {
    const r = +$('#brushSize').value, m = JSON.parse(JSON.stringify(S.map));
    if (!first && last && Math.hypot(x - last[0], y - last[1]) < r * 0.5) return;
    last = [x, y];
    m.regions.push({ terrain: $('#brushTerrain').value, shape: 'circle', x: f(x), y: f(y), r });
    setMap(m, { push: first });
  };
  host.addEventListener('pointerdown', (e) => {
    if (S.tool === 'none' || !$('#map svg')) return;
    const [x, y] = mapPoint(e);
    if (S.tool === 'paint') { painting = true; host.setPointerCapture(e.pointerId); paintAt(x, y, true); }
    else if (S.tool === 'place') {
      const type = $('#placeType').value, d = OBJ[type];
      const snap = (v, s) => (Math.round(s) % 2 ? Math.floor(v) + 0.5 : Math.round(v));
      const m = JSON.parse(JSON.stringify(S.map));
      m.objects.push({ type, x: snap(x, d.w), y: snap(y, d.h), w: d.w, h: d.h, rot: +$('#placeRot').value || 0 });
      setMap(m);
    } else if (S.tool === 'erase') {
      const m = JSON.parse(JSON.stringify(S.map));
      for (let i = m.objects.length - 1; i >= 0; i--) {
        const o = m.objects[i]; if (Math.hypot(o.x - x, o.y - y) <= Math.max(o.w, o.h) / 2 + 0.2) { m.objects.splice(i, 1); setMap(m); return; }
      }
      for (let i = m.doors.length - 1; i >= 0; i--) {
        const d = m.doors[i], cx = d.x + (d.dir === 'h' ? 0.5 : 0), cy = d.y + (d.dir === 'v' ? 0.5 : 0);
        if (Math.hypot(cx - x, cy - y) < 0.6) { m.doors.splice(i, 1); setMap(m); return; }
      }
      for (let i = m.regions.length - 1; i >= 0; i--) {
        const r = m.regions[i]; if (r.shape === 'circle' && Math.hypot(r.x - x, r.y - y) < r.r) { m.regions.splice(i, 1); setMap(m); return; }
      }
    } else if (S.tool === 'door') {
      const gx = Math.round(x), gy = Math.round(y), dx = Math.abs(x - gx), dy = Math.abs(y - gy);
      const m = JSON.parse(JSON.stringify(S.map));
      m.doors.push(dy < dx ? { x: Math.floor(x), y: gy, dir: 'h' } : { x: gx, y: Math.floor(y), dir: 'v' });
      setMap(m);
    } else if (S.tool === 'label') {
      const text = prompt('Label text'); if (!text) return;
      const m = JSON.parse(JSON.stringify(S.map)); m.labels.push({ text, x: f(x), y: f(y) }); setMap(m);
    }
  });
  host.addEventListener('pointermove', (e) => { if (painting) { const [x, y] = mapPoint(e); paintAt(x, y, false); } });
  const stop = () => { painting = false; last = null; };
  host.addEventListener('pointerup', stop); host.addEventListener('pointercancel', stop);
}
function setTool(t) {
  S.tool = S.tool === t ? 'none' : t;
  document.querySelectorAll('[data-tool]').forEach((b) => b.classList.toggle('on', b.dataset.tool === S.tool));
  $('#paintOpts').hidden = S.tool !== 'paint'; $('#placeOpts').hidden = S.tool !== 'place';
  $('#map').style.cursor = S.tool === 'none' ? '' : 'crosshair';
}
function init() {
  const back = $('#backLink'); if (back) back.href = location.protocol === 'file:' ? 'DM Dashboard.html' : './';
  $('#brushTerrain').innerHTML = Object.keys(TERRAIN).map((t) => `<option>${t}</option>`).join('');
  $('#brushTerrain').value = 'water';
  $('#placeType').innerHTML = Object.keys(OBJ).map((t) => `<option>${t}</option>`).join('');
  $('#placeType').value = 'tree';
  $('#desc').value = store.get('desc', '');
  $('#size').value = store.get('size', 'medium');
  $('#model').value = store.get('model', 'claude-opus-5-5');
  const key = store.get('key', ''); if (key) { $('#apiKey').value = key; $('#rememberKey').checked = true; }
  for (const k of ['grid', 'coords', 'lighting']) { const el = $('#opt-' + k); el.checked = !!S.opts[k]; el.onchange = () => { S.opts[k] = el.checked; store.set('opts', S.opts); draw(); }; }
  $('#zoom').value = S.zoom; $('#zoom').oninput = () => { S.zoom = +$('#zoom').value; store.set('zoom', S.zoom); draw(); };
  $('#desc').oninput = () => store.set('desc', $('#desc').value);
  $('#size').onchange = () => store.set('size', $('#size').value);
  $('#model').onchange = () => store.set('model', $('#model').value);

  const gen = (newSeed) => {
    if (newSeed) S.seed = (Math.random() * 1e9) | 0;
    setMap(generate($('#desc').value, S.seed, $('#size').value));
  };
  $('#btnGen').onclick = () => gen(true);
  $('#btnReroll').onclick = () => gen(true);
  document.querySelectorAll('[data-example]').forEach((b) => { b.onclick = () => { $('#desc').value = b.dataset.example; store.set('desc', b.dataset.example); gen(true); }; });

  $('#btnCopyPrompt').onclick = async () => {
    const text = `${CLAUDE_PROMPT}\n\n${claudeUserMessage($('#desc').value, $('#size').value)}`;
    try { await navigator.clipboard.writeText(text); toast('Prompt copied. Paste it into Claude, then paste the JSON reply below.'); }
    catch { $('#pasteJson').value = text; toast('Clipboard blocked: the prompt is in the box below, copy it from there.'); }
  };
  $('#btnPasteApply').onclick = () => {
    try { setMap(extractJson($('#pasteJson').value)); $('#pasteJson').value = ''; toast('Map loaded from Claude’s reply.'); }
    catch (err) { toast('Could not read that JSON: ' + err.message, 5000); }
  };
  $('#btnAsk').onclick = async () => {
    const k = $('#apiKey').value.trim();
    if (!k) { toast('Paste an Anthropic API key first, or use Copy prompt instead.'); return; }
    if ($('#rememberKey').checked) store.set('key', k); else store.del('key');
    const btn = $('#btnAsk'); btn.disabled = true; btn.textContent = 'Designing…';
    try {
      const { map, usage } = await askClaude($('#desc').value, $('#size').value, k, $('#model').value);
      setMap(map);
      toast(`Map designed by Claude (${usage?.input_tokens ?? '?'} in / ${usage?.output_tokens ?? '?'} out tokens).`, 5000);
    } catch (err) { toast('Claude request failed: ' + err.message, 6000); }
    finally { btn.disabled = false; btn.textContent = 'Generate with Claude'; }
  };
  $('#rememberKey').onchange = () => { if (!$('#rememberKey').checked) store.del('key'); };

  $('#btnPng').onclick = exportPng;
  $('#btnJson').onclick = () => download(new Blob([JSON.stringify(S.map, null, 1)], { type: 'application/json' }), `${fileBase()}.battlemap.json`);
  $('#btnOpen').onclick = () => $('#fileIn').click();
  $('#fileIn').onchange = async () => {
    const file = $('#fileIn').files[0]; if (!file) return;
    try { setMap(JSON.parse(await file.text())); } catch (err) { toast('Not a map file: ' + err.message); }
    $('#fileIn').value = '';
  };
  $('#jsonBox').ontoggle = () => draw();
  $('#btnJsonApply').onclick = () => { try { setMap(JSON.parse($('#jsonText').value)); toast('Applied.'); } catch (err) { toast('JSON error: ' + err.message, 5000); } };
  $('#btnUndo').onclick = () => { if (!S.undo.length) return; S.map = JSON.parse(S.undo.pop()); store.set('map', S.map); draw(); };
  document.querySelectorAll('[data-tool]').forEach((b) => { b.onclick = () => setTool(b.dataset.tool); });
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !/INPUT|TEXTAREA/.test(document.activeElement.tagName)) { e.preventDefault(); $('#btnUndo').click(); }
    if (e.key === 'Escape') setTool(S.tool);
  });
  initEditing();
  window.addEventListener('resize', () => { if (!S.zoom) draw(); });

  const saved = store.get('map', null);
  if (saved) setMap(saved, { push: false });
  else { $('#desc').value = $('#desc').value || 'Forest road ambush at dusk, a merchant wagon stopped by a fallen log, a stream and a bridge'; S.seed = 7; setMap(generate($('#desc').value, S.seed, $('#size').value), { push: false }); }
}
if (typeof document !== 'undefined') document.addEventListener('DOMContentLoaded', init);
if (typeof module !== 'undefined') module.exports = { generate, normalizeMap, renderSvg, CLAUDE_PROMPT };
