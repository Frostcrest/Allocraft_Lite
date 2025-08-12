import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Plus, Edit, RotateCcw } from "lucide-react";
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
import { ClosePutModal } from "@/features/wheels/lot-actions/ClosePutModal";
import { RollCallModal } from "@/features/wheels/lot-actions/RollCallModal";
import { NewLotWizard } from "@/features/wheels/lot-actions/NewLotWizard";

const initialCycle = {
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
  const [selectedTicker, setSelectedTicker] = useState(null);
  const [events, setEvents] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [lots, setLots] = useState([]);
  // Extra stats to show on the cycle selector cards
  // { [cycleId]: { collateral_reserved: number|null, unrealized_pl: number|null } }
  const [tickerSideStats, setTickerSideStats] = useState({}); // { [ticker]: { collateral_reserved, pl } }
  const [coverageMap, setCoverageMap] = useState({}); // lotId -> { strike, premium, status }
  const [lotEventsMap, setLotEventsMap] = useState({}); // lotId -> LotEvent[] mapped for timeline
  const [uiLots, setUiLots] = useState([]); // includes synthetic CSP lots
  const [actionLots, setActionLots] = useState([]); // LotVMs for actions mock
  const [viewMode, setViewMode] = useState("lots"); // 'lots' | 'events'
  const [showClosed, setShowClosed] = useState(false);
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
        if (data.length) {
          const firstTicker = data[0]?.ticker || null;
          setSelectedTicker(firstTicker);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Helper: get all cycle IDs for a ticker
  const getCycleIdsForTicker = (ticker) => (cycles || []).filter((c) => c.ticker === ticker).map((c) => c.id);

  // Helper: choose preferred cycleId for actions (open if available, else latest id)
  const getPreferredCycleId = (ticker) => {
    const group = (cycles || []).filter((c) => c.ticker === ticker);
    if (group.length === 0) return null;
    const open = group.find((c) => (c.status || 'Open') === 'Open');
    if (open) return open.id;
    return group.reduce((max, c) => (c.id > max ? c.id : max), group[0].id);
  };

  useEffect(() => {
    if (!selectedTicker) return;
    const ids = getCycleIdsForTicker(selectedTicker);
    if (ids.length === 0) {
      setEvents([]);
      setMetrics(null);
      setLots([]);
      return;
    }
    (async () => {
      try {
        // Fetch events and lots for all cycles under this ticker
        const [allEventsArrays, allLotsArrays, metricsArrays] = await Promise.all([
          Promise.all(ids.map((id) => wheelApi.listEvents(id))),
          Promise.all(ids.map((id) => wheelApi.listLots(id))),
          Promise.all(ids.map((id) => wheelApi.metrics(id).catch(() => null))),
        ]);
        const evts = allEventsArrays.flat();
        const ls = allLotsArrays.flat();
        // Aggregate metrics across cycles for this ticker
        const agg = aggregateMetrics(metricsArrays.filter(Boolean));
        setEvents(evts);
        setMetrics(agg);
        setLots(ls);
        // Update cached side stats for the selected ticker
        try {
          const col = computeCollateralReserved(evts);
          const overallPL = sumNullable(agg?.unrealized_pl, agg?.total_realized_pl);
          setTickerSideStats((prev) => ({ ...prev, [selectedTicker]: { collateral_reserved: col, pl: overallPL } }));
        } catch { /* noop */ }
      } catch (e) {
        console.error(e);
      }
    })();
  }, [selectedTicker, cycles]);

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

  // Build UI lots: backend lots (+/- closed) + synthetic CSP lots (open always, closed when toggled)
  useEffect(() => {
    try {
      if (!events) {
        const base = Array.isArray(lots) ? lots : [];
        setUiLots(showClosed ? base : base.filter((l) => !(l.status || '').startsWith('CLOSED')));
        return;
      }
      const openPuts = (events || []).filter((e) => e.event_type === 'SELL_PUT_OPEN');
      const closedIds = new Set(
        (events || [])
          .filter((e) => (e.event_type === 'SELL_PUT_CLOSE' || e.event_type === 'BUY_PUT_CLOSE') && e.link_event_id)
          .map((e) => e.link_event_id)
      );
      const syntheticOpen = openPuts
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
      const syntheticClosed = showClosed
        ? openPuts
          .filter((op) => closedIds.has(op.id))
          .map((op) => ({
            id: `synthetic-csp-closed-${op.id}`,
            acquisition_method: 'CASH_SECURED_PUT',
            acquisition_date: op.trade_date || null,
            status: 'CASH_RESERVED',
            cost_basis_effective: null,
            _coverage: { strike: op.strike ?? null, premium: op.premium ?? null, status: 'CLOSED' },
            _synthetic: true,
            _sourceEventId: op.id,
          }))
        : [];
      // Avoid duplicates if backend already surfaces CASH_RESERVED lots for same date
      const hasCashReserved = new Set((lots || []).filter((l) => l.status === 'CASH_RESERVED' || l.acquisition_method === 'CASH_SECURED_PUT').map((l) => `${l.acquisition_method}:${l.acquisition_date}`));
      const dedupedOpen = syntheticOpen.filter((s) => !hasCashReserved.has(`${s.acquisition_method}:${s.acquisition_date}`));
      const dedupedClosed = syntheticClosed.filter((s) => !hasCashReserved.has(`${s.acquisition_method}:${s.acquisition_date}`));
      const backendLots = Array.isArray(lots) ? (showClosed ? lots : lots.filter((l) => !(l.status || '').startsWith('CLOSED'))) : [];
      setUiLots([
        ...dedupedOpen.sort((a, b) => (a.acquisition_date || '').localeCompare(b.acquisition_date || '')),
        ...backendLots,
        ...dedupedClosed.sort((a, b) => (a.acquisition_date || '').localeCompare(b.acquisition_date || '')),
      ]);
    } catch {
      const base = Array.isArray(lots) ? lots : [];
      setUiLots(showClosed ? base : base.filter((l) => !(l.status || '').startsWith('CLOSED')));
    }
  }, [events, lots, showClosed]);

  // Build actionLots (LotVMs) from uiLots and mapped timelines
  useEffect(() => {
    const ticker = selectedTicker || '';
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
        meta: l._synthetic ? { putOpenEventId: l._sourceEventId } : undefined,
      };
    });
    setActionLots(arr);
  }, [uiLots, coverageMap, lotEventsMap, events, selectedTicker]);

  const openAddCycle = () => {
    setCycleForm(initialCycle);
    setShowCycleDialog(true);
  };

  const saveCycle = async (e) => {
    e.preventDefault();
    try {
      // Auto-generate a unique cycle_key for the ticker
      const ticker = (cycleForm.ticker || '').toUpperCase();
      if (!ticker) throw new Error('Ticker required');
      const existingKeys = (cycles || []).filter(c => c.ticker === ticker).map(c => c.cycle_key).filter(Boolean);
      let cycle_key = ticker;
      if (existingKeys.includes(cycle_key)) {
        let n = 2;
        while (existingKeys.includes(`${ticker}-${n}`)) n++;
        cycle_key = `${ticker}-${n}`;
      }
      const payload = { ...cycleForm, ticker, cycle_key };
      await wheelApi.createCycle(payload);
      const data = await wheelApi.listCycles();
      setCycles(data);
      setSelectedTicker(ticker);
      setShowCycleDialog(false);
    } catch (e2) {
      console.error(e2);
    }
  };

  // Deleting per-ticker is potentially destructive across multiple cycles; hide/remove for now.

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
      const targetCycleId = getPreferredCycleId(selectedTicker);
      if (!targetCycleId) throw new Error('No cycle available for this ticker. Create one first.');
      const payload = { ...eventForm, cycle_id: targetCycleId };
      if (editingEvent) {
        await wheelApi.updateEvent(editingEvent.id, payload);
      } else {
        await wheelApi.createEvent(payload);
      }
      // Refresh for ticker
      const ids = getCycleIdsForTicker(selectedTicker);
      const [allEventsArrays, allLotsArrays, metricsArrays] = await Promise.all([
        Promise.all(ids.map((id) => wheelApi.listEvents(id))),
        Promise.all(ids.map((id) => wheelApi.listLots(id))),
        Promise.all(ids.map((id) => wheelApi.metrics(id).catch(() => null))),
      ]);
      setEvents(allEventsArrays.flat());
      setLots(allLotsArrays.flat());
      setMetrics(aggregateMetrics(metricsArrays.filter(Boolean)));
      setShowEventDialog(false);
      setEditingEvent(null);
    } catch (err) {
      console.error(err);
    }
  };

  const deleteEvent = async (id) => {
    if (!window.confirm('Delete this event?')) return;
    await wheelApi.deleteEvent(id);
    const ids = getCycleIdsForTicker(selectedTicker);
    const [allEventsArrays, metricsArrays] = await Promise.all([
      Promise.all(ids.map((id) => wheelApi.listEvents(id))),
      Promise.all(ids.map((id) => wheelApi.metrics(id).catch(() => null))),
    ]);
    const evts = allEventsArrays.flat();
    setEvents(evts);
    setMetrics(aggregateMetrics(metricsArrays.filter(Boolean)));
    // refresh side stat cache for the selected ticker
    try {
      const col = computeCollateralReserved(evts);
      setTickerSideStats((prev) => ({ ...prev, [selectedTicker]: { collateral_reserved: col, pl: null } }));
    } catch { /* noop */ }
  };

  // Fetch per-ticker extras for all tickers (lightweight, runs after cycles list loads)
  useEffect(() => {
    if (!cycles || cycles.length === 0) return;
    (async () => {
      try {
        const tickers = Array.from(new Set(cycles.map(c => c.ticker)));
        const toFetch = tickers.filter(t => !(t in tickerSideStats));
        if (toFetch.length === 0) return;
    const pairs = await Promise.all(
          toFetch.map(async (t) => {
            const ids = getCycleIdsForTicker(t);
            try {
              const [metricsArr, eventsArr] = await Promise.all([
                Promise.all(ids.map((id) => wheelApi.metrics(id).catch(() => null))),
                Promise.all(ids.map((id) => wheelApi.listEvents(id))),
              ]);
              const ev = eventsArr.flat();
              const mAgg = aggregateMetrics(metricsArr.filter(Boolean));
        const overallPL = sumNullable(mAgg?.unrealized_pl, mAgg?.total_realized_pl);
        return [t, { collateral_reserved: computeCollateralReserved(ev), pl: overallPL }];
            } catch {
        return [t, { collateral_reserved: null, pl: null }];
            }
          })
        );
        setTickerSideStats((prev) => {
          const next = { ...prev };
      for (const [t, v] of pairs) next[t] = v;
          return next;
        });
      } catch (e) {
        console.error(e);
      }
    })();
  }, [cycles]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-4xl font-bold text-slate-900 tracking-tight">Wheels by Ticker</h1>
            <p className="text-slate-600 mt-2">All lots and events are grouped by ticker</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={openAddCycle} className="bg-slate-900 hover:bg-slate-800 shadow-lg">
              <Plus className="w-5 h-5 mr-2" /> New Ticker
            </Button>
            {selectedTicker && (
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
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="space-y-2">
              {Array.from(new Set(cycles.map(c => c.ticker))).map((tkr) => {
                const group = cycles.filter(c => c.ticker === tkr);
                const started = group.map(c => c.started_at).filter(Boolean).sort()[0] || '—';
                const selected = selectedTicker === tkr;
                return (
                <Card key={tkr} className={`cursor-pointer ${selected ? 'ring-2 ring-slate-900' : ''}`} onClick={() => setSelectedTicker(tkr)}>
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm flex justify-between items-center">
                      <span>{tkr}</span>
                    </CardTitle>
                    <div className="text-xs text-slate-500">Started {started}</div>
                    <div className="mt-1 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                      <div className="text-slate-500">Collateral</div>
                      <div className="text-right font-medium text-slate-900">{formatMaybeCurrency(tickerSideStats[tkr]?.collateral_reserved)}</div>
                      <div className="text-slate-500">P/L</div>
                      <div className={`text-right font-medium ${valSign(tickerSideStats[tkr]?.pl)}`}>{formatMaybeCurrency(tickerSideStats[tkr]?.pl)}</div>
                    </div>
                  </CardHeader>
                </Card>
              )})}
            </div>

            <div className="lg:col-span-3 space-y-7">
              {selectedTicker && (
                <>
                  <Card className="border-0 shadow bg-white/80">
                    <CardHeader className="py-4">
                      <CardTitle className="text-xl">Ticker Metrics</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {metrics ? (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-base">
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
                    <LotActionsProvider
                      lots={actionLots}
                      setLots={setActionLots}
                      cycleId={getPreferredCycleId(selectedTicker)}
                      ticker={selectedTicker}
                      onEventCreated={async () => {
                        // Refresh events, coverage maps, and metrics after event creation
                        try {
                          const ids = getCycleIdsForTicker(selectedTicker);
                          const [allEventsArrays, metricsArrays] = await Promise.all([
                            Promise.all(ids.map((id) => wheelApi.listEvents(id))),
                            Promise.all(ids.map((id) => wheelApi.metrics(id).catch(() => null))),
                          ]);
                          setEvents(allEventsArrays.flat());
                          setMetrics(aggregateMetrics(metricsArrays.filter(Boolean)));
                        } catch (e) { console.error(e); }
                      }}
                    >
          <Card className="border-0 shadow bg-white/80">
                        <CardHeader className="py-4">
                          <div className="flex items-center justify-between gap-3">
            <CardTitle className="text-xl">Lots</CardTitle>
                            <div className="flex items-center gap-3">
                              <label className="inline-flex items-center gap-2 text-sm text-slate-600">
                                <input
                                  type="checkbox"
                                  checked={showClosed}
                                  onChange={(e) => setShowClosed(e.target.checked)}
                                  className="rounded border-slate-300 text-slate-900 focus:ring-slate-500"
                                />
                                Show closed
                              </label>
                              <div className="text-sm text-slate-500">Uncovered: {lots.filter(l => l.status === 'OPEN_UNCOVERED').length}</div>
                              <NewLotHeaderButton />
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          {uiLots.length === 0 ? (
                            <div className="text-sm text-slate-500 flex items-center justify-between">
                              <span>No lots yet. Use Rebuild to construct from events.</span>
                              <Button size="sm" onClick={async () => {
                                const ids = getCycleIdsForTicker(selectedTicker);
                                await Promise.all(ids.map((id) => wheelApi.rebuildLots(id)));
                                const allLotsArrays = await Promise.all(ids.map((id) => wheelApi.listLots(id)));
                                setLots(allLotsArrays.flat());
                              }}>Rebuild</Button>
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
                                      ticker={selectedTicker || ''}
                                      acquisition={mapAcquisition(l, l._coverage || coverageMap[l.id])}
                                      costBasis={l.cost_basis_effective != null ? formatCurrency(l.cost_basis_effective) : '—'}
                                      coverage={vm?.coverage ?? mapCoverage(l._coverage || coverageMap[l.id])}
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
                                        <ActionButtonsRow lot={vm} hide={{ cover: true, closePut: true }} />
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
              <DialogTitle className="text-xl font-bold text-slate-900">New Ticker</DialogTitle>
            </DialogHeader>
            <form onSubmit={saveCycle} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
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
      {modal?.type === 'closeCall' && modal.lot && <CloseCallModal lot={modal.lot} />}
      {modal?.type === 'closePut' && modal.lot && <ClosePutModal lot={modal.lot} />}
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
  const actions = useLotActions();
  const uncovered = status === 'OPEN_UNCOVERED';
  const canClosePut = (acquisition?.type === 'CASH_SECURED_PUT' || status === 'CASH_RESERVED') && (coverage?.status !== 'CLOSED');
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="mb-3 flex items-center justify-between gap-3 whitespace-nowrap">
        <div className="flex min-w-0 items-center gap-2">
          <h3 className="text-lg font-semibold text-slate-900 truncate">{`Lot ${lotNo} — ${ticker}`}</h3>
          <StatusChip status={status} />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {uncovered && (
            <button
              className="rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs text-white hover:bg-emerald-700"
              onClick={() => actions.openCover({ lotNo, ticker, acquisition, costBasis, coverage, status, events: timeline })}
            >
              Cover
            </button>
          )}
          <button
            onClick={() => setOpen((v) => !v)}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50"
            aria-expanded={open}
            aria-controls={id}
          >
            <span>{open ? "Hide" : "Timeline"}</span>
            <span className={`transition-transform ${open ? "rotate-180" : ""}`}>⌄</span>
          </button>
          <button onClick={onClick} className="rounded-lg border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50">Details</button>
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
          <div className="text-sm text-slate-700 group"><span className="font-medium">Put Sold:</span> {coverage?.strike || '—'} strike{coverage?.premium ? `, ${coverage.premium} premium` : ''}
            {coverage?.status === 'OPEN' && (
              <span className="ml-2 inline-block relative">
                <span className="rounded-md bg-sky-100 px-2 py-0.5 text-xs text-sky-800 transition-opacity duration-200 group-hover:opacity-0">Open</span>
                <button
                  type="button"
                  className="absolute inset-0 rounded-md bg-slate-900 px-2 py-0.5 text-xs text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                  onClick={() => actions.openClosePut({ lotNo, ticker, acquisition, costBasis, coverage, status, events: timeline })}
                  aria-label={`Close short put on lot ${lotNo}`}
                >
                  Close
                </button>
              </span>
            )}
          </div>
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
  if (t === 'SELL_PUT_OPEN' || t === 'SELL_PUT_CLOSE' || t === 'BUY_PUT_CLOSE') return 'SELL_PUT';
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

// ---- local helpers for sidebar stats ----
function computeCollateralReserved(events) {
  if (!Array.isArray(events) || events.length === 0) return null;
  // Sum open PUT collateral (strike * 100 * contracts) minus closed legs
  const openById = new Map(); // eventId -> { strike, contracts }
  for (const e of events) {
    if (e.event_type === 'SELL_PUT_OPEN' && e.strike != null && e.contracts) {
      openById.set(e.id, { strike: Number(e.strike), contracts: Number(e.contracts) });
    }
  }
  // If a SELL_PUT_CLOSE links to an open, treat as closed
  const closedLinks = new Set(events.filter((e) => (e.event_type === 'SELL_PUT_CLOSE' || e.event_type === 'BUY_PUT_CLOSE') && e.link_event_id).map((e) => e.link_event_id));
  let total = 0;
  for (const [id, v] of openById) {
    if (!closedLinks.has(id)) {
      total += (v.strike || 0) * 100 * (v.contracts || 0);
    }
  }
  return total;
}

function formatMaybeCurrency(v) {
  if (v == null || Number.isNaN(v)) return '—';
  try { return formatCurrency(Number(v)); } catch { return '—'; }
}

function valSign(v) {
  if (v == null || Number.isNaN(v)) return 'text-slate-900';
  const n = Number(v);
  if (n > 0) return 'text-emerald-600';
  if (n < 0) return 'text-red-600';
  return 'text-slate-900';
}

// Aggregate multiple WheelMetricsRead objects into a single ticker-level metrics
function aggregateMetrics(list) {
  if (!Array.isArray(list) || list.length === 0) return null;
  let shares = 0;
  let totalCostRemaining = 0;
  let netOptionsCF = 0;
  let realizedStockPL = 0;
  let totalRealizedPL = 0;
  let unrealizedPL = 0;
  let currentPrice = null;
  let weightedCostNumerator = 0;
  for (const m of list) {
    if (!m) continue;
    shares += Number(m.shares_owned || 0);
    totalCostRemaining += Number(m.total_cost_remaining || 0);
    netOptionsCF += Number(m.net_options_cashflow || 0);
    realizedStockPL += Number(m.realized_stock_pl || 0);
    totalRealizedPL += Number(m.total_realized_pl || 0);
    unrealizedPL += Number(m.unrealized_pl || 0);
    if (m.current_price != null && currentPrice == null) currentPrice = Number(m.current_price);
    if (m.shares_owned && m.average_cost_basis != null) {
      weightedCostNumerator += Number(m.shares_owned) * Number(m.average_cost_basis);
    }
  }
  const avgCost = shares > 0 ? (weightedCostNumerator / shares) : 0;
  return {
    shares_owned: shares,
    average_cost_basis: avgCost,
    total_cost_remaining: totalCostRemaining,
    net_options_cashflow: netOptionsCF,
    realized_stock_pl: realizedStockPL,
    total_realized_pl: totalRealizedPL,
    current_price: currentPrice,
    unrealized_pl: unrealizedPL,
  };
}

function sumNullable(a, b) {
  const aNum = a == null ? 0 : Number(a) || 0;
  const bNum = b == null ? 0 : Number(b) || 0;
  return aNum + bNum;
}