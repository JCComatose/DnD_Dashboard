// Checks prompt-book scripts the way the DM Dashboard will read them, using the dashboard's own parser (src/vault.js).
//
//   node validate.mjs <script.md | folder>... [--vault <vault folder>] [--into <folder in vault>] [--strict]
//   node validate.mjs --sounds --vault <vault folder>
//
// --vault   the Obsidian vault the script belongs to. Found automatically when a parent folder has .obsidian/.
//           Without a vault, links and sound cues can't be checked and the run says so.
// --into    for a script saved outside the vault: check it as if it were saved in this vault folder (e.g. Scripts).
// --strict  fail on warnings too.
// --sounds  list the vault's audio files by channel, with the exact [[name]] to use for each.
// Exits 1 when any script has errors (or warnings, with --strict).
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, resolve as resolvePath, relative, sep, basename, dirname } from 'node:path';
import vm from 'node:vm';

const V = vm.runInNewContext(readFileSync(new URL('src/vault.js', import.meta.url), 'utf8') + ';DMVault');

/* ---------------------------------------------------------------- args */
const args = process.argv.slice(2);
const opt = { vault: null, into: '', strict: false, sounds: false, targets: [] };
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === '--vault') opt.vault = args[++i];
  else if (a === '--into') opt.into = (args[++i] || '').replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
  else if (a === '--strict') opt.strict = true;
  else if (a === '--sounds') opt.sounds = true;
  else if (a === '-h' || a === '--help') { usage(); process.exit(0); }
  else if (a.startsWith('--')) { console.error(`Unknown option ${a}`); usage(); process.exit(2); }
  else opt.targets.push(a);
}
function usage() {
  console.log('Usage: node validate.mjs <script.md | folder>... [--vault <vault folder>] [--into <folder in vault>] [--strict]\n       node validate.mjs --sounds --vault <vault folder>');
}
if (!opt.targets.length && !opt.sounds) { usage(); process.exit(2); }
for (const t of opt.targets) if (!existsSync(t)) { console.error(`Not found: ${t}`); process.exit(2); }

/* ---------------------------------------------------------------- vault */
const SKIP_DIR = /^(\.|node_modules$|\.trash$)/; // same folders the dashboard skips on import
const posix = (p) => p.split(sep).join('/');
function walk(dir, prefix = '', out = []) {
  for (const name of readdirSync(dir)) {
    if (name.startsWith('.')) continue;
    const full = join(dir, name); const p = prefix ? prefix + '/' + name : name;
    const st = statSync(full);
    if (st.isDirectory()) { if (!SKIP_DIR.test(name)) walk(full, p, out); }
    else if (V.kindOf(name)) out.push({ full, path: p, size: st.size, mtime: st.mtimeMs });
  }
  return out;
}
function findVault(start) {
  let d = resolvePath(start);
  if (existsSync(d) && statSync(d).isFile()) d = dirname(d);
  for (;;) {
    if (existsSync(join(d, '.obsidian'))) return d;
    const up = dirname(d); if (up === d) return null; d = up;
  }
}
const vaultRoot = opt.vault ? resolvePath(opt.vault) : opt.targets.length ? findVault(opt.targets[0]) : null;
if (opt.vault && !existsSync(vaultRoot)) { console.error(`Vault folder not found: ${opt.vault}`); process.exit(2); }
const rec = (f) => ({ path: f.path, kind: V.kindOf(f.path), size: f.size, mtime: f.mtime, full: f.full, text: V.kindOf(f.path) === 'note' ? readFileSync(f.full, 'utf8') : undefined });
const recs = vaultRoot ? walk(vaultRoot).map(rec) : [];

if (opt.sounds) {
  if (!vaultRoot) { console.error('--sounds needs --vault <vault folder>'); process.exit(2); }
  listSounds(); if (!opt.targets.length) process.exit(0);
}

