/**
 * Artifacts 数据访问层
 *
 * 负责与 Supabase artifacts 表的所有数据库操作
 */

import { supabase } from './supabase';
import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Artifact 数据行类型
 */
export interface ArtifactRow {
  id: string;
  message_id: string;
  session_id: string | null;
  title: string;
  type: string;
  code_content: string;
  code_language: string;
  status: string;
  current_version: number;
  created_at: string;
  updated_at: string;
  execution_output: string | null;
  execution_error: string | null;
  execution_console: string | null;
  metadata: object | null;
  user_id: string | null;
}

/**
 * 创建 Artifact 记录的输入类型（不包含自动生成的字段）
 */
export type ArtifactInsert = Omit<
  ArtifactRow,
  'created_at' | 'updated_at'
>;

/**
 * 初始化 artifacts 表
 * 注意：Supabase 中表已通过 migration 创建，此函数仅用于文档说明
 */
export function initArtifactTable() {
  console.log('Supabase artifacts 表已通过 migration 创建');
}

/**
 * 插入或更新 Artifact
 * @param artifact Artifact 数据
 * @param client Supabase 客户端（可选）
 */
export async function upsertArtifact(
  artifact: ArtifactInsert,
  client?: SupabaseClient
): Promise<void> {
  const db = client || supabase;

  // 检查是否已存在
  const { data: existing } = await db
    .from('artifacts')
    .select('id')
    .eq('id', artifact.id)
    .single();

  if (existing) {
    // 更新
    const { error } = await db
      .from('artifacts')
      .update({
        message_id: artifact.message_id,
        session_id: artifact.session_id,
        title: artifact.title,
        type: artifact.type,
        code_content: artifact.code_content,
        code_language: artifact.code_language,
        status: artifact.status,
        current_version: artifact.current_version,
        execution_output: artifact.execution_output,
        execution_error: artifact.execution_error,
        execution_console: artifact.execution_console,
        metadata: artifact.metadata || {},
        updated_at: new Date().toISOString(),
      })
      .eq('id', artifact.id);

    if (error) {
      throw new Error(`更新 Artifact 失败: ${error.message}`);
    }
  } else {
    // 插入
    const { error } = await db.from('artifacts').insert({
      ...artifact,
      metadata: artifact.metadata || {},
    });

    if (error) {
      throw new Error(`创建 Artifact 失败: ${error.message}`);
    }
  }
}

/**
 * 获取 Artifact by ID
 * @param id Artifact ID
 * @param client Supabase 客户端（可选）
 */
export async function getArtifactById(
  id: string,
  client?: SupabaseClient
): Promise<ArtifactRow | null> {
  const db = client || supabase;
  const { data, error } = await db
    .from('artifacts')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    throw new Error(`获取 Artifact 失败: ${error.message}`);
  }

  return data;
}

/**
 * 获取 Artifact by Message ID
 * @param messageId 消息ID
 * @param client Supabase 客户端（可选）
 */
export async function getArtifactsByMessageId(
  messageId: string,
  client?: SupabaseClient
): Promise<ArtifactRow[]> {
  const db = client || supabase;
  const { data, error } = await db
    .from('artifacts')
    .select('*')
    .eq('message_id', messageId)
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(`获取 Artifacts 失败: ${error.message}`);
  }

  return data || [];
}

/**
 * 获取 Artifact by Session ID
 * @param sessionId 会话ID
 * @param client Supabase 客户端（可选）
 */
export async function getArtifactsBySessionId(
  sessionId: string,
  client?: SupabaseClient
): Promise<ArtifactRow[]> {
  const db = client || supabase;
  const { data, error } = await db
    .from('artifacts')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`获取 Artifacts 失败: ${error.message}`);
  }

  return data || [];
}

/**
 * 获取 User 的 Artifacts
 * @param userId 用户ID
 * @param client Supabase 客户端（可选）
 */
export async function getArtifactsByUserId(
  userId: string,
  client?: SupabaseClient
): Promise<ArtifactRow[]> {
  const db = client || supabase;
  const { data, error } = await db
    .from('artifacts')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`获取 Artifacts 失败: ${error.message}`);
  }

  return data || [];
}

/**
 * 获取最近的 Artifacts
 * @param limit 限制数量
 * @param client Supabase 客户端（可选）
 */
export async function getRecentArtifacts(
  limit = 20,
  client?: SupabaseClient
): Promise<ArtifactRow[]> {
  const db = client || supabase;
  const { data, error } = await db
    .from('artifacts')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`获取最近 Artifacts 失败: ${error.message}`);
  }

  return data || [];
}

/**
 * 删除 Artifact
 * @param id Artifact ID
 * @param client Supabase 客户端（可选）
 */
export async function deleteArtifact(
  id: string,
  client?: SupabaseClient
): Promise<void> {
  const db = client || supabase;
  const { error } = await db.from('artifacts').delete().eq('id', id);

  if (error) {
    throw new Error(`删除 Artifact 失败: ${error.message}`);
  }
}

/**
 * 删除 Session 的所有 Artifacts
 * @param sessionId 会话ID
 * @param client Supabase 客户端（可选）
 */
export async function deleteArtifactsBySession(
  sessionId: string,
  client?: SupabaseClient
): Promise<void> {
  const db = client || supabase;
  const { error } = await db
    .from('artifacts')
    .delete()
    .eq('session_id', sessionId);

  if (error) {
    throw new Error(`删除 Artifacts 失败: ${error.message}`);
  }
}

/**
 * 更新 Artifact 执行结果
 * @param id Artifact ID
 * @param result 执行结果
 * @param client Supabase 客户端（可选）
 */
export async function updateArtifactExecution(
  id: string,
  result: { output?: string; error?: string; console?: string[] },
  client?: SupabaseClient
): Promise<void> {
  const db = client || supabase;
  const { error } = await db
    .from('artifacts')
    .update({
      execution_output: result.output ?? null,
      execution_error: result.error ?? null,
      execution_console: result.console ? JSON.stringify(result.console) : null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) {
    throw new Error(`更新 Artifact 执行结果失败: ${error.message}`);
  }
}

/**
 * 更新 Artifact 代码内容
 * @param id Artifact ID
 * @param codeContent 新的代码内容
 * @param client Supabase 客户端（可选）
 */
export async function updateArtifactCode(
  id: string,
  codeContent: string,
  client?: SupabaseClient
): Promise<void> {
  const db = client || supabase;
  const { error } = await db
    .from('artifacts')
    .update({
      code_content: codeContent,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) {
    throw new Error(`更新 Artifact 代码失败: ${error.message}`);
  }
}

/**
 * 更新 Artifact 状态
 * @param id Artifact ID
 * @param status 新状态
 * @param client Supabase 客户端（可选）
 */
export async function updateArtifactStatus(
  id: string,
  status: string,
  client?: SupabaseClient
): Promise<void> {
  const db = client || supabase;
  const { error } = await db
    .from('artifacts')
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) {
    throw new Error(`更新 Artifact 状态失败: ${error.message}`);
  }
}
