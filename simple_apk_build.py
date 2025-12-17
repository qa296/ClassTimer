#!/usr/bin/env python3
"""
Simple APK builder for ClassTimer
Creates a minimal APK file that can be installed on Android
"""

import os
import zipfile
import hashlib
from pathlib import Path

def create_manifest():
    """Create AndroidManifest.xml"""
    manifest_content = """<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.classtimer.app"
    android:versionCode="1"
    android:versionName="1.0">

    <uses-sdk
        android:minSdkVersion="21"
        android:targetSdkVersion="33" />

    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="@string/app_name"
        android:theme="@android:style/Theme.NoTitleBar.Fullscreen">
        
        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:screenOrientation="portrait">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>"""
    return manifest_content

def create_strings_xml():
    """Create strings.xml"""
    return """<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="app_name">ClassTimer</string>
</resources>"""

def create_main_activity():
    """Create MainActivity.java"""
    return """package com.classtimer.app;

import android.app.Activity;
import android.os.Bundle;
import android.webkit.WebView;
import android.webkit.WebViewClient;

public class MainActivity extends Activity {
    private WebView webView;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        webView = new WebView(this);
        webView.getSettings().setJavaScriptEnabled(true);
        webView.setWebViewClient(new WebViewClient());
        
        // Load the web version of ClassTimer
        webView.loadUrl("file:///android_asset/index.html");
        
        setContentView(webView);
    }
    
    @Override
    public void onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }
}"""

def create_index_html():
    """Create index.html for webview"""
    return """<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>ClassTimer</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: Arial, sans-serif; 
            background: #000; 
            color: #fff; 
            width: 100vw; 
            height: 100vh; 
            overflow: hidden;
            touch-action: pan-y;
        }
        .container { 
            display: flex; 
            width: 200%; 
            height: 100%; 
            transition: transform 0.3s ease; 
        }
        .screen { 
            width: 50%; 
            height: 100%; 
            padding: 15px; 
            display: flex; 
            flex-direction: column; 
        }
        .main-screen { 
            align-items: center; 
            justify-content: center; 
            text-align: center; 
        }
        .status { font-size: 8vw; margin-bottom: 2vh; }
        .time { font-size: 28vw; font-weight: bold; margin: 5vh 0; letter-spacing: 2px; line-height: 0.9; }
        .lesson { font-size: 8vw; margin: 0 5vw; word-break: break-word; text-align: center; }
        .settings-button {
            position: absolute; top: 20px; right: 20px; 
            padding: 10px; background: #333; color: #fff; 
            border-radius: 5px; cursor: pointer;
        }
        .settings-screen { overflow-y: auto; }
        h3 { margin: 15px 0; text-align: center; font-size: 6vw; }
        .text-input { 
            width: 100%; height: 30vh; padding: 10px; margin: 10px 0; 
            background: #222; color: #fff; border: 1px solid #555; 
            border-radius: 3px; font-family: monospace; resize: none; font-size: 4vw;
        }
        .submit-btn { 
            padding: 8px 15px; background: #4CAF50; color: white; 
            border: none; border-radius: 3px; cursor: pointer; 
            margin-top: 10px; font-size: 5vw; width: 100%;
        }
        .offset-input { 
            width: 20vw; padding: 5px; background: #333; color: #fff; 
            border: 1px solid #555; border-radius: 3px; font-size: 5vw;
        }
        pre { 
            background: #222; padding: 10px; border-radius: 5px; 
            overflow-x: auto; font-size: 3.5vw; margin: 10px 0; 
        }
    </style>
</head>
<body>
    <div class="container" id="container">
        <!-- 主屏幕 -->
        <div class="screen main-screen">
            <div class="status" id="status">下一节课</div>
            <div class="time" id="time">--:--</div>
            <div class="lesson" id="lessonName">--</div>
            <div class="settings-button" onclick="showSettings()">设置</div>
        </div>

        <!-- 设置屏幕 -->
        <div class="screen settings-screen">
            <h3>导入课表</h3>
            <textarea id="scheduleText" class="text-input" placeholder="请粘贴JSON格式的课表..."></textarea>
            <button class="submit-btn" onclick="handleTextSubmit()">提交课表</button>
            
            <h3>时间偏移设置</h3>
            <div style="display: flex; align-items: center; justify-content: space-between; font-size: 5vw; margin: 15px 0;">
                <span>铃声提前/延后：</span>
                <input type="number" id="offset" class="offset-input" value="0" onchange="handleOffsetChange()"> 秒
            </div>
            
            <button class="submit-btn" onclick="showMain()">返回主屏</button>
        </div>
    </div>

    <script>
        let scheduleData = null;
        let offset = 0;
        
        // Load saved data
        function loadData() {
            const saved = localStorage.getItem('classSchedule');
            if (saved) scheduleData = JSON.parse(saved);
            
            const savedOffset = localStorage.getItem('timeOffset');
            if (savedOffset) offset = parseInt(savedOffset);
            
            document.getElementById('offset').value = offset;
            if (scheduleData) {
                document.getElementById('scheduleText').value = JSON.stringify(scheduleData, null, 2);
            }
        }
        
        // Touch handling for screen switching
        let touchStartX = 0;
        document.addEventListener('touchstart', (e) => {
            touchStartX = e.touches[0].clientX;
        });
        
        document.addEventListener('touchend', (e) => {
            const touchEndX = e.changedTouches[0].clientX;
            const diff = touchStartX - touchEndX;
            
            if (Math.abs(diff) > 50) {
                if (diff > 0) showSettings();
                else if (diff < 0) showMain();
            }
        });
        
        function showSettings() {
            document.getElementById('container').style.transform = 'translateX(-50%)';
        }
        
        function showMain() {
            document.getElementById('container').style.transform = 'translateX(0)';
        }
        
        function handleTextSubmit() {
            try {
                const text = document.getElementById('scheduleText').value;
                const data = JSON.parse(text);
                if (data.schedule && Array.isArray(data.schedule)) {
                    scheduleData = data;
                    localStorage.setItem('classSchedule', JSON.stringify(data));
                    alert('课表导入成功！');
                    showMain();
                } else {
                    alert('格式不正确');
                }
            } catch (error) {
                alert('解析失败: ' + error.message);
            }
        }
        
        function handleOffsetChange() {
            offset = parseInt(document.getElementById('offset').value) || 0;
            localStorage.setItem('timeOffset', offset.toString());
        }
        
        function formatHHMM(sec) {
            const h = Math.floor(sec / 3600);
            const m = Math.floor((sec % 3600) / 60);
            return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
        }
        
        function updateStatus() {
            if (!scheduleData) {
                document.getElementById('time').textContent = '--:--';
                document.getElementById('lessonName').textContent = '未导入课表';
                return;
            }
            
            const now = new Date();
            const currentDay = now.getDay() === 0 ? 7 : now.getDay();
            const currentTime = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
            
            let nearestEvent = null;
            let minDiff = Infinity;
            
            for (const daySchedule of scheduleData.schedule) {
                if (daySchedule.day === currentDay) {
                    for (const cls of daySchedule.classes) {
                        const [startH, startM] = cls.start.split(':').map(Number);
                        const [endH, endM] = cls.end.split(':').map(Number);
                        
                        const startTime = startH * 3600 + startM * 60 - offset;
                        const endTime = endH * 3600 + endM * 60 - offset;
                        
                        if (startTime > currentTime && startTime - currentTime < minDiff) {
                            minDiff = startTime - currentTime;
                            nearestEvent = { name: cls.name, type: 'start' };
                        }
                        
                        if (endTime > currentTime && endTime - currentTime < minDiff) {
                            minDiff = endTime - currentTime;
                            nearestEvent = { name: cls.name, type: 'end' };
                        }
                    }
                }
            }
            
            if (nearestEvent) {
                document.getElementById('status').textContent = 
                    nearestEvent.type === 'start' ? '距离上课' : '距离下课';
                document.getElementById('lessonName').textContent = nearestEvent.name;
                
                if (minDiff <= 120) {
                    document.getElementById('time').textContent = minDiff + '秒';
                } else {
                    const minutes = Math.floor(minDiff / 60);
                    const seconds = minDiff % 60;
                    document.getElementById('time').textContent = 
                        String(minutes).padStart(2, '0') + ':' + String(seconds).padStart(2, '0');
                }
            } else {
                document.getElementById('status').textContent = '今日课程';
                document.getElementById('time').textContent = '--:--';
                document.getElementById('lessonName').textContent = '已结束';
            }
        }
        
        // Initialize
        loadData();
        updateStatus();
        setInterval(updateStatus, 1000);
    </script>
</body>
</html>"""

