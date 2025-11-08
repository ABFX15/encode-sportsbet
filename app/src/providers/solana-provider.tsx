"use client";

import { createSolanaClient } from "gill";
import { SolanaProvider } from "@gillsdk/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode, useState } from "react";

export function SolanaProviderClient({ children }: { children: ReactNode }) {
  // Create QueryClient in a useState to ensure it's stable across re-renders
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
          },
        },
      })
  );

  // Create Solana client - use environment variable or default to devnet
  const [solanaClient] = useState(() =>
    createSolanaClient({
      urlOrMoniker:
        (process.env.NEXT_PUBLIC_SOLANA_RPC_URL as any) || "devnet",
    })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <SolanaProvider client={solanaClient}>{children}</SolanaProvider>
    </QueryClientProvider>
  );
}
