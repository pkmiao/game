@echo off
chcp 65001 >nul
cd /d %~dp0
echo ==========================================
echo   帽孩出击 Hat Shoot - 本地服务器启动中
echo ==========================================
echo.
where python >nul 2>nul
if %errorlevel%==0 (
    echo 检测到 Python，正在启动...
    start "" http://localhost:8000
    python -m http.server 8000
    goto :end
)
where py >nul 2>nul
if %errorlevel%==0 (
    start "" http://localhost:8000
    py -m http.server 8000
    goto :end
)
echo 未检测到 Python。
echo 没关系 —— 本游戏可以直接双击 index.html 游玩！
echo （start.bat 只是备用方案）
pause
:end
