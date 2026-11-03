import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createFallingSession, currentFalling, tickFalling, answerFalling, pauseFalling, resumeFalling,
  FALLING_DURATION_MS, FALLING_LIVES,
} from '../src/minigames.js';

// Synthetic isolated fixtures: these are not part of the game's German curriculum.
const words = Array.from({ length: 6 }, (_, i) => ({
  id: `word-${i}`, de: `Fixture-${i}`, ru: `Предмет ${i}`, visual: `visual-${i}`, gameCategory: 'food',
}));
const start = () => createFallingSession(words, 1_000, () => 0.25);
const answer = (session, id = currentFalling(session).word.id, time = session.lastNow + 100) =>
  answerFalling(session, { wordId: id, roundId: currentFalling(session).roundId }, time);

test('falling session contains only supplied illustrated words and four unambiguous options', () => {
  const session = start(), active = currentFalling(session);
  assert.equal(session.available, true);
  assert.equal(session.endsAt - session.startedAt, FALLING_DURATION_MS);
  assert.equal(session.lives, FALLING_LIVES);
  assert.equal(active.options.length, 4);
  assert.equal(new Set(active.options.map(word => word.visual)).size, 4);
  assert.ok(active.options.some(word => word.id === active.word.id));
  assert.ok(active.options.every(word => words.some(input => input.id === word.id)));
  assert.equal(active.progress, 0);
});

test('not enough distinct pictures produces an unavailable game, rather than invented words', () => {
  const session = createFallingSession(words.slice(0, 3));
  assert.equal(session.available, false);
  assert.equal(session.finished, true);
  assert.equal(currentFalling(session), null);
  assert.match(session.reason, /четыре/);
  const duplicates = words.slice(0, 4).map(word => ({ ...word, visual: 'same-image' }));
  assert.equal(createFallingSession(duplicates).available, false);
});

test('malformed entries and repeated labels cannot create ambiguous answer cards', () => {
  const session = createFallingSession([
    null, {}, ...words, { ...words[0], id: 'alias' }, { ...words[1], visual: 'another' },
  ], 0, () => 0.25);
  assert.equal(session.pool.length, words.length);
});

test('correct answers score once, record the word, and never immediately repeat it', () => {
  const session = start(), before = JSON.stringify(session), target = currentFalling(session);
  const result = answer(session);
  assert.equal(result.accepted, true);
  assert.equal(result.correct, true);
  assert.equal(result.session.score, 10);
  assert.equal(result.session.hits, 1);
  assert.equal(result.session.combo, 1);
  assert.equal(result.session.lives, FALLING_LIVES);
  assert.deepEqual(result.session.correctWordIds, [target.word.id]);
  assert.notEqual(currentFalling(result.session).word.id, target.word.id);
  assert.equal(JSON.stringify(session), before, 'input session was mutated');
  const duplicate = answerFalling(result.session, { wordId: target.word.id, roundId: target.roundId }, 1_200);
  assert.equal(duplicate.accepted, false);
  assert.equal(duplicate.session.hits, 1);
  assert.equal(duplicate.session.score, 10);
});

test('shuffle bag introduces every word before recycling the pool', () => {
  let session = start();
  const appeared = [];
  for (let i = 0; i < words.length; i++) {
    appeared.push(currentFalling(session).word.id);
    session = answer(session).session;
  }
  assert.equal(new Set(appeared).size, words.length);
});

test('wrong image loses only an arcade life and breaks the combo', () => {
  const first = answer(start()).session;
  const active = currentFalling(first), wrong = active.options.find(word => word.id !== active.word.id);
  const result = answer(first, wrong.id);
  assert.equal(result.accepted, true);
  assert.equal(result.correct, false);
  assert.equal(result.session.lives, FALLING_LIVES - 1);
  assert.equal(result.session.combo, 0);
  assert.equal(result.session.hits, 1);
  assert.equal(result.session.misses, 1);
  assert.equal(result.session.lastFeedback.kind, 'wrong');
  assert.ok(!('bond' in result.session));
  assert.ok(!('needs' in result.session));
});

test('a word reaching the ground cannot receive a late correct answer', () => {
  const session = start(), active = currentFalling(session);
  const beforeGround = tickFalling(session, active.fallsAt - 1);
  assert.equal(beforeGround.misses, 0);
  assert.ok(currentFalling(beforeGround).progress < 1);
  const late = answerFalling(beforeGround, { wordId: active.word.id, roundId: active.roundId }, active.fallsAt);
  assert.equal(late.accepted, false);
  assert.equal(late.correct, null);
  assert.equal(late.session.misses, 1);
  assert.equal(late.session.hits, 0);
  assert.equal(late.session.lives, FALLING_LIVES - 1);
});

test('invalid IDs and stale rounds are ignored without score or penalties', () => {
  const session = start(), active = currentFalling(session);
  for (const invalid of [null, {}, { wordId: 'outside', roundId: active.roundId }, { wordId: active.word.id, roundId: -1 }]) {
    const result = answerFalling(session, invalid, 1_100);
    assert.equal(result.accepted, false);
    assert.equal(result.session.hits, 0);
    assert.equal(result.session.misses, 0);
  }
});

test('game ends after five mistakes and cannot score or lose more lives afterward', () => {
  let session = start();
  for (let i = 0; i < FALLING_LIVES; i++) {
    const active = currentFalling(session), wrong = active.options.find(word => word.id !== active.word.id);
    session = answer(session, wrong.id).session;
  }
  assert.equal(session.finished, true);
  assert.equal(session.finishReason, 'lives');
  assert.equal(session.lives, 0);
  assert.equal(currentFalling(session), null);
  assert.strictEqual(tickFalling(session, 100_000), session);
  assert.strictEqual(answerFalling(session, { wordId: words[0].id, roundId: session.round }, 100_000).session, session);
});

test('round timer ends precisely at 45 seconds; a background jump consumes at most one life', () => {
  const session = start();
  const later = tickFalling(session, session.endsAt + 3_600_000);
  assert.equal(later.finished, true);
  assert.equal(later.finishReason, 'time');
  assert.equal(later.misses, 1);
  assert.equal(later.lives, FALLING_LIVES - 1);
  assert.equal(later.hits, 0);
  const precise = tickFalling(session, session.endsAt);
  assert.equal(precise.finished, true);
});

test('backwards and invalid clock values cannot rewind a falling word', () => {
  const session = tickFalling(start(), 2_000), progress = currentFalling(session).progress;
  assert.equal(currentFalling(tickFalling(session, 1_500)).progress, progress);
  assert.equal(currentFalling(tickFalling(session, NaN)).progress, progress);
});

test('pause and resume preserve remaining time and position while the app is hidden', () => {
  const session = tickFalling(start(), 2_000), active = currentFalling(session);
  const paused = pauseFalling(session, 2_000);
  assert.equal(paused.paused, true);
  assert.strictEqual(tickFalling(paused, 1_000_000), paused);
  assert.equal(answerFalling(paused, { wordId: active.word.id, roundId: active.roundId }, 5_000).accepted, false);
  const resumed = resumeFalling(paused, 12_000);
  assert.equal(resumed.paused, false);
  assert.equal(currentFalling(resumed).progress, active.progress);
  assert.equal(currentFalling(resumed).remainingMs, active.remainingMs);
  assert.equal(resumed.endsAt, session.endsAt + 10_000);
});

test('session restores through JSON with deterministic future word order and score', () => {
  const session = answer(start()).session, restored = JSON.parse(JSON.stringify(session));
  assert.deepEqual(answer(restored), answer(session));
});
