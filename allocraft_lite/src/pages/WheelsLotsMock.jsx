import React from "react";

// ---- SAMPLE DATA ----
const MOCK = {
    cycle: {
        title: "GOOG • GOOG",
        started: "Open • Started 2025-07-02",
        open: true,
    },
    lots: [
        // Cash-Secured Put (not yet assigned) — shows collateral reserved
        {
            lotNo: 0,
            ticker: "GOOG",
            acquisition: {
                type: "CASH_SECURED_PUT",
                label: "PUT Sold @ $180.00",
                date: "2025-08-05",
            },
            costBasis: "—",
            coverage: { strike: "$180", premium: "$3.25", status: "OPEN" },
            status: "CASH_RESERVED",
            collateral: "$18,000"
        },
        {
            lotNo: 1,
            ticker: "GOOG",
            acquisition: {
                type: "PUT_ASSIGNMENT",
                label: "PUT Assigned @ $175.17",
                date: "2025-07-02",
            },
            costBasis: "$175.17",
            coverage: { strike: "$200", premium: "$4.95", status: "CLOSED" },
            status: "OPEN_COVERED",
        },
        {
            lotNo: 2,
            ticker: "GOOG",
            acquisition: {
                type: "OUTRIGHT_PURCHASE",
                label: "Bought @ $191.82",
                date: "2025-08-08",
            },
            costBasis: "$191.82",
            coverage: undefined,
            status: "OPEN_UNCOVERED",
        },
        {
            lotNo: 3,
            ticker: "GOOG",
            acquisition: {
                type: "PUT_ASSIGNMENT",
                label: "PUT Assigned @ $190.00",
                date: "2025-08-08",
            },
            costBasis: "$190.00",
            coverage: { strike: "$220", premium: "$0.94", status: "OPEN" },
            status: "OPEN_COVERED",
        },
        // Closed via manual sell
        {
            lotNo: 4,
            ticker: "GOOG",
            acquisition: {
                type: "OUTRIGHT_PURCHASE",
                label: "Bought @ $185.40",
                date: "2025-07-15",
            },
            costBasis: "$185.40",
            coverage: undefined,
            status: "CLOSED_SOLD",
            closed: { reason: "MANUAL_SALE", label: "Sold @ $205.50 on 2025-08-10" },
        },
        // Closed via call assignment (called away)
        {
            lotNo: 5,
            ticker: "GOOG",
            acquisition: {
                type: "PUT_ASSIGNMENT",
                label: "PUT Assigned @ $175.00",
                date: "2025-07-10",
            },
            costBasis: "$175.00",
            coverage: { strike: "$190", premium: "$1.10", status: "CLOSED" },
            status: "CLOSED_CALLED_AWAY",
            closed: { reason: "CALLED_AWAY", label: "Called Away @ $190.00 on 2025-08-09" },
        },
    ],
};

// ---- STATUS CHIP ----
function StatusChip({ status }) {
    const map = {
        OPEN_COVERED: {
            cls: "border-emerald-300 bg-emerald-50 text-emerald-700",
            label: "Covered",
        },
        OPEN_UNCOVERED: {
            cls: "border-amber-300 bg-amber-50 text-amber-700",
            label: "Uncovered",
        },
        CASH_RESERVED: {
            cls: "border-sky-300 bg-sky-50 text-sky-700",
            label: "Cash Reserved",
        },
        CLOSED_CALLED_AWAY: {
            cls: "border-slate-300 bg-slate-100 text-slate-700",
            label: "Called Away",
        },
        CLOSED_SOLD: {
            cls: "border-slate-300 bg-slate-100 text-slate-700",
            label: "Sold",
        },
    }[status];
    return (
        <span
            className={`inline-flex items-center rounded-xl border px-2.5 py-1 text-xs font-medium ${map.cls}`}
        >
            {map.label}
        </span>
    );
}

