import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { Canvas, useThree, useLoader } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { ElectrodePosition } from "./useElectrodePositions";
import { ResolvedRegion } from "./useAllenCcfData";

// GLB meshes served from atlas.dandiarchive.org (GitHub Pages, CORS-enabled)
const MESH_BASE_URL = "https://atlas.dandiarchive.org/data/meshes";

const ROOT_STRUCTURE_ID = 997;

// Allen CCF approximate center (micrometers)
const BRAIN_CENTER: [number, number, number] = [6600, 4000, 5700];
const CAM_DIST = 20000;
const SIDE_PANEL_WIDTH = 180;

type ViewPreset =
  | "dorsal"
  | "ventral"
  | "anterior"
  | "posterior"
  | "left"
  | "right";

const VIEW_BUTTONS: { label: string; view: ViewPreset }[] = [
  { label: "D", view: "dorsal" },
  { label: "V", view: "ventral" },
  { label: "A", view: "anterior" },
  { label: "P", view: "posterior" },
  { label: "L", view: "left" },
  { label: "R", view: "right" },
];

const toolbarButtonStyle: React.CSSProperties = {
  width: 28,
  height: 28,
  border: "1px solid rgba(255,255,255,0.3)",
  borderRadius: 4,
  background: "rgba(26,26,46,0.8)",
  color: "#fff",
  cursor: "pointer",
  fontSize: 12,
  fontWeight: "bold",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

// Inject fullscreen CSS once at module level
let fullscreenStyleInjected = false;
function ensureFullscreenStyle() {
  if (fullscreenStyleInjected) return;
  const style = document.createElement("style");
  style.textContent = `
    .brain-mesh-scene-container:fullscreen {
      width: 100vw !important;
      height: 100vh !important;
    }
  `;
  document.head.appendChild(style);
  fullscreenStyleInjected = true;
}

// Camera controller that responds to view preset changes
function CameraController({
  viewPreset,
  onViewApplied,
}: {
  viewPreset: ViewPreset | null;
  onViewApplied: () => void;
}) {
  const { camera } = useThree();

  useEffect(() => {
    if (!viewPreset) return;
    const [cx, cy, cz] = BRAIN_CENTER;

    switch (viewPreset) {
      case "dorsal":
        camera.position.set(cx, cy - CAM_DIST, cz);
        camera.up.set(-1, 0, 0);
        break;
      case "ventral":
        camera.position.set(cx, cy + CAM_DIST, cz);
        camera.up.set(1, 0, 0);
        break;
      case "anterior":
        camera.position.set(cx - CAM_DIST, cy, cz);
        camera.up.set(0, -1, 0);
        break;
      case "posterior":
        camera.position.set(cx + CAM_DIST, cy, cz);
        camera.up.set(0, -1, 0);
        break;
      case "left":
        camera.position.set(cx, cy, cz - CAM_DIST);
        camera.up.set(0, -1, 0);
        break;
      case "right":
        camera.position.set(cx, cy, cz + CAM_DIST);
        camera.up.set(0, -1, 0);
        break;
    }
    camera.lookAt(cx, cy, cz);
    onViewApplied();
  }, [viewPreset, camera, onViewApplied]);

  return null;
}

// Component that loads and renders a GLB mesh.
// Must be used inside <React.Suspense> — useLoader throws a promise while loading.
function BrainMesh({
  structureId,
  color,
  opacity,
  isRoot,
}: {
  structureId: number;
  color: string;
  opacity: number;
  isRoot?: boolean;
}) {
  const url = `${MESH_BASE_URL}/${structureId}.glb`;
  const gltf = useLoader(GLTFLoader, url);

  const geometry = useMemo(() => {
    let geo: THREE.BufferGeometry | null = null;
    gltf.scene.traverse((child) => {
      if (!geo && (child as THREE.Mesh).isMesh) {
        geo = (child as THREE.Mesh).geometry;
      }
    });
    return geo;
  }, [gltf]);

  if (!geometry || opacity <= 0) return null;

  return (
    <mesh geometry={geometry}>
      <meshPhongMaterial
        color={color}
        transparent
        opacity={opacity}
        side={THREE.DoubleSide}
        depthWrite={isRoot ? false : true}
      />
    </mesh>
  );
}

// Component that renders electrode positions as points
function ElectrodePoints({
  positions,
  scale,
  opacity,
}: {
  positions: ElectrodePosition[];
  scale: number;
  opacity: number;
}) {
  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const coords = new Float32Array(positions.length * 3);
    for (let i = 0; i < positions.length; i++) {
      coords[i * 3] = positions[i].x * scale;
      coords[i * 3 + 1] = positions[i].y * scale;
      coords[i * 3 + 2] = positions[i].z * scale;
    }
    geo.setAttribute("position", new THREE.BufferAttribute(coords, 3));
    return geo;
  }, [positions, scale]);

  return (
    <points geometry={geometry}>
      <pointsMaterial
        color="#ff4466"
        size={150}
        sizeAttenuation
        transparent
        opacity={opacity}
      />
    </points>
  );
}

