import './style.css';
import './apartment.css';
import './learning.css';
import curriculum from './curriculum.json';
import conversationData from './conversations.json';
import {catSVG} from './cat.js';
import {objectSVG, supportedObjectKeys} from './objects.js';
import {rooms, apartmentHTML} from './apartment.js';
import {categories,SAVE_KEY,restoreGame,advanceTime,pickRequest,moodFor,applyCare,ignoreRequest,petCat,shuffle} from './game.js';
import {unlockedTopics,unlockedWords,restoreLearning,rememberWord,finishLearningGame} from './progression.js';
import {createFallingSession,tickFalling,answerFalling,currentFalling,pauseFalling,resumeFalling} from './minigames.js';
import {speakGerman,stopSpeech} from './speech.js';

const root=document.querySelector('#app');
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const allWords=curriculum.topics.flatMap(topic=>topic.words.map(word=>({...word,topicId:topic.id,topicTitle:topic.title,trust:topic.trust})));
const byId=new Map(allWords.map(word=>[word.id,word]));
const conversations=conversationData.items;
const careDeck=conversations.map(c=>({...allWords.find(w=>w.de===c.word),de:c.word,need:c.need,visual:c.item,conversation:c}));
const roomForNeed={food:'kitchen',drink:'kitchen',rest:'bedroom',wash:'bathroom',play:'playroom'};
const gameThemes=[{id:'food',title:'Еда и напитки',note:'Узнавай то, что видишь на кухне.'},{id:'appliances',title:'Бытовые приборы',note:'Квартира знакомыми словами.'},{id:'kitchen',title:'Кухонные принадлежности',note:'Посуда и вещи для готовки.'}];
const iconPaths={food:'M3 12c4-8 11-8 15 0-4 8-11 8-15 0Zm15 0 4-5v10l-4-5ZM8 11h.01',drink:'M12 2C9 7 5 11 5 15a7 7 0 0 0 14 0c0-4-4-8-7-13Z',rest:'M20 15A9 9 0 0 1 9 3a9 9 0 1 0 11 12Z',play:'m12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3 3-7Z',wash:'M4 14h16l-2 6H6l-2-6ZM7 14V6a3 3 0 0 1 6 0v1h3M9 10h5',heart:'M20 5c-3-3-7-1-8 2-1-3-5-5-8-2-5 5 3 11 8 15 5-4 13-10 8-15Z',book:'M12 5C8 2 3 4 3 4v15s5-2 9 1c4-3 9-1 9-1V4s-5-2-9 1Zm0 0v15',settings:'M4 7h16M4 17h16M8 4v6M16 14v6',close:'m6 6 12 12M6 18 18 6',back:'m14 5-7 7 7 7',arrow:'M5 12h14m-6-6 6 6-6 6',sound:'m3 9 5 0 5-5v16l-5-5H3V9Zm14-2q7 5 0 10M16 10q3 2 0 4',home:'m3 11 9-8 9 8M5 10v11h14V10M10 21v-7h4v7',lock:'M6 10h12v11H6V10Zm3 0V6a3 3 0 0 1 6 0v4'};
const icon=name=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${iconPaths[name]||iconPaths.home}"/></svg>`;
const fullWord=word=>[word.article,word.de].filter(Boolean).join(' ');
const hasArt=word=>word?.visual&&supportedObjectKeys.includes(word.visual);
const art=word=>hasArt(word)?objectSVG(word.visual):icon('book');
function read(key){try{return JSON.parse(localStorage.getItem(key)||'null');}catch{return null;}}
const saved=read(SAVE_KEY);
let state=restoreLearning(restoreGame(saved,read('mooncat'),allWords),saved,curriculum.topics);
state.room=rooms.some(r=>r.id===saved?.room)?saved.room:'bedroom';
state.translate=saved?.translate===true;
let onboarding=state.introduced?null:'language', sheet=null, reaction='', response=null;
let story=state.lastStory,notice='',storageError=false,falling=null,fallingId=null,frame=0;
let request=careDeck.find(c=>c.de===state.request)||pickRequest(state,careDeck);
state.request=request.de;
const moodTitle={happy:'Рад быть рядом',hungry:'Кажется, проголодался',thirsty:'Ищет твоего взгляда',sleepy:'Глазки слипаются',bored:'Хочет внимания',sad:'Держится в стороне',angry:'Немного обижен',dirty:'Хочет умыться'};
function mood(){return moodFor(state,reaction);}
function save(){
  state.openedTopics=unlockedTopics(curriculum.topics,state.bond,state.openedTopics);
  try{localStorage.setItem(SAVE_KEY,JSON.stringify(state));storageError=false;}catch{storageError=true;}
}
function isOpen(word){return state.openedTopics.includes(word.topicId);}
function openWords(){return unlockedWords(curriculum.topics,state.openedTopics);}
function gamePool(category){return openWords().filter(w=>w.gameCategory===category&&hasArt(w));}
function roomTitle(){return rooms.find(r=>r.id===state.room)?.title||'Квартира';}
function getPhrase(){return response||{de:request.conversation.requestDe,ru:request.conversation.requestRu};}
function exampleFor(word){
  if(word.article&&hasArt(word))return {de:`Das ist ${word.article} ${word.de}.`,ru:`Это ${word.ru}.`};
  const direct=conversations.find(c=>c.word===word.de);if(direct)return {de:direct.requestDe,ru:direct.requestRu};
  const lexeme=conversationData.lexemes.find(l=>l.lemma?.toLocaleLowerCase('de')===word.de.toLocaleLowerCase('de'));
  if(lexeme){
    const forms=new Set(lexeme.forms.map(f=>f.toLocaleLowerCase('de')));
    for(const c of conversations)for(const key of ['request','reply','accept'])if((c[key+'De'].match(/[\p{L}]+/gu)||[]).some(w=>forms.has(w.toLocaleLowerCase('de'))))return {de:c[key+'De'],ru:c[key+'Ru']};
  }
  return null;
}
function meters(){return Object.entries(categories).map(([key,label])=>`<div class="meter ${state.needs[key]<40?'low':''}" data-need="${key}" role="meter" aria-label="${label}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${state.needs[key]}"><span class="meter-symbol">${icon(key)}</span><span class="meter-track"><span style="width:${state.needs[key]}%"></span></span><span class="meter-value">${state.needs[key]}</span></div>`).join('');}
function render(){
  cancelAnimationFrame(frame);
  const focus=document.activeElement?.dataset.focus;
  const phrase=getPhrase();
  const annotated=allWords.map(w=>({...w,locked:!isOpen(w)}));
  const cat=`<button class="cat-touch" data-action="pet" aria-label="Погладить Люми">${catSVG(mood())}</button>`;
  root.innerHTML=`<main class="game mood-${mood()}" aria-label="Квартира Люми"><div class="sky" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i></div><header class="hud"><div class="name"><span class="tiny-moon">☾</span><div><h1>Люми</h1><span>${escape(roomTitle())} · ${escape(moodTitle[mood()])}</span></div></div><button class="bond" data-action="journal" aria-label="Доверие: ${state.bond} из 100">${icon('heart')}<span data-testid="bond">${state.bond}</span></button><button class="icon-button" data-action="settings" aria-label="Настройки">${icon('settings')}</button></header><section class="needs" aria-label="Состояние кота">${meters()}</section><section class="stage" aria-label="${escape(roomTitle())}">${apartmentHTML(state.room,annotated,cat)}<div class="bubble ${response?'reaction':''}"><button class="bubble-main" data-action="reply" aria-label="Ответить Люми"><strong lang="de">${escape(phrase.de)}</strong>${state.translate?`<span class="phrase-translation">${escape(phrase.ru)}</span>`:''}</button><div class="bubble-tools"><button data-action="speak-request" aria-label="Послушать Люми">${icon('sound')}</button><button data-action="hint" aria-label="Понять просьбу">?</button><small>${response?'Коснись, чтобы слушать дальше':'Что он хочет сказать?'}</small></div></div></section><div class="story-line" role="status">${escape(storageError?'Не удалось сохранить прогресс на устройстве.':notice||story||'Нажимай на предметы. У каждой знакомой вещи появится новое имя.')}</div><div class="main-actions"><button class="answer-button" data-action="reply">${response?'Слушать дальше':'Ответить Люми'}${icon('arrow')}</button><button class="book-button" data-action="book" aria-label="Открыть словарь">${icon('book')}</button></div><nav class="room-dock" aria-label="Комнаты квартиры">${rooms.map(r=>`<button data-action="room" data-room="${r.id}" aria-current="${r.id===state.room?'page':'false'}">${icon(({bedroom:'rest',bathroom:'wash',kitchen:'food',playroom:'play'})[r.id])}<span>${escape(r.title)}</span></button>`).join('')}</nav>${onboarding?intro():''}${sheet?dialog():''}</main>`;
  const modal=document.querySelector('dialog');
  if(modal){modal.showModal();modal.addEventListener('cancel',event=>{event.preventDefault();if(!onboarding)closeSheet();});}
  if(focus)document.querySelector(`[data-focus="${CSS.escape(focus)}"]`)?.focus();
  if(sheet?.type==='falling'&&falling?.available&&!falling.finished&&!falling.paused)frame=requestAnimationFrame(animateFalling);
}
function intro(){return `<dialog class="onboarding" aria-labelledby="intro-title"><div class="intro-moon">☾</div>${onboarding==='language'?`<p class="eyebrow">ПЕРЕД ПЕРВОЙ ВСТРЕЧЕЙ</p><h2 id="intro-title">Какой язык будем открывать?</h2><p>Интерфейс — на русском. Этот выбор останется за пределами вашей истории.</p><button class="language selected"><span>Немецкий</span><span>Выбран ✓</span></button><p class="muted">В демоверсии доступен один язык.</p><button class="primary" data-action="meet">Найти своего спутника ${icon('arrow')}</button>`:`<p class="eyebrow">ТИХАЯ СТОРОНА ЛУНЫ</p><h2 id="intro-title">Кто-то ждёт тебя.</h2><p>У маленького кота есть дом, но пока нет друга. Он касается твоей ладони и шепчет незнакомые слова.</p><p>Исследуй квартиру, узнавай названия вещей и учись понимать просьбы Люми. В игровой комнате тебя ждёт автомат.</p><button class="primary" data-action="begin">Остаться с Люми ${icon('heart')}</button>`}</dialog>`;}
function topicCards(){return curriculum.topics.map(t=>{
  const open=state.openedTopics.includes(t.id),seen=t.words.filter(w=>state.vocabProgress[w.id]?.seen||state.vocabProgress[w.id]?.used||state.vocabProgress[w.id]?.understood).length;
  return `<button class="topic-card ${open?'':'locked'}" data-action="topic" data-topic="${t.id}" data-locked="${!open}"><span class="topic-mark">${open?icon('book'):icon('lock')}</span><span><strong>${escape(t.title)}</strong><small>${open?`${seen} / ${t.words.length} знакомых слов`:`Откроется при доверии ${t.trust}`}</small></span><span>${open?'→':''}</span></button>`;
}).join('');}
function wordInspector(word){
  const example=exampleFor(word),usage=conversationData.inspection[word.visual],progress=state.vocabProgress[word.id];
  return `<div class="object-card">${hasArt(word)?`<div class="object-picture">${art(word)}</div>`:''}<span class="eyebrow">${escape(word.topicTitle)}</span><div class="word-heading"><h3 lang="de">${escape(fullWord(word))}</h3><button class="icon-button" data-action="speak-word" data-word-id="${word.id}" aria-label="Послушать слово">${icon('sound')}</button></div><p class="word-meaning">${escape(word.ru)}</p>${example?`<div class="example"><p lang="de">${escape(example.de)}</p><span>${escape(example.ru)}</span><button data-action="speak-example" data-word-id="${word.id}">${icon('sound')} Послушать фразу</button></div>`:''}${usage&&usage.de!==example?.de?`<div class="example usage-example"><p lang="de">${escape(usage.de)}</p><span>${escape(usage.ru)}</span><button data-action="speak-example" data-kind="usage" data-word-id="${word.id}">${icon('sound')} Послушать в контексте</button></div>`:''}<span class="learning-status">${progress?.used?'Уже применялось в заботе':progress?.understood?'Уже узнавалось в игре':'Ты познакомился с этим словом'}</span></div>${!response&&careDeck.some(c=>c.id===word.id)?`<button class="primary" data-action="use-object" data-word-id="${word.id}">Предложить Люми ${icon('heart')}</button>`:''}<button class="quiet wide" data-action="topic" data-topic="${word.topicId}">Открыть тему «${escape(word.topicTitle)}»</button>`;
}
function careContent(){
  const requiredRoom=roomForNeed[request.need];
  if(state.room!==requiredRoom)return `<p class="sheet-copy" lang="de">${escape(request.conversation.requestDe)}</p><p class="sheet-copy">Нужные вещи — ${requiredRoom==='kitchen'?'на кухне':requiredRoom==='bedroom'?'в спальне':requiredRoom==='bathroom'?'в санузле':'в игровой'}.</p><button class="primary" data-action="go-care">Пойти ${requiredRoom==='kitchen'?'на кухню':requiredRoom==='bedroom'?'в спальню':requiredRoom==='bathroom'?'в санузел':'в игровую'} ${icon('arrow')}</button><div class="sheet-links"><button data-action="hint">Подсказка</button><button data-action="ignore">Не сейчас</button></div>`;
  return `<p class="sheet-copy" lang="de">${escape(request.conversation.requestDe)}</p><p class="muted">Предложи предмет. Это уход за Люми, без таймера и игровых очков.</p><div class="gifts visual-gifts">${sheet.options.map(c=>`<button data-action="give" data-word="${escape(c.de)}" aria-label="Предложить ${escape(fullWord(c))}"><div>${art(c)}</div><span lang="de">${escape(fullWord(c))}</span><small lang="de">${escape(c.conversation.replyDe)}</small></button>`).join('')}</div><div class="sheet-links"><button data-action="hint">${icon('book')} Понять просьбу</button><button data-action="ignore">Не сейчас</button></div>`;
}
function arcadeContent(){return `<p class="sheet-copy">Слово падает сверху. Нажми на подходящую картинку до того, как оно коснётся пола. Раунд — 45 секунд, 5 попыток.</p><p class="muted">Ошибки в автомате не портят отношения и не меняют состояние Люми. До +3 доверия за законченный раунд; темы используются из твоего открытого словаря.</p><div class="game-themes">${gameThemes.map(theme=>{const pool=gamePool(theme.id);return `<button data-action="start-game" data-category="${theme.id}" class="${pool.length<4?'locked':''}"><strong>${theme.title}</strong><span>${pool.length>=4?`${pool.length} слов · играть →`:'Открой ещё слова этой темы: нужно не меньше 4 предметов'}</span><small>${theme.note}</small></button>`;}).join('')}</div>`;}
function fallingContent(){
  if(!falling?.available)return `<p class="sheet-copy">${escape(falling?.reason||'Для этой игры ещё мало открытых предметов.')}</p><button class="primary" data-action="arcade">Выбрать другую тему</button>`;
  if(falling.finished){
    const reward=Math.min(3,Math.floor(falling.hits/3));
    return `<div class="game-result"><p class="eyebrow">РАУНД ЗАВЕРШЁН</p><strong>${falling.score}</strong><p>${falling.hits} поймано · ${falling.misses} ошибок</p><p class="muted">${reward?`Доверие +${reward}. `:''}Состояние Люми не менялось.</p><div class="learned">${falling.correctWordIds.map(id=>`<span lang="de">${escape(fullWord(byId.get(id)))}</span>`).join('')||'Попробуй ещё раз: знакомые образы помогут.'}</div></div><button class="primary" data-action="replay">Ещё раунд ${icon('play')}</button><button class="quiet wide" data-action="arcade">К выбору темы</button>`;
  }
  const current=currentFalling(falling);
  const feedback=falling.lastFeedback;
  const expected=feedback?byId.get(feedback.expectedWordId):null;
  return `<div class="falling-score"><span><b id="mini-score">${falling.score}</b> очков</span><span id="mini-lives">${falling.lives} попыток</span><span id="mini-time">${Math.ceil((falling.endsAt-falling.lastNow)/1000)} с</span></div><div class="falling-arena" aria-label="Поле падающих слов"><div class="falling-stars" aria-hidden="true">·　✦　·　　　·　✧</div><div class="falling-word" id="falling-word" data-round-id="${current.roundId}" lang="de">${escape(fullWord(current.word))}</div><div class="falling-ground" aria-hidden="true"></div></div><p class="mini-feedback" role="status">${expected?feedback.kind==='correct'?`Верно: ${fullWord(expected)} — ${expected.ru}`:`${feedback.kind==='missed'?'Слово упало.':'Другой образ.'} Это ${fullWord(expected)} — ${expected.ru}`:'Лови слово: нажми на подходящий образ.'}</p><div class="falling-choices">${current.options.map((word,i)=>`<button data-action="catch" data-word-id="${word.id}" data-round-id="${current.roundId}" data-focus="catch-${i}" aria-label="${escape(word.ru)}">${art(word)}</button>`).join('')}</div><p class="muted mini-note">Закрытие автомата завершит игру без награды. При сворачивании игра ставится на паузу.</p>`;
}
function dialog(){
  let title='',body='';
  if(sheet.type==='care'){title='Что ты хочешь, Люми?';body=careContent();}
  else if(sheet.type==='hint'){
    const phrase=getPhrase();title='Попробуем понять';body=`<div class="hint-phrase"><p lang="de">${escape(phrase.de)}</p><span>${escape(phrase.ru)}</span><button class="quiet" data-action="speak-request">${icon('sound')} Послушать ещё раз</button></div><div class="hint-object">${art(request)}<div><strong lang="de">${escape(fullWord(request))}</strong><p>${escape(request.ru)}</p></div></div><button class="primary" data-action="return-care">Ответить Люми ${icon('arrow')}</button><button class="quiet wide" data-action="book">Тематический словарь · 300 слов</button>`;
  }else if(sheet.type==='book'){title='Словарь · 300 слов';body=`<p class="sheet-copy">Темы открываются с доверием и остаются с тобой. Знакомься с вещами в квартире, узнавай их в игре и используй в заботе.</p><div class="topic-list">${topicCards()}</div>`;}
  else if(sheet.type==='topic'){
    const topic=curriculum.topics.find(t=>t.id===sheet.id);title=topic.title;
    body=`<p class="sheet-copy">${escape(topic.description)} · ${topic.words.length} слов</p><div class="word-list">${topic.words.map(word=>`<button data-action="inspect" data-word-id="${word.id}"><span class="word-thumb">${art(word)}</span><span><strong lang="de">${escape(fullWord(word))}</strong><small>${escape(word.ru)}</small></span><span class="word-check">${state.vocabProgress[word.id]?.used?'♥':state.vocabProgress[word.id]?.understood?'✓':state.vocabProgress[word.id]?.seen?'·':''}</span></button>`).join('')}</div><button class="quiet wide" data-action="book">${icon('back')} Все темы</button>`;
  }else if(sheet.type==='object'){const word=byId.get(sheet.id);title='Новое имя знакомой вещи';body=wordInspector(word);}
  else if(sheet.type==='locked'){title='Эта тема ещё впереди';const t=curriculum.topics.find(t=>t.id===sheet.id);body=`<p class="sheet-copy">«${escape(t.title)}» откроется при доверии ${t.trust}. Сейчас — ${state.bond}. Заботься о Люми и закрепляй знакомые слова в автомате.</p><p class="muted">Когда тема откроется, она останется доступной.</p><button class="primary" data-action="book">Открытый словарь ${icon('book')}</button>`;}
  else if(sheet.type==='arcade'){title='Падающие слова';body=arcadeContent();}
  else if(sheet.type==='falling'){title=gameThemes.find(t=>t.id===sheet.category)?.title||'Падающие слова';body=fallingContent();}
  else if(sheet.type==='journal'){
    title='Ваш общий язык';const known=Object.values(state.vocabProgress).filter(p=>p.understood||p.used).length;
    body=`<p class="sheet-copy">Доверие: ${state.bond} / 100. Тем: ${state.openedTopics.length} / 10. Узнавалось или применялось слов: ${known} / 300.</p><p class="sheet-copy">Осмотр — знакомство с образом. Автомат — узнавание по памяти. Забота — применение слова в настоящей просьбе.</p><button class="primary" data-action="book">Наш словарь ${icon('book')}</button>`;
  }else{
    title='Небольшие настройки';body=`<button class="setting-toggle" data-action="translate" aria-pressed="${state.translate}"><span>Перевод под репликами</span><b>${state.translate?'Включён':'Выключен'}</b></button><p class="sheet-copy">Кнопка с динамиком озвучивает слова и фразы. На телефоне нужен установленный немецкий голос. Все подсказки бесплатны.</p><p class="muted">Прогресс сохраняется на устройстве. Ранее открытые темы не закрываются, даже если доверие снизится. Игровой автомат находится в игровой комнате.</p>`;
  }
  return `<dialog class="sheet ${sheet.type==='falling'?'game-sheet':''}" aria-labelledby="sheet-title"><div class="sheet-grip" aria-hidden="true"></div><header><h2 id="sheet-title">${title}</h2><button class="icon-button" data-action="close" aria-label="${sheet.type==='falling'?'Выйти из игры':'Закрыть'}">${icon('close')}</button></header>${body}${notice?`<p class="sheet-notice" role="status">${escape(notice)}</p>`:''}</dialog>`;
}
function closeSheet(){cancelAnimationFrame(frame);if(sheet?.type==='falling'){falling=null;stopSpeech();}sheet=null;notice='';render();}
function nextRequest(){reaction='';response=null;state=advanceTime(state);const prior=request.de;request=pickRequest({...state,request:prior},careDeck);state.request=request.de;notice='';save();}
function openCare(){if(response)nextRequest();sheet={type:'care',options:shuffle([request,...shuffle(careDeck.filter(c=>c.need!==request.need)).slice(0,3)])};notice='';render();}
function finishCare(given){
  if(!given)return;
  const result=applyCare(state,request,given);state=result.state;
  if(result.exact&&given.id)state=rememberWord(state,given.id,'used');
  reaction=result.useful?'happy':'angry';
  story=result.exact?'Люми принял заботу. Вы поняли друг друга. Доверие +6.':result.useful?'Это помогло, хотя Люми просил о другом. Доверие +2.':'Сейчас Люми нужно другое. Доверие −6.';
  response=result.exact?{de:request.conversation.acceptDe,ru:request.conversation.acceptRu}:result.useful?conversationData.moods.partial:{de:request.conversation.declineDe,ru:request.conversation.declineRu};
  state.lastStory=story;sheet=null;notice='';save();render();
}
function openWord(id){const word=byId.get(id);if(!word)return;if(!isOpen(word)){sheet={type:'locked',id:word.topicId};render();return;}state=rememberWord(state,id);save();sheet={type:'object',id};notice='';render();}
async function speak(text){try{await speakGerman(text);}catch(error){notice=error.message;render();}}
function startGame(category){
  if(gamePool(category).length<4){notice='Сначала открой больше слов этой темы в словаре.';render();return;}
  falling=createFallingSession(gamePool(category),performance.now());fallingId=crypto.randomUUID();sheet={type:'falling',category};notice='';render();
}
function awardGame(){if(!falling?.available||!falling.finished)return;state=finishLearningGame(state,fallingId,falling.correctWordIds,falling.hits);save();}
function animateFalling(now){
  if(sheet?.type!=='falling'||!falling||falling.finished)return;
  const oldRound=currentFalling(falling)?.roundId;falling=tickFalling(falling,now);
  if(falling.finished){awardGame();render();return;}
  const current=currentFalling(falling);
  if(current.roundId!==oldRound){render();return;}
  const arena=document.querySelector('.falling-arena'),word=document.querySelector('#falling-word');
  if(arena&&word)word.style.transform=`translate(-50%,${current.progress*Math.max(1,arena.clientHeight-word.offsetHeight-12)}px)`;
  const time=document.querySelector('#mini-time');if(time)time.textContent=Math.max(0,Math.ceil((falling.endsAt-falling.lastNow)/1000))+' с';
  frame=requestAnimationFrame(animateFalling);
}
root.addEventListener('click',event=>{
  const b=event.target.closest('button[data-action]');if(!b||b.disabled)return;
  const action=b.dataset.action;
  if(action==='meet'){onboarding='story';render();return;}
  if(action==='begin'){state.introduced=true;onboarding=null;save();render();return;}
  if(action==='close'){closeSheet();return;}
  if(action==='room'){state.room=b.dataset.room;sheet=null;notice='';save();render();return;}
  if(action==='inspect'){openWord(b.dataset.wordId);return;}
  if(action==='topic'){
    const t=curriculum.topics.find(t=>t.id===b.dataset.topic);if(!t)return;
    sheet={type:state.openedTopics.includes(t.id)?'topic':'locked',id:t.id};notice='';render();return;
  }
  if(action==='reply'){if(response){nextRequest();render();}else openCare();return;}
  if(action==='return-care'){openCare();return;}
  if(action==='go-care'){state.room=roomForNeed[request.need];save();openCare();return;}
  if(action==='give'){finishCare(careDeck.find(c=>c.de===b.dataset.word));return;}
  if(action==='use-object'){if(response){nextRequest();sheet=null;render();return;}finishCare(careDeck.find(c=>c.id===b.dataset.wordId));return;}
  if(action==='ignore'){
    state=ignoreRequest(state);reaction='sad';response=conversationData.moods.ignored;story='Люми остался ждать. Доверие −3.';state.lastStory=story;sheet=null;notice='';save();render();return;
  }
  if(action==='pet'){
    const result=petCat(state);state=result.state;
    if(!result.delta)notice='Люми ещё чувствует тепло твоей ладони.';
    else{reaction=result.delta>0?'happy':'angry';response=conversationData.moods[result.delta>0?'petPositive':'petNegative'];story=result.delta>0?'Люми тянется к твоей ладони. Доверие +2.':'Люми устал и хочет покоя. Доверие −2.';state.lastStory=story;notice='';}
    save();render();return;
  }
  if(action==='speak-request'){void speak(getPhrase().de);return;}
  if(action==='speak-word'){const w=byId.get(b.dataset.wordId);if(w)void speak(fullWord(w));return;}
  if(action==='speak-example'){const w=byId.get(b.dataset.wordId);const phrase=w&&(b.dataset.kind==='usage'?conversationData.inspection[w.visual]:exampleFor(w));if(phrase)void speak(phrase.de);return;}
  if(action==='translate'){state.translate=!state.translate;save();render();return;}
  if(action==='arcade'){if(falling){cancelAnimationFrame(frame);falling=null;}sheet={type:'arcade'};notice='';render();return;}
  if(action==='start-game'){startGame(b.dataset.category);return;}
  if(action==='replay'){startGame(sheet.category);return;}
  if(action==='catch'){
    if(sheet?.type!=='falling'||!falling||falling.finished)return;
    const result=answerFalling(falling,{wordId:b.dataset.wordId,roundId:Number(b.dataset.roundId)},performance.now());falling=result.session;awardGame();render();return;
  }
  if(['hint','book','settings','journal'].includes(action)){sheet={type:action};notice='';render();}
});
document.addEventListener('visibilitychange',()=>{
  if(document.visibilityState==='hidden'){cancelAnimationFrame(frame);if(falling&&!falling.finished)falling=pauseFalling(falling,performance.now());if(falling?.finished)awardGame();stopSpeech();}
  else{if(falling&&!falling.finished)falling=resumeFalling(falling,performance.now());if(falling?.finished)awardGame();state=advanceTime(state);save();render();}
});
save();render();
