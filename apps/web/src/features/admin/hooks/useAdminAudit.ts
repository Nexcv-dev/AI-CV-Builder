import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { apiFetch } from '../../../utils/api';
import type { AdminAuditLogItem } from '../adminTypes';

export function useAdminAudit({ enabled }: { enabled: boolean }) {
  const [auditLogs, setAuditLogs] = useState<AdminAuditLogItem[]>([]);
  const [auditActions, setAuditActions] = useState<string[]>([]);
  const [auditTargetTypes, setAuditTargetTypes] = useState<string[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditSearch, setAuditSearch] = useState('');
  const [auditActionFilter, setAuditActionFilter] = useState('all');
  const [auditTargetTypeFilter, setAuditTargetTypeFilter] = useState('all');

  useEffect(() => {
    if (!enabled) return;
    let ignore = false;
    const timer = window.setTimeout(async () => {
      setAuditLoading(true);
      try {
        const params = new URLSearchParams();
        if (auditSearch.trim()) params.set('search', auditSearch.trim());
        if (auditActionFilter !== 'all') params.set('action', auditActionFilter);
        if (auditTargetTypeFilter !== 'all') params.set('targetType', auditTargetTypeFilter);
        const data = await apiFetch<{ logs: AdminAuditLogItem[]; filters: { actions: string[]; targetTypes: string[] } }>(`/api/admin/audit-logs?${params.toString()}`);
        if (ignore) return;
        setAuditLogs(data.logs);
        setAuditActions(data.filters.actions);
        setAuditTargetTypes(data.filters.targetTypes);
      } catch (error) {
        if (!ignore) toast.error(error instanceof Error ? error.message : 'Could not load audit logs.');
      } finally {
        if (!ignore) setAuditLoading(false);
      }
    }, 250);

    return () => {
      ignore = true;
      window.clearTimeout(timer);
    };
  }, [auditActionFilter, auditSearch, auditTargetTypeFilter, enabled]);

  return {
    auditActionFilter,
    auditActions,
    auditLoading,
    auditLogs,
    auditSearch,
    auditTargetTypeFilter,
    auditTargetTypes,
    setAuditActionFilter,
    setAuditSearch,
    setAuditTargetTypeFilter,
  };
}
