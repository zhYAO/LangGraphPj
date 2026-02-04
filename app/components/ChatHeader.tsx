import { Bell, Settings, Share2, MoreHorizontal } from 'lucide-react'

/**
 * 聊天页面头部导航栏组件
 */
export default function ChatHeader() {
  return (
    <header className="sticky top-0 z-20 flex h-20 shrink-0 items-center justify-between border-b border-white/20 bg-white/20 px-6 backdrop-blur-md md:px-8">
      {/* 左侧：应用标识或面包屑 */}
      <div className="flex items-center gap-3">
        <div className="group flex cursor-pointer items-center gap-1 rounded-xl border border-white/20 bg-white/40 px-3 py-1.5 shadow-sm transition-all hover:bg-white/60">
          <span className="text-sm font-semibold text-gray-700">AI Studio</span>
          <span className="text-gray-400 group-hover:text-gray-600">
            <MoreHorizontal size={14} />
          </span>
        </div>
      </div>

      {/* 右侧：功能图标 */}
      <div className="flex items-center gap-2 md:gap-4">
        <button
          className="rounded-xl p-2.5 text-gray-500 transition-all hover:bg-white/40 hover:text-gray-800"
          title="分享"
        >
          <Share2 size={18} />
        </button>
        <button
          className="rounded-xl p-2.5 text-gray-500 transition-all hover:bg-white/40 hover:text-gray-800"
          title="通知"
        >
          <Bell size={18} />
        </button>
        <button
          className="rounded-xl p-2.5 text-gray-500 transition-all hover:bg-white/40 hover:text-gray-800"
          title="设置"
        >
          <Settings size={18} />
        </button>
      </div>
    </header>
  )
}
