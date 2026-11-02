import { useEffect, useState } from "react";
import { TYPE_LABELS } from "../datos";
import { API } from "../api";

interface SeleccionInteresesProps {
  userId: string | number;
  onComplete: (intereses: { categorias: string[]; etiquetas: string[] }) => void;
}

export function SeleccionIntereses({ userId, onComplete }: SeleccionInteresesProps) {
  const [categorias, setCategorias] = useState<string[]>([]);
  const [etiquetas, setEtiquetas] = useState<string[]>([]);
  const [opcionesEtiquetas, setOpcionesEtiquetas] = useState<string[]>([]);
  const [nuevaEtiqueta, setNuevaEtiqueta] = useState("");
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    fetch(`${API}/api/intereses/opciones`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "No se pudieron cargar las etiquetas");
        setOpcionesEtiquetas(Array.isArray(data.etiquetas) ? data.etiquetas : []);
      })
      .catch((err) => {
        console.error("Error al cargar opciones de intereses:", err);
        setError("No se pudieron cargar las etiquetas sugeridas. Puedes escribir las tuyas.");
      });
  }, []);

  const toggleCategoria = (categoria: string) => {
    setCategorias((prev) =>
      prev.includes(categoria)
        ? prev.filter((item) => item !== categoria)
        : [...prev, categoria]
    );
  };

  const agregarEtiqueta = (value: string) => {
    const etiqueta = value.trim().replace(/^#/, "").slice(0, 50);
    if (!etiqueta || etiquetas.some((item) => item.toLocaleLowerCase() === etiqueta.toLocaleLowerCase())) {
      return;
    }
    if (etiquetas.length >= 20) {
      setError("Puedes elegir hasta 20 etiquetas.");
      return;
    }
    setEtiquetas((prev) => [...prev, etiqueta]);
    setNuevaEtiqueta("");
    setError("");
  };

  const guardar = async (
    categoriasElegidas = categorias,
    etiquetasElegidas = etiquetas
  ) => {
    setGuardando(true);
    setError("");
    try {
      const response = await fetch(`${API}/api/usuarios/${userId}/intereses`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categorias: categoriasElegidas, etiquetas: etiquetasElegidas }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "No se pudieron guardar tus intereses");
      onComplete({ categorias: categoriasElegidas, etiquetas: etiquetasElegidas });
    } catch (err) {
      console.error("Error al guardar intereses:", err);
      setError(err instanceof Error ? err.message : "No se pudieron guardar tus intereses");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="login-card-avatar" style={{ maxWidth: 560, width: "100%", padding: 32 }}>
      <div className="avatar-step" style={{ alignItems: "stretch" }}>
        <h3>¿Qué te interesa descubrir?</h3>
        <p className="avatar-sub">
          Elige categorías y etiquetas para personalizar tu feed. Podrás cambiar de feed cuando quieras.
        </p>

        <strong style={{ color: "#e8eef2", fontSize: 14, marginBottom: 10 }}>Categorías</strong>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 22 }}>
          {TYPE_LABELS.map((categoria) => (
            <button
              key={categoria}
              type="button"
              className={`cat-pill${categorias.includes(categoria) ? " active" : ""}`}
              onClick={() => toggleCategoria(categoria)}
              aria-pressed={categorias.includes(categoria)}
            >
              {categoria}
            </button>
          ))}
        </div>

        <strong style={{ color: "#e8eef2", fontSize: 14, marginBottom: 10 }}>Etiquetas</strong>
        {opcionesEtiquetas.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
            {opcionesEtiquetas.map((etiqueta) => (
              <button
                key={etiqueta}
                type="button"
                className={`cat-pill${etiquetas.some((item) => item.toLocaleLowerCase() === etiqueta.toLocaleLowerCase()) ? " active" : ""}`}
                onClick={() => agregarEtiqueta(etiqueta)}
                aria-pressed={etiquetas.some((item) => item.toLocaleLowerCase() === etiqueta.toLocaleLowerCase())}
              >
                #{etiqueta}
              </button>
            ))}
          </div>
        )}
        <form
          onSubmit={(event) => {
            event.preventDefault();
            agregarEtiqueta(nuevaEtiqueta);
          }}
          style={{ display: "flex", gap: 8 }}
        >
          <input
            value={nuevaEtiqueta}
            onChange={(event) => setNuevaEtiqueta(event.target.value)}
            placeholder="Escribe una etiqueta, por ejemplo fantasía"
            maxLength={50}
            className="search-bar"
          />
          <button type="submit" className="cat-pill">Agregar</button>
        </form>

        {etiquetas.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
            {etiquetas.map((etiqueta) => (
              <button
                key={etiqueta}
                type="button"
                className="cat-pill active"
                onClick={() => setEtiquetas((prev) => prev.filter((item) => item !== etiqueta))}
                aria-label={`Quitar etiqueta ${etiqueta}`}
              >
                #{etiqueta} ×
              </button>
            ))}
          </div>
        )}

        {error && <p role="alert" style={{ color: "#ff8a8a", fontSize: 13 }}>{error}</p>}
        <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
          <button
            type="button"
            onClick={() => {
              void guardar([], []);
            }}
            disabled={guardando}
            className="cat-pill"
            style={{ flex: 1, padding: 10 }}
          >
            Omitir por ahora
          </button>
          <button
            type="button"
            onClick={() => void guardar()}
            disabled={guardando || (categorias.length === 0 && etiquetas.length === 0)}
            style={{
              flex: 1,
              padding: 10,
              borderRadius: 12,
              cursor: guardando || (categorias.length === 0 && etiquetas.length === 0) ? "not-allowed" : "pointer",
              background: "#00385a",
              border: "none",
              color: "#e8eef2",
              fontWeight: 600,
              opacity: guardando || (categorias.length === 0 && etiquetas.length === 0) ? 0.6 : 1,
            }}
          >
            {guardando ? "Guardando…" : "Guardar intereses"}
          </button>
        </div>
      </div>
    </div>
  );
}
