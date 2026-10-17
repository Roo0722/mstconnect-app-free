// One QueryClient for the whole app; the provider in app/_layout.tsx uses
// this instance. Import it for cache calls outside components, for example
// queryClient.invalidateQueries or setQueryData in websocket or push
// handlers; inside components useQueryClient() returns this same instance.
import { QueryClient } from "@tanstack/react-query";

// News and events do not change by the second: keep fetched data fresh for a minute and in memory for ten,
// so switching tabs and screens does not re-download everything every time.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 60_000, gcTime: 10 * 60_000, retry: 1, refetchOnWindowFocus: false },
  },
});
