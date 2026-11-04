import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

export async function crearVistasModeracionModelo(file: File): Promise<Blob[]> {
  const buffer = await file.arrayBuffer();
  const view = new DataView(buffer);
  if (
    buffer.byteLength < 20 ||
    view.getUint32(0, false) !== 0x676c5446 ||
    view.getUint32(4, true) !== 2 ||
    view.getUint32(8, true) !== buffer.byteLength ||
    view.getUint32(16, true) !== 0x4e4f534a
  ) {
    throw new Error("El archivo GLB no tiene una cabecera válida para generar vistas seguras.");
  }
  const jsonLength = view.getUint32(12, true);
  if (jsonLength < 2 || 20 + jsonLength > buffer.byteLength) {
    throw new Error("El archivo GLB está incompleto.");
  }
  const json = new TextDecoder().decode(new Uint8Array(buffer, 20, jsonLength)).trimEnd();
  const gltfJson: unknown = JSON.parse(json);
  if (
    !gltfJson ||
    typeof gltfJson !== "object" ||
    (gltfJson as { asset?: { version?: unknown } }).asset?.version !== "2.0"
  ) {
    throw new Error("Solo se pueden moderar modelos GLB 2.0 válidos.");
  }
  const pendientes: unknown[] = [gltfJson];
  while (pendientes.length > 0) {
    const value = pendientes.pop();
    if (!value || typeof value !== "object") continue;
    for (const [key, child] of Object.entries(value)) {
      if (key === "uri" && typeof child === "string" && !/^data:/i.test(child)) {
        throw new Error("El GLB debe incluir sus recursos y no puede depender de enlaces externos.");
      }
      if (child && typeof child === "object") pendientes.push(child);
    }
  }

  const gltf = await new GLTFLoader().parseAsync(buffer, "");
  const root = gltf.scene;
  const bounds = new THREE.Box3().setFromObject(root);
  const center = bounds.getCenter(new THREE.Vector3());
  const size = bounds.getSize(new THREE.Vector3());
  const largestDimension = Math.max(size.x, size.y, size.z);
  if (!Number.isFinite(largestDimension) || largestDimension <= 0) {
    throw new Error("El modelo no contiene geometría visible para moderar.");
  }

  root.position.sub(center);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#f1f3f5");
  scene.add(root);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x50545a, 2.2));

  const keyLight = new THREE.DirectionalLight(0xffffff, 3);
  keyLight.position.set(4, 6, 5);
  scene.add(keyLight);

  const fillLight = new THREE.DirectionalLight(0xffffff, 1.4);
  fillLight.position.set(-5, 2, -4);
  scene.add(fillLight);

  const camera = new THREE.PerspectiveCamera(35, 1, 0.01, 1000);
  const distance = largestDimension / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))) * 1.5;
  const cameraDirections = [
    new THREE.Vector3(0.65, 0.45, 1),
    new THREE.Vector3(1, 0.35, 0.2),
    new THREE.Vector3(-0.65, 0.45, -1),
  ];

  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  } catch {
    throw new Error("No se pudo iniciar WebGL para revisar el modelo 3D.");
  }

  renderer.setSize(512, 512);
  renderer.setPixelRatio(1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;

  try {
    const previews: Blob[] = [];
    for (const direction of cameraDirections) {
      camera.position.copy(direction.normalize().multiplyScalar(distance));
      camera.lookAt(0, 0, 0);
      camera.updateProjectionMatrix();
      renderer.render(scene, camera);
      const preview = await new Promise<Blob>((resolve, reject) => {
        renderer.domElement.toBlob(
          (blob) => blob ? resolve(blob) : reject(new Error("No se pudo generar una vista previa del modelo.")),
          "image/jpeg",
          0.82,
        );
      });
      previews.push(preview);
    }
    return previews;
  } finally {
    renderer.dispose();
    root.traverse((node) => {
      if (!(node instanceof THREE.Mesh)) return;
      node.geometry.dispose();
      const materials = Array.isArray(node.material) ? node.material : [node.material];
      for (const material of materials) {
        for (const value of Object.values(material)) {
          if (value instanceof THREE.Texture) value.dispose();
        }
        material.dispose();
      }
    });
  }
}
