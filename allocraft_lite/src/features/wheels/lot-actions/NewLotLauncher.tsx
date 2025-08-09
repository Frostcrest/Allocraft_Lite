import React from "react";
import { useLotActions } from "./useLotActions";

export function NewLotLauncher() {
    const { openNewLot } = useLotActions();
    return (
        <button
            className="fixed bottom-6 right-6 rounded-full bg-slate-900 px-5 py-3 text-white shadow-lg hover:bg-black"
            onClick={() => openNewLot()}
            aria-label="Create new lot"
        >
            New Lot
        </button>
    );
}
