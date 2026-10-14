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
let analysisController = null;
const operations = createOperationGate();

const formatBytes = (bytes) => {
  const value = Math.max(0, Number(bytes) || 0);
  if (value < 1024) return `${new Intl.NumberFormat('ru-RU').format(value)} б`;
  if (value < 1024 * 1024) return `${new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 1 }).format(value / 1024)} кб`;
  return `${new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 1 }).format(value / (1024 * 1024))} мб`;
};
const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const localDate = () => new Intl.DateTimeFormat('ru-RU', { dateStyle: 'long', timeStyle: 'short' }).format(new Date());

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
    : 'источник не получилось прочитать. загрузите zip с компьютера и попробуйте ещё раз.';
  ui.errorMessage.textContent = message;
  setStatus('разбор не завершился. выберите другой источник.', true);
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
  if (submit) { submit.dataset.originalMarkup ||= submit.innerHTML; submit.textContent = 'читаю проект…'; }
}
function clearBusy() {
  ui.sourceForm.setAttribute('aria-busy', 'false');
  ui.tryExample.disabled = false;
  ui.sourceForm.querySelectorAll('button, input, label.button').forEach((node) => {
    node.removeAttribute('aria-disabled');
    if ('disabled' in node) node.disabled = false;
  });
  const submit = ui.sourceForm.querySelector('button[type="submit"]');
  if (submit) submit.innerHTML = submit.dataset.originalMarkup || 'создать питомца <span aria-hidden="true">↗</span>';
}

