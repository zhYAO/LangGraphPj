/**
 * Canvas Artifacts 状态管理 Hook
 *
 * 管理所有 Canvas Artifact 的状态，使用 Map 数据结构
 * 存储结构: Map<messageId, Map<artifactId, CanvasArtifact>>
 */

import { useState, useCallback, useRef } from 'react';
import type {
  CanvasArtifact,
  CanvasCode,
  CanvasStatus,
  CanvasType,
  CanvasLanguage,
} from '../canvas/canvas-types';

/**
 * 嵌套 Map 类型: messageId -> (artifactId -> CanvasArtifact)
 */
type ArtifactsMap = Map<string, Map<string, CanvasArtifact>>;

/**
 * Canvas Artifacts Hook
 */
export function useCanvasArtifacts() {
  // 使用嵌套 Map 存储 artifacts
  const [artifacts, setArtifacts] = useState<ArtifactsMap>(new Map());
  const [activeArtifactId, setActiveArtifactId] = useState<string | null>(null);
  const [isCanvasVisible, setIsCanvasVisible] = useState(false);

  // 追踪 messageId 到 artifactId 的映射（用于查找）
  const messageIdToArtifactIds = useRef<Map<string, Set<string>>>(new Map());

  /**
   * 创建新 artifact（检测到 <canvasArtifact>）
   */
  const createArtifact = useCallback((
    messageId: string,
    data: {
      id: string;
      type: CanvasType;
      title: string;
      sessionId: string;
    }
  ) => {
    setArtifacts(prev => {
      const newMap = new Map(prev);

      // 获取或创建消息的 artifacts 子 Map
      if (!newMap.has(messageId)) {
        newMap.set(messageId, new Map());
      }
      const messageArtifacts = newMap.get(messageId)!;

      // 检查是否已存在（版本递增）
      const existing = messageArtifacts.get(data.id);
      const currentVersion = existing ? existing.currentVersion + 1 : 1;

      // 创建新 artifact
      const newArtifact: CanvasArtifact = {
        id: data.id,
        type: data.type,
        title: data.title,
        code: {
          language: 'jsx',
          content: '',
        },
        status: 'creating',
        isStreaming: true,
        messageId,
        sessionId: data.sessionId,
        currentVersion,
        createdAt: existing?.createdAt || new Date(),
        updatedAt: new Date(),
      };

      messageArtifacts.set(data.id, newArtifact);

      // 更新映射
      messageIdToArtifactIds.current.set(messageId,
        new Set(messageIdToArtifactIds.current.get(messageId) || []).add(data.id)
      );

      return newMap;
    });
  }, []);

  /**
   * 开始代码流式接收（检测到 <canvasCode>）
   */
  const startCode = useCallback((messageId: string, artifactId: string, language: CanvasLanguage) => {
    setArtifacts(prev => {
      const newMap = new Map(prev);
      const messageArtifacts = newMap.get(messageId);
      if (!messageArtifacts) return prev;

      const artifact = messageArtifacts.get(artifactId);
      if (!artifact) return prev;

      const updated = {
        ...artifact,
        code: {
          language,
          content: '',
        },
        status: 'streaming' as CanvasStatus,
      };
      messageArtifacts.set(artifactId, updated);

      return newMap;
    });
  }, []);

  /**
   * 追加代码片段（流式累积）
   */
  const appendCodeChunk = useCallback((messageId: string, artifactId: string, chunk: string) => {
    setArtifacts(prev => {
      const newMap = new Map(prev);
      const messageArtifacts = newMap.get(messageId);
      if (!messageArtifacts) return prev;

      const artifact = messageArtifacts.get(artifactId);
      if (!artifact) return prev;

      const updated = {
        ...artifact,
        code: {
          ...artifact.code,
          content: artifact.code.content + chunk,
        },
      };
      messageArtifacts.set(artifactId, updated);

      return newMap;
    });
  }, []);

  /**
   * 完成代码接收（检测到 </canvasCode>）
   */
  const endCode = useCallback((messageId: string, artifactId: string, fullContent: string) => {
    setArtifacts(prev => {
      const newMap = new Map(prev);
      const messageArtifacts = newMap.get(messageId);
      if (!messageArtifacts) return prev;

      const artifact = messageArtifacts.get(artifactId);
      if (!artifact) return prev;

      const updated = {
        ...artifact,
        code: {
          language: artifact.code.language,
          content: fullContent,
        },
        updatedAt: new Date(),
      };
      messageArtifacts.set(artifactId, updated);

      return newMap;
    });
  }, []);

  /**
   * 完成 artifact（检测到 </canvasArtifact>）
   * 同时异步保存到数据库
   */
  const completeArtifact = useCallback((messageId: string, artifactId: string) => {
    setArtifacts(prev => {
      const newMap = new Map(prev);
      const messageArtifacts = newMap.get(messageId);
      if (!messageArtifacts) return prev;

      const artifact = messageArtifacts.get(artifactId);
      if (!artifact) return prev;

      const updated = {
        ...artifact,
        status: 'ready' as CanvasStatus,
        isStreaming: false,
        updatedAt: new Date(),
      };
      messageArtifacts.set(artifactId, updated);

      // 异步保存到数据库
      saveArtifactToDb(updated).catch(err => {
        console.error('Failed to save artifact to database:', err);
      });

      return newMap;
    });
  }, []);

  /**
   * 保存 artifact 到数据库（通过 API）
   */
  async function saveArtifactToDb(artifact: CanvasArtifact) {
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
    await fetch('/api/artifacts', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        id: artifact.id,
        messageId: artifact.messageId,
        sessionId: artifact.sessionId,
        title: artifact.title,
        type: artifact.type,
        codeContent: artifact.code.content,
        codeLanguage: artifact.code.language,
        status: artifact.status,
        currentVersion: artifact.currentVersion,
      }),
    });
  }

  /**
   * 更新 artifact 属性
   */
  const updateArtifact = useCallback((
    messageId: string,
    artifactId: string,
    updates: Partial<CanvasArtifact>
  ) => {
    setArtifacts(prev => {
      const newMap = new Map(prev);
      const messageArtifacts = newMap.get(messageId);
      if (!messageArtifacts) return prev;

      const artifact = messageArtifacts.get(artifactId);
      if (!artifact) return prev;

      const updated = {
        ...artifact,
        ...updates,
        updatedAt: new Date(),
      };
      messageArtifacts.set(artifactId, updated);

      return newMap;
    });
  }, []);

  /**
   * 设置代码内容
   */
  const setCode = useCallback((
    messageId: string,
    artifactId: string,
    code: CanvasCode
  ) => {
    updateArtifact(messageId, artifactId, { code });
  }, [updateArtifact]);

  /**
   * 设置执行状态
   */
  const setExecutionStatus = useCallback((
    messageId: string,
    artifactId: string,
    status: CanvasStatus,
    result?: { output: unknown; error: string; console: string[] }
  ) => {
    updateArtifact(messageId, artifactId, {
      status,
      executionResult: result,
    });
  }, [updateArtifact]);

  /**
   * 删除消息的所有 artifacts
   */
  const deleteMessageArtifacts = useCallback((messageId: string) => {
    setArtifacts(prev => {
      const newMap = new Map(prev);
      newMap.delete(messageId);
      messageIdToArtifactIds.current.delete(messageId);
      return newMap;
    });
  }, []);

  /**
   * 删除单个 artifact
   */
  const deleteArtifact = useCallback((messageId: string, artifactId: string) => {
    setArtifacts(prev => {
      const newMap = new Map(prev);
      const messageArtifacts = newMap.get(messageId);
      if (!messageArtifacts) return prev;

      messageArtifacts.delete(artifactId);

      // 更新映射
      const ids = messageIdToArtifactIds.current.get(messageId);
      if (ids) {
        ids.delete(artifactId);
        if (ids.size === 0) {
          messageIdToArtifactIds.current.delete(messageId);
        }
      }

      return newMap;
    });
  }, []);

  /**
   * 获取消息的所有 artifacts
   */
  const getArtifactsByMessage = useCallback((messageId: string): CanvasArtifact[] => {
    const messageArtifacts = artifacts.get(messageId);
    if (!messageArtifacts) return [];
    return Array.from(messageArtifacts.values());
  }, [artifacts]);

  /**
   * 获取单个 artifact
   */
  const getArtifact = useCallback((
    messageId: string,
    artifactId: string
  ): CanvasArtifact | undefined => {
    const messageArtifacts = artifacts.get(messageId);
    if (!messageArtifacts) return undefined;
    return messageArtifacts.get(artifactId);
  }, [artifacts]);

  /**
   * 获取最新的 artifact（用于版本递增场景）
   */
  const getLatestArtifact = useCallback((artifactId: string): CanvasArtifact | undefined => {
    for (const messageArtifacts of artifacts.values()) {
      const artifact = messageArtifacts.get(artifactId);
      if (artifact) {
        return artifact;
      }
    }
    return undefined;
  }, [artifacts]);

  /**
   * 获取当前激活的 artifact
   */
  const getActiveArtifact = useCallback((): CanvasArtifact | undefined => {
    if (!activeArtifactId) return undefined;
    return getLatestArtifact(activeArtifactId);
  }, [activeArtifactId, getLatestArtifact]);

  /**
   * 获取所有 artifacts（扁平化）
   */
  const getAllArtifacts = useCallback((): CanvasArtifact[] => {
    const all: CanvasArtifact[] = [];
    for (const messageArtifacts of artifacts.values()) {
      all.push(...Array.from(messageArtifacts.values()));
    }
    return all;
  }, [artifacts]);

  /**
   * 清空所有 artifacts
   */
  const clearAll = useCallback(() => {
    setArtifacts(new Map());
    setActiveArtifactId(null);
    setIsCanvasVisible(false);
    messageIdToArtifactIds.current.clear();
  }, []);

  return {
    // 状态
    artifacts,
    activeArtifactId,
    isCanvasVisible,

    // 操作方法
    createArtifact,
    startCode,
    appendCodeChunk,
    endCode,
    completeArtifact,
    updateArtifact,
    setCode,
    setExecutionStatus,
    deleteMessageArtifacts,
    deleteArtifact,

    // 查询方法
    getArtifact,
    getArtifactsByMessage,
    getLatestArtifact,
    getActiveArtifact,
    getAllArtifacts,
    clearAll,

    // UI 控制方法
    setActiveArtifactId,
    setIsCanvasVisible,
  };
}

