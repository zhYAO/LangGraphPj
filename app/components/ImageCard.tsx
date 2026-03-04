'use client';

import React from 'react';
import { Image as ImageIcon, Download, Maximize2, Loader2, Monitor } from 'lucide-react';

interface ImageCardProps {
  status: 'loading' | 'ready';
  src?: string;
  download?: string;
  alt?: string;
  width?: number;
  height?: number;
  prompt?: string;
  aspectRatio?: string;
}

export function ImageCard({
  status,
  src,
  download,
  alt,
  prompt,
  aspectRatio
}: ImageCardProps) {
  const [isZoomed, setIsZoomed] = React.useState(false);

  if (status === 'loading') {
    return (
      <div className="image-card my-3 w-full max-w-full overflow-hidden rounded-xl border border-black/5 bg-white/40 p-4 shadow-sm backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 text-white shadow-sm ring-1 ring-black/5">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
          <div className="flex-1 min-w-0 overflow-hidden">
            <div className="flex items-center gap-2">
              <h3 className="font-medium text-gray-700">图片生成中...</h3>
              <div className="h-2 w-2 flex-shrink-0 animate-pulse rounded-full bg-blue-400" />
            </div>
            <p className="mt-0.5 max-w-full truncate text-sm text-gray-500">
              {prompt || '正在绘制画面，请稍候...'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="image-card group my-3 w-full overflow-hidden rounded-xl border border-black/5 bg-white/40 shadow-sm backdrop-blur-sm transition-all duration-200 hover:bg-white/50 hover:shadow-md">
      <div className="relative bg-gray-100">
        <img
          src={src}
          alt={alt || prompt || 'Generated image'}
          className="h-auto w-full object-cover transition-transform duration-700 group-hover:scale-[1.02]"
          loading="lazy"
          onClick={() => setIsZoomed(true)}
        />
        
        <div className="pointer-events-none absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/5" />
        
        {/* <button
          onClick={() => setIsZoomed(true)}
          className="absolute right-3 top-3 rounded-full bg-white/80 p-2 text-gray-700 opacity-0 shadow-sm backdrop-blur-sm transition-all hover:bg-white group-hover:opacity-100"
          title="查看大图"
        >
          <Maximize2 className="h-4 w-4" />
        </button> */}
      </div>

      <div className="flex items-center justify-between border-t border-black/5 bg-white/30 p-3">
        <div className="flex items-center gap-4 text-sm text-gray-500">
          <div className="flex items-center gap-1.5">
            <ImageIcon className="h-4 w-4" />
            <span>AI 绘图</span>
          </div>
          {aspectRatio && (
            <div className="flex items-center gap-1.5">
              <Monitor className="h-4 w-4" />
              <span>{aspectRatio}</span>
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

      {/* {isZoomed && (
        <div 
          className="fixed inset-0 z-50 flex animate-in fade-in items-center justify-center bg-white/90 p-4 backdrop-blur-md duration-200"
          onClick={() => setIsZoomed(false)}
        >
          <div className="relative max-h-[90vh] max-w-[90vw]">
            <img
              src={src}
              alt={alt || prompt}
              className="max-h-[90vh] max-w-full rounded-xl object-contain shadow-2xl ring-1 ring-black/10"
            />
            <p className="mx-auto mt-4 max-w-2xl truncate text-center text-sm text-gray-500">
              {prompt}
            </p>
          </div>
        </div>
      )} */}
    </div>
  );
}