function buildSnapshot(result, sourceLabel) {
  const summary = result.summary || {};
  const metricLabels = { energy: 'энергия', curiosity: 'любопытство', resilience: 'устойчивость', chaos: 'хаос', experience: 'опыт' };
  const metrics = Object.entries(result.scores || {}).map(([key, score]) => {
    const rows = (result.signals?.[key] || []).map(row => row.key === 'bytes'
      ? { ...row, detail: `объём текста: ${formatBytes(summary.textBytes ?? summary.bytes).toLocaleLowerCase('ru-RU')}` }
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
  const moodLabels = { quiet: 'спокоен', steady: 'собран', bright: 'живой', wild: 'буйный' };
  const mood = moodLabels[result.pet?.mood] || 'спокоен';
  return {
    sourceLabel: String(sourceLabel || 'источник не указан'), analyzedAt: localDate(), fileCount: summary.files || 0,
    textBytes: summary.textBytes ?? summary.bytes ?? 0, extensionCount: summary.extensions || 0, maxDepth: summary.maxDepth || 0,
    languages: languageRows, markers, metrics,
    pet: { ...result.pet, energy: result.scores?.energy ?? avg, curiosity: result.scores?.curiosity ?? avg, chaos: result.scores?.chaos ?? avg, state: mood, stateNote: `в архиве ${summary.files || 0} текстовых файлов.` },
    fieldNote: 'характер описывает структуру файлов. по нему нельзя судить о качестве кода или возрасте проекта.',
  };
}

async function runAnalysis(entries, sourceLabel, { updateHash = true, token } = {}) {
  if (!entries?.length) throw new SourceError('empty', 'в источнике нет файлов для анализа. выберите другой zip или папку.');
  if (token !== undefined && !operations.isCurrent(token)) return;
  await new Promise((resolve) => requestAnimationFrame(resolve));
  if (token !== undefined && !operations.isCurrent(token)) return;
  const result = analyzeEntries(entries);
  if (!result?.summary?.files) throw new SourceError('empty', 'после фильтрации не осталось текстовых файлов. проверьте zip или выберите другую папку.');
  if (token !== undefined && !operations.isCurrent(token)) return;
  currentEntries = entries;
  currentSource = sourceLabel;
  currentSnapshot = buildSnapshot(result, sourceLabel);
  renderSnapshot(currentSnapshot);
  if (updateHash) setShareHash(currentSnapshot);
  showOnly('journal');
  setStatus('');
  ui.journal.querySelector('h2')?.focus();
}

function renderSnapshot(snapshot) {
  ui.source.textContent = snapshot.sourceLabel || 'источник не указан';
  ui.date.textContent = snapshot.analyzedAt || 'локальное время';
  ui.petState.textContent = snapshot.pet?.state || 'неизвестный';
  ui.petStateNote.textContent = snapshot.pet?.stateNote || 'состояние рассчитано по структуре архива.';
  ui.fieldNote.textContent = snapshot.fieldNote || 'характер описывает структуру файлов. по нему нельзя судить о качестве кода или возрасте проекта.';
  renderPet(snapshot.pet || {});
  ui.metrics.innerHTML = (snapshot.metrics || []).map((metric) => {
    const score = Math.max(0, Math.min(100, Number(metric.score) || 0));
    const evidence = (metric.evidence || []).map((row) => `<li><span>${escapeHtml(row.label)}</span><span>${escapeHtml(row.detail)}</span></li>`).join('');
    return `<li class="metric"><div class="metric__top"><span class="metric__name">${escapeHtml(metric.label)}</span><span class="metric__score">${score}</span></div><div class="metric__bar" role="progressbar" aria-label="${escapeHtml(metric.label)}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${score}"><div class="metric__fill" style="width:${score}%"></div></div><p class="metric__note">${escapeHtml(metric.note)}</p><details class="metric__evidence"><summary>что повлияло</summary><ul>${evidence || '<li><span>сигналы</span><span>нет данных</span></li>'}</ul></details></li>`;
  }).join('');
  const stats = [['fileCount', snapshot.fileCount, 'файлов'], ['textBytes', formatBytes(snapshot.textBytes), 'объём текста'], ['extensionCount', snapshot.extensionCount, 'расширений'], ['depth', snapshot.maxDepth, 'макс. глубина']];
  ui.evidenceStats.innerHTML = stats.map(([, value, label]) => `<div class="evidence-stat"><strong>${escapeHtml(value)}</strong><span>${escapeHtml(label)}</span></div>`).join('');
  ui.languageList.innerHTML = (snapshot.languages || []).slice(0, 8).map((item) => `<li><span>${escapeHtml(item.name.toLocaleLowerCase('ru-RU'))}</span><em>${item.count}</em></li>`).join('') || '<li><span>языки не распознаны</span><em>нет</em></li>';
  const markers = snapshot.markers || {};
  ui.markerList.innerHTML = [['readme', markers.readme], ['лицензия', markers.license], ['манифест', markers.manifests], ['тесты', markers.tests], ['конфиги', markers.configs], ['ci', markers.ci]].map(([label, value]) => `<li><span>${label}</span><em>${value ? 'есть' : 'нет'}</em></li>`).join('');
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
  try { const snapshot = decodeSnapshot(location.hash.slice(7)); currentSnapshot = snapshot; currentSource = snapshot.sourceLabel || 'снимок'; renderSnapshot(snapshot); showOnly('journal'); setStatus('снимок восстановлен. его можно отправить этой ссылкой.'); ui.reanalyze.disabled = true; return true; }
  catch { showError(new ShareError('ссылка повреждена. загрузите источник заново, чтобы собрать новый снимок.')); return true; }
}

function beginLocalOperation(label) {
  if (analysisController) analysisController.abort();
  const token = operations.start();
  setBusy(label);
  return token;
}

ui.tryExample.addEventListener('click', async () => {
  const token = beginLocalOperation('собираю питомца из примера');
  try { await runAnalysis(exampleEntries, 'пример: small garden', { token }); }
  catch (error) { if (operations.isCurrent(token)) showError(error, token); }
  finally { if (operations.isCurrent(token)) { clearBusy(); operations.finish(token); } }
});

ui.sourceForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const raw = ui.url.value.trim();
  if (!raw) { setStatus('вставьте ссылку github.com/owner/repo или выберите zip.', true); ui.url.focus(); return; }
  const token = beginLocalOperation('скачиваю публичный архив github');
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

async function handleLocalFiles(fileList, fallbackLabel = 'локальный источник') {
  const files = Array.from(fileList || []); const file = files[0]; if (!file) return;
  const token = beginLocalOperation(files.length > 1 ? 'читаю файлы папки' : 'читаю локальный файл');
  try {
    let entries; let label = fallbackLabel;
    if (files.length === 1 && (file.name.toLowerCase().endsWith('.zip') || file.type.includes('zip'))) { entries = await parseZipBlob(file); label = file.name; }
    else { entries = await filesToEntries(files); const root = files.map((item) => item.webkitRelativePath?.split('/')[0]).find(Boolean); label = root ? `папка: ${root}` : fallbackLabel; }
    if (operations.isCurrent(token)) await runAnalysis(entries, label, { token });
  } catch (error) { if (operations.isCurrent(token)) showError(error, token); }
  finally { ui.fileInput.value = ''; ui.folderInput.value = ''; if (operations.isCurrent(token)) { clearBusy(); operations.finish(token); } }
}

ui.fileInput.addEventListener('change', () => handleLocalFiles(ui.fileInput.files));
ui.folderInput.addEventListener('change', () => handleLocalFiles(ui.folderInput.files, 'локальная папка'));
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
  const token = beginLocalOperation('читаю файлы папки');
  try {
    const items = Array.from(event.dataTransfer.items || []);
    const canWalk = items.some((item) => typeof item.webkitGetAsEntry === 'function' && item.webkitGetAsEntry());
    const entries = canWalk ? await readDroppedItems(items) : await filesToEntries(event.dataTransfer.files);
    if (operations.isCurrent(token)) await runAnalysis(entries, 'локальная папка', { token });
  } catch (error) { if (operations.isCurrent(token)) showError(error, token); }
  finally { if (operations.isCurrent(token)) { clearBusy(); operations.finish(token); } }
});

ui.errorZip.addEventListener('click', () => ui.fileInput.click());
ui.errorReset.addEventListener('click', reset);
ui.reset.addEventListener('click', reset);
ui.reanalyze.addEventListener('click', () => {
  if (!currentEntries) return;
  const token = beginLocalOperation('повторяю разбор');
  runAnalysis(currentEntries, currentSource, { token }).catch((error) => { if (operations.isCurrent(token)) showError(error, token); }).finally(() => { if (operations.isCurrent(token)) { clearBusy(); operations.finish(token); } });
});
ui.copyShare.addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(location.href); setStatus('снимок скопирован. в ссылке сохранён только результат.'); }
  catch { setStatus('скопируйте адрес из строки браузера. снимок уже сохранён в ссылке.', true); }
});

