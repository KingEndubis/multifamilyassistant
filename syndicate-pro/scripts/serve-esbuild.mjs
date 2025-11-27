import esbuild from 'esbuild';
import fs from 'fs';
import path from 'path';

const projectRoot = process.cwd();
const distDir = path.join(projectRoot, 'dist');
const distAssets = path.join(distDir, 'assets');
const srcIndexHtml = path.join(projectRoot, 'index.html');
const distIndexHtml = path.join(distDir, 'index.html');
const cssSrc = path.join(projectRoot, 'src', 'index.css');
const cssDest = path.join(distDir, 'index.css');

fs.mkdirSync(distDir, { recursive: true });
fs.mkdirSync(distAssets, { recursive: true });

// Rewrite index.html to point to the esbuild bundle
let html = fs.readFileSync(srcIndexHtml, 'utf8');
html = html.replace('/src/main.jsx', '/assets/bundle.js');
fs.writeFileSync(distIndexHtml, html, 'utf8');

// Copy CSS to dist for simple linking
if (fs.existsSync(cssSrc)) {
  fs.copyFileSync(cssSrc, cssDest);
}

await esbuild.build({
  entryPoints: ['src/main.jsx'],
  bundle: true,
  sourcemap: true,
  outdir: distAssets,
  loader: { '.jsx': 'jsx', '.css': 'css' },
  define: { 'process.env.NODE_ENV': '"development"' },
});

const server = await esbuild.serve({ servedir: distDir, port: 5175 }, {});
console.log(`Preview: http://localhost:${server.port}/`);