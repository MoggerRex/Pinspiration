import { useEffect } from "react";
import type { ReactNode } from "react";
import type { Board, Pin, View } from "../tipos";
import { ME } from "../datos";
import { IconUpload, IconUser, IconBookmark, IconHistory, IconInfo, IconX } from "../componentes/Iconos";
import { SunMoon, LogOut, Users } from "lucide-react";

interface MenuHamburguesaProps {
  open: boolean;
  onClose: () => void;
  boards: Board[];
  history: Pin[];
  onNavigate: (view: View) => void;
  onArtists?: () => void;
  onLogout: () => void;
  user?: any;
}

export function MenuHamburguesa({ open, onClose, boards, history, onNavigate, onArtists, onLogout, user }: MenuHamburguesaProps) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  const menuItems: { view: string; icon: ReactNode; label: string; sub: string; highlight?: boolean; action?: string }[] = [
    { view: "crear",     icon: <IconUpload />,   label: "Crear Pin",      sub: "Publica tu obra de arte", highlight: true },
    { view: "profile",   icon: <IconUser />,     label: "Mi perfil",      sub: "Tu cuenta y publicaciones"       },
    { view: "artists",   icon: <Users size={20} />, label: "Artistas",     sub: "Explora perfiles de artistas"     },
    { view: "boards",    icon: <IconBookmark />, label: "Mis tableros",   sub: `${boards.length} tableros guardados` },
    { view: "historial", icon: <IconHistory />,  label: "Historial",      sub: `${history.length} pines visitados`  },
    { view: "sobre",     icon: <IconInfo />,     label: "Sobre nosotros", sub: "Conoce nuestra misión"           },
    { view: "sobre",     icon: <SunMoon />,      label: "Modo Claro/Oscuro", sub: "Cambiar entre modos"           },
  ];

  return (
    <>
      {/* Fondo con zIndex superior para cubrir toda la pantalla y el header */}
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(3px)", zIndex: 1000, opacity: open ? 1 : 0, pointerEvents: open ? "all" : "none", transition: "opacity 0.3s ease" }} />

      {/* Panel del menú con zIndex superior para sobreponerse al header */}
      <div style={{ position: "fixed", top: 0, left: 0, bottom: 0, width: 300, maxWidth: "90vw", background: "#1a2228", borderRight: "1px solid #242f38", zIndex: 1001, transform: open ? "translateX(0)" : "translateX(-100%)", transition: "transform 0.32s cubic-bezier(0.4, 0, 0.2, 1)", display: "flex", flexDirection: "column", boxShadow: open ? "8px 0 40px rgba(0,0,0,0.5)" : "none" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 20px 16px", borderBottom: "1px solid #242f38", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: "linear-gradient(135deg, #00385a 0%, #1a7abf 100%)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 900, color: "#fff", fontFamily: "'Playfair Display', serif" }}>P</div>
            <span style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: 18, color: "#00385a" }}>Pinspiration</span>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#7a909f", padding: 4, transition: "color 0.15s" }} onMouseEnter={(e) => (e.currentTarget.style.color = "#e8eef2")} onMouseLeave={(e) => (e.currentTarget.style.color = "#7a909f")}><IconX /></button>
        </div>

        {/* Info rápida del usuario */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 20px", borderBottom: "1px solid #242f38" }}>
          <img src={user?.avatar || ME.avatar} alt={user?.nombre || ME.name} style={{ width: 44, height: 44, borderRadius: "50%", objectFit: "cover", border: "2px solid #00385a" }} />
          <div>
            <p style={{ margin: 0, fontWeight: 600, fontSize: 15, color: "#e8eef2" }}>{user?.nombre || ME.name}</p>
            <p style={{ margin: 0, fontSize: 12, color: "#7a909f" }}>{user?.handle || `@${ME.handle}`}</p>
          </div>
        </div>

        {/* Ítems de navegación */}
        <nav style={{ padding: "12px", flex: 1, overflowY: "auto" }}>
          {menuItems.map(({ view, icon, label, sub, highlight }) => (
            <button key={label} onClick={() => {
              if (view === "artists") {
                onArtists?.();
              } else {
                onNavigate(view as View);
              }
            }}
              style={{ width: "100%", background: highlight ? "linear-gradient(135deg,#00385a,#0a5a8a)" : "none", border: "none", borderRadius: 12, padding: "12px 14px", cursor: "pointer", display: "flex", alignItems: "center", gap: 14, textAlign: "left", transition: "background 0.15s, opacity 0.15s", marginBottom: 4 }}
              onMouseEnter={(e) => { if (!highlight) (e.currentTarget as HTMLElement).style.background = "#13191d"; else (e.currentTarget as HTMLElement).style.opacity = "0.85"; }}
              onMouseLeave={(e) => { if (!highlight) (e.currentTarget as HTMLElement).style.background = "none"; else (e.currentTarget as HTMLElement).style.opacity = "1"; }}
            >
              <span style={{ color: highlight ? "#fff" : "#00385a", flexShrink: 0 }}>{icon}</span>
              <div>
                <p style={{ margin: 0, fontWeight: 600, fontSize: 14, color: highlight ? "#fff" : "#e8eef2" }}>{label}</p>
                <p style={{ margin: 0, fontSize: 12, color: highlight ? "#a0d0f0" : "#7a909f" }}>{sub}</p>
              </div>
              <span style={{ marginLeft: "auto", color: highlight ? "#a0d0f0" : "#4a5e6a", fontSize: 18 }}>›</span>
            </button>
          ))}
        </nav>

        {/* Botón de Cerrar Sesión */}
        <div style={{ padding: "12px 16px 20px", borderTop: "1px solid #242f38", flexShrink: 0 }}>
          <button
            onClick={onLogout}
            style={{
              width: "100%",
              background: "rgba(224, 90, 90, 0.1)",
              border: "1.5px solid rgba(224, 90, 90, 0.3)",
              borderRadius: 12,
              padding: "12px 14px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 14,
              textAlign: "left",
              color: "#ff8080",
              fontWeight: 600,
              fontSize: 14,
              transition: "background 0.15s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(224, 90, 90, 0.2)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(224, 90, 90, 0.1)")}
          >
            <LogOut size={18} />
            <span>Cerrar sesión</span>
          </button>
        </div>
      </div>
    </>
  );
}