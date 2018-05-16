package com.github.wanghy360.pdfwebview;

import android.app.ProgressDialog;
import android.os.Bundle;
import android.support.annotation.Nullable;
import android.support.v7.app.AppCompatActivity;

/**
 * Created by Wanghy360 on 2018/5/15.
 */
public abstract class BaseActivity extends AppCompatActivity {
    protected ProgressDialog pd;


    @Override
    protected void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        pd = new ProgressDialog(this);
    }
}
