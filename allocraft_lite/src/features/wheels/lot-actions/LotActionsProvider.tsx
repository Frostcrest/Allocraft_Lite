import React, { createContext, useContext, useMemo, useState } from "react";
import type { LotVM } from "../types";
import type {
    SellCoveredCallInput,
    CloseCoveredCallInput,
    RollCoveredCallInput,
    CreateLotBuyInput,
    CreateLotShortPutInput,
    LotsUpdater,
} from "./types";
import {
    sellCoveredCall as apiSellCC,
    closeCoveredCall as apiCloseCC,
    rollCoveredCall as apiRollCC,
    createLotBuy as apiCreateBuy,
    createLotShortPut as apiCreateShortPut,
} from "./api";
import { validateSellCC, validateCloseCC, validateRoll, validateBuyLot, validateShortPut } from "./validators";
import { wheelApi } from "@/api/fastapiClient";

interface LotActionsContextValue {
    openCover: (lot: LotVM) => void;
    openCloseCall: (lot: LotVM) => void;
    openClosePut: (lot: LotVM) => void;
    openRoll: (lot: LotVM) => void;
    openNewLot: (ticker?: string) => void;
    // state for modals
    modal: null | { type: "cover" | "closeCall" | "closePut" | "roll" | "new"; lot?: LotVM; ticker?: string };
    closeModal: () => void;
    // ops
    sellCoveredCall: (p: SellCoveredCallInput) => Promise<void>;
    closeCoveredCall: (p: CloseCoveredCallInput) => Promise<void>;
    rollCoveredCall: (p: RollCoveredCallInput) => Promise<void>;
    createLotBuy: (p: CreateLotBuyInput) => Promise<void>;
    createLotShortPut: (p: CreateLotShortPutInput) => Promise<void>;
    closeShortPut: (p: { lotId: number; tradeDate: string; limitDebit: number; contracts: number; fees?: number; notes?: string }) => Promise<void>;
}

const LotActionsContext = createContext<LotActionsContextValue | undefined>(undefined);

