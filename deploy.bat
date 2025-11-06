@echo off
chcp 65001 >nul
echo ====================================
echo 技术交流社区 - 部署打包脚本
echo ====================================
echo.

:: 检查 dist 目录是否存在
if not exist "dist" (
    echo [错误] dist 目录不存在！
    echo 请先运行 npm run build 打包项目
    pause
    exit /b 1
)

echo [1/4] 准备打包文件...
set OUTPUT_DIR=deploy_package
set TIMESTAMP=%date:~0,4%%date:~5,2%%date:~8,2%_%time:~0,2%%time:~3,2%%time:~6,2%
set TIMESTAMP=%TIMESTAMP: =0%
set PACKAGE_NAME=shequ-frontend-%TIMESTAMP%

:: 创建打包目录
if exist "%OUTPUT_DIR%" rmdir /s /q "%OUTPUT_DIR%"
mkdir "%OUTPUT_DIR%"
mkdir "%OUTPUT_DIR%\dist"
mkdir "%OUTPUT_DIR%\logs"

echo [2/4] 复制文件...
:: 复制 dist 目录
xcopy /E /I /Y "dist\*" "%OUTPUT_DIR%\dist\" >nul

:: 复制配置文件和文档
copy /Y "nginx.conf" "%OUTPUT_DIR%\" >nul
copy /Y "宝塔部署指南.md" "%OUTPUT_DIR%\" >nul

:: 创建部署说明
echo 技术交流社区前端部署包 > "%OUTPUT_DIR%\README.txt"
echo. >> "%OUTPUT_DIR%\README.txt"
echo 打包时间: %date% %time% >> "%OUTPUT_DIR%\README.txt"
echo. >> "%OUTPUT_DIR%\README.txt"
echo 目录结构: >> "%OUTPUT_DIR%\README.txt"
echo   dist/              前端打包文件 >> "%OUTPUT_DIR%\README.txt"
echo   logs/              日志目录（空） >> "%OUTPUT_DIR%\README.txt"
echo   nginx.conf         Nginx配置文件 >> "%OUTPUT_DIR%\README.txt"
echo   宝塔部署指南.md    详细部署说明 >> "%OUTPUT_DIR%\README.txt"
echo. >> "%OUTPUT_DIR%\README.txt"
echo 部署步骤: >> "%OUTPUT_DIR%\README.txt"
echo 1. 将整个 deploy_package 目录上传到服务器 /www/wwwroot/shequ-tech-community/ >> "%OUTPUT_DIR%\README.txt"
echo 2. 按照"宝塔部署指南.md"中的步骤配置 Nginx >> "%OUTPUT_DIR%\README.txt"
echo 3. 访问你的公网 IP 测试部署 >> "%OUTPUT_DIR%\README.txt"

echo [3/4] 压缩打包...
:: 使用 PowerShell 压缩（Windows 自带）
powershell -command "Compress-Archive -Path '%OUTPUT_DIR%\*' -DestinationPath '%PACKAGE_NAME%.zip' -Force"

if exist "%PACKAGE_NAME%.zip" (
    echo [4/4] 打包完成！
    echo.
    echo ====================================
    echo 打包成功！
    echo ====================================
    echo.
    echo 输出文件: %PACKAGE_NAME%.zip
    for %%A in ("%PACKAGE_NAME%.zip") do echo 文件大小: %%~zA 字节
    echo.
    echo 临时目录: %OUTPUT_DIR%\
    echo.
    echo 下一步:
    echo 1. 将 %PACKAGE_NAME%.zip 上传到服务器
    echo 2. 解压到 /www/wwwroot/shequ-tech-community/
    echo 3. 按照"宝塔部署指南.md"配置 Nginx
    echo.
    
    :: 询问是否清理临时文件
    set /p CLEANUP="是否删除临时目录？(y/n): "
    if /i "%CLEANUP%"=="y" (
        rmdir /s /q "%OUTPUT_DIR%"
        echo 临时目录已删除
    )
) else (
    echo [错误] 压缩失败！
    pause
    exit /b 1
)

echo.
pause

