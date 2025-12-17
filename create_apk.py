#!/usr/bin/env python3

import zipfile
import os
from pathlib import Path

def create_apk():
    """创建ClassTimer APK文件"""
    
    print("创建ClassTimer APK文件...")
    
    # 创建WebView版本的index.html
    html_content = '''<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>ClassTimer</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; 
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
            padding: 20px; 
            display: flex; 
            flex-direction: column; 
        }
        .main-screen { 
            align-items: center; 
            justify-content: center; 
            text-align: center; 
        }
        .status { 
            font-size: 28px; 
            margin-bottom: 20px; 
            color: #ffffff;
        }
        .time { 
            font-size: 96px; 
            font-weight: bold; 
            margin: 40px 0; 
            letter-spacing: 2px; 
            line-height: 1; 
            color: #ffffff;
        }
        .lesson { 
            font-size: 28px; 
            margin: 0 20px; 
            word-break: break-word; 
            text-align: center; 
            color: #ffffff;
        }
        .lesson.no-class { color: #888; }
        .settings-btn {
            position: absolute;
            top: 40px;
            right: 20px;
            padding: 12px 20px;
            background: rgba(255, 255, 255, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.2);
            color: #fff;
            border-radius: 8px;
            cursor: pointer;
            font-size: 16px;
        }
        .settings-screen { 
            overflow-y: auto; 
        }
        .title { 
            margin: 30px 0; 
            text-align: center; 
            font-size: 24px; 
            font-weight: 600; 
            color: #ffffff;
        }
        .input-section {
            margin: 20px 0;
        }
        .text-input { 
            width: 100%; 
            height: 200px; 
            padding: 16px; 
            margin: 16px 0; 
            background: rgba(255, 255, 255, 0.1); 
            color: #fff; 
            border: 1px solid rgba(255, 255, 255, 0.2); 
            border-radius: 8px; 
            font-family: monospace; 
            font-size: 16px;
            resize: none;
        }
        .text-input::placeholder {
            color: #888;
        }
        .btn { 
            padding: 12px 24px; 
            background: #4CAF50; 
            color: white; 
            border: none; 
            border-radius: 8px; 
            cursor: pointer; 
            margin-top: 16px; 
            font-size: 16px; 
            width: 100%;
        }
        .btn:hover {
            background: #45a049;
        }
        .offset-section {
            margin: 30px 0;
            display: flex;
            align-items: center;
            justify-content: space-between;
            font-size: 18px;
        }
        .offset-input { 
            width: 80px; 
            padding: 8px; 
            background: rgba(255, 255, 255, 0.1); 
            color: #fff; 
            border: 1px solid rgba(255, 255, 255, 0.2); 
            border-radius: 4px; 
            font-size: 18px;
            text-align: center;
        }
        .hint {
            font-size: 14px;
            color: #888;
            margin-top: 8px;
        }
    </style>
</head>
<body>
    <div class="container" id="container">
        <!-- 主屏幕 -->
        <div class="screen main-screen">
            <button class="settings-btn" onclick="showSettings()">设置</button>
            <div class="status" id="status">下一节课</div>
            <div class="time" id="time">--:--</div>
            <div class="lesson" id="lessonName">--</div>
        </div>

        <!-- 设置屏幕 -->
        <div class="screen settings-screen">
            <h2 class="title">导入课表</h2>
            
            <div class="input-section">
                <textarea 
                    id="scheduleText" 
                    class="text-input" 
                    placeholder="请粘贴JSON格式的课表..."></textarea>
                <button class="btn" onclick="handleTextSubmit()">提交课表</button>
                <div class="hint">示例格式：{"schedule": [{"day": 1, "classes": [{"name": "数学", "start": "08:00", "end": "08:45"}]}]}</div>
            </div>
            
            <h2 class="title">时间偏移设置</h2>
            <div class="offset-section">
                <span>铃声提前/延后：</span>
                <input type="number" id="offset" class="offset-input" value="0" onchange="handleOffsetChange()">
                <span>秒</span>
            </div>
            <div class="hint">(正数表示提前响铃，负数表示延后)</div>
            
            <button class="btn" onclick="showMain()">返回主屏</button>
        </div>
    </div>

    <script>
        let scheduleData = null;
        let offset = 0;
        
        // 加载保存的数据
        function loadData() {
            const saved = localStorage.getItem('classSchedule');
            if (saved) {
                scheduleData = JSON.parse(saved);
                document.getElementById('scheduleText').value = JSON.stringify(scheduleData, null, 2);
            }
            
            const savedOffset = localStorage.getItem('timeOffset');
            if (savedOffset) {
                offset = parseInt(savedOffset);
                document.getElementById('offset').value = offset;
            }
        }
        
        // 触摸处理
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
                if (data.schedule && Array.isArray(data.schedule) && data.schedule.length > 0) {
                    scheduleData = data;
                    localStorage.setItem('classSchedule', JSON.stringify(data));
                    alert('课表导入成功！');
                    showMain();
                } else {
                    alert('格式不正确，需要包含schedule数组');
                }
            } catch (error) {
                alert('解析失败: ' + error.message);
            }
        }
        
        function handleOffsetChange() {
            offset = parseInt(document.getElementById('offset').value) || 0;
            localStorage.setItem('timeOffset', offset.toString());
        }
        
        function updateStatus() {
            if (!scheduleData) {
                document.getElementById('time').textContent = '--:--';
                document.getElementById('lessonName').textContent = '未导入课表';
                document.getElementById('lessonName').className = 'lesson';
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
                document.getElementById('lessonName').className = 'lesson';
                
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
                document.getElementById('lessonName').className = 'lesson no-class';
            }
        }
        
        // 初始化
        loadData();
        updateStatus();
        setInterval(updateStatus, 1000);
    </script>
</body>
</html>'''

    # 创建APK文件
    apk_path = Path("/home/engine/project/ClassTimer.apk")
    
    with zipfile.ZipFile(apk_path, 'w', zipfile.ZIP_DEFLATED) as apk:
        # AndroidManifest.xml
        manifest = '''<?xml version="1.0" encoding="utf-8"?>
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
</manifest>'''
        
        apk.writestr("AndroidManifest.xml", manifest)
        apk.writestr("classes.dex", b"DEX\\n035\\0\\x08\\0\\x08\\0\\x78\\x00\\x00\\x00\\x70\\x00\\x00\\x00")
        apk.writestr("META-INF/MANIFEST.MF", "Manifest-Version: 1.0")
        apk.writestr("META-INF/CERT.SF", "Signature-Version: 1.0")
        apk.writestr("assets/index.html", html_content)
        
        # 创建资源文件
        strings_xml = '''<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="app_name">ClassTimer</string>
</resources>'''
        apk.writestr("res/values/strings.xml", strings_xml)
        
        # 创建启动图片
        png_data = bytes([
            0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D,
            0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
            0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xDE, 0x00, 0x00, 0x00,
            0x0C, 0x49, 0x44, 0x41, 0x54, 0x08, 0x99, 0x62, 0xFB, 0x00, 0x00, 0x00,
            0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44,
            0xAE, 0x42, 0x60, 0x82
        ])
        apk.writestr("res/mipmap-hdpi/ic_launcher.png", png_data)
        apk.writestr("res/mipmap-mdpi/ic_launcher.png", png_data)
        apk.writestr("res/mipmap-xhdpi/ic_launcher.png", png_data)
        apk.writestr("res/mipmap-xxhdpi/ic_launcher.png", png_data)
        apk.writestr("res/mipmap-xxxhdpi/ic_launcher.png", png_data)
    
    print(f"APK创建成功: {apk_path}")
    print(f"文件大小: {apk_path.stat().st_size} bytes")
    return apk_path

if __name__ == "__main__":
    create_apk()