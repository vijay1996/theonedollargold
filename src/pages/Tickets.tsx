import { useState, useEffect } from 'react';
import { auth, db } from '../lib/firebase';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Textarea } from '../components/ui/textarea';
import { v4 as uuidv4 } from 'uuid';
import { toast } from 'sonner';
import { handleFirestoreError, OperationType } from '../lib/firestoreAuthError';
import { Bug, Plus, ChevronRight, Clock, CheckCircle2, AlertCircle, ArrowUp } from 'lucide-react';
import LoadingOverlay from '../components/ui/loading-overlay';
import { getUserSubscriptionInfo, isPremium, type SubscriptionInfo } from '../lib/razorpay';
import PageHeader from '../components/layout/PageHeader';

type Ticket = {
  id: string;
  uid: string;
  title: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  created_at: number;
  updated_at: number | null;
};

type TicketCategory = 'bug' | 'feature' | 'other';
type TicketPriority = 'critical' | 'high' | 'normal';
type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';

const PRIORITY_CONFIG: Record<TicketPriority, { label: string; color: string; bg: string }> = {
  critical: { label: 'Critical', color: '#dc2626', bg: '#fef2f2' },
  high:     { label: 'High',     color: '#d97706', bg: '#fffbeb' },
  normal:   { label: 'Normal',   color: '#6b7280', bg: '#f9fafb' },
};

const STATUS_CONFIG: Record<TicketStatus, { label: string; icon: any; color: string }> = {
  open:        { label: 'Open',        icon: AlertCircle,  color: '#6366f1' },
  in_progress: { label: 'In Progress', icon: Clock,        color: '#d97706' },
  resolved:    { label: 'Resolved',    icon: CheckCircle2, color: '#16a34a' },
  closed:      { label: 'Closed',      icon: CheckCircle2, color: '#9ca3af' },
};

const CATEGORY_LABELS: Record<TicketCategory, string> = {
  bug:     'Bug Report',
  feature: 'Feature Request',
  other:   'Other',
};

function getPriority(tier: string, status: string | null): TicketPriority {
  if (tier === 'premium_yearly' && isPremium(tier, status)) return 'critical';
  if (tier === 'premium_monthly' && isPremium(tier, status)) return 'high';
  return 'normal';
}

const formatDate = (ts: number) =>
  new Date(ts).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

