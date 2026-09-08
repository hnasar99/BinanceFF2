"use client";

import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    BABYLON?: any;
  }
}

const BABYLON_CDN = "https://cdn.babylonjs.com/babylon.js";

function loadBabylon() {
  if (typeof window === "undefined") return Promise.reject(new Error("Browser only"));
  if (window.BABYLON) return Promise.resolve(window.BABYLON);

  return new Promise<any>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${BABYLON_CDN}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve(window.BABYLON), { once: true });
      existing.addEventListener("error", reject, { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = BABYLON_CDN;
    script.async = true;
    script.onload = () => resolve(window.BABYLON);
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

function makeNode(B: any, scene: any, name: string, position: any, color: any, scale = 1) {
  const root = new B.TransformNode(`${name}-root`, scene);
  root.position = position.clone();

  const sphere = B.MeshBuilder.CreateSphere(name, { diameter: 1.2 * scale, segments: 32 }, scene);
  sphere.parent = root;

  const mat = new B.StandardMaterial(`${name}-mat`, scene);
  mat.diffuseColor = color.scale(0.18);
  mat.emissiveColor = color.scale(1.3);
  mat.specularColor = new B.Color3(0.7, 0.7, 0.7);
  sphere.material = mat;

  const ring = B.MeshBuilder.CreateTorus(`${name}-ring`, { diameter: 2.0 * scale, thickness: 0.035 * scale, tessellation: 96 }, scene);
  ring.parent = root;
  ring.rotation.x = Math.PI / 2;
  const ringMat = new B.StandardMaterial(`${name}-ring-mat`, scene);
  ringMat.emissiveColor = color.scale(0.85);
  ringMat.alpha = 0.8;
  ring.material = ringMat;

  const halo = B.MeshBuilder.CreateTorus(`${name}-halo`, { diameter: 2.55 * scale, thickness: 0.012 * scale, tessellation: 96 }, scene);
  halo.parent = root;
  halo.rotation.x = Math.PI / 2;
  halo.rotation.y = Math.PI / 6;
  const haloMat = new B.StandardMaterial(`${name}-halo-mat`, scene);
  haloMat.emissiveColor = color.scale(0.45);
  haloMat.alpha = 0.45;
  halo.material = haloMat;

  return { root, sphere, ring, halo, mat, ringMat };
}

function makeLink(B: any, scene: any, from: any, to: any, color: any, name: string) {
  const line = B.MeshBuilder.CreateLines(name, { points: [from, to], updatable: false }, scene);
  line.color = color;
  line.alpha = 0.42;
  return line;
}

export function BabylonCommandCenter() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [renderer, setRenderer] = useState("Initializing GPU runtime…");
  const [selected, setSelected] = useState("MASTER AGENT");
  const [status, setStatus] = useState("Booting command center");

  useEffect(() => {
    let disposed = false;
    let engine: any;
    let scene: any;
    let resizeHandler: (() => void) | undefined;

    const boot = async () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      try {
        const B = await loadBabylon();
        if (!B || disposed) return;

        const canWebGPU = Boolean(navigator.gpu && B.WebGPUEngine);
        if (canWebGPU) {
          try {
            engine = new B.WebGPUEngine(canvas, { antialias: true, adaptToDeviceRatio: true });
            await engine.initAsync();
            setRenderer("Babylon.js · WebGPU");
          } catch {
            engine = new B.Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true });
            setRenderer("Babylon.js · WebGL fallback");
          }
        } else {
          engine = new B.Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true });
          setRenderer("Babylon.js · WebGL fallback");
        }

        scene = new B.Scene(engine);
        scene.clearColor = new B.Color4(0.005, 0.008, 0.02, 1);
        scene.ambientColor = new B.Color3(0.05, 0.07, 0.12);

        const camera = new B.ArcRotateCamera("camera", Math.PI / 2, 1.12, 16.5, new B.Vector3(0, 0.6, 0), scene);
        camera.lowerRadiusLimit = 8;
        camera.upperRadiusLimit = 24;
        camera.wheelPrecision = 38;
        camera.panningSensibility = 0;
        camera.attachControl(canvas, true);

        const light = new B.HemisphericLight("ambient", new B.Vector3(0, 1, 0), scene);
        light.intensity = 0.45;
        const key = new B.PointLight("key", new B.Vector3(0, 6, -2), scene);
        key.intensity = 55;
        key.range = 32;
        key.diffuse = new B.Color3(0.15, 0.35, 1);

        const glow = new B.GlowLayer("glow", scene, { blurKernelSize: 24 });
        glow.intensity = 0.65;

        const cyan = B.Color3.FromHexString("#34d9ff");
        const amber = B.Color3.FromHexString("#f3ba2f");
        const violet = B.Color3.FromHexString("#9a7dff");
        const green = B.Color3.FromHexString("#56f0a5");

        const floor = B.MeshBuilder.CreateDisc("command-grid", { radius: 8.5, tessellation: 96 }, scene);
        floor.rotation.x = Math.PI / 2;
        floor.position.y = -1.8;
        const floorMat = new B.StandardMaterial("grid-mat", scene);
        floorMat.diffuseColor = new B.Color3(0.01, 0.02, 0.05);
        floorMat.emissiveColor = new B.Color3(0.02, 0.06, 0.13);
        floorMat.alpha = 0.75;
        floor.material = floorMat;

        for (let i = 1; i <= 5; i += 1) {
          const ring = B.MeshBuilder.CreateTorus(`grid-ring-${i}`, { diameter: i * 2.85, thickness: 0.018, tessellation: 128 }, scene);
          ring.position.y = -1.76;
          ring.rotation.x = Math.PI / 2;
          const m = new B.StandardMaterial(`grid-ring-mat-${i}`, scene);
          m.emissiveColor = cyan.scale(0.12);
          m.alpha = 0.32;
          ring.material = m;
        }

        const master = makeNode(B, scene, "MASTER AGENT", new B.Vector3(0, 1.8, 0), amber, 1.35);
        const arbitrum = makeNode(B, scene, "ARBITRUM", new B.Vector3(-4.7, -0.4, 1.4), cyan, 0.85);
        const bnb = makeNode(B, scene, "BNB CHAIN", new B.Vector3(0, -0.75, -3.8), amber, 0.95);
        const base = makeNode(B, scene, "BASE", new B.Vector3(4.7, -0.4, 1.4), violet, 0.85);
        const risk = makeNode(B, scene, "RISK ENGINE", new B.Vector3(0, -0.35, 4.1), green, 0.75);

        const nodes = [master, arbitrum, bnb, base, risk];
        const names = ["MASTER AGENT", "ARBITRUM", "BNB CHAIN", "BASE", "RISK ENGINE"];

        makeLink(B, scene, master.root.position, arbitrum.root.position, cyan, "master-arbitrum");
        makeLink(B, scene, master.root.position, bnb.root.position, amber, "master-bnb");
        makeLink(B, scene, master.root.position, base.root.position, violet, "master-base");
        makeLink(B, scene, master.root.position, risk.root.position, green, "master-risk");

        const satellites = [
          { p: new B.Vector3(-2.7, 0.0, 3.2), c: cyan },
          { p: new B.Vector3(2.6, 0.1, 3.2), c: violet },
          { p: new B.Vector3(-2.6, -0.5, -2.3), c: amber },
          { p: new B.Vector3(2.9, -0.5, -2.2), c: green },
        ];

        satellites.forEach((item, index) => {
          const mesh = B.MeshBuilder.CreatePolyhedron(`worker-${index}`, { type: 2, size: 0.28 }, scene);
          mesh.position = item.p;
          const mat = new B.StandardMaterial(`worker-mat-${index}`, scene);
          mat.emissiveColor = item.c.scale(0.9);
          mesh.material = mat;
          makeLink(B, scene, master.root.position, mesh.position, item.c.scale(0.65), `worker-link-${index}`);
        });

        nodes.forEach((node, index) => {
          node.sphere.actionManager = new B.ActionManager(scene);
          node.sphere.actionManager.registerAction(new B.ExecuteCodeAction(B.ActionManager.OnPointerOverTrigger, () => {
            canvas.style.cursor = "pointer";
            node.ringMat.emissiveColor = node.mat.emissiveColor.scale(1.7);
          }));
          node.sphere.actionManager.registerAction(new B.ExecuteCodeAction(B.ActionManager.OnPointerOutTrigger, () => {
            canvas.style.cursor = "grab";
            node.ringMat.emissiveColor = node.mat.emissiveColor.scale(0.65);
          }));
          node.sphere.actionManager.registerAction(new B.ExecuteCodeAction(B.ActionManager.OnPickTrigger, () => {
            setSelected(names[index]);
            setStatus(index === 0 ? "Mission orchestration online" : `${names[index]} telemetry selected`);
            const target = node.root.position.clone();
            B.Animation.CreateAndStartAnimation("camera-target", camera, "target", 60, 30, camera.target.clone(), target, B.Animation.ANIMATIONLOOPMODE_CONSTANT);
          }));
        });

        let t = 0;
        scene.onBeforeRenderObservable.add(() => {
          t += engine.getDeltaTime() * 0.001;
          master.root.position.y = 1.8 + Math.sin(t * 1.4) * 0.12;
          nodes.forEach((node, index) => {
            node.ring.rotation.z += 0.0025 + index * 0.00035;
            node.halo.rotation.z -= 0.0015 + index * 0.00022;
          });
          key.position.x = Math.sin(t * 0.35) * 5.5;
          key.position.z = Math.cos(t * 0.35) * 5.5;
        });

        setStatus("Command center online");
        engine.runRenderLoop(() => scene?.render());
        resizeHandler = () => engine?.resize();
        window.addEventListener("resize", resizeHandler);
      } catch (error) {
        console.error(error);
        setRenderer("Renderer unavailable");
        setStatus("Babylon runtime failed to initialize");
      }
    };

    void boot();

    return () => {
      disposed = true;
      if (resizeHandler) window.removeEventListener("resize", resizeHandler);
      scene?.dispose();
      engine?.dispose();
    };
  }, []);

  return (
    <main style={{ position: "relative", minHeight: "100vh", overflow: "hidden", background: "#02030a", color: "white" }}>
      <canvas
        ref={canvasRef}
        aria-label="BinanceFF Babylon WebGPU command center"
        style={{ width: "100vw", height: "100vh", display: "block", outline: "none", touchAction: "none", cursor: "grab" }}
      />

      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", background: "radial-gradient(circle at 50% 40%, transparent 0 30%, rgba(1,4,14,.24) 62%, rgba(1,2,8,.88) 100%)" }} />

      <header style={{ position: "absolute", top: 24, left: 28, right: 28, display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 20, pointerEvents: "none" }}>
        <div>
          <div style={{ fontSize: 12, letterSpacing: ".28em", opacity: 0.58 }}>BINANCEFF // NEXUS</div>
          <h1 style={{ margin: "8px 0 0", fontSize: "clamp(24px, 3vw, 46px)", lineHeight: 1, letterSpacing: "-.04em" }}>AGENT COMMAND CENTER</h1>
        </div>
        <div style={{ textAlign: "right", fontSize: 12, lineHeight: 1.7, opacity: 0.75 }}>
          <div>{renderer}</div>
          <div style={{ color: "#56f0a5" }}>● {status}</div>
        </div>
      </header>

      <aside style={{ position: "absolute", left: 28, bottom: 28, width: "min(360px, calc(100vw - 56px))", padding: 18, border: "1px solid rgba(109,205,255,.2)", background: "rgba(2,8,22,.72)", backdropFilter: "blur(18px)", boxShadow: "0 18px 80px rgba(0,0,0,.45)", pointerEvents: "auto" }}>
        <div style={{ fontSize: 10, letterSpacing: ".24em", opacity: 0.55 }}>ACTIVE TARGET</div>
        <div style={{ marginTop: 7, fontSize: 22, fontWeight: 700 }}>{selected}</div>
        <div style={{ marginTop: 8, fontSize: 13, lineHeight: 1.5, opacity: 0.7 }}>{status}. Drag to orbit, wheel to zoom, click any glowing system node to focus it.</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginTop: 16 }}>
          {["7 AGENTS", "4 CHAINS", "12 EVENTS/S"].map((label) => (
            <div key={label} style={{ padding: "10px 8px", border: "1px solid rgba(255,255,255,.09)", background: "rgba(255,255,255,.025)", fontSize: 10, textAlign: "center", letterSpacing: ".08em" }}>{label}</div>
          ))}
        </div>
      </aside>

      <nav style={{ position: "absolute", right: 28, bottom: 28, display: "flex", gap: 10, pointerEvents: "auto" }}>
        <a href="/spatial" style={{ color: "white", textDecoration: "none", border: "1px solid rgba(255,255,255,.12)", background: "rgba(5,8,20,.7)", padding: "11px 14px", fontSize: 11, letterSpacing: ".12em" }}>LEGACY SPATIAL</a>
        <a href="/" style={{ color: "#02030a", textDecoration: "none", background: "#f3ba2f", padding: "11px 14px", fontSize: 11, fontWeight: 800, letterSpacing: ".12em" }}>EXIT</a>
      </nav>
    </main>
  );
}
