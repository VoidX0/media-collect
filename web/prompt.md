# 前端项目代码生成提示词

简要说明  
用于指导 AI 生成或修改前端代码，尽量保持简洁明确，按模块化规范输出可直接合并的修改片段。

核心约束

- 输出语言：简体中文。
- 框架与语言：React + Next.js（app router），TypeScript。
- UI/样式：优先使用 shadcn/ui + TailwindCSS；支持暗/亮两种主题，尽量依赖系统配色。
- 响应式：自动适配移动端与桌面端（响应式布局）。

代码风格与质量

- 遵守 TypeScript 和 ESLint 规范，避免 any 和无用的忽略注释。
- 避免重复代码，优先提取可复用函数/组件。
- 注释简洁（中文），只在必要处说明意图，避免编号或冗余说明。
- 命名符合前端规范，文件路径与导出一致。

与后端交互

- 已封装的 openapi 使用方式：`import { openapi } from '@/lib/http'`；直接使用 `openapi.GET/POST/PUT/DELETE`，响应处理采用
  `const { data, error } = await openapi.POST(...)`（不要用 try/catch 捕获请求错误）。
- 所有查询参数应放在 params: {} (例如 `openapi.GET('/xxx', { params: { ... } })`)
- 后端标注为 Format: date-time 的字段，在前后端交互时使用时间戳传递（统一以毫秒数为准）。
- 不需要对 openapi 封装层重复实现权限或全局错误提示；仅在必要时使用 toast 进一步提示。

提示与交互规范

- 不使用原生 alert；使用 sonner 的 toast：`import { toast } from 'sonner'`。
- 避免引入会引起 Next.js 水合问题的做法（如在 server 组件内直接使用 window 等）。
- 客户端逻辑放在 'use client' 文件顶部并明确说明。

常见注意点

- 网络请求返回格式：使用解构 `const { data, error } = await openapi.POST(...)`

附注

- 该文档为提示词使用指南，生成代码时请优先读取并复用项目中已有接口声明与类型定义，避免重复生成相同类型或接口说明。