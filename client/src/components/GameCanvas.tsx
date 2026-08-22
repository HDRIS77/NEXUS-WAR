/* Design: Atlas Operations — a transparent Babylon canvas adds operational grid motion without obscuring the atlas map. */
import { useEffect, useRef } from "react";
import { Engine } from "@babylonjs/core/Engines/engine";
import { Scene } from "@babylonjs/core/scene";
import { Color3, Color4 } from "@babylonjs/core/Maths/math.color";
import { ArcRotateCamera } from "@babylonjs/core/Cameras/arcRotateCamera";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";

export default function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mountedRef = useRef(false);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || mountedRef.current) return;
    mountedRef.current = true;
    const engine = new Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true, alpha: true });
    const scene = new Scene(engine);
    scene.autoClear = false;
    scene.clearColor = new Color4(0, 0, 0, 0);
    const camera = new ArcRotateCamera("camera", -Math.PI / 2, Math.PI / 2, 18, Vector3.Zero(), scene);
    camera.setTarget(Vector3.Zero());
    const gridMaterial = new StandardMaterial("grid", scene);
    gridMaterial.emissiveColor = new Color3(0.35, 0.52, 0.52);
    gridMaterial.alpha = 0.16;
    const grid = MeshBuilder.CreateGround("operations-grid", { width: 34, height: 20, subdivisions: 18 }, scene);
    grid.rotation.x = Math.PI / 2;
    grid.material = gridMaterial;
    engine.runRenderLoop(() => { grid.rotation.z += 0.00012; scene.render(); });
    const resize = () => engine.resize();
    window.addEventListener("resize", resize);
    return () => { window.removeEventListener("resize", resize); engine.stopRenderLoop(); scene.dispose(); engine.dispose(); mountedRef.current = false; };
  }, []);
  return <canvas ref={canvasRef} className="babylon-overlay" aria-hidden="true" />;
}

