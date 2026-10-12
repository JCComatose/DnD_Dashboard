// Inlines styles, marked and the app into one offline HTML file per page.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
const here = new URL('.', import.meta.url);
const read = (p) => readFileSync(new URL(p, here), 'utf8');
mkdirSync(new URL('dist/', here), { recursive: true });
const build = (html, css, js, out) => {
  const page = read(html)
    .replace('/*__STYLES__*/', () => read(css))
    .replace('/*__MARKED__*/', () => read('vendor/marked.min.js'))
    .replace('/*__APP__*/', () => read(js));
  writeFileSync(new URL('dist/' + out, here), page);
  console.log('built dist/' + out, page.length, 'bytes');
};
build('src/index.html', 'src/styles.css', 'src/app.js', 'DM Dashboard.html');
build('src/battlemap.html', 'src/battlemap.css', 'src/battlemap.js', 'battlemap.html');
