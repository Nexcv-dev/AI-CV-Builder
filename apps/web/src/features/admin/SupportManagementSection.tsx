import React from 'react';
import {
  Eye,
  Loader2,
  Search,
  Send,
  X,
} from 'lucide-react';
import type { AdminSupportTicket } from './adminTypes';
import { formatDate } from './adminUtils';
import { DetailTile, TicketStatusBadge } from './AdminSharedComponents';

export default function SupportManagementSection({
  tickets,
  summary,
  loading,
  search,
  statusFilter,
  typeFilter,
  selectedTicket,
  ticketForm,
  replyMessage,
  savingTicket,
  sendingReply,
  onSearchChange,
  onStatusFilterChange,
  onTypeFilterChange,
  onOpenTicket,
  onCloseDetail,
  onFormChange,
  onSaveTicket,
  onReplyMessageChange,
  onSendReply,
}: {
  tickets: AdminSupportTicket[];
  summary: Record<'open' | 'pending' | 'resolved' | 'closed', number> | null;
  loading: boolean;
  search: string;
  statusFilter: string;
  typeFilter: string;
  selectedTicket: AdminSupportTicket | null;
  ticketForm: { status: AdminSupportTicket['status']; priority: AdminSupportTicket['priority']; adminNotes: string };
  replyMessage: string;
  savingTicket: boolean;
  sendingReply: boolean;
  onSearchChange: (value: string) => void;
  onStatusFilterChange: (value: string) => void;
  onTypeFilterChange: (value: string) => void;
  onOpenTicket: (ticket: AdminSupportTicket) => void;
  onCloseDetail: () => void;
  onFormChange: (value: { status: AdminSupportTicket['status']; priority: AdminSupportTicket['priority']; adminNotes: string }) => void;
  onSaveTicket: () => void;
  onReplyMessageChange: (value: string) => void;
  onSendReply: () => void;
}) {
  return (
    <section className="mt-6">
      <div className="grid gap-3 sm:grid-cols-4">
        {(['open', 'pending', 'resolved', 'closed'] as const).map((status) => (
          <article key={status} className="rounded-2xl border border-white/10 bg-white/[0.035] p-4 shadow-xl shadow-black/10">
            <p className="text-xs font-black uppercase text-slate-500">{status}</p>
            <p className="mt-2 text-3xl font-black">{summary?.[status] || 0}</p>
          </article>
        ))}
      </div>

      <div className="mt-4 grid gap-3 rounded-2xl border border-white/10 bg-white/[0.035] p-4 shadow-xl shadow-black/10 md:grid-cols-[1fr_180px_190px]">
        <label className="relative block">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            className="h-11 w-full rounded-xl border border-white/10 bg-slate-950 pl-10 pr-3 text-sm font-bold text-white outline-none transition placeholder:text-slate-600 focus:border-violet-400"
            placeholder="Search tickets"
          />
        </label>
        <select value={statusFilter} onChange={(event) => onStatusFilterChange(event.target.value)} className="h-11 rounded-xl border border-white/10 bg-slate-950 px-3 text-sm font-bold text-white outline-none focus:border-violet-400">
          <option value="all">All statuses</option>
          <option value="open">Open</option>
          <option value="pending">Pending</option>
          <option value="resolved">Resolved</option>
          <option value="closed">Closed</option>
        </select>
        <select value={typeFilter} onChange={(event) => onTypeFilterChange(event.target.value)} className="h-11 rounded-xl border border-white/10 bg-slate-950 px-3 text-sm font-bold text-white outline-none focus:border-violet-400">
          <option value="all">All types</option>
          <option value="general">General</option>
          <option value="complaint">Complaint</option>
          <option value="bug">Bug Report</option>
          <option value="feature_request">Feature Request</option>
          <option value="payment_issue">Payment Issue</option>
        </select>
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.035] shadow-2xl shadow-black/15">
        <div className="grid grid-cols-[1.2fr_140px_110px_110px_90px] gap-3 border-b border-white/10 px-5 py-3 text-xs font-black uppercase text-slate-500 max-lg:hidden">
          <span>Ticket</span>
          <span>User</span>
          <span>Type</span>
          <span>Status</span>
          <span>Action</span>
        </div>
        {loading && (
          <div className="flex items-center gap-3 px-5 py-5 text-sm font-bold text-slate-400">
            <Loader2 className="animate-spin text-violet-300" size={17} />
            Loading tickets...
          </div>
        )}
        {!loading && tickets.length === 0 && (
          <div className="px-5 py-8 text-center text-sm font-bold text-slate-500">No support tickets match these filters.</div>
        )}
        {!loading && tickets.map((ticket) => (
          <article key={ticket.id} className="grid gap-3 border-b border-white/10 px-4 py-4 last:border-b-0 lg:grid-cols-[1.2fr_140px_110px_110px_90px] lg:items-center lg:px-5">
            <div className="min-w-0">
              <p className="truncate text-sm font-black text-slate-100">{ticket.subject}</p>
              <p className="mt-1 line-clamp-1 text-xs font-semibold text-slate-500">{ticket.message}</p>
              <p className="mt-1 text-xs font-bold text-slate-600">{formatDate(ticket.createdAt)}</p>
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-slate-200">{ticket.fullName}</p>
              <p className="mt-1 truncate text-xs font-semibold text-slate-500">{ticket.email}</p>
            </div>
            <span className="w-fit rounded-full bg-slate-900 px-3 py-1 text-xs font-black text-slate-300 ring-1 ring-white/10">{ticket.type}</span>
            <TicketStatusBadge status={ticket.status} priority={ticket.priority} />
            <button type="button" onClick={() => onOpenTicket(ticket)} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/6 px-3 text-xs font-black text-slate-100 transition hover:bg-white/10 active:scale-[0.98]">
              <Eye size={14} />
              View
            </button>
          </article>
        ))}
      </div>

      {selectedTicket && (
        <div className="fixed inset-0 z-80 flex justify-end bg-slate-950/70 backdrop-blur-sm" role="dialog" aria-modal="true">
          <aside className="h-full w-full max-w-xl overflow-y-auto border-l border-white/10 bg-slate-950 p-5 text-white shadow-2xl shadow-black/40">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs font-black uppercase text-violet-300">Support Ticket</p>
                <h2 className="mt-1 truncate font-montserrat text-2xl font-black">{selectedTicket.subject}</h2>
                <p className="mt-1 truncate text-sm font-semibold text-slate-400">{selectedTicket.email}</p>
              </div>
              <button type="button" onClick={onCloseDetail} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/6 text-slate-300 transition hover:bg-white/10 hover:text-white" aria-label="Close ticket details">
                <X size={17} />
              </button>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <DetailTile label="Name" value={selectedTicket.fullName} />
              <DetailTile label="Email" value={selectedTicket.email} />
              <DetailTile label="Type" value={selectedTicket.type} />
              <DetailTile label="Created" value={formatDate(selectedTicket.createdAt)} />
            </div>

            <section className="mt-6 rounded-2xl border border-white/10 bg-white/[0.035] p-4">
              <h3 className="font-montserrat text-lg font-black">Message</h3>
              <p className="mt-3 whitespace-pre-wrap text-sm font-semibold leading-6 text-slate-300">{selectedTicket.message}</p>
            </section>

            <section className="mt-6 rounded-2xl border border-white/10 bg-white/[0.035] p-4">
              <h3 className="font-montserrat text-lg font-black">Reply</h3>
              <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">Uses the managed Support Reply email template from Notifications.</p>
              <div className="mt-4 grid gap-4">
                <textarea
                  value={replyMessage}
                  onChange={(event) => onReplyMessageChange(event.target.value)}
                  rows={5}
                  className="rounded-xl border border-white/10 bg-slate-950 px-3 py-3 text-sm font-bold text-white outline-none focus:border-violet-400"
                  placeholder="Write the message that will replace {{replyMessage}}"
                />
                <button type="button" onClick={onSendReply} disabled={sendingReply || !replyMessage.trim()} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-black text-white transition hover:bg-emerald-500 active:scale-[0.98] disabled:opacity-60">
                  {sendingReply ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
                  Send reply
                </button>
              </div>
            </section>

            <section className="mt-6 rounded-2xl border border-white/10 bg-white/[0.035] p-4">
              <h3 className="font-montserrat text-lg font-black">Admin Workflow</h3>
              <div className="mt-4 grid gap-4">
                <select value={ticketForm.status} onChange={(event) => onFormChange({ ...ticketForm, status: event.target.value as AdminSupportTicket['status'] })} className="h-11 rounded-xl border border-white/10 bg-slate-950 px-3 text-sm font-bold text-white outline-none focus:border-violet-400">
                  <option value="open">Open</option>
                  <option value="pending">Pending</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                </select>
                <select value={ticketForm.priority} onChange={(event) => onFormChange({ ...ticketForm, priority: event.target.value as AdminSupportTicket['priority'] })} className="h-11 rounded-xl border border-white/10 bg-slate-950 px-3 text-sm font-bold text-white outline-none focus:border-violet-400">
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
                <textarea value={ticketForm.adminNotes} onChange={(event) => onFormChange({ ...ticketForm, adminNotes: event.target.value })} rows={5} className="rounded-xl border border-white/10 bg-slate-950 px-3 py-3 text-sm font-bold text-white outline-none focus:border-violet-400" placeholder="Admin notes" />
                <button type="button" onClick={onSaveTicket} disabled={savingTicket} className="inline-flex h-11 items-center justify-center rounded-xl bg-violet-600 px-4 text-sm font-black text-white transition hover:bg-violet-500 active:scale-[0.98] disabled:opacity-60">
                  {savingTicket ? <Loader2 className="animate-spin" size={16} /> : 'Save ticket'}
                </button>
              </div>
            </section>
          </aside>
        </div>
      )}
    </section>
  );
}
