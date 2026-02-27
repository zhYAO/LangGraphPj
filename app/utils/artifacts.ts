import type { CanvasArtifact } from '@/app/canvas/canvas-types'
import { fetchWithAuth } from '@/app/utils/api'

export async function saveArtifactToDb(
  artifact: CanvasArtifact,
  codeContent?: string
): Promise<void> {
  const response = await fetchWithAuth('/api/artifacts', {
    method: 'POST',
    body: JSON.stringify({
      id: artifact.id,
      messageId: artifact.messageId,
      sessionId: artifact.sessionId,
      title: artifact.title,
      type: artifact.type,
      codeContent: codeContent ?? artifact.code.content,
      codeLanguage: artifact.code.language,
      status: artifact.status,
      currentVersion: artifact.currentVersion,
      executionOutput: artifact.executionResult?.output,
      executionError: artifact.executionResult?.error,
      executionConsole: artifact.executionResult?.console,
    }),
  })

  if (!response.ok) {
    const message = await response.text()
    throw new Error(message || `请求失败: ${response.status} ${response.statusText}`)
  }
}
