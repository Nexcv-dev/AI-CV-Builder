import { Router, Request, Response } from 'express';
import { bindDeps, type RouteDeps } from '../_shared';


export function registerAdminSupportRoutes(router: Router, deps: RouteDeps) {
    const { SupportTicket, requireAdminPermission, sendError, currentUserId, isValidDocumentId, sanitizeProfileField, escapeRegex, SUPPORT_TICKET_STATUSES, SUPPORT_TICKET_TYPES, SUPPORT_TICKET_PRIORITIES, adminSupportTicketSummary, recordAdminAuditLog, sendSystemEmail, emailGreetingName, mergeEmailTemplates, renderEmailTemplate } = bindDeps(deps);

    router.get('/api/admin/support/tickets', requireAdminPermission('support.read'), async (req: Request, res: Response) => {
        try {
            const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
            const status = typeof req.query.status === 'string' ? req.query.status.trim() : '';
            const type = typeof req.query.type === 'string' ? req.query.type.trim() : '';
            const priority = typeof req.query.priority === 'string' ? req.query.priority.trim() : '';
            const filter: any = {};
    
            if (SUPPORT_TICKET_STATUSES.includes(status as any)) filter.status = status;
            if (SUPPORT_TICKET_TYPES.includes(type as any)) filter.type = type;
            if (SUPPORT_TICKET_PRIORITIES.includes(priority as any)) filter.priority = priority;
            if (search) {
                const pattern = new RegExp(escapeRegex(search), 'i');
                filter.$or = [{ fullName: pattern }, { email: pattern }, { subject: pattern }, { message: pattern }];
            }
    
            const [tickets, statusCounts] = await Promise.all([
                SupportTicket.find(filter).sort({ createdAt: -1 }).limit(100).populate('userId', 'email displayName'),
                SupportTicket.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
            ]);
            const statusCountMap = new Map(statusCounts.map((item: any) => [item._id, item.count]));
    
            return res.json({
                tickets: tickets.map(adminSupportTicketSummary),
                summary: {
                    open: statusCountMap.get('open') || 0,
                    pending: statusCountMap.get('pending') || 0,
                    resolved: statusCountMap.get('resolved') || 0,
                    closed: statusCountMap.get('closed') || 0,
                },
            });
        } catch (error) {
            return sendError(res, 500, 'Could not load support tickets.', error);
        }
    });


    router.patch('/api/admin/support/tickets/:id', requireAdminPermission('support.write'), async (req: Request, res: Response) => {
        try {
            if (!isValidDocumentId(req.params.id)) {
                return res.status(400).json({ error: 'Invalid ticket id.' });
            }
    
            const update: any = {};
            if (SUPPORT_TICKET_STATUSES.includes(req.body.status)) update.status = req.body.status;
            if (SUPPORT_TICKET_PRIORITIES.includes(req.body.priority)) update.priority = req.body.priority;
            if (typeof req.body.adminNotes === 'string') update.adminNotes = sanitizeProfileField(req.body.adminNotes, 2000);
    
            const existingTicket = await SupportTicket.findById(req.params.id).select('status priority adminNotes email subject');
            const ticket = await SupportTicket.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true }).populate('userId', 'email displayName');
            if (!ticket) {
                return res.status(404).json({ error: 'Support ticket not found.' });
            }
            await recordAdminAuditLog({
                actorId: currentUserId(req),
                action: 'support.ticket.updated',
                targetType: 'support_ticket',
                targetId: ticket._id.toString(),
                targetLabel: ticket.subject,
                metadata: {
                    previousStatus: existingTicket?.status,
                    nextStatus: ticket.status,
                    previousPriority: existingTicket?.priority,
                    nextPriority: ticket.priority,
                    notesChanged: existingTicket?.adminNotes !== ticket.adminNotes,
                },
                ip: req.ip,
                userAgent: req.get('user-agent'),
            });
    
            return res.json({ ticket: adminSupportTicketSummary(ticket) });
        } catch (error) {
            return sendError(res, 500, 'Could not update support ticket.', error);
        }
    });

    router.post('/api/admin/support/tickets/:id/reply', requireAdminPermission('support.write'), async (req: Request, res: Response) => {
        try {
            if (!isValidDocumentId(req.params.id)) {
                return res.status(400).json({ error: 'Invalid ticket id.' });
            }

            const replyMessage = sanitizeProfileField(req.body.replyMessage, 3000);
            if (!replyMessage || replyMessage.length < 3) {
                return res.status(400).json({ error: 'Enter a reply message.' });
            }

            const ticket = await SupportTicket.findById(req.params.id).populate('userId', 'email displayName');
            if (!ticket) {
                return res.status(404).json({ error: 'Support ticket not found.' });
            }

            const templates = mergeEmailTemplates((req as any).appSettings?.emailTemplates);
            const email = renderEmailTemplate(templates.supportReply, {
                name: emailGreetingName(ticket.fullName),
                replyMessage,
                ticketSubject: ticket.subject,
                ticketId: ticket._id.toString(),
            });

            await sendSystemEmail({
                to: ticket.email,
                replyTo: (req.user as any)?.email,
                subject: email.subject,
                text: email.text,
            });

            ticket.adminNotes = [ticket.adminNotes, `Reply sent at ${new Date().toISOString()}:\n${replyMessage}`].filter(Boolean).join('\n\n');
            ticket.status = ticket.status === 'closed' ? 'closed' : 'pending';
            await ticket.save();

            await recordAdminAuditLog({
                actorId: currentUserId(req),
                action: 'support.ticket.updated',
                targetType: 'support_ticket',
                targetId: ticket._id.toString(),
                targetLabel: ticket.subject,
                metadata: { replySent: true },
                ip: req.ip,
                userAgent: req.get('user-agent'),
            });

            return res.json({ ticket: adminSupportTicketSummary(ticket), message: 'Support reply sent.' });
        } catch (error) {
            return sendError(res, 500, 'Could not send support reply.', error);
        }
    });

}

