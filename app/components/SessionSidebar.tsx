import React, { useState } from 'react'
import { Plus, Trash2, Edit2, Zap, User } from 'lucide-react'

/**
 * 会话数据接口
 */
export interface Session {
  id: string
  name: string
  created_at: string
}

/**
 * SessionSidebar 组件属性
 */
interface SessionSidebarProps {
  /** 当前激活的会话 ID */
  currentSessionId: string
  /** 会话列表数据 */
  sessions: Session[]
  /** 是否正在加载会话列表 */
  isLoading?: boolean
  /** 是否正在切换会话（加载历史记录） */
  isSwitchingSession?: boolean
  /** 选择会话的回调 */
  onSelect: (id: string) => void
  /** 创建新会话的回调 */
  onNew: () => void
  /** 删除会话的回调 */
  onDelete: (id: string) => void
  /** 重命名会话的回调 */
  onRename: (id: string, name: string) => void
}

/**
 * 获取会话标题
 * 如果会话有名称则返回名称,否则返回会话 ID 的前 8 位
 */
function getSessionTitle(session: Session) {
  return session.name || `会话 ${session.id.slice(0, 8)}`
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
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null)
  // 编辑中的新名称
  const [newSessionName, setNewSessionName] = useState('')

  // ==================== 事件处理 ====================
  /**
   * 处理创建新会话
   */
  function handleNew() {
    onNew()
  }

  /**
   * 处理删除会话
   */
  function handleDelete(id: string, e: React.MouseEvent) {
    e.stopPropagation()
    onDelete(id)
  }

  /**
   * 开始重命名会话
   * 进入编辑模式并设置初始值
   */
  function handleRename(id: string, currentName: string, e: React.MouseEvent) {
    e.stopPropagation()
    setEditingSessionId(id)
    setNewSessionName(currentName)
  }

  /**
   * 保存重命名
   * 调用父组件的 onRename 回调并退出编辑模式
   */
  function saveRename(id: string) {
    if (!newSessionName.trim()) {
      setEditingSessionId(null)
      return
    }
    onRename(id, newSessionName)
    setEditingSessionId(null)
    setNewSessionName('')
  }

  /**
   * 处理重命名输入框的键盘事件
   * - Enter: 保存
   * - Escape: 取消
   */
  function handleRenameKeyDown(e: React.KeyboardEvent, id: string) {
    if (e.key === 'Enter') {
      saveRename(id)
    } else if (e.key === 'Escape') {
      setEditingSessionId(null)
      setNewSessionName('')
    }
  }

  // ==================== 渲染 UI ====================
  return (
    <aside className="ease-spring my-auto flex h-full w-[280px] shrink-0 flex-col rounded-[20px] border border-white/50 bg-white/40 shadow-xl backdrop-blur-xl transition-all duration-300">
      {/* Logo */}
      <div className="flex items-center justify-between p-5">
        <div className="flex items-center gap-3 px-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-gray-800 to-black text-white shadow-lg">
            <Zap size={18} />
          </div>
          <span className="text-lg font-semibold tracking-tight text-gray-800">
            AI Studio
          </span>
        </div>
      </div>

      {/* 新建对话按钮 */}
      <div className="mb-3 px-5">
        <button
          onClick={handleNew}
          disabled={isLoading}
          className="group flex w-full items-center gap-3 rounded-2xl border border-white/60 bg-white/50 px-4 py-3.5 shadow-sm transition-all duration-200 hover:bg-white/80 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Plus
            size={20}
            className="text-gray-600 transition-colors group-hover:text-blue-600"
          />
          <span className="text-[15px] font-medium text-gray-700">新对话</span>
        </button>
      </div>

      {/* 会话列表 */}
      <div className="custom-scrollbar flex-1 space-y-1 overflow-y-auto px-3 py-2">
        <div className="px-4 py-2 text-xs font-semibold tracking-wider text-gray-400/80 uppercase">
          历史记录
        </div>
        <div>
          {isLoading && sessions.length === 0 ? (
            <div className="p-4 text-center text-xs text-gray-400 italic">
              加载中...
            </div>
          ) : sessions.length === 0 ? (
            <div className="p-4 text-center text-xs text-gray-400 italic">
              暂无历史会话
            </div>
          ) : (
            sessions.map((session) => (
              <div
                key={session.id}
                className={`group relative flex cursor-pointer items-center gap-3 rounded-2xl px-4 py-3 transition-all ${
                  currentSessionId === session.id
                    ? 'border border-white/80 bg-white/60 text-gray-800 shadow-sm'
                    : 'border border-transparent text-gray-600 hover:bg-white/40 hover:text-gray-800'
                } ${isSwitchingSession && currentSessionId === session.id ? 'pointer-events-none opacity-50' : ''}`}
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
                    className="min-w-0 flex-1 rounded-xl border border-blue-500/30 bg-white/50 px-2 py-1 text-sm text-gray-800 outline-none"
                    autoFocus
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    <span className="flex-1 truncate text-sm font-medium">
                      {getSessionTitle(session)}
                    </span>

                    {/* 操作按钮 - 仅在悬停或选中时显示 */}
                    <div
                      className={`flex items-center gap-1 transition-opacity ${currentSessionId === session.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                    >
                      <button
                        onClick={(e) =>
                          handleRename(session.id, session.name, e)
                        }
                        className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-black/5 hover:text-gray-600"
                        title="重命名"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={(e) => handleDelete(session.id, e)}
                        className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500"
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
      <div className="border-t border-white/20 p-5">
        <button className="flex w-full items-center gap-3 rounded-2xl border border-transparent p-2.5 transition-colors hover:border-white/30 hover:bg-white/40">
          <div className="h-9 w-9 overflow-hidden rounded-full bg-gradient-to-tr from-indigo-400 to-purple-400 shadow-sm ring-2 ring-white/50">
            <User size={18} className="h-full w-full p-2 text-white" />
          </div>
          <div className="flex-1 text-left">
            <div className="text-sm font-semibold text-gray-800">
              设计师 User
            </div>
            <div className="text-xs text-gray-500">Pro 计划</div>
          </div>
        </button>
      </div>
    </aside>
  )
}
