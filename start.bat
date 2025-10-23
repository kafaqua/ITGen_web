@echo off
echo ========================================
echo 深度代码模型鲁棒性评估与增强平台
echo Deep Code Model Robustness Platform
echo ========================================
echo.

echo 正在启动服务...
echo.

echo [1/4] 启动算法服务...
start "算法服务" cmd /k "cd web\algorithm_service && python app.py"
timeout /t 3 /nobreak > nul

echo [2/4] 启动后端API服务...
start "后端API服务" cmd /k "cd web\backend && python app.py"
timeout /t 3 /nobreak > nul

echo [3/4] 安装前端依赖...
cd web\frontend
call npm install
if %errorlevel% neq 0 (
    echo 前端依赖安装失败！
    pause
    exit /b 1
)

echo [4/4] 启动前端应用...
start "前端应用" cmd /k "npm start"
cd ..\..

echo.
echo ========================================
echo 所有服务已启动！
echo ========================================
echo.
echo 前端应用: http://localhost:5173
echo 后端API: http://localhost:5000
echo 算法服务: http://localhost:8000
echo.
echo 按任意键退出...
pause > nul
