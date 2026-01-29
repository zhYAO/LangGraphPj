'use client';

import { Bot, User } from 'lucide-react';
import { MarkdownRenderer } from './MarkdownRenderer';
import { ToolCallDisplay } from './ToolCallDisplay';
import type { BaseMessage } from '@langchain/core/messages';

export interface ToolCall {
  id: string;
  name: string;
  args: Record<string, any>;
  output?: any;
  error?: string;
}

export interface Message extends BaseMessage {
  isStreaming?: boolean;
  tool_calls?: ToolCall[];
  toolCallResults?: ToolCall[];
}

interface MessageBubbleProps {
  message: Message;
  index: number;
}

export function MessageBubble({ message, index }: MessageBubbleProps) {

  const messageType = message.getType?.() || (message as any)._getType?.();
  const isUser = messageType === 'human';

  // 处理不同类型的 content
  let messageContent = '';
  const imageUrls: string[] = [];

  if (typeof message.content === 'string') {
    messageContent = message.content;
  } else if (Array.isArray(message.content)) {
    // 处理数组类型的 content（文本 + 图片）
    message.content.forEach((block) => {
      if (typeof block === 'string') {
        messageContent += block;
      } else if (block && typeof block === 'object') {
        // 提取文本
        if ('text' in block && block.text) {
          messageContent += block.text;
        }
        // 提取图片 URL
        if ('image_url' in block && block.image_url) {
          const imageUrl = block.image_url as any;
          const url = typeof imageUrl === 'string' ? imageUrl : imageUrl?.url;
          if (url) {
            imageUrls.push(url);
          }
        }
      }
    });
  } else {
    messageContent = JSON.stringify(message.content);
  }

  return (
    <div
      className={`flex w-full mb-6 ${isUser ? 'justify-end' : 'justify-start'} animate-slide-up`}
      style={{ animationDelay: `${index * 0.05}s` }}
    >
      <div className={`flex max-w-[85%] md:max-w-[75%] ${isUser ? 'flex-row-reverse' : 'flex-row'} items-end gap-2`}>
        {/* 头像 */}
        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm
          ${isUser 
            ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white' 
            : 'bg-gradient-to-br from-white/80 to-white/40 text-gray-800 backdrop-blur-md border border-white/50'
          }`}>
          {isUser ? <User size={14} /> : <Bot size={14} />}
        </div>

        {/* 气泡 */}
        <div className={`px-5 py-3.5 shadow-sm text-[15px] leading-relaxed relative group
          ${isUser 
            ? 'bg-blue-600 text-white rounded-2xl rounded-tr-sm' 
            : 'bg-white/60 backdrop-blur-md border border-white/40 text-gray-800 rounded-2xl rounded-tl-sm'
          }`}>
          
          {/* 渲染图片 */}
          {imageUrls.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {imageUrls.map((url, idx) => (
                <img
                  key={idx}
                  src={url}
                  alt={`Image ${idx + 1}`}
                  className="max-w-xs max-h-64 rounded-lg object-cover border border-white/10"
                  onError={(e) => {
                    console.error('图片加载失败:', url.substring(0, 100));
                    e.currentTarget.style.display = 'none';
                  }}
                />
              ))}
            </div>
          )}

          {/* 渲染工具调用 (在文本内容之前) */}
          {!isUser && (message.tool_calls || message.toolCallResults) && (
            <div className="mb-2">
              <ToolCallDisplay
                toolCalls={message.toolCallResults || message.tool_calls || []}
              />
            </div>
          )}

          {/* 渲染文本内容或加载提示 */}
          {messageContent ? (
            <div
              className={`text-[15px] leading-relaxed w-full ${
                isUser ? 'text-white' : 'text-gray-800'
              }`}
            >
              <MarkdownRenderer content={messageContent} messageId={message.id} />
            </div>
          ) : !isUser ? (
            <span className="flex gap-1 mt-1 h-4 items-center">
              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></span>
            </span>
          ) : null}

          {/* If streaming cursor */}
          {message.isStreaming && messageContent && (
            <span className="inline-block w-1.5 h-4 ml-1 bg-blue-400 animate-pulse align-middle" />
          )}
        </div>
      </div>
    </div>
  );
}
