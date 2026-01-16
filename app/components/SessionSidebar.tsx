import React, { useState } from 'react';
import { Plus, Trash2, Edit2, Zap, User } from 'lucide-react';

/**
 * 会话数据接口
 */
export interface Session {
  id: string;
  name: string;
  created_at: string;
}

/**
 * SessionSidebar 组件属性
 */
interface SessionSidebarProps {
  /** 当前激活的会话 ID */
  currentSessionId: string;
  /** 会话列表数据 */
  sessions: Session[];
  /** 是否正在加载会话列表 */
  isLoading?: boolean;
  /** 是否正在切换会话（加载历史记录） */
  isSwitchingSession?: boolean;
  /** 选择会话的回调 */
  onSelect: (id: string) => void;
  /** 创建新会话的回调 */
  onNew: () => void;
  /** 删除会话的回调 */
  onDelete: (id: string) => void;
  /** 重命名会话的回调 */
  onRename: (id: string, name: string) => void;
}

/**
 * 获取会话标题
 * 如果会话有名称则返回名称,否则返回会话 ID 的前 8 位
 */
function getSessionTitle(session: Session) {
  return session.name || `会话 ${session.id.slice(0, 8)}`;
}

/**
 * 会话侧边栏组件
 *
 * 负责展示会话列表和提供会话操作的 UI:
 * - 显示所有历史会话
 * - 创建新会话
 * - 切换当前会话
 * - 重命名会话
 * - 删除会话
 *
 * 注意: 该组件是纯展示组件,所有数据和业务逻辑由父组件通过 props 传入
 */
