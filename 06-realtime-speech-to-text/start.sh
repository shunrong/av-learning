#!/bin/bash

echo "========================================="
echo "🎤 实时语音转文字系统"
echo "========================================="

# 检查Node.js
if ! command -v node &> /dev/null; then
    echo "❌ 未安装Node.js，请先安装Node.js"
    exit 1
fi

echo "✅ Node.js版本: $(node -v)"

# 检查依赖
if [ ! -d "node_modules" ]; then
    echo "📦 安装依赖..."
    npm install
fi

echo "🚀 启动服务器..."
echo ""
npm start

