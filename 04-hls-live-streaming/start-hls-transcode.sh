#!/bin/bash

# HLS 转码启动脚本
# 使用方法：./start-hls-transcode.sh

echo "🎬 启动 HLS 转码..."
echo ""
echo "⚠️  注意事项："
echo "   1. 确保 04 服务器已启动（npm start）"
echo "   2. 确保推流已开始（03 推流客户端）"
echo "   3. 推流地址：rtmp://localhost:1935/live/stream"
echo ""
echo "📝 转码配置："
echo "   切片时长：6 秒"
echo "   保留切片：10 个"
echo "   输出目录：media/live/stream/"
echo ""
echo "🚀 启动中..."
echo ""

# 创建输出目录
mkdir -p media/live/stream

# 启动 FFmpeg HLS 转码
ffmpeg -i rtmp://localhost:1935/live/stream \
  -c copy \
  -f hls \
  -hls_time 6 \
  -hls_list_size 10 \
  -hls_flags delete_segments \
  -hls_segment_filename 'media/live/stream/segment_%d.ts' \
  media/live/stream/index.m3u8

echo ""
echo "✅ HLS 转码已停止"

