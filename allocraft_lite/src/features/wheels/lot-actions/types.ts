import type { LotVM } from "../types";

export type TimeInForce = "DAY" | "GTC";

export interface SellCoveredCallInput {
    lotId: number;
    strike: number;
    expiry: string; // ISO date
    limitPremium: number;
    timeInForce: TimeInForce;
    fees?: number;
}

export interface CloseCoveredCallInput {
    lotId: number;
    tradeDate: string; // ISO
    limitDebit: number;
    contracts: number; // number of contracts to close
    fees?: number;
    notes?: string;
}

export interface RollCoveredCallInput {
    lotId: number;
    close: { limitDebit: number; fees?: number; notes?: string };
    open: { strike: number; expiry: string; limitPremium: number; timeInForce: TimeInForce; fees?: number };
}

export interface CreateLotBuyInput {
    ticker: string;
    price: number;
    date: string; // ISO
    fees?: number;
}

export interface CreateLotShortPutInput {
    ticker: string;
    strike: number;
    expiry: string;
    premium: number;
    timeInForce: TimeInForce;
    fees?: number;
}

export type LotsUpdater = (update: (prev: LotVM[]) => LotVM[]) => void;

export interface ClosePutInput {
    lotId: number;
    tradeDate: string; // ISO
    limitDebit: number;
    contracts: number; // to close
    fees?: number;
    notes?: string;
}
