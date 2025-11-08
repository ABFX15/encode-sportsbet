// Types for the sports betting app

export interface Game {
    id: string;
    sport: string;
    teamA: string;
    teamB: string;
    startTime: number;
    odds: {
        teamA: number;
        teamB: number;
        draw: number | null;
    };
}

export interface Market {
    authority: string;
    gameId: string;
    teamA: string;
    teamB: string;
    startTime: bigint;
    oracleFeed: string;
    totalPoolA: bigint;
    totalPoolB: bigint;
    totalPoolDraw: bigint;
    isResolved: boolean;
    winningOutcome: Outcome;
    address: string;
}

export interface Bet {
    user: string;
    market: string;
    outcome: Outcome;
    amount: bigint;
    claimed: boolean;
    winnings: bigint;
}

export type Outcome =
    | { pending: {} }
    | { teamA: {} }
    | { teamB: {} }
    | { draw: {} };

export type OutcomeKey = 'pending' | 'teamA' | 'teamB' | 'draw';
