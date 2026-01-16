import { useCallback, useMemo, useEffect, useRef } from 'react'
import type { Message, ToolCall } from '../components/MessageBubble'
import { streamPost } from '@/app/utils/api'

/**
 * 消息发送 Hook 的参数接口
 */
interface UseSendMessageParams {
  sessionId: string                                    // 当前会话 ID
  setSessionId: (id: string, isNew?: boolean) => void  // 设置会话 ID（用于接收后端创建的新会话）
  setIsLoading: (loading: boolean) => void             // 设置加载状态
  addUserMessage: (content: string | Array<any>) => Message  // 添加用户消息（支持多模态）
  addAssistantMessage: () => Message                   // 添加 AI 消息
  updateMessageContent: (id: string, content: string) => void  // 更新消息内容
  finishStreaming: (id: string) => void                // 完成流式传输
  addErrorMessage: () => void                          // 添加错误消息
  fetchSessions: () => void                            // 重新获取会话列表
  updateToolCalls: (messageId: string, toolCalls: ToolCall[]) => void  // 更新工具调用
  addToolCall: (messageId: string, toolCall: ToolCall) => void  // 添加工具调用
  updateToolResult: (messageId: string, toolName: string, output: any) => void  // 更新工具结果
  updateToolError: (messageId: string, toolName: string, error: string) => void  // 更新工具错误
}

/**
 * 消息发送 Hook
 *
 * 负责处理消息发送的完整流程:
 * 1. 发送用户消息到服务器
 * 2. 接收并处理流式响应
 * 3. 实时更新 AI 回复
 * 4. 错误处理
 *
 * 流式响应格式:
 * - { type: 'session', thread_id: '...' } - 新会话 ID（首次发送消息时）
 * - { type: 'chunk', content: '...' } - 内容片段
 * - { type: 'end' } - 流结束
 * - { type: 'error', message: '...' } - 错误信息
 */

export function useSendMessage({
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
  updateToolResult,
  updateToolError
}: UseSendMessageParams) {
  const sessionIdRef = useRef(sessionId)

  useEffect(() => {
    sessionIdRef.current = sessionId
  }, [sessionId])

  /**
   * 发送消息并处理响应
   *
   * 流程:
   * 1. 添加用户消息到列表
   * 2. 发送 POST 请求到 /api/chat
   * 3. 更新会话名称(如果是第一条消息)
   * 4. 创建空的 AI 消息
   * 5. 读取流式响应并逐步更新消息内容
   * 6. 完成后移除打字光标
   *
   * @param input - 用户输入的消息内容
   * @param selectedTools - 用户选择的工具 ID 列表（可选）
   * @param selectedModel - 用户选择的模型 ID（可选）
   * @param images - 上传的图片文件列表（可选）
   */
  const sendMessage = useCallback(async (
    input: string,
    selectedTools?: string[],
    selectedModel?: string,
    images?: File[]
  ) => {
    setIsLoading(true)

    try {
      // 1. 处理图片：转换为 base64
      let messageContent: string | Array<any> = input
      const imageData: Array<{ data: string; mimeType: string }> = []

      if (images && images.length > 0) {
        // 将图片转换为 base64
        for (const image of images) {
          const base64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = () => {
              const result = reader.result as string
              // 移除 data:image/...;base64, 前缀
              const base64Data = result.split(',')[1]
              resolve(base64Data)
            }
            reader.onerror = reject
            reader.readAsDataURL(image)
          })

          imageData.push({
            data: base64,
            mimeType: image.type
          })
        }

        // 构建多模态内容数组
        messageContent = [
          { type: 'text', text: input },
          ...imageData.map(img => ({
            type: 'image_url',
            image_url: {
              url: `data:${img.mimeType};base64,${img.data}`
            }
          }))
        ]
      }

      // 2. 添加用户消息（支持多模态）
      addUserMessage(messageContent)

      // 3. 创建 AI 消息占位符
      const assistantMessage = addAssistantMessage()

      // 4. 发送请求到 API
      const response = await streamPost('/api/chat', {
        message: messageContent, // 发送文本或多模态内容
        thread_id: sessionIdRef.current,
        tools: selectedTools,
        model: selectedModel
      })



      // 5. 处理流式响应
      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('无法读取响应流')
      }

      const decoder = new TextDecoder()
      let buffer = ''  // 缓冲区,处理跨块的 JSON
      let newSessionId: string | null = null // 记录新创建的会话 ID

      // 6. 逐块读取响应流
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        // 解码二进制数据为文本
        buffer += decoder.decode(value, { stream: true })

        // 按行分割(每行是一个 JSON 对象)
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''  // 保留不完整的行到缓冲区

        // 处理每一行
        for (const line of lines) {
          if (line.trim()) {
            try {
              const data = JSON.parse(line)

              // 处理新会话 ID
              if (data.type === 'session' && data.thread_id) {
                newSessionId = data.thread_id
                sessionIdRef.current = newSessionId
                setSessionId(newSessionId, true)
                // 收到新会话 ID 时立即刷新右侧会话列表
                fetchSessions()
              }
              // 处理内容片段
              else if (data.type === 'chunk' && data.content) {
                // 正常更新消息内容
                updateMessageContent(assistantMessage.id!, data.content)
              }
              // 处理工具调用
              else if (data.type === 'tool_calls' && data.tool_calls) {
                updateToolCalls(assistantMessage.id!, data.tool_calls)
              }
              // 处理工具执行结果
              else if (data.type === 'tool_result' && data.name) {
                // 兼容新旧格式：优先使用 data.data.output，降级到 data.output
                const output = data.data?.output ?? data.output
                updateToolResult(assistantMessage.id!, data.name, output)
              }
              // 处理工具执行错误
              else if (data.type === 'tool_error' && data.name) {
                // 兼容新旧格式：优先使用 data.data.error，降级到 data.error
                const error = data.data?.error?.message || data.data?.error || data.error
                console.error('工具执行错误:', data.name, error)
                updateToolError(assistantMessage.id!, data.name, error || '未知错误')
              }
              // 流结束
              else if (data.type === 'end') {
                // 从最终消息中提取工具调用信息(如果有)
                if (data.message && data.message.tool_calls) {
                  updateToolCalls(assistantMessage.id!, data.message.tool_calls)
                }
                finishStreaming(assistantMessage.id!)
                break
              }
              // 服务器错误
              else if (data.type === 'error') {
                throw new Error(data.message || '服务器错误')
              }
            } catch (parseError) {
              console.error('解析流数据错误:', parseError)
            }
          }
        }
      }

      // // 7. 流结束后，设置 sessionId（列表已在收到 session 消息时刷新）
      if (newSessionId) {
        setSessionId(newSessionId, false)
      }

    } catch (error) {
      // 7. 错误处理
      console.error('发送消息时出错:', error)
      addErrorMessage()
    } finally {
      // 8. 清理加载状态
      setIsLoading(false)
    }
  }, [
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
    updateToolResult,
    updateToolError
  ])

  return { sendMessage }
}
