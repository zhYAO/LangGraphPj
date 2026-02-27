import { useCallback, useMemo, useEffect, useRef } from 'react'
import type { Message, ToolCall } from '../components/MessageBubble'
import { streamPost } from '@/app/utils/api'
import { getCanvasParser } from '@/app/canvas/CanvasArtifactParser'
import { canvasStore } from '@/app/hooks/useCanvasArtifacts'
import type { CanvasArtifact } from '@/app/canvas/canvas-types'
import { saveArtifactToDb } from '@/app/utils/artifacts'

/**
 * 消息发送 Hook 的参数接口
 */
interface UseSendMessageParams {
  sessionId: string // 当前会话 ID
  setSessionId: (id: string, isNew?: boolean) => void // 设置会话 ID（用于接收后端创建的新会话）
  setIsLoading: (loading: boolean) => void // 设置加载状态
  addUserMessage: (content: string | Array<any>) => Message // 添加用户消息（支持多模态）
  addAssistantMessage: () => Message // 添加 AI 消息
  updateMessageContent: (id: string, content: string) => void // 更新消息内容
  finishStreaming: (id: string) => void // 完成流式传输
  addErrorMessage: () => void // 添加错误消息
  fetchSessions: () => void // 重新获取会话列表
  updateToolCalls: (messageId: string, toolCalls: ToolCall[]) => void // 更新工具调用
  addToolCall: (messageId: string, toolCall: ToolCall) => void // 添加工具调用
  updateToolResult: (messageId: string, toolName: string, output: any, toolCallId?: string) => void // 更新工具结果
  updateToolError: (messageId: string, toolName: string, error: string, toolCallId?: string) => void // 更新工具错误
}

/**
 * 保存 artifact 到数据库（通过 API）
 */
