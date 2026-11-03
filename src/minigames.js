/**
 * Falling Words — a timed arcade game, independent of the pet's care state.
 *
 * createFallingSession(words, now, random) -> serializable session
 * tickFalling(session, now) -> next session (at most one timeout per tick)
 * answerFalling(session, { wordId, roundId }, now)
 *   -> { session, accepted, correct: boolean | null }
 * currentFalling(session) -> { roundId, word, options, startedAt, fallsAt,
 *                            duration, progress, remainingMs } | null
 *
 * All timestamps are milliseconds from one monotonic clock, such as
 * performance.now(). A UI must pass the roundId shown on the answer buttons;
 * late clicks can then never answer a newly spawned word accidentally.
 * Only this game's score/lives change. No pet state is read or modified.
 */

export const FALLING_DURATION_MS = 45_000;
export const FALLING_LIVES = 5;
export const FALLING_OPTIONS = 4;

const finiteTime = (now, fallback) => Number.isFinite(now) ? now : fallback;
const unique = values => [...new Set(values)];

function eligibleWords(words) {
  const ids = new Set(), names = new Set(), visuals = new Set();
  return (Array.isArray(words) ? words : []).flatMap(word => {
    if (!word || typeof word.id !== 'string' || typeof word.de !== 'string'
      || typeof word.ru !== 'string' || typeof word.visual !== 'string') return [];
    const id = word.id.trim(), de = word.de.trim().normalize('NFC');
    const ru = word.ru.trim(), visual = word.visual.trim();
    const name = de.toLocaleLowerCase('de');
    if (!id || !de || !ru || !visual || ids.has(id) || names.has(name) || visuals.has(visual)) return [];
    ids.add(id); names.add(name); visuals.add(visual);
    const result = { id, de, ru, visual };
    if (typeof word.article === 'string') result.article = word.article;
    if (typeof word.gameCategory === 'string') result.gameCategory = word.gameCategory;
    return [result];
  });
}

// A numeric PRNG state makes a session reproducible after JSON serialization.
function randomValue(state) {
  state.seed = (Math.imul(state.seed, 1664525) + 1013904223) >>> 0;
  return state.seed / 0x100000000;
}

