# ClassTimer RN - React Native重构版

这是一个使用React Native技术栈重构的课程计时器应用，具有秒级精度倒计时和优化的启动性能。

## 功能特性

### ⚡ 瞬间启动
- 移除启动屏幕
- 优化Android启动配置
- 使用快速启动原生模块
- 减少依赖项，减小应用体积

### 📱 核心功能
- **实时倒计时**: 秒级精度显示下一节课的上课/下课时间
- **课表导入**: 支持JSON格式的课表数据导入
- **时间偏移**: 可设置提前或延后的铃声时间
- **智能建议**: 根据最近课表时间自动建议合适的偏移量
- **数据持久化**: 使用AsyncStorage保存课表和设置

### 🎨 界面设计
- **暗色主题**: 护眼的黑色背景
- **简洁布局**: 主屏倒计时 + 设置面板双屏切换
- **大字体显示**: 倒计时使用超大字体，便于远距离查看
- **响应式设计**: 适配不同屏幕尺寸

## 技术栈

- **React Native 0.72.7**: 跨平台移动应用框架
- **TypeScript**: 类型安全的JavaScript
- **AsyncStorage**: 数据持久化存储
- **React Navigation**: 应用导航
- **React Native Reanimated**: 流畅动画效果

## 项目结构

```
ClassTimerRN/
├── src/
│   ├── types/
│   │   └── Schedule.ts          # 课表数据结构定义
│   └── App.tsx                  # 主应用组件
├── android/
│   ├── app/
│   │   └── src/main/java/
│   │       └── com/classtimerrn/
│   │           ├── FastStartModule.java    # 快速启动原生模块
│   │           └── FastStartPackage.java   # 原生模块包
│   └── app/src/main/AndroidManifest.xml    # Android配置
├── build-apk.sh                 # APK构建脚本
└── README.md                    # 项目说明
```

## 构建APK

### 前提条件
- Java 11或更高版本
- Android SDK
- Gradle

### 构建步骤
1. 确保在项目根目录
2. 运行构建脚本：
   ```bash
   ./build-apk.sh [debug|release|both]
   ```

### 构建选项
- `debug`: 构建Debug版本APK
- `release`: 构建Release版本APK
- `both`: 构建两个版本（默认）

### 输出文件
构建完成后会生成：
- `ClassTimerRN-debug.apk` - Debug版本
- `ClassTimerRN-release.apk` - Release版本
- `APK_INFO.md` - APK构建信息

## 安装使用

### Android安装
```bash
# Debug版本
adb install ClassTimerRN-debug.apk

# Release版本
adb install ClassTimerRN-release.apk
```

### 课表格式
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
    },
    {
      "day": 2,
      "classes": [
        {"name": "英语", "start": "08:00", "end": "08:45"}
      ]
    }
  ]
}
```

**字段说明：**
- `day`: 星期几 (1-7, 1为周一)
- `classes`: 课程数组
  - `name`: 课程名称
  - `start`: 开始时间 (HH:MM格式)
  - `end`: 结束时间 (HH:MM格式)

## 启动优化

### Android配置优化
1. **移除启动屏幕**: 直接进入应用主界面
2. **单任务模式**: `launchMode="singleTop"`
3. **硬件加速**: 启用GPU硬件加速
4. **原生模块**: 添加快速启动原生模块
5. **优化主题**: 使用无标题栏黑色主题

### 性能优化
- 减少外部依赖
- 使用原生存储
- 优化组件渲染
- 减少内存占用

## 开发说明

### 运行开发版本
```bash
# 启动Metro服务器
npm start

# 运行Android版本
npm run android
```

### 代码结构
- `App.tsx`: 主应用组件，包含所有功能逻辑
- `ScheduleData`: 课表数据结构
- `AsyncStorage`: 数据持久化存储
- `setInterval`: 1秒间隔更新倒计时

### 主要功能方法
- `updateStatus()`: 更新倒计时状态
- `loadSavedData()`: 加载保存的数据
- `validateSchedule()`: 验证课表格式
- `handleTextSubmit()`: 处理课表文本提交

## 许可证

本项目遵循MIT许可证。

## 更新日志

### v1.0.0 (当前版本)
- ✅ 完成React Native重构
- ✅ 实现瞬间启动功能
- ✅ 完整功能迁移
- ✅ APK构建脚本
- ✅ Android启动优化