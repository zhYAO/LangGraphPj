'use client'

import { Network, Atom, Sparkles, PenTool, Code, Lightbulb, Coffee } from 'lucide-react'

interface EmptyStateProps {
    onAction?: (text: string) => void;
}

const SUGGESTIONS = [
  { icon: <PenTool size={20} />, title: "创意写作", desc: "帮我写一首关于春天的诗" },
  { icon: <Code size={20} />, title: "代码助手", desc: "解释一下 React 的 useEffect" },
  { icon: <Lightbulb size={20} />, title: "头脑风帮", desc: "为新的 App 想几个名字" },
  { icon: <Coffee size={20} />, title: "休闲聊天", desc: "推荐几部科幻电影" },
];

export function EmptyState({ onAction }: EmptyStateProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4 md:p-8 overflow-y-auto animate-fade-in w-full ">
      <div className="w-20 h-20 bg-white/40 backdrop-blur-xl border border-white/50 rounded-[20px] flex items-center justify-center mb-8 shadow-lg">
        <Sparkles size={40} className="text-gray-700" />
      </div>
      
      <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-3 tracking-tight text-center">有什么我可以帮你的吗？</h2>
      <p className="text-gray-500 mb-10 max-w-md text-center text-[15px]">
        我可以帮你处理写作任务、分析数据、或者激发你的灵感。
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-2xl">
        {SUGGESTIONS.map((item, index) => (
          <button 
            key={index}
            onClick={() => onAction?.(item.desc)}
            className="flex items-start gap-4 p-4 rounded-2xl bg-white/40 hover:bg-white/70 border border-white/40 hover:border-white/80 transition-all duration-200 text-left group active:scale-[0.98]"
          >
            <div className="p-2.5 rounded-xl bg-white/50 text-gray-600 group-hover:text-blue-600 group-hover:bg-blue-50 transition-colors">
              {item.icon}
            </div>
            <div>
              <h3 className="font-semibold text-gray-800 text-[15px] mb-0.5">{item.title}</h3>
              <p className="text-gray-500 text-xs">{item.desc}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
