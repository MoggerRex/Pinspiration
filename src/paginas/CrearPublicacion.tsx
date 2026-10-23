import { useState, useEffect } from "react";
import type { DragEvent } from "react";
import type { Pin, PinType } from "../tipos";
import { extractColors, mockExif } from "../utilidadesImagen";
import { IconCheck, IconImage, IconZap } from "../componentes/Iconos";
import { ArrowLeft, Upload, FileCheck, Plus, ChevronLeft, ChevronRight, Trash2 } from "lucide-react";

import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY || "");
type CrearStep = "upload" | "processing" | "ai" | "form" | "recursos" | "publishing" | "done";
interface CrearPublicacionProps {
  onBack: () => void;
  onPublish: (pin: Pin) => void;
}

export function CrearPublicacion({ onBack, onPublish }: CrearPublicacionProps) {
  const [step, setStep] = useState<CrearStep>("upload");
  const [mediaList, setMediaList] = useState<string[]>([]);
  const [activeMediaIdx, setActiveMediaIdx] = useState(0);
  const [colors, setColors] = useState<string[]>([]);
  const [exif, setExif] = useState<Record<string, string> | null>(null);

  // Estados para Drag & Drop de miniaturas
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  // Form state
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [tags, setTags] = useState("");
  const [category, setCategory] = useState<PinType | "">("");
  const [software, setSoftware] = useState("");
  const [hasResource, setHasResource] = useState(false);
  const [resourceName, setResourceName] = useState("");
  const [resourceFile, setResourceFile] = useState<File | null>(null);
  const [resourceFileUrl, setResourceFileUrl] = useState<string | null>(null);

  const STEPS: CrearStep[] = ["upload", "processing", "ai", "form", "recursos", "publishing", "done"];
  const STEP_LABELS = ["Imagen", "Análisis", "IA", "Detalles", "Recursos", "Publicar", "¡Listo!"];
  const stepIdx = STEPS.indexOf(step);

  // Estados para la validación con la IA
  const [aiProgress, setAiProgress] = useState(0);
  const [aiResult, setAiResult] = useState<{ aprobado: boolean; razon: string; categoria: string } | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  // Estados EXIF para Fotografía
  const [exifCamera, setExifCamera] = useState("");
  const [exifLens, setExifLens] = useState("");
  const [exifAperture, setExifAperture] = useState("");
  const [exifShutterSpeed, setExifShutterSpeed] = useState("");
  const [exifIso, setExifIso] = useState("");
  const [exifFocalLength, setExifFocalLength] = useState("");

  // Recalcular colores dominantes cada vez que cambie la imagen seleccionada
  useEffect(() => {
    if (mediaList.length > 0 && mediaList[activeMediaIdx]) {
      const img = new Image();
      img.onload = () => {
        setColors(extractColors(img));
      };
      img.src = mediaList[activeMediaIdx];
    }
  }, [activeMediaIdx, mediaList]);

  function handleFiles(files: FileList | File[]) {
    const fileArr = Array.from(files);
    const availableSlots = 20 - mediaList.length;
    if (availableSlots <= 0) return;

    const filesToProcess = fileArr.slice(0, availableSlots);

    filesToProcess.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const url = e.target?.result as string;
        setMediaList((prev) => {
          const isFirst = prev.length === 0;
          const updated = [...prev, url];
          if (isFirst && file.type === "image/jpeg") {
            setExif(mockExif());
          }
          return updated;
        });
      };
      reader.readAsDataURL(file);
    });
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  }

  function removeMedia(index: number) {
    setMediaList((prev) => {
      const next = prev.filter((_, i) => i !== index);
      if (next.length === 0) {
        setStep("upload");
        setActiveMediaIdx(0);
        setColors([]);
        return [];
      }
      if (activeMediaIdx >= next.length) {
        setActiveMediaIdx(next.length - 1);
      }
      return next;
    });
  }

  function handleReorder(fromIndex: number, toIndex: number) {
    if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) return;
    setMediaList((prev) => {
      const updated = [...prev];
      const [moved] = updated.splice(fromIndex, 1);
      updated.splice(toIndex, 0, moved);
      return updated;
    });

    setActiveMediaIdx((prev) => {
      if (prev === fromIndex) return toIndex;
      if (prev > fromIndex && prev <= toIndex) return prev - 1;
      if (prev < fromIndex && prev >= toIndex) return prev + 1;
      return prev;
    });
  }

  function startProcessing() {
    setStep("processing");
    setTimeout(() => setStep("ai"), 1800);
  }

  // Validación real con Gemini API
  useEffect(() => {
    const mainImg = mediaList[0];
    if (step !== "ai" || !mainImg) return;

    setAiProgress(0);
    setAiResult(null);
    setAiError(null);

    let p = 0;
    const iv = setInterval(() => {
      p += Math.random() * 10;
      if (p >= 90) p = 90;
      setAiProgress(p);
    }, 200);

    async function validarImagen() {
      try {
        const model = genAI.getGenerativeModel({ model: "gemini-3.5-flash-lite" });
        const base64Data = mainImg.split(",")[1];
        const mimeType = mainImg.split(";")[0].split(":")[1];

        const prompt = `
          Actúa como un estricto moderador de contenido para "Pinspiration", una plataforma profesional para artistas visuales.
          Analiza cuidadosamente la imagen adjunta. 
          
          ESTÁNDARES PERMITIDOS:
          - Fotografía normal o profesional.
          - Edición fotográfica profesional.
          - Arte 2D (ilustraciones, dibujos, pintura digital y arte tradicional).
          - Arte 3D (renders, modelado, landscapes, unreal).

          CONTENIDO ESTRICTAMENTE PROHIBIDO (RECHAZO INMEDIATO):
          - Memes o "shitposting".
          - Capturas de pantalla de texto, código o chats.
          - Contenido racista, discursos de odio o símbolos de odio.
          - Violencia gráfica explícita, gore o autolesiones.
          - Contenido sexualmente explícito o pornografía.

          Responde ÚNICAMENTE con un objeto JSON válido con la siguiente estructura, sin texto adicional ni formato markdown:
          {
            "aprobado": true o false,
            "categoria": "2D" | "3D" | "Fotografía" | "Edición" | "Rechazado",
            "razon": "Una breve explicación de máximo 15 palabras del por qué fue aprobado o rechazado"
          }
        `;

        const result = await model.generateContent([
          prompt,
          { inlineData: { data: base64Data, mimeType } }
        ]);

        const responseText = result.response.text();
        const cleanJson = responseText.replace(/```json/g, "").replace(/```/g, "").trim();
        const analisis = JSON.parse(cleanJson);

        clearInterval(iv);
        setAiProgress(100);
        setAiResult(analisis);

        if (analisis.aprobado) {
          setCategory(analisis.categoria !== "Rechazado" ? (analisis.categoria as PinType) : "2D");
        }

      } catch (error) {
        console.error("Error exacto de Gemini:", error);
        clearInterval(iv);
        setAiError("Hubo un problema de conexión con los servidores de validación.");
      }
    }

    validarImagen();

    return () => clearInterval(iv);
  }, [step, mediaList]);

  function handlePublish() {
    setStep("publishing");
    setTimeout(() => {
      const exifData: Record<string, string> = {};
      if (exifCamera) exifData["Cámara"] = exifCamera;
      if (exifLens) exifData["Lente"] = exifLens;
      if (exifAperture) exifData["Apertura"] = exifAperture;
      if (exifShutterSpeed) exifData["Velocidad"] = exifShutterSpeed;
      if (exifIso) exifData["ISO"] = exifIso;
      if (exifFocalLength) exifData["Focal"] = exifFocalLength;

      const finalResourceName = resourceName || resourceFile?.name;
      const resourceData = finalResourceName
        ? [{ name: finalResourceName, url: resourceFileUrl || undefined }]
        : undefined;

      const newPin: Pin = {
        id: `user-${Date.now()}`,
        artistId: "a1",
        title: title || "Mi obra",
        description: desc || undefined,
        palette: colors.length ? colors : undefined,
        software: software || undefined,
        exif: category === "Fotografía" && Object.keys(exifData).length > 0 ? exifData : undefined,
        resources: resourceData,
        publishedAt: new Date().toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" }),
        type: (category as PinType) || "2D",
        tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
        imgUrl: mediaList[0] || "",
        media: mediaList,
        imgH: 400,
        likes: 0,
        saves: 0,
      };
      onPublish(newPin);
      setStep("done");
    }, 2200);
  }

  const renderMediaCarousel = (isFormStep = false) => {
    if (mediaList.length === 0) return null;
    const currentUrl = mediaList[activeMediaIdx] || mediaList[0];

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div
          style={{
            position: "relative",
            width: "100%",
            height: isFormStep ? 220 : 360,
            background: "#13191d",
            borderRadius: 16,
            border: "1px solid #242f38",
            overflow: "hidden",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <img
            src={currentUrl}
            alt={`Media ${activeMediaIdx + 1}`}
            style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
          />

          <div
            style={{
              position: "absolute",
              top: 12,
              right: 12,
              background: "rgba(19, 25, 29, 0.85)",
              backdropFilter: "blur(6px)",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 10,
              padding: "4px 10px",
              fontSize: 12,
              fontWeight: 600,
              color: "#e8eef2",
            }}
          >
            {activeMediaIdx + 1} / {mediaList.length}
          </div>

          <button
            onClick={() => removeMedia(activeMediaIdx)}
            title="Eliminar esta imagen"
            style={{
              position: "absolute",
              top: 12,
              left: 12,
              background: "rgba(224, 90, 90, 0.85)",
              backdropFilter: "blur(6px)",
              border: "none",
              borderRadius: 10,
              padding: "6px",
              color: "#fff",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 10,
            }}
          >
            <Trash2 size={16} />
          </button>

          {mediaList.length > 1 && (
            <>
              {activeMediaIdx > 0 && (
                <button
                  onClick={() => setActiveMediaIdx((p) => p - 1)}
                  style={{
                    position: "absolute",
                    left: 10,
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "rgba(19,25,29,0.85)",
                    border: "1px solid rgba(255,255,255,0.15)",
                    borderRadius: "50%",
                    width: 36,
                    height: 36,
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                  }}
                >
                  <ChevronLeft size={20} />
                </button>
              )}
              {activeMediaIdx < mediaList.length - 1 && (
                <button
                  onClick={() => setActiveMediaIdx((p) => p + 1)}
                  style={{
                    position: "absolute",
                    right: 10,
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "rgba(19,25,29,0.85)",
                    border: "1px solid rgba(255,255,255,0.15)",
                    borderRadius: "50%",
                    width: 36,
                    height: 36,
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                  }}
                >
                  <ChevronRight size={20} />
                </button>
              )}
            </>
          )}
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center", overflowX: "auto", paddingBottom: 6 }}>
          {mediaList.map((url, i) => (
            <div
              key={`${url}-${i}`}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData("text/plain", i.toString());
                setDraggedIdx(i);
              }}
              onDragOver={(e) => {
                e.preventDefault();
                if (dragOverIdx !== i) setDragOverIdx(i);
              }}
              onDragLeave={() => {
                if (dragOverIdx === i) setDragOverIdx(null);
              }}
              onDrop={(e) => {
                e.preventDefault();
                const fromIdx = draggedIdx ?? parseInt(e.dataTransfer.getData("text/plain"), 10);
                if (!isNaN(fromIdx) && fromIdx !== i) {
                  handleReorder(fromIdx, i);
                }
                setDraggedIdx(null);
                setDragOverIdx(null);
              }}
              onDragEnd={() => {
                setDraggedIdx(null);
                setDragOverIdx(null);
              }}
              onClick={() => setActiveMediaIdx(i)}
              style={{
                position: "relative",
                flexShrink: 0,
                width: 64,
                height: 64,
                borderRadius: 12,
                overflow: "hidden",
                cursor: "grab",
                border: dragOverIdx === i
                  ? "2px solid #5db8e8"
                  : activeMediaIdx === i
                  ? "2px solid #00385a"
                  : "1.5px solid #242f38",
                opacity: draggedIdx === i ? 0.4 : activeMediaIdx === i ? 1 : 0.65,
                transform: dragOverIdx === i ? "scale(1.06)" : "scale(1)",
                transition: "all 0.2s ease",
              }}
              title="Arrastra para reordenar esta imagen"
            >
              <img src={url} alt={`thumb-${i}`} style={{ width: "100%", height: "100%", objectFit: "cover", pointerEvents: "none" }} />
            </div>
          ))}

          {mediaList.length < 20 && (
            <label
              style={{
                flexShrink: 0,
                width: 64,
                height: 64,
                borderRadius: 12,
                border: "1.5px dashed #00385a",
                background: "#13191d",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                color: "#5db8e8",
                transition: "background 0.2s",
              }}
              title="Agregar más archivos (Máx 20)"
            >
              <input
                type="file"
                multiple
                accept="image/*"
                style={{ display: "none" }}
                onChange={(e) => {
                  if (e.target.files) handleFiles(e.target.files);
                }}
              />
              <Plus size={24} />
            </label>
          )}
        </div>
      </div>
    );
  };

  return (
    <div style={{ minHeight: "100vh", background: "#13191d", width: "100%" }}>
      {/* Estilos globales unificados para los botones */}
      <style>{`
        .btn-primary {
          background-color: #00385a;
          color: #ffffff;
          border: none;
          border-radius: 14px;
          padding: 12px;
          font-family: 'DM Sans', sans-serif;
          font-weight: 600;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s ease-in-out;
        }
        .btn-primary:hover:not(:disabled) {
          background-color: #004d7a;
          box-shadow: 0 4px 12px rgba(0, 56, 90, 0.4);
          transform: translateY(-1px);
        }
        .btn-primary:active:not(:disabled) {
          transform: translateY(0);
          box-shadow: none;
        }
        .btn-primary:disabled {
          background-color: #1f2a32;
          color: #4a5e6a;
          cursor: not-allowed;
          transform: none;
          box-shadow: none;
        }
        .btn-secondary {
          background: transparent;
          border: 1.5px solid #242f38;
          border-radius: 14px;
          padding: 12px;
          color: #7a909f;
          font-family: 'DM Sans', sans-serif;
          font-weight: 600;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s ease-in-out;
        }
        .btn-secondary:hover {
          background: #242f38;
          color: #e8eef2;
          border-color: #384754;
        }
      `}</style>

      {/* Cabecera */}
      <div
        style={{
          background: "linear-gradient(0deg, #13191d 5%, #00385a 100%)",
          paddingTop: 32,
          paddingBottom: 24,
          paddingLeft: 24,
          paddingRight: 24,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <h1
              style={{
                margin: "0 0 4px",
                fontFamily: "'Playfair Display', serif",
                fontSize: 32,
                fontWeight: 700,
                color: "#e8eef2",
              }}
            >
              Mis Tableros
            </h1>
            <p style={{ margin: 0, color: "#7a909f", fontSize: 14 }}>
              Comparte tu obra con Pinspiration.
            </p>
          </div>

          <button
            onClick={onBack}
            className="cat-pill"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              cursor: "pointer",
            }}
          >
            <ArrowLeft size={16} />
            <span>Volver</span>
          </button>
        </div>
        <div style={{ height: 1, background: "#242f38", marginTop: 8 }} />
      </div>

      {/* Timeline */}
      <div
        style={{
          maxWidth: 1000,
          margin: "32px auto 36px",
          padding: "0 20px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
          {STEP_LABELS.map((label, i) => {
            const done = i < stepIdx;
            const active = i === stepIdx;
            return (
              <div
                key={label}
                style={{
                  display: "flex",
                  alignItems: "center",
                  flex: i < STEP_LABELS.length - 1 ? 1 : "none",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  <div
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: "50%",
                      background: done ? "#00385a" : active ? "#00385a" : "#1a2228",
                      border:
                        done || active
                          ? "2px solid #00385a"
                          : "2px solid #242f38",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      transition: "all 0.3s",
                    }}
                  >
                    {done ? (
                      <span style={{ color: "#fff" }}>
                        <IconCheck />
                      </span>
                    ) : (
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          color: active ? "#fff" : "#4a5e6a",
                        }}
                      >
                        {i + 1}
                      </span>
                    )}
                  </div>
                  <span
                    style={{
                      fontSize: 10,
                      color: active ? "#e8eef2" : done ? "#00385a" : "#4a5e6a",
                      fontWeight: active ? 600 : 400,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {label}
                  </span>
                </div>
                {i < STEP_LABELS.length - 1 && (
                  <div
                    style={{
                      flex: 1,
                      height: 2,
                      background: done ? "#00385a" : "#242f38",
                      margin: "0 4px",
                      marginBottom: 18,
                      transition: "background 0.4s",
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Pasos */}
      <div
        style={{
          maxWidth: 1000,
          margin: "0 auto 40px",
          padding: "0 20px",
        }}
      >
        {/* Step 1: Upload */}
        {step === "upload" && (
          <div
            style={{
              background: "#1a2228",
              borderRadius: 20,
              border: "1px solid #242f38",
              padding: 24,
            }}
          >
            <h2
              style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: 18,
                margin: "0 0 6px",
              }}
            >
              Selecciona tu imagen
            </h2>
            <p style={{ color: "#7a909f", fontSize: 13, margin: "0 0 20px" }}>
              Sube las imágenes o archivos multimedia de tu obra (hasta 20 elementos).
            </p>

            {mediaList.length === 0 ? (
              <label
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 12,
                  border: "1.5px dashed #242f38",
                  borderRadius: 16,
                  padding: "48px 20px",
                  cursor: "pointer",
                  transition: "border-color 0.2s",
                  background: "#13191d",
                  minHeight: 220,
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  (e.currentTarget as HTMLElement).style.borderColor = "#00385a";
                }}
                onDragLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = "#242f38";
                }}
                onDrop={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = "#242f38";
                  handleDrop(e);
                }}
              >
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={(e) => {
                    if (e.target.files) handleFiles(e.target.files);
                  }}
                />
                <span style={{ color: "#4a5e6a" }}>
                  <IconImage />
                </span>
                <span style={{ fontSize: 13, color: "#7a909f", textAlign: "center" }}>
                  Arrastra tus archivos aquí o haz clic para subir
                  <br />
                  <span style={{ fontSize: 11, color: "#4a5e6a" }}>
                    PNG, JPG, WEBP (Hasta 20 imágenes)
                  </span>
                </span>
              </label>
            ) : (
              renderMediaCarousel(false)
            )}

            <button
              onClick={startProcessing}
              disabled={mediaList.length === 0}
              className="btn-primary"
              style={{
                marginTop: 20,
                width: "100%",
              }}
            >
              Continuar →
            </button>
          </div>
        )}

        {/* Step 2: Processing */}
        {step === "processing" && (
          <div
            style={{
              background: "#1a2228",
              borderRadius: 20,
              border: "1px solid #242f38",
              padding: 32,
              textAlign: "center",
            }}
          >
            <div style={{ marginBottom: 20 }}>
              <img
                src={mediaList[0]}
                alt="preview"
                style={{
                  maxHeight: 180,
                  maxWidth: "100%",
                  borderRadius: 14,
                  objectFit: "contain",
                  display: "block",
                  margin: "0 auto"
                }}
              />
            </div>
            <h2
              style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: 18,
                margin: "0 0 8px",
              }}
            >
              Analizando imagen...
            </h2>
            <p style={{ color: "#7a909f", fontSize: 13, margin: "0 0 20px" }}>
              Extrayendo paleta de colores y datos técnicos
            </p>
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                gap: 8,
                marginBottom: 16,
              }}
            >
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: "#00385a",
                    animation: `bounce 0.9s ${i * 0.2}s infinite alternate`,
                  }}
                />
              ))}
            </div>
            <style>{`@keyframes bounce { from { opacity: 0.3; transform: translateY(0); } to { opacity: 1; transform: translateY(-6px); } }`}</style>
            <div style={{ display: "flex", justifyContent: "center", gap: 6 }}>
              {colors.length > 0 &&
                colors.map((c) => (
                  <div
                    key={c}
                    title={c}
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 6,
                      background: c,
                      border: "2px solid #242f38",
                    }}
                  />
                ))}
            </div>
          </div>
        )}

        {/* Step 3: AI Validation */}
        {step === "ai" && (
          <div
            style={{
              background: "#1a2228",
              borderRadius: 20,
              border: "1px solid #242f38",
              padding: 32,
              textAlign: "center",
            }}
          >
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: "50%",
                background: "#13191d",
                border: "2px solid #00385a40",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 16px",
                fontSize: 24,
              }}
            >
              <span
                style={{
                  color:
                    aiResult?.aprobado === false ? "#e05a5a" : "#1a7abf",
                }}
              >
                <IconZap />
              </span>
            </div>
            <h2
              style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: 18,
                margin: "0 0 6px",
              }}
            >
              Validación con IA
            </h2>
            <p style={{ color: "#7a909f", fontSize: 13, margin: "0 0 20px" }}>
              Verificando que tu contenido cumple las pautas de Pinspiration
            </p>

            <div
              style={{
                background: "#13191d",
                borderRadius: 10,
                height: 8,
                overflow: "hidden",
                marginBottom: 10,
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${aiProgress}%`,
                  background:
                    aiResult?.aprobado === false
                      ? "#e05a5a"
                      : "linear-gradient(90deg,#00385a,#1a7abf)",
                  transition: "width 0.3s ease",
                  borderRadius: 10,
                }}
              />
            </div>

            <p style={{ color: "#7a909f", fontSize: 12 }}>
              {aiProgress < 100
                ? `Analizando... ${Math.round(aiProgress)}%`
                : aiResult?.aprobado
                ? "✓ Contenido aprobado"
                : "✗ Contenido rechazado"}
            </p>

            {aiResult?.aprobado && (
              <div
                style={{
                  marginTop: 20,
                  padding: "16px",
                  background: "#0d2a1a",
                  border: "1px solid #1a6a3a",
                  borderRadius: 14,
                  fontSize: 13,
                  color: "#5ddf9a",
                  display: "flex",
                  flexDirection: "column",
                  gap: 14,
                  alignItems: "center",
                }}
              >
                <div>
                  ✓ <strong>{aiResult.razon}</strong> — Categoría detectada: <strong>{aiResult.categoria}</strong>
                </div>
                <button
                  onClick={() => setStep("form")}
                  className="btn-primary"
                  style={{ width: "100%" }}
                >
                  Continuar →
                </button>
              </div>
            )}

            {aiResult?.aprobado === false && (
              <div
                style={{
                  marginTop: 16,
                  padding: "12px 16px",
                  background: "#3a1212",
                  border: "1px solid #7a2020",
                  borderRadius: 10,
                  fontSize: 13,
                  color: "#ff8080",
                }}
              >
                <strong>Publicación bloqueada:</strong> {aiResult.razon}
                <button
                  onClick={() => setStep("upload")}
                  style={{
                    display: "block",
                    width: "100%",
                    marginTop: 12,
                    background: "transparent",
                    border: "1px solid #ff8080",
                    color: "#ff8080",
                    padding: "6px",
                    borderRadius: "8px",
                    cursor: "pointer",
                  }}
                >
                  Subir otra imagen
                </button>
              </div>
            )}

            {aiError && (
              <div style={{ marginTop: 16, color: "#e05a5a", fontSize: 13 }}>
                {aiError}
              </div>
            )}
          </div>
        )}

        {/* Step 4: Form */}
        {step === "form" && (
          <div
            style={{
              background: "#1a2228",
              borderRadius: 20,
              border: "1px solid #242f38",
              padding: 24,
            }}
          >
            <div
              style={{
                display: "flex",
                gap: 20,
                marginBottom: 20,
                flexWrap: "wrap",
              }}
            >
              <div style={{ flex: "0 0 auto", width: 220 }}>
                {renderMediaCarousel(true)}
                <div style={{ display: "flex", gap: 4, marginTop: 8, flexWrap: "wrap" }}>
                  {colors.map((c) => (
                    <div
                      key={c}
                      title={c}
                      style={{
                        flex: 1,
                        height: 14,
                        borderRadius: 4,
                        background: c,
                        minWidth: 16,
                      }}
                    />
                  ))}
                </div>
              </div>

              <div
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                }}
              >
                <label style={{ fontSize: 13, color: "#7a909f", fontWeight: 500 }}>
                  Título <span style={{ color: "#e05a5a" }}>*</span>
                  <input
                    className="search-bar"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Nombre de tu obra"
                    style={{
                      display: "block",
                      width: "100%",
                      marginTop: 5,
                      padding: "8px 12px",
                      fontSize: 13,
                    }}
                  />
                </label>
                <label style={{ fontSize: 13, color: "#7a909f", fontWeight: 500 }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "baseline",
                      marginBottom: 5,
                    }}
                  >
                    <span>Descripción</span>
                    {(() => {
                      const MAX = 2500;
                      const remaining = MAX - desc.length;
                      const color =
                        remaining < 0
                          ? "#e05a5a"
                          : remaining < 200
                          ? "#e8a030"
                          : "#7a909f";
                      return (
                        <span
                          style={{
                            fontSize: 11,
                            color,
                            fontVariantNumeric: "tabular-nums",
                          }}
                        >
                          {remaining < 0 ? "−" : ""}
                          {Math.abs(remaining)} / {MAX}
                        </span>
                      );
                    })()}
                  </div>
                  <textarea
                    value={desc}
                    onChange={(e) => setDesc(e.target.value)}
                    placeholder="Cuéntanos sobre esta pieza..."
                    style={{
                      display: "block",
                      width: "100%",
                      background: "#13191d",
                      border: "1.5px solid #242f38",
                      borderRadius: 12,
                      padding: "8px 12px",
                      color: "#e8eef2",
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: 13,
                      resize: "vertical",
                      minHeight: 60,
                      outline: "none",
                    }}
                  />
                </label>
                <label style={{ fontSize: 13, color: "#7a909f", fontWeight: 500 }}>
                  <span>Tags <span style={{ fontSize: 11 }}>(separados por coma)</span></span>
                  <input
                    className="search-bar"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    placeholder="fantasía, personaje, oscuro..."
                    style={{
                      display: "block",
                      width: "100%",
                      marginTop: 5,
                      padding: "8px 12px",
                      fontSize: 13,
                    }}
                  />
                </label>
              </div>
            </div>

            {/* Categoría */}
            <div style={{ marginBottom: 16 }}>
              <p
                style={{
                  fontSize: 13,
                  color: "#7a909f",
                  fontWeight: 500,
                  margin: "0 0 8px",
                }}
              >
                Categoría <span style={{ color: "#e05a5a" }}>*</span>
              </p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {(["2D", "3D", "Fotografía", "Edición"] as PinType[]).map(
                  (cat) => (
                    <button
                      key={cat}
                      onClick={() => setCategory(cat)}
                      className={`cat-pill${category === cat ? " active" : ""}`}
                      style={{ fontSize: 13, padding: "6px 14px" }}
                    >
                      {cat}
                    </button>
                  )
                )}
              </div>
            </div>

            {/* Software */}
            {(category === "3D" || category === "2D" || category === "Edición") && (
              <label
                style={{
                  fontSize: 13,
                  color: "#7a909f",
                  fontWeight: 500,
                  display: "block",
                  marginBottom: 16,
                }}
              >
                {category === "3D"
                  ? "Software de modelado / motor"
                  : category === "Edición"
                  ? "Software de edición"
                  : "Software o técnica"}{" "}
                <span style={{ color: "#e05a5a" }}>*</span>
                <input
                  className="search-bar"
                  value={software}
                  onChange={(e) => setSoftware(e.target.value)}
                  placeholder={
                    category === "3D"
                      ? "Blender, ZBrush, Unreal Engine 5..."
                      : category === "Edición"
                      ? "Photoshop, Lightroom, Premiere..."
                      : "Photoshop, Procreate, Acrílico..."
                  }
                  style={{
                    display: "block",
                    width: "100%",
                    marginTop: 5,
                    padding: "8px 12px",
                    fontSize: 13,
                  }}
                />
              </label>
            )}

            {/* EXIF */}
            {category === "Fotografía" && (
              <div
                style={{
                  background: "#13191d",
                  borderRadius: 14,
                  padding: 16,
                  border: "1px solid #242f38",
                  marginBottom: 16,
                }}
              >
                <p
                  style={{
                    fontSize: 13,
                    color: "#e8eef2",
                    fontWeight: 600,
                    margin: "0 0 12px",
                  }}
                >
                  📷 Datos EXIF de la fotografía
                </p>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                    gap: 12,
                  }}
                >
                  <label style={{ fontSize: 12, color: "#7a909f" }}>
                    Cámara
                    <input
                      className="search-bar"
                      value={exifCamera}
                      onChange={(e) => setExifCamera(e.target.value)}
                      placeholder="Ej: Sony A7 IV"
                      style={{ width: "100%", marginTop: 4, padding: "6px 10px", fontSize: 12 }}
                    />
                  </label>
                  <label style={{ fontSize: 12, color: "#7a909f" }}>
                    Lente
                    <input
                      className="search-bar"
                      value={exifLens}
                      onChange={(e) => setExifLens(e.target.value)}
                      placeholder="Ej: 50mm f/1.4"
                      style={{ width: "100%", marginTop: 4, padding: "6px 10px", fontSize: 12 }}
                    />
                  </label>
                  <label style={{ fontSize: 12, color: "#7a909f" }}>
                    Apertura (f/)
                    <input
                      className="search-bar"
                      value={exifAperture}
                      onChange={(e) => setExifAperture(e.target.value)}
                      placeholder="Ej: f/2.8"
                      style={{ width: "100%", marginTop: 4, padding: "6px 10px", fontSize: 12 }}
                    />
                  </label>
                  <label style={{ fontSize: 12, color: "#7a909f" }}>
                    Velocidad
                    <input
                      className="search-bar"
                      value={exifShutterSpeed}
                      onChange={(e) => setExifShutterSpeed(e.target.value)}
                      placeholder="Ej: 1/500s"
                      style={{ width: "100%", marginTop: 4, padding: "6px 10px", fontSize: 12 }}
                    />
                  </label>
                  <label style={{ fontSize: 12, color: "#7a909f" }}>
                    ISO
                    <input
                      className="search-bar"
                      value={exifIso}
                      onChange={(e) => setExifIso(e.target.value)}
                      placeholder="Ej: 100"
                      style={{ width: "100%", marginTop: 4, padding: "6px 10px", fontSize: 12 }}
                    />
                  </label>
                  <label style={{ fontSize: 12, color: "#7a909f" }}>
                    Distancia Focal
                    <input
                      className="search-bar"
                      value={exifFocalLength}
                      onChange={(e) => setExifFocalLength(e.target.value)}
                      placeholder="Ej: 85mm"
                      style={{ width: "100%", marginTop: 4, padding: "6px 10px", fontSize: 12 }}
                    />
                  </label>
                </div>
              </div>
            )}

            {/* Siguiente */}
            {(() => {
              const requiresSoftware = category === "2D" || category === "3D" || category === "Edición";
              const isValid =
                title.trim() !== "" &&
                category !== "" &&
                (!requiresSoftware || software.trim() !== "");

              return (
                <button
                  onClick={() => setStep("recursos")}
                  disabled={!isValid}
                  className="btn-primary"
                  style={{
                    width: "100%",
                  }}
                >
                  Siguiente →
                </button>
              );
            })()}
          </div>
        )}

        {/* Step 5: Resources */}
        {step === "recursos" && (
          <div
            style={{
              background: "#1a2228",
              borderRadius: 20,
              border: "1px solid #242f38",
              padding: 24,
            }}
          >
            <h2
              style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: 18,
                margin: "0 0 6px",
              }}
            >
              Recursos para la comunidad
            </h2>
            <p style={{ color: "#7a909f", fontSize: 13, margin: "0 0 20px" }}>
              Puedes compartir archivos complementarios (.zip, .obj, pinceles, etc.)
              para que otros artistas los descarguen.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  cursor: "pointer",
                  padding: "12px 14px",
                  background: "#13191d",
                  borderRadius: 12,
                  border: `1.5px solid ${hasResource ? "#00385a" : "#242f38"}`,
                }}
              >
                <input
                  type="checkbox"
                  checked={hasResource}
                  onChange={(e) => {
                    setHasResource(e.target.checked);
                    if (!e.target.checked) {
                      setResourceFile(null);
                      setResourceFileUrl(null);
                      setResourceName("");
                    }
                  }}
                  style={{ width: 16, height: 16, accentColor: "#00385a" }}
                />
                <span style={{ fontSize: 13, color: "#e8eef2" }}>
                  Quiero adjuntar un archivo de recursos
                </span>
              </label>

              {hasResource && (
                <div
                  style={{
                    padding: 16,
                    background: "#13191d",
                    borderRadius: 12,
                    border: "1px solid #242f38",
                    display: "flex",
                    flexDirection: "column",
                    gap: 14,
                  }}
                >
                  <label
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                      border: "1.5px dashed #242f38",
                      borderRadius: 12,
                      padding: "24px 16px",
                      cursor: "pointer",
                      background: "#1a2228",
                      transition: "border-color 0.2s",
                    }}
                    onDragOver={(e) => { e.preventDefault(); (e.currentTarget as HTMLElement).style.borderColor = "#00385a"; }}
                    onDragLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "#242f38"; }}
                    onDrop={(e) => {
                      e.preventDefault();
                      (e.currentTarget as HTMLElement).style.borderColor = "#242f38";
                      const file = e.dataTransfer.files[0];
                      if (file) {
                        setResourceFile(file);
                        setResourceFileUrl(URL.createObjectURL(file));
                        if (!resourceName) setResourceName(file.name);
                      }
                    }}
                  >
                    <input
                      type="file"
                      style={{ display: "none" }}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setResourceFile(file);
                          setResourceFileUrl(URL.createObjectURL(file));
                          if (!resourceName) setResourceName(file.name);
                        }
                      }}
                    />
                    {resourceFile ? (
                      <div style={{ display: "flex", alignItems: "center", gap: 10, color: "#5ddf9a" }}>
                        <FileCheck size={24} />
                        <div style={{ textAlign: "left" }}>
                          <span style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#e8eef2" }}>
                            {resourceFile.name}
                          </span>
                          <span style={{ fontSize: 11, color: "#7a909f" }}>
                            {(resourceFile.size / (1024 * 1024)).toFixed(2)} MB — Archivo listo para servir
                          </span>
                        </div>
                      </div>
                    ) : (
                      <>
                        <Upload size={24} style={{ color: "#4a5e6a" }} />
                        <span style={{ fontSize: 13, color: "#7a909f", textAlign: "center" }}>
                          Haz clic o arrastra aquí tu archivo de recursos<br />
                          <span style={{ fontSize: 11, color: "#4a5e6a" }}>ZIP, OBJ, PSD, BRUSHSET, PDF, etc.</span>
                        </span>
                      </>
                    )}
                  </label>

                  <label
                    style={{
                      fontSize: 13,
                      color: "#7a909f",
                      fontWeight: 500,
                      display: "block",
                    }}
                  >
                    Nombre de la descarga
                    <input
                      className="search-bar"
                      value={resourceName}
                      onChange={(e) => setResourceName(e.target.value)}
                      placeholder="Pinceles de texturas — Procreate.zip"
                      style={{
                        display: "block",
                        width: "100%",
                        marginTop: 5,
                        padding: "8px 12px",
                        fontSize: 13,
                      }}
                    />
                  </label>
                </div>
              )}
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
              <button
                onClick={() => setStep("form")}
                className="btn-secondary"
                style={{ flex: 1 }}
              >
                ← Atrás
              </button>
              <button
                onClick={handlePublish}
                className="btn-primary"
                style={{ flex: 2 }}
              >
                Publicar pin
              </button>
            </div>
          </div>
        )}

        {/* Step 6: Publishing */}
        {step === "publishing" && (
          <div
            style={{
              background: "#1a2228",
              borderRadius: 20,
              border: "1px solid #242f38",
              padding: 32,
              textAlign: "center",
            }}
          >
            {mediaList[0] && (
              <img
                src={mediaList[0]}
                alt="preview"
                style={{
                  maxHeight: 160,
                  maxWidth: "100%",
                  borderRadius: 14,
                  objectFit: "contain",
                  marginBottom: 20,
                  opacity: 0.7,
                  display: "block",
                  margin: "0 auto"
                }}
              />
            )}
            <h2
              style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: 18,
                margin: "0 0 8px",
              }}
            >
              Publicando tu pin...
            </h2>
            <p style={{ color: "#7a909f", fontSize: 13, margin: "0 0 20px" }}>
              Guardando imágenes y estructurando los datos
            </p>
          </div>
        )}

        {/* Step 7: Done */}
        {step === "done" && (
          <div
            style={{
              background: "#1a2228",
              borderRadius: 20,
              border: "1px solid #1a6a3a",
              padding: 32,
              textAlign: "center",
            }}
          >
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: "50%",
                background: "#0d2a1a",
                border: "1px solid #1a6a3a",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 16px",
                color: "#5ddf9a",
              }}
            >
              <IconCheck />
            </div>
            <h2
              style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: 22,
                margin: "0 0 8px",
              }}
            >
              ¡Pin publicado!
            </h2>
            <p style={{ color: "#7a909f", fontSize: 13, margin: "0 0 20px" }}>
              Tu obra ya está activa en el feed de Pinspiration
            </p>
            <button
              onClick={onBack}
              className="btn-primary"
              style={{ width: "100%" }}
            >
              Ver en el feed
            </button>
          </div>
        )}
      </div>
    </div>
  );
}