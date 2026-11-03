import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const curriculum = JSON.parse(fs.readFileSync(new URL('../src/curriculum.json', import.meta.url)));
const source = JSON.parse(fs.readFileSync(new URL('../data/source-deck.json', import.meta.url)));
const topics = curriculum.topics;
const words = topics.flatMap(topic => topic.words);
const normalized = word => word.normalize('NFC').toLocaleLowerCase('de');

test('curriculum contains exactly ten coherent thirty-word topics and 300 unique headwords', () => {
  assert.equal(topics.length, 10);
  assert.equal(words.length, 300);
  assert.equal(new Set(words.map(word => normalized(word.de))).size, 300);
  assert.equal(new Set(words.map(word => word.id)).size, 300);
  assert.equal(new Set(topics.map(topic => topic.id)).size, 10);
  for (const topic of topics) {
    assert.equal(topic.words.length, 30, topic.id);
    assert.match(topic.title, /[А-Яа-яЁё]/);
    assert.match(topic.description, /[А-Яа-яЁё]/);
  }
});

test('each German headword is an exact variant from the user-supplied Anki source', () => {
  for (const word of words) {
    const original = source.cards.find(card => card.en === word.source_en && card.de === word.source_de);
    assert.ok(original, `Missing source row: ${word.id}`);
    assert.ok(original.de.split(',').map(value => value.trim()).includes(word.de), `Unlisted lexeme: ${word.de}`);
    assert.equal(word.de, word.de.trim());
    assert.match(word.ru, /[А-Яа-яЁё]/, `Missing Russian meaning: ${word.id}`);
    assert.ok(!/[<>]/.test(word.de + word.ru), `Unexpected markup: ${word.id}`);
  }
});

test('initial care topic retains starter vocabulary and adds concrete objects for all care rooms', () => {
  const initial = topics.find(topic => topic.id === 'care');
  assert.equal(initial.trust, 0);
  for (const expected of ['Wasser', 'Milch', 'Fisch', 'Brot', 'Apfel', 'Bett', 'schlafen', 'ruhen', 'spielen', 'Ball', 'essen', 'trinken', 'Buch', 'Tasse', 'Spielzeug', 'Seife', 'Handtuch']) {
    assert.ok(initial.words.some(word => word.de === expected), `Initial word missing: ${expected}`);
  }
});

test('topic thresholds progress without requiring maximum trust and unlock appliance/kitchen content early', () => {
  assert.deepEqual(topics.map(topic => topic.trust), [0, 50, 55, 60, 65, 70, 75, 80, 90, 95]);
  assert.equal(topics.find(topic => topic.id === 'home').trust, 50);
  assert.equal(topics.find(topic => topic.id === 'everyday').trust, 55);
});

test('illustrated nouns have articles and all three falling-word categories have distinct image targets', () => {
  for (const word of words.filter(word => word.visual)) {
    assert.ok(['der', 'die', 'das'].includes(word.article), `Article missing for ${word.de}`);
  }
  for (const category of ['food', 'appliances', 'kitchen']) {
    const eligible = words.filter(word => word.gameCategory === category);
    assert.ok(eligible.length >= 4, `Too few ${category} targets`);
    assert.equal(new Set(eligible.map(word => word.visual)).size, eligible.length, `Duplicate ${category} image`);
    for (const word of eligible) {
      assert.ok(word.visual, `No image key for ${word.de}`);
      assert.ok(['der', 'die', 'das'].includes(word.article));
    }
  }
});

test('apartment objects use the source-backed noun sense instead of invented translations', () => {
  for (const visual of ['bed', 'lamp', 'book', 'toy', 'toilet', 'shower', 'mirror', 'towel', 'soap', 'table', 'chair', 'window', 'fridge', 'stove', 'cup', 'plate', 'ball', 'computer', 'radio']) {
    assert.ok(words.some(word => word.visual === visual), `Room object missing: ${visual}`);
  }
  assert.ok(!words.some(word => word.visual === 'sink'), 'Source sink is a verb; do not teach it as a basin');
  assert.equal(words.find(word => word.visual === 'stove').de, 'Herd');
  assert.equal(words.find(word => word.visual === 'table').article, 'der');
  assert.equal(words.find(word => word.visual === 'cup').article, 'die');
  assert.equal(words.find(word => word.visual === 'bed').article, 'das');
});

test('every root used in meaningful care and inspection phrases belongs to the 300-word foundation', () => {
  const conversations = JSON.parse(fs.readFileSync(new URL('../src/conversations.json', import.meta.url)));
  const known = new Set(words.map(word => normalized(word.de)));
  for (const entry of conversations.lexemes) {
    assert.ok(known.has(normalized(entry.lemma)), `Phrase root outside curriculum: ${entry.lemma}`);
  }
});
