import React from 'react';
import { Button } from "@/components/ui/button";
import { Plus, RotateCcw } from "lucide-react";

// Minimal Wheels component to restore navigation
export default function Wheels() {
  console.log('Wheels component rendering...');

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-4xl font-bold text-slate-900 tracking-tight">Wheels by Ticker</h1>
            <p className="text-slate-600 mt-2">All lots and events are grouped by ticker</p>
          </div>
          <div className="flex gap-2">
            <Button className="bg-slate-900 hover:bg-slate-800 shadow-lg">
              <Plus className="w-5 h-5 mr-2" /> New Ticker
            </Button>
          </div>
        </div>

        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 bg-slate-100 rounded-full flex items-center justify-center">
            <RotateCcw className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-medium text-slate-900 mb-2">Wheels page temporarily simplified</h3>
          <p className="text-slate-500 mb-6">Navigation should work now. The full wheels functionality will be restored shortly.</p>
          <p className="text-xs text-gray-400">This is a minimal version to resolve the navigation issue.</p>
        </div>
      </div>
    </div>
  );
}
