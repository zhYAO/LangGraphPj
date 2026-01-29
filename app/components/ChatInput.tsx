'use client'

import { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react'
import { ArrowUp, Loader2, Plus, X, Image as ImageIcon } from 'lucide-react'
import ToolSelector, { Tool } from './ToolSelector'
import ToolBadge from './ToolBadge'
import ModelSelector, { Model } from './ModelSelector'

interface ChatInputProps {
  onSend: (message: string, selectedTools?: string[], selectedModel?: string, images?: File[]) => void
  disabled?: boolean
  availableTools?: Tool[]
  availableModels?: Model[]
  currentModel?: string
  onModelChange?: (modelId: string) => void
}

export interface ChatInputHandle {
  setInput: (value: string) => void
  focus: () => void
}

/**
 * Chat Input Component
 * 新布局：输入框在上，工具栏在下
 * 支持图片上传功能
 */
export const ChatInput = forwardRef<ChatInputHandle, ChatInputProps>(
  ({
    onSend,
    disabled,
    availableTools = [],
    availableModels = [],
    currentModel = '',
    onModelChange,
  }, ref) => {
    const [input, setInput] = useState('')
    const [selectedTools, setSelectedTools] = useState<string[]>([])
    const [uploadedImages, setUploadedImages] = useState<File[]>([])
    const [imagePreviews, setImagePreviews] = useState<string[]>([])
    const textareaRef = useRef<HTMLTextAreaElement>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

  useImperativeHandle(ref, () => ({
    setInput: (value: string) => {
      setInput(value)
      setTimeout(() => textareaRef.current?.focus(), 0)
    },
    focus: () => textareaRef.current?.focus()
  }))

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }, [input])

  // 清理图片预览 URL
  useEffect(() => {
    return () => {
      imagePreviews.forEach(url => URL.revokeObjectURL(url))
    }
  }, [imagePreviews])

  const handleSend = () => {
    if ((input.trim() || uploadedImages.length > 0) && !disabled) {
      onSend(
        input,
        selectedTools.length > 0 ? selectedTools : undefined,
        currentModel || undefined,
        uploadedImages.length > 0 ? uploadedImages : undefined
      )
      setInput('')
      // 移除 setSelectedTools([])，保持工具选择状态
      clearImages()
    }
  }

  const handleToolToggle = (toolId: string) => {
    setSelectedTools((prev) =>
      prev.includes(toolId) ? prev.filter((id) => id !== toolId) : [...prev, toolId]
    )
  }

  const handleRemoveTool = (toolId: string) => {
    setSelectedTools((prev) => prev.filter((id) => id !== toolId))
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // 处理文件选择
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    const imageFiles = files.filter(file => file.type.startsWith('image/'))

    if (imageFiles.length > 0) {
      setUploadedImages(prev => [...prev, ...imageFiles])

      // 创建预览 URL
      const newPreviews = imageFiles.map(file => URL.createObjectURL(file))
      setImagePreviews(prev => [...prev, ...newPreviews])
    }

    // 重置 input 以允许重复选择同一文件
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // 移除图片
  const removeImage = (index: number) => {
    // 释放预览 URL
    URL.revokeObjectURL(imagePreviews[index])

    setUploadedImages(prev => prev.filter((_, i) => i !== index))
    setImagePreviews(prev => prev.filter((_, i) => i !== index))
  }

  // 清空所有图片
  const clearImages = () => {
    imagePreviews.forEach(url => URL.revokeObjectURL(url))
    setUploadedImages([])
    setImagePreviews([])
  }

  // 打开文件选择器
  const handleAddClick = () => {
    fileInputRef.current?.click()
  }

    return (
      <div
        className={`w-full max-w-5xl bg-white/70 backdrop-blur-xl border border-white/60 shadow-xl rounded-[20px] p-2 focus-within:bg-white/90 transition-all duration-300 ${
          disabled
            ? 'opacity-60 cursor-not-allowed'
            : 'focus-within:ring-2 focus-within:ring-blue-500/10'
        }`}
      >
        {/* 输入框区域 */}
        <div className="px-2 pt-2 pb-1">
          {/* 图片预览 - 在输入框上方 */}
          {imagePreviews.length > 0 && (
            <div className="mb-3 px-3">
              <div className="flex flex-wrap gap-2">
                {imagePreviews.map((preview, index) => (
                  <div
                    key={index}
                    className="relative group w-16 h-16 rounded-xl overflow-hidden border border-gray-200 shadow-sm"
                  >
                    <img
                      src={preview}
                      alt={`上传图片 ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                    {/* 删除按钮 */}
                    <button
                      onClick={() => removeImage(index)}
                      className="absolute top-1 right-1 p-1 bg-black/60 hover:bg-black/80 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      title="移除图片"
                    >
                      <X className="w-3 h-3 text-white" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 文本输入框 */}
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={disabled ? 'AI 正在回复中...' : '开始新的对话...'}
            className="w-full bg-transparent border-none focus:ring-0 focus:outline-none px-4 py-3 text-gray-800 placeholder-gray-400/80 resize-none max-h-[200px] min-h-[56px] text-[15.5px] leading-relaxed scrollbar-hide overflow-hidden"
            rows={1}
            disabled={disabled}
            style={{ height: 'auto' }}
          />
        </div>

        {/* 隐藏的文件输入 */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />

        {/* 底部工具栏 */}
        <div className="flex items-center justify-between px-2 pb-1.5">
          <div className="flex items-center gap-1">
            {/* 模型选择器 */}
            <ModelSelector
              models={availableModels}
              selectedModel={currentModel}
              onModelChange={onModelChange || (() => {})}
            />

            <div className="w-[1px] h-4 bg-gray-200 mx-1"></div>

            {/* 工具选择器 */}
            <ToolSelector
              tools={availableTools}
              selectedTools={selectedTools}
              onToolToggle={handleToolToggle}
            />

            {/* 图片上传按钮 */}
            <button
              onClick={handleAddClick}
              disabled={disabled}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-black/5 rounded-full transition-colors"
              title="上传图片"
            >
              <ImageIcon size={19} />
            </button>
          </div>

          <div className="flex items-center gap-3">
            {/* 发送按钮 */}
            <button
              onClick={handleSend}
              disabled={(input.trim() === '' && uploadedImages.length === 0) || disabled}
              className={`
                p-2.5 rounded-full transition-all duration-300 flex items-center justify-center
                ${(input.trim() || uploadedImages.length > 0) && !disabled
                  ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-md hover:shadow-lg transform hover:-translate-y-0.5'
                  : 'bg-gray-100 text-gray-300 cursor-not-allowed'}
              `}
            >
              {disabled ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <ArrowUp size={20} />
              )}
            </button>
          </div>
        </div>

        {/* 已选工具展示区域 */}
        {selectedTools.length > 0 && (
          <div className="px-4 pb-3 flex flex-wrap gap-2 border-t border-gray-100 pt-2 mt-1 mx-2">
            {selectedTools.map((toolId) => {
              const tool = availableTools.find((t) => t.id === toolId)
              if (!tool) return null
              return (
                <ToolBadge
                  key={toolId}
                  name={tool.name}
                  icon={tool.icon}
                  onRemove={() => handleRemoveTool(toolId)}
                />
              )
            })}
          </div>
        )}
      </div>
    )
  }
)

ChatInput.displayName = 'ChatInput'
