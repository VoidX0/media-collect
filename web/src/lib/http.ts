import { translate } from '@/i18n/utils'
import type { paths } from '@/api/schema'
import createClient, { type Middleware } from 'openapi-fetch'
import { toast } from 'sonner'

// region 辅助函数

/**
 * 处理
 * @param message
 */
function handleCodeMessage(message: string): string {
  const node = 'MessageCode'
  try {
    const data = JSON.parse(message)
    if (data && data.codeIndex != undefined && data.code) {
      // MessageCode 风格的错误响应
      const code = data.code
      const args = data.args || []
      const message = data.message
      // 尝试i18n转换
      const i18n = translate(node, code, args)
      return i18n === undefined || i18n === `${node}.${code}` ? message : i18n
    }
    return message
  } catch {
    return message
  }
}

/**
 * 处理ASP.NET Core风格的错误响应
 * @param message
 */
function handleAspMessage(message: string): string {
  try {
    const data = JSON.parse(message)
    if (data && data.title && data.errors) {
      // ASP.NET Core 风格的错误响应
      const errorLines = Object.entries(data.errors).flatMap(
        ([field, msgs]) => {
          if (Array.isArray(msgs)) {
            return msgs.map((msg) => `• ${field}: ${msg}`)
          }
          // 不是数组，直接转换成字符串
          return [`• ${field}: ${String(msgs)}`]
        },
      )
      // 拼接成字符串，每行一个错误
      return `${data.title}\n${errorLines.join('\n')}`
    }
    return message
  } catch {
    // 不是 JSON
    if (message.includes('Exception')) return 'Internal Server Error'
    return message
  }
}

// endregion

/** 全局跳过错误处理的请求头 */
export const SKIP_ERROR_HEADER = 'X-Skip-Error-Handling'

const authMiddleware: Middleware = {
  async onRequest({ request }) {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token')
      if (token) request.headers.set('Authorization', `Bearer ${token}`)
    }
    return request
  },
}

const errorMiddleware: Middleware = {
  async onResponse({ request, response }) {
    if (response.ok || request.headers.has(SKIP_ERROR_HEADER)) return response
    // 处理错误响应
    const clone = response.clone() // 克隆响应以便读取内容
    let message = await clone.text()
    if (message.length == 0) message = clone.statusText
    message = handleCodeMessage(message)
    message = handleAspMessage(message)
    // 检查message长度，避免过长
    if (message.length > 100) {
      message = message.slice(0, 100) + '\n...'
    }
    // 显示错误消息
    toast.warning(message, {
      className: 'whitespace-pre-line',
    })
    // 返回原始响应
    return response
  },
}

/* openapi-fetch客户端 */
export const openapi = createClient<paths>({ baseUrl: '/api' })
openapi.use(authMiddleware) // 身份验证中间件
openapi.use(errorMiddleware) // 错误处理中间件
