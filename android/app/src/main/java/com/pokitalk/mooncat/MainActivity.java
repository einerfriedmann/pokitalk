package com.pokitalk.mooncat;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override public void onCreate(Bundle savedInstanceState) {
        registerPlugin(MoonSpeechPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
