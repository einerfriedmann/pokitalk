import {Capacitor, registerPlugin} from '@capacitor/core';
const MoonSpeech=registerPlugin('MoonSpeech');
export async function speakGerman(text) {
  if (Capacitor.isNativePlatform()) {
    try { await MoonSpeech.speak({text}); return; }
    catch { throw new Error('Голос недоступен. Проверь установленный немецкий голос в настройках озвучивания Android.'); }
  }
  if (!('speechSynthesis' in window)) throw new Error('В этом браузере нет озвучивания. Можно продолжать с текстом и образами.');
  let voices=window.speechSynthesis.getVoices();
  if (!voices.length) {
    await new Promise(resolve=>{
      const done=()=>{window.speechSynthesis.removeEventListener('voiceschanged',done);resolve();};
      window.speechSynthesis.addEventListener('voiceschanged',done,{once:true});
      setTimeout(done,700);
    });
    voices=window.speechSynthesis.getVoices();
  }
  const voice=voices.find(v=>v.lang.toLowerCase().startsWith('de'));
  if (!voice) throw new Error('Немецкий голос не найден на устройстве. Текст и образы остаются доступны.');
  window.speechSynthesis.cancel();
  const utterance=new SpeechSynthesisUtterance(text);utterance.lang='de-DE';utterance.voice=voice;utterance.rate=.82;
  window.speechSynthesis.speak(utterance);
}
export function stopSpeech(){
  if(Capacitor.isNativePlatform()) MoonSpeech.stop().catch(()=>{});
  else if('speechSynthesis' in window)window.speechSynthesis.cancel();
}
