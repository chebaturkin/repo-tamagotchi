import '../i18n.js';
const t = (...args) => globalThis.I18n.t(...args);
I18n.apply();
import { analyzeEntries } from './analyzer.js';
import { SourceError, fetchGitHubArchive, filesToEntries, parseZipBlob, readDroppedItems } from './sources.js';
import { ShareError, decodeSnapshot, encodeSnapshot } from './share.js';
import { createOperationGate } from './operation.js';
import { exampleEntries } from './example.js';

const $ = (selector) => document.querySelector(selector);
const ui = {
  intro: $('#intro-layout'), tryExample: $('#try-example'), chooseZip: $('#choose-zip'), chooseFolder: $('#choose-folder'),
  sourcePanel: $('#source-panel'), sourceForm: $('#source-form'), url: $('#repo-url'), fileInput: $('#file-input'), folderInput: $('#folder-input'), dropzone: $('#dropzone'), status: $('#source-status'),
  empty: $('#empty-state'), error: $('#error-state'), errorMessage: $('#error-message'), errorZip: $('#error-zip'), errorReset: $('#error-reset'),
  journal: $('#journal'), source: $('#journal-source'), date: $('#journal-date'), petSvg: $('#pet-svg'), petState: $('#pet-state'), petStateNote: $('#pet-state-note'),
  metrics: $('#metrics'), evidenceStats: $('#evidence-stats'), languageList: $('#language-list'), markerList: $('#marker-list'), fieldNote: $('#field-note'),
  reanalyze: $('#reanalyze'), copyShare: $('#copy-share'), exportSvg: $('#export-svg'), exportPng: $('#export-png'), reset: $('#reset')
};

let currentEntries = null;
let currentSource = '';
let currentSnapshot = null;
let currentAnalyzedAt = new Date();
let currentIsExample = false;
let analysisController = null;
const operations = createOperationGate();

const formatBytes = (bytes) => {
  const value = Math.max(0, Number(bytes) || 0);
  if (value < 1024) return t("s47", new Intl.NumberFormat(I18n.intlLocale).format(value));
  if (value < 1024 * 1024) return t("s48", new Intl.NumberFormat(I18n.intlLocale, { maximumFractionDigits: 1 }).format(value / 1024));
  return t("s49", new Intl.NumberFormat(I18n.intlLocale, { maximumFractionDigits: 1 }).format(value / (1024 * 1024)));
};
const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const localDate = (date = currentAnalyzedAt) => new Intl.DateTimeFormat(I18n.intlLocale, { dateStyle: 'long', timeStyle: 'short' }).format(date).toLocaleLowerCase(I18n.intlLocale);

function setStatus(message = '', isError = false) {
  ui.status.textContent = message;
  ui.status.classList.toggle('is-error', isError);
}
function showOnly(view) {
  if (view === 'journal') $('.actions-bar').after(ui.status);
  else ui.intro.after(ui.status);
  ui.intro.hidden = view === 'journal';
  ui.sourcePanel.hidden = view === 'journal';
  ui.empty.hidden = view !== 'empty';
  ui.error.hidden = view !== 'error';
  ui.journal.hidden = view !== 'journal';
}
function showError(error, token = null) {
  if (token !== null && !operations.isCurrent(token)) return;
  const message = error instanceof SourceError || error instanceof ShareError
    ? error.message
    : t("s50");
  ui.errorMessage.textContent = message;
  setStatus(t("s51"), true);
  showOnly('error');
  ui.error?.querySelector('h2')?.focus();
}
function setBusy(label) {
  setStatus(label);
  ui.sourceForm.setAttribute('aria-busy', 'true');
  ui.tryExample.disabled = true;
  ui.sourceForm.querySelectorAll('button, input, label.button').forEach((node) => {
    node.setAttribute('aria-disabled', 'true');
    if ('disabled' in node) node.disabled = true;
  });
  const submit = ui.sourceForm.querySelector('button[type="submit"]');
  if (submit) { submit.dataset.originalMarkup ||= submit.innerHTML; submit.textContent = t("s52"); }
}
function clearBusy() {
  ui.sourceForm.setAttribute('aria-busy', 'false');
  ui.tryExample.disabled = false;
  ui.sourceForm.querySelectorAll('button, input, label.button').forEach((node) => {
    node.removeAttribute('aria-disabled');
    if ('disabled' in node) node.disabled = false;
  });
  const submit = ui.sourceForm.querySelector('button[type="submit"]');
  if (submit) submit.innerHTML = t('s53');
}

