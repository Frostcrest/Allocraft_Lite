import { schwabToAllocraftUnified } from '../components/SchwabDataImportCenter';
import accountNumbers from '../../../docs/development/import-page-schwab-json-import/schwab-api-responses/accounts/accountNumbers.json';
// Import other Schwab JSON samples as needed

describe('Schwab Data Import Center - Transformation', () => {
    it('maps Schwab accountNumbers to Allocraft unified format', () => {
        // Minimal test: just accountNumbers for now
        const unified = schwabToAllocraftUnified({
            accountNumbers,
            accounts: [],
            accountsPositions: [],
            accountOrders: [],
            orders: [],
            transactions: []
        });
        expect(unified).toHaveProperty('accounts');
        expect(Array.isArray(unified.accounts)).toBe(true);
        // Add more assertions as mapping logic is expanded
    });
});
