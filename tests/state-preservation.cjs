const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const base = process.env.REPO_TAMAGOTCHI_URL || 'http://127.0.0.1:4433';
const url = suffix => new URL(suffix, base + '/').href;

(async () => {
  const browser = await chromium.launch();
  const fixtureRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'tamagotchi-state-'));
  try {
    const page = await browser.newPage({ locale: 'en-US', timezoneId: 'Europe/Moscow', reducedMotion: 'reduce' });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.clock.install({ time: new Date('2026-10-14T07:15:00Z') });
    await page.goto(url('?lang=en&keep=yes'));
    await page.locator('#try-example').click();
    await page.waitForSelector('#journal:not([hidden])');
    const snapshot = () => page.evaluate(async () => {
      const { decodeSnapshot } = await import('./src/share.js');
      return decodeSnapshot(location.hash.slice(7));
    });
    const before = await snapshot();
    const originalHash = new URL(page.url()).hash;
    const expectedDate = (iso, locale) => page.evaluate(({ iso, locale }) => new Intl.DateTimeFormat(locale, { dateStyle: 'long', timeStyle: 'short' }).format(new Date(iso)).toLocaleLowerCase(locale), { iso, locale });
    const originalDisplay = await expectedDate(before.analyzedAt, 'en-US');
    assert.equal(await page.locator('#journal-date').textContent(), originalDisplay);
    await page.clock.fastForward(7 * 60 * 1000);
    await page.locator('header [data-locale="ru"]').click();
    assert.equal(await page.locator('#journal-date').textContent(), await expectedDate(before.analyzedAt, 'ru-RU'), 'a delayed language change formats the original analysis instant');
    assert.equal(new URL(page.url()).hash, originalHash);
    assert.equal((await snapshot()).analyzedAt, before.analyzedAt);
    await page.locator('header [data-locale="en"]').click();
    assert.equal(await page.locator('#journal-date').textContent(), originalDisplay);
    assert.equal(new URL(page.url()).hash, originalHash);
    await page.locator('#reanalyze').click();
    await page.waitForFunction(hash => location.hash !== hash, originalHash);
    const reanalyzed = await snapshot();
    assert.ok(new Date(reanalyzed.analyzedAt).getTime() >= new Date(before.analyzedAt).getTime() + 7 * 60 * 1000, 'reanalyzing creates a new analysis instant');
    assert.equal(await page.locator('#journal-date').textContent(), await expectedDate(reanalyzed.analyzedAt, 'en-US'));
    assert.deepEqual(reanalyzed.metrics.map(metric => metric.score), before.metrics.map(metric => metric.score));
    console.log('analysis time: delayed ru/en switches preserve original instant/hash; reanalysis advances the instant');

    // These source names also appear in interface dictionaries. A real local import
    // must retain them as user names instead of recursively translating the suffix.
    for (const sourceName of ['license', 'test', 'no']) {
      const folder = path.join(fixtureRoot, sourceName);
      await fs.mkdir(folder);
      for (const fileName of ['license', 'test', 'no']) await fs.writeFile(path.join(folder, fileName), 'plain user text\n');
      await page.locator('#reset').click();
      await page.locator('header [data-locale="en"]').click();
      await page.locator('#folder-input').setInputFiles(folder);
      await page.waitForSelector('#journal:not([hidden])');
      assert.equal(await page.locator('#journal-source').textContent(), 'folder: ' + sourceName);
      const imported = await snapshot();
      assert.equal(imported.sourceLabel, 'folder: ' + sourceName);
      const sourceHash = new URL(page.url()).hash;
      await page.locator('header [data-locale="ru"]').click();
      assert.equal(await page.locator('#journal-source').textContent(), 'папка: ' + sourceName);
      assert.equal(new URL(page.url()).hash, sourceHash);
      await page.reload();
      await page.waitForSelector('#journal:not([hidden])');
      assert.equal(await page.locator('#journal-source').textContent(), 'папка: ' + sourceName);
      assert.equal((await snapshot()).sourceLabel, imported.sourceLabel);
      await page.locator('header [data-locale="en"]').click();
      assert.equal(await page.locator('#journal-source').textContent(), 'folder: ' + sourceName);
      assert.deepEqual((await snapshot()).languages, imported.languages);
      // Shared snapshots intentionally have no input entries, so return through the
      // normal reset control before importing the next real folder.
    }
    assert.deepEqual(errors, []);
    await page.close();
    console.log('source text: real license/test/no folders and filenames retain names through switches and shared-link reloads');
  } finally {
    await browser.close();
    await fs.rm(fixtureRoot, { recursive: true, force: true });
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
