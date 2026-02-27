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
  console.log("🚀 ~ CanvasPanel ~ artifact:", artifact)
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

  // 左右分栏布局 - 与项目整体 glassmorphism 风格一致
  const panelClasses = `
    flex flex-col h-full w-full
    bg-[#0F172A]/95 backdrop-blur-xl
    border-l border-white/10
  `;

  const tabButtonClasses = (isActive: boolean) => `
    px-3 py-1.5 text-sm rounded-lg transition-colors
    ${isActive
      ? 'bg-blue-600/30 text-blue-300 border border-blue-500/30'
      : 'text-slate-400 hover:bg-white/5'
    }
  `;

  const textareaClasses = `
    flex-1 w-full h-full p-4 font-mono text-sm
    bg-[#1E293B] text-slate-200
    resize-none focus:outline-none
    whitespace-pre overflow-auto
  `;

  return (
    <div className={panelClasses}>
      {/* 头部 */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-[#1E293B]/50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-purple-500/20">
            <span className="text-sm">📦</span>
          </div>
          <div>
            <h2 className="font-semibold text-slate-100">
              {artifact.title}
            </h2>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span>v{artifact.currentVersion}</span>
              <span>·</span>
              <span>{artifact.code.language}</span>
              <span>·</span>
              <span>{code.split('\n').length} 行</span>
            </div>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          aria-label="关闭"
        >
          <X className="w-5 h-5 text-slate-400" />
        </button>
      </div>

      {/* 工具栏 */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/10 bg-[#0F172A]/50">
        <div className="flex items-center gap-2">
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
            className={`p-2 rounded-lg transition-colors flex items-center gap-1.5 ${
              saveStatus === 'success'
                ? 'bg-green-500/20 text-green-400'
                : saveStatus === 'error'
                ? 'bg-red-500/20 text-red-400'
                : saveStatus === 'saving'
                ? 'opacity-50 cursor-not-allowed'
                : 'hover:bg-white/10'
            }`}
            title="保存到数据库"
          >
            {saveStatus === 'saving' ? (
              <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />
            ) : saveStatus === 'success' ? (
              <Check className="w-4 h-4" />
            ) : (
              <Share className="w-4 h-4 text-slate-400" />
            )}
            <span className="text-xs">
              {saveStatus === 'saving' ? '保存中...' : saveStatus === 'success' ? '已保存' : saveStatus === 'error' ? '失败' : '保存'}
            </span>
          </button>
          <button
            onClick={handleCopy}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            title="复制代码"
          >
            <Copy className="w-4 h-4 text-slate-400" />
          </button>
          <button
            onClick={handleDownload}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            title="下载代码"
          >
            <Download className="w-4 h-4 text-slate-400" />
          </button>
        </div>
      </div>

      {/* 内容区域 - 单屏切换 */}
      <div className="flex-1 overflow-hidden">
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
