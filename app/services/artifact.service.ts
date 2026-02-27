/**
 * Artifact Service
 *
 * 负责处理 Canvas Artifact 相关的业务逻辑
 *
 * 职责：
 * - Artifact 的 CRUD 操作
 * - 代码执行结果更新
 * - 状态管理
 * - 数据验证和转换
 */

import {
  ArtifactRow,
  ArtifactInsert,
  upsertArtifact,
  getArtifactById,
  getArtifactsByMessageId,
  getArtifactsBySessionId,
  getArtifactsByUserId,
  getRecentArtifacts,
  deleteArtifact as dbDeleteArtifact,
  deleteArtifactsBySession as dbDeleteArtifactsBySession,
  updateArtifactExecution,
  updateArtifactCode,
  updateArtifactStatus,
} from '@/app/database/artifacts';
import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Artifact 输入类型（来自 API 请求）
 */
export interface CreateArtifactInput {
  id: string;
  messageId: string;
  sessionId?: string;
  title: string;
  type?: string;
  codeContent: string;
  codeLanguage?: string;
  status?: string;
  currentVersion?: number;
  executionOutput?: string | null;
  executionError?: string | null;
  executionConsole?: string | null;
  metadata?: object | null;
  userId?: string;
}

/**
 * Artifact 查询输入
 */
export interface GetArtifactInput {
  id: string;
}

export interface GetArtifactsByMessageInput {
  messageId: string;
}

export interface GetArtifactsBySessionInput {
  sessionId: string;
}

export interface GetArtifactsByUserInput {
  userId: string;
}

export interface GetRecentArtifactsInput {
  limit?: number;
}

export interface DeleteArtifactInput {
  id: string;
}

export interface DeleteArtifactsBySessionInput {
  sessionId: string;
}

export interface UpdateArtifactCodeInput {
  id: string;
  codeContent: string;
}

export interface UpdateArtifactStatusInput {
  id: string;
  status: string;
}

export interface UpdateArtifactExecutionInput {
  id: string;
  output?: string;
  error?: string;
  console?: string[];
}

/**
 * Artifact Service 类
 */
