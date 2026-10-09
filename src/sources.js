const SKIP_PARTS = new Set(['.git', 'node_modules', 'dist', 'build', 'out', 'coverage', '.next', '.nuxt', '.cache', 'vendor']);
const BINARY_EXTENSIONS = new Set(['png','jpg','jpeg','gif','webp','ico','bmp','tiff','avif','mp3','wav','ogg','mp4','mov','avi','mkv','webm','pdf','zip','gz','tar','7z','rar','woff','woff2','ttf','otf','eot','exe','dll','so','dylib','dmg','class','jar','wasm','pyc','bin','lockb']);

export const MAX_ZIP_ENTRIES = 10_000;
export const MAX_ZIP_UNCOMPRESSED_BYTES = 64 * 1024 * 1024;
export const ZIP_LIMITS = Object.freeze({ maxEntries: MAX_ZIP_ENTRIES, maxUncompressedBytes: MAX_ZIP_UNCOMPRESSED_BYTES });

export class SourceError extends Error {
  constructor(code, message) { super(message); this.name = 'SourceError'; this.code = code; }
}

export function parseGitHubUrl(raw) {
  const value = String(raw || '').trim();
  if (!value || /[\s?#]/.test(value)) {
    throw new SourceError('invalid-url', 'введите публичную ссылку вида github.com/owner/repo.');
  }
  const candidate = /^(?:https?:\/\/)/i.test(value) ? value : `https://${value}`;
  const authority = candidate.match(/^[a-z][a-z\d+.-]*:\/\/([^/]+)/i)?.[1] || '';
  if (authority.includes(':')) throw new SourceError('invalid-url', 'введите публичную ссылку вида github.com/owner/repo.');
  let url;
  try { url = new URL(candidate); } catch { throw new SourceError('invalid-url', 'введите публичную ссылку вида github.com/owner/repo.'); }
  const hostname = url.hostname.toLowerCase();
  if (!['github.com', 'www.github.com'].includes(hostname) || !['http:', 'https:'].includes(url.protocol) || url.port || url.username || url.password || url.search || url.hash) {
    throw new SourceError('invalid-url', 'введите публичную ссылку вида github.com/owner/repo.');
  }
  const match = url.pathname.match(/^\/([A-Za-z0-9][A-Za-z0-9-]{0,38})\/([A-Za-z0-9][A-Za-z0-9._-]{0,99})(?:\.git)?\/?$/);
  if (!match) throw new SourceError('invalid-url', 'введите публичную ссылку вида github.com/owner/repo.');
  return { owner: match[1], repo: match[2].replace(/\.git$/i, '') };
}

export async function fetchGitHubArchive(raw, signal) {
  const { owner, repo } = parseGitHubUrl(raw);
  const url = `https://codeload.github.com/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/zip/HEAD`;
  let response;
  try {
    response = await fetch(url, { mode: 'cors', signal, headers: { Accept: 'application/zip' } });
  } catch (error) {
    if (error?.name === 'AbortError') throw new SourceError('timeout', 'GitHub не ответил вовремя. скачайте ZIP репозитория и загрузите его здесь.');
    throw new SourceError('network', 'сеть или CORS не пропустили архив. скачайте ZIP репозитория и загрузите его здесь.');
  }
  if (!response.ok) {
    if (response.status === 403 || response.status === 429) throw new SourceError('limit', 'GitHub ограничил запрос. скачайте ZIP репозитория и загрузите его здесь.');
    if (response.status === 404) throw new SourceError('not-found', 'репозиторий не найден или закрыт. проверьте ссылку или загрузите ZIP.');
    throw new SourceError('http', `GitHub вернул ошибку ${response.status}. скачайте ZIP репозитория и загрузите его здесь.`);
  }
  const blob = await response.blob();
  if (!blob.size) throw new SourceError('empty', 'архив пуст. скачайте ZIP ещё раз или выберите другой источник.');
  const entries = await parseZipBlob(blob);
  return { entries, label: `${owner}/${repo}`, kind: 'github', rawUrl: raw };
}

export async function parseZipBlob(blob) {
  let bytes;
  try { bytes = new Uint8Array(await blob.arrayBuffer()); }
  catch { throw new SourceError('corrupt', 'ZIP не удалось прочитать в браузере.'); }
  return parseZipBytes(bytes);
}

export async function inflateRaw(bytes, maxBytes = MAX_ZIP_UNCOMPRESSED_BYTES) {
  if (typeof DecompressionStream === 'undefined') throw new SourceError('unsupported', 'этот браузер не умеет распаковывать ZIP. попробуйте свежий Chrome, Safari или Firefox.');
  try {
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
    const reader = stream.getReader();
    const chunks = [];
    let total = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        total += value.byteLength;
        if (total > maxBytes) {
          await reader.cancel();
          throw new SourceError('limit', 'распакованный файл в ZIP превысил допустимый размер.');
        }
        chunks.push(value);
      }
    } finally {
      reader.releaseLock();
    }
    const output = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) { output.set(chunk, offset); offset += chunk.byteLength; }
    return output;
  } catch (error) {
    if (error instanceof SourceError) throw error;
    throw new SourceError('corrupt', 'в ZIP встретилась повреждённая сжатая запись.');
  }
}

