export interface ApiErrorResponse {
  status?: number;
  message?: string;
  errors?: Record<string, string>;
  timestamp?: string;
}

export const extractApiErrorMessage = (error: unknown, fallback = 'Une erreur est survenue.'): string => {
  const candidate = error as { error?: ApiErrorResponse; message?: string } | undefined;

  if (candidate?.error?.errors) {
    const firstFieldMessage = Object.values(candidate.error.errors)[0];
    if (firstFieldMessage) {
      return firstFieldMessage;
    }
  }

  if (candidate?.error?.message) {
    return candidate.error.message;
  }

  if (candidate?.message) {
    return candidate.message;
  }

  return fallback;
};

