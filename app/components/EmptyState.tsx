'use client'

import { Network, Atom, Sparkles } from 'lucide-react'

// Demo feature cards actions could be passed as props or just mocked for now
// The user might want these buttons to populate the input.
interface EmptyStateProps {
    onAction?: (text: string) => void;
}

export function EmptyState({ onAction }: EmptyStateProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center animate-fade-in-up w-full max-w-5xl mx-auto px-4 py-12">
      {/* AI Core Animation */}
      <div className="mb-10 relative w-[120px] h-[120px] flex items-center justify-center">
        <div className="absolute rounded-full border-2 border-transparent border-t-blue-500 border-r-purple-500 w-full h-full opacity-70 animate-spin-slow"></div>
        <div className="absolute rounded-full border-2 border-transparent border-t-cyan-500 border-l-blue-500 w-[70%] h-[70%] animate-spin-reverse"></div>
        <div className="w-[40px] h-[40px] rounded-full bg-radial-gradient from-white to-transparent opacity-80 filter blur-[10px] animate-pulse-glow bg-white"></div>
        {/* Fallback glow if radial gradient fails in CSS classes or just use simple bg */}
        <div className="absolute w-10 h-10 bg-blue-400 rounded-full blur-xl animate-pulse opacity-50"></div>
      </div>

      <h1 className="text-4xl md:text-5xl font-bold mb-4 tracking-tight">
        <span className="text-white">解锁</span>
        <span className="text-gradient px-2">AI 智能编程</span>
        <span className="text-white">新体验</span>
      </h1>
      <p className="text-slate-400 max-w-lg text-lg mb-12 leading-relaxed font-light">
        利用下一代神经网络模型，为您提供<span className="text-blue-400 font-medium">代码生成</span>、<span className="text-purple-400 font-medium">架构分析</span>与<span className="text-cyan-400 font-medium">智能调试</span>服务。
      </p>

      {/* Feature Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-3xl w-full px-4 text-left">
        <button 
           onClick={() => onAction?.('如何学习LangGraph JS')}
           className="bg-white/5 border border-white/5 hover:bg-white/10 hover:border-blue-500/40 p-5 rounded-2xl flex items-start text-left gap-4 transition-all hover:-translate-y-1 hover:shadow-lg group"
        >
          <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400 group-hover:bg-blue-500 group-hover:text-white transition-colors">
            <Network className="w-5 h-5" />
          </div>
          <div>
            <div className="text-slate-200 font-semibold mb-1 group-hover:text-blue-300 transition-colors">LangGraph 学习路径</div>
            <div className="text-slate-500 text-sm leading-snug">掌握 StateGraph、Nodes 与 Edges 的核心概念，构建 Agent。</div>
          </div>
        </button>

        <button 
           onClick={() => onAction?.('分析这个 React 组件的性能瓶颈')}
           className="bg-white/5 border border-white/5 hover:bg-white/10 hover:border-cyan-500/40 p-5 rounded-2xl flex items-start text-left gap-4 transition-all hover:-translate-y-1 hover:shadow-lg group"
        >
          <div className="w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center text-cyan-400 group-hover:bg-cyan-500 group-hover:text-white transition-colors">
            <Atom className="w-5 h-5" />
          </div>
          <div>
            <div className="text-slate-200 font-semibold mb-1 group-hover:text-cyan-300 transition-colors">React 性能优化</div>
            <div className="text-slate-500 text-sm leading-snug">智能分析组件渲染逻辑，提供 useMemo 优化建议。</div>
          </div>
        </button>
      </div>
    </div>
  )
}
