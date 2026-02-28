/**
 * Canvas Panel 组件
 *
 * 右侧代码编辑和预览面板
 * 包含代码编辑器和实时预览区域
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { X, Copy, Download, Share, Check, Loader2 } from 'lucide-react';
import type { CanvasArtifact, CanvasStatus } from '../../canvas/canvas-types';
import { CodePreviewPanel } from './CodePreviewPanel';
import { canvasStore } from '../../hooks/useCanvasArtifacts';

interface CanvasPanelProps {
  artifact: CanvasArtifact | null;
  isVisible: boolean;
  onClose: () => void;
  onUpdateCode: (messageId: string, artifactId: string, code: string) => void;
}

export function CanvasPanel({ artifact, isVisible, onClose, onUpdateCode }: CanvasPanelProps) {
  const [code, setCode] = useState('');
  const [activeTab, setActiveTab] = useState<'editor' | 'preview'>('preview');
  const [executionStatus, setExecutionStatus] = useState<CanvasStatus>('ready');
  const [consoleOutput, setConsoleOutput] = useState<string[]>([]);
  const [executionError, setExecutionError] = useState('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');

  // 同步 artifact 代码到编辑器
  useEffect(() => {
    if (artifact?.code?.content) {
      setCode(artifact.code.content);
    }
  }, [artifact]);

  // 当 Canvas 面板打开时，使用 store 中设置的初始标签页
  useEffect(() => {
    if (isVisible) {
      const initialTab = canvasStore.getInitialTab();
      setActiveTab(initialTab);
      // 重置为默认值，避免影响下次打开
      canvasStore.resetInitialTab();
    }
  }, [isVisible]);

  // 根据 artifact 的流式状态自动切换标签页
  useEffect(() => {
    if (!artifact) return;

    if (artifact.isStreaming) {
      // 流式生成中：保持在代码编辑器，实时展示代码更新
      setActiveTab('editor');
    } else if (artifact.status === 'ready') {
      // 生成完成：自动切换到预览页面
      setActiveTab('preview');
    }
  }, [artifact?.isStreaming, artifact?.status]);

  // 处理代码变更
  const handleCodeChange = useCallback((newCode: string) => {
    setCode(newCode);
    if (artifact) {
      onUpdateCode(artifact.messageId, artifact.id, newCode);
    }
  }, [artifact, onUpdateCode]);

  // 处理执行状态变化
  const handleStatusChange = useCallback((status: CanvasStatus) => {
    setExecutionStatus(status);
  }, []);

  // 处理控制台输出
  const handleConsoleOutput = useCallback((logs: string[]) => {
    setConsoleOutput(logs);
  }, []);

  // 处理执行错误
  const handleError = useCallback((error: string) => {
    setExecutionError(error);
    // 有错误时自动切换到预览页面查看错误
    setActiveTab('preview');
  }, []);

  // 复制代码
  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(code).then(() => {
      // 可以添加 toast 提示
    });
  }, [code]);

  // 下载代码
  const handleDownload = useCallback(() => {
    if (!artifact) return;
    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${artifact.id}.jsx`;
    a.click();
    URL.revokeObjectURL(url);
  }, [artifact, code]);

  // 保存到数据库
  const handleSave = useCallback(async () => {
    if (!artifact) {
      return;
    }

    setSaveStatus('saving');
    try {
      // 从 localStorage 获取认证 token
      const token = localStorage.getItem('auth_token');

      const requestBody = {
        id: artifact.id,
        messageId: artifact.messageId,
        sessionId: artifact.sessionId,
        title: artifact.title,
        type: artifact.type,
        codeContent: code,
        codeLanguage: artifact.code.language,
        status: artifact.status,
        currentVersion: artifact.currentVersion,
      };

      const response = await fetch('/api/artifacts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ 保存 artifact 失败:', errorText);
        setSaveStatus('error');
        // 2秒后重置状态
        setTimeout(() => setSaveStatus('idle'), 2000);
        return;
      }

      const result = await response.json();

      setSaveStatus('success');
      // 2秒后重置状态
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) {
      console.error('❌ 保存 artifact 到数据库时出错:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 2000);
    }
  }, [artifact, code]);

  // ESC 键关闭
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isVisible) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isVisible, onClose]);

  if (!isVisible || !artifact) {
    return null;
  }

  // 左右分栏布局
  const panelClasses = `
    flex flex-col h-full w-full
    bg-white/80 dark:bg-[#1c1c1e]/80 backdrop-blur-xl
    border-l border-black/5 dark:border-white/10
    shadow-2xl
  `;

  // Segmented Control 风格的 Tab 按钮
  const tabContainerClasses = `
    flex p-1 gap-1
    bg-black/5 dark:bg-white/10
    rounded-lg
  `;

  const tabButtonClasses = (isActive: boolean) => `
    px-3 py-1 text-xs font-medium rounded-md transition-all duration-200
    ${isActive
      ? 'bg-white dark:bg-[#636366] text-black dark:text-white shadow-sm'
      : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
    }
  `;

  // 编辑器样式 - 类似 Xcode 或 VS Code 的简洁风格
  const textareaClasses = `
    flex-1 w-full h-full p-4 font-mono text-sm leading-relaxed
    bg-[#f5f5f7] dark:bg-[#1e1e1e] 
    text-slate-800 dark:text-slate-200
    resize-none focus:outline-none
    whitespace-pre overflow-auto
    selection:bg-blue-500/30
  `;

  // 通用按钮样式
  const actionButtonClasses = `
    p-2 rounded-lg transition-all duration-200
    hover:bg-black/5 dark:hover:bg-white/10
    active:scale-95
    text-slate-500 dark:text-slate-400
  `;

  return (
    <div className={panelClasses}>
      {/* 头部 - 类似 macOS 窗口标题栏 */}
      <div className="flex items-center justify-between px-4 h-14 border-b border-black/5 dark:border-white/10 bg-white/50 dark:bg-[#2c2c2e]/50 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
            <span className="text-sm">📦</span>
          </div>
          <div className="flex flex-col justify-center">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 leading-tight">
              {artifact.title}
            </h2>
            <div className="flex items-center gap-1.5 text-[10px] text-slate-500 dark:text-slate-400 font-medium">
              <span className="bg-black/5 dark:bg-white/10 px-1.5 py-0.5 rounded text-xs">v{artifact.currentVersion}</span>
              <span>{artifact.code.language}</span>
              <span>•</span>
              <span>{code.split('\n').length} 行</span>
            </div>
          </div>
        </div>
        <button
          onClick={onClose}
          className={actionButtonClasses}
          aria-label="关闭"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* 工具栏 - 类似 Safari 或 Finder 工具栏 */}
      <div className="flex items-center justify-between px-4 h-12 border-b border-black/5 dark:border-white/10 bg-[#f5f5f7]/50 dark:bg-[#1c1c1e]/50 backdrop-blur-sm">
        <div className={tabContainerClasses}>
          <button
            onClick={() => setActiveTab('editor')}
            className={tabButtonClasses(activeTab === 'editor')}
          >
            代码编辑器
          </button>
          <button
            onClick={() => setActiveTab('preview')}
            className={tabButtonClasses(activeTab === 'preview')}
          >
            实时预览
          </button>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleSave}
            disabled={saveStatus === 'saving'}
            className={`
              flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200
              ${saveStatus === 'success'
                ? 'bg-green-500 text-white shadow-sm shadow-green-500/20'
                : saveStatus === 'error'
                ? 'bg-red-500 text-white shadow-sm shadow-red-500/20'
                : saveStatus === 'saving'
                ? 'bg-slate-100 dark:bg-white/10 text-slate-400 cursor-not-allowed'
                : 'bg-white dark:bg-white/10 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/20 shadow-sm border border-black/5 dark:border-white/5'
              }
              active:scale-95
            `}
            title="保存到数据库"
          >
            {saveStatus === 'saving' ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : saveStatus === 'success' ? (
              <Check className="w-3.5 h-3.5" />
            ) : (
              <Share className="w-3.5 h-3.5" />
            )}
            <span>
              {saveStatus === 'saving' ? '保存中...' : saveStatus === 'success' ? '已保存' : saveStatus === 'error' ? '失败' : '保存'}
            </span>
          </button>
          <div className="w-px h-4 bg-black/10 dark:bg-white/10 mx-1" />
          <button
            onClick={handleCopy}
            className={actionButtonClasses}
            title="复制代码"
          >
            <Copy className="w-4 h-4" />
          </button>
          <button
            onClick={handleDownload}
            className={actionButtonClasses}
            title="下载代码"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 内容区域 */}
      <div className="flex-1 overflow-hidden relative">
        {activeTab === 'editor' ? (
          <textarea
            value={code}
            onChange={(e) => handleCodeChange(e.target.value)}
            className={textareaClasses}
            spellCheck={false}
            placeholder="// 在这里编辑代码..."
          />
        ) : (
          <CodePreviewPanel
            code={code}
            artifact={artifact}
            activeTab={executionError ? 'error' : consoleOutput.length > 0 ? 'console' : 'preview'}
            consoleOutput={consoleOutput}
            executionError={executionError}
            onStatusChange={handleStatusChange}
            onConsoleOutput={handleConsoleOutput}
            onError={handleError}
          />
        )}
      </div>
    </div>
  );
}
