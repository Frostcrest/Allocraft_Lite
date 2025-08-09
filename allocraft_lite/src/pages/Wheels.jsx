import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Plus, Edit, RotateCcw, Trash2 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { wheelApi } from "@/api/fastapiClient";
import { formatCurrency } from "@/lib/utils";
import WheelEventForm from "@/components/forms/WheelEventForm";

const initialCycle = {
  cycle_key: "",
  ticker: "",
  started_at: new Date().toISOString().split("T")[0],
  status: "Open",
  notes: "",
};

const initialEvent = {
  event_type: "",
  trade_date: new Date().toISOString().split("T")[0],
  quantity_shares: "",
  contracts: "",
  price: "",
  strike: "",
  premium: "",
  fees: "",
  link_event_id: "",
  notes: "",
};

export default function Wheels() {
  const [cycles, setCycles] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [events, setEvents] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [lots, setLots] = useState([]);
  const [viewMode, setViewMode] = useState("lots"); // 'lots' | 'events'
  const [lotDetails, setLotDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCycleDialog, setShowCycleDialog] = useState(false);
  const [showEventDialog, setShowEventDialog] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [cycleForm, setCycleForm] = useState(initialCycle);
  const [eventForm, setEventForm] = useState(initialEvent);

  useEffect(() => {
    (async () => {
      try {
        const data = await wheelApi.listCycles();
        setCycles(data);
        if (data.length) setSelectedId(data[0].id);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    (async () => {
      try {
        const [evts, m, ls] = await Promise.all([
          wheelApi.listEvents(selectedId),
          wheelApi.metrics(selectedId),
          wheelApi.listLots(selectedId)
        ]);
        setEvents(evts);
        setMetrics(m);
        setLots(ls);
      } catch (e) {
        console.error(e);
      }
    })();
  }, [selectedId]);

  const openAddCycle = () => {
    setCycleForm(initialCycle);
    setShowCycleDialog(true);
  };

  const saveCycle = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...cycleForm };
      const res = await wheelApi.createCycle(payload);
      const data = await wheelApi.listCycles();
      setCycles(data);
      setSelectedId(res.id);
      setShowCycleDialog(false);
    } catch (e2) {
      console.error(e2);
    }
  };

  const removeCycle = async (id) => {
    if (!window.confirm('Delete this wheel cycle? This removes all its events.')) return;
    await wheelApi.deleteCycle(id);
    const data = await wheelApi.listCycles();
    setCycles(data);
    setSelectedId(data.length ? data[0].id : null);
    setEvents([]);
    setMetrics(null);
  };

  const openAddEvent = () => {
    setEditingEvent(null);
    setEventForm(initialEvent);
    setShowEventDialog(true);
  };

  const openEditEvent = (evt) => {
    setEditingEvent(evt);
    setEventForm({
      event_type: evt.event_type,
      trade_date: evt.trade_date || new Date().toISOString().split('T')[0],
      quantity_shares: evt.quantity_shares ?? "",
      contracts: evt.contracts ?? "",
      price: evt.price ?? "",
      strike: evt.strike ?? "",
      premium: evt.premium ?? "",
      fees: evt.fees ?? "",
      link_event_id: evt.link_event_id ?? "",
      notes: evt.notes ?? "",
    });
    setShowEventDialog(true);
  };

  const saveEvent = async (e) => {
    e.preventDefault();
    const num = (v) => (v === "" || v === null || v === undefined ? null : Number(v));
    const payload = {
      cycle_id: selectedId,
      event_type: eventForm.event_type,
      trade_date: eventForm.trade_date || null,
      quantity_shares: num(eventForm.quantity_shares),
      contracts: eventForm.contracts === "" ? null : parseInt(eventForm.contracts),
      price: num(eventForm.price),
      strike: num(eventForm.strike),
      premium: num(eventForm.premium),
      fees: num(eventForm.fees),
      link_event_id: eventForm.link_event_id === "" ? null : parseInt(eventForm.link_event_id),
      notes: eventForm.notes || null,
    };
    if (editingEvent) {
      await wheelApi.updateEvent(editingEvent.id, payload);
    } else {
      await wheelApi.createEvent(payload);
    }
    const [evts, m, ls] = await Promise.all([
      wheelApi.listEvents(selectedId),
      wheelApi.metrics(selectedId),
      wheelApi.listLots(selectedId)
    ]);
    setEvents(evts);
    setMetrics(m);
    setLots(ls);
    setShowEventDialog(false);
  };

  const deleteEvent = async (id) => {
    if (!window.confirm('Delete this event?')) return;
    await wheelApi.deleteEvent(id);
    const [evts, m, ls] = await Promise.all([
      wheelApi.listEvents(selectedId),
      wheelApi.metrics(selectedId),
      wheelApi.listLots(selectedId)
    ]);
    setEvents(evts);
    setMetrics(m);
    setLots(ls);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-slate-200 rounded w-64"></div>
            <div className="h-96 bg-slate-200 rounded-xl"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-4xl font-bold text-slate-900 tracking-tight">Wheel Cycles</h1>
            <p className="text-slate-600 mt-2">Track entries at any stage and compute live cost basis</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={openAddCycle} className="bg-slate-900 hover:bg-slate-800 shadow-lg">
              <Plus className="w-5 h-5 mr-2" /> New Cycle
            </Button>
            {selectedId && (
              <>
                <Button variant="outline" onClick={() => setViewMode(viewMode === 'lots' ? 'events' : 'lots')}>
                  Switch to {viewMode === 'lots' ? 'Events' : 'Lots'} View
                </Button>
                {viewMode === 'events' && (
                  <Button variant="outline" onClick={openAddEvent}>Add Event</Button>
                )}
              </>
            )}
          </div>
        </div>

        {cycles.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 bg-slate-100 rounded-full flex items-center justify-center">
              <RotateCcw className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-medium text-slate-900 mb-2">No cycles yet</h3>
            <p className="text-slate-500 mb-6">Create your first wheel cycle to begin tracking</p>
            <Button onClick={openAddCycle} className="bg-slate-900 hover:bg-slate-800">
              <Plus className="w-5 h-5 mr-2" /> Add Your First Cycle
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="space-y-3">
              {cycles.map((c) => (
                <Card key={c.id} className={`cursor-pointer ${selectedId === c.id ? 'ring-2 ring-slate-900' : ''}`} onClick={() => setSelectedId(c.id)}>
                  <CardHeader className="py-4">
                    <CardTitle className="text-base flex justify-between items-center">
                      <span>{c.cycle_key} • {c.ticker}</span>
                      <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); removeCycle(c.id); }}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </CardTitle>
                    <div className="text-xs text-slate-500">{c.status} • Started {c.started_at || '—'}</div>
                  </CardHeader>
                </Card>
              ))}
            </div>

            <div className="lg:col-span-2 space-y-6">
              {selectedId && (
                <>
                  <Card className="border-0 shadow bg-white/80">
                    <CardHeader className="py-4">
                      <CardTitle className="text-lg">Cycle Metrics</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {metrics ? (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                          <div><div className="text-slate-500">Shares Owned</div><div className="font-semibold">{metrics.shares_owned}</div></div>
                          <div><div className="text-slate-500">Avg Cost Basis</div><div className="font-semibold">{formatCurrency(metrics.average_cost_basis)}</div></div>
                          <div><div className="text-slate-500">Cost Remaining</div><div className="font-semibold">{formatCurrency(metrics.total_cost_remaining)}</div></div>
                          <div><div className="text-slate-500">Net Options Cashflow</div><div className="font-semibold">{formatCurrency(metrics.net_options_cashflow)}</div></div>
                          <div><div className="text-slate-500">Realized Stock P/L</div><div className="font-semibold">{formatCurrency(metrics.realized_stock_pl)}</div></div>
                          <div><div className="text-slate-500">Total Realized P/L</div><div className="font-semibold">{formatCurrency(metrics.total_realized_pl)}</div></div>
                          <div><div className="text-slate-500">Current Price</div><div className="font-semibold">{metrics.current_price != null ? formatCurrency(metrics.current_price) : '—'}</div></div>
                          <div><div className="text-slate-500">Unrealized P/L</div><div className={`font-semibold ${metrics.unrealized_pl >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{formatCurrency(metrics.unrealized_pl)}</div></div>
                        </div>
                      ) : (
                        <div className="text-sm text-slate-500">No metrics yet</div>
                      )}
                    </CardContent>
                  </Card>

                  {viewMode === 'lots' ? (
                    <Card className="border-0 shadow bg-white/80">
                      <CardHeader className="py-4">
                        <div className="flex justify-between items-center">
                          <CardTitle className="text-lg">Lots</CardTitle>
                          <div className="text-sm text-slate-500">Uncovered: {lots.filter(l => l.status === 'OPEN_UNCOVERED').length}</div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {lots.length === 0 ? (
                          <div className="text-sm text-slate-500 flex items-center justify-between">
                            <span>No lots yet. Use Rebuild to construct from events.</span>
                            <Button size="sm" onClick={async () => { await wheelApi.rebuildLots(selectedId); const ls = await wheelApi.listLots(selectedId); setLots(ls); }}>Rebuild</Button>
                          </div>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="min-w-full text-sm">
                              <thead>
                                <tr className="text-left text-slate-500">
                                  <th className="py-2 pr-4">Lot #</th>
                                  <th className="py-2 pr-4">Acquisition</th>
                                  <th className="py-2 pr-4">Cost Basis</th>
                                  <th className="py-2 pr-4">Status</th>
                                  <th className="py-2 pr-4">Actions</th>
                                </tr>
                              </thead>
                              <tbody>
                                {lots.map((l, idx) => (
                                  <tr key={l.id} className="border-t hover:bg-slate-50 cursor-pointer" onClick={async () => {
                                    const [details, met, links] = await Promise.all([
                                      wheelApi.getLot(l.id),
                                      wheelApi.lotMetrics(l.id),
                                      wheelApi.getLotLinks(l.id)
                                    ]);
                                    setLotDetails({ lot: details, metrics: met, ...links });
                                  }}>
                                    <td className="py-2 pr-4">{idx + 1}</td>
                                    <td className="py-2 pr-4">{l.acquisition_method} • {l.acquisition_date || '—'}</td>
                                    <td className="py-2 pr-4">{l.cost_basis_effective != null ? formatCurrency(l.cost_basis_effective) : '—'}</td>
                                    <td className="py-2 pr-4">{l.status}</td>
                                    <td className="py-2 pr-4">
                                      {l.status === 'OPEN_UNCOVERED' && (
                                        <Button size="sm" variant="outline" onClick={async (e) => { e.stopPropagation(); await wheelApi.rebuildLots(selectedId); const ls = await wheelApi.listLots(selectedId); setLots(ls); }}>Rebuild</Button>
                                      )}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ) : (
                    <Card className="border-0 shadow bg-white/80">
                      <CardHeader className="py-4">
                        <CardTitle className="text-lg">Events</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {events.length === 0 ? (
                          <div className="text-sm text-slate-500">No events. Add your first event.</div>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="min-w-full text-sm">
                              <thead>
                                <tr className="text-left text-slate-500">
                                  <th className="py-2 pr-4">Date</th>
                                  <th className="py-2 pr-4">Type</th>
                                  <th className="py-2 pr-4">Shares</th>
                                  <th className="py-2 pr-4">Contracts</th>
                                  <th className="py-2 pr-4">Price</th>
                                  <th className="py-2 pr-4">Strike</th>
                                  <th className="py-2 pr-4">Premium</th>
                                  <th className="py-2 pr-4">Fees</th>
                                  <th className="py-2 pr-4">Link</th>
                                  <th className="py-2 pr-4">Notes</th>
                                  <th></th>
                                </tr>
                              </thead>
                              <tbody>
                                {events.map((e) => (
                                  <tr key={e.id} className="border-t">
                                    <td className="py-2 pr-4">{e.trade_date || '—'}</td>
                                    <td className="py-2 pr-4">{e.event_type}</td>
                                    <td className="py-2 pr-4">{e.quantity_shares ?? ''}</td>
                                    <td className="py-2 pr-4">{e.contracts ?? ''}</td>
                                    <td className="py-2 pr-4">{e.price != null && e.price !== '' ? formatCurrency(Number(e.price)) : ''}</td>
                                    <td className="py-2 pr-4">{e.strike != null && e.strike !== '' ? formatCurrency(Number(e.strike)) : ''}</td>
                                    <td className="py-2 pr-4">{e.premium != null && e.premium !== '' ? formatCurrency(Number(e.premium)) : ''}</td>
                                    <td className="py-2 pr-4">{e.fees != null && e.fees !== '' ? formatCurrency(Number(e.fees)) : ''}</td>
                                    <td className="py-2 pr-4">{e.link_event_id ?? ''}</td>
                                    <td className="py-2 pr-4">{e.notes ?? ''}</td>
                                    <td className="py-2">
                                      <div className="flex gap-1">
                                        <Button size="icon" variant="ghost" onClick={() => openEditEvent(e)}><Edit className="w-4 h-4" /></Button>
                                        <Button size="icon" variant="ghost" onClick={() => deleteEvent(e.id)} className="hover:text-red-600 hover:bg-red-50"><Trash2 className="w-4 h-4" /></Button>
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* Add Cycle Dialog */}
        <Dialog open={showCycleDialog} onOpenChange={setShowCycleDialog}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-slate-900">New Wheel Cycle</DialogTitle>
            </DialogHeader>
            <form onSubmit={saveCycle} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700">Cycle Key</label>
                  <input className="input" value={cycleForm.cycle_key} onChange={(e) => setCycleForm((p) => ({ ...p, cycle_key: e.target.value }))} required placeholder="AAPL-1" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700">Ticker</label>
                  <input className="input" value={cycleForm.ticker} onChange={(e) => setCycleForm((p) => ({ ...p, ticker: e.target.value.toUpperCase() }))} required placeholder="AAPL" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700">Start Date</label>
                  <input type="date" className="input" value={cycleForm.started_at} onChange={(e) => setCycleForm((p) => ({ ...p, started_at: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700">Status</label>
                  <select className="input" value={cycleForm.status} onChange={(e) => setCycleForm((p) => ({ ...p, status: e.target.value }))}>
                    <option>Open</option>
                    <option>Closed</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-slate-700">Notes</label>
                  <input className="input" value={cycleForm.notes} onChange={(e) => setCycleForm((p) => ({ ...p, notes: e.target.value }))} />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setShowCycleDialog(false)}>Cancel</Button>
                <Button type="submit" className="bg-slate-900 text-white">Create</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Add/Edit Event Dialog */}
        <Dialog open={showEventDialog} onOpenChange={setShowEventDialog}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-slate-900">{editingEvent ? 'Edit Event' : 'Add Event'}</DialogTitle>
            </DialogHeader>
            <WheelEventForm
              form={eventForm}
              editing={!!editingEvent}
              onChange={(field, value) => setEventForm((p) => ({ ...p, [field]: value }))}
              onCancel={() => setShowEventDialog(false)}
              onSubmit={saveEvent}
            />
          </DialogContent>
        </Dialog>
      </div>
      {/* Lot Details Dialog */}
      <Dialog open={!!lotDetails} onOpenChange={(v) => !v && setLotDetails(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Lot Details</DialogTitle>
          </DialogHeader>
          {lotDetails && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-slate-500">Acquisition</div>
                  <div className="font-medium">{lotDetails.lot.acquisition_method} • {lotDetails.lot.acquisition_date || '—'}</div>
                </div>
                <div>
                  <div className="text-slate-500">Cost Basis</div>
                  <div className="font-semibold">{lotDetails.lot.cost_basis_effective != null ? formatCurrency(lotDetails.lot.cost_basis_effective) : '—'}</div>
                </div>
                <div>
                  <div className="text-slate-500">Net Premiums</div>
                  <div className="font-semibold">{formatCurrency(lotDetails.metrics.net_premiums)}</div>
                </div>
                <div>
                  <div className="text-slate-500">Unrealized P/L</div>
                  <div className={`font-semibold ${lotDetails.metrics.unrealized_pl >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{formatCurrency(lotDetails.metrics.unrealized_pl)}</div>
                </div>
              </div>
              <div>
                <div className="text-slate-500 mb-2">Linked Events</div>
                <div className="max-h-60 overflow-y-auto border rounded">
                  <table className="min-w-full text-xs">
                    <thead>
                      <tr className="text-left text-slate-500">
                        <th className="py-2 px-2">Date</th>
                        <th className="py-2 px-2">Type</th>
                        <th className="py-2 px-2">Shares</th>
                        <th className="py-2 px-2">Contracts</th>
                        <th className="py-2 px-2">Price/Strike</th>
                        <th className="py-2 px-2">Premium</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lotDetails.events?.map((e) => (
                        <tr key={e.id} className="border-t">
                          <td className="py-2 px-2">{e.trade_date || '—'}</td>
                          <td className="py-2 px-2">{e.event_type}</td>
                          <td className="py-2 px-2">{e.quantity_shares ?? ''}</td>
                          <td className="py-2 px-2">{e.contracts ?? ''}</td>
                          <td className="py-2 px-2">{e.price != null ? formatCurrency(e.price) : e.strike != null ? formatCurrency(e.strike) : ''}</td>
                          <td className="py-2 px-2">{e.premium != null ? formatCurrency(e.premium) : ''}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}