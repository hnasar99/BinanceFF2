export type ClawPumpMode = "disabled" | "read-only";

export type ClawPumpQuoteRequest = {
  inputMint: string;
  outputMint: string;
  amount: number;
  slippageBps?: number;
  agentId?: string;
};

export type ClawPumpQuote = {
  provider: "clawpump";
  mode: ClawPumpMode;
  executable: false;
  inputMint: string;
  outputMint: string;
  amount: number;
  slippageBps: number;
  raw: unknown;
};

const DEFAULT_MCP_URL = process.env.CLAWPUMP_MCP_URL || "";

export function clawPumpStatus() {
  return {
    provider: "clawpump" as const,
    mode: DEFAULT_MCP_URL ? "read-only" as const : "disabled" as const,
    configured: Boolean(DEFAULT_MCP_URL),
    executable: false,
    note: DEFAULT_MCP_URL
      ? "Read-only ClawPump bridge enabled. Fund-moving tools remain unavailable."
      : "Set CLAWPUMP_MCP_URL to enable the read-only bridge.",
  };
}

export async function requestClawPumpTool(tool: string, args: Record<string, unknown>) {
  if (!DEFAULT_MCP_URL) throw new Error("ClawPump bridge is not configured");

  const response = await fetch(DEFAULT_MCP_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(process.env.CLAWPUMP_API_KEY
        ? { authorization: `Bearer ${process.env.CLAWPUMP_API_KEY}` }
        : {}),
    },
    body: JSON.stringify({ tool, arguments: args }),
    cache: "no-store",
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const detail = payload && typeof payload === "object" && "error" in payload
      ? String((payload as { error?: unknown }).error)
      : `ClawPump request failed with ${response.status}`;
    throw new Error(detail);
  }
  return payload;
}

export async function getClawPumpSwapQuote(input: ClawPumpQuoteRequest): Promise<ClawPumpQuote> {
  const slippageBps = input.slippageBps ?? 50;
  const raw = await requestClawPumpTool("swap_quote", {
    inputMint: input.inputMint,
    outputMint: input.outputMint,
    amount: input.amount,
    slippageBps,
    ...(input.agentId ? { agent_id: input.agentId } : {}),
  });
  return {
    provider: "clawpump",
    mode: "read-only",
    executable: false,
    inputMint: input.inputMint,
    outputMint: input.outputMint,
    amount: input.amount,
    slippageBps,
    raw,
  };
}
