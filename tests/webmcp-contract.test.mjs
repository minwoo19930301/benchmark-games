// READ-ONLY source evaluation: no DOM, jsdom, browser, canvas or WebGL is used.
import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(__dirname, '..');
const webmcpFile = path.join(REPO, 'lib/game/webmcp.ts');
const pageFile = path.join(REPO, 'app/page.tsx');
const rendererFile = path.join(REPO, 'lib/game/renderer.ts');

const sources = new Map([webmcpFile, pageFile, rendererFile].map(file => [file, fs.readFileSync(file, 'utf8')]));

function compile(source, filename) {
  return ts.transpileModule(source, {
    fileName: filename,
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
}
function evaluate(source, filename, globals = {}) {
  const exports = {};
  const sandbox = { exports, module: { exports }, AbortController, console: { warn() {} }, ...globals };
  vm.runInNewContext(compile(source, filename), sandbox, { filename, timeout: 1000 });
  return sandbox.module.exports;
}
function gameMock(log = []) {
  let snapshot = { phase: 'ready', world: '1–1', lives: 3, coins: 0, time: 180, progress: 0 };
  return {
    log,
    getSnapshot() { log.push('read'); return { ...snapshot }; },
    start() { log.push('start'); snapshot = { ...snapshot, phase: 'playing', lives: 3, coins: 0, time: 180, progress: 0 }; },
    togglePause() { log.push('pause'); if (snapshot.phase === 'playing') snapshot.phase = 'paused'; else if (snapshot.phase === 'paused') snapshot.phase = 'playing'; },
    input() { log.push('input'); },
    dispose() { log.push('dispose'); },
    setSnapshot(value) { snapshot = { ...snapshot, ...value }; },
  };
}
function registryMock(log = []) {
  const records = new Map(), all = [], signals = [];
  const context = {
    registerTool(tool, { signal }) {
      assert.equal(this, context, 'registration must preserve context method receiver');
      assert(!records.has(tool.name), 'duplicate registered name');
      assert.equal(signal.aborted, false);
      records.set(tool.name, tool); all.push(tool); signals.push(signal);
      signal.addEventListener('abort', () => { records.delete(tool.name); log.push(`abort:${tool.name}`); }, { once: true });
      return Promise.resolve();
    },
  };
  return { context, records, all, signals, log };
}
function loadWeb(context, warnings = []) {
  return evaluate(sources.get(webmcpFile), webmcpFile, {
    document: context === undefined ? {} : { modelContext: context },
    console: { warn(...args) { warnings.push(args); } },
    require(name) { throw new Error(`Unexpected runtime import ${name}`); },
  });
}
const plain = value => JSON.parse(JSON.stringify(value));
const tick = () => new Promise(resolve => setImmediate(resolve));

test('module import is safe without document and has no runtime renderer import', () => {
  let imports = 0;
  const exports = evaluate(sources.get(webmcpFile), webmcpFile, { require() { imports++; throw new Error('No renderer allowed'); } });
  assert.equal(typeof exports.registerGameTools, 'function');
  assert.equal(imports, 0);
});

test('direct registration requires a document host (documented non-browser boundary)', () => {
  const { registerGameTools } = evaluate(sources.get(webmcpFile), webmcpFile);
  assert.throws(() => registerGameTools(gameMock()), { name: 'ReferenceError' });
});

test('unsupported document.modelContext returns an idempotent cleanup and does not touch game', () => {
  const game = gameMock();
  const cleanup = loadWeb().registerGameTools(game);
  assert.equal(typeof cleanup, 'function');
  cleanup(); cleanup();
  assert.deepEqual(game.log, []);
});

test('exactly three unique, descriptive tools register with the same live lifecycle signal', () => {
  const registry = registryMock();
  loadWeb(registry.context).registerGameTools(gameMock());
  assert.deepEqual([...registry.records.keys()], ['read_mario_game', 'start_mario_game', 'toggle_mario_pause']);
  assert.equal(new Set(registry.signals).size, 1);
  for (const tool of registry.all) {
    assert.match(tool.name, /^[A-Za-z0-9_.-]+$/);
    assert(tool.description.length > 20);
    assert.deepEqual(plain(tool.inputSchema), { type: 'object', properties: {}, additionalProperties: false });
    assert.equal(typeof tool.execute, 'function');
    assert.equal(tool.annotations.readOnlyHint, tool.name === 'read_mario_game');
  }
});

test('read tool returns a JSON snapshot and never mutates through the handle', () => {
  const registry = registryMock(), game = gameMock();
  loadWeb(registry.context).registerGameTools(game);
  const result = registry.records.get('read_mario_game').execute({});
  assert.equal(result.phase, 'ready');
  assert.equal(result.lives, 3);
  assert.equal(result.time, 180);
  assert.doesNotThrow(() => JSON.stringify(result));
  assert.deepEqual(game.log, ['read']);
  result.lives = 99;
  assert.equal(registry.records.get('read_mario_game').execute({}).lives, 3);
});

test('start tool explicitly resets current run then returns the post-action snapshot', () => {
  const registry = registryMock(), game = gameMock();
  game.setSnapshot({ phase: 'paused', coins: 17, lives: 1, time: 62, progress: .5 });
  loadWeb(registry.context).registerGameTools(game);
  const result = registry.records.get('start_mario_game').execute({});
  assert.deepEqual(game.log, ['start', 'read']);
  assert.deepEqual(result, { phase: 'playing', world: '1–1', lives: 3, coins: 0, time: 180, progress: 0 });
  assert.match(registry.records.get('start_mario_game').description, /clearing the current run/i);
});

test('pause tool delegates togglePause without starting or using movement input', () => {
  const registry = registryMock(), game = gameMock();
  game.setSnapshot({ phase: 'playing', coins: 8, time: 90 });
  loadWeb(registry.context).registerGameTools(game);
  const tool = registry.records.get('toggle_mario_pause');
  assert.equal(tool.execute({}).phase, 'paused');
  assert.equal(tool.execute({}).phase, 'playing');
  assert.deepEqual(game.log, ['pause', 'read', 'pause', 'read']);
});

for (const name of ['read_mario_game', 'start_mario_game', 'toggle_mario_pause']) {
  test(`${name}: all non-empty/invalid JSON argument shapes reject before side effects`, () => {
    const registry = registryMock(), game = gameMock();
    loadWeb(registry.context).registerGameTools(game);
    for (const value of [null, undefined, false, true, 0, 1, '', 'x', [], [1], { action: 'start' }, { arbitrary: null }]) {
      assert.throws(() => registry.records.get(name).execute(value), { name: 'TypeError', message: 'Expected an empty object' });
    }
    assert.deepEqual(game.log, []);
  });
}

test('frozen and null-prototype empty JSON-object equivalents work', () => {
  const registry = registryMock();
  loadWeb(registry.context).registerGameTools(gameMock());
  const read = registry.records.get('read_mario_game');
  assert.equal(read.execute(Object.freeze({})).phase, 'ready');
  assert.equal(read.execute(Object.create(null)).phase, 'ready');
});

test('cleanup aborts all registrations once; it does not own renderer disposal', () => {
  const registry = registryMock(), game = gameMock();
  const cleanup = loadWeb(registry.context).registerGameTools(game);
  cleanup(); cleanup();
  assert.equal(registry.records.size, 0);
  assert(registry.signals.every(signal => signal.aborted));
  assert.equal(registry.log.length, 3);
  assert.deepEqual(game.log, []);
});

test('StrictMode-style register/cleanup/register has no duplicate names or stale visible tools', () => {
  const registry = registryMock();
  const { registerGameTools } = loadWeb(registry.context);
  const first = gameMock(), second = gameMock();
  registerGameTools(first)();
  const cleanup = registerGameTools(second);
  registry.records.get('start_mario_game').execute({});
  assert.deepEqual(first.log, []);
  assert.deepEqual(second.log, ['start', 'read']);
  cleanup();
  assert.equal(registry.records.size, 0);
});

test('synchronous registration failures are contained and remaining tools still register', () => {
  const warnings = [], registry = registryMock();
  const real = registry.context.registerTool.bind(registry.context);
  registry.context.registerTool = function(tool, options) {
    if (tool.name === 'start_mario_game') throw new Error('policy denied');
    return real(tool, options);
  };
  const cleanup = loadWeb(registry.context, warnings).registerGameTools(gameMock());
  assert.equal(warnings.length, 1);
  assert.equal(registry.records.size, 2);
  cleanup();
  assert.equal(registry.records.size, 0);
});

test('async registration rejection is consumed, not leaked as unhandled rejection', async () => {
  const warnings = [];
  const context = { registerTool() { return Promise.reject(new Error('permission policy')); } };
  const cleanup = loadWeb(context, warnings).registerGameTools(gameMock());
  await tick();
  assert.equal(warnings.length, 3);
  cleanup();
});

test('cleanup during deferred registration aborts the registration signal', async () => {
  const pending = [], warnings = [];
  const context = { registerTool(tool, { signal }) {
    return new Promise((resolve, reject) => {
      pending.push({ tool, signal, resolve });
      signal.addEventListener('abort', () => reject(signal.reason), { once: true });
    });
  } };
  const cleanup = loadWeb(context, warnings).registerGameTools(gameMock());
  cleanup();
  await tick();
  assert.equal(pending.length, 3);
  assert(pending.every(item => item.signal.aborted));
  assert.equal(warnings.length, 3);
});

test('application exceptions surface to the caller instead of becoming false success', () => {
  const registry = registryMock();
  const game = gameMock();
  game.start = () => { throw new RangeError('game state unavailable'); };
  loadWeb(registry.context).registerGameTools(game);
  assert.throws(() => registry.records.get('start_mario_game').execute({}), { name: 'RangeError', message: 'game state unavailable' });
});

function pageHarness() {
  const refs = [], effects = [], updates = [], log = [], registry = registryMock(log);
  let resolveImport, rejectImport;
  const delayedImport = new Promise((resolve, reject) => { resolveImport = resolve; rejectImport = reject; });
  const handle = gameMock(log);
  const { registerGameTools } = loadWeb(registry.context);
  const react = {
    useRef(value) { const ref = { current: value }; refs.push(ref); return ref; },
    useState(value) { return [value, next => updates.push(next)]; },
    useEffect(callback) { effects.push(callback); },
  };
  const Home = evaluate(sources.get(pageFile), pageFile, {
    require(name) {
      if (name === 'react') return react;
      if (name === 'react/jsx-runtime') return { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }), Fragment: Symbol('Fragment') };
      if (name === '@/components/ui/button') return { Button: Symbol('Button-placeholder') };
      if (name === '@/lib/game/webmcp') return { registerGameTools };
      if (name === '@/lib/game/renderer') return delayedImport;
      throw new Error(`Unexpected dependency: ${name}`);
    },
  }).default;
  Home(); // Produces plain object descriptions only. No DOM renderer is involved.
  refs[0].current = { marker: 'opaque host token; not an HTMLElement or DOM node' };
  const cleanup = effects[0]();
  return {
    refs, updates, log, registry, handle, cleanup,
    resolve() { resolveImport({ createGame(host) { assert.equal(host, refs[0].current); log.push('create'); return handle; } }); },
    reject(error) { rejectImport(error); },
  };
}

