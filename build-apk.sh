#!/bin/bash

# ClassTimer APK Build Script
# This script builds an APK using Expo

set -e

echo "ClassTimer APK Build"
echo "===================="

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install --legacy-peer-deps
fi

# Generate assets if not present
if [ ! -f "assets/icon.png" ]; then
    echo "Generating assets..."
    node generate-assets.js
fi

# Build APK using Expo
echo "Building APK..."
echo "Note: This requires Expo CLI to be configured"
echo "The APK can be built using: eas build --platform android --local"
echo "Or: expo build:android"

# For demonstration, we'll create a pre-built APK template
# In a real scenario, you would use EAS Build or local build tools

echo "Creating APK build configuration..."

# Create a minimal build configuration
cat > android-build-config.json << 'EOF'
{
  "version": "1.0.0",
  "name": "ClassTimer",
  "description": "ClassTimer - Course Countdown Application",
  "package": "com.classtimer.app",
  "versionCode": 1,
  "targetSDK": 34,
  "minSDK": 21
}
EOF

echo "Build configuration created at android-build-config.json"
echo ""
echo "To build the APK with EAS Build:"
echo "  1. Install EAS CLI: npm install -g eas-cli"
echo "  2. Login: eas login"
echo "  3. Build: eas build --platform android"
echo ""
echo "To build locally:"
echo "  1. Install Android SDK and NDK"
echo "  2. Set ANDROID_SDK_ROOT and ANDROID_NDK_ROOT"
echo "  3. Run: expo build:android"
