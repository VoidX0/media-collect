import enMessages from '../../messages/en.json'
import zhMessages from '../../messages/zh.json'

// region 辅助函数

const messagesMap: Record<string, object> = {
  zh: zhMessages,
  en: enMessages,
}

/**
 * 获取当前 Locale
 */
function getCurrentLocale(): string {
  const defaultLocal = 'en'
  if (typeof window === 'undefined') return defaultLocal
  const pathParts = window.location.pathname.split('/')
  const locale = pathParts[1] ?? '' // 获取第一个路径段
  return ['en', 'zh'].includes(locale) ? locale : defaultLocal
}

/**
 * 手动翻译
 * @param node 消息节点
 * @param code 消息代码
 * @param args 占位符参数
 */
export function translate(
  node: string,
  code: string,
  args: object[] = [],
): string | undefined {
  const locale = getCurrentLocale()
  // @ts-expect-error 动态访问
  const msgNode = messagesMap[locale]?.[node] || {}
  let template = msgNode[code]
  if (!template) return `${node}.${code}` // 没找到翻译模板，返回 key
  // 填充占位符 {0}, {1} ...
  args.forEach((arg, index) => {
    template = template.replace(`{${index}}`, String(arg))
  })
  return template
}
