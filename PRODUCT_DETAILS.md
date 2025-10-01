# 🐾 Pet Home - 产品细节文档

> 本文档汇总当前版本已完成的产品功能、技术原理与模型选型，并列出尚未完成的功能与后续规划。分支策略：开发工具分别在 `Cursor`、`BOLT`、`lovable` 三分支并行进行；本地工作默认保持在 `Cursor`。

## 1. 产品概览

- 定位：面向宠物爱好者的 AI 驱动应用，提供识别、健康咨询、图片创作/编辑、故事创作与一体化 Agent 体验。
- 技术栈：前端 React + TypeScript + Vite；后端 Node.js + Express；AI 能力集成 Google Gemini；检索增强使用 Perplexity。
- 运行模式：前后端同域部署（前端通过 `window.location.origin` 调用后端 API）。

## 2. 已完成的功能（End-to-End）

### 2.1 智能宠物识别（PetIdentifier）
- 前端：`components/PetIdentifier.tsx` + `components/PetInfoDisplay.tsx`
- 服务：`services/geminiService.ts` → POST `/api/gemini/identify`
- 模型：`gemini-2.5-flash`（多模态理解），后端 JSON Schema 约束输出（包含品种、物种、信心度、外观/性格/护理/健康关注点字段）。
- 说明：前端将图片转 base64，由后端统一持有 `GEMINI_API_KEY` 调用 Gemini，返回结构化 JSON。

### 2.2 宠物健康顾问（PetHealthAdvisor）
- 前端：`components/PetHealthAdvisor.tsx`
- 服务：`services/geminiService.ts` → POST `/api/gemini/health`（主路径）、`/api/gemini/health-simple`（回退）
- 检索增强：`/api/search`（Perplexity）+ LangGraph 流程（`graphs/healthGraph.js`）
- 模型：`gemini-2.5-flash` 负责生成查询、反思与综合；Perplexity 负责检索结果与引用。
- 输出：Markdown（含脚注形式的引用映射），固定小节结构（可能原因/家庭照护/何时就医/温馨提示），自动追加“非医疗诊断”免责声明。

### 2.3 图片编辑与创作（PetImageEditor）
- 前端：`components/PetImageEditor.tsx`
- 服务：`services/geminiService.ts` → POST `/api/gemini/edit-image`
- 模型：`gemini-2.5-flash-image`（图像编辑/生成），`responseModalities: [IMAGE, TEXT]`。
- 说明：支持文本指令生成/编辑宠物图片，并将结果回显及可加入前端 Gallery。

### 2.4 宠物故事创作（PetStoryCreator）
- 前端：`components/PetStoryCreator.tsx`（包含浏览器端语音识别试验性支持 `SpeechRecognition`）
- 服务：`services/geminiService.ts` → POST `/api/gemini/story-post`
- 模型：文案 `gemini-2.5-flash`（JSON 输出：caption + imagePrompt），配图 `gemini-2.5-flash-image`。
- 说明：返回图片 URL（data URL）与配文，适合社媒分享（如小红书）。

### 2.5 Agent 模式（AgentMode）
- 前端：`components/AgentMode.tsx`（统一对话入口，自动选择工具）
- 后端：`/api/agent/chat` 使用 Gemini function calling（工具：识别/健康建议/检索/图片编辑/故事创作）。
- Heuristics：基于关键词识别意图（health / search），必要时优先健康深检索。

## 3. 技术原理与关键实现

### 3.1 后端框架与基础设施（`server.js`）
- Express 5 + CORS（仅允许本地前端端口 5000/5173/5174），`express.json({ limit: '15mb' })` 支持大图。
- 反向代理/托管场景：`app.set('trust proxy', 1)`。
- 速率限制：
  - `/api/search`：15 分钟窗口最多 10 次；
  - Gemini 相关接口：15 分钟窗口最多 30 次。
- URL 安全：`validateAndSanitizeUrl` 仅允许 http/https。
- 稳定性：`retryWithBackoff`（指数回退）用于 Perplexity API 调用，避免瞬时错误。

