import { address, getProgramDerivedAddress, type Address } from "gill";
import { PublicKey } from "@solana/web3.js";
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
    // Convert address to PublicKey bytes (32 bytes)
    const marketPubkey = new PublicKey(marketAddress.toString());
    const [pda] = await getProgramDerivedAddress({
        programAddress: PROGRAM_ID,
        seeds: ["vault", marketPubkey.toBytes()],
    });
    return pda;
}

export async function getBetPDA(
    marketAddress: Address,
    userAddress: Address
): Promise<Address> {
    // Convert addresses to PublicKey bytes (32 bytes each)
    const marketPubkey = new PublicKey(marketAddress.toString());
    const userPubkey = new PublicKey(userAddress.toString());
    const [pda] = await getProgramDerivedAddress({
        programAddress: PROGRAM_ID,
        seeds: [
            "bet",
            marketPubkey.toBytes(),
            userPubkey.toBytes(),
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