function buildSnapshot(result, sourceLabel) {
  const summary = result.summary || {};
  const metricLabels = { energy: t("s54"), curiosity: t("s55"), resilience: t("s56"), chaos: t("s57"), experience: t("s58") };
  const metrics = Object.entries(result.scores || {}).map(([key, score]) => {
    const rows = (result.signals?.[key] || []).map(row => row.key === 'bytes'
      ? { ...row, detail: t("s59", formatBytes(summary.textBytes ?? summary.bytes).toLocaleLowerCase(I18n.intlLocale)) }
      : row);
    return {
      key,
      label: metricLabels[key] || key,
      score: Number.isFinite(score) ? score : 0,
      note: rows.slice(0, 2).map((row) => row.detail).join(' · '),
      evidence: rows.map(({ key: evidenceKey, label, value, weight, detail }) => ({ key: evidenceKey, label, value, weight, detail })),
    };
  });
  const languageRows = Object.entries(result.languages || {})
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  const markers = {
    readme: Boolean(summary.readme), license: Boolean(summary.license), manifests: summary.manifests > 0,
    tests: summary.tests > 0, configs: summary.configs > 0, ci: summary.ci > 0,
  };
  const avg = Math.round((metrics.reduce((sum, item) => sum + item.score, 0) || 0) / Math.max(1, metrics.length));
  const moodLabels = { quiet: t("s60"), steady: t("s61"), bright: t("s62"), wild: t("s63") };
  const mood = moodLabels[result.pet?.mood] || t("s60");
  return {
    sourceLabel: String(sourceLabel || t("s64")), analyzedAt: currentAnalyzedAt.toISOString(), fileCount: summary.files || 0,
    textBytes: summary.textBytes ?? summary.bytes ?? 0, extensionCount: summary.extensions || 0, maxDepth: summary.maxDepth || 0,
    languages: languageRows, markers, metrics,
    pet: { ...result.pet, energy: result.scores?.energy ?? avg, curiosity: result.scores?.curiosity ?? avg, chaos: result.scores?.chaos ?? avg, state: mood, stateNote: I18n.count('archive.files', summary.files || 0) },
    fieldNote: t("s44"),
  };
}

async function runAnalysis(entries, sourceLabel, { updateHash = true, token } = {}) {
  if (!entries?.length) throw new SourceError('empty', t("s66"));
  if (token !== undefined && !operations.isCurrent(token)) return;
  await new Promise((resolve) => requestAnimationFrame(resolve));
  if (token !== undefined && !operations.isCurrent(token)) return;
  const result = analyzeEntries(entries);
  if (!result?.summary?.files) throw new SourceError('empty', t("s67"));
  if (token !== undefined && !operations.isCurrent(token)) return;
  currentEntries = entries;
  currentSource = sourceLabel;
  currentAnalyzedAt = new Date();
  currentIsExample = entries === exampleEntries;
  currentSnapshot = buildSnapshot(result, sourceLabel);
  renderSnapshot(currentSnapshot);
  if (updateHash) setShareHash(currentSnapshot);
  showOnly('journal');
  setStatus('');
  ui.journal.querySelector('h2')?.focus();
}

