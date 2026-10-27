"use client";

import React, { useEffect, useRef, useState, useMemo } from "react";
import initialActivityData from "@/data/activity.json";
import type * as THREE_TYPES from "three";

// Pinned CDN Three.js URL
const THREE_CDN_URL = "https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js";

// Weights specified in config
const WEIGHTS = {
  gh: 1,
  lc: 2,
  ig: 6,
};

type LayerFilter = "ALL" | "GITHUB" | "LEETCODE" | "INSTAGRAM";

interface DayData {
  gh: number;
  lc: number;
  ig: number;
}

interface ActivityPayload {
  updated: string;
  days: Record<string, DayData>;
}

interface GridCellInfo {
  cellIndex: number;
  col: number; // 0..52 (or 0..25 on mobile)
  row: number; // 0..6
  dateStr: string | null;
  dayData: DayData;
  score: number;
  noise: number;
}

// 5 Light theme greens by level + zero neutral
const GREEN_RAMP = ["#b7efc5", "#6fd68a", "#2fb457", "#17833d", "#0b5a2a"];
const GREEN_ZERO = "#dcebe1";

// Amber ramp for LeetCode
const AMBER_RAMP = ["#ffe3a0", "#ffc94d", "#f5a000", "#c77700", "#8a4b00"];
const AMBER_ZERO = "#f1e6d0";

// Pink ramp for Instagram
const PINK_RAMP = ["#ffcfe2", "#ff8fbd", "#f2478f", "#c4175f", "#7e0e3d"];
const PINK_ZERO = "#f3dde6";

// Deterministic hash of date string (0..1)
function getDateNoise(dateStr: string): number {
  let hash = 2166136261;
  for (let i = 0; i < dateStr.length; i++) {
    hash ^= dateStr.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (Math.abs(hash) % 1000) / 1000;
}

function computeQuantiles(values: number[]): [number, number, number, number] {
  const active = values.filter((v) => v > 0).sort((a, b) => a - b);
  if (active.length === 0) return [1, 2, 3, 4];
  const q = (p: number) => {
    const idx = Math.min(active.length - 1, Math.floor(active.length * p));
    return active[idx];
  };
  return [q(0.2), q(0.4), q(0.6), q(0.8)];
}

function isWebGLSupported(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const canvas = document.createElement("canvas");
    return Boolean(
      window.WebGLRenderingContext &&
        (canvas.getContext("webgl") || canvas.getContext("experimental-webgl"))
    );
  } catch {
    return false;
  }
}

