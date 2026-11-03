import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { newGame, SAVE_KEY } from '../src/game.js';

const origin = process.env.POKITALK_TEST_ORIGIN || 'http://127.0.0.1:5173';
const curriculum = JSON.parse(fs.readFileSync(new URL('../src/curriculum.json', import.meta.url)));
const allWords = curriculum.topics.flatMap(topic => topic.words);
const allowed = new Set(curriculum.topics.filter(topic => topic.trust <= 55).flatMap(topic => topic.words.map(word => word.id)));
const fullWord = word => [word.article, word.de].filter(Boolean).join(' ');
const browser = await chromium.launch({ executablePath: '/usr/bin/chromium', headless: true, args: ['--no-sandbox'] });
const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await context.newPage();
page.setDefaultTimeout(8_000);
const errors = [];
page.on('pageerror', error => errors.push(error.message));
const seed = { ...newGame(), introduced: true, bond: 55, room: 'bedroom' };
await page.addInitScript(({ key, seed }) => {
  if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(seed));
}, { key: SAVE_KEY, seed });
const saved = () => page.evaluate(key => JSON.parse(localStorage.getItem(key)), SAVE_KEY);
const petState = async () => {
  const state = await saved();
  return { bond: state.bond, needs: state.needs, turn: state.turn };
};
const score = async () => Number(await page.locator('#mini-score').innerText());
const lives = async () => Number((await page.locator('#mini-lives').innerText()).match(/\d+/)[0]);
async function activeWord() {
  const label = await page.locator('#falling-word').innerText();
  const word = allWords.find(word => fullWord(word) === label);
  assert.ok(word, `Unknown falling word: ${label}`);
  return word;
}
async function verifyOptions(category) {
  const ids = await page.locator('[data-action="catch"]').evaluateAll(buttons => buttons.map(button => button.dataset.wordId));
  assert.equal(ids.length, 4);
  assert.equal(new Set(ids).size, 4);
  for (const id of ids) {
    assert.ok(allowed.has(id), `Locked word used in game: ${id}`);
    assert.equal(allWords.find(word => word.id === id)?.gameCategory, category);
  }
}
async function correctCatch() {
  const word = await activeWord();
  await page.locator(`[data-action="catch"][data-word-id="${word.id}"]`).click();
  return word.id;
}
async function wrongCatch() {
  const word = await activeWord();
  await page.locator(`[data-action="catch"]:not([data-word-id="${word.id}"])`).first().click();
}
async function visibility(state) {
  await page.evaluate(state => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => state });
    document.dispatchEvent(new Event('visibilitychange'));
  }, state);
}

try {
  await page.goto(origin);
  assert.equal(await page.locator('.onboarding').count(), 0);
  assert.equal(await page.locator('[data-action="arcade"]').count(), 0, 'Arcade entry should exist only inside the playroom');
  // A care request has no arcade timer or score.
  await page.locator('.answer-button').click();
  assert.equal(await page.locator('.falling-arena').count(), 0);
  assert.equal(await page.locator('.falling-score').count(), 0);
  await page.getByRole('button', { name: 'Закрыть', exact: true }).click();

  await page.locator('[data-action="room"][data-room="playroom"]').click();
  await page.locator('[data-action="arcade"]').click();
  assert.equal(await page.locator('[data-action="start-game"]').count(), 3);
  assert.equal(await page.locator('[data-action="start-game"].locked').count(), 0, 'All three themes should be available at trust 55');
  const before = await petState();
  await page.locator('[data-action="start-game"][data-category="food"]').click();
  await verifyOptions('food');
  const startBox = await page.locator('#falling-word').boundingBox();
  await page.waitForTimeout(550);
  const movedBox = await page.locator('#falling-word').boundingBox();
  assert.ok(movedBox.y > startBox.y + 5, 'Word should visibly fall with time');

  // A hidden app freezes its falling word, then continues in the same position.
  await visibility('hidden');
  const pausedBox = await page.locator('#falling-word').boundingBox();
  const pausedTimer = await page.locator('#mini-time').innerText();
  await page.waitForTimeout(300);
  const heldBox = await page.locator('#falling-word').boundingBox();
  assert.ok(Math.abs(heldBox.y - pausedBox.y) < 1, 'Hidden game must not keep moving');
  assert.equal(await page.locator('#mini-time').innerText(), pausedTimer);
  await visibility('visible');
  await page.waitForTimeout(60);
  const resumedBox = await page.locator('#falling-word').boundingBox();
  assert.ok(Math.abs(resumedBox.y - pausedBox.y) < 12, 'Resume should preserve position rather than restarting the fall');

  const stale = await page.locator('[data-action="catch"]').first().evaluate(button => ({ wordId: button.dataset.wordId, roundId: button.dataset.roundId }));
  const firstId = await correctCatch();
  assert.equal(await score(), 10);
  assert.equal(await lives(), 5);
  assert.deepEqual(await petState(), before, 'Correct image changes only arcade score until completion');
  // Replay a stale delegated event on a live button; its old round must be ignored.
  await page.evaluate(stale => {
    const button = document.querySelector('[data-action="catch"]');
    button.dataset.wordId = stale.wordId;
    button.dataset.roundId = stale.roundId;
    button.click();
  }, stale);
  assert.equal(await score(), 10);
  assert.equal(await lives(), 5);

  await wrongCatch();
  assert.equal(await score(), 10);
  assert.equal(await lives(), 4);
  assert.deepEqual(await petState(), before, 'Wrong image must not damage pet trust or needs');
  const correctIds = [firstId, await correctCatch(), await correctCatch()];
  for (let i = 0; i < 4; i++) await wrongCatch();
  await page.locator('.game-result').waitFor();
  const finished = await saved();
  assert.equal(finished.bond, before.bond + 1, 'Three correct catches earn exactly one completion trust point');
  assert.deepEqual(finished.needs, before.needs);
  assert.equal(finished.turn, before.turn, 'An arcade round must not count as a care action');
  assert.equal(finished.completedGames.length, 1);
  for (const id of correctIds) assert.equal(finished.vocabProgress[id].understood, 1);
  // Repeated visibility renders of the finished result cannot duplicate its reward.
  await visibility('hidden');
  await visibility('visible');
  await visibility('hidden');
  await visibility('visible');
  assert.equal((await saved()).bond, finished.bond);
  assert.equal((await saved()).completedGames.length, 1);
  await page.screenshot({ path: '/workspace/pokitalk-arcade-result.png', fullPage: true });

  await page.reload();
  assert.equal((await saved()).bond, finished.bond);
  assert.equal((await saved()).completedGames.length, 1);
  for (const category of ['appliances', 'kitchen']) {
    await page.locator('[data-action="arcade"]').click();
    await page.locator(`[data-action="start-game"][data-category="${category}"]`).click();
    await verifyOptions(category);
    await page.getByRole('button', { name: 'Выйти из игры', exact: true }).click();
    assert.equal((await saved()).bond, finished.bond, 'Closing an unfinished game grants no reward or penalty');
    assert.deepEqual((await saved()).needs, before.needs);
  }
  assert.deepEqual(errors, []);
  console.log('PASS: arcade-only entry, all 3 themes, unlocked image choices, falling animation, pause/resume, score/lives, stale events, separation from care, completion reward once, learning persistence, no JS errors');
} finally {
  await context.close();
  await browser.close();
}
