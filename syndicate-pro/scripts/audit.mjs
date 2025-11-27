/*
 Ani Audit Agent: Proficiency & Functionality Audit for SyndicatePro
 - Verifies environment, dependencies, core files, config, and build readiness
 - Optional build check via `--build`
 */

import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';

const root = process.cwd();

const log = {
  info: (msg) => console.log(`[INFO] ${msg}`),
  ok: (msg) => console.log(`✔ ${msg}`),
  warn: (msg) => console.warn(`⚠ ${msg}`),
  err: (msg) => console.error(`✖ ${msg}`),
};

function readJSON(p) {
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch (e) {
    return null;
  }
}

function exists(rel) {
  return fs.existsSync(path.join(root, rel));
}

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

function findInSrc(regex) {
  const dir = path.join(root, 'src');
  const results = [];
  if (!fs.existsSync(dir)) return results;
  const stack = [dir];
  while (stack.length) {
    const cur = stack.pop();
    const items = fs.readdirSync(cur, { withFileTypes: true });
    for (const it of items) {
      const fp = path.join(cur, it.name);
      if (it.isDirectory()) stack.push(fp);
      else if (/\.(jsx?|tsx?|css|html)$/.test(it.name)) {
        const txt = fs.readFileSync(fp, 'utf8');
        if (regex.test(txt)) results.push(fp);
      }
    }
  }
  return results;
}

function section(title) {
  console.log(`\n=== ${title} ===`);
}

let failures = 0;

section('Environment');
log.info(`Node.js ${process.version}`);
try {
  const vs = process.version.match(/v(\d+)\.(\d+)/);
  const major = vs ? parseInt(vs[1], 10) : 0;
  const minor = vs ? parseInt(vs[2], 10) : 0;
  if (major < 16 || (major === 16 && minor < 14)) {
    failures++; log.err('Node >=16.14 is recommended for Vite 4.');
  } else {
    log.ok('Node version is compatible.');
  }
} catch {
  log.warn('Could not parse Node version.');
}

section('Package & Dependencies');
const pkgPath = path.join(root, 'package.json');
const pkg = readJSON(pkgPath);
if (!pkg) { failures++; log.err('package.json not readable.'); }
else {
  log.ok(`package: ${pkg.name} v${pkg.version}`);
  const deps = pkg.dependencies || {};
  const devDeps = pkg.devDependencies || {};
  const requiredDeps = ['react', 'react-dom', 'recharts', 'xlsx'];
  const requiredDev = ['vite', '@vitejs/plugin-react', 'tailwindcss', 'postcss', 'autoprefixer'];
  for (const d of requiredDeps) {
    if (!deps[d]) { failures++; log.err(`Missing dependency: ${d}`); } else { log.ok(`Found dependency: ${d}@${deps[d]}`); }
  }
  for (const d of requiredDev) {
    if (!devDeps[d]) { failures++; log.err(`Missing devDependency: ${d}`); } else { log.ok(`Found devDependency: ${d}@${devDeps[d]}`); }
  }
}

section('Core Files');
const coreFiles = ['index.html', 'src/main.jsx', 'src/App.jsx', 'vite.config.js', 'tailwind.config.js'];
for (const f of coreFiles) {
  if (!exists(f)) { failures++; log.err(`Missing file: ${f}`); } else { log.ok(`Exists: ${f}`); }
}

section('Mount Point');
if (exists('index.html') && exists('src/main.jsx')) {
  const html = read('index.html');
  const rootMatch = html.match(/<div[^>]*id=["']([^"']+)["']/i);
  const mountId = rootMatch ? rootMatch[1] : null;
  const main = read('src/main.jsx');
  const usesRoot = mountId && (
    main.includes(`getElementById('${mountId}')`) ||
    main.includes(`getElementById("${mountId}")`) ||
    main.includes(`querySelector('#${mountId}')`) ||
    main.includes(`querySelector("#${mountId}")`)
  );
  if (!mountId) { failures++; log.err('index.html has no root mount <div id="...">'); }
  else if (!usesRoot) { failures++; log.err(`main.jsx does not mount to #${mountId}`); }
  else { log.ok(`Root mount id "${mountId}" correctly referenced in main.jsx`); }
}

section('Vite Config');
if (exists('vite.config.js')) {
  const viteCfg = read('vite.config.js');
  if (!/@vitejs\/plugin-react/.test(viteCfg) || !/react\(\)/.test(viteCfg)) {
    log.warn('React plugin not detected in vite.config.js');
  } else {
    log.ok('React plugin configured.');
  }
}

section('Tailwind Setup');
if (exists('src/index.css')) {
  const css = read('src/index.css');
  const hasDirectives = /@tailwind\s+base;/.test(css) && /@tailwind\s+components;/.test(css) && /@tailwind\s+utilities;/.test(css);
  if (!hasDirectives) { failures++; log.err('Tailwind directives missing in src/index.css'); }
  else { log.ok('Tailwind directives present.'); }
} else {
  log.warn('src/index.css not found.');
}

section('Icon Library');
const lucideImports = findInSrc(/from\s+['"]lucide-react['"]/);
if (lucideImports.length) {
  log.ok(`lucide-react imported in: ${lucideImports.join(', ')}`);
} else {
  const stubRefs = findInSrc(/const\s+IconStub\s*=\s*\(/);
  if (stubRefs.length) {
    log.warn('Placeholder IconStub detected. UI icons are stubs; consider restoring real icons.');
  } else {
    log.info('No lucide-react usage detected.');
  }
}

section('Binary Links');
const binDir = path.join(root, 'node_modules', '.bin');
if (fs.existsSync(binDir)) {
  const entries = fs.readdirSync(binDir);
  if (entries.length === 0) log.warn('node_modules/.bin exists but is empty.');
  else log.ok(`.bin contains ${entries.length} executables.`);
} else {
  log.warn('node_modules/.bin not found (npm link shims may be absent).');
}

const doBuild = process.argv.includes('--build');
if (doBuild) {
  section('Build Check');
  const viteBin = path.join(root, 'node_modules', 'vite', 'bin', 'vite.js');
  if (!fs.existsSync(viteBin)) {
    failures++; log.err('Vite CLI not found. Ensure devDependencies installed.');
  } else {
    const res = spawnSync(process.execPath, [viteBin, 'build', '--clearScreen', 'false'], {
      cwd: root,
      env: process.env,
      stdio: 'pipe',
      encoding: 'utf8',
    });
    if (res.status !== 0) {
      failures++;
      log.err('Build failed. Summary:');
      console.log((res.stderr || res.stdout || '').split('\n').slice(-20).join('\n'));
    } else {
      log.ok('Build succeeded. Dist folder ready.');
    }
  }
}

section('Summary');
if (failures === 0) {
  log.ok('Audit passed with no blocking issues.');
  process.exit(0);
} else {
  log.err(`Audit found ${failures} blocking issue(s).`);
  process.exit(1);
}