# ClassTimer C版本

使用纯C语言实现的课程提醒应用，具有极速启动特性（1秒内启动）。

## 特性

- ✅ 纯C语言实现，无外部依赖
- ✅ 极速启动（< 1秒）
- ✅ 支持JSON格式课表导入
- ✅ 支持时间偏移设置
- ✅ 支持倒计时显示
- ✅ 支持Android NDK编译

## 项目结构

```
c_version/
├── jni/
│   ├── classtimer.c    # 主程序源码
│   ├── Android.mk      # NDK构建配置
│   └── Application.mk  # 应用配置
├── libs/               # 编译输出目录
└── README.md
```

## 编译方法

### Linux/Unix

```bash
gcc -O2 -o classtimer classtimer.c
./classtimer
```

### Android NDK

```bash
cd jni
ndk-build
```

生成的二进制文件将位于 `libs/arm64-v8a/classtimer`

## 使用方法

1. 导入课表：按照JSON格式输入课表数据
2. 查看倒计时：显示下一节课的倒计时
3. 设置偏移：调整铃声提前/延后时间

## 课表JSON格式示例

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

## 性能优势

- 编译后二进制大小 < 50KB
- 启动时间 < 100ms
- 内存占用 < 1MB
