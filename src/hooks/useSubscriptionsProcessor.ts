import { useEffect, useRef } from 'react';
import { auth, db } from '../lib/firebase';
import { collection, getDocs, doc, writeBatch } from 'firebase/firestore';
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
        
        // Fetch subscriptions
        const subsSnap = await getDocs(collection(db, 'users', uid, 'subscriptions'));
        const subscriptions = subsSnap.docs.map(d => d.data());
        
        if (subscriptions.length === 0) return;

        // Fetch transactions
        const transSnap = await getDocs(collection(db, 'users', uid, 'transactions'));
        const transactions = transSnap.docs.map(d => d.data());

        const batch = writeBatch(db);
        let count = 0;

        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        const currentDate = now.getDate();

        subscriptions.forEach(sub => {
          let shouldProcess = false;
          let expectedDate: Date;

          if (sub.frequency === 'yearly') {
             // 1-based deductionMonth from UI, convert to 0-based
             const subMonth = sub.deductionMonth ? sub.deductionMonth - 1 : 0; 
             if (currentYear > 2000) { // Just a sanity check
                if (currentMonth > subMonth || (currentMonth === subMonth && currentDate >= sub.deductionDate)) {
                   shouldProcess = true;
                   expectedDate = new Date(currentYear, subMonth, sub.deductionDate);
                } else {
                   // If we are before the deduction date of this year, wait until that day.
                   // But maybe it's missing for last year!
                   // For simplicity, we just won't retroactively process previous years in this basic script, 
                   // or we could check if there's no transaction for last year.
                }
             }
          } else {
             // Monthly
             if (currentDate >= sub.deductionDate) {
               shouldProcess = true;
               expectedDate = new Date(currentYear, currentMonth, sub.deductionDate);
             }
          }

          if (shouldProcess) {
            const expectedDateStr = format(expectedDate!, 'yyyy-MM-dd');
            
            const hasTransaction = transactions.some(t => {
                if (t.subscriptionId === sub.id) {
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
               const ref = doc(db, 'users', uid, 'transactions', tId);
               batch.set(ref, {
                 id: tId,
                 uid,
                 date: expectedDateStr,
                 categoryId: sub.categoryId,
                 amount: parseFloat(sub.amount), // ensure it's a number
                 type: 'expense',
                 comment: `${sub.name} (Subscription)`,
                 subscriptionId: sub.id,
                 createdAt: now.getTime(),
                 updatedAt: now.getTime()
               });
               count++;
            }
          }
        });

        if (count > 0) {
          await batch.commit();
          console.log(`Processed ${count} subscription transactions`);
        }

      } catch (err) {
        console.error('Error processing subscriptions', err);
      }
    };

    processSubscriptions();
  }, []);
}
