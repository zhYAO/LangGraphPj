import { supabase } from './supabase'

// 通过 access_token 获取用户信息
export async function getUserByToken(token: string) {
  return supabase.auth.getUser(token)
}

// 邮箱 + 密码登录
export async function signInWithPassword(email: string, password: string) {
  return supabase.auth.signInWithPassword({ email, password })
}

// 邮箱注册并写入用户 metadata
export async function signUpWithEmail(
  email: string,
  password: string,
  name: string,
  redirectTo: string,
) {
  return supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name },
      emailRedirectTo: redirectTo,
    },
  })
}

// 通过 access_token 执行登出
// 注意：由于当前架构只存储 access_token（无 refresh_token），
// 无法调用 Supabase 的 signOut API（需要完整的 session）。
// 直接返回成功，access_token 会在过期后自动失效。
export async function signOutWithToken(token: string) {
  // 可选：验证 token 是否有效（如果需要的话）
  // const { error } = await supabase.auth.getUser(token);
  // if (error) return { error };

  // 由于只有 access_token，无法调用 signOut()
  // token 会在过期后自动失效，清除 cookie 即可
  return { error: null }
}

// 邮箱验证回调，交换 session
export async function exchangeCodeForSession(code: string) {
  return supabase.auth.exchangeCodeForSession(code)
}

// OAuth 登录（GitHub, Google 等）
export type OAuthProvider = 'github' | 'google'

/**
 * OAuth 登入 - 返回 OAuth URL
 * 注意：由于 Next.js 15+ 的 cookies API 与 @supabase/ssr 在 API Route 中存在兼容性问题，
 * 我们使用直接 URL 返回的方式，让前端处理跳转。
 * PKCE code verifier 会在 OAuth 流程中由 Supabase 自动处理。
 */
export async function signInWithOAuth(
  provider: OAuthProvider,
  redirectTo: string,
) {
  // 生成 OAuth URL
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo,
      skipBrowserRedirect: true,
    },
  })

  if (error) {
    return { error }
  }

  // data.url 包含 GitHub/Google 的 OAuth 授权 URL
  return { data, error: null }
}
