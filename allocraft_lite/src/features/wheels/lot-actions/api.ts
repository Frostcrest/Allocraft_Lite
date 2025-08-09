import {
    SellCoveredCallInput,
    CloseCoveredCallInput,
    RollCoveredCallInput,
    CreateLotBuyInput,
    CreateLotShortPutInput,
} from "./types";

export async function sellCoveredCall(lotId: number, p: SellCoveredCallInput) {
    return { ok: true, id: crypto.randomUUID() };
}
export async function closeCoveredCall(lotId: number, p: CloseCoveredCallInput) {
    return { ok: true, id: crypto.randomUUID() };
}
export async function rollCoveredCall(lotId: number, p: RollCoveredCallInput) {
    return { ok: true, closeId: crypto.randomUUID(), openId: crypto.randomUUID() };
}
export async function createLotBuy(p: CreateLotBuyInput) {
    return { ok: true, lotId: Math.floor(Math.random() * 1e6) };
}
export async function createLotShortPut(p: CreateLotShortPutInput) {
    return { ok: true, lotId: Math.floor(Math.random() * 1e6) };
}
