/**
 * Canvas Artifact XML 流式解析器
 *
 * 负责实时解析 AI 输出的文本流，提取 <canvasArtifact> 标签
 *
 * 核心策略：
 * 1. 保留原始标签，不进行替换
 * 2. 通过回调函数触发状态更新
 * 3. 支持流式处理，标签可能跨多个 chunk 被分割
 */

import type {
  ParserState,
  ParserCallbacks,
  CanvasArtifact,
  CanvasType,
  CanvasLanguage,
} from './canvas-types';
import {
  ARTIFACT_TAG_OPEN,
  ARTIFACT_TAG_CLOSE,
  CODE_TAG_OPEN,
  CODE_TAG_CLOSE,
  CONFIG_TAG_OPEN,
  CONFIG_TAG_CLOSE,
  parseAttributes,
  unescapeXML,
} from './canvas-parser-constants';

/**
 * Canvas Artifact 解析器类
 */
export class CanvasArtifactParser {
  private state: Map<string, ParserState>;
  private callbacks: ParserCallbacks;

  constructor() {
    this.state = new Map();
    this.callbacks = {};
  }

  /**
   * 设置解析器回调
   */
  public setCallbacks(callbacks: ParserCallbacks): void {
    this.callbacks = callbacks;
  }

  /**
   * 获取或初始化消息的解析状态
   */
  private getState(messageId: string): ParserState {
    if (!this.state.has(messageId)) {
      this.state.set(messageId, {
        position: 0,
        insideArtifact: false,
        insideCode: false,
        insideConfig: false,
        currentArtifact: null,
        currentCode: null,
        currentConfig: null,
        fullContent: '',
        messageId,
      });
    }
    return this.state.get(messageId)!;
  }

  /**
   * 重置消息的解析状态
   */
  public resetState(messageId: string): void {
    this.state.delete(messageId);
  }

  /**
   * 查找标签结束位置
   */
  private findTagEnd(content: string, startPos: number): number {
    for (let i = startPos; i < content.length; i++) {
      if (content[i] === '>') {
        return i;
      }
    }
    return -1;
  }

