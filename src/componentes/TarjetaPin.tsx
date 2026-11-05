import { useEffect, useRef, useState } from "react";
import { Bookmark, Square, SquareCheck, Trash2 } from "lucide-react";
import type { Pin, Artist } from "../tipos";
import { tagClass } from "../ayudantes";
import { actualizarVideoPrevia, esVideoMedia, quitarVideoPrevio } from "../utilidadesVideo";
import "./TarjetaPin.css";

interface TarjetaPinProps {
  pin: Pin;
  artist: Artist;
  onSave: (pin: Pin) => void;
  onArtist: (artistId: string) => void;
  onPinClick: (pin: Pin) => void;
  onDelete?: (pin: Pin) => void;
  selectionMode?: boolean;
  selected?: boolean;
  onToggleSelection?: (pin: Pin) => void;
  enableVideoAutoplay?: boolean;
}

export function TarjetaPin({
  pin,
  artist,
  onSave,
  onArtist,
  onPinClick,
  onDelete,
  selectionMode = false,
  selected = false,
  onToggleSelection,
  enableVideoAutoplay = true,
}: TarjetaPinProps) {
  const imageRef = useRef<HTMLImageElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoVisibleRef = useRef(false);
  const videoHoveredRef = useRef(false);
  const [rowSpan, setRowSpan] = useState(1);
  const esVideo = esVideoMedia(pin.imgUrl);

  useEffect(() => {
    const media = esVideo ? videoRef.current : imageRef.current;
    if (!media) return;

    const updateRowSpan = () => {
      const rowHeight = 8;
      const rowGap = 12;
      setRowSpan(Math.ceil((media.getBoundingClientRect().height + rowGap) / (rowHeight + rowGap)));
    };

    const observer = new ResizeObserver(updateRowSpan);
    observer.observe(media);
    updateRowSpan();
    return () => observer.disconnect();
  }, [esVideo, pin.imgUrl]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !esVideo || !enableVideoAutoplay) return;
    const observer = new IntersectionObserver(([entry]) => {
      const visible = entry.isIntersecting && entry.intersectionRatio >= 0.25;
      videoVisibleRef.current = visible;
      actualizarVideoPrevia(video, visible, videoHoveredRef.current);
    }, { threshold: [0, 0.25] });
    observer.observe(video);
    return () => {
      observer.disconnect();
      quitarVideoPrevio(video);
    };
  }, [enableVideoAutoplay, esVideo, pin.imgUrl]);

  function setHovered(hovered: boolean) {
    const video = videoRef.current;
    if (!enableVideoAutoplay) return;
    videoHoveredRef.current = hovered;
    if (video) actualizarVideoPrevia(video, videoVisibleRef.current, hovered);
  }

  return (
    <div className="masonry-item" style={{ gridRowEnd: `span ${rowSpan}` }}>
      <div
        className={`pin-card${selectionMode ? " pin-card-selecting" : ""}${selectionMode && selected ? " pin-card-selected" : ""}`}
        onClick={() => selectionMode ? onToggleSelection?.(pin) : onPinClick(pin)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {esVideo ? (
          <video ref={videoRef} src={pin.imgUrl} muted playsInline loop preload="metadata" aria-label={pin.title} style={{ width: "100%", display: "block", borderRadius: "16px" }} />
        ) : (
          <img ref={imageRef} src={pin.imgUrl} alt={pin.title} style={{ width: "100%", display: "block", borderRadius: "16px" }} loading="lazy" />
        )}
        <div className="overlay">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <span className={tagClass(pin.type)}>{pin.type}</span>
            {selectionMode ? (
              <button
                type="button"
                className="selection-toggle"
                aria-label={selected ? "Quitar selección" : "Seleccionar publicación"}
                aria-pressed={selected}
                onClick={(event) => {
                  event.stopPropagation();
                  onToggleSelection?.(pin);
                }}
              >
                {selected ? <SquareCheck size={26} fill="#00385a" /> : <Square size={26} />}
              </button>
            ) : (
              <div style={{ display: "flex", gap: 8 }}>
                {onDelete && (
                <button
                  className="delete-btn"
                  aria-label="Eliminar publicación"
                  title="Eliminar publicación"
                  onClick={(e) => { e.stopPropagation(); onDelete(pin); }}
                >
                  <span className="save-label">Eliminar</span>
                  <Trash2 size={16} />
                </button>
                )}
                <button
                  className="save-btn"
                  aria-label="Guardar"
                  onClick={(e) => { e.stopPropagation(); onSave(pin); }}
                >
                  <span className="save-label">Guardar</span>
                  <Bookmark className="save-icon" size={18} />
                </button>
              </div>
            )}
          </div>
          {/* Título y artista: se ocultan en móvil desde el CSS */}
          <div className="pin-info">
            <p style={{ margin: "0 0 6px", fontWeight: 600, fontSize: 13, color: "#e8eef2", lineHeight: 1.3 }}>{pin.title}</p>
            <button
              onClick={(e) => { e.stopPropagation(); onArtist(pin.artistId); }}
              style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, padding: 0 }}
            >
              <img src={artist.avatar} alt={artist.name} style={{ width: 22, height: 22, borderRadius: "50%", objectFit: "cover" }} />
              <span style={{ fontSize: 12, color: "#b0c8d8", fontWeight: 500 }}>{artist.name}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}