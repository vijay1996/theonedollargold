/**
 * Razorpay subscription integration
 *
 * Flow:
 * 1. Frontend calls the server to create a subscription → gets back subscription_id
 * 2. Frontend opens Razorpay Checkout with the subscription_id
 * 3. Razorpay processes payment and redirects to callback URL
 * 4. Server webhook handles subscription.activated → updates user tier in Supabase
 */

import { auth, db, serverUrl } from './firebase';

export type SubscriptionTier = 'free' | 'premium_monthly' | 'premium_yearly';

export interface SubscriptionInfo {
  tier: SubscriptionTier;
  status: string | null;
  endDate: number | null;
  razorpaySubscriptionId: string | null;
}

export interface CreateSubscriptionResponse {
  subscription_id: string;
  amount: number;
  key_id: string;
  customer_id: string;
  short_url?: string;
}

/**
 * Creates a Razorpay subscription via the server API.
 * The server creates the subscription in Razorpay and returns the details.
 */
export async function createSubscription(
  planId: 'premium_monthly' | 'premium_yearly',
  userEmail: string,
  userName: string,
): Promise<CreateSubscriptionResponse> {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('User not authenticated');

  const res = await fetch(`${serverUrl}/api/premium/create-subscription`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      uid,
      plan_id: planId,
      email: userEmail,
      name: userName,
    }),
  });

  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data as CreateSubscriptionResponse;
}

/**
 * Opens the Razorpay Checkout for a subscription.
 * The user completes payment inside the Razorpay modal.
 */
export function openRazorpayCheckout(
  options: {
    key: string;
    subscription_id: string;
    name: string;
    description: string;
    image?: string;
    prefill: { name: string; email: string; contact?: string };
    theme?: { color?: string; backdrop_color?: string };
    callback_url?: string;
    redirect?: boolean;
  },
): Promise<{ razorpay_payment_id: string; razorpay_subscription_id: string; razorpay_signature?: string }> {
  return new Promise((resolve, reject) => {
    // Load Razorpay script if not already loaded
    if (!(window as any).Razorpay) {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = () => initCheckout();
      script.onerror = () => reject(new Error('Failed to load Razorpay SDK'));
      document.body.appendChild(script);
    } else {
      initCheckout();
    }

    function initCheckout() {
      const rzp = new (window as any).Razorpay({
        key: options.key,
        subscription_id: options.subscription_id,
        name: options.name,
        description: options.description,
        image: options.image,
        prefill: {
          name: options.prefill.name,
          email: options.prefill.email,
          contact: options.prefill.contact || '',
        },
        theme: {
          color: options.theme?.color || '#6366f1',
          backdrop_color: options.theme?.backdrop_color || '#0f172a',
        },
        callback_url: options.callback_url,
        redirect: options.redirect ?? true,
        modal: {
          ondismiss: () => reject(new Error('Checkout closed by user')),
        },
        handler: function (response: any) {
          resolve({
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_subscription_id: response.razorpay_subscription_id,
            razorpay_signature: response.razorpay_signature,
          });
        },
      });

      rzp.on('payment.failed', function (response: any) {
        reject(new Error(response.error?.description || 'Payment failed'));
      });

      rzp.open();
    }
  });
}

/**
 * Cancels the user's subscription via the server.
 */
export async function cancelSubscription(): Promise<void> {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('User not authenticated');

  const res = await fetch(`${serverUrl}/api/cancel-subscription`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ uid }),
  });

  const data = await res.json();
  if (data.error) throw new Error(data.error);
}

let subInfoPromise: Promise<SubscriptionInfo | null> | null = null;

/**
 * Gets the subscription info for the current user from their profile.
 * Concurrent calls within the same render cycle share a single in-flight promise.
 * The cache is cleared after the promise resolves, so future navigations get fresh data.
 */
