import { useState } from "react";
import type { PinType, View } from "../tipos";
import { TYPE_LABELS } from "../datos";
import { IconSearch, IconBookmark, IconUser } from "./Iconos";
import { ChevronRight, ChevronDown, Menu } from "lucide-react";
import "./BarraNavegacion.css";

interface BarraNavegacionProps {
  search: string;
  onSearch: (v: string) => void;
  view: View;
  onView: (v: View) => void;
  activeType: PinType | "Todos";
  onType: (t: PinType | "Todos") => void;
  onHamburger: () => void;
}

export function BarraNavegacion({
  search,
  onSearch,
  view,
  onView,
  activeType,
  onType,
  onHamburger,
}: BarraNavegacionProps) {
  const [menuAbierto, setMenuAbierto] = useState(false);

  const [opcionFeed, setOpcionFeed] = useState<"Siguiendo" | "Para ti">(
    () => {
      const guardado = localStorage.getItem("opcionFeed");
      return guardado === "Siguiendo" || guardado === "Para ti"
        ? guardado
        : "Para ti";
    }
  );

  const seleccionarOpcionFeed = (opcion: "Siguiendo" | "Para ti") => {
    setOpcionFeed(opcion);
    localStorage.setItem("opcionFeed", opcion);
    onView("feed");
    setMenuAbierto(false);
  };

  return (
    <header className="barra-navegacion">
      {/* FILA 1: Hamburguesa, Logo Centrado, Perfil */}
      <div className="nav-row-1">
        <button
          className="boton-nav nav-item-hamburger"
          onClick={onHamburger}
          aria-label="Menú principal"
        >
          <Menu size={20} />
        </button>

        <div className="nav-logo nav-item-logo" onClick={() => onView("feed")}>
          <div className="nav-logo-icon">P</div>
          <span className="nav-logo-text font-display">Pinspiration</span>
        </div>

        <button
          className={`boton-nav nav-item-perfil ${view === "profile" ? "active" : ""}`}
          onClick={() => onView("profile")}
          aria-label="Perfil"
        >
          <IconUser />
          <span className="nav-text-label">Perfil</span>
        </button>
      </div>

      {/* FILA 2: Barra de Búsqueda */}
      <div className="nav-row-2">
        <div className="search-container nav-item-search">
          <IconSearch />
          <input
            type="text"
            placeholder="Busca arte, artistas, etiquetas..."
            value={search}
            onChange={(e) => onSearch(e.target.value)}
          />
        </div>
      </div>

      {/* FILA 3: Para ti/Siguiendo, Categorías (Scrollable), Tableros */}
      <div className="nav-row-3">
        <div className="nav-feed-wrapper nav-item-feed">
          <button
            onClick={() => setMenuAbierto(!menuAbierto)}
            className="boton-nav"
          >
            {menuAbierto ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
            <span>{opcionFeed}</span>
          </button>

          {menuAbierto && (
            <div className="feed-dropdown">
              <button
                onClick={() => seleccionarOpcionFeed("Para ti")}
                className={`dropdown-item ${opcionFeed === "Para ti" ? "active" : ""}`}
              >
                Para ti
              </button>
              <button
                onClick={() => seleccionarOpcionFeed("Siguiendo")}
                className={`dropdown-item ${opcionFeed === "Siguiendo" ? "active" : ""}`}
              >
                Siguiendo
              </button>
            </div>
          )}
        </div>

        <div className="nav-categorias nav-item-categorias">
          {(["Todos", ...TYPE_LABELS] as const).map((t) => (
            <button
              key={t}
              className={`cat-pill ${activeType === t ? "active" : ""}`}
              onClick={() => {
                onType(t as PinType | "Todos");
                if (view !== "feed") onView("feed");
              }}
            >
              {t}
            </button>
          ))}
        </div>

        <button
          className={`boton-nav nav-item-tableros ${view === "boards" ? "active" : ""}`}
          onClick={() => onView("boards")}
          aria-label="Tableros"
        >
          <IconBookmark />
          <span className="nav-text-label">Tableros</span>
        </button>
      </div>
    </header>
  );
}