/**
 * 单例模式的全局 Canvas 状态管理
 * 用于跨组件共享状态
 */
class CanvasStore {
  private artifacts: Map<string, Map<string, CanvasArtifact>> = new Map();
  private activeArtifactId: string | null = null;
  private isCanvasVisible = false;
  private initialTab: 'editor' | 'preview' = 'preview'; // Canvas 打开时的初始标签页
  private listeners: Set<() => void> = new Set();

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify(): void {
    this.listeners.forEach(fn => fn());
  }

  getArtifacts(): Map<string, Map<string, CanvasArtifact>> {
    return this.artifacts;
  }

  getArtifact(messageId: string, artifactId: string): CanvasArtifact | undefined {
    return this.artifacts.get(messageId)?.get(artifactId);
  }

  setArtifact(messageId: string, artifact: CanvasArtifact): void {
    if (!this.artifacts.has(messageId)) {
      this.artifacts.set(messageId, new Map());
    }
    this.artifacts.get(messageId)!.set(artifact.id, artifact);
    this.notify();
  }

  getActiveArtifactId(): string | null {
    return this.activeArtifactId;
  }

  getActiveArtifact(): CanvasArtifact | undefined {
    if (!this.activeArtifactId) return undefined;
    for (const messageArtifacts of this.artifacts.values()) {
      const artifact = messageArtifacts.get(this.activeArtifactId);
      if (artifact) {
        return artifact;
      }
    }
    return undefined;
  }

