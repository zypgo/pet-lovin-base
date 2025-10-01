# 🐾 宠物之家 (Pet Home)

<div align="center">

一个基于 **React + AI** 的全功能宠物应用平台，为宠物爱好者提供智能化的宠物管理和娱乐体验。

[![React](https://img.shields.io/badge/React-19.1.1-blue.svg)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8.2-blue.svg)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6.2.0-purple.svg)](https://vitejs.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-Express-green.svg)](https://nodejs.org/)

[🚀 在线体验](https://pet-home-replit.repl.co) | [📚 功能介绍](#-功能特色) | [🛠️ 快速开始](#-快速开始)

</div>

## ✨ 功能特色

### 🤖 AI 驱动的智能功能
- **🔍 智能宠物识别** - 上传照片即可识别宠物品种和特征
- **💊 AI健康咨询** - 专业的宠物健康问题解答和建议
- **📖 宠物故事创作** - AI辅助创作温馨的宠物故事

### 🎨 实用工具集合
- **🖼️ 图片编辑器** - 为宠物照片添加滤镜和特效
- **📸 宠物图库** - 精美的宠物照片展示和管理
- **🎯 个性化模式** - 多种界面主题和交互模式

### 🌟 用户体验
- **响应式设计** - 完美适配桌面端和移动端
- **流畅动画** - 精心设计的过渡动画和交互效果
- **快速加载** - 优化的性能和资源管理

## 🛠️ 技术栈

### 前端技术
- **React 19.1.1** - 现代化的用户界面框架
- **TypeScript** - 类型安全的JavaScript超集
- **Vite** - 极速的前端构建工具
- **CSS Modules** - 模块化的样式管理

### 后端技术
- **Node.js + Express** - 轻量级的服务器框架
- **CORS** - 跨域资源共享支持
- **Rate Limiting** - API请求频率控制

### AI 集成
- **Google Gemini AI** - 强大的多模态AI能力
- **Perplexity API** - 智能搜索和信息检索
- **GitHub集成** - 代码管理和版本控制

### 工具库
- **DOMPurify** - HTML内容安全过滤
- **Marked** - Markdown解析和渲染

## 🚀 快速开始

### 环境要求
- **Node.js** >= 18.0.0
- **npm** 或 **yarn**

### 1. 克隆项目
```bash
git clone https://github.com/zypgo/pet-home-replit.git
cd pet-home-replit
```

### 2. 安装依赖
```bash
npm install
# 或者使用 yarn
yarn install
```

### 3. 环境配置
创建 `.env.local` 文件并配置以下环境变量：
```bash
# Google Gemini AI API Key
GEMINI_API_KEY=your_gemini_api_key_here

# Perplexity API Key (可选)
PERPLEXITY_API_KEY=your_perplexity_api_key_here
```

### 4. 启动开发服务器
```bash
# 启动前端开发服务器
npm run dev

# 启动后端服务器
npm run server
```

### 5. 打开浏览器
访问 [http://localhost:5000](http://localhost:5000) 开始体验！

## 📁 项目结构

```
pet-home-replit/
├── components/              # React 组件
│   ├── AgentMode.tsx       # AI智能模式
│   ├── PetIdentifier.tsx   # 宠物识别
│   ├── PetHealthAdvisor.tsx # 健康咨询
│   ├── PetStoryCreator.tsx # 故事创作
│   ├── PetImageEditor.tsx  # 图片编辑
│   ├── PetGallery.tsx      # 宠物图库
│   └── ...
├── services/               # API 服务
│   ├── geminiService.ts    # Gemini AI 服务
│   └── perplexityService.ts # Perplexity 搜索服务
├── App.tsx                 # 主应用组件
├── index.tsx              # 应用入口
├── server.js              # Express 后端服务器
├── vite.config.ts         # Vite 配置
└── package.json           # 项目依赖
```

## 🎯 功能详解

### 🔍 智能宠物识别
- 支持多种图片格式上传
- 精确识别宠物品种、年龄、特征
- 提供详细的宠物信息和护理建议

### 💊 AI健康咨询
- 基于症状描述的初步诊断
- 紧急情况识别和处理建议
- 日常护理和营养指导

### 📖 宠物故事创作
- AI辅助的创意写作
- 个性化的故事情节生成
- 支持多种故事风格和长度

### 🖼️ 图片编辑
- 实时滤镜和特效预览
- 宠物照片美化工具
- 一键分享到社交媒体

## 🌐 部署指南

### 本地构建
```bash
npm run build
npm run preview
```

### Replit 部署
1. Fork 这个项目到你的 Replit 账户
2. 在 Secrets 中配置 API 密钥
3. 点击 Run 按钮启动应用

### Vercel 部署
```bash
npm install -g vercel
vercel
```

## 🤝 贡献指南

欢迎各种形式的贡献！

1. **Fork** 这个仓库
2. 创建你的特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交你的修改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开一个 **Pull Request**

## 📝 更新日志

### v1.0.0 (2025-09-26)
- 🎉 项目初始发布
- ✨ 实现核心AI功能
- 🎨 完善用户界面设计
- 🔧 优化性能和用户体验

## 📄 许可证

该项目采用 MIT 许可证 - 详情请查看 [LICENSE](LICENSE) 文件。

## 📞 联系方式

- **作者**: zypgo
- **GitHub**: [@zypgo](https://github.com/zypgo)
- **项目链接**: [https://github.com/zypgo/pet-home-replit](https://github.com/zypgo/pet-home-replit)

## 🙏 致谢

感谢以下优秀的开源项目：
- [React](https://reactjs.org/) - 用户界面库
- [Vite](https://vitejs.dev/) - 构建工具
- [Google Gemini](https://ai.google.dev/) - AI能力支持
- [Express](https://expressjs.com/) - 后端框架

---

<div align="center">

**如果这个项目对你有帮助，请给一个 ⭐ Star！**

Made with ❤️ by [zypgo](https://github.com/zypgo)

</div>