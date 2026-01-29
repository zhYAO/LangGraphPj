'use client';

import { useState, useRef, useEffect } from 'react';

export interface Tool {
  id: string;
  name: string;
  description: string;
  icon?: string;
}

interface ToolSelectorProps {
  tools: Tool[];
  selectedTools: string[];
  onToolToggle: (toolId: string) => void;
}

export default function ToolSelector({
  tools,
  selectedTools,
  onToolToggle,
}: ToolSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 点击外部关闭下拉菜单
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isOpen]);

  const handleToolClick = (toolId: string) => {
    onToolToggle(toolId);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* 工具按钮 */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`
          flex items-center gap-2 px-3 py-2 rounded-lg
          transition-all duration-200
          ${
            selectedTools.length > 0
              ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-md'
              : 'text-slate-400 hover:text-black hover:bg-black/5'
          }
        `}
        title="选择工具"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
          />
        </svg>
        <span className="text-sm font-medium">工具</span>
        {selectedTools.length > 0 && (
          <span className="flex items-center justify-center w-5 h-5 text-xs bg-white/20 rounded-full">
            {selectedTools.length}
          </span>
        )}
      </button>

      {/* 下拉菜单 */}
      {isOpen && (
        <div className="absolute bottom-full left-0 mb-2 w-64 bg-white/80 backdrop-blur-xl border border-white/60 rounded-2xl shadow-2xl overflow-hidden animate-slide-up">
          <div className="p-3 border-b border-black/5 bg-black/5">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">可用工具</span>
          </div>
          <div className="max-h-64 overflow-y-auto p-2 space-y-1">
            {tools.map((tool) => (
              <button
                key={tool.id}
                onClick={() => handleToolClick(tool.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-200 group ${
                  selectedTools.includes(tool.id)
                    ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20'
                    : 'text-gray-600 hover:bg-black/5'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-1.5 rounded-lg ${
                    selectedTools.includes(tool.id) ? 'bg-white/20' : 'bg-black/5 group-hover:bg-black/10'
                  }`}>
                    {tool.icon}
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-medium leading-none">{tool.name}</div>
                    <div className={`text-[10px] mt-1 ${
                      selectedTools.includes(tool.id) ? 'text-white/70' : 'text-gray-400'
                    }`}>
                      {tool.description}
                    </div>
                  </div>
                </div>
                {selectedTools.includes(tool.id) && (
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={3}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
