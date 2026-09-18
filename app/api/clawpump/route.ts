import { clawPumpStatus, getClawPumpSwapQuote } from "@/lib/clawpump";

const fail = (error: string, status = 400) =>
  Response.json({ error, execute: false, provider: "clawpump" }, { status });

export async function GET() {
  return Response.json(clawPumpStatus());
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const action = String(body.action || "status");

    if (action === "status") return Response.json(clawPumpStatus());

    if (action === "swap_quote") {
      const inputMint = String(body.inputMint || "");
      const outputMint = String(body.outputMint || "");
      const amount = Number(body.amount || 0);
      const slippageBps = Number(body.slippageBps || 50);
      const agentId = body.agentId ? String(body.agentId) : undefined;

      if (!inputMint || !outputMint || !Number.isFinite(amount) || amount <= 0) {
        return fail("inputMint, outputMint and positive amount are required");
      }

      const quote = await getClawPumpSwapQuote({
        inputMint,
        outputMint,
        amount,
        slippageBps,
        agentId,
      });
      return Response.json(quote);
    }

    if (/execute|transfer|deposit|withdraw|launch|order|bid/i.test(action)) {
      return fail("Fund-moving ClawPump actions are intentionally disabled in this integration cut", 403);
    }

    return fail("Unsupported action");
  } catch (error) {
    return fail(error instanceof Error ? error.message : "ClawPump action failed", 502);
  }
}
