import {
  getUserByToken,
  signInWithPassword,
  signUpWithEmail,
  signOutWithToken,
  exchangeCodeForSession,
  signInWithOAuth,
  type OAuthProvider,
} from '@/app/database';

export class AuthService {
  // 查询当前 token 对应的用户信息
  async getUserByToken(token: string) {
    return getUserByToken(token);
  }

  // 邮箱 + 密码登录
  async signIn(email: string, password: string) {
    return signInWithPassword(email, password);
  }

  // 邮箱注册并写入用户 metadata
  async signUp(email: string, password: string, name: string, redirectTo: string) {
    return signUpWithEmail(email, password, name, redirectTo);
  }

  // 使用 access_token 执行登出
  async signOut(token: string) {
    return signOutWithToken(token);
  }

  // 邮箱验证回调，交换 session
  async exchangeCodeForSession(code: string) {
    return exchangeCodeForSession(code);
  }

  // OAuth 登录（重定向模式）
  async signInWithOAuth(provider: OAuthProvider, redirectTo: string) {
    return signInWithOAuth(provider, redirectTo);
  }
}

export const authService = new AuthService();
export type { OAuthProvider };
