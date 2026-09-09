"use client";

import { BSC_TESTNET } from "@/lib/bnb-agent";
import { formatEther, parseEther, utf8Hex } from "@/lib/chain-rpc.mjs";

type EthereumProvider = {
  request(args: { method: string; params?: unknown[] }): Promise<unknown>;
};

declare global {
  interface Window {
    ethereum?: EthereumProvider;
  }
}

export const PANCAKE_TESTNET_ROUTER = "0xD99D1c33F9fC3444f8101754aBC46c52416550D1";
export const TESTNET_WBNB = "0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd";
export const TESTNET_USDT = "0x337610d27c682E347C9cD60BD4b3b107C9d34dDd";
export const TESTNET_FAUCET = "https://www.bnbchain.org/en/testnet-faucet";

export function compactAddress(address: string) {
  return address ? `${address.slice(0, 6)}…${address.slice(-4)}` : "";
}

export function explorerTx(hash: string) {
  return `${BSC_TESTNET.explorerUrls[0]}/tx/${hash}`;
}

export function explorerAddress(address: string) {
  return `${BSC_TESTNET.explorerUrls[0]}/address/${address}`;
}

export function getProvider() {
  if (typeof window === "undefined" || !window.ethereum) {
    throw new Error("Install Binance Wallet or MetaMask to use the chain");
  }
  return window.ethereum;
}

export async function ensureTestnet(provider = getProvider()) {
  try {
    await provider.request({ method: "wallet_switchEthereumChain", params: [{ chainId: BSC_TESTNET.chainHex }] });
  } catch {
    await provider.request({
      method: "wallet_addEthereumChain",
      params: [{
        chainId: BSC_TESTNET.chainHex,
        chainName: BSC_TESTNET.name,
        nativeCurrency: BSC_TESTNET.currency,
        rpcUrls: [...BSC_TESTNET.rpcUrls],
        blockExplorerUrls: [...BSC_TESTNET.explorerUrls],
      }],
    });
  }
}

export async function connectWallet() {
  const provider = getProvider();
  const accounts = await provider.request({ method: "eth_requestAccounts" }) as string[];
  await ensureTestnet(provider);
  const address = accounts[0] || "";
  if (!address) throw new Error("Wallet returned no account");
  return { provider, address };
}

export async function connectedAccount() {
  if (typeof window === "undefined" || !window.ethereum) return "";
  const accounts = await window.ethereum.request({ method: "eth_accounts" }) as string[];
  return accounts[0] || "";
}

export async function getNativeBalance(address: string) {
  const provider = getProvider();
  const hex = await provider.request({ method: "eth_getBalance", params: [address, "latest"] }) as string;
  return BigInt(hex);
}

export async function sendNative(to: string, amountBnb: string) {
  if (!/^0x[a-fA-F0-9]{40}$/.test(to)) throw new Error("Enter a valid 0x address");
  const { provider, address } = await connectWallet();
  const value = parseEther(amountBnb);
  if (value <= 0n) throw new Error("Amount must be greater than zero");
  const hash = await provider.request({
    method: "eth_sendTransaction",
    params: [{ from: address, to, value: `0x${value.toString(16)}` }],
  }) as string;
  return hash;
}

export async function settleOnChain(missionId: string) {
  const { provider, address } = await connectWallet();
  const hash = await provider.request({
    method: "eth_sendTransaction",
    params: [{
      from: address,
      to: address,
      value: "0x0",
      data: utf8Hex(`BINANCEFF2:SETTLE:${missionId}`),
    }],
  }) as string;
  return hash;
}

function addrWord(address: string) {
  return address.replace(/^0x/i, "").toLowerCase().padStart(64, "0");
}

function uintWord(value: bigint | number | string) {
  return BigInt(value).toString(16).padStart(64, "0");
}

function encodeGetAmountsOut(amountIn: bigint, path: string[]) {
  return `0xd06ca61f${uintWord(amountIn)}${uintWord(64)}${uintWord(path.length)}${path.map(addrWord).join("")}`;
}

function encodeSwapExactETHForTokens(amountOutMin: bigint, path: string[], to: string, deadline: bigint) {
  return `0x7ff36ab5${uintWord(amountOutMin)}${uintWord(128)}${addrWord(to)}${uintWord(deadline)}${uintWord(path.length)}${path.map(addrWord).join("")}`;
}

function decodeLastUint(result: string) {
  if (!result || result === "0x") return 0n;
  return BigInt(`0x${result.slice(-64)}`);
}

export async function quoteTBnbToUsdt(amountBnb: string) {
  const { provider } = await connectWallet();
  const amountIn = parseEther(amountBnb);
  if (amountIn <= 0n) throw new Error("Amount must be greater than zero");
  const data = encodeGetAmountsOut(amountIn, [TESTNET_WBNB, TESTNET_USDT]);
  const result = await provider.request({
    method: "eth_call",
    params: [{ to: PANCAKE_TESTNET_ROUTER, data }, "latest"],
  }) as string;
  const amountOut = decodeLastUint(result);
  if (amountOut <= 0n) throw new Error("Pancake testnet pool returned no quote");
  return { amountIn, amountOut };
}

export async function swapTBnbForUsdt(amountBnb = "0.002") {
  const { provider, address } = await connectWallet();
  const { amountIn, amountOut } = await quoteTBnbToUsdt(amountBnb);
  const minOut = amountOut * 98n / 100n;
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 20 * 60);
  const data = encodeSwapExactETHForTokens(minOut, [TESTNET_WBNB, TESTNET_USDT], address, deadline);
  const hash = await provider.request({
    method: "eth_sendTransaction",
    params: [{
      from: address,
      to: PANCAKE_TESTNET_ROUTER,
      value: `0x${amountIn.toString(16)}`,
      data,
    }],
  }) as string;
  return { hash, amountIn, amountOut: minOut };
}

export function openTestnetFaucet() {
  window.open(TESTNET_FAUCET, "_blank", "noopener,noreferrer");
}

export { formatEther, parseEther };
