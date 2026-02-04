import { NextRequest, NextResponse } from 'next/server';
import { authService } from '@/app/services';

/**
 * 用户注册 API
 * POST /api/auth/signup
 *
 * 请求体：
 * {
 *   "email": string,
 *   "password": string,
 *   "name": string
 * }
 *
 * 成功响应：
 * {
 *   "user": { id, email, ... }
 * }
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
    const { email, password, name } = body;

    // 参数验证
    if (!email || !password || !name) {
      return NextResponse.json(
        { error: '请填写所有必填字段' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: '密码至少需要6位字符' },
        { status: 400 }
      );
    }

    // 使用 Supabase Auth 注册用户
    const redirectTo = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/auth/callback`;
    const { data, error } = await authService.signUp(email, password, name, redirectTo);

    if (error) {
      console.error('注册错误:', error.message);
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    // 检查是否需要邮箱验证
    // 在 Supabase 中启用邮箱验证时，session 会为 null
    if (data.user && !data.session) {
      return NextResponse.json({
        message: '注册成功！请查收验证邮件',
        user: data.user,
        requiresConfirmation: true,
      });
    }

    // 如果 session 存在，说明邮箱验证未启用或已自动验证，设置 cookie
    const response = NextResponse.json({
      message: '注册成功',
      user: {
        id: data.user.id,
        email: data.user.email,
        name: data.user.user_metadata?.name || name,
      },
      requiresConfirmation: false,
    });

    if (data.session?.access_token) {
      response.cookies.set(COOKIE_NAME, data.session.access_token, COOKIE_OPTIONS);
    }

    return response;

  } catch (error) {
    console.error('注册 API 错误:', error instanceof Error ? error.message : String(error));
    return NextResponse.json(
      { error: '服务器错误，请稍后重试' },
      { status: 500 }
    );
  }
}
