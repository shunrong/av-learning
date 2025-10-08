#!/bin/bash

# 视频点播系统启动脚本

echo "======================================"
echo "  视频点播系统 (VOD System) 启动脚本"
echo "======================================"
echo ""

# 检查Node.js
if ! command -v node &> /dev/null; then
    echo "❌ 错误: 未检测到 Node.js"
    echo "请先安装 Node.js: https://nodejs.org/"
    exit 1
fi

echo "✅ Node.js 版本: $(node -v)"

# 检查FFmpeg
if ! command -v ffmpeg &> /dev/null; then
    echo "❌ 错误: 未检测到 FFmpeg"
    echo "请安装 FFmpeg:"
    echo "  macOS:   brew install ffmpeg"
    echo "  Ubuntu:  sudo apt install ffmpeg"
    exit 1
fi

echo "✅ FFmpeg 版本: $(ffmpeg -version | head -n1)"

# 检查依赖
if [ ! -d "node_modules" ]; then
    echo ""
    echo "📦 检测到首次运行，正在安装依赖..."
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ 依赖安装失败"
        exit 1
    fi
    echo "✅ 依赖安装完成"
fi

echo ""
echo "🚀 启动服务器..."
echo ""
echo "访问地址: http://localhost:3000"
echo "按 Ctrl+C 停止服务器"
echo ""
echo "======================================"
echo ""

# 启动服务器
npm start

