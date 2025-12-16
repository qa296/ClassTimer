#!/bin/bash

# ClassTimer Flutter APK构建脚本

set -e

echo "=== ClassTimer Flutter APK构建脚本 ==="

# 检查Flutter是否安装
if ! command -v flutter &> /dev/null; then
    echo "❌ Flutter未安装"
    echo "请先安装Flutter SDK: https://flutter.dev/docs/get-started/install"
    exit 1
fi

# 检查Android SDK
if [ -z "$ANDROID_HOME" ]; then
    echo "❌ ANDROID_HOME未设置"
    echo "请先安装Android SDK并设置ANDROID_HOME环境变量"
    exit 1
fi

# 检查Java
if ! command -v java &> /dev/null; then
    echo "❌ Java未安装"
    echo "请安装OpenJDK 17或更高版本"
    exit 1
fi

echo "✅ 环境检查通过"

# 进入项目目录
cd classtimer

echo "📦 清理项目..."
flutter clean

echo "📦 获取依赖..."
flutter pub get

echo "🔨 构建APK..."
flutter build apk --debug

# 检查APK是否构建成功
APK_PATH="build/app/outputs/flutter-apk/app-debug.apk"
if [ -f "$APK_PATH" ]; then
    APK_SIZE=$(du -h "$APK_PATH" | cut -f1)
    echo "✅ APK构建成功！"
    echo "📍 文件位置: $APK_PATH"
    echo "📏 文件大小: $APK_SIZE"
    
    # 复制到根目录
    cp "$APK_PATH" "../classtimer-debug.apk"
    echo "📍 副本位置: ../classtimer-debug.apk"
else
    echo "❌ APK构建失败"
    exit 1
fi

echo "🎉 构建完成！"
echo "📱 在Android设备上安装APK: adb install ../classtimer-debug.apk"