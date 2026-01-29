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
    <aside className="w-[280px] shrink-0 flex flex-col bg-white/40 backdrop-blur-xl border border-white/50 shadow-xl rounded-[20px] h-full my-auto transition-all duration-300 ease-spring">
      {/* Logo */}
      <div className="p-5 flex items-center justify-between">
        <div className="flex items-center gap-3 px-2">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-gray-800 to-black text-white flex items-center justify-center shadow-lg">
            <Zap size={18} />
          </div>
          <span className="font-semibold text-lg text-gray-800 tracking-tight">AI Studio</span>
        </div>
      </div>

      {/* 新建对话按钮 */}
      <div className="px-5 mb-3">
        <button
          onClick={handleNew}
          disabled={isLoading}
          className="w-full py-3.5 px-4 bg-white/50 hover:bg-white/80 border border-white/60 shadow-sm rounded-2xl flex items-center gap-3 transition-all duration-200 group active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus size={20} className="text-gray-600 group-hover:text-blue-600 transition-colors" />
          <span className="text-[15px] font-medium text-gray-700">新对话</span>
        </button>
      </div>

      {/* 会话列表 */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1 custom-scrollbar">
        <div className="px-4 py-2 text-xs font-semibold text-gray-400/80 uppercase tracking-wider">
          历史记录
        </div>
        <div>
          {isLoading && sessions.length === 0 ? (
            <div className="p-4 text-center text-gray-400 text-xs italic">
              加载中...
            </div>
          ) : sessions.length === 0 ? (
            <div className="p-4 text-center text-gray-400 text-xs italic">
              暂无历史会话
            </div>
          ) : (
            sessions.map((session) => (
              <div
                key={session.id}
                className={`group flex items-center gap-3 py-3 px-4 rounded-2xl cursor-pointer transition-all relative ${
                  currentSessionId === session.id
                    ? 'bg-white/60 text-gray-800 shadow-sm border border-white/80'
                    : 'hover:bg-white/40 text-gray-600 hover:text-gray-800 border border-transparent'
                } ${isSwitchingSession && currentSessionId === session.id ? 'opacity-50 pointer-events-none' : ''}`}
                onClick={() => onSelect(session.id)}
              >
                {/* 会话名称或编辑输入框 */}
                {editingSessionId === session.id ? (
                  <input
                    type="text"
                    value={newSessionName}
                    onChange={(e) => setNewSessionName(e.target.value)}
                    onBlur={() => saveRename(session.id)}
                    onKeyDown={(e) => handleRenameKeyDown(e, session.id)}
                    className="flex-1 bg-white/50 text-gray-800 text-sm rounded-xl px-2 py-1 outline-none border border-blue-500/30 min-w-0"
                    autoFocus
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <div className="flex-1 flex items-center gap-2 min-w-0">
                    <span className="flex-1 truncate text-sm font-medium">
                      {getSessionTitle(session)}
                    </span>
                    
                    {/* 操作按钮 - 仅在悬停或选中时显示 */}
                    <div className={`flex items-center gap-1 transition-opacity ${currentSessionId === session.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                      <button
                        onClick={(e) => handleRename(session.id, session.name, e)}
                        className="p-1.5 hover:bg-black/5 rounded-lg text-gray-400 hover:text-gray-600 transition-colors"
                        title="重命名"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={(e) => handleDelete(session.id, e)}
                        className="p-1.5 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-500 transition-colors"
                        title="删除"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* 用户资料区域 */}
      <div className="p-5 border-t border-white/20">
        <button className="w-full flex items-center gap-3 p-2.5 rounded-2xl hover:bg-white/40 transition-colors border border-transparent hover:border-white/30">
          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-400 to-purple-400 overflow-hidden shadow-sm ring-2 ring-white/50">
            <User size={18} className="w-full h-full p-2 text-white" />
          </div>
          <div className="flex-1 text-left">
            <div className="text-sm font-semibold text-gray-800">设计师 User</div>
            <div className="text-xs text-gray-500">Pro 计划</div>
          </div>
        </button>
      </div>
    </aside>
  );
}
