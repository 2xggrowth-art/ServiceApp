// ============================================================
// photoService.ts — Upload/retrieve photos via Supabase Storage
// ============================================================

import { supabase } from '../lib/supabase';
import { config } from '../lib/config';
import { compressImage, generatePhotoPath } from '../lib/imageUtils';

const BUCKET = 'job-photos';

export const photoService = {
  async uploadPhoto(
    jobId: string | number,
    file: File,
    type: 'before' | 'after'
  ): Promise<string | null> {
    if (!config.useSupabase || !supabase) return null;

    const compressed = await compressImage(file);
    const path = generatePhotoPath(jobId, type);

    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(path, compressed, {
        contentType: 'image/jpeg',
        upsert: true,
      });

    if (error) throw error;

    const { data: urlData } = supabase.storage
      .from(BUCKET)
      .getPublicUrl(path);

    return urlData.publicUrl;
  },

  async uploadAudio(
    jobId: string | number,
    file: File
  ): Promise<string | null> {
    if (!config.useSupabase || !supabase) return null;

    const ext = file.name.split('.').pop() || 'webm';
    const path = `jobs/${jobId}/voice_${Date.now()}.${ext}`;

    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, {
        contentType: file.type || 'audio/webm',
        upsert: true,
      });

    if (error) throw error;

    const { data: urlData } = supabase.storage
      .from(BUCKET)
      .getPublicUrl(path);

    return urlData.publicUrl;
  },

  getPublicUrl(path: string): string | null {
    if (!config.useSupabase || !supabase) return null;
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    return data.publicUrl;
  },
};
