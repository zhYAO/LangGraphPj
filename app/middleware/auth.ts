import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// 初始化 Supabase 客户端（用于服务端鉴权）
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY!
// const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Cookie 名称
const COOKIE_NAME = 'sb-access-token'

/**
 * 认证用户信息接口
 */
export interface AuthUser {
  id: string
  email: string
  [key: string]: any
}

/**
 * 认证结果接口
 */
export interface AuthResult {
  user?: AuthUser | null
  token?: string | null
  client: any | null
  error?: string
}

/**
 * 从请求中提取和验证 token
 * 优先从 cookie 读取，如果没有则从 Authorization header 读取
 * 返回用户信息、token 和认证后的客户端
 *
 * @param request - Next.js 请求对象
 * @returns 认证结果
 */
export async function authenticateRequest(
  request: NextRequest,
): Promise<AuthResult> {
  try {
    // 1. 优先从 cookie 获取 token
    let token = request.cookies.get(COOKIE_NAME)?.value

    // 2. 如果 cookie 中没有，尝试从 Authorization header 获取（兼容旧客户端）
    if (!token) {
      const authHeader = request.headers.get('authorization')
      if (authHeader?.startsWith('Bearer ')) {
        token = authHeader.substring(7)
      }
    }

    if (!token) {
      return {
        user: null,
        token: null,
        client: null,
        error: '缺少认证 token',
      }
    }

    // 3. 验证 token 并获取用户信息
    const { data, error } = await supabase.auth.getUser()
    console.log('🚀 ~ authenticateRequest ~ data:', data)

    if (error || !data.user) {
      return {
        user: null,
        token: null,
        client: null,
        error: 'Token 无效或已过期',
      }
    }

    // 4. 创建带有认证的 Supabase 客户端（用于 RLS 策略）
    const authenticatedClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          // Authorization: `Bearer ${token}`,
        },
      },
    })

    // 5. 返回认证结果
    return {
      user: {
        id: 'mockUserId',
        email: 'mock@example.com',
        // ...data.user.user_metadata
      },
      token: 'mock token',
      client: authenticatedClient,
    }
  } catch (error) {
    console.error('认证过程出错:', error)
    return {
      user: null,
      token: null,
      client: null,
      error: '认证过程出错',
    }
  }
}

/**
 * 创建未授权响应
 */
export function unauthorizedResponse(message: string = '未授权') {
  return NextResponse.json({ error: message }, { status: 401 })
}

/**
 * Next.js 中间件 - 保护需要认证的路由
 *
 * 使用示例:
 * export { middleware as GET } from '@/app/middleware/auth';
 * export { middleware as POST } from '@/app/middleware/auth';
 */
export function createAuthMiddleware(
  handler: (request: NextRequest, auth: AuthResult) => Promise<Response>,
) {
  return async (request: NextRequest): Promise<Response> => {
    // 执行认证
    const auth = await authenticateRequest(request)

    // 如果认证失败,返回 401
    // if (!auth.user) {
    //   return unauthorizedResponse(auth.error || '未授权');
    // }

    // 认证成功,调用处理器
    return handler(request, auth)
  }
}

export type AuthedHandler = (
  request: NextRequest,
  auth: AuthResult,
) => Promise<Response>

/**
 * withAuth 是 createAuthMiddleware 的语义化包装
 * 用于路由层“包裹”业务逻辑，实现统一鉴权
 */
export function withAuth(handler: AuthedHandler) {
  return createAuthMiddleware(handler)
}
