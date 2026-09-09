import assert from "node:assert/strict";
import test from "node:test";
import { bookFromReserves, catalogLive } from "../lib/radar-live.mjs";
import { parseEther, formatEther, utf8Hex } from "../lib/chain-rpc.mjs";

test("catalogLive labels BSC-RPC venues without Biswap", () => {
  const snapshot = catalogLive();
  assert.equal(snapshot.source, "BSC-RPC");
  assert.deepEqual(
    snapshot.venues.map((venue) => venue.id),
    ["pancakeswap", "apeswap", "thena"],
  );
});

test("bookFromReserves applies the venue fee as bid/ask around mid", () => {
  const book = bookFromReserves({
    reserveBase: 1,
    reserveQuote: 600,
    feeBps: 25,
    gasUsd: 0.18,
  });
  assert.ok(book);
  assert.equal(book.bid, 598.5);
  assert.equal(book.ask, 601.5);
  assert.equal(book.liquidityUsd, 1200);
});

test("ether helpers stay exact for wallet amounts", () => {
  assert.equal(parseEther("0.01"), 10n ** 16n);
  assert.equal(formatEther(10n ** 18n), "1.0000");
  assert.match(utf8Hex("BINANCEFF2:SETTLE:M-1"), /^0x42494e414e4345464632/);
});
