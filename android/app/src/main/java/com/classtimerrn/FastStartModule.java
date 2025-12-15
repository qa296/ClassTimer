package com.classtimerrn;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.Promise;

public class FastStartModule extends ReactContextBaseJavaModule {
    private static ReactApplicationContext reactContext;

    public FastStartModule(ReactApplicationContext reactApplicationContext) {
        super(reactApplicationContext);
        reactContext = reactApplicationContext;
    }

    @Override
    public String getName() {
        return "FastStartModule";
    }

    @ReactMethod
    public void initializeApp(Promise promise) {
        try {
            // 快速初始化应用
            // 可以在这里添加启动逻辑
            promise.resolve("App initialized successfully");
        } catch (Exception e) {
            promise.reject("INIT_ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void getAppVersion(Promise promise) {
        try {
            String versionName = reactContext.getPackageManager()
                .getPackageInfo(reactContext.getPackageName(), 0).versionName;
            promise.resolve(versionName);
        } catch (Exception e) {
            promise.reject("VERSION_ERROR", e.getMessage());
        }
    }
}