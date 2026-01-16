import { useEffect, useCallback, useState, useRef } from 'react'
import { mapStoredMessagesToChatMessages, HumanMessage, AIMessage } from '@langchain/core/messages'
import type { Message } from '../components/MessageBubble'
import { fetchWithAuth } from '@/app/utils/api'

/**
 * 聊天历史加载 Hook
 *
 * 功能:
 * - 自动加载指定会话的历史消息
 * - 当会话 ID 变化时自动重新加载
 * - 直接使用 LangChain 原始消息格式，无需转换
 * - 判断会话是否包含用户消息
 * - 新会话时不加载历史记录
 *
 * 使用场景:
 * - 切换到历史会话时加载之前的对话
 * - 刷新页面后恢复当前会话
 *
 * @param sessionId - 当前会话 ID
 * @param onLoadMessages - 加载完成后的回调,接收消息数组
 * @param onHasUserMessage - 设置是否有用户消息的回调
 * @param isNewSession - 是否为新创建的会话（新会话不加载历史）
 */
export function useChatHistory(
  sessionId: string,
  onLoadMessages: (messages: Message[]) => void,
  onHasUserMessage: (hasUser: boolean) => void,
  isNewSession?: boolean
) {
  // 历史记录加载状态
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)

  // 保存上一次的 sessionId，用于判断是否真的切换了会话
  const previousSessionIdRef = useRef<string | null>(null)

  /**
   * 加载历史消息
   *
   * 流程:
   * 1. 从 API 获取会话历史
   * 2. 直接使用 LangChain 消息对象（无需格式转换）
   * 3. 更新消息列表和用户消息标记
   *
   * @param threadId - 要加载的会话 ID
   */
  const loadHistory = useCallback(async (threadId: string) => {

    setIsLoadingHistory(true)

    try {
      // 1. 请求历史记录
      const res = await fetchWithAuth(`/api/chat?thread_id=${threadId}`)
      const data = await res.json()

      if (Array.isArray(data.history) && data.history.length > 0) {
        let historyMsgs: Message[] = []

        try {
          // 2. 使用 LangChain 的反序列化方法重建消息对象
          // 首先确保数据是纯 JSON 对象
          const serializedData = JSON.parse(JSON.stringify(data.history))
          historyMsgs = mapStoredMessagesToChatMessages(serializedData) as Message[]
        } catch (deserializeError) {
          console.error('反序列化失败，尝试手动重建:', deserializeError)

          // 手动重建消息对象作为备选方案
          historyMsgs = data.history.map((msg: any, idx: number) => {
            // 多种方式提取消息类型
            let msgType = null

            // 优先从 id 数组中提取（LangChain 序列化格式）
            if (msg.id && Array.isArray(msg.id)) {
              // LangChain 消息的 id 格式: ["langchain_core", "messages", "HumanMessage"]
              const idArray = msg.id
              for (const part of idArray) {
                if (part === 'HumanMessage' || part === 'human') {
                  msgType = 'human'
                  break
                } else if (part === 'AIMessage' || part === 'ai') {
                  msgType = 'ai'
                  break
                }
              }
            }

            // 如果没找到，检查 type 字段（但排除 "constructor"）
            if (!msgType && msg.type && msg.type !== 'constructor') {
              msgType = msg.type
            }

            // 如果还是没有，从 kwargs 或 data 中提取
            if (!msgType) {
              const msgData = msg.data || msg.kwargs
              if (msgData) {
                msgType = msgData.type
              }
            }

            // 如果依然无法判断，根据消息顺序推测（偶数=用户，奇数=AI）
            if (!msgType) {
              msgType = idx % 2 === 0 ? 'human' : 'ai'
            }

            const msgData = msg.data || msg.kwargs || msg
            const content = msgData.content || msg.content || ''
            const messageId = msgData.id || msg.id

            if (msgType === 'human' || msgType === 'HumanMessage') {
              return new HumanMessage({
                content,
                id: messageId
              }) as Message
            } else {
              return new AIMessage({
                content,
                id: messageId
              }) as Message
            }
          })
        }

        // 3. 更新消息列表
        onLoadMessages(historyMsgs)

        // 4. 检查是否有用户消息(用于判断是否需要更新会话名)
        const hasUserMsg = historyMsgs.some(msg => {
          const msgType = msg.getType?.() || (msg as any)._getType?.()
          return msgType === 'human'
        })
        onHasUserMessage(hasUserMsg)
      } else {
        // 没有历史记录,重置为初始状态
        onLoadMessages([])
        onHasUserMessage(false)
      }
    } catch (error) {
      // 静默失败,不影响用户体验
      console.error('加载历史记录失败:', error)
      onLoadMessages([])
      onHasUserMessage(false)
    } finally {
      setIsLoadingHistory(false)
    }
  }, [onLoadMessages, onHasUserMessage])

  // 当 sessionId 变化时自动加载历史记录
  useEffect(() => {
    console.log('[useChatHistory] useEffect 触发', {
      sessionId,
      previousSessionId: previousSessionIdRef.current,
      isSessionChanged: sessionId !== previousSessionIdRef.current,
      isNewSession,
    })

    // 只在 sessionId 真正改变时才加载历史（避免因为回调函数变化导致的重复加载）
    if (sessionId === previousSessionIdRef.current) {
      console.log('[useChatHistory] sessionId 未变化，跳过加载')
      return
    }

    // 更新 ref
    previousSessionIdRef.current = sessionId

    console.log('[useChatHistory] sessionId 已变化，开始处理', {
      old: previousSessionIdRef.current,
      new: sessionId,
      isNewSession,
    })

    // 如果 sessionId 为空，说明是新会话，不需要加载历史
    if (!sessionId) {
      console.log('[useChatHistory] sessionId 为空，清空消息')
      onLoadMessages([])
      onHasUserMessage(false)
      return
    }

    // 如果是新创建的会话，不加载历史记录（保留当前消息，避免覆盖流式内容）
    if (isNewSession) {
      console.log('[useChatHistory] 新会话，跳过历史记录加载')
      return
    }

    console.log('[useChatHistory] 开始加载历史记录', sessionId)
    loadHistory(sessionId)
  }, [sessionId, loadHistory, onLoadMessages, onHasUserMessage, isNewSession])

  return { loadHistory, isLoadingHistory }
}