export async function getUserSubscriptionInfo(): Promise<SubscriptionInfo | null> {
  // Return in-flight promise for concurrent callers (handles StrictMode double-mount)
  if (subInfoPromise) return subInfoPromise;

  subInfoPromise = (async () => {
    try {
      const user = auth.currentUser || await auth.getUser();
      if (!user) return null;

      const { data, error } = await db
        .from('users')
        .select('subscription_tier, subscription_status, subscription_end_date, razorpay_subscription_id')
        .eq('uid', user.uid)
        .single();

      if (error) {
        console.error('Failed to fetch subscription info', error);
        return null;
      }

      if (!data) return null;

      return {
        tier: (data.subscription_tier as SubscriptionTier) || 'free',
        status: data.subscription_status as string | null,
        endDate: data.subscription_end_date as number | null,
        razorpaySubscriptionId: data.razorpay_subscription_id as string | null,
      };
    } finally {
      // Clear promise so future navigations / explicit refetches get fresh data
      subInfoPromise = null;
    }
  })();

  return subInfoPromise;
}

/**
 * Returns whether the user has premium access.
 */
export function isPremium(tier: SubscriptionTier, status: string | null): boolean {
  if (tier === 'free') return false;
  return status === 'active' || status === 'trialing';
}

/**
 * Configuration data returned by /api/premium/subscription-config
 * Prices are in paise (Indian currency subunits).
 */
export interface SubscriptionConfig {
  MONTHLY_PRICE: number;
  MONTHLY_DISCOUNT_PERCENT: number;
  MONTHLY_TOTAL_COUNT: number;
  YEARLY_TOTAL_COUNT: number;
  YEARLY_PRICE: number;
  YEARLY_DISCOUNT_PERCENT: number;
}

// ── Caches ──────────────────────────────────────────────

let cachedConfig: SubscriptionConfig | null = null;
let configPromise: Promise<SubscriptionConfig> | null = null;

/**
 * Fetches subscription pricing configuration from the server.
 * Cached permanently after first successful fetch (config is static).
 * Concurrent calls share the same in-flight promise to avoid duplicate requests.
 */
export async function fetchSubscriptionConfig(): Promise<SubscriptionConfig> {
  if (cachedConfig) return cachedConfig;
  if (configPromise) return configPromise;

  configPromise = (async () => {
    const res = await fetch(`${serverUrl}/api/premium/subscription-config`);
    if (!res.ok) {
      configPromise = null; // allow retry
      throw new Error(`Failed to fetch subscription config: ${res.statusText}`);
    }
    const data = await res.json();
    cachedConfig = data as SubscriptionConfig;
    configPromise = null;
    return cachedConfig;
  })();

  return configPromise;
}

/**
 * Converts paise to rupees.
 */
export function paiseToRupees(paise: number): number {
  return paise / 100;
}

/**
 * Returns the display name for a subscription tier.
 */
export function getTierLabel(tier: SubscriptionTier): string {
  switch (tier) {
    case 'free':
      return 'Free';
    case 'premium_monthly':
      return 'Premium Monthly';
    case 'premium_yearly':
      return 'Premium Yearly';
  }
}

/** Cooldown period for free users: 1 per year (in ms) */
export const AI_REPORT_FREE_COOLDOWN_MS = 365 * 24 * 60 * 60 * 1000;

/** Cooldown period for premium users: 1 per week (in ms) */
export const AI_REPORT_PREMIUM_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Returns the timestamp (epoch ms) when the user can next generate a report, or null if they can generate now.
 */
export function getNextAiReportTime(tier: SubscriptionTier, status: string | null, lastReportTimestamp: number | null): number | null {
  if (!lastReportTimestamp) return null;
  const cooldown = isPremium(tier, status) ? AI_REPORT_PREMIUM_COOLDOWN_MS : AI_REPORT_FREE_COOLDOWN_MS;
  const nextTime = lastReportTimestamp + cooldown;
  if (Date.now() >= nextTime) return null;
  return nextTime;
}
