import { getSupabaseClient } from './supabase-server';

interface AuditLogEntry {
  table_name: string;
  record_id: string;
  action: 'INSERT' | 'UPDATE' | 'DELETE';
  old_data?: any;
  new_data?: any;
  changed_by?: string;
  ip_address?: string;
  user_agent?: string;
}

export async function logAudit(entry: AuditLogEntry) {
  try {
    const supabase = getSupabaseClient();
    
    const { error } = await supabase
      .from('audit_log')
      .insert({
        table_name: entry.table_name,
        record_id: entry.record_id,
        action: entry.action,
        old_data: entry.old_data || null,
        new_data: entry.new_data || null,
        changed_by: entry.changed_by || 'system',
        ip_address: entry.ip_address || null,
        user_agent: entry.user_agent || null,
        changed_at: new Date().toISOString()
      });

    if (error) {
      console.error('[audit] Failed to log:', error);
    }
  } catch (err) {
    console.error('[audit] Exception:', err);
  }
}
