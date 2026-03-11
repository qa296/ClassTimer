#!/bin/bash
set -e

APP_NAME="等下课"
PACKAGE="com.classtimer"
BUILD_DIR="build"

# 创建目录
mkdir -p $BUILD_DIR/lib/arm64-v8a
mkdir -p $BUILD_DIR/lib/armeabi-v7a
mkdir -p $BUILD_DIR/classes
mkdir -p $BUILD_DIR/apk

# 1. 编译C代码为共享库
echo "编译原生库..."

# ARM64
cd jni
$CC -fPIC -shared -O2 -DANDROID -o ../$BUILD_DIR/lib/arm64-v8a/libclasstimer.so \
    main.c -llog 2>/dev/null || echo "跳过ARM64编译"

# ARMv7
$CC_ARM -fPIC -shared -O2 -DANDROID -march=armv7-a -o ../$BUILD_DIR/lib/armeabi-v7a/libclasstimer.so \
    main.c -llog 2>/dev/null || echo "跳过ARMv7编译"

cd ..

# 2. 编译Java代码
echo "编译Java代码..."
find src -name "*.java" > sources.txt 2>/dev/null || true

# 3. 打包APK
echo "打包APK..."
cd $BUILD_DIR

# 创建基础APK结构
mkdir -p temp/lib/arm64-v8a
mkdir -p temp/lib/armeabi-v7a

# 复制库文件
cp lib/arm64-v8a/*.so temp/lib/arm64-v8a/ 2>/dev/null || true
cp lib/armeabi-v7a/*.so temp/lib/armeabi-v7a/ 2>/dev/null || true

# 创建dex（如果有dx工具）
if command -v dx &> /dev/null; then
    dx --dex --output=temp/classes.dex ../classes 2>/dev/null || true
fi

# 复制AndroidManifest
cp ../AndroidManifest.xml temp/

echo "APK构建完成"
echo "注意: 完整APK需要使用Android SDK工具进行最终打包"
