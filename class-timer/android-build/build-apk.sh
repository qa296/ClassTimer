#!/bin/bash

# ClassTimer APK Build Script
# This script builds the ClassTimer APK when Android SDK environment is available

set -e

echo "Starting ClassTimer APK build process..."

# Check required tools
check_requirements() {
    echo "Checking build requirements..."
    
    if ! command -v java &> /dev/null; then
        echo "Error: Java not found. Please install Java 11 or later."
        exit 1
    fi
    
    if ! command -v sdkmanager &> /dev/null; then
        echo "Error: Android SDK not found. Please install Android SDK."
        exit 1
    fi
    
    if ! command -v npx &> /dev/null; then
        echo "Error: Node.js/npm not found. Please install Node.js."
        exit 1
    fi
    
    echo "✓ All requirements satisfied"
}

# Install dependencies
install_dependencies() {
    echo "Installing project dependencies..."
    npm install
    npx expo install --fix
}

# Prebuild the project
prebuild() {
    echo "Prebuilding React Native project..."
    npx expo prebuild --platform android --clear
}

# Build APK
build_apk() {
    echo "Building APK..."
    npx eas build --platform android --profile production --no-wait
}

# Build locally (alternative)
build_local() {
    echo "Building APK locally..."
    cd android
    ./gradlew assembleRelease
    cd ..
}

main() {
    check_requirements
    install_dependencies
    prebuild
    
    echo "Choose build method:"
    echo "1) EAS Cloud Build (requires Expo account)"
    echo "2) Local Build (requires Android SDK setup)"
    read -p "Enter choice (1 or 2): " choice
    
    case $choice in
        1)
            build_apk
            ;;
        2)
            build_local
            ;;
        *)
            echo "Invalid choice"
            exit 1
            ;;
    esac
}

main "$@"