### 3.2 健康检索流水线（`graphs/healthGraph.js`）
流程：
1) 生成查询（Gemini → JSON Schema）
2) 检索（Perplexity，多查询聚合）
3) 反思与追加查询（Gemini）
4) 综合（Gemini 生成中文建议 + 脚注引用列表，最多 10 条）

特点：
- LangGraph `StateGraph` 有显式节点与重试机制；
- 限制每段摘要长度与结果数量（避免上下文过大）；
- 始终输出可读的 Markdown，并统一追加免责声明。

### 3.3 前端渲染与安全
- Markdown 渲染：`marked` + `DOMPurify` 白名单，降低 XSS 风险；
- 统一的 Loading/错误反馈组件（`Spinner` 等）；
- 图片/故事等结果模块化展示；
- 与服务交互：均以 `window.location.origin` 为基准，避免跨域复杂度。

## 4. 模型选型与理由

- `gemini-2.5-flash`：
  - 用途：文本理解、JSON 结构化输出、函数调用智能体、检索综合。
  - 理由：低时延、良好的工具调用与结构化输出能力。

- `gemini-2.5-flash-image`：
  - 用途：图片编辑与生成。
  - 理由：多模态输出（IMAGE + TEXT），适合前端直接展示结果图。

- Perplexity Search API：
  - 用途：面向健康咨询的最新信息检索与引用。
  - 理由：结构化结果、速度较快、便于溯源引用。

## 5. 后端接口一览（简表）

- POST `/api/search`：增强检索 → 返回 `answer_md`、`citations`、`debug`。
- POST `/api/gemini/identify`：图片识别 → 返回结构化宠物信息（JSON）。
- POST `/api/gemini/health`：健康建议（优先 LangGraph 深检索，失败回退 simple）。
- POST `/api/gemini/health-simple`：简单健康建议（无检索）。
- POST `/api/gemini/edit-image`：图片编辑/生成 → 返回 `{ imageBase64?, text? }`。
- POST `/api/gemini/story-post`：故事配文 + 配图（data URL）。
- POST `/api/agent/chat`：智能体工具调用（识别/健康/检索/编辑/故事）。

## 6. 环境变量与运行

```bash
# 必需
GEMINI_API_KEY=your_gemini_api_key

# 可选（启用深检索与引用）
PERPLEXITY_API_KEY=your_perplexity_api_key
```

脚本：
- 前端开发：`npm run dev`
- 后端启动：`npm run server`
- 预览构建：`npm run build && npm run preview`

## 7. 未完成/待完善功能

- Gallery 社区化：上传/存储、用户系统、互动（点赞/评论/收藏）、内容审核与推荐。
- 语音输入闭环：前端已有试验性 `SpeechRecognition`，需完善端侧/服务端容错与多语言；可选云端 ASR（Google/Azure）。
- 持久化与账号体系：用户注册/登录、数据模型设计（PostgreSQL）、对象存储与访问控制。
- 推送与 PWA：移动端离线、消息推送、安装体验优化。
- 运维与监控：日志追踪（traceId 已接入）、速率/错误告警、熔断与降级策略细化。

## 8. 安全与合规

- 严格 CORS 白名单（本地端口）；
- 请求速率限制（搜索与 AI 各自独立阈值）；
- URL 校验与净化，杜绝非 http/https 方案；
- Markdown 渲染前净化，降低 XSS 风险；
- 明示“非医疗诊断”免责声明，避免误导性建议。

## 9. 分支与协作

- 分支：`Cursor`（当前默认）、`BOLT`、`lovable`。
- 约定：各工具在独立分支并行推进，修改通过 PR 合并到主干（或统一的集成分支）。

## 10. 已知限制与后续建议

- 依赖外部 API（Gemini/Perplexity），需处理配额与 429 限流；
- 需补充端到端自动化测试（组件/服务/接口）；
- 建议尽快落地数据层与用户体系，为 Gallery/记录/推荐等能力打基础。

---

更新日期：2025-10-01



