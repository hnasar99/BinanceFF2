"use client";

import { useEffect, useRef, useState } from "react";
import {
  fitVisemesToDuration,
  isSpeechMorph,
  normalizeVisemeName,
  textToVisemes,
  visemeAt,
  visemeMorphKeys,
} from "@/lib/kai-lipsync";
import { useSpatialI18n } from "../spatial/i18n-context";
import type { OpsCheck } from "@/lib/ops-sim";
import { agentRig } from "./agent-rigs";
import { boardCopy, createAgentStation } from "./avatar-station";

declare global {
  interface Window {
    BABYLON?: any;
  }
}

export type SpeechCue = { id: number; agentId: string; text: string; durationMs?: number };

const BABYLON_CORE = "https://cdn.babylonjs.com/babylon.js";
const BABYLON_LOADERS = "https://cdn.babylonjs.com/loaders/babylonjs.loaders.min.js";
const LOAD_MS = 45_000;
const SPEECH_RATE = 0.95;

function withTimeout<T>(promise: Promise<T>, ms: number, label: string) {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      window.setTimeout(() => reject(new Error(label)), ms);
    }),
  ]);
}

function loadScript(src: string) {
  return new Promise<void>((resolve, reject) => {
    const found = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`);
    if (found) {
      const already =
        found.dataset.loaded === "true" ||
        found.readyState === "complete" ||
        (src === BABYLON_CORE && Boolean(window.BABYLON));
      if (already) return resolve();
      found.addEventListener("load", () => resolve(), { once: true });
      found.addEventListener("error", () => reject(new Error(`Failed ${src}`)), { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = () => {
      script.dataset.loaded = "true";
      resolve();
    };
    script.onerror = () => reject(new Error(`Failed ${src}`));
    document.head.appendChild(script);
  });
}

async function ensureBabylon() {
  if (!window.BABYLON) await loadScript(BABYLON_CORE);
  if (!window.BABYLON?.GLTFFileLoader && !window.BABYLON?.GLTF2?.GLTFFileLoader) {
    await loadScript(BABYLON_LOADERS);
  }
  if (!window.BABYLON) throw new Error("Babylon runtime missing");
  return window.BABYLON;
}

function hierarchyBounds(root: any) {
  root.computeWorldMatrix(true);
  if (typeof root.getHierarchyBoundingVectors === "function") {
    return root.getHierarchyBoundingVectors(true);
  }
  const box = root.getBoundingInfo?.().boundingBox;
  return { min: box.minimumWorld, max: box.maximumWorld };
}

function geometryMeshes(root: any, scene: any) {
  const fromRoot = typeof root.getChildMeshes === "function" ? root.getChildMeshes(false) : [];
  const extras = scene?.meshes ?? [];
  return [...new Set([root, ...fromRoot, ...extras].filter(Boolean))]
    .filter((mesh) => mesh.getTotalVertices?.() > 0);
}

function stabilizeMeshes(meshes: any[]) {
  for (const mesh of meshes) {
    mesh.alwaysSelectAsActiveMesh = true;
    mesh.isPickable = false;
    mesh.refreshBoundingInfo?.(true, true);
    mesh.skeleton?.prepare?.();
  }
}

function limbPattern(side: "Left" | "Right", part: string) {
  const initial = side[0];
  return new RegExp(`(^|:)((${side}${part})|(${side}_${part})|(${part}_${initial})|(${side}${part.replace("ForeArm", "Forearm")}))$`, "i");
}

function findBone(scene: any, pattern: RegExp) {
  for (const skeleton of scene.skeletons ?? []) {
    const bone = skeleton.bones?.find((item: { name: string }) => pattern.test(item.name));
    if (bone) {
      const mesh = scene.meshes.find((item: any) => item.skeleton === skeleton && item.getTotalVertices?.() > 0);
      return { bone, mesh, skeleton };
    }
  }
  return null;
}

function boneWorld(B: any, bone: any, mesh: any) {
  if (typeof bone.getPosition === "function" && mesh) return bone.getPosition(B.Space.WORLD, mesh);
  return B.Vector3.TransformCoordinates(B.Vector3.Zero(), bone.getWorldMatrix());
}

function boneDirection(B: any, bone: any, mesh: any, axis: any) {
  if (typeof bone.getDirection === "function" && mesh) return bone.getDirection(axis, mesh);
  return B.Vector3.TransformNormal(axis, bone.getWorldMatrix()).normalize();
}

type AvatarVariant = "comms" | "stage" | "bay";

function frameAvatar(B: any, camera: any, root: any, scene: any, variant: AvatarVariant) {
  if (!root) return;
  root.computeWorldMatrix(true);
  const first = hierarchyBounds(root);
  const height = Math.max(first.max.y - first.min.y, 0.01);
  root.scaling.scaleInPlace(1.62 / height);

  const head = findBone(scene, /(^|:)head$/i);
  if (head) {
    const forward = boneDirection(B, head.bone, head.mesh, B.Axis.Z).normalize();
    if (B.Vector3.Dot(forward, new B.Vector3(0, 0, 1)) < 0) root.rotation.y += Math.PI;
  }

  root.computeWorldMatrix(true);
  const planted = hierarchyBounds(root);
  root.position.x += -(planted.min.x + planted.max.x) / 2;
  root.position.z += -(planted.min.z + planted.max.z) / 2;
  root.position.y += 0.06 - planted.min.y;

  scene.render();
  stabilizeMeshes(geometryMeshes(root, scene));

  const framed = hierarchyBounds(root);
  const body = Math.max(framed.max.y - framed.min.y, 0.01);
  const wide = variant === "stage" || variant === "bay";
  const target = head
    ? boneWorld(B, head.bone, head.mesh).add(new B.Vector3(wide ? 0.16 : 0, wide ? -body * 0.32 : body * 0.042, wide ? 0.12 : 0))
    : new B.Vector3(
        (framed.min.x + framed.max.x) / 2,
        framed.min.y + body * (wide ? 0.48 : 0.86),
        (framed.min.z + framed.max.z) / 2,
      );

  camera.minZ = 0.01;
  camera.maxZ = 80;
  camera.setTarget(target);
  camera.alpha = wide ? Math.PI / 2 + 0.42 : Math.PI / 2;
  camera.beta = wide ? 1.02 : 1.18;
  camera.lowerBetaLimit = wide ? 0.62 : 0.85;
  camera.upperBetaLimit = 1.45;
  camera.radius = Math.max(wide ? 2.35 : 0.55, body * (wide ? 1.95 : 0.42));
  camera.lowerRadiusLimit = wide ? 1.35 : 0.36;
  camera.upperRadiusLimit = Math.max(wide ? 5.4 : 1.8, camera.radius * 2.6);
  camera.wheelPrecision = 120;
}

function playIdle(result: any) {
  const animations = result.animationGroups ?? [];
  const skip = /t[-_]?pose|bind|samba|a[-_]?pose/i;
  for (const group of animations) group.stop?.();
  const idle = animations.find((item: { name: string }) => /idle|rest|breath|stand/i.test(item.name) && !skip.test(item.name));
  if (idle) {
    idle.start(true);
    return true;
  }
  return false;
}

type Limb = { bone: any; mesh: any; node: any; bindQ: any };

function captureLimb(B: any, scene: any, pattern: RegExp): Limb | null {
  const slot = findBone(scene, pattern);
  if (!slot?.bone) return null;
  const node = typeof slot.bone.getTransformNode === "function" ? slot.bone.getTransformNode() : null;
  let bindQ = node?.rotationQuaternion?.clone();
  if (!bindQ && node?.rotation) bindQ = B.Quaternion.FromEulerVector(node.rotation);
  if (!bindQ && typeof slot.bone.getRotationQuaternion === "function") {
    bindQ = slot.bone.getRotationQuaternion(B.Space.LOCAL, slot.mesh)?.clone();
  }
  return { bone: slot.bone, mesh: slot.mesh, node, bindQ: bindQ ?? B.Quaternion.Identity() };
}

function poseLimb(B: any, limb: Limb | null, ax: number, ay: number, az: number) {
  if (!limb) return;
  const q = limb.bindQ.clone();
  if (az) q.multiplyInPlace(B.Quaternion.RotationAxis(B.Axis.Z, az));
  if (ax) q.multiplyInPlace(B.Quaternion.RotationAxis(B.Axis.X, ax));
  if (ay) q.multiplyInPlace(B.Quaternion.RotationAxis(B.Axis.Y, ay));
  if (limb.node) {
    limb.node.rotationQuaternion = q;
    limb.node.computeWorldMatrix?.(true);
    return;
  }
  if (typeof limb.bone.setRotationQuaternion === "function") {
    limb.bone.setRotationQuaternion(q, B.Space.LOCAL, limb.mesh);
  }
}

type AxisPose = { ax: number; ay: number; az: number };
export type BodyPose = "rest" | "operate" | "point" | "farmAura";

function handPoint(B: any, scene: any, handPattern: RegExp) {
  const hand = findBone(scene, handPattern);
  if (!hand?.bone || !hand.mesh) return null;
  return hand.bone.getPosition(B.Space.WORLD, hand.mesh);
}

function scoreClearance(p: { x: number; y: number; z: number }, elbow: { x: number; y: number; z: number } | null) {
  const throughBelly = Math.max(0, 0.26 - Math.abs(p.x));
  const elbowTuck = elbow ? Math.max(0, 0.28 - Math.abs(elbow.x)) * 2.8 : 0;
  return p.y + throughBelly * 3.4 + elbowTuck;
}

function scoreOperate(p: { x: number; y: number; z: number }, elbow: { x: number; y: number; z: number } | null) {
  const throughBelly = Math.max(0, 0.22 - Math.abs(p.x));
  const elbowTuck = elbow ? Math.max(0, 0.3 - Math.abs(elbow.x)) * 4.2 : 0;
  return Math.abs(p.y - 0.97) * 0.7 + Math.max(0, 0.36 - p.z) * 2.6 + throughBelly * 3.2 + elbowTuck;
}

function pickAxes(
  B: any,
  scene: any,
  arm: Limb | null,
  handPattern: RegExp,
  candidates: AxisPose[],
  score: (hand: { x: number; y: number; z: number }, elbow: { x: number; y: number; z: number } | null) => number,
  fallback: AxisPose,
  elbowPattern?: RegExp,
) {
  if (!arm?.node) return fallback;
  let best = fallback;
  let bestScore = Number.POSITIVE_INFINITY;
  for (const candidate of candidates) {
    poseLimb(B, arm, candidate.ax, candidate.ay, candidate.az);
    scene.render();
    const hand = handPoint(B, scene, handPattern);
    if (!hand) continue;
    const elbow = handPoint(B, scene, elbowPattern ?? limbPattern("Left", "ForeArm"));
    const value = score(hand, elbow);
    if (value < bestScore) {
      bestScore = value;
      best = candidate;
    }
  }
  poseLimb(B, arm, 0, 0, 0);
  return best;
}

function calibrateHang(B: any, scene: any, arm: Limb | null, handPattern: RegExp, elbowPattern?: RegExp) {
  return pickAxes(
    B,
    scene,
    arm,
    handPattern,
    [
      { ax: 1.52, ay: 0, az: 0 },
      { ax: -1.52, ay: 0, az: 0 },
      { ax: 0, ay: 0, az: 1.52 },
      { ax: 0, ay: 0, az: -1.52 },
    ],
    (p) => p.y,
    { ax: 1.52, ay: 0, az: 0 },
    elbowPattern,
  );
}

function withOffsets(base: AxisPose, extras: AxisPose[]) {
  return extras.map((extra) => ({
    ax: base.ax + extra.ax,
    ay: base.ay + extra.ay,
    az: base.az + extra.az,
  }));
}

function createBodyDriver(B: any, scene: any) {
  const leftArm = captureLimb(B, scene, limbPattern("Left", "Arm"));
  const rightArm = captureLimb(B, scene, limbPattern("Right", "Arm"));
  const leftFore = captureLimb(B, scene, limbPattern("Left", "ForeArm"));
  const rightFore = captureLimb(B, scene, limbPattern("Right", "ForeArm"));
  const leftShoulder = captureLimb(B, scene, limbPattern("Left", "Shoulder"));
  const rightShoulder = captureLimb(B, scene, limbPattern("Right", "Shoulder"));
  const leftHand = captureLimb(B, scene, limbPattern("Left", "Hand"));
  const rightHand = captureLimb(B, scene, limbPattern("Right", "Hand"));
  const head = captureLimb(B, scene, /(^|:)Head$/i);
  const spine = captureLimb(B, scene, /(^|:)Spine2$/i);
  const hips = captureLimb(B, scene, /(^|:)Hips$/i) || captureLimb(B, scene, /(^|:)Spine$/i);
  const leftHandPat = limbPattern("Left", "Hand");
  const rightHandPat = limbPattern("Right", "Hand");
  const leftForePat = limbPattern("Left", "ForeArm");
  const rightForePat = limbPattern("Right", "ForeArm");

  const hangL = calibrateHang(B, scene, leftArm, leftHandPat, leftForePat);
  const hangR = calibrateHang(B, scene, rightArm, rightHandPat, rightForePat);
  const restOffsets: AxisPose[] = [
    { ax: 0, ay: 0, az: 0 },
    { ax: -0.08, ay: 0.32, az: 0 },
    { ax: -0.08, ay: -0.32, az: 0 },
    { ax: 0.06, ay: 0, az: 0.28 },
    { ax: 0.06, ay: 0, az: -0.28 },
    { ax: -0.14, ay: 0.22, az: 0.18 },
    { ax: -0.14, ay: -0.22, az: -0.18 },
  ];
  const restL = pickAxes(B, scene, leftArm, leftHandPat, withOffsets(hangL, restOffsets), scoreClearance, hangL, leftForePat);
  const restR = pickAxes(B, scene, rightArm, rightHandPat, withOffsets(hangR, restOffsets), scoreClearance, hangR, rightForePat);
  const operateOffsets: AxisPose[] = [
    { ax: -0.42, ay: 0.18, az: 0.35 },
    { ax: -0.42, ay: -0.18, az: -0.35 },
    { ax: -0.55, ay: 0.28, az: 0.12 },
    { ax: -0.55, ay: -0.28, az: -0.12 },
    { ax: -0.28, ay: 0.4, az: 0 },
    { ax: -0.28, ay: -0.4, az: 0 },
    { ax: -0.62, ay: 0, az: 0.45 },
    { ax: -0.62, ay: 0, az: -0.45 },
    { ax: -0.75, ay: 0.22, az: 0.55 },
    { ax: -0.75, ay: -0.22, az: -0.55 },
    { ax: -0.9, ay: 0.12, az: 0.7 },
    { ax: -0.9, ay: -0.12, az: -0.7 },
  ];
  const operateExtras: AxisPose[] = [
    { ax: 0.35, ay: 1.15, az: 0.1 },
    { ax: 0.35, ay: -1.15, az: -0.1 },
    { ax: 0.55, ay: 1.0, az: 0.18 },
    { ax: 0.55, ay: -1.0, az: -0.18 },
    { ax: 0.22, ay: 1.32, az: 0 },
    { ax: 0.22, ay: -1.32, az: 0 },
    { ax: 0.7, ay: 0.85, az: 0.25 },
    { ax: 0.7, ay: -0.85, az: -0.25 },
  ];
  const operateL = pickAxes(
    B,
    scene,
    leftArm,
    leftHandPat,
    [...withOffsets(hangL, operateOffsets), ...operateExtras],
    scoreOperate,
    restL,
    leftForePat,
  );
  const operateR = pickAxes(
    B,
    scene,
    rightArm,
    rightHandPat,
    [...withOffsets(hangR, operateOffsets), ...operateExtras],
    scoreOperate,
    restR,
    rightForePat,
  );

  const elbowRestL = {
    ax: hangL.ax ? -Math.sign(hangL.ax) * 0.38 : 0,
    az: hangL.az ? -Math.sign(hangL.az) * 0.38 : 0,
  };
  const elbowRestR = {
    ax: hangR.ax ? -Math.sign(hangR.ax) * 0.38 : 0,
    az: hangR.az ? -Math.sign(hangR.az) * 0.38 : 0,
  };
  const elbowOperateL = {
    ax: hangL.ax ? -Math.sign(hangL.ax) * 0.72 : -0.72,
    az: hangL.az ? -Math.sign(hangL.az) * 0.18 : 0.12,
  };
  const elbowOperateR = {
    ax: hangR.ax ? -Math.sign(hangR.ax) * 0.72 : -0.72,
    az: hangR.az ? -Math.sign(hangR.az) * 0.18 : 0.12,
  };

  let pose: BodyPose = "operate";
  let mixPoint = 0;
  let mixOperate = 1;
  let mixFarm = 0;

  const lerp = (a: AxisPose, b: AxisPose, t: number): AxisPose => ({
    ax: a.ax + (b.ax - a.ax) * t,
    ay: a.ay + (b.ay - a.ay) * t,
    az: a.az + (b.az - a.az) * t,
  });

  const observer = scene.onBeforeRenderObservable.add(() => {
    mixPoint += ((pose === "point" ? 1 : 0) - mixPoint) * 0.14;
    mixOperate += ((pose === "operate" ? 1 : 0) - mixOperate) * 0.12;
    mixFarm += ((pose === "farmAura" ? 1 : 0) - mixFarm) * 0.1;
    if (mixFarm > 0.12) {
      const cycle = (performance.now() / 2400) % 1;
      const sway = Math.sin(cycle * Math.PI * 2) * 0.18 * mixFarm;
      const phase = cycle < 1 / 3 ? 0 : cycle < 2 / 3 ? 1 : 2;
      const local = cycle < 1 / 3 ? cycle * 3 : cycle < 2 / 3 ? (cycle - 1 / 3) * 3 : (cycle - 2 / 3) * 3;
      poseLimb(B, hips, 0, sway, 0);
      poseLimb(B, spine, 0.05 * mixFarm, sway * 0.55, 0);
      poseLimb(B, head, 0.04 * mixFarm, sway * 0.28, 0);
      poseLimb(B, leftShoulder, 0.1 * mixFarm, 0, 0.2 + sway * 0.12);
      poseLimb(B, rightShoulder, 0.1 * mixFarm, 0, -(0.2 + sway * 0.12));
      if (phase === 0) {
        poseLimb(B, leftArm, hangL.ax - 0.85 * mixFarm, hangL.ay + 0.38 * mixFarm, hangL.az + 0.42 * mixFarm);
        poseLimb(B, rightArm, hangR.ax + 0.18 * mixFarm, hangR.ay - 0.16 * mixFarm, hangR.az - 0.95 * mixFarm);
        poseLimb(B, leftFore, -0.42 * mixFarm, 0, 0);
        poseLimb(B, rightFore, -1.15 * mixFarm, 0, 0.28 * mixFarm);
        poseLimb(B, leftHand, 0.15 * mixFarm, 0, 0);
        poseLimb(B, rightHand, 0.1 * mixFarm, 0, 0);
      } else if (phase === 1) {
        const roll = local * Math.PI * 2;
        poseLimb(B, leftArm, hangL.ax - 0.42 * mixFarm, hangL.ay + (0.55 + Math.sin(roll) * 0.35) * mixFarm, hangL.az + 0.22 * mixFarm);
        poseLimb(B, rightArm, hangR.ax - 0.42 * mixFarm, hangR.ay - (0.55 + Math.sin(roll + Math.PI) * 0.35) * mixFarm, hangR.az - 0.22 * mixFarm);
        poseLimb(B, leftFore, -0.82 * mixFarm, 0, Math.cos(roll) * 0.5 * mixFarm);
        poseLimb(B, rightFore, -0.82 * mixFarm, 0, -Math.cos(roll) * 0.5 * mixFarm);
        poseLimb(B, leftHand, Math.sin(roll) * 0.65 * mixFarm, 0, 0);
        poseLimb(B, rightHand, Math.sin(roll + Math.PI) * 0.65 * mixFarm, 0, 0);
      } else {
        poseLimb(B, leftArm, hangL.ax - 0.72 * mixFarm, hangL.ay + 0.88 * mixFarm, hangL.az + 0.14 * mixFarm);
        poseLimb(B, rightArm, hangR.ax + 0.12 * mixFarm, hangR.ay - 0.92 * mixFarm, hangR.az - 0.38 * mixFarm);
        poseLimb(B, leftFore, -0.22 * mixFarm, 0, 0);
        poseLimb(B, rightFore, -0.18 * mixFarm, 0, 0);
        poseLimb(B, leftHand, 0.12 * mixFarm, 0, 0);
        poseLimb(B, rightHand, 0.12 * mixFarm, 0, 0);
      }
      return;
    }
    const reach = lerp(restL, operateL, mixOperate);
    const reachR = lerp(restR, operateR, mixOperate);
    const type = mixOperate * Math.sin(performance.now() / 140) * 0.045;
    poseLimb(B, hips, 0, 0, 0);
    poseLimb(B, spine, mixOperate * 0.08, 0, 0);
    poseLimb(B, head, mixOperate * 0.18 - mixPoint * 0.08, mixPoint * 0.22, 0);
    poseLimb(B, leftShoulder, 0.02 + mixOperate * 0.12, 0, 0.16 + mixOperate * 0.12);
    poseLimb(B, rightShoulder, 0.02 + mixOperate * 0.12, 0, -(0.16 + mixOperate * 0.12));
    poseLimb(B, leftArm, reach.ax, reach.ay, reach.az);
    poseLimb(
      B,
      rightArm,
      reachR.ax * (1 - mixPoint * 0.78),
      reachR.ay,
      reachR.az * (1 - mixPoint * 0.35),
    );
    poseLimb(B, leftFore, elbowRestL.ax + (elbowOperateL.ax - elbowRestL.ax) * mixOperate, 0, elbowRestL.az);
    poseLimb(
      B,
      rightFore,
      elbowRestR.ax + (elbowOperateR.ax - elbowRestR.ax) * mixOperate + type + mixPoint * 0.2,
      0,
      elbowRestR.az,
    );
    poseLimb(B, leftHand, mixOperate * 0.2, 0, 0);
    poseLimb(B, rightHand, mixOperate * 0.2, 0, 0);
  });

  return {
    setPose(next: BodyPose) {
      pose = next;
    },
    dispose() {
      scene.onBeforeRenderObservable.remove(observer);
    },
  };
}

function createHeadset(B: any, scene: any, accentHex: string) {
  const head = findBone(scene, /(^|:)Head$/i);
  if (!head?.bone) return null;

  const root = new B.TransformNode("comms-headset", scene);
  const shell = new B.StandardMaterial("headset-shell", scene);
  shell.diffuseColor = new B.Color3(0.04, 0.05, 0.07);
  shell.specularColor = new B.Color3(0.25, 0.28, 0.32);
  const glow = new B.StandardMaterial("headset-glow", scene);
  glow.diffuseColor = B.Color3.FromHexString(accentHex);
  glow.emissiveColor = B.Color3.FromHexString(accentHex).scale(0.35);

  const band = B.MeshBuilder.CreateTorus("hs-band", { diameter: 0.18, thickness: 0.014, tessellation: 28 }, scene);
  band.rotation.x = Math.PI / 2;
  band.position.y = 0.04;
  band.parent = root;
  band.material = shell;

  const cup = B.MeshBuilder.CreateCylinder("hs-cup-l", { diameter: 0.058, height: 0.03, tessellation: 18 }, scene);
  cup.rotation.z = Math.PI / 2;
  cup.position.set(-0.09, 0.02, 0.01);
  cup.parent = root;
  cup.material = shell;
  const cupR = cup.clone("hs-cup-r");
  cupR.position.x = 0.09;

  const boom = B.MeshBuilder.CreateCylinder("hs-boom", { diameter: 0.006, height: 0.1, tessellation: 8 }, scene);
  boom.rotation.z = 0.95;
  boom.position.set(-0.065, -0.03, 0.04);
  boom.parent = root;
  boom.material = shell;

  const mic = B.MeshBuilder.CreateSphere("hs-mic", { diameter: 0.018, segments: 10 }, scene);
  mic.position.set(-0.03, -0.07, 0.058);
  mic.parent = root;
  mic.material = glow;

  for (const mesh of [band, cup, cupR, boom, mic]) {
    mesh.isPickable = false;
    mesh.alwaysSelectAsActiveMesh = true;
  }

  if (typeof root.attachToBone === "function" && head.mesh) root.attachToBone(head.bone, head.mesh);
  else root.parent = head.bone.getTransformNode?.() ?? head.mesh;
  root.position = new B.Vector3(0, 0.072, 0.018);
  root.scaling.setAll(1);
  root.setEnabled(false);

  return {
    setWorn(on: boolean) {
      root.setEnabled(on);
    },
    setLive(on: boolean) {
      glow.emissiveColor = B.Color3.FromHexString(accentHex).scale(on ? 1 : 0.28);
    },
    dispose() {
      root.dispose();
    },
  };
}

function collectMorphs(meshes: any[]) {
  const byName = new Map<string, any[]>();
  for (const mesh of meshes) {
    const manager = mesh.morphTargetManager;
    if (!manager) continue;
    for (let i = 0; i < manager.numTargets; i += 1) {
      const target = manager.getTarget(i);
      const key = normalizeVisemeName(target.name);
      const list = byName.get(key) ?? [];
      list.push(target);
      byName.set(key, list);
    }
  }
  return byName;
}

function setMorph(morphs: Map<string, any[]>, names: string[], value: number) {
  for (const name of names) {
    for (const target of morphs.get(name) ?? []) target.influence = value;
  }
}

function createLipDriver(scene: any, root: any) {
  const morphs = collectMorphs(geometryMeshes(root, scene));
  const speechNames = [...morphs.keys()].filter((name) => isSpeechMorph(name));
  if (!speechNames.length) return null;

  let track: ReturnType<typeof textToVisemes> = [];
  let startedAt = 0;
  let speaking = false;
  let blinkUntil = 0;
  let nextBlink = performance.now() + 2200;

  const restFace = () => {
    for (const name of speechNames) setMorph(morphs, [name], 0);
    setMorph(morphs, ["mouthsmile", "mouthsmileleft", "mouthsmileright"], 0.08);
  };
  restFace();

  const observer = scene.onBeforeRenderObservable.add(() => {
    const now = performance.now();
    if (now >= nextBlink) {
      blinkUntil = now + 140;
      nextBlink = now + 2400 + Math.random() * 2200;
    }
    setMorph(morphs, ["eyeblinkleft", "eyeblinkright", "eyesclosed"], now < blinkUntil ? 1 : 0);
    if (!speaking) return;
    const elapsed = now - startedAt;
    const pose = visemeAt(track, elapsed);
    const active = new Set(visemeMorphKeys(pose.viseme));
    for (const name of speechNames) {
      if (name === "mouthopen" || name === "jawopen") {
        setMorph(morphs, [name], pose.openness * (name === "jawopen" ? 0.45 : 0.35));
        continue;
      }
      setMorph(morphs, [name], active.has(name) ? Math.min(1, pose.openness + 0.35) : 0);
    }
    if (elapsed > (track.at(-1)?.endMs ?? 0) + 160) {
      speaking = false;
      restFace();
    }
  });

  return {
    speak(text: string, durationMs?: number) {
      const raw = textToVisemes(text, SPEECH_RATE);
      track = durationMs ? fitVisemesToDuration(raw, durationMs) : raw;
      startedAt = performance.now();
      speaking = track.length > 0;
      if (!speaking) restFace();
    },
    stop() {
      speaking = false;
      restFace();
    },
    dispose() {
      speaking = false;
      scene.onBeforeRenderObservable.remove(observer);
    },
  };
}

function tintOutfit(B: any, meshes: any[], accentHex: string) {
  const accent = B.Color3.FromHexString(accentHex);
  for (const mesh of meshes) {
    if (!/outfit|top|shirt|body|cloth|jacket|armor|bottom|hair/i.test(String(mesh.name || ""))) continue;
    const materials = [mesh.material, ...(mesh.material?.subMaterials || [])].filter(Boolean);
    for (const mat of materials) {
      if (mat.albedoColor) mat.albedoColor = mat.albedoColor.scale(0.62).addInPlace(accent.scale(0.38));
      else if (mat.diffuseColor) mat.diffuseColor = mat.diffuseColor.scale(0.62).addInPlace(accent.scale(0.38));
      if (mat.emissiveColor) mat.emissiveColor = accent.scale(0.1);
    }
  }
}

async function firstExisting(urls: string[]) {
  for (const url of urls) {
    if (url.startsWith("http")) return url;
    const ok = await fetch(url, { method: "HEAD" }).then((response) => response.ok).catch(() => false);
    if (ok) return url;
  }
  return urls.at(-1) ?? null;
}

export function AgentAvatar({
  agentId,
  speech = null,
  speaking = false,
  variant = "comms",
  gesture = "operate",
  headset = false,
  headsetLive = false,
  checks = [],
}: {
  agentId: string;
  speech?: SpeechCue | null;
  speaking?: boolean;
  variant?: AvatarVariant;
  gesture?: BodyPose;
  headset?: boolean;
  headsetLive?: boolean;
  checks?: OpsCheck[];
}) {
  const { t, line, locale } = useSpatialI18n();
  const rig = agentRig(agentId);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const lipsRef = useRef<ReturnType<typeof createLipDriver> | null>(null);
  const armsRef = useRef<ReturnType<typeof createBodyDriver> | null>(null);
  const stationRef = useRef<ReturnType<typeof createAgentStation> | null>(null);
  const headsetRef = useRef<ReturnType<typeof createHeadset> | null>(null);
  const pendingRef = useRef<SpeechCue | null>(null);
  const gestureRef = useRef(gesture);
  gestureRef.current = gesture;
  const headsetOnRef = useRef(headset);
  headsetOnRef.current = headset;
  const headsetLiveRef = useRef(headsetLive);
  headsetLiveRef.current = headsetLive;
  const checksRef = useRef(checks);
  checksRef.current = checks;
  const i18nRef = useRef({ t, line, locale });
  i18nRef.current = { t, line, locale };
  const paintBoardRef = useRef<(items: OpsCheck[]) => void>(() => {});
  paintBoardRef.current = (items) => {
    const station = stationRef.current;
    if (!station) return;
    const copy = boardCopy(rig.id);
    const { t: tr, line: ln } = i18nRef.current;
    station.setChecks(
      items.map((item) => ({ ...item, label: ln(item.label) })),
      { title: tr(copy.title), formulas: copy.formulas.map((item) => tr(item)) },
    );
  };
  const [state, setState] = useState("Loading 3D double…");

  useEffect(() => {
    let engine: any;
    let scene: any;
    let disposed = false;
    let onResize: (() => void) | undefined;
    let observer: ResizeObserver | null = null;

    const boot = async () => {
      try {
        const B = await ensureBabylon();
        if (disposed || !canvasRef.current) return;

        engine = new B.Engine(canvasRef.current, true, {
          preserveDrawingBuffer: true,
          stencil: true,
          adaptToDeviceRatio: true,
        });
        scene = new B.Scene(engine);
        scene.clearColor = new B.Color4(0.005, 0.008, 0.018, 0);
        scene.skipFrustumClipping = true;

        const camera = new B.ArcRotateCamera("agent-cam", Math.PI / 2, 1.42, 2.35, new B.Vector3(0, 1.18, 0), scene);
        camera.panningSensibility = 0;
        if (variant === "stage" || variant === "bay") camera.attachControl(canvasRef.current, true);
        if (variant === "bay") {
          engine.setHardwareScalingLevel(1.35);
          camera.inputs?.removeByType?.("ArcRotateCameraMouseWheelInput");
        }

        const hemi = new B.HemisphericLight("agent-hemi", new B.Vector3(0, 1, 0), scene);
        hemi.intensity = variant === "comms" ? 1.15 : 0.72;
        const key = new B.PointLight("agent-key", new B.Vector3(1.6, 2.4, -1.4), scene);
        key.intensity = variant === "comms" ? 16 : 4.2;
        key.diffuse = B.Color3.FromHexString(rig.accent);
        const rim = new B.PointLight("agent-rim", new B.Vector3(-1.6, 1.8, 1.2), scene);
        rim.intensity = variant === "comms" ? 10 : 2.8;
        rim.diffuse = B.Color3.FromHexString("#f3ba2f");

        if (variant === "comms") {
          const platform = B.MeshBuilder.CreateCylinder("agent-platform", { diameter: 1.55, height: 0.08, tessellation: 64 }, scene);
          platform.position.y = 0.02;
          const pm = new B.StandardMaterial("agent-platform-mat", scene);
          pm.diffuseColor = new B.Color3(0.015, 0.025, 0.05);
          pm.emissiveColor = B.Color3.FromHexString(rig.accent).scale(0.08);
          platform.material = pm;
        } else {
          stationRef.current = createAgentStation(B, scene, rig.id, rig.accent);
          stationRef.current.setLive(headsetLiveRef.current);
          paintBoardRef.current(checksRef.current);
          const fill = new B.PointLight("ops-fill", new B.Vector3(0.35, 2.2, 1.7), scene);
          fill.intensity = 5.5;
          fill.diffuse = new B.Color3(0.75, 0.82, 0.95);
        }

        const importGlb = async (url: string) => {
          const slash = url.lastIndexOf("/");
          return withTimeout(
            B.SceneLoader.ImportMeshAsync("", url.slice(0, slash + 1), url.slice(slash + 1), scene),
            LOAD_MS,
            `Timed out loading ${url}`,
          );
        };

        const source = await firstExisting(rig.sources);
        if (!source || disposed) {
          if (!disposed) setState("3D double missing");
          return;
        }

        const result = await importGlb(source);
        if (disposed) return;
        frameAvatar(B, camera, result.meshes?.[0], scene, variant);
        tintOutfit(B, geometryMeshes(result.meshes?.[0], null), rig.accent);
        playIdle(result);
        armsRef.current = createBodyDriver(B, scene);
        armsRef.current.setPose(gestureRef.current);
        headsetRef.current = createHeadset(B, scene, rig.accent);
        headsetRef.current?.setWorn(headsetOnRef.current);
        headsetRef.current?.setLive(headsetLiveRef.current);
        lipsRef.current = createLipDriver(scene, result.meshes?.[0]);
        setState(lipsRef.current
          ? `${rig.name} · ${rig.sourceLabel}`
          : `${rig.name} · no visemes`);
        if (pendingRef.current?.text && pendingRef.current.agentId === rig.id) {
          lipsRef.current?.speak(pendingRef.current.text, pendingRef.current.durationMs);
        }

        engine.runRenderLoop(() => scene?.render());
        onResize = () => engine?.resize();
        window.addEventListener("resize", onResize);
        const canvas = canvasRef.current;
        if (canvas && typeof ResizeObserver !== "undefined") {
          observer = new ResizeObserver(() => engine?.resize());
          observer.observe(canvas);
        }
      } catch (error) {
        console.error(error);
        if (!disposed) setState("Avatar runtime unavailable");
      }
    };

    void boot();
    return () => {
      disposed = true;
      lipsRef.current?.dispose();
      lipsRef.current = null;
      armsRef.current?.dispose();
      armsRef.current = null;
      stationRef.current?.dispose();
      stationRef.current = null;
      headsetRef.current?.dispose();
      headsetRef.current = null;
      observer?.disconnect();
      if (onResize) window.removeEventListener("resize", onResize);
      scene?.dispose();
      engine?.dispose();
    };
  }, [rig.accent, rig.id, rig.name, rig.sourceLabel, rig.sources, variant]);

  useEffect(() => {
    armsRef.current?.setPose(gesture);
  }, [gesture]);

  useEffect(() => {
    headsetRef.current?.setWorn(headset);
  }, [headset]);

  useEffect(() => {
    headsetRef.current?.setLive(headsetLive || speaking);
    stationRef.current?.setLive(headsetLive || speaking);
  }, [headsetLive, speaking]);

  useEffect(() => {
    const station = stationRef.current;
    if (!station) return;
    const copy = boardCopy(rig.id);
    station.setChecks(
      checks.map((item) => ({ ...item, label: line(item.label) })),
      { title: t(copy.title), formulas: copy.formulas.map((item) => t(item)) },
    );
  }, [checks, line, rig.id, t]);

  useEffect(() => {
    pendingRef.current = speaking ? speech : null;
    if (!speaking || !speech?.text || speech.agentId !== rig.id) {
      lipsRef.current?.stop();
      return;
    }
    lipsRef.current?.speak(speech.text, speech.durationMs);
    if (lipsRef.current) setState(`${rig.name} speaking · visemes`);
  }, [rig.id, rig.name, speaking, speech]);

  return (
    <div className={`agent-avatar-stage is-${variant}`} style={{ ["--agent-accent" as string]: rig.accent }}>
      <canvas ref={canvasRef} aria-label={`${rig.name}, ${rig.role}`} />
      {state.startsWith("Loading") || /missing|unavailable|no visemes/i.test(state) ? (
        <div className="agent-avatar-status"><i /> {state.startsWith("Loading") ? t("Loading 3D double…") : /missing/i.test(state) ? t("3D double missing") : /unavailable/i.test(state) ? t("Avatar runtime unavailable") : state}</div>
      ) : null}
      <div className="agent-avatar-label">
        <b>{rig.name}</b>
        <span>{rig.role}</span>
      </div>
    </div>
  );
}

export function KaiAvatarPreview({ speech = null }: { speech?: { id: number; text: string } | null }) {
  const cue = speech ? { id: speech.id, agentId: "scout", text: speech.text } : null;
  return <AgentAvatar agentId="scout" speech={cue} speaking={Boolean(speech?.text)} />;
}
