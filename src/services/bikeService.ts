import { supabase } from '../lib/supabase';
import { config } from '../lib/config';
import { mapBikeFromDb } from '../lib/mappers';
import { getCallerId } from '../lib/authStore';
import type { Bike } from '../types/bike';

export const bikeService = {
  async getByCustomerId(customerId: string): Promise<Bike[]> {
    if (!config.useSupabase || !supabase) return [];

    const callerId = getCallerId();
    if (callerId) {
      const { data, error } = await supabase.rpc('app_get_customer_bikes', {
        p_caller_id: callerId,
        p_customer_id: customerId,
      });
      if (error) throw error;
      return (data || []).map(mapBikeFromDb);
    }

    const { data, error } = await supabase
      .from('bikes')
      .select('*')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(mapBikeFromDb);
  },

  async create(bikeData: {
    customerId: string;
    bikeModel: string;
    registrationNumber?: string;
    notes?: string;
  }): Promise<Bike> {
    if (!config.useSupabase || !supabase) throw new Error('Supabase not configured');

    const { data, error } = await supabase
      .from('bikes')
      .insert({
        customer_id: bikeData.customerId,
        bike_model: bikeData.bikeModel,
        registration_number: bikeData.registrationNumber || null,
        notes: bikeData.notes || null,
      })
      .select()
      .single();

    if (error) throw error;
    return mapBikeFromDb(data);
  },

  async searchByRegistration(reg: string): Promise<Bike[]> {
    if (!config.useSupabase || !supabase) return [];

    const { data, error } = await supabase
      .from('bikes')
      .select('*')
      .ilike('registration_number', `%${reg}%`)
      .limit(5);

    if (error) throw error;
    return (data || []).map(mapBikeFromDb);
  },
};
