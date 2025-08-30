/**
 * Helper functions for processing lot data from optimized endpoints.
 * 
 * These functions replace the previous individual API calls with 
 * efficient processing of batch-loaded data.
 */

/**
 * Compute lot coverage and shares from events.
 * Replaces the previous individual API calls to getLotLinks.
 */
export function computeLotCoverageAndShares(lot, events) {
  // Build coverage info
  const callOpen = events.find((e) => e.event_type === 'SELL_CALL_OPEN');
  const callClose = events.find((e) =>
    e.event_type === 'SELL_CALL_CLOSE' ||
    e.event_type === 'CALLED_AWAY' ||
    e.event_type === 'CALL_ASSIGNED'
  );
  const putOpen = events.find((e) => e.event_type === 'SELL_PUT_OPEN');

  let coverage = null;
  if (callOpen) {
    coverage = {
      strike: callOpen.strike ?? null,
      premium: callOpen.premium ?? null,
      status: callClose ? 'CLOSED' : 'OPEN',
    };
  } else if (putOpen && (lot.status === 'CASH_RESERVED' || lot.acquisition_method === 'CASH_SECURED_PUT')) {
    coverage = {
      strike: putOpen.strike ?? null,
      premium: putOpen.premium ?? null,
      status: 'OPEN',
    };
  }

  // Compute shares remaining for this lot from linked events
  let shares = 0;
  for (const e of events) {
    const qty = Number(e.quantity_shares || 0);
    const ctr = Number(e.contracts || 0);
    switch (e.event_type) {
      case 'BUY_SHARES':
        shares += qty || 0;
        break;
      case 'ASSIGNMENT':
      case 'PUT_ASSIGNMENT':
        shares += qty || (ctr ? 100 * ctr : 0);
        break;
      case 'SELL_SHARES':
        shares -= qty || 0;
        break;
      case 'CALLED_AWAY':
      case 'CALL_ASSIGNED':
        shares -= qty || (ctr ? 100 * ctr : 0);
        break;
      default:
        break;
    }
  }

  // Fallbacks if shares calculation isn't complete
  if (!Number.isFinite(shares)) shares = 0;
  if (shares === 0) {
    // If lot is closed, keep 0. If it's an active stock lot with no linked share events, assume 100.
    const closed = (lot.status || '').startsWith('CLOSED');
    const isStockLot = lot.acquisition_method !== 'CASH_SECURED_PUT' && lot.status !== 'CASH_RESERVED';
    if (!closed && isStockLot) shares = 100;
  }

  return { coverage, shares };
}

/**
 * Map event for timeline display.
 * Placeholder for timeline event transformation.
 */
export function mapEventForTimeline(event) {
  return {
    id: event.id,
    event_type: event.event_type,
    trade_date: event.trade_date,
    quantity_shares: event.quantity_shares,
    contracts: event.contracts,
    price: event.price,
    strike: event.strike,
    premium: event.premium,
    fees: event.fees,
    notes: event.notes
  };
}

/**
 * Compute collateral reserved from events.
 * This is a placeholder - implement according to business logic.
 */
export function computeCollateralReserved(events) {
  // This would implement the same logic as before
  // For now, return 0 as placeholder
  return 0;
}

/**
 * Sum nullable values safely.
 */
export function sumNullable(...values) {
  return values.reduce((sum, val) => {
    if (val != null && !isNaN(val)) {
      return sum + val;
    }
    return sum;
  }, 0);
}

/**
 * Aggregate metrics across multiple cycles.
 * This replaces the previous aggregateMetrics function.
 */
export function aggregateMetrics(metricsArray) {
  if (!metricsArray || metricsArray.length === 0) return null;

  const result = {
    total_realized_pl: 0,
    unrealized_pl: 0,
    net_options_cashflow: 0,
    // Add other metrics as needed
  };

  metricsArray.forEach(metrics => {
    if (metrics) {
      result.total_realized_pl += metrics.total_realized_pl || 0;
      result.unrealized_pl += metrics.unrealized_pl || 0;
      result.net_options_cashflow += metrics.net_options_cashflow || 0;
    }
  });

  return result;
}
