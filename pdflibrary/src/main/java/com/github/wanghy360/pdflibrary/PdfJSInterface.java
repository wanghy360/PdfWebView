package com.github.wanghy360.pdflibrary;

import android.os.Handler;
import android.os.Looper;
import android.util.Log;
import android.webkit.JavascriptInterface;

/**
 * Created by Wanghy360 on 2018/5/15.
 */
public class PdfJSInterface {
    private String path;
    private Handler handler;

    public PdfJSInterface() {
        handler = new Handler(Looper.getMainLooper());
    }

    public void setPath(String path) {
        this.path = path;
    }

    /**
     * 获取保存在本地的pdf文件，并转为base64格式的字符串
     */
    @JavascriptInterface
    public String getPdfData() {
        String data = null;
        try {
            data = Base64Tool.encodeBase64File(path);
        } catch (Exception e) {
            e.printStackTrace();
            Log.e("PdfJSInterface",e.getMessage());
        }
        return data;
    }

    /**
     * js调用，页数变化
     *
     * @param pageNum   页数
     * @param pageCount 总页数
     */
    @JavascriptInterface
    public void onPageNumChange(final int pageNum, final int pageCount) {
        handler.post(new Runnable() {
            @Override
            public void run() {
                if (pdfCallback != null) pdfCallback.onPageNumChange(pageNum, pageCount);
            }
        });
    }

    /**
     * js调用，pdf显示出错
     */
    @JavascriptInterface
    public void onPageError() {
        handler.post(new Runnable() {
            @Override
            public void run() {
                if (pdfCallback != null) pdfCallback.onPageError();
            }
        });
    }

    private PdfCallback pdfCallback;

    public void setPdfCallback(PdfCallback pdfCallback) {
        this.pdfCallback = pdfCallback;
    }

    public interface PdfCallback {
        void onPageError();

        void onPageNumChange(final int pageNum, final int pageCount);
    }
}
