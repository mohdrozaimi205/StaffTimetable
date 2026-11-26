package com.mohdrozaimi.stafftimetable;

import android.content.Context;
import android.print.PrintAttributes;
import android.print.PrintDocumentAdapter;
import android.print.PrintManager;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/** Cetak HTML jadual melalui Android PrintManager (A4 Landscape) */
@CapacitorPlugin(name = "Printer")
public class PrinterPlugin extends Plugin {

    private WebView printWebView;

    @PluginMethod
    public void print(final PluginCall call) {
        final String html = call.getString("html");
        final String name = call.getString("name", "Staff Timetable");
        if (html == null) {
            call.reject("Tiada kandungan untuk dicetak");
            return;
        }
        getActivity().runOnUiThread(() -> {
            try {
                final WebView wv = new WebView(getActivity());
                printWebView = wv;
                wv.setWebViewClient(new WebViewClient() {
                    @Override
                    public void onPageFinished(WebView view, String url) {
                        PrintManager pm = (PrintManager) getActivity().getSystemService(Context.PRINT_SERVICE);
                        PrintDocumentAdapter adapter = view.createPrintDocumentAdapter(name);
                        PrintAttributes attrs = new PrintAttributes.Builder()
                                .setMediaSize(PrintAttributes.MediaSize.ISO_A4.asLandscape())
                                .setColorMode(PrintAttributes.COLOR_MODE_COLOR)
                                .build();
                        pm.print(name, adapter, attrs);
                        call.resolve();
                    }
                });
                wv.loadDataWithBaseURL(null, html, "text/html", "UTF-8", null);
            } catch (Exception e) {
                call.reject("Gagal mencetak: " + e.getMessage());
            }
        });
    }
}
