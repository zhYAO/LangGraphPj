'use client'

import { useState, useCallback, useEffect } from 'react'
import { get, post, del as deleteReq, patch } from '@/app/utils/api'

/**
 * 会话数据接口
 */
export interface Session {
  id: string
  name: string
  created_at: string
}

/**
 * 会话管理 Hook
 *
 * 负责管理聊天会话的所有状态和操作:
 * - 当前会话 ID 管理
 * - 会话列表管理
 * - 创建、删除、重命名会话
 * - 切换会话
 * - 自动更新会话名称
 *
 * 会话生命周期:
 * 1. 页面加载时自动获取或创建会话 ID,并加载会话列表
 * 2. 用户发送第一条消息时,使用消息内容更新会话名称
 * 3. 用户可以切换到历史会话或创建新会话
 * 4. 用户可以重命名或删除会话
 */
export function useSessionManager() {
  // ==================== 状态管理 ====================
  // 当前会话 ID,初始值为空,由后端 chat 接口创建时返回
  const [sessionId, setSessionIdState] = useState<string>('')

  // 标记当前会话是否已有用户消息(用于判断是否需要更新会话名)
  const [hasUserMessage, setHasUserMessage] = useState(false)

  // 标记当前会话是否为新创建的会话（用于防止加载历史记录）
  const [isNewSession, setIsNewSession] = useState(false)

  // 会话列表
  const [sessions, setSessions] = useState<Session[]>([])

  // 加载状态
  const [isLoading, setIsLoading] = useState(false)

  // ==================== 会话列表管理 ====================
  /**
   * 获取会话列表
   * 从后端 API 获取所有会话并更新状态
   */
  const fetchSessions = useCallback(async () => {
    // 添加调用栈日志，便于定位调用来源
    console.trace('[useSessionManager] fetchSessions 被调用')
    try {
      setIsLoading(true)
      const data = await get<{ sessions: Session[] }>('/api/chat/sessions')
      if (Array.isArray(data.sessions)) {
        setSessions(data.sessions)
      }
    } catch (error) {
      console.error('获取会话列表失败:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // 页面加载时自动获取会话列表
  useEffect(() => {
    fetchSessions()
  }, [fetchSessions])

  // ==================== 会话操作 ====================
  /**
   * 创建新会话
   * 1. 调用 API 创建会话
   * 2. 设置新的会话 ID
   * 3. 重置用户消息标记
   * 4. 刷新会话列表
   */
  const createSession = useCallback(async () => {
    try {
      const data = await post<{ id: string }>('/api/chat/sessions', {
        name: '',
      })

      if (data.id) {
        setSessionIdState(data.id) // 更新当前会话 ID
        setIsNewSession(true) // 标记为新会话（防止加载历史）
        setHasUserMessage(false) // 重置用户消息标记
        await fetchSessions() // 刷新会话列表
      }
    } catch (error) {
      console.error('创建会话失败:', error)
    }
  }, [fetchSessions])

  /**
   * 选择(切换)会话
   * 用户从侧边栏点击历史会话时调用
   *
   * @param id - 要切换到的会话 ID
   */
  const selectSession = useCallback((id: string) => {
    setSessionIdState(id)
    setIsNewSession(false) // 切换到历史会话，重置新会话标记
    setHasUserMessage(false) // 切换会话时重置标记
  }, [])

  /**
   * 删除会话
   * 调用 API 删除指定会话并刷新列表
   *
   * @param id - 要删除的会话 ID
   */
  const deleteSession = useCallback(
    async (id: string) => {
      try {
        await deleteReq('/api/chat/sessions', { id })
        await fetchSessions() // 刷新会话列表

        // 如果删除的是当前会话,创建新会话
        if (id === sessionId) {
          await createSession()
        }
      } catch (error) {
        console.error('删除会话失败:', error)
      }
    },
    [sessionId, fetchSessions, createSession],
  )

  /**
   * 重命名会话
   * 调用 API 更新会话名称并刷新列表
   *
   * @param id - 要重命名的会话 ID
   * @param name - 新的会话名称
   */
  const renameSession = useCallback(
    async (id: string, name: string) => {
      if (!name.trim()) return

      try {
        await patch('/api/chat/sessions', { id, name: name.trim() })
        await fetchSessions() // 刷新会话列表
      } catch (error) {
        console.error('重命名会话失败:', error)
      }
    },
    [fetchSessions],
  )

  /**
   * 重置当前会话（新建对话）
   * 直接清空 sessionId，不调用后端 API
   * 等同于页面首次加载的初始状态，下次发送消息时会自动创建新会话
   */
  const resetCurrentSession = useCallback(() => {
    setSessionIdState('') // 清空会话 ID
    setIsNewSession(false) // 重置新会话标记
    setHasUserMessage(false) // 重置用户消息标记
  }, [])

  /**
   * 更新会话名称
   * 在用户发送第一条消息时自动调用
   * 使用消息内容的前 20 个字符作为会话名称
   *
   * 注意: 每个会话只会更新一次名称(hasUserMessage 标记)
   *
   * @param name - 新的会话名称(通常是用户的第一条消息)
   * @param targetSessionId - 可选的目标会话 ID（用于新创建的会话）
   */
  const updateSessionName = useCallback(
    async (name: string, targetSessionId?: string) => {
      // 如果已经有用户消息,则不再更新会话名
      if (hasUserMessage) return

      // 使用传入的 sessionId 或当前的 sessionId
      const idToUpdate = targetSessionId || sessionId

      // 如果 sessionId 为空,说明会话还未创建,跳过更新
      if (!idToUpdate) return

      try {
        await patch('/api/chat/sessions', {
          id: idToUpdate,
          name: name.slice(0, 20), // 截取前 20 个字符
        })
        await fetchSessions() // 刷新会话列表
        setHasUserMessage(true) // 标记已更新
      } catch (error) {
        console.error('更新会话名称失败:', error)
      }
    },
    [sessionId, hasUserMessage, fetchSessions],
  )

  /**
   * 设置会话 ID（用于接收后端返回的新会话 ID）
   * @param id - 新的会话 ID
   * @param isNew - 是否为新创建的会话（默认 true，防止加载历史记录）
   */
  const setSessionId = useCallback((id: string, isNew = true) => {
    setSessionIdState(id)
    setIsNewSession(isNew)
  }, [])

  return {
    // 状态
    sessionId,
    hasUserMessage,
    sessions,
    isLoading,
    isNewSession,

    // 状态设置方法
    setSessionId,
    setHasUserMessage,

    // 会话操作方法
    fetchSessions,
    createSession,
    selectSession,
    deleteSession,
    renameSession,
    updateSessionName,
    resetCurrentSession,
  }
}
