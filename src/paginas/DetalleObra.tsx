import { useState, useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import type { Pin, Artist } from "../tipos";
import { ME } from "../datos";
import { tagClass, formatNum } from "../ayudantes";
import { TarjetaPin } from "../componentes/TarjetaPin";
import { ArrowLeft, UserRoundPlus, Bookmark, Heart, MessageCircle, X, Maximize2, ChevronLeft, ChevronRight } from "lucide-react";
import "./DetalleObra.css";

// Interface para los comentarios
interface Comment {
  id: string;
  artistId?: string; // ID opcional para mapear al artista
  name: string;
  handle: string;
  avatar: string;
  text: string;
  date: string;
}

// ─── Componente auxiliar para Recursos ───────────────────────────────────────

interface DetalleObraProps {
  pin: Pin;
  allPins: Pin[];
  artistMap: Record<string, Artist>;
  currentUser?: any;
  onBack: () => void;
  onArtist: (id: string) => void;
  onSave: (pin: Pin) => void;
  onPin: (pin: Pin) => void;
  onSelectCategory?: (category: string) => void;
  onSelectTag?: (tag: string) => void;
}

function ResourcesPill({ resources }: { resources: { name: string; url?: string }[] }) {
  const [open, setOpen] = useState(false);
  const [alignRight, setAlignRight] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Evalúa dinámicamente si el desplegable se saldría de la pantalla por la derecha
  useEffect(() => {
    if (open && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const dropdownWidth = 260;
      if (rect.left + dropdownWidth > window.innerWidth - 16) {
        setAlignRight(true);
      } else {
        setAlignRight(false);
      }
    }
  }, [open]);

  // Cierra la lista al hacer clic fuera del componente
  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div ref={containerRef} style={{ position: "relative", display: "inline-block" }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "#5db8e8", background: "#0a2030", border: "1px solid #00385a60", borderRadius: 20, padding: "3px 12px", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", fontWeight: 500, transition: "background 0.15s" }}
        onMouseEnter={(e) => (e.currentTarget.style.background = "#0d2a3a")}
        onMouseLeave={(e) => (e.currentTarget.style.background = "#0a2030")}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        {resources.length} recurso{resources.length > 1 ? "s" : ""}
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}><polyline points="6 9 12 15 18 9"/></svg>
      </button>

      {open && (
        <div style={{
          position: "absolute",
          top: "calc(100% + 6px)",
          ...(alignRight ? { right: 0 } : { left: 0 }),
          zIndex: 30,
          background: "#1a2228",
          border: "1px solid #00385a60",
          borderRadius: 12,
          padding: "8px 6px",
          minWidth: 240,
          maxWidth: "calc(100vw - 24px)",
          boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
          animation: "slideUp 0.15s ease"
        }}>
          {resources.map((r) => (
            <div key={r.name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "6px 10px", borderRadius: 8, transition: "background 0.10s" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#13191d")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <span style={{ fontSize: 13, color: "#b0c8d8", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={r.name}>
                {r.name}
              </span>
              
              {r.url ? (
                <a
                  href={r.url}
                  download={r.name}
                  style={{ textDecoration: "none", flexShrink: 0, background: "#00385a", borderRadius: 8, padding: "4px 10px", color: "#fff", fontSize: 11, fontFamily: "'DM Sans', sans-serif", fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4 }}
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  Descargar
                </a>
              ) : (
                <button
                  onClick={() => alert(`Iniciando descarga de ${r.name}...`)}
                  style={{ flexShrink: 0, background: "#00385a", border: "none", borderRadius: 8, padding: "4px 10px", color: "#fff", fontSize: 11, fontFamily: "'DM Sans', sans-serif", fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4 }}
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  Descargar
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* Función auxiliar para asignar clase según el tipo */
function getCategoryClass(type: string): string {
  switch (type) {
    case "2D": return "cat-2d";
    case "3D": return "cat-3d";
    case "Fotografía": return "cat-fotografia";
    case "Edición": return "cat-edicion";
    default: return "";
  }
}

// ─── Componente Principal ───────────────────────────────────────────────────

export function DetalleObra({ pin, allPins, artistMap, currentUser, onBack, onArtist, onSave, onPin, onSelectCategory, onSelectTag }: DetalleObraProps) {
  const artist = artistMap[pin.artistId];
  const [lightbox, setLightbox] = useState(false);
  const [descModalOpen, setDescModalOpen] = useState(false);
  const [commentsModalOpen, setCommentsModalOpen] = useState(false);

  // Estados interactivos para comentarios
  const [comments, setComments] = useState<Comment[]>([
    {
      id: "c1",
      artistId: "a1", // ID simulado correspondiente a un artista registrado
      name: "Sofía Valdés",
      handle: "sofia_art",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200",
      text: "¡Me encanta la composición y el tratamiento del color!",
      date: "Hace 2 horas"
    },
    {
      id: "c2",
      artistId: "a2",
      name: "Mateo Rivas",
      handle: "mateo3d",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200",
      text: "El nivel de detalle es increíble.",
      date: "Hace 4 horas"
    }
  ]);
  const [commentInput, setCommentInput] = useState("");
  const [commentsCount, setCommentsCount] = useState((pin as any).commentsCount ?? 85);

  // Arreglo de medios adjuntos
  const mediaList: string[] = (pin as any).media && (pin as any).media.length > 0
    ? (pin as any).media
    : ((pin as any).imgUrls && (pin as any).imgUrls.length > 0 ? (pin as any).imgUrls : [pin.imgUrl]);
  const [activeMediaIdx, setActiveMediaIdx] = useState(0);

  // Resetea el índice activo cuando cambia de publicación
  useEffect(() => {
    setActiveMediaIdx(0);
  }, [pin.id]);

  // Estado para la paleta dinámica correspondiente a la foto actual
  const [currentPalette, setCurrentPalette] = useState<string[]>([]);

  // Efecto que recalcula/actualiza la paleta dominante al cambiar de foto en el carrusel
  useEffect(() => {
    let isMounted = true;

    // 1. Verificar si existen paletas explícitas definidas por medio
    const mediaPalettes: string[][] = (pin as any).mediaPalettes || (pin as any).palettes || [];
    if (mediaPalettes[activeMediaIdx] && mediaPalettes[activeMediaIdx].length > 0) {
      setCurrentPalette(mediaPalettes[activeMediaIdx]);
      return;
    }

    const currentUrl = mediaList[activeMediaIdx] || pin.imgUrl;

    // 2. Intentar extracción por Canvas
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.src = currentUrl;

    img.onload = () => {
      if (!isMounted) return;
      try {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          useFallback();
          return;
        }
        canvas.width = 40;
        canvas.height = 40;
        ctx.drawImage(img, 0, 0, 40, 40);
        const data = ctx.getImageData(0, 0, 40, 40).data;

        const colors: string[] = [];
        const samples = [
          [10, 10], [30, 10], [20, 20], [10, 30], [30, 30]
        ];

        for (const [x, y] of samples) {
          const idx = (y * 40 + x) * 4;
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];
          const hex = `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
          if (!colors.includes(hex)) {
            colors.push(hex);
          }
        }

        if (colors.length > 0) {
          while (colors.length < 5 && pin.palette && pin.palette[colors.length]) {
            colors.push(pin.palette[colors.length]);
          }
          setCurrentPalette(colors.slice(0, 5));
        } else {
          useFallback();
        }
      } catch (err) {
        useFallback();
      }
    };

    img.onerror = () => {
      useFallback();
    };

    function useFallback() {
      if (!isMounted) return;
      if (pin.palette && pin.palette.length > 0) {
        if (activeMediaIdx === 0) {
          setCurrentPalette(pin.palette);
        } else {
          const shifted = pin.palette.map((color, i) => {
            const num = parseInt(color.replace("#", ""), 16);
            if (isNaN(num)) return color;
            const shift = (activeMediaIdx * 0x2b4c6e + i * 0x1d3f5a) % 0xffffff;
            const newNum = (num ^ shift) & 0xffffff;
            return `#${newNum.toString(16).padStart(6, "0")}`;
          });
          setCurrentPalette(shifted);
        }
      } else {
        setCurrentPalette(["#1a2228", "#00385a", "#5db8e8", "#b0c8d8", "#e8eef2"]);
      }
    }

    return () => {
      isMounted = false;
    };
  }, [activeMediaIdx, pin, mediaList]);

  // Estados interactivos + contadores simulados
  const [isSaved, setIsSaved] = useState(false);
  const [savesCount, setSavesCount] = useState((pin as any).saves ?? 342);

  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(pin.likes);

  // Bloquea el scroll del fondo cuando cualquiera de los modales está abierto
  useEffect(() => {
    if (descModalOpen || lightbox || commentsModalOpen) {
      document.documentElement.style.overflow = "hidden";
      document.body.style.overflow = "hidden";
    } else {
      document.documentElement.style.overflow = "";
      document.body.style.overflow = "";
    }

    return () => {
      document.documentElement.style.overflow = "";
      document.body.style.overflow = "";
    };
  }, [descModalOpen, lightbox, commentsModalOpen]);

  // Función para agregar un nuevo comentario
  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentInput.trim()) return;

    const newComment: Comment = {
      id: `c_${Date.now()}`,
      artistId: currentUser?.id || "me",
      name: currentUser?.nombre || currentUser?.name || ME.name,
      handle: currentUser?.handle?.replace("@", "") || ME.handle,
      avatar: currentUser?.avatar || ME.avatar,
      text: commentInput.trim(),
      date: "Justo ahora"
    };

    setComments([newComment, ...comments]);
    setCommentsCount((prev: number) => prev + 1);
    setCommentInput("");
  };

  // Manejador para navegar al perfil del usuario desde un comentario
  const handleCommentUserClick = (commentArtistId?: string) => {
    setCommentsModalOpen(false); // Cierra el pop-up de comentarios
    if (commentArtistId && artistMap[commentArtistId]) {
      onArtist(commentArtistId);
    } else {
      // Si es el usuario actual o no tiene ID en el mapa, abre su perfil o el propio ID disponible
      onArtist(currentUser?.id || pin.artistId);
    }
  };

  // Cálculo del Feed "Más que te puede inspirar"
  const related = allPins
    .filter((p) => p.id !== pin.id && (p.type === pin.type || p.tags.some((t) => pin.tags.includes(t))))
    .slice(0, 12);

  const others = allPins.filter((p) => p.id !== pin.id && !related.find((r) => r.id === p.id)).slice(0, 8);
  const moreGrid = [...related, ...others].slice(0, 15);

  const currentMediaUrl = mediaList[activeMediaIdx] || pin.imgUrl;

  return (
    <div style={{ minHeight: "100vh", background: "#13191d" }}>

      {/* ── Visualización Principal de la Obra e Información ── */}
      <div className="detalle-obra-page" style={{ padding: "32px 20px 0" }}>

        <div className="detalle-obra-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 40, alignItems: "start" }}>

          {/* Visualizador de la Obra (Imagen / Carrusel) */}
          <div className="detalle-obra-visual" style={{ position: "sticky", top: 88, display: "flex", justifyContent: "center", alignItems: "flex-start" }}>
            <div
              className="pin-detail-img-wrap"
              style={{ borderRadius: 24, overflow: "hidden", background: "#1a2228", display: "inline-flex", position: "relative", cursor: "zoom-in" }}
              onClick={() => setLightbox(true)}
            >
              <img
                src={currentMediaUrl.replace(/w=\d+(&h=\d+)?(&fit=crop)?/, "w=1200")}
                alt={pin.title}
                style={{ display: "block", width: "auto", height: "auto", maxWidth: "100%", maxHeight: "calc(100vh - 112px)", objectFit: "contain" }}
              />

              {/* Indicador de posición si hay más de 1 medio */}
              {mediaList.length > 1 && (
                <div
                  style={{
                    position: "absolute",
                    top: 14,
                    right: 14,
                    background: "rgba(19, 25, 29, 0.85)",
                    backdropFilter: "blur(6px)",
                    border: "1px solid rgba(255, 255, 255, 0.12)",
                    borderRadius: 10,
                    padding: "4px 10px",
                    fontSize: 12,
                    fontWeight: 600,
                    color: "#e8eef2",
                    zIndex: 10,
                    pointerEvents: "none",
                  }}
                >
                  {activeMediaIdx + 1} / {mediaList.length}
                </div>
              )}

              {/* Flechas de Navegación del Carrusel en Hover */}
              {mediaList.length > 1 && (
                <>
                  {activeMediaIdx > 0 && (
                    <button
                      className="pin-detail-nav-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveMediaIdx((prev) => prev - 1);
                      }}
                      style={{
                        position: "absolute",
                        left: 12,
                        top: "50%",
                        transform: "translateY(-50%)",
                        background: "rgba(19, 25, 29, 0.85)",
                        backdropFilter: "blur(6px)",
                        border: "1px solid rgba(255, 255, 255, 0.15)",
                        borderRadius: "50%",
                        width: 40,
                        height: 40,
                        color: "#e8eef2",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        zIndex: 10,
                        transition: "all 0.2s ease",
                      }}
                    >
                      <ChevronLeft size={22} />
                    </button>
                  )}

                  {activeMediaIdx < mediaList.length - 1 && (
                    <button
                      className="pin-detail-nav-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveMediaIdx((prev) => prev + 1);
                      }}
                      style={{
                        position: "absolute",
                        right: 12,
                        top: "50%",
                        transform: "translateY(-50%)",
                        background: "rgba(19, 25, 29, 0.85)",
                        backdropFilter: "blur(6px)",
                        border: "1px solid rgba(255, 255, 255, 0.15)",
                        borderRadius: "50%",
                        width: 40,
                        height: 40,
                        color: "#e8eef2",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        zIndex: 10,
                        transition: "all 0.2s ease",
                      }}
                    >
                      <ChevronRight size={22} />
                    </button>
                  )}
                </>
              )}

              <div className="pin-detail-expand-btn" style={{
                position: "absolute", bottom: 14, right: 14,
                background: "rgba(19,25,29,0.88)", backdropFilter: "blur(6px)",
                border: "1px solid rgba(255,255,255,0.12)", borderRadius: 20,
                padding: "7px 14px", color: "#e8eef2", fontFamily: "'DM Sans', sans-serif",
                fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 6,
                opacity: 0, transition: "opacity 0.2s ease", pointerEvents: "none",
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>
                Ampliar imagen
              </div>
            </div>
          </div>

          {/* Lightbox a Pantalla Completa */}
          {lightbox && (
            <div
              onClick={() => setLightbox(false)}
              style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.88)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", animation: "fadeIn 0.2s ease" }}
            >
              <button
                onClick={() => setLightbox(false)}
                style={{ position: "fixed", top: 20, right: 20, width: 44, height: 44, borderRadius: "50%", background: "rgba(26,34,40,0.95)", border: "1px solid #242f38", color: "#e8eef2", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 202, transition: "background 0.15s" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#242f38")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(26,34,40,0.95)")}
              >
                <X size={20} />
              </button>

              {mediaList.length > 1 && (
                <div
                  style={{
                    position: "fixed",
                    top: 24,
                    left: 24,
                    background: "rgba(19, 25, 29, 0.85)",
                    backdropFilter: "blur(6px)",
                    border: "1px solid rgba(255, 255, 255, 0.12)",
                    borderRadius: 10,
                    padding: "6px 14px",
                    fontSize: 13,
                    fontWeight: 600,
                    color: "#e8eef2",
                    zIndex: 202,
                    pointerEvents: "none",
                  }}
                >
                  {activeMediaIdx + 1} / {mediaList.length}
                </div>
              )}

              {mediaList.length > 1 && (
                <>
                  {activeMediaIdx > 0 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveMediaIdx((prev) => prev - 1);
                      }}
                      style={{
                        position: "fixed",
                        left: 24,
                        top: "50%",
                        transform: "translateY(-50%)",
                        background: "rgba(26, 34, 40, 0.9)",
                        backdropFilter: "blur(6px)",
                        border: "1px solid rgba(255, 255, 255, 0.15)",
                        borderRadius: "50%",
                        width: 48,
                        height: 48,
                        color: "#e8eef2",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        zIndex: 202,
                        transition: "all 0.2s ease",
                      }}
                    >
                      <ChevronLeft size={26} />
                    </button>
                  )}

                  {activeMediaIdx < mediaList.length - 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveMediaIdx((prev) => prev + 1);
                      }}
                      style={{
                        position: "fixed",
                        right: 24,
                        top: "50%",
                        transform: "translateY(-50%)",
                        background: "rgba(26, 34, 40, 0.9)",
                        backdropFilter: "blur(6px)",
                        border: "1px solid rgba(255, 255, 255, 0.15)",
                        borderRadius: "50%",
                        width: 48,
                        height: 48,
                        color: "#e8eef2",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        zIndex: 202,
                        transition: "all 0.2s ease",
                      }}
                    >
                      <ChevronRight size={26} />
                    </button>
                  )}
                </>
              )}

              <img
                src={currentMediaUrl.replace(/w=\d+(&h=\d+)?(&fit=crop)?/, "w=2400")}
                alt={pin.title}
                onClick={(e) => e.stopPropagation()}
                style={{ maxWidth: "90vw", maxHeight: "90vh", objectFit: "contain", borderRadius: 16, boxShadow: "0 24px 80px rgba(0,0,0,0.8)" }}
              />
            </div>
          )}

          {/* Panel de Información Lateral */}
          <div className="detalle-obra-info" style={{ display: "flex", flexDirection: "column", gap: 20, paddingTop: 8 }}>
            {/* Fila de Etiquetas, Categoría y Recursos */}
            {(() => {
              const MAX_TAG_CHARS = 40;
              let used = 0;
              const visibleTags = pin.tags.slice(0, 5).filter(t => {
                const cost = t.length + 1;
                if (used + cost <= MAX_TAG_CHARS) { used += cost; return true; }
                return false;
              });
              return (
                <div className="detalle-obra-tags-row" style={{ display: "flex", gap: 8, flexWrap: "nowrap", alignItems: "center", overflow: "visible" }}>
                  <button 
                    className={`category-pill-btn ${getCategoryClass(pin.type)}`}
                    onClick={() => onSelectCategory && onSelectCategory(pin.type)}
                    title={`Ver publicaciones de ${pin.type}`}
                  >
                    {pin.type}
                  </button>

                  {visibleTags.map((t) => (
                    <button 
                      key={t} 
                      className="tag-pill-btn"
                      onClick={() => onSelectTag && onSelectTag(t)}
                      title={`Buscar publicaciones con #${t}`}
                    >
                      #{t}
                    </button>
                  ))}

                  <div style={{ width: 1, height: 22, background: "#242f38", borderRadius: 1, flexShrink: 0 }} />

                  <div style={{ flexShrink: 0 }}>
                    {pin.resources && pin.resources.length > 0 ? (
                      <ResourcesPill resources={pin.resources} />
                    ) : (
                      <span style={{ fontSize: 12, color: "#4a5e6a", background: "#13191d", border: "1px solid #1f2a32", borderRadius: 20, padding: "3px 12px", display: "flex", alignItems: "center", gap: 5, whiteSpace: "nowrap" }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                        Sin recurso
                      </span>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Título y Botón Volver */}
            <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
              <h1
                onClick={() => setDescModalOpen(true)}
                style={{
                  margin: 0,
                  fontFamily: "'Playfair Display', serif",
                  fontSize: 36,
                  fontWeight: 700,
                  lineHeight: 1.2,
                  flex: 1,
                  display: "-webkit-box",
                  WebkitLineClamp: 1,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                  wordBreak: "break-word",
                  cursor: "pointer",
                  transition: "opacity 0.15s"
                }}
                onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.85")}
                onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
                title="Haz clic para ver el título y descripción completos"
              >
                {pin.title}
              </h1>
              <button onClick={onBack}
                style={{ flexShrink: 0, background: "#1a2228", border: "1px solid #242f38", borderRadius: 12, padding: "8px 14px", color: "#7a909f", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", fontSize: 14, display: "flex", alignItems: "center", gap: 6, transition: "color 0.15s, border-color 0.15s", marginTop: 4 }}
                onMouseEnter={(e) => { e.currentTarget.style.color = "#e8eef2"; e.currentTarget.style.borderColor = "#00385a"; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = "#7a909f"; e.currentTarget.style.borderColor = "#242f38"; }}
              ><ArrowLeft size={16} /> Volver</button>
            </div>

            {/* Tarjeta de Artista */}
            <div
              onClick={() => onArtist(artist.id)}
              style={{ padding: "16px 18px", background: "#1a2228", borderRadius: 16, border: "1px solid #242f38", cursor: "pointer", transition: "border-color 0.15s" }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#00385a")}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#242f38")}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 12 }}>
                <img src={artist.avatar} alt={artist.name} style={{ width: 48, height: 48, borderRadius: "50%", objectFit: "cover", border: "2px solid #00385a", flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: "0 0 2px", fontWeight: 600, fontSize: 15, color: "#e8eef2" }}>{artist.name}</p>
                  <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 12, color: "#7a909f" }}>@{artist.handle}</span>
                    <span style={{ fontSize: 12, color: "#7a909f" }}>·</span>
                    <span style={{ fontSize: 12 }}><strong style={{ color: "#e8eef2" }}>{formatNum(artist.followers)}</strong><span style={{ color: "#7a909f" }}> seg</span></span>
                    <span style={{ fontSize: 12 }}><strong style={{ color: "#e8eef2" }}>{formatNum(artist.following)}</strong><span style={{ color: "#7a909f" }}> sig</span></span>
                  </div>
                </div>
                <button
                  className="cat-pill"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    whiteSpace: "nowrap",
                    cursor: "pointer"
                  }}
                >
                  <UserRoundPlus size={16} />
                  <span>Seguir</span>
                </button>
              </div>
              <p style={{ margin: 0, fontSize: 13, color: "#b0c8d8", lineHeight: 1.6, paddingLeft: 62 }}>{artist.bio}</p>
            </div>

            {/* Fila de Botones: Guardar + Me gusta + Comentar */}
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => {
                  if (isSaved) {
                    setIsSaved(false);
                    setSavesCount((prev: number) => prev - 1);
                  } else {
                    setIsSaved(true);
                    setSavesCount((prev: number) => prev + 1);
                  }
                  onSave(pin);
                }}
                style={{
                  flex: 1,
                  background: "#1a2228",
                  border: isSaved ? "1px solid #00385a" : "1px solid #242f38",
                  borderRadius: 16,
                  padding: "14px 12px",
                  color: "#e8eef2",
                  fontFamily: "'DM Sans', sans-serif",
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  transition: "all 0.2s ease"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#00385a";
                  e.currentTarget.style.borderColor = "#00385a";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "#1a2228";
                  e.currentTarget.style.borderColor = isSaved ? "#00385a" : "#242f38";
                }}
              >
                <Bookmark
                  size={18}
                  color={isSaved ? "#ffffff" : "currentColor"}
                  fill={isSaved ? "#00385a" : "none"}
                />
                <span>{isSaved ? "Guardado" : "Guardar"} ({formatNum(savesCount)})</span>
              </button>

              <button
                onClick={() => {
                  if (isLiked) {
                    setIsLiked(false);
                    setLikesCount((prev: number) => prev - 1);
                  } else {
                    setIsLiked(true);
                    setLikesCount((prev: number) => prev + 1);
                  }
                }}
                style={{
                  flex: 1,
                  background: "#1a2228",
                  border: isLiked ? "1px solid #771f2f" : "1px solid #242f38",
                  borderRadius: 16,
                  padding: "14px 12px",
                  color: "#e8eef2",
                  fontFamily: "'DM Sans', sans-serif",
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  transition: "all 0.2s ease"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#771f2f";
                  e.currentTarget.style.borderColor = "#771f2f";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "#1a2228";
                  e.currentTarget.style.borderColor = isLiked ? "#771f2f" : "#242f38";
                }}
              >
                <Heart
                  size={18}
                  color={isLiked ? "#ffffff" : "currentColor"}
                  fill={isLiked ? "#771f2f" : "none"}
                />
                <span>Me gusta ({formatNum(likesCount)})</span>
              </button>

              {/* Botón Comentar que abre el Pop-Up */}
              <button
                onClick={() => setCommentsModalOpen(true)}
                style={{
                  flex: 1,
                  background: "#1a2228",
                  border: "1px solid #242f38",
                  borderRadius: 16,
                  padding: "14px 12px",
                  color: "#e8eef2",
                  fontFamily: "'DM Sans', sans-serif",
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  transition: "all 0.2s ease"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#5d144e";
                  e.currentTarget.style.borderColor = "#5d144e";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "#1a2228";
                  e.currentTarget.style.borderColor = "#242f38";
                }}
              >
                <MessageCircle size={18} />
                <span>Comentar ({formatNum(commentsCount)})</span>
              </button>
            </div>

            {/* Contenedor de Descripción interactivo */}
            {(pin.description || pin.publishedAt) && (
              <button
                onClick={() => setDescModalOpen(true)}
                style={{
                  width: "100%",
                  textAlign: "left",
                  padding: "18px 20px",
                  background: "#1a2228",
                  borderRadius: 16,
                  border: "1px solid #242f38",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                  outline: "none",
                  fontFamily: "inherit"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "#00385a";
                  e.currentTarget.style.background = "#1d2730";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "#242f38";
                  e.currentTarget.style.background = "#1a2228";
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
                  <span style={{ fontSize: 11, color: "#7a909f", textTransform: "uppercase", letterSpacing: "0.7px", fontWeight: 600 }}>
                    Sobre esta publicación
                  </span>
                  <span style={{ fontSize: 12, color: "#5db8e8", display: "flex", alignItems: "center", gap: 5, fontWeight: 500 }}>
                    <Maximize2 size={13} />
                    Lectura enfocada
                  </span>
                </div>

                {pin.description && (
                  <p style={{
                    margin: 0,
                    fontSize: 14,
                    color: "#b0c8d8",
                    lineHeight: 1.6,
                    display: "-webkit-box",
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                    wordBreak: "break-word"
                  }}>
                    {pin.description}
                  </p>
                )}

                {pin.publishedAt && (
                  <span style={{ fontSize: 11, color: "#5d7382", marginTop: 2 }}>
                    Publicado el {pin.publishedAt}
                  </span>
                )}
              </button>
            )}

            {/* Fila de Software/EXIF y Paleta dominante Dinámica */}
            <div style={{ display: "flex", gap: 16, alignItems: "stretch", flexWrap: "wrap" }}>
              {pin.type !== "Fotografía" && pin.software && (
                <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: 5, padding: "10px 14px", background: "#1a2228", borderRadius: 14, border: "1px solid #242f38" }}>
                  <p style={{ margin: 0, fontSize: 10, color: "#7a909f", textTransform: "uppercase", letterSpacing: "0.7px", fontWeight: 600, whiteSpace: "nowrap" }}>Software / Técnica</p>
                  <p style={{ margin: 0, fontSize: 13, color: "#b0c8d8", fontWeight: 500, whiteSpace: "nowrap" }}>{pin.software}</p>
                </div>
              )}
              {pin.type === "Fotografía" && pin.exif && (() => {
                const entries = Object.entries(pin.exif);
                const row1 = entries.slice(0, 2) as [string, string][];
                const row2 = entries.slice(2)   as [string, string][];
                const chip = ([k, v]: [string, string]) => (
                  <span key={k} style={{ fontSize: 11, color: "#7a909f", background: "#13191d", borderRadius: 6, padding: "2px 7px", border: "1px solid #1f2a32", whiteSpace: "nowrap" }}>
                    <span style={{ color: "#4a6a7a" }}>{k}:</span> <strong style={{ color: "#b0c8d8" }}>{v}</strong>
                  </span>
                );
                return (
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: 5, padding: "10px 14px", background: "#1a2228", borderRadius: 14, border: "1px solid #242f38" }}>
                    <p style={{ margin: 0, fontSize: 10, color: "#7a909f", textTransform: "uppercase", letterSpacing: "0.7px", fontWeight: 600 }}>Datos EXIF</p>
                    <div style={{ display: "flex", gap: 6 }}>{row1.map(chip)}</div>
                    <div style={{ display: "flex", gap: 6 }}>{row2.map(chip)}</div>
                  </div>
                );
              })()}

              {/* Renderizado de Paleta Dinámica por Foto */}
              {currentPalette && currentPalette.length > 0 && (
                <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "12px 14px", background: "#1a2228", borderRadius: 14, border: "1px solid #242f38" }}>
                  <p style={{ margin: "0 0 8px", fontSize: 10, color: "#7a909f", textTransform: "uppercase", letterSpacing: "0.7px", fontWeight: 600, whiteSpace: "nowrap" }}>
                    Paleta dominante {mediaList.length > 1 ? `(Foto ${activeMediaIdx + 1})` : ""}
                  </p>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    {currentPalette.map((hex, idx) => (
                      <button
                        key={`${hex}-${idx}`}
                        className="color-swatch-btn"
                        onClick={() => navigator.clipboard?.writeText(hex)}
                        title={`Copiar ${hex}`}
                      >
                        <div className="color-swatch-box" style={{ background: hex }} />
                        <span style={{ fontSize: 8, color: "#7a909f", fontFamily: "monospace" }}>{hex}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Pop-up Modal de Lectura Enfocada para la Descripción */}
      {descModalOpen && (
        <div
          onClick={() => setDescModalOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 200,
            background: "rgba(0,0,0,0.85)",
            backdropFilter: "blur(8px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
            animation: "fadeIn 0.2s ease"
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "relative",
              width: "80vw",
              maxWidth: "850px",
              maxHeight: "85vh",
              background: "#1a2228",
              border: "1px solid #242f38",
              borderRadius: 24,
              padding: "36px 40px",
              overflowY: "auto",
              boxShadow: "0 24px 80px rgba(0,0,0,0.8)",
              display: "flex",
              flexDirection: "column",
              gap: 24,
              boxSizing: "border-box"
            }}
          >
            <button
              onClick={() => setDescModalOpen(false)}
              style={{
                position: "absolute",
                top: 20,
                right: 20,
                width: 44,
                height: 44,
                borderRadius: "50%",
                background: "rgba(26,34,40,0.95)",
                border: "1px solid #242f38",
                color: "#e8eef2",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 201,
                transition: "background 0.15s, border-color 0.15s"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#242f38";
                e.currentTarget.style.borderColor = "#00385a";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(26,34,40,0.95)";
                e.currentTarget.style.borderColor = "#242f38";
              }}
              title="Cerrar"
            >
              <X size={20} />
            </button>

            <h2 style={{
              margin: 0,
              fontFamily: "'Playfair Display', serif",
              fontSize: 32,
              fontWeight: 700,
              color: "#e8eef2",
              lineHeight: 1.3,
              paddingRight: 40,
              wordBreak: "break-word",
              overflowWrap: "break-word"
            }}>
              {pin.title}
            </h2>

            <div style={{ display: "flex", alignItems: "center", gap: 12, paddingBottom: 16, borderBottom: "1px solid #242f38" }}>
              <img
                src={artist.avatar}
                alt={artist.name}
                style={{ width: 44, height: 44, borderRadius: "50%", objectFit: "cover", border: "2px solid #00385a" }}
              />
              <div>
                <p style={{ margin: 0, fontWeight: 600, fontSize: 15, color: "#e8eef2" }}>{artist.name}</p>
                <span style={{ fontSize: 12, color: "#7a909f" }}>@{artist.handle}</span>
              </div>
            </div>

            <div style={{ flex: 1 }}>
              <p style={{
                margin: 0,
                fontSize: 16,
                color: "#c3d6e4",
                lineHeight: 1.8,
                whiteSpace: "pre-line",
                wordBreak: "break-word"
              }}>
                {pin.description || "Sin descripción disponible."}
              </p>
            </div>

            {pin.publishedAt && (
              <div style={{ paddingTop: 16, borderTop: "1px solid #242f38" }}>
                <span style={{ fontSize: 13, color: "#7a909f", fontWeight: 500 }}>
                  Publicado el {pin.publishedAt}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Pop-up Modal de Comentarios (Estilo Lectura Enfocada) */}
      {commentsModalOpen && (
        <div
          onClick={() => setCommentsModalOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 200,
            background: "rgba(0,0,0,0.85)",
            backdropFilter: "blur(8px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
            animation: "fadeIn 0.2s ease"
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "relative",
              width: "80vw",
              maxWidth: "650px",
              height: "80vh",
              maxHeight: "700px",
              background: "#1a2228",
              border: "1px solid #242f38",
              borderRadius: 24,
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 24px 80px rgba(0,0,0,0.8)",
              overflow: "hidden",
              boxSizing: "border-box"
            }}
          >
            {/* Cabecera del Modal de Comentarios */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "24px 28px", borderBottom: "1px solid #242f38", flexShrink: 0 }}>
              <div>
                <h3 style={{ margin: 0, fontFamily: "'Playfair Display', serif", fontSize: 22, color: "#e8eef2" }}>Comentarios</h3>
                <p style={{ margin: "2px 0 0", fontSize: 13, color: "#7a909f" }}>{formatNum(commentsCount)} comentarios en esta publicación</p>
              </div>
              <button
                onClick={() => setCommentsModalOpen(false)}
                style={{ width: 38, height: 38, borderRadius: "50%", background: "#13191d", border: "1px solid #242f38", color: "#e8eef2", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Lista de Comentarios con Scroll */}
            <div style={{ flex: 1, overflowY: "auto", padding: "20px 28px", display: "flex", flexDirection: "column", gap: 16 }}>
              {comments.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px 0", color: "#7a909f" }}>
                  <p style={{ margin: 0, fontSize: 14 }}>Aún no hay comentarios. ¡Sé el primero en comentar!</p>
                </div>
              ) : (
                comments.map((c) => (
                  <div key={c.id} style={{ display: "flex", gap: 14, alignItems: "flex-start", paddingBottom: 14, borderBottom: "1px solid rgba(36, 47, 56, 0.5)" }}>
                    {/* Foto de perfil clickeable */}
                    <img
                      src={c.avatar}
                      alt={c.name}
                      onClick={() => handleCommentUserClick(c.artistId)}
                      style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover", border: "1.5px solid #00385a", flexShrink: 0, cursor: "pointer", transition: "opacity 0.15s" }}
                      onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.8")}
                      onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
                      title={`Ver perfil de ${c.name}`}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 4 }}>
                        {/* Nombre clickeable */}
                        <span
                          onClick={() => handleCommentUserClick(c.artistId)}
                          style={{ fontWeight: 600, fontSize: 14, color: "#e8eef2", cursor: "pointer" }}
                          onMouseEnter={(e) => (e.currentTarget.style.color = "#5db8e8")}
                          onMouseLeave={(e) => (e.currentTarget.style.color = "#e8eef2")}
                          title={`Ver perfil de ${c.name}`}
                        >
                          {c.name}
                        </span>
                        <span style={{ fontSize: 12, color: "#7a909f" }}>@{c.handle}</span>
                        <span style={{ fontSize: 11, color: "#4a5e6a", marginLeft: "auto" }}>{c.date}</span>
                      </div>
                      <p style={{ margin: 0, fontSize: 14, color: "#c3d6e4", lineHeight: 1.5, wordBreak: "break-word" }}>{c.text}</p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Formulario e Input de Comentarios */}
            <form onSubmit={handleAddComment} style={{ padding: "16px 28px 24px", borderTop: "1px solid #242f38", background: "#1a2228", display: "flex", gap: 12, alignItems: "center", flexShrink: 0 }}>
              <img src={currentUser?.avatar || ME.avatar} alt="Tú" style={{ width: 38, height: 38, borderRadius: "50%", objectFit: "cover", border: "1.5px solid #00385a", flexShrink: 0 }} />
              <input
                type="text"
                placeholder="Escribe un comentario..."
                value={commentInput}
                onChange={(e) => setCommentInput(e.target.value)}
                style={{ flex: 1, background: "#13191d", border: "1.5px solid #242f38", borderRadius: 22, padding: "11px 18px", color: "#e8eef2", fontSize: 14, outline: "none" }}
              />
              <button
                type="submit"
                disabled={!commentInput.trim()}
                style={{
                  background: commentInput.trim() ? "#00385a" : "#1f2a32",
                  color: commentInput.trim() ? "#ffffff" : "#7a909f",
                  border: "none",
                  borderRadius: 20,
                  padding: "11px 22px",
                  fontWeight: 600,
                  fontSize: 14,
                  cursor: commentInput.trim() ? "pointer" : "default",
                  flexShrink: 0
                }}
              >
                Publicar
              </button>
            </form>

          </div>
        </div>
      )}

      {/* ── Feed Recomendado: "Más que te puede inspirar" ── */}
      <div style={{ padding: "32px 20px 80px" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 24 }}>
          <h2 style={{ margin: 0, fontFamily: "'Playfair Display', serif", fontSize: 24, color: "#e8eef2" }}>Más que te puede inspirar</h2>
          <span className={tagClass(pin.type)} style={{ fontSize: 12 }}>{pin.type}</span>
        </div>
        <div className="masonry-grid">
          {moreGrid.map((p) => (
            <TarjetaPin
              key={p.id}
              pin={p}
              artist={artistMap[p.artistId]}
              onSave={onSave}
              onArtist={onArtist}
              onPinClick={onPin}
            />
          ))}
        </div>
      </div>

    </div>
  );
}