/**
 * Deterministic, browser-only repository structure analysis.
 *
 * The analyzer accepts normalized-ish entries from a ZIP or folder reader:
 * `{ path, bytes?, text?, size? }`. It does not read the network and never
 * uses timestamps or commit metadata, so the same archive produces the same
 * report on every run.
 */

export const FORMULA = Object.freeze({
  scoreBase: 35,
  scoreRange: 65,
  references: Object.freeze({
    files: 500,
    bytes: 5_000_000,
    source: 300,
    languages: 6,
    extensions: 12,
    depth: 6,
    rootFiles: 20,
    configs: 8,
    manifests: 3,
  }),
  weights: Object.freeze({
    energy: Object.freeze({ files: 0.45, bytes: 0.35, source: 0.2 }),
    curiosity: Object.freeze({ languages: 0.35, extensions: 0.25, docs: 0.2, examples: 0.2 }),
    resilience: Object.freeze({ tests: 0.45, ci: 0.25, configs: 0.15, lockfiles: 0.15 }),
    chaos: Object.freeze({ entropy: 0.35, depth: 0.25, rootFiles: 0.2, unknownExtensions: 0.2 }),
    experience: Object.freeze({ manifests: 0.3, docs: 0.25, license: 0.2, testsAndCi: 0.15, configs: 0.1 }),
  }),
});

const IGNORED_DIRECTORIES = new Set([
  '.git',
  '.hg',
  '.svn',
  'node_modules',
  'bower_components',
  'vendor',
  'dist',
  'build',
  'out',
  'coverage',
  '.next',
  '.nuxt',
  '.cache',
  'target',
  'bin',
  'obj',
]);

const BINARY_EXTENSIONS = new Set([
  '7z', 'a', 'avi', 'bin', 'bmp', 'class', 'dll', 'dmg', 'doc', 'docx', 'eot',
  'exe', 'gif', 'gz', 'ico', 'iso', 'jar', 'jpeg', 'jpg', 'mkv', 'mov', 'mp3', 'mp4',
  'otf', 'pdf', 'png', 'psd', 'rar', 'so', 'tar', 'tif', 'tiff', 'ttf', 'wav', 'webm',
  'webp', 'woff', 'woff2', 'xls', 'xlsx', 'zip', 'avif', 'ogg', 'wasm', 'pyc', 'lockb',
]);

// Repository conventions include a handful of useful files without a suffix.
// Keep them in the structural analysis instead of treating their empty suffix
// as an unknown extension.
const RECOGNIZED_FILENAMES = new Set([
  '.env', '.editorconfig', '.dockerignore', '.gitignore', '.gitattributes',
  '.npmrc', '.nvmrc', '.yarnrc', 'codeowners', 'copying', 'dockerfile',
  'gemfile', 'jenkinsfile', 'justfile', 'license', 'licence', 'makefile',
  'procfile', 'rakefile', 'readme', 'vagrantfile',
]);

const LANGUAGE_BY_EXTENSION = Object.freeze({
  asm: 'Assembly',
  c: 'C',
  cc: 'C++',
  cpp: 'C++',
  cs: 'C#',
  css: 'CSS',
  dart: 'Dart',
  ex: 'Elixir',
  exs: 'Elixir',
  fish: 'Shell',
  fs: 'F#',
  fsx: 'F#',
  go: 'Go',
  h: 'C/C++',
  hpp: 'C++',
  html: 'HTML',
  htm: 'HTML',
  java: 'Java',
  jl: 'Julia',
  js: 'JavaScript',
  jsx: 'JavaScript',
  kt: 'Kotlin',
  kts: 'Kotlin',
  lua: 'Lua',
  m: 'Objective-C',
  mm: 'Objective-C++',
  php: 'PHP',
  pl: 'Perl',
  ps1: 'PowerShell',
  py: 'Python',
  r: 'R',
  rb: 'Ruby',
  rs: 'Rust',
  scala: 'Scala',
  sh: 'Shell',
  sql: 'SQL',
  swift: 'Swift',
  tex: 'TeX',
  toml: 'TOML',
  ts: 'TypeScript',
  tsx: 'TypeScript',
  vue: 'Vue',
  xml: 'XML',
  yml: 'YAML',
  yaml: 'YAML',
});

