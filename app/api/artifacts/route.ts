/**
 * Artifacts API 路由
 *
 * 路由层职责：
 * - 接收 HTTP 请求
 * - 参数解析和验证
 * - 调用 Service 层处理业务逻辑
 * - 返回 HTTP 响应
 *
 * 端点：
 * POST /api/artifacts - 创建 artifact
 * GET /api/artifacts?id=xxx - 获取 artifact
 * GET /api/artifacts?session_id=xxx - 获取 session 的所有 artifacts
 * GET /api/artifacts?recent=20 - 获取最近的 artifacts
 * GET /api/artifacts?list - 列出所有 artifacts（调试用）
 */

import { NextRequest, NextResponse } from 'next/server';
import { artifactService } from '@/app/services/artifact.service';
import { withAuth } from '@/app/middleware/auth';

/**
 * GET - 获取 artifact(s)
 */
export const GET = withAuth(async (request: NextRequest, auth) => {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');
    const sessionId = searchParams.get('session_id');
    const recent = searchParams.get('recent');
    const list = searchParams.get('list');

    // 获取单个 artifact
    if (id) {
      const artifact = await artifactService.getArtifact({ id });
      if (!artifact) {
        return NextResponse.json({ error: 'Artifact not found' }, { status: 404 });
      }
      return NextResponse.json({
        artifact: artifactService.rowToResponse(artifact)
      });
    }

    // 获取 session 的所有 artifacts
    if (sessionId) {
      const artifacts = await artifactService.getArtifactsBySession({ sessionId });
      return NextResponse.json({
        artifacts: artifactService.rowsToResponse(artifacts)
      });
    }

    // 获取最近的 artifacts
    if (recent) {
      const limit = parseInt(recent) || 20;
      const artifacts = await artifactService.getRecentArtifacts({ limit });
      return NextResponse.json({
        artifacts: artifactService.rowsToResponse(artifacts)
      });
    }

    // 列出所有 artifacts（调试用）
    if (list === '') {
      const artifacts = await artifactService.getRecentArtifacts({ limit: 100 });
      return NextResponse.json({
        count: artifacts.length,
        artifacts: artifacts.map(a => ({
          id: a.id,
          title: a.title,
          created_at: a.created_at
        }))
      });
    }

    return NextResponse.json(
      { error: 'Missing id, session_id, recent or list parameter' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error fetching artifact:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
});

/**
 * POST - 创建 artifact
 */
export const POST = withAuth(async (request: NextRequest, auth) => {
  try {
    const body = await request.json();



    // ✅ 调用 Service 层，传递认证客户端（符合 CLAUDE.md 规范）
    const result = await artifactService.createArtifact(
      {
        id: body.id,
        messageId: body.messageId,
        sessionId: body.sessionId,
        title: body.title,
        type: body.type,
        codeContent: body.codeContent,
        codeLanguage: body.codeLanguage,
        status: body.status,
        currentVersion: body.currentVersion,
        executionOutput: body.executionOutput,
        executionError: body.executionError,
        executionConsole: body.executionConsole,
        metadata: body.metadata,
        userId: auth.user?.id,  // 从 auth 中获取 userId
      },
      auth.client  // ✅ 通过 Service 层传递认证客户端
    );

    console.log('✅ Upsert 成功:', { id: body.id });
    console.log('=== /api/artifacts POST 完成 ===\n');

    return NextResponse.json(result);
  } catch (error) {
    console.error('❌ /api/artifacts POST 错误:');
    console.error('错误类型:', error?.constructor?.name);
    console.error('错误消息:', error instanceof Error ? error.message : String(error));
    console.error('错误堆栈:', error instanceof Error ? error.stack : 'N/A');
    console.log('=== /api/artifacts POST 失败 ===\n');

    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
});
