'use client';

import React from 'react';
import { Video, Download, Clock, Monitor, Loader2 } from 'lucide-react';

interface VideoCardProps {
  status: 'loading' | 'ready';
  src?: string;
  download?: string;
  duration?: string;
  resolution?: string;
  prompt?: string;
}

export function VideoCard({
  status,
  src,
  download,
  duration,
  resolution,
  prompt,
}: VideoCardProps) {
  if (status === 'loading') {
    return (
      <div className="video-card my-3 w-full max-w-full overflow-hidden rounded-xl border border-black/5 bg-white/40 p-4 shadow-sm backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-purple-600 to-pink-600 text-white shadow-sm ring-1 ring-black/5">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
          <div className="flex-1 min-w-0 overflow-hidden">
            <div className="flex items-center gap-2">
              <h3 className="font-medium text-gray-700">视频生成中...</h3>
              <div className="h-2 w-2 flex-shrink-0 animate-pulse rounded-full bg-purple-400" />
            </div>
            <p className="mt-0.5 max-w-full truncate text-sm text-gray-500">
              {prompt || '正在生成视频，请稍候（约 2-5 分钟）'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="video-card group my-3 w-full overflow-hidden rounded-xl border border-black/5 bg-white/40 shadow-sm backdrop-blur-sm transition-all duration-200 hover:bg-white/50 hover:shadow-md">
      <div className="relative overflow-hidden bg-gray-100">
        <video
          controls
          preload="metadata"
          className="max-h-[400px] w-full bg-black"
          src={src}
        >
          您的浏览器不支持视频播放
        </video>
      </div>

      <div className="flex items-center justify-between border-t border-black/5 bg-white/30 p-3">
        <div className="flex items-center gap-4 text-sm text-gray-500">
          <div className="flex items-center gap-1.5">
            <Video className="h-4 w-4" />
            <span>视频</span>
          </div>
          {duration && (
            <div className="flex items-center gap-1.5">
              <Clock className="h-4 w-4" />
              <span>{duration}s</span>
            </div>
          )}
          {resolution && (
            <div className="flex items-center gap-1.5">
              <Monitor className="h-4 w-4" />
              <span>{resolution}</span>
            </div>
          )}
        </div>

        {download && (
          <a
            href={download}
            download
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 rounded-lg bg-blue-50 px-3 py-1.5 text-sm text-blue-600 transition-colors hover:bg-blue-100"
          >
            <Download className="h-4 w-4" />
            <span>下载</span>
          </a>
        )}
      </div>
    </div>
  );
}

export function VideoCardSkeleton() {
  return (
    <div className="video-card-skeleton my-3 w-full rounded-xl border border-black/5 bg-white/40 p-4 shadow-sm backdrop-blur-sm">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 animate-pulse rounded-full bg-gray-200" />
        <div className="flex-1">
          <div className="mb-2 h-4 w-3/4 animate-pulse rounded bg-gray-200" />
          <div className="h-3 w-1/2 animate-pulse rounded bg-gray-200" />
        </div>
      </div>
    </div>
  );
}
