import { supabase } from '../lib/supabase';
import { config } from '../lib/config';
import { SERVICE_TYPES } from '../lib/constants';
import { getToday, getTimeBlock } from '../lib/helpers';
import { mapJobFromDb, mapJobToDb } from '../lib/mappers';
import { createJobSchema, paymentSchema, validate } from '../lib/validation';
import { getCallerId } from '../lib/authStore';

// ============================================================
// Job Service — uses SECURITY DEFINER RPCs (no auth session needed)
// ============================================================

export const jobService = {
  // Fetch all jobs for a given date, including incomplete carryover
  async getJobsForDate(date = getToday()) {
    if (!config.useSupabase) return null;

    const callerId = getCallerId();
    if (callerId) {
      // Use RPC (works for all users, no auth session needed)
      const { data, error } = await supabase.rpc('app_get_jobs', {
        p_caller_id: callerId,
        p_date: date,
      });
      if (error) throw error;
      return (data || []).map(mapJobFromDb);
    }

    // Fallback: direct query (requires auth session)
    const { data, error } = await supabase
      .from('jobs')
      .select('*')
      .or(`date.eq.${date},and(date.lt.${date},status.neq.completed)`)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data.map(mapJobFromDb);
  },

  // Fetch jobs for a specific mechanic on a date
  async getJobsForMechanic(mechanicId, date = getToday()) {
    if (!config.useSupabase) return null;

    const callerId = getCallerId();
    if (callerId) {
      // Use app_get_jobs — it filters by mechanic for junior mechanics
      const { data, error } = await supabase.rpc('app_get_jobs', {
        p_caller_id: callerId,
        p_date: date,
      });
      if (error) throw error;
      // Client-side filter for specific mechanic
      return (data || []).map(mapJobFromDb).filter(j => j.mechanicId === mechanicId);
    }

    const { data, error } = await supabase
      .from('jobs')
      .select('*')
      .eq('mechanic_id', mechanicId)
      .eq('date', date)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data.map(mapJobFromDb);
  },

  // Create a new job
  async createJob(jobData) {
    if (!config.useSupabase) return null;

    validate(createJobSchema, jobData);

    const st = SERVICE_TYPES[jobData.serviceType] || SERVICE_TYPES.regular;
    const callerId = getCallerId();

    if (callerId) {
      const { data, error } = await supabase.rpc('app_create_job', {
        p_caller_id: callerId,
        p_customer_name: jobData.customerName,
        p_customer_phone: jobData.customerPhone || null,
        p_bike: jobData.bike,
        p_service_type: jobData.serviceType || 'regular',
        p_issue: jobData.issue || null,
        p_priority: jobData.priority || 'standard',
        p_estimated_min: st.time,
        p_bike_id: jobData.bikeId || null,
        p_customer_id: jobData.customerId || null,
        p_labor_charge: jobData.laborCharge != null ? Number(jobData.laborCharge) : null,
        p_services: JSON.stringify(jobData.services || []),
        p_checkin_parts: JSON.stringify(jobData.checkinParts || []),
        p_photo_before: jobData.photoBefore || null,
        p_photo_after: jobData.photoAfter || null,
      });
      if (error) {
        console.error('[createJob] RPC error:', error.message, error.code, error);
        throw new Error(error.message || 'Failed to create job');
      }
      if (!data || data.length === 0) throw new Error('No data returned from job creation');
      return mapJobFromDb(data[0]);
    }

    // Fallback: direct insert (requires auth session)
    const { data, error } = await supabase
      .from('jobs')
      .insert({
        customer_name: jobData.customerName,
        customer_phone: jobData.customerPhone,
        bike: jobData.bike,
        service_type: jobData.serviceType || 'regular',
        issue: jobData.issue || null,
        priority: jobData.priority || 'standard',
        status: 'received',
        estimated_min: st.time,
        date: getToday(),
        time_block: getTimeBlock(),
        bike_id: jobData.bikeId || null,
        customer_id: jobData.customerId || null,
        labor_charge: jobData.laborCharge != null ? Number(jobData.laborCharge) : null,
        created_by: jobData.createdBy || null,
        services: jobData.services || [],
        checkin_parts: jobData.checkinParts || [],
      })
      .select()
      .single();

    if (error) throw error;
    return mapJobFromDb(data);
  },

  // Update job status
  async updateJobStatus(jobId, status, extras = {}) {
    if (!config.useSupabase) return null;

    const callerId = getCallerId();
    if (callerId) {
      const updates = { status, ...mapJobToDb(extras) };
      const { data, error } = await supabase.rpc('app_update_job', {
        p_caller_id: callerId,
        p_job_id: jobId,
        p_updates: updates,
      });
      if (error) {
        console.error('[updateJobStatus] RPC error:', error.message, error.code, error);
        throw new Error(error.message || 'Failed to update job');
      }
      if (!data || data.length === 0) throw new Error('No data returned from job update');
      return mapJobFromDb(data[0]);
    }

    const updateData = { status, ...mapJobToDb(extras) };
    const { data, error } = await supabase
      .from('jobs')
      .update(updateData)
      .eq('id', jobId)
      .select()
      .single();

    if (error) throw error;
    return mapJobFromDb(data);
  },

  // Assign a job to a mechanic
  async assignJob(jobId, mechanicId) {
    if (!config.useSupabase) return null;

    const callerId = getCallerId();
    if (callerId) {
      // Use app_update_job since app_assign_job is admin-only
      const { data, error } = await supabase.rpc('app_update_job', {
        p_caller_id: callerId,
        p_job_id: jobId,
        p_updates: { mechanic_id: mechanicId, status: 'assigned' },
      });
      if (error) throw error;
      if (!data || data.length === 0) throw new Error('Failed to assign job');
      return mapJobFromDb(data[0]);
    }

    const { data, error } = await supabase
      .from('jobs')
      .update({ mechanic_id: mechanicId, status: 'assigned' })
      .eq('id', jobId)
      .select()
      .single();

    if (error) throw error;
    return mapJobFromDb(data);
  },

  // Process payment
  async processPayment(jobId, method) {
    if (!config.useSupabase) return null;

    validate(paymentSchema, { jobId, method });

    const callerId = getCallerId();
    if (callerId) {
      const { data, error } = await supabase.rpc('app_update_job', {
        p_caller_id: callerId,
        p_job_id: jobId,
        p_updates: {
          status: 'completed',
          payment_method: method,
          paid_at: new Date().toISOString(),
        },
      });
      if (error) throw error;
      if (!data || data.length === 0) throw new Error('Failed to process payment');
      return mapJobFromDb(data[0]);
    }

    const { data, error } = await supabase
      .from('jobs')
      .update({
        status: 'completed',
        payment_method: method,
        paid_at: new Date().toISOString(),
      })
      .eq('id', jobId)
      .select()
      .single();

    if (error) throw error;
    return mapJobFromDb(data);
  },

  // Get dashboard stats for a date
  async getDashboardStats(date = getToday()) {
    if (!config.useSupabase) return null;

    const jobs = await this.getJobsForDate(date);
    if (!jobs) return null;

    const completed = jobs.filter(j => j.status === 'completed');
    return {
      totalJobs: jobs.length,
      completed: completed.length,
      inProgress: jobs.filter(j => j.status === 'in_progress').length,
      partsPending: jobs.filter(j => j.status === 'parts_pending').length,
      ready: jobs.filter(j => j.status === 'ready').length,
      qc: jobs.filter(j => j.status === 'quality_check').length,
      revenue: completed.reduce((s, j) => s + (j.totalCost || 0), 0),
      jobs,
    };
  },
};
