@echo off
chcp 65001 >nul
cd /d "%~dp0\.."
echo ================================================
echo   曦光之地：商会风云 - 局域网试玩服务器
echo ================================================
echo.
echo   本机打开:  http://localhost:8000
echo.
echo   苹果手机试玩（需与电脑连同一 Wi-Fi）:
echo   在 Safari 里输入下面的网址（手机号和电脑的
echo   网络必须相同，且电脑防火墙需放行 8000 端口）:
echo.
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /i "ipv4"') do (
  echo   http://%%a:8000
)
echo.
echo   提示: 手机上也可用「分享 - 添加到主屏幕」创建快捷方式
echo   按 Ctrl+C 停止服务器
echo ================================================
python -m http.server 8000 --bind 0.0.0.0
pause
