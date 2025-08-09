import React from "react";
import type { LotVM } from "../types";
import { useLotActions } from "./useLotActions";

export function ActionButtonsRow({ lot }: { lot: LotVM }) {
    const { openCover, openClose, openRoll } = useLotActions();
    const uncovered = lot.status === "OPEN_UNCOVERED";
    const canCloseOrRoll = lot.status === "OPEN_COVERED" && lot.coverage?.status === "OPEN";
    return (
        <div className="mt-4 flex flex-wrap gap-2" aria-label={`Lot ${lot.lotNo} actions`}>
            {uncovered && (
                <button
                    className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm text-white hover:bg-emerald-700"
                    onClick={() => openCover(lot)}
                    aria-label={`Cover lot ${lot.lotNo}`}
                >
                    Cover
                </button>
            )}
            {canCloseOrRoll && (
                <>
                    <button
                        className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm text-white hover:bg-black"
                        onClick={() => openClose(lot)}
                        aria-label={`Close short call on lot ${lot.lotNo}`}
                    >
                        Close
                    </button>
                    <button
                        className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 hover:bg-slate-100"
                        onClick={() => openRoll(lot)}
                        aria-label={`Roll short call on lot ${lot.lotNo}`}
                    >
                        Roll
                    </button>
                </>
            )}
        </div>
    );
}
