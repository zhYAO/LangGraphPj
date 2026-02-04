import { NextRequest, NextResponse } from 'next/server';
import { authService } from '@/app/services';

/**
 * 获取当前会话 API
 * GET /api/auth/session
 *
 * 响应：
 * {
 *   "user": { id, email, name } | null
 * }
 *
 * 优先从 cookie 读取 token，如果没有则从 Authorization header 读取
 */

const COOKIE_NAME = 'sb-access-token';

export async function GET(request: NextRequest) {
  try {
    // 优先从 cookie 获取 access_token
    let token = request.cookies.get(COOKIE_NAME)?.value;

    // 如果 cookie 中没有，尝试从 Authorization header 获取（兼容旧客户端）
    if (!token) {
      const authHeader = request.headers.get('authorization');
      if (authHeader?.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }
    }

    if (!token) {
      return NextResponse.json({
        user: null,
      });
    }

    // 验证令牌并获取用户信息
    const { data: { user }, error } = await authService.getUserByToken(token);

    if (error || !user) {
      return NextResponse.json({
        user: null,
      });
    }

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.user_metadata?.name || user.email?.split('@')[0],
      },
    });

  } catch (error) {
    console.error('获取会话 API 错误:', error instanceof Error ? error.message : String(error));
    return NextResponse.json(
      { user: null },
      { status: 500 }
    );
  }
}
