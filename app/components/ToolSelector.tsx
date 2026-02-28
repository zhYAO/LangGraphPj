'use client'

import { useState, useRef, useEffect } from 'react'

export interface Tool {
  id: string
  name: string
  description: string
  icon?: string
}

interface ToolSelectorProps {
  tools: Tool[]
  selectedTools: string[]
  onToolToggle: (toolId: string) => void
}

export default function ToolSelector({
  tools,
  selectedTools,
  onToolToggle,
}: ToolSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // 点击外部关闭下拉菜单
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
      }
    }
  }, [isOpen])

  const handleToolClick = (toolId: string) => {
    onToolToggle(toolId)
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* 工具按钮 */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 rounded-lg px-3 py-2 transition-all duration-200 hover:bg-black/5 hover:text-black cursor-pointer ${
          selectedTools.length > 0
            ? 'text-black/80 shadow-md'
            : 'text-slate-400'
        } `}
        title="选择工具"
      >
        <svg
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
          />
        </svg>
        <span className="text-sm font-medium">工具</span>
        {selectedTools.length > 0 && (
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-black/10 text-xs">
            {selectedTools.length}
          </span>
        )}
      </button>

      {/* 下拉菜单 */}
      {isOpen && (
        <div className="animate-slide-up absolute bottom-full left-0 mb-2 w-64 overflow-hidden rounded-2xl border border-white bg-white shadow-2xl backdrop-blur-xl">
          <div className="border-b border-black/5 bg-black/5 p-3">
            <span className="text-xs font-semibold tracking-wider text-gray-500 uppercase">
              可用工具
            </span>
          </div>
          <div className="max-h-64 space-y-1 overflow-y-auto p-2">
            {tools.map((tool) => (
              <button
                key={tool.id}
                onClick={() => handleToolClick(tool.id)}
                className={`group flex w-full items-center justify-between rounded-xl px-3 py-2.5 transition-all duration-200 ${
                  selectedTools.includes(tool.id)
                    ? 'bg-gray-300 shadow-lg shadow-gray-300/20'
                    : 'text-gray-600 hover:bg-black/5'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`rounded-lg p-1.5 ${
                      selectedTools.includes(tool.id)
                        ? 'bg-white/20'
                        : 'bg-black/5 group-hover:bg-black/10'
                    }`}
                  >
                    {tool.icon}
                  </div>
                  <div className="text-left">
                    <div className="text-sm leading-none font-medium">
                      {tool.name}
                    </div>
                    <div
                      className={`mt-1 text-[10px] ${
                        selectedTools.includes(tool.id)
                          ? ''
                          : 'text-gray-400'
                      }`}
                    >
                      {tool.description}
                    </div>
                  </div>
                </div>
                {selectedTools.includes(tool.id) && (
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={3}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
