// A learned theme stays open even if a later choice lowers the cat's trust.
export function unlockedTopics(topics, bond, previouslyOpened = []) {
  const known = new Set(topics.map(topic => topic.id));
  const open = new Set(previouslyOpened.filter(id => known.has(id)));
  for (const topic of topics) if (bond >= topic.trust) open.add(topic.id);
  return topics.filter(topic => open.has(topic.id)).map(topic => topic.id);
}
export function unlockedWords(topics, opened) {
  const open = new Set(opened);
  return topics.filter(topic => open.has(topic.id)).flatMap(topic => topic.words);
}
export function restoreLearning(state, saved, topics) {
  const validWords = new Set(topics.flatMap(t=>t.words.map(w=>w.id)));
  const progress = {};
  for (const [id, values] of Object.entries(saved?.vocabProgress || {})) {
    if (!validWords.has(id) || !values || typeof values !== 'object') continue;
    progress[id] = Object.fromEntries(['seen','understood','used'].map(key=>[key, Number.isFinite(values[key]) ? Math.max(0,Math.min(99,Math.round(values[key]))) : 0]));
  }
  for (const word of topics.flatMap(t=>t.words)) if (state.learned.includes(word.de) && !progress[word.id]) progress[word.id]={seen:1,understood:0,used:1};
  return {...state, openedTopics:unlockedTopics(topics,state.bond,Array.isArray(saved?.openedTopics)?saved.openedTopics:[]),vocabProgress:progress,completedGames:Array.isArray(saved?.completedGames)?saved.completedGames.filter(id=>typeof id==='string').slice(-30):[]};
}
export function rememberWord(state, id, kind = 'seen') {
  if (!['seen','understood','used'].includes(kind)) return state;
  const prior = state.vocabProgress[id] || {seen:0,understood:0,used:0};
  return {...state,vocabProgress:{...state.vocabProgress,[id]:{...prior,[kind]:Math.min(99,prior[kind]+1)}}};
}
// The arcade changes vocabulary and a small completion reward, never pet needs.
export function finishLearningGame(state, gameId, wordIds, hits) {
  if (state.completedGames.includes(gameId)) return state;
  let next = {...state,completedGames:[...state.completedGames,gameId].slice(-30),bond:Math.min(100,state.bond+Math.min(3,Math.floor(hits/3)))};
  for (const id of new Set(wordIds)) next=rememberWord(next,id,'understood');
  return next;
}
