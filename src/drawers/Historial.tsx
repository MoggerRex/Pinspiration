import type { Pin } from "../tipos";
import { tagClass } from "../ayudantes";
import { IconHistory } from "../componentes/Iconos";
import { ArrowLeft } from "lucide-react";

interface HistorialProps {
  history: Pin[];
  onSave: (p: Pin) => void;
  onPinClick: (p: Pin) => void;
  onBack: () => void;
}

export function Historial({ history, onSave, onPinClick, onBack }: HistorialProps) {
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
              Historial
            </h1>
            <p style={{ margin: 0, color: "#7a909f", fontSize: 14 }}>
              Pines que abriste recientemente
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

      {/* Lista del Historial a todo el ancho */}
      <div
        style={{
          width: "100%",
          padding: "24px 24px 60px",
          boxSizing: "border-box",
        }}
      >
        {history.length === 0 ? (
          <div style={{ textAlign: "center", padding: "80px 0", color: "#7a909f" }}>
            <p style={{ marginTop: 12, fontSize: 15 }}>Aún no has abierto ningún pin.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {history.map((pin) => (
              <div
                key={pin.id}
                onClick={() => onPinClick(pin)}
                style={{
                  display: "flex",
                  gap: 12,
                  alignItems: "center",
                  background: "#1a2228",
                  borderRadius: 12,
                  padding: 10,
                  cursor: "pointer",
                  border: "1px solid #242f38",
                  transition: "border-color 0.15s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#00385a")}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#242f38")}
              >
                <img
                  src={pin.imgUrl}
                  alt={pin.title}
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 8,
                    objectFit: "cover",
                    flexShrink: 0,
                  }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p
                    style={{
                      margin: "0 0 4px",
                      fontWeight: 600,
                      fontSize: 13,
                      color: "#e8eef2",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {pin.title}
                  </p>
                  <span className={tagClass(pin.type)} style={{ fontSize: 10 }}>
                    {pin.type}
                  </span>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSave(pin);
                  }}
                  style={{
                    background: "#00385a",
                    border: "none",
                    borderRadius: 8,
                    padding: "6px 12px",
                    color: "#fff",
                    fontSize: 12,
                    fontFamily: "'DM Sans', sans-serif",
                    fontWeight: 600,
                    cursor: "pointer",
                    flexShrink: 0,
                  }}
                >
                  Guardar
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}