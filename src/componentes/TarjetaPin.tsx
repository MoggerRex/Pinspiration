import { Bookmark } from "lucide-react";
import type { Pin, Artist } from "../tipos";
import { tagClass } from "../ayudantes";
import "./TarjetaPin.css";

interface TarjetaPinProps {
  pin: Pin;
  artist: Artist;
  onSave: (pin: Pin) => void;
  onArtist: (artistId: string) => void;
  onPinClick: (pin: Pin) => void;
}

export function TarjetaPin({ pin, artist, onSave, onArtist, onPinClick }: TarjetaPinProps) {
  return (
    <div className="masonry-item">
      <div className="pin-card" onClick={() => onPinClick(pin)}>
        <img src={pin.imgUrl} alt={pin.title} style={{ width: "100%", display: "block", borderRadius: "16px" }} loading="lazy" />
        <div className="overlay">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <span className={tagClass(pin.type)}>{pin.type}</span>
            <button
              className="save-btn"
              aria-label="Guardar"
              onClick={(e) => { e.stopPropagation(); onSave(pin); }}
            >
              <span className="save-label">Guardar</span>
              <Bookmark className="save-icon" size={18} />
            </button>
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