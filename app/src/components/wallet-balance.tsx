"use client";

import { useBalance } from "@gillsdk/react";
import { lamportsToSol } from "gill";

interface WalletBalanceProps {
  address: string;
}

export function WalletBalance({ address }: WalletBalanceProps) {
  const { balance, isLoading, isError, error } = useBalance({
    address,
  });

  if (isLoading) {
    return (
      <div className="p-4 border rounded-lg bg-gray-50 dark:bg-gray-800">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Loading balance...
        </p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-4 border border-red-200 rounded-lg bg-red-50 dark:bg-red-900/20">
        <p className="text-sm text-red-600 dark:text-red-400">
          Error: {String(error)}
        </p>
      </div>
    );
  }

  const solBalance = Number(lamportsToSol(balance));

  return (
    <div className="p-6 border rounded-lg bg-white dark:bg-gray-800 shadow-sm">
      <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
        Wallet Balance
      </h3>
      <p className="text-3xl font-bold text-gray-900 dark:text-white">
        {solBalance.toFixed(4)} SOL
      </p>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 font-mono break-all">
        {address}
      </p>
    </div>
  );
}