export default function SessionSidebar({
  currentSessionId,
  sessions,
  isLoading = false,
  isSwitchingSession = false,
  onSelect,
  onNew,
  onDelete,
  onRename,
}: SessionSidebarProps) {
  // ==================== UI 状态管理 ====================
  // 当前正在编辑的会话 ID
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  // 编辑中的新名称
  const [newSessionName, setNewSessionName] = useState('');

  // ==================== 事件处理 ====================
  /**
   * 处理创建新会话
   */
  function handleNew() {
    onNew();
  }

  /**
   * 处理删除会话
   */
  function handleDelete(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    onDelete(id);
  }

  /**
   * 开始重命名会话
   * 进入编辑模式并设置初始值
   */
  function handleRename(id: string, currentName: string, e: React.MouseEvent) {
    e.stopPropagation();
    setEditingSessionId(id);
    setNewSessionName(currentName);
  }

  /**
   * 保存重命名
   * 调用父组件的 onRename 回调并退出编辑模式
   */
  function saveRename(id: string) {
    if (!newSessionName.trim()) {
      setEditingSessionId(null);
      return;
    }
    onRename(id, newSessionName);
    setEditingSessionId(null);
    setNewSessionName('');
  }

  /**
   * 处理重命名输入框的键盘事件
   * - Enter: 保存
   * - Escape: 取消
   */
  function handleRenameKeyDown(e: React.KeyboardEvent, id: string) {
    if (e.key === 'Enter') {
      saveRename(id);
    } else if (e.key === 'Escape') {
      setEditingSessionId(null);
      setNewSessionName('');
    }
  }

  // ==================== 渲染 UI ====================
  return (
    <aside className='w-64 glass-panel flex flex-col h-full z-20 relative border-r-0 hidden md:flex'>
      {/* Logo */}
      <div className='p-6 flex items-center gap-3'>
        <div className='w-8 h-8 rounded bg-gradient-to-tr from-blue-600 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/20'>
          <Zap className='text-white w-4 h-4' />
        </div>
        <span className='font-bold text-lg tracking-tight text-white'>
          ChatAPP
          <span className='text-blue-400 text-xs align-top ml-1'>AI</span>
        </span>
      </div>

      {/* 新建对话按钮 */}
      <div className='px-4 mb-6'>
        <button
          onClick={handleNew}
          disabled={isLoading}
          className='w-full py-3 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-slate-200 font-medium transition-all flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed'
        >
          <Plus className='w-4 h-4 text-blue-400 group-hover:rotate-90 transition-transform' />
          <span>新建对话</span>
        </button>
      </div>

      {/* 会话列表 */}
      <div className='flex-1 overflow-y-auto px-3 scrollbar-hide'>
        <div className='text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-3 px-3'>
          历史记录
        </div>
        <div>
          {isLoading && sessions.length === 0 ? (
            <div className='p-4 text-center text-slate-500 text-xs italic'>
              加载中...
            </div>
          ) : sessions.length === 0 ? (
            <div className='p-4 text-center text-slate-500 text-xs italic'>
              暂无历史会话
            </div>
          ) : (
            sessions.map((session) => (
              <div
                key={session.id}
                className={`group flex items-center gap-3 py-1 px-2 rounded-lg cursor-pointer transition-colors relative ${
                  currentSessionId === session.id
                    ? 'bg-white/10 text-slate-200 shadow-sm border border-white/5'
                    : 'hover:bg-white/5 text-slate-400 hover:text-slate-200 border border-transparent'
                } ${isSwitchingSession && currentSessionId === session.id ? 'opacity-50 pointer-events-none' : ''}`}
                onClick={() => onSelect(session.id)}
              >
                {/* 当前会话指示器 */}
                <div
                  className={`w-1 h-8 rounded-full absolute left-0 transition-all duration-300 ${
                    currentSessionId === session.id
                      ? 'bg-blue-500 opacity-100'
                      : 'bg-transparent opacity-0'
                  }`}
                />

                {/* 会话名称或编辑输入框 */}
                {editingSessionId === session.id ? (
                  <input
                    type='text'
                    value={newSessionName}
                    onChange={(e) => setNewSessionName(e.target.value)}
                    onBlur={() => saveRename(session.id)}
                    onKeyDown={(e) => handleRenameKeyDown(e, session.id)}
                    className='flex-1 bg-black/20 text-white text-sm rounded px-2 py-1 outline-none border border-blue-500/50 min-w-0'
                    autoFocus
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <div className='flex-1 flex items-center gap-2 min-w-0'>
                    <span className='flex-1 truncate text-sm'>
                      {getSessionTitle(session)}
                    </span>
                    {isSwitchingSession && currentSessionId === session.id && (
                      <div className='flex items-center gap-1'>
                        <div className='w-2 h-2 bg-blue-400 rounded-full animate-pulse'></div>
                        <span className='text-xs text-blue-400'>加载中...</span>
                      </div>
                    )}
                  </div>
                )}

                {/* 悬停操作按钮(重命名和删除) */}
                {editingSessionId !== session.id && (
                  <div
                    className={`flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity absolute right-2 bg-[#050509]/80 backdrop-blur shadow-sm rounded-lg p-0.5 border border-white/10`}
                  >
                    <button
                      onClick={(e) => handleRename(session.id, session.name, e)}
                      className='p-1.5 text-slate-400 hover:text-blue-400 hover:bg-white/10 rounded-md transition-colors'
                      title='重命名'
                    >
                      <Edit2 className='w-3 h-3' />
                    </button>
                    <button
                      onClick={(e) => handleDelete(session.id, e)}
                      className='p-1.5 text-slate-400 hover:text-red-400 hover:bg-white/10 rounded-md transition-colors'
                      title='删除'
                    >
                      <Trash2 className='w-3 h-3' />
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* 用户信息 */}
      <div className='p-4 border-t border-white/5'>
        <div className='flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 cursor-pointer transition'>
          <div className='relative'>
            <div className='w-9 h-9 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center text-slate-400'>
              <User className='w-5 h-5' />
            </div>
            <div className='absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-[#0B0E14]'></div>
          </div>
          <div className='flex flex-col'>
            <span className='text-sm font-medium text-slate-200'>Dev User</span>
            <span className='text-[10px] text-blue-400/80'>Premium Plan</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
