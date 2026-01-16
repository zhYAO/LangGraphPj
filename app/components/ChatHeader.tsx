import { Bell, GitBranch } from 'lucide-react';

/**
 * 聊天页面头部导航栏组件
 */
export default function ChatHeader() {
  return (
    <header className='h-16 flex items-center justify-between px-8 z-50 w-full mb-0 bg-transparent border-b-0 shadow-none sticky top-0'>
      {/* 左侧：应用标识 */}
      <div className='flex items-center gap-3'></div>

      {/* 右侧：用户信息和功能图标 */}
      <div className='flex items-center gap-5 text-slate-400 text-sm'>

        {/* 功能图标 */}
        <button
          className='hover:text-white transition p-2 rounded-lg hover:bg-white/5'
          title='通知'
        >
          <Bell className='w-4 h-4' />
        </button>
        <button
          className='hover:text-white transition p-2 rounded-lg hover:bg-white/5'
          title='分支'
        >
          <GitBranch className='w-4 h-4' />
        </button>
      </div>
    </header>
  );
}
