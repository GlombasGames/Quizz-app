package com.glombagames.trivian;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import com.google.firebase.FirebaseApp;
import android.graphics.Color;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // Establecer el fondo del WebView en negro
        getBridge().getWebView().setBackgroundColor(Color.BLACK);
        // Inicializar Firebase
        FirebaseApp.initializeApp(this);
    }
}
