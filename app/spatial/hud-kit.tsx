"use client";

import { useThree } from "@react-three/fiber";
import { Container, Text } from "@react-three/uikit";
import type { ComponentProps, ReactNode } from "react";

export const GOLD = "#f3ba2f";
export const CYAN = "#35e7ff";
export const GREEN = "#4df0a0";
export const VIOLET = "#9b72ff";
export const PANEL = "#080d16ee";
export const BORDER = "#28364c";
export const MUTED = "#91a0b8";

export type HudMetrics = {
  width: number;
  height: number;
  compact: boolean;
  phone: boolean;
  scale: number;
  s: (n: number) => number;
  listHeight: (menuOpen?: boolean) => number;
};

export function useHudMetrics(): HudMetrics {
  const width = useThree((state) => state.size.width);
  const height = useThree((state) => state.size.height);
  const compact = width < 920;
  const phone = width < 640;
  const scale = phone
    ? Math.max(0.9, Math.min(1, width / 400))
    : compact
      ? Math.max(0.92, Math.min(1, width / 860))
      : 1;
  const s = (n: number) => Math.max(11, Math.round(n * scale));
  const listHeight = (menuOpen = false) => {
    const chrome =
      (phone ? 62 : compact ? 78 : 116) +
      (menuOpen && compact ? 6 * s(46) + 28 : 0);
    return Math.max(200, Math.floor(height - chrome));
  };
  return { width, height, compact, phone, scale, s, listHeight };
}

export function press(handler: () => void) {
  return (event: { stopPropagation: () => void }) => {
    event.stopPropagation();
    handler();
  };
}

export function ScrollList({
  height,
  gap = 10,
  children,
}: {
  height: number;
  gap?: number;
  children: ReactNode;
}) {
  return (
    <Container
      height={height}
      width="100%"
      flexShrink={0}
      overflow="scroll"
      flexDirection="column"
      alignItems="stretch"
      gap={gap}
      paddingRight={8}
      scrollbarWidth={6}
      scrollbarColor="#5a6b84"
      scrollbarBorderRadius={4}
      pointerEvents="auto"
      pointerEventsOrder={12}
    >
      {children}
    </Container>
  );
}

export function ListRow({
  glyph,
  title,
  detail,
  accent = MUTED,
  active = false,
  height,
  onSelect,
}: {
  glyph: string;
  title: string;
  detail?: string;
  accent?: string;
  active?: boolean;
  height: number;
  onSelect?: () => void;
}) {
  return (
    <Container
      height={height}
      width="100%"
      flexShrink={0}
      flexDirection="row"
      alignItems="center"
      gap={10}
      paddingX={12}
      borderRadius={8}
      borderWidth={1}
      borderColor={active ? accent : BORDER}
      backgroundColor={active ? `${accent}22` : "#0a1220ee"}
      cursor={onSelect ? "pointer" : "default"}
      pointerEvents="auto"
      hover={onSelect ? { borderColor: accent, backgroundColor: "#152239" } : undefined}
      onClick={onSelect ? press(onSelect) : undefined}
    >
      <Container width={28} height={28} flexShrink={0} borderRadius={8} alignItems="center" justifyContent="center" backgroundColor={`${accent}20`}>
        <Text fontSize={14} lineHeight="17px" color={accent}>{glyph}</Text>
      </Container>
      <Container flexGrow={1} minWidth={0} flexDirection="column" gap={2} overflow="hidden">
        <Text fontSize={15} lineHeight="18px" fontWeight="bold" color="#ffffff" wordBreak="break-word">{title}</Text>
        {detail && <Text fontSize={12} lineHeight="15px" color={MUTED} wordBreak="break-word">{detail}</Text>}
      </Container>
    </Container>
  );
}

export function ListCard({
  children,
  accent = BORDER,
  onClick,
  ...props
}: ComponentProps<typeof Container> & { accent?: string; onClick?: () => void }) {
  return (
    <Container
      width="100%"
      flexShrink={0}
      flexDirection="column"
      alignItems="stretch"
      gap={8}
      padding={14}
      borderRadius={12}
      borderWidth={1}
      borderColor={accent}
      backgroundColor={PANEL}
      overflow="visible"
      pointerEvents="auto"
      hover={onClick ? { borderColor: GOLD, transformTranslateZ: 4 } : undefined}
      onClick={onClick ? press(onClick) : undefined}
      {...props}
    >
      {children}
    </Container>
  );
}
