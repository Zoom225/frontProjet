export interface ApiErrorResponse {
  status?: number;
  message?: string;
  errors?: Record<string, string>;
  timestamp?: string;
}

export const extractApiErrorMessage = (error: unknown, fallback = 'Une erreur est survenue.'): string => {
  // Log complet pour débogage
  console.log('=== FULL ERROR OBJECT ===');
  console.log(JSON.stringify(error, null, 2));
  console.log('========================');

  if (!error) {
    return fallback;
  }

  const candidate = error as any;

  // Vérifier error.error.message
  if (candidate?.error?.message) {
    console.log('Found in error.error.message:', candidate.error.message);
    return candidate.error.message;
  }

  // Vérifier error.message
  if (candidate?.message) {
    console.log('Found in error.message:', candidate.message);
    return candidate.message;
  }

  // Vérifier error.error.errors
  if (candidate?.error?.errors && typeof candidate.error.errors === 'object') {
    const firstFieldMessage = Object.values(candidate.error.errors)[0];
    if (firstFieldMessage) {
      console.log('Found in error.error.errors:', firstFieldMessage);
      return firstFieldMessage as string;
    }
  }

  // Vérifier error.error (texte brut)
  if (candidate?.error && typeof candidate.error === 'string') {
    console.log('Found error as string:', candidate.error);
    return candidate.error;
  }

  // Vérifier la structure complète de error.error
  if (candidate?.error && typeof candidate.error === 'object') {
    const errorObj = candidate.error as any;
    console.log('Error object keys:', Object.keys(errorObj));

    // Essayer toutes les propriétés qui ressemblent à des messages
    for (const key of ['message', 'msg', 'detail', 'description', 'reason', 'error']) {
      if (errorObj[key]) {
        console.log(`Found ${key}:`, errorObj[key]);
        return String(errorObj[key]);
      }
    }
  }

  return fallback;
};

