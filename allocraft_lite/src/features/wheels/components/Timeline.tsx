// Remove unused React import
import type { LotEvent, EventType } from "../types";

const dotClass = (t: EventType) => {
    const map = {
        SELL_PUT: "bg-purple-500",
        SELL_PUT_CLOSE: "bg-purple-300",
        BUY_PUT_CLOSE: "bg-purple-200",
        PUT_ASSIGNMENT: "bg-fuchsia-600",
        BUY_SHARES: "bg-blue-500",
        SELL_CALL_OPEN: "bg-emerald-600",
        SELL_CALL_CLOSE: "bg-emerald-300",
        CALL_ASSIGNMENT: "bg-emerald-800",
        FEE: "bg-slate-400",
    }[t];
    
    return map || "bg-gray-400"; // fallback color
};

export function Timeline({ events }: { events: LotEvent[] }) {
    return (
        <ol className="relative ml-4 border-l border-slate-200">
            {events.map((e) => (
                <li key={e.id} className="mb-5 ml-4">
                    <span className={`absolute -left-1.5 inline-block h-2.5 w-2.5 rounded-full ${dotClass(e.type)}`} />
                    <div className="flex flex-wrap items-center gap-x-3">
                        <div className="text-xs text-slate-500">{e.date}</div>
                        <div className="text-sm font-medium text-slate-900">{e.label}</div>
                        {e.qty && (
                            <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-700">{e.qty}</span>
                        )}
                    </div>
                    <div className="mt-1 text-sm text-slate-600">
                        {e.price && (
                            <span className="mr-4">
                                Price: <strong className="text-slate-900">{e.price}</strong>
                            </span>
                        )}
                        {e.strike && (
                            <span className="mr-4">
                                Strike: <strong className="text-slate-900">{e.strike}</strong>
                            </span>
                        )}
                        {e.premium && (
                            <span>
                                Premium: <strong className="text-slate-900">{e.premium}</strong>
                            </span>
                        )}
                        {e.notes && <span className="ml-3 italic text-slate-500">({e.notes})</span>}
                    </div>
                </li>
            ))}
        </ol>
    );
}