// Scripts to check, with the path the dashboard would see for each.
const targets = [];
for (const t of opt.targets) {
  const full = resolvePath(t);
  const files = statSync(full).isDirectory() ? walk(full).filter((f) => V.kindOf(f.path) === 'note').map((f) => ({ full: f.full, explicit: false })) : [{ full, explicit: true }];
  for (const f of files) {
    let path;
    if (vaultRoot && !relative(vaultRoot, f.full).startsWith('..')) path = posix(relative(vaultRoot, f.full));
    else path = (opt.into ? opt.into + '/' : vaultRoot ? '' : basename(dirname(f.full)) + '/') + basename(f.full);
    targets.push({ ...f, path });
    if (!recs.some((r) => r.path === path)) { const st = statSync(f.full); recs.push(rec({ full: f.full, path, size: st.size, mtime: st.mtimeMs })); }
    else recs.find((r) => r.path === path).text = readFileSync(f.full, 'utf8');
  }
}
const ix = V.indexRecords(recs);
const linksChecked = !!vaultRoot;

/* ---------------------------------------------------------------- checks */
const blank = (m) => m.replace(/[^\n]/g, ' ');
// Hide code, inline code and %%comments%% the same way the dashboard skips them, keeping offsets intact.
const maskFences = (body) => body.replace(/^```[\s\S]*?^```[^\n]*$|^~~~[\s\S]*?^~~~[^\n]*$/gm, blank);
function mask(body) {
  return maskFences(body)
    .replace(/%%[\s\S]*?%%/g, blank)
    .replace(/(`+)([\s\S]*?)\1/g, blank);
}
function headingsOf(body) {
  const out = []; const m = mask(body);
  for (const h of m.matchAll(/^(#{1,6})[ \t]+(.+?)[ \t]*#*[ \t]*$/gm)) out.push({ level: h[1].length, text: h[2].trim(), index: h.index, slug: V.slug(h[2].replace(/[*_`]/g, '').trim()) });
  return out;
}
const near = (want) => {
  const stem = V.stripExt(V.baseName(want.toLowerCase()));
  return [...ix.assets.values()].filter((p) => V.stripExt(V.baseName(p.toLowerCase())) === stem || V.baseName(p.toLowerCase()).startsWith(stem.slice(0, 6))).slice(0, 3);
};
const AUDIO_EXTS = V.EXT.audio.map((e) => '.' + e).join(' ');

