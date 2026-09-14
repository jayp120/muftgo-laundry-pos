import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
      retry: 1,
      refetchOnWindowFocus: false,
      // Never throw to ErrorBoundary on query failure - show UI state instead.
      // Throwing here was blanking the whole app after every action.
      throwOnError: false,
    },
    mutations: {
      retry: 0,
      // Same: mutations surface via onError toast, never unmount the app
      throwOnError: false,
    },
  },
});
