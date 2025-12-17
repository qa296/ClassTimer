#!/bin/bash

# 清理环境
pkill -9 java 2>/dev/null
pkill -9 node 2>/dev/null  
pkill -9 npm 2>/dev/null

# 设置环境变量
export ANDROID_HOME=/tmp/android-sdk
export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
export PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$ANDROID_HOME/build-tools/33.0.0

echo "Setting up Android SDK..."
mkdir -p /tmp/android-sdk
cd /tmp

# 下载并安装Android SDK components
if [ ! -f /tmp/android-sdk/cmdline-tools ]; then
    echo "Downloading Android SDK..."
    wget -q https://dl.google.com/android/repository/commandlinetools-linux-9477386_latest.zip
    unzip -q commandlinetools-linux-9477386_latest.zip
    mkdir -p android-sdk/cmdline-tools
    mv cmdline-tools android-sdk/cmdline-tools/latest
    rm -f commandlinetools-linux-9477386_latest.zip
fi

# 设置许可
echo "Accepting licenses..."
yes | sdkmanager --licenses 2>/dev/null

# 安装必需的组件
echo "Installing SDK components..."
sdkmanager "platform-tools" "platforms;android-33" "build-tools;33.0.0" --verbose 2>/dev/null || true

# 构建APK
echo "Building APK..."
cd /home/engine/project/app/android
./gradlew clean
./gradlew assembleDebug --stacktrace

# 复制APK到项目根目录
if [ -f "app/build/outputs/apk/debug/app-debug.apk" ]; then
    cp app/build/outputs/apk/debug/app-debug.apk /home/engine/project/ClassTimer.apk
    echo "APK built successfully: ClassTimer.apk"
    ls -la /home/engine/project/ClassTimer.apk
else
    echo "APK build failed!"
fi