  setActiveArtifactId(id: string | null): void {
    this.activeArtifactId = id;
    this.notify();
  }

  getIsCanvasVisible(): boolean {
    return this.isCanvasVisible;
  }

  setIsCanvasVisible(visible: boolean, initialTab?: 'editor' | 'preview'): void {
    this.isCanvasVisible = visible;
    if (visible && initialTab) {
      this.initialTab = initialTab;
    }
    this.notify();
  }

  getInitialTab(): 'editor' | 'preview' {
    return this.initialTab;
  }

  resetInitialTab(): void {
    this.initialTab = 'preview';
  }

  clear(): void {
    this.artifacts.clear();
    this.activeArtifactId = null;
    this.isCanvasVisible = false;
    this.notify();
  }

  /**
   * 从消息内容中解析并恢复 artifacts
   * 用于历史记录加载时恢复 canvas artifacts
   */
  restoreArtifactsFromMessage(messageId: string, content: string): void {
    // 匹配 <canvasArtifact id="xxx" title="xxx">...</canvasArtifact>
    const artifactRegex = /<canvasArtifact[^>]*id=["']([^"']+)["'][^>]*title=["']([^"']+)["'][^>]*>([\s\S]*?)<\/canvasArtifact>/gi;
    let match: RegExpExecArray | null;
    let hasChanges = false;

    while ((match = artifactRegex.exec(content)) !== null) {
      const artifactId = match[1];
      const title = match[2];
      const innerContent = match[3];

      // 提取代码内容和语言
      const codeMatch = /<canvasCode[^>]*language=["']?(\w+)["']?[^>]*>([\s\S]*?)<\/canvasCode>/i.exec(innerContent);
      const language = codeMatch?.[1] as CanvasLanguage || 'jsx';
      const codeContent = codeMatch?.[2] || innerContent;

      // 创建或更新 artifact
      if (!this.artifacts.has(messageId)) {
        this.artifacts.set(messageId, new Map());
      }
      const messageArtifacts = this.artifacts.get(messageId)!;

      const artifact: CanvasArtifact = {
        id: artifactId,
        type: 'component',
        title,
        code: {
          language,
          content: codeContent.trim(),
        },
        status: 'ready',
        isStreaming: false,
        messageId,
        sessionId: '', // 历史记录中可能没有 sessionId
        currentVersion: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      messageArtifacts.set(artifactId, artifact);
      hasChanges = true;
    }

    if (hasChanges) {
      this.notify();
    }
  }

  /**
   * 从消息数组中批量恢复所有 artifacts
   */
  restoreArtifactsFromMessages(messages: Array<{ id?: string; content: string | any[] }>): void {
    let hasChanges = false;

    for (const message of messages) {
      const messageId = message.id as string;
      if (!messageId) continue;

      // 处理 content 为字符串或数组的情况
      let contentStr = '';
      if (typeof message.content === 'string') {
        contentStr = message.content;
      } else if (Array.isArray(message.content)) {
        contentStr = message.content
          .map((block: any) => {
            if (typeof block === 'string') return block;
            if (block?.text) return block.text;
            return '';
          })
          .join('');
      }

      if (/<canvasartifact/i.test(contentStr)) {
        this.restoreArtifactsFromMessage(messageId, contentStr);
        hasChanges = true;
      }
    }

    if (hasChanges) {
      this.notify();
    }
  }
}

// 全局单例
export const canvasStore = new CanvasStore();
