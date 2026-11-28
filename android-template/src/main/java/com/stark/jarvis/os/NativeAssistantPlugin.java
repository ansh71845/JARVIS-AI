package com.stark.jarvis.os;

import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.media.AudioAttributes;
import android.net.Uri;
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
    public void openExternalApp(PluginCall call) {
        String appName = call.getString("appName");
        String nativeUri = call.getString("nativeUri");
        String webUrl = call.getString("webUrl");

        String target = nativeUri != null && !nativeUri.trim().isEmpty()
            ? nativeUri.trim()
            : (webUrl == null ? "" : webUrl.trim());
        if (target.isEmpty()) {
            call.reject("A launch URI is required.");
            return;
        }

        getActivity().runOnUiThread(() -> {
            try {
                Uri targetUri = Uri.parse(target);
                String scheme = targetUri.getScheme();
                boolean nativeScheme = scheme != null
                    && !scheme.equalsIgnoreCase("http")
                    && !scheme.equalsIgnoreCase("https");

                if (nativeScheme) {
                    if (!isSupportedNativeScheme(scheme)) {
                        call.reject("This app URI scheme is not allowed: " + scheme);
                        return;
                    }
                    Intent nativeIntent = new Intent(Intent.ACTION_VIEW, targetUri);
                    nativeIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    try {
                        getActivity().startActivity(nativeIntent);
                        JSObject result = new JSObject();
                        result.put("status", "LAUNCHED_NATIVE");
                        result.put("appName", appName == null ? "" : appName);
                        result.put("scheme", scheme);
                        call.resolve(result);
                        return;
                    } catch (ActivityNotFoundException notInstalled) {
                        openPlayStoreSearch(call, appName);
                        return;
                    }
                }

                String browserTarget = webUrl != null && !webUrl.trim().isEmpty()
                    ? webUrl.trim()
                    : target;
                Intent webIntent = new Intent(Intent.ACTION_VIEW, Uri.parse(browserTarget));
                webIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                getActivity().startActivity(webIntent);
                JSObject result = new JSObject();
                result.put("status", "LINK_OPENED");
                result.put("appName", appName == null ? "" : appName);
                call.resolve(result);
            } catch (ActivityNotFoundException error) {
                openPlayStoreSearch(call, appName);
            } catch (Exception error) {
                call.reject("Unable to open " + (appName == null ? "the requested app" : appName)
                    + ": " + error.getMessage());
            }
        });
    }

    private void openPlayStoreSearch(PluginCall call, String appName) {
        if (appName == null || appName.trim().isEmpty()) {
            call.reject("The requested app was not found and no app name was provided for store search.");
            return;
        }

        String query = Uri.encode(appName.trim());
        Uri marketUri = Uri.parse("market://search?q=" + query + "&c=apps");
        try {
            Intent marketIntent = new Intent(Intent.ACTION_VIEW, marketUri);
            marketIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getActivity().startActivity(marketIntent);
            JSObject result = new JSObject();
            result.put("status", "STORE_OPENED");
            result.put("appName", appName);
            call.resolve(result);
        } catch (ActivityNotFoundException noStoreApp) {
            try {
                Uri webStoreUri = Uri.parse("https://play.google.com/store/search?q=" + query + "&c=apps");
                Intent webStoreIntent = new Intent(Intent.ACTION_VIEW, webStoreUri);
                webStoreIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                getActivity().startActivity(webStoreIntent);
                JSObject result = new JSObject();
                result.put("status", "STORE_SEARCH_WEB_OPENED");
                result.put("appName", appName);
                call.resolve(result);
            } catch (Exception error) {
                call.reject("The app was not found and Play Store search could not be opened: " + error.getMessage());
            }
        }
    }

    private boolean isSupportedNativeScheme(String scheme) {
        return scheme != null && (
            scheme.equalsIgnoreCase("whatsapp") ||
            scheme.equalsIgnoreCase("vnd.youtube") ||
            scheme.equalsIgnoreCase("instagram") ||
            scheme.equalsIgnoreCase("googlechrome") ||
            scheme.equalsIgnoreCase("spotify") ||
            scheme.equalsIgnoreCase("mailto")
        );
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