export function LotActionsProvider({ children, lots, setLots, cycleId, ticker, onEventCreated }:
    {
        children: React.ReactNode; lots: LotVM[]; setLots: (lots: LotVM[]) => void | ((updater: (prev: LotVM[]) => LotVM[]) => void);
        cycleId: number; ticker?: string; onEventCreated?: (e: any) => void;
    }) {
    const [modal, setModal] = useState<LotActionsContextValue["modal"]>(null);

    const updateLots: LotsUpdater = (updater) => {
        if (typeof setLots === "function") {
            // @ts-ignore allow setter-style as well
            setLots((prev: LotVM[]) => updater(Array.isArray(prev) ? prev : lots));
        }
    };

    const openCover = (lot: LotVM) => setModal({ type: "cover", lot });
    const openCloseCall = (lot: LotVM) => setModal({ type: "closeCall", lot });
    const openClosePut = (lot: LotVM) => setModal({ type: "closePut", lot });
    const openRoll = (lot: LotVM) => setModal({ type: "roll", lot });
    const openNewLot = (ticker?: string) => setModal({ type: "new", ticker });
    const closeModal = () => setModal(null);

    // optimistic updates
    const sellCoveredCall = async (p: SellCoveredCallInput) => {
        if (!validateSellCC(p)) throw new Error("Invalid sell covered call");
        await apiSellCC(p.lotId, p);
        updateLots((prev) =>
            prev.map((l) =>
                l.lotNo === p.lotId
                    ? {
                        ...l,
                        status: "OPEN_COVERED",
                        coverage: { strike: `$${p.strike.toFixed(2)}`, premium: `$${p.limitPremium.toFixed(2)}`, status: "OPEN" },
                        events: [
                            ...l.events,
                            {
                                id: crypto.randomUUID(),
                                date: new Date().toISOString().slice(0, 10),
                                type: "SELL_CALL_OPEN",
                                label: "Sold CALL",
                                strike: `$${p.strike.toFixed(2)}`,
                                premium: `$${p.limitPremium.toFixed(2)}`,
                                qty: "1 ctr",
                            },
                        ],
                    }
                    : l
            )
        );
        closeModal();
    };

    const closeCoveredCall = async (p: CloseCoveredCallInput) => {
        if (!validateCloseCC(p)) throw new Error("Invalid close call");
        // Create backend event for SELL_CALL_CLOSE
        const evt = await wheelApi.createEvent({
            cycle_id: cycleId,
            event_type: "SELL_CALL_CLOSE",
            trade_date: p.tradeDate,
            contracts: p.contracts,
            premium: p.limitDebit,
            fees: p.fees ?? 0,
            notes: p.notes ?? null,
        });
        onEventCreated?.(evt);
        updateLots((prev) =>
            prev.map((l) =>
                l.lotNo === p.lotId
                    ? {
                        ...l,
                        coverage: l.coverage ? { ...l.coverage, status: "CLOSED" } : l.coverage,
                        events: [
                            ...l.events,
                            {
                                id: crypto.randomUUID(),
                                date: p.tradeDate,
                                type: "SELL_CALL_CLOSE",
                                label: "Closed CALL",
                                price: `$${p.limitDebit.toFixed(2)}`,
                                qty: `${p.contracts || 1} ctr${(p.contracts || 1) > 1 ? 's' : ''}`,
                            },
                        ],
                    }
                    : l
            )
        );
        closeModal();
    };

    const rollCoveredCall = async (p: RollCoveredCallInput) => {
        if (!validateRoll(p)) throw new Error("Invalid roll");
        await apiRollCC(p.lotId, p);
        updateLots((prev) =>
            prev.map((l) =>
                l.lotNo === p.lotId
                    ? {
                        ...l,
                        coverage: { strike: `$${p.open.strike.toFixed(2)}`, premium: `$${p.open.limitPremium.toFixed(2)}`, status: "OPEN" },
                        events: [
                            ...l.events,
                            {
                                id: crypto.randomUUID(),
                                date: new Date().toISOString().slice(0, 10),
                                type: "SELL_CALL_CLOSE",
                                label: "Closed CALL",
                                price: `$${p.close.limitDebit.toFixed(2)}`,
                                qty: "1 ctr",
                            },
                            {
                                id: crypto.randomUUID(),
                                date: new Date().toISOString().slice(0, 10),
                                type: "SELL_CALL_OPEN",
                                label: "Sold CALL",
                                strike: `$${p.open.strike.toFixed(2)}`,
                                premium: `$${p.open.limitPremium.toFixed(2)}`,
                                qty: "1 ctr",
                            },
                        ],
                    }
                    : l
            )
        );
        closeModal();
    };

    const closeShortPut: LotActionsContextValue["closeShortPut"] = async (p) => {
        // reuse validation from close CC since it's the same shape
        if (!validateCloseCC({ lotId: p.lotId, tradeDate: p.tradeDate, limitDebit: p.limitDebit, contracts: p.contracts, fees: p.fees, notes: p.notes }))
            throw new Error("Invalid close put");
        // Create backend event for SELL_PUT_CLOSE
        const evt = await wheelApi.createEvent({
            cycle_id: cycleId,
            event_type: "BUY_PUT_CLOSE",
            trade_date: p.tradeDate,
            contracts: p.contracts,
            premium: p.limitDebit,
            fees: p.fees ?? 0,
            notes: p.notes ?? null,
            // Try to link to the SELL_PUT_OPEN event from the LotVM metadata if available
            link_event_id: lots.find(l => l.lotNo === p.lotId)?.meta?.putOpenEventId ?? null,
        });
        onEventCreated?.(evt);
        updateLots((prev) =>
            prev.map((l) =>
                l.lotNo === p.lotId
                    ? {
                        ...l,
                        // mark synthetic or CSP coverage closed
                        coverage: l.coverage ? { ...l.coverage, status: "CLOSED" } : l.coverage,
                        events: [
                            ...l.events,
                            {
                                id: crypto.randomUUID(),
                                date: p.tradeDate,
                                type: "SELL_PUT_CLOSE",
                                label: "Closed PUT",
                                price: `$${p.limitDebit.toFixed(2)}`,
                                qty: `${p.contracts || 1} ctr${(p.contracts || 1) > 1 ? 's' : ''}`,
                            },
                        ],
                    }
                    : l
            )
        );
        closeModal();
    };

    const createLotBuy = async (p: CreateLotBuyInput) => {
        if (!validateBuyLot(p)) throw new Error("Invalid lot buy");
        await apiCreateBuy(p);
        updateLots((prev) => [
            ...prev,
            {
                lotNo: Math.max(0, ...prev.map((x) => x.lotNo)) + 1,
                ticker: p.ticker,
                acquisition: { type: "OUTRIGHT_PURCHASE", label: `Bought @ $${p.price.toFixed(2)}`, date: p.date },
                costBasis: `$${p.price.toFixed(2)}`,
                status: "OPEN_UNCOVERED",
                events: [
                    {
                        id: crypto.randomUUID(),
                        date: p.date,
                        type: "BUY_SHARES",
                        label: "Bought Shares",
                        price: `$${p.price.toFixed(2)}`,
                        qty: "100 sh",
                    },
                ],
            },
        ]);
        closeModal();
    };

    const createLotShortPut = async (p: CreateLotShortPutInput) => {
        if (!validateShortPut(p)) throw new Error("Invalid CSP");
        await apiCreateShortPut(p);
        updateLots((prev) => [
            ...prev,
            {
                lotNo: Math.max(0, ...prev.map((x) => x.lotNo)) + 1,
                ticker: p.ticker,
                acquisition: { type: "PUT_ASSIGNMENT", label: `Pending PUT Assignment`, date: p.expiry },
                costBasis: "—",
                status: "OPEN_UNCOVERED",
                events: [
                    {
                        id: crypto.randomUUID(),
                        date: new Date().toISOString().slice(0, 10),
                        type: "SELL_PUT",
                        label: "Sold PUT",
                        strike: `$${p.strike.toFixed(2)}`,
                        premium: `$${p.premium.toFixed(2)}`,
                        qty: "1 ctr",
                        notes: "Pending assignment",
                    },
                ],
            },
        ]);
        closeModal();
    };

    const value = useMemo<LotActionsContextValue>(() => ({
        openCover,
        openCloseCall,
        openClosePut,
        openRoll,
        openNewLot,
        modal,
        closeModal,
        sellCoveredCall,
        closeCoveredCall,
        rollCoveredCall,
        createLotBuy,
        createLotShortPut,
        closeShortPut,
    }), [modal]);

    return <LotActionsContext.Provider value={value}>{children}</LotActionsContext.Provider>;
}

export function useLotActionsContext() {
    const ctx = useContext(LotActionsContext);
    if (!ctx) throw new Error("useLotActionsContext must be used within LotActionsProvider");
    return ctx;
}
