import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import data from '../src/conversations.json' with { type: 'json' };
import { objectSVG, supportedObjectKeys } from '../src/objects.js';
const source=JSON.parse(fs.readFileSync(new URL('../data/source-deck.json',import.meta.url))).cards;
const sourceRecord=(en,de)=>source.find(row=>row.en===en&&row.de===de);
const normalized=s=>s.normalize('NFC').toLocaleLowerCase('de');
const tokens=s=>s.match(/[A-Za-zÄÖÜäöüß]+/g).map(normalized);
const forms=new Set(data.lexemes.flatMap(entry=>entry.forms.map(normalized)));
const phrases=[...data.items.flatMap(item=>['request','reply','accept','decline'].map(kind=>({de:item[kind+'De'],ru:item[kind+'Ru']}))),...Object.values(data.moods),...Object.values(data.inspection)];
test('all twelve care targets are illustrated, source-backed nouns in five needs',()=>{
 assert.equal(data.items.length,12);
 assert.equal(new Set(data.items.map(item=>item.id)).size,12);
 assert.deepEqual(new Set(data.items.map(item=>item.need)),new Set(['food','drink','rest','play','wash']));
 for(const item of data.items){
  assert.ok(supportedObjectKeys.includes(item.item),item.item);
  assert.ok(source.some(row=>row.de.split(',').map(s=>s.trim()).includes(item.word)),item.word);
  assert.ok(item.requestDe.includes(item.word),`Request should name target ${item.word}`);
  assert.notEqual(item.acceptDe,item.declineDe);
 }
});
test('every spoken German token belongs to a documented dictionary lemma or its grammatical form',()=>{
 for(const entry of data.lexemes){
  const original=sourceRecord(entry.source_en,entry.source_de);
  assert.ok(original,entry.lemma);
  assert.ok(original.de.split(',').map(s=>s.trim()).includes(entry.lemma),entry.lemma);
  assert.ok(entry.forms.includes(entry.lemma));
 }
 for(const phrase of phrases){
  assert.ok(phrase.de.length>10 && /[.!?]$/.test(phrase.de),phrase.de);
  assert.ok(/[а-яё]/iu.test(phrase.ru),phrase.ru);
  for(const word of tokens(phrase.de))assert.ok(forms.has(word),`${word}: ${phrase.de}`);
 }
});
test('requests and reactions convey complete intent rather than isolated vocabulary',()=>{
 for(const item of data.items){
  assert.match(item.requestDe,/Ich (bin|möchte)/);
  assert.match(item.replyDe,/^Hier ist /);
  assert.match(item.acceptDe,/^Danke!/);
  assert.match(item.declineDe,/^Danke, aber ich /);
 }
 assert.ok(data.moods.petNegative.de.includes('schlafen'));
 assert.ok(data.moods.ignored.de.includes('traurig'));
 assert.ok(data.moods.partial.de.includes('gut'));
});
test('all illustrated game and room objects are self-contained SVGs with a safe fallback',()=>{
 assert.equal(new Set(supportedObjectKeys).size,supportedObjectKeys.length);
 for(const key of supportedObjectKeys){
  const svg=objectSVG(key);
  assert.match(svg,/viewBox="0 0 100 100"/);
  assert.match(svg,/<svg .*<\/svg>$/s);
  assert.doesNotMatch(svg,/<script|<foreignObject|<image|href=|url\(/i);
  assert.ok(svg.length>300,key);
 }
 assert.match(objectSVG('not-a-real-item'),/<svg /);
});
