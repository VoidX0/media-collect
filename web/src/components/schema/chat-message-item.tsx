import { Button } from '@/components/ui/button'
import {
  Bot,
  Brain,
  ChevronDown,
  ChevronRight,
  PlayCircle,
  User,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import ReactMarkdown from 'react-markdown' // 新增
import { Light as SyntaxHighlighter } from 'react-syntax-highlighter'
import javascriptStyle from 'react-syntax-highlighter/dist/esm/languages/hljs/javascript'
import jsonStyle from 'react-syntax-highlighter/dist/esm/languages/hljs/json'
import remarkBreaks from 'remark-breaks' // 新增
import remarkGfm from 'remark-gfm'

/** 聊天消息接口 */
export interface ChatMessage {
  /** 角色 */
  role: 'user' | 'assistant'
  /** 消息内容 */
  content: string
}

// 注册 SyntaxHighlighter 语言
SyntaxHighlighter.registerLanguage('json', jsonStyle)
SyntaxHighlighter.registerLanguage('javascript', javascriptStyle)

/** 聊天消息组件 */
export function ChatMessageItem({
  message,
  codeStyle,
  defaultExpanded,
  onApply,
}: {
  message: ChatMessage
  codeStyle: unknown
  defaultExpanded: boolean
  onApply: () => void
}) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)
  const isAssistant = message.role === 'assistant'

  useEffect(() => {
    setIsExpanded(defaultExpanded)
  }, [defaultExpanded])

  return (
    <div
      className={`flex gap-3 ${!isAssistant ? 'flex-row-reverse' : 'flex-row'}`}
    >
      {/* 头像 */}
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border shadow-sm ${!isAssistant ? 'bg-primary text-primary-foreground' : 'bg-background'}`}
      >
        {!isAssistant ? (
          <User className="h-4 w-4" />
        ) : (
          <Bot className="text-primary h-4 w-4" />
        )}
      </div>

      {/* 消息体 */}
      <div
        className={`flex max-w-[85%] flex-col overflow-hidden rounded-2xl border text-sm shadow-sm transition-all ${
          !isAssistant
            ? 'bg-primary text-primary-foreground rounded-tr-none'
            : 'bg-muted rounded-tl-none'
        }`}
      >
        {/* 消息 Header (点击可折叠) */}
        <div
          className={`flex cursor-pointer items-center justify-between gap-2 px-3 py-1.5 ${isAssistant ? 'bg-muted/50' : 'bg-primary-foreground/10'}`}
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center gap-1 text-[10px] font-medium opacity-70">
            {isExpanded ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
            {isAssistant ? 'AI Response' : 'You'}
          </div>

          {/* AI 消息的操作栏 */}
          {isAssistant && (
            <div
              className="flex items-center gap-1"
              onClick={(e) => e.stopPropagation()}
            >
              <Button
                variant="ghost"
                size="icon"
                className="hover:bg-background/50 h-5 w-5"
                title="Apply this version"
                onClick={onApply}
              >
                <PlayCircle className="h-3.5 w-3.5 text-green-600" />
              </Button>
            </div>
          )}
        </div>

        {/* 消息内容 */}
        {isExpanded ? (
          <div className="px-3 py-2">
            {!isAssistant ? (
              <div className="font-sans break-words whitespace-pre-wrap">
                {message.content}
              </div>
            ) : (
              <AssistantMessageContent
                content={message.content}
                codeStyle={codeStyle}
              />
            )}
          </div>
        ) : (
          <div className="line-clamp-2 px-3 py-1.5 text-xs opacity-60">
            {/* 折叠时显示的预览文本 */}
            {message.content
              .replace(/<think>[\s\S]*?<\/think>/g, '') // 去除思考内容
              .replace(/```[\s\S]*?```/g, '[Code]') // 替换代码块
              .substring(0, 50)}
            ...
          </div>
        )}
      </div>
    </div>
  )
}

/** 助手消息内容渲染组件 */
function AssistantMessageContent({
  content,
  codeStyle,
}: {
  content: string
  codeStyle: unknown
}) {
  // 按 <think> 标签拆分思考过程和正式内容
  // 匹配 <think>...</think> (非贪婪模式)
  const thinkMatch = content.match(/<think>([\s\S]*?)(?:<\/think>|$)/)

  let thinkingContent = ''
  let mainContent = content

  if (thinkMatch) {
    thinkingContent = thinkMatch[1] || ''
    // 从主内容中移除思考部分（包括可能未闭合的标签）
    mainContent = content.replace(/<think>[\s\S]*?(?:<\/think>|$)/, '').trim()
  }

  return (
    <div className="flex flex-col gap-2">
      {/* 渲染思考过程 (如果存在) */}
      {thinkingContent && (
        <div className="bg-muted/30 text-muted-foreground mb-2 rounded-lg border p-3 text-xs">
          <div className="mb-1 flex items-center gap-1 font-medium opacity-70">
            <Brain className="h-3 w-3" />
            Thinking Process
          </div>
          <div className="border-muted/50 border-l-2 pl-4 font-mono whitespace-pre-wrap opacity-80">
            {thinkingContent}
          </div>
        </div>
      )}

      <div className="prose prose-sm dark:prose-invert max-w-none text-sm leading-relaxed break-words">
        <ReactMarkdown
          remarkPlugins={[remarkGfm, remarkBreaks]} // 支持 GFM 和自动换行
          components={{
            // 自定义代码块渲染
            code({ className, children, ...props }) {
              const match = /language-(\w+)/.exec(className || '')
              // @ts-expect-error type matching
              const isInline = props.inline || !match

              if (!isInline && match) {
                return (
                  <div className="my-2 overflow-hidden rounded-md text-xs">
                    <div className="bg-muted/50 px-3 py-1 text-[10px] font-medium opacity-70">
                      {match[1]}
                    </div>
                    <SyntaxHighlighter
                      language={match[1]}
                      style={codeStyle as never}
                      customStyle={{
                        margin: 0,
                        padding: '1rem',
                        fontSize: '11px',
                        backgroundColor: 'rgba(0,0,0,0.03)',
                      }}
                      wrapLongLines
                      PreTag="div"
                    >
                      {String(children).replace(/\n$/, '')}
                    </SyntaxHighlighter>
                  </div>
                )
              }

              // 行内代码样式
              return (
                <code
                  className="bg-muted text-primary rounded px-1 py-0.5 font-mono text-xs font-semibold"
                  {...props}
                >
                  {children}
                </code>
              )
            },
            // 其他 Markdown 元素样式
            p: ({ children }) => (
              <p className="mb-2 leading-relaxed last:mb-0">{children}</p>
            ),
            ul: ({ children }) => (
              <ul className="mb-2 list-disc pl-4">{children}</ul>
            ),
            ol: ({ children }) => (
              <ol className="mb-2 list-decimal pl-4">{children}</ol>
            ),
            li: ({ children }) => <li className="mb-0.5">{children}</li>,
            a: ({ href, children }) => (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline underline-offset-4 hover:opacity-80"
              >
                {children}
              </a>
            ),
            blockquote: ({ children }) => (
              <blockquote className="border-primary/20 text-muted-foreground my-2 border-l-4 pl-4 italic">
                {children}
              </blockquote>
            ),
          }}
        >
          {mainContent}
        </ReactMarkdown>
      </div>
    </div>
  )
}
