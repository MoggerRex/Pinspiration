import { useState } from "react";
import type { Artist, Board, Pin } from "../tipos";
import { TarjetaPin } from "../componentes/TarjetaPin";
import { IconArrowLeft, IconGrid } from "../componentes/Iconos";
import { ArrowLeft } from "lucide-react";

interface TablerosProps {
  boards: Board[];
  artistMap: Record<string, Artist>;
  onBack: () => void;
  onPinClick: (pin: Pin) => void;
  onSave: (pin: Pin) => void;
}

export function Tableros({
  boards,
  artistMap,
  onBack,
  onPinClick,
  onSave,
}: TablerosProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const board = boards.find((b) => b.id === selected);

  // Vista de un tablero individual abierto
  if (selected && board) {
    return (
      <div
        style={{
          minHeight: "100vh",
          width: "100%",
          padding: "30px 24px 60px",
          boxSizing: "border-box",
        }}
      >
        <button
          onClick={() => setSelected(null)}
          style={{
            background: "#1a2228",
            border: "1px solid #242f38",
            borderRadius: 12,
            padding: "8px 14px",
            color: "#7a909f",
            cursor: "pointer",
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 14,
            display: "flex",
            alignItems: "center",
            gap: 6,
            marginBottom: 24,
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#e8eef2")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "#7a909f")}
        >
          <IconArrowLeft /> Mis tableros
        </button>
        <h2
          style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: 28,
            marginBottom: 24,
            color: "#e8eef2",
          }}
        >
          {board.name}
        </h2>
        {board.pins.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "80px 0",
              color: "#7a909f",
            }}
          >
            <p style={{ fontSize: 16 }}>
              Este tablero está vacío. ¡Empieza a guardar pines!
            </p>
          </div>
        ) : (
          <div className="masonry-grid">
            {board.pins.map((pin) => (
              <TarjetaPin
                key={pin.id}
                pin={pin}
                artist={artistMap[pin.artistId]}
                onSave={onSave}
                onArtist={() => {}}
                onPinClick={onPinClick}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  // Vista principal de todos los tableros (ancho completo como Perfil)
  return (
    <div style={{ minHeight: "100vh", background: "#13191d", width: "100%" }}>
      {/* Cabecera con degradado a todo el ancho */}
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
              {boards.length} tableros guardados
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

      {/* Grid de Tableros en 100% de ancho */}
      <div
        style={{
          width: "100%",
          padding: "24px 24px 60px",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
            gap: 16,
          }}
        >
          {boards.map((b) => (
            <div
              key={b.id}
              onClick={() => setSelected(b.id)}
              style={{
                background: "#1a2228",
                border: "1.5px solid #242f38",
                borderRadius: 16,
                overflow: "hidden",
                cursor: "pointer",
                transition: "border-color 0.15s, transform 0.15s",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = "#00385a";
                (e.currentTarget as HTMLElement).style.transform =
                  "translateY(-2px)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = "#242f38";
                (e.currentTarget as HTMLElement).style.transform =
                  "translateY(0)";
              }}
            >
              <div
                style={{
                  height: 120,
                  background: "#13191d",
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 2,
                }}
              >
                {b.pins.slice(0, 4).map((p) => (
                  <img
                    key={p.id}
                    src={p.imgUrl}
                    alt={p.title}
                    style={{ width: "100%", height: 60, objectFit: "cover" }}
                  />
                ))}
                {b.pins.length === 0 && (
                  <div
                    style={{
                      gridColumn: "1/-1",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#242f38",
                    }}
                  >
                    <IconGrid />
                  </div>
                )}
              </div>
              <div style={{ padding: "12px 14px" }}>
                <p
                  style={{
                    margin: "0 0 4px",
                    fontWeight: 600,
                    fontSize: 14,
                    color: "#e8eef2",
                  }}
                >
                  {b.name}
                </p>
                <p style={{ margin: 0, fontSize: 12, color: "#7a909f" }}>
                  {b.pins.length} pines
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}