// These captions are generated by the app. The suffix is the exact user folder name.
function sourceCaption(value) {
  const source = String(value || '');
  const folder = /^(?:папка|folder): ([\s\S]+)$/.exec(source);
  if (folder) return t('s94', folder[1]);
  if ([I18n.messages.ru.s91, I18n.messages.en.s91].includes(source)) return t('s91');
  if ([I18n.messages.ru.s95, I18n.messages.en.s95].includes(source)) return t('s95');
  return source || t('s64');
}
function evidenceDetail(row) {
  // Typed numeric evidence is safe to reformat; paths, names and arbitrary details are not.
  if (row.key === 'entropy' && /^(?:разнообразие расширений|extension diversity): [0-9.,\u00a0\u202f ]+$/.test(row.detail || '') && Number.isFinite(row.value) && row.value >= 0 && row.value <= 1) {
    return t('s126', new Intl.NumberFormat(I18n.intlLocale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(row.value));
  }
  if (row.key === 'depth') {
    const numeric = /^(средняя глубина папок|average folder depth): ([0-9.,\u00a0\u202f ]+)$/.exec(row.detail || '');
    if (numeric) {
      const compact = numeric[2].replace(/[\s\u00a0\u202f]/g, '');
      const decimal = numeric[1] === 'average folder depth' ? compact.replaceAll(',', '') : compact.replace(',', '.');
      const value = Number(decimal);
      if (Number.isFinite(value) && value >= 0 && value <= 1000) return t('s128', new Intl.NumberFormat(I18n.intlLocale, { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(value));
    }
  }
  return I18n.retext(row.detail);
}

function renderSnapshot(snapshot) {
  ui.source.textContent = currentIsExample || snapshot.sourceLabel === I18n.messages.ru.s88 || snapshot.sourceLabel === I18n.messages.en.s88 ? t('s88') : sourceCaption(snapshot.sourceLabel);
  const analyzedDate = new Date(snapshot.analyzedAt);
  ui.date.textContent = Number.isFinite(analyzedDate.getTime()) ? localDate(analyzedDate) : snapshot.analyzedAt || t('s68');
  ui.petState.textContent = I18n.retext(snapshot.pet?.state) || t("s69");
  ui.petStateNote.textContent = Number.isFinite(snapshot.fileCount) ? I18n.count('archive.files', snapshot.fileCount) : I18n.retext(snapshot.pet?.stateNote) || t('s70');
  ui.fieldNote.textContent = I18n.retext(snapshot.fieldNote) || t("s44");
  renderPet(snapshot.pet || {});
  ui.metrics.innerHTML = (snapshot.metrics || []).map((metric) => {
    const score = Math.max(0, Math.min(100, Number(metric.score) || 0));
    const evidence = (metric.evidence || []).map((row) => `<li><span>${escapeHtml(I18n.retext(row.label))}</span><span>${escapeHtml(evidenceDetail(row))}</span></li>`).join('');
    return t("s72", escapeHtml(I18n.retext(metric.label)), score, escapeHtml(I18n.retext(metric.label)), score, score, escapeHtml(metric.evidence?.length ? metric.evidence.slice(0, 2).map(evidenceDetail).join(' · ') : I18n.retext(metric.note)), evidence || t("s71"));
  }).join('');
  const stats = [['fileCount', snapshot.fileCount, t("s73")], ['textBytes', formatBytes(snapshot.textBytes), t("s74")], ['extensionCount', snapshot.extensionCount, t("s75")], ['depth', snapshot.maxDepth, t("s76")]];
  ui.evidenceStats.innerHTML = stats.map(([, value, label]) => `<div class="evidence-stat"><strong>${escapeHtml(typeof value === 'number' ? new Intl.NumberFormat(I18n.intlLocale).format(value) : value)}</strong><span>${escapeHtml(label)}</span></div>`).join('');
  ui.languageList.innerHTML = (snapshot.languages || []).slice(0, 8).map((item) => `<li><span>${escapeHtml(item.name)}</span><em>${new Intl.NumberFormat(I18n.intlLocale).format(item.count)}</em></li>`).join('') || t("s77");
  const markers = snapshot.markers || {};
  ui.markerList.innerHTML = [['readme', markers.readme], [t("s78"), markers.license], [t("s79"), markers.manifests], [t("s80"), markers.tests], [t("s81"), markers.configs], ['ci', markers.ci]].map(([label, value]) => `<li><span>${label}</span><em>${value ? t("s82") : t("s83")}</em></li>`).join('');
}

function renderPet(pet) {
  const clampScore = (value, fallback = 50) => Number.isFinite(Number(value)) ? Math.max(0, Math.min(100, Number(value))) : fallback;
  const color = (value, fallback) => /^#[0-9a-f]{6}$/i.test(value || '') ? value : fallback;
  const energy = clampScore(pet.energy);
  const chaos = clampScore(pet.chaos);
  const accent = color(pet.accent, '#E4A84A');
  const marking = color(pet.marking, '#C95A4A');
  ui.petSvg.style.setProperty('--pet-accent', accent);
  $('#pet-shell').setAttribute('fill', accent);
  $('#pet-marking').setAttribute('fill', marking);
  $('#pet-eye-left').setAttribute('ry', String(10 + Math.round(energy / 100 * 8)));
  $('#pet-eye-right').setAttribute('ry', String(10 + Math.round(energy / 100 * 8)));
  $('#pet-eye-left').setAttribute('rx', String(8 + Math.round(energy / 100 * 5)));
  $('#pet-eye-right').setAttribute('rx', String(8 + Math.round(energy / 100 * 5)));
  $('#pet-aura').setAttribute('opacity', String(.15 + energy / 100 * .3));
  $('#pet-shell').setAttribute('transform', `rotate(${Math.round(chaos / 12 - 4)} 210 210)`);
  $('#pet-tail').setAttribute('stroke', marking);
  const antenna = Number(pet.antenna) || 2;
  $('#pet-antenna-left').setAttribute('r', antenna > 1 ? '10' : '7');
  $('#pet-antenna-right').setAttribute('r', antenna > 1 ? '10' : '7');
  $('#pet-mouth').setAttribute('d', chaos > 65 ? 'M194 227q16 22 32 0' : 'M195 228q15 15 30 0');
}

function setShareHash(snapshot) { try { history.replaceState(null, '', `#share=${encodeSnapshot(snapshot)}`); } catch { /* progressive enhancement */ } }
function restoreShare() {
  if (!location.hash.startsWith('#share=')) return false;
  try { const snapshot = decodeSnapshot(location.hash.slice(7)); currentSnapshot = snapshot; currentSource = snapshot.sourceLabel || t("s84"); renderSnapshot(snapshot); showOnly('journal'); setStatus(t("s85")); ui.reanalyze.disabled = true; return true; }
  catch { showError(new ShareError(t("s86"))); return true; }
}

function beginLocalOperation(label) {
  if (analysisController) analysisController.abort();
  const token = operations.start();
  setBusy(label);
  return token;
}

ui.tryExample.addEventListener('click', async () => {
  const token = beginLocalOperation(t("s87"));
  try { await runAnalysis(exampleEntries, t("s88"), { token }); }
  catch (error) { if (operations.isCurrent(token)) showError(error, token); }
  finally { if (operations.isCurrent(token)) { clearBusy(); operations.finish(token); } }
});

ui.sourceForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const raw = ui.url.value.trim();
  if (!raw) { setStatus(t("s89"), true); ui.url.focus(); return; }
  const token = beginLocalOperation(t("s90"));
  analysisController = new AbortController();
  const controller = analysisController;
  const timeout = setTimeout(() => controller.abort(), 16000);
  try {
    const result = await fetchGitHubArchive(raw, controller.signal);
    if (!operations.isCurrent(token)) return;
    await runAnalysis(result.entries, result.label, { token });
  } catch (error) {
    if (operations.isCurrent(token)) showError(error, token);
  } finally {
    clearTimeout(timeout);
    if (operations.isCurrent(token)) { clearBusy(); operations.finish(token); analysisController = null; }
  }
});

async function handleLocalFiles(fileList, fallbackLabel = t("s91")) {
  const files = Array.from(fileList || []); const file = files[0]; if (!file) return;
  const token = beginLocalOperation(files.length > 1 ? t("s92") : t("s93"));
  try {
    let entries; let label = fallbackLabel;
    if (files.length === 1 && (file.name.toLowerCase().endsWith('.zip') || file.type.includes('zip'))) { entries = await parseZipBlob(file); label = file.name; }
    else { entries = await filesToEntries(files); const root = files.map((item) => item.webkitRelativePath?.split('/')[0]).find(Boolean); label = root ? t("s94", root) : fallbackLabel; }
    if (operations.isCurrent(token)) await runAnalysis(entries, label, { token });
  } catch (error) { if (operations.isCurrent(token)) showError(error, token); }
  finally { ui.fileInput.value = ''; ui.folderInput.value = ''; if (operations.isCurrent(token)) { clearBusy(); operations.finish(token); } }
}

ui.fileInput.addEventListener('change', () => handleLocalFiles(ui.fileInput.files));
ui.folderInput.addEventListener('change', () => handleLocalFiles(ui.folderInput.files, t("s95")));
ui.chooseZip.addEventListener('click', () => ui.fileInput.click());
ui.chooseFolder.addEventListener('click', () => ui.folderInput.click());
ui.dropzone.addEventListener('click', () => ui.fileInput.click());
['dragenter', 'dragover'].forEach((type) => ui.dropzone.addEventListener(type, (event) => { event.preventDefault(); ui.dropzone.classList.add('is-dragging'); }));
['dragleave', 'drop'].forEach((type) => ui.dropzone.addEventListener(type, (event) => { event.preventDefault(); ui.dropzone.classList.remove('is-dragging'); }));
ui.dropzone.addEventListener('drop', async (event) => {
  if (ui.dropzone.disabled) return;
  const files = Array.from(event.dataTransfer.files || []);
  if (files.length === 1 && (files[0].name.toLowerCase().endsWith('.zip') || files[0].type.includes('zip'))) {
    await handleLocalFiles(files);
    return;
  }
  const token = beginLocalOperation(t("s92"));
  try {
    const items = Array.from(event.dataTransfer.items || []);
    const canWalk = items.some((item) => typeof item.webkitGetAsEntry === 'function' && item.webkitGetAsEntry());
    const entries = canWalk ? await readDroppedItems(items) : await filesToEntries(event.dataTransfer.files);
    if (operations.isCurrent(token)) await runAnalysis(entries, t("s95"), { token });
  } catch (error) { if (operations.isCurrent(token)) showError(error, token); }
  finally { if (operations.isCurrent(token)) { clearBusy(); operations.finish(token); } }
});

ui.errorZip.addEventListener('click', () => ui.fileInput.click());
ui.errorReset.addEventListener('click', reset);
ui.reset.addEventListener('click', reset);
ui.reanalyze.addEventListener('click', () => {
  if (!currentEntries) return;
  const token = beginLocalOperation(t("s96"));
  runAnalysis(currentEntries, currentSource, { token }).catch((error) => { if (operations.isCurrent(token)) showError(error, token); }).finally(() => { if (operations.isCurrent(token)) { clearBusy(); operations.finish(token); } });
});
ui.copyShare.addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(location.href); setStatus(t("s97")); }
  catch { setStatus(t("s98"), true); }
});