function exportSvgClone() {
  const svg = ui.petSvg.cloneNode(true); svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg'); svg.setAttribute('width', '840'); svg.setAttribute('height', '720');
  const background = document.createElementNS('http://www.w3.org/2000/svg', 'rect'); background.setAttribute('width', '840'); background.setAttribute('height', '720'); background.setAttribute('fill', '#F3E8D2'); svg.insertBefore(background, svg.firstChild); return svg;
}
ui.exportSvg.addEventListener('click', () => { if (currentSnapshot) { const svg = exportSvgClone(); download(new Blob([`<?xml version="1.0" encoding="UTF-8"?>${svg.outerHTML}`], { type: 'image/svg+xml' }), 'repo-tamagotchi.svg'); } });
ui.exportPng.addEventListener('click', () => {
  if (!currentSnapshot) return;
  const svg = exportSvgClone(); const url = URL.createObjectURL(new Blob([svg.outerHTML], { type: 'image/svg+xml' })); const image = new Image();
  image.onload = () => { const canvas = document.createElement('canvas'); canvas.width = 840; canvas.height = 720; const ctx = canvas.getContext('2d'); if (!ctx) { URL.revokeObjectURL(url); setStatus('png не удалось подготовить в этом браузере.', true); return; } ctx.drawImage(image, 0, 0); URL.revokeObjectURL(url); canvas.toBlob((png) => png ? download(png, 'repo-tamagotchi.png') : setStatus('png не удалось сохранить.', true), 'image/png'); };
  image.onerror = () => { URL.revokeObjectURL(url); setStatus('svg не удалось преобразовать в png.', true); }; image.src = url;
});
function download(blob, name) { if (!blob) return; const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = name; link.hidden = true; document.body.appendChild(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
function reset() { if (analysisController) analysisController.abort(); operations.cancel(); currentEntries = null; currentSource = ''; currentSnapshot = null; history.replaceState(null, '', location.pathname + location.search); ui.url.value = ''; ui.fileInput.value = ''; ui.folderInput.value = ''; ui.reanalyze.disabled = false; setStatus(''); clearBusy(); showOnly('empty'); ui.sourcePanel.querySelector('h1')?.focus(); }

// Keep one drawing as the source for both the initial preview and exports.
const exampleResult = analyzeEntries(exampleEntries);
renderPet({ ...exampleResult.pet, ...exampleResult.scores });
const preview = ui.petSvg.cloneNode(true);
preview.removeAttribute('aria-labelledby');
preview.removeAttribute('role');
preview.removeAttribute('id');
preview.querySelectorAll('[id]').forEach(node => node.removeAttribute('id'));
$('#preview-stage').append(preview);

if (!restoreShare()) showOnly('empty');

