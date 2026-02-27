'use client'

import React from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import rehypeRaw from 'rehype-raw'
import 'highlight.js/styles/github-dark.css'
import { CanvasTitleCard } from './canvas/CanvasTitleCard';
import { canvasStore } from '../hooks/useCanvasArtifacts';

interface MarkdownRendererProps {
  content: string
  className?: string
  messageId?: string
}

export function MarkdownRenderer({
  content,
  className = '',
  messageId,
}: MarkdownRendererProps) {
  // 订阅 canvasStore 变化以触发重新渲染
  const [, forceUpdate] = React.useReducer((x) => x + 1, 0);

  React.useEffect(() => {
    // 订阅 store 变化
    const unsubscribe = canvasStore.subscribe(() => {
      forceUpdate();
    });
    return unsubscribe;
  }, []);

  // 处理 canvasArtifact 标签的自定义渲染
  const handleOpenArtifact = React.useCallback((artifactId: string) => {
    canvasStore.setActiveArtifactId(artifactId);
    canvasStore.setIsCanvasVisible(true, 'preview'); // 点击卡片打开到预览模式
  }, []);

  // 获取 artifact 数据
  const getArtifactData = React.useCallback(
    (artifactId: string) => {
      if (!messageId) return undefined;
      return canvasStore.getArtifact(messageId, artifactId);
    },
    [messageId]
  );

  return (
    <div className={`markdown-body ${className} w-full`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight, rehypeRaw]}
        components={{
          // 自定义 canvasArtifact 标签渲染
          // @ts-ignore - 自定义 HTML 标签
          canvasartifact: ({ node, ...props }: any) => {
            const artifactId = props.id;
            const artifact = getArtifactData(artifactId);

            // 优先使用 store 中的完整数据，如果没有则使用标签属性创建临时对象
            const displayArtifact = artifact || {
              id: artifactId,
              type: props.type || 'component',
              title: props.title || '未命名组件',
              code: { language: 'jsx', content: '' },
              status: 'creating',
              isStreaming: true,
              messageId: messageId || '',
              sessionId: '',
              currentVersion: 1,
              createdAt: new Date(),
              updatedAt: new Date(),
            };

            return (
              <CanvasTitleCard
                key={artifactId}
                artifact={displayArtifact}
                onOpen={handleOpenArtifact}
              />
            );
          },
          code({ node, inline, className, children, ...props }: any) {
            const isCodeBlock = className && inline !== true
            if (isCodeBlock) {
              return (
                <div className="overflow-hidden rounded-md">
                  <code
                    className={`${className} block break-words whitespace-pre-wrap`}
                    style={{
                      wordBreak: 'break-word',
                      overflowWrap: 'break-word',
                    }}
                    {...props}
                  >
                    {children}
                  </code>
                </div>
              )
            }
            return (
              <code
                className={`${
                  className || ''
                } inline rounded bg-zinc-700/50 px-1.5 py-0.5 text-sm text-zinc-200`}
                {...props}
              >
                {children}
              </code>
            )
          },
          // 表格使用固定布局，防止溢出
          table({ node, children, ...props }: any) {
            return (
              <div className="overflow-hidden">
                <table
                  className="w-full table-fixed"
                  style={{ tableLayout: 'fixed', wordBreak: 'break-word' }}
                  {...props}
                >
                  {children}
                </table>
              </div>
            )
          },
          // 表格单元格强制换行
          th({ node, children, ...props }: any) {
            return (
              <th
                style={{ wordBreak: 'break-word', maxWidth: '200px' }}
                {...props}
              >
                {children}
              </th>
            )
          },
          td({ node, children, ...props }: any) {
            return (
              <td
                style={{ wordBreak: 'break-word', maxWidth: '200px' }}
                {...props}
              >
                {children}
              </td>
            )
          },
          // 其他文本元素也强制换行
          p({ node, children, ...props }: any) {
            return (
              <p
                style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}
                {...props}
              >
                {children}
              </p>
            )
          },
          h1({ node, children, ...props }: any) {
            return (
              <h1
                style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}
                {...props}
              >
                {children}
              </h1>
            )
          },
          h2({ node, children, ...props }: any) {
            return (
              <h2
                style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}
                {...props}
              >
                {children}
              </h2>
            )
          },
          h3({ node, children, ...props }: any) {
            return (
              <h3
                style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}
                {...props}
              >
                {children}
              </h3>
            )
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
