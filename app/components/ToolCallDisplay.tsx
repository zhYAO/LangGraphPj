'use client'

import { useState } from 'react'
import {
  ChevronDown,
  ChevronRight,
  Wrench,
  CheckCircle,
  XCircle,
  Loader2,
} from 'lucide-react'
import type { ToolCall } from './MessageBubble'

interface ToolCallDisplayProps {
  toolCalls: ToolCall[]
}

export function ToolCallDisplay({ toolCalls }: ToolCallDisplayProps) {
  const [expandedTools, setExpandedTools] = useState<Set<string>>(new Set())

  const toggleTool = (toolId: string) => {
    setExpandedTools((prev) => {
      const next = new Set(prev)
      if (next.has(toolId)) {
        next.delete(toolId)
      } else {
        next.add(toolId)
      }
      return next
    })
  }

  if (!toolCalls || toolCalls.length === 0) {
    return null
  }

  return (
    <div className="mt-2 w-full space-y-2">
      {toolCalls.map((toolCall) => {
        const isExpanded = expandedTools.has(toolCall.id)
        const hasOutput = toolCall.output !== undefined
        const hasError = toolCall.error !== undefined
        const isExecuting = !hasOutput && !hasError

        return (
          <div
            key={toolCall.id}
            className="group overflow-hidden rounded-xl border border-black/5 bg-white/40 shadow-sm backdrop-blur-sm transition-all duration-200 hover:bg-white/50 hover:shadow-md"
          >
            {/* 工具调用头部 - 可点击折叠/展开 */}
            <button
              onClick={() => toggleTool(toolCall.id)}
              className="flex w-full items-center gap-3 px-3.5 py-2.5 text-left transition-colors"
            >
              {/* 状态图标 */}
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/60 shadow-sm ring-1 ring-black/5">
                {isExecuting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-500" />
                ) : hasError ? (
                  <XCircle className="h-3.5 w-3.5 text-red-500" />
                ) : (
                  <Wrench className="h-3.5 w-3.5 text-gray-500" />
                )}
              </div>

              {/* 工具名称 */}
              <div className="flex flex-1 flex-col gap-0.5 overflow-hidden">
                <span className="truncate text-sm font-medium text-gray-700">
                  {toolCall.name}
                </span>
                <span className="truncate text-[10px] text-gray-400">
                  {isExecuting ? '正在执行...' : hasError ? '执行出错' : '执行完成'}
                </span>
              </div>

              {/* 折叠/展开图标 */}
              {isExpanded ? (
                <ChevronDown className="h-4 w-4 flex-shrink-0 text-gray-400 transition-transform duration-200" />
              ) : (
                <ChevronRight className="h-4 w-4 flex-shrink-0 text-gray-400 transition-transform duration-200" />
              )}
            </button>

            {/* 展开的详细信息 */}
            {isExpanded && (
              <div className="w-200 border-t border-black/5 bg-white/30 px-3.5 py-3 text-sm">
                <div className="space-y-3">
                  {/* 输入参数 */}
                  {toolCall.args && Object.keys(toolCall.args).length > 0 && (
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                        <span className="h-1 w-1 rounded-full bg-blue-400"></span>
                        输入参数
                      </div>
                      <pre className="w-full max-w-full overflow-x-auto rounded-lg border border-black/5 bg-white/50 p-2.5 text-xs font-mono text-gray-600 shadow-sm">
                        {JSON.stringify(toolCall.args, null, 2)}
                      </pre>
                    </div>
                  )}

                  {/* 输出结果 */}
                  {hasOutput && (
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                        <span className="h-1 w-1 rounded-full bg-green-400"></span>
                        输出结果
                      </div>
                      <pre className="max-h-60 overflow-y-auto overflow-x-auto rounded-lg border border-black/5 bg-white/50 p-2.5 text-xs font-mono text-gray-600 shadow-sm scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">
                        {typeof toolCall.output === 'string'
                          ? toolCall.output
                          : JSON.stringify(toolCall.output, null, 2)}
                      </pre>
                    </div>
                  )}

                  {/* 错误信息 */}
                  {hasError && (
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-red-500">
                        <span className="h-1 w-1 rounded-full bg-red-400"></span>
                        错误信息
                      </div>
                      <pre className="w-full max-w-full overflow-x-auto rounded-lg border border-red-100 bg-red-50/50 p-2.5 text-xs font-mono text-red-600 shadow-sm">
                        {toolCall.error}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
