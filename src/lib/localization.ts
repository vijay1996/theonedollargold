export type LocalizationPrefs = {
  currency: string;
  dateFormat: string;
  locale: string;
  savedAt?: number;
};

export const DEFAULT_LOCALIZATION: LocalizationPrefs = {
  currency: 'USD',
  dateFormat: 'MM/dd/yyyy',
  locale: 'en-US',
};

export function localeForCurrency(currency: string) {
  const locales: Record<string, string> = {
    EUR: 'de-DE',
    GBP: 'en-GB',
    INR: 'en-IN',
    JPY: 'ja-JP',
    USD: 'en-US',
  };

  return locales[currency] || DEFAULT_LOCALIZATION.locale;
}

export function readStoredLocalization(): LocalizationPrefs {
  if (typeof window === 'undefined') return DEFAULT_LOCALIZATION;

  try {
    const raw = window.localStorage.getItem('onedollargold.localization');
    if (!raw) return DEFAULT_LOCALIZATION;
    const parsed = JSON.parse(raw);
    return {
      currency: parsed.currency || DEFAULT_LOCALIZATION.currency,
      dateFormat: parsed.dateFormat || DEFAULT_LOCALIZATION.dateFormat,
      locale: parsed.locale || localeForCurrency(parsed.currency || DEFAULT_LOCALIZATION.currency),
      savedAt: parsed.savedAt,
    };
  } catch {
    return DEFAULT_LOCALIZATION;
  }
}

export function storeLocalization(prefs: LocalizationPrefs) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem('onedollargold.localization', JSON.stringify({
    ...prefs,
    savedAt: prefs.savedAt || Date.now(),
  }));
}

export function hasStoredLocalization() {
  if (typeof window === 'undefined') return false;
  return Boolean(window.localStorage.getItem('onedollargold.localization'));
}

export function isDefaultLocalization(prefs: LocalizationPrefs) {
  return prefs.currency === DEFAULT_LOCALIZATION.currency
    && prefs.dateFormat === DEFAULT_LOCALIZATION.dateFormat;
}
