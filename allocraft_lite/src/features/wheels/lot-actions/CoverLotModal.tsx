import { useId, useState } from "react";
import type { LotVM } from "../types";
import { useLotActions } from "./useLotActions";
import type { SellCoveredCallInput, TimeInForce } from "./types";
import { validateSellCC } from "./validators";

export function CoverLotModal({ lot }: { lot: LotVM }) {
    const { sellCoveredCall, closeModal } = useLotActions();
    const strikeId = useId();
    const expiryId = useId();
    const premId = useId();
    const tifId = useId();
    const feesId = useId();
    const [form, setForm] = useState<{ strike?: number; expiry?: string; limitPremium?: number; timeInForce: TimeInForce; fees?: number }>(
        { timeInForce: "DAY" }
    );
    const [error, setError] = useState<string | null>(null);

    const submit = async () => {
        const payload: SellCoveredCallInput = {
            lotId: lot.lotNo,
            strike: form.strike!,
            expiry: form.expiry!,
            limitPremium: form.limitPremium!,
            timeInForce: form.timeInForce,
            fees: form.fees,
        };
        if (!validateSellCC(payload)) {
            setError("Please enter a valid strike, premium, and a future expiration date.");
            return;
        }
        setError(null);
        await sellCoveredCall(payload).catch((e) => setError(e.message));
    };

    return (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true">
            <div className="absolute inset-0 bg-black/30" onClick={closeModal} />
            <div className="absolute inset-0 flex items-center justify-center p-4">
                <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
                    <h2 className="text-lg font-semibold text-slate-900">Sell Covered Call</h2>
                    <p className="mt-1 text-sm text-slate-600">Lot {lot.lotNo} — {lot.ticker}</p>
                    <div className="mt-4 space-y-3">
                        <div>
                            <label htmlFor={strikeId} className="text-sm text-slate-700">Strike</label>
                            <input id={strikeId} type="number" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" onChange={(e) => setForm((f) => ({ ...f, strike: Number(e.target.value) }))} />
                        </div>
                        <div>
                            <label htmlFor={expiryId} className="text-sm text-slate-700">Expiration</label>
                            <input id={expiryId} type="date" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" onChange={(e) => setForm((f) => ({ ...f, expiry: e.target.value }))} />
                        </div>
                        <div>
                            <label htmlFor={premId} className="text-sm text-slate-700">Limit Premium</label>
                            <input id={premId} type="number" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" onChange={(e) => setForm((f) => ({ ...f, limitPremium: Number(e.target.value) }))} />
                        </div>
                        <div>
                            <label htmlFor={tifId} className="text-sm text-slate-700">Good-till</label>
                            <select id={tifId} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" onChange={(e) => setForm((f) => ({ ...f, timeInForce: e.target.value as any }))}>
                                <option value="DAY">DAY</option>
                                <option value="GTC">GTC</option>
                            </select>
                        </div>
                        <div>
                            <label htmlFor={feesId} className="text-sm text-slate-700">Fees (optional)</label>
                            <input id={feesId} type="number" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" onChange={(e) => setForm((f) => ({ ...f, fees: Number(e.target.value) }))} />
                        </div>
                        <div className="text-xs text-slate-500">Contracts: 1 (fixed) — 1 contract per 100-share lot.</div>
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
