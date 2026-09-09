import { desc, eq } from "drizzle-orm";
import { getChatGPTUser } from "@/app/chatgpt-auth";
import { getDb } from "@/db";
import { opportunities, quotes, riskAssessments, simulations, users } from "@/db/schema";
import { catalogLive, scanLiveChain } from "@/lib/radar-live.mjs";
import { simulateOpportunity, usdToMicro } from "@/lib/radar";

const fail = (error: string, status = 400, extra: Record<string, unknown> = {}) =>
  Response.json({ error, execute: false, ...extra }, { status });

type LiveSnapshot = Awaited<ReturnType<typeof scanLiveChain>>;
const liveCache = new Map<string, LiveSnapshot>();

function rememberScan(snapshot: LiveSnapshot) {
  liveCache.set(snapshot.chain, snapshot);
  return snapshot;
}

function cachedOpportunity(chain: string, publicCode: string, now = Date.now()) {
  const snapshot = liveCache.get(chain);
  if (!snapshot || now > snapshot.scannedAt + snapshot.quoteTtlMs) return null;
  const opportunity = snapshot.opportunities.find((item) => item.publicCode === publicCode);
  return opportunity ? { snapshot, opportunity } : null;
}

async function currentUser() {
  const user = await getChatGPTUser();
  if (!user) return null;
  try {
    const db = getDb();
    await db.insert(users).values({ id: user.id, email: user.email, displayName: user.displayName }).onConflictDoUpdate({
      target: users.id,
      set: { email: user.email, displayName: user.displayName },
    });
    return user;
  } catch {
    return user;
  }
}

function maybeDb() {
  try {
    return getDb();
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const chain = url.searchParams.get("chain") || "bnb-smart-chain";
    const notionalUsd = Number(url.searchParams.get("notionalUsd") || 2000);
    const snapshot = rememberScan(await scanLiveChain(chain, Date.now(), notionalUsd));
    const user = await currentUser();
    const db = user ? maybeDb() : null;
    let persisted = false;
    if (user && db) {
      await persistScan(db, user.id, snapshot);
      persisted = true;
    }
    return Response.json({
      ...catalogLive(),
      ...snapshot,
      persisted,
      user: user ? { id: user.id, displayName: user.displayName } : null,
    });
  } catch (error) {
    const code = error instanceof Error && "code" in error ? String((error as { code?: string }).code) : "scan_failed";
    const status = code === "chain_not_enabled" ? 422 : 502;
    return fail(error instanceof Error ? error.message : "Radar scan failed", status, {
      code,
      catalog: catalogLive(),
    });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const action = String(body.action || "simulate");
    if (action === "scan") {
      const chain = String(body.chain || "bnb-smart-chain");
      const snapshot = rememberScan(await scanLiveChain(chain, Date.now(), Number(body.notionalUsd || 2000)));
      const user = await currentUser();
      const db = user ? maybeDb() : null;
      if (user && db) await persistScan(db, user.id, snapshot);
      return Response.json({ ...catalogLive(), ...snapshot, persisted: Boolean(user && db) });
    }
    if (action !== "simulate") return fail("Unsupported action");

    const chain = String(body.chain || "bnb-smart-chain");
    const publicCode = String(body.publicCode || "");
    const cached = cachedOpportunity(chain, publicCode);
    const snapshot = cached?.snapshot || rememberScan(await scanLiveChain(chain, Date.now(), Number(body.notionalUsd || 2000)));
    const opportunity = cached?.opportunity || snapshot.opportunities.find((item) => item.publicCode === publicCode);
    if (!opportunity) return fail("Opportunity not found or quotes expired", 404);

    const result = simulateOpportunity(opportunity, Date.now(), Number(body.notionalUsd || snapshot.notionalUsd));
    const user = await currentUser();
    const db = user ? maybeDb() : null;
    if (user && db) await persistSimulation(db, user.id, result);
    return Response.json({ ...result, persisted: Boolean(user && db), catalog: catalogLive() });
  } catch (error) {
    const code = error instanceof Error && "code" in error ? String((error as { code?: string }).code) : "radar_failed";
    const status = code === "chain_not_enabled" ? 422 : 502;
    return fail(error instanceof Error ? error.message : "Radar action failed", status, {
      code,
      catalog: catalogLive(),
    });
  }
}

async function persistScan(
  db: ReturnType<typeof getDb>,
  ownerId: string,
  snapshot: LiveSnapshot,
) {
  const existing = await db.select().from(opportunities).where(eq(opportunities.ownerId, ownerId));
  for (const row of existing.filter((item) => item.status === "OPEN")) {
    await db.update(opportunities).set({ status: "EXPIRED" }).where(eq(opportunities.id, row.id));
  }
  for (const item of snapshot.opportunities) {
    const [row] = await db.insert(opportunities).values({
      ownerId,
      publicCode: `${item.publicCode}-${snapshot.scannedAt.toString().slice(-6)}`,
      chain: item.chain,
      pair: item.pair,
      buyVenue: item.buyVenue,
      sellVenue: item.sellVenue,
      status: item.status,
      source: item.source,
      expiresAt: new Date(item.expiresAt),
    }).returning();
    await db.insert(quotes).values([
      quoteRow(ownerId, row.id, item.buyQuote),
      quoteRow(ownerId, row.id, item.sellQuote),
    ]);
  }
}

async function persistSimulation(
  db: ReturnType<typeof getDb>,
  ownerId: string,
  result: ReturnType<typeof simulateOpportunity>,
) {
  const [opportunity] = await db.select().from(opportunities).where(eq(opportunities.ownerId, ownerId)).orderBy(desc(opportunities.createdAt)).limit(1);
  const opportunityId = opportunity?.id;
  if (!opportunityId) return;
  await db.update(opportunities).set({ status: result.opportunity.status }).where(eq(opportunities.id, opportunityId));
  const [simulation] = await db.insert(simulations).values({
    ownerId,
    opportunityId,
    chain: result.simulation.chain,
    notionalUsdMicros: usdToMicro(result.simulation.notionalUsd),
    grossUsdMicros: usdToMicro(result.simulation.grossUsd),
    feesUsdMicros: usdToMicro(result.simulation.feesUsd),
    gasUsdMicros: usdToMicro(result.simulation.gasUsd),
    slippageUsdMicros: usdToMicro(result.simulation.slippageUsd),
    netUsdMicros: usdToMicro(result.simulation.netUsd),
    netBps: Math.round(result.simulation.netBps),
    adverseJson: JSON.stringify(result.simulation.adverse),
  }).returning();
  await db.insert(riskAssessments).values({
    ownerId,
    opportunityId,
    simulationId: simulation.id,
    chain: result.simulation.chain,
    decision: result.risk.decision,
    reasonsJson: JSON.stringify(result.risk.reasons),
  });
}

function quoteRow(ownerId: string, opportunityId: number, quote: Awaited<ReturnType<typeof scanLiveChain>>["opportunities"][number]["buyQuote"]) {
  return {
    ownerId,
    opportunityId,
    chain: quote.chain,
    venue: quote.venue,
    pair: quote.pair,
    side: quote.side,
    priceUsdMicros: usdToMicro(quote.priceUsd),
    feeBps: quote.feeBps,
    gasUsdMicros: usdToMicro(quote.gasUsd),
    liquidityUsdMicros: usdToMicro(quote.liquidityUsd),
    source: quote.source,
    status: quote.status,
    expiresAt: new Date(quote.expiresAt),
  };
}