export default function Tickets() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(false);
  const [subInfo, setSubInfo] = useState<SubscriptionInfo | null>(null);

  // Form state
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<TicketCategory>('bug');

  useEffect(() => {
    let channel: any;
    const init = async () => {
      setLoading(true);
      const user = auth.currentUser || (typeof (auth as any).getUser === 'function' ? await (auth as any).getUser() : null);
      if (!user) {
        setLoading(false);
        return;
      }
      try {
        const [ticketRes, info] = await Promise.all([
          db.from('support_tickets').select('*').eq('uid', user.uid).order('created_at', { ascending: false }),
          getUserSubscriptionInfo(),
        ]);
        if (ticketRes.error) throw ticketRes.error;
        setTickets(ticketRes.data || []);
        setSubInfo(info);

        const chanTopic = `public:support_tickets_${user.uid}_${Date.now()}`;
        channel = db.channel(chanTopic)
          .on('postgres_changes', {
            event: '*', schema: 'public', table: 'support_tickets', filter: `uid=eq.${user.uid}`,
          }, () => {
            db.from('support_tickets').select('*').eq('uid', user.uid).order('created_at', { ascending: false })
              .then(r => { if (!r.error) setTickets(r.data || []); });
          }).subscribe();
      } catch (err: any) {
        handleFirestoreError(err, OperationType.LIST, 'users/' + user?.uid + '/support_tickets');
      } finally {
        setLoading(false);
      }
    };
    init();
    return () => { if (channel?.unsubscribe) channel.unsubscribe(); };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim() || !auth.currentUser) return;
    setLoading(true);
    try {
      const user = auth.currentUser || (typeof (auth as any).getUser === 'function' ? await (auth as any).getUser() : null);
      const tier = subInfo?.tier || 'free';
      const status = subInfo?.status || null;
      const priority = getPriority(tier, status);
      const id = uuidv4();
      const now = Date.now();

      const payload: Ticket = {
        id,
        uid: user.uid,
        title: title.trim(),
        description: description.trim(),
        category,
        priority,
        status: 'open',
        created_at: now,
        updated_at: now,
      };

      const { error } = await db.from('support_tickets').upsert([payload], { onConflict: 'id' });
      if (error) throw error;

      setTickets(prev => [payload, ...prev]);
      setOpen(false);
      setTitle('');
      setDescription('');
      setCategory('bug');
      toast.success('Ticket submitted! We\'ll get back to you soon.');
    } catch (err: any) {
      toast.error(err.message);
      handleFirestoreError(err, OperationType.CREATE, 'users/' + auth.currentUser.uid + '/support_tickets');
    } finally {
      setLoading(false);
    }
  };

  const premium = subInfo && isPremium(subInfo.tier, subInfo.status);

  return (
    <div className="space-y-6">
      <LoadingOverlay show={loading} label="Processing..." />

      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b">
        <div className="flex w-full flex-col justify-between sm:flex-row sm:flex-wrap">
          <PageHeader title="Support Tickets" description="Report bugs, request features, or get help." />
          <Dialog open={open} onOpenChange={setOpen}>
            <Button onClick={() => setOpen(true)} className="flex items-center bg-indigo-700 hover:bg-indigo-800 text-white border-indigo-900 border-1 font-bold py-2 px-4 rounded">
              <Plus className="h-4 w-4 mr-2" /> Raise a Ticket
            </Button>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Raise a Ticket</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Category</label>
                  <Select value={category} onValueChange={v => setCategory(v as TicketCategory)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category">
                        {CATEGORY_LABELS[category]}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bug">Bug Report</SelectItem>
                      <SelectItem value="feature">Feature Request</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Title</label>
                  <Input
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="Brief summary of the issue"
                    required
                    maxLength={200}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Description</label>
                  <Textarea
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="Describe the issue in detail. Include steps to reproduce if applicable."
                    required
                    rows={5}
                    maxLength={5000}
                  />
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    Priority: <span className="font-medium" style={{ color: PRIORITY_CONFIG[getPriority(subInfo?.tier || 'free', subInfo?.status || null)].color }}>
                      {PRIORITY_CONFIG[getPriority(subInfo?.tier || 'free', subInfo?.status || null)].label}
                    </span>
                    {premium && (
                      <span className="ml-2 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 text-[10px] font-medium">
                        <ArrowUp className="h-2.5 w-2.5" /> priority boosted
                      </span>
                    )}
                  </span>
                  <span>Tickets are reviewed in priority order</span>
                </div>
                <Button type="submit" disabled={loading || !title.trim() || !description.trim()} className="w-full">
                  Submit Ticket
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>

      {/* Ticket List */}
      {tickets.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground border rounded-xl border-dashed">
          <Bug className="h-12 w-12 mx-auto mb-4 opacity-40" />
          <p className="text-lg font-medium">No tickets yet</p>
          <p className="text-sm mt-1">Click "Raise a Ticket" to report a bug or request a feature.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tickets.map(ticket => {
            const pConfig = PRIORITY_CONFIG[ticket.priority as TicketPriority] || PRIORITY_CONFIG.normal;
            const sConfig = STATUS_CONFIG[ticket.status as TicketStatus] || STATUS_CONFIG.open;
            const StatusIcon = sConfig.icon;

            return (
              <Card key={ticket.id} className="hover:shadow-sm transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className="font-medium text-sm truncate">{ticket.title}</h3>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium"
                          style={{ background: pConfig.bg, color: pConfig.color }}>
                          {pConfig.label}
                        </span>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium"
                          style={{ background: '#f3f4f6', color: sConfig.color }}>
                          <StatusIcon className="h-3 w-3" />
                          {sConfig.label}
                        </span>
                        <span className="text-[11px] text-muted-foreground px-1.5 py-0.5 rounded-full bg-slate-100">
                          {CATEGORY_LABELS[ticket.category as TicketCategory] || ticket.category}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">{ticket.description}</p>
                      <p className="text-xs text-muted-foreground mt-2">{formatDate(ticket.created_at)}</p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground/40 shrink-0 mt-1" />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
