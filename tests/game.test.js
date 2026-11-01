import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseDeck, sameWord, shuffle, reward } from '../src/game.js';
// Synthetic fixtures only; no vocabulary shipped with the game.
const card={de:'Ä',ru:'fixture',need:'food'};
test('deck accepts valid entries and rejects malformed or duplicate data',()=>{assert.equal(parseDeck(JSON.stringify([card,{de:'B',ru:'fixture2',need:'rest'}])).length,2);for(const data of [[],[card,card],[card,{...card,de:'b',need:'invalid'}]])assert.throws(()=>parseDeck(JSON.stringify(data)));});
test('letter answer supports German case and composed umlauts',()=>{assert.ok(sameWord('A\u0308','ä'));assert.ok(!sameWord('a','ä'));});
test('shuffle preserves repeated letters',()=>{assert.deepEqual(shuffle(['a','a','b']).sort(),['a','a','b']);});
test('care caps energy and does not count a learned word twice',()=>{const first=reward({bond:0,energy:98,learned:[]},card);const second=reward(first,card);assert.equal(second.energy,100);assert.equal(second.bond,2);assert.deepEqual(second.learned,['Ä']);});
import fs from 'node:fs';
test('every starter word is traceable to the supplied Anki deck',()=>{const source=JSON.parse(fs.readFileSync(new URL('../data/source-deck.json',import.meta.url)));const deck=JSON.parse(fs.readFileSync(new URL('../src/deck.json',import.meta.url)));assert.equal(source.cards.length,4055);assert.equal(parseDeck(JSON.stringify(deck)).length,12);for(const card of deck){const original=source.cards.find(c=>c.en===card.source_en && c.de===card.source_de);assert.ok(original);assert.ok(original.de.split(',').includes(card.de));}});
