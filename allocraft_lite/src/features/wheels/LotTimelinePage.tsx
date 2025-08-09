import React, { useMemo, useState } from "react";
import type { PageVM, LotVM } from "./types";
import { SAMPLE_VM } from "./sample";
import { CyclePickerCard } from "./components/CyclePickerCard";
import { LotCard } from "./components/LotCard";
import { LotActionsProvider, useLotActionsContext } from "./lot-actions/LotActionsProvider";
import { ActionButtonsRow } from "./lot-actions/ActionButtonsRow";
import { CoverLotModal } from "./lot-actions/CoverLotModal";
import { CloseCallModal } from "./lot-actions/CloseCallModal";
import { RollCallModal } from "./lot-actions/RollCallModal";
import { NewLotWizard } from "./lot-actions/NewLotWizard";

function PageInner({ initial }: { initial: PageVM }) {
    const [model, setModel] = useState<PageVM>(initial);
    const [selected, setSelected] = useState<string | null>(null);
    const actions = useLotActionsContext();

    const lots = model.lots;

    const setLots = (updater: (prev: LotVM[]) => LotVM[]) => {
        setModel((prev) => ({ ...prev, lots: updater(prev.lots) }));
    };

    const modal = actions.modal;

    return (
        <div className="mx-auto max-w-6xl px-4 py-6">
            <header className="mb-6 flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Wheel Lots</h1>
                    <p className="text-sm text-slate-600">{model.cycle.title} — {model.cycle.started}</p>
                </div>
                <button className="rounded-lg bg-slate-900 px-4 py-2 text-white hover:bg-black" onClick={() => actions.openNewLot()}>New Lot</button>
            </header>

            <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {["GOOG • GOOG", "MSFT • MSFT", "AMZN • AMZN"].map((title) => (
                    <CyclePickerCard key={title} title={title} selected={selected === title} onClick={() => setSelected(title)} />
                ))}
            </div>

            <div className="grid grid-cols-1 gap-4">
                {lots.map((lot: LotVM) => (
                    <LotCard key={lot.lotNo} lot={lot} actions={<ActionButtonsRow lot={lot} />} />
                ))}
            </div>

            {modal?.type === "cover" && modal.lot && <CoverLotModal lot={modal.lot} />}
            {modal?.type === "close" && modal.lot && <CloseCallModal lot={modal.lot} />}
            {modal?.type === "roll" && modal.lot && <RollCallModal lot={modal.lot} />}
            {modal?.type === "new" && <NewLotWizard />}
        </div>
    );
}

export default function LotTimelinePage({ vm = SAMPLE_VM }: { vm?: PageVM }) {
    // Provide actions with current lots and setter via context
    const [model, setModel] = useState<PageVM>(vm);
    const value = useMemo(() => ({ lots: model.lots, setLots: (updater: any) => setModel((prev) => ({ ...prev, lots: typeof updater === 'function' ? updater(prev.lots) : updater })) }), [model]);
    return (
        <LotActionsProvider {...value}>
            <PageInner initial={model} />
        </LotActionsProvider>
    );
}
