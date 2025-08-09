import React, { useId, useState } from "react";
import type { LotVM } from "../types";
import { useLotActions } from "./useLotActions";
import type { CloseCoveredCallInput } from "./types";
import { validateCloseCC } from "./validators";

export function CloseCallModal({ lot }: { lot: LotVM }) {
    const { closeCoveredCall, closeModal } = useLotActions();
    const debitId = useId();
    const feesId = useId();
    const notesId = useId();
    const [form, setForm] = useState<{ limitDebit?: number; fees?: number; notes?: string }>({});
    const [error, setError] = useState<string | null>(null);

    const submit = async () => {
        const payload: CloseCoveredCallInput = {
            lotId: lot.lotNo,
            limitDebit: form.limitDebit!,
            fees: form.fees,
            notes: form.notes,
        };
        if (!validateCloseCC(payload)) {
            setError("Please enter a valid debit.");
            return;
        }
        setError(null);
        await closeCoveredCall(payload).catch((e) => setError(e.message));
    };

    return (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true">
            <div className="absolute inset-0 bg-black/30" onClick={closeModal} />
            <div className="absolute inset-0 flex items-center justify-center p-4">
                <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
                    <h2 className="text-lg font-semibold text-slate-900">Buy to Close (Short Call)</h2>
                    <p className="mt-1 text-sm text-slate-600">Lot {lot.lotNo} — {lot.ticker}</p>
                    <div className="mt-4 space-y-3">
                        <div>
                            <label htmlFor={debitId} className="text-sm text-slate-700">Limit Debit</label>
                            <input id={debitId} type="number" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" onChange={(e) => setForm((f) => ({ ...f, limitDebit: Number(e.target.value) }))} />
                        </div>
                        <div>
                            <label htmlFor={feesId} className="text-sm text-slate-700">Fees (optional)</label>
                            <input id={feesId} type="number" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" onChange={(e) => setForm((f) => ({ ...f, fees: Number(e.target.value) }))} />
                        </div>
                        <div>
                            <label htmlFor={notesId} className="text-sm text-slate-700">Notes</label>
                            <input id={notesId} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
                        </div>
                        {error && <div className="text-sm text-rose-600" aria-live="polite">{error}</div>}
                    </div>
                    <div className="mt-6 flex justify-end gap-2">
                        <button className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-slate-900 hover:bg-slate-100" onClick={closeModal}>Cancel</button>
                        <button className="rounded-lg bg-slate-900 px-4 py-2 text-white hover:bg-black" onClick={submit}>Submit</button>
                    </div>
                </div>
            </div>
        </div>
    );
}
