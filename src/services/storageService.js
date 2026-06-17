import { supabase } from "../config/supabase.js";

export const storageService = {
  async upload(bucket, path, file, options = {}) {
    const { data, error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true, ...options });
    if (error) throw error;
    return data;
  },

  getPublicUrl(bucket, path) {
    return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
  },

  async createSignedUrl(bucket, path, expiresIn = 3600) {
    const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresIn);
    if (error) throw error;
    return data.signedUrl;
  },

  async remove(bucket, paths) {
    const { error } = await supabase.storage.from(bucket).remove(Array.isArray(paths) ? paths : [paths]);
    if (error) throw error;
  },
};
