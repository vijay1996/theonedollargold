import { createClient, SupabaseClient } from '@supabase/supabase-js';


const url = (import.meta as any).env?.VITE_SUPABASE_URL;
const key = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY;
export const serverUrl = (import.meta as any).env?.VITE_SERVER_URL || '';

if (!url || !key) {
	console.warn('Supabase URL or ANON key not found in environment variables. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
}

export const supabase: SupabaseClient = createClient(url || '', key || '');

// ── Caches ──────────────────────────────────────────────

/** Tracks which user UIDs have been verified to exist in the users table */
const ensuredUids = new Set<string>();

/** In-flight or resolved promise for auth.getUser() – avoids duplicate /auth/v1/user calls */
let getUserPromise: Promise<any> | null = null;

/**
 * Ensures a user profile row exists in the `users` table.
 * Deduplicates by UID so we only query once per user per page visit.
 */
async function ensureUserProfile(u: any) {
	if (ensuredUids.has(u.uid)) return;

	const { data: existing, error: selectError } = await db
		.from('users')
		.select('uid')
		.eq('uid', u.uid)
		.maybeSingle();

	if (selectError) throw selectError;
	if (existing) {
		ensuredUids.add(u.uid);
		return;
	}

	const { error } = await db.from('users').insert([{
		uid: u.uid,
		email: u.email,
		name: (u.user_metadata && (u.user_metadata.full_name || u.user_metadata.name)) || (u.email ? u.email.split('@')[0] : null),
		currency: 'USD',
		date_format: 'MM/dd/yyyy',
		locale: 'en-US',
		created_at: Date.now(),
		updated_at: Date.now()
	}]);
	if (error) throw error;
	ensuredUids.add(u.uid);
}

interface AuthType {
	currentUser: any;
	getUser(): Promise<any>;
	onAuthStateChanged(cb: (user: any) => void): () => void;
	sendPasswordResetEmail(email: string): Promise<void>;
	confirmPasswordReset(password: string): Promise<void>;
}

// Small auth adapter to keep existing callers working with `auth.currentUser`
export const auth: any = {
	currentUser: null,
	async getUser() {
		// Return cached in-flight promise to avoid duplicate /auth/v1/user calls
		if (getUserPromise) return getUserPromise;

		getUserPromise = (async () => {
			try {
				const { data } = await supabase.auth.getUser();
				this.currentUser = data?.user ? { ...data.user, uid: data.user.id } : null;

				// Ensure a profile row exists for the authenticated user to satisfy FK constraints
				if (this.currentUser) {
					try {
						await ensureUserProfile(this.currentUser);
					} catch (e) {
						console.warn('Failed to upsert user profile:', e);
					}
				}
				return this.currentUser;
			} catch (e) {
				this.currentUser = null;
				getUserPromise = null; // allow retry on transient errors
				return null;
			}
		})();

		return getUserPromise;
	},
	onAuthStateChanged(cb: (user: any) => void) {
		const { data } = supabase.auth.onAuthStateChange((_event, session) => {
			// Reset the getUser cache whenever auth state changes so subsequent calls get fresh data
			getUserPromise = null;

			const u = session?.user ? { ...session.user, uid: session.user.id } : null;
			this.currentUser = u;
			cb(u);

			// When a user signs in, ensure their profile row exists so FK inserts succeed
			if (u) {
				(async () => {
					try {
						await ensureUserProfile(u);
					} catch (err) {
						console.warn('Failed to upsert user profile on auth state change:', err);
					}
				})();
			}
		});
		return () => data.subscription.unsubscribe();
	},
	async sendPasswordResetEmail (email: string) {
		const { error } = await supabase.auth.resetPasswordForEmail(email, {redirectTo: `${window.location.origin}/reset-password`});
		if (error) throw error;
	},
	async confirmPasswordReset (password: string) {
		const { error } = await supabase.auth.updateUser({password}, { emailRedirectTo: `${window.location.origin}/login`});
		if (error) throw error;
	}
};

// Export db as the supabase client for direct queries
export const db = supabase;
