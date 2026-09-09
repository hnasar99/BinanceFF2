/** Role-specific procedural sets: desk, dashboards, and a live task blackboard. */

export type StationCheck = { id: string; label: string; done: boolean };

type Mats = {
  steel: any;
  wood: any;
  dark: any;
  accent: any;
  screen: any;
  ui: any;
  chalk: any;
  board: any;
};

function paint(B: any, scene: any, name: string, hex: string, emit = 0) {
  const mat = new B.StandardMaterial(name, scene);
  mat.diffuseColor = B.Color3.FromHexString(hex);
  mat.specularColor = new B.Color3(0.08, 0.09, 0.1);
  if (emit) mat.emissiveColor = B.Color3.FromHexString(hex).scale(emit);
  return mat;
}

function box(
  B: any,
  scene: any,
  name: string,
  size: { width: number; height: number; depth: number },
  pos: [number, number, number],
  mat: any,
  parent: any,
) {
  const mesh = B.MeshBuilder.CreateBox(name, size, scene);
  mesh.position.set(...pos);
  mesh.material = mat;
  mesh.parent = parent;
  mesh.isPickable = false;
  mesh.alwaysSelectAsActiveMesh = true;
  return mesh;
}

function cyl(
  B: any,
  scene: any,
  name: string,
  opts: { diameter: number; height: number; tessellation?: number },
  pos: [number, number, number],
  mat: any,
  parent: any,
) {
  const mesh = B.MeshBuilder.CreateCylinder(name, { tessellation: 16, ...opts }, scene);
  mesh.position.set(...pos);
  mesh.material = mat;
  mesh.parent = parent;
  mesh.isPickable = false;
  mesh.alwaysSelectAsActiveMesh = true;
  return mesh;
}

function shorten(label: string, max = 52) {
  const text = String(label || "").trim();
  return text.length <= max ? text : `${text.slice(0, max - 1)}…`;
}

export function boardCopy(agentId: string) {
  if (agentId === "analyst") {
    return { title: "ANALYSIS", formulas: ["net = spread − fees − gas", "Δt ≤ 1.8s     N < $28k"] };
  }
  if (agentId === "commander") return { title: "SQUAD ORDERS", formulas: [] as string[] };
  if (agentId === "scout") return { title: "SCAN LIST", formulas: [] as string[] };
  if (agentId === "strategist") return { title: "SIM CASES", formulas: [] as string[] };
  if (agentId === "executor") return { title: "SETTLE QUEUE", formulas: [] as string[] };
  return { title: "RISK ENVELOPE", formulas: [] as string[] };
}

function drawBoard(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  checks: StationCheck[],
  accentHex: string,
  copy: { title: string; formulas: string[] },
) {
  ctx.fillStyle = "#152018";
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = "rgba(215,228,240,.18)";
  ctx.lineWidth = 4;
  ctx.strokeRect(10, 10, width - 20, height - 20);

  const { title, formulas } = copy;
  ctx.fillStyle = accentHex;
  ctx.font = "700 36px ui-sans-serif, system-ui, sans-serif";
  ctx.fillText(title, 36, 56);

  let y = 92;
  ctx.fillStyle = "#d7e4f0";
  ctx.font = "22px ui-monospace, monospace";
  for (const formula of formulas) {
    ctx.fillText(formula, 36, y);
    y += 32;
  }
  if (formulas.length) y += 10;

  for (const item of checks.slice(0, 4)) {
    const mark = item.done ? "✓" : "○";
    const label = shorten(item.label);
    ctx.fillStyle = item.done ? "#50e3a4" : "#d7e4f0";
    ctx.font = `${item.done ? "600" : "500"} 26px ui-sans-serif, system-ui, sans-serif`;
    ctx.fillText(`${mark}  ${label}`, 36, y);
    if (item.done) {
      const { width: tw } = ctx.measureText(`${mark}  ${label}`);
      ctx.strokeStyle = "rgba(80,227,164,.85)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(70, y - 8);
      ctx.lineTo(70 + Math.max(40, tw - 40), y - 8);
      ctx.stroke();
    }
    y += 48;
  }
}

