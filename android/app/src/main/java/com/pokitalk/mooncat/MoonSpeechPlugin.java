package com.pokitalk.mooncat;

import android.speech.tts.TextToSpeech;
import java.util.Locale;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "MoonSpeech")
public class MoonSpeechPlugin extends Plugin implements TextToSpeech.OnInitListener {
    private TextToSpeech engine;
    private boolean ready = false;

    @Override public void load() {
        getActivity().runOnUiThread(() -> engine = new TextToSpeech(getContext(), this));
    }
    @Override public void onInit(int status) { ready = status == TextToSpeech.SUCCESS; }
    @PluginMethod public void speak(PluginCall call) {
        String text = call.getString("text", "");
        if (text.isEmpty() || text.length() > 1000) { call.reject("Invalid speech text"); return; }
        getActivity().runOnUiThread(() -> {
            if (!ready || engine == null) { call.reject("Speech engine unavailable"); return; }
            int language = engine.setLanguage(Locale.GERMANY);
            if (language == TextToSpeech.LANG_MISSING_DATA || language == TextToSpeech.LANG_NOT_SUPPORTED) {
                call.reject("German voice unavailable"); return;
            }
            engine.setSpeechRate(0.82f);
            int result = engine.speak(text, TextToSpeech.QUEUE_FLUSH, null, "mooncat");
            if (result == TextToSpeech.ERROR) call.reject("Speech failed"); else call.resolve();
        });
    }
    @PluginMethod public void stop(PluginCall call) {
        getActivity().runOnUiThread(() -> { if (engine != null) engine.stop(); call.resolve(); });
    }
    @Override protected void handleOnDestroy() {
        ready = false;
        if (engine != null) { engine.stop(); engine.shutdown(); engine = null; }
    }
}
