// ============================================================
// photoService.ts — Upload/retrieve photos & audio via Supabase Storage
// Saves URLs to job record so all roles can see them
// ============================================================

import { supabase } from '../lib/supabase';
import { config } from '../lib/config';
import { compressImage } from '../lib/imageUtils';
import { jobService } from './jobService';

const BUCKET = 'job-photos';

export const photoService = {
  /** Upload a single photo or video for a job, returns the public URL */
  async uploadPhoto(
    jobId: string | number,
    file: File,
    index: number = 0
  ): Promise<string | null> {
    if (!config.useSupabase || !supabase) return null;

    const isVideo = file.type.startsWith('video/');
    let uploadBlob: Blob;
    let contentType: string;
    let ext: string;

    if (isVideo) {
      // Videos: upload as-is (no compression)
      uploadBlob = file;
      contentType = file.type || 'video/mp4';
      ext = file.name.split('.').pop() || 'mp4';
    } else {
      // Images: compress for mobile networks
      uploadBlob = await compressImage(file);
      contentType = 'image/jpeg';
      ext = 'jpg';
    }

    const path = `jobs/${jobId}/photo_${index}_${Date.now()}.${ext}`;

    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(path, uploadBlob, {
        contentType,
        upsert: true,
      });

    if (error) throw error;

    const { data: urlData } = supabase.storage
      .from(BUCKET)
      .getPublicUrl(path);

    return urlData.publicUrl;
  },

  /** Upload multiple photos/videos — returns URLs only (does NOT update job record) */
  async uploadPhotosOnly(files: File[]): Promise<string[]> {
    if (!config.useSupabase || !supabase || files.length === 0) return [];

    const ts = Date.now();
    const urls: string[] = [];
    for (let i = 0; i < files.length; i++) {
      try {
        const file = files[i];
        const isVideo = file.type.startsWith('video/');
        let uploadBlob: Blob;
        let contentType: string;
        let ext: string;

        if (isVideo) {
          uploadBlob = file;
          contentType = file.type || 'video/mp4';
          ext = file.name.split('.').pop() || 'mp4';
        } else {
          uploadBlob = await compressImage(file);
          contentType = 'image/jpeg';
          ext = 'jpg';
        }

        const path = `jobs/pending/photo_${i}_${ts}.${ext}`;
        const { error } = await supabase.storage
          .from(BUCKET)
          .upload(path, uploadBlob, { contentType, upsert: true });
        if (error) throw error;
        const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path);
        if (urlData.publicUrl) urls.push(urlData.publicUrl);
      } catch (err) {
        console.error(`[photoService] Failed to upload file ${i}:`, err);
      }
    }
    return urls;
  },

  /** Upload audio — returns URL only (does NOT update job record) */
  async uploadAudioOnly(file: File): Promise<string | null> {
    if (!config.useSupabase || !supabase) return null;

    const ext = file.name.split('.').pop() || 'webm';
    const path = `jobs/pending/voice_${Date.now()}.${ext}`;
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, { contentType: file.type || 'audio/webm', upsert: true });
    if (error) throw error;
    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path);
    return urlData.publicUrl || null;
  },

  /** Upload multiple photos and save URLs to job record */
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

    // Save photo URLs to job record (photo_before field as JSON array)
    if (urls.length > 0) {
      try {
        await jobService.updateJobStatus(jobId as string, undefined, {
          photoBefore: JSON.stringify(urls),
        });
      } catch (err) {
        console.error('[photoService] Failed to save photo URLs to job:', err);
      }
    }

    return urls;
  },

  /** Upload audio file and save URL to job record */
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

    const audioUrl = urlData.publicUrl;

    // Save audio URL to job record (photo_after field)
    if (audioUrl) {
      try {
        await jobService.updateJobStatus(jobId as string, undefined, {
          photoAfter: audioUrl,
        });
      } catch (err) {
        console.error('[photoService] Failed to save audio URL to job:', err);
      }
    }

    return audioUrl;
  },

  getPublicUrl(path: string): string | null {
    if (!config.useSupabase || !supabase) return null;
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    return data.publicUrl;
  },
};
