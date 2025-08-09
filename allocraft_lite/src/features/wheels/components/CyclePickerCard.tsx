import React from "react";

export function CyclePickerCard({
    title,
    subtitle,
    selected = false,
    onClick,
}: {
    title: string;
    subtitle?: string;
    selected?: boolean;
    onClick?: () => void;
}) {
    return (
        <div
            className={`cursor-pointer rounded-2xl border bg-white p-5 shadow-sm transition ${selected ? "border-slate-800 ring-2 ring-slate-200" : "border-slate-200 hover:shadow-md"
                }`}
            role="button"
            tabIndex={0}
            onClick={onClick}
            onKeyDown={(e) => {
                if (onClick && (e.key === "Enter" || e.key === " ")) onClick();
            }}
        >
            <div className="font-semibold text-slate-900">{title}</div>
            <div className="mt-1 text-sm text-slate-500">{subtitle ?? "Open • Started recently"}</div>
        </div>
    );
}
