import '../utils/loadEnv'
import {
  StateGraph,
  MessagesAnnotation,
  START,
  END,
} from '@langchain/langgraph'
import {
  HumanMessage,
  AIMessage,
  SystemMessage,
} from '@langchain/core/messages'
import { SupabaseSaver } from '@skroyc/langgraph-supabase-checkpointer'
import { ToolNode } from '@langchain/langgraph/prebuilt'
import { createModel } from './utils/models'
import { createLangChainTools } from './utils/tools'
import { supabase } from '../database/supabase'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getCanvasSystemPrompt, getToolUsagePrompt, generateArtifactId } from '@/app/canvas/canvas-prompt';

// 全局缓存：存储 workflow 与匿名编译后的 app
// 使用 any 避免 CompiledStateGraph 复杂类型推断问题
const workflowCache = new Map<string, any>()
const appCache = new Map<string, any>()

/**
 * 创建聊天机器人 workflow
 * @param modelId 模型 ID
 * @param toolIds 工具 ID 列表
 */
async function createWorkflow(modelId?: string, toolIds?: string[]) {
  console.log('创建 workflow - 模型:', modelId, '工具:', toolIds)

  // 创建模型实例
  const model = createModel(modelId)

  // 创建工具实例（异步）
  const tools = await createLangChainTools(toolIds)

  // 绑定工具到模型
  const modelWithTools = tools.length > 0 ? model.bindTools(tools) : model
  // 是否启用 canvas 工具
  const canvasEnabled = toolIds?.includes('canvas') ?? false;
  const hasSelectedTools = (toolIds?.length ?? 0) > 0;

  // 聊天节点：处理用户输入并生成回复
  async function chatbotNode(state: typeof MessagesAnnotation.State) {
    try {
      // 将系统消息添加到消息数组开头
      let messagesWithSystem = [...state.messages]

      if (canvasEnabled) {
        const artifactId = generateArtifactId();
        const canvasSystemPrompt = getCanvasSystemPrompt(artifactId);
        const systemMessage = new SystemMessage(canvasSystemPrompt);
        messagesWithSystem = [systemMessage, ...messagesWithSystem];
      } else if (hasSelectedTools) {
        const toolUsagePrompt = getToolUsagePrompt();
        const toolUsageMessage = new SystemMessage(toolUsagePrompt);
        messagesWithSystem = [toolUsageMessage, ...messagesWithSystem];
      }

      const response = await modelWithTools.invoke(messagesWithSystem)
      console.log('模型响应成功，类型:', response._getType?.())
      return { messages: [response] }
    } catch (error) {
      console.error('chatbotNode 错误详情:', error)
      console.error(
        '错误栈:',
        error instanceof Error ? error.stack : '无栈信息',
      )
      throw error
    }
  }

  // 判断是否需要调用工具
  function shouldContinue(state: typeof MessagesAnnotation.State) {
    const lastMessage = state.messages[state.messages.length - 1]

    // 检查最后一条消息是否包含 tool_calls
    if (lastMessage && lastMessage._getType() === 'ai') {
      const aiMessage = lastMessage as AIMessage
      if (aiMessage.tool_calls && aiMessage.tool_calls.length > 0) {
        console.log('检测到工具调用:', aiMessage.tool_calls.length, '个工具')
        return 'tools'
      }
    }

    console.log('无工具调用，结束对话')
    return END
  }

  // 构建 workflow
  const workflow = new StateGraph(MessagesAnnotation).addNode(
    'chatbot',
    chatbotNode,
  )

  // 如果有工具，添加工具节点和条件路由
  if (tools.length > 0) {
    const toolNode = new ToolNode(tools)
    workflow
      .addNode('tools', toolNode)
      .addEdge(START, 'chatbot')
      .addConditionalEdges('chatbot', shouldContinue, {
        tools: 'tools',
        [END]: END,
      })
      .addEdge('tools', 'chatbot')
  } else {
    // 无工具，直接连接
    workflow.addEdge(START, 'chatbot').addEdge('chatbot', END)
  }

  return workflow
}

// 异步初始化检查点保存器
let checkpointer: SupabaseSaver

const getCheckpointer = (client?: SupabaseClient, userId?: string) => {
  if (client) {
    return new SupabaseSaver(client, undefined, userId)
  }

  if (!checkpointer) {
    // 创建 Supabase 检查点保存器
    console.log('初始化 SupabaseSaver')
    try {
      checkpointer = new SupabaseSaver(supabase)
      console.log('SupabaseSaver 初始化成功')
    } catch (error) {
      console.error('SupabaseSaver 初始化失败:', error)
      throw error
    }
  }
  return checkpointer
}

/**
 * 获取应用实例
 * @param modelId 模型 ID（可选）
 * @param toolIds 工具 ID 列表（可选）
 * @returns 编译后的 LangGraph 应用
 */
export const getApp = async (
  modelId?: string,
  toolIds?: string[],
  client?: SupabaseClient,
  userId?: string,
) => {
  const checkpointerInstance = getCheckpointer(client, userId)

  // 生成缓存 key
  const cacheKey = `${modelId || 'default'}-${(toolIds || []).sort().join(',')}`

  // 检查缓存
  let workflow = workflowCache.get(cacheKey)
  if (workflow) {
    console.log('使用缓存的 workflow:', cacheKey)
  }

  if (!workflow) {
    // 创建新的 workflow
    console.log('创建新的 workflow:', cacheKey)
    workflow = await createWorkflow(modelId, toolIds)

    // FIFO 缓存清理：如果缓存超过 10 个，删除最早添加的 workflow
    if (workflowCache.size > 10) {
      const firstKey = workflowCache.keys().next().value // Map 按插入顺序迭代
      if (firstKey) {
        workflowCache.delete(firstKey)
        appCache.delete(firstKey)
        console.log('[缓存清理] 删除最旧的 workflow:', firstKey)
      }
    }

    workflowCache.set(cacheKey, workflow)
  }

  if (!client && appCache.has(cacheKey)) {
    console.log('使用缓存的 app:', cacheKey)
    return appCache.get(cacheKey)!
  }

  const app = workflow.compile({ checkpointer: checkpointerInstance })

  if (!client) {
    appCache.set(cacheKey, app)
  }

  return app
}