function createBoardTexture(B: any, scene: any, accentHex: string, agentId: string) {
  const texture = new B.DynamicTexture(`ops-board-tex-${agentId}`, { width: 1024, height: 512 }, scene, false);
  texture.hasAlpha = false;
  // Box/plane UVs in Babylon read the canvas mirrored on both axes.
  texture.uScale = -1;
  texture.vScale = -1;
  texture.uOffset = 1;
  texture.vOffset = 1;
  const ctx = texture.getContext() as CanvasRenderingContext2D;
  let copy = boardCopy(agentId);
  drawBoard(ctx, 1024, 512, [], accentHex, copy);
  texture.update();
  const mat = new B.StandardMaterial(`ops-board-live-${agentId}`, scene);
  mat.diffuseTexture = texture;
  mat.emissiveTexture = texture;
  mat.emissiveColor = new B.Color3(0.22, 0.24, 0.2);
  mat.specularColor = new B.Color3(0.04, 0.05, 0.05);
  mat.backFaceCulling = false;
  return {
    mat,
    setChecks(checks: StationCheck[], nextCopy?: { title?: string; formulas?: string[] }) {
      if (nextCopy) copy = { title: nextCopy.title ?? copy.title, formulas: nextCopy.formulas ?? copy.formulas };
      drawBoard(ctx, 1024, 512, checks, accentHex, copy);
      texture.update();
    },
    dispose() {
      texture.dispose();
      mat.dispose();
    },
  };
}

function sharedShell(B: any, scene: any, accentHex: string, root: any): Mats {
  const steel = paint(B, scene, "ops-steel", "#12161e");
  const wood = paint(B, scene, "ops-wood", "#1b140e");
  const dark = paint(B, scene, "ops-dark", "#07090e");
  const accent = paint(B, scene, "ops-accent", accentHex, 0.35);
  const screen = paint(B, scene, "ops-screen", "#031018", 0);
  screen.emissiveColor = new B.Color3(0.03, 0.16, 0.2);
  const ui = paint(B, scene, "ops-ui", accentHex, 0.55);
  const chalk = paint(B, scene, "ops-chalk", "#d7e4f0", 0.2);
  const board = paint(B, scene, "ops-board", "#152018");

  const floor = B.MeshBuilder.CreateGround("ops-floor", { width: 3.4, height: 2.6, subdivisions: 1 }, scene);
  floor.material = dark;
  floor.parent = root;
  floor.isPickable = false;

  const rug = B.MeshBuilder.CreateGround("ops-rug", { width: 1.6, height: 1.2 }, scene);
  rug.position.set(0, 0.004, 0.12);
  rug.material = paint(B, scene, "ops-rug-mat", "#101820", 0.04);
  rug.parent = root;
  rug.isPickable = false;

  const wall = box(B, scene, "ops-wall", { width: 2.8, height: 1.9, depth: 0.04 }, [0.1, 0.95, -0.72], paint(B, scene, "ops-wall-mat", "#0b1018"), root);
  wall.material.emissiveColor = new B.Color3(0.01, 0.02, 0.04);

  return { steel, wood, dark, accent, screen, ui, chalk, board };
}

function chair(B: any, scene: any, mats: Mats, root: any, x = 0.58) {
  box(B, scene, "ops-chair-seat", { width: 0.38, height: 0.05, depth: 0.38 }, [x, 0.52, 0.02], mats.steel, root);
  box(B, scene, "ops-chair-back", { width: 0.38, height: 0.42, depth: 0.05 }, [x, 0.74, -0.16], mats.steel, root);
  box(B, scene, "ops-chair-stem", { width: 0.05, height: 0.48, depth: 0.05 }, [x, 0.26, 0.02], mats.dark, root);
  cyl(B, scene, "ops-chair-base", { diameter: 0.42, height: 0.03 }, [x, 0.04, 0.02], mats.dark, root);
}

