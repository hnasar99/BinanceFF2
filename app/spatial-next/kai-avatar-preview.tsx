"use client";

import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    BABYLON?: any;
  }
}

const BABYLON_CORE = "https://cdn.babylonjs.com/babylon.js";
const BABYLON_LOADERS = "https://cdn.babylonjs.com/loaders/babylonjs.loaders.min.js";
const KAI_FALLBACK = "https://assets.babylonjs.com/meshes/HVGirl.glb";

function loadScript(src: string) {
  return new Promise<void>((resolve, reject) => {
    const found = document.querySelector<HTMLScriptElement>(`script[src=\"${src}\"]`);
    if (found) {
      if (found.dataset.loaded === "true") return resolve();
      found.addEventListener("load", () => resolve(), { once: true });
      found.addEventListener("error", reject, { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = () => {
      script.dataset.loaded = "true";
      resolve();
    };
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

export function KaiAvatarPreview() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [state, setState] = useState("Loading rigged avatar…");

  useEffect(() => {
    let engine: any;
    let scene: any;
    let disposed = false;

    const boot = async () => {
      try {
        await loadScript(BABYLON_CORE);
        await loadScript(BABYLON_LOADERS);
        if (disposed || !window.BABYLON || !canvasRef.current) return;

        const B = window.BABYLON;
        engine = new B.Engine(canvasRef.current, true, { preserveDrawingBuffer: true, stencil: true });
        scene = new B.Scene(engine);
        scene.clearColor = new B.Color4(0.005, 0.008, 0.018, 0);

        const camera = new B.ArcRotateCamera("kai-camera", Math.PI / 2, 1.42, 2.35, new B.Vector3(0, 1.18, 0), scene);
        camera.lowerRadiusLimit = 1.7;
        camera.upperRadiusLimit = 3.2;
        camera.wheelPrecision = 80;
        camera.panningSensibility = 0;
        camera.attachControl(canvasRef.current, true);

        const hemi = new B.HemisphericLight("kai-hemi", new B.Vector3(0, 1, 0), scene);
        hemi.intensity = 1.25;
        const key = new B.PointLight("kai-key", new B.Vector3(1.6, 2.4, -1.4), scene);
        key.intensity = 18;
        key.diffuse = B.Color3.FromHexString("#40d7ff");
        const rim = new B.PointLight("kai-rim", new B.Vector3(-1.6, 1.8, 1.2), scene);
        rim.intensity = 12;
        rim.diffuse = B.Color3.FromHexString("#f3ba2f");

        const platform = B.MeshBuilder.CreateCylinder("kai-platform", { diameter: 1.55, height: 0.08, tessellation: 64 }, scene);
        platform.position.y = 0.02;
        const pm = new B.StandardMaterial("kai-platform-mat", scene);
        pm.diffuseColor = new B.Color3(0.015, 0.025, 0.05);
        pm.emissiveColor = B.Color3.FromHexString("#40d7ff").scale(0.08);
        platform.material = pm;

        const loadAvatar = async (url: string) => {
          const slash = url.lastIndexOf("/");
          const root = url.slice(0, slash + 1);
          const file = url.slice(slash + 1);
          return B.SceneLoader.ImportMeshAsync("", root, file, scene);
        };

        let result: any;
        try {
          result = await loadAvatar("/agents/kai.glb");
          setState("KAI production asset loaded");
        } catch {
          result = await loadAvatar(KAI_FALLBACK);
          setState("KAI rig pipeline online · reference avatar");
        }

        const root = result.meshes?.[0];
        if (root) {
          root.scaling = new B.Vector3(0.9, 0.9, 0.9);
          root.position = new B.Vector3(0, 0.05, 0);
        }

        const animations = result.animationGroups ?? scene.animationGroups ?? [];
        const idle = animations.find((a: any) => /idle|samba/i.test(a.name)) ?? animations[0];
        if (idle) idle.start(true);

        engine.runRenderLoop(() => scene?.render());
        window.addEventListener("resize", engine.resize.bind(engine));
      } catch (error) {
        console.error(error);
        setState("Avatar runtime unavailable");
      }
    };

    void boot();
    return () => {
      disposed = true;
      scene?.dispose();
      engine?.dispose();
    };
  }, []);

  return (
    <div className="kai-avatar-preview">
      <canvas ref={canvasRef} aria-label="Rigged 3D preview of KAI Scout" />
      <div className="kai-avatar-status"><i /> {state}</div>
      <div className="kai-avatar-label"><b>KAI</b><span>SCOUT // RIGGED 3D</span></div>
    </div>
  );
}
