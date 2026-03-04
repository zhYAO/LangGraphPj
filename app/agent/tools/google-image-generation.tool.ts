import { z } from 'zod';
import { GoogleGenAI } from '@google/genai';
import { storageService } from '@/app/services/storage.service';
import { ToolConfig } from '../types/tool.types';

interface GoogleImageGenerationParams {
  prompt: string;
  aspectRatio?: string;
  imageSize?: string;
}

const SUPPORTED_ASPECT_RATIOS = ['1:1', '16:9', '9:16', '4:3', '3:4'] as const;
const SUPPORTED_IMAGE_SIZES = ['1K', '2K', '4K'] as const;

export const googleImageGenerationTool: ToolConfig<GoogleImageGenerationParams> = {
  name: 'google_image_generation',
  description: '使用 Google Gemini 生成图片，返回图片外链 URL',
  enabled: true,
  schema: z.object({
    prompt: z.string().describe('图片描述提示词'),
    aspectRatio: z
      .enum(SUPPORTED_ASPECT_RATIOS)
      .optional()
      .default('1:1')
      .describe('图片宽高比'),
    imageSize: z
      .enum(SUPPORTED_IMAGE_SIZES)
      .optional()
      .default('1K')
      .describe('图片分辨率'),
  }),
  handler: async (params?: GoogleImageGenerationParams) => {
    if (!params) {
      return '错误：缺少参数';
    }

    const { prompt, aspectRatio = '1:1', imageSize = '1K' } = params;

    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      return '错误：未配置 GOOGLE_API_KEY 环境变量';
    }

    try {
      const client = new GoogleGenAI({ apiKey });

      const response = await client.models.generateContent({
        model: 'gemini-3-pro-image-preview',
        contents: prompt,
        config: {
          responseModalities: ['TEXT', 'IMAGE'],
          imageConfig: {
            aspectRatio,
            imageSize,
          },
        },
      });

      const candidates = response.candidates;
      if (!candidates || candidates.length === 0) {
        return '错误：未生成任何图片';
      }

      const parts = candidates[0].content?.parts;
      if (!parts) {
        return '错误：响应中无内容';
      }

      for (const part of parts) {
        if (part.inlineData) {
          const imageBuffer = Buffer.from(part.inlineData.data as string, 'base64');
          const mimeType = part.inlineData.mimeType || 'image/png';
          const extension = mimeType.split('/')[1] || 'png';
          const fileName = `generated_${Date.now()}.${extension}`;

          const uploadResult = await storageService.uploadImage(
            imageBuffer,
            fileName,
            mimeType
          );

          if (!uploadResult.success) {
            return `错误：图片上传失败 - ${uploadResult.error}`;
          }

          return `图片已生成，请在回复中直接展示以下组件：\n\n<imagecard status="ready" src="${uploadResult.url}" download="${uploadResult.url}" prompt="${prompt}" aspectRatio="${aspectRatio}"></imagecard>`;
        }
      }

      return '错误：响应中未包含图片数据';
    } catch (error) {
      console.error('[GoogleImageGeneration] Error:', error);
      return `错误：图片生成失败 - ${error instanceof Error ? error.message : String(error)}`;
    }
  },
};
