#!/bin/bash
cd "$(dirname "$0")/.."
echo "================================================"
echo "  曦光之地：商会风云 - 局域网试玩服务器"
echo "================================================"
echo ""
echo "  本机打开:  http://localhost:8000"
echo ""
IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null)
echo "  苹果手机试玩（同一 Wi-Fi）:"
echo "  http://$IP:8000"
echo ""
echo "  提示: 手机 Safari 打开后可用「分享-添加到主屏幕」创建快捷方式"
echo "  按 Ctrl+C 停止服务器"
echo "================================================"
python3 -m http.server 8000 --bind 0.0.0.0
