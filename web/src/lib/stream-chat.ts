export type StreamDelta =
  | { type: 'reasoning'; content: string }
  | { type: 'content'; content: string }
  | { type: 'done' }

/**
 * 低层：解析 OpenAI / 兼容 SSE 协议
 */
async function parseSseStream(
  res: Response,
  onDelta: (delta: StreamDelta) => void,
  signal?: AbortSignal,
) {
  if (!res.body) {
    throw new Error('No response body')
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder('utf-8')
  let buffer = ''

  while (true) {
    const { value, done } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''

    for (const line of lines) {
      if (!line.startsWith('data:')) continue

      const data = line.slice(5).trim()
      if (!data) continue

      if (data === '[DONE]') {
        onDelta({ type: 'done' })
        return
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let json: any
      try {
        json = JSON.parse(data)
      } catch {
        continue
      }

      const delta = json?.choices?.[0]?.delta
      if (!delta) continue

      if (delta.reasoning_content) {
        onDelta({
          type: 'reasoning',
          content: delta.reasoning_content,
        })
      }

      if (delta.content) {
        onDelta({
          type: 'content',
          content: delta.content,
        })
      }
    }
  }
}

/**
 * 高层：SchemaAi / Chat 通用的流式调用
 */
export async function streamChat(
  url: string,
  body: unknown,
  onDelta: (delta: StreamDelta) => void,
  signal?: AbortSignal,
) {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    signal,
  })

  if (!res.ok) {
    throw new Error(res.statusText)
  }

  await parseSseStream(res, onDelta, signal)
}

/**
 * ⭐ SchemaAi 专用辅助函数
 *
 * - 自动拼接完整文本
 * - 保留 <think> 包裹
 * - 对 SchemaAi 影响最小
 */
export async function streamChatToText(
  url: string,
  body: unknown,
  onUpdate: (fullText: string) => void,
  signal?: AbortSignal,
) {
  let fullText = ''
  let thinkingOpen = false

  await streamChat(
    url,
    body,
    (delta) => {
      if (delta.type === 'reasoning') {
        if (!thinkingOpen) {
          fullText += '<think>\n'
          thinkingOpen = true
        }
        fullText += delta.content
        onUpdate(fullText)
      }

      if (delta.type === 'content') {
        if (thinkingOpen) {
          fullText += '\n</think>\n'
          thinkingOpen = false
        }
        fullText += delta.content
        onUpdate(fullText)
      }

      if (delta.type === 'done') {
        if (thinkingOpen) {
          fullText += '\n</think>\n'
          thinkingOpen = false
          onUpdate(fullText)
        }
      }
    },
    signal,
  )
}
