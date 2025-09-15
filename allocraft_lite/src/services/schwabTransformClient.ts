// Client-side Schwab JSON transformation helpers for UI preview
// These mirror the backend mapping logic, but are for preview only (no DB writes)

export function transform_accounts(json: any): any[] {
    if (!json) return [];
    // Schwab: array of { securitiesAccount: { ... } }
    if (Array.isArray(json)) {
        // If the array contains objects with 'securitiesAccount', flatten them
        if (json.length > 0 && json[0].securitiesAccount) {
            return json.map((item: any) => item.securitiesAccount);
        }
        return json;
    }
    if (Array.isArray(json.accounts)) return json.accounts;
    return [];
}

export function transform_positions(json: any): any[] {
    if (!json) return [];
    // Schwab: array of { securitiesAccount: { positions: [...] } }
    let accounts = [];
    if (Array.isArray(json)) {
        for (const item of json) {
            if (item.securitiesAccount && Array.isArray(item.securitiesAccount.positions)) {
                accounts.push(item.securitiesAccount);
            }
        }
    } else if (Array.isArray(json.accounts)) {
        accounts = json.accounts;
    }
    let all = [];
    for (const acct of accounts) {
        if (Array.isArray(acct.positions)) {
            // Attach accountNumber to each position for mapping
            const acctNum = acct.accountNumber || acct.account_number;
            all.push(...acct.positions.map((p: any) => ({ ...p, accountNumber: acctNum })));
        }
    }
    return all;
}

export function transform_orders(json: any): any[] {
    if (!json) return [];
    // Schwab: array of { securitiesAccount: { orders: [...] } }
    let all = [];
    if (Array.isArray(json)) {
        for (const item of json) {
            if (item.securitiesAccount && Array.isArray(item.securitiesAccount.orders)) {
                all.push(...item.securitiesAccount.orders);
            }
        }
    } else if (Array.isArray(json.orders)) {
        all = json.orders;
    }
    return all;
}

export function transform_transactions(json: any): any[] {
    if (!json) return [];
    // Schwab: array of { securitiesAccount: { transactions: [...] } }
    let all = [];
    if (Array.isArray(json)) {
        for (const item of json) {
            if (item.securitiesAccount && Array.isArray(item.securitiesAccount.transactions)) {
                all.push(...item.securitiesAccount.transactions);
            }
        }
    } else if (Array.isArray(json.transactions)) {
        all = json.transactions;
    }
    return all;
}
