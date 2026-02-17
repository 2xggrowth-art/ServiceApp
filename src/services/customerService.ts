import { supabase } from '../lib/supabase';
import { config } from '../lib/config';
import { getCallerId } from '../lib/authStore';

// ============================================================
// Customer Service — uses SECURITY DEFINER RPCs
// ============================================================

export const customerService = {
  // Search customers by phone number
  async searchByPhone(phone: string) {
    if (!config.useSupabase) return [];

    const callerId = getCallerId();
    if (callerId) {
      const { data, error } = await supabase.rpc('app_search_customers', {
        p_caller_id: callerId,
        p_phone: phone,
      });
      if (error) throw error;
      return data || [];
    }

    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .ilike('phone', `%${phone}%`)
      .limit(5);

    if (error) throw error;
    return data || [];
  },

  // Get all customers
  async getAll() {
    if (!config.useSupabase) return [];

    const callerId = getCallerId();
    if (callerId) {
      const { data, error } = await supabase.rpc('app_get_customers', {
        p_caller_id: callerId,
      });
      if (error) throw error;
      return data || [];
    }

    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .order('name');

    if (error) throw error;
    return data || [];
  },

  // Create or update customer (upsert on phone)
  async upsert(customerData: { name: string; phone: string; visits?: number }) {
    if (!config.useSupabase) return null;

    const callerId = getCallerId();
    if (callerId) {
      const { data, error } = await supabase.rpc('app_upsert_customer', {
        p_caller_id: callerId,
        p_name: customerData.name,
        p_phone: customerData.phone,
        p_visits: customerData.visits || 1,
      });
      if (error) throw error;
      if (!data || data.length === 0) throw new Error('Failed to upsert customer');
      return data[0];
    }

    const { data, error } = await supabase
      .from('customers')
      .upsert(
        {
          name: customerData.name,
          phone: customerData.phone,
          visits: customerData.visits || 1,
        },
        { onConflict: 'phone' }
      )
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Increment visit count
  async incrementVisit(phone: string) {
    if (!config.useSupabase) return null;

    const { data, error } = await supabase.rpc('increment_customer_visit', {
      p_phone: phone,
    });

    if (error) {
      // Fallback: try to find existing customer first to preserve their name
      const callerId = getCallerId();
      if (callerId) {
        try {
          const existing = await this.searchByPhone(phone);
          const customerName = existing?.[0]?.name || '';
          const currentVisits = existing?.[0]?.visits || 0;
          await supabase.rpc('app_upsert_customer', {
            p_caller_id: callerId,
            p_name: customerName,
            p_phone: phone,
            p_visits: currentVisits + 1,
          });
        } catch {
          // Fallback failed — not critical
        }
      }
    }

    return data;
  },
};
