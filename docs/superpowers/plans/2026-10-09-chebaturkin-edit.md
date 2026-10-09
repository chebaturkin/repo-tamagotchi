# repo tamagotchi: редактура и публикация — implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** привести весь Repo Tamagotchi к ясному голосу Chebaturkin, выровнять интерфейс и README, исправить обнаруженные нестыковки и подготовить публичную GitHub Pages публикацию.

**Architecture:** оставить браузерный анализатор и существующий статический entrypoint. Сосредоточить редактуру в HTML, UI‑строках приложения, источниках ошибок и README; стиль привести к одной системе переменных и журнальной композиции. Публикацию вынести в GitHub Actions workflow, чтобы сайт собирался из корня без backend.

**Tech Stack:** vanilla HTML/CSS/ES modules, GitHub Pages, GitHub Actions, локальные fixture‑тесты.

---

### Task 1: выровнять публичный интерфейс и доступные названия

**Files:**
- Modify: `index.html`
- Modify: `styles.css`

- [ ] **Step 1: заменить тексты первого экрана, состояний и журнала**
  - Использовать строчные начала предложений в русском тексте.
  - Сохранить технические имена `GitHub`, `ZIP`, `README`, `SVG`, `PNG`, `CI`.
  - Сделать заголовок о действии, а подпись — о приватности и ограничениях.
  - Добавить доступные названия для локальных источников и явный текст следующего шага.
- [ ] **Step 2: выровнять CSS под бумажный журнал**
  - Оставить шрифты `Fraunces`, `Onest`, `Azeret Mono` и палитру проекта.
  - Уточнить размеры, границы и responsive‑состояния без градиентов, стекла и pill‑кнопок.
  - Проверить `:focus-visible`, `prefers-reduced-motion`, контраст и читаемость на ширине 320px.
- [ ] **Step 3: открыть локальный entrypoint через статический сервер**
  - Run: `python3 -m http.server 4173`
  - Expected: `index.html` отвечает без сетевых зависимостей для локального сценария.

### Task 2: привести UI‑копирайтинг и ошибки к одному голосу

**Files:**
- Modify: `src/app.js`
- Modify: `src/sources.js`
- Modify: `src/share.js`

- [ ] **Step 1: заменить пользовательские строки в `src/app.js`**
  - Статусы должны описывать текущее действие: «смотрю архив», «разбираю файлы», «результат готов».
  - Метрики и evidence должны объяснять сигнал простыми словами.
  - Кнопки и fallback должны называть реальное действие, а ошибка — исправление.
- [ ] **Step 2: заменить ошибки источников**
  - Каждая ошибка должна назвать ограничение и дать один следующий шаг.
  - Не обещать поддержку приватных репозиториев, произвольных архивов или серверной обработки.
- [ ] **Step 3: проверить share‑снимок и состояния восстановления**
  - Повреждённая ссылка показывает понятное сообщение и возвращает пользователя к загрузке.
  - После `reset` снова доступны все источники и повторный анализ.

### Task 3: переписать README и GitHub metadata

**Files:**
- Modify: `README.md`
- Modify: `AGENT_PROMPT.md`
- Create: `.github/workflows/pages.yml`
- Create: `docs/index.md`

- [ ] **Step 1: собрать README как страницу проекта**
  - Первый экран: что делает инструмент и ссылка на демо.
  - Затем запуск, источники, ограничения ZIP, формула, share/export, приватность и деплой.
  - Все факты взять из текущего кода; не добавлять сервер, API или авторизацию.
- [ ] **Step 2: обновить внутренний промпт**
  - Синхронизировать формулировки с новой структурой и зарегистрированными ограничениями.
- [ ] **Step 3: добавить workflow GitHub Pages**
  - Публиковать корень репозитория при push в `main` и вручную.
  - Использовать официальные actions `configure-pages`, `upload-pages-artifact`, `deploy-pages` с pinned major versions.

### Task 4: тесты и публикация

**Files:**
- Modify: `src/*.test.html` only if visible test labels become inconsistent.
- Create: `.gitignore` if needed for local artifacts.

- [ ] **Step 1: пройти синтаксические проверки**
  - Run: `for file in src/*.js; do node --check "$file"; done`
  - Expected: exit code 0 for every module.
- [ ] **Step 2: пройти fixture‑тесты в браузере**
  - Run local server and open `src/analyzer.test.html`, `src/analyzer.logic.test.html`, `src/operation.test.html`, `src/share.test.html`.
  - Expected: each page reports its assertion count and no uncaught error.
- [ ] **Step 3: проверить визуальный и пользовательский smoke‑flow**
  - Проверить пустой экран, ссылку, ZIP, папку, битый архив, повреждённый hash, reset, reanalyze, share, SVG/PNG и keyboard focus.
- [ ] **Step 4: подготовить GitHub repository and Pages**
  - Initialize Git only in this project, commit reviewed files, create `chebaturkin/repo-tamagotchi` if absent, push `main`, enable Pages through the workflow.
  - Record the resulting repository and Pages URLs in the final response after verifying them.
