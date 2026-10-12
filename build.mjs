// Inlines styles, marked, the vault reader and the app into one offline HTML file.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
const here = new URL('.', import.meta.url);
const read = (p) => readFileSync(new URL(p, here), 'utf8');
const out = read('src/index.html')
  .replace('/*__STYLES__*/', () => read('src/styles.css'))
  .replace('/*__MARKED__*/', () => read('vendor/marked.min.js'))
  .replace('/*__VAULT__*/', () => read('src/vault.js'))
  .replace('/*__APP__*/', () => read('src/app.js'));
mkdirSync(new URL('dist/', here), { recursive: true });
writeFileSync(new URL('dist/DM Dashboard.html', here), out);
console.log('built dist/DM Dashboard.html', out.length, 'bytes');