function hangBoard(B: any, scene: any, mats: Mats, root: any, live: ReturnType<typeof createBoardTexture>, size: [number, number] = [1.35, 0.72]) {
  box(B, scene, "ops-board-frame", { width: size[0] + 0.05, height: size[1] + 0.04, depth: 0.02 }, [0.05, 1.28, -0.7], mats.steel, root);
  return box(B, scene, "ops-board", { width: size[0], height: size[1], depth: 0.03 }, [0.05, 1.28, -0.68], live.mat, root);
}

function buildCommander(B: any, scene: any, mats: Mats, root: any, live: ReturnType<typeof createBoardTexture>) {
  box(B, scene, "cmd-table", { width: 1.55, height: 0.05, depth: 0.7 }, [0, 0.9, 0.42], mats.wood, root);
  box(B, scene, "cmd-leg-l", { width: 0.06, height: 0.88, depth: 0.6 }, [-0.68, 0.44, 0.42], mats.steel, root);
  box(B, scene, "cmd-leg-r", { width: 0.06, height: 0.88, depth: 0.6 }, [0.68, 0.44, 0.42], mats.steel, root);
  const panels: Array<[number, number, number]> = [
    [-0.85, 1.48, 0.74],
    [-0.28, 1.48, 0.74],
    [0.28, 1.48, 0.74],
    [0.85, 1.48, 0.74],
  ];
  for (const [i, pos] of panels.entries()) {
    box(B, scene, `cmd-kpi-${i}`, { width: 0.5, height: 0.3, depth: 0.03 }, pos, mats.steel, root);
    box(B, scene, `cmd-kpi-s-${i}`, { width: 0.46, height: 0.26, depth: 0.012 }, [pos[0], pos[1], pos[2] + 0.018], mats.screen, root);
    box(B, scene, `cmd-kpi-ui-${i}`, { width: 0.28, height: 0.05, depth: 0.004 }, [pos[0], pos[1] + 0.06, pos[2] + 0.026], mats.ui, root);
  }
  box(B, scene, "cmd-grid", { width: 0.9, height: 0.22, depth: 0.01 }, [0, 1.12, 0.72], mats.ui, root);
  hangBoard(B, scene, mats, root, live, [1.5, 0.78]);
  chair(B, scene, mats, root, 0.7);
}

function buildAnalyst(B: any, scene: any, mats: Mats, root: any, live: ReturnType<typeof createBoardTexture>) {
  box(B, scene, "an-desk", { width: 1.32, height: 0.045, depth: 0.54 }, [0, 0.94, 0.54], mats.wood, root);
  box(B, scene, "an-leg-l", { width: 0.05, height: 0.92, depth: 0.48 }, [-0.6, 0.46, 0.54], mats.steel, root);
  box(B, scene, "an-leg-r", { width: 0.05, height: 0.92, depth: 0.48 }, [0.6, 0.46, 0.54], mats.steel, root);
  box(B, scene, "an-mon-1", { width: 0.56, height: 0.34, depth: 0.04 }, [0.28, 1.3, 0.72], mats.steel, root);
  box(B, scene, "an-mon-1s", { width: 0.52, height: 0.3, depth: 0.012 }, [0.28, 1.3, 0.738], mats.screen, root);
  box(B, scene, "an-mon-2", { width: 0.5, height: 0.3, depth: 0.04 }, [-0.36, 1.26, 0.7], mats.steel, root);
  box(B, scene, "an-mon-2s", { width: 0.46, height: 0.26, depth: 0.012 }, [-0.36, 1.26, 0.718], mats.screen, root);
  box(B, scene, "an-ui-1", { width: 0.2, height: 0.08, depth: 0.004 }, [0.2, 1.36, 0.746], mats.ui, root);
  box(B, scene, "an-ui-2", { width: 0.18, height: 0.1, depth: 0.004 }, [0.34, 1.22, 0.746], mats.chalk, root);
  box(B, scene, "an-keys", { width: 0.38, height: 0.02, depth: 0.13 }, [-0.08, 0.97, 0.4], mats.steel, root);
  box(B, scene, "an-mouse", { width: 0.05, height: 0.018, depth: 0.08 }, [0.28, 0.972, 0.38], mats.dark, root);
  hangBoard(B, scene, mats, root, live, [1.55, 0.86]);
  chair(B, scene, mats, root);
}

