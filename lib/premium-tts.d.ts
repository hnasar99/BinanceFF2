export const TRUSTED_CLIENT_TOKEN: string;
export function engineLabel(engine: string): string;
export function voiceSecretsFrom(bag?: Record<string, string>): { elevenLabs: string; openai: string };
export function plannedEngines(secrets: Record<string, string>): string[];
export function escapeSsml(text: string): string;
export function prosodyPercent(value: number, scale?: number): string;
export function taggedElevenText(profile: { elevenTag?: string }, text: string): string;
export function buildEdgeSsml(profile: Record<string, unknown>, text: string, options?: { withStyle?: boolean }): string;
export function secMsGecPayload(nowUnix?: number): string;
export function generateSecMsGec(nowUnix?: number): Promise<string>;
export function synthesizeSpeech(input: {
  agentId: string;
  text: string;
  locale?: string;
  secrets?: Record<string, string>;
  betterThan?: string;
  fetchImpl?: typeof fetch;
  edgeSynth?: (profile: Record<string, unknown>, text: string) => Promise<{
    audio: Uint8Array;
    mime: string;
    engine: string;
    voice?: string;
    cast?: string;
  }>;
}): Promise<{ audio: Uint8Array; mime: string; engine: string; voice?: string; cast?: string }>;
