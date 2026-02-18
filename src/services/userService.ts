import { supabase } from '../lib/supabase';
import { config } from '../lib/config';
import { mapUserFromDb } from '../lib/mappers';
import { getCallerId } from '../lib/authStore';

// ============================================================
// User Service — abstracts mock data vs Supabase
// ============================================================

export const userService = {
  // Fetch all active mechanics
  async getMechanics() {
    if (!config.useSupabase) return null;

    const callerId = getCallerId();
    if (callerId) {
      const { data, error } = await supabase.rpc('app_get_mechanics', {
        p_caller_id: callerId,
      });
      if (error) throw error;
      return (data || []).map(mapUserFromDb);
    }

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('role', 'mechanic')
      .eq('is_active', true)
      .order('mechanic_level', { ascending: false })
      .order('name');

    if (error) throw error;
    return data.map(mapUserFromDb);
  },

  // Fetch a single mechanic by ID
  async getMechanicById(id) {
    if (!config.useSupabase) return null;

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return mapUserFromDb(data);
  },

  // Update mechanic status (on_duty / off_duty / on_leave)
  async updateMechanicStatus(id, status) {
    if (!config.useSupabase) return null;

    const callerId = getCallerId();
    if (callerId) {
      const { data, error } = await supabase.rpc('app_update_user_status', {
        p_caller_id: callerId,
        p_user_id: id,
        p_status: status,
      });
      if (error) {
        console.error('[updateMechanicStatus] RPC error:', error.message, error.code, error);
        throw new Error(error.message || 'Failed to update status');
      }
      if (!data || data.length === 0) throw new Error('No data returned from status update');
      return mapUserFromDb(data[0]);
    }

    // Fallback: direct query (requires auth session — may fail for PIN users)
    console.warn('[updateMechanicStatus] No callerId, using direct query');
    const { data, error } = await supabase
      .from('users')
      .update({ status })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[updateMechanicStatus] Direct query error:', error.message, error.code, error);
      throw new Error(error.message || 'Failed to update status');
    }
    return mapUserFromDb(data);
  },

  // Create a new user (owner adds mechanic/staff)
  async createUser(userData) {
    if (!config.useSupabase) return null;

    const insertData = {
      name: userData.name,
      phone: userData.phone || null,
      email: userData.email || null,
      role: userData.role,
      mechanic_level: userData.mechanicLevel || null,
      avatar: userData.avatar || userData.name.charAt(0).toUpperCase(),
      color: userData.color || '#6b7280',
      status: 'on_duty',
    };

    // Hash PIN if provided — this MUST succeed for login to work
    if (userData.pin) {
      const { data: hashData, error: hashError } = await supabase.rpc('hash_pin', {
        p_pin: userData.pin,
      });
      if (hashError) throw new Error('Failed to hash PIN: ' + hashError.message);
      if (!hashData) throw new Error('Failed to hash PIN: no data returned');
      insertData.pin_hash = hashData;
    }

    const { data, error } = await supabase
      .from('users')
      .insert(insertData)
      .select()
      .single();

    if (error) throw error;
    return mapUserFromDb(data);
  },

  // Update user details (owner edits mechanic/staff)
  async updateUser(id: string, userData: Record<string, unknown>) {
    if (!config.useSupabase) return null;

    const updateData: Record<string, unknown> = {};
    if (userData.name !== undefined) updateData.name = userData.name;
    if (userData.phone !== undefined) updateData.phone = userData.phone || null;
    if (userData.email !== undefined) updateData.email = userData.email || null;
    if (userData.role !== undefined) updateData.role = userData.role;
    if (userData.mechanicLevel !== undefined) updateData.mechanic_level = userData.mechanicLevel || null;
    if (userData.avatar !== undefined) updateData.avatar = userData.avatar;
    if (userData.color !== undefined) updateData.color = userData.color;

    if (userData.pin) {
      const { data: hashData, error: hashError } = await supabase.rpc('hash_pin', {
        p_pin: userData.pin,
      });
      if (hashError) throw new Error('Failed to hash PIN: ' + hashError.message);
      if (!hashData) throw new Error('Failed to hash PIN: no data returned');
      updateData.pin_hash = hashData;
    }

    const { data, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return mapUserFromDb(data);
  },

  // Deactivate a user (soft delete)
  async deactivateUser(id) {
    if (!config.useSupabase) return null;

    const { error } = await supabase
      .from('users')
      .update({ is_active: false })
      .eq('id', id);

    if (error) throw error;
  },

  // Send heartbeat to mark mechanic as online (for auto-assignment)
  async heartbeat() {
    if (!config.useSupabase) return;
    const callerId = getCallerId();
    if (!callerId) return;
    try {
      await supabase.rpc('app_heartbeat', { p_caller_id: callerId });
    } catch {
      // Silent — heartbeat failure is not critical
    }
  },

};

