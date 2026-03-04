import { z } from 'zod';
import { GoogleGenAI } from '@google/genai';
import { storageService } from '@/app/services/storage.service';
import { ToolConfig } from '../types/tool.types';

interface GoogleVideoGenerationParams {
  prompt: string;
  duration?: number;
  resolution?: string;
  aspectRatio?: string;
  numberOfVideos?: number;
  negativePrompt?: string;
}

const SUPPORTED_RESOLUTIONS = ['720p', '1080p'] as const;
const SUPPORTED_ASPECT_RATIOS = ['16:9', '9:16'] as const;

const INITIAL_POLL_INTERVAL_MS = 5000;
const MAX_POLL_INTERVAL_MS = 30000;
const MAX_WAIT_TIME_MS = 900000;

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export const googleVideoGenerationTool: ToolConfig<GoogleVideoGenerationParams> = {
  name: 'google_video_generation',
  description: '使用 Google Veo 3.1 生成视频，返回可播放的视频链接',
  enabled: true,
  schema: z.object({
    prompt: z.string().describe('视频描述提示词'),
    duration: z
      .number()
      .min(8)
      .max(60)
      .optional()
      .default(8)
      .describe('视频时长(秒)，范围 8-60'),
    resolution: z
      .enum(SUPPORTED_RESOLUTIONS)
      .optional()
      .default('720p')
      .describe('视频分辨率'),
    aspectRatio: z
      .enum(SUPPORTED_ASPECT_RATIOS)
      .optional()
      .default('16:9')
      .describe('视频宽高比'),
    numberOfVideos: z
      .number()
      .min(1)
      .max(4)
      .optional()
      .default(1)
      .describe('生成视频数量，范围 1-4'),
    negativePrompt: z
      .string()
      .optional()
      .describe('排除内容的提示词'),
  }),
  handler: async (params?: GoogleVideoGenerationParams) => {
    if (!params) {
      return '错误：缺少参数';
    }

    const {
      prompt,
      duration = 8,
      resolution = '720p',
      aspectRatio = '16:9',
      numberOfVideos = 1,
      negativePrompt,
    } = params;

    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      return '错误：未配置 GOOGLE_API_KEY 环境变量';
    }

    try {
      console.log('[GoogleVideoGeneration] Starting:', {
        prompt: prompt.substring(0, 100),
        duration,
        resolution,
        aspectRatio,
        numberOfVideos,
      });

      const client = new GoogleGenAI({ apiKey });

      const config: Record<string, any> = {
        numberOfVideos,
        aspectRatio,
        resolution,
      };

      if (negativePrompt) {
        config.negativePrompt = negativePrompt;
      }

      let operation = await client.models.generateVideos({
        model: 'veo-3.1-generate-preview',
        prompt,
        config,
      });

      if (!operation) {
        return '错误：视频生成请求失败，未返回操作对象';
      }

      console.log('[GoogleVideoGeneration] Polling for completion...');

      let pollInterval = INITIAL_POLL_INTERVAL_MS;
      const startTime = Date.now();

      while (!operation.done) {
        const elapsed = Date.now() - startTime;

        if (elapsed > MAX_WAIT_TIME_MS) {
          console.error('[GoogleVideoGeneration] Timeout');
          return '错误：视频生成超时，请稍后重试';
        }

        console.log(`[GoogleVideoGeneration] Polling... elapsed: ${Math.round(elapsed / 1000)}s`);

        await sleep(pollInterval);
        operation = await client.operations.getVideosOperation({ operation });
        pollInterval = Math.min(pollInterval * 2, MAX_POLL_INTERVAL_MS);
      }

      console.log('[GoogleVideoGeneration] Completed');

      if (operation.error) {
        console.error('[GoogleVideoGeneration] Error:', operation.error);
        return `错误：视频生成失败 - ${operation.error.message || '未知错误'}`;
      }

      const response = operation.response;
      if (!response) {
        return '错误：视频生成响应为空';
      }

      if (response.raiMediaFilteredCount && response.raiMediaFilteredCount > 0) {
        const reasons = response.raiMediaFilteredReasons
          ?.map((r: any) => r.details || r.category)
          .join(', ') || '内容不符合安全准则';
        console.warn('[GoogleVideoGeneration] RAI filtered:', reasons);
        return `错误：视频被安全过滤 - ${reasons}`;
      }

      const generatedVideos = response.generatedVideos;
      if (!generatedVideos || generatedVideos.length === 0) {
        return '错误：未生成任何视频';
      }

      console.log(`[GoogleVideoGeneration] Generated ${generatedVideos.length} video(s)`);

      const videoCards: string[] = [];

      for (let i = 0; i < generatedVideos.length; i++) {
        const videoData = generatedVideos[i];
        const videoUri = videoData.video?.uri;

        if (!videoUri) {
          console.warn(`[GoogleVideoGeneration] Video ${i} has no URI`);
          continue;
        }

        try {
          const videoResponse = await fetch(`${videoUri}&key=${apiKey}`);
          if (!videoResponse.ok) {
            console.error(`[GoogleVideoGeneration] Failed to download video ${i}:`, videoResponse.statusText);
            continue;
          }

          const videoBuffer = Buffer.from(await videoResponse.arrayBuffer());
          const mimeType = 'video/mp4';
          const fileName = `generated_video_${Date.now()}_${i}.mp4`;

          const uploadResult = await storageService.uploadVideo(
            videoBuffer,
            fileName,
            mimeType
          );

          if (!uploadResult.success) {
            console.error(`[GoogleVideoGeneration] Failed to upload video ${i}:`, uploadResult.error);
            continue;
          }

          const videoCard = `<videocard status="ready" src="${uploadResult.url}" download="${uploadResult.url}" duration="${duration}" resolution="${resolution}"></videocard>`;
          videoCards.push(videoCard);

          console.log(`[GoogleVideoGeneration] Video ${i} uploaded:`, uploadResult.url);
        } catch (downloadError) {
          console.error(`[GoogleVideoGeneration] Error processing video ${i}:`, downloadError);
        }
      }

      if (videoCards.length === 0) {
        return '错误：所有视频处理失败';
      }

      return `视频已生成完成：\n\n${videoCards.join('\n\n')}`;

    } catch (error) {
      console.error('[GoogleVideoGeneration] Error:', error);
      return `错误：视频生成失败 - ${error instanceof Error ? error.message : String(error)}`;
    }
  },
};