const RECOGNIZED_EXTENSIONS = new Set([
  ...Object.keys(LANGUAGE_BY_EXTENSION),
  'cjs', 'cts', 'json', 'lock', 'md', 'markdown', 'map', 'mjs', 'txt', 'env',
  'ini', 'cfg', 'conf', 'editorconfig', 'graphql', 'gql', 'gradle', 'properties',
]);

const MANIFEST_NAMES = new Set([
  'package.json', 'composer.json', 'cargo.toml', 'go.mod', 'gemfile',
  'gemspec', 'mix.exs', 'pubspec.yaml', 'pyproject.toml', 'requirements.txt',
  'setup.py', 'setup.cfg', 'pom.xml', 'build.gradle', 'build.gradle.kts',
]);

const LOCKFILE_NAMES = new Set([
  'package-lock.json', 'npm-shrinkwrap.json', 'yarn.lock', 'pnpm-lock.yaml', 'go.sum',
  'bun.lockb', 'cargo.lock', 'composer.lock', 'gemfile.lock', 'poetry.lock',
]);

const CONFIG_NAME_PATTERNS = [
  /^\.env(?:\.|$)/,
  /^\.editorconfig$/,
  /^\.?eslint(?:rc|config)(?:\.|$)/,
  /^\.?prettier(?:rc|config)(?:\.|$)/,
  /^(?:babel|jest|vitest|vite|webpack|rollup|astro|svelte|next|nuxt|tailwind)\.config\./,
  /^tsconfig(?:\..+)?\.json$/,
  /^jsconfig(?:\..+)?\.json$/,
  /^dockerfile$/,
  /^makefile$/,
  /^taskfile(?:\..+)?$/,
  /^\.dockerignore$/,
];

const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));

const countNorm = (value, reference) => {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return clamp(Math.log1p(value) / Math.log1p(reference));
};

const stableCompare = (left, right) => left < right ? -1 : left > right ? 1 : 0;

const byteLength = (text) => {
  if (typeof text !== 'string') return 0;
  if (typeof TextEncoder !== 'undefined') return new TextEncoder().encode(text).byteLength;
  return unescape(encodeURIComponent(text)).length;
};

const asByteCount = (entry) => {
  if (entry && entry.bytes instanceof Uint8Array) return entry.bytes.byteLength;
  if (entry && entry.bytes instanceof ArrayBuffer) return entry.bytes.byteLength;
  if (entry && ArrayBuffer.isView(entry.bytes)) return entry.bytes.byteLength;
  if (entry && Number.isFinite(entry.bytes)) return Math.max(0, Math.round(entry.bytes));
  if (entry && Number.isFinite(entry.size)) return Math.max(0, Math.round(entry.size));
  return byteLength(entry && entry.text);
};

const decodeEntryText = (entry, extension) => {
  if (typeof entry?.text === 'string') return entry.text;
  if (BINARY_EXTENSIONS.has(extension)) return undefined;
  const bytes = entry?.bytes instanceof Uint8Array
    ? entry.bytes
    : entry?.bytes instanceof ArrayBuffer
      ? new Uint8Array(entry.bytes)
      : ArrayBuffer.isView(entry?.bytes)
        ? new Uint8Array(entry.bytes.buffer, entry.bytes.byteOffset, entry.bytes.byteLength)
        : undefined;
  // Metadata such as package scripts is small by nature. Avoid inflating a
  // giant source file merely to compute structural signals.
  if (!bytes || bytes.byteLength > 1_048_576 || typeof TextDecoder === 'undefined') return undefined;
  try { return new TextDecoder().decode(bytes); } catch { return undefined; }
};

const containsNulByte = (entry) => {
  if (typeof entry?.text === 'string' && entry.text.includes('\0')) return true;
  const bytes = entry?.bytes instanceof Uint8Array
    ? entry.bytes
    : entry?.bytes instanceof ArrayBuffer
      ? new Uint8Array(entry.bytes)
      : ArrayBuffer.isView(entry?.bytes)
        ? new Uint8Array(entry.bytes.buffer, entry.bytes.byteOffset, entry.bytes.byteLength)
        : undefined;
  if (!bytes) return false;
  const limit = Math.min(bytes.byteLength, 4096);
  for (let index = 0; index < limit; index += 1) if (bytes[index] === 0) return true;
  return false;
};

