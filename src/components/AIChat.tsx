import React from 'react';
import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { MessageCircle, X } from 'lucide-react';
import { ScrollArea } from './ui/scroll-area';
import { auth, db } from '../lib/firebase';
import { collection, onSnapshot } from 'firebase/firestore';

export function AIChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<{role: string, content: string}[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [dataContext, setDataContext] = useState<any>({});

  useEffect(() => {
    if (!auth.currentUser) return;
    const uid = auth.currentUser.uid;
    const unsubsc = [
      onSnapshot(collection(db, 'users', uid, 'transactions'), snap => {
        setDataContext(prev => ({ ...prev, transactions: snap.docs.map(d => d.data()) }));
      }),
      onSnapshot(collection(db, 'users', uid, 'budgets'), snap => {
        setDataContext(prev => ({ ...prev, budgets: snap.docs.map(d => d.data()) }));
      }),
      onSnapshot(collection(db, 'users', uid, 'subscriptions'), snap => {
        setDataContext(prev => ({ ...prev, subscriptions: snap.docs.map(d => d.data()) }));
      })
    ];
    return () => unsubsc.forEach(u => u());
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
            {loading && <div className="text-sm text-muted-foreground">AI is typing...</div>}
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
