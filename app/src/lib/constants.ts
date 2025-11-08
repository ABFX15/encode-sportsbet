import { address } from "gill";

// Update these with your actual deployed program ID
export const PROGRAM_ID = address(
    process.env.NEXT_PUBLIC_PROGRAM_ID ||
    "H8APpZRJWFy5eRgUq7Ar6FngLT27e8oDmvkwhCCjB39L"
);

// USDC mint address (devnet)
// For mainnet, use: EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
export const USDC_MINT = address(
    "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU" // USDC on devnet
);

// Fee percentage (2%)
export const FEE_PERCENTAGE = 0.98;

// USDC decimals
export const USDC_DECIMALS = 6;
