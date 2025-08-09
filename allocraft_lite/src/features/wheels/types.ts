export type EventType =
    | "SELL_PUT"
    | "PUT_ASSIGNMENT"
    | "BUY_SHARES"
    | "SELL_CALL_OPEN"
    | "SELL_CALL_CLOSE"
    | "CALL_ASSIGNMENT"
    | "FEE";

export interface LotEvent {
    id: string;
    date: string; // ISO or display string
    type: EventType;
    label: string; // human label
    price?: string; // "$175.17"
    strike?: string; // "$200"
    premium?: string; // "$4.95"
    qty?: string; // "100 sh" or "1 ctr"
    notes?: string;
}

export type AcquisitionType = "PUT_ASSIGNMENT" | "OUTRIGHT_PURCHASE";

export type LotStatus =
    | "OPEN_COVERED"
    | "OPEN_UNCOVERED"
    | "CLOSED_CALLED_AWAY";

export interface Coverage {
    strike: string; // "$200"
    premium: string; // "$4.95"
    status: "OPEN" | "CLOSED";
}

export interface LotVM {
    lotNo: number;
    ticker: string;
    acquisition: { type: AcquisitionType; label: string; date?: string };
    costBasis: string; // formatted
    coverage?: Coverage;
    status: LotStatus;
    events: LotEvent[];
}

export interface CycleVM {
    title: string; // "GOOG • GOOG"
    started: string; // "Open • Started 2025-07-02"
}

export interface PageVM {
    cycle: CycleVM;
    lots: LotVM[];
}
