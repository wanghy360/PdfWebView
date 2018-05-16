package com.github.wanghy360.pdfwebview;


import android.annotation.SuppressLint;
import android.graphics.Bitmap;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.support.annotation.Nullable;
import android.view.View;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.TextView;

import com.github.wanghy360.pdflibrary.PdfJSInterface;

import butterknife.BindView;
import butterknife.ButterKnife;
import butterknife.Unbinder;

/**
 * Created by Wanghy360 on 2018/4/24.
 */
public class PdfActivity extends BaseActivity {
    private static final String PDF_ASSET_URL = "file:///android_asset/pdf-mobile-viewer/viewer.html";
    @BindView(R.id.webView)
    protected WebView webView;
    @BindView(R.id.id_current_page_num)
    TextView pageNumTv;
    private final String path = "/storage/emulated/0/aries/homework/652152c893d14e838e414bf6e3f908ab.pdf";//需要配置自己的pdf path
    private Unbinder binder;

    @Override
    protected void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_pdf);
        binder = ButterKnife.bind(this);
        init();
        renderHomework();
    }

    @SuppressLint("AddJavascriptInterface")
    public void init() {
        WebSettings settings = webView.getSettings();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            settings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);//支持http和https
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT) {
            settings.setLoadsImagesAutomatically(true);
        } else {
            settings.setLoadsImagesAutomatically(false);
        }
        settings.setSupportZoom(true);
        settings.setBuiltInZoomControls(true);
        settings.setDisplayZoomControls(false);
        settings.setUseWideViewPort(true);
        settings.setJavaScriptEnabled(true);
        settings.setDefaultTextEncodingName("utf-8");
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                //让新打开的网页在当前webview显示
                view.loadUrl(url);
                return true;
            }

            @Override
            public void onPageStarted(WebView view, String url, Bitmap favicon) {
                super.onPageStarted(view, url, favicon);

            }

            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                pd.dismiss();
                pageNumTv.setVisibility(View.VISIBLE);
            }

            @Override
            public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                super.onReceivedError(view, request, error);
                pd.dismiss();
            }
        });
        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onProgressChanged(WebView view, int newProgress) {
                super.onProgressChanged(view, newProgress);
                if (newProgress > 70) {
                    if (pd.isShowing()) {
                        pd.dismiss();
                    }
                }
            }
        });
        PdfJSInterface pdfJSInterface = new PdfJSInterface();
        pdfJSInterface.setPath(path);
        pdfJSInterface.setPdfCallback(new PdfJSInterface.PdfCallback() {
            @Override
            public void onPageError() {
                pd.dismiss();
            }

            @Override
            public void onPageNumChange(int pageNum, int pageCount) {
                pageNumTv.setText(String.format(getResources().getString(R.string.page_num), pageNum, pageCount));
            }
        });
        webView.addJavascriptInterface(pdfJSInterface, "PdfJSInterface");

    }

    /**
     * 本地有作业直接显示，否则先下载
     */
    private void renderHomework() {
        if (pd.isShowing()) {
            return;
        }
        pd.show();
        loadUrl(PDF_ASSET_URL);
    }

    protected void loadUrl(String url) {
        pd.show();
        webView.loadUrl(url);
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        webView.getSettings().setJavaScriptEnabled(false);
        webView.stopLoading();
        webView.clearHistory();
        webView.destroy();
        binder.unbind();
    }
}