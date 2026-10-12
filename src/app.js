/* DM Dashboard: an offline, campaign-agnostic DM screen that imports an Obsidian vault. */
(() => {
'use strict';

/* ================================================================ utils */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function h(tag, attrs, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'html') el.innerHTML = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const kid of kids.flat(Infinity)) {
    if (kid == null || kid === false) continue;
    el.append(kid instanceof Node ? kid : document.createTextNode(String(kid)));
  }
  return el;
}
const ICONS = {
  home: '<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/>',
  book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5z"/><path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5"/>',
  users: '<circle cx="9" cy="8" r="4"/><path d="M1 21v-1a6 6 0 0 1 12 0v1"/><path d="M16 4a4 4 0 0 1 0 8"/><path d="M23 21v-1a6 6 0 0 0-4-5.6"/>',
  music: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
  scroll: '<path d="M8 21h10a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2H6"/><path d="M6 3a2 2 0 0 0-2 2v2h4V5a2 2 0 0 0-2-2z"/><path d="M8 7v12a2 2 0 0 1-4 0v-1"/><path d="M12 8h5M12 12h5M12 16h3"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',
  eye: '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>',
  eyeoff: '<path d="M17.9 17.9A10 10 0 0 1 12 20c-7 0-11-8-11-8a18 18 0 0 1 5.1-6M9.9 4.2A9 9 0 0 1 12 4c7 0 11 8 11 8a18 18 0 0 1-2.2 3.2"/><path d="M1 1l22 22"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
  dice: '<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8" cy="8" r="1.2" fill="currentColor"/><circle cx="16" cy="16" r="1.2" fill="currentColor"/><circle cx="12" cy="12" r="1.2" fill="currentColor"/>',
  swords: '<path d="M14.5 17.5L3 6V3h3l11.5 11.5"/><path d="M13 19l6-6M16 16l4 4M19 21l2-2"/><path d="M9.5 6.5L13 3h3v3l-3.5 3.5"/><path d="M5 14l4 4M7 17l-3 3M3 19l2 2"/>',
  note: '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6M8 13h8M8 17h5"/>',
  play: '<path d="M6 4l14 8-14 8z" fill="currentColor"/>',
  stop: '<rect x="5" y="5" width="14" height="14" rx="1" fill="currentColor"/>',
  volx: '<path d="M11 5L6 9H2v6h4l5 4z"/><path d="M23 9l-6 6M17 9l6 6"/>',
  x: '<path d="M18 6L6 18M6 6l12 12"/>',
  chev: '<path d="M9 6l6 6-6 6"/>',
  refresh: '<path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.5 9a9 9 0 0 1 14.9-3.4L23 10M1 14l4.6 4.4A9 9 0 0 0 20.5 15"/>',
  upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M17 8l-5-5-5 5M12 3v12"/>',
  pin: '<path d="M12 17v5M9 3h6l-1 7 4 3v2H6v-2l4-3z"/>',
  panel: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M15 3v18"/>',
  menu: '<path d="M3 6h18M3 12h18M3 18h18"/>',
  help: '<circle cx="12" cy="12" r="10"/><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3M12 17h.01"/>',
  expand: '<path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>',
  folder: '<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>',
  file: '<path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M13 2v7h7"/>',
  wave: '<path d="M2 12c2-4 4-4 6 0s4 4 6 0 4-4 6 0"/>',
  bolt: '<path d="M13 2L3 14h9l-1 8 10-12h-9z"/>',
  trash: '<path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/>',
  copy: '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  pause: '<rect x="6" y="4" width="4" height="16" fill="currentColor"/><rect x="14" y="4" width="4" height="16" fill="currentColor"/>',
  repeat: '<path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>',
  grip: '<circle cx="9" cy="6" r="1" fill="currentColor"/><circle cx="15" cy="6" r="1" fill="currentColor"/><circle cx="9" cy="12" r="1" fill="currentColor"/><circle cx="15" cy="12" r="1" fill="currentColor"/><circle cx="9" cy="18" r="1" fill="currentColor"/><circle cx="15" cy="18" r="1" fill="currentColor"/>',
  shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
  grid: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18M15 3v18M3 9h18M3 15h18"/>',
  heart: '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8z"/>',
};
const icon = (n, cls = '') => `<svg class="i ${cls}" viewBox="0 0 24 24">${ICONS[n] || ''}</svg>`;
const iconEl = (n) => { const s = document.createElement('span'); s.style.display = 'contents'; s.innerHTML = icon(n); return s.firstChild; };
const stripExt = (n) => n.replace(/\.[^./]+$/, '');
const baseName = (p) => p.split('/').pop();
const dirName = (p) => p.includes('/') ? p.slice(0, p.lastIndexOf('/')) : '';
const extOf = (p) => (p.match(/\.([^./]+)$/) || [, ''])[1].toLowerCase();
const slug = (s) => String(s).toLowerCase().trim().replace(/<[^>]+>/g, '').replace(/[^\p{L}\p{N}\s-]/gu, '').replace(/\s+/g, '-');
const rand = (n) => {
  if (window.crypto?.getRandomValues) { const a = new Uint32Array(1); const lim = Math.floor(0x100000000 / n) * n; let x; do { crypto.getRandomValues(a); x = a[0]; } while (x >= lim); return (x % n) + 1; }
  return Math.floor(Math.random() * n) + 1;
};
const titleCase = (s) => s.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
const isTyping = (e) => { const t = e.target; return t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable); };