function check(t) {
  const n = ix.notes.get(t.path);
  const text = ix.files.get(t.path).text;
  const errors = [], warnings = [];
  const fmLines = (text.slice(0, text.length - n.body.length).match(/\n/g) || []).length;
  const lineOf = (i) => fmLines + (n.body.slice(0, i).match(/\n/g) || []).length + 1;
  const err = (line, msg) => errors.push({ line, msg });
  const warn = (line, msg) => warnings.push({ line, msg });
  const masked = mask(n.body);

  // properties
  const raw = text.replace(/^﻿/, '');
  if (/^---[ \t]*\r?\n/.test(raw) && !Object.keys(n.fm).length && n.body === raw) err(1, 'The properties block starts with --- but never closes. End it with a line containing only ---.');
  const fmBlock = /^﻿?---\r?\n([\s\S]*?)\r?\n---[ \t]*(\r?\n|$)/.exec(text);
  if (fmBlock) fmBlock[1].split(/\r?\n/).forEach((line, i) => {
    if (!line.trim() || /^\s*#/.test(line) || /^\s*-(\s|$)/.test(line)) return;
    if (!/^([^\s:#][^:]*?):(?:\s+(.*)|\s*)$/.test(line)) warn(i + 2, `Property line "${line.trim()}" isn't "key: value", so it is ignored.`);
    else if (/:\s+\[\[[^\]]*\]\]\s*$/.test(line)) warn(i + 2, `Quote wikilinks in properties ("${line.trim().replace(/^[^:]+:\s+/, '')}"), or Obsidian rewrites them as a nested list.`);
  });

  // will the Prompt book list it?
  const callouts = [...masked.matchAll(/^>\s*\[!([^\]]*)\]([+-]?)[ \t]*(.*)$/gm)].map((m) => ({ type: m[1].toLowerCase(), title: m[3].trim(), line: lineOf(m.index) }));
  const readAloud = callouts.filter((c) => V.READ_CALLOUTS.has(c.type));
  const secrets = callouts.filter((c) => V.SECRET_CALLOUTS.has(c.type));
  const book = V.BOOK_TYPES.has(n.type);
  const typeFrom = n.fm.type || n.fm.category || n.fm.kind ? 'property' : n.type ? 'folder' : null;
  if (n.type === 'template') err(1, 'This note is in a Templates folder, which the dashboard ignores. Save it somewhere else.');
  else if (!book && !readAloud.length) err(1, typeFrom === 'property'
    ? `Won't appear in the Prompt book: its type is "${n.type}". Change it to "type: script" (or session / adventure).`
    : `Won't appear in the Prompt book. Add "type: script" (or session / adventure) to its properties, or save it in Scripts/, Sessions/ or Adventures/.`);
  else if (!book) warn(1, `Only its ${readAloud.length} read-aloud callout(s) are listed in the Prompt book; add "type: script" to run the whole note as a prompt book.`);
  if (n.dmOnly) warn(1, 'Marked DM only, so it disappears from the Prompt book while Player view is on.');
  for (const c of callouts) {
    if (!/^[\w-]+$/.test(c.type)) warn(c.line, `"[!${c.type}]" isn't a callout type the dashboard reads (letters, digits, - and _ only), so it shows as a plain quote. Use [!read-aloud] or [!secret].`);
    else if (!V.READ_CALLOUTS.has(c.type) && /read|aloud|narrat|box/.test(c.type)) warn(c.line, `"[!${c.type}]" is not a read-aloud callout, so it gets no Present button. Use [!read-aloud].`);
    else if (!V.SECRET_CALLOUTS.has(c.type) && /secret|dm|gm|hidden/.test(c.type)) warn(c.line, `"[!${c.type}]" is not hidden in Player view. Use [!secret].`);
  }

  // sections
  let heads = headingsOf(n.body);
  if (/^\s*#\s+(.+)\r?\n/.test(n.body) && heads[0]?.level === 1) heads = heads.slice(1); // the leading # title becomes the page title
  let sections = heads.filter((h) => h.level <= 2);
  if (sections.length < 2) sections = heads.filter((h) => h.level <= 3);
  if (book && !sections.length) warn(1, 'No ## headings, so the prompt book has no section list. Start each scene with its own ## heading.');
  else if (book && sections.length === 1) warn(sections[0] && lineOf(sections[0].index), 'Only one section. Give each scene its own ## heading so the section list is useful.');
  const seen = new Map();
  for (const h of headingsOf(n.body)) {
    if (seen.has(h.slug)) warn(lineOf(h.index), `Heading "${h.text}" repeats line ${seen.get(h.slug)}; links to it and the section list jump to the first one.`);
    else seen.set(h.slug, lineOf(h.index));
  }
  for (const m of masked.matchAll(/^#{1,6}(?=[^\s#])(\S+)/gm)) if (!/^\d+$/.test(m[1])) warn(lineOf(m.index), `"#${m[1]}" is a tag, not a heading. Put a space after the #.`);

  // links, embeds and sound cues
  const cues = []; let links = 0;
  const headSlugs = (p) => new Set(headingsOf(ix.notes.get(p).body).map((h) => h.slug));
  for (const m of masked.matchAll(/(!?)\[\[([^\]\n]+?)\]\]/g)) {
    const line = lineOf(m.index); const embed = !!m[1];
    const { file, anchor, alias } = V.splitTarget(m[2]);
    links++;
    if (!file) { if (anchor && !m[2].includes('#^') && !seen.has(V.slug(anchor))) warn(line, `[[#${anchor}]] points at a heading this note doesn't have.`); continue; }
    const ext = V.extOf(file);
    if (/^(mid|midi|wma|aif|aiff|mp4|mov|avi|alac|ape)$/.test(ext)) { err(line, `The dashboard can't play .${ext} files ("${file}"). Convert it to one of: ${AUDIO_EXTS}.`); continue; }
    if (!linksChecked) continue;
    const p = V.resolveIn(ix, file);
    const kind = V.kindOf(file);
    if (!p) {
      const sug = near(file); const hint = sug.length ? ` Did you mean ${sug.map((s) => `"${V.baseName(s)}"`).join(' or ')}?` : '';
      if (kind === 'audio') err(line, `Sound cue "${file}" won't play: no audio file with that name in the vault.${hint}`);
      else if (kind === 'image' || kind === 'pdf') err(line, `"${file}" isn't in the vault, so it won't show.${hint}`);
      else if (embed) err(line, `Embed ![[${file}]] shows as "(not found)": no note with that name.`);
      else warn(line, `No note named "${file}" yet, so [[${m[2]}]] shows as a missing link.`);
      continue;
    }
    if (V.kindOf(p) === 'audio') cues.push({ line, path: p, label: alias, ch: V.channelOf(p, ix.files.get(p).size) });
    else if (anchor && ix.notes.has(p) && !m[2].includes('#^') && !headSlugs(p).has(V.slug(anchor))) warn(line, `"${V.stripExt(V.baseName(p))}" has no heading "${anchor}"; the link opens the note at the top.`);
  }
  // unescaped | inside a table row splits the cell
  masked.split('\n').forEach((l, i) => {
    if (/^\s*\|/.test(l) && /\[\[[^\]\n]*?(?<!\\)\|[^\]\n]*?\]\]/.test(l)) err(fmLines + i + 1, 'A [[link|label]] inside a table splits the cell. Write it as [[link\\|label]].');
  });
  // markdown images
  for (const m of masked.matchAll(/!\[[^\]]*\]\(([^)\s]+)[^)]*\)/g)) {
    if (!linksChecked || /^(https?:|data:|blob:)/i.test(m[1])) continue;
    let src = m[1]; try { src = decodeURIComponent(src); } catch { /* keep as is */ }
    if (!V.resolveIn(ix, src)) err(lineOf(m.index), `Image "${m[1]}" isn't in the vault, so it won't show.`);
  }
  // sound properties: play buttons at the top of the note and in Present mode
  for (const [k, v] of Object.entries(n.fm)) {
    if (!V.SOUND_KEYS.test(k)) continue;
    for (const x of V.asList(Array.isArray(v) ? v : [v])) {
      const mm = /\[\[([^\]]+)\]\]/.exec(String(x));
      const target = mm ? V.splitTarget(mm[1]).file : String(x);
      const looksLikeSound = !!mm || V.kindOf(target) === 'audio';
      if (!looksLikeSound) { warn(1, `Property "${k}: ${x}" is read as a sound but isn't one. Use "${k}: \\"[[file.mp3]]\\"", or rename the property.`); continue; }
      if (!linksChecked) continue;
      const p = V.resolveIn(ix, target);
      if (!p || V.kindOf(p) !== 'audio') { const sug = near(target); err(1, `Property "${k}" names "${target}", which isn't an audio file in the vault, so it gets no play button.${sug.length ? ` Did you mean "${V.baseName(sug[0])}"?` : ''}`); }
      else cues.push({ line: 1, path: p, label: null, ch: V.channelOf(p, ix.files.get(p).size), prop: k });
    }
  }
  // text that runs on into the quote/callout above it
  const ls = masked.split('\n');
  for (let i = 1; i < ls.length; i++) {
    if (/^\s*>/.test(ls[i - 1]) && ls[i].trim() && !/^\s*>/.test(ls[i]) && !/^\s*([-*_]{3,}|#|\||```|~~~)/.test(ls[i]) && !/^\s*>\s*$/.test(ls[i - 1])) warn(fmLines + i + 1, 'This line runs on into the quote/callout above it. Leave a blank line after a callout.');
  }
  // unclosed code fences and comments
  for (const m of maskFences(n.body).matchAll(/^(```|~~~)/gm)) err(lineOf(m.index), 'Code block is never closed, so the rest of the note renders as code. Close it with ```.');
  if (/%%/.test(masked)) warn(lineOf(masked.indexOf('%%')), '%% comment is never closed, so it shows as text.');
  // statblocks
  let statblocks = 0;
  for (const m of n.body.matchAll(/^```statblock[^\n]*\n([\s\S]*?)^```/gm)) {
    statblocks++;
    const sb = V.parseYaml(m[1]); const line = lineOf(m.index);
    if (!sb || typeof sb !== 'object' || Array.isArray(sb) || !Object.keys(sb).length) { err(line, "Couldn't read this statblock. Use one \"key: value\" per line, two-space indents, and \"- name: ...\" list items."); continue; }
    if (!sb.name) warn(line, 'Statblock has no name.');
    if (sb.hp == null || sb.ac == null) warn(line, 'Statblock has no hp or ac, so Add to combat has nothing to use.');
  }

  return { n, errors, warnings, info: { book, typeFrom, sections, cues, links, readAloud, secrets, statblocks } };
}

function listSounds() {
  const audio = recs.filter((r) => r.kind === 'audio');
  const by = { music: [], ambience: [], sfx: [] };
  for (const r of audio) by[V.channelOf(r.path, r.size)].push(r.path);
  const counts = new Map(); for (const r of audio) { const k = V.baseName(r.path).toLowerCase(); counts.set(k, (counts.get(k) || 0) + 1); }
  console.log(`Sounds in ${vaultRoot} (${audio.length}). Link each as [[file name]]:`);
  for (const ch of ['music', 'ambience', 'sfx']) {
    console.log(`\n${ch} (${by[ch].length})`);
    for (const p of by[ch]) console.log(`  [[${V.baseName(p)}]]  ${p}${counts.get(V.baseName(p).toLowerCase()) > 1 ? '  (name used twice; links go to the first)' : ''}`);
  }
  console.log('');
}

/* ---------------------------------------------------------------- run */
let nErr = 0, nWarn = 0, checked = 0, skipped = 0;
if (!linksChecked) console.log('No vault found (no .obsidian folder above the script). Links and sound cues are NOT checked. Pass --vault <vault folder>.\n');
for (const t of targets) {
  const n = ix.notes.get(t.path);
  if (!t.explicit && !V.BOOK_TYPES.has(n.type) && !/^>\s*\[!([\w-]+)\]/m.test(n.body)) { skipped++; continue; }
  const r = check(t); checked++;
  nErr += r.errors.length; nWarn += r.warnings.length;
  const ok = !r.errors.length && !(opt.strict && r.warnings.length);
  const i = r.info; const chs = ['music', 'ambience', 'sfx'].map((c) => [c, i.cues.filter((x) => x.ch === c).length]).filter(([, k]) => k);
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${t.path}`);
  console.log(`     ${i.book ? `prompt book (type: ${n.type}, from ${i.typeFrom})` : `type: ${n.type || 'none'}`} · ${i.sections.length} sections · ${i.cues.length} sound cues${chs.length ? ` (${chs.map(([c, k]) => `${k} ${c}`).join(', ')})` : ''} · ${i.links} links · ${i.readAloud.length} read-aloud · ${i.secrets.length} secret · ${i.statblocks} statblocks`);
  if (i.sections.length) console.log(`     sections: ${i.sections.map((s) => s.text).join(' | ')}`);
  for (const e of r.errors.sort((a, b) => a.line - b.line)) console.log(`     error   line ${e.line}: ${e.msg}`);
  for (const w of r.warnings.sort((a, b) => a.line - b.line)) console.log(`     warning line ${w.line}: ${w.msg}`);
}
if (!checked) console.log(`No prompt-book scripts found${skipped ? ` (${skipped} other notes skipped)` : ''}.`);
console.log(`\n${checked} script(s) checked${vaultRoot ? ` against ${vaultRoot}` : ''}: ${nErr} error(s), ${nWarn} warning(s).${linksChecked ? '' : ' Links and sounds not checked.'}`);
process.exit(nErr || (opt.strict && nWarn) ? 1 : 0);
