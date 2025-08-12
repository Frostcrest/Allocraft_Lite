import type {
    SellCoveredCallInput,
    CloseCoveredCallInput,
    RollCoveredCallInput,
    CreateLotBuyInput,
    CreateLotShortPutInput,
    ClosePutInput,
} from "./types";

export const isPositive = (n?: number) => typeof n === "number" && n > 0;
export const isNonNegative = (n?: number) => typeof n === "number" && n >= 0;
export const isFutureOrToday = (iso: string) =>
    new Date(iso).setHours(0, 0, 0, 0) >= new Date().setHours(0, 0, 0, 0);

export function validateSellCC(p: SellCoveredCallInput) {
    return isPositive(p.strike) && isNonNegative(p.limitPremium) && isFutureOrToday(p.expiry);
}
export function validateCloseCC(p: CloseCoveredCallInput) {
    return isNonNegative(p.limitDebit) && typeof p.tradeDate === "string" && !!p.tradeDate && (p.contracts ?? 1) > 0;
}
export function validateRoll(p: RollCoveredCallInput) {
    return (
        isNonNegative(p.close.limitDebit) &&
        isPositive(p.open.strike) &&
        isNonNegative(p.open.limitPremium) &&
        isFutureOrToday(p.open.expiry)
    );
}
export function validateBuyLot(p: CreateLotBuyInput) {
    return isPositive(p.price);
}
export function validateShortPut(p: CreateLotShortPutInput) {
    return isPositive(p.strike) && isNonNegative(p.premium) && isFutureOrToday(p.expiry);
}

export function validateClosePut(p: ClosePutInput) {
    return isNonNegative(p.limitDebit) && typeof p.tradeDate === "string" && !!p.tradeDate && (p.contracts ?? 1) > 0;
}