function buildScout(B: any, scene: any, mats: Mats, root: any, live: ReturnType<typeof createBoardTexture>) {
  box(B, scene, "sc-console", { width: 1.05, height: 0.06, depth: 0.4 }, [0.12, 0.78, 0.58], mats.steel, root);
  box(B, scene, "sc-console-s", { width: 0.7, height: 0.22, depth: 0.03 }, [0.18, 1.02, 0.7], mats.screen, root);
  box(B, scene, "sc-console-ui", { width: 0.36, height: 0.06, depth: 0.004 }, [0.1, 1.06, 0.718], mats.ui, root);
  const dish = cyl(B, scene, "sc-radar", { diameter: 0.62, height: 0.04, tessellation: 32 }, [-0.72, 1.22, 0.18], mats.accent, root);
  dish.rotation.x = Math.PI / 2.4;
  cyl(B, scene, "sc-radar-stem", { diameter: 0.05, height: 0.7 }, [-0.72, 0.7, 0.28], mats.steel, root);
  box(B, scene, "sc-map", { width: 0.7, height: 0.48, depth: 0.02 }, [-0.72, 1.18, -0.68], mats.screen, root);
  box(B, scene, "sc-ping-1", { width: 0.05, height: 0.05, depth: 0.02 }, [-0.86, 1.28, -0.66], mats.ui, root);
  box(B, scene, "sc-ping-2", { width: 0.04, height: 0.04, depth: 0.02 }, [-0.58, 1.08, -0.66], mats.accent, root);
  hangBoard(B, scene, mats, root, live, [1.2, 0.68]);
}

function buildStrategist(B: any, scene: any, mats: Mats, root: any, live: ReturnType<typeof createBoardTexture>) {
  box(B, scene, "st-table", { width: 1.4, height: 0.05, depth: 0.86 }, [0, 0.72, 0.28], mats.wood, root);
  box(B, scene, "st-route-a", { width: 0.72, height: 0.012, depth: 0.02 }, [-0.12, 0.76, 0.12], mats.ui, root);
  box(B, scene, "st-route-b", { width: 0.02, height: 0.012, depth: 0.42 }, [0.24, 0.76, 0.18], mats.accent, root);
  box(B, scene, "st-route-c", { width: 0.5, height: 0.012, depth: 0.02 }, [0.18, 0.76, 0.4], mats.chalk, root);
  box(B, scene, "st-node-a", { width: 0.06, height: 0.04, depth: 0.06 }, [-0.46, 0.78, 0.12], mats.accent, root);
  box(B, scene, "st-node-b", { width: 0.06, height: 0.04, depth: 0.06 }, [0.42, 0.78, 0.4], mats.ui, root);
  box(B, scene, "st-screen-l", { width: 0.42, height: 0.28, depth: 0.03 }, [-0.7, 1.28, 0.62], mats.steel, root);
  box(B, scene, "st-screen-ls", { width: 0.38, height: 0.24, depth: 0.01 }, [-0.7, 1.28, 0.638], mats.screen, root);
  box(B, scene, "st-screen-r", { width: 0.42, height: 0.28, depth: 0.03 }, [0.7, 1.28, 0.62], mats.steel, root);
  box(B, scene, "st-screen-rs", { width: 0.38, height: 0.24, depth: 0.01 }, [0.7, 1.28, 0.638], mats.screen, root);
  hangBoard(B, scene, mats, root, live, [1.35, 0.72]);
  chair(B, scene, mats, root, 0.62);
}

