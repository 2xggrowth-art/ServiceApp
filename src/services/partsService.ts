import { supabase } from '../lib/supabase';
import { config } from '../lib/config';
import { mapPartFromDb } from '../lib/mappers';
import { getCallerId } from '../lib/authStore';

// ============================================================
// Parts Service — abstracts mock data vs Supabase
// ============================================================

export const partsService = {
  // Get all parts
  async getAll() {
    if (!config.useSupabase) return null;

    const callerId = getCallerId();
    if (callerId) {
      const { data, error } = await supabase.rpc('app_get_parts', {
        p_caller_id: callerId,
      });
      if (error) throw error;
      return (data || []).map(mapPartFromDb);
    }

    const { data, error } = await supabase
      .from('parts')
      .select('*')
      .order('name');

    if (error) throw error;
    return data.map(mapPartFromDb);
  },

  // Update stock level (delta: positive to add, negative to deduct)
  // Uses single RPC call instead of fetch-then-update (2 → 1 API call)
  async updateStock(partId, delta) {
    if (!config.useSupabase) return null;

    // Use raw SQL via rpc to do atomic increment in a single call
    const { data, error } = await supabase.rpc('update_part_stock', {
      p_part_id: partId,
      p_delta: delta,
    });

    // Fallback to 2-query approach if RPC doesn't exist yet
    if (error && error.code === '42883') {
      const { data: part, error: fetchError } = await supabase
        .from('parts')
        .select('stock')
        .eq('id', partId)
        .single();
      if (fetchError) throw fetchError;

      const newStock = Math.max(0, (part.stock || 0) + delta);
      const { data: updated, error: updateError } = await supabase
        .from('parts')
        .update({ stock: newStock })
        .eq('id', partId)
        .select()
        .single();
      if (updateError) throw updateError;
      return mapPartFromDb(updated);
    }

    if (error) throw error;
    return data ? mapPartFromDb(data) : null;
  },

  // Get low stock parts
  async getLowStock() {
    if (!config.useSupabase) return null;

    const { data, error } = await supabase
      .from('parts')
      .select('*')
      .filter('stock', 'lte', 'reorder_at')
      .order('stock');

    if (error) throw error;
    return data.map(mapPartFromDb);
  },
};

