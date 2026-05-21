import { useState, useEffect } from 'react';
import { auth, db } from '../../lib/firebase';
import { handleFirestoreError, OperationType } from '../../lib/firestoreAuthError';

export interface Transaction {
  id: string;
  uid: string;
  date: string;
  category_id?: string;
  amount: number;
  type: 'income' | 'expense';
  comment?: string;
}

export interface Category {
  id: string;
  uid: string;
  name: string;
  type: 'income' | 'expense' | 'asset' | 'liability';
  created_at?: number;
  updated_at?: number;
}

export interface Disclosure {
  id: string;
  uid: string;
  name: string;
  type: 'asset' | 'liability';
  category?: string;
  amount: number;
  current_value?: number;
  comment?: string;
  created_at?: number;
  updated_at?: number;
}

export interface UserProfile {
  uid: string;
  email: string;
  name: string;
  currency: string;
  date_format: string;
  locale: string;
  created_at?: number;
  updated_at?: number;
}
export interface Budget {
  id: string;
  uid: string;
  category_id: string;
  limit_amount: number;
  period: 'monthly' | 'yearly';
  created_at?: number;
  updated_at?: number;
}

export interface Subscription {
  id: string;
  uid: string;
  name: string;
  amount: number;
  category_id: string;
  frequency: 'monthly' | 'yearly';
  deduction_date: number;
  deduction_month?: number | null;
  created_at?: number;
  updated_at?: number;
}

export interface CreditCard {
  id: string;
  uid: string;
  name: string;
  due_date: number;
  created_at?: number;
  updated_at?: number;
}

export interface ReportsData {
  transactions: Transaction[];
  categories: Category[];
  budgets: Budget[];
  subscriptions: Subscription[];
  creditCards: CreditCard[];
  disclosures: Disclosure[];
  loading: boolean;
}

export function useReportsData(): ReportsData {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [creditCards, setCreditCards] = useState<CreditCard[]>([]);
  const [disclosures, setDisclosures] = useState<Disclosure[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      const user = auth.currentUser || (typeof (auth as any).getUser === 'function' ? await (auth as any).getUser() : null);
      if (!user) { setLoading(false); return; }
      try {
        const [
          { data: catData },
          { data: transData },
          { data: budData },
          { data: subData },
          { data: ccData },
          { data: discData },
        ] = await Promise.all([
          db.from('categories').select('*').eq('uid', user.uid),
          db.from('transactions').select('*').eq('uid', user.uid), // TODO: Add type assertion for data
          db.from('budgets').select('*').eq('uid', user.uid), // TODO: Add type assertion for data
          db.from('subscriptions').select('*').eq('uid', user.uid), // TODO: Add type assertion for data
          db.from('credit_cards').select('*').eq('uid', user.uid),
          db.from('disclosures').select('*').eq('uid', user.uid),
        ]);
        setCategories((catData as Category[]) || []);
        setTransactions(((transData as Transaction[]) || []).map(t => ({ ...t, amount: Number(t.amount) })).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
        setBudgets((budData as Budget[]) || []);
        setSubscriptions((subData as Subscription[]) || []);
        setCreditCards((ccData as CreditCard[]) || []);
        setDisclosures(((discData as Disclosure[]) || []).map(d => ({ ...d, amount: Number(d.amount), current_value: d.current_value ? Number(d.current_value) : undefined })));
      } catch (err) {
        handleFirestoreError(err, OperationType.LIST, 'reports');
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  return { transactions, categories, budgets, subscriptions, creditCards, disclosures, loading };
}
