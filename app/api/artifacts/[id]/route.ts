/**
 * Single Artifact API 路由
 *
 * 路由层职责：
 * - 接收 HTTP 请求
 * - 参数解析和验证
 * - 调用 Service 层处理业务逻辑
 * - 返回 HTTP 响应
 *
 * 端点：
 * GET /api/artifacts/:id - 获取单个 artifact（用于独立页面）
 */

import { NextRequest, NextResponse } from 'next/server';
import { artifactService } from '@/app/services/artifact.service';

/**
 * GET - 获取单个 artifact
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const artifact = await artifactService.getArtifact({ id });

    if (!artifact) {
      return NextResponse.json(
        { error: 'Artifact not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      artifact: artifactService.rowToResponse(artifact)
    });
  } catch (error) {
    console.error('Error fetching artifact:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
