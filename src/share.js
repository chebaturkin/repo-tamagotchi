export const SNAPSHOT_VERSION = 2;

const MAX_SOURCE_LENGTH = 240;
const MAX_TEXT_LENGTH = 2_000;
const MAX_LANGUAGES = 32;
const MAX_METRICS = 8;
const COLOR_PATTERN = /^#[0-9a-f]{6}$/i;
const SCORE_KEYS = new Set(['energy', 'curiosity', 'resilience', 'chaos', 'experience']);

export class ShareError extends Error {
  constructor(message = 'снимок ссылки повреждён.') {
    super(message);
    this.name = 'ShareError';
    this.code = 'share';
  }
}

const finiteInt = (value, min, max) => Number.isInteger(value) && value >= min && value <= max;
const shortText = (value, max) => typeof value === 'string' && value.length <= max;
const object = (value) => value && typeof value === 'object' && !Array.isArray(value);

function validateSnapshot(snapshot) {
  if (!object(snapshot)) throw new ShareError();
  if (!shortText(snapshot.sourceLabel, MAX_SOURCE_LENGTH) || !shortText(snapshot.analyzedAt, 120)) throw new ShareError();
  if (!finiteInt(snapshot.fileCount, 0, 10_000_000) || !finiteInt(snapshot.textBytes, 0, 2 ** 53 - 1)
    || !finiteInt(snapshot.extensionCount, 0, 10_000) || !finiteInt(snapshot.maxDepth, 0, 1_000)) throw new ShareError();
  if (!Array.isArray(snapshot.languages) || snapshot.languages.length > MAX_LANGUAGES) throw new ShareError();
  for (const language of snapshot.languages) {
    if (!object(language) || !shortText(language.name, 80) || !finiteInt(language.count, 0, 10_000_000)) throw new ShareError();
  }
  if (!object(snapshot.markers)) throw new ShareError();
  for (const key of ['readme', 'license', 'manifests', 'tests', 'configs', 'ci']) if (typeof snapshot.markers[key] !== 'boolean') throw new ShareError();
  if (!Array.isArray(snapshot.metrics) || snapshot.metrics.length === 0 || snapshot.metrics.length > MAX_METRICS) throw new ShareError();
  for (const metric of snapshot.metrics) {
    if (!object(metric) || !SCORE_KEYS.has(metric.key) || !shortText(metric.label, 80) || !finiteInt(metric.score, 0, 100) || !shortText(metric.note, MAX_TEXT_LENGTH)) throw new ShareError();
    if (metric.evidence !== undefined) {
      if (!Array.isArray(metric.evidence) || metric.evidence.length > 12) throw new ShareError();
      for (const row of metric.evidence) if (!object(row) || !shortText(row.label, 80) || !shortText(row.detail, MAX_TEXT_LENGTH) || typeof row.value !== 'number' || !Number.isFinite(row.value)) throw new ShareError();
    }
  }
  if (!object(snapshot.pet) || !shortText(snapshot.pet.seed, 32) || !shortText(snapshot.pet.mood, 32)
    || !COLOR_PATTERN.test(snapshot.pet.accent || '') || !COLOR_PATTERN.test(snapshot.pet.marking || '')
    || !finiteInt(snapshot.pet.energy, 0, 100) || !finiteInt(snapshot.pet.curiosity, 0, 100) || !finiteInt(snapshot.pet.chaos, 0, 100)
    || !shortText(snapshot.pet.state, 80) || !shortText(snapshot.pet.stateNote, MAX_TEXT_LENGTH)) throw new ShareError();
  if (!shortText(snapshot.fieldNote, MAX_TEXT_LENGTH)) throw new ShareError();
  return snapshot;
}

const compactSnapshot = (snapshot) => ({
  sourceLabel: String(snapshot.sourceLabel || '').slice(0, MAX_SOURCE_LENGTH),
  analyzedAt: String(snapshot.analyzedAt || '').slice(0, 120),
  fileCount: Number(snapshot.fileCount) || 0,
  textBytes: Number(snapshot.textBytes) || 0,
  extensionCount: Number(snapshot.extensionCount) || 0,
  maxDepth: Number(snapshot.maxDepth) || 0,
  languages: (snapshot.languages || []).slice(0, MAX_LANGUAGES).map(({ name, count }) => ({ name, count })),
  markers: { ...(snapshot.markers || {}) },
  metrics: (snapshot.metrics || []).slice(0, MAX_METRICS).map((metric) => ({
    key: metric.key, label: metric.label, score: metric.score, note: String(metric.note || '').slice(0, MAX_TEXT_LENGTH),
    evidence: (metric.evidence || []).slice(0, 12),
  })),
  pet: { ...snapshot.pet },
  fieldNote: String(snapshot.fieldNote || '').slice(0, MAX_TEXT_LENGTH),
});

export function encodeSnapshot(snapshot) {
  const value = { version: SNAPSHOT_VERSION, snapshot: compactSnapshot(snapshot) };
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  let binary = '';
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}

export function decodeSnapshot(encoded) {
  if (typeof encoded !== 'string' || encoded.length < 8 || encoded.length > 120_000) throw new ShareError();
  try {
    const normalized = encoded.replaceAll('-', '+').replaceAll('_', '/') + '==='.slice((encoded.length + 3) % 4);
    const binary = atob(normalized);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    const value = JSON.parse(new TextDecoder().decode(bytes));
    const version = value?.version ?? 1;
    if (version !== SNAPSHOT_VERSION && version !== 1) throw new ShareError();
    const snapshot = validateSnapshot(value?.snapshot || value);
    return snapshot;
  } catch (error) {
    if (error instanceof ShareError) throw error;
    throw new ShareError();
  }
}

export { validateSnapshot };
