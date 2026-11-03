import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
const page=await browser.newPage({viewport:{width:390,height:844}});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
const data=JSON.parse(fs.readFileSync(new URL('../src/curriculum.json',import.meta.url)));
const words=data.topics.flatMap(t=>t.words);
const conversations=JSON.parse(fs.readFileSync(new URL('../src/conversations.json',import.meta.url))).items;
const state=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('mooncat-v2')));
const click=action=>page.locator(`[data-action="${action}"]`).first().click();
async function close(){await page.getByRole('button',{name:'Закрыть',exact:true}).click();}
try{
 await page.goto('http://127.0.0.1:5173');
 await page.getByRole('heading',{name:'Какой язык будем открывать?'}).waitFor();
 await click('meet');await click('begin');await page.reload();
 assert.equal(await page.locator('.onboarding').count(),0,'Welcome repeated');
 assert.ok(!/немецк|RU → DE/i.test(await page.locator('.game').innerText()),'Language should stay out of story');
 assert.equal(await page.locator('[data-action="arcade"]').count(),0,'Arcade must only exist in playroom');
 assert.equal(await page.locator('.room-dock button').count(),4);
 const bed=words.find(w=>w.de==='Bett');
 await page.locator(`.apartment [data-word-id="${bed.id}"]`).click();
 await page.getByRole('heading',{name:'das Bett',exact:true}).waitFor();
 assert.ok((await state()).vocabProgress[bed.id].seen>0);
 assert.ok((await page.locator('.example').first().innerText()).includes('Das ist das Bett.'));
 assert.ok((await page.locator('.usage-example').innerText()).includes('Hier kann ich schlafen.'));
 await close();
 await page.getByRole('button',{name:'Погладить Люми'}).click();
 assert.ok((await state()).openedTopics.includes('home'),'Petting crossing50 should open home');
 await page.locator('[data-room="kitchen"][data-action="room"]').click();
 const table=words.find(w=>w.de==='Tisch');
 await page.locator(`.apartment [data-word-id="${table.id}"]`).click();
 await page.getByRole('heading',{name:'der Tisch',exact:true}).waitFor();
 assert.ok((await page.locator('.example').first().innerText()).includes('Das ist der Tisch.'));
 assert.ok((await page.locator('.usage-example').innerText()).includes('Hier essen wir.'));
 await close();
 await click('book');assert.equal(await page.locator('.topic-card').count(),10);
 await page.locator('[data-action="topic"][data-topic="nature"]').click();
 await page.getByRole('heading',{name:'Эта тема ещё впереди'}).waitFor();await close();
 await click('book');await page.locator('[data-action="topic"][data-topic="care"]').click();
 assert.equal(await page.locator('.word-list button').count(),30);await close();
 // Lower trust; opened home stays open. Seed a clear care request for a reproducible check.
 await page.evaluate(()=>{const s=JSON.parse(localStorage.getItem('mooncat-v2'));s.bond=40;s.request='Wasser';s.room='kitchen';localStorage.setItem('mooncat-v2',JSON.stringify(s));});await page.reload();
 assert.ok((await state()).openedTopics.includes('home'));
 assert.ok((await page.locator('.bubble-main').innerText()).includes('Ich bin durstig.'));
 await click('hint');await page.getByRole('heading',{name:'Попробуем понять'}).waitFor();
 const beforeHint=(await state()).bond;await click('return-care');assert.equal((await state()).bond,beforeHint);
 const wrong=await page.locator('[data-action="give"]').evaluateAll(buttons=>buttons.find(b=>b.dataset.word!=='Wasser').dataset.word);
 await page.locator(`[data-action="give"][data-word="${wrong}"]`).click();
 assert.equal((await state()).bond,beforeHint-6);
 assert.ok((await page.locator('.bubble-main').innerText()).includes('ich brauche Wasser'));
 await click('reply');
 const next=(await state()).request,c=conversations.find(c=>c.word===next),before=(await state()).bond;
 await click('reply');if(await page.locator('[data-action="go-care"]').count())await click('go-care');
 await page.locator(`[data-action="give"][data-word="${next}"]`).click();
 assert.equal((await state()).bond,before+6);
 assert.equal((await page.locator('.bubble-main').innerText()).trim(),c.acceptDe);
 await page.reload();assert.equal(await page.locator('.onboarding').count(),0);
 // All rooms have inspectable source-backed objects; only playroom has a cabinet.
 for(const room of ['bedroom','bathroom','kitchen','playroom']){
  await page.locator(`[data-action="room"][data-room="${room}"]`).click();
  assert.ok(await page.locator('.apartment [data-action="inspect"]').count()>=4,room+' has too few interactive items');
  assert.equal(await page.locator('[data-action="arcade"]').count(),room==='playroom'?1:0);
  await page.screenshot({path:`/workspace/pokitalk-${room}.png`});
 }
 await page.locator('[data-action="arcade"]').click();await page.getByRole('heading',{name:'Падающие слова'}).waitFor();await close();
 for(const size of [{width:360,height:640},{width:390,height:844},{width:412,height:915}]){
  await page.setViewportSize(size);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Horizontal scroll');
  assert.ok(await page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight),'Portrait room does not fit');
 }
 // Version0.1 progress migrates without greeting; previous0.2 save is already exercised above.
 const legacy=await browser.newPage();await legacy.goto('http://127.0.0.1:5173');
 await legacy.evaluate(()=>{localStorage.removeItem('mooncat-v2');localStorage.setItem('mooncat',JSON.stringify({learned:['Fisch']}));});await legacy.reload();
 assert.equal(await legacy.locator('.onboarding').count(),0);
 assert.ok((await legacy.evaluate(()=>JSON.parse(localStorage.getItem('mooncat-v2')))).learned.includes('Fisch'));await legacy.close();
 assert.deepEqual(errors,[]);
 console.log('PASS: four apartments, object nouns+articles+examples,300-word topics, permanent trust unlock, care consequences+full sentences, hint, one-time intro, legacy migration, arcade-only entry and portrait layout');
}finally{await browser.close();}