function buildExecutor(B: any, scene: any, mats: Mats, root: any, live: ReturnType<typeof createBoardTexture>) {
  box(B, scene, "ex-desk", { width: 1.36, height: 0.045, depth: 0.5 }, [0, 0.94, 0.52], mats.steel, root);
  box(B, scene, "ex-term", { width: 0.7, height: 0.38, depth: 0.04 }, [0.12, 1.3, 0.72], mats.steel, root);
  box(B, scene, "ex-term-s", { width: 0.66, height: 0.34, depth: 0.012 }, [0.12, 1.3, 0.738], mats.screen, root);
  box(B, scene, "ex-ui", { width: 0.4, height: 0.08, depth: 0.004 }, [0.04, 1.38, 0.746], mats.ui, root);
  box(B, scene, "ex-ticker", { width: 1.2, height: 0.06, depth: 0.02 }, [0, 1.08, 0.7], mats.accent, root);
  box(B, scene, "ex-pad", { width: 0.22, height: 0.04, depth: 0.16 }, [0.46, 0.98, 0.38], mats.dark, root);
  cyl(B, scene, "ex-lock", { diameter: 0.08, height: 0.06 }, [0.46, 1.04, 0.38], mats.accent, root);
  box(B, scene, "ex-lock-shank", { width: 0.05, height: 0.06, depth: 0.02 }, [0.46, 1.1, 0.38], mats.steel, root);
  hangBoard(B, scene, mats, root, live, [1.28, 0.7]);
  chair(B, scene, mats, root);
}

function buildGuardian(B: any, scene: any, mats: Mats, root: any, live: ReturnType<typeof createBoardTexture>) {
  box(B, scene, "gd-vault", { width: 1.7, height: 0.9, depth: 0.06 }, [0.08, 0.72, 0.7], mats.steel, root);
  box(B, scene, "gd-slot-1", { width: 0.42, height: 0.28, depth: 0.02 }, [-0.46, 0.78, 0.74], mats.screen, root);
  box(B, scene, "gd-slot-2", { width: 0.42, height: 0.28, depth: 0.02 }, [0.08, 0.78, 0.74], mats.screen, root);
  box(B, scene, "gd-slot-3", { width: 0.42, height: 0.28, depth: 0.02 }, [0.62, 0.78, 0.74], mats.screen, root);
  const ok = paint(B, scene, "gd-ok", "#50e3a4", 0.4);
  const warn = paint(B, scene, "gd-warn", "#ff5151", 0.28);
  cyl(B, scene, "gd-gauge-1", { diameter: 0.16, height: 0.05 }, [-0.46, 1.02, 0.74], ok, root);
  cyl(B, scene, "gd-gauge-2", { diameter: 0.16, height: 0.05 }, [0.08, 1.02, 0.74], mats.accent, root);
  cyl(B, scene, "gd-gauge-3", { diameter: 0.16, height: 0.05 }, [0.62, 1.02, 0.74], warn, root);
  box(B, scene, "gd-bar-ok", { width: 0.7, height: 0.03, depth: 0.02 }, [-0.3, 0.5, 0.74], ok, root);
  box(B, scene, "gd-bar-hot", { width: 0.28, height: 0.03, depth: 0.02 }, [0.5, 0.5, 0.74], warn, root);
  hangBoard(B, scene, mats, root, live, [1.35, 0.72]);
}

export function createAgentStation(B: any, scene: any, agentId: string, accentHex: string) {
  const root = new B.TransformNode("ops-station", scene);
  const mats = sharedShell(B, scene, accentHex, root);
  const live = createBoardTexture(B, scene, accentHex, agentId);

  if (agentId === "commander") buildCommander(B, scene, mats, root, live);
  else if (agentId === "analyst") buildAnalyst(B, scene, mats, root, live);
  else if (agentId === "scout") buildScout(B, scene, mats, root, live);
  else if (agentId === "strategist") buildStrategist(B, scene, mats, root, live);
  else if (agentId === "executor") buildExecutor(B, scene, mats, root, live);
  else buildGuardian(B, scene, mats, root, live);

  return {
    root,
    setLive(on: boolean) {
      mats.screen.emissiveColor = on ? new B.Color3(0.05, 0.22, 0.28) : new B.Color3(0.02, 0.1, 0.14);
      mats.ui.emissiveColor = B.Color3.FromHexString(accentHex).scale(on ? 0.7 : 0.28);
    },
    setChecks(checks: StationCheck[], nextCopy?: { title?: string; formulas?: string[] }) {
      live.setChecks(checks ?? [], nextCopy);
    },
    dispose() {
      live.dispose();
      root.dispose();
    },
  };
}

export function createOpsStation(B: any, scene: any, accentHex: string) {
  return createAgentStation(B, scene, "commander", accentHex);
}
