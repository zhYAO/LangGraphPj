'use client'

import { Bot, User } from 'lucide-react'
import { MarkdownRenderer } from './MarkdownRenderer'
import { ToolCallDisplay } from './ToolCallDisplay'
import type { BaseMessage } from '@langchain/core/messages'

export interface ToolCall {
  id: string
  name: string
  args: Record<string, any>
  output?: any
  error?: string
}

export interface Message extends BaseMessage {
  isStreaming?: boolean
  tool_calls?: ToolCall[]
  toolCallResults?: ToolCall[]
}

interface MessageBubbleProps {
  message: Message
  index: number
}

export function MessageBubble({ message, index }: MessageBubbleProps) {
  const messageType = message.getType?.() || (message as any)._getType?.()
  const isUser = messageType === 'human'

  // 处理不同类型的 content
  let messageContent = ''
  const imageUrls: string[] = []

  if (typeof message.content === 'string') {
    messageContent = message.content
  } else if (Array.isArray(message.content)) {
    // 处理数组类型的 content（文本 + 图片）
    message.content.forEach((block) => {
      if (typeof block === 'string') {
        messageContent += block
      } else if (block && typeof block === 'object') {
        // 提取文本
        if ('text' in block && block.text) {
          messageContent += block.text
        }
        // 提取图片 URL
        if ('image_url' in block && block.image_url) {
          const imageUrl = block.image_url as any
          const url = typeof imageUrl === 'string' ? imageUrl : imageUrl?.url
          if (url) {
            imageUrls.push(url)
          }
        }
      }
    })
  } else {
    messageContent = JSON.stringify(message.content)
  }

  return (
    <div
      className={`mb-6 flex w-full ${isUser ? 'justify-end' : 'justify-start'} animate-slide-up`}
      style={{ animationDelay: `${index * 0.05}s` }}
    >
      <div
        className={`flex max-w-[85%] md:max-w-[75%] ${isUser ? 'flex-row-reverse' : 'flex-row'} items-end gap-2`}
      >
        {/* 头像 */}
        <div
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full shadow-sm ${
            isUser
              ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white'
              : 'border border-white/50 bg-gradient-to-br from-white/80 to-white/40 text-gray-800 backdrop-blur-md'
          }`}
        >
          {isUser ? <User size={14} /> : <Bot size={14} />}
        </div>

        {/* 气泡 */}
        <div
          className={`group relative px-5 py-3.5 text-[15px] leading-relaxed shadow-sm ${
            isUser
              ? 'rounded-2xl rounded-tr-sm bg-blue-600 text-white'
              : 'rounded-2xl rounded-tl-sm border border-white/40 bg-white/60 text-gray-800 backdrop-blur-md'
          }`}
        >
          {/* 渲染图片 */}
          {imageUrls.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-2">
              {imageUrls.map((url, idx) => (
                <img
                  key={idx}
                  src={url}
                  alt={`Image ${idx + 1}`}
                  className="max-h-64 max-w-xs rounded-lg border border-white/10 object-cover"
                  onError={(e) => {
                    console.error('图片加载失败:', url.substring(0, 100))
                    e.currentTarget.style.display = 'none'
                  }}
                />
              ))}
            </div>
          )}

          {/* 渲染工具调用 (在文本内容之前) */}
          {!isUser && (message.tool_calls || message.toolCallResults) && (
            <div className="mb-2">
              <ToolCallDisplay
                toolCalls={message.toolCallResults || message.tool_calls || []}
              />
            </div>
          )}

          {/* 渲染文本内容或加载提示 */}
          {messageContent ? (
            <div
              className={`w-full text-[15px] leading-relaxed ${
                isUser ? 'text-white' : 'text-gray-800'
              }`}
            >
              <MarkdownRenderer
                content={messageContent}
                messageId={message.id}
              />
            </div>
          ) : !isUser ? (
            <span className="mt-1 flex h-4 items-center gap-1">
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400 [animation-delay:-0.3s]"></span>
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400 [animation-delay:-0.15s]"></span>
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400"></span>
            </span>
          ) : null}

          {/* If streaming cursor */}
          {message.isStreaming && messageContent && (
            <span className="ml-1 inline-block h-4 w-1.5 animate-pulse bg-blue-400 align-middle" />
          )}
        </div>
      </div>
    </div>
  )
}