// ---- LOT CARD ----
function LotCard(props) {
    const { lotNo, ticker, acquisition, costBasis, coverage, status, collateral, closed } = props;

    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
            <div className="mb-3 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-900">{`Lot ${lotNo} — ${ticker}`}</h3>
                <StatusChip status={status} />
            </div>

            <div className="space-y-1.5">
                <div className="text-slate-900">
                    <span className="font-semibold">{acquisition.label}</span>
                    {acquisition.date && (
                        <span className="text-slate-500">{` • ${acquisition.date}`}</span>
                    )}
                </div>

                {acquisition.type === "CASH_SECURED_PUT" ? (
                    <div className="text-sm text-slate-600">
                        Cash Collateral Reserved: <span className="font-medium text-slate-900">{collateral || "—"}</span>
                    </div>
                ) : (
                    <div className="text-sm text-slate-600">
                        Cost Basis: <span className="font-medium text-slate-900">{costBasis}</span>
                    </div>
                )}

                {/* Secondary line */}
                {status === "CLOSED_SOLD" || status === "CLOSED_CALLED_AWAY" ? (
                    <div className="text-sm text-slate-700">
                        <span className="font-medium">Outcome:</span> {closed?.label || "Closed"}
                    </div>
                ) : acquisition.type === "CASH_SECURED_PUT" ? (
                    <div className="text-sm text-slate-700">
                        <span className="font-medium">Put Sold:</span> {coverage?.strike} strike, {coverage?.premium} premium
                        {coverage?.status === "OPEN" && (
                            <span className="ml-2 rounded-md bg-sky-100 px-2 py-0.5 text-xs text-sky-800">Open</span>
                        )}
                    </div>
                ) : coverage ? (
                    <div className="text-sm text-slate-700">
                        <span className="font-medium">Call Sold:</span> {coverage.strike} strike, {coverage.premium} premium
                        {coverage.status === "OPEN" && (
                            <span className="ml-2 rounded-md bg-emerald-100 px-2 py-0.5 text-xs text-emerald-800">Open</span>
                        )}
                        {coverage.status === "CLOSED" && (
                            <span className="ml-2 rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-700">Closed</span>
                        )}
                    </div>
                ) : (
                    <div className="text-sm italic text-slate-500">Call not sold yet</div>
                )}
            </div>
        </div>
    );
}

// ---- CYCLE PICKER CARD ----
function CyclePickerCard({ title, subtitle, selected = false }) {
    return (
        <div
            className={`rounded-2xl border bg-white p-5 shadow-sm ${selected ? "border-slate-800" : "border-slate-200"
                }`}
        >
            <div className="font-semibold text-slate-900">{title}</div>
            <div className="mt-1 text-sm text-slate-500">{subtitle}</div>
        </div>
    );
}

// ---- MAIN PAGE ----
export default function WheelCyclesLotsMock() {
    const { cycle, lots } = MOCK;

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Top Bar */}
            <div className="flex items-center justify-end gap-3 p-4">
                <button className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-white hover:bg-black">
                    <span>＋</span>
                    <span>New Cycle</span>
                </button>
                <button className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-slate-900 hover:bg-slate-100">
                    Add Event
                </button>
            </div>

            {/* Content */}
            <main className="mx-auto max-w-6xl px-6 pb-10 lg:px-8">
                <header className="mb-6">
                    <h1 className="text-4xl font-bold text-slate-900">Wheel Cycles</h1>
                    <p className="mt-1 text-slate-600">
                        Track entries at any stage and compute live cost basis
                    </p>
                </header>

                {/* Cycle Picker */}
                <section className="mb-6">
                    <CyclePickerCard title={cycle.title} subtitle={cycle.started} selected />
                </section>

                {/* Lots Grid */}
                <section className="grid grid-cols-1 gap-5 xl:grid-cols-2">
                    {lots.map((l) => (
                        <LotCard key={l.lotNo} {...l} />
                    ))}
                </section>
            </main>
        </div>
    );
}
