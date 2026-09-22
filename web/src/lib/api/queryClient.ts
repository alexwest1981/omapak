import { QueryClient } from "@tanstack/svelte-query";

// Module-level so non-component code (sign-in callback page, review actions)
// can invalidate caches without prop-drilling the provider's instance.
export const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: Infinity, retry: 1 } },
});
