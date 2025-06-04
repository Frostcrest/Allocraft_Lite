import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown } from "lucide-react";

export default function StatCard({ 
  title, 
  value, 
  change, 
  changeType, 
  icon: Icon,
  gradient 
}) {
  return (
    <Card className="relative overflow-hidden border-0 shadow-lg bg-white/80 backdrop-blur-xl">
      <div className={`absolute inset-0 opacity-5 ${gradient}`} />
      <CardContent className="p-6 relative">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-slate-600">{title}</p>
            <p className="text-2xl font-bold text-slate-900 tracking-tight">{value}</p>
            {change && (
              <div className={`flex items-center gap-1 text-sm font-medium ${
                changeType === 'positive' ? 'text-emerald-600' : 'text-red-500'
              }`}>
                {changeType === 'positive' ? (
                  <TrendingUp className="w-4 h-4" />
                ) : (
                  <TrendingDown className="w-4 h-4" />
                )}
                {change}
              </div>
            )}
          </div>
          <div className={`p-3 rounded-xl ${gradient} bg-opacity-10`}>
            <Icon className="w-6 h-6 text-white" /> {/* Make icon white */}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}