  /**
   * 查找标签起始位置（不区分大小写）
   */
  private findTagIndex(content: string, startPos: number, tag: string): number {
    const safeStartPos = Math.max(0, startPos);
    const escapedTag = tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escapedTag, 'i');
    const match = regex.exec(content.slice(safeStartPos));
    return match ? safeStartPos + match.index : -1;
  }

  /**
   * 查找可能的部分标签起点（处理跨 chunk 的标签）
   */
  private getPartialTagStart(content: string, startPos: number, tag: string): number {
    const safeStartPos = Math.max(0, startPos);
    const lowerContent = content.toLowerCase();
    const lowerTag = tag.toLowerCase();
    const maxLen = Math.min(lowerTag.length - 1, lowerContent.length - safeStartPos);

    for (let len = maxLen; len > 0; len--) {
      const start = lowerContent.length - len;
      if (start < safeStartPos) continue;
      if (lowerContent.slice(start) === lowerTag.slice(0, len)) {
        return start;
      }
    }

    return -1;
  }

  /**
   * 解析 canvasArtifact 开始标签
   */
  private parseArtifactStart(
    content: string,
    startPos: number
  ): {
    success: boolean;
    endPos: number;
    attributes?: Record<string, string>;
    tagStart?: number;
    incomplete?: boolean;
  } {
    const tagStart = this.findTagIndex(content, startPos, ARTIFACT_TAG_OPEN);
    if (tagStart === -1) {
      return { success: false, endPos: startPos };
    }

    const tagEnd = this.findTagEnd(content, tagStart + ARTIFACT_TAG_OPEN.length);
    if (tagEnd === -1) {
      // 标签不完整，等待更多数据
      return { success: false, endPos: tagStart, tagStart, incomplete: true };
    }

    // 提取属性部分
    const attrString = content.slice(tagStart + ARTIFACT_TAG_OPEN.length, tagEnd);
    const attributes = parseAttributes(attrString);

    // 验证必需属性
    if (!attributes.id || !attributes.type || !attributes.title) {
      this.callbacks.onError?.({
        message: 'Missing required attributes (id, type, or title)',
        position: tagStart,
        context: content.slice(tagStart, tagEnd + 1),
      });
      return { success: false, endPos: tagEnd + 1 };
    }

    // 验证 type 必须是 "react" 或 "component"
    if (attributes.type !== 'react' && attributes.type !== 'component') {
      this.callbacks.onError?.({
        message: `Invalid type: "${attributes.type}". Only "react" and "component" are supported.`,
        position: tagStart,
        context: content.slice(tagStart, tagEnd + 1),
      });
      return { success: false, endPos: tagEnd + 1 };
    }

    return { success: true, endPos: tagEnd + 1, attributes };
  }

  /**
   * 解析 canvasCode 开始标签
   */
  private parseCodeStart(
    content: string,
    startPos: number
  ): {
    success: boolean;
    endPos: number;
    language: CanvasLanguage;
    tagStart?: number;
    incomplete?: boolean;
  } {
    const tagStart = this.findTagIndex(content, startPos, CODE_TAG_OPEN);
    if (tagStart === -1) {
      return { success: false, endPos: startPos, language: 'jsx' };
    }

    const tagEnd = this.findTagEnd(content, tagStart + CODE_TAG_OPEN.length);
    if (tagEnd === -1) {
      return { success: false, endPos: tagStart, language: 'jsx', tagStart, incomplete: true };
    }

    // 提取 language 属性
    const attrString = content.slice(tagStart + CODE_TAG_OPEN.length, tagEnd);
    const attributes = parseAttributes(attrString);

    // 默认使用 jsx
    const language = (attributes.language || 'jsx') as CanvasLanguage;

    return { success: true, endPos: tagEnd + 1, language };
  }

  /**
   * 主解析方法
   *
   * @param messageId - 消息 ID
   * @param newContent - 新增的文本内容
   * @returns 原始文本（保留标签，不替换）
   */
  public parse(messageId: string, newContent: string): string {
    const state = this.getState(messageId);
    state.fullContent += newContent;

    const content = state.fullContent;
    let pos = state.position;

    while (pos < content.length) {
      // 状态 1: 不在 artifact 内，查找开始标签
      if (!state.insideArtifact) {
        const result = this.parseArtifactStart(content, pos);
        if (!result.success) {
          if (result.incomplete) {
            pos = result.tagStart ?? pos;
            break;
          }

          if (result.endPos > pos) {
            pos = result.endPos;
            continue;
          }

          const partialStart = this.getPartialTagStart(content, 0, ARTIFACT_TAG_OPEN);
          pos = partialStart !== -1 ? partialStart : content.length;
          break;
        }

        // 找到完整的开始标签
        const { id, type, title } = result.attributes!;
        state.currentArtifact = { id, type: type as CanvasType, title };
        state.insideArtifact = true;
        pos = result.endPos;

        this.callbacks.onArtifactStart?.({
          id,
          type: type as CanvasType,
          title,
          messageId,
        });
        continue;
      }

      // 状态 2: 在 artifact 内，查找 code 或 config 标签
      if (state.insideArtifact && !state.insideCode && !state.insideConfig) {
        // 优先检查 canvasCode
        const codeResult = this.parseCodeStart(content, pos);
        if (codeResult.incomplete) {
          pos = codeResult.tagStart ?? pos;
          break;
        }
        if (codeResult.success) {
          state.currentCode = {
            language: codeResult.language || 'jsx',
            content: '',
            startPosition: codeResult.endPos,
          };
          state.insideCode = true;
          pos = codeResult.endPos;
          continue;
        }

        // 检查 canvasConfig（可选）
        const configStart = this.findTagIndex(content, pos, CONFIG_TAG_OPEN);
        if (configStart !== -1 && configStart < this.findTagIndex(content, pos, ARTIFACT_TAG_CLOSE)) {
          state.currentConfig = { content: '' };
          state.insideConfig = true;
          pos = configStart + CONFIG_TAG_OPEN.length;
          continue;
        }

        // 检查 artifact 结束标签
        const artifactEnd = this.findTagIndex(content, pos, ARTIFACT_TAG_CLOSE);
        if (artifactEnd !== -1) {
          // Artifact 结束，但没有 code
          this.completeArtifact(messageId, state);
          pos = artifactEnd + ARTIFACT_TAG_CLOSE.length;
          continue;
        }

        // 没有找到任何预期的标签，检查是否有部分标签
        const partialStarts = [
          this.getPartialTagStart(content, 0, CODE_TAG_OPEN),
          this.getPartialTagStart(content, 0, CONFIG_TAG_OPEN),
          this.getPartialTagStart(content, 0, ARTIFACT_TAG_CLOSE),
        ].filter((value) => value !== -1) as number[];

        if (partialStarts.length > 0) {
          pos = Math.min(...partialStarts);
        } else {
          pos = content.length;
        }
        break;
      }

      // 状态 3: 在 code 内，累积代码内容
      if (state.insideCode) {
        const codeEnd = this.findTagIndex(content, pos, CODE_TAG_CLOSE);
        if (codeEnd === -1) {
          // 还没找到结束标签，累积内容
          if (state.currentCode && state.currentArtifact) {
            const partialCloseStart = this.getPartialTagStart(
              content,
              state.currentCode.startPosition,
              CODE_TAG_CLOSE
            );
            const currentContent = content.slice(
              state.currentCode.startPosition,
              partialCloseStart !== -1 ? partialCloseStart : content.length
            );
            state.currentCode.content = currentContent;

            // 🔥 实时触发代码更新回调
            this.callbacks.onCodeUpdate?.({
              messageId,
              artifactId: state.currentArtifact.id,
              language: state.currentCode.language,
              content: unescapeXML(currentContent),
            });
          }
          const partialCloseStart = this.getPartialTagStart(
            content,
            state.currentCode?.startPosition ?? 0,
            CODE_TAG_CLOSE
          );
          pos = partialCloseStart !== -1 ? partialCloseStart : content.length;
          break;
        }

        // 找到结束标签
        if (state.currentCode) {
          const codeContent = content.slice(
            state.currentCode.startPosition,
            codeEnd
          );
          state.currentCode.content = unescapeXML(codeContent);

          this.callbacks.onCodeComplete?.({
            language: state.currentCode.language,
            content: state.currentCode.content,
          });
        }

        state.insideCode = false;
        pos = codeEnd + CODE_TAG_CLOSE.length;

        // 跳过空白字符，检查后面是否有 artifact 结束标签
        const nextPos = pos + content.slice(pos).search(/\S/);
        const artifactEnd = this.findTagIndex(content, nextPos, ARTIFACT_TAG_CLOSE);
        if (artifactEnd !== -1) {
          this.completeArtifact(messageId, state);
          pos = artifactEnd + ARTIFACT_TAG_CLOSE.length;
        }
        continue;
      }

      // 状态 4: 在 config 内，累积配置内容
      if (state.insideConfig) {
        const configEnd = this.findTagIndex(content, pos, CONFIG_TAG_CLOSE);
        if (configEnd === -1) {
          if (state.currentConfig) {
            state.currentConfig.content = content.slice(pos, content.length);
          }
          const partialCloseStart = this.getPartialTagStart(content, 0, CONFIG_TAG_CLOSE);
          pos = partialCloseStart !== -1 ? partialCloseStart : content.length;
          break;
        }

        if (state.currentConfig) {
          state.currentConfig.content = content.slice(pos, configEnd);
        }

        state.insideConfig = false;
        pos = configEnd + CONFIG_TAG_CLOSE.length;

        // 检查 artifact 结束标签
        const artifactEnd = this.findTagIndex(content, pos, ARTIFACT_TAG_CLOSE);
        if (artifactEnd !== -1 && artifactEnd === pos) {
          this.completeArtifact(messageId, state);
          pos = artifactEnd + ARTIFACT_TAG_CLOSE.length;
        }
        continue;
      }
    }

    state.position = pos;
    return content; // 返回原始内容，不替换
  }

  /**
   * 完成 artifact 解析
   */
  private completeArtifact(messageId: string, state: ParserState): void {
    if (!state.currentArtifact) {
      return;
    }

    let config: Record<string, unknown> | undefined;
    if (state.currentConfig?.content) {
      try {
        config = JSON.parse(state.currentConfig.content);
      } catch (e) {
        console.error('Failed to parse canvasConfig:', e);
      }
    }

    this.callbacks.onArtifactComplete?.({
      id: state.currentArtifact.id,
      type: state.currentArtifact.type,
      title: state.currentArtifact.title,
      code: {
        language: state.currentCode?.language || 'jsx',
        content: state.currentCode?.content || '',
      },
      config,
      messageId,
    });

    // 重置状态
    state.insideArtifact = false;
    state.insideCode = false;
    state.insideConfig = false;
    state.currentArtifact = null;
    state.currentCode = null;
    state.currentConfig = null;
  }

  /**
   * 获取当前正在解析的 artifact（如果有）
   */
  public getPendingArtifact(messageId: string): {
    id: string;
    title: string;
    type: CanvasType;
  } | null {
    const state = this.getState(messageId);
    if (state.currentArtifact && state.insideArtifact) {
      return state.currentArtifact;
    }
    return null;
  }

  /**
   * 清理所有状态
   */
  public clear(): void {
    this.state.clear();
  }
}

/**
 * 单例实例
 */
let parserInstance: CanvasArtifactParser | null = null;

/**
 * 获取解析器单例
 */
export function getCanvasParser(): CanvasArtifactParser {
  if (!parserInstance) {
    parserInstance = new CanvasArtifactParser();
  }
  return parserInstance;
}
