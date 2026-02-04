'use client'

import {
  Network,
  Atom,
  Sparkles,
  PenTool,
  Code,
  Lightbulb,
  Coffee,
} from 'lucide-react'

interface EmptyStateProps {
  onAction?: (text: string) => void
}

const SUGGESTIONS = [
  {
    icon: <PenTool size={20} />,
    title: '创意写作',
    desc: '帮我写一首关于春天的诗',
  },
  {
    icon: <Code size={20} />,
    title: '代码助手',
    desc: '解释一下 React 的 useEffect',
  },
  {
    icon: <Lightbulb size={20} />,
    title: '头脑风帮',
    desc: '为新的 App 想几个名字',
  },
  { icon: <Coffee size={20} />, title: '休闲聊天', desc: '推荐几部科幻电影' },
]

export function EmptyState({ onAction }: EmptyStateProps) {
  return (
    <div className="animate-fade-in flex w-full flex-1 flex-col items-center justify-center overflow-y-auto p-4 md:p-8">
      <div className="mb-8 flex h-20 w-20 items-center justify-center rounded-[20px] border border-white/50 bg-white/40 shadow-lg backdrop-blur-xl">
        <Sparkles size={40} className="text-gray-700" />
      </div>

      <h2 className="mb-3 text-center text-2xl font-bold tracking-tight text-gray-800 md:text-3xl">
        有什么我可以帮你的吗？
      </h2>
      <p className="mb-10 max-w-md text-center text-[15px] text-gray-500">
        我可以帮你处理写作任务、分析数据、或者激发你的灵感。
      </p>

      <div className="grid w-full max-w-2xl grid-cols-1 gap-4 md:grid-cols-2">
        {SUGGESTIONS.map((item, index) => (
          <button
            key={index}
            onClick={() => onAction?.(item.desc)}
            className="group flex items-start gap-4 rounded-2xl border border-white/40 bg-white/40 p-4 text-left transition-all duration-200 hover:border-white/80 hover:bg-white/70 active:scale-[0.98]"
          >
            <div className="rounded-xl bg-white/50 p-2.5 text-gray-600 transition-colors group-hover:bg-blue-50 group-hover:text-blue-600">
              {item.icon}
            </div>
            <div>
              <h3 className="mb-0.5 text-[15px] font-semibold text-gray-800">
                {item.title}
              </h3>
              <p className="text-xs text-gray-500">{item.desc}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
