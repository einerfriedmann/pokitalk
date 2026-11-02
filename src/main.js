import './style.css';
import deck from './deck.json';
import words from './moods.json';
import { catSVG } from './cat.js';
import { categories, SAVE_KEY, newGame, restoreGame, advanceTime, pickRequest, moodFor, answerMode, applyCare, ignoreRequest, petCat, sameWord, shuffle } from './game.js';
const root=document.querySelector('#app');
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const iconPaths={food:'M3 12c4-8 11-8 15 0-4 8-11 8-15 0Zm15 0 4-5v10l-4-5ZM8 11h.01',drink:'M12 2C9 7 5 11 5 15a7 7 0 0 0 14 0c0-4-4-8-7-13Z',rest:'M20 15A9 9 0 0 1 9 3a9 9 0 1 0 11 12Z',play:'m12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3 3-7Z',heart:'M20 5c-3-3-7-1-8 2-1-3-5-5-8-2-5 5 3 11 8 15 5-4 13-10 8-15Z',book:'M12 5C8 2 3 4 3 4v15s5-2 9 1c4-3 9-1 9-1V4s-5-2-9 1Zm0 0v15',settings:'M4 7h16M4 17h16M8 4v6M16 14v6',close:'m6 6 12 12M6 18 18 6',back:'m14 5-7 7 7 7',arrow:'M5 12h14m-6-6 6 6-6 6'};
const icon=(name)=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${iconPaths[name]||iconPaths.play}"/></svg>`;
function read(key){try{return JSON.parse(localStorage.getItem(key)||'null');}catch{return null;}}
let state=restoreGame(read(SAVE_KEY),read('mooncat'),deck);
let onboarding=state.introduced?null:'language', sheet=null, reaction='', response=null, story=state.lastStory, notice='', letters=[], answer=[];
let request=deck.find(c=>c.de===state.request)||pickRequest(state,deck);
state.request=request.de;
let storageError=false;
function save(){try{localStorage.setItem(SAVE_KEY,JSON.stringify(state));storageError=false;}catch{storageError=true;}}
function makeLetters(){letters=shuffle(Array.from(request.de));answer=[];}
makeLetters();save();
function mood(){return moodFor(state,reaction);}
const moodTitle={happy:'Тянется к тебе',hungry:'Тихонько просит',thirsty:'Ищет твоего взгляда',sleepy:'Глазки слипаются',bored:'Хочет внимания',sad:'Держится в стороне',angry:'Отворачивается'};
function bubble(){
 if(response)return response;
 const feeling=words[mood()]||words.happy;
 return {top:feeling.de+'…',bottom:answerMode(state)==='letters'?'… ?':request.de+'?',note:'Коснись пузыря, чтобы ответить'};
}
function meters(){return Object.entries(categories).map(([key,label])=>`<div class="meter ${state.needs[key]<40?'low':''}" data-need="${key}" role="meter" aria-label="${label}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${state.needs[key]}"><span class="meter-symbol">${icon(key)}</span><span class="meter-track"><span style="width:${state.needs[key]}%"></span></span><span class="meter-value">${state.needs[key]}</span></div>`).join('');}
function render(){
 const focus=document.activeElement?.dataset.focus;
 const b=bubble();
 root.innerHTML=`<main class="game mood-${mood()}" aria-label="Комната Люми"><div class="sky" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><div class="far-moon"></div></div><header class="hud"><div class="name"><span class="tiny-moon">☾</span><div><h1>Люми</h1><span>${escape(moodTitle[mood()])}</span></div></div><button class="bond" data-action="journal" aria-label="Доверие: ${state.bond} из 100">${icon('heart')}<span data-testid="bond">${state.bond}</span></button><button class="icon-button" data-action="settings" aria-label="Настройки">${icon('settings')}</button></header><section class="needs" aria-label="Состояние кота">${meters()}</section><section class="stage" aria-label="Лунный кот"><button class="bubble ${response?'reaction':''}" data-action="reply" aria-label="Ответить Люми"><span class="bubble-feeling">${escape(b.top)}</span><strong>${escape(b.bottom)}</strong><small>${escape(b.note)}</small></button><div class="floor" aria-hidden="true"></div><button class="cat-touch" data-action="pet" aria-label="Погладить Люми">${catSVG(mood())}</button><span class="touch-hint">${reaction?'':'Можно просто побыть рядом'}</span></section><div class="story-line" role="status">${escape(storageError?'Не удалось сохранить прогресс на устройстве.':notice||story||'Он смотрит на тебя. Кажется, ему что-то нужно.')}</div><div class="main-actions"><button class="answer-button" data-action="reply">${response?'Слушать дальше':'Ответить Люми'}${icon('arrow')}</button><button class="book-button" data-action="book" aria-label="Открыть карточки">${icon('book')}</button></div><nav class="care-dock" aria-label="Уход за котом">${[['food','Покормить'],['drink','Напоить'],['rest','Уложить'],['play','Поиграть']].map(([key,label])=>`<button data-action="care" data-need="${key}">${icon(key)}<span>${label}</span></button>`).join('')}</nav>${onboarding?intro():''}${sheet?dialog():''}</main>`;
 const modal=document.querySelector('dialog');if(modal){modal.showModal();modal.addEventListener('cancel',event=>{event.preventDefault();if(!onboarding){sheet=null;render();}});}
 if(focus)document.querySelector(`[data-focus="${focus}"]`)?.focus();
}
function intro(){return `<dialog class="onboarding" aria-labelledby="intro-title"><div class="intro-moon">☾</div>${onboarding==='language'?`<p class="eyebrow">ПЕРЕД ПЕРВОЙ ВСТРЕЧЕЙ</p><h2 id="intro-title">Какой язык будем открывать?</h2><p>Язык интерфейса — русский. Этот выбор останется за пределами вашей истории.</p><button class="language selected" data-action="language"><span>Немецкий</span><span>Выбран ✓</span></button><p class="muted">В этой демоверсии доступен один язык.</p><button class="primary" data-action="meet">Найти своего спутника ${icon('arrow')}</button>`:`<p class="eyebrow">ГДЕ-ТО НА ТИХОЙ СТОРОНЕ ЛУНЫ</p><h2 id="intro-title">Кто-то ждёт тебя.</h2><p>В маленьком кратере свернулся кот. Он касается твоей ладони и шепчет незнакомые слова.</p><p>Ты пока не понимаешь его. Но видишь, когда он грустит, хочет есть или просто тянется к тебе.</p><p class="intro-whisper">Его зовут Люми. Остальное вы узнаете вместе.</p><button class="primary" data-action="begin">Остаться с Люми ${icon('heart')}</button>`}</dialog>`;}
function dialog(){
 let title='',body='';
 if(sheet.type==='care'){
  const labels={food:'Что ему предложить?',drink:'Чем его напоить?',rest:'Как ему помочь отдохнуть?',play:'Во что поиграем?'};
  title=sheet.need?labels[sheet.need]:'Что ты хочешь, Люми?';
  if(answerMode(state)==='letters' && (!sheet.need||sheet.need===request.need)){
   body=`<p class="sheet-copy">Вспомни, как звучит «${escape(request.ru)}», и собери ответ.</p><div class="letter-answer" aria-live="polite">${escape(answer.map(i=>letters[i]).join(''))||'<span>Твоё слово…</span>'}</div><div class="letters">${letters.map((c,i)=>`<button data-action="letter" data-index="${i}" data-focus="letter-${i}" ${answer.includes(i)?'disabled':''}>${escape(c)}</button>`).join('')}</div><div class="letter-controls"><button class="quiet" data-action="undo">Убрать букву</button><button class="primary" data-action="check" ${answer.length?'':'disabled'}>Предложить</button></div>`;
  }else{
   const options=sheet.need?deck.filter(c=>c.need===sheet.need):sheet.options;
   body=`<p class="sheet-copy">${response?'':`Люми шепчет: <b>${escape(request.de)}?</b>`} Выбери, что ему дать или сделать.</p><div class="gifts">${options.map(c=>`<button data-action="give" data-word="${escape(c.de)}"><span>${escape(c.ru[0].toUpperCase()+c.ru.slice(1))}</span><small>${state.learned.includes(c.de)?escape(c.de):'· · ·'}</small></button>`).join('')}</div>`;
  }
  body+=`<div class="sheet-links"><button data-action="book">${icon('book')} Подсмотреть карточку</button><button data-action="ignore">Не сейчас</button></div>`;
 }else if(sheet.type==='book'){
  title='Наш маленький словарь';
  const feeling=words[mood()]||words.happy;
  body=`<p class="sheet-copy">Подсказка бесплатна. Каждое понятое слово помогает позаботиться о Люми.</p><div class="flashcard"><span>ЕГО НАСТРОЕНИЕ</span><strong>${escape(feeling.de)}</strong><p>${escape(feeling.ru)}</p></div><div class="flashcard"><span>ЕГО ПРОСЬБА</span><strong>${escape(request.de)}</strong><p>${escape(request.ru)}</p></div><button class="primary" data-action="return-care">Попробовать ответить ${icon('arrow')}</button>`;
 }else if(sheet.type==='journal'){
  title='Вы становитесь ближе';
  body=`<p class="sheet-copy">Доверие: ${state.bond} из 100. Понятых слов: ${state.learned.length} из ${deck.length}.</p><p>Внимательный уход сближает вас. Если не услышать просьбу, Люми может обидеться. Отношения можно восстановить.</p><div class="learned">${state.learned.length?state.learned.map(w=>`<span>${escape(w)}</span>`).join(''):'Первые общие слова ещё впереди.'}</div>`;
 }else{
  title='Как ты отвечаешь';
  body=`<p class="sheet-copy">Кот остаётся рядом. Меняется только способ ответа.</p><div class="formats">${[['mixed','По-разному','Иногда слова, иногда буквы'],['choice','Выбирать слова','Предлагать готовые действия'],['letters','Собирать из букв','Вспоминать слово самому']].map(([value,label,sub])=>`<button class="${state.format===value?'selected':''}" data-action="format" data-format="${value}"><span>${label}</span><small>${sub}</small></button>`).join('')}</div><p class="muted">Прогресс сохраняется на этом устройстве. Во время отсутствия потребности снижаются немного, но доверие не теряется.</p>`;
 }
 return `<dialog class="sheet" aria-labelledby="sheet-title"><div class="sheet-grip" aria-hidden="true"></div><header><h2 id="sheet-title">${title}</h2><button class="icon-button" data-action="close" aria-label="Закрыть">${icon('close')}</button></header>${body}${notice?`<p class="sheet-notice" role="status">${escape(notice)}</p>`:''}</dialog>`;
}
function openCare(need=null){if(response)nextRequest();sheet={type:'care',need,options:shuffle([request,...shuffle(deck.filter(c=>c.need!==request.need)).slice(0,3)])};notice='';render();}
function nextRequest(){reaction='';response=null;state=advanceTime(state);request=pickRequest(state,deck);state.request=request.de;makeLetters();notice='';save();}
function finishCare(given){
 const result=applyCare(state,request,given);state=result.state;
 reaction=result.exact?'happy':result.useful?'happy':'angry';
 story=result.exact?'Люми довольно щурится и прижимается к твоей руке.':result.useful?'Люми принимает заботу, хотя это не совсем то, о чём просил.':'Люми отворачивается. Кажется, сейчас ему нужно было другое.';
 response={top:result.useful?words.thanks.de+'…':words.no.de+'…',bottom:result.useful?words.happy.de+'!':words.angry.de+'…',note:`Доверие ${result.delta>0?'+':''}${result.delta}`};
 state.lastStory=story;sheet=null;notice='';save();render();
}
root.addEventListener('click',event=>{
 const button=event.target.closest('button[data-action]');if(!button||button.disabled)return;
 const action=button.dataset.action;
 if(action==='language')return;
 if(action==='meet'){onboarding='story';render();return;}
 if(action==='begin'){state.introduced=true;onboarding=null;save();render();return;}
 if(action==='close'){sheet=null;notice='';render();return;}
 if(action==='reply'){if(response){nextRequest();render();}else openCare();return;}
 if(action==='care'){openCare(button.dataset.need);return;}
 if(action==='give'){finishCare(deck.find(c=>c.de===button.dataset.word));return;}
 if(action==='letter'){answer.push(+button.dataset.index);notice='';render();return;}
 if(action==='undo'){answer.pop();notice='';render();return;}
 if(action==='check'){
  if(sameWord(answer.map(i=>letters[i]).join(''),request.de))finishCare(request);
  else{state={...state,bond:Math.max(0,state.bond-2)};reaction='sad';story='Люми не понял ответ и опустил ушки. Можно попробовать ещё раз.';state.lastStory=story;notice='Люми растерялся. Доверие −2. Открой карточку или попробуй ещё раз.';save();render();}return;
 }
 if(action==='ignore'){
  state=ignoreRequest(state);reaction='sad';story='Люми тихо сворачивается клубком. Твоего внимания ему не хватило.';state.lastStory=story;response={top:words.sad.de+'…',bottom:'…',note:'Доверие −3'};sheet=null;notice='';save();render();return;
 }
 if(action==='pet'){
  const result=petCat(state);state=result.state;
  if(result.delta===0)notice='Люми ещё чувствует тепло твоей ладони.';
  else{reaction=result.delta>0?'happy':'angry';story=result.delta>0?'Люми подставляет лоб под твою ладонь. Доверие +2.':'Люми сонно отводит лапой твою руку. Сейчас ему нужен покой. Доверие −2.';notice='';state.lastStory=story;}
  save();render();return;
 }
 if(action==='return-care'){openCare();return;}
 if(action==='format'){state.format=button.dataset.format;makeLetters();notice='';save();render();return;}
 if(['book','settings','journal'].includes(action)){if(action==='book' && response)nextRequest();notice='';sheet={type:action};render();}
});
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'){state=advanceTime(state);save();render();}});
render();
