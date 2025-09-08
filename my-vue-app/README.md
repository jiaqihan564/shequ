# 技术交流社区

一个现代化的技术分享与交流平台，基于 Vue 3 + TypeScript + Vite 构建。

## ✨ 特性

- 🚀 **现代化技术栈**: Vue 3 + TypeScript + Vite
- 🎨 **优雅的UI设计**: 响应式设计，支持深色模式和高对比度
- 🔒 **安全的认证系统**: 完整的登录/注册流程
- 📱 **移动端友好**: 完全响应式设计
- ♿ **无障碍支持**: 符合WCAG标准
- 🎯 **类型安全**: 完整的TypeScript支持
- 🛠️ **开发友好**: ESLint + Prettier + 热重载

## 🚀 快速开始

### 环境要求

- Node.js >= 16.0.0
- npm >= 8.0.0 或 yarn >= 1.22.0

### 安装依赖

```bash
npm install
# 或
yarn install
```

### 开发环境

```bash
npm run dev
# 或
yarn dev
```

### 构建生产版本

```bash
npm run build
# 或
yarn build
```

### 预览生产版本

```bash
npm run preview
# 或
yarn preview
```

## 📁 项目结构

```
src/
├── components/          # 组件
│   ├── icons/          # 图标组件
│   ├── ui/             # UI组件
│   └── LoginForm.vue   # 登录表单
├── types/              # TypeScript类型定义
├── utils/              # 工具函数
│   ├── api.ts          # API请求
│   └── validation.ts   # 表单验证
├── assets/             # 静态资源
├── App.vue             # 根组件
├── main.js             # 入口文件
└── style.css           # 全局样式
```

## 🎨 设计系统

### 颜色系统

- **主色调**: #667eea (蓝紫色)
- **辅助色**: #764ba2 (深紫色)
- **成功色**: #22c55e (绿色)
- **错误色**: #ef4444 (红色)
- **警告色**: #f59e0b (橙色)
- **信息色**: #3b82f6 (蓝色)

### 字体系统

- **字体族**: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto'
- **字体大小**: 12px - 36px (响应式)
- **字重**: 400 (常规), 600 (半粗), 700 (粗体)

### 间距系统

- **基础单位**: 4px
- **间距范围**: 4px - 80px
- **响应式间距**: 支持移动端适配

## 🔧 技术栈

- **框架**: Vue 3.5.18
- **语言**: TypeScript 5.4.0
- **构建工具**: Vite 7.1.2
- **路由**: Vue Router 4.4.5
- **状态管理**: Pinia 2.2.6
- **HTTP客户端**: Axios 1.7.7
- **代码规范**: ESLint + TypeScript ESLint

## 📱 响应式设计

- **桌面端**: >= 1024px
- **平板端**: 768px - 1023px
- **移动端**: < 768px

## ♿ 无障碍支持

- 支持键盘导航
- 屏幕阅读器友好
- 高对比度模式支持
- 减少动画模式支持
- ARIA标签完整

## 🚀 性能优化

- 组件懒加载
- 图片优化
- CSS变量系统
- 防抖验证
- 错误边界处理

## 🔒 安全特性

- XSS防护
- CSRF保护
- 输入验证
- 安全的密码处理
- Token管理

## 📝 开发规范

### 代码风格

- 使用TypeScript严格模式
- 遵循Vue 3 Composition API
- 组件命名使用PascalCase
- 文件命名使用kebab-case

### 提交规范

- feat: 新功能
- fix: 修复bug
- docs: 文档更新
- style: 代码格式调整
- refactor: 代码重构
- test: 测试相关
- chore: 构建过程或辅助工具的变动

## 🤝 贡献指南

1. Fork 项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🙏 致谢

感谢所有为这个项目做出贡献的开发者们！

---

**技术交流社区** - 让技术交流更简单，让学习更高效！