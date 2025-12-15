#!/bin/bash

# ClassTimer RN Android 构建脚本
# 用于快速构建APK并添加到git

set -e

echo "🚀 开始构建 ClassTimer RN Android APK..."

# 检查必要的工具
check_tools() {
    echo "📋 检查构建环境..."
    
    if ! command -v java &> /dev/null; then
        echo "❌ 未找到Java，请安装Java 11或更高版本"
        exit 1
    fi
    
    if ! command -v gradle &> /dev/null && ! command -v ./gradlew &> /dev/null; then
        echo "❌ 未找到Gradle，请确保在Android项目根目录"
        exit 1
    fi
    
    echo "✅ 构建环境检查通过"
}

# 清理之前的构建
clean_build() {
    echo "🧹 清理之前的构建文件..."
    cd android
    if command -v gradle &> /dev/null; then
        gradle clean
    else
        ./gradlew clean
    fi
    cd ..
}

# 构建Debug APK
build_debug_apk() {
    echo "🔨 构建Debug APK..."
    cd android
    
    if command -v gradle &> /dev/null; then
        gradle assembleDebug
    else
        ./gradlew assembleDebug
    fi
    
    cd ..
    echo "✅ Debug APK构建完成"
}

# 构建Release APK
build_release_apk() {
    echo "🔨 构建Release APK..."
    cd android
    
    if command -v gradle &> /dev/null; then
        gradle assembleRelease
    else
        ./gradlew assembleRelease
    fi
    
    cd ..
    echo "✅ Release APK构建完成"
}

# 复制APK到项目根目录
copy_apks() {
    echo "📦 复制APK文件..."
    
    # Debug APK
    if [ -f "android/app/build/outputs/apk/debug/app-debug.apk" ]; then
        cp "android/app/build/outputs/apk/debug/app-debug.apk" "./ClassTimerRN-debug.apk"
        echo "✅ Debug APK已复制到: ./ClassTimerRN-debug.apk"
    fi
    
    # Release APK
    if [ -f "android/app/build/outputs/apk/release/app-release.apk" ]; then
        cp "android/app/build/outputs/apk/release/app-release.apk" "./ClassTimerRN-release.apk"
        echo "✅ Release APK已复制到: ./ClassTimerRN-release.apk"
    fi
}

# 添加APK到git
add_to_git() {
    echo "📤 添加APK到git..."
    
    # 添加APK文件
    if [ -f "./ClassTimerRN-debug.apk" ]; then
        git add ./ClassTimerRN-debug.apk
        echo "✅ Debug APK已添加到git"
    fi
    
    if [ -f "./ClassTimerRN-release.apk" ]; then
        git add ./ClassTimerRN-release.apk
        echo "✅ Release APK已添加到git"
    fi
    
    # 创建APK信息文件
    cat > APK_INFO.md << EOF
# ClassTimer RN APK 构建信息

## 构建时间
$(date)

## 文件大小
EOF
    
    if [ -f "./ClassTimerRN-debug.apk" ]; then
        echo "- Debug APK: $(ls -lh ./ClassTimerRN-debug.apk | awk '{print $5}')" >> APK_INFO.md
    fi
    
    if [ -f "./ClassTimerRN-release.apk" ]; then
        echo "- Release APK: $(ls -lh ./ClassTimerRN-release.apk | awk '{print $5}')" >> APK_INFO.md
    fi
    
    git add APK_INFO.md
    echo "✅ APK信息已添加到git"
}

# 主函数
main() {
    echo "🎯 ClassTimer RN Android APK构建器"
    echo "=================================="
    
    check_tools
    
    # 构建选项
    BUILD_TYPE=${1:-"both"}  # debug, release, both
    
    case $BUILD_TYPE in
        "debug")
            build_debug_apk
            ;;
        "release")
            build_release_apk
            ;;
        "both"|*)
            build_debug_apk
            build_release_apk
            ;;
    esac
    
    copy_apks
    add_to_git
    
    echo ""
    echo "🎉 构建完成！"
    echo "APK文件已准备就绪并添加到git"
    echo ""
    echo "📱 安装命令："
    if [ -f "./ClassTimerRN-debug.apk" ]; then
        echo "Debug版本: adb install ClassTimerRN-debug.apk"
    fi
    if [ -f "./ClassTimerRN-release.apk" ]; then
        echo "Release版本: adb install ClassTimerRN-release.apk"
    fi
}

# 执行主函数
main "$@"