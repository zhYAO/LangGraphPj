'use client'

import { useRef, useEffect } from 'react'
import { MessageBubble, type Message } from './MessageBubble'
import { EmptyState } from './EmptyState'

interface MessageListProps {
  messages: Message[]
  isLoading: boolean
  isLoadingHistory?: boolean
  onSuggestionClick?: (text: string) => void
}

export default function MessageList({
  messages,
  isLoading,
  isLoadingHistory = false,
  onSuggestionClick,
}: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // 显示历史记录加载状态
  if (isLoadingHistory) {
    return (
      <div className="mx-auto flex w-full max-w-5xl items-center justify-center px-4 pb-32">
        <div className="flex flex-col items-center gap-4 py-12">
          <div className="flex gap-2">
            <div className="h-3 w-3 animate-pulse rounded-full bg-blue-400"></div>
            <div
              className="h-3 w-3 animate-pulse rounded-full bg-blue-400"
              style={{ animationDelay: '0.2s' }}
            ></div>
            <div
              className="h-3 w-3 animate-pulse rounded-full bg-blue-400"
              style={{ animationDelay: '0.4s' }}
            ></div>
          </div>
          <p className="text-sm text-slate-400">加载历史记录中...</p>
        </div>
      </div>
    )
  }

  if (messages.length === 0 && !isLoading) {
    return <EmptyState onAction={onSuggestionClick} />
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col px-4 pb-32">
      {messages.map((message, index) => (
        <MessageBubble key={message.id} message={message} index={index} />
      ))}

      <div ref={messagesEndRef} />
    </div>
  )
}
