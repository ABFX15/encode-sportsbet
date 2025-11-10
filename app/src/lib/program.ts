import { address, getProgramDerivedAddress, type Address } from "gill";
import { PROGRAM_ID, USDC_MINT } from "./constants";
import IDL from "./idl.json";

// Outcome enum matching the smart contract
export enum Outcome {
    Pending = "pending",
    TeamA = "teamA",
    TeamB = "teamB",
    Draw = "draw",
}

export type OutcomeType =
    | { pending: {} }
    | { teamA: {} }
    | { teamB: {} }
    | { draw: {} };

// Convert our string outcome to the contract format
export function outcomeToContract(outcome: string): OutcomeType {
    switch (outcome) {
        case "teamA":
            return { teamA: {} };
        case "teamB":
            return { teamB: {} };
        case "draw":
            return { draw: {} };
        default:
            return { pending: {} };
    }
}

// PDA derivation helpers
export async function getMarketPDA(gameId: string): Promise<Address> {
    const [pda] = await getProgramDerivedAddress({
        programAddress: PROGRAM_ID,
        seeds: ["market", Buffer.from(gameId)],
    });
    return pda;
}

export async function getVaultPDA(marketAddress: Address): Promise<Address> {
    const [pda] = await getProgramDerivedAddress({
        programAddress: PROGRAM_ID,
        seeds: ["vault", Buffer.from(marketAddress)],
    });
    return pda;
}

export async function getBetPDA(
    marketAddress: Address,
    userAddress: Address
): Promise<Address> {
    const [pda] = await getProgramDerivedAddress({
        programAddress: PROGRAM_ID,
        seeds: [
            "bet",
            Buffer.from(marketAddress),
            Buffer.from(userAddress),
        ],
    });
    return pda;
}

// Get associated token account address
export function getAssociatedTokenAddress(
    mint: Address,
    owner: Address
): Address {
    // This is a simplified version - in production you'd use the proper ATA derivation
    // For now, we'll need to use @solana/spl-token's getAssociatedTokenAddress
    return address("11111111111111111111111111111111"); // Placeholder
}

export { IDL };