function shuffled(values, state) {
  const result = [...values];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(randomValue(state) * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function spawnWord(state, now, previousWordId = null) {
  let queue = [...state.queue];
  if (!queue.length) queue = shuffled(state.pool.map(word => word.id), state);
  if (queue[0] === previousWordId && queue.length > 1) [queue[0], queue[1]] = [queue[1], queue[0]];
  const wordId = queue.shift();
  const distractors = shuffled(state.pool.filter(word => word.id !== wordId), state)
    .slice(0, FALLING_OPTIONS - 1).map(word => word.id);
  const duration = Math.max(3_200, 5_500 - state.combo * 180);
  state.round += 1;
  state.queue = queue;
  state.active = {
    id: state.round,
    wordId,
    optionIds: shuffled([wordId, ...distractors], state),
    startedAt: now,
    fallsAt: now + duration,
    duration,
  };
  state.seen = unique([...state.seen, wordId]);
  return state;
}

function finish(state, reason) {
  return { ...state, finished: true, finishReason: reason, active: null };
}

export function createFallingSession(words, now = 0, random = Math.random) {
  const pool = eligibleWords(words);
  const start = finiteTime(now, 0);
  const draw = Number(random());
  const seed = (Math.floor((Number.isFinite(draw) ? Math.max(0, Math.min(0.999999999, draw)) : 0.5)
    * 0x100000000) >>> 0);
  const available = pool.length >= FALLING_OPTIONS;
  const state = {
    version: 1,
    available,
    reason: available ? '' : 'Нужно открыть хотя бы четыре разных предмета этой темы.',
    startedAt: start,
    endsAt: start + FALLING_DURATION_MS,
    lastNow: start,
    seed,
    pool,
    queue: [],
    active: null,
    round: 0,
    score: 0,
    hits: 0,
    misses: 0,
    combo: 0,
    bestCombo: 0,
    lives: FALLING_LIVES,
    seen: [],
    correctWordIds: [],
    lastFeedback: null,
    paused: false,
    pausedAt: null,
    pausedTotalMs: 0,
    finished: !available,
    finishReason: available ? null : 'unavailable',
  };
  return available ? spawnWord(state, start) : state;
}

export function currentFalling(session) {
  if (!session.available || session.finished || !session.active) return null;
  const active = session.active;
  return {
    roundId: active.id,
    word: session.pool.find(word => word.id === active.wordId),
    options: active.optionIds.map(id => session.pool.find(word => word.id === id)),
    startedAt: active.startedAt,
    fallsAt: active.fallsAt,
    duration: active.duration,
    progress: Math.max(0, Math.min(1, (session.lastNow - active.startedAt) / active.duration)),
    remainingMs: Math.max(0, session.endsAt - session.lastNow),
  };
}

export function tickFalling(session, now) {
  if (!session.available || session.finished || session.paused) return session;
  const time = Math.max(session.lastNow, finiteTime(now, session.lastNow));
  let next = { ...session, lastNow: time };
  // Background jumps never backfill a stack of unseen words or consume all lives.
  // The UI can also pause explicitly while hidden, preserving the round timer.
  if (next.active && next.active.fallsAt <= Math.min(time, next.endsAt)) {
    const prior = next.active;
    next = {
      ...next,
      misses: next.misses + 1,
      lives: next.lives - 1,
      combo: 0,
      lastFeedback: { kind: 'missed', roundId: prior.id, expectedWordId: prior.wordId, at: time },
    };
    if (next.lives <= 0) return finish(next, 'lives');
    if (time < next.endsAt) next = spawnWord(next, time, prior.wordId);
  }
  return time >= next.endsAt ? finish(next, 'time') : next;
}

export function answerFalling(session, answer, now) {
  const next = tickFalling(session, now);
  const active = next.active;
  if (next.finished || next.paused || !active || answer?.roundId !== active.id
    || !active.optionIds.includes(answer?.wordId)) {
    return { session: next, accepted: false, correct: null };
  }
  const correct = answer.wordId === active.wordId;
  const combo = correct ? next.combo + 1 : 0;
  let result = {
    ...next,
    score: next.score + (correct ? 10 + Math.min(next.combo, 5) * 2 : 0),
    hits: next.hits + (correct ? 1 : 0),
    misses: next.misses + (correct ? 0 : 1),
    lives: next.lives - (correct ? 0 : 1),
    combo,
    bestCombo: Math.max(next.bestCombo, combo),
    correctWordIds: correct ? unique([...next.correctWordIds, active.wordId]) : next.correctWordIds,
    lastFeedback: {
      kind: correct ? 'correct' : 'wrong',
      roundId: active.id,
      expectedWordId: active.wordId,
      selectedWordId: answer.wordId,
      at: next.lastNow,
    },
  };
  result = result.lives <= 0 ? finish(result, 'lives') : spawnWord(result, next.lastNow, active.wordId);
  return { session: result, accepted: true, correct };
}

export function pauseFalling(session, now) {
  if (session.finished || session.paused) return session;
  const next = tickFalling(session, now);
  return next.finished ? next : { ...next, paused: true, pausedAt: next.lastNow };
}

export function resumeFalling(session, now) {
  if (session.finished || !session.paused) return session;
  const time = Math.max(session.lastNow, finiteTime(now, session.lastNow));
  const gap = time - session.pausedAt;
  return {
    ...session,
    startedAt: session.startedAt + gap,
    endsAt: session.endsAt + gap,
    lastNow: time,
    active: session.active ? {
      ...session.active,
      startedAt: session.active.startedAt + gap,
      fallsAt: session.active.fallsAt + gap,
    } : null,
    paused: false,
    pausedAt: null,
    pausedTotalMs: session.pausedTotalMs + gap,
  };
}
