import type { PageVM } from "./types";

export const SAMPLE_VM: PageVM = {
    cycle: { title: "GOOG • GOOG", started: "Open • Started 2025-07-02" },
    lots: [
        {
            lotNo: 1,
            ticker: "GOOG",
            acquisition: { type: "PUT_ASSIGNMENT", label: "PUT Assigned @ $175.17", date: "2025-07-02" },
            costBasis: "$175.17",
            coverage: { strike: "$200", premium: "$4.95", status: "CLOSED" },
            status: "OPEN_COVERED",
            events: [
                { id: "e1", date: "2025-06-28", type: "SELL_PUT", label: "Sold PUT", strike: "$190", premium: "$5.04", qty: "1 ctr" },
                { id: "e2", date: "2025-07-02", type: "PUT_ASSIGNMENT", label: "PUT Assigned", price: "$175.17", qty: "100 sh" },
                { id: "e3", date: "2025-07-28", type: "SELL_CALL_OPEN", label: "Sold CALL", strike: "$200", premium: "$4.95", qty: "1 ctr" },
                { id: "e4", date: "2025-08-05", type: "SELL_CALL_CLOSE", label: "Closed CALL", premium: "$2.00", qty: "1 ctr", notes: "roll up/out" }
            ]
        },
        {
            lotNo: 2,
            ticker: "GOOG",
            acquisition: { type: "OUTRIGHT_PURCHASE", label: "Bought @ $191.82", date: "2025-08-08" },
            costBasis: "$191.82",
            status: "OPEN_UNCOVERED",
            events: [
                { id: "e5", date: "2025-08-08", type: "BUY_SHARES", label: "Bought Shares", price: "$191.82", qty: "100 sh" }
            ]
        },
        {
            lotNo: 3,
            ticker: "GOOG",
            acquisition: { type: "PUT_ASSIGNMENT", label: "PUT Assigned @ $190.00", date: "2025-08-08" },
            costBasis: "$190.00",
            coverage: { strike: "$220", premium: "$0.94", status: "OPEN" },
            status: "OPEN_COVERED",
            events: [
                { id: "e6", date: "2025-08-01", type: "SELL_PUT", label: "Sold PUT", strike: "$190", premium: "$0.94", qty: "1 ctr" },
                { id: "e7", date: "2025-08-08", type: "PUT_ASSIGNMENT", label: "PUT Assigned", price: "$190.00", qty: "100 sh" },
                { id: "e8", date: "2025-08-08", type: "SELL_CALL_OPEN", label: "Sold CALL", strike: "$220", premium: "$0.94", qty: "1 ctr" }
            ]
        }
    ]
};
