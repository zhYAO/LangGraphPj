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
      className={`flex gap-4 mb-8 w-full animate-fade-in-up ${
        isUser ? 'justify-end' : ''
      }`}
      style={{ animationDelay: `${index * 0.05}s` }}
    >
      {!isUser && (
        <div className='w-10 h-10 rounded-lg bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/20 flex-shrink-0'>
          <Bot className='text-white w-4 h-4' />
        </div>
      )}

      {/* Message Content Bubble */}
      <div
        className={`
        ${
          isUser
            ? 'max-w-2xl bg-[#1E293B] border border-white/10 rounded-2xl rounded-tr-none p-4 text-slate-100 leading-relaxed shadow-lg'
            : 'flex-1 bg-white/5 border border-white/5 rounded-2xl rounded-tl-none p-4 text-slate-300'
        }
      `}
      >
        {/* 渲染图片 */}
        {imageUrls.length > 0 && (
          <div className='flex flex-wrap gap-2 mb-3'>
            {imageUrls.map((url, idx) => (
              <img
                key={idx}
                src={url}
                alt={`Image ${idx + 1}`}
                className='max-w-xs max-h-64 rounded-lg object-cover border border-white/10'
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
          <div className='mb-1'>
            <ToolCallDisplay
              toolCalls={message.toolCallResults || message.tool_calls || []}
            />
          </div>
        )}

        {/* 渲染文本内容或加载提示 */}
        {messageContent ? (
          <div
            className={`text-[15px] leading-relaxed w-full ${
              isUser ? 'text-slate-100' : 'text-slate-300'
            }`}
          >
            <MarkdownRenderer content={messageContent} messageId={message.id} />
          </div>
        ) : !isUser ? (
          <div className='text-blue-200 text-sm animate-pulse'>
            AI 正在思考...
          </div>
        ) : null}

        {/* If streaming cursor (only show when there is content) */}
        {message.isStreaming && messageContent && (
          <div className='text-blue-200 text-sm animate-pulse'>
            AI 正在思考...
          </div>
        )}
      </div>

      {isUser && (
        <div className='ml-0 w-10 h-10 rounded-full bg-slate-700 overflow-hidden flex-shrink-0 border border-white/10 shadow-lg'>
          {/* Fallback avatar or icon */}
          <div className='w-full h-full flex items-center justify-center text-slate-400'>
            <User className='w-5 h-5' />
          </div>
          {/* Use img if available */}
        </div>
      )}
    </div>
  );
}