function SliderRow({
  label,
  value,
  max,
  onChange,
}: {
  label: string;
  value: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <span style={{ width: 60 }}>{label}</span>
      <input
        type="range"
        min={0}
        max={max}
        step={max / 100}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={{ width: 80, accentColor: "#6688cc" }}
      />
    </div>
  );
}

type BrainMeshSceneProps = {
  positions: ElectrodePosition[];
  regions: ResolvedRegion[];
  width: number;
  height: number;
};

const BrainMeshScene: React.FC<BrainMeshSceneProps> = ({
  positions,
  regions,
  width,
  height,
}) => {
  const [viewPreset, setViewPreset] = useState<ViewPreset | null>("anterior");
  const [meshErrors, setMeshErrors] = useState<Set<number>>(new Set());
  const [regionOpacity, setRegionOpacity] = useState(0.4);
  const [electrodeOpacity, setElectrodeOpacity] = useState(0.9);
  const [hiddenRegions, setHiddenRegions] = useState<Set<number>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);
  const controlsRef = useRef<any>(null); // eslint-disable-line @typescript-eslint/no-explicit-any

  useEffect(ensureFullscreenStyle, []);

  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      containerRef.current.requestFullscreen();
    }
  }, []);

  // Auto-detect coordinate units (micrometers vs 10um voxels)
  const scale = useMemo(() => {
    let maxVal = 0;
    for (const p of positions) {
      const ax = Math.abs(p.x), ay = Math.abs(p.y), az = Math.abs(p.z);
      if (ax > maxVal) maxVal = ax;
      if (ay > maxVal) maxVal = ay;
      if (az > maxVal) maxVal = az;
    }
    return maxVal > 100 && maxVal < 1500 ? 10 : 1;
  }, [positions]);

  const handleViewApplied = useCallback(() => {
    setViewPreset(null);
    if (controlsRef.current) {
      controlsRef.current.target.set(...BRAIN_CENTER);
      controlsRef.current.update();
    }
  }, []);

  const handleMeshError = useCallback((structureId: number) => {
    setMeshErrors((prev) => new Set(prev).add(structureId));
  }, []);

  const regionsWithMesh = useMemo(
    () =>
      regions.filter(
        (r) => r.hasMesh && !meshErrors.has(r.structureId),
      ),
    [regions, meshErrors],
  );

  const visibleRegions = useMemo(
    () => regionsWithMesh.filter((r) => !hiddenRegions.has(r.structureId)),
    [regionsWithMesh, hiddenRegions],
  );

  const toggleRegion = useCallback((structureId: number) => {
    setHiddenRegions((prev) => {
      const next = new Set(prev);
      if (next.has(structureId)) {
        next.delete(structureId);
      } else {
        next.add(structureId);
      }
      return next;
    });
  }, []);

  return (
    <div
      ref={containerRef}
      className="brain-mesh-scene-container"
      style={{
        display: "flex",
        width,
        height,
        background: "#1a1a2e",
      }}
    >
      {/* 3D Canvas */}
      <div style={{ position: "relative", flex: 1, height: "100%" }}>
        <Canvas
          camera={{
            position: [BRAIN_CENTER[0] - CAM_DIST, BRAIN_CENTER[1], BRAIN_CENTER[2]],
            up: [0, -1, 0],
            fov: 45,
            near: 1,
            far: 100000,
          }}
          style={{ background: "#1a1a2e" }}
          gl={{ antialias: true, alpha: true }}
        >
          <ambientLight intensity={0.6} />
          <directionalLight position={[10000, 10000, 10000]} intensity={0.8} />
          <directionalLight
            position={[-10000, -5000, -10000]}
            intensity={0.3}
          />

          <OrbitControls
            ref={controlsRef}
            enableDamping
            dampingFactor={0.1}
            rotateSpeed={0.8}
            zoomSpeed={1.2}
            target={BRAIN_CENTER}
          />

          <CameraController
            viewPreset={viewPreset}
            onViewApplied={handleViewApplied}
          />

          <React.Suspense fallback={null}>
            <BrainMesh
              structureId={ROOT_STRUCTURE_ID}
              color="#cccccc"
              opacity={0.25}
              isRoot
            />
            {visibleRegions.map((r) => (
              <ErrorBoundaryMesh
                key={r.structureId}
                structureId={r.structureId}
                color={r.color}
                opacity={regionOpacity}
                onError={handleMeshError}
              />
            ))}
          </React.Suspense>

          {electrodeOpacity > 0 && (
            <ElectrodePoints positions={positions} scale={scale} opacity={electrodeOpacity} />
          )}
        </Canvas>

        {/* View preset buttons + fullscreen */}
        <div
          style={{
            position: "absolute",
            top: 8,
            right: 8,
            display: "flex",
            gap: 4,
          }}
        >
          {VIEW_BUTTONS.map(({ label, view }) => (
            <button
              key={view}
              onClick={() => setViewPreset(view)}
              title={view.charAt(0).toUpperCase() + view.slice(1)}
              style={toolbarButtonStyle}
            >
              {label}
            </button>
          ))}
          <button
            onClick={toggleFullscreen}
            title="Fullscreen"
            style={{ ...toolbarButtonStyle, fontSize: 14 }}
          >
            {"\u26F6"}
          </button>
        </div>

        {/* Transparency sliders */}
        <div
          style={{
            position: "absolute",
            bottom: 8,
            left: 8,
            display: "flex",
            flexDirection: "column",
            gap: 4,
            background: "rgba(26,26,46,0.85)",
            padding: "6px 10px",
            borderRadius: 6,
            fontSize: 11,
            color: "#ccc",
          }}
        >
          <SliderRow label="Regions" value={regionOpacity} max={1} onChange={setRegionOpacity} />
          <SliderRow label="Electrodes" value={electrodeOpacity} max={1} onChange={setElectrodeOpacity} />
        </div>
      </div>

      {/* Side panel: brain region checkboxes */}
      <div
        style={{
          width: SIDE_PANEL_WIDTH,
          height: "100%",
          overflowY: "auto",
          background: "#1e1e30",
          borderLeft: "1px solid #333",
          padding: "8px 6px",
          fontSize: 12,
          color: "#ccc",
          boxSizing: "border-box",
        }}
      >
        <div style={{ fontWeight: "bold", marginBottom: 6, color: "#aaa" }}>
          Brain Regions
        </div>
        {regionsWithMesh.map((r) => (
          <label
            key={r.structureId}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              padding: "2px 0",
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={!hiddenRegions.has(r.structureId)}
              onChange={() => toggleRegion(r.structureId)}
              style={{ accentColor: r.color }}
            />
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: 2,
                background: r.color,
                flexShrink: 0,
              }}
            />
            <span
              style={{
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
              title={r.name}
            >
              {r.acronym}
            </span>
          </label>
        ))}
        {regionsWithMesh.length === 0 && (
          <div style={{ color: "#666", fontStyle: "italic" }}>
            No regions with meshes
          </div>
        )}
      </div>
    </div>
  );
};

// Wrapper that catches mesh loading errors gracefully
function ErrorBoundaryMesh({
  structureId,
  color,
  opacity,
  onError,
}: {
  structureId: number;
  color: string;
  opacity: number;
  onError: (id: number) => void;
}) {
  return (
    <ErrorBoundary structureId={structureId} onError={onError}>
      <BrainMesh structureId={structureId} color={color} opacity={opacity} />
    </ErrorBoundary>
  );
}

class ErrorBoundary extends React.Component<
  {
    structureId: number;
    onError: (id: number) => void;
    children: React.ReactNode;
  },
  { hasError: boolean }
> {
  constructor(props: {
    structureId: number;
    onError: (id: number) => void;
    children: React.ReactNode;
  }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch() {
    this.props.onError(this.props.structureId);
  }

  render() {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}

export default BrainMeshScene;
