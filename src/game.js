export const categories = { food: 'Сытость', drink: 'Вода', rest: 'Сон', play: 'Настроение' };
export const SAVE_KEY = 'mooncat-v2';
const clamp = n => Math.max(0, Math.min(100, Math.round(n)));
export function newGame(now = Date.now()) {
  return { version: 2, language: 'de', introduced: false, needs: {food:42,drink:64,rest:76,play:57}, bond:48, learned:[], turn:0, format:'mixed', lastSeen:now, lastPet:0, request:null, lastStory:'' };
}
export function restoreGame(saved, legacy, deck, now = Date.now()) {
  const state = newGame(now);
  if (saved?.version === 2) {
    state.introduced = saved.introduced === true;
    for (const key of Object.keys(categories)) state.needs[key] = Number.isFinite(saved.needs?.[key]) ? clamp(saved.needs[key]) : state.needs[key];
    state.bond = Number.isFinite(saved.bond) ? clamp(saved.bond) : state.bond;
    state.learned = Array.isArray(saved.learned) ? saved.learned.filter(w=>deck.some(c=>c.de===w)) : [];
    state.turn = Number.isSafeInteger(saved.turn) && saved.turn >= 0 ? saved.turn : 0;
    state.format = ['mixed','choice','letters'].includes(saved.format) ? saved.format : 'mixed';
    state.lastSeen = Number.isFinite(saved.lastSeen) ? Math.min(now,saved.lastSeen) : now;
    state.lastPet = Number.isFinite(saved.lastPet) ? Math.min(now,saved.lastPet) : 0;
    state.request = deck.some(c=>c.de===saved.request) ? saved.request : null;
    state.lastStory = typeof saved.lastStory === 'string' ? saved.lastStory.slice(0,250) : '';
  } else if (legacy && Array.isArray(legacy.learned)) {
    // Existing players have already met Lumi; preserve their learned words.
    state.introduced = true;
    state.learned = legacy.learned.filter(w=>deck.some(c=>c.de===w));
  }
  return advanceTime(state, now);
}
export function advanceTime(state, now = Date.now()) {
  const elapsed = Math.max(0, now-state.lastSeen);
  const ticks = Math.floor(Math.min(4*3600000,elapsed)/900000);
  if (!ticks) return state;
  return {...state, needs:Object.fromEntries(Object.entries(state.needs).map(([key,value])=>[key,clamp(value-ticks)])),lastSeen:elapsed>=4*3600000?now:state.lastSeen+ticks*900000};
}
export function pickRequest(state, deck, random = Math.random) {
  const need = Object.keys(categories).reduce((a,b)=>state.needs[a]<=state.needs[b]?a:b);
  const pool = deck.filter(c=>c.need===need);
  const fresh = pool.filter(c=>c.de!==state.request);
  const choices = fresh.length ? fresh : pool;
  return choices[Math.min(choices.length-1,Math.floor(random()*choices.length))];
}
export function moodFor(state, reaction = '') {
  if (reaction) return reaction;
  if (state.bond<25) return 'sad';
  if (state.needs.rest<38) return 'sleepy';
  if (state.needs.food<50) return 'hungry';
  if (state.needs.drink<45) return 'thirsty';
  if (state.needs.play<45) return 'bored';
  return 'happy';
}
export function answerMode(state) {
  return state.format==='mixed' ? (state.turn%3===2?'letters':'choice') : state.format;
}
export function applyCare(state, requested, given, now = Date.now()) {
  const exact = given.de===requested.de;
  const useful = given.need===requested.need;
  const delta = exact?6:useful?2:-6;
  const needs = {...state.needs};
  for(const key of Object.keys(needs)) needs[key]=clamp(needs[key]-2);
  needs[given.need]=clamp(needs[given.need]+(exact?28:useful?14:6));
  return {state:{...state,needs,bond:clamp(state.bond+delta),turn:state.turn+1,lastSeen:now,request:null,learned:exact?[...new Set([...state.learned,requested.de])]:state.learned},delta,exact,useful};
}
export function ignoreRequest(state, now = Date.now()) {
  const needs=Object.fromEntries(Object.entries(state.needs).map(([key,value])=>[key,clamp(value-4)]));
  return {...state,needs,bond:clamp(state.bond-3),turn:state.turn+1,lastSeen:now,request:null};
}
export function petCat(state, now = Date.now()) {
  if(now-state.lastPet<15000) return {state,delta:0};
  const delta=state.needs.rest<30?-2:2;
  return {state:{...state,bond:clamp(state.bond+delta),needs:{...state.needs,play:clamp(state.needs.play+4),rest:clamp(state.needs.rest+(delta<0?-3:0))},lastPet:now},delta};
}
export function sameWord(a,b) { return a.normalize('NFC').trim().toLocaleLowerCase('de') === b.normalize('NFC').trim().toLocaleLowerCase('de'); }
export function shuffle(values, random = Math.random) {
  const result = [...values];
  for (let i=result.length-1;i>0;i--) { const j=Math.floor(random()*(i+1)); [result[i],result[j]]=[result[j],result[i]]; }
  return result;
}
