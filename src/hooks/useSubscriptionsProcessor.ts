import { useEffect, useRef } from 'react';
import { auth, db } from '../lib/firebase';
import { v4 as uuidv4 } from 'uuid';
import { format, parseISO } from 'date-fns';

export function useSubscriptionsProcessor() {
  const processed = useRef(false);

  useEffect(() => {
    if (!auth.currentUser) return;
    if (processed.current) return;

    const processSubscriptions = async () => {
      processed.current = true;
      try {
        const uid = auth.currentUser!.uid;

        const { data: subscriptions } = await db.from('subscriptions').select('*').eq('uid', uid);
        if (!subscriptions || subscriptions.length === 0) return;

        const { data: transactions } = await db.from('transactions').select('*').eq('uid', uid);

        const inserts: any[] = [];

        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        const currentDate = now.getDate();

        subscriptions.forEach((sub: any) => {
          let shouldProcess = false;
          let expectedDate: Date | undefined;

          if (sub.frequency === 'yearly') {
            const subMonth = sub.deduction_month ? sub.deduction_month - 1 : (sub.deductionMonth ? sub.deductionMonth - 1 : 0);
            if (currentYear > 2000) {
              const dedDate = sub.deduction_date ?? sub.deductionDate;
              if (currentMonth > subMonth || (currentMonth === subMonth && currentDate >= dedDate)) {
                shouldProcess = true;
                expectedDate = new Date(currentYear, subMonth, dedDate);
              }
            }
          } else {
            const dedDate = sub.deduction_date ?? sub.deductionDate;
            if (currentDate >= dedDate) {
              shouldProcess = true;
              expectedDate = new Date(currentYear, currentMonth, dedDate);
            }
          }

          if (shouldProcess && expectedDate) {
            const expectedDateStr = format(expectedDate, 'yyyy-MM-dd');
            const hasTransaction = (transactions || []).some((t: any) => {
              if ((t.subscription_id || t.subscriptionId) === sub.id) {
                const tDate = parseISO(t.date);
                if (sub.frequency === 'yearly') {
                  return tDate.getFullYear() === currentYear;
                } else {
                  return tDate.getMonth() === expectedDate!.getMonth() && tDate.getFullYear() === currentYear;
                }
              }
              return false;
            });

            if (!hasTransaction) {
              const tId = uuidv4();
              inserts.push({
                id: tId,
                uid,
                date: expectedDateStr,
                category_id: sub.category_id || sub.categoryId,
                amount: parseFloat(sub.amount),
                type: 'expense',
                comment: `${sub.name} (Subscription)`,
                subscription_id: sub.id,
                created_at: now.getTime(),
                updated_at: now.getTime()
              });
            }
          }
        });

        if (inserts.length > 0) {
          const { error } = await db.from('transactions').insert(inserts);
          if (error) {
            console.error('Failed to insert subscription transactions', error);
          } else {
            console.log(`Processed ${inserts.length} subscription transactions`);
          }
        }

      } catch (err) {
        console.error('Error processing subscriptions', err);
      }
    };

    processSubscriptions();
  }, []);
}
