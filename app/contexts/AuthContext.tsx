'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react';

interface User {
  id: string;
  email: string;
  name: string;
}

type OAuthProvider = 'github' | 'google';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signInWithOAuth: (provider: OAuthProvider) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
  setUser: (user: User | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 初始化时从 cookie 验证会话，并处理 OAuth implicit flow 回调
  useEffect(() => {
    const initAuth = async () => {
      try {
        // 检查 URL hash 中是否有 OAuth implicit flow 的 token
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const error = hashParams.get('error');
        const errorDescription = hashParams.get('error_description');

        // 处理 OAuth 错误
        if (error) {
          console.error('OAuth 错误:', error, errorDescription);
          // 清除 URL 中的错误参数
          window.history.replaceState({}, '', window.location.pathname);
          setIsLoading(false);
          return;
        }

        // 处理 OAuth implicit flow 回调
        if (accessToken) {
          // 设置 access_token 到 cookie
          document.cookie = `sb-access-token=${accessToken}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=lax`;

          // 清除 URL 中的 hash 参数
          window.history.replaceState({}, '', window.location.pathname);

          // 获取用户信息
          const response = await fetch('/api/auth/session');
          if (response.ok) {
            const data = await response.json();
            setUser(data.user);
          }
          setIsLoading(false);
          return;
        }

        // Cookie 由浏览器自动携带，直接调用 API 验证
        const response = await fetch('/api/auth/session');

        if (response.ok) {
          const data = await response.json();
          setUser(data.user);
        }
      } catch (error) {
        console.error('初始化认证失败:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  // 登录
  const signIn = async (email: string, password: string) => {
    const response = await fetch('/api/auth/signin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || '登录失败');
    }

    const data = await response.json();
    // Cookie 由后端设置，浏览器自动管理
    setUser(data.user);
  };

  // 注册
  const signUp = async (email: string, password: string, name: string) => {
    const response = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name }),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || '注册失败');
    }

    const data = await response.json();

    // 如果注册成功并自动登录（不需要邮箱验证）
    if (data.session) {
      // Cookie 由后端设置
      setUser({
        id: data.user.id,
        email: data.user.email,
        name: data.user.user_metadata?.name || name,
      });
    }
  };

  // 登出
  const signOut = async () => {
    try {
      await fetch('/api/auth/signout', {
        method: 'POST',
      });
    } catch (error) {
      console.error('登出失败:', error);
    } finally {
      // 后端会清除 cookie
      setUser(null);
    }
  };

  // 刷新用户信息
  const refreshUser = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/session');
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      }
    } catch (error) {
      console.error('刷新用户信息失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // OAuth 登录（重定向模式）
  const signInWithOAuth = async (provider: OAuthProvider) => {
    // 动态导入 Supabase 客户端以避免 SSR 问题
    const { createClient } = await import('@supabase/supabase-js');

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!;

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        flowType: 'implicit', // 使用 implicit flow，避免 PKCE 在服务端验证问题
      },
    });

    // 获取当前 origin 来构建回调 URL
    const origin = window.location.origin;
    const redirectTo = `${origin}/api/auth/callback`;

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo,
        skipBrowserRedirect: true,
      },
    });

    if (error) {
      throw new Error(error.message || 'OAuth 登录失败');
    }

    // 重定向到 OAuth 提供商
    if (data.url) {
      window.location.href = data.url;
    }
  };

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    signIn,
    signUp,
    signInWithOAuth,
    signOut,
    refreshUser,
    setUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// 自定义 Hook
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth 必须在 AuthProvider 内部使用');
  }
  return context;
}
