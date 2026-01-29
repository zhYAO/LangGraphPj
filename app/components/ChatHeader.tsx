import { Bell, Settings, Share2, MoreHorizontal } from 'lucide-react';

/**
 * 聊天页面头部导航栏组件
 */
export default function ChatHeader() {
  return (
    <header className="h-20 shrink-0 border-b border-white/20 flex items-center justify-between px-6 md:px-8 bg-white/20 backdrop-blur-md sticky top-0 z-20">
      {/* 左侧：应用标识或面包屑 */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1 bg-white/40 hover:bg-white/60 px-3 py-1.5 rounded-xl transition-all cursor-pointer group border border-white/20 shadow-sm">
          <span className="text-sm font-semibold text-gray-700">AI Studio</span>
          <span className="text-gray-400 group-hover:text-gray-600">
            <MoreHorizontal size={14} />
          </span>
        </div>
      </div>

      {/* 右侧：功能图标 */}
      <div className="flex items-center gap-2 md:gap-4">
        <button
          className="p-2.5 text-gray-500 hover:text-gray-800 hover:bg-white/40 rounded-xl transition-all"
          title="分享"
        >
          <Share2 size={18} />
        </button>
        <button
          className="p-2.5 text-gray-500 hover:text-gray-800 hover:bg-white/40 rounded-xl transition-all"
          title="通知"
        >
          <Bell size={18} />
        </button>
        <button
          className="p-2.5 text-gray-500 hover:text-gray-800 hover:bg-white/40 rounded-xl transition-all"
          title="设置"
        >
          <Settings size={18} />
        </button>
      </div>
    </header>
  );
}
