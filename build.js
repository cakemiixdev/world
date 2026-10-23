import { build } from 'esbuild';
import { copyFile, mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const outputDir = path.join(root, 'dist');
const htmlPath = path.join(root, 'code.html');
const stylesheetPath = path.join(root, 'style.css');
if (process.argv.length > 3 || (process.argv[2] && process.argv[2] !== 'single')) {
  throw new Error('Usage: node build.js [single]');
}
const singleFile = process.argv[2] === 'single';

await mkdir(outputDir, { recursive: true });

const result = await build({
  entryPoints: [path.join(root, 'main.js')],
  bundle: true,
  format: 'iife',
  target: 'es2020',
  write: false,
  minify: singleFile,
});
const bundle = result.outputFiles[0].text;
let html = await readFile(htmlPath, 'utf8');
html = html.replace(/<script type="importmap">[\s\S]*?<\/script>\s*/i, '');
const moduleScript = /<script type="module" src="\.\/main\.js"[^>]*><\/script>/;

if (singleFile) {
  const css = await readFile(stylesheetPath, 'utf8');
  const stylesheetLink = '<link rel="stylesheet" href="./style.css" />';
  if (!html.includes(stylesheetLink)) throw new Error('Could not find the stylesheet link in code.html.');
  html = html.replace(stylesheetLink, `<style>\n${css}\n</style>`);
  const outputHtml = html.replace(moduleScript, `<script>\n${bundle}\n</script>`);
  if (outputHtml === html) throw new Error('Could not find the game module script in code.html.');
  html = outputHtml;
  await writeFile(path.join(outputDir, 'code-single.html'), html);
} else {
  const outputHtml = html.replace(moduleScript, '<script src="./bundle.js"></script>');
  if (outputHtml === html) throw new Error('Could not find the game module script in code.html.');
  html = outputHtml;
  await Promise.all([
    writeFile(path.join(outputDir, 'code.html'), html),
    writeFile(path.join(outputDir, 'bundle.js'), bundle),
    writeFile(path.join(outputDir, 'style.css'), await readFile(stylesheetPath)),
    writeFile(path.join(outputDir, '_redirects'), '/ /code.html 200\n'),
  ]);
}

const avatarAssetsDir = path.join(root, 'assets');
try {
  const assets = await readdir(avatarAssetsDir, { withFileTypes: true });
  const outputAssetsDir = path.join(outputDir, 'assets');
  await mkdir(outputAssetsDir, { recursive: true });
  await Promise.all(assets
    .filter((entry) => entry.isFile())
    .map((entry) => copyFile(
      path.join(avatarAssetsDir, entry.name),
      path.join(outputAssetsDir, entry.name)
    )));
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}

console.log(singleFile ? 'Built dist/code-single.html' : 'Built dist/code.html and dist/bundle.js');
