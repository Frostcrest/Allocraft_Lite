import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Plus, Edit, RotateCcw, Trash2 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { wheelApi } from "@/api/fastapiClient";
import { formatCurrency } from "@/lib/utils";
import WheelEventForm from "@/components/forms/WheelEventForm";
import { Timeline as LotTimeline } from "@/features/wheels/components/Timeline";
import { LotActionsProvider } from "@/features/wheels/lot-actions/LotActionsProvider";
import { useLotActions } from "@/features/wheels/lot-actions/useLotActions";
import { ActionButtonsRow } from "@/features/wheels/lot-actions/ActionButtonsRow";
import { CoverLotModal } from "@/features/wheels/lot-actions/CoverLotModal";
import { CloseCallModal } from "@/features/wheels/lot-actions/CloseCallModal";
import { RollCallModal } from "@/features/wheels/lot-actions/RollCallModal";
import { NewLotWizard } from "@/features/wheels/lot-actions/NewLotWizard";

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
  const [coverageMap, setCoverageMap] = useState({}); // lotId -> { strike, premium, status }
  const [lotEventsMap, setLotEventsMap] = useState({}); // lotId -> LotEvent[] mapped for timeline
  const [uiLots, setUiLots] = useState([]); // includes synthetic CSP lots
  const [actionLots, setActionLots] = useState([]); // LotVMs for actions mock
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

  // Enrich coverage info (strike/premium) and collect per-lot events for timeline by looking at linked events
  useEffect(() => {
    if (!lots || lots.length === 0) {
      setCoverageMap({});
      setLotEventsMap({});
      return;
    }
    (async () => {
      try {
        const pairs = await Promise.all(
          lots.slice(0, 20).map(async (l) => {
            try {
              const links = await wheelApi.getLotLinks(l.id);
              const evts = links?.events || [];
              const callOpen = evts.find((e) => e.event_type === 'SELL_CALL_OPEN');
              const callClose = evts.find((e) => e.event_type === 'SELL_CALL_CLOSE' || e.event_type === 'CALL_ASSIGNED');
              const putOpen = evts.find((e) => e.event_type === 'SELL_PUT_OPEN');
              let coverage = null;
              if (callOpen) {
                coverage = {
                  strike: callOpen.strike ?? null,
                  premium: callOpen.premium ?? null,
                  status: callClose ? 'CLOSED' : 'OPEN',
                };
              } else if (putOpen && (l.status === 'CASH_RESERVED' || l.acquisition_method === 'CASH_SECURED_PUT')) {
                coverage = {
                  strike: putOpen.strike ?? null,
                  premium: putOpen.premium ?? null,
                  status: 'OPEN',
                };
              }
              // map events for timeline UI
              const eventsVM = evts.map((e) => mapEventForTimeline(e));
              return [l.id, { coverage, eventsVM }];
            } catch {
              return [l.id, { coverage: null, eventsVM: [] }];
            }
          })
        );
        const cov = {};
        const emap = {};
        for (const [id, v] of pairs) {
          cov[id] = v.coverage;
          emap[id] = v.eventsVM;
        }
        setCoverageMap(cov);
        setLotEventsMap(emap);
      } catch (e) {
        console.error(e);
      }
    })();
  }, [lots]);

  // Build UI lots: backend lots + synthetic cash-secured put cards for open puts
  useEffect(() => {
    try {
      if (!events) {
        setUiLots(lots || []);
        return;
      }
      const openPuts = (events || []).filter((e) => e.event_type === 'SELL_PUT_OPEN');
      const closedIds = new Set((events || []).filter((e) => e.event_type === 'SELL_PUT_CLOSE' && e.link_event_id).map((e) => e.link_event_id));
      const synthetic = openPuts
        .filter((op) => !closedIds.has(op.id))
        .map((op) => ({
          id: `synthetic-csp-${op.id}`,
          acquisition_method: 'CASH_SECURED_PUT',
          acquisition_date: op.trade_date || null,
          status: 'CASH_RESERVED',
          cost_basis_effective: null,
          _coverage: { strike: op.strike ?? null, premium: op.premium ?? null, status: 'OPEN' },
          _synthetic: true,
          _sourceEventId: op.id,
        }));
      // Avoid duplicates if backend already surfaces CASH_RESERVED lots for same date
      const hasCashReserved = new Set((lots || []).filter((l) => l.status === 'CASH_RESERVED' || l.acquisition_method === 'CASH_SECURED_PUT').map((l) => `${l.acquisition_method}:${l.acquisition_date}`));
      const deduped = synthetic.filter((s) => !hasCashReserved.has(`${s.acquisition_method}:${s.acquisition_date}`));
      setUiLots([
        ...deduped.sort((a, b) => (a.acquisition_date || '').localeCompare(b.acquisition_date || '')),
        ...(lots || [])
      ]);
    } catch {
      setUiLots(lots || []);
    }
  }, [events, lots]);

  // Build actionLots (LotVMs) from uiLots and mapped timelines
  useEffect(() => {
    const ticker = cycles.find(c => c.id === selectedId)?.ticker || '';
    const arr = (uiLots || []).map((l, idx) => {
      const covSrc = l._coverage || coverageMap[l.id] || null;
      // timeline events for this lot
      let tl = [];
      if (l._synthetic) {
        const ev = (events || []).find(e => e.id === l._sourceEventId);
        if (ev) tl = [mapEventForTimeline(ev)];
      } else {
        tl = lotEventsMap[l.id] || [];
      }
      return {
        lotNo: idx + 1,
        ticker,
        acquisition: mapAcquisition(l, covSrc),
        costBasis: l.cost_basis_effective != null ? formatCurrency(l.cost_basis_effective) : '—',
        coverage: mapCoverage(covSrc),
        status: mapStatus(l.status),
        events: tl,
      };
    });
    setActionLots(arr);
  }, [uiLots, coverageMap, lotEventsMap, events, cycles, selectedId]);

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
    setMetrics(null);
  };

  const openAddEvent = () => {
    setEditingEvent(null);
    setEventForm({ ...initialEvent });
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
    try {
      const payload = { ...eventForm, cycle_id: selectedId };
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
      setEditingEvent(null);
    } catch (err) {
      console.error(err);
    }
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
                    <LotActionsProvider lots={actionLots} setLots={setActionLots}>
                      <Card className="border-0 shadow bg-white/80">
                        <CardHeader className="py-4">
                          <div className="flex items-center justify-between gap-3">
                            <CardTitle className="text-lg">Lots</CardTitle>
                            <div className="flex items-center gap-3">
                              <div className="text-sm text-slate-500">Uncovered: {lots.filter(l => l.status === 'OPEN_UNCOVERED').length}</div>
                              <NewLotHeaderButton />
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          {uiLots.length === 0 ? (
                            <div className="text-sm text-slate-500 flex items-center justify-between">
                              <span>No lots yet. Use Rebuild to construct from events.</span>
                              <Button size="sm" onClick={async () => { await wheelApi.rebuildLots(selectedId); const ls = await wheelApi.listLots(selectedId); setLots(ls); }}>Rebuild</Button>
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
                              {uiLots.map((l, idx) => {
                                // build timeline events: from lotEventsMap for real lots; synthetic from source event
                                let timeline = [];
                                if (l._synthetic) {
                                  const ev = (events || []).find(e => e.id === l._sourceEventId);
                                  if (ev) timeline = [mapEventForTimeline(ev)];
                                } else {
                                  timeline = lotEventsMap[l.id] || [];
                                }
                                const vm = actionLots[idx];
                                return (
                                  <div key={l.id} className="space-y-2">
                                    <LotCard
                                      lotNo={l._synthetic && idx === 0 ? 0 : idx + 1}
                                      ticker={cycles.find(c => c.id === selectedId)?.ticker || ''}
                                      acquisition={mapAcquisition(l, l._coverage || coverageMap[l.id])}
                                      costBasis={l.cost_basis_effective != null ? formatCurrency(l.cost_basis_effective) : '—'}
                                      coverage={mapCoverage(l._coverage || coverageMap[l.id])}
                                      status={mapStatus(l.status)}
                                      timeline={timeline}
                                      onClick={async () => {
                                        if (l._synthetic) {
                                          const ev = (events || []).find(e => e.id === l._sourceEventId);
                                          if (ev) {
                                            setLotDetails({ synthetic: true, event: ev });
                                          }
                                          return;
                                        }
                                        try {
                                          const [details, met, links] = await Promise.all([
                                            wheelApi.getLot(l.id),
                                            wheelApi.lotMetrics(l.id),
                                            wheelApi.getLotLinks(l.id)
                                          ]);
                                          setLotDetails({ lot: details, metrics: met, ...links });
                                        } catch (e) {
                                          console.error(e);
                                        }
                                      }}
                                    />
                                    {vm && (
                                      <div className="-mt-1">
                                        <ActionButtonsRow lot={vm} />
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                      <ModalsHost />
                    </LotActionsProvider>
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
            <DialogTitle className="text-xl font-bold">{lotDetails?.synthetic ? 'Cash-Secured Put (Open)' : 'Lot Details'}</DialogTitle>
          </DialogHeader>
          {lotDetails && (
            lotDetails.synthetic ? (
              <div className="space-y-4 text-sm">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-slate-500">Event</div>
                    <div className="font-medium">SELL_PUT_OPEN • {lotDetails.event.trade_date || '—'}</div>
                  </div>
                  <div>
                    <div className="text-slate-500">Status</div>
                    <div className="font-semibold text-sky-700">Open</div>
                  </div>
                  <div>
                    <div className="text-slate-500">Strike</div>
                    <div className="font-semibold">{lotDetails.event.strike != null ? formatCurrency(lotDetails.event.strike) : '—'}</div>
                  </div>
                  <div>
                    <div className="text-slate-500">Premium</div>
                    <div className="font-semibold">{lotDetails.event.premium != null ? formatCurrency(lotDetails.event.premium) : '—'}</div>
                  </div>
                  <div>
                    <div className="text-slate-500">Fees</div>
                    <div className="font-semibold">{lotDetails.event.fees != null ? formatCurrency(lotDetails.event.fees) : '—'}</div>
                  </div>
                  <div>
                    <div className="text-slate-500">Collateral Reserved</div>
                    <div className="font-semibold">{lotDetails.event.strike != null ? formatCurrency(Number(lotDetails.event.strike) * 100) : '—'}</div>
                  </div>
                </div>
              </div>
            ) : (
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
            )
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Host for lot action modals using the actions context
function ModalsHost() {
  const actions = useLotActions();
  const modal = actions.modal;
  return (
    <>
      {modal?.type === 'cover' && modal.lot && <CoverLotModal lot={modal.lot} />}
      {modal?.type === 'close' && modal.lot && <CloseCallModal lot={modal.lot} />}
      {modal?.type === 'roll' && modal.lot && <RollCallModal lot={modal.lot} />}
      {modal?.type === 'new' && <NewLotWizard />}
    </>
  );
}

function NewLotHeaderButton() {
  const actions = useLotActions();
  return (
    <Button size="sm" className="bg-slate-900 hover:bg-slate-800 text-white" onClick={() => actions.openNewLot()}>
      <Plus className="w-4 h-4 mr-1" /> New Lot
    </Button>
  );
}

// ---- UI helpers (StatusChip + LotCard) ----
function StatusChip({ status }) {
  const map = {
    OPEN_COVERED: { cls: "border-emerald-300 bg-emerald-50 text-emerald-700", label: "Covered" },
    OPEN_UNCOVERED: { cls: "border-amber-300 bg-amber-50 text-amber-700", label: "Uncovered" },
    CASH_RESERVED: { cls: "border-sky-300 bg-sky-50 text-sky-700", label: "Cash Reserved" },
    CLOSED_CALLED_AWAY: { cls: "border-slate-300 bg-slate-100 text-slate-700", label: "Called Away" },
    CLOSED_SOLD: { cls: "border-slate-300 bg-slate-100 text-slate-700", label: "Sold" },
  }[status] || { cls: "border-slate-200 bg-white text-slate-700", label: status };
  return (
    <span className={`inline-flex items-center rounded-xl border px-2.5 py-1 text-xs font-medium ${map.cls}`}>
      {map.label}
    </span>
  );
}

function LotCard({ lotNo, ticker, acquisition, costBasis, coverage, status, timeline = [], onClick }) {
  const [open, setOpen] = useState(false);
  const id = `lot-${lotNo}-timeline`;
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold text-slate-900">{`Lot ${lotNo} — ${ticker}`}</h3>
          <StatusChip status={status} />
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setOpen((v) => !v)}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
            aria-expanded={open}
            aria-controls={id}
          >
            <span>{open ? "Hide timeline" : "Show timeline"}</span>
            <span className={`transition-transform ${open ? "rotate-180" : ""}`}>⌄</span>
          </button>
          <button onClick={onClick} className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm text-slate-700 hover:bg-slate-50">Details</button>
        </div>
      </div>
      <div className="space-y-1.5">
        <div className="text-slate-900">
          <span className="font-semibold">{acquisition.label}</span>
          {acquisition.date && <span className="text-slate-500">{` • ${acquisition.date}`}</span>}
        </div>
        {acquisition.type === 'CASH_SECURED_PUT' ? (
          <div className="text-sm text-slate-600">Cash Collateral Reserved: <span className="font-medium text-slate-900">{acquisition.collateral || '—'}</span></div>
        ) : (
          <div className="text-sm text-slate-600">Cost Basis: <span className="font-medium text-slate-900">{costBasis}</span></div>
        )}
        {status === 'CLOSED_SOLD' || status === 'CLOSED_CALLED_AWAY' ? (
          <div className="text-sm text-slate-700"><span className="font-medium">Outcome:</span> {acquisition.outcome || 'Closed'}</div>
        ) : acquisition.type === 'CASH_SECURED_PUT' ? (
          <div className="text-sm text-slate-700"><span className="font-medium">Put Sold:</span> {coverage?.strike || '—'} strike{coverage?.premium ? `, ${coverage.premium} premium` : ''}{coverage?.status === 'OPEN' && <span className="ml-2 rounded-md bg-sky-100 px-2 py-0.5 text-xs text-sky-800">Open</span>}</div>
        ) : coverage ? (
          <div className="text-sm text-slate-700"><span className="font-medium">Call Sold:</span> {coverage.strike || '—'} strike{coverage.premium ? `, ${coverage.premium} premium` : ''}{coverage.status === 'OPEN' && <span className="ml-2 rounded-md bg-emerald-100 px-2 py-0.5 text-xs text-emerald-800">Open</span>}{coverage.status === 'CLOSED' && <span className="ml-2 rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-700">Closed</span>}</div>
        ) : (
          <div className="text-sm italic text-slate-500">Call not sold yet</div>
        )}
      </div>
      {open && (
        <div id={id} className="mt-5">
          <LotTimeline events={timeline} />
        </div>
      )}
    </div>
  );
}

// ---- mapping helpers ----
function mapStatus(status) {
  // passthrough; keeps room for normalization if backend differs
  return status;
}

function mapCoverage(cov) {
  if (!cov) return undefined;
  const fmt = (n) => (n == null ? null : formatCurrency(Number(n)));
  return {
    strike: fmt(cov.strike) || '—',
    premium: fmt(cov.premium) || null,
    status: cov.status || 'OPEN',
  };
}

function mapAcquisition(lot, cov) {
  const fmt = (n) => (n == null ? null : formatCurrency(Number(n)));
  const base = lot.cost_basis_effective != null ? fmt(lot.cost_basis_effective) : '—';
  const date = lot.acquisition_date || null;
  if (lot.acquisition_method === 'PUT_ASSIGNMENT') {
    return { type: 'PUT_ASSIGNMENT', label: `PUT Assigned @ ${base}`, date };
  }
  if (lot.acquisition_method === 'OUTRIGHT_PURCHASE') {
    return { type: 'OUTRIGHT_PURCHASE', label: `Bought @ ${base}`, date };
  }
  if (lot.acquisition_method === 'CASH_SECURED_PUT' || lot.status === 'CASH_RESERVED') {
    const strikeNum = cov?.strike ?? null;
    const strikeFmt = strikeNum != null ? fmt(strikeNum) : null;
    const collateralFmt = strikeNum != null ? fmt(strikeNum * 100) : null;
    return { type: 'CASH_SECURED_PUT', label: `PUT Sold @ ${strikeFmt || '—'}`, date, collateral: collateralFmt };
  }
  if (lot.status === 'CLOSED_SOLD') {
    return { type: 'OUTCOME', label: `Closed Lot`, date, outcome: lot.closed_label };
  }
  if (lot.status === 'CLOSED_CALLED_AWAY') {
    return { type: 'OUTCOME', label: `Closed Lot`, date, outcome: lot.closed_label };
  }
  return { type: lot.acquisition_method || 'UNKNOWN', label: `—`, date };
}

// Map backend event to Timeline LotEvent shape
function mapEventForTimeline(e) {
  const type = mapEventType(e.event_type);
  const label = mapEventLabel(type);
  const qty = e.quantity_shares != null && e.quantity_shares !== ''
    ? `${e.quantity_shares} sh`
    : (e.contracts != null && e.contracts !== '' ? `${e.contracts} ctr` : undefined);
  const vm = {
    id: String(e.id),
    date: e.trade_date || '',
    type,
    label,
    price: e.price != null && e.price !== '' ? formatCurrency(Number(e.price)) : undefined,
    strike: e.strike != null && e.strike !== '' ? formatCurrency(Number(e.strike)) : undefined,
    premium: e.premium != null && e.premium !== '' ? formatCurrency(Number(e.premium)) : undefined,
    qty,
    notes: e.notes || undefined,
  };
  return vm;
}

function mapEventType(t) {
  if (t === 'SELL_PUT_OPEN' || t === 'SELL_PUT_CLOSE') return 'SELL_PUT';
  if (t === 'PUT_ASSIGNED' || t === 'PUT_ASSIGNMENT') return 'PUT_ASSIGNMENT';
  if (t === 'CALL_ASSIGNED' || t === 'CALL_ASSIGNMENT') return 'CALL_ASSIGNMENT';
  if (t === 'BUY_SHARES') return 'BUY_SHARES';
  if (t === 'SELL_CALL_OPEN') return 'SELL_CALL_OPEN';
  if (t === 'SELL_CALL_CLOSE') return 'SELL_CALL_CLOSE';
  if (t === 'FEE') return 'FEE';
  return 'FEE';
}

function mapEventLabel(type) {
  switch (type) {
    case 'SELL_PUT': return 'Sold PUT';
    case 'PUT_ASSIGNMENT': return 'PUT Assigned';
    case 'BUY_SHARES': return 'Bought Shares';
    case 'SELL_CALL_OPEN': return 'Sold CALL';
    case 'SELL_CALL_CLOSE': return 'Closed CALL';
    case 'CALL_ASSIGNMENT': return 'CALL Assigned';
    case 'FEE': return 'Fee';
    default: return type;
  }
}