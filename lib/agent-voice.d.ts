export type VoiceGender = "female" | "male";
export type AgentVoiceProfile = {
  id: string;
  name: string;
  gender: VoiceGender;
  lang: string;
  rate: number;
  pitch: number;
  prefer: string[];
  cast: string;
  elevenLabsVoiceId: string;
  elevenTag: string;
  openaiVoice: string;
  edgeVoice: string;
  edgeStyle: string;
  pollyVoice: string;
  direction: string;
};
export const AGENT_VOICES: Record<string, AgentVoiceProfile>;
export const AGENT_LINES: Record<string, string>;
export const DEPLOY_LINE: string;
export function cannedVoiceSrc(agentId: string, text: string, locale?: string): string | null;
export function voiceCacheKey(agentId: string, text: string, locale?: string): string;
export function engineLabel(engine: string): string;
export const ENGINE_RANK: Record<string, number>;
export function engineRank(engine: string): number;
export function shouldUpgradeVoice(cachedEngine: string | null | undefined, bestEngine: string): boolean;
export function speakableText(text: string): string;
export function scoreVoice(
  voice: { name?: string; lang?: string; localService?: boolean },
  profile: AgentVoiceProfile,
): number;
export function pickVoice(
  voices: Array<{ name?: string; lang?: string; localService?: boolean }>,
  profile: AgentVoiceProfile,
): { name?: string; lang?: string; localService?: boolean } | null;
export function voiceProfile(agentId: string, locale?: string): AgentVoiceProfile;
