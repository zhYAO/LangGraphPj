/**
 * Code Preview Panel 组件
 *
 * 负责在 iframe 沙箱中执行 React 代码
 * 使用 Babel Standalone 转译 JSX
 */

'use client';

import { useRef, useEffect, useCallback, useState } from 'react';
import { AlertCircle } from 'lucide-react';
import type { CanvasArtifact, CanvasStatus } from '../../canvas/canvas-types';

interface CodePreviewPanelProps {
  code: string;
  artifact: CanvasArtifact;
  activeTab: 'preview' | 'console' | 'error';
  consoleOutput: string[];
  executionError: string;
  onStatusChange: (status: CanvasStatus) => void;
  onConsoleOutput: (logs: string[]) => void;
  onError: (error: string) => void;
}

/**
 * 生成 iframe HTML 模板
 */
function generateIframeHTML(code: string, icons: string[] = []): string {
  // 创建 lucide 图标的 React 组件代码（直接使用 lucide UMD）
  const iconComponents =
    icons.length > 0
      ? `
    // Lucide 图标组件
    ${icons
      .map((iconName) => {
        return `const ${iconName} = ({ size = 24, color = 'currentColor', strokeWidth = 2, className = '', ...props }) => {
      const iconDef = window.lucide?.icons?.['${iconName}'] || null;
      if (!iconDef) {
        throw new Error('Lucide icon not found: ${iconName}');
      }
      const svgNode = window.lucide.createElement(iconDef, {
        width: size,
        height: size,
        stroke: color,
        'stroke-width': strokeWidth,
        class: 'lucide lucide-${iconName.toLowerCase()} ' + className
      });
      const svg = svgNode.outerHTML;
      return React.createElement('span', {
        ...props,
        className: className,
        dangerouslySetInnerHTML: { __html: svg }
      });
    };`;
      })
      .join('\n    ')}
  `
      : '';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">

  <!-- React 核心库 -->
  <script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
  <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
  <script src="https://unpkg.com/lucide@latest/dist/umd/lucide.min.js"></script>

  <!-- Babel Standalone (JSX 转译) -->
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>

  <!-- TailwindCSS CDN -->
  <script src="https://cdn.tailwindcss.com"></script>

  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body {
      height: 100%;
      overflow: auto;
    }
    body {
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: transparent;
    }
    #root {
      width: 100%;
      height: 100%;
      min-height: 100%;
    }
  </style>
</head>
<body>
  <div id="root"></div>

  <script type="text/babel">
    // 解构 React hooks
    const { useState, useEffect, useRef, useMemo, useCallback } = React;

    // 劫持 console
    const consoleMethods = ['log', 'info', 'warn', 'error'];
    const originalConsole = {};
    consoleMethods.forEach(method => {
      originalConsole[method] = console[method];
    });

    // 发送控制台消息到父窗口
    function sendConsoleMessage(level, args) {
      const formattedArgs = args.map(arg => {
        if (typeof arg === 'object') {
          try {
            return JSON.stringify(arg, null, 2);
          } catch (e) {
            return String(arg);
          }
        }
        return String(arg);
      });

      window.parent.postMessage({
        type: 'canvas:console',
        level,
        message: formattedArgs.join(' ')
      }, '*');
    }

    consoleMethods.forEach(level => {
      console[level] = (...args) => {
        originalConsole[level](...args);
        sendConsoleMessage(level, args);
      };
    });

    // 错误捕获
    window.onerror = (msg, url, line, col, error) => {
      window.parent.postMessage({
        type: 'canvas:error',
        error: String(msg),
        stack: error?.stack || '',
        line: line,
        col: col
      }, '*');
      return true;
    };

    // Promise rejection 捕获
    window.onunhandledrejection = (event) => {
      window.parent.postMessage({
        type: 'canvas:error',
        error: String(event.reason?.message || event.reason),
        stack: event.reason?.stack || ''
      }, '*');
    };

    // 图标组件
    ${iconComponents}

    // 用户代码处理
    try {
      // 原始用户代码
      const originalCode = ${JSON.stringify(code)};

      // 替换 export default 为 window.UserComponent
      const userCode = originalCode.replace(/export default/g, 'window.UserComponent =');

      // 检查是否有 UserComponent 被定义
      if (!userCode.includes('window.UserComponent')) {
        throw new Error('代码必须包含 "export default" 语句');
      }

      // 使用 Babel 转译代码
      const transformedCode = Babel.transform(userCode, {
        presets: ['react'],
        filename: 'user-component.jsx'
      }).code;

      // 执行转译后的代码
      eval(transformedCode);

      // 检查 UserComponent 是否成功定义
      if (typeof window.UserComponent !== 'function') {
        throw new Error('UserComponent 未能正确定义');
      }

      // 包装组件，在渲染完成后通知父窗口
      const WrappedComponent = () => {
        useEffect(() => {
          // 延迟发送 ready 消息，确保组件已完全渲染
          setTimeout(() => {
            window.parent.postMessage({ type: 'canvas:ready' }, '*');
          }, 100);
        }, []);

        return React.createElement(window.UserComponent);
      };

      // 渲染逻辑
      const root = ReactDOM.createRoot(document.getElementById('root'));
      root.render(React.createElement(WrappedComponent));
    } catch (error) {
      // 代码执行出错，发送错误消息到父窗口
      window.parent.postMessage({
        type: 'canvas:error',
        error: String(error.message || error),
        stack: error?.stack || ''
      }, '*');
    }
  </script>
