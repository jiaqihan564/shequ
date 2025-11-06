#!/bin/bash

echo "===================================="
echo "技术交流社区 - 部署打包脚本"
echo "===================================="
echo

# 检查 dist 目录是否存在
if [ ! -d "dist" ]; then
    echo "[错误] dist 目录不存在！"
    echo "请先运行 npm run build 打包项目"
    exit 1
fi

echo "[1/4] 准备打包文件..."
OUTPUT_DIR="deploy_package"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
PACKAGE_NAME="shequ-frontend-${TIMESTAMP}"

# 创建打包目录
rm -rf "$OUTPUT_DIR"
mkdir -p "$OUTPUT_DIR/dist"
mkdir -p "$OUTPUT_DIR/logs"

echo "[2/4] 复制文件..."
# 复制 dist 目录
cp -r dist/* "$OUTPUT_DIR/dist/"

# 复制配置文件和文档
cp nginx.conf "$OUTPUT_DIR/"
cp 宝塔部署指南.md "$OUTPUT_DIR/"

# 创建部署说明
cat > "$OUTPUT_DIR/README.txt" << EOF
技术交流社区前端部署包

打包时间: $(date)

目录结构:
  dist/              前端打包文件
  logs/              日志目录（空）
  nginx.conf         Nginx配置文件
  宝塔部署指南.md    详细部署说明

部署步骤:
1. 将整个压缩包上传到服务器并解压到 /www/wwwroot/shequ-tech-community/
2. 按照"宝塔部署指南.md"中的步骤配置 Nginx
3. 访问你的公网 IP 测试部署

快速部署命令（在服务器上执行）:
  unzip ${PACKAGE_NAME}.tar.gz -d /www/wwwroot/
  cd /www/wwwroot/shequ-tech-community
  mkdir -p logs
  chmod -R 755 dist
  chown -R www:www dist
EOF

echo "[3/4] 压缩打包..."
tar -czf "${PACKAGE_NAME}.tar.gz" -C "$OUTPUT_DIR" .

if [ -f "${PACKAGE_NAME}.tar.gz" ]; then
    echo "[4/4] 打包完成！"
    echo
    echo "===================================="
    echo "打包成功！"
    echo "===================================="
    echo
    echo "输出文件: ${PACKAGE_NAME}.tar.gz"
    echo "文件大小: $(du -h ${PACKAGE_NAME}.tar.gz | cut -f1)"
    echo
    echo "临时目录: ${OUTPUT_DIR}/"
    echo
    echo "下一步:"
    echo "1. 将 ${PACKAGE_NAME}.tar.gz 上传到服务器"
    echo "2. 解压到 /www/wwwroot/shequ-tech-community/"
    echo "3. 按照"宝塔部署指南.md"配置 Nginx"
    echo
    
    # 询问是否清理临时文件
    read -p "是否删除临时目录？(y/n): " CLEANUP
    if [ "$CLEANUP" = "y" ] || [ "$CLEANUP" = "Y" ]; then
        rm -rf "$OUTPUT_DIR"
        echo "临时目录已删除"
    fi
else
    echo "[错误] 压缩失败！"
    exit 1
fi

echo

