/**
 * Supabase Edge Function: Clean up expired reports
 *
 * Purpose: Automatically delete reports that have expired (48+ hours old)
 * Schedule: Daily cron job (2 AM)
 *
 * This function:
 * 1. Queries for reports with expires_at < now()
 * 2. Deletes them and their associated access logs
 * 3. Logs the operation for audit purposes
 * 4. Returns cleanup statistics
 *
 * Deploy: supabase functions deploy cleanup-expired-reports
 * Schedule: In Supabase Dashboard → Cron Jobs → Add daily at 02:00
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get Supabase client from environment
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing Supabase configuration');
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Missing Supabase configuration',
          timestamp: new Date().toISOString()
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const timestamp = new Date().toISOString();
    console.log(`[Cleanup] Starting expired report cleanup at ${timestamp}`);

    // Step 1: Find all expired reports
    const findExpiredResponse = await fetch(
      `${supabaseUrl}/rest/v1/generated_reports?expires_at=lt.${encodeURIComponent(timestamp)}&select=id,email,access_token`,
      {
        method: 'GET',
        headers: {
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'count=exact'
        }
      }
    );

    if (!findExpiredResponse.ok) {
      throw new Error(`Failed to query expired reports: ${findExpiredResponse.statusText}`);
    }

    const expiredReports = await findExpiredResponse.json();
    const expiredCount = expiredReports.length;

    console.log(`[Cleanup] Found ${expiredCount} expired reports to clean up`);

    // Step 2: Delete associated access logs for each expired report
    let accessLogsDeleted = 0;

    for (const report of expiredReports) {
      try {
        const deleteLogsResponse = await fetch(
          `${supabaseUrl}/rest/v1/report_access_log?report_id=eq.${encodeURIComponent(report.id)}`,
          {
            method: 'DELETE',
            headers: {
              'apikey': supabaseServiceKey,
              'Authorization': `Bearer ${supabaseServiceKey}`,
              'Content-Type': 'application/json',
              'Prefer': 'count=exact'
            }
          }
        );

        if (deleteLogsResponse.ok) {
          accessLogsDeleted++;
        }
      } catch (error) {
        console.warn(`[Cleanup] Error deleting logs for report ${report.id}:`, error);
      }
    }

    // Step 3: Delete all expired reports
    const deleteReportsResponse = await fetch(
      `${supabaseUrl}/rest/v1/generated_reports?expires_at=lt.${encodeURIComponent(timestamp)}`,
      {
        method: 'DELETE',
        headers: {
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'count=exact'
        }
      }
    );

    if (!deleteReportsResponse.ok) {
      throw new Error(`Failed to delete reports: ${deleteReportsResponse.statusText}`);
    }

    const completedTime = new Date().toISOString();
    console.log(`[Cleanup] Cleanup completed at ${completedTime}`);
    console.log(`[Cleanup] Statistics: ${expiredCount} reports deleted, ${accessLogsDeleted} access logs cleaned`);

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        operation: 'cleanup-expired-reports',
        timestamp: completedTime,
        stats: {
          reportsDeleted: expiredCount,
          accessLogsDeleted: accessLogsDeleted,
          totalRemoved: expiredCount + accessLogsDeleted
        },
        message: `Successfully cleaned up ${expiredCount} expired reports and ${accessLogsDeleted} access logs`
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('[Cleanup] Error during cleanup:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