const pathParts = (path) => path.split('/').filter(Boolean);

const canonicalPath = (path) => pathParts(String(path || '').replace(/\\/g, '/').replace(/^\.\//, '')).join('/');

const baseName = (path) => path.slice(path.lastIndexOf('/') + 1);

const extensionOf = (path) => {
  const name = baseName(path).toLowerCase();
  const dot = name.lastIndexOf('.');
  if (dot <= 0 || dot === name.length - 1) return '';
  return name.slice(dot + 1);
};

const isIgnoredPath = (path) => pathParts(path).some((part) => IGNORED_DIRECTORIES.has(part.toLowerCase()));

const hasSharedArchiveRoot = (entries) => {
  if (!entries.length) return false;
  const firstParts = entries.map((entry) => pathParts(entry.path)[0]).filter(Boolean);
  if (!firstParts.length || firstParts.length !== entries.length) return false;
  const root = firstParts[0];
  return firstParts.every((part) => part === root) && entries.every((entry) => pathParts(entry.path).length > 1);
};

const stripSharedRoot = (entries) => {
  if (!hasSharedArchiveRoot(entries)) return entries;
  return entries.map((entry) => ({ ...entry, path: pathParts(entry.path).slice(1).join('/') }));
};

const chooseDuplicate = (left, right) => {
  if (left.bytes !== right.bytes) return left.bytes > right.bytes ? left : right;
  const leftText = typeof left.text === 'string' ? left.text : '';
  const rightText = typeof right.text === 'string' ? right.text : '';
  return stableCompare(leftText, rightText) <= 0 ? left : right;
};

/** Normalize, filter and sort entries so ZIP and folder inputs share one view. */
export const normalizeEntries = (entries = []) => {
  const candidates = [];
  for (const raw of entries || []) {
    if (!raw || typeof raw.path !== 'string') continue;
    const path = canonicalPath(raw.path);
    if (!path || path.endsWith('/') || isIgnoredPath(path)) continue;
    const extension = extensionOf(path);
    if (BINARY_EXTENSIONS.has(extension)) continue;
    if (containsNulByte(raw)) continue;
    candidates.push({
      path,
      bytes: asByteCount(raw),
      text: decodeEntryText(raw, extension),
    });
  }

  const stripped = stripSharedRoot(candidates);
  const byPath = new Map();
  for (const entry of stripped) {
    const previous = byPath.get(entry.path);
    byPath.set(entry.path, previous ? chooseDuplicate(previous, entry) : entry);
  }
  return [...byPath.values()].sort((left, right) => stableCompare(left.path, right.path));
};

const countBy = (items) => items.reduce((map, item) => {
  map[item] = (map[item] || 0) + 1;
  return map;
}, Object.create(null));

const sortedCountObject = (counts) => Object.fromEntries(Object.keys(counts).sort(stableCompare).map((key) => [key, counts[key]]));

const hasAny = (value, patterns) => patterns.some((pattern) => pattern.test(value));

const isReadme = (name) => /^readme(?:\.|$)/i.test(name);
const isChangelog = (name) => /^change(?:log|s)(?:\.|$)/i.test(name);
const isLicense = (name) => /^(?:license|licence|copying)(?:\.|$)/i.test(name);
const isTestFile = (path) => {
  const lower = path.toLowerCase();
  const name = baseName(lower);
  return /(^|\/)(?:__tests__|tests?|spec|fixtures)(?:\/|$)/.test(lower)
    || /(?:^|[._-])(test|spec)(?:[._-]|$)/.test(name)
    || /^test_[^/]+/.test(name);
};
const isDocsFile = (path) => {
  const lower = path.toLowerCase();
  return isReadme(baseName(lower)) || isChangelog(baseName(lower)) || /^(?:docs?|documentation)\//.test(lower);
};
const isExampleFile = (path) => /^(?:examples?|samples?|notebooks?)\//i.test(path) || /\.(?:ipynb)$/i.test(path);
const isCIFile = (path) => {
  const lower = path.toLowerCase();
  return /^\.github\/workflows\//.test(lower)
    || /^(?:\.gitlab-ci\.yml|\.circleci\/config\.yml|azure-pipelines\.yml|jenkinsfile|buildkite\/pipeline\.yml)$/.test(lower);
};
const isManifest = (name) => MANIFEST_NAMES.has(name.toLowerCase());
const isLockfile = (name) => LOCKFILE_NAMES.has(name.toLowerCase());
const isConfig = (path) => {
  const lower = path.toLowerCase();
  const name = baseName(lower);
  return isCIFile(lower) || isManifest(name) || isLockfile(name) || hasAny(name, CONFIG_NAME_PATTERNS);
};
const languageFor = (path) => LANGUAGE_BY_EXTENSION[extensionOf(path)] || '';

const isRecognizedFile = (path) => {
  const name = baseName(path).toLowerCase();
  const extension = extensionOf(path);
  return RECOGNIZED_EXTENSIONS.has(extension)
    || RECOGNIZED_FILENAMES.has(name)
    || isReadme(name)
    || isChangelog(name)
    || isManifest(name)
    || isLockfile(name)
    || hasAny(name, CONFIG_NAME_PATTERNS);
};

const normalizedEntropy = (counts) => {
  const values = Object.values(counts);
  if (values.length <= 1) return 0;
  const total = values.reduce((sum, value) => sum + value, 0);
  const entropy = values.reduce((sum, value) => {
    const probability = value / total;
    return sum - probability * Math.log(probability);
  }, 0);
  return clamp(entropy / Math.log(values.length));
};

const textFrom = (entry) => typeof entry.text === 'string' ? entry.text : '';

const parseScriptCount = (entries) => entries.reduce((total, entry) => {
  if (baseName(entry.path).toLowerCase() !== 'package.json') return total;
  try {
    const parsed = JSON.parse(textFrom(entry));
    return total + (parsed && parsed.scripts && typeof parsed.scripts === 'object'
      ? Object.keys(parsed.scripts).length : 0);
  } catch {
    return total;
  }
}, 0) + entries.filter((entry) => /(?:^|\/)(?:makefile|taskfile(?:\.|$))/i.test(entry.path)).length;

const score = (weightedSignal) => Math.round(clamp(FORMULA.scoreBase + FORMULA.scoreRange * clamp(weightedSignal), 0, 100));

const evidence = (key, label, value, weight, detail) => ({ key, label, value, weight, detail });

const hashString = (value) => {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
};

const contentSignature = (entry) => {
  if (typeof entry?.text === 'string') return hashString(entry.text);
  return '';
};

const characterBand = (value) => value < 50 ? 'quiet' : value < 70 ? 'steady' : value < 85 ? 'bright' : 'wild';

const makePet = (scores, entries) => {
  const signature = entries.map((entry) => `${entry.path}:${entry.bytes}:${contentSignature(entry)}`).join('|');
  const seed = hashString(`${signature}|${Object.values(scores).join(',')}`);
  return {
    seed,
    mood: characterBand(Math.round((scores.energy + scores.curiosity + scores.resilience) / 3)),
    accent: scores.energy >= 70 ? '#E4A84A' : '#6E7C70',
    marking: scores.chaos >= 55 ? '#C95A4A' : '#183A37',
    antenna: 1 + Math.round(scores.curiosity / 50),
    antennae: 1 + Math.round(scores.curiosity / 50),
    spots: 1 + Math.round(scores.chaos / 25),
    eyeScale: Number((0.85 + scores.curiosity / 500).toFixed(3)),
    tilt: Number(((scores.chaos - 50) / 10).toFixed(2)),
    character: Object.fromEntries(Object.entries(scores).map(([key, value]) => [key, characterBand(value)])),
  };

};

/** Analyze a normalized repository entry list and return explainable metrics. */
export const analyzeEntries = (entries = []) => {
  const files = normalizeEntries(entries);
  const fileCount = files.length;
  const bytes = files.reduce((total, file) => total + file.bytes, 0);
  const extensionCounts = countBy(files.map((file) => extensionOf(file.path) || '(none)'));
  const languages = sortedCountObject(countBy(files.map((file) => languageFor(file.path)).filter(Boolean)));
  const languageKinds = Object.keys(languages).length;
  const extensionKinds = Object.keys(extensionCounts).length;
  const sourceFiles = files.filter((file) => Boolean(languageFor(file.path))).length;
  const testFiles = files.filter((file) => isTestFile(file.path)).length;
  const manifests = files.filter((file) => isManifest(baseName(file.path))).length;
  const lockfiles = files.filter((file) => isLockfile(baseName(file.path))).length;
  const configFiles = files.filter((file) => isConfig(file.path)).length;
  const ciFiles = files.filter((file) => isCIFile(file.path)).length;
  const readme = files.some((file) => isReadme(baseName(file.path)));
  const changelog = files.some((file) => isChangelog(baseName(file.path)));
  const license = files.some((file) => isLicense(baseName(file.path))
    || /SPDX-License-Identifier:/i.test(textFrom(file)));
  const docsDirectories = files.some((file) => /^(?:docs?|documentation)\//i.test(file.path));
  const examples = files.filter((file) => isExampleFile(file.path)).length;
  const examplesDirectories = files.some((file) => /^(?:examples?|samples?)\//i.test(file.path));
  const notebooks = files.filter((file) => /\.ipynb$/i.test(file.path)).length;
  const scripts = parseScriptCount(files);
  const depths = files.map((file) => pathParts(file.path).length);
  const averageDepth = fileCount ? depths.reduce((sum, depth) => sum + depth, 0) / fileCount : 0;
  const maxDepth = depths.length ? Math.max(...depths) : 0;
  const rootFiles = files.filter((file) => !file.path.includes('/')).length;
  const unknownExtensions = files.filter((file) => !isRecognizedFile(file.path)).length;
  const extensionEntropy = normalizedEntropy(extensionCounts);
  const docsSignal = clamp((Number(readme) + Number(changelog) + Number(docsDirectories)) / 3);
  const docsFound = [readme && 'README', changelog && 'CHANGELOG', docsDirectories && 'папка docs'].filter(Boolean);
  const docsDetail = docsFound.length ? `документация: ${docsFound.join(', ')}` : 'документация не найдена';
  const examplesSignal = clamp((Number(examplesDirectories) + Math.min(1, notebooks + examples > 0 ? 1 : 0)) / 2);
  const testsSignal = clamp(testFiles / (0.25 * sourceFiles + 1));
  const ciSignal = ciFiles > 0 ? 1 : 0;
  const configSignal = countNorm(configFiles, FORMULA.references.configs);
  const manifestSignal = countNorm(manifests, FORMULA.references.manifests);
  const lockfileSignal = lockfiles > 0 ? 1 : 0;
  const unknownExtensionSignal = fileCount ? clamp(unknownExtensions / fileCount) : 0;
  const testsAndCiSignal = clamp((testsSignal + ciSignal) / 2);

  const signals = {
    energy: [
      evidence('files', 'файлы', countNorm(fileCount, FORMULA.references.files), FORMULA.weights.energy.files, `файлов: ${fileCount}`),
      evidence('bytes', 'объём текста', countNorm(bytes, FORMULA.references.bytes), FORMULA.weights.energy.bytes, `объём текста: ${bytes} байт`),
      evidence('source', 'исходники и задачи', countNorm(sourceFiles + scripts, FORMULA.references.source), FORMULA.weights.energy.source, `исходный код: ${sourceFiles} · скрипты: ${scripts}`),
    ],
    curiosity: [
      evidence('languages', 'языки', countNorm(languageKinds, FORMULA.references.languages), FORMULA.weights.curiosity.languages, `языков: ${languageKinds}`),
      evidence('extensions', 'расширения', countNorm(extensionKinds, FORMULA.references.extensions), FORMULA.weights.curiosity.extensions, `расширений: ${extensionKinds}`),
      evidence('docs', 'следы документации', docsSignal, FORMULA.weights.curiosity.docs, docsDetail),
      evidence('examples', 'примеры и notebooks', examplesSignal, FORMULA.weights.curiosity.examples, `файлов с примерами: ${examples + notebooks}`),
    ],
    resilience: [
      evidence('tests', 'тесты', testsSignal, FORMULA.weights.resilience.tests, `тестовых файлов: ${testFiles}`),
      evidence('ci', 'непрерывная проверка', ciSignal, FORMULA.weights.resilience.ci, ciSignal ? 'файлы ci найдены' : 'файлы ci не найдены'),
      evidence('configs', 'настройки', configSignal, FORMULA.weights.resilience.configs, `конфигов: ${configFiles}`),
      evidence('lockfiles', 'зафиксированные зависимости', lockfileSignal, FORMULA.weights.resilience.lockfiles, lockfileSignal ? `lock-файлов: ${lockfiles}` : 'lock-файлов нет'),
    ],
    chaos: [
      evidence('entropy', 'разнообразие расширений', extensionEntropy, FORMULA.weights.chaos.entropy, `разнообразие расширений: ${extensionEntropy.toFixed(2).replace('.', ',')}`),
      evidence('depth', 'глубина путей', countNorm(averageDepth, FORMULA.references.depth), FORMULA.weights.chaos.depth, `средняя глубина папок: ${averageDepth.toFixed(1).replace('.', ',')}`),
      evidence('rootFiles', 'файлы в корне', countNorm(rootFiles, FORMULA.references.rootFiles), FORMULA.weights.chaos.rootFiles, `файлов в корне: ${rootFiles}`),
      evidence('unknownExtensions', 'неясные расширения', unknownExtensionSignal, FORMULA.weights.chaos.unknownExtensions, `без понятного расширения: ${unknownExtensions}`),
    ],
    experience: [
      evidence('manifests', 'файлы пакетов', manifestSignal, FORMULA.weights.experience.manifests, `файлов пакетов: ${manifests}`),
      evidence('docs', 'следы документации', docsSignal, FORMULA.weights.experience.docs, docsDetail),
      evidence('license', 'лицензия', license ? 1 : 0, FORMULA.weights.experience.license, license ? 'лицензия найдена' : 'лицензия не найдена'),
      evidence('testsAndCi', 'тесты и ci', testsAndCiSignal, FORMULA.weights.experience.testsAndCi, `тестов: ${testFiles} · файлов ci: ${ciFiles}`),
      evidence('configs', 'настройки', configSignal, FORMULA.weights.experience.configs, `конфигов: ${configFiles}`),
    ],
  };

  const weighted = (rows) => rows.reduce((sum, row) => sum + row.value * row.weight, 0);
  const scores = {
    energy: score(weighted(signals.energy)),
    curiosity: score(weighted(signals.curiosity)),
    resilience: score(weighted(signals.resilience)),
    chaos: score(weighted(signals.chaos)),
    experience: score(weighted(signals.experience)),
  };

  const summary = {
    files: fileCount,
    fileCount,
    bytes,
    textBytes: bytes,
    extensions: extensionKinds,
    extensionKinds,
    languages: languageKinds,
    languageKinds,
    sourceFiles,
    scripts,
    tests: testFiles,
    testFiles,
    configs: configFiles,
    configFiles,
    manifests,
    lockfiles,
    readme,
    changelog,
    license,
    docs: Number(readme) + Number(changelog) + Number(docsDirectories),
    examples,
    notebooks,
    ci: ciFiles,
    averageDepth,
    maxDepth,
    rootFiles,
    extensionEntropy,
    unknownExtensions,
  };

  const markers = [
    readme && 'README',
    license && 'LICENSE',
    manifests > 0 && 'package manifest',
    testFiles > 0 && 'tests',
    ciFiles > 0 && 'CI',
    configFiles > 0 && 'configs',
  ].filter(Boolean);

  return {
    empty: fileCount === 0,
    entries: files,
    summary,
    extensionCounts: sortedCountObject(extensionCounts),
    languages,
    scores,
    // `metrics` is the UI-facing alias; `scores` stays explicit for callers
    // that want to distinguish the five numeric character values.
    metrics: scores,
    signals,
    markers,
    formula: FORMULA,
    pet: makePet(scores, files),
  };
};

export { BINARY_EXTENSIONS, IGNORED_DIRECTORIES, LANGUAGE_BY_EXTENSION };