async function persistArtifactToDb(artifact: CanvasArtifact) {
  try {
    await saveArtifactToDb(artifact)
  } catch (error) {
    console.error('保存 artifact 到数据库时出错:', error)
  }
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
  updateToolError,
}: UseSendMessageParams) {
  const sessionIdRef = useRef(sessionId)
  const abortControllerRef = useRef<AbortController | null>(null)
  const readerRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null)
  const currentAssistantIdRef = useRef<string | null>(null)

  useEffect(() => {
    sessionIdRef.current = sessionId
  }, [sessionId])

  // 使用 useMemo 创建 Canvas 解析器实例并设置回调（只初始化一次）
  const canvasParser = useMemo(() => {
    const parser = getCanvasParser()

    parser.setCallbacks({
      onArtifactStart: (metadata) => {
        // 创建 artifact 数据
        canvasStore.setArtifact(metadata.messageId, {
          id: metadata.id,
          type: metadata.type,
          title: metadata.title,
          code: { language: 'jsx', content: '' },
          status: 'creating',
          isStreaming: true,
          messageId: metadata.messageId,
          sessionId: sessionIdRef.current,
          currentVersion: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        })

        // 自动打开右侧 Canvas 面板并激活当前 artifact（打开到编辑器模式）
        canvasStore.setActiveArtifactId(metadata.id)
        canvasStore.setIsCanvasVisible(true, 'editor') // 🎯 打开到编辑器模式
      },

      onCodeUpdate: (data) => {
        // 🔥 实时更新代码内容（流式累积）
        const artifact = canvasStore.getArtifact(data.messageId, data.artifactId)
        if (artifact) {
          canvasStore.setArtifact(data.messageId, {
            ...artifact,
            code: {
              language: data.language,
              content: data.content,
            },
            updatedAt: new Date(),
          })
        }
      },

      onCodeComplete: (data) => {
        // onCodeComplete 已经被 onArtifactComplete 取代
        // 这里不再需要更新，避免重复
      },

      onArtifactComplete: (artifact) => {
        // 更新 store
        const existing = canvasStore.getArtifact(artifact.messageId, artifact.id)
        const currentVersion = existing ? existing.currentVersion + 1 : 1
        const updatedArtifact = {
          id: artifact.id,
          type: artifact.type,
          title: artifact.title,
          code: artifact.code,
          config: artifact.config,
          status: 'ready' as const,
          isStreaming: false,
          messageId: artifact.messageId,
          sessionId: sessionIdRef.current,
          currentVersion,
          createdAt: existing?.createdAt || new Date(),
          updatedAt: new Date(),
        }
        canvasStore.setArtifact(artifact.messageId, updatedArtifact)

        // 保存到数据库
        persistArtifactToDb(updatedArtifact)
      },

      onError: (error) => {
        console.error('[CanvasCallback] ❌ onError 触发:', error)
      },
    })

    return parser
  }, []) // 空依赖数组，只初始化一次

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
  const sendMessage = useCallback(
    async (
      input: string,
      selectedTools?: string[],
      selectedModel?: string,
      images?: File[],
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

        // 4. 创建 AbortController 用于取消请求
        const abortController = new AbortController()
        abortControllerRef.current = abortController
        currentAssistantIdRef.current = assistantMessage.id!

        // 5. 发送请求到 API
        const response = await streamPost('/api/chat', {
          message: messageContent,
          thread_id: sessionIdRef.current,
          tools: selectedTools,
          model: selectedModel
        }, { signal: abortController.signal })

        // 6. 处理流式响应
        const reader = response.body?.getReader()
        if (!reader) {
          throw new Error('无法读取响应流')
        }
        readerRef.current = reader

        const decoder = new TextDecoder()
        let buffer = ''
        let newSessionId: string | null = null
        let canvasFullContent = ''

        const parseSseEvents = (raw: string) => {
          const chunks = raw.split('\n')
          const remainder = chunks.pop() || ''
          const events: Array<{ name: string; data: any }> = []

          for (const chunk of chunks) {
            const lines = chunk.split('\n').map((line) => line.trim())
            if (lines.length === 0) {
              continue
            }
            let eventName = 'message'
            const dataLines: string[] = []
            for (const line of lines) {
              if (line.startsWith('event:')) {
                eventName = line.slice(6).trim()
              } else if (line.startsWith('data:')) {
                dataLines.push(line.slice(5).trim())
              }
            }
            if (dataLines.length === 0) {
              continue
            }
            const dataStr = dataLines.join('\n')
            try {
              const data = JSON.parse(dataStr)
              events.push({ name: eventName, data })
            } catch (parseError) {
              console.error('解析流数据错误:', parseError)
            }
          }
          return { events, remainder }
        }

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const parsed = parseSseEvents(buffer)
          buffer = parsed.remainder

          for (const event of parsed.events) {
            const data = event.data
            const payloadType = data.type ?? event.name

            if (payloadType === 'session' && data.thread_id) {
              const threadId = data.thread_id as string
              newSessionId = threadId
              sessionIdRef.current = threadId
              setSessionId(threadId, true)
              fetchSessions()
            } else if ((payloadType === 'chunk' || event.name === 'message.delta') && data.content) {
              canvasFullContent += data.content
              const canvasEnabled = selectedTools?.includes('canvas') ?? false
              if (canvasEnabled) {
                canvasParser.parse(assistantMessage.id!, data.content)
              }
              updateMessageContent(assistantMessage.id!, data.content)
            } else if ((payloadType === 'tool_calls' || event.name === 'tool.calls') && data.tool_calls) {
              updateToolCalls(assistantMessage.id!, data.tool_calls)
            } else if ((payloadType === 'tool_result' || event.name === 'tool.result') && data.name) {
              const output = data.data?.output ?? data.output
              const toolCallId = data.tool_call_id ?? data.data?.tool_call_id
              updateToolResult(assistantMessage.id!, data.name, output, toolCallId)
            } else if ((payloadType === 'tool_error' || event.name === 'tool.error') && data.name) {
              const error = data.data?.error?.message || data.data?.error || data.error
              const toolCallId = data.tool_call_id ?? data.data?.tool_call_id
              console.error('工具执行错误:', data.name, error)
              updateToolError(assistantMessage.id!, data.name, error || '未知错误', toolCallId)
            } else if (payloadType === 'end' || event.name === 'end') {
              const toolCalls = data.message?.tool_calls ?? data.message?.data?.tool_calls
              if (toolCalls) {
                updateToolCalls(assistantMessage.id!, toolCalls)
              }
              finishStreaming(assistantMessage.id!)
              break
            } else if (payloadType === 'error' || event.name === 'error') {
              throw new Error(data.message || '服务器错误')
            }
          }
        }

        // // 7. 流结束后，设置 sessionId（列表已在收到 session 消息时刷新）
        if (newSessionId) {
          setSessionId(newSessionId, false)
        }

      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          if (currentAssistantIdRef.current) {
            finishStreaming(currentAssistantIdRef.current)
          }
        } else {
          console.error('发送消息时出错:', error)
          addErrorMessage()
        }
      } finally {
        abortControllerRef.current = null
        readerRef.current = null
        currentAssistantIdRef.current = null
        setIsLoading(false)
      }
    },
    [
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
      updateToolError,
    ],
  )

  const stopGeneration = useCallback(() => {
    if (readerRef.current) {
      readerRef.current.cancel()
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
  }, [])

  return { sendMessage, stopGeneration }
}
