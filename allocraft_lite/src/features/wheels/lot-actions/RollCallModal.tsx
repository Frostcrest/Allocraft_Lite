import React, { useId, useState } from "react";
import type { LotVM } from "../types";
import { useLotActions } from "./useLotActions";
import type { RollCoveredCallInput, TimeInForce } from "./types";
import { validateRoll } from "./validators";

export function RollCallModal({ lot }: { lot: LotVM }) {
  const { rollCoveredCall, closeModal } = useLotActions();
  const debitId = useId();
  const strikeId = useId();
  const expiryId = useId();
  const premId = useId();
  const tifId = useId();

  const [form, setForm] = useState<{
    closeDebit?: number;
    openStrike?: number;
    openExpiry?: string;
    openPremium?: number;
    timeInForce: TimeInForce;
  }>({ timeInForce: "DAY" });
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    const payload: RollCoveredCallInput = {
      lotId: lot.lotNo,
      close: { limitDebit: form.closeDebit! },
      open: {
        strike: form.openStrike!,
        expiry: form.openExpiry!,
        limitPremium: form.openPremium!,
        timeInForce: form.timeInForce,
      },
    };
    if (!validateRoll(payload)) {
      setError("Please enter valid close debit and new leg (strike, expiry, premium).");
      return;
    }
    setError(null);
    await rollCoveredCall(payload).catch((e) => setError(e.message));
  };

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/30" onClick={closeModal} />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
          <h2 className="text-lg font-semibold text-slate-900">Roll Short Call</h2>
          <p className="mt-1 text-sm text-slate-600">Lot {lot.lotNo} — {lot.ticker}</p>
          <div className="mt-4 grid grid-cols-1 gap-4">
            <div className="rounded-xl border border-slate-200 p-3">
              <div className="text-sm font-medium text-slate-900">Close current leg</div>
              <div className="mt-2">
                <label htmlFor={debitId} className="text-sm text-slate-700">Limit Debit</label>
                <input id={debitId} type="number" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" onChange={(e) => setForm((f) => ({ ...f, closeDebit: Number(e.target.value) }))} />
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 p-3">
              <div className="text-sm font-medium text-slate-900">Open new leg</div>
              <div className="mt-2 grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor={strikeId} className="text-sm text-slate-700">Strike</label>
                  <input id={strikeId} type="number" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" onChange={(e) => setForm((f) => ({ ...f, openStrike: Number(e.target.value) }))} />
                </div>
                <div>
                  <label htmlFor={expiryId} className="text-sm text-slate-700">Expiration</label>
                  <input id={expiryId} type="date" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" onChange={(e) => setForm((f) => ({ ...f, openExpiry: e.target.value }))} />
                </div>
                <div className="col-span-2">
                  <label htmlFor={premId} className="text-sm text-slate-700">Limit Premium</label>
                  <input id={premId} type="number" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" onChange={(e) => setForm((f) => ({ ...f, openPremium: Number(e.target.value) }))} />
                </div>
                <div className="col-span-2">
                  <label htmlFor={tifId} className="text-sm text-slate-700">Good-till</label>
                  <select id={tifId} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" onChange={(e) => setForm((f) => ({ ...f, timeInForce: e.target.value as any }))}>
                    <option value="DAY">DAY</option>
                    <option value="GTC">GTC</option>
                  </select>
                </div>
              </div>
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
