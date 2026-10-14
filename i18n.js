/* Local interface messages. No service, network request or data migration. */
(function (global) {
  'use strict';
  const messages = {
  "ru": {
    "s1": "посмотрите на структуру репозитория как на маленького питомца с характером.",
    "s2": "repo tamagotchi: питомец из вашего проекта",
    "s3": "загрузите репозиторий и познакомьтесь с его питомцем. всё работает в браузере.",
    "s4": "к содержимому",
    "s5": "repo tamagotchi, на главную",
    "s6": "как это устроено",
    "s7": "превратите репозиторий в питомца",
    "s8": "загрузите проект. его файлы, языки и настройки определят внешность и характер маленького существа.",
    "s9": "ссылка на публичный репозиторий",
    "s10": "создать питомца",
    "s11": "адрес github можно вставить без https://",
    "s12": "или с компьютера",
    "s13": "локальные источники",
    "s14": "загрузить zip",
    "s15": "выбрать папку",
    "s16": "перетащите zip или папку сюда",
    "s17": "до 64 мб после распаковки",
    "s18": "локальные файлы остаются в браузере. ссылка на github открывает только публичный архив.",
    "s19": "пример питомца",
    "s20": "разные проекты дают разных питомцев.",
    "s21": "посмотреть пример",
    "s22": "не получилось прочитать источник",
    "s23": "загрузить другой zip",
    "s24": "начать сначала",
    "s25": "ваш питомец",
    "s26": "питомец по сигналам репозитория",
    "s27": "питомец из структуры репозитория",
    "s28": "векторная фигурка, которая меняется вместе с сигналами структуры",
    "s29": "готов к знакомству",
    "s30": "сначала принесите репозиторий.",
    "s31": "сигналы характера",
    "s32": "сигналы характера питомца",
    "s33": "как считается характер",
    "s34": "характеристики зависят от файлов, языков, документации, тестов и настроек. одинаковый архив всегда даёт одинаковый результат. формула описана в",
    "s35": "действия с питомцем",
    "s36": "поделиться снимком",
    "s37": "скачать svg",
    "s38": "скачать png",
    "s39": "пересчитать",
    "s40": "другой проект",
    "s41": "внутри проекта",
    "s42": "языки",
    "s43": "документы и правила",
    "s44": "характер описывает структуру файлов. по нему нельзя судить о качестве кода или возрасте проекта.",
    "s45": "код на github",
    "s46": "приватность и ограничения",
    "s47": "{0} б",
    "s48": "{0} кб",
    "s49": "{0} мб",
    "s50": "источник не получилось прочитать. загрузите zip с компьютера и попробуйте ещё раз.",
    "s51": "разбор не завершился. выберите другой источник.",
    "s52": "читаю проект…",
    "s53": "создать питомца <span aria-hidden=\"true\">↗</span>",
    "s54": "энергия",
    "s55": "любопытство",
    "s56": "устойчивость",
    "s57": "хаос",
    "s58": "опыт",
    "s59": "объём текста: {0}",
    "s60": "спокоен",
    "s61": "собран",
    "s62": "живой",
    "s63": "буйный",
    "s64": "источник не указан",
    "s65": "в архиве {0} текстовых файлов.",
    "s66": "в источнике нет файлов для анализа. выберите другой zip или папку.",
    "s67": "после фильтрации не осталось текстовых файлов. проверьте zip или выберите другую папку.",
    "s68": "локальное время",
    "s69": "неизвестный",
    "s70": "состояние рассчитано по структуре архива.",
    "s71": "<li><span>сигналы</span><span>нет данных</span></li>",
    "s72": "<li class=\"metric\"><div class=\"metric__top\"><span class=\"metric__name\">{0}</span><span class=\"metric__score\">{1}</span></div><div class=\"metric__bar\" role=\"progressbar\" aria-label=\"{2}\" aria-valuemin=\"0\" aria-valuemax=\"100\" aria-valuenow=\"{3}\"><div class=\"metric__fill\" style=\"width:{4}%\"></div></div><p class=\"metric__note\">{5}</p><details class=\"metric__evidence\"><summary>что повлияло</summary><ul>{6}</ul></details></li>",
    "s73": "файлов",
    "s74": "объём текста",
    "s75": "расширений",
    "s76": "макс. глубина",
    "s77": "<li><span>языки не распознаны</span><em>нет</em></li>",
    "s78": "лицензия",
    "s79": "манифест",
    "s80": "тесты",
    "s81": "конфиги",
    "s82": "есть",
    "s83": "нет",
    "s84": "снимок",
    "s85": "снимок восстановлен. его можно отправить этой ссылкой.",
    "s86": "ссылка повреждена. загрузите источник заново, чтобы собрать новый снимок.",
    "s87": "собираю питомца из примера",
    "s88": "пример: small garden",
    "s89": "вставьте ссылку github.com/owner/repo или выберите zip.",
    "s90": "скачиваю публичный архив github",
    "s91": "локальный источник",
    "s92": "читаю файлы папки",
    "s93": "читаю локальный файл",
    "s94": "папка: {0}",
    "s95": "локальная папка",
    "s96": "повторяю разбор",
    "s97": "снимок скопирован. в ссылке сохранён только результат.",
    "s98": "скопируйте адрес из строки браузера. снимок уже сохранён в ссылке.",
    "s99": "png не удалось подготовить в этом браузере.",
    "s100": "png не удалось сохранить.",
    "s101": "svg не удалось преобразовать в png.",
    "s102": "папка docs",
    "s103": "документация: {0}",
    "s104": "документация не найдена",
    "s105": "файлы",
    "s106": "файлов: {0}",
    "s107": "объём текста: {0} байт",
    "s108": "исходники и задачи",
    "s109": "исходный код: {0} · скрипты: {1}",
    "s110": "языков: {0}",
    "s111": "расширения",
    "s112": "расширений: {0}",
    "s113": "следы документации",
    "s114": "примеры и notebooks",
    "s115": "файлов с примерами: {0}",
    "s116": "тестовых файлов: {0}",
    "s117": "непрерывная проверка",
    "s118": "файлы ci найдены",
    "s119": "файлы ci не найдены",
    "s120": "настройки",
    "s121": "конфигов: {0}",
    "s122": "зафиксированные зависимости",
    "s123": "lock-файлов: {0}",
    "s124": "lock-файлов нет",
    "s125": "разнообразие расширений",
    "s126": "разнообразие расширений: {0}",
    "s127": "глубина путей",
    "s128": "средняя глубина папок: {0}",
    "s129": "файлы в корне",
    "s130": "файлов в корне: {0}",
    "s131": "неясные расширения",
    "s132": "без понятного расширения: {0}",
    "s133": "файлы пакетов",
    "s134": "файлов пакетов: {0}",
    "s135": "лицензия найдена",
    "s136": "лицензия не найдена",
    "s137": "тесты и ci",
    "s138": "тестов: {0} · файлов ci: {1}",
    "s139": "введите публичную ссылку вида github.com/owner/repo.",
    "s140": "github не ответил вовремя. скачайте zip репозитория и загрузите его здесь.",
    "s141": "сеть или cors не пропустили архив. скачайте zip репозитория и загрузите его здесь.",
    "s142": "github ограничил запрос. скачайте zip репозитория и загрузите его здесь.",
    "s143": "репозиторий не найден или закрыт. проверьте ссылку или загрузите zip.",
    "s144": "github вернул ошибку {0}. скачайте zip репозитория и загрузите его здесь.",
    "s145": "архив пуст. скачайте zip ещё раз или выберите другой источник.",
    "s146": "zip не удалось прочитать в браузере.",
    "s147": "этот браузер не умеет распаковывать zip. попробуйте свежий chrome, safari или firefox.",
    "s148": "распакованный файл в zip превысил допустимый размер.",
    "s149": "в zip встретилась повреждённая сжатая запись.",
    "s150": "это не похоже на zip-архив или архив повреждён.",
    "s151": "конец zip повреждён, файл нельзя разобрать.",
    "s152": "многотомные zip-архивы не поддерживаются.",
    "s153": "в zip слишком много записей (не больше {0}).",
    "s154": "в zip нет файлов для анализа.",
    "s155": "таблица zip находится за пределами файла.",
    "s156": "таблица zip повреждена, файл нельзя разобрать.",
    "s157": "таблица zip содержит обрезанную запись.",
    "s158": "зашифрованные zip-записи не поддерживаются.",
    "s159": "метод сжатия zip ({0}) не поддерживается.",
    "s160": "размер zip после распаковки не должен превышать {0} мб.",
    "s161": "локальная запись zip повреждена.",
    "s162": "методы сжатия в zip-записи не совпадают.",
    "s163": "zip содержит обрезанные данные файла.",
    "s164": "размер распакованного файла в zip не совпадает с заголовком.",
    "s165": "папка пуста, файлов для анализа не нашлось.",
    "s166": "в папке слишком много файлов (не больше {0}).",
    "s167": "размер файлов не должен превышать {0} мб.",
    "s168": "локальный файл не получилось прочитать в браузере.",
    "s169": "снимок ссылки повреждён.",
    "archive.files.one": "в архиве {0} текстовый файл.",
    "archive.files.few": "в архиве {0} текстовых файла.",
    "archive.files.many": "в архиве {0} текстовых файлов.",
    "archive.files.other": "в архиве {0} текстовых файлов.",
    "link.character": "https://github.com/chebaturkin/repo-tamagotchi/blob/main/README.ru.md#как-считается-характер",
    "link.privacy": "https://github.com/chebaturkin/repo-tamagotchi/blob/main/README.ru.md#приватность-и-ограничения"
  },
  "en": {
    "s1": "see your repository's structure as a small pet with a character of its own.",
    "s2": "repo tamagotchi: a pet from your project",
    "s3": "load a repository and meet its pet. everything runs in your browser.",
    "s4": "skip to content",
    "s5": "repo tamagotchi, home",
    "s6": "how it works",
    "s7": "turn a repository into a pet",
    "s8": "load a project. its files, languages and settings shape a little creature's appearance and character.",
    "s9": "public repository link",
    "s10": "create a pet",
    "s11": "you can paste a github address without https://",
    "s12": "or from your computer",
    "s13": "local sources",
    "s14": "upload zip",
    "s15": "choose folder",
    "s16": "drop a zip or folder here",
    "s17": "up to 64 mb after unpacking",
    "s18": "local files stay in your browser. a github link opens only the public archive.",
    "s19": "example pet",
    "s20": "different projects make different pets.",
    "s21": "see an example",
    "s22": "could not read the source",
    "s23": "upload another zip",
    "s24": "start again",
    "s25": "your pet",
    "s26": "pet based on repository signals",
    "s27": "a pet from a repository's structure",
    "s28": "a vector creature that changes with structural signals",
    "s29": "ready to meet you",
    "s30": "bring a repository first.",
    "s31": "character signals",
    "s32": "pet character signals",
    "s33": "how character is calculated",
    "s34": "traits depend on files, languages, documentation, tests and settings. the same archive always gives the same result. the formula is in the",
    "s35": "pet actions",
    "s36": "share snapshot",
    "s37": "download svg",
    "s38": "download png",
    "s39": "recalculate",
    "s40": "another project",
    "s41": "inside the project",
    "s42": "languages",
    "s43": "documents and rules",
    "s44": "character describes file structure. it cannot tell you the quality of the code or the age of the project.",
    "s45": "code on github",
    "s46": "privacy and limits",
    "s47": "{0} b",
    "s48": "{0} kb",
    "s49": "{0} mb",
    "s50": "could not read the source. upload a zip from your computer and try again.",
    "s51": "analysis did not finish. choose another source.",
    "s52": "reading the project…",
    "s53": "create a pet <span aria-hidden=\"true\">↗</span>",
    "s54": "energy",
    "s55": "curiosity",
    "s56": "resilience",
    "s57": "chaos",
    "s58": "experience",
    "s59": "text size: {0}",
    "s60": "quiet",
    "s61": "steady",
    "s62": "bright",
    "s63": "wild",
    "s64": "source not specified",
    "s65": "the archive contains {0} text files.",
    "s66": "no files to analyze in this source. choose another zip or folder.",
    "s67": "no text files remain after filtering. check the zip or choose another folder.",
    "s68": "local time",
    "s69": "unknown",
    "s70": "state calculated from the archive structure.",
    "s71": "<li><span>signals</span><span>no data</span></li>",
    "s72": "<li class=\"metric\"><div class=\"metric__top\"><span class=\"metric__name\">{0}</span><span class=\"metric__score\">{1}</span></div><div class=\"metric__bar\" role=\"progressbar\" aria-label=\"{2}\" aria-valuemin=\"0\" aria-valuemax=\"100\" aria-valuenow=\"{3}\"><div class=\"metric__fill\" style=\"width:{4}%\"></div></div><p class=\"metric__note\">{5}</p><details class=\"metric__evidence\"><summary>what shaped it</summary><ul>{6}</ul></details></li>",
    "s73": "files",
    "s74": "text size",
    "s75": "extensions",
    "s76": "max. depth",
    "s77": "<li><span>languages not recognized</span><em>none</em></li>",
    "s78": "license",
    "s79": "manifest",
    "s80": "tests",
    "s81": "configs",
    "s82": "present",
    "s83": "absent",
    "s84": "snapshot",
    "s85": "snapshot restored. you can share it with this link.",
    "s86": "the link is damaged. load the source again to create a new snapshot.",
    "s87": "building a pet from the example",
    "s88": "example: small garden",
    "s89": "paste a github.com/owner/repo link or choose a zip.",
    "s90": "downloading the public github archive",
    "s91": "local source",
    "s92": "reading folder files",
    "s93": "reading a local file",
    "s94": "folder: {0}",
    "s95": "local folder",
    "s96": "running the analysis again",
    "s97": "snapshot copied. the link contains only the result.",
    "s98": "copy the address from your browser. the snapshot is already saved in the link.",
    "s99": "could not prepare png in this browser.",
    "s100": "could not save png.",
    "s101": "could not convert svg to png.",
    "s102": "docs folder",
    "s103": "documentation: {0}",
    "s104": "no documentation found",
    "s105": "files",
    "s106": "files: {0}",
    "s107": "text size: {0} bytes",
    "s108": "source and scripts",
    "s109": "source files: {0} · scripts: {1}",
    "s110": "languages: {0}",
    "s111": "extensions",
    "s112": "extensions: {0}",
    "s113": "documentation traces",
    "s114": "examples and notebooks",
    "s115": "example files: {0}",
    "s116": "test files: {0}",
    "s117": "continuous checks",
    "s118": "ci files found",
    "s119": "no ci files found",
    "s120": "settings",
    "s121": "configs: {0}",
    "s122": "locked dependencies",
    "s123": "lockfiles: {0}",
    "s124": "no lockfiles",
    "s125": "extension diversity",
    "s126": "extension diversity: {0}",
    "s127": "path depth",
    "s128": "average folder depth: {0}",
    "s129": "root files",
    "s130": "root files: {0}",
    "s131": "unrecognized extensions",
    "s132": "without a known extension: {0}",
    "s133": "package files",
    "s134": "package files: {0}",
    "s135": "license found",
    "s136": "no license found",
    "s137": "tests and ci",
    "s138": "tests: {0} · ci files: {1}",
    "s139": "enter a public link such as github.com/owner/repo.",
    "s140": "github did not respond in time. download the repository zip and upload it here.",
    "s141": "the network or cors blocked the archive. download the repository zip and upload it here.",
    "s142": "github limited the request. download the repository zip and upload it here.",
    "s143": "repository not found or private. check the link or upload a zip.",
    "s144": "github returned error {0}. download the repository zip and upload it here.",
    "s145": "the archive is empty. download the zip again or choose another source.",
    "s146": "could not read the zip in this browser.",
    "s147": "this browser cannot unpack zip files. try a recent chrome, safari or firefox.",
    "s148": "an unpacked file in the zip exceeded the size limit.",
    "s149": "the zip contains a damaged compressed entry.",
    "s150": "this does not look like a zip archive, or the archive is damaged.",
    "s151": "the end of the zip is damaged; the file cannot be parsed.",
    "s152": "multipart zip archives are unsupported.",
    "s153": "too many entries in the zip (maximum {0}).",
    "s154": "no files to analyze in the zip.",
    "s155": "the zip directory points outside the file.",
    "s156": "the zip directory is damaged; the file cannot be parsed.",
    "s157": "the zip directory contains a truncated entry.",
    "s158": "encrypted zip entries are unsupported.",
    "s159": "zip compression method {0} is unsupported.",
    "s160": "the unpacked zip must not exceed {0} mb.",
    "s161": "a local zip entry is damaged.",
    "s162": "compression methods in the zip entry do not match.",
    "s163": "the zip contains truncated file data.",
    "s164": "the unpacked file size does not match the zip header.",
    "s165": "the folder is empty; no files to analyze.",
    "s166": "too many files in the folder (maximum {0}).",
    "s167": "file size must not exceed {0} mb.",
    "s168": "could not read the local file in this browser.",
    "s169": "the link snapshot is damaged.",
    "archive.files.one": "the archive contains {0} text file.",
    "archive.files.few": "the archive contains {0} text files.",
    "archive.files.many": "the archive contains {0} text files.",
    "archive.files.other": "the archive contains {0} text files.",
    "link.character": "https://github.com/chebaturkin/repo-tamagotchi#how-character-is-calculated",
    "link.privacy": "https://github.com/chebaturkin/repo-tamagotchi#privacy-and-limits"
  }
};
  const storageKey = 'repo-tamagotchi:locale';
  const supported = value => value === 'ru' || value === 'en';
  function resolveLocale({ query, saved, languages = [] } = {}) {
    if (supported(query)) return query;
    if (supported(saved)) return saved;
    for (const preference of languages) {
      const language = String(preference).toLowerCase().split('-')[0];
      if (supported(language)) return language;
    }
    return 'en';
  }
  let saved;
  try { saved = global.localStorage?.getItem(storageKey); } catch { /* storage is optional */ }
  let query;
  try { query = new URL(global.location.href).searchParams.get('lang'); } catch { /* local or embedded document */ }
  let locale = resolveLocale({ query, saved, languages: (global.navigator?.languages?.length ? global.navigator.languages : [global.navigator?.language]) });
  const listeners = new Set();
  const generated = new Map();
  function t(key, ...values) {
    const message = messages[locale][key] ?? messages.en[key] ?? key;
    const result = message.replace(/\{(\d+)\}/g, (_, index) => String(values[Number(index)] ?? ''));
    if (generated.size > 3000) generated.clear();
    generated.set(result, { key, values });
    return result;
  }
  // Only system-generated messages pass here; user content never does.
  function retext(value) {
    if (!value) return value;
    const known = generated.get(String(value));
    if (known) return t(known.key, ...known.values.map(retext));
    for (const language of ['ru', 'en']) {
      for (const [key, text] of Object.entries(messages[language])) {
        if (text === value) return t(key);
        if (!/\{\d+\}/.test(text)) continue;
        const slots = [];
        const pattern = text.split(/(\{\d+\})/).map(part => {
          if (/^\{\d+\}$/.test(part)) { slots.push(Number(part.slice(1, -1))); return '(.*?)'; }
          return part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        }).join('');
        const match = new RegExp('^' + pattern + '$', 's').exec(String(value));
        if (match) { const values = []; slots.forEach((slot, index) => { values[slot] = retext(match[index + 1]); }); return t(key, ...values); }
      }
    }
    return value;
  }
  function apply() {
    if (!global.document) return;
    document.documentElement.lang = locale;
    const ogLocale = document.querySelector('meta[property="og:locale"]');
    if (ogLocale) ogLocale.content = locale === 'ru' ? 'ru_RU' : 'en_US';
    const ogImage = document.querySelector('meta[property="og:image"]');
    if (ogImage) ogImage.content = ogImage.content.replace(/screenshots\/(?:en\/)?/, 'screenshots/' + (locale === 'en' ? 'en/' : ''));
    document.querySelectorAll('[data-i18n]').forEach(node => { node.textContent = t(node.dataset.i18n); });
    for (const attr of ['aria-label', 'placeholder', 'content', 'href']) {
      document.querySelectorAll('[data-i18n-' + attr + ']').forEach(node => node.setAttribute(attr, t(node.getAttribute('data-i18n-' + attr))));
    }
    document.querySelectorAll('[data-locale]').forEach(button => {
      button.setAttribute('aria-pressed', String(button.dataset.locale === locale));
      if (!button.dataset.localeBound) { button.addEventListener('click', () => setLocale(button.dataset.locale)); button.dataset.localeBound = 'true'; }
    });
    document.querySelectorAll('.locale-switch').forEach(node => node.setAttribute('aria-label', locale === 'ru' ? 'язык' : 'language'));
  }
  function setLocale(value) {
    if (!supported(value)) return;
    const changed = value !== locale;
    locale = value;
    try { global.localStorage?.setItem(storageKey, locale); } catch { /* session remains usable */ }
    try { const url = new URL(global.location.href); url.searchParams.set('lang', locale); global.history?.replaceState(null, '', url.href); } catch { /* file:// and restricted history remain usable */ }
    if (!changed) return;
    apply();
    listeners.forEach(listener => listener(locale));
  }
  global.I18n = { messages, resolveLocale, t, count(key, value) { return t(key + '.' + new Intl.PluralRules(locale).select(Number(value)), value); }, retext, apply, setLocale, subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); }, get locale() { return locale; }, get intlLocale() { return locale === 'ru' ? 'ru-RU' : 'en-US'; } };
  if (global.document) {
    document.documentElement.lang = locale;
  }
})(globalThis);