const store = {
  get(k, d) { try { const v = localStorage.getItem('dmdash:' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem('dmdash:' + k, JSON.stringify(v)); } catch { /* storage unavailable */ } },
};

/* ================================================================ file kinds */
const EXT = {
  note: ['md', 'markdown', 'txt'],
  audio: ['mp3', 'wav', 'ogg', 'oga', 'm4a', 'aac', 'flac', 'webm', 'opus'],
  image: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'avif'],
  pdf: ['pdf'],
};
function kindOf(path) { const e = extOf(path); for (const [k, v] of Object.entries(EXT)) if (v.includes(e)) return k; return null; }
const MIME = { mp3: 'audio/mpeg', wav: 'audio/wav', ogg: 'audio/ogg', oga: 'audio/ogg', m4a: 'audio/mp4', aac: 'audio/aac', flac: 'audio/flac', webm: 'audio/webm', opus: 'audio/ogg', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml', bmp: 'image/bmp', avif: 'image/avif', pdf: 'application/pdf' };

/* ================================================================ IndexedDB */
const DB = {
  db: null,
  mem: null, // in-memory fallback when IndexedDB is unavailable
  async open() {
    if (!window.indexedDB) { this.mem = { campaigns: new Map(), files: new Map(), handles: new Map() }; return; }
    try {
      this.db = await new Promise((res, rej) => {
        const r = indexedDB.open('dm-dashboard', 1);
        r.onupgradeneeded = () => {
          const d = r.result;
          d.createObjectStore('campaigns', { keyPath: 'id' });
          d.createObjectStore('files', { keyPath: ['cid', 'path'] }).createIndex('cid', 'cid');
          d.createObjectStore('handles');
        };
        r.onsuccess = () => res(r.result);
        r.onerror = () => rej(r.error);
      });
    } catch (e) {
      console.warn('IndexedDB unavailable, campaigns will not be remembered', e);
      this.mem = { campaigns: new Map(), files: new Map(), handles: new Map() };
    }
  },
  _p(req) { return new Promise((res, rej) => { req.onsuccess = () => res(req.result); req.onerror = () => rej(req.error); }); },
  _done(t) { return new Promise((res, rej) => { t.oncomplete = () => res(); t.onerror = () => rej(t.error); t.onabort = () => rej(t.error); }); },
  async campaigns() {
    if (this.mem) return [...this.mem.campaigns.values()];
    return this._p(this.db.transaction('campaigns').objectStore('campaigns').getAll());
  },
  async putCampaign(c) {
    if (this.mem) { this.mem.campaigns.set(c.id, c); return; }
    const t = this.db.transaction('campaigns', 'readwrite'); t.objectStore('campaigns').put(c); return this._done(t);
  },
  async clearFiles(cid) {
    if (this.mem) { this.mem.files.set(cid, []); return; }
    const t = this.db.transaction('files', 'readwrite');
    const idx = t.objectStore('files').index('cid');
    const req = idx.openKeyCursor(IDBKeyRange.only(cid));
    req.onsuccess = () => { const cur = req.result; if (cur) { t.objectStore('files').delete(cur.primaryKey); cur.continue(); } };
    return this._done(t);
  },
  async putFiles(cid, recs) {
    if (this.mem) { const arr = this.mem.files.get(cid) || []; arr.push(...recs); this.mem.files.set(cid, arr); return; }
    const t = this.db.transaction('files', 'readwrite'); const s = t.objectStore('files');
    for (const r of recs) s.put({ ...r, cid });
    return this._done(t);
  },
  async files(cid) {
    if (this.mem) return this.mem.files.get(cid) || [];
    return this._p(this.db.transaction('files').objectStore('files').index('cid').getAll(IDBKeyRange.only(cid)));
  },
  async deleteCampaign(cid) {
    await this.clearFiles(cid);
    if (this.mem) { this.mem.campaigns.delete(cid); this.mem.handles.delete(cid); return; }
    const t = this.db.transaction(['campaigns', 'handles'], 'readwrite');
    t.objectStore('campaigns').delete(cid); t.objectStore('handles').delete(cid);
    return this._done(t);
  },
  async putHandle(cid, handle) {
    if (this.mem) { this.mem.handles.set(cid, handle); return; }
    try { const t = this.db.transaction('handles', 'readwrite'); t.objectStore('handles').put(handle, cid); await this._done(t); } catch (e) { console.warn('Could not remember folder', e); }
  },
  async getHandle(cid) {
    if (this.mem) return this.mem.handles.get(cid);
    try { return await this._p(this.db.transaction('handles').objectStore('handles').get(cid)); } catch { return null; }
  },
};

/* ================================================================ state */
const S = {
  campaigns: [],
  cid: null,
  campaign: null,
  files: new Map(), // path -> record
  notes: new Map(), // path -> note
  byName: new Map(), // lower name -> path (notes)
  byAlias: new Map(),
  assets: new Map(), // lower basename -> path (non-notes)
  backlinks: new Map(), // path -> Set(paths)
  urls: new Map(), // path -> object URL
  ui: null, // per-campaign ui state
  settings: store.get('settings', { theme: null, right: true, rpTab: 'combat', vol: { music: 0.7, ambience: 0.6, sfx: 0.9 }, fontScale: 1 }),
  playerSafe: false,
};
const saveSettings = () => store.set('settings', S.settings);
const defaultUI = () => ({ books: [], tabs: [], pinned: [], recent: [], open: {}, scratch: '', combat: { round: 1, turn: null, list: [] }, log: [] });
const saveUI = () => { if (S.cid) store.set('c:' + S.cid, S.ui); };

/* ================================================================ frontmatter */
function splitFlow(s) {
  const out = []; let cur = ''; let depth = 0; let q = null;
  for (const ch of s) {
    if (q) { cur += ch; if (ch === q) q = null; continue; }
    if (ch === '"' || ch === "'") { q = ch; cur += ch; continue; }
    if (ch === '[') depth++; if (ch === ']') depth--;
    if (ch === ',' && depth === 0) { out.push(cur); cur = ''; continue; }
    cur += ch;
  }
  if (cur.trim()) out.push(cur);
  return out;
}
function yval(v) {
  v = v.trim();
  if (/^\[\[.*\]\]$/.test(v)) return v;
  if (/^\[.*\]$/.test(v)) return splitFlow(v.slice(1, -1)).map(yval).filter((x) => x !== '');
  if (/^".*"$/.test(v)) return v.slice(1, -1).replace(/\\(["\\])/g, '$1');
  if (/^'.*'$/.test(v)) return v.slice(1, -1).replace(/''/g, "'");
  if (/^-?\d+(\.\d+)?$/.test(v)) return Number(v);
  if (/^(true|false)$/i.test(v)) return /^true$/i.test(v);
  if (/^(null|~)$/i.test(v)) return '';
  return v;
}
function parseFrontmatter(text) {
  const m = /^﻿?---\r?\n([\s\S]*?)\r?\n---[ \t]*(\r?\n|$)/.exec(text);
  if (!m) return { fm: {}, body: text.replace(/^﻿/, '') };
  const fm = {}; let cur = null;
  for (const raw of m[1].split(/\r?\n/)) {
    if (!raw.trim() || /^\s*#/.test(raw)) continue;
    const li = /^\s*-\s+(.*)$|^\s*-$/.exec(raw);
    if (li && cur) { if (!Array.isArray(fm[cur])) fm[cur] = fm[cur] === '' ? [] : [fm[cur]]; if (li[1] != null) fm[cur].push(yval(li[1])); continue; }
    const kv = /^([^\s:#][^:]*?):(?:\s+(.*)|\s*)$/.exec(raw);
    if (kv) { cur = kv[1].trim(); fm[cur] = kv[2] == null || kv[2].trim() === '' ? '' : yval(kv[2]); }
  }
  return { fm, body: text.slice(m[0].length) };
}

/* ================================================================ notes */
const TYPE_BY_FOLDER = [
  [/^(party|pcs?|player.?characters?|players|heroes|adventurers)$/i, 'pc'],
  [/^(people|npcs?|characters|cast)$/i, 'npc'],
  [/^(monsters?|bestiary|creatures|enemies|foes|statblocks?|stat.?blocks?)$/i, 'monster'],
  [/^(sessions?|session.?notes|sessions? logs?)$/i, 'session'],
  [/^(plot.?threads?|threads|quests?|arcs?|plots?|story.?lines?)$/i, 'thread'],
  [/^(scripts?|read.?alouds?|boxed.?text|narration|monologues?|scenes?)$/i, 'script'],
  [/^(adventures?|one.?shots?|modules?|scenarios?|prompt.?books?)$/i, 'adventure'],
  [/^(factions?|organizations?|guilds?)$/i, 'faction'],
  [/^(locations?|places|cities|towns|regions?|maps?)$/i, 'location'],
  [/^(items?|objects?|loot|treasure|magic.?items?)$/i, 'item'],
];
const SECRET_CALLOUTS = new Set(['secret', 'dm', 'dm-only', 'dmonly', 'gm', 'gm-only', 'spoiler', 'hidden']);
const READ_CALLOUTS = new Set(['read-aloud', 'readaloud', 'read', 'script', 'boxed', 'boxed-text', 'narrate', 'narration', 'say', 'speech', 'monologue']);

function asList(v) { return v == null || v === '' ? [] : Array.isArray(v) ? v : String(v).split(/[,\s]+/).filter(Boolean); }
function parseNote(rec) {
  const { fm, body } = parseFrontmatter(rec.text || '');
  const name = stripExt(baseName(rec.path));
  const folder = dirName(rec.path);
  const tags = asList(fm.tags).map((t) => String(t).replace(/^#/, '').toLowerCase());
  for (const m of body.matchAll(/(?:^|\s)#([\p{L}\d_/-]+)/gu)) if (!/^\d+$/.test(m[1])) tags.push(m[1].toLowerCase());
  let type = String(fm.type || fm.category || fm.kind || '').toLowerCase();
  if (folder.split('/').some((seg) => /^_?templates?$/i.test(seg))) type = 'template';
  if (!type) {
    const segs = folder.split('/').reverse();
    outer: for (const seg of segs) for (const [re, t] of TYPE_BY_FOLDER) if (re.test(seg)) { type = t; break outer; }
  }
  if (!type) for (const t of ['pc', 'npc', 'monster', 'session', 'thread', 'script']) if (tags.includes(t)) { type = t; break; }
  if (type === 'player' || type === 'character' && folder.match(/party/i)) type = 'pc';
  const h1 = /^#\s+(.+)$/m.exec(body);
  const title = name;
  const aliases = asList(fm.aliases || fm.alias).map(String);
  const dmOnly = fm.dm_only === true || fm.dmonly === true || fm.secret === true || tags.includes('dm-only') || tags.includes('dm_only');
  return { path: rec.path, name, title, h1: h1 ? h1[1].trim() : null, folder, fm, body, tags, type, aliases, dmOnly, mtime: rec.mtime || 0 };
}
function pitchOf(note) {
  const lines = note.body.split(/\r?\n/);
  for (let l of lines) {
    l = l.trim();
    if (!l || l.startsWith('#') || l.startsWith('>') || l.startsWith('|') || /^[-*_]{3,}$/.test(l) || l.startsWith('```') || l.startsWith('![[')) continue;
    l = l.replace(/^[-*+]\s+/, '').replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, '$2').replace(/\[\[([^\]]+)\]\]/g, (m, t) => t.split('#')[0]).replace(/[*_`]/g, '');
    if (l.length < 3) continue;
    return l.length > 160 ? l.slice(0, 157) + '…' : l;
  }
  return '';
}

function resolve(target) {
  if (!target) return null;
  let t = target.trim().replace(/\\$/, '');
  if (S.notes.has(t)) return t;
  if (S.notes.has(t + '.md')) return t + '.md';
  const lower = t.toLowerCase();
  const k = kindOf(t);
  if (k && k !== 'note') return S.assets.get(baseName(lower)) || (S.files.has(t) ? t : null);
  const nm = baseName(lower).replace(/\.md$/, '');
  if (t.includes('/')) {
    for (const p of S.notes.keys()) if (p.toLowerCase().endsWith(lower.replace(/\.md$/, '') + '.md')) return p;
  }
  return S.byName.get(nm) || S.byAlias.get(nm) || null;
}
function splitTarget(raw) {
  const s = raw.replace(/\\\|/g, '|');
  const pipe = s.indexOf('|');
  const target = pipe >= 0 ? s.slice(0, pipe) : s;
  const alias = pipe >= 0 ? s.slice(pipe + 1) : null;
  const hash = target.indexOf('#');
  return { file: hash >= 0 ? target.slice(0, hash) : target, anchor: hash >= 0 ? target.slice(hash + 1).replace(/^\^/, '') : '', alias };
}
function visible(note) { return note && !(S.playerSafe && note.dmOnly); }

function buildIndex(recs) {
  S.files = new Map(); S.notes = new Map(); S.byName = new Map(); S.byAlias = new Map(); S.assets = new Map(); S.backlinks = new Map();
  for (const u of S.urls.values()) URL.revokeObjectURL(u);
  S.urls = new Map();
  recs.sort((a, b) => a.path.localeCompare(b.path, undefined, { numeric: true, sensitivity: 'base' }));
  for (const r of recs) {
    S.files.set(r.path, r);
    if (r.kind === 'note') {
      const n = parseNote(r); S.notes.set(r.path, n);
      const k = n.name.toLowerCase();
      const prev = S.byName.get(k);
      if (!prev || prev.split('/').length > r.path.split('/').length) S.byName.set(k, r.path);
      for (const a of n.aliases) if (!S.byAlias.has(a.toLowerCase())) S.byAlias.set(a.toLowerCase(), r.path);
    } else {
      const k = baseName(r.path).toLowerCase();
      if (!S.assets.has(k)) S.assets.set(k, r.path);
    }
  }
  for (const n of S.notes.values()) {
    n.links = new Set();
    const scan = n.body + '\n' + JSON.stringify(n.fm);
    for (const m of scan.matchAll(/\[\[([^\]]+?)\]\]/g)) {
      const p = resolve(splitTarget(m[1]).file);
      if (p && S.notes.has(p) && p !== n.path) n.links.add(p);
    }
    for (const p of n.links) { if (!S.backlinks.has(p)) S.backlinks.set(p, new Set()); S.backlinks.get(p).add(n.path); }
  }
}
function urlFor(path) {
  if (S.urls.has(path)) return S.urls.get(path);
  const r = S.files.get(path); if (!r || !r.blob) return null;
  const blob = r.blob.type ? r.blob : new Blob([r.blob], { type: MIME[extOf(path)] || '' });
  const u = URL.createObjectURL(blob); S.urls.set(path, u); return u;
}

/* ================================================================ import */
const SKIP_DIR = /^(\.|node_modules$|\.trash$)/;
async function walkHandle(dir, prefix = '', out = []) {
  for await (const [name, hd] of dir.entries()) {
    if (name.startsWith('.')) continue;
    const p = prefix ? prefix + '/' + name : name;
    if (hd.kind === 'directory') { if (!SKIP_DIR.test(name)) await walkHandle(hd, p, out); }
    else if (kindOf(name)) out.push({ path: p, file: await hd.getFile() });
  }
  return out;
}
async function importVault() {
  if (window.showDirectoryPicker) {
    let dir;
    try { dir = await window.showDirectoryPicker({ id: 'dm-vault', mode: 'read' }); }
    catch (e) { if (e.name === 'AbortError') return; console.warn(e); $('#dirInput').click(); return; }
    progress.show('Reading ' + dir.name + '…');
    try { const entries = await walkHandle(dir); await ingest(dir.name, entries, dir); }
    catch (e) { progress.hide(); toast('Import failed: ' + e.message); console.error(e); }
  } else {
    $('#dirInput').click();
  }
}
async function onDirInput(e) {
  const files = [...e.target.files]; e.target.value = '';
  if (!files.length) return;
  const root = (files[0].webkitRelativePath || files[0].name).split('/')[0];
  const entries = [];
  for (const f of files) {
    const rel = (f.webkitRelativePath || f.name).split('/').slice(1);
    if (rel.some((seg) => seg.startsWith('.'))) continue;
    if (!kindOf(f.name)) continue;
    entries.push({ path: rel.join('/'), file: f });
  }
  progress.show('Reading ' + root + '…');
  try { await ingest(root, entries, null); } catch (err) { progress.hide(); toast('Import failed: ' + err.message); console.error(err); }
}
async function ingest(name, entries, handle, existingId) {
  const existing = existingId ? S.campaigns.find((c) => c.id === existingId) : S.campaigns.find((c) => c.name === name);
  const id = existing ? existing.id : 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const counts = { note: 0, audio: 0, image: 0, pdf: 0 };
  progress.show(`Importing ${name}`, 0);
  await DB.clearFiles(id);
  const BATCH = 25;
  for (let i = 0; i < entries.length; i += BATCH) {
    const chunk = entries.slice(i, i + BATCH);
    const recs = await Promise.all(chunk.map(async ({ path, file }) => {
      const kind = kindOf(path); counts[kind]++;
      const rec = { path, kind, size: file.size, mtime: file.lastModified };
      if (kind === 'note') rec.text = await file.text();
      else rec.blob = new Blob([await file.arrayBuffer()], { type: file.type || MIME[extOf(path)] || '' });
      return rec;
    }));
    await DB.putFiles(id, recs);
    progress.set((i + chunk.length) / entries.length, `${i + chunk.length} of ${entries.length} files`);
  }
  const c = { id, name, importedAt: Date.now(), counts, hasHandle: !!handle };
  await DB.putCampaign(c);
  if (handle) await DB.putHandle(id, handle);
  S.campaigns = await DB.campaigns();
  progress.hide();
  await loadCampaign(id);
  toast(`Imported ${counts.note} notes, ${counts.audio} sounds, ${counts.image} images from “${name}”.`);
  if (!existing) location.hash = '#/home';
}
async function resync() {
  if (!S.cid) return importVault();
  const handle = await DB.getHandle(S.cid);
  if (handle && handle.requestPermission) {
    try {
      let perm = await handle.queryPermission({ mode: 'read' });
      if (perm !== 'granted') perm = await handle.requestPermission({ mode: 'read' });
      if (perm === 'granted') {
        progress.show('Re-reading ' + handle.name + '…');
        const entries = await walkHandle(handle);
        await ingest(S.campaign.name, entries, handle, S.cid);
        return;
      }
    } catch (e) { progress.hide(); console.warn(e); }
  }
  toast('Pick the same vault folder again to refresh it.');
  importVault();
}

const progress = {
  el: null,
  show(title, frac) {
    if (!this.el) {
      this.el = h('div', { class: 'progress' }, h('div', { class: 'box' }, h('div', { class: 'pt', style: { fontWeight: 600 } }), h('div', { class: 'ps muted', style: { fontSize: '13px', marginTop: '4px' } }), h('div', { class: 'bar' }, h('div'))));
      document.body.append(this.el);
    }
    $('.pt', this.el).textContent = title; $('.ps', this.el).textContent = '';
    if (frac != null) this.set(frac);
  },
  set(frac, label) { if (!this.el) return; $('.bar div', this.el).style.width = Math.round(frac * 100) + '%'; if (label) $('.ps', this.el).textContent = label; },
  hide() { this.el?.remove(); this.el = null; },
};

/* ================================================================ campaigns */
async function loadCampaign(id) {
  const c = S.campaigns.find((x) => x.id === id);
  if (!c) { S.cid = null; S.campaign = null; buildIndex([]); renderChrome(); route(); return; }
  S.cid = id; S.campaign = c; store.set('lastCampaign', id);
  S.ui = Object.assign(defaultUI(), store.get('c:' + id, {}));
  const recs = await DB.files(id);
  buildIndex(recs);
  S.ui.tabs = S.ui.tabs.filter((p) => S.notes.has(p));
  Audio_.stopAll();
  renderChrome();
  route();
}
async function deleteCampaign() {
  if (!S.campaign) return;
  if (!confirm(`Remove “${S.campaign.name}” from the dashboard? Your vault files are not touched.`)) return;
  await DB.deleteCampaign(S.cid);
  try { localStorage.removeItem('dmdash:c:' + S.cid); } catch { /* ignore */ }
  S.campaigns = await DB.campaigns();
  await loadCampaign(S.campaigns[0]?.id);
  location.hash = '#/home';
}

/* ================================================================ markdown */
marked.use({ gfm: true, breaks: true });

function wikiLinkHtml(raw) {
  const { file, anchor, alias } = splitTarget(raw);
  const path = file ? resolve(file) : (S.current || null);
  const text = alias || (anchor ? (file ? file + ' › ' : '') + anchor : file);
  if (path && kindOf(path) === 'audio') return soundChipHtml(path, alias);
  if (path && !S.notes.has(path)) return `<a href="${esc(urlFor(path) || '#')}" target="_blank" rel="noopener">${esc(text)}</a>`;
  return `<a class="wl${path ? '' : ' missing'}" data-path="${esc(path || '')}" data-anchor="${esc(anchor)}" title="${esc(path ? stripExt(path) : 'No note called “' + file + '” yet')}">${esc(text)}</a>`;
}
function soundChipHtml(path, label) {
  return `<span class="snd ${channelOf(path)}" data-snd="${esc(path)}" role="button" tabindex="0">${icon('play')}<span>${esc(label || stripExt(baseName(path)))}</span></span>`;
}
function embedHtml(raw) {
  const { file, anchor, alias } = splitTarget(raw);
  const path = resolve(file);
  if (!path) return `<span class="chip" title="Missing embed">${esc(file)} (not found)</span>`;
  const k = kindOf(path);
  if (k === 'audio') return soundChipHtml(path, alias && !/^\d+(x\d+)?$/.test(alias) ? alias : null);
  if (k === 'image') { const w = alias && /^(\d+)/.exec(alias); return `<img src="${esc(urlFor(path))}" alt="${esc(baseName(path))}"${w ? ` width="${w[1]}"` : ''}>`; }
  if (k === 'pdf') return `<a href="${esc(urlFor(path))}" target="_blank" rel="noopener">${esc(baseName(path))}</a>`;
  return `<div class="note-embed" data-embed="${esc(path)}" data-anchor="${esc(anchor)}"></div>`;
}
function preprocess(md) {
  const parts = md.split(/(^```[\s\S]*?^```[^\n]*$|^~~~[\s\S]*?^~~~[^\n]*$)/m);
  return parts.map((part, i) => {
    if (i % 2) return part;
    return part
      .replace(/%%[\s\S]*?%%/g, '')
      .replace(/(`+)([\s\S]*?)\1/g, (m) => m.replace(/\[/g, '&#91;'))
      .replace(/==([^=\n]+)==/g, '<mark>$1</mark>')
      .replace(/!\[\[([^\]\n]+?)\]\]/g, (m, t) => embedHtml(t))
      .replace(/\[\[([^\]\n]+?)\]\]/g, (m, t) => wikiLinkHtml(t));
  }).join('');
}
function renderMarkdown(md, opts = {}) {
  const root = h('div', { class: 'md' });
  root.innerHTML = marked.parse(preprocess(md));
  postProcess(root, opts);
  return root;
}
function postProcess(root, opts) {
  // inline code: undo the bracket protection
  for (const c of $$('code', root)) if (c.innerHTML.includes('&amp;#91;')) c.innerHTML = c.innerHTML.replace(/&amp;#91;/g, '[');
  // ```statblock code blocks (the Fantasy Statblocks plugin format)
  for (const code of $$('pre > code.language-statblock', root)) code.parentElement.replaceWith(renderStatblock(parseYaml(code.textContent)));
  // callouts
  for (const bq of $$('blockquote', root)) {
    const first = bq.firstElementChild;
    if (!first || first.tagName !== 'P') continue;
    const m = /^\s*\[!([\w-]+)\]([+-]?)[ \t]*/.exec(first.innerHTML);
    if (!m) continue;
    const type = m[1].toLowerCase();
    let rest = first.innerHTML.slice(m[0].length);
    const br = rest.search(/<br\s*\/?>|\n/);
    const title = br >= 0 ? rest.slice(0, br) : rest;
    const after = br >= 0 ? rest.slice(br).replace(/^(<br\s*\/?>|\n)\s*/, '') : '';
    const kind = SECRET_CALLOUTS.has(type) ? 'secret' : READ_CALLOUTS.has(type) ? 'readaloud' : '';
    const titleEl = h('div', { class: 'callout-title' }, h('span', { class: 'grow', html: title.trim() || esc(kind === 'secret' ? 'DM only' : titleCase(type)) }));
    const content = h('div', { class: 'callout-content' });
    if (after.trim()) content.append(h('p', { html: after }));
    first.remove();
    content.append(...bq.childNodes);
    const co = h('div', { class: `callout ${kind}${m[2] ? ' foldable' : ''}${m[2] === '-' ? ' folded' : ''}`, 'data-type': type }, titleEl, content);
    if (m[2]) titleEl.addEventListener('click', () => co.classList.toggle('folded'));
    if (kind === 'readaloud') titleEl.append(h('button', { class: 'btn small', title: 'Show full screen for reading aloud', onclick: (e) => { e.stopPropagation(); present(content.cloneNode(true), title.replace(/<[^>]+>/g, '') || 'Read aloud'); }, html: icon('expand') + ' Present' }));
    bq.replaceWith(co);
  }
  // headings get ids for [[Note#Heading]] links
  for (const hd of $$('h1,h2,h3,h4,h5,h6', root)) if (!hd.id) hd.id = 'h-' + slug(hd.textContent);
  // tables: wrap + roll buttons
  for (const t of $$('table', root)) {
    const wrap = h('div', { class: 'table-wrap' }); t.replaceWith(wrap); wrap.append(t);
    const th = t.querySelector('thead th, tr th');
    const m = th && /^\s*(\d*)\s*d\s*(\d+)\s*$/i.exec(th.textContent);
    if (m) {
      const sides = +m[2];
      const bar = h('div', { class: 'roll-table-bar' }, h('button', { class: 'btn small', html: icon('dice') + ` Roll d${sides} on this table`, onclick: () => rollTable(t, sides) }));
      wrap.before(bar);
    }
  }
  // links
  for (const a of $$('a[href]', root)) if (/^https?:/i.test(a.getAttribute('href'))) { a.target = '_blank'; a.rel = 'noopener'; }
  for (const img of $$('img', root)) {
    const src = img.getAttribute('src') || '';
    if (src && !/^(https?:|data:|blob:)/i.test(src)) { const p = resolve(decodeURIComponent(src)); if (p) img.src = urlFor(p); }
  }
  // note embeds
  const depth = opts.depth || 0;
  for (const em of $$('.note-embed', root)) {
    const n = S.notes.get(em.dataset.embed);
    if (!n || !visible(n) || depth > 1) { em.remove(); continue; }
    let body = n.body;
    if (em.dataset.anchor) body = sectionOf(body, em.dataset.anchor) || body;
    em.append(h('div', { class: 'embed-title' }, h('a', { class: 'wl', 'data-path': n.path }, n.name + (em.dataset.anchor ? ' › ' + em.dataset.anchor : ''))));
    em.append(renderMarkdown(body, { depth: depth + 1 }));
  }
  if (!depth) diceify(root);
}
function sectionOf(body, heading) {
  const lines = body.split(/\r?\n/); const want = slug(heading);
  let start = -1, level = 0;
  for (let i = 0; i < lines.length; i++) {
    const m = /^(#{1,6})\s+(.*)$/.exec(lines[i]);
    if (!m) continue;
    if (start < 0 && slug(m[2]) === want) { start = i; level = m[1].length; continue; }
    if (start >= 0 && m[1].length <= level) return lines.slice(start, i).join('\n');
  }
  return start >= 0 ? lines.slice(start).join('\n') : null;
}
const DICE_RE = /(^|[^\w])((\d{0,3})d(4|6|8|10|12|20|100)(?:\s*([+\-−–])\s*(\d+)(?!\s*d\d))?)(?![\w])/gi;
function diceify(root) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: (n) => n.parentElement.closest('a,button,code,pre,.dice,.snd,h1,h2,h3,h4,h5,h6,th') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT,
  });
  const nodes = []; while (walker.nextNode()) nodes.push(walker.currentNode);
  for (const node of nodes) {
    const text = node.nodeValue; DICE_RE.lastIndex = 0;
    if (!DICE_RE.test(text)) continue;
    DICE_RE.lastIndex = 0;
    const frag = document.createDocumentFragment(); let last = 0; let m;
    while ((m = DICE_RE.exec(text))) {
      const start = m.index + m[1].length;
      frag.append(text.slice(last, start));
      const expr = m[2].replace(/[−–]/g, '-').replace(/\s+/g, '');
      frag.append(h('span', { class: 'dice', role: 'button', tabindex: '0', 'data-roll': expr, title: 'Roll ' + expr }, m[2]));
      last = start + m[2].length;
    }
    frag.append(text.slice(last));
    node.replaceWith(frag);
  }
}
function rollTable(table, sides) {
  const rows = $$('tbody tr', table).length ? $$('tbody tr', table) : $$('tr', table).slice(1);
  const n = rand(sides);
  $$('tr.rolled', table).forEach((r) => r.classList.remove('rolled'));
  let hit = null;
  for (const r of rows) {
    const c = r.cells[0]?.textContent.trim() || '';
    const m = /^(\d+)\s*(?:[-–—]|to)?\s*(\d+)?\+?/.exec(c);
    if (!m) continue;
    let lo = +m[1], hi = m[2] ? +m[2] : lo;
    if (sides === 100) { if (lo === 0) lo = 100; if (hi === 0) hi = 100; }
    if (/\+$/.test(c) && !m[2]) hi = Infinity;
    if (n >= Math.min(lo, hi) && n <= Math.max(lo, hi)) { hit = r; break; }
  }
  let label = 'no matching row';
  if (hit) {
    hit.classList.add('rolled'); hit.scrollIntoView({ block: 'center', behavior: 'smooth' });
    label = [...hit.cells].slice(1).map((c) => c.textContent.trim()).filter(Boolean).join(' · ') || hit.textContent.trim();
  }
  logRoll({ expr: 'd' + sides, total: n, detail: label, label: 'Table' });
  toast(`<span class="big">${n}</span>${esc(label.length > 120 ? label.slice(0, 117) + '…' : label)}`, 5000, true);
}

/* ================================================================ statblocks */
// Small indentation-based YAML reader: enough for ```statblock blocks (maps, lists, lists of maps, block scalars).
function parseYaml(src) {
  const lines = src.replace(/\t/g, '  ').split(/\r?\n/).map((raw) => ({ ind: raw.search(/\S/), text: raw.trim(), raw }))
    .filter((l) => l.ind >= 0 && !l.text.startsWith('#'));
  let i = 0;
  const isItem = (l) => l.text === '-' || l.text.startsWith('- ');
  const block = () => (i >= lines.length ? null : isItem(lines[i]) ? list(lines[i].ind) : map(lines[i].ind));
  const nested = (rest, ind) => {
    if (/^[|>][+-]?$/.test(rest)) { const out = []; while (i < lines.length && lines[i].ind > ind) out.push(lines[i++].text); return rest[0] === '|' ? out.join('\n') : out.join(' '); }
    if (rest !== '') return yval(rest);
    if (i < lines.length && (lines[i].ind > ind || (lines[i].ind === ind && isItem(lines[i])))) return block();
    return '';
  };
  function map(ind) {
    const o = {};
    while (i < lines.length && lines[i].ind === ind && !isItem(lines[i])) {
      const m = /^([^:]+?):(?:\s+(.*)|\s*)$/.exec(lines[i].text); i++;
      if (m) o[m[1].trim().replace(/^["']|["']$/g, '')] = nested((m[2] || '').trim(), ind);
    }
    return o;
  }
  function list(ind) {
    const a = [];
    while (i < lines.length && lines[i].ind === ind && isItem(lines[i])) {
      const rest = lines[i].text.replace(/^-\s*/, '');
      if (/^[^:"'[{]+?:(\s|$)/.test(rest)) {
        const itemInd = ind + lines[i].raw.slice(ind).match(/^-\s*/)[0].length;
        lines[i] = { ind: itemInd, text: rest, raw: ' '.repeat(itemInd) + rest };
        a.push(map(itemInd));
      } else { i++; a.push(rest === '' ? nested('', ind) : yval(rest)); }
    }
    return a;
  }
  try { return block() || {}; } catch { return {}; }
}
const ABIL = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
const ABIL_LONG = { strength: 'Str', dexterity: 'Dex', constitution: 'Con', intelligence: 'Int', wisdom: 'Wis', charisma: 'Cha' };
function statblockScores(sb) {
  const out = {};
  if (Array.isArray(sb.stats)) sb.stats.slice(0, 6).forEach((v, j) => { out[ABIL[j]] = +v; });
  const ab = sb.abilities || sb.ability_scores;
  if (ab && typeof ab === 'object') for (const k of ABIL) if (ab[k] != null) out[k] = parseInt(ab[k], 10);
  for (const k of ABIL) if (sb[k] != null && out[k] == null && !isNaN(parseInt(sb[k], 10))) out[k] = parseInt(sb[k], 10);
  return out;
}
const lead = (v) => { const m = /-?\d+/.exec(String(v ?? '')); return m ? +m[0] : null; };
const modOf = (score) => Math.floor((score - 10) / 2);
const fmtMod = (m) => (m >= 0 ? '+' : '−') + Math.abs(m);
function inlineMd(text) { return marked.parseInline(preprocess(String(text ?? ''))); }
function renderStatblock(sb) {
  const el = h('div', { class: 'statblock' });
  const typeLine = [[sb.size, sb.type, sb.subtype ? `(${sb.subtype})` : null].filter(Boolean).join(' '), sb.alignment].filter(Boolean).join(', ');
  const cr = sb.cr != null && sb.cr !== '' ? (String(sb.cr).match(/^cr/i) ? sb.cr : 'CR ' + sb.cr) : null;
  el.append(h('div', { class: 'sb-head' }, h('div', { style: { minWidth: 0 } }, sb.name ? h('div', { class: 'sb-name' }, sb.name) : null, typeLine ? h('div', { class: 'sb-type' }, typeLine) : null), cr ? h('span', { class: 'sb-cr' }, cr) : null));
  const core = [['AC', sb.ac], ['HP', sb.hp != null ? sb.hp + (sb.hit_dice && !String(sb.hp).includes('(') ? ` (${sb.hit_dice})` : '') : null], ['Speed', sb.speed]].filter(([, v]) => v != null && v !== '');
  if (core.length) el.append(h('div', { class: 'sb-core', html: core.map(([k, v]) => `<span><b>${k}</b> ${esc(v)}</span>`).join('') }));
  const sc = statblockScores(sb);
  if (Object.keys(sc).length) {
    el.append(h('div', { class: 'sb-abil' }, ABIL.filter((k) => sc[k] != null && !isNaN(sc[k])).map((k) => {
      const m = modOf(sc[k]);
      return h('div', { class: 'dice sb-ab', 'data-roll': 'd20' + (m >= 0 ? '+' : '') + m, 'data-label': (sb.name || '') + ' ' + k.toUpperCase(), title: `Roll ${k.toUpperCase()} check` }, h('div', { class: 'k' }, k.toUpperCase()), h('div', {}, `${sc[k]} (${fmtMod(m)})`));
    })));
  }
  const kvList = (v) => Array.isArray(v) ? v.map((x) => typeof x === 'object' && x ? Object.entries(x).map(([a, b]) => `${ABIL_LONG[a.toLowerCase()] || titleCase(a)} ${typeof b === 'number' ? fmtMod(b) : b}`).join(', ') : x).join(', ') : v;
  const meta = [['Saving throws', kvList(sb.saves)], ['Skills', kvList(sb.skillsaves || sb.skills)], ['Vulnerabilities', sb.damage_vulnerabilities || sb.vulnerabilities], ['Resistances', sb.damage_resistances || sb.resistances], ['Immunities', sb.damage_immunities || sb.immunities], ['Condition immunities', sb.condition_immunities], ['Senses', sb.senses], ['Languages', sb.languages]];
  if (Array.isArray(sb.meta)) for (const m of sb.meta) if (m && typeof m === 'object') meta.push([m.label || m.name, m.value || m.desc]);
  const metaEl = h('div', { class: 'sb-meta' });
  for (const [k, v] of meta) if (v != null && v !== '' && !(Array.isArray(v) && !v.length)) metaEl.append(h('div', { html: `<b>${esc(k)}</b> ${inlineMd(Array.isArray(v) ? v.join(', ') : v)}` }));
  if (metaEl.childNodes.length) el.append(metaEl);
  const section = (title, items, desc) => {
    if (!items || (Array.isArray(items) && !items.length)) return;
    const sec = h('div', { class: 'sb-sec' }, title ? h('div', { class: 'sb-sec-t' }, title) : null, desc ? h('p', { html: inlineMd(desc) }) : null);
    for (const it of Array.isArray(items) ? items : [items]) {
      if (it && typeof it === 'object') sec.append(h('p', { html: `${it.name ? `<b><i>${esc(it.name)}.</i></b> ` : ''}${inlineMd(it.desc ?? it.text ?? it.description ?? '')}` }));
      else sec.append(h('p', { html: inlineMd(it) }));
    }
    el.append(sec);
  };
  section(null, sb.traits);
  section('Spellcasting', sb.spells);
  section('Actions', sb.actions);
  section('Bonus actions', sb.bonus_actions);
  section('Reactions', sb.reactions);
  section('Legendary actions', sb.legendary_actions || sb.legendary, sb.legendary_description);
  section('Lair actions', sb.lair_actions || sb.lair);
  if (sb.note || sb.notes) el.append(h('p', { class: 'sb-note', html: inlineMd(sb.note || sb.notes) }));
  return el;
}
const STATBLOCK_RE = /```statblock[^\n]*\n([\s\S]*?)```/;
function hasStatblock(n) { return STATBLOCK_RE.test(n.body); }
function statblockOf(n) { const m = STATBLOCK_RE.exec(n.body); return m ? parseYaml(m[1]) : null; }

/* ================================================================ dice */
function rollExpr(expr, mode) {
  const src = String(expr).toLowerCase().replace(/\s+/g, '').replace(/[−–]/g, '-');
  const re = /([+-])?(?:(\d*)d(\d+|%)(kh\d+|kl\d+|k\d+)?|(\d+))/g;
  let total = 0, parts = [], m, used = 0, d20 = null, singleD20 = true, dice = 0;
  while ((m = re.exec(src))) {
    if (m.index !== used) return null;
    used = re.lastIndex;
    const sign = m[1] === '-' ? -1 : 1;
    if (m[5]) { total += sign * +m[5]; parts.push((sign < 0 ? '- ' : parts.length ? '+ ' : '') + m[5]); continue; }
    let count = m[2] === '' ? 1 : +m[2]; const sides = m[3] === '%' ? 100 : +m[3];
    if (count > 200 || sides < 1 || sides > 1000) return null;
    dice += count;
    let rolls;
    if (sides === 20 && count === 1 && (mode === 'adv' || mode === 'dis')) {
      const a = rand(20), b = rand(20); const keep = mode === 'adv' ? Math.max(a, b) : Math.min(a, b);
      rolls = [keep]; parts.push((sign < 0 ? '- ' : parts.length ? '+ ' : '') + `d20 ${mode} [${a}, ${b}] → ${keep}`);
      total += sign * keep; d20 = keep; continue;
    }
    rolls = Array.from({ length: count }, () => rand(sides));
    let kept = rolls.slice();
    if (m[4]) {
      const k = +m[4].replace(/\D/g, ''); const sorted = rolls.slice().sort((a, b) => b - a);
      kept = m[4].startsWith('kl') ? sorted.slice(-k) : sorted.slice(0, k);
    }
    const sum = kept.reduce((a, b) => a + b, 0);
    total += sign * sum;
    if (sides === 20 && count === 1) d20 = rolls[0]; else if (sides === 20) singleD20 = false;
    parts.push((sign < 0 ? '- ' : parts.length ? '+ ' : '') + `${count}d${sides}${m[4] || ''} [${rolls.join(', ')}]`);
  }
  if (used !== src.length || !parts.length) return null;
  return { total, detail: parts.join(' '), crit: singleD20 && d20 === 20 && dice === 1, fumble: singleD20 && d20 === 1 && dice === 1 };
}
function roll(expr, label, mode) {
  const r = rollExpr(expr, mode);
  if (!r) { toast('Could not read “' + esc(expr) + '”. Try 2d6+3.'); return null; }
  logRoll({ expr: expr + (mode ? ' ' + mode : ''), total: r.total, detail: r.detail, label, crit: r.crit, fumble: r.fumble });
  toast(`<span class="big">${r.total}</span>${esc(label ? label + ': ' : '')}${esc(expr)}${r.crit ? ' · <b>Natural 20!</b>' : r.fumble ? ' · <b>Natural 1</b>' : ''} <span class="muted">${esc(r.detail)}</span>`, 4000, true);
  return r;
}
function logRoll(entry) {
  if (!S.ui) return;
  S.ui.log.unshift({ ...entry, t: Date.now() });
  S.ui.log = S.ui.log.slice(0, 60);
  saveUI();
  if (S.settings.rpTab === 'dice') renderRight();
}

/* ================================================================ audio */
function channelOf(path) {
  const p = '/' + path.toLowerCase();
  const segs = p.split('/');
  const has = (re) => segs.some((s) => re.test(s));
  if (has(/^(ambien(ce|t)s?|atmospheres?|atmos|environments?|loops?|backgrounds?)$/) || /ambien|atmos/.test(baseName(p))) return 'ambience';
  if (has(/^(sfx|sound.?effects?|effects?|fx|one.?shots?|stingers?)$/)) return 'sfx';
  if (has(/^(music|songs?|bgm|soundtracks?|ost|themes?|playlists?|tracks?|bard|ballads?)$/)) return 'music';
  if (/\b(theme|song|music|ballad|battle|ost)\b/.test(baseName(p).replace(/[_-]/g, ' '))) return 'music';
  const r = S.files.get(path);
  return r && r.size > 1.5e6 ? 'music' : 'sfx';
}
const Audio_ = {
  tracks: new Map(), // path -> { path, ch, el, vol, loop, paused }
  fadeMs: 1500,
  vol(ch) { return S.settings.vol[ch] ?? 0.7; },
  level(t) { return Math.max(0, Math.min(1, this.vol(t.ch) * t.vol)); },
  fade(el, to, ms, done) {
    if (!(ms > 0)) { el.volume = to; done && done(); return; }
    const from = el.volume; const t0 = performance.now();
    const step = (t) => { const k = Math.min(1, Math.max(0, (t - t0) / ms)); el.volume = Math.max(0, Math.min(1, from + (to - from) * k)); if (k < 1) requestAnimationFrame(step); else done && done(); };
    requestAnimationFrame(step);
  },
  // Music and ambience toggle; effects restart from the top when pressed again.
  play(path) {
    const ch = channelOf(path);
    const cur = this.tracks.get(path);
    if (cur) {
      if (ch === 'sfx' || cur.paused) { if (ch === 'sfx') cur.el.currentTime = 0; this.resume(path); return; }
      this.stop(path); return;
    }
    let crossfade = false;
    if (ch === 'music') for (const o of [...this.tracks.values()]) if (o.ch === 'music') { this.stop(o.path, this.fadeMs); crossfade = true; }
    const url = urlFor(path); if (!url) { toast('That sound is missing from the vault.'); return; }
    const el = new Audio(url);
    const t = { path, ch, el, vol: store.get('tv:' + path, 1), loop: ch === 'ambience' ? true : ch === 'music' ? S.settings.loop !== false : false, paused: false };
    el.loop = t.loop; el.volume = 0;
    el.addEventListener('ended', () => {
      if (this.tracks.get(path) !== t) return;
      this.tracks.delete(path); this.changed();
      if (ch === 'music' && S.settings.loop === false) this.next(path);
    });
    this.tracks.set(path, t);
    el.play().catch((e) => { toast('Could not play: ' + e.message); this.tracks.delete(path); this.changed(); });
    this.fade(el, this.level(t), ch === 'sfx' ? 0 : crossfade ? this.fadeMs : 500);
    this.changed();
  },
  playSfx(path) { this.play(path); },
  next(after) {
    const list = soundsBy('music'); if (!list.length) return;
    const i = list.findIndex((s) => s.path === after);
    this.play(list[(i + 1) % list.length].path);
  },
  stop(path, ms = 700) {
    const t = this.tracks.get(path); if (!t) return;
    this.tracks.delete(path);
    this.fade(t.el, 0, t.paused ? 0 : ms, () => t.el.pause());
    this.changed();
  },
  pause(path) { const t = this.tracks.get(path); if (!t) return; t.el.pause(); t.paused = true; this.changed(); },
  resume(path) { const t = this.tracks.get(path); if (!t) return; t.paused = false; t.el.volume = this.level(t); t.el.play().catch(() => {}); this.changed(); },
  setLoop(path, v) { const t = this.tracks.get(path); if (!t) return; t.loop = v; t.el.loop = v; this.changed(); },
  setTrackVol(path, v) { store.set('tv:' + path, v); const t = this.tracks.get(path); if (t) { t.vol = v; t.el.volume = this.level(t); } },
  stopAll() {
    for (const t of this.tracks.values()) t.el.pause();
    this.tracks.clear(); this.changed();
  },
  setVol(ch, v) {
    S.settings.vol[ch] = v; saveSettings();
    for (const t of this.tracks.values()) if (t.ch === ch && !t.paused) t.el.volume = this.level(t);
  },
  isPlaying(path) { const t = this.tracks.get(path); return !!t && !t.paused; },
  changed() {
    for (const el of $$('[data-snd]')) el.classList.toggle('playing', this.isPlaying(el.dataset.snd));
    for (const el of $$('[data-sndi]')) el.classList.toggle('playing', this.isPlaying(el.dataset.sndi));
    renderNowPlaying();
    if (S.cid && S.settings.right && S.settings.rpTab === 'sound') renderRight();
  },
};
function soundsBy(ch) {
  return [...S.files.values()].filter((f) => f.kind === 'audio' && (!ch || channelOf(f.path) === ch));
}

/* ================================================================ UI: toasts, overlays */
function toast(html, ms = 3000, raw = false) {
  const t = h('div', { class: 'toast', html: raw ? html : esc(html) });
  $('#toasts').append(t);
  setTimeout(() => t.remove(), ms);
  while ($('#toasts').children.length > 3) $('#toasts').firstChild.remove();
}
function overlay(content, onClose) {
  const o = h('div', { class: 'overlay', onclick: (e) => { if (e.target === o) close(); } }, content);
  const close = () => { o.remove(); document.removeEventListener('keydown', key, true); onClose && onClose(); };
  const key = (e) => { if (e.key === 'Escape') { e.stopPropagation(); close(); } };
  document.addEventListener('keydown', key, true);
  document.body.append(o);
  return close;
}
function present(contentNode, title, extras) {
  let scale = S.settings.presentScale || 1.6;
  const body = h('div', { class: 'body' });
  const md = h('div', { class: 'md' }); md.append(contentNode); body.append(md);
  const apply = () => { md.style.fontSize = (16 * scale) + 'px'; S.settings.presentScale = scale; saveSettings(); };
  const el = h('div', { class: 'present' },
    h('div', { class: 'bar' }, h('div', { class: 't' }, title), extras || null,
      h('button', { class: 'btn', onclick: () => { scale = Math.max(0.8, scale - 0.2); apply(); } }, 'A−'),
      h('button', { class: 'btn', onclick: () => { scale = Math.min(4, scale + 0.2); apply(); } }, 'A+'),
      h('button', { class: 'btn', html: icon('x') + ' Close (Esc)', onclick: () => close() })),
    body);
  apply();
  const key = (e) => { if (e.key === 'Escape') { e.stopPropagation(); close(); } };
  const close = () => { el.remove(); document.removeEventListener('keydown', key, true); };
  document.addEventListener('keydown', key, true);
  document.body.append(el);
  Audio_.changed();
}
function presentNote(path) {
  const n = S.notes.get(path); if (!n) return;
  present(renderMarkdown(n.body), n.name, soundButtonsFor(n));
}

/* ================================================================ quick switcher */
function openSwitcher(initial = '') {
  const existing = $('.overlay .palette input'); if (existing) { existing.focus(); return; }
  const input = h('input', { type: 'text', placeholder: 'Jump to a note, sound or script…  (type to search inside notes too)', value: initial });
  const results = h('div', { class: 'results' });
  const box = h('div', { class: 'palette' }, input, results, h('div', { class: 'hint' }, '↑↓ to move · Enter to open · sounds play straight away · Esc to close'));
  let items = [], sel = 0;
  const close = overlay(box);
  const score = (name, q) => {
    const n = name.toLowerCase(); if (!q) return 1;
    if (n === q) return 100; if (n.startsWith(q)) return 80; if (n.includes(q)) return 60 - n.indexOf(q) / 10;
    let i = 0; for (const c of n) if (c === q[i]) i++; return i === q.length ? 20 : 0;
  };
  const update = () => {
    const q = input.value.trim().toLowerCase();
    const out = [];
    for (const n of S.notes.values()) {
      if (!visible(n)) continue;
      const s = Math.max(score(n.name, q), ...n.aliases.map((a) => score(a, q) - 5));
      if (s > 0) out.push({ s: s + (n.type === 'pc' || n.type === 'npc' ? 2 : 0), kind: 'note', n });
    }
    for (const f of soundsBy()) { const s = score(stripExt(baseName(f.path)), q); if (s > 0 && q) out.push({ s: s - 1, kind: 'sound', f }); }
    out.sort((a, b) => b.s - a.s || (a.n?.name || '').localeCompare(b.n?.name || ''));
    items = out.slice(0, 40);
    if (q.length >= 3 && items.length < 40) {
      const seen = new Set(items.map((i) => i.n?.path));
      for (const n of S.notes.values()) {
        if (seen.has(n.path) || !visible(n)) continue;
        const i = n.body.toLowerCase().indexOf(q);
        if (i >= 0) { items.push({ kind: 'text', n, snip: n.body.slice(Math.max(0, i - 40), i + 80).replace(/\s+/g, ' ') }); if (items.length >= 60) break; }
      }
    }
    sel = 0; draw();
  };
  const draw = () => {
    results.innerHTML = '';
    if (!items.length) results.append(h('div', { class: 'res muted' }, 'Nothing found'));
    items.forEach((it, i) => {
      const r = h('div', { class: 'res' + (i === sel ? ' sel' : ''), onclick: () => choose(i), onmousemove: () => { if (sel !== i) { sel = i; draw(); } } });
      if (it.kind === 'sound') r.append(h('span', { html: icon('music') }), h('div', { class: 'col' }, h('div', { class: 't' }, stripExt(baseName(it.f.path))), h('div', { class: 's' }, channelOf(it.f.path) + ' · ' + dirName(it.f.path))));
      else r.append(h('span', { html: icon(it.n.type === 'script' ? 'scroll' : it.n.type === 'pc' ? 'users' : 'note') }), h('div', { class: 'col' }, h('div', { class: 't' }, it.n.name), h('div', { class: 's' }, it.kind === 'text' ? '…' + it.snip + '…' : [it.n.type, it.n.folder].filter(Boolean).join(' · '))));
      results.append(r);
    });
    results.children[sel]?.scrollIntoView({ block: 'nearest' });
  };
  const choose = (i) => {
    const it = items[i]; if (!it) return;
    if (it.kind === 'sound') { Audio_.play(it.f.path); return; }
    close(); openNote(it.n.path);
  };
  input.addEventListener('input', update);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') { sel = Math.min(items.length - 1, sel + 1); draw(); e.preventDefault(); }
    else if (e.key === 'ArrowUp') { sel = Math.max(0, sel - 1); draw(); e.preventDefault(); }
    else if (e.key === 'Enter') { choose(sel); e.preventDefault(); }
  });
  update(); input.focus();
}
function showHelp() {
  const rows = [['Ctrl+K or /', 'Search notes, sounds and text'], ['Ctrl+.', 'Player view on/off (hides DM secrets)'], ['N', 'Next turn in combat'], ['Space (on Sounds page)', 'Stop all sound'], ['Alt+← / Alt+→', 'Back / forward'], ['Esc', 'Close overlays'], ['?', 'This help']];
  overlay(h('div', { class: 'palette', style: { padding: '16px 20px' } }, h('h3', { style: { marginTop: 0 } }, 'Keyboard shortcuts'),
    h('table', { style: { width: '100%' } }, rows.map(([k, v]) => h('tr', {}, h('td', { style: { padding: '4px 12px 4px 0' } }, h('kbd', {}, k)), h('td', {}, v))))));
}

/* ================================================================ routing */
function go(hash) { if (location.hash === hash) route(); else location.hash = hash; }
function openNote(path, anchor) {
  if (S.ui?.books?.includes(path)) return go('#/book/' + encodeURIComponent(path) + (anchor ? '::' + encodeURIComponent(anchor) : ''));
  go('#/note/' + encodeURIComponent(path) + (anchor ? '::' + encodeURIComponent(anchor) : ''));
}
function route() {
  const hash = location.hash || '#/home';
  const [, kind, ...rest] = hash.split('/');
  const arg = decodeURIComponent(rest.join('/'));
  S.current = null;
  renderNav(kind);
  if (!S.cid) { renderWelcome(); renderTabs(); return; }
  if (kind === 'note') { const [p, a] = arg.split('::'); return renderNoteView(p, a ? decodeURIComponent(a) : ''); }
  if (kind === 'book') { const [p, a] = arg.split('::'); return renderBook(p, a ? decodeURIComponent(a) : ''); }
  renderTabs();
  if (kind === 'folder') return renderFolder(arg);
  if (kind === 'party') return renderParty();
  if (kind === 'sounds') return renderSounds();
  if (kind === 'scripts') return renderScripts();
  if (kind === 'welcome') return renderWelcome();
  return renderHome();
}
function setView(...nodes) {
  if (S.bookObs) { S.bookObs.disconnect(); S.bookObs = null; }
  const v = $('#view'); v.innerHTML = ''; v.scrollTop = 0; v.append(...nodes);
  if (window.matchMedia('(max-width: 820px)').matches) document.body.classList.remove('show-side');
}

/* ================================================================ chrome */
function renderChrome() {
  document.documentElement.dataset.theme = S.settings.theme || (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
  document.body.classList.toggle('player-safe', S.playerSafe);
  document.body.classList.toggle('no-right', !S.settings.right);
  $('#btnPlayer').innerHTML = icon(S.playerSafe ? 'eyeoff' : 'eye');
  $('#btnPlayer').classList.toggle('on', S.playerSafe);
  $('#btnTheme').innerHTML = icon(document.documentElement.dataset.theme === 'light' ? 'moon' : 'sun');
  $('#btnRight').classList.toggle('on', !!S.settings.right);
  const sel = $('#campaignSel'); sel.innerHTML = '';
  for (const c of S.campaigns) sel.append(h('option', { value: c.id, selected: c.id === S.cid }, c.name));
  sel.append(h('option', { value: '__import' }, '+ Import another vault…'));
  if (S.campaign) sel.append(h('option', { value: '__delete' }, '− Remove this campaign…'));
  $('#brandName').textContent = S.campaign ? S.campaign.name : 'DM Dashboard';
  document.title = S.campaign ? S.campaign.name + ' · DM Dashboard' : 'DM Dashboard';
  $('#btnResync').classList.toggle('hidden', !S.campaign);
  renderTree();
  renderRight();
  renderNowPlaying();
}
function renderNav(active) {
  const nav = $('#nav'); nav.innerHTML = '';
  if (!S.cid) return;
  const pcs = partyNotes().length, snd = soundsBy().length, scr = scriptItems().length;
  const items = [['home', 'home', 'Home', null], ['party', 'users', 'Party', pcs], ['sounds', 'music', 'Sounds', snd], ['scripts', 'scroll', 'Prompt book', scr]];
  for (const [k, ic, label, count] of items) {
    nav.append(h('a', { class: (active || 'home') === k ? 'active' : '', href: '#/' + k, html: icon(ic) + `<span>${label}</span>` + (count != null ? `<span class="count">${count}</span>` : '') }));
  }
}
function renderTree() {
  const tree = $('#tree'); tree.innerHTML = '';
  if (!S.cid) return;
  const q = $('#treeFilter').value.trim().toLowerCase();
  const open = S.ui.open;
  if (q) {
    const hits = [...S.notes.values()].filter((n) => visible(n) && (n.name.toLowerCase().includes(q) || n.aliases.some((a) => a.toLowerCase().includes(q))));
    for (const n of hits) tree.append(noteRow(n, true));
    if (!hits.length) tree.append(h('div', { class: 'muted', style: { padding: '8px' } }, 'No matching notes'));
    return;
  }
  if (S.ui.pinned.length) {
    tree.append(h('div', { class: 'section-title', style: { margin: '6px 6px 4px' } }, 'Pinned'));
    for (const p of S.ui.pinned) { const n = S.notes.get(p); if (visible(n)) tree.append(noteRow(n)); }
    tree.append(h('div', { class: 'section-title', style: { margin: '12px 6px 4px' } }, 'Vault'));
  }
  const root = { dirs: new Map(), notes: [] };
  for (const n of S.notes.values()) {
    if (!visible(n)) continue;
    let node = root;
    if (n.folder) for (const seg of n.folder.split('/')) { if (!node.dirs.has(seg)) node.dirs.set(seg, { dirs: new Map(), notes: [] }); node = node.dirs.get(seg); }
    node.notes.push(n);
  }
  const draw = (node, path, parent) => {
    for (const [name, child] of [...node.dirs].sort((a, b) => a[0].localeCompare(b[0], undefined, { numeric: true }))) {
      const p = path ? path + '/' + name : name;
      const isOpen = !!open[p];
      const row = h('div', { class: 'row folder' + (isOpen ? ' open' : ''), title: p });
      const chev = h('span', { class: 'chev', html: icon('chev') });
      row.append(chev, h('span', { class: 'lbl' }, name));
      const kids = h('div', { class: 'kids' + (isOpen ? '' : ' hidden') });
      const toggle = () => { open[p] = !open[p]; if (!open[p]) delete open[p]; saveUI(); row.classList.toggle('open', !!open[p]); kids.classList.toggle('hidden', !open[p]); };
      chev.addEventListener('click', (e) => { e.stopPropagation(); toggle(); });
      row.addEventListener('click', () => { if (!open[p]) toggle(); go('#/folder/' + encodeURIComponent(p)); });
      parent.append(row, kids);
      draw(child, p, kids);
    }
    for (const n of node.notes) parent.append(noteRow(n));
  };
  draw(root, '', tree);
  highlightTree();
}
function noteRow(n, showFolder) {
  return h('div', { class: 'row note', 'data-path': n.path, title: n.path, onclick: () => openNote(n.path) },
    h('span', { class: 'chev' }), h('span', { class: 'lbl' }, n.name, showFolder && n.folder ? h('span', { class: 'muted' }, '  ' + n.folder) : null),
    n.dmOnly ? h('span', { class: 'badge-dm' }, 'DM') : null);
}
function highlightTree() {
  for (const r of $$('#tree .row.note')) r.classList.toggle('active', r.dataset.path === S.current);
}
function renderTabs() {
  const bar = $('#tabs'); bar.innerHTML = '';
  if (!S.ui) return;
  for (const p of S.ui.tabs) {
    const n = S.notes.get(p); if (!visible(n)) continue;
    const t = h('div', { class: 'tab' + (p === S.current ? ' active' : ''), title: p, onclick: () => openNote(p), onauxclick: (e) => { if (e.button === 1) closeTab(p); } },
      h('span', {}, n.name), h('button', { class: 'x', title: 'Close tab', html: icon('x'), onclick: (e) => { e.stopPropagation(); closeTab(p); } }));
    bar.append(t);
  }
}
function closeTab(p) {
  const i = S.ui.tabs.indexOf(p); if (i < 0) return;
  S.ui.tabs.splice(i, 1); saveUI();
  if (S.current === p) { const nxt = S.ui.tabs[i] || S.ui.tabs[i - 1]; nxt ? openNote(nxt) : go('#/home'); }
  else renderTabs();
}
function renderNowPlaying() {
  const el = $('#nowPlaying'); if (!el) return; el.innerHTML = '';
  const parts = [...Audio_.tracks.values()].filter((t) => t.ch !== 'sfx' && !t.paused).map((t) => stripExt(baseName(t.path)));
  if (!parts.length) return;
  el.append(h('button', { class: 'btn small', title: 'Open the mixer', onclick: () => openRight('sound'), html: icon('music') + `<span class="np-name">${esc(parts.join(' + '))}</span>` }));
}

/* ================================================================ party / stats helpers */
function partyNotes() { return [...S.notes.values()].filter((n) => n.type === 'pc' && visible(n)); }
function statsOf(n) {
  const fm = n.fm, b = n.body;
  const num = (re) => { const m = re.exec(b); return m ? +m[1] : null; };
  const pick = (...keys) => { for (const k of keys) { const v = fm[k]; if (v !== undefined && v !== '' && !isNaN(+v)) return +v; } return null; };
  const s = {
    hp: pick('hp', 'max_hp', 'maxhp', 'hit_points') ?? num(/\bH(?:P|it Points)\b\*{0,2}\s*[:=]?\s*\*{0,2}\s*(\d+)/i),
    ac: pick('ac', 'armor_class', 'armour_class') ?? num(/\b(?:AC|Armou?r Class)\b\*{0,2}\s*[:=]?\s*\*{0,2}\s*(\d+)/),
    pp: pick('passive_perception', 'pp', 'passive') ?? num(/Passive Perception\*{0,2}\s*[:=]?\s*\*{0,2}\s*(\d+)/i),
    init: pick('initiative', 'init', 'init_bonus', 'initiative_bonus'),
    speed: fm.speed || ((/\*{0,2}Speed\*{0,2}\s*[:=]?\s*\*{0,2}\s*([^·|\n]+)/i.exec(b) || [])[1] || '').trim() || null,
    level: pick('level', 'lvl'),
    cr: fm.cr ?? ((/\b(?:CR|Challenge)\b\*{0,2}\s*[:=]?\s*\*{0,2}\s*([\d/]+)/.exec(b) || [])[1] || null),
    abilities: null,
  };
  const lines = b.split(/\r?\n/);
  for (let i = 0; i < lines.length - 2; i++) {
    if (/\|\s*STR\s*\|/i.test(lines[i]) && /DEX/i.test(lines[i])) {
      const heads = lines[i].split('|').map((x) => x.trim()).filter(Boolean);
      const vals = lines[i + 2].split('|').map((x) => x.trim()).filter(Boolean);
      s.abilities = {};
      heads.forEach((hd, j) => { const m = /(\d+)\s*\(([+\-−–]?\s*\d+)\)/.exec(vals[j] || '') || /(\d+)/.exec(vals[j] || ''); if (m) s.abilities[hd.toUpperCase()] = { score: +m[1], mod: m[2] != null ? +m[2].replace(/[−–]/, '-').replace(/\s/g, '') : Math.floor((+m[1] - 10) / 2) }; });
      break;
    }
  }
  const sb = statblockOf(n);
  if (sb) {
    s.hp ??= lead(sb.hp); s.ac ??= lead(sb.ac); s.cr ??= sb.cr ?? null; s.speed ??= sb.speed || null;
    const sc = statblockScores(sb);
    if (s.init == null && sc.dex != null) s.init = modOf(sc.dex);
    if (!s.abilities && Object.keys(sc).length) { s.abilities = {}; for (const k of ABIL) if (sc[k] != null) s.abilities[k.toUpperCase()] = { score: sc[k], mod: modOf(sc[k]) }; }
  }
  const dex = pick('dex', 'dexterity');
  if (s.init == null && s.abilities?.DEX) s.init = s.abilities.DEX.mod;
  if (s.init == null && dex != null) s.init = Math.floor((dex - 10) / 2);
  return s;
}
function linksOf(n) {
  const out = [];
  for (const [k, v] of Object.entries(n.fm)) for (const x of asList(Array.isArray(v) ? v : [v])) if (typeof x === 'string' && /^https?:\/\//.test(x)) out.push([k, x]);
  return out;
}
const linkLabel = (k, url) => /dndbeyond/i.test(url) ? 'D&D Beyond' : titleCase(k.replace(/_?(link|url)$/i, '') || 'Link');
function subtitleOf(n) {
  const fm = n.fm;
  const tc = (x) => (typeof x === 'string' ? titleCaseIfLower(x) : x);
  const parts = [tc(fm.race || fm.species), [tc(fm.class), fm.subclass ? `(${fm.subclass})` : null].filter(Boolean).join(' '), fm.level ? 'Level ' + fm.level : null, tc(fm.role), fm.player ? 'played by ' + fm.player : null].filter((x) => x && String(x).trim());
  return parts.join(' · ');
}
const titleCaseIfLower = (s) => (s === s.toLowerCase() ? s.replace(/\b\w/g, (c) => c.toUpperCase()) : s);
function hpPills(st) {
  return [st.hp != null && ['HP', st.hp], st.ac != null && ['AC', st.ac], st.pp != null && ['Passive Perc.', st.pp], st.init != null && ['Init', (st.init >= 0 ? '+' : '') + st.init], st.speed && ['Speed', st.speed], st.cr && ['CR', st.cr]].filter(Boolean)
    .map(([k, v]) => h('span', { class: 'pill', html: `${esc(k)} <b>${esc(v)}</b>` }));
}

/* ================================================================ scripts */
const BOOK_TYPES = new Set(['script', 'read-aloud', 'readaloud', 'session', 'adventure', 'one-shot', 'oneshot', 'module', 'scenario', 'encounter', 'scene', 'prompt-book']);
function isBookish(n) { return BOOK_TYPES.has(n.type) || (n.body.match(/^#{1,3}\s/gm) || []).length >= 3; }
function scriptItems() {
  const out = [];
  for (const n of S.notes.values()) {
    if (!visible(n)) continue;
    if (BOOK_TYPES.has(n.type)) { out.push({ n, whole: true }); continue; }
    for (const m of n.body.matchAll(/^>\s*\[!([\w-]+)\][+-]?[ \t]*(.*)$/gim)) {
      if (READ_CALLOUTS.has(m[1].toLowerCase())) out.push({ n, title: m[2].trim() || 'Read aloud', offset: m.index });
    }
  }
  return out;
}
function calloutBlockAt(body, offset) {
  const lines = body.slice(offset).split(/\r?\n/); const out = [];
  for (const l of lines) { if (!/^>/.test(l)) break; out.push(l); }
  return out.join('\n');
}

/* ================================================================ views */
function renderWelcome() {
  const hasFS = !!window.showDirectoryPicker;
  setView(h('div', { class: 'welcome' },
    h('h1', {}, 'Your table, one click away.'),
    h('p', { class: 'lead' }, 'Import an Obsidian vault and everything in it becomes a DM screen: linked notes, your party, music, ambience, sound effects, read-aloud scripts, roll tables, dice and an initiative tracker. Nothing leaves this computer.'),
    h('div', { class: 'cta' },
      h('button', { class: 'btn primary', onclick: importVault, html: icon('upload') + ' Import Obsidian vault' }),
      S.campaigns.length ? h('button', { class: 'btn', onclick: () => go('#/home') }, 'Back to ' + (S.campaign?.name || 'campaign')) : null),
    !hasFS ? h('p', { class: 'muted' }, 'Tip: in Edge or Chrome the dashboard remembers your vault folder, so “Re-import” is a single click. In this browser you’ll pick the folder again each time.') : null,
    h('div', { class: 'section-title' }, 'How it reads your vault', h('span', { class: 'line' })),
    h('table', {},
      h('tr', {}, h('th', {}, 'You write'), h('th', {}, 'The dashboard does')),
      [
        ['<code>[[Links]]</code>, <code>![[embeds]]</code>, tables, callouts', 'Renders them like Obsidian. Links open in tabs.'],
        ['<code>&gt; [!secret] DM only</code>', 'Shown to you, hidden when you turn on <b>Player view</b> (Ctrl+.) to share your screen. Notes with <code>dm_only: true</code> hide too.'],
        ['Notes in <code>Party/</code> or with <code>type: pc</code>', 'Party page with HP, AC, passive Perception and sheet links. One click adds them to combat.'],
        ['Audio in folders named <code>Music</code>, <code>Ambience</code> or <code>SFX</code>', 'Soundboard: music crossfades, ambience layers and loops, effects fire instantly. <code>![[storm.mp3]]</code> in a note becomes a play button.'],
        ['Notes in <code>Scripts/</code>, <code>type: script</code>, or <code>&gt; [!read-aloud]</code>', 'Scripts page and a full-screen “Present” mode with big text for reading aloud.'],
        ['Dice like <code>2d6+3</code>; tables whose first column is <code>d20</code>', 'Click to roll. Roll tables pick and highlight a row.'],
      ].map(([a, b]) => h('tr', {}, h('td', { html: a }), h('td', { html: b })))),
  ));
}

function renderHome() {
  const c = S.campaign;
  const notes = [...S.notes.values()].filter(visible);
  const hub = notes.find((n) => n.type === 'hub') || notes.find((n) => !n.folder && /(hub|home|index|dashboard|start here|overview)/i.test(n.name));
  const party = partyNotes();
  const threads = notes.filter((n) => n.type === 'thread' && !/^(done|resolved|closed|complete|completed|finished|dropped)$/i.test(String(n.fm.status || '')));
  const sessions = notes.filter((n) => n.type === 'session' && (n.fm.session !== undefined || /\d/.test(n.name)));
  const sessNum = (n) => +(n.fm.session || (/(\d+)/.exec(n.name) || [, 0])[1]) || 0;
  sessions.sort((a, b) => sessNum(b) - sessNum(a) || b.mtime - a.mtime);
  const recent = S.ui.recent.map((p) => S.notes.get(p)).filter(visible).slice(0, 8);
  const ago = (t) => { const d = (Date.now() - t) / 60000; return d < 60 ? Math.round(d) + ' min ago' : d < 1440 ? Math.round(d / 60) + ' h ago' : Math.round(d / 1440) + ' days ago'; };

  const wrap = h('div', { class: 'view-inner wide' },
    h('div', { class: 'note-head' },
      h('div', { style: { flex: 1 } }, h('h1', { class: 'page' }, c.name),
        h('div', { class: 'sub' }, `${S.notes.size} notes · ${soundsBy().length} sounds · imported ${ago(c.importedAt)}`)),
      h('div', { class: 'note-actions' },
        h('button', { class: 'btn', onclick: resync, html: icon('refresh') + ' Re-import vault', title: 'Pick up edits you made in Obsidian' }))));

  if (party.length) {
    wrap.append(sectionTitle('Party', h('a', { href: '#/party', class: 'muted', style: { fontSize: '12px', textTransform: 'none', letterSpacing: 0 } }, 'Open party page')));
    wrap.append(h('div', { class: 'grid' }, party.map((n) => partyCard(n, true))));
  }
  const cols = h('div', { class: 'grid', style: { gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', alignItems: 'start' } });
  if (threads.length) {
    cols.append(h('div', {}, sectionTitle('Active threads'), h('div', { style: { display: 'grid', gap: '8px' } }, threads.map((n) => {
      const q = (/\*\*Dramatic question:?\*\*:?\s*(.+)/i.exec(n.body) || [])[1];
      return h('div', { class: 'card click', onclick: () => openNote(n.path) }, h('h3', {}, n.name, n.dmOnly ? h('span', { class: 'badge-dm chip', style: { marginLeft: '6px', fontSize: '11px' } }, 'DM') : null), h('p', {}, (q || pitchOf(n)).replace(/\[\[([^\]|]+\|)?([^\]]+)\]\]/g, '$2').replace(/[*_]/g, '')));
    }))));
  }
  const side = h('div', {});
  if (sessions.length) {
    side.append(sectionTitle('Latest session'));
    const s = sessions[0];
    side.append(h('div', { class: 'card click', onclick: () => openNote(s.path) }, h('h3', {}, s.name), h('p', {}, pitchOf(s) || 'Open to prep or recap.')));
  }
  if (recent.length) {
    side.append(sectionTitle('Recently opened'));
    side.append(h('div', { class: 'pills' }, recent.map((n) => h('a', { class: 'pill', style: { cursor: 'pointer', textDecoration: 'none' }, onclick: () => openNote(n.path) }, n.name))));
  }
  const scripts = scriptItems();
  if (scripts.length || soundsBy().length) {
    side.append(sectionTitle('At the table'));
    side.append(h('div', { class: 'row-flex' },
      soundsBy().length ? h('a', { class: 'btn', href: '#/sounds', html: icon('music') + ` Soundboard (${soundsBy().length})` }) : null,
      scripts.length ? h('a', { class: 'btn', href: '#/scripts', html: icon('scroll') + ` Prompt book (${scripts.length})` }) : null,
      h('button', { class: 'btn', onclick: () => { S.settings.right = true; S.settings.rpTab = 'combat'; saveSettings(); renderChrome(); }, html: icon('swords') + ' Combat' })));
  }
  if (side.childNodes.length) cols.append(side);
  if (cols.childNodes.length) wrap.append(cols);
  if (hub) {
    wrap.append(sectionTitle(hub.name, h('a', { class: 'muted', style: { fontSize: '12px', textTransform: 'none', letterSpacing: 0, cursor: 'pointer' }, onclick: () => openNote(hub.path) }, 'Open note')));
    S.current = hub.path;
    wrap.append(h('div', { class: 'card', style: { padding: '18px 22px' } }, renderMarkdown(hub.body.replace(/^#\s+.+\r?\n/, ''))));
    S.current = null;
  } else if (!party.length && !threads.length) {
    wrap.append(sectionTitle('Notes'));
    wrap.append(folderCards(''));
  }
  setView(wrap);
  highlightTree();
}
function sectionTitle(text, extra) { return h('div', { class: 'section-title' }, text, h('span', { class: 'line' }), extra || null); }
function partyCard(n, compact) {
  const st = statsOf(n);
  const card = h('div', { class: 'card click', onclick: (e) => { if (!e.target.closest('a,button')) openNote(n.path); } },
    h('h3', {}, n.name), h('div', { class: 'meta' }, subtitleOf(n)),
    h('div', { class: 'pills' }, hpPills(st)));
  const links = linksOf(n);
  if (links.length) card.append(h('div', { class: 'row-flex', style: { marginTop: '10px' } }, links.map(([k, u]) => h('a', { class: 'btn small', href: u, target: '_blank', rel: 'noopener' }, linkLabel(k, u)))));
  if (!compact && st.abilities) {
    card.append(h('div', { class: 'pills' }, Object.entries(st.abilities).map(([k, v]) => h('span', { class: 'pill dice', 'data-roll': 'd20' + (v.mod >= 0 ? '+' : '') + v.mod, 'data-label': n.name + ' ' + k, title: `Roll ${k} check`, html: `${k} <b>${v.score}</b> (${v.mod >= 0 ? '+' : ''}${v.mod})` }))));
  }
  if (!compact) { const p = pitchOf(n); if (p) card.append(h('p', {}, p)); }
  return card;
}
function renderParty() {
  const party = partyNotes();
  const wrap = h('div', { class: 'view-inner wide' },
    h('div', { class: 'note-head' }, h('h1', { class: 'page' }, 'Party'),
      h('div', { class: 'note-actions' }, party.length ? h('button', { class: 'btn', onclick: () => { addPartyToCombat(); }, html: icon('swords') + ' Add party to combat' }) : null)),
    h('div', { class: 'sub' }, party.length ? 'Click an ability to roll a check. Stats come from each note’s properties or its stat lines.' : ''));
  if (!party.length) wrap.append(h('div', { class: 'empty' }, 'No player characters found. Put one note per character in a folder named “Party”, or add “type: pc” to their properties.'));
  else wrap.append(h('div', { class: 'grid', style: { gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' } }, party.map((n) => partyCard(n, false))));
  setView(wrap);
}
function folderCards(folder) {
  const notes = [...S.notes.values()].filter((n) => visible(n) && n.folder === folder);
  const sub = new Set();
  for (const n of S.notes.values()) if (visible(n) && n.folder.startsWith(folder ? folder + '/' : '') && n.folder !== folder) sub.add(n.folder.slice(folder ? folder.length + 1 : 0).split('/')[0]);
  const grid = h('div', { class: 'grid' });
  for (const d of [...sub].sort()) grid.append(h('div', { class: 'card click', onclick: () => go('#/folder/' + encodeURIComponent(folder ? folder + '/' + d : d)) }, h('h3', { html: icon('folder') + ' ' + esc(d) })));
  for (const n of notes) {
    const st = n.type === 'pc' || n.type === 'npc' || n.type === 'monster' ? statsOf(n) : null;
    grid.append(h('div', { class: 'card click', onclick: () => openNote(n.path) }, h('h3', {}, n.name),
      h('div', { class: 'meta' }, [n.type, n.fm.status, n.fm.role].filter((x) => x && typeof x !== 'object').join(' · ')),
      h('p', {}, pitchOf(n)), st ? h('div', { class: 'pills' }, hpPills(st)) : null));
  }
  if (!grid.childNodes.length) grid.append(h('div', { class: 'empty' }, 'Nothing here.'));
  return grid;
}
function renderFolder(folder) {
  const segs = folder.split('/');
  const crumbs = h('div', { class: 'crumbs' }, h('a', { href: '#/home' }, S.campaign.name), segs.slice(0, -1).map((s, i) => [' / ', h('a', { onclick: () => go('#/folder/' + encodeURIComponent(segs.slice(0, i + 1).join('/'))) }, s)]));
  const notes = [...S.notes.values()].filter((n) => visible(n) && n.folder === folder);
  // a folder whose notes carry a die property (d20: 3) is itself a roll table
  const dieKey = (() => { const counts = {}; for (const n of notes) for (const k of Object.keys(n.fm)) if (/^d\d+$/i.test(k)) counts[k] = (counts[k] || 0) + 1; const best = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]; return best && best[1] >= 2 ? best[0] : null; })();
  const actions = h('div', { class: 'note-actions' });
  if (dieKey) actions.append(h('button', { class: 'btn', html: icon('dice') + ` Roll ${dieKey}`, onclick: () => {
    const sides = +dieKey.slice(1); const n = rand(sides);
    const hit = notes.find((x) => { const v = String(x.fm[dieKey]); const m = /^(\d+)(?:\s*[-–]\s*(\d+))?/.exec(v); return m && n >= +m[1] && n <= +(m[2] || m[1]); });
    logRoll({ expr: dieKey, total: n, detail: hit ? hit.name : 'no match', label: segs.at(-1) });
    toast(`<span class="big">${n}</span>${esc(hit ? hit.name : 'no matching note')}`, 5000, true);
    if (hit) openNote(hit.path);
  } }));
  setView(h('div', { class: 'view-inner wide' }, crumbs, h('div', { class: 'note-head' }, h('h1', { class: 'page' }, segs.at(-1)), actions), h('div', { class: 'sub' }, `${notes.length} notes`), folderCards(folder)));
}
function renderSounds() {
  const all = soundsBy();
  const filter = h('input', { type: 'search', placeholder: 'Filter sounds', style: { minWidth: '200px' } });
  const vol = (ch, label) => h('label', {}, h('span', { class: 'snd ' + ch, style: { padding: '0 8px', cursor: 'default' } }, label),
    h('input', { type: 'range', min: 0, max: 1, step: 0.01, value: Audio_.vol(ch), oninput: (e) => Audio_.setVol(ch, +e.target.value) }));
  const loop = h('label', {}, h('input', { type: 'checkbox', checked: S.settings.loop !== false, onchange: (e) => { S.settings.loop = e.target.checked; saveSettings(); for (const t of Audio_.tracks.values()) if (t.ch === 'music') Audio_.setLoop(t.path, e.target.checked); } }), 'Loop music (off = play through the list)');
  const mixer = h('div', { class: 'mixer' }, vol('music', 'Music'), vol('ambience', 'Ambience'), vol('sfx', 'Effects'), loop, h('span', { style: { flex: 1 } }), filter,
    h('button', { class: 'btn danger', onclick: () => Audio_.stopAll(), html: icon('volx') + ' Stop all' }));
  const body = h('div');
  const draw = () => {
    const q = filter.value.trim().toLowerCase();
    const list = all.filter((f) => !q || f.path.toLowerCase().includes(q));
    body.innerHTML = '';
    if (!all.length) {
      body.append(h('div', { class: 'empty', html: 'No audio in this vault yet. Add files (mp3, ogg, wav, m4a, flac) to folders named <b>Music</b>, <b>Ambience</b> and <b>SFX</b> inside the vault, then press Re-import. Files elsewhere are sorted by size: long ones count as music, short ones as effects.' }));
      return;
    }
    const by = (ch) => list.filter((f) => channelOf(f.path) === ch);
    const group = (arr) => { const g = new Map(); for (const f of arr) { const d = dirName(f.path).split('/').pop() || 'Vault'; if (!g.has(d)) g.set(d, []); g.get(d).push(f); } return g; };
    const listCol = (ch, title, hint) => {
      const arr = by(ch); if (!arr.length) return null;
      const col = h('div', {}, sectionTitle(`${title} (${arr.length})`), h('div', { class: 'muted', style: { fontSize: '13px', margin: '-4px 0 8px' } }, hint));
      const lst = h('div', { class: 'snd-list' });
      for (const f of arr) {
        const row = h('div', { class: 'snd-item' + (Audio_.isPlaying(f.path) ? ' playing' : ''), 'data-sndi': f.path, onclick: () => Audio_.play(f.path) },
          h('span', { html: icon(ch === 'music' ? 'music' : 'wave') }), h('span', { class: 'nm' }, stripExt(baseName(f.path))), h('span', { class: 'fd' }, dirName(f.path).split('/').pop()));
        if (ch === 'ambience') row.append(h('input', { type: 'range', class: 'amb-vol', min: 0, max: 1, step: 0.01, value: store.get('tv:' + f.path, 1), title: 'Level for this loop', onclick: (e) => e.stopPropagation(), oninput: (e) => Audio_.setTrackVol(f.path, +e.target.value) }));
        lst.append(row);
      }
      col.append(lst); return col;
    };
    body.append(h('div', { class: 'snd-cols' }, listCol('music', 'Music', 'One track at a time; switching crossfades. Click the playing track to fade out.'), listCol('ambience', 'Ambience', 'Loops that layer on top of the music. Click to toggle.')));
    const fx = by('sfx');
    if (fx.length) {
      body.append(sectionTitle(`Sound effects (${fx.length})`));
      for (const [d, arr] of group(fx)) {
        if (group(fx).size > 1) body.append(h('div', { class: 'muted', style: { margin: '10px 0 6px', fontSize: '13px' } }, d));
        body.append(h('div', { class: 'sfx-grid' }, arr.map((f) => h('button', { class: 'sfx-btn', 'data-sndi': f.path, title: f.path, onclick: () => Audio_.playSfx(f.path) }, stripExt(baseName(f.path))))));
      }
    }
  };
  filter.addEventListener('input', draw);
  draw();
  setView(h('div', { class: 'view-inner wide' }, h('h1', { class: 'page' }, 'Sounds'), h('div', { class: 'sub' }, 'Everything here also plays from inside notes, and from search (Ctrl+K).'), mixer, body));
}
function renderScripts() {
  const items = scriptItems();
  const wrap = h('div', { class: 'view-inner' }, h('h1', { class: 'page' }, 'Prompt book'), h('div', { class: 'sub' }, 'Run a session or script section by section: names open beside the text, sound cues play where you wrote them. Present shows read-aloud text full screen.'));
  if (!items.length) wrap.append(h('div', { class: 'empty', html: 'Nothing to run yet. Put session plans or adventures in <b>Sessions</b>, <b>Scripts</b> or <b>Adventures</b> folders (or give them <code>type: session</code>, <code>script</code> or <code>adventure</code>), with a <code>## heading</code> per scene. Read-aloud callouts work in any note:<br><br><code>&gt; [!read-aloud] Arriving at the docks</code><br><code>&gt; The smell of salt and rot…</code>' }));
  const byNote = new Map();
  for (const it of items) { if (!byNote.has(it.n.path)) byNote.set(it.n.path, []); byNote.get(it.n.path).push(it); }
  for (const [p, arr] of byNote) {
    const n = S.notes.get(p);
    const card = h('div', { class: 'card', style: { marginBottom: '12px' } }, h('div', { class: 'row-flex' }, h('h3', { style: { flex: 1, margin: 0 } }, h('a', { class: 'wl', 'data-path': p }, n.name)), h('span', { class: 'meta' }, n.folder)));
    for (const it of arr) {
      if (it.whole) {
        card.append(h('p', {}, pitchOf(n)), h('div', { class: 'row-flex', style: { marginTop: '8px' } },
          h('button', { class: 'btn primary small', onclick: () => runBook(p), html: icon('play') + ' Run as prompt book' }),
          h('button', { class: 'btn small', onclick: () => presentNote(p), html: icon('expand') + ' Present' }), soundButtonsFor(n)));
      } else {
        const block = calloutBlockAt(n.body, it.offset);
        card.append(h('div', { class: 'row-flex', style: { marginTop: '8px' } }, h('span', { style: { flex: 1 } }, it.title),
          h('button', { class: 'btn small', onclick: () => { const md = renderMarkdown(block); const content = $('.callout-content', md) || md; present(content, it.title); }, html: icon('expand') + ' Present' })));
      }
    }
    wrap.append(card);
  }
  setView(wrap);
}
const SOUND_KEYS = /^(music|song|songs|theme|ambience|ambient|atmosphere|sfx|sound|sounds|audio|soundtrack|playlist)$/i;
function soundButtonsFor(n) {
  const out = [];
  for (const [k, v] of Object.entries(n.fm)) {
    if (!SOUND_KEYS.test(k)) continue;
    for (const x of asList(Array.isArray(v) ? v : [v])) {
      const m = /\[\[([^\]]+)\]\]/.exec(String(x)); const p = resolve(m ? splitTarget(m[1]).file : String(x));
      if (p && kindOf(p) === 'audio') { const s = h('span', { html: soundChipHtml(p) }).firstChild; out.push(s); }
    }
  }
  return out;
}
function propValue(v) {
  const span = h('span', { class: 'v' });
  const one = (x) => {
    if (typeof x === 'string' && /\[\[/.test(x)) return h('span', { html: preprocess(esc(x).replace(/&quot;/g, '"')) });
    if (typeof x === 'string' && /^https?:\/\//.test(x)) return h('a', { href: x, target: '_blank', rel: 'noopener' }, /dndbeyond/.test(x) ? 'D&D Beyond' : x.replace(/^https?:\/\/(www\.)?/, '').slice(0, 40));
    return document.createTextNode(String(x));
  };
  const arr = Array.isArray(v) ? v : [v];
  arr.forEach((x, i) => { if (i) span.append(', '); span.append(one(x)); });
  return span;
}
function renderNoteView(path, anchor) {
  const n = S.notes.get(path);
  if (!n) { setView(h('div', { class: 'view-inner' }, h('div', { class: 'empty' }, 'That note isn’t in this vault anymore. Try Re-import.'))); renderTabs(); return; }
  S.current = path;
  if (!S.ui.tabs.includes(path)) { S.ui.tabs.push(path); if (S.ui.tabs.length > 10) S.ui.tabs.shift(); }
  S.ui.recent = [path, ...S.ui.recent.filter((p) => p !== path)].slice(0, 20);
  saveUI(); renderTabs(); highlightTree();
  if (!visible(n)) { setView(h('div', { class: 'view-inner' }, h('h1', { class: 'page' }, n.name), h('div', { class: 'empty' }, 'This note is DM only. Turn off Player view (Ctrl+.) to see it.'))); return; }

  const segs = n.folder ? n.folder.split('/') : [];
  const crumbs = h('div', { class: 'crumbs' }, h('a', { href: '#/home' }, S.campaign.name), segs.map((s, i) => [' / ', h('a', { onclick: () => go('#/folder/' + encodeURIComponent(segs.slice(0, i + 1).join('/'))) }, s)]));
  const pinned = S.ui.pinned.includes(path);
  const st = ['pc', 'npc', 'monster', 'creature', 'villain', 'merchant'].includes(n.type) ? statsOf(n) : null;
  const actions = h('div', { class: 'note-actions' },
    soundButtonsFor(n),
    isBookish(n) ? h('button', { class: 'btn primary', title: 'Section-by-section view with names opening beside the text', onclick: () => runBook(path), html: icon('play') + ' Run as prompt book' }) : null,
    n.type === 'script' ? h('button', { class: 'btn', onclick: () => presentNote(path), html: icon('expand') + ' Present' }) : null,
    st && (st.hp != null || st.ac != null) ? h('button', { class: 'btn', title: 'Add to the initiative tracker', onclick: () => addToCombat(n), html: icon('swords') + ' Add to combat' }) : null,
    h('button', { class: 'btn icon' + (pinned ? ' on' : ''), title: pinned ? 'Unpin' : 'Pin to the top of the sidebar', html: icon('pin'), onclick: () => { S.ui.pinned = pinned ? S.ui.pinned.filter((p) => p !== path) : [...S.ui.pinned, path]; saveUI(); renderTree(); renderNoteView(path); } }));

  const hide = new Set(['tags', 'aliases', 'alias', 'cssclasses', 'cssclass', 'publish', 'position']);
  const props = Object.entries(n.fm).filter(([k, v]) => !hide.has(k) && v !== '' && !(Array.isArray(v) && !v.length) && !(S.playerSafe && /dm|secret/i.test(k)));
  const propsEl = props.length || n.tags.length ? h('div', { class: 'props' },
    props.map(([k, v]) => h('div', { class: 'p' }, h('span', { class: 'k' }, k.replace(/_/g, ' ')), propValue(v))),
    n.tags.length ? h('div', { class: 'p' }, h('span', { class: 'k' }, 'tags'), h('span', { class: 'v' }, [...new Set(n.tags)].map((t) => '#' + t).join(' '))) : null) : null;

  let body = n.body;
  const h1 = /^\s*#\s+(.+)\r?\n/.exec(body);
  if (h1) body = body.slice(h1[0].length);
  const md = renderMarkdown(body);
  const back = [...(S.backlinks.get(path) || [])].map((p) => S.notes.get(p)).filter(visible);
  const backEl = back.length ? h('div', { class: 'backlinks' }, h('div', { class: 'section-title', style: { marginTop: 0 } }, `Linked from (${back.length})`, h('span', { class: 'line' })),
    h('div', { class: 'pills' }, back.map((b) => h('a', { class: 'pill', onclick: () => openNote(b.path) }, b.name)))) : null;
  const wrap = h('div', { class: 'view-inner' }, crumbs,
    h('div', { class: 'note-head' }, h('h1', { class: 'page' }, h1 ? h1[1].replace(/[*_]/g, '') : n.name), actions),
    st && (st.hp != null || st.ac != null) ? h('div', { class: 'pills', style: { marginBottom: '8px' } }, hpPills(st)) : null,
    propsEl, md, backEl);
  setView(wrap);
  if (anchor) { const t = document.getElementById('h-' + slug(anchor)); if (t) setTimeout(() => t.scrollIntoView({ block: 'start' }), 0); }
  Audio_.changed();
}

/* ================================================================ prompt book */
function runBook(path) {
  if (!S.ui.books.includes(path)) { S.ui.books.push(path); saveUI(); }
  go('#/book/' + encodeURIComponent(path));
}
function exitBook(path) {
  S.ui.books = S.ui.books.filter((p) => p !== path); saveUI();
  go('#/note/' + encodeURIComponent(path));
}
function partyStrip() {
  const party = partyNotes();
  if (!party.length) return null;
  return h('div', { class: 'party-strip' }, party.map((n) => {
    const st = statsOf(n);
    const initials = n.name.split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();
    const cls = [titleCaseIfLower(String(n.fm.class || '')), n.fm.level ? 'level ' + n.fm.level : ''].filter(Boolean).join(', ');
    return h('button', { class: 'ps-card', title: 'Show ' + n.name, onclick: () => peek(n.path) },
      h('div', { class: 'ps-top' }, h('span', { class: 'ps-av' }, initials), h('div', { style: { minWidth: 0 } }, h('div', { class: 'ps-name' }, n.name), cls ? h('div', { class: 'ps-cls' }, cls) : null)),
      h('div', { class: 'ps-stats', html: [st.ac != null && `${icon('shield')}${st.ac}`, st.hp != null && `${icon('heart')}${st.hp}`, st.pp != null && `${icon('eye')}${st.pp}`].filter(Boolean).map((x) => `<span>${x}</span>`).join('') }));
  }));
}
function renderBook(path, anchor) {
  const n = S.notes.get(path);
  if (!n) { setView(h('div', { class: 'view-inner' }, h('div', { class: 'empty' }, 'That note isn’t in this vault anymore. Try Re-import.'))); return; }
  S.current = path;
  if (!S.ui.tabs.includes(path)) { S.ui.tabs.push(path); if (S.ui.tabs.length > 10) S.ui.tabs.shift(); }
  if (!S.ui.books.includes(path)) S.ui.books.push(path);
  S.ui.recent = [path, ...S.ui.recent.filter((p) => p !== path)].slice(0, 20);
  saveUI(); renderTabs(); highlightTree();
  if (!visible(n)) { setView(h('div', { class: 'view-inner' }, h('div', { class: 'empty' }, 'This note is DM only. Turn off Player view (Ctrl+.) to see it.'))); return; }
  let body = n.body; const h1 = /^\s*#\s+(.+)\r?\n/.exec(body); if (h1) body = body.slice(h1[0].length);
  const md = renderMarkdown(body);
  let heads = $$(':scope > h1, :scope > h2', md);
  if (heads.length < 2) heads = $$(':scope > h1, :scope > h2, :scope > h3', md);
  const nav = h('nav', { class: 'book-nav' }, h('div', { class: 'muted', style: { fontSize: '12px', padding: '0 10px 6px', textTransform: 'uppercase', letterSpacing: '.08em' } }, 'Sections'));
  const items = new Map();
  heads.forEach((hd, idx) => {
    // images that sit in this section show as thumbnails under the active item, like the old prompt book
    const imgs = []; let el = hd.nextElementSibling;
    while (el && !heads.includes(el)) { imgs.push(...(el.tagName === 'IMG' ? [el] : $$('img', el))); el = el.nextElementSibling; }
    const it = h('div', { class: 'bn-item' },
      h('button', { class: 'bn-btn', onclick: () => { hd.scrollIntoView({ behavior: 'smooth', block: 'start' }); setActive(hd); } }, hd.textContent),
      imgs.length ? h('div', { class: 'bn-thumbs' }, imgs.map((im) => h('img', { src: im.src, alt: im.alt, onclick: () => overlay(h('div', { class: 'lightbox' }, h('img', { src: im.src, alt: im.alt }), h('div', { class: 'muted' }, im.alt))) }))) : null);
    items.set(hd, it); nav.append(it);
  });
  const setActive = (hd) => { for (const [k, v] of items) v.classList.toggle('active', k === hd); };
  if (heads[0]) setActive(heads[0]);
  const actions = h('div', { class: 'note-actions' },
    soundButtonsFor(n),
    h('button', { class: 'btn', onclick: () => presentNote(path), html: icon('expand') + ' Present' }),
    h('button', { class: 'btn', title: 'Back to the normal note view', onclick: () => exitBook(path), html: icon('note') + ' Note view' }));
  const segs = n.folder ? n.folder.split('/') : [];
  const wrap = h('div', { class: 'view-inner wide book' },
    h('div', { class: 'crumbs' }, h('a', { href: '#/scripts' }, 'Prompt book'), segs.length ? ' / ' + segs.join(' / ') : ''),
    h('div', { class: 'note-head' }, h('h1', { class: 'page' }, h1 ? h1[1].replace(/[*_]/g, '') : n.name), actions),
    partyStrip(),
    h('div', { class: 'book-grid' + (heads.length ? '' : ' no-nav') }, heads.length ? nav : null, h('article', { class: 'book-body' }, md)));
  setView(wrap);
  if (heads.length && 'IntersectionObserver' in window) {
    const seen = new Set();
    S.bookObs = new IntersectionObserver((entries) => {
      for (const e of entries) e.isIntersecting ? seen.add(e.target) : seen.delete(e.target);
      const top = heads.find((hd) => seen.has(hd));
      if (top) setActive(top);
    }, { root: $('#view'), rootMargin: '0px 0px -65% 0px', threshold: 0 });
    heads.forEach((hd) => S.bookObs.observe(hd));
  }
  if (anchor) { const t = document.getElementById('h-' + slug(anchor)); if (t) setTimeout(() => t.scrollIntoView({ block: 'start' }), 0); }
  if (S.settings.right && !['peek', 'sound'].includes(S.settings.rpTab) && !combat().list.length) { S.settings.rpTab = 'peek'; saveSettings(); renderRight(); }
  Audio_.changed();
}

/* ================================================================ right panel */
const CONDITIONS = ['Blinded', 'Charmed', 'Concentrating', 'Deafened', 'Exhaustion', 'Frightened', 'Grappled', 'Incapacitated', 'Invisible', 'Paralyzed', 'Petrified', 'Poisoned', 'Prone', 'Restrained', 'Stunned', 'Unconscious', 'Blessed', 'Hasted', 'Hexed', 'Marked'];
function renderRight() {
  const tabs = $('#rpTabs'); const body = $('#rpBody');
  tabs.innerHTML = ''; body.innerHTML = '';
  if (!S.cid) return;
  for (const [k, ic, label] of [['peek', 'book', 'Note'], ['combat', 'swords', 'Combat'], ['sound', 'music', 'Sound'], ['dice', 'dice', 'Dice'], ['notes', 'note', 'Notes']]) {
    const on = S.settings.rpTab === k;
    const badge = k === 'sound' && Audio_.tracks.size ? `<span class="rp-badge">${Audio_.tracks.size}</span>` : '';
    tabs.append(h('button', { class: on ? 'active' : '', title: label, onclick: () => openRight(k), html: icon(ic) + (on ? `<span>${label}</span>` : '') + badge }));
  }
  const t = S.settings.rpTab;
  if (t === 'peek') return renderPeek(body);
  if (t === 'sound') return renderMixer(body);
  if (t === 'dice') return renderDice(body);
  if (t === 'notes') return renderScratch(body);
  return renderCombat(body);
}
function openRight(tab) {
  S.settings.rpTab = tab; S.settings.right = true; saveSettings();
  if (window.matchMedia('(max-width: 820px)').matches) document.body.classList.add('show-right');
  document.body.classList.remove('no-right'); $('#btnRight').classList.add('on');
  renderRight();
}
function peek(path) {
  if (!S.notes.has(path)) return;
  S.peek = path;
  S.peekHistory = [path, ...(S.peekHistory || []).filter((p) => p !== path)].slice(0, 12);
  openRight('peek');
  $('#rpBody').scrollTop = 0;
}
function renderPeek(body) {
  const n = S.notes.get(S.peek);
  if (!n || !visible(n)) {
    body.append(h('div', { class: 'empty', style: { padding: '16px' } }, 'In a prompt book, clicking a name, place or item shows its note here without losing your place.'));
    return;
  }
  const st = statsOf(n);
  const hasStats = st.hp != null || st.ac != null;
  const head = h('div', { class: 'peek-head' },
    h('div', { style: { flex: 1, minWidth: 0 } }, h('div', { class: 'peek-title' }, n.name), h('div', { class: 'meta muted', style: { fontSize: '12px' } }, [n.type, n.folder].filter(Boolean).join(' · '))),
    h('button', { class: 'btn small', title: 'Open as a full page', onclick: () => openNote(n.path), html: icon('expand') }));
  body.append(head);
  const acts = h('div', { class: 'row-flex', style: { margin: '6px 0 10px' } }, soundButtonsFor(n), hasStats ? h('button', { class: 'btn small', onclick: () => addToCombat(n), html: icon('swords') + ' Add to combat' }) : null);
  if (acts.childNodes.length) body.append(acts);
  if (hasStats && !hasStatblock(n)) body.append(h('div', { class: 'pills', style: { margin: '0 0 10px' } }, hpPills(st)));
  let md = n.body.replace(/^\s*#\s+.+\r?\n/, '');
  const el = renderMarkdown(md); el.classList.add('peek-md');
  body.append(el);
  const others = (S.peekHistory || []).filter((p) => p !== n.path).map((p) => S.notes.get(p)).filter(visible).slice(0, 6);
  if (others.length) body.append(h('div', { class: 'section-title' }, 'Recently peeked', h('span', { class: 'line' })), h('div', { class: 'pills' }, others.map((o) => h('a', { class: 'pill', style: { cursor: 'pointer' }, onclick: () => peek(o.path) }, o.name))));
}
function renderMixer(body) {
  const vol = (ch, label) => h('label', { class: 'mix-ch' }, h('span', { class: 'snd ' + ch, style: { cursor: 'default' } }, label),
    h('input', { type: 'range', min: 0, max: 1, step: 0.01, value: Audio_.vol(ch), oninput: (e) => Audio_.setVol(ch, +e.target.value) }));
  body.append(h('div', { class: 'mix-chs' }, vol('music', 'Music'), vol('ambience', 'Ambience'), vol('sfx', 'Effects')));
  body.append(h('div', { class: 'row-flex', style: { margin: '12px 0 8px' } }, h('span', { class: 'muted', style: { flex: 1, fontSize: '13px' } }, 'Now playing'),
    Audio_.tracks.size ? h('button', { class: 'btn small danger', onclick: () => Audio_.stopAll(), html: icon('volx') + ' Stop all' }) : null));
  if (!Audio_.tracks.size) { body.append(h('div', { class: 'empty', style: { padding: '16px' } }, 'Nothing playing. Click a sound in a note, on the Sounds page, or search for one with Ctrl+K.')); return; }
  for (const t of Audio_.tracks.values()) {
    body.append(h('div', { class: 'np-track ' + t.ch },
      h('div', { class: 'row-flex', style: { flexWrap: 'nowrap' } },
        h('span', { class: 'np-t', title: t.path }, stripExt(baseName(t.path))), h('span', { class: 'muted', style: { fontSize: '11px' } }, t.ch === 'sfx' ? 'effect' : t.ch),
        h('button', { class: 'btn small icon', title: 'Stop', html: icon('x'), onclick: () => Audio_.stop(t.path) })),
      h('div', { class: 'row-flex', style: { flexWrap: 'nowrap', marginTop: '6px' } },
        h('button', { class: 'btn small icon', title: t.paused ? 'Resume' : 'Pause', html: icon(t.paused ? 'play' : 'pause'), onclick: () => (t.paused ? Audio_.resume(t.path) : Audio_.pause(t.path)) }),
        h('input', { type: 'range', min: 0, max: 1, step: 0.01, value: t.vol, style: { flex: 1, minWidth: 0 }, title: 'Volume for this track', oninput: (e) => Audio_.setTrackVol(t.path, +e.target.value) }),
        h('button', { class: 'btn small icon' + (t.loop ? ' on' : ''), title: t.loop ? 'Looping (click to play once)' : 'Play once (click to loop)', html: icon('repeat'), onclick: () => Audio_.setLoop(t.path, !t.loop) }))));
  }
}
function combat() { return S.ui.combat; }
function sortCombat() {
  const c = combat();
  c.list.sort((a, b) => (b.init ?? -999) - (a.init ?? -999) || (b.bonus ?? 0) - (a.bonus ?? 0) || a.name.localeCompare(b.name));
}
function addCombatant(o) {
  const c = combat();
  c.list.push({ id: Math.random().toString(36).slice(2, 9), conds: [], ...o });
  sortCombat(); if (!c.turn && c.list.length) c.turn = null;
  saveUI(); S.settings.right = true; S.settings.rpTab = 'combat'; saveSettings(); renderChrome();
}
function addToCombat(n) {
  const st = statsOf(n);
  const isPc = n.type === 'pc';
  const twins = combat().list.filter((x) => x.notePath === n.path);
  const same = twins.length;
  if (!isPc && same === 1 && twins[0].name === n.name) twins[0].name = n.name + ' 1';
  addCombatant({ name: n.name + (!isPc && same ? ' ' + (same + 1) : ''), notePath: n.path, hp: st.hp, maxHp: st.hp, ac: st.ac, bonus: st.init ?? 0, init: isPc ? null : rand(20) + (st.init ?? 0), pc: isPc });
  toast(`${n.name} added to combat`);
}
function addPartyToCombat() {
  const have = new Set(combat().list.map((x) => x.notePath));
  const party = partyNotes().filter((n) => !have.has(n.path));
  for (const n of party) { const st = statsOf(n); combat().list.push({ id: Math.random().toString(36).slice(2, 9), conds: [], name: n.name, notePath: n.path, hp: st.hp, maxHp: st.hp, ac: st.ac, bonus: st.init ?? 0, init: null, pc: true }); }
  sortCombat(); saveUI(); S.settings.right = true; S.settings.rpTab = 'combat'; saveSettings(); renderChrome();
  toast(party.length ? `Added ${party.length} party members. Type in their initiative rolls.` : 'The party is already in combat.');
}
function nextTurn(dir = 1) {
  const c = combat(); if (!c.list.length) return;
  let i = c.list.findIndex((x) => x.id === c.turn);
  if (i < 0) { c.turn = c.list[0].id; c.round = c.round || 1; }
  else {
    i += dir;
    if (i >= c.list.length) { i = 0; c.round++; }
    if (i < 0) { i = c.list.length - 1; c.round = Math.max(1, c.round - 1); }
    c.turn = c.list[i].id;
  }
  saveUI(); renderRight();
  const cur = c.list.find((x) => x.id === c.turn);
  if (cur) toast(`Round ${c.round}: <b>${esc(cur.name)}</b>’s turn`, 2000, true);
}
function renderCombat(body) {
  const c = combat();
  body.append(h('div', { class: 'cmb-head' }, h('span', { class: 'round' }, c.turn ? `Round ${c.round}` : 'Not started'),
    c.list.length > 1 ? h('button', { class: 'btn small', title: 'Sort by initiative', onclick: () => { sortCombat(); saveUI(); renderRight(); } }, 'Sort') : null,
    h('button', { class: 'btn small', title: 'Previous turn', onclick: () => nextTurn(-1) }, '◀'),
    h('button', { class: 'btn small primary', title: 'Next turn (N)', onclick: () => nextTurn(1) }, c.turn ? 'Next turn ▶' : 'Start ▶')));
  const list = h('div', { class: 'cmb-list' });
  for (const x of c.list) {
    const pct = x.maxHp ? Math.max(0, Math.min(1, x.hp / x.maxHp)) : 1;
    const hpIn = h('input', { type: 'number', class: 'hpin', placeholder: 'amt', title: 'Amount' });
    const apply = (sign) => { const v = +hpIn.value; if (!v) return; x.hp = Math.max(0, Math.min(x.maxHp ?? Infinity, (x.hp ?? 0) + sign * v)); if (x.hp == null) x.hp = 0; saveUI(); renderRight(); };
    hpIn.addEventListener('keydown', (e) => { if (e.key === 'Enter') apply(e.shiftKey ? 1 : -1); });
    const condSel = h('select', { class: 'btn small', style: { padding: '1px 4px' }, onchange: (e) => { if (e.target.value) { x.conds.push(e.target.value); saveUI(); renderRight(); } } }, h('option', { value: '' }, '+ cond'), CONDITIONS.filter((k) => !x.conds.includes(k)).map((k) => h('option', { value: k }, k)));
    const row = h('div', { class: 'cmb' + (x.id === c.turn ? ' active' : '') + (x.maxHp && x.hp <= 0 ? ' down' : ''), draggable: 'true',
      ondragstart: (e) => { S.drag = x.id; e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', x.id); row.classList.add('dragging'); },
      ondragend: () => row.classList.remove('dragging'),
      ondragover: (e) => { e.preventDefault(); row.classList.add('drop'); },
      ondragleave: () => row.classList.remove('drop'),
      ondrop: (e) => { e.preventDefault(); const from = c.list.findIndex((y) => y.id === S.drag); const to = c.list.indexOf(x); if (from >= 0 && from !== to) { const [m] = c.list.splice(from, 1); c.list.splice(to, 0, m); saveUI(); } S.drag = null; renderRight(); } },
      h('div', { class: 'cmb-top' },
        h('span', { class: 'grip', title: 'Drag to reorder', html: icon('grip') }),
        h('input', { type: 'number', class: 'cmb-init', value: x.init ?? '', placeholder: '–', title: 'Initiative', onchange: (e) => { x.init = e.target.value === '' ? null : +e.target.value; sortCombat(); saveUI(); renderRight(); } }),
        h('span', { class: 'cmb-name' + (x.notePath ? ' link' : ''), title: x.notePath ? 'Show note' : x.name, onclick: () => x.notePath && peek(x.notePath) }, x.name),
        x.id !== c.turn ? h('button', { class: 'btn small icon', title: 'Make it this one’s turn', html: icon('play'), onclick: () => { c.turn = x.id; saveUI(); renderRight(); } }) : null,
        x.ac != null ? h('span', { class: 'cmb-ac', title: 'Armor Class' }, 'AC ' + x.ac) : null,
        h('button', { class: 'btn small icon', title: 'Remove', html: icon('x'), onclick: () => { c.list = c.list.filter((y) => y !== x); if (c.turn === x.id) c.turn = null; saveUI(); renderRight(); } })),
      h('div', { class: 'cmb-bot' },
        x.maxHp != null ? [h('div', { class: 'hpbar' + (pct <= 0.25 ? ' crit' : pct <= 0.5 ? ' low' : '') }, h('div', { style: { width: pct * 100 + '%' } })), h('span', { class: 'hptxt' }, `${x.hp}/${x.maxHp}`),
          hpIn, h('button', { class: 'btn small', title: 'Damage (Enter)', onclick: () => apply(-1) }, '−'), h('button', { class: 'btn small', title: 'Heal (Shift+Enter)', onclick: () => apply(1) }, '+')] : h('span', { class: 'muted', style: { fontSize: '12px', flex: 1 } }, 'No HP tracked'),
        condSel),
      x.conds.length ? h('div', { class: 'cmb-bot' }, x.conds.map((k) => h('span', { class: 'cond', title: 'Click to remove', onclick: () => { x.conds = x.conds.filter((y) => y !== k); saveUI(); renderRight(); } }, k + ' ×'))) : null);
    list.append(row);
  }
  if (!c.list.length) list.append(h('div', { class: 'empty', style: { padding: '16px' } }, 'No one in combat. Add the party, or open an NPC note and press “Add to combat”.'));
  body.append(list);
  const f = { name: h('input', { type: 'text', placeholder: 'Name (e.g. Goblin)', class: 'full' }), bonus: h('input', { type: 'number', placeholder: 'Init +' }), hp: h('input', { type: 'text', placeholder: 'HP or 2d8+2' }), ac: h('input', { type: 'number', placeholder: 'AC' }), count: h('input', { type: 'number', placeholder: 'How many', min: 1, value: '' }) };
  const add = () => {
    const name = f.name.value.trim(); if (!name) { f.name.focus(); return; }
    const count = Math.max(1, Math.min(30, +f.count.value || 1));
    const bonus = +f.bonus.value || 0;
    for (let i = 1; i <= count; i++) {
      let hp = f.hp.value.trim(); hp = hp === '' ? null : /d/i.test(hp) ? (rollExpr(hp)?.total ?? null) : +hp;
      combat().list.push({ id: Math.random().toString(36).slice(2, 9), conds: [], name: count > 1 ? `${name} ${i}` : name, hp, maxHp: hp, ac: f.ac.value === '' ? null : +f.ac.value, bonus, init: rand(20) + bonus });
    }
    sortCombat(); saveUI(); renderRight();
  };
  f.name.addEventListener('keydown', (e) => { if (e.key === 'Enter') add(); });
  body.append(h('div', { class: 'add-form' }, f.name, f.bonus, f.hp, f.ac, f.count, h('button', { class: 'btn primary', onclick: add }, 'Add + roll init'),
    h('button', { class: 'btn full', onclick: addPartyToCombat, html: icon('users') + ' Add party' }),
    h('button', { class: 'btn full danger', onclick: () => { if (!c.list.length || confirm('Clear the initiative tracker?')) { S.ui.combat = { round: 1, turn: null, list: [] }; saveUI(); renderRight(); } }, html: icon('trash') + ' End combat' })));
}
function renderDice(body) {
  let mode = null;
  const modeBtns = h('div', { class: 'row-flex', style: { marginBottom: '8px' } });
  const drawModes = () => { modeBtns.innerHTML = ''; for (const [m, l] of [[null, 'Normal'], ['adv', 'Advantage'], ['dis', 'Disadvantage']]) modeBtns.append(h('button', { class: 'btn small' + (mode === m ? ' on' : ''), onclick: () => { mode = m; drawModes(); } }, l)); };
  drawModes();
  const grid = h('div', { class: 'dice-grid' }, [4, 6, 8, 10, 12, 20, 100].map((d) => h('button', { class: 'btn', onclick: () => roll('d' + d, null, d === 20 ? mode : null) }, 'd' + d)),
    h('button', { class: 'btn', title: 'Ability scores: 4d6 drop lowest, six times', onclick: () => { const r = Array.from({ length: 6 }, () => rollExpr('4d6kh3').total); logRoll({ expr: '6 × 4d6kh3', total: r.reduce((a, b) => a + b, 0), detail: r.join(', '), label: 'Stats' }); toast('<span class="big">' + r.join(' · ') + '</span>', 6000, true); } }, 'Stats'));
  const input = h('input', { type: 'text', placeholder: '2d6+3, 4d6kh3, d20+5', style: { flex: 1, minWidth: 0 } });
  const go2 = () => { const v = input.value.trim(); if (v) roll(v, null, mode); };
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') go2(); });
  body.append(modeBtns, grid, h('div', { class: 'row-flex', style: { marginTop: '8px', flexWrap: 'nowrap' } }, input, h('button', { class: 'btn primary', onclick: go2 }, 'Roll')));
  const log = h('div', { class: 'dice-log' });
  for (const e of S.ui.log) log.append(h('div', { class: 'dl' + (e.crit ? ' crit' : e.fumble ? ' fumble' : '') }, h('span', { class: 'tot' }, e.total), h('div', {}, h('div', { class: 'lbl' }, (e.label ? e.label + ' · ' : '') + e.expr), h('div', { class: 'det' }, e.detail))));
  if (S.ui.log.length) body.append(h('div', { class: 'row-flex', style: { marginTop: '14px' } }, h('span', { class: 'muted', style: { flex: 1, fontSize: '13px' } }, 'History'), h('button', { class: 'btn small', onclick: () => { S.ui.log = []; saveUI(); renderRight(); } }, 'Clear')));
  body.append(log);
}
function renderScratch(body) {
  const ta = h('textarea', { class: 'scratch', placeholder: 'Quick notes during the session: names you made up, what the party promised, loot handed out… Saved automatically. Copy into your session note afterwards.' });
  ta.value = S.ui.scratch || '';
  ta.addEventListener('input', () => { S.ui.scratch = ta.value; saveUI(); });
  body.append(h('div', { class: 'row-flex', style: { marginBottom: '8px' } },
    h('button', { class: 'btn small', onclick: () => { const t = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); const pos = ta.selectionStart ?? ta.value.length; ta.setRangeText((pos && ta.value[pos - 1] !== '\n' ? '\n' : '') + `- ${t} `, pos, pos, 'end'); ta.focus(); S.ui.scratch = ta.value; saveUI(); } }, '+ Timestamp'),
    h('button', { class: 'btn small', onclick: async () => { try { await navigator.clipboard.writeText(ta.value); toast('Copied. Paste it into your session note in Obsidian.'); } catch { ta.select(); document.execCommand('copy'); toast('Copied.'); } }, html: icon('copy') + ' Copy' }),
    h('button', { class: 'btn small danger', onclick: () => { if (confirm('Clear table notes?')) { ta.value = ''; S.ui.scratch = ''; saveUI(); } } }, 'Clear')), ta);
}

/* ================================================================ events */
function bind() {
  $('#btnSearch').innerHTML = icon('search') + '<span class="lbl">Search notes, sounds…</span><kbd>Ctrl K</kbd>';
  $('#btnSearch').onclick = () => S.cid && openSwitcher();
  $('#btnStopAll').innerHTML = icon('volx');
  $('#btnStopAll').onclick = () => Audio_.stopAll();
  $('#btnPlayer').onclick = togglePlayer;
  $('#btnTheme').onclick = () => { S.settings.theme = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light'; saveSettings(); renderChrome(); };
  $('#btnRight').innerHTML = icon('panel');
  $('#btnRight').onclick = () => { if (window.matchMedia('(max-width: 820px)').matches) { document.body.classList.toggle('show-right'); return; } S.settings.right = !S.settings.right; saveSettings(); renderChrome(); };
  $('#btnMaps').innerHTML = icon('grid');
  $('#btnHelp').innerHTML = icon('help');
  $('#btnHelp').onclick = showHelp;
  $('#btnSide').innerHTML = icon('menu');
  $('#btnSide').onclick = () => document.body.classList.toggle('show-side');
  $('#btnImport').innerHTML = icon('upload');
  $('#btnImport').onclick = importVault;
  $('#btnResync').innerHTML = icon('refresh');
  $('#btnResync').onclick = resync;
  $('#dirInput').addEventListener('change', onDirInput);
  $('#campaignSel').addEventListener('change', async (e) => {
    const v = e.target.value;
    if (v === '__import') { e.target.value = S.cid || ''; importVault(); return; }
    if (v === '__delete') { e.target.value = S.cid || ''; deleteCampaign(); return; }
    await loadCampaign(v); go('#/home');
  });
  $('#treeFilter').addEventListener('input', renderTree);
  window.addEventListener('hashchange', route);

  document.addEventListener('click', (e) => {
    const wl = e.target.closest('a.wl');
    if (wl) {
      e.preventDefault(); if (!wl.dataset.path) return;
      if (wl.closest('.book-body, #rpBody, .present') && !e.ctrlKey && !e.metaKey) peek(wl.dataset.path);
      else openNote(wl.dataset.path, wl.dataset.anchor);
      return;
    }
    const img = e.target.closest('.md img');
    if (img && !e.target.closest('a')) { overlay(h('div', { class: 'lightbox' }, h('img', { src: img.src, alt: img.alt }), h('div', { class: 'muted' }, img.alt))); return; }
    const snd = e.target.closest('[data-snd]');
    if (snd) { e.preventDefault(); Audio_.play(snd.dataset.snd); return; }
    const d = e.target.closest('[data-roll]');
    if (d) { e.preventDefault(); roll(d.dataset.roll, d.dataset.label || null); }
  });
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); if (S.cid) openSwitcher(); return; }
    if ((e.ctrlKey || e.metaKey) && e.key === '.') { e.preventDefault(); togglePlayer(); return; }
    if (isTyping(e) || e.ctrlKey || e.metaKey || e.altKey) {
      if (e.key === 'Enter' && e.target.matches?.('[data-snd],[data-roll]')) e.target.click();
      return;
    }
    if (e.key === '/') { e.preventDefault(); if (S.cid) openSwitcher(); }
    else if (e.key === '?') showHelp();
    else if (e.key === 'n' || e.key === 'N') { if (S.cid && combat().list.length) nextTurn(1); }
    else if (e.key === ' ' && (location.hash || '').startsWith('#/sounds')) { e.preventDefault(); Audio_.stopAll(); }
    else if (e.key === 'Enter' && e.target.matches?.('[data-snd],[data-roll]')) e.target.click();
  });
}
function togglePlayer() {
  S.playerSafe = !S.playerSafe;
  toast(S.playerSafe ? 'Player view on: DM secrets are hidden.' : 'Player view off: you can see everything.');
  renderChrome(); route();
}

/* ================================================================ boot */
async function boot() {
  bind();
  await DB.open();
  S.campaigns = await DB.campaigns();
  S.campaigns.sort((a, b) => a.name.localeCompare(b.name));
  const last = store.get('lastCampaign');
  const id = S.campaigns.find((c) => c.id === last)?.id || S.campaigns[0]?.id;
  if (id) await loadCampaign(id); else { renderChrome(); route(); }
}
window.DMDash = { S, rollExpr, parseFrontmatter, statsOf, channelOf, ingest, resolve };
boot();
})();
