'use client';

import { useState } from 'react';
import { Loader2, Mail, Lock, User, Eye, EyeOff, CheckCircle } from 'lucide-react';

type OAuthProvider = 'github' | 'google';

interface AuthFormProps {
  mode: 'signin' | 'signup';
  onModeChange: (mode: 'signin' | 'signup') => void;
  onSuccess: (sessionData?: { user: any }) => void;
  onOAuthLogin?: (provider: OAuthProvider) => Promise<void>;
}

/**
 * 认证表单组件（登录/注册）
 * 采用与聊天界面一致的玻璃态设计风格
 */
export function AuthForm({ mode, onModeChange, onSuccess, onOAuthLogin }: AuthFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [oauthLoading, setOAuthLoading] = useState<OAuthProvider | null>(null);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // 表单状态
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setIsLoading(true);

    try {
      const endpoint = mode === 'signin' ? '/api/auth/signin' : '/api/auth/signup';

      // 注册时需要额外字段
      const body = mode === 'signin'
        ? { email: formData.email, password: formData.password }
        : {
            email: formData.email,
            password: formData.password,
            name: formData.name,
          };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '操作失败');
      }

      // 注册成功，检查是否需要邮箱验证
      if (mode === 'signup' && data.requiresConfirmation) {
        setSuccessMessage(data.message || '注册成功！请查收验证邮件');
        // 不调用 onSuccess，因为需要用户先验证邮箱
        return;
      }

      // 登录成功（注册成功但不需要验证的情况也会走到这里）
      setSuccessMessage(mode === 'signin' ? '登录成功！' : '注册成功！正在跳转...');

      // Cookie 由后端自动设置，无需手动保存

      // 短暂延迟后跳转，让用户看到成功提示
      setTimeout(() => {
        onSuccess({ user: data.user });
      }, 800);
    } catch (err) {
      setError(err instanceof Error ? err.message : '操作失败，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  const isFormValid = () => {
    if (mode === 'signin') {
      return formData.email && formData.password;
    } else {
      return (
        formData.email &&
        formData.password &&
        formData.confirmPassword &&
        formData.name &&
        formData.password === formData.confirmPassword &&
        formData.password.length >= 6
      );
    }
  };

  const handleOAuthLogin = async (provider: OAuthProvider) => {
    if (!onOAuthLogin) return;
    
    setError('');
    setOAuthLoading(provider);
    
    try {
      await onOAuthLogin(provider);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'OAuth 登录失败');
      setOAuthLoading(null);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-[#eef2f5]">
      {/* 背景装饰 - 使用柔和的渐变球 */}
      <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full bg-blue-400/20 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-5%] w-[500px] h-[500px] rounded-full bg-purple-400/20 blur-[100px] pointer-events-none" />

      {/* 主容器 */}
      <div className="relative z-10 w-full max-w-md px-6">
        {/* 玻璃态卡片 */}
        <div className="bg-white/40 backdrop-blur-2xl border border-white/60 shadow-xl rounded-[20px] p-8">
          {/* 标题 */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2 text-gray-900">
              AI Chat
            </h1>
            <p className="text-gray-500 text-sm">
              {mode === 'signin' ? '欢迎回来！请登录您的账户' : '创建账户开始使用'}
            </p>
          </div>

          {/* 表单 */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* 注册时显示姓名输入框 */}
            {mode === 'signup' && (
              <div className="space-y-2">
                <label className="text-sm text-gray-700 font-medium block">
                  用户名
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full pl-11 pr-4 py-3 bg-white/50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                    placeholder="请输入用户名"
                    required
                  />
                </div>
              </div>
            )}

            {/* 邮箱输入框 */}
            <div className="space-y-2">
              <label className="text-sm text-gray-700 font-medium block">
                邮箱地址
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full pl-11 pr-4 py-3 bg-white/50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                  placeholder="请输入邮箱"
                  required
                />
              </div>
            </div>

            {/* 密码输入框 */}
            <div className="space-y-2">
              <label className="text-sm text-gray-700 font-medium block">
                密码
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full pl-11 pr-12 py-3 bg-white/50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                  placeholder={mode === 'signup' ? '至少6位字符' : '请输入密码'}
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* 注册时的确认密码 */}
            {mode === 'signup' && (
              <div className="space-y-2">
                <label className="text-sm text-gray-700 font-medium block">
                  确认密码
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    className="w-full pl-11 pr-4 py-3 bg-white/50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                    placeholder="请再次输入密码"
                    required
                  />
                </div>
                {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                  <p className="text-red-500 text-xs mt-1">两次输入的密码不一致</p>
                )}
              </div>
            )}

            {/* 错误提示 */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-600 text-sm flex items-start gap-2">
                <span className="flex-shrink-0">⚠️</span>
                <span>{error}</span>
              </div>
            )}

            {/* 成功提示 */}
            {successMessage && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-green-600 text-sm flex items-start gap-2">
                <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{successMessage}</span>
              </div>
            )}

            {/* 提交按钮 */}
            <button
              type="submit"
              disabled={!isFormValid() || isLoading}
              className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed rounded-xl text-white font-medium transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-blue-500/30 hover:shadow-blue-500/40"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  {mode === 'signin' ? '登录中...' : '注册中...'}
                </>
              ) : (
                <span>{mode === 'signin' ? '登录' : '注册'}</span>
              )}
            </button>
          </form>

          {onOAuthLogin && (
            <>
              <div className="relative flex items-center gap-4 my-6">
                <div className="h-px flex-1 bg-gray-300/50"></div>
                <span className="text-sm text-gray-500">或使用以下方式登录</span>
                <div className="h-px flex-1 bg-gray-300/50"></div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => handleOAuthLogin('github')}
                  disabled={!!oauthLoading}
                  className="flex-1 py-3 px-4 bg-white hover:bg-gray-50 border border-gray-200 rounded-xl text-gray-700 font-medium transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                >
                  {oauthLoading === 'github' ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                    </svg>
                  )}
                  <span>GitHub</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleOAuthLogin('google')}
                  disabled={!!oauthLoading}
                  className="flex-1 py-3 px-4 bg-white hover:bg-gray-50 border border-gray-200 rounded-xl text-gray-700 font-medium transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                >
                  {oauthLoading === 'google' ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                  )}
                  <span>Google</span>
                </button>
              </div>
            </>
          )}

          {/* 切换登录/注册 */}
          <div className="mt-6 text-center text-sm text-gray-500">
            {mode === 'signin' ? (
              <>
                还没有账户？{' '}
                <button
                  type="button"
                  onClick={() => {
                    onModeChange('signup');
                    setError('');
                  }}
                  className="text-blue-600 hover:text-blue-700 font-medium transition-colors"
                >
                  立即注册
                </button>
              </>
            ) : (
              <>
                已有账户？{' '}
                <button
                  type="button"
                  onClick={() => {
                    onModeChange('signin');
                    setError('');
                  }}
                  className="text-blue-600 hover:text-blue-700 font-medium transition-colors"
                >
                  立即登录
                </button>
              </>
            )}
          </div>
        </div>

        {/* 底部说明 */}
        <div className="text-center mt-6 text-xs text-gray-500">
          登录即表示您同意我们的服务条款和隐私政策
        </div>
      </div>
    </div>
  );
}
