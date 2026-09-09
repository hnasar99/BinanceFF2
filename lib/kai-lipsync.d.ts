export const VISEME_OPENNESS: Record<string, number>;
export const VISEME_WIDTH: Record<string, number>;
export function normalizeVisemeName(name: string): string;
export function isSpeechMorph(name: string): boolean;
export function visemeMorphKeys(viseme: string): string[];
export function textToVisemes(
  text: string,
  rate?: number,
): Array<{
  viseme: string;
  charIndex: number;
  startMs: number;
  endMs: number;
  openness: number;
  width: number;
}>;
export function fitVisemesToDuration<T extends { startMs: number; endMs: number }>(
  track: T[],
  durationMs: number,
): T[];
export function visemeAt(
  track: Array<{ viseme: string; startMs: number; endMs: number; openness: number; width: number }>,
  timeMs: number,
): { viseme: string; openness: number; width: number; mix: number };
