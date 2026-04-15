import { QueryClient, QueryCache, MutationCache } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error: unknown) => {
      if (error instanceof Error) {
        console.error("Query Error:", error.message);
      }
    },
  }),

  mutationCache: new MutationCache({
    onError: (error: unknown) => {
      if (error instanceof Error) {
        console.error("Mutation Error:", error.message);
      }
    },
  }),

  defaultOptions: {
    queries: {
      retry: 1,
    },
  },
});