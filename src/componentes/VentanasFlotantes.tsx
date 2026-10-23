import { useState } from "react";
import type { Pin } from "../tipos";
import { tagClass } from "../ayudantes";
import { IconX, IconBookmark, IconPlus } from "./Iconos";
import "./VentanasFlotantes.css";

// ─── Modal: Guardar pin en tablero ──────────────────────────────────────────
// (Nota: aquí vivía también un modal "PinDetail" que Figma generó pero que
// nunca se usaba en la app — la vista de detalle real es DetalleObra.tsx.
// Se eliminó para no dejar código muerto.)

interface ModalGuardarPinProps {
  pin: Pin;
  boards: { id: string; name: string }[];
  onClose: () => void;
  onSaveToBoard: (boardId: string) => void;
  onCreateBoard: (name: string) => void;
}

export function ModalGuardarPin({ pin, boards, onClose, onSaveToBoard, onCreateBoard }: ModalGuardarPinProps) {
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box" style={{ width: 360, padding: 28, maxWidth: "92vw" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, fontFamily: "'Playfair Display', serif" }}>Guardar pin</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#7a909f", padding: 4 }}><IconX /></button>
        </div>
        <div style={{ display: "flex", gap: 12, marginBottom: 20, alignItems: "center" }}>
          <img src={pin.imgUrl} alt={pin.title} style={{ width: 60, height: 60, borderRadius: 10, objectFit: "cover", flexShrink: 0 }} />
          <div>
            <p style={{ margin: 0, fontWeight: 600, fontSize: 14, color: "#e8eef2" }}>{pin.title}</p>
            <span className={tagClass(pin.type)} style={{ marginTop: 4, display: "inline-block" }}>{pin.type}</span>
          </div>
        </div>
        <p style={{ margin: "0 0 12px", fontSize: 13, color: "#7a909f", fontWeight: 500 }}>Elige un tablero</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 200, overflowY: "auto" }}>
          {boards.map((b) => (
            <button key={b.id} onClick={() => onSaveToBoard(b.id)}
              style={{ background: "#13191d", border: "1.5px solid #242f38", borderRadius: 12, padding: "10px 14px", color: "#e8eef2", fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 500, cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: 10, transition: "border-color 0.15s" }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#00385a")}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#242f38")}
            ><IconBookmark /> {b.name}</button>
          ))}
        </div>
        {creating ? (
          <form onSubmit={(e) => { e.preventDefault(); if (newName.trim()) { onCreateBoard(newName.trim()); setCreating(false); setNewName(""); } }} style={{ marginTop: 16, display: "flex", gap: 8 }}>
            <input autoFocus className="search-bar" placeholder="Nombre del tablero..." value={newName} onChange={(e) => setNewName(e.target.value)} style={{ flex: 1, padding: "8px 14px", fontSize: 14 }} />
            <button type="submit" style={{ background: "#00385a", border: "none", borderRadius: 12, padding: "8px 16px", color: "#fff", fontFamily: "'DM Sans', sans-serif", fontWeight: 600, cursor: "pointer", fontSize: 14 }}>Crear</button>
          </form>
        ) : (
          <button onClick={() => setCreating(true)}
            style={{ marginTop: 14, background: "none", border: "1.5px dashed #242f38", borderRadius: 12, padding: "10px 14px", color: "#7a909f", fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 500, cursor: "pointer", width: "100%", display: "flex", alignItems: "center", gap: 8, transition: "border-color 0.15s, color 0.15s" }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#00385a"; e.currentTarget.style.color = "#e8eef2"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#242f38"; e.currentTarget.style.color = "#7a909f"; }}
          ><IconPlus /> Crear nuevo tablero</button>
        )}
      </div>
    </div>
  );
}
