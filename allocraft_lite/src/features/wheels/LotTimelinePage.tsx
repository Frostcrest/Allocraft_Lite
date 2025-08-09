import React, { useState } from "react";
import type { PageVM, LotVM } from "./types";
import { SAMPLE_VM } from "./sample";
import { CyclePickerCard } from "./components/CyclePickerCard";
import { LotCard } from "./components/LotCard";

export default function LotTimelinePage({ vm = SAMPLE_VM }: { vm?: PageVM }) {
    const [selected, setSelected] = useState<string | null>(null);

    return (
        <div className="mx-auto max-w-6xl px-4 py-6">
            <header className="mb-6">
                <h1 className="text-2xl font-bold text-slate-900">Wheel Lots</h1>
                <p className="text-sm text-slate-600">{vm.cycle.title} — {vm.cycle.started}</p>
            </header>

            <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {["GOOG • GOOG", "MSFT • MSFT", "AMZN • AMZN"].map((title) => (
                    <CyclePickerCard key={title} title={title} selected={selected === title} onClick={() => setSelected(title)} />
                ))}
            </div>

            <div className="grid grid-cols-1 gap-4">
                {vm.lots.map((lot: LotVM) => (
                    <LotCard key={lot.lotNo} lot={lot} />
                ))}
            </div>
        </div>
    );
}
