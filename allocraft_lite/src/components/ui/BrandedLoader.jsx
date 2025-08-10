import React from 'react';
import allocraftLogo from '@/assets/allocraft_logo-transparent-preview.png';

export default function BrandedLoader({ show = false, message = 'Loading your portfolio…' }) {
    if (!show) return null;
    return (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-50">
            <div className="flex flex-col items-center gap-6 p-8">
                <div className="relative w-28 h-28">
                    <div className="absolute inset-0 rounded-full border-4 border-slate-200" />
                    <div className="absolute inset-0 rounded-full border-4 border-slate-900 border-t-transparent animate-spin" />
                    <img
                        src={allocraftLogo}
                        alt="Allocraft"
                        className="absolute inset-3 w-22 h-22 object-contain drop-shadow-sm"
                    />
                </div>
                <div className="text-slate-800 text-sm font-medium tracking-wide">{message}</div>
            </div>
        </div>
    );
}
