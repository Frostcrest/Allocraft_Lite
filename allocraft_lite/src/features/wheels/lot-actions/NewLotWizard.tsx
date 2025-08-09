import React, { useId, useState } from "react";
import { useLotActions } from "./useLotActions";

export function NewLotWizard({ ticker }: { ticker?: string }) {
  const { createLotBuy, createLotShortPut, closeModal } = useLotActions();
  const [tab, setTab] = useState<"BUY" | "CSP">("BUY");
  const priceId = useId();
  const buyDateId = useId();
  const buyFeesId = useId();
  const cspStrikeId = useId();
  const cspExpiryId = useId();
  const cspPremId = useId();
  const cspFeesId = useId();
  const [err, setErr] = useState<string | null>(null);

  const submitBuy = async () => {
    const price = Number((document.getElementById(priceId) as HTMLInputElement)?.value);
    const date = (document.getElementById(buyDateId) as HTMLInputElement)?.value || new Date().toISOString().slice(0, 10);
    const fees = Number((document.getElementById(buyFeesId) as HTMLInputElement)?.value) || undefined;
    await createLotBuy({ ticker: ticker ?? "TICKER", price, date, fees }).catch((e) => setErr(e.message));
  };

  const submitCsp = async () => {
    const strike = Number((document.getElementById(cspStrikeId) as HTMLInputElement)?.value);
    const expiry = (document.getElementById(cspExpiryId) as HTMLInputElement)?.value;
    const premium = Number((document.getElementById(cspPremId) as HTMLInputElement)?.value);
    const fees = Number((document.getElementById(cspFeesId) as HTMLInputElement)?.value) || undefined;
    await createLotShortPut({ ticker: ticker ?? "TICKER", strike, expiry, premium, timeInForce: "DAY", fees }).catch((e) => setErr(e.message));
  };

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/30" onClick={closeModal} />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
          <h2 className="text-lg font-semibold text-slate-900">Create New Lot</h2>
          <div className="mt-4">
            <div className="inline-flex rounded-lg border border-slate-300 p-0.5">
              <button className={`px-3 py-1.5 text-sm ${tab === "BUY" ? "bg-slate-900 text-white" : "text-slate-700"}`} onClick={() => setTab("BUY")}>Buy 100 Shares</button>
              <button className={`px-3 py-1.5 text-sm ${tab === "CSP" ? "bg-slate-900 text-white" : "text-slate-700"}`} onClick={() => setTab("CSP")}>Cash-Secured Put</button>
            </div>
            {tab === "BUY" ? (
              <div className="mt-4 space-y-3">
                <div>
                  <label htmlFor={priceId} className="text-sm text-slate-700">Price</label>
                  <input id={priceId} type="number" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
                </div>
                <div>
                  <label htmlFor={buyDateId} className="text-sm text-slate-700">Date</label>
                  <input id={buyDateId} type="date" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" defaultValue={new Date().toISOString().slice(0, 10)} />
                </div>
                <div>
                  <label htmlFor={buyFeesId} className="text-sm text-slate-700">Fees (optional)</label>
                  <input id={buyFeesId} type="number" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
                </div>
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                <div>
                  <label htmlFor={cspStrikeId} className="text-sm text-slate-700">Strike</label>
                  <input id={cspStrikeId} type="number" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
                </div>
                <div>
                  <label htmlFor={cspExpiryId} className="text-sm text-slate-700">Expiration</label>
                  <input id={cspExpiryId} type="date" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
                </div>
                <div>
                  <label htmlFor={cspPremId} className="text-sm text-slate-700">Premium</label>
                  <input id={cspPremId} type="number" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
                </div>
                <div>
                  <label htmlFor={cspFeesId} className="text-sm text-slate-700">Fees (optional)</label>
                  <input id={cspFeesId} type="number" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
                </div>
                <div className="text-xs text-slate-500">Requires cash to secure 100 shares at strike.</div>
              </div>
            )}
            {err && <div className="mt-2 text-sm text-rose-600" aria-live="polite">{err}</div>}
          </div>
          <div className="mt-6 flex justify-end gap-2">
            <button className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-slate-900 hover:bg-slate-100" onClick={closeModal}>Cancel</button>
            {tab === "BUY" ? (
              <button className="rounded-lg bg-slate-900 px-4 py-2 text-white hover:bg-black" onClick={submitBuy}>Submit</button>
            ) : (
              <button className="rounded-lg bg-slate-900 px-4 py-2 text-white hover:bg-black" onClick={submitCsp}>Submit</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