export class ArtifactService {
  /**
   * 创建或更新 Artifact
   * @param input Artifact 数据
   * @param client 可选的认证客户端（用于 RLS 策略）
   */
  async createArtifact(
    input: CreateArtifactInput,
    client?: SupabaseClient
  ): Promise<{ id: string; success: boolean }> {
    // ✅ 数据验证
    this.validateArtifactInput(input);

    // ✅ 转换为数据库格式
    const artifactData: ArtifactInsert = {
      id: input.id,
      message_id: input.messageId,
      session_id: input.sessionId || null,
      title: input.title,
      type: input.type || 'component',
      code_content: input.codeContent,
      code_language: input.codeLanguage || 'jsx',
      status: input.status || 'ready',
      current_version: input.currentVersion || 1,
      execution_output: input.executionOutput ?? null,
      execution_error: input.executionError ?? null,
      execution_console: input.executionConsole ?? null,
      metadata: input.metadata ?? null,
      user_id: input.userId || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // ✅ 调用数据访问层，传递认证客户端
    await upsertArtifact(artifactData, client);

    return { id: input.id, success: true };
  }

  /**
   * 获取单个 Artifact
   */
  async getArtifact(input: GetArtifactInput): Promise<ArtifactRow | null> {
    if (!input.id) {
      throw new Error('Artifact ID 不能为空');
    }
    return await getArtifactById(input.id);
  }

  /**
   * 获取消息的所有 Artifacts
   */
  async getArtifactsByMessage(input: GetArtifactsByMessageInput): Promise<ArtifactRow[]> {
    if (!input.messageId) {
      throw new Error('Message ID 不能为空');
    }
    return await getArtifactsByMessageId(input.messageId);
  }

  /**
   * 获取会话的所有 Artifacts
   */
  async getArtifactsBySession(input: GetArtifactsBySessionInput): Promise<ArtifactRow[]> {
    if (!input.sessionId) {
      throw new Error('Session ID 不能为空');
    }
    return await getArtifactsBySessionId(input.sessionId);
  }

  /**
   * 获取用户的所有 Artifacts
   */
  async getArtifactsByUser(input: GetArtifactsByUserInput): Promise<ArtifactRow[]> {
    if (!input.userId) {
      throw new Error('User ID 不能为空');
    }
    return await getArtifactsByUserId(input.userId);
  }

  /**
   * 获取最近的 Artifacts
   */
  async getRecentArtifacts(input?: GetRecentArtifactsInput): Promise<ArtifactRow[]> {
    const limit = input?.limit || 20;
    return await getRecentArtifacts(limit);
  }

  /**
   * 删除单个 Artifact
   */
  async deleteArtifact(input: DeleteArtifactInput): Promise<void> {
    if (!input.id) {
      throw new Error('Artifact ID 不能为空');
    }
    await dbDeleteArtifact(input.id);
  }

  /**
   * 删除会话的所有 Artifacts
   */
  async deleteArtifactsBySession(input: DeleteArtifactsBySessionInput): Promise<void> {
    if (!input.sessionId) {
      throw new Error('Session ID 不能为空');
    }
    await dbDeleteArtifactsBySession(input.sessionId);
  }

  /**
   * 更新 Artifact 代码内容
   */
  async updateCode(input: UpdateArtifactCodeInput): Promise<void> {
    if (!input.id) {
      throw new Error('Artifact ID 不能为空');
    }
    if (input.codeContent === undefined) {
      throw new Error('代码内容不能为空');
    }
    await updateArtifactCode(input.id, input.codeContent);
  }

  /**
   * 更新 Artifact 状态
   */
  async updateStatus(input: UpdateArtifactStatusInput): Promise<void> {
    if (!input.id) {
      throw new Error('Artifact ID 不能为空');
    }
    if (!input.status) {
      throw new Error('状态不能为空');
    }
    await updateArtifactStatus(input.id, input.status);
  }

  /**
   * 更新 Artifact 执行结果
   */
  async updateExecutionResult(input: UpdateArtifactExecutionInput): Promise<void> {
    if (!input.id) {
      throw new Error('Artifact ID 不能为空');
    }
    await updateArtifactExecution(input.id, {
      output: input.output,
      error: input.error,
      console: input.console,
    });
  }

  /**
   * 验证 Artifact 输入数据
   */
  private validateArtifactInput(input: CreateArtifactInput): void {
    if (!input.id) {
      throw new Error('Artifact ID 不能为空');
    }
    if (!input.messageId) {
      throw new Error('Message ID 不能为空');
    }
    if (!input.title) {
      throw new Error('标题不能为空');
    }
    if (!input.codeContent && input.codeContent !== '') {
      throw new Error('代码内容不能为空');
    }

    // 验证类型
    const validTypes = ['react', 'component', 'page', 'layout', 'hook', 'other'];
    if (input.type && !validTypes.includes(input.type)) {
      throw new Error(`无效的 Artifact 类型: ${input.type}`);
    }

    // 验证语言
    const validLanguages = ['jsx', 'tsx', 'javascript', 'typescript', 'python', 'html', 'css'];
    if (input.codeLanguage && !validLanguages.includes(input.codeLanguage)) {
      throw new Error(`无效的代码语言: ${input.codeLanguage}`);
    }

    // 验证状态
    const validStatuses = ['creating', 'streaming', 'ready', 'error', 'executing'];
    if (input.status && !validStatuses.includes(input.status)) {
      throw new Error(`无效的状态: ${input.status}`);
    }
  }

  /**
   * 将数据库行转换为 API 响应格式
   */
  rowToResponse(row: ArtifactRow) {
    return {
      id: row.id,
      messageId: row.message_id,
      sessionId: row.session_id,
      title: row.title,
      type: row.type,
      codeContent: row.code_content,
      codeLanguage: row.code_language,
      status: row.status,
      currentVersion: row.current_version,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      executionOutput: row.execution_output,
      executionError: row.execution_error,
      executionConsole: row.execution_console,
      metadata: row.metadata,
    };
  }

  /**
   * 批量转换数据库行为响应格式
   */
  rowsToResponse(rows: ArtifactRow[]) {
    return rows.map(row => this.rowToResponse(row));
  }
}

// 导出单例实例
export const artifactService = new ArtifactService();
