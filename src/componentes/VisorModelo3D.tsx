import { useEffect, useRef } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

export type Render3DMode = "final" | "no-post-processing";

export interface VisorModelo3DProps {
  src: string;
  wireframe: boolean;
  wireframeColor: string;
  renderMode: Render3DMode;
  onError: (message: string) => void;
}

export default function VisorModelo3D({
  src,
  wireframe,
  wireframeColor,
  renderMode,
  onError,
}: VisorModelo3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const displayRef = useRef({ wireframe, wireframeColor, renderMode });
  const applyDisplayModeRef = useRef<() => void>(() => {});

  useEffect(() => {
    displayRef.current = { wireframe, wireframeColor, renderMode };
  }, [wireframe, wireframeColor, renderMode]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let disposed = false;
    let frameId = 0;
    let loadedRoot: THREE.Object3D | null = null;
    const originalMaterialsByMesh = new WeakMap<THREE.Mesh, THREE.Material[]>();
    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#1a2228");
    const camera = new THREE.PerspectiveCamera(35, 1, 0.01, 1000);
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    } catch (error) {
      console.error("No se pudo iniciar WebGL para mostrar el modelo:", error);
      onError("Tu navegador o dispositivo no pudo iniciar el visor 3D.");
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 1.5;

    scene.add(new THREE.HemisphereLight(0xffffff, 0x38414b, 2.2));
    const keyLight = new THREE.DirectionalLight(0xffffff, 3.2);
    keyLight.position.set(4, 6, 5);
    keyLight.castShadow = true;
    scene.add(keyLight);
    const fillLight = new THREE.DirectionalLight(0xb8d5ff, 1.1);
    fillLight.position.set(-5, 2, -4);
    scene.add(fillLight);

    const resizeObserver = new ResizeObserver(() => {
      if (!container.clientWidth || !container.clientHeight) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    });
    resizeObserver.observe(container);

    const applyDisplayMode = () => {
      const { wireframe: showWireframe, wireframeColor: color, renderMode: mode } = displayRef.current;
      renderer.toneMapping = mode === "final" ? THREE.ACESFilmicToneMapping : THREE.NoToneMapping;
      renderer.toneMappingExposure = mode === "final" ? 1 : 1;
      if (!loadedRoot) return;

      loadedRoot.traverse((node) => {
        if (!(node instanceof THREE.Mesh)) return;
        const currentMaterials = Array.isArray(node.material) ? node.material : [node.material];
        let originals = originalMaterialsByMesh.get(node);
        if (!originals) {
          originals = currentMaterials;
          originalMaterialsByMesh.set(node, originals);
        }
        currentMaterials.forEach((material) => {
          if (!originals.includes(material)) material.dispose();
        });
        if (!showWireframe) {
          node.material = Array.isArray(node.material) ? originals : originals[0];
          return;
        }

        const wireMaterials = originals.map((original) => new THREE.MeshBasicMaterial({
          color,
          wireframe: true,
          side: original.side,
        }));
        node.material = Array.isArray(node.material) ? wireMaterials : wireMaterials[0];
      });
    };
    applyDisplayModeRef.current = applyDisplayMode;

    const loader = new GLTFLoader();
    loader.load(
      src,
      (gltf) => {
        if (disposed) return;
        loadedRoot = gltf.scene;
        const bounds = new THREE.Box3().setFromObject(loadedRoot);
        const center = bounds.getCenter(new THREE.Vector3());
        const size = bounds.getSize(new THREE.Vector3());
        const largestDimension = Math.max(size.x, size.y, size.z);
        if (!Number.isFinite(largestDimension) || largestDimension <= 0) {
          onError("El modelo GLB no contiene geometría visible.");
          return;
        }

        loadedRoot.position.sub(center);
        scene.add(loadedRoot);
        const distance = (largestDimension / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)))) * 1.35;
        camera.position.set(distance * 0.65, distance * 0.45, distance);
        camera.near = Math.max(distance / 1000, 0.001);
        camera.far = distance * 100;
        camera.updateProjectionMatrix();
        controls.target.set(0, 0, 0);
        controls.update();
        applyDisplayMode();
      },
      undefined,
      (error) => {
        if (disposed) return;
        console.error("No se pudo cargar el archivo GLB:", error);
        onError("No se pudo cargar este modelo 3D.");
      }
    );

    const render = () => {
      frameId = window.requestAnimationFrame(render);
      controls.update();
      renderer.render(scene, camera);
    };
    render();

    return () => {
      disposed = true;
      applyDisplayModeRef.current = () => {};
      window.cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      controls.dispose();
      if (loadedRoot) {
        const materials = new Set<THREE.Material>();
        loadedRoot.traverse((node) => {
          if (!(node instanceof THREE.Mesh)) return;
          node.geometry.dispose();
          const currentMaterials = Array.isArray(node.material) ? node.material : [node.material];
          currentMaterials.forEach((material) => materials.add(material));
          originalMaterialsByMesh.get(node)?.forEach((material) => materials.add(material));
        });
        const textures = new Set<THREE.Texture>();
        materials.forEach((material) => {
          Object.values(material).forEach((value) => {
            if (value instanceof THREE.Texture) textures.add(value);
          });
          material.dispose();
        });
        textures.forEach((texture) => texture.dispose());
      }
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [src, onError]);

  useEffect(() => {
    displayRef.current = { wireframe, wireframeColor, renderMode };
    applyDisplayModeRef.current();
  }, [wireframe, wireframeColor, renderMode]);

  return <div ref={containerRef} className="pin-detail-three-viewer" aria-label="Visor interactivo del modelo 3D" />;
}
