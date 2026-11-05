import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { apiFetch } from '../../../utils/api';
import type { AdminSupportSummary, AdminSupportTicket, AdminTicketForm } from '../adminTypes';

function ticketFormFrom(ticket: AdminSupportTicket): AdminTicketForm {
  return { status: ticket.status, priority: ticket.priority, adminNotes: ticket.adminNotes || '' };
}

export function useAdminSupport({ enabled }: { enabled: boolean }) {
  const [supportTickets, setSupportTickets] = useState<AdminSupportTicket[]>([]);
  const [supportSummary, setSupportSummary] = useState<AdminSupportSummary | null>(null);
  const [supportLoading, setSupportLoading] = useState(false);
  const [supportSearch, setSupportSearch] = useState('');
  const [supportStatusFilter, setSupportStatusFilter] = useState('all');
  const [supportTypeFilter, setSupportTypeFilter] = useState('all');
  const [selectedTicket, setSelectedTicket] = useState<AdminSupportTicket | null>(null);
  const [ticketForm, setTicketForm] = useState<AdminTicketForm>({ status: 'open', priority: 'normal', adminNotes: '' });
  const [supportReplyMessage, setSupportReplyMessage] = useState('');
  const [savingTicket, setSavingTicket] = useState(false);
  const [sendingSupportReply, setSendingSupportReply] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    let ignore = false;
    const timer = window.setTimeout(async () => {
      setSupportLoading(true);
      try {
        const params = new URLSearchParams();
        if (supportSearch.trim()) params.set('search', supportSearch.trim());
        if (supportStatusFilter !== 'all') params.set('status', supportStatusFilter);
        if (supportTypeFilter !== 'all') params.set('type', supportTypeFilter);
        const data = await apiFetch<{ tickets: AdminSupportTicket[]; summary: AdminSupportSummary }>(`/api/admin/support/tickets?${params.toString()}`);
        if (ignore) return;
        setSupportTickets(data.tickets);
        setSupportSummary(data.summary);
      } catch (error) {
        if (!ignore) toast.error(error instanceof Error ? error.message : 'Could not load support tickets.');
      } finally {
        if (!ignore) setSupportLoading(false);
      }
    }, 250);

    return () => {
      ignore = true;
      window.clearTimeout(timer);
    };
  }, [enabled, supportSearch, supportStatusFilter, supportTypeFilter]);

  const showUpdatedTicket = (ticket: AdminSupportTicket) => {
    setSupportTickets((items) => items.map((item) => item.id === ticket.id ? ticket : item));
    setSelectedTicket(ticket);
    setTicketForm(ticketFormFrom(ticket));
  };

  const openTicketDetail = (ticket: AdminSupportTicket) => {
    setSelectedTicket(ticket);
    setTicketForm(ticketFormFrom(ticket));
    setSupportReplyMessage('');
  };

  const closeTicketDetail = () => setSelectedTicket(null);

  const saveSelectedTicket = async () => {
    if (!selectedTicket) return;
    setSavingTicket(true);
    try {
      const data = await apiFetch<{ ticket: AdminSupportTicket }>(`/api/admin/support/tickets/${selectedTicket.id}`, {
        method: 'PATCH',
        body: JSON.stringify(ticketForm),
      });
      showUpdatedTicket(data.ticket);
      toast.success('Support ticket updated.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not update support ticket.');
    } finally {
      setSavingTicket(false);
    }
  };

  const sendSupportReply = async () => {
    if (!selectedTicket) return;
    setSendingSupportReply(true);
    try {
      const data = await apiFetch<{ ticket: AdminSupportTicket; message: string }>(`/api/admin/support/tickets/${selectedTicket.id}/reply`, {
        method: 'POST',
        body: JSON.stringify({ replyMessage: supportReplyMessage }),
      });
      showUpdatedTicket(data.ticket);
      setSupportReplyMessage('');
      toast.success(data.message || 'Support reply sent.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not send support reply.');
    } finally {
      setSendingSupportReply(false);
    }
  };

  return {
    closeTicketDetail,
    openTicketDetail,
    saveSelectedTicket,
    savingTicket,
    selectedTicket,
    sendingSupportReply,
    sendSupportReply,
    setSupportReplyMessage,
    setSupportSearch,
    setSupportStatusFilter,
    setSupportTypeFilter,
    setTicketForm,
    supportLoading,
    supportReplyMessage,
    supportSearch,
    supportStatusFilter,
    supportSummary,
    supportTickets,
    supportTypeFilter,
    ticketForm,
  };
}
