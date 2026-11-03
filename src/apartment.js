import { objectSVG, supportedObjectKeys } from './objects.js';

/** Original room scenes. Words are supplied by the curriculum, never invented here. */
export const rooms = Object.freeze([
  { id: 'bedroom', title: 'Спальня', subtitle: 'Тихий уголок Люми', icon: 'rest' },
  { id: 'bathroom', title: 'Санузел', subtitle: 'Чистота и тёплая вода', icon: 'wash' },
  { id: 'kitchen', title: 'Кухня', subtitle: 'Забота начинается с мелочей', icon: 'food' },
  { id: 'playroom', title: 'Игровая', subtitle: 'Место для маленьких открытий', icon: 'play' },
]);

const roomObjects = {
  bedroom: [
    { visual: 'bed', nouns: ['Bett'], x: -2, y: 67, width: 47, height: 30 },
    { visual: 'lamp', nouns: ['Lampe'], x: 1, y: 35, width: 22, height: 32 },
    { visual: 'window', nouns: ['Fenster'], x: 76, y: 30, width: 24, height: 27 },
    { visual: 'book', nouns: ['Buch'], x: 79, y: 58, width: 21, height: 20 },
    { visual: 'toy', nouns: ['Spielzeug'], x: 76, y: 78, width: 23, height: 20 },
  ],
  bathroom: [
    { visual: 'shower', nouns: ['Dusche'], x: -1, y: 33, width: 31, height: 37 },
    { visual: 'toilet', nouns: ['Toilette'], x: -2, y: 71, width: 28, height: 27 },
    { visual: 'mirror', nouns: ['Spiegel'], x: 78, y: 33, width: 22, height: 29 },
    { visual: 'towel', nouns: ['Handtuch'], x: 78, y: 62, width: 22, height: 23 },
    { visual: 'soap', nouns: ['Seife'], x: 72, y: 84, width: 26, height: 15 },
  ],
  kitchen: [
    { visual: 'fridge', nouns: ['Kühlschrank'], x: -2, y: 31, width: 29, height: 44 },
    { visual: 'stove', nouns: ['Herd'], x: -1, y: 73, width: 32, height: 26 },
    { visual: 'table', nouns: ['Tisch'], x: 56, y: 78, width: 43, height: 21 },
    { visual: 'chair', nouns: ['Stuhl'], x: 78, y: 58, width: 20, height: 23 },
    { visual: 'cup', nouns: ['Tasse'], x: 76, y: 35, width: 22, height: 21 },
    { visual: 'plate', nouns: ['Teller'], x: 68, y: 50, width: 19, height: 15 },
  ],
  playroom: [
    { visual: 'radio', nouns: ['Radio'], x: 0, y: 33, width: 24, height: 22 },
    { visual: 'computer', nouns: ['Computer'], x: -1, y: 57, width: 30, height: 29 },
    { visual: 'book', nouns: ['Buch'], x: 3, y: 47, width: 19, height: 17 },
    { visual: 'ball', nouns: ['Ball'], x: 2, y: 81, width: 25, height: 18 },
    { visual: 'toy', nouns: ['Spielzeug'], x: 66, y: 83, width: 23, height: 16 },
  ],
};
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const canonical = value => String(value || '').normalize('NFC').trim().toLocaleLowerCase('de');
const supported = new Set(supportedObjectKeys);

function roomDefinition(roomId) {
  return rooms.find(room => room.id === roomId) || rooms[0];
}
function resolveObjects(roomId, words) {
  const room = roomDefinition(roomId);
  const list = Array.isArray(words) ? words : [];
  return roomObjects[room.id].flatMap(slot => {
    if (!supported.has(slot.visual)) return [];
    const word = list.find(entry => entry?.id && entry.visual === slot.visual)
      || list.find(entry => entry?.id && slot.nouns.some(noun => canonical(noun) === canonical(entry.de)));
    return word ? [{ slot, word }] : [];
  });
}
export function roomWordIds(roomId, words) {
  return [...new Set(resolveObjects(roomId, words).map(({ word }) => word.id))];
}

function marker(locked) {
  return locked
    ? '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M5 7V5a3 3 0 0 1 6 0v2M4 7h8v7H4z"/></svg>'
    : '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 4v8M4 8h8"/></svg>';
}
function objectButton({ slot, word }) {
  const label = `${word.locked ? 'Откроется позже' : 'Изучить предмет'}: ${word.ru}`;
  return `<button class="apartment__hotspot apartment__hotspot--${slot.visual}${word.locked ? ' is-locked' : ''}" data-action="inspect" data-word-id="${escape(word.id)}" aria-label="${escape(label)}" style="--object-x:${slot.x}%;--object-y:${slot.y}%;--object-w:${slot.width}%;--object-h:${slot.height}%"><span class="apartment__drawing">${objectSVG(slot.visual)}<span class="apartment__marker">${marker(word.locked)}</span></span></button>`;
}

