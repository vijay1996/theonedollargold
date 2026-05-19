import { auth } from './firebase';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const stringifyError = (e: unknown) => {
    if (e instanceof Error) return e.message;
    try {
      return typeof e === 'string' ? e : JSON.stringify(e, Object.getOwnPropertyNames(e));
    } catch {
      return String(e);
    }
  };

  const errInfo: FirestoreErrorInfo = {
    error: stringifyError(error),
    authInfo: {
      userId: auth.currentUser?.uid || auth.currentUser?.id,
      email: auth.currentUser?.email,
      emailVerified: (auth.currentUser as any)?.email_confirmed || null,
      isAnonymous: null,
      tenantId: null,
      providerInfo: []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}
