/**
 * Canvas Title Card 组件
 *
 * 在聊天框中显示的 Artifact 标题卡片
 * 点击后可以在右侧编辑器打开完整代码
 */

'use client';

import React from 'react';
import { FileCode, ChevronRight, ExternalLink } from 'lucide-react';
import type { CanvasArtifact } from '../../canvas/canvas-types';

interface CanvasTitleCardProps {
  artifact: CanvasArtifact;
  onOpen: (artifactId: string) => void;
}

export function CanvasTitleCard({ artifact, onOpen }: CanvasTitleCardProps) {
  const handleClick = () => {
    onOpen(artifact.id);
  };

  const handleOpenInNewTab = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(`/artifact/${artifact.id}`, '_blank');
  };

  return (
    <div
      className="canvas-title-card my-3 p-4 bg-white/5 border border-white/5 rounded-2xl cursor-pointer hover:bg-white/10 hover:border-white/10 transition-all duration-200 group w-full"
      onClick={handleClick}
    >
      <div className="flex items-center gap-3">
        {/* 图标 */}
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-purple-500/20 group-hover:opacity-90 transition-opacity">
          <FileCode className="w-5 h-5" />
        </div>

        {/* 标题和版本 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-slate-100 truncate">
              {artifact.title}
            </h3>
            {artifact.currentVersion > 1 && (
              <span className="px-2 py-0.5 text-xs bg-blue-600/30 text-blue-300 rounded-full border border-blue-500/30">
                v{artifact.currentVersion}
              </span>
            )}
          </div>
          <p className="text-sm text-slate-500 mt-0.5">
            React 组件 · {artifact.code.language}
          </p>
        </div>

        {/* 状态指示和操作按钮 */}
        <div className="flex items-center gap-2">
          {/* 独立页面按钮 */}
          {!artifact.isStreaming && (
            <button
              onClick={handleOpenInNewTab}
              className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
              title="在新标签页打开"
            >
              <ExternalLink className="w-4 h-4 text-slate-500 hover:text-blue-300" />
            </button>
          )}
          {artifact.isStreaming ? (
            <div className="flex items-center gap-1 text-blue-300">
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
              <span className="text-xs text-blue-300">生成中</span>
            </div>
          ) : (
            <span className="text-xs text-slate-500 group-hover:text-blue-300 transition-colors flex items-center gap-1">
              点击查看 <ChevronRight className="w-3 h-3" />
            </span>
          )}
        </div>
      </div>

    </div>
  );
}

/**
 * 加载状态的 Title Card
 */
export function CanvasTitleCardSkeleton({ title }: { title?: string }) {
  return (
    <div className="canvas-title-card-skeleton my-3 p-4 bg-white/5 rounded-2xl border border-white/5 w-full">
      <div className="flex items-center gap-3">
        {/* 图标骨架 */}
        <div className="w-10 h-10 rounded-lg bg-white/10 animate-pulse" />

        {/* 标题骨架 */}
        <div className="flex-1">
          <div className="h-4 bg-white/10 rounded animate-pulse w-3/4 mb-2" />
          <div className="h-3 bg-white/10 rounded animate-pulse w-1/2" />
        </div>
      </div>
    </div>
  );
}