function exportSvgClone() {
  const svg = ui.petSvg.cloneNode(true); svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg'); svg.setAttribute('width', '840'); svg.setAttribute('height', '720');
  const background = document.createElementNS('http://www.w3.org/2000/svg', 'rect'); background.setAttribute('width', '840'); background.setAttribute('height', '720'); background.setAttribute('fill', '#F3E8D2'); svg.insertBefore(background, svg.firstChild); return svg;
}
ui.exportSvg.addEventListener('click', () => { if (currentSnapshot) { const svg = exportSvgClone(); download(new Blob([`<?xml version="1.0" encoding="UTF-8"?>${svg.outerHTML}`], { type: 'image/svg+xml' }), 'repo-tamagotchi.svg'); } });
ui.exportPng.addEventListener('click', () => {
  if (!currentSnapshot) return;
  const svg = exportSvgClone(); const url = URL.createObjectURL(new Blob([svg.outerHTML], { type: 'image/svg+xml' })); const image = new Image();
  image.onload = () => { const canvas = document.createElement('canvas'); canvas.width = 840; canvas.height = 720; const ctx = canvas.getContext('2d'); if (!ctx) { URL.revokeObjectURL(url); setStatus(t("s99"), true); return; } ctx.drawImage(image, 0, 0); URL.revokeObjectURL(url); canvas.toBlob((png) => png ? download(png, 'repo-tamagotchi.png') : setStatus(t("s100"), true), 'image/png'); };
  image.onerror = () => { URL.revokeObjectURL(url); setStatus(t("s101"), true); }; image.src = url;
});
function download(blob, name) { if (!blob) return; const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = name; link.hidden = true; document.body.appendChild(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
function reset() { currentIsExample = false; if (analysisController) analysisController.abort(); operations.cancel(); currentEntries = null; currentSource = ''; currentSnapshot = null; try { history.replaceState(null, '', location.pathname + location.search); } catch { /* history is optional */ } ui.url.value = ''; ui.fileInput.value = ''; ui.folderInput.value = ''; ui.reanalyze.disabled = false; setStatus(''); clearBusy(); showOnly('empty'); ui.sourcePanel.querySelector('h1')?.focus(); }

// Keep one drawing as the source for both the initial preview and exports.
const exampleResult = analyzeEntries(exampleEntries);
renderPet({ ...exampleResult.pet, ...exampleResult.scores });
const preview = ui.petSvg.cloneNode(true);
preview.removeAttribute('aria-labelledby');
preview.removeAttribute('role');
preview.removeAttribute('id');
preview.querySelectorAll('[id]').forEach(node => node.removeAttribute('id'));
$('#preview-stage').append(preview);

I18n.subscribe(() => {
  const expanded = [...ui.metrics.querySelectorAll('.metric__evidence')].map(node => node.open);
  ui.status.textContent = I18n.retext(ui.status.textContent);
  ui.errorMessage.textContent = I18n.retext(ui.errorMessage.textContent);
  if (currentEntries) currentSnapshot = buildSnapshot(analyzeEntries(currentEntries), currentSource);
  if (currentSnapshot) renderSnapshot(currentSnapshot);
  ui.metrics.querySelectorAll('.metric__evidence').forEach((node, index) => { node.open = Boolean(expanded[index]); });
  const submit = ui.sourceForm.querySelector('button[type="submit"]');
  if (ui.sourceForm.getAttribute('aria-busy') === 'true') submit.textContent = t('s52');
  else submit.innerHTML = t('s53');
});
if (!restoreShare()) showOnly('empty');

