import { supabase } from '../lib/supabase';
import { config } from '../lib/config';
import { getCallerId } from '../lib/authStore';

export type PartCategory = 'electric' | 'non_electric';

export interface ServiceOption {
  id: string;
  type: 'service' | 'part';
  name: string;
  price: number;
  sortOrder: number;
  category?: PartCategory | null;
}

function mapFromDb(row: Record<string, unknown>): ServiceOption {
  return {
    id: row.id as string,
    type: row.type as 'service' | 'part',
    name: row.name as string,
    price: (row.price as number) || 0,
    sortOrder: row.sort_order as number,
    category: (row.category as PartCategory | null) || (row.type === 'part' ? 'non_electric' : null),
  };
}

// Cache service options — they rarely change (admin edits only)
let cachedOptions: ServiceOption[] | null = null;
let cacheExpiry = 0;
const CACHE_TTL = 2 * 60 * 60 * 1000; // 2 hours

function invalidateCache() {
  cachedOptions = null;
  cacheExpiry = 0;
}

export const serviceOptionsService = {
  async getAll(): Promise<ServiceOption[]> {
    if (!config.useSupabase) return [];

    // Return cached if fresh
    if (cachedOptions && Date.now() < cacheExpiry) return cachedOptions;

    const { data, error } = await supabase.rpc('app_get_service_options');
    if (error) throw error;
    cachedOptions = (data || []).map(mapFromDb);
    cacheExpiry = Date.now() + CACHE_TTL;
    return cachedOptions;
  },

  async create(type: 'service' | 'part', name: string, price: number = 0, category?: PartCategory | null): Promise<ServiceOption> {
    const callerId = getCallerId();
    if (!callerId) throw new Error('Not authenticated');

    const { data, error } = await supabase.rpc('app_create_service_option', {
      p_caller_id: callerId,
      p_type: type,
      p_name: name,
      p_price: price,
      p_category: category || null,
    });
    if (error) throw new Error(error.message);
    invalidateCache();
    return mapFromDb(data);
  },

  async update(id: string, name: string, price: number, category?: PartCategory | null): Promise<ServiceOption> {
    const callerId = getCallerId();
    if (!callerId) throw new Error('Not authenticated');

    const { data, error } = await supabase.rpc('app_update_service_option', {
      p_caller_id: callerId,
      p_id: id,
      p_name: name,
      p_price: price,
      p_category: category ?? null,
    });
    if (error) throw new Error(error.message);
    invalidateCache();
    return mapFromDb(data);
  },

  async remove(id: string): Promise<void> {
    const callerId = getCallerId();
    if (!callerId) throw new Error('Not authenticated');

    const { error } = await supabase.rpc('app_delete_service_option', {
      p_caller_id: callerId,
      p_id: id,
    });
    if (error) throw new Error(error.message);
    invalidateCache();
  },

  async swap(idA: string, idB: string): Promise<void> {
    const callerId = getCallerId();
    if (!callerId) throw new Error('Not authenticated');

    const { error } = await supabase.rpc('app_swap_service_option_order', {
      p_caller_id: callerId,
      p_id_a: idA,
      p_id_b: idB,
    });
    if (error) throw new Error(error.message);
    invalidateCache();
  },
};
