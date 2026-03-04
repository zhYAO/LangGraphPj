import { supabase } from '@/app/database/supabase';

const IMAGE_BUCKET = 'generated-images';
const VIDEO_BUCKET = 'generated-videos';

export interface UploadResult {
  success: boolean;
  url?: string;
  error?: string;
}

export class StorageService {
  private async uploadToStorage(
    bucket: string,
    buffer: Buffer,
    fileName: string,
    mimeType: string
  ): Promise<UploadResult> {
    try {
      const timestampedPath = `${Date.now()}-${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(timestampedPath, buffer, {
          contentType: mimeType,
          upsert: false,
        });

      if (uploadError) {
        console.error('[StorageService] Upload failed:', uploadError);
        return {
          success: false,
          error: `Upload failed: ${uploadError.message}`,
        };
      }

      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(timestampedPath);

      return {
        success: true,
        url: urlData.publicUrl,
      };
    } catch (error) {
      console.error('[StorageService] Unexpected error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async uploadImage(
    buffer: Buffer,
    fileName: string,
    mimeType: string = 'image/png'
  ): Promise<UploadResult> {
    return this.uploadToStorage(IMAGE_BUCKET, buffer, fileName, mimeType);
  }

  async uploadVideo(
    buffer: Buffer,
    fileName: string,
    mimeType: string = 'video/mp4'
  ): Promise<UploadResult> {
    return this.uploadToStorage(VIDEO_BUCKET, buffer, fileName, mimeType);
  }
}

export type UploadImageResult = UploadResult;

export const storageService = new StorageService();
