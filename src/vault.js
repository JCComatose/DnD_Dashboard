/* DM Dashboard vault reader: how notes, links, sounds and stat blocks are parsed.
   Shared by the app (src/app.js) and the script validator (validate.mjs), so both read a vault the same way.
   Plain functions only: no DOM, no app state. */
const DMVault = (() => {
'use strict';

/* ================================================================ paths */
const stripExt = (n) => n.replace(/\.[^./]+$/, '');
const baseName = (p) => p.split('/').pop();
const dirName = (p) => p.includes('/') ? p.slice(0, p.lastIndexOf('/')) : '';
const extOf = (p) => (p.match(/\.([^./]+)$/) || [, ''])[1].toLowerCase();
const slug = (s) => String(s).toLowerCase().trim().replace(/<[^>]+>/g, '').replace(/[^\p{L}\p{N}\s-]/gu, '').replace(/\s+/g, '-');

/* ================================================================ file kinds */
const EXT = {
  note: ['md', 'markdown', 'txt'],
  audio: ['mp3', 'wav', 'ogg', 'oga', 'm4a', 'aac', 'flac', 'webm', 'opus'],
  image: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'avif'],
  pdf: ['pdf'],
};
function kindOf(path) { const e = extOf(path); for (const [k, v] of Object.entries(EXT)) if (v.includes(e)) return k; return null; }

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

/* ================================================================ links */
function splitTarget(raw) {
  const s = raw.replace(/\\\|/g, '|');
  const pipe = s.indexOf('|');
  const target = pipe >= 0 ? s.slice(0, pipe) : s;
  const alias = pipe >= 0 ? s.slice(pipe + 1) : null;
  const hash = target.indexOf('#');
  return { file: hash >= 0 ? target.slice(0, hash) : target, anchor: hash >= 0 ? target.slice(hash + 1).replace(/^\^/, '') : '', alias };
}
// Find a [[link]] target in an index ({ notes, files, byName, byAlias, assets }, as built by indexRecords).
function resolveIn(ix, target) {
  if (!target) return null;
  let t = target.trim().replace(/\\$/, '');
  if (ix.notes.has(t)) return t;
  if (ix.notes.has(t + '.md')) return t + '.md';
  const lower = t.toLowerCase();
  const k = kindOf(t);
  if (k && k !== 'note') return ix.assets.get(baseName(lower)) || (ix.files.has(t) ? t : null);
  const nm = baseName(lower).replace(/\.md$/, '');
  if (t.includes('/')) {
    for (const p of ix.notes.keys()) if (p.toLowerCase().endsWith(lower.replace(/\.md$/, '') + '.md')) return p;
  }
  return ix.byName.get(nm) || ix.byAlias.get(nm) || null;
}
// recs: [{ path, kind, size, mtime, text? }]. Notes are looked up by name (shallowest path wins), alias, or path;
// other files by lower-case file name (first in path order wins).
function indexRecords(recs) {
  const ix = { files: new Map(), notes: new Map(), byName: new Map(), byAlias: new Map(), assets: new Map() };
  recs.sort((a, b) => a.path.localeCompare(b.path, undefined, { numeric: true, sensitivity: 'base' }));
  for (const r of recs) {
    ix.files.set(r.path, r);
    if (r.kind === 'note') {
      const n = parseNote(r); ix.notes.set(r.path, n);
      const k = n.name.toLowerCase();
      const prev = ix.byName.get(k);
      if (!prev || prev.split('/').length > r.path.split('/').length) ix.byName.set(k, r.path);
      for (const a of n.aliases) if (!ix.byAlias.has(a.toLowerCase())) ix.byAlias.set(a.toLowerCase(), r.path);
    } else {
      const k = baseName(r.path).toLowerCase();
      if (!ix.assets.has(k)) ix.assets.set(k, r.path);
    }
  }
  return ix;
}

/* ================================================================ audio */
// Which soundboard channel a file plays on, from its folders and name; size (bytes) decides unsorted files.
function channelOf(path, size) {
  const p = '/' + path.toLowerCase();
  const segs = p.split('/');
  const has = (re) => segs.some((s) => re.test(s));
  if (has(/^(ambien(ce|t)s?|atmospheres?|atmos|environments?|loops?|backgrounds?)$/) || /ambien|atmos/.test(baseName(p))) return 'ambience';
  if (has(/^(sfx|sound.?effects?|effects?|fx|one.?shots?|stingers?)$/)) return 'sfx';
  if (has(/^(music|songs?|bgm|soundtracks?|ost|themes?|playlists?|tracks?|bard|ballads?)$/)) return 'music';
  if (/\b(theme|song|music|ballad|battle|ost)\b/.test(baseName(p).replace(/[_-]/g, ' '))) return 'music';
  return size > 1.5e6 ? 'music' : 'sfx';
}

const SOUND_KEYS = /^(music|song|songs|theme|ambience|ambient|atmosphere|sfx|sound|sounds|audio|soundtrack|playlist)$/i;

/* ================================================================ prompt book */
const BOOK_TYPES = new Set(['script', 'read-aloud', 'readaloud', 'session', 'adventure', 'one-shot', 'oneshot', 'module', 'scenario', 'encounter', 'scene', 'prompt-book']);
function isBookish(n) { return BOOK_TYPES.has(n.type) || (n.body.match(/^#{1,3}\s/gm) || []).length >= 3; }

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
const STATBLOCK_RE = /```statblock[^\n]*\n([\s\S]*?)```/;

return {
  stripExt, baseName, dirName, extOf, slug, EXT, kindOf,
  splitFlow, yval, parseFrontmatter, TYPE_BY_FOLDER, SECRET_CALLOUTS, READ_CALLOUTS, asList, parseNote,
  splitTarget, resolveIn, indexRecords, channelOf, SOUND_KEYS, BOOK_TYPES, isBookish, parseYaml, STATBLOCK_RE,
};
})();
