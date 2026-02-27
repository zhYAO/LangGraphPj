import '../../utils/loadEnv'
import { NextRequest, NextResponse } from 'next/server'
import { chatService } from '@/app/services'
import { withAuth } from '@/app/middleware/auth'

/**
 * POST /api/chat
 * 发送聊天消息（流式响应）
 */
export const POST = withAuth(async (request: NextRequest, auth) => {
  try {
    // 解析 JSON 请求体
    const body = await request.json()
    const { message, thread_id, tools, model } = body

    if (!message) {
      return NextResponse.json({ error: '无效的消息格式' }, { status: 400 })
    }
    if (!auth.user) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    const user = auth.user;

    console.log('收到请求 - 模型:', model, '工具:', tools)

    // 获取或创建线程 ID
    const { threadId, isNewSession } = chatService.getOrCreateThreadId({
      message,
      thread_id,
      tools,
      model,
      userId: user.id,
      authenticatedClient: auth.client,
    })

    const abortController = new AbortController();
    const { signal } = abortController;

    // 创建流式响应
    const encoder = new TextEncoder();
    const formatSse = (eventName: string, payload: unknown) => {
      return `event: ${eventName}\ndata: ${JSON.stringify(payload)}\n\n`;
    };
    const mapEventName = (type: string) => {
      switch (type) {
        case 'session':
          return 'session';
        case 'chunk':
          return 'message.delta';
        case 'tool_calls':
          return 'tool.calls';
        case 'tool_result':
          return 'tool.result';
        case 'tool_error':
          return 'tool.error';
        case 'end':
          return 'end';
        case 'error':
          return 'error';
        default:
          return 'message';
      }
    };

    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const data of chatService.streamChatResponse(
            { message, thread_id, tools, model, userId: user.id, authenticatedClient: auth.client },
            threadId,
            isNewSession,
            signal
          )) {
            if (signal.aborted) {
              break;
            }
            const eventName = mapEventName(data.type ?? 'message');
            controller.enqueue(encoder.encode(formatSse(eventName, data)));
          }

          controller.close();
        } catch (error) {
          if (signal.aborted) {
            controller.close();
            return;
          }
          console.error('流式聊天错误:', error);
          const errorData = {
            type: 'error',
            error: '服务器内部错误',
            message: '抱歉，处理你的请求时出现了问题。请稍后重试。',
          };
          controller.enqueue(encoder.encode(formatSse('error', errorData)));
          controller.close();
        }
      },
      cancel() {
        abortController.abort();
      },
    });

    // 返回流式响应
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })
  } catch (error) {
    console.error('聊天 API 错误:', error)
    return NextResponse.json(
      {
        error: '服务器内部错误',
        response: '抱歉，处理你的请求时出现了问题。请稍后重试。',
      },
      { status: 500 },
    )
  }
})

/**
 * GET /api/chat
 * 获取聊天历史或 API 信息
 */
export const GET = withAuth(async (request: NextRequest, auth) => {
  // 判断是否为历史记录请求
  const { searchParams } = new URL(request.url)
  const thread_id = searchParams.get('thread_id')

  if (thread_id) {
    try {
      if (!auth.user) {
        return NextResponse.json({ error: '未授权' }, { status: 401 });
      }
      // 使用 service 层获取历史记录
      const result = await chatService.getChatHistory({
        thread_id,
        userId: auth.user.id,
        authenticatedClient: auth.client,
      })
      return NextResponse.json(result)
    } catch (e) {
      return NextResponse.json(
        { error: '获取历史记录失败', detail: String(e) },
        { status: 500 },
      )
    }
  }

  // 默认返回API信息
  return NextResponse.json({
    message: 'LangGraph 聊天 API 正在运行',
    version: '1.0.0',
    endpoints: {
      chat: 'POST /api/chat (流式响应)',
      history: 'GET /api/chat?thread_id=xxx (获取历史记录)',
    },
  })
})
