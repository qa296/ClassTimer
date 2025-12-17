#!/bin/bash
set -e

echo "=== 清理环境 ==="
pkill -9 java 2>/dev/null || true
pkill -9 node 2>/dev/null || true  
pkill -9 npm 2>/dev/null || true
pkill -9 sdkmanager 2>/dev/null || true
sleep 2

echo "=== 设置环境变量 ==="
export ANDROID_HOME=/tmp/android-sdk
export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
export PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools
echo "ANDROID_HOME=$ANDROID_HOME"
echo "JAVA_HOME=$JAVA_HOME"

echo "=== 检查Java ==="
java -version

echo "=== 检查项目 ==="
cd /home/engine/project/ClassTimer
ls -la

echo "=== 检查Android项目 ==="
cd /home/engine/project/ClassTimer/android
ls -la

echo "环境设置完成"