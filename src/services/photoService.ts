// ============================================================
// photoService.ts — Upload/retrieve photos & audio via Supabase Storage
// ============================================================

import { supabase } from '../lib/supabase';
import { config } from '../lib/config';
import { compressImage } from '../lib/imageUtils';

const BUCKET = 'job-photos';

export const photoService = {
  /** Upload a single photo for a job, returns the public URL */
  async uploadPhoto(
    jobId: string | number,
    file: File,
    index: number = 0
  ): Promise<string | null> {
    if (!config.useSupabase || !supabase) return null;

    const compressed = await compressImage(file);
    const path = `jobs/${jobId}/photo_${index}_${Date.now()}.jpg`;

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

  /** Upload multiple photos for a job, returns array of public URLs */
  async uploadPhotos(
    jobId: string | number,
    files: File[]
  ): Promise<string[]> {
    if (!config.useSupabase || !supabase || files.length === 0) return [];

    const urls: string[] = [];
    for (let i = 0; i < files.length; i++) {
      try {
        const url = await this.uploadPhoto(jobId, files[i], i);
        if (url) urls.push(url);
      } catch (err) {
        console.error(`[photoService] Failed to upload photo ${i}:`, err);
      }
    }
    return urls;
  },

  /** Upload audio file for a job, returns public URL */
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

  /** List all photos for a job from storage */
  async listJobPhotos(jobId: string | number): Promise<string[]> {
    if (!config.useSupabase || !supabase) return [];

    try {
      const { data, error } = await supabase.storage
        .from(BUCKET)
        .list(`jobs/${jobId}`, { limit: 20 });

      if (error) throw error;
      if (!data) return [];

      const photoFiles = data.filter(f => f.name.startsWith('photo_') || f.name.startsWith('before_') || f.name.startsWith('after_'));
      return photoFiles.map(f => {
        const { data: urlData } = supabase.storage
          .from(BUCKET)
          .getPublicUrl(`jobs/${jobId}/${f.name}`);
        return urlData.publicUrl;
      });
    } catch (err) {
      console.error('[photoService] Failed to list photos:', err);
      return [];
    }
  },

  /** List all audio files for a job from storage */
  async listJobAudio(jobId: string | number): Promise<string[]> {
    if (!config.useSupabase || !supabase) return [];

    try {
      const { data, error } = await supabase.storage
        .from(BUCKET)
        .list(`jobs/${jobId}`, { limit: 20 });

      if (error) throw error;
      if (!data) return [];

      const audioFiles = data.filter(f => f.name.startsWith('voice_'));
      return audioFiles.map(f => {
        const { data: urlData } = supabase.storage
          .from(BUCKET)
          .getPublicUrl(`jobs/${jobId}/${f.name}`);
        return urlData.publicUrl;
      });
    } catch (err) {
      console.error('[photoService] Failed to list audio:', err);
      return [];
    }
  },

  getPublicUrl(path: string): string | null {
    if (!config.useSupabase || !supabase) return null;
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    return data.publicUrl;
  },
};
