/** Turns Firebase and network errors into one plain sentence a cook can act on. */
export function describeError(error: unknown, action = 'save that'): string {
  const code = (error as { code?: string } | null)?.code ?? '';
  switch (code) {
    case 'permission-denied':
    case 'firestore/permission-denied':
      return `You don't have permission to ${action}. Try signing in again.`;
    case 'unavailable':
    case 'firestore/unavailable':
      return "You're offline. Your change will sync when the connection is back.";
    case 'resource-exhausted':
      return 'The cookbook is over its daily limit. Try again later.';
    case 'auth/network-request-failed':
      return 'Sign-in needs an internet connection.';
    case 'auth/unauthorized-domain':
      return 'This site is not on the Firebase project\'s list of authorised domains yet.';
    case 'auth/operation-not-allowed':
      return 'Google sign-in is turned off for this Firebase project.';
    default:
      break;
  }
  if (error instanceof Error && error.message && !/^(Firebase|FirebaseError)/.test(error.message)) {
    return error.message;
  }
  return `Couldn't ${action}. Check your connection and try again.`;
}
