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

async function createEngine(B: any, canvas: HTMLCanvasElement) {
  const webgpuReady = B.WebGPUEngine?.IsSupportedAsync
    ? await B.WebGPUEngine.IsSupportedAsync
    : Boolean(navigator.gpu && B.WebGPUEngine);

  if (webgpuReady) {
    try {
      const webgpu = new B.WebGPUEngine(canvas, { antialias: true, adaptToDeviceRatio: true });
      await webgpu.initAsync();
      return { engine: webgpu, label: "Babylon.js · WebGPU", detail: "Native GPU path" };
    } catch (reason) {
      const detail = reason instanceof Error ? reason.message : "WebGPU init failed";
      console.warn("WebGPU init failed, falling back to WebGL2", reason);
      return {
        engine: new B.Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true }),
        label: "Babylon.js · WebGL2 fallback",
        detail,
      };
    }
  }

  const detail = navigator.gpu
    ? "WebGPU exists but no adapter was returned."
    : "Firefox/Linux often has no navigator.gpu. Enable dom.webgpu.enabled or test in Chrome 113+.";
  return {
    engine: new B.Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true }),
    label: "Babylon.js · WebGL2 fallback",
    detail,
  };
}

export function BabylonCommandCenter() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [renderer, setRenderer] = useState("Initializing GPU runtime…");
  const [rendererDetail, setRendererDetail] = useState("");
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

        const runtime = await createEngine(B, canvas);
        engine = runtime.engine;
        setRenderer(runtime.label);
        setRendererDetail(runtime.detail);

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
            window.dispatchEvent(new CustomEvent("binanceff-ops-focus", { detail: { node: names[index] } }));
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

      <div
        aria-hidden="true"
        title={`${renderer} · ${selected} · ${status}${rendererDetail ? ` · ${rendererDetail}` : ""}`}
        style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
      />
    </main>
  );
}
