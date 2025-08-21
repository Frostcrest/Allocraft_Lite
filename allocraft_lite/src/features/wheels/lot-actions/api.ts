import {
    SellCoveredCallInput,
    CloseCoveredCallInput,
    RollCoveredCallInput,
    CreateLotBuyInput,
    CreateLotShortPutInput,
    ClosePutInput,
} from "./types";

export async function sellCoveredCall(_lotId: number, _p: SellCoveredCallInput) {
    return { ok: true, id: crypto.randomUUID() };
}
export async function closeCoveredCall(_lotId: number, _p: CloseCoveredCallInput) {
    return { ok: true, id: crypto.randomUUID() };
}
export async function rollCoveredCall(_lotId: number, _p: RollCoveredCallInput) {
    return { ok: true, closeId: crypto.randomUUID(), openId: crypto.randomUUID() };
}
export async function createLotBuy(_p: CreateLotBuyInput) {
    return { ok: true, lotId: Math.floor(Math.random() * 1e6) };
}
export async function createLotShortPut(_p: CreateLotShortPutInput) {
    return { ok: true, lotId: Math.floor(Math.random() * 1e6) };
}

export async function closeShortPut(_lotId: number, _p: ClosePutInput) {
    return { ok: true, id: crypto.randomUUID() };
}