function loadThreeScript(): Promise<typeof THREE_TYPES> {
  if (typeof window === "undefined") return Promise.reject(new Error("SSR"));
  const win = window as unknown as { THREE?: typeof THREE_TYPES };
  if (win.THREE) return Promise.resolve(win.THREE);

  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${THREE_CDN_URL}"]`);
    if (existing) {
      if (win.THREE) resolve(win.THREE);
      else {
        existing.addEventListener("load", () => {
          if (win.THREE) resolve(win.THREE);
          else reject(new Error("THREE not found"));
        });
        existing.addEventListener("error", reject);
      }
      return;
    }

    const script = document.createElement("script");
    script.src = THREE_CDN_URL;
    script.async = true;
    script.onload = () => {
      if (win.THREE) resolve(win.THREE);
      else reject(new Error("THREE missing after load"));
    };
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

export const ActivityCity: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [activity, setActivity] = useState<ActivityPayload>(
    initialActivityData as unknown as ActivityPayload
  );
  const [activeLayer, setActiveLayer] = useState<LayerFilter>("ALL");
  const [hoveredCell, setHoveredCell] = useState<{
    dateStr: string;
    gh: number;
    lc: number;
    ig: number;
    score: number;
    x: number;
    y: number;
  } | null>(null);

  // Tallest bar callout state
  const [callout, setCallout] = useState<{
    x: number;
    y: number;
    date: string;
    label: string;
    visible: boolean;
  } | null>(null);

  const [isDraggingState, setIsDraggingState] = useState(false);
  const [webglAvailable, setWebglAvailable] = useState<boolean>(true);
  const [isMobile, setIsMobile] = useState<boolean>(false);

  // Active layer ref for animation loop
  const activeLayerRef = useRef<LayerFilter>(activeLayer);
  useEffect(() => {
    activeLayerRef.current = activeLayer;
  }, [activeLayer]);

  // Window resize check for mobile mode (26 weeks)
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Fetch latest activity.json cache-busting with updated timestamp
  useEffect(() => {
    let isMounted = true;
    const fetchLatest = async () => {
      try {
        const bust = initialActivityData?.updated
          ? encodeURIComponent(initialActivityData.updated)
          : Date.now();
        const res = await fetch(`/data/activity.json?v=${bust}`);
        if (res.ok && isMounted) {
          const json: ActivityPayload = await res.json();
          if (json && json.days) setActivity(json);
        }
      } catch {
        // Keep initial bundled data
      }
    };
    fetchLatest();
    return () => {
      isMounted = false;
    };
  }, []);

  // Process data for 53 (desktop) or 26 (mobile) weeks
  const { cells, daysList, biggestDay, postedToday, totalWeeks } = useMemo(() => {
    const rawDays = activity?.days || {};
    const sortedDateKeys = Object.keys(rawDays).sort();
    const days = sortedDateKeys.map((key) => ({
      date: key,
      ...rawDays[key],
    }));

    // Find overall biggest day
    let maxScore = 0;
    let maxDate = days[days.length - 1]?.date || "";
    for (const d of days) {
      const s = d.gh * WEIGHTS.gh + d.lc * WEIGHTS.lc + d.ig * WEIGHTS.ig;
      if (s > maxScore) {
        maxScore = s;
        maxDate = d.date;
      }
    }

    const todayDay = days[days.length - 1];
    const isPostedToday = (todayDay?.ig || 0) > 0;

    const weeksCount = isMobile ? 26 : 53;
    const todayDateObj = todayDay ? new Date(todayDay.date + "T12:00:00") : new Date();
    const todayWeekday = todayDateObj.getDay(); // 0 = Sun, 6 = Sat
    const todayCellIndex = (weeksCount - 1) * 7 + todayWeekday;

    const totalGridSlots = weeksCount * 7;
    const gridCells: GridCellInfo[] = [];

    for (let c = 0; c < totalGridSlots; c++) {
      const col = Math.floor(c / 7);
      const row = c % 7;
      const offsetFromToday = todayCellIndex - c;
      const dayIdx = days.length - 1 - offsetFromToday;

      if (dayIdx >= 0 && dayIdx < days.length) {
        const item = days[dayIdx];
        const score = item.gh * WEIGHTS.gh + item.lc * WEIGHTS.lc + item.ig * WEIGHTS.ig;
        gridCells.push({
          cellIndex: c,
          col,
          row,
          dateStr: item.date,
          dayData: { gh: item.gh, lc: item.lc, ig: item.ig },
          score,
          noise: getDateNoise(item.date),
        });
      } else {
        gridCells.push({
          cellIndex: c,
          col,
          row,
          dateStr: null,
          dayData: { gh: 0, lc: 0, ig: 0 },
          score: 0,
          noise: getDateNoise(`pad-${c}`),
        });
      }
    }

    return {
      cells: gridCells,
      daysList: days,
      biggestDay: { max: maxScore, date: maxDate },
      postedToday: isPostedToday,
      totalWeeks: weeksCount,
    };
  }, [activity, isMobile]);

  // Format readable date
  const formatReadableDate = (dateString: string) => {
    if (!dateString) return "";
    try {
      const [y, m, d] = dateString.split("-").map(Number);
      const date = new Date(y, m - 1, d);
      return new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }).format(date);
    } catch {
      return dateString;
    }
  };

  const resetCameraRef = useRef<(() => void) | null>(null);

  // 3D LIGHT ISOMETRIC SKYLINE IMPLEMENTATION
  useEffect(() => {
    if (!isWebGLSupported()) {
      setWebglAvailable(false);
      return;
    }

    let isDestroyed = false;
    let animationFrameId: number;
    let renderer: THREE_TYPES.WebGLRenderer | null = null;
    let scene: THREE_TYPES.Scene | null = null;
    let camera: THREE_TYPES.PerspectiveCamera | null = null;

    const geometriesToDispose: THREE_TYPES.BufferGeometry[] = [];
    const materialsToDispose: THREE_TYPES.Material[] = [];

    loadThreeScript().then((THREE) => {
      if (isDestroyed || !containerRef.current || !canvasRef.current) return;

      const container = containerRef.current;
      const canvas = canvasRef.current;

      const width = container.clientWidth;
      const height = container.clientHeight;

      // 1. Scene with near-white background #f4f4f2
      scene = new THREE.Scene();
      scene.background = new THREE.Color("#f4f4f2");

      // 2. Camera: Perspective FOV 14 (near-orthographic)
      // Elevation 32deg, Azimuth -12deg
      const aspect = width / height;
      camera = new THREE.PerspectiveCamera(14, aspect, 0.1, 1000);

      // 3. Grid Geometry Settings
      // Tile footprint is 1 wide x 1.5 deep (gap 0.03)
      const TILE_W = 1.0;
      const TILE_D = 1.5;
      const GAP = 0.03;
      const STEP_X = TILE_W + GAP; // 1.03
      const STEP_Z = TILE_D + GAP; // 1.53
      const WEEKS = totalWeeks;
      const BLOCK_WIDTH = WEEKS * STEP_X;
      const BLOCK_DEPTH = 7 * STEP_Z;
      const TOTAL_SLOTS = WEEKS * 7;

      // Base Angles
      const BASE_ELEVATION = 32 * (Math.PI / 180); // 32 deg
      const BASE_AZIMUTH = -12 * (Math.PI / 180); // -12 deg

      let targetAzimuth = BASE_AZIMUTH;
      let currentAzimuth = BASE_AZIMUTH;
      let targetElevation = BASE_ELEVATION;
      let currentElevation = BASE_ELEVATION;

      // Tallest bar height = ~22% of block width
      const H_BASE = 0.22 * BLOCK_WIDTH;

      // Auto-fit function: computes bounding box and fits it to 92% of width and ~80% of height
      const computeAutoFitDistance = (tallestH: number, camAspect: number) => {
        const vFovRad = (14 * Math.PI) / 180;
        const halfWidth = BLOCK_WIDTH / 2 + TILE_W / 2;
        const halfDepth = BLOCK_DEPTH / 2 + TILE_D / 2;

        const corners: THREE_TYPES.Vector3[] = [];
        for (const dx of [-halfWidth, halfWidth]) {
          for (const dz of [-halfDepth, halfDepth]) {
            for (const dy of [-0.25, tallestH]) {
              corners.push(new THREE.Vector3(dx, dy, dz));
            }
          }
        }

        const phi = BASE_AZIMUTH;
        const theta = BASE_ELEVATION;
        const forward = new THREE.Vector3(
          -Math.sin(phi) * Math.cos(theta),
          -Math.sin(theta),
          -Math.cos(phi) * Math.cos(theta)
        ).normalize();
        const right = new THREE.Vector3(Math.cos(phi), 0, -Math.sin(phi)).normalize();
        const up = new THREE.Vector3().crossVectors(right, forward).normalize();

        const lookAtY = tallestH * 0.42;
        const center = new THREE.Vector3(0, lookAtY, 0);

        let maxDistX = 0;
        let maxDistY = 0;

        for (const pt of corners) {
          const v = new THREE.Vector3().subVectors(pt, center);
          const xCam = v.dot(right);
          const yCam = v.dot(up);
          const zCam = v.dot(forward);

          const dX = zCam + Math.abs(xCam) / (0.92 * Math.tan(vFovRad / 2) * camAspect);
          const dY = zCam + Math.abs(yCam) / (0.80 * Math.tan(vFovRad / 2));

          if (dX > maxDistX) maxDistX = dX;
          if (dY > maxDistY) maxDistY = dY;
        }

        const fitDist = Math.max(maxDistX, maxDistY);
        return { fitDist, lookAtY };
      };

      let { fitDist: defaultDist, lookAtY: currentLookAtY } = computeAutoFitDistance(H_BASE, aspect);
      let targetDist = defaultDist;
      let currentDist = defaultDist;

      const defaultLookAt = new THREE.Vector3(0, currentLookAtY, 0);
      const targetLookAt = defaultLookAt.clone();
      const currentLookAt = defaultLookAt.clone();

      // 4. Renderer with PCFSoftShadowMap
      renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: false,
        powerPreference: "high-performance",
      });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;

      // 5. Lighting: Upper-left key light elevation ~55deg + ambient 0.55
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.55);
      scene.add(ambientLight);

      // Key light at elevation ~55deg, upper-left so top is lightest, left is mid, right is darkest
      const keyLight = new THREE.DirectionalLight(0xffffff, 0.75);
      keyLight.position.set(-30, 48, 20);
      keyLight.castShadow = true;
      keyLight.shadow.mapSize.width = 2048;
      keyLight.shadow.mapSize.height = 2048;
      keyLight.shadow.camera.near = 10;
      keyLight.shadow.camera.far = 160;
      keyLight.shadow.camera.left = -BLOCK_WIDTH * 0.9;
      keyLight.shadow.camera.right = BLOCK_WIDTH * 0.9;
      keyLight.shadow.camera.top = BLOCK_WIDTH * 0.9;
      keyLight.shadow.camera.bottom = -BLOCK_WIDTH * 0.9;
      keyLight.shadow.bias = -0.0004;
      keyLight.shadow.radius = 6;
      scene.add(keyLight);

      const fillLight = new THREE.DirectionalLight(0xffffff, 0.22);
      fillLight.position.set(25, 20, 15);
      scene.add(fillLight);

      // 6. Base Plate: 0.25 tall, #e9e9e4, 0.5 tile margin around block
      const marginX = 0.5 * STEP_X;
      const marginZ = 0.5 * STEP_Z;
      const plateWidth = BLOCK_WIDTH + 2 * marginX;
      const plateDepth = BLOCK_DEPTH + 2 * marginZ;

      const plateGeo = new THREE.BoxGeometry(plateWidth, 0.25, plateDepth);
      geometriesToDispose.push(plateGeo);
      const plateMat = new THREE.MeshLambertMaterial({
        color: 0xe9e9e4,
      });
      materialsToDispose.push(plateMat);
      const plateMesh = new THREE.Mesh(plateGeo, plateMat);
      plateMesh.position.set(0, -0.125, 0);
      plateMesh.receiveShadow = true;
      scene.add(plateMesh);

      // ShadowMaterial ground plane (opacity 0.10)
      const shadowGeo = new THREE.PlaneGeometry(plateWidth + 4, plateDepth + 4);
      geometriesToDispose.push(shadowGeo);
      const shadowMat = new THREE.ShadowMaterial({ opacity: 0.1 });
      materialsToDispose.push(shadowMat);
      const shadowPlane = new THREE.Mesh(shadowGeo, shadowMat);
      shadowPlane.rotation.x = -Math.PI / 2;
      shadowPlane.position.y = -0.251;
      shadowPlane.receiveShadow = true;
      scene.add(shadowPlane);

      // 7. Bars InstancedMesh (1 wide x 1.5 deep)
      const barGeo = new THREE.BoxGeometry(TILE_W, 1, TILE_D);
      geometriesToDispose.push(barGeo);
      const barMat = new THREE.MeshLambertMaterial({
        color: 0xffffff,
      });
      materialsToDispose.push(barMat);
      const instancedBars = new THREE.InstancedMesh(barGeo, barMat, TOTAL_SLOTS);
      instancedBars.castShadow = true;
      instancedBars.receiveShadow = true;
      scene.add(instancedBars);

      // 8. Caps for ALL layer (Amber cap for LeetCode, Pink cap for Instagram)
      const capMatAmber = new THREE.MeshLambertMaterial({ color: 0xf5a000 });
      materialsToDispose.push(capMatAmber);
      const capMeshAmber = new THREE.InstancedMesh(barGeo, capMatAmber, TOTAL_SLOTS);
      capMeshAmber.castShadow = true;
      scene.add(capMeshAmber);

      const capMatPink = new THREE.MeshLambertMaterial({ color: 0xf2478f });
      materialsToDispose.push(capMatPink);
      const capMeshPink = new THREE.InstancedMesh(barGeo, capMatPink, TOTAL_SLOTS);
      capMeshPink.castShadow = true;
      scene.add(capMeshPink);

      // 9. Height and Quantile Calculation
      const getCountsForLayer = (layer: LayerFilter) => {
        return cells.map((c) => {
          if (!c.dateStr) return 0;
          if (layer === "ALL") {
            return c.dayData.gh * WEIGHTS.gh + c.dayData.lc * WEIGHTS.lc + c.dayData.ig * WEIGHTS.ig;
          }
          if (layer === "GITHUB") return c.dayData.gh;
          if (layer === "LEETCODE") return c.dayData.lc;
          return c.dayData.ig;
        });
      };

      const computeHeightsAndColors = (layer: LayerFilter) => {
        const counts = getCountsForLayer(layer);
        const maxCount = Math.max(...counts, 1);
        const quantiles = computeQuantiles(counts);

        const targetH = new Float32Array(TOTAL_SLOTS);
        const targetC: THREE_TYPES.Color[] = [];
        const H = H_BASE;

        const colorRamp =
          layer === "LEETCODE" ? AMBER_RAMP : layer === "INSTAGRAM" ? PINK_RAMP : GREEN_RAMP;
        const zeroHex =
          layer === "LEETCODE" ? AMBER_ZERO : layer === "INSTAGRAM" ? PINK_ZERO : GREEN_ZERO;

        for (let i = 0; i < TOTAL_SLOTS; i++) {
          const count = counts[i];
          const cell = cells[i];
          const noise = cell.noise;

          let h = 0.15;
          let baseHex = zeroHex;

          if (layer === "INSTAGRAM") {
            // Stepped heights: 1 post = 0.45H, 2 = 0.70H, 3+ = H. Zero = zero day.
            if (count === 0) {
              h = H * (0.06 + 0.06 * noise);
              baseHex = zeroHex;
            } else if (count === 1) {
              h = 0.45 * H;
              baseHex = colorRamp[1];
            } else if (count === 2) {
              h = 0.7 * H;
              baseHex = colorRamp[2];
            } else {
              h = 1.0 * H;
              baseHex = colorRamp[4];
            }
          } else {
            // Active day: h = H * (0.18 + 0.82 * sqrt(count / maxCount))
            // Zero day: h = H * (0.06 + 0.06 * noise)
            if (count > 0) {
              h = H * (0.18 + 0.82 * Math.sqrt(count / maxCount));

              // 5 levels by quantile
              if (count <= quantiles[0]) baseHex = colorRamp[0];
              else if (count <= quantiles[1]) baseHex = colorRamp[1];
              else if (count <= quantiles[2]) baseHex = colorRamp[2];
              else if (count <= quantiles[3]) baseHex = colorRamp[3];
              else baseHex = colorRamp[4];
            } else {
              h = H * (0.06 + 0.06 * noise);
              baseHex = zeroHex;
            }
          }

          targetH[i] = h;

          // Per-bar lightness variation +-3%
          const col = new THREE.Color(baseHex);
          const jitter = ((i * 37) % 7 - 3) / 100;
          col.offsetHSL(0, 0, jitter);
          targetC.push(col);
        }

        return { heights: targetH, colors: targetC, maxCount };
      };

      // State arrays for 400ms smooth transition
      let currentLayerMode = activeLayerRef.current;
      let computed = computeHeightsAndColors(currentLayerMode);
      let activeH = computed.heights;
      let activeC = computed.colors;

      let fromH = new Float32Array(activeH);
      let toH = new Float32Array(activeH);
      let fromC = activeC.map((c) => c.clone());
      let toC = activeC.map((c) => c.clone());

      let layerTransitionStartTime = performance.now();
      const TRANSITION_DURATION = 400; // 400ms transition

      // Find tallest day in current layer
      const getTallestDayIndex = (layer: LayerFilter) => {
        const counts = getCountsForLayer(layer);
        let maxVal = -1;
        let maxIdx = 0;
        for (let i = 0; i < counts.length; i++) {
          if (counts[i] > maxVal) {
            maxVal = counts[i];
            maxIdx = i;
          }
        }
        return { index: maxIdx, val: maxVal };
      };

      let currentTallest = getTallestDayIndex(currentLayerMode);

      // Today's marker dot
      const todayCell = cells.find((c) => c.dateStr === daysList[daysList.length - 1]?.date);
      const todayCol = todayCell?.col ?? WEEKS - 1;
      const todayRow = todayCell?.row ?? 3;
      const todayX = (todayCol - (WEEKS - 1) / 2) * STEP_X;
      const todayZ = (todayRow - 3) * STEP_Z;

      const dotGeo = new THREE.SphereGeometry(0.18, 16, 16);
      geometriesToDispose.push(dotGeo);
      const dotMat = new THREE.MeshBasicMaterial({
        color: postedToday ? 0xec4899 : 0x777777,
      });
      materialsToDispose.push(dotMat);
      const todayDotMesh = new THREE.Mesh(dotGeo, dotMat);
      todayDotMesh.position.set(todayX, 1, todayZ);
      scene.add(todayDotMesh);

      // Intro animation
      const prefersReducedMotion =
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const introStartTime = performance.now();
      let introPhase: "rise" | "zoom" | "hold" | "return" | "done" = prefersReducedMotion
        ? "done"
        : "rise";

      // Pointer interactions
      const dummy = new THREE.Object3D();
      const capDummy = new THREE.Object3D();
      const raycaster = new THREE.Raycaster();
      const pointerNDC = new THREE.Vector2(-999, -999);
      let isDragging = false;
      let prevPointerX = 0;
      let prevPointerY = 0;
      let hoveredIndex: number | null = null;

      const handlePointerMove = (e: PointerEvent) => {
        const rect = canvas.getBoundingClientRect();
        pointerNDC.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        pointerNDC.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

        if (isDragging) {
          const deltaX = e.clientX - prevPointerX;
          const deltaY = e.clientY - prevPointerY;
          prevPointerX = e.clientX;
          prevPointerY = e.clientY;

          targetAzimuth += deltaX * 0.005;
          const MAX_AZ_OFFSET = 25 * (Math.PI / 180);
          targetAzimuth = Math.max(
            BASE_AZIMUTH - MAX_AZ_OFFSET,
            Math.min(BASE_AZIMUTH + MAX_AZ_OFFSET, targetAzimuth)
          );

          targetElevation -= deltaY * 0.004;
          targetElevation = Math.max(0.2, Math.min(0.85, targetElevation));
        }

        // Raycasting for hover tooltip
        if (camera) {
          raycaster.setFromCamera(pointerNDC, camera);
          const hits = raycaster.intersectObject(instancedBars);
          if (hits.length > 0 && hits[0].instanceId !== undefined) {
            const id = hits[0].instanceId;
            const cell = cells[id];
            if (cell && cell.dateStr) {
              hoveredIndex = id;
              setHoveredCell({
                dateStr: cell.dateStr,
                gh: cell.dayData.gh,
                lc: cell.dayData.lc,
                ig: cell.dayData.ig,
                score: cell.score,
                x: e.clientX,
                y: e.clientY,
              });
              return;
            }
          }
        }

        hoveredIndex = null;
        setHoveredCell(null);
      };

      const handlePointerDown = (e: PointerEvent) => {
        isDragging = true;
        setIsDraggingState(true);
        prevPointerX = e.clientX;
        prevPointerY = e.clientY;
      };

      const handlePointerUp = () => {
        isDragging = false;
        setIsDraggingState(false);
      };

      const handlePointerLeave = () => {
        isDragging = false;
        setIsDraggingState(false);
        hoveredIndex = null;
        setHoveredCell(null);
        pointerNDC.set(-999, -999);
      };

      const handleDoubleClick = () => {
        targetAzimuth = BASE_AZIMUTH;
        targetElevation = BASE_ELEVATION;
        targetDist = defaultDist;
        targetLookAt.copy(defaultLookAt);
      };

      resetCameraRef.current = () => {
        targetAzimuth = BASE_AZIMUTH;
        targetElevation = BASE_ELEVATION;
        targetDist = defaultDist;
        targetLookAt.copy(defaultLookAt);
      };

      canvas.addEventListener("pointermove", handlePointerMove);
      canvas.addEventListener("pointerdown", handlePointerDown);
      window.addEventListener("pointerup", handlePointerUp);
      canvas.addEventListener("pointerleave", handlePointerLeave);
      canvas.addEventListener("dblclick", handleDoubleClick);

      // Auto-fit on resize
      const handleResize = () => {
        if (!containerRef.current || !renderer || !camera) return;
        const w = containerRef.current.clientWidth;
        const h = containerRef.current.clientHeight;
        const newAspect = w / h;
        camera.aspect = newAspect;

        const fit = computeAutoFitDistance(H_BASE, newAspect);
        defaultDist = fit.fitDist;
        defaultLookAt.y = fit.lookAtY;

        if (introPhase === "done") {
          targetDist = defaultDist;
          targetLookAt.y = fit.lookAtY;
        }

        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      };

      const resizeObserver = new ResizeObserver(handleResize);
      resizeObserver.observe(container);

      // Visibility handling
      let isTabVisible = true;
      const handleVisibilityChange = () => {
        isTabVisible = !document.hidden;
      };
      document.addEventListener("visibilitychange", handleVisibilityChange);

      // Render loop
      const render = () => {
        if (isDestroyed) return;
        animationFrameId = requestAnimationFrame(render);
        if (!isTabVisible || !renderer || !scene || !camera) return;

        const now = performance.now();
        const elapsedSec = (now - introStartTime) / 1000;

        // Layer change detection and auto-fit refit
        if (activeLayerRef.current !== currentLayerMode) {
          currentLayerMode = activeLayerRef.current;
          currentTallest = getTallestDayIndex(currentLayerMode);
          const next = computeHeightsAndColors(currentLayerMode);
          fromH = new Float32Array(activeH);
          toH = next.heights;
          fromC = activeC.map((c) => c.clone());
          toC = next.colors;
          layerTransitionStartTime = now;

          const fit = computeAutoFitDistance(H_BASE, camera.aspect);
          defaultDist = fit.fitDist;
          defaultLookAt.y = fit.lookAtY;
          if (introPhase === "done") {
            targetDist = defaultDist;
            targetLookAt.y = fit.lookAtY;
          }
        }

        // 400ms Layer transition
        const layerT = Math.min(1, (now - layerTransitionStartTime) / TRANSITION_DURATION);
        const layerEase = layerT * layerT * (3 - 2 * layerT);
        for (let i = 0; i < TOTAL_SLOTS; i++) {
          activeH[i] = fromH[i] + (toH[i] - fromH[i]) * layerEase;
          activeC[i] = fromC[i].clone().lerp(toC[i], layerEase);
        }

        // Tallest day world position for intro zoom & callout
        const tCell = cells[currentTallest.index];
        const tCol = tCell?.col ?? Math.floor(WEEKS / 2);
        const tRow = tCell?.row ?? 3;
        const tallestWorldX = (tCol - (WEEKS - 1) / 2) * STEP_X;
        const tallestWorldZ = (tRow - 3) * STEP_Z;
        const tallestWorldH = activeH[currentTallest.index] || H_BASE;

        // Intro Camera Sequence:
        // Bars rise front row to back row, left to right (~2.5s ease-out)
        // Camera eases toward biggest day, holds 1.5s, returns
        if (introPhase !== "done") {
          if (elapsedSec < 2.5) {
            introPhase = "rise";
          } else if (elapsedSec < 3.4) {
            introPhase = "zoom";
            targetLookAt.set(tallestWorldX, tallestWorldH * 0.5, tallestWorldZ);
            targetDist = defaultDist * 0.65;
          } else if (elapsedSec < 4.9) {
            introPhase = "hold";
          } else if (elapsedSec < 6.2) {
            introPhase = "return";
            targetLookAt.copy(defaultLookAt);
            targetDist = defaultDist;
          } else {
            introPhase = "done";
            targetLookAt.copy(defaultLookAt);
            targetDist = defaultDist;
          }
        }

        // Camera interpolation
        currentAzimuth += (targetAzimuth - currentAzimuth) * 0.08;
        currentElevation += (targetElevation - currentElevation) * 0.08;
        currentDist += (targetDist - currentDist) * 0.06;
        currentLookAt.lerp(targetLookAt, 0.06);

        camera.position.x =
          currentLookAt.x + Math.sin(currentAzimuth) * Math.cos(currentElevation) * currentDist;
        camera.position.y = currentLookAt.y + Math.sin(currentElevation) * currentDist;
        camera.position.z =
          currentLookAt.z + Math.cos(currentAzimuth) * Math.cos(currentElevation) * currentDist;
        camera.lookAt(currentLookAt);

        // Update InstancedMesh Bars
        let todayBarHeight = 0.15;
        const CAP_H = 0.12 * H_BASE;

        for (let i = 0; i < TOTAL_SLOTS; i++) {
          const col = Math.floor(i / 7);
          const row = i % 7;
          const x = (col - (WEEKS - 1) / 2) * STEP_X;
          const z = (row - 3) * STEP_Z;
          const cell = cells[i];

          // Intro Stagger: front to back, left to right
          let introProgress = 1;
          if (introPhase === "rise") {
            const frontToBack = row / 6;
            const leftToRight = col / (WEEKS - 1);
            const delay = frontToBack * 0.6 + leftToRight * 0.4;
            const t = Math.max(0, Math.min(1, (elapsedSec - delay * 1.0) / 1.5));
            introProgress = 1 - Math.pow(1 - t, 3);
          }

          let h = activeH[i] * introProgress;
          h = Math.max(0.04, h);

          // Hover lift (+0.12 units in Y)
          const isHovered = hoveredIndex === i;
          const lift = isHovered ? 0.12 : 0;

          dummy.position.set(x, h / 2 + lift, z);
          dummy.scale.set(1, h, 1);
          dummy.updateMatrix();
          instancedBars.setMatrixAt(i, dummy.matrix);
          instancedBars.setColorAt(i, activeC[i]);

          // ALL layer caps:
          // If Instagram post -> pink cap (0.12H).
          // Else if LeetCode -> amber cap (0.12H).
          if (currentLayerMode === "ALL" && cell && cell.dateStr && introProgress > 0.5) {
            if (cell.dayData.ig > 0) {
              capDummy.position.set(x, h + CAP_H / 2 + lift, z);
              capDummy.scale.set(1, CAP_H, 1);
              capDummy.updateMatrix();
              capMeshPink.setMatrixAt(i, capDummy.matrix);

              capDummy.scale.set(0, 0, 0);
              capDummy.updateMatrix();
              capMeshAmber.setMatrixAt(i, capDummy.matrix);
            } else if (cell.dayData.lc > 0) {
              capDummy.position.set(x, h + CAP_H / 2 + lift, z);
              capDummy.scale.set(1, CAP_H, 1);
              capDummy.updateMatrix();
              capMeshAmber.setMatrixAt(i, capDummy.matrix);

              capDummy.scale.set(0, 0, 0);
              capDummy.updateMatrix();
              capMeshPink.setMatrixAt(i, capDummy.matrix);
            } else {
              capDummy.scale.set(0, 0, 0);
              capDummy.updateMatrix();
              capMeshAmber.setMatrixAt(i, capDummy.matrix);
              capMeshPink.setMatrixAt(i, capDummy.matrix);
            }
          } else {
            capDummy.scale.set(0, 0, 0);
            capDummy.updateMatrix();
            capMeshAmber.setMatrixAt(i, capDummy.matrix);
            capMeshPink.setMatrixAt(i, capDummy.matrix);
          }

          if (i === todayCell?.cellIndex) {
            todayBarHeight = h + lift;
          }
        }

        instancedBars.instanceMatrix.needsUpdate = true;
        if (instancedBars.instanceColor) instancedBars.instanceColor.needsUpdate = true;
        capMeshAmber.instanceMatrix.needsUpdate = true;
        capMeshPink.instanceMatrix.needsUpdate = true;

        // Position today's marker dot
        todayDotMesh.position.set(todayX, todayBarHeight + 0.35, todayZ);

        // Project Callout for the tallest bar in current layer
        if (tCell && tCell.dateStr && introPhase === "done") {
          const capExtra =
            currentLayerMode === "ALL" && (tCell.dayData.ig > 0 || tCell.dayData.lc > 0)
              ? CAP_H
              : 0;
          const pos = new THREE.Vector3(tallestWorldX, tallestWorldH + capExtra, tallestWorldZ);
          pos.project(camera);

          const w = containerRef.current?.clientWidth || width;
          const h = containerRef.current?.clientHeight || height;

          const screenX = (pos.x * 0.5 + 0.5) * w;
          const screenY = (-pos.y * 0.5 + 0.5) * h;

          // Clamp callout inside canvas boundaries
          const clampedX = Math.max(70, Math.min(w - 70, screenX));
          const clampedY = Math.max(30, Math.min(h - 30, screenY));

          const unitLabel =
            currentLayerMode === "INSTAGRAM"
              ? `${currentTallest.val} posts`
              : currentLayerMode === "LEETCODE"
              ? `${currentTallest.val} solved`
              : currentLayerMode === "GITHUB"
              ? `${currentTallest.val} commits`
              : `${currentTallest.val} score`;

          setCallout({
            x: clampedX,
            y: clampedY,
            date: formatReadableDate(tCell.dateStr),
            label: unitLabel,
            visible: true,
          });
        } else if (introPhase !== "done") {
          setCallout(null);
        }

        renderer.render(scene, camera);
      };

      render();

      return () => {
        isDestroyed = true;
        cancelAnimationFrame(animationFrameId);
        resizeObserver.disconnect();
        document.removeEventListener("visibilitychange", handleVisibilityChange);

        canvas.removeEventListener("pointermove", handlePointerMove);
        canvas.removeEventListener("pointerdown", handlePointerDown);
        window.removeEventListener("pointerup", handlePointerUp);
        canvas.removeEventListener("pointerleave", handlePointerLeave);
        canvas.removeEventListener("dblclick", handleDoubleClick);

        geometriesToDispose.forEach((g) => g.dispose());
        materialsToDispose.forEach((m) => m.dispose());
        if (renderer) renderer.dispose();
      };
    });

    return () => {
      isDestroyed = true;
      cancelAnimationFrame(animationFrameId);
    };
  }, [cells, daysList, isMobile, totalWeeks, postedToday]);

  return (
    <section
      id="links"
      className="relative w-full h-[100dvh] bg-[#f4f4f2] text-[#1a1a1a] flex flex-col justify-between overflow-hidden p-4 sm:p-6 lg:p-7 select-none"
      aria-label="3D Activity City Skyline"
    >
      {/* TOP BAR: Title & Links (Top-Left), Caption (Top-Right) */}
      <header className="w-full flex flex-col sm:flex-row items-start sm:items-start justify-between gap-4 z-20 pointer-events-auto flex-none">
        {/* Top-Left: Small serif title "As a city" (~36px) + 3 tiny text pills (13px) */}
        <div className="flex flex-col items-start gap-2.5">
          <h2
            className="text-[32px] sm:text-[36px] font-normal leading-none tracking-tight text-[#1a1a1a]"
            style={{ fontFamily: "'Instrument Serif', Georgia, serif" }}
          >
            As a city
          </h2>

          {/* 3 tiny text pills (GitHub, Instagram, LinkedIn) 13px, minimal outline style */}
          <nav aria-label="Profiles" className="flex items-center gap-2 mt-0.5">
            <a
              href="https://github.com/shwetankrai12"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1 rounded-full text-[13px] font-sans border border-[#d4d4d0] text-[#555] hover:text-[#111] hover:border-[#888] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#111] transition-colors"
            >
              GitHub ↗
            </a>
            <a
              href="https://instagram.com/shwetdaily"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1 rounded-full text-[13px] font-sans border border-[#d4d4d0] text-[#555] hover:text-[#111] hover:border-[#888] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#111] transition-colors"
            >
              Instagram ↗
            </a>
            <a
              href="https://linkedin.com/in/shwetankrai12"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1 rounded-full text-[13px] font-sans border border-[#d4d4d0] text-[#555] hover:text-[#111] hover:border-[#888] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#111] transition-colors"
            >
              LinkedIn ↗
            </a>
          </nav>
        </div>

        {/* Top-Right: Tiny 13px caption (max-width 420px, #55554f) */}
        <p className="hidden sm:block text-[13px] font-mono text-[#55554f] max-w-[420px] text-right leading-relaxed">
          Every day becomes a building, as tall as that day&apos;s commits. The city rises front to
          back, then zooms to my biggest day:{" "}
          <strong className="text-[#1a1a1a] font-medium">{biggestDay.max}</strong> on{" "}
          <strong className="text-[#1a1a1a] font-medium">
            {formatReadableDate(biggestDay.date)}
          </strong>
          .
        </p>
      </header>

      {/* 3D SCENE AREA (Canvas height = 100dvh minus header minus footer, flex-1, no dead white space) */}
      <div
        ref={containerRef}
        className="relative w-full flex-1 my-1 overflow-hidden touch-none cursor-grab active:cursor-grabbing min-h-0"
      >
        {webglAvailable ? (
          <canvas ref={canvasRef} className="w-full h-full block" />
        ) : (
          /* SVG Fallback */
          <div className="w-full h-full flex flex-col items-center justify-center p-4">
            <svg viewBox="0 0 850 140" className="w-full max-w-4xl h-auto">
              {cells.map((c) => {
                if (!c.dateStr) return null;
                const x = c.col * 16;
                const y = c.row * 16;
                const color = c.dayData.gh > 0 ? "#2fb457" : "#dcebe1";
                return (
                  <rect
                    key={c.cellIndex}
                    x={x}
                    y={y}
                    width={14}
                    height={14}
                    fill={color}
                  />
                );
              })}
            </svg>
          </div>
        )}

        {/* Tallest Bar Callout Badge on Leader Line */}
        {callout && callout.visible && (
          <div
            className={`pointer-events-none absolute z-30 transform -translate-x-1/2 -translate-y-full transition-opacity duration-200 ${
              isDraggingState ? "opacity-0" : "opacity-100"
            }`}
            style={{
              left: `${callout.x}px`,
              top: `${callout.y - 12}px`,
            }}
          >
            {/* Leader line and bottom dot */}
            <div className="flex flex-col items-center">
              <div className="px-2.5 py-1 rounded bg-[#1a1a1a] text-[#f4f4f2] text-[11px] font-mono shadow-sm tracking-tight whitespace-nowrap">
                <span>{callout.date}</span>
                <span className="mx-1 text-[#888]">•</span>
                <span className="text-[#39FF14]">{callout.label}</span>
              </div>
              {/* Vertical leader line */}
              <div className="w-[1px] h-3 bg-[#1a1a1a]/40" />
              {/* Dot touching bar top */}
              <div className="w-1.5 h-1.5 rounded-full bg-[#1a1a1a]" />
            </div>
          </div>
        )}

        {/* Tooltip on Hover */}
        {hoveredCell && (
          <div
            className="pointer-events-none fixed z-50 transform -translate-x-1/2 -translate-y-full mb-3 px-3 py-2 rounded-md bg-white/95 backdrop-blur-sm border border-[#d8d8d4] shadow-md text-xs font-mono text-[#1a1a1a] min-w-[170px]"
            style={{
              left: `${hoveredCell.x}px`,
              top: `${hoveredCell.y}px`,
            }}
          >
            <div className="font-semibold text-[#1a1a1a] border-b border-[#e5e5e2] pb-1 mb-1">
              {formatReadableDate(hoveredCell.dateStr)}
            </div>
            <div className="space-y-0.5 text-[11px] text-[#444]">
              <div className="flex justify-between">
                <span>Commits:</span>
                <strong className="text-[#2fb457]">{hoveredCell.gh}</strong>
              </div>
              <div className="flex justify-between">
                <span>LeetCode:</span>
                <strong className="text-[#f5a000]">{hoveredCell.lc}</strong>
              </div>
              <div className="flex justify-between">
                <span>Posts:</span>
                <strong className="text-[#f2478f]">{hoveredCell.ig}</strong>
              </div>
              <div className="flex justify-between pt-1 border-t border-[#f0f0ec] text-[#666]">
                <span>Activity Score:</span>
                <strong>{hoveredCell.score}</strong>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* MOBILE CAPTION (Shown below scene on mobile 390x844) */}
      <p className="block sm:hidden text-[12px] font-mono text-[#55554f] leading-relaxed mb-2 flex-none">
        Every day becomes a building, as tall as that day&apos;s commits. The city rises front to
        back, then zooms to my biggest day:{" "}
        <strong className="text-[#1a1a1a] font-medium">{biggestDay.max}</strong> on{" "}
        <strong className="text-[#1a1a1a] font-medium">
          {formatReadableDate(biggestDay.date)}
        </strong>
        .
      </p>

      {/* BOTTOM BAR: Layer Tabs (Bottom-Left) & Reset Button (Bottom-Right) */}
      <footer className="w-full flex items-center justify-between gap-4 z-20 pointer-events-auto pt-2 border-t border-[#e2e2de] flex-none">
        {/* Layer toggle tabs: 12px with 0.08em tracking + active underline + legend */}
        <div className="flex items-center gap-4 sm:gap-6 text-[12px] font-mono tracking-[0.08em] overflow-x-auto no-scrollbar">
          {(["ALL", "GITHUB", "LEETCODE", "INSTAGRAM"] as LayerFilter[]).map((layer) => {
            const isActive = activeLayer === layer;
            return (
              <button
                key={layer}
                id={`tab-${layer.toLowerCase()}`}
                type="button"
                onClick={() => setActiveLayer(layer)}
                className={`transition-colors py-1 cursor-pointer whitespace-nowrap ${
                  isActive
                    ? "text-[#111] font-semibold border-b-2 border-[#111]"
                    : "text-[#777] hover:text-[#111]"
                }`}
              >
                {layer}
              </button>
            );
          })}

          {/* Tiny legend with 3 dots (commits / LeetCode / posts) in ALL layer */}
          {activeLayer === "ALL" && (
            <div className="flex items-center gap-3 text-[11px] font-mono tracking-normal text-[#666] border-l border-[#d4d4d0] pl-3 sm:pl-4 whitespace-nowrap">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#2fb457]" />
                Commits
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#f5a000]" />
                LeetCode
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#f2478f]" />
                Posts
              </span>
            </div>
          )}
        </div>

        {/* Small Reset Button bottom-right */}
        <button
          id="btn-reset"
          type="button"
          onClick={() => resetCameraRef.current?.()}
          className="text-xs font-mono text-[#666] hover:text-[#111] border border-[#d4d4d0] hover:border-[#888] px-3 py-1 rounded-full transition-colors cursor-pointer flex-none"
        >
          Reset
        </button>
      </footer>
    </section>
  );
};