test('page effect registers after async renderer creation, then unregisters before disposal', async () => {
  const h = pageHarness();
  assert.equal(h.registry.records.size, 0);
  h.resolve(); await tick();
  assert.equal(h.registry.records.size, 3);
  assert.equal(h.refs[1].current, h.handle);
  h.cleanup();
  assert.equal(h.registry.records.size, 0);
  assert.equal(h.refs[1].current, null);
  assert.deepEqual(h.log, ['create', 'abort:read_mario_game', 'abort:start_mario_game', 'abort:toggle_mario_pause', 'dispose']);
});

test('unmount before dynamic import completes prevents game construction/registration', async () => {
  const h = pageHarness();
  h.cleanup(); h.resolve(); await tick();
  assert.deepEqual(h.log, []);
  assert.equal(h.registry.records.size, 0);
  assert.equal(h.refs[1].current, null);
  assert.deepEqual(h.updates, []);
});

test('import rejection after cleanup does not update unmounted state', async () => {
  const h = pageHarness();
  h.cleanup(); h.reject(new Error('import rejected after unmount')); await tick();
  assert.deepEqual(h.updates, []);
  assert.deepEqual(h.log, []);
});

test('active import rejection is surfaced without constructing a game', async () => {
  const h = pageHarness();
  h.reject(new Error('import rejected')); await tick();
  assert.equal(h.updates.length, 1);
  assert.match(String(h.updates[0]), /import rejected/);
  assert.deepEqual(h.log, []);
  h.cleanup();
});

test('renderer cleanup source pairs all global listeners and tears down declared resources', () => {
  // STATIC evidence only: no actual window, document, WebGLRenderer or ResizeObserver.
  const source = sources.get(rendererFile);
  const additions = [...source.matchAll(/(window|document)\.addEventListener\('([^']+)',\s*(\w+)\)/g)];
  assert.equal(additions.length, 4);
  for (const [, target, event, callback] of additions) {
    assert(source.includes(`${target}.removeEventListener('${event}', ${callback})`));
  }
  for (const expression of ['cancelAnimationFrame(frame)', 'observer.disconnect()', 'o.geometry.dispose()', 'm.dispose()', 'renderer.dispose()', 'renderer.domElement.remove()']) assert(source.includes(expression));
  assert.match(source, /getSnapshot:\s*\(\)\s*=>\s*simulation\.snapshot\(\)/);
});
