'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronDown } from 'lucide-react'

export interface Model {
  id: string
  name: string
  description?: string
}

interface ModelSelectorProps {
  models: Model[]
  selectedModel: string
  onModelChange: (modelId: string) => void
}

export default function ModelSelector({
  models,
  selectedModel,
  onModelChange,
}: ModelSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const currentModel = models.find((m) => m.id === selectedModel) || models[0]

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

  const handleModelClick = (modelId: string) => {
    onModelChange(modelId)
    setIsOpen(false)
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* 模型选择按钮 */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] text-gray-600 transition-all duration-200 hover:bg-black/5"
        title="选择模型"
      >
        <span className="font-medium">{currentModel.name}</span>
        <ChevronDown
          className={`h-3.5 w-3.5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* 下拉菜单 */}
      {isOpen && (
        <div className="animate-in slide-in-from-bottom-2 absolute bottom-full left-0 z-50 mb-2 w-64 overflow-hidden rounded-2xl border border-white/60 bg-white/80 shadow-2xl backdrop-blur-xl duration-200">
          {/* 标题 */}
          <div className="border-b border-gray-100/50 px-4 py-2.5">
            <h3 className="text-[12px] font-semibold tracking-wider text-gray-400 uppercase">
              选择模型
            </h3>
          </div>

          {/* 模型列表 */}
          <div className="max-h-80 overflow-y-auto p-1.5">
            {models.map((model) => {
              const isSelected = model.id === selectedModel
              return (
                <button
                  key={model.id}
                  type="button"
                  onClick={() => handleModelClick(model.id)}
                  className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm transition-colors duration-150 ${
                    isSelected
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-700 hover:bg-black/5'
                  } `}
                >
                  <div className="flex flex-col items-start">
                    <span className="font-medium">{model.name}</span>
                    {model.description && (
                      <span
                        className={`text-[11px] ${isSelected ? 'text-white/70' : 'text-gray-400'}`}
                      >
                        {model.description}
                      </span>
                    )}
                  </div>
                  {isSelected && (
                    <div className="h-1.5 w-1.5 rounded-full bg-white"></div>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
