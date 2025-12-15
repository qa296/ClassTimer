package com.classtimer.fast;

import android.app.Activity;
import android.os.Bundle;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.WebSettings;
import android.view.Window;
import android.view.WindowManager;
import android.content.SharedPreferences;
import android.webkit.JavascriptInterface;
import android.widget.Toast;

public class MainActivity extends Activity {
    private WebView webView;
    private static final String PREFS_NAME = "ClassTimerPrefs";
    private static final String KEY_SCHEDULE = "classSchedule";
    private static final String KEY_OFFSET = "timeOffset";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // 全屏模式，启动时隐藏状态栏
        requestWindowFeature(Window.FEATURE_NO_TITLE);
        getWindow().setFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN,
                WindowManager.LayoutParams.FLAG_FULLSCREEN);
        getWindow().setFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON,
                WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        
        initWebView();
        loadApp();
    }

    private void initWebView() {
        webView = new WebView(this);
        setContentView(webView);
        
        WebSettings webSettings = webView.getSettings();
        webSettings.setJavaScriptEnabled(true);
        webSettings.setDomStorageEnabled(true);
        webSettings.setCacheMode(WebSettings.LOAD_NO_CACHE);
        webSettings.setBuiltInZoomControls(false);
        webSettings.setSupportZoom(false);
        webSettings.setDisplayZoomControls(false);
        webSettings.setUseWideViewPort(false);
        webSettings.setLoadWithOverviewMode(false);
        
        // 优化启动速度
        webSettings.setRenderPriority(WebSettings.RenderPriority.HIGH);
        
        // 添加JavaScript接口
        webView.addJavascriptInterface(new AndroidBridge(), "Android");
        
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                // 页面加载完成后，初始化数据
                initData();
            }
        });
    }

    private void initData() {
        // 从SharedPreferences读取数据并传递给WebView
        SharedPreferences prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE);
        String schedule = prefs.getString(KEY_SCHEDULE, "");
        int offset = prefs.getInt(KEY_OFFSET, 0);
        
        if (!schedule.isEmpty()) {
            String jsCode = "window.initAppData(" + schedule + ", " + offset + ");";
            webView.evaluateJavascript(jsCode, null);
        }
    }

    private void loadApp() {
        // 直接加载本地HTML
        String html = getLocalHtml();
        webView.loadDataWithBaseURL("file:///android_asset/", html, 
                "text/html", "utf-8", null);
    }

    private String getLocalHtml() {
        return "<!DOCTYPE html>" +
        "<html>" +
        "<head>" +
        "    <meta charset='utf-8'>" +
        "    <meta name='viewport' content='width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no'>" +
        "    <title>ClassTimer</title>" +
        "    <style>" +
        "        * { margin: 0; padding: 0; box-sizing: border-box; }" +
        "        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #000; color: #fff; overflow: hidden; }" +
        "        .container { height: 100vh; display: flex; flex-direction: column; }" +
        "        .main { flex: 1; display: flex; flex-direction: column; justify-content: center; align-items: center; padding: 20px; }" +
        "        .status { font-size: 20px; margin-bottom: 16px; opacity: 0.8; }" +
        "        .time { font-size: 64px; font-weight: bold; margin: 40px 0; letter-spacing: 2px; font-family: 'Courier New', monospace; }" +
        "        .lesson { font-size: 24px; text-align: center; max-width: 90%; word-wrap: break-word; }" +
        "        .nav { display: flex; background: #333; }" +
        "        .nav-btn { flex: 1; padding: 15px; text-align: center; font-size: 16px; }" +
        "        .nav-btn.active { background: #555; }" +
        "        .settings { display: none; height: 50vh; overflow-y: auto; background: #111; padding: 20px; }" +
        "        .settings.active { display: block; }" +
        "        .title { font-size: 18px; margin-bottom: 16px; text-align: center; font-weight: 600; }" +
        "        .form-group { margin-bottom: 20px; }" +
        "        .label { display: block; margin-bottom: 8px; font-size: 14px; }" +
        "        .input, .textarea { width: 100%; background: #333; color: #fff; border: none; padding: 12px; border-radius: 8px; font-family: inherit; }" +
        "        .textarea { height: 200px; resize: vertical; }" +
        "        .btn { background: #4CAF50; color: white; border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer; font-size: 16px; margin-top: 10px; }" +
        "        .btn:hover { background: #45a049; }" +
        "        .example { background: #222; padding: 12px; border-radius: 8px; font-family: monospace; font-size: 12px; margin-top: 10px; white-space: pre-wrap; }" +
        "        .offset-control { display: flex; align-items: center; gap: 10px; }" +
        "        .offset-input { width: 80px; background: #333; color: #fff; border: none; padding: 8px; border-radius: 8px; text-align: center; }" +
        "    </style>" +
        "</head>" +
        "<body>" +
        "    <div class='container'>" +
        "        <div class='main'>" +
        "            <div class='status' id='status'>下一节课</div>" +
        "            <div class='time' id='time'>--:--</div>" +
        "            <div class='lesson' id='lesson'>未导入课表</div>" +
        "        </div>" +
        "        <div class='nav'>" +
        "            <div class='nav-btn active' onclick='showMain()'>主界面</div>" +
        "            <div class='nav-btn' onclick='showSettings()'>设置</div>" +
        "        </div>" +
        "        <div class='settings' id='settings'>" +
        "            <div class='title'>课表设置</div>" +
        "            <div class='form-group'>" +
        "                <label class='label'>JSON课表数据:</label>" +
        "                <textarea class='textarea' id='scheduleInput' placeholder='请输入JSON格式的课表...'></textarea>" +
        "                <button class='btn' onclick='saveSchedule()'>保存课表</button>" +
        "                <div class='example'>示例格式:\n{\n  \"schedule\": [\n    {\n      \"day\": 1,\n      \"classes\": [\n        {\"name\": \"数学\", \"start\": \"08:00\", \"end\": \"08:45\"}\n      ]\n    }\n  ]\n}</div>" +
        "            </div>" +
        "            <div class='form-group'>" +
        "                <label class='label'>时间偏移(秒):</label>" +
        "                <div class='offset-control'>" +
        "                    <input type='number' class='offset-input' id='offsetInput' value='0'>" +
        "                    <button class='btn' onclick='saveOffset()'>保存</button>" +
        "                </div>" +
        "                <small style='opacity: 0.7; margin-top: 5px; display: block;'>正数表示提前响铃，负数表示延后</small>" +
        "            </div>" +
        "        </div>" +
        "    </div>" +
        "    <script>" +
        "        let scheduleData = null;" +
        "        let timeOffset = 0;" +
        "        let updateTimer = null;" +
        "        " +
        "        // Android接口调用" +
        "        function saveToAndroid(key, value) {" +
        "            if (window.Android) {" +
        "                window.Android.saveData(key, value);" +
        "            } else {" +
        "                localStorage.setItem(key, value);" +
        "            }" +
        "        }" +
        "        " +
        "        function getFromAndroid(key, defaultValue) {" +
        "            if (window.Android) {" +
        "                return window.Android.getData(key, defaultValue);" +
        "            } else {" +
        "                return localStorage.getItem(key) || defaultValue;" +
        "            }" +
        "        }" +
        "        " +
        "        // 初始化数据" +
        "        window.initAppData = function(schedule, offset) {" +
        "            scheduleData = schedule;" +
        "            timeOffset = offset;" +
        "            if (schedule && typeof schedule === 'object') {" +
        "                document.getElementById('scheduleInput').value = JSON.stringify(schedule, null, 2);" +
        "            }" +
        "            document.getElementById('offsetInput').value = offset;" +
        "            startTimer();" +
        "        };" +
        "        " +
        "        // 保存课表" +
        "        function saveSchedule() {" +
        "            try {" +
        "                const input = document.getElementById('scheduleInput').value;" +
        "                const data = JSON.parse(input);" +
        "                if (validateSchedule(data)) {" +
        "                    scheduleData = data;" +
        "                    saveToAndroid('classSchedule', JSON.stringify(data));" +
        "                    alert('课表保存成功!');" +
        "                } else {" +
        "                    alert('课表格式不正确!');" +
        "                }" +
        "            } catch (e) {" +
        "                alert('JSON格式错误!');" +
        "            }" +
        "        }" +
        "        " +
        "        // 保存偏移" +
        "        function saveOffset() {" +
        "            const offset = parseInt(document.getElementById('offsetInput').value) || 0;" +
        "            timeOffset = offset;" +
        "            saveToAndroid('timeOffset', offset.toString());" +
        "            alert('偏移保存成功!');" +
        "        }" +
        "        " +
        "        // 验证课表格式" +
        "        function validateSchedule(data) {" +
        "            if (!data || !Array.isArray(data.schedule)) return false;" +
        "            return data.schedule.every(daySchedule => " +
        "                typeof daySchedule.day === 'number' &&" +
        "                daySchedule.day >= 1 && daySchedule.day <= 7 &&" +
        "                Array.isArray(daySchedule.classes) &&" +
        "                daySchedule.classes.every(cls => cls && cls.name && cls.start && cls.end)" +
        "            );" +
        "        }" +
        "        " +
        "        // 格式化时间" +
        "        function formatTime(seconds) {" +
        "            const hours = Math.floor(seconds / 3600);" +
        "            const minutes = Math.floor((seconds % 3600) / 60);" +
        "            return String(hours).padStart(2, '0') + ':' + String(minutes).padStart(2, '0');" +
        "        }" +
        "        " +
        "        // 更新状态" +
        "        function updateStatus() {" +
        "            if (!scheduleData) {" +
        "                document.getElementById('status').textContent = '下一节课';" +
        "                document.getElementById('time').textContent = '--:--';" +
        "                document.getElementById('lesson').textContent = '未导入课表';" +
        "                return;" +
        "            }" +
        "            " +
        "            const now = new Date();" +
        "            const currentDay = now.getDay() === 0 ? 7 : now.getDay();" +
        "            const currentTime = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();" +
        "            " +
        "            let nearestEvent = null;" +
        "            let minDiff = Infinity;" +
        "            " +
        "            for (const daySchedule of scheduleData.schedule) {" +
        "                if (daySchedule.day === currentDay) {" +
        "                    for (const cls of daySchedule.classes) {" +
        "                        const [startH, startM] = cls.start.split(':').map(Number);" +
        "                        const [endH, endM] = cls.end.split(':').map(Number);" +
        "                        " +
        "                        const startTime = startH * 3600 + startM * 60 - timeOffset;" +
        "                        const endTime = endH * 3600 + endM * 60 - timeOffset;" +
        "                        " +
        "                        if (startTime > currentTime && startTime - currentTime < minDiff) {" +
        "                            minDiff = startTime - currentTime;" +
        "                            nearestEvent = { name: cls.name, type: 'start', time: startTime };" +
        "                        }" +
        "                        " +
        "                        if (endTime > currentTime && endTime - currentTime < minDiff) {" +
        "                            minDiff = endTime - currentTime;" +
        "                            nearestEvent = { name: cls.name, type: 'end', time: endTime };" +
        "                        }" +
        "                    }" +
        "                }" +
        "            }" +
        "            " +
        "            if (nearestEvent) {" +
        "                document.getElementById('status').textContent = nearestEvent.type === 'start' ? '距离上课' : '距离下课';" +
        "                document.getElementById('lesson').textContent = nearestEvent.name;" +
        "                " +
        "                if (minDiff <= 120) {" +
        "                    document.getElementById('time').textContent = minDiff + '秒';" +
        "                } else {" +
        "                    const minutes = Math.floor(minDiff / 60);" +
        "                    const seconds = minDiff % 60;" +
        "                    document.getElementById('time').textContent = String(minutes).padStart(2, '0') + ':' + String(seconds).padStart(2, '0');" +
        "                }" +
        "            } else {" +
        "                document.getElementById('status').textContent = '今日课程';" +
        "                document.getElementById('time').textContent = '--:--';" +
        "                document.getElementById('lesson').textContent = '已结束';" +
        "            }" +
        "        }" +
        "        " +
        "        // 启动计时器" +
        "        function startTimer() {" +
        "            updateStatus();" +
        "            if (updateTimer) clearInterval(updateTimer);" +
        "            updateTimer = setInterval(updateStatus, 1000);" +
        "        }" +
        "        " +
        "        // 界面切换" +
        "        function showMain() {" +
        "            document.querySelector('.main').style.display = 'flex';" +
        "            document.getElementById('settings').classList.remove('active');" +
        "            document.querySelectorAll('.nav-btn')[0].classList.add('active');" +
        "            document.querySelectorAll('.nav-btn')[1].classList.remove('active');" +
        "        }" +
        "        " +
        "        function showSettings() {" +
        "            document.querySelector('.main').style.display = 'none';" +
        "            document.getElementById('settings').classList.add('active');" +
        "            document.querySelectorAll('.nav-btn')[1].classList.add('active');" +
        "            document.querySelectorAll('.nav-btn')[0].classList.remove('active');" +
        "        }" +
        "        " +
        "        // 页面加载完成后启动" +
        "        window.addEventListener('load', function() {" +
        "            // 尝试从本地存储加载数据" +
        "            const savedSchedule = getFromAndroid('classSchedule', '');" +
        "            const savedOffset = getFromAndroid('timeOffset', '0');" +
        "            " +
        "            if (savedSchedule) {" +
        "                try {" +
        "                    const data = JSON.parse(savedSchedule);" +
        "                    window.initAppData(data, parseInt(savedOffset) || 0);" +
        "                } catch (e) {" +
        "                    startTimer();" +
        "                }" +
        "            } else {" +
        "                startTimer();" +
        "            }" +
        "        });" +
        "    </script>" +
        "</body>" +
        "</html>";
    }

    // JavaScript桥接接口
    private class AndroidBridge {
        @JavascriptInterface
        public void saveData(String key, String value) {
            SharedPreferences prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE);
            SharedPreferences.Editor editor = prefs.edit();
            
            if (key.equals(KEY_SCHEDULE)) {
                editor.putString(KEY_SCHEDULE, value);
            } else if (key.equals(KEY_OFFSET)) {
                editor.putInt(KEY_OFFSET, Integer.parseInt(value));
            }
            editor.apply();
        }

        @JavascriptInterface
        public String getData(String key, String defaultValue) {
            SharedPreferences prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE);
            if (key.equals(KEY_SCHEDULE)) {
                return prefs.getString(KEY_SCHEDULE, defaultValue);
            } else if (key.equals(KEY_OFFSET)) {
                return String.valueOf(prefs.getInt(KEY_OFFSET, Integer.parseInt(defaultValue)));
            }
            return defaultValue;
        }
    }

    @Override
    public void onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (webView != null) {
            webView.onResume();
        }
    }

    @Override
    protected void onPause() {
        super.onPause();
        if (webView != null) {
            webView.onPause();
        }
    }

    @Override
    protected void onDestroy() {
        if (webView != null) {
            webView.destroy();
        }
        super.onDestroy();
    }
}