function scenery(roomId) {
  const common = '<path d="M0 350h400v150H0Z" class="apartment__floor-fill"/><path d="M0 350h400M0 360h400M20 500l120-150m240 150L260 350M0 423h400" class="apartment__floor-lines"/><ellipse cx="202" cy="425" rx="115" ry="40" class="apartment__rug"/>';
  const decor = {
    bedroom: '<path d="M0 108v242M400 108v242" class="apartment__wall-line"/><path d="m36 174 8 14 16 2-12 12 3 17-15-8-15 8 3-17-12-12 16-2Z" class="apartment__hanging-star"/><path d="M36 80v94" class="apartment__wall-line"/><path d="M315 93a22 22 0 1 0 0 41 19 19 0 0 1 0-41Z" class="apartment__moon-decor"/>',
    bathroom: '<path d="M0 160h400M0 210h400M0 260h400M0 310h400M50 160v190m50-190v190m50-190v190m50-190v190m50-190v190m50-190v190m50-190v190" class="apartment__tile-line"/><path d="M278 340h105v17H278Z" class="apartment__counter"/><path d="M315 306v-16q0-12 12-12t12 12v6m-26 13h30q0 20-15 20t-15-20Z" class="apartment__sink-decor"/>',
    kitchen: '<path d="M0 285h400m0 32H0m35-32v32m55-32v32m55-32v32m55-32v32m55-32v32m55-32v32m55-32v32" class="apartment__tile-line"/><path d="M282 228h118v9H282Z" class="apartment__shelf"/><path d="M298 237v25m84-25v25" class="apartment__wall-line"/>',
    playroom: '<path d="M10 184h130v12H10Z" class="apartment__shelf"/><path d="M28 196v18m92-18v18" class="apartment__wall-line"/><path d="M45 103h310m-294 0 10 18 10-18m35 0 10 18 10-18m35 0 10 18 10-18m35 0 10 18 10-18m35 0 10 18 10-18m35 0 10 18 10-18" class="apartment__bunting"/><path d="M25 445h350" class="apartment__play-floor"/>',
  };
  return `<svg class="apartment__scenery" viewBox="0 0 400 500" preserveAspectRatio="none" aria-hidden="true">${decor[roomId]}${common}</svg>`;
}
function arcade() {
  return `<button class="apartment__arcade" data-action="arcade" aria-label="Игровой автомат — Падающие слова"><svg viewBox="0 0 100 155" aria-hidden="true"><ellipse cx="51" cy="148" rx="43" ry="5" fill="#19132c" opacity=".24"/><path d="m17 8 63 0 7 20-5 53 9 55q1 8-9 8H15q-8 0-6-8l8-55-6-53Z" fill="#9d7cac" stroke="#d2b1cf" stroke-width="2"/><path d="M18 11h59l5 17H14Z" fill="#e7cda4"/><path d="M49 14a7 7 0 1 0 0 11 6 6 0 0 1 0-11Z" fill="#8d658e"/><path d="M18 35h60l-3 40H21Z" fill="#392c54" stroke="#d2b1cf" stroke-width="3"/><path d="M31 43h20v6H31Zm21 11h16v6H52Zm-25 9h26v6H27Z" fill="#c1b4df"/><path d="m17 81 65 0 6 14H12Z" fill="#ddbdc8"/><ellipse cx="34" cy="88" rx="9" ry="4" fill="#91739c"/><path d="M34 88V76" stroke="#695174" stroke-width="4" stroke-linecap="round"/><circle cx="34" cy="74" r="5" fill="#dfb3a6"/><ellipse cx="67" cy="88" rx="6" ry="3" fill="#f0d39f"/><path d="M20 102h58v28H20Z" fill="#795b8b"/><path d="M43 111h14v5H43Z" fill="#d4b7c5"/><path d="M17 141v5m63-5v5" stroke="#5c456c" stroke-width="5" stroke-linecap="round"/></svg><span class="apartment__arcade-label">Игровой автомат</span><span class="apartment__arcade-spark" aria-hidden="true">✦</span></button>`;
}

export function apartmentHTML(roomId, words, catMarkup = '') {
  const room = roomDefinition(roomId);
  return `<div class="apartment apartment--${room.id}" data-room="${room.id}">${scenery(room.id)}<div class="apartment__objects">${resolveObjects(room.id, words).map(objectButton).join('')}${room.id === 'playroom' ? arcade() : ''}</div>${catMarkup}<span class="apartment__room-name">${escape(room.title)}</span></div>`;
}
