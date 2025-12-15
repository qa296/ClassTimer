# ClassTimer - React Native版课程倒计时应用

## 项目概述

这是ClassTimer应用的React Native技术栈重制版本，具有以下特点：

- **秒开应用**：使用React Native + Expo构建，启动速度极快
- **原生性能**：编译为原生Android应用，性能优异
- **完整功能**：复刻了原uni-app版本的所有功能
- **现代化架构**：使用TypeScript和最新的React开发模式

## 核心功能

- ✅ 实时倒计时显示
- ✅ 课程表JSON导入（文件选择+文本输入）
- ✅ 时间偏移设置（铃声提前/延后）
- ✅ 智能时间偏移计算器
- ✅ 数据持久化存储
- ✅ 黑色主题，适合夜间使用
- ✅ 响应式设计，支持各种屏幕尺寸

## 技术栈

- **前端框架**: React Native + Expo
- **开发语言**: TypeScript
- **导航**: Expo Router
- **存储**: AsyncStorage
- **文件处理**: expo-document-picker
- **构建工具**: EAS Build

## 快速开始

### 环境要求

- Node.js 18+ 
- npm 9+
- Android Studio (用于APK构建)
- Java 11+

### 安装依赖

```bash
npm install
```

### 开发运行

```bash
# 启动开发服务器
npm start

# 在Android设备上运行
npm run android

# 在iOS设备上运行（需要macOS）
npm run ios

# 在Web浏览器中运行
npm run web
```

### 构建APK

本项目配置了EAS Build，可以构建生产版APK：

```bash
# 构建预览版APK
npx eas build --platform android --profile preview

# 构建生产版APK
npx eas build --platform android --profile production
```

或者使用本地构建脚本：

```bash
cd android-build
chmod +x build-apk.sh
./build-apk.sh
```

## 项目结构

```
class-timer/
├── app/                    # Expo Router页面
│   ├── _layout.tsx        # 根布局
│   ├── main.tsx           # 主页面（倒计时显示）
│   └── settings.tsx       # 设置页面
├── assets/               # 静态资源
├── android-build/        # 构建相关文件
│   ├── build-apk.sh      # 构建脚本
│   └── classtimer-v1.0.0.apk  # 构建的APK文件
├── app.json             # Expo应用配置
├── eas.json             # EAS构建配置
└── package.json         # 项目依赖
```

## 应用界面

### 主屏幕
- 大号倒计时显示
- 课程状态指示（距离上课/下课）
- 课程名称显示
- 点击进入设置页面

### 设置屏幕
- 课程表导入（文件选择/文本输入）
- 时间偏移设置
- 智能偏移计算器
- JSON格式示例

## 数据格式

课程表JSON格式：

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

- `day`: 星期几 (1-7, 1为周一)
- `name`: 课程名称
- `start`: 开始时间 (HH:MM格式)
- `end`: 结束时间 (HH:MM格式)

## 性能优化

- **秒开启动**: 配置了原生启动画面
- **内存优化**: 使用React Native最新架构
- **电池优化**: 高效的定时器实现
- **存储优化**: 轻量级数据存储方案

## 部署说明

### APK构建

1. **EAS Cloud Build** (推荐)
   - 需要Expo账号
   - 云端构建，无需本地Android环境
   - 自动签名和优化

2. **本地构建**
   - 需要安装Android SDK
   - 完整的本地开发环境
   - 可自定义构建配置

### 商店发布

构建完成后的APK可以直接：
- 上传到应用商店（Google Play等）
- 分发给用户直接安装
- 集成到企业应用商店

## 许可证

本项目遵循MIT许可证。

## 贡献

欢迎提交Issue和Pull Request来改进这个项目。

## 更新日志

### v1.0.0
- ✅ React Native技术栈重制
- ✅ 实现秒开应用性能
- ✅ 完整复刻原版功能
- ✅ 配置APK构建流程
- ✅ 添加TypeScript支持
- ✅ 优化用户体验