export async function parseZipBytes(bytes) {
  if (!(bytes instanceof Uint8Array)) {
    try { bytes = new Uint8Array(bytes); } catch { throw new SourceError('corrupt', 'ZIP не удалось прочитать в браузере.'); }
  }
  if (bytes.length < 22) throw new SourceError('corrupt', 'это не похоже на ZIP-архив или архив повреждён.');
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let eocd = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 22 - 65535); i--) {
    if (view.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new SourceError('corrupt', 'это не похоже на ZIP-архив или архив повреждён.');
  const commentLength = view.getUint16(eocd + 20, true);
  if (eocd + 22 + commentLength > bytes.length) throw new SourceError('corrupt', 'конец ZIP повреждён, файл нельзя разобрать.');
  if (view.getUint16(eocd + 4, true) !== 0 || view.getUint16(eocd + 6, true) !== 0) throw new SourceError('unsupported', 'многотомные ZIP-архивы не поддерживаются.');
  const count = view.getUint16(eocd + 10, true);
  if (count > MAX_ZIP_ENTRIES) throw new SourceError('limit', `в ZIP слишком много записей (не больше ${MAX_ZIP_ENTRIES.toLocaleString('ru-RU')}).`);
  const centralOffset = view.getUint32(eocd + 16, true);
  const centralSize = view.getUint32(eocd + 12, true);
  if (!count) throw new SourceError('empty', 'в ZIP нет файлов для анализа.');
  if (centralOffset > bytes.length || centralSize > bytes.length - centralOffset || centralOffset + centralSize > eocd) throw new SourceError('corrupt', 'таблица ZIP находится за пределами файла.');
  const entries = [];
  let totalUncompressed = 0;
  let cursor = centralOffset;
  const decoder = new TextDecoder();
  for (let index = 0; index < count; index++) {
    if (cursor + 46 > centralOffset + centralSize || view.getUint32(cursor, true) !== 0x02014b50) throw new SourceError('corrupt', 'таблица ZIP повреждена, файл нельзя разобрать.');
    const recordStart = cursor;
    const method = view.getUint16(cursor + 10, true);
    const flags = view.getUint16(cursor + 8, true);
    const compressedSize = view.getUint32(cursor + 20, true);
    const uncompressedSize = view.getUint32(cursor + 24, true);
    const nameLength = view.getUint16(cursor + 28, true);
    const extraLength = view.getUint16(cursor + 30, true);
    const commentLength = view.getUint16(cursor + 32, true);
    const localOffset = view.getUint32(cursor + 42, true);
    const recordLength = 46 + nameLength + extraLength + commentLength;
    if (recordLength > bytes.length - recordStart || recordStart + recordLength > centralOffset + centralSize) throw new SourceError('corrupt', 'таблица ZIP содержит обрезанную запись.');
    const name = decoder.decode(bytes.slice(cursor + 46, cursor + 46 + nameLength));
    cursor = recordStart + recordLength;
    if (flags & 1) throw new SourceError('unsupported', 'зашифрованные ZIP-записи не поддерживаются.');
    if (method !== 0 && method !== 8) throw new SourceError('unsupported', `метод сжатия ZIP (${method}) не поддерживается.`);
    if (uncompressedSize > MAX_ZIP_UNCOMPRESSED_BYTES || totalUncompressed > MAX_ZIP_UNCOMPRESSED_BYTES - uncompressedSize) throw new SourceError('limit', `размер ZIP после распаковки не должен превышать ${Math.round(MAX_ZIP_UNCOMPRESSED_BYTES / (1024 * 1024))} МБ.`);
    if (!name || name.endsWith('/')) continue;
    if (localOffset > bytes.length || localOffset + 30 > bytes.length || view.getUint32(localOffset, true) !== 0x04034b50) throw new SourceError('corrupt', 'локальная запись ZIP повреждена.');
    const localFlags = view.getUint16(localOffset + 6, true);
    const localMethod = view.getUint16(localOffset + 8, true);
    if (localFlags & 1) throw new SourceError('unsupported', 'зашифрованные ZIP-записи не поддерживаются.');
    if (localMethod !== method) throw new SourceError('corrupt', 'методы сжатия в ZIP-записи не совпадают.');
    const localNameLength = view.getUint16(localOffset + 26, true);
    const localExtraLength = view.getUint16(localOffset + 28, true);
    const start = localOffset + 30 + localNameLength + localExtraLength;
    if (start > bytes.length || compressedSize > bytes.length - start) throw new SourceError('corrupt', 'ZIP содержит обрезанные данные файла.');
    const compressed = bytes.slice(start, start + compressedSize);
    let content;
    if (method === 0) content = compressed;
    else if (method === 8) content = await inflateRaw(compressed, Math.min(MAX_ZIP_UNCOMPRESSED_BYTES - totalUncompressed, uncompressedSize));
    if (content.length !== uncompressedSize) throw new SourceError('corrupt', 'размер распакованного файла в ZIP не совпадает с заголовком.');
    totalUncompressed += content.length;
    entries.push({ path: normalizePath(name), bytes: content });
  }
  if (!entries.length) throw new SourceError('empty', 'в ZIP нет файлов для анализа.');
  return entries;
}

export async function filesToEntries(fileList) {
  const files = Array.from(fileList || []).filter((file) => file && file.size >= 0);
  if (!files.length) throw new SourceError('empty', 'папка пуста, файлов для анализа не нашлось.');
  if (files.length > MAX_ZIP_ENTRIES) throw new SourceError('limit', `в папке слишком много файлов (не больше ${MAX_ZIP_ENTRIES.toLocaleString('ru-RU')}).`);
  const entries = [];
  let totalBytes = 0;
  for (const file of files) {
    if (file.size > MAX_ZIP_UNCOMPRESSED_BYTES || totalBytes > MAX_ZIP_UNCOMPRESSED_BYTES - file.size) throw new SourceError('limit', `размер файлов не должен превышать ${Math.round(MAX_ZIP_UNCOMPRESSED_BYTES / (1024 * 1024))} МБ.`);
    let bytes;
    try { bytes = new Uint8Array(await file.arrayBuffer()); }
    catch { throw new SourceError('corrupt', 'локальный файл не получилось прочитать в браузере.'); }
    totalBytes += bytes.length;
    entries.push({ path: normalizePath(file.webkitRelativePath || file.name), bytes });
  }
  return entries;
}

export async function readDroppedItems(items) {
  const files = [];
  const walk = (entry, prefix = '') => new Promise((resolve, reject) => {
    if (entry.isFile) {
      entry.file((file) => { files.push(Object.assign(file, { webkitRelativePath: `${prefix}${file.name}` })); resolve(); }, reject);
      return;
    }
    if (entry.isDirectory) {
      const reader = entry.createReader();
      const readBatch = () => reader.readEntries(async (batch) => {
        if (!batch.length) { resolve(); return; }
        try { for (const child of batch) await walk(child, `${prefix}${entry.name}/`); readBatch(); } catch (error) { reject(error); }
      }, reject);
      readBatch();
      return;
    }
    resolve();
  });
  for (const item of Array.from(items || [])) {
    const entry = item.webkitGetAsEntry?.();
    if (entry) await walk(entry);
  }
  return filesToEntries(files);
}

export function normalizePath(path) { return String(path || '').replaceAll('\\', '/').replace(/^\.\//, '').replace(/\/+/g, '/'); }
export function isIgnoredPath(path) {
  const parts = normalizePath(path).split('/');
  return parts.some((part) => SKIP_PARTS.has(part.toLowerCase()));
}
export function isBinaryPath(path) {
  const name = normalizePath(path).split('/').pop() || '';
  const ext = name.includes('.') ? name.split('.').pop().toLowerCase() : '';
  return BINARY_EXTENSIONS.has(ext);
}
