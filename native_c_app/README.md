# ClassTimer Native C Android App

This is a native C implementation of the ClassTimer application.

## Architecture

The application uses a hybrid architecture:
- **Java Layer**: Android WebView wrapper for UI rendering
- **C Native Layer**: Time calculation logic (this implementation)
- **Assets**: HTML/JS interface files

## Files

- `src/main.c` - Main C implementation with JNI bindings
- `src/Android.mk` - Android NDK build file
- `assets/` - Web interface files
- `apk/ClassTimer.apk` - Built APK file

## Building

Requirements:
- Android NDK
- Android SDK
- Java 17+

Build steps:
```bash
# Set up Android SDK/NDK paths
export ANDROID_SDK=/path/to/android-sdk
export ANDROID_NDK=/path/to/android-ndk

# Build native library
$ANDROID_NDK/ndk-build

# Build APK
./gradlew assembleDebug
```

## Features

- Instant startup (native code + WebView)
- JSON schedule import
- Time offset calculation
- Real-time countdown
- LocalStorage persistence

## Original Implementation

The original app was built with uni-app (Vue.js). This C version provides
the same functionality with native performance.
