package io.github.kinoschaffer.quienharia;

import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;

import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;

import com.getcapacitor.BridgeActivity;

import java.util.Locale;

/**
 * Pantalla completa de borde a borde: la app se dibuja detrás de la barra de estado,
 * el notch y la barra de navegación, y le pasa a la página el tamaño de esas zonas
 * (en px de CSS) para que deje el espacio justo en cada celular.
 */
public class MainActivity extends BridgeActivity {
    private volatile String insetsJson = "{\"top\":0,\"right\":0,\"bottom\":0,\"left\":0}";

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        getWindow().setStatusBarColor(Color.TRANSPARENT);
        getWindow().setNavigationBarColor(Color.TRANSPARENT);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            getWindow().setStatusBarContrastEnforced(false);
            getWindow().setNavigationBarContrastEnforced(false);
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            WindowManager.LayoutParams lp = getWindow().getAttributes();
            lp.layoutInDisplayCutoutMode = Build.VERSION.SDK_INT >= Build.VERSION_CODES.R
                    ? WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_ALWAYS
                    : WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
            getWindow().setAttributes(lp);
        }
        WindowInsetsControllerCompat controller = WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
        controller.setAppearanceLightStatusBars(false);     // íconos claros sobre el fondo oscuro
        controller.setAppearanceLightNavigationBars(false);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON); // que no se apague en plena partida

        final WebView webView = getBridge().getWebView();
        webView.setBackgroundColor(Color.parseColor("#18193a"));
        webView.addJavascriptInterface(new Object() {
            @JavascriptInterface
            public String get() { return insetsJson; }
        }, "AndroidInsets");

        ViewCompat.setOnApplyWindowInsetsListener(webView, (v, windowInsets) -> {
            Insets i = windowInsets.getInsets(WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout());
            float d = getResources().getDisplayMetrics().density;
            insetsJson = String.format(Locale.US, "{\"top\":%.1f,\"right\":%.1f,\"bottom\":%.1f,\"left\":%.1f}",
                    i.top / d, i.right / d, i.bottom / d, i.left / d);
            webView.post(() -> webView.evaluateJavascript("window.__setInsets && window.__setInsets(" + insetsJson + ")", null));
            return windowInsets;
        });
        ViewCompat.requestApplyInsets(webView);
    }
}
