/** JSON-RPC helpers for BNB Smart Chain. No silent mock fallback. */

export const BSC_MAINNET_RPCS = [
  process.env.BSC_RPC_URL,
  "https://bsc-dataseed.binance.org",
  "https://bsc-dataseed1.defibit.io",
  "https://bsc-dataseed1.ninicoin.io",
].filter(Boolean);

export const BSC_TESTNET_RPCS = [
  process.env.BSC_TESTNET_RPC_URL,
  "https://data-seed-prebsc-1-s1.bnbchain.org:8545",
  "https://bsc-testnet-rpc.publicnode.com",
].filter(Boolean);

export function addrWord(address) {
  return String(address).replace(/^0x/i, "").toLowerCase().padStart(64, "0");
}

export function uintWord(value) {
  return BigInt(value).toString(16).padStart(64, "0");
}

export function decodeAddress(result) {
  if (!result || result === "0x") return "";
  const address = `0x${result.slice(-40)}`;
  return /^0x0{40}$/i.test(address) ? "" : address;
}

export function decodeUint(result, index = 0) {
  if (!result || result === "0x") return 0n;
  const body = result.replace(/^0x/i, "").padStart(64, "0");
  const slice = body.slice(index * 64, index * 64 + 64);
  return slice ? BigInt(`0x${slice}`) : 0n;
}

export function toDecimal(wei, decimals = 18, digits = 8) {
  const base = 10n ** BigInt(decimals);
  const scale = 10n ** BigInt(digits);
  const signed = BigInt(wei);
  const whole = signed / base;
  const frac = (signed % base * scale) / base;
  return Number(whole) + Number(frac) / Number(scale);
}

export function utf8Hex(value) {
  return `0x${[...new TextEncoder().encode(String(value))].map((byte) => byte.toString(16).padStart(2, "0")).join("")}`;
}

export function parseEther(value) {
  const [whole = "0", fraction = ""] = String(value).trim().split(".");
  if (!/^\d+$/.test(whole) || (fraction && !/^\d+$/.test(fraction))) {
    throw new Error("Invalid amount");
  }
  return BigInt(whole) * 10n ** 18n + BigInt((fraction + "000000000000000000").slice(0, 18));
}

export function formatEther(wei, digits = 4) {
  const value = BigInt(wei);
  const whole = value / 10n ** 18n;
  const frac = (value % 10n ** 18n).toString().padStart(18, "0").slice(0, digits);
  return `${whole}.${frac}`;
}

async function postRpc(url, payload) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(`RPC ${response.status} from ${url}`);
  return response.json();
}

export async function rpc(method, params = [], urls = BSC_MAINNET_RPCS) {
  let lastError = new Error("No RPC endpoint configured");
  for (const url of urls) {
    try {
      const json = await postRpc(url, { jsonrpc: "2.0", id: 1, method, params });
      if (json.error) throw new Error(json.error.message || "RPC error");
      return json.result;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
    }
  }
  throw lastError;
}

export async function rpcBatch(calls, urls = BSC_MAINNET_RPCS) {
  const payload = calls.map((call, index) => ({
    jsonrpc: "2.0",
    id: index + 1,
    method: call.method,
    params: call.params || [],
  }));
  let lastError = new Error("No RPC endpoint configured");
  for (const url of urls) {
    try {
      const json = await postRpc(url, payload);
      if (!Array.isArray(json)) throw new Error("RPC batch did not return an array");
      return json.sort((a, b) => Number(a.id) - Number(b.id)).map((item) => {
        if (item.error) throw new Error(item.error.message || "RPC error");
        return item.result;
      });
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
    }
  }
  throw lastError;
}

export function ethCall(to, data) {
  return { method: "eth_call", params: [{ to, data }, "latest"] };
}
