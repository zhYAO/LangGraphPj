import { NextRequest, NextResponse } from 'next/server';
import { authService } from '@/app/services';

/**
 * 用户登录 API
 * POST /api/auth/signin
 *
 * 请求体：
 * {
 *   "email": string,
 *   "password": string
 * }
 *
 * 成功响应：
 * {
 *   "user": { id, email, ... }
 * }
 *
 * 登录成功后会设置 httpOnly cookie 存储认证信息
 */

// Cookie 配置
const COOKIE_NAME = 'sb-access-token';
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 60 * 60 * 24 * 7, // 7 天
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    // 参数验证
    if (!email || !password) {
      return NextResponse.json(
        { error: '请填写所有必填字段' },
        { status: 400 }
      );
    }

    // 使用 Supabase Auth 登录
    const { data, error } = await authService.signIn(email, password);

    if (error) {
      console.error('登录错误:', error.message);
      return NextResponse.json(
        { error: '邮箱或密码错误' },
        { status: 401 }
      );
    }

    // 登录成功，创建响应并设置 cookie
    const response = NextResponse.json({
      message: '登录成功',
      user: {
        id: data.user.id,
        email: data.user.email,
        name: data.user.user_metadata?.name || data.user.email,
      },
    });

    // 设置 access_token cookie
    response.cookies.set(COOKIE_NAME, data.session.access_token, COOKIE_OPTIONS);

    return response;

  } catch (error) {
    console.error('登录 API 错误:', error instanceof Error ? error.message : String(error));
    return NextResponse.json(
      { error: '服务器错误，请稍后重试' },
      { status: 500 }
    );
  }
}
