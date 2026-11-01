export const categories = { food: 'Еда', drink: 'Вода', rest: 'Сон', play: 'Игра' };
export function parseDeck(text) {
  const data = JSON.parse(text);
  if (!Array.isArray(data) || data.length < 2 || data.length > 200) throw new Error('Нужно от 2 до 200 карточек.');
  const seen = new Set();
  return data.map((item) => {
    if (!item || typeof item.de !== 'string' || typeof item.ru !== 'string' || !categories[item.need]) throw new Error('Каждой карточке нужны de, ru и need: food, drink, rest или play.');
    const de = item.de.trim().normalize('NFC'), ru = item.ru.trim();
    if (!de || !ru || de.length > 40 || ru.length > 100 || seen.has(de.toLocaleLowerCase('de'))) throw new Error('Проверьте длину слов и уберите повторы.');
    seen.add(de.toLocaleLowerCase('de'));
    return { de, ru, need: item.need };
  });
}
export function sameWord(a,b) { return a.normalize('NFC').trim().toLocaleLowerCase('de') === b.normalize('NFC').trim().toLocaleLowerCase('de'); }
export function shuffle(values, random = Math.random) {
  const result = [...values];
  for (let i=result.length-1;i>0;i--) { const j=Math.floor(random()*(i+1)); [result[i],result[j]]=[result[j],result[i]]; }
  return result;
}
export function reward(state, card) {
  return { ...state, bond: state.bond + 1, energy: Math.min(100,state.energy+8), learned: [...new Set([...state.learned,card.de])] };
}
