import React from 'react';

export default function BrandedLoader({ show = false, message = 'Loading…' }) {
    if (!show) return null;
    return (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-white/70 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-4 p-6" role="status" aria-live="polite" aria-label="Loading">
                <div className="relative w-10 h-10">
                    <div className="absolute inset-0 rounded-full border-4 border-slate-200" />
                    <div className="absolute inset-0 rounded-full border-4 border-slate-700 border-t-transparent animate-spin" />
                </div>
                <div className="text-slate-700 text-sm">{message}</div>
            </div>
        </div>
    );
}
