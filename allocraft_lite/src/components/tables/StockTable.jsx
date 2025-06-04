import React from "react";
import { formatCurrency } from "@/lib/utils"; // <-- Add this import
import { format } from 'date-fns';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2 } from "lucide-react";

export default function StockTable({ stocks, onEdit, onDelete }) {
  const calculatePL = (stock) => {
    if (stock.current_price === null || stock.current_price === undefined) return null;
    const marketValue = stock.shares * stock.current_price;
    const costValue = stock.shares * stock.cost_basis;
    return marketValue - costValue;
  };

  return (
    <div className="rounded-xl border border-slate-200/60 overflow-hidden bg-white/80 backdrop-blur-xl">
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-50/80">
            <TableHead className="font-semibold text-slate-700">Ticker</TableHead>
            <TableHead className="font-semibold text-slate-700">Shares</TableHead>
            <TableHead className="font-semibold text-slate-700">Cost Basis</TableHead>
            <TableHead className="font-semibold text-slate-700">Market Price</TableHead>
            <TableHead className="font-semibold text-slate-700">Market Value</TableHead>
            <TableHead className="font-semibold text-slate-700">P/L</TableHead>
            <TableHead className="font-semibold text-slate-700">Status</TableHead>
            <TableHead className="font-semibold text-slate-700">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {stocks.map((stock) => {
            const pl = calculatePL(stock);
            const marketValue = (stock.current_price !== null && stock.current_price !== undefined)
              ? stock.shares * stock.current_price
              : null;

            return (
              <TableRow key={stock.id} className="hover:bg-slate-50/40 transition-colors">
                <TableCell className="font-semibold text-slate-900">{stock.ticker}</TableCell>
                <TableCell>{stock.shares}</TableCell>
                <TableCell>{formatCurrency(stock.cost_basis)}</TableCell>
                <TableCell>
                  {stock.current_price !== null && stock.current_price !== undefined
                    ? formatCurrency(stock.current_price)
                    : '-'}
                </TableCell>
                <TableCell>
                  {marketValue !== null
                    ? formatCurrency(marketValue)
                    : '-'}
                </TableCell>
                <TableCell>
                  {pl !== null ? (
                    <span className={pl >= 0 ? 'text-emerald-600 font-medium' : 'text-red-500 font-medium'}>
                      {formatCurrency(pl)}
                    </span>
                  ) : '-'}
                </TableCell>
                <TableCell>
                  <Badge variant={stock.status === 'Open' ? 'default' : 'secondary'}>
                    {stock.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onEdit(stock)}
                      className="hover:bg-slate-100"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onDelete(stock.id)}
                      className="hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      title="AI Analysis (coming soon)"
                      disabled
                      className="ml-2"
                    >
                      <span role="img" aria-label="AI">🤖</span>
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}