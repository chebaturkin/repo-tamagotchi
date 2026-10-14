const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const fs = require('node:fs/promises');
const base = process.env.REPO_TAMAGOTCHI_URL || 'http://127.0.0.1:4433';
const url = path => new URL(path, base + '/').href;
const text = page => page.locator('body').innerText();
(async () => {
 const browser = await chromium.launch();
 try {
  for (const language of ['en-US', 'ru-RU']) {
   const context = await browser.newContext({ locale: language, viewport: { width: 390, height: 900 }, reducedMotion: 'reduce', acceptDownloads: true, timezoneId: 'Europe/Moscow' });
   const page = await context.newPage(); const errors = [];
   page.on('pageerror', error => errors.push(error.message));
   await page.goto(url('?keep=yes#draft'));
   await page.waitForFunction(() => document.documentElement.lang === navigator.language.slice(0, 2));
   const initial = language.slice(0, 2), target = initial === 'en' ? 'ru' : 'en';
   
   await page.locator('#repo-url').fill('github.com/MyOwner/MyRepo');
   await page.locator('#try-example').click();await page.waitForSelector('#journal:not([hidden])');
   const scores=await page.locator('.metric__score').allTextContents();
   await page.locator('header [data-locale="en"]').click();assert.ok((await page.locator('#metrics').innerText()).includes('energy'));
   await page.locator('header [data-locale="ru"]').click();assert.ok((await page.locator('#metrics').innerText()).includes('энергия'));
   await page.locator('header [data-locale="en"]').click();assert.ok((await page.locator('#metrics').innerText()).includes('energy'));
   await page.locator('header [data-locale="' + initial + '"]').click();

   const before = await page.evaluate(() => ({ hash: location.hash, data: Object.fromEntries(Object.entries(localStorage).filter(([key]) => !key.endsWith(':locale'))) }));
   await page.locator('header [data-locale="' + target + '"]').focus();
   await page.keyboard.press('Enter');
   assert.equal(await page.locator('html').getAttribute('lang'), target);
   assert.equal(await page.locator('header [data-locale="' + target + '"]').getAttribute('aria-pressed'), 'true');
   const after = await page.evaluate(() => ({ hash: location.hash, data: Object.fromEntries(Object.entries(localStorage).filter(([key]) => !key.endsWith(':locale'))) }));
   assert.equal(after.hash, before.hash); assert.ok(page.url().includes('keep=yes')); assert.deepEqual(after.data, before.data);
   
   assert.equal(await page.locator('#repo-url').inputValue(),'github.com/MyOwner/MyRepo');
   assert.deepEqual(await page.locator('.metric__score').allTextContents(),scores);

   await page.locator('header [data-locale="en"]').click();
   
   assert.ok((await page.locator('#metrics').innerText()).includes('energy'));
   assert.doesNotMatch(await text(page), /[А-Яа-яЁё]/);
   const downloading=page.waitForEvent('download');await page.locator('#export-svg').click();const download=await downloading;
   const svg=await fs.readFile(await download.path(),'utf8');assert.ok(svg.includes("a pet from a repository"));assert.ok(!svg.includes('питомец'));
   const share=page.url();await page.reload();assert.ok(await page.locator('#journal').isVisible());
   await page.locator('header [data-locale="ru"]').click();assert.deepEqual(await page.locator('.metric__score').allTextContents(),scores);assert.ok((await page.locator('.metric__note').first().textContent()).includes('файлов:'));assert.doesNotMatch(await page.locator('#journal-date').textContent(), /october/);assert.equal(new URL(page.url()).hash,new URL(share).hash);
   await page.locator('header [data-locale="en"]').click();
   await page.locator('#reset').click();await page.locator('#repo-url').fill('not github');await page.locator('#source-form [type="submit"]').click();
   await page.waitForSelector('#error-state:not([hidden])');assert.ok((await page.locator('#error-message').textContent()).includes('enter a public link'));
   await page.locator('header [data-locale="ru"]').click();assert.ok((await page.locator('#error-message').textContent()).includes('введите публичную ссылку'));
   await page.locator('header [data-locale="en"]').click();await page.locator('#error-reset').click();
   await page.locator('#file-input').setInputFiles({name:'bad.zip',mimeType:'application/zip',buffer:Buffer.from('not a zip')});
   await page.waitForSelector('#error-state:not([hidden])');assert.ok((await page.locator('#error-message').textContent()).includes('does not look like a zip'));
   await page.locator('#error-reset').click();
   const folder = await fs.mkdtemp(require('node:path').join(require('node:os').tmpdir(), 'МояПапкаKeepCASE-'));
   await fs.writeFile(require('node:path').join(folder, 'MyProject.js'), 'export const title = "User Data";');
   await page.locator('header [data-locale="ru"]').click();
   await page.locator('#folder-input').setInputFiles(folder);
   await page.waitForSelector('#journal:not([hidden])');assert.equal(await page.locator('#journal-source').textContent(), 'папка: ' + require('node:path').basename(folder));
   const folderHash = new URL(page.url()).hash;
   await page.locator('header [data-locale="en"]').click();
   assert.equal(await page.locator('#journal-source').textContent(), 'folder: ' + require('node:path').basename(folder));
   assert.equal(new URL(page.url()).hash, folderHash);
   await page.reload();
   assert.equal(await page.locator('#journal-source').textContent(), 'folder: ' + require('node:path').basename(folder));
   await page.locator('header [data-locale="ru"]').click();
   assert.equal(await page.locator('#journal-source').textContent(), 'папка: ' + require('node:path').basename(folder));
   assert.equal(new URL(page.url()).hash, folderHash);
   await page.locator('header [data-locale="en"]').click();
   await fs.rm(folder, {recursive:true,force:true});

   for (const scheme of ['light', 'dark']) {
    await page.emulateMedia({ colorScheme: scheme });
    for (const width of [320, 390, 768, 1440]) {
     await page.setViewportSize({ width, height: 1000 });
     assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `overflow at ${width}/${scheme}`);
    }
   }
   await page.reload();
   assert.equal(await page.locator('html').getAttribute('lang'), 'en');
   await page.goto(url('?lang=ru&keep=yes'));
   assert.equal(await page.locator('html').getAttribute('lang'), 'ru', 'query overrides saved English');
   assert.deepEqual(errors, []);
   await context.close();
  }
  const blocked = await browser.newContext({ locale: 'en-US', viewport: { width: 390, height: 900 } });
  await blocked.addInitScript(() => {
   Object.defineProperty(window, 'localStorage', { get() { throw new Error('blocked storage'); } });
   history.replaceState = () => { throw new Error('blocked history'); };
  });
  const restricted = await blocked.newPage(); await restricted.goto(url(''));
  await restricted.locator('header [data-locale="ru"]').click();
  assert.equal(await restricted.locator('html').getAttribute('lang'), 'ru');
  await restricted.locator('header [data-locale="en"]').click();
  assert.equal(await restricted.locator('html').getAttribute('lang'), 'en');
  
  await restricted.locator('#try-example').click();await restricted.waitForSelector('#journal:not([hidden])');assert.ok((await restricted.locator('#metrics').innerText()).includes('energy'));

  await blocked.close();
  
  const blank = await browser.newPage({locale:'en-US'});await blank.goto(url('?lang=en'));await blank.locator('#source-form [type="submit"]').click();assert.equal(await blank.locator('#source-status').textContent(),'paste a github.com/owner/repo link or choose a zip.');await blank.close();
  const restored = await browser.newPage({locale:'ru-RU'});await restored.goto(url('?lang=ru'));await restored.locator('#try-example').click();await restored.waitForSelector('#journal:not([hidden])');
  const russianHash = new URL(restored.url()).hash;
  await restored.locator('.metric__evidence').first().evaluate(node => node.open = true);
  await restored.locator('header [data-locale="ru"]').click();
  assert.equal(await restored.locator('.metric__evidence').first().evaluate(node => node.open), true);
  await restored.locator('header [data-locale="en"]').click();
  assert.equal(await restored.locator('.metric__evidence').first().evaluate(node => node.open), true);
  await restored.goto(url('?lang=en' + russianHash));
  assert.ok((await restored.locator('.metric__note').allTextContents()).join(' ').includes('average folder depth: 1.6'));
  assert.ok((await restored.locator('.metric__note').allTextContents()).join(' ').includes('extension diversity: 0.97'));
  await restored.locator('.metric__evidence').first().evaluate(node => node.open = true);
  await restored.locator('header [data-locale="en"]').click();
  assert.equal(await restored.locator('.metric__evidence').first().evaluate(node => node.open), true);
  assert.equal(new URL(restored.url()).hash, russianHash);
  await restored.close();
  console.log('repo-tamagotchi bilingual browser checks passed: browser defaults, in-place state, keyboard, imports/errors/exports, persistence, blocked storage/history and 320/390/768/1440 light/dark.');
 } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
