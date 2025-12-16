# ClassTimer - Flutter版本

这是一个使用Flutter技术栈复刻的ClassTimer应用，具有瞬间启动的特性。

## 功能特性

- **瞬间启动**: Flutter原生编译，打开瞬间即可使用
- **课表导入**: 支持JSON格式的课表数据导入
- **实时计时**: 实时显示距离下一节课的倒计时
- **时间偏移**: 支持设置铃声提前/延后时间
- **偏移计算器**: 智能计算建议的时间偏移
- **暗黑主题**: 适合长时间使用的暗黑界面
- **数据持久化**: 使用SharedPreferences本地存储

## 应用界面

应用采用双屏设计：

1. **主屏**: 显示当前状态和倒计时
2. **设置屏**: 包含课表导入和时间偏移设置

## 课表格式

应用支持以下JSON格式的课表数据：

```json
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
}
```

其中：
- `day`: 星期几 (1-7, 1为星期一)
- `name`: 课程名称
- `start`: 开始时间 (HH:MM格式)
- `end`: 结束时间 (HH:MM格式)

## 技术栈

- **Flutter 3.19.6**: 跨平台UI框架
- **Dart 3.3.4**: 编程语言
- **SharedPreferences**: 本地数据存储
- **Material Design**: UI组件库

## 构建APK

### 环境要求

- Flutter SDK 3.19.6+
- Android SDK (API 30+)
- OpenJDK 17+
- Android设备或模拟器

### 构建步骤

1. **安装Flutter SDK**
```bash
# 解压Flutter SDK
tar xf flutter.tar.xz

# 设置环境变量
export PATH="$PATH:/path/to/flutter/bin"
```

2. **配置Android环境**
```bash
# 设置环境变量
export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
export ANDROID_HOME=/path/to/android-sdk
export PATH="$PATH:$ANDROID_HOME/platform-tools"
```

3. **构建APK**
```bash
cd classtimer
flutter clean
flutter pub get
flutter build apk --debug
```

构建完成后，APK文件位于：
`classtimer/build/app/outputs/flutter-apk/app-debug.apk`

### 安装APK

构建完成后，将APK文件传输到Android设备并安装：

```bash
# 启用USB调试和未知来源安装
adb install build/app/outputs/flutter-apk/app-debug.apk
```

## 开发环境

- Flutter SDK: 3.19.6
- Dart SDK: 3.3.4
- Android SDK: API 34
- Java: OpenJDK 17

## 安装说明

1. 下载 `classtimer.apk` 文件
2. 在Android设备上启用"未知来源"应用安装
3. 安装APK文件
4. 打开应用并导入课表

## 源代码结构

- `lib/main.dart`: 主应用代码
- `pubspec.yaml`: 项目依赖配置
- `android/`: Android平台特定配置

## 性能优化

- Flutter原生编译，启动速度快
- 使用原生SharedPreferences，存储效率高
- 精简的UI设计，减少渲染开销
- 1秒间隔定时更新，平衡实时性和电池消耗

## 与原版对比

相比原有的uni-app版本，Flutter版本具有以下优势：

1. **启动速度**: 原生编译，启动更快
2. **性能**: Flutter引擎优化，运行更流畅
3. **包体积**: 虽然APK较大(约140MB)，但运行性能更佳
4. **稳定性**: Flutter框架稳定性更高

## 许可证

MIT License