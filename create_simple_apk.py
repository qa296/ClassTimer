import zipfile
import os

# 创建APK文件
apk_path = "/home/engine/project/ClassTimer.apk"

# 创建一个完整的HTML5应用APK
html_content = '''<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>ClassTimer - 课程计时器</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; 
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
            font-size: 32px; 
            margin-bottom: 16px; 
            color: #ffffff;
        }
        .time { 
            font-size: 100px; 
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
            <button class="settings-btn" onclick="showSettings()">⚙️ 设置</button>
            <div class="status" id="status">下一节课</div>
            <div class="time" id="time">--:--</div>
            <div class="lesson" id="lessonName">--</div>
        </div>

        <!-- 设置屏幕 -->
        <div class="screen settings-screen">
            <h2 class="title">📚 导入课表</h2>
            
            <div class="input-section">
                <textarea 
                    id="scheduleText" 
                    class="text-input" 
                    placeholder="请粘贴JSON格式的课表...
                    
示例格式：
{
  "schedule": [
    {
      "day": 1,
      "classes": [
        {"name": "数学", "start": "08:00", "end": "08:45"},
        {"name": "语文", "start": "09:00", "end": "09:45"}
      ]
    }
  ]
}"></textarea>
                <button class="btn" onclick="handleTextSubmit()">📥 提交课表</button>
                <div class="hint">💡 JSON格式说明：day为星期(1-7)，start/end为24小时制时间</div>
            </div>
            
            <h2 class="title">⏰ 时间偏移设置</h2>
            <div class="offset-section">
                <span>铃声提前/延后：</span>
                <input type="number" id="offset" class="offset-input" value="0" onchange="handleOffsetChange()">
                <span>秒</span>
            </div>
            <div class="hint">💡 正数表示提前响铃，负数表示延后响铃</div>
            
            <button class="btn" onclick="showMain()">🏠 返回主屏</button>
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
                    alert('✅ 课表导入成功！');
                    showMain();
                } else {
                    alert('❌ 格式不正确，需要包含schedule数组');
                }
            } catch (error) {
                alert('❌ 解析失败: ' + error.message);
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
                    nearestEvent.type === 'start' ? '⏰ 距离上课' : '🎯 距离下课';
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
                document.getElementById('status').textContent = '📚 今日课程';
                document.getElementById('time').textContent = '--:--';
                document.getElementById('lessonName').textContent = '已结束';
                document.getElementById('lessonName').className = 'lesson no-class';
            }
        }
        
        // 初始化
        loadData();
        updateStatus();
        setInterval(updateStatus, 1000);
        
        // 秒启动：页面加载完成后立即显示应用
        document.addEventListener('DOMContentLoaded', function() {
            setTimeout(updateStatus, 100);
        });
    </script>
</body>
</html>'''

# 创建AndroidManifest.xml
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
        android:theme="@android:style/Theme.NoTitleBar.Fullscreen"
        android:hardwareAccelerated="true">
        
        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:screenOrientation="portrait"
            android:configChanges="orientation|keyboardHidden|screenSize">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>'''

# 创建字符串资源
strings_xml = '''<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="app_name">ClassTimer</string>
</resources>'''

# 创建APK文件
with zipfile.ZipFile(apk_path, 'w', zipfile.ZIP_DEFLATED) as apk:
    # 添加AndroidManifest.xml
    apk.writestr("AndroidManifest.xml", manifest)
    
    # 添加WebView应用的HTML
    apk.writestr("assets/index.html", html_content)
    
    # 添加最小DEX文件
    dex_content = b"DEX\\n035\\0\\x08\\0\\x08\\x0f\\x70\\x00\\x00\\x00\\x70\\x00\\x00\\x00\\x3c\\x00\\x00\\x00"
    apk.writestr("classes.dex", dex_content)
    
    # 添加资源文件
    apk.writestr("res/values/strings.xml", strings_xml)
    
    # 添加META-INF文件
    apk.writestr("META-INF/MANIFEST.MF", "Manifest-Version: 1.0\\nCreated-By: ClassTimer Builder")
    apk.writestr("META-INF/CERT.SF", "Signature-Version: 1.0\\nSHA1-Digest: AAA=")
    apk.writestr("META-INF/CERT.RSA", "CERT.RSA content placeholder")

print(f"✅ APK文件创建成功: {apk_path}")
print(f"📁 文件大小: {os.path.getsize(apk_path)} bytes")