</body>
</html>`;
}

/**
 * 提取 lucide-react 导入并清理代码
 */
function sanitizeCode(code: string): { sanitized: string; icons: string[] } {
  const icons: string[] = [];

  // 保留原始代码，不去除空白
  let sanitized = code;

  // 提取 lucide-react 导入的图标名称
  const lucideImportMatch = sanitized.match(
    /import\s*\{([^}]+)\}\s+from\s+['"]lucide-react['"];?/
  );
  if (lucideImportMatch) {
    const importedIcons = lucideImportMatch[1]
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    icons.push(...importedIcons);
  }

  // 移除 import React 语句
  sanitized = sanitized.replace(
    /import\s+React\s*,?\s*\{[^}]*\}\s+from\s+['"]react['"];\s*/g,
    ''
  );
  // 移除其他 lucide-react import
  sanitized = sanitized.replace(
    /import\s*\{[^}]*\}\s+from\s+['"]lucide-react['"];\s*/g,
    ''
  );

  return { sanitized, icons };
}

export function CodePreviewPanel({
  code,
  artifact,
  activeTab,
  consoleOutput,
  executionError,
  onStatusChange,
  onConsoleOutput,
  onError,
}: CodePreviewPanelProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [isReady, setIsReady] = useState(false);

  // 监听来自 iframe 的消息
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // 安全检查：实际项目中应该验证 event.origin
      const data = event.data;

      if (data.type === 'canvas:ready') {
        // 清除超时定时器
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
        setIsReady(true);
        onStatusChange('ready');
      } else if (data.type === 'canvas:console') {
        const newLogs = [...consoleOutput, `[${data.level}] ${data.message}`];
        onConsoleOutput(newLogs.slice(-50)); // 保留最近 50 条
      } else if (data.type === 'canvas:error') {
        onStatusChange('error');
        onError(data.error);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [consoleOutput, onStatusChange, onConsoleOutput, onError]);

  // 更新 iframe 内容
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    // 如果还在流式传输中，不执行代码
    if (artifact.isStreaming) {
      onStatusChange('streaming');
      return;
    }

    // 检查代码是否包含 export default（避免执行不完整的代码）
    if (!code.includes('export default')) {
      onStatusChange('streaming');
      return;
    }

    // 清除之前的超时
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    setIsReady(false);
    onStatusChange('executing');

    const { sanitized: sanitizedCode, icons } = sanitizeCode(code);
    const html = generateIframeHTML(sanitizedCode, icons);

    iframe.srcdoc = html;

    // 超时检测
    timeoutRef.current = setTimeout(() => {
      onStatusChange('error');
      onError('代码执行超时（5秒），可能存在无限循环或语法错误');
    }, 5000);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [code, reloadKey, artifact.id, artifact.isStreaming, onStatusChange, onError]); // eslint-disable-line react-hooks/exhaustive-deps

  // 处理重新加载
  const handleReload = useCallback(() => {
    setReloadKey((prev) => prev + 1);
    onConsoleOutput([]);
    onError('');
  }, [onConsoleOutput, onError]);

  // 获取控制台日志样式类名
  const getLogClassName = (log: string): string => {
    let classes = 'py-1 px-2 rounded text-xs font-mono break-all ';
    if (log.startsWith('[error]')) return classes + 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 my-1';
    if (log.startsWith('[warn]')) return classes + 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-100 dark:border-yellow-900/30 my-1';
    if (log.startsWith('[info]')) return classes + 'text-blue-600 dark:text-blue-400';
    return classes + 'text-slate-600 dark:text-slate-400 border-b border-black/5 dark:border-white/5 last:border-0';
  };

  // 渲染预览内容
  const renderContent = () => {
    if (activeTab === 'preview') {
      return (
        <div className='flex-1 relative bg-white dark:bg-black w-full h-full'>
          <iframe
            key={`${artifact.id}-${reloadKey}`}
            ref={iframeRef}
            sandbox='allow-scripts allow-same-origin allow-modals'
            className='w-full h-full border-0 block'
            title='Canvas Preview'
          />
          {/* 加载状态 - Apple 风格加载指示器 */}
          {!isReady && (
            <div className='absolute inset-0 flex items-center justify-center bg-white/50 dark:bg-black/50 backdrop-blur-sm transition-opacity duration-300'>
              <div className='flex flex-col items-center gap-3 p-4 rounded-2xl bg-white/80 dark:bg-[#2c2c2e]/80 backdrop-blur-xl shadow-xl border border-black/5 dark:border-white/10'>
                <div className='w-6 h-6 border-2 border-slate-300 dark:border-slate-600 border-t-blue-500 rounded-full animate-spin' />
                <span className='text-xs font-medium text-slate-600 dark:text-slate-300'>正在渲染...</span>
              </div>
            </div>
          )}
        </div>
      );
    }

    if (activeTab === 'console') {
      return (
        <div className='flex-1 bg-[#f5f5f7] dark:bg-[#1e1e1e] p-4 overflow-auto'>
          {consoleOutput.length === 0 ? (
            <div className='flex flex-col items-center justify-center h-full text-slate-400 dark:text-slate-500 gap-2'>
              <div className='w-12 h-12 rounded-xl bg-black/5 dark:bg-white/5 flex items-center justify-center'>
                <span className='text-xl'>⌨️</span>
              </div>
              <span className='text-sm font-medium'>暂无控制台输出</span>
            </div>
          ) : (
            <div className='flex flex-col gap-0.5'>
              {consoleOutput.map((log, index) => (
                <div key={index} className={getLogClassName(log)}>
                  {log}
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    if (activeTab === 'error') {
      return (
        <div className='flex-1 bg-red-50/50 dark:bg-red-900/10 p-6 overflow-auto flex items-center justify-center'>
          <div className='w-full max-w-lg bg-white dark:bg-[#2c2c2e] rounded-2xl shadow-xl border border-red-100 dark:border-red-900/30 overflow-hidden'>
            <div className='p-6'>
              <div className='flex items-center gap-3 mb-4'>
                <div className='w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0'>
                  <AlertCircle className='w-5 h-5 text-red-600 dark:text-red-400' />
                </div>
                <div>
                  <h3 className='font-semibold text-slate-900 dark:text-slate-100'>执行错误</h3>
                  <p className='text-xs text-slate-500 dark:text-slate-400'>代码执行过程中发生了异常</p>
                </div>
              </div>
              
              <div className='bg-red-50 dark:bg-black/30 rounded-xl p-4 border border-red-100 dark:border-red-900/20 overflow-auto max-h-60'>
                <pre className='text-xs font-mono text-red-700 dark:text-red-300 whitespace-pre-wrap break-all leading-relaxed'>
                  {executionError}
                </pre>
              </div>
            </div>
            
            <div className='px-6 py-4 bg-slate-50 dark:bg-black/20 border-t border-slate-100 dark:border-white/5 flex justify-end'>
              <button
                onClick={handleReload}
                className='px-4 py-2 bg-white dark:bg-[#3a3a3c] text-slate-900 dark:text-white text-sm font-medium rounded-lg shadow-sm border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-[#48484a] active:scale-95 transition-all duration-200'
              >
                重新加载
              </button>
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div className='flex-1 flex flex-col overflow-hidden h-full'>
      {renderContent()}
    </div>
  );
}
