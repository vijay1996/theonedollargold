import { useState, useEffect } from 'react';
import { auth, db } from '../../lib/firebase';
import { handleFirestoreError, OperationType } from '../../lib/firestoreAuthError';

export interface ReportsData {
  transactions: any[];
  categories: any[];
  budgets: any[];
  subscriptions: any[];
  creditCards: any[];
  disclosures: any[];
  loading: boolean;
}

export function useReportsData(): ReportsData {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [budgets, setBudgets] = useState<any[]>([]);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [creditCards, setCreditCards] = useState<any[]>([]);
  const [disclosures, setDisclosures] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      const user = auth.currentUser || await auth.getUser();
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
          db.from('transactions').select('*').eq('uid', user.uid),
          db.from('budgets').select('*').eq('uid', user.uid),
          db.from('subscriptions').select('*').eq('uid', user.uid),
          db.from('credit_cards').select('*').eq('uid', user.uid),
          db.from('disclosures').select('*').eq('uid', user.uid),
        ]);
        setCategories(catData || []);
        setTransactions((transData || []).sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime()));
        setBudgets(budData || []);
        setSubscriptions(subData || []);
        setCreditCards(ccData || []);
        setDisclosures(discData || []);
      } catch (err: any) {
        handleFirestoreError(err, OperationType.LIST, 'reports');
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  return { transactions, categories, budgets, subscriptions, creditCards, disclosures, loading };
}
