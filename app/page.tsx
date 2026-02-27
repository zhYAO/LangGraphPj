'use client'

import { useRef, useMemo, useState, useEffect } from 'react'
import { availableModels } from '@/app/utils/config'
import type { CanvasArtifact } from '@/app/canvas/canvas-types';

// 导入组件
import SessionSidebar from '@/app/components/SessionSidebar'
import ChatHeader from '@/app/components/ChatHeader'
import MessageList from '@/app/components/MessageList'
import { ChatInput, type ChatInputHandle } from '@/app/components/ChatInput'
import ProtectedRoute from '@/app/components/ProtectedRoute'
import { CanvasPanel } from '@/app/components/canvas/CanvasPanel';

// 导入自定义 Hooks
import { useSessionManager } from '@/app/hooks/useSessionManager'
import { useChatMessages } from '@/app/hooks/useChatMessages'
import { useChatHistory } from '@/app/hooks/useChatHistory'
import { useSendMessage } from '@/app/hooks/useSendMessage'
import { canvasStore } from '@/app/hooks/useCanvasArtifacts';
import { Tool } from '@/app/components/ToolSelector'

// 导入工具配置
import { getEnabledTools } from '@/app/agent/config/unified-tools.config'

export default function ChatPage() {
  const chatInputRef = useRef<ChatInputHandle>(null)

  // Canvas Panel 状态
  const [activeArtifact, setActiveArtifact] = useState<CanvasArtifact | null>(null);
  const [isCanvasVisible, setIsCanvasVisible] = useState(false);

  // 监听 canvas store 变化
  useEffect(() => {
    const unsubscribe = canvasStore.subscribe(() => {
      const artifact = canvasStore.getActiveArtifact();
      setActiveArtifact(artifact ?? null);
      setIsCanvasVisible(canvasStore.getIsCanvasVisible());
    });
    return unsubscribe;
  }, []);

  // 处理关闭 Canvas Panel
  const handleCloseCanvas = () => {
    canvasStore.setIsCanvasVisible(false);
    canvasStore.setActiveArtifactId(null);
  };

  // 处理代码更新
  const handleUpdateCode = (messageId: string, artifactId: string, code: string) => {
    const artifact = canvasStore.getArtifact(messageId, artifactId);
    if (artifact) {
      canvasStore.setArtifact(messageId, {
        ...artifact,
        code: {
          ...artifact.code,
          content: code,
        },
        updatedAt: new Date(),
      });
    }
  };

  // ==================== 模型配置 ====================
  // 从 localStorage 读取保存的模型,如果没有则使用默认值
  const [currentModel, setCurrentModel] = useState(
    'google:gemini-3-flash-preview',
  )

  useEffect(() => {
    const savedModel = localStorage.getItem('selectedModel')
    if (savedModel) {
      setCurrentModel(savedModel)
    }
  }, [])

  // 当模型切换时保存到 localStorage
  const handleModelChange = (modelId: string) => {
    setCurrentModel(modelId)
    if (typeof window !== 'undefined') {
      localStorage.setItem('selectedModel', modelId)
    }
  }

  // ==================== 消息管理 ====================
  // 使用 useChatMessages hook 管理所有消息相关的状态和方法
  const {
    messages, // 当前会话的所有消息
    isLoading, // 是否正在加载(发送消息中)
    setIsLoading, // 设置加载状态
    addUserMessage, // 添加用户消息
    addAssistantMessage, // 添加 AI 助手消息
    updateMessageContent, // 更新消息内容(用于流式响应)
    finishStreaming, // 完成流式传输
    addErrorMessage, // 添加错误消息
    loadMessages, // 加载历史消息
    updateToolCalls, // 更新工具调用
    addToolCall, // 添加工具调用
    updateToolResult, // 更新工具执行结果
    updateToolError, // 更新工具执行错误
  } = useChatMessages()

  // ==================== 会话管理 ====================
  // 使用 useSessionManager hook 管理会话(session)相关状态
  const {
    sessionId, // 当前会话 ID
    setSessionId, // 设置会话 ID（接收后端创建的新会话）
    sessions, // 会话列表
    isLoading: sessionsLoading, // 会话列表加载状态
    selectSession, // 切换会话
    deleteSession, // 删除会话
    renameSession, // 重命名会话
    resetCurrentSession, // 重置当前会话（新建对话）
    fetchSessions, // 重新获取会话列表
    setHasUserMessage, // 设置是否有用户消息(用于判断是否需要更新会话名)
    isNewSession, // 是否为新创建的会话
  } = useSessionManager()

  // ==================== 历史记录加载 ====================
  // 使用 useChatHistory hook 自动加载会话历史
  // 当 sessionId 变化时,会自动触发历史记录加载
  // 新会话时不会加载历史记录（通过 isNewSession 标记控制）
  const { isLoadingHistory } = useChatHistory(
    sessionId,
    loadMessages,
    setHasUserMessage,
    isNewSession,
  )

  // ==================== 消息发送 ====================
  // 使用 useSendMessage hook 处理消息发送逻辑
  const { sendMessage } = useSendMessage({
    sessionId,
    setSessionId,
    setIsLoading,
    addUserMessage,
    addAssistantMessage,
    updateMessageContent,
    finishStreaming,
    addErrorMessage,
    fetchSessions,
    updateToolCalls,
    addToolCall,
    updateToolResult,
    updateToolError,
  })

  // ==================== 工具配置 ====================
  // 使用统一工具配置，包含自定义工具和 MCP 工具
  const availableTools = useMemo<Tool[]>(() => {
    return getEnabledTools().map((tool) => ({
      id: tool.id,
      name: tool.name,
      description: tool.description,
      icon: tool.icon || '🛠️',
    }))
  }, [])

  // 处理建议点击
  const handleSuggestionClick = (text: string) => {
    if (chatInputRef.current) {
      chatInputRef.current.setInput(text)
    }
  }

  return (
    <ProtectedRoute>
      <div className="relative h-screen w-full overflow-hidden bg-[#eef2f5] font-sans text-gray-800 selection:bg-blue-200">
        {/* 主布局容器 */}
        <div className="relative flex h-full w-full gap-5 p-4 md:p-6 lg:gap-6 lg:p-8">
          {/* 左侧会话历史侧边栏 */}
          <SessionSidebar
            currentSessionId={sessionId}
            sessions={sessions}
            isLoading={sessionsLoading}
            isSwitchingSession={isLoadingHistory}
            onSelect={selectSession}
            onNew={resetCurrentSession}
            onDelete={deleteSession}
            onRename={renameSession}
          />

          {/* 右侧主体内容区域 */}
          <main className="relative flex h-full flex-1 flex-col overflow-hidden rounded-[20px] border border-white/60 bg-white/30 shadow-2xl backdrop-blur-2xl">
            {/* 顶部导航栏 */}
            <ChatHeader />

            <div className="relative flex flex-1 flex-col overflow-hidden">
              <div
                className="scrollbar-hide flex flex-1 flex-col overflow-y-auto scroll-smooth"
                id="chat-container"
              >
                {/* 消息列表 */}
                <MessageList
                  messages={messages}
                  isLoading={isLoading}
                  isLoadingHistory={isLoadingHistory}
                  onSuggestionClick={handleSuggestionClick}
                />
              </div>

              {/* 消息输入框 */}
              <div className="shrink-0 px-4 pt-4 pb-8 md:px-[10%] lg:px-[15%]">
                <ChatInput
                  ref={chatInputRef}
                  onSend={sendMessage}
                  disabled={isLoading}
                  availableTools={availableTools}
                  availableModels={availableModels}
                  currentModel={currentModel}
                  onModelChange={handleModelChange}
                />
              </div>
            </div>
          </main>

          {/* Canvas 面板 - 当可见时占据右侧 */}
          {isCanvasVisible && (
            <div className='w-[600px] lg:w-[800px] shrink-0 border-l border-gray-200 dark:border-gray-700'>
              <CanvasPanel
                artifact={activeArtifact}
                isVisible={isCanvasVisible}
                onClose={handleCloseCanvas}
                onUpdateCode={handleUpdateCode}
              />
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  )
}
