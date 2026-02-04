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
    <div className="mt-3 space-y-2">
      {toolCalls.map((toolCall) => {
        const isExpanded = expandedTools.has(toolCall.id)
        const hasOutput = toolCall.output !== undefined
        const hasError = toolCall.error !== undefined
        const isExecuting = !hasOutput && !hasError

        return (
          <div
            key={toolCall.id}
            className="overflow-hidden rounded-lg border border-white/10 bg-white/5"
          >
            {/* 工具调用头部 - 可点击折叠/展开 */}
            <button
              onClick={() => toggleTool(toolCall.id)}
              className="flex w-full items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-white/5"
            >
              {/* 折叠/展开图标 */}
              {isExpanded ? (
                <ChevronDown className="h-4 w-4 flex-shrink-0 text-slate-400" />
              ) : (
                <ChevronRight className="h-4 w-4 flex-shrink-0 text-slate-400" />
              )}

              {/* 工具图标 */}
              <Wrench className="h-4 w-4 flex-shrink-0 text-blue-400" />

              {/* 工具名称 */}
              <span className="flex-1 text-sm font-medium text-slate-200">
                {toolCall.name}
              </span>

              {/* 状态指示器 */}
              {isExecuting && (
                <Loader2 className="h-4 w-4 flex-shrink-0 animate-spin text-yellow-400" />
              )}
              {hasOutput && (
                <CheckCircle className="h-4 w-4 flex-shrink-0 text-green-400" />
              )}
              {hasError && (
                <XCircle className="h-4 w-4 flex-shrink-0 text-red-400" />
              )}
            </button>

            {/* 展开的详细信息 */}
            {isExpanded && (
              <div className="space-y-2 px-3 pb-3 text-sm">
                {/* 输入参数 */}
                {toolCall.args && Object.keys(toolCall.args).length > 0 && (
                  <div>
                    <div className="mb-1 text-xs font-semibold text-slate-400">
                      输入参数:
                    </div>
                    <pre className="overflow-x-auto rounded bg-black/30 p-2 text-xs text-slate-300">
                      {JSON.stringify(toolCall.args, null, 2)}
                    </pre>
                  </div>
                )}

                {/* 输出结果 */}
                {hasOutput && (
                  <div>
                    <div className="mb-1 text-xs font-semibold text-green-400">
                      输出结果:
                    </div>
                    <pre className="overflow-x-auto rounded bg-black/30 p-2 text-xs text-slate-300">
                      {typeof toolCall.output === 'string'
                        ? toolCall.output
                        : JSON.stringify(toolCall.output, null, 2)}
                    </pre>
                  </div>
                )}

                {/* 错误信息 */}
                {hasError && (
                  <div>
                    <div className="mb-1 text-xs font-semibold text-red-400">
                      错误信息:
                    </div>
                    <pre className="overflow-x-auto rounded bg-red-900/20 p-2 text-xs text-red-300">
                      {toolCall.error}
                    </pre>
                  </div>
                )}

                {/* 执行中状态 */}
                {isExecuting && (
                  <div className="text-xs text-yellow-400 italic">
                    正在执行工具...
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
