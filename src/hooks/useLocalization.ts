import { useCallback, useEffect, useState } from 'react';
import { format as formatDateFns } from 'date-fns';
import { auth, db } from '../lib/firebase';
import { DEFAULT_LOCALIZATION, hasStoredLocalization, isDefaultLocalization, readStoredLocalization, storeLocalization } from '../lib/localization';

export function useLocalization() {
  const [prefs, setPrefs] = useState(() => readStoredLocalization());

  useEffect(() => {
    let channel: any;
    let active = true;

    const load = async () => {
      const user = auth.currentUser || await auth.getUser();
      if (!user || !active) return;

      const { data } = await db
        .from('users')
        .select('currency,date_format,locale')
        .eq('uid', user.uid)
        .maybeSingle();

      if (data && active) {
        const stored = readStoredLocalization();
        const next = {
          currency: data.currency || DEFAULT_LOCALIZATION.currency,
          dateFormat: data.date_format || DEFAULT_LOCALIZATION.dateFormat,
          locale: data.locale || DEFAULT_LOCALIZATION.locale,
        };
        const effective = hasStoredLocalization() && !isDefaultLocalization(stored) && isDefaultLocalization(next)
          ? stored
          : next;
        setPrefs(effective);
        storeLocalization(effective);
      }

      channel = db.channel(`public:user_preferences_${user.uid}_${Date.now()}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'users', filter: `uid=eq.${user.uid}` }, (payload: any) => {
          const next = payload.new || {};
          const nextPrefs = {
            currency: next.currency || DEFAULT_LOCALIZATION.currency,
            dateFormat: next.date_format || DEFAULT_LOCALIZATION.dateFormat,
            locale: next.locale || DEFAULT_LOCALIZATION.locale,
          };
          setPrefs(nextPrefs);
          storeLocalization(nextPrefs);
        })
        .subscribe();
    };

    load();

    return () => {
      active = false;
      if (channel?.unsubscribe) channel.unsubscribe();
    };
  }, []);

  const formatCurrency = useCallback((value: number | string | null | undefined) => {
    const amount = Number(value || 0);
    return new Intl.NumberFormat(prefs.locale, {
      style: 'currency',
      currency: prefs.currency,
      maximumFractionDigits: 2,
    }).format(amount);
  }, [prefs.currency, prefs.locale]);

  const formatDate = useCallback((value: Date | string | number) => {
    return formatDateFns(new Date(value), prefs.dateFormat);
  }, [prefs.dateFormat]);

  return {
    ...prefs,
    formatCurrency,
    formatDate,
  };
}
