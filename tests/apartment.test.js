import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rooms, roomWordIds, apartmentHTML } from '../src/apartment.js';

const fixtures=[
  {id:'bed',de:'Bett',ru:'кровать',visual:'bed'},
  {id:'soap',de:'Seife',ru:'мыло',visual:'soap',locked:true},
  {id:'table',de:'Tisch',ru:'стол',visual:'table'},
  {id:'ball',de:'Ball',ru:'мяч',visual:'ball'},
];

test('apartment has the four requested rooms and source-backed room nouns',()=>{
  assert.deepEqual(rooms.map(room=>room.id),['bedroom','bathroom','kitchen','playroom']);
  assert.deepEqual(roomWordIds('bedroom',fixtures),['bed']);
  assert.deepEqual(roomWordIds('bathroom',fixtures),['soap']);
  assert.deepEqual(roomWordIds('kitchen',fixtures),['table']);
  assert.deepEqual(roomWordIds('playroom',fixtures),['ball']);
});
test('unknown vocabulary is not fabricated and cat markup is preserved',()=>{
  const html=apartmentHTML('bedroom',[], '<button data-action="pet">cat</button>');
  assert.ok(!html.includes('data-action="inspect"'));
  assert.ok(html.includes('<button data-action="pet">cat</button>'));
  assert.deepEqual(roomWordIds('bedroom',[]),[]);
});
test('only the playroom has an accessible arcade entry',()=>{
  for(const room of rooms){
    const html=apartmentHTML(room.id,fixtures);
    assert.equal(html.includes('data-action="arcade"'),room.id==='playroom');
  }
});
test('locked furniture remains visible without teaching its German label',()=>{
  const html=apartmentHTML('bathroom',fixtures);
  assert.ok(html.includes('is-locked'));
  assert.ok(html.includes('data-word-id="soap"'));
  assert.ok(!html.includes('Seife'));
});
test('word IDs and accessible translations are escaped',()=>{
  const html=apartmentHTML('kitchen',[{id:'a"b',de:'Tisch',ru:'<стол>',visual:'table'}]);
  assert.ok(html.includes('data-word-id="a&quot;b"'));
  assert.ok(html.includes('&lt;стол&gt;'));
  assert.ok(!html.includes('ru="<стол>"'));
});
test('invalid rooms fall back to bedroom, matching displayed room and interactive IDs',()=>{
  assert.ok(apartmentHTML('unknown',fixtures).includes('data-room="bedroom"'));
  assert.deepEqual(roomWordIds('unknown',fixtures),['bed']);
});
