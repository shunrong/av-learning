#!/bin/bash

# 推流测试脚本 - 快速测试推流功能

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  📡 推流测试脚本"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 推流地址
RTMP_URL="rtmp://localhost:1935/live/stream"

# 检查 FFmpeg
if ! command -v ffmpeg &> /dev/null; then
    echo "❌ 错误: FFmpeg 未安装"
    exit 1
fi

echo "✅ FFmpeg 已安装"
echo ""

# 检查测试视频
if [ -f "../test.mp4" ]; then
    echo "📹 使用测试视频推流"
    echo ""
    echo "推流地址: $RTMP_URL"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    
    ffmpeg -re -stream_loop -1 -i ../test.mp4 \
           -c:v libx264 -preset veryfast -b:v 2000k \
           -c:a aac -b:a 128k \
           -f flv $RTMP_URL
else
    echo "❌ 未找到测试视频 test.mp4"
    echo ""
    echo "请将视频文件命名为 test.mp4 并放到项目根目录"
    exit 1
fi
