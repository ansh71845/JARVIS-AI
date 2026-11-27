package com.stark.jarvis.os;

import android.content.Intent;
import android.media.AudioAttributes;
import android.speech.tts.TextToSpeech;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

@CapacitorPlugin(name = "NativeAssistant")
public class NativeAssistantPlugin extends Plugin {
    private TextToSpeech textToSpeech;
    private boolean ttsReady = false;
    private final List<String> pendingSpeech = new ArrayList<>();

    @PluginMethod
    public void launchApp(PluginCall call) {
        String packageName = call.getString("packageName");
        if (packageName == null || packageName.trim().isEmpty()) {
            call.reject("A target Android package is required.");
            return;
        }
        try {
            Intent launchIntent = getContext().getPackageManager().getLaunchIntentForPackage(packageName);
            if (launchIntent == null) {
                call.reject("The requested app is not installed or is not launchable: " + packageName);
                return;
            }
            launchIntent.addFlags(Intent.FLAG_ACTIVITY_RESET_TASK_IF_NEEDED);
            getActivity().runOnUiThread(() -> {
                try {
                    getActivity().startActivity(launchIntent);
                    JSObject result = new JSObject();
                    result.put("launched", true);
                    result.put("packageName", packageName);
                    call.resolve(result);
                } catch (Exception error) {
                    call.reject("Android could not start " + packageName + ": " + error.getMessage());
                }
            });
        } catch (Exception error) {
            call.reject("Unable to resolve Android app: " + packageName + ": " + error.getMessage());
        }
    }

    @PluginMethod
    public void speak(PluginCall call) {
        String text = call.getString("text");
        if (text == null || text.trim().isEmpty()) {
            call.reject("Speech text is empty.");
            return;
        }
        if (textToSpeech == null) {
            pendingSpeech.add(text);
            textToSpeech = new TextToSpeech(getContext(), status -> {
                if (status == TextToSpeech.SUCCESS) {
                    int language = textToSpeech.setLanguage(Locale.forLanguageTag("en-IN"));
                    if (language == TextToSpeech.LANG_MISSING_DATA ||
                        language == TextToSpeech.LANG_NOT_SUPPORTED) {
                        textToSpeech.setLanguage(Locale.US);
                    }
                    textToSpeech.setSpeechRate(0.96f);
                    textToSpeech.setPitch(1.0f);
                    textToSpeech.setAudioAttributes(new AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_MEDIA)
                        .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
                        .build());
                    ttsReady = true;
                    List<String> queuedSpeech = new ArrayList<>(pendingSpeech);
                    pendingSpeech.clear();
                    for (int index = 0; index < queuedSpeech.size(); index++) {
                        String queued = queuedSpeech.get(index);
                        int queueMode = index == 0
                            ? TextToSpeech.QUEUE_FLUSH
                            : TextToSpeech.QUEUE_ADD;
                        textToSpeech.speak(queued, queueMode, null,
                            "jarvis-" + System.nanoTime() + "-" + index);
                    }
                } else {
                    pendingSpeech.clear();
                    ttsReady = false;
                }
            });
        } else if (ttsReady) {
            textToSpeech.speak(text, TextToSpeech.QUEUE_FLUSH, null,
                "jarvis-" + System.currentTimeMillis());
        } else {
            pendingSpeech.add(text);
        }
        JSObject result = new JSObject();
        result.put("queued", true);
        call.resolve(result);
    }

    @PluginMethod
    public void stopSpeech(PluginCall call) {
        if (textToSpeech != null) {
            textToSpeech.stop();
        }
        pendingSpeech.clear();
        call.resolve();
    }
}