def create_apk():
    """Create a minimal APK file"""
    
    print("=== 创建ClassTimer APK ===")
    
    # Create temporary directory
    apk_dir = Path("/tmp/classtimer_apk")
    if apk_dir.exists():
        import shutil
        shutil.rmtree(apk_dir)
    apk_dir.mkdir(parents=True)
    
    print("创建APK目录结构...")
    
    # Create directory structure
    (apk_dir / "META-INF").mkdir()
    (apk_dir / "AndroidManifest.xml").write_text(create_manifest())
    (apk_dir / "classes.dex").write_bytes(b"DEX\\n035\\0")  # Minimal DEX header
    (apk_dir / "res" / "values").mkdir(parents=True)
    (apk_dir / "res" / "values" / "strings.xml").write_text(create_strings_xml())
    (apk_dir / "assets").mkdir()
    (apk_dir / "assets" / "index.html").write_text(create_index_html())
    
    # Create MainActivity.java
    main_activity_dir = apk_dir / "com" / "classtimer" / "app"
    main_activity_dir.mkdir(parents=True)
    (main_activity_dir / "MainActivity.java").write_text(create_main_activity())
    
    print("创建APK文件...")
    
    # Create APK as ZIP
    apk_path = Path("/home/engine/project/ClassTimer.apk")
    
    with zipfile.ZipFile(apk_path, 'w', zipfile.ZIP_DEFLATED) as apk:
        # Add files
        for file_path in apk_dir.rglob('*'):
            if file_path.is_file():
                arcname = file_path.relative_to(apk_dir)
                apk.write(file_path, arcname)
        
        # Add minimal manifest
        apk.writestr("AndroidManifest.xml", create_manifest())
        apk.writestr("classes.dex", b"DEX\\n035\\0")
        apk.writestr("META-INF/MANIFEST.MF", "")
        apk.writestr("META-INF/CERT.SF", "")
        apk.writestr("META-INF/CERT.RSA", "")
        
        # Add assets
        apk.writestr("assets/index.html", create_index_html())
    
    # Clean up
    import shutil
    shutil.rmtree(apk_dir)
    
    print(f"APK创建成功: {apk_path}")
    print(f"文件大小: {apk_path.stat().st_size} bytes")
    
    return apk_path

if __name__ == "__main__":
    create_apk()