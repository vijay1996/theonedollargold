import React from 'react';
import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { MessageCircle, X } from 'lucide-react';
import { ScrollArea } from './ui/scroll-area';
import { auth, db } from '../lib/firebase';
import Loader from './ui/loader';

export function AIChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<{role: string, content: string}[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [dataContext, setDataContext] = useState<any>({});

  useEffect(() => {
    let channel: any;
    const init = async () => {
      const user = auth.currentUser || await auth.getUser();
      if (!user) return;
      try {
        const [{ data: tData }, { data: bData }, { data: sData }] = await Promise.all([
          db.from('transactions').select('*').eq('uid', user.uid),
          db.from('budgets').select('*').eq('uid', user.uid),
          db.from('subscriptions').select('*').eq('uid', user.uid)
        ]);
        setDataContext({ transactions: tData || [], budgets: bData || [], subscriptions: sData || [] });

        // use a unique channel topic per mount to avoid adding handlers to an already-subscribed channel
        const chanTopic = `public:ai_data_${user.uid}_${Date.now()}`;
        channel = db.channel(chanTopic)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions', filter: `uid=eq.${user.uid}` }, () => {
            db.from('transactions').select('*').eq('uid', user.uid).then(r => { if (!r.error) setDataContext(prev => ({ ...prev, transactions: r.data || [] })); });
          })
          .on('postgres_changes', { event: '*', schema: 'public', table: 'budgets', filter: `uid=eq.${user.uid}` }, () => {
            db.from('budgets').select('*').eq('uid', user.uid).then(r => { if (!r.error) setDataContext(prev => ({ ...prev, budgets: r.data || [] })); });
          })
          .on('postgres_changes', { event: '*', schema: 'public', table: 'subscriptions', filter: `uid=eq.${user.uid}` }, () => {
            db.from('subscriptions').select('*').eq('uid', user.uid).then(r => { if (!r.error) setDataContext(prev => ({ ...prev, subscriptions: r.data || [] })); });
          }).subscribe();
      } catch (err) {
        console.error(err);
      }
    };
    init();
    return () => { if (channel?.unsubscribe) channel.unsubscribe(); };
  }, []);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const newMessages = [...messages, { role: 'user', content: input }];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages,
          dataContext
        })
      });
      const data = await response.json();
      if (data.message) {
        setMessages([...newMessages, data.message]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!open) {
    return (
      <Button 
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg" 
        onClick={() => setOpen(true)}
      >
        <MessageCircle className="h-6 w-6" />
      </Button>
    );
  }

  return (
    <Card className="fixed bottom-6 right-6 w-96 shadow-2xl flex flex-col h-[500px] z-50">
      <CardHeader className="flex flex-row items-center justify-between py-3 bg-primary text-primary-foreground rounded-t-xl">
        <CardTitle className="text-lg">Finance AI Assistant</CardTitle>
        <Button variant="ghost" size="icon" onClick={() => setOpen(false)} className="text-primary-foreground hover:bg-primary/90">
          <X className="h-5 w-5" />
        </Button>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col p-4 overflow-hidden">
        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-4">
            {messages.length === 0 && (
              <div className="text-center text-muted-foreground text-sm mt-4">
                Ask me for tips, analysis, or advice based on your financial data!
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={"flex flex-col " + (m.role === 'user' ? 'items-end' : 'items-start')}>
                <div className={"px-3 py-2 rounded-lg max-w-[85%] text-sm " + (m.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-slate-100 text-slate-900')}>
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex items-start py-2">
                <div className="rounded-lg bg-slate-900 px-4 py-3">
                  <Loader size={28} label="AI is typing" />
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
        <form onSubmit={sendMessage} className="mt-4 flex gap-2">
          <Input 
            value={input} 
            onChange={(e) => setInput(e.target.value)} 
            placeholder="Ask anything..." 
            disabled={loading}
          />
          <Button type="submit" disabled={loading}>Send</Button>
        </form>
      </CardContent>
    </Card>
  );
}
