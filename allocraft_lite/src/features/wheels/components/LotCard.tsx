import React, { useState } from "react";
import type { LotVM } from "../types";
import { Timeline } from "./Timeline";

function StatusChip({ status }: { status: LotVM["status"] }) {
    const map = {
        OPEN_COVERED: { cls: "border-emerald-300 bg-emerald-50 text-emerald-700", label: "Covered" },
        OPEN_UNCOVERED: { cls: "border-amber-300 bg-amber-50 text-amber-700", label: "Uncovered" },
        CLOSED_CALLED_AWAY: { cls: "border-slate-300 bg-slate-100 text-slate-700", label: "Called Away" },
    }[status];
    return (
        <span className={`inline-flex items-center rounded-xl border px-2.5 py-1 text-xs font-medium ${map.cls}`}>
            {map.label}
        </span>
    );
}

export function LotCard({ lot }: { lot: LotVM }) {
    const [open, setOpen] = useState(false);
    const id = `lot-${lot.lotNo}-timeline`;

    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
            <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <h3 className="text-lg font-semibold text-slate-900">{`Lot ${lot.lotNo} — ${lot.ticker}`}</h3>
                    <StatusChip status={lot.status} />
                </div>
                <button
                    onClick={() => setOpen((v) => !v)}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
                    aria-expanded={open}
                    aria-controls={id}
                >
                    <span>{open ? "Hide timeline" : "Show timeline"}</span>
                    <span className={`transition-transform ${open ? "rotate-180" : ""}`}>⌄</span>
                </button>
            </div>

            <div className="space-y-1.5">
                <div className="text-slate-900">
                    <span className="font-semibold">{lot.acquisition.label}</span>
                    {lot.acquisition.date && <span className="text-slate-500">{` • ${lot.acquisition.date}`}</span>}
                </div>
                <div className="text-sm text-slate-600">
                    Cost Basis: <span className="font-medium text-slate-900">{lot.costBasis}</span>
                </div>

                {lot.coverage ? (
                    <div className="text-sm text-slate-700">
                        <span className="font-medium">Call Sold:</span> {lot.coverage.strike} strike, {lot.coverage.premium} premium
                        {lot.coverage.status === "OPEN" && (
                            <span className="ml-2 rounded-md bg-emerald-100 px-2 py-0.5 text-xs text-emerald-800">Open</span>
                        )}
                        {lot.coverage.status === "CLOSED" && (
                            <span className="ml-2 rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-700">Closed</span>
                        )}
                    </div>
                ) : (
                    <div className="text-sm italic text-slate-500">Call not sold yet</div>
                )}
            </div>

            {open && (
                <div id={id} className="mt-5">
                    <Timeline events={lot.events} />
                </div>
            )}
        </div>
    );
}
