import type { Artist, Pin } from "../tipos";
import { TarjetaPin } from "../componentes/TarjetaPin";

interface HomeProps {
  pins: Pin[];
  search: string;
  feedMode: "Siguiendo" | "Para ti";
  loading: boolean;
  error: string | null;
  artistMap: Record<string, Artist>;
  onSave: (pin: Pin) => void;
  onArtist: (artistId: string) => void;
  onPinClick: (pin: Pin) => void;
}

export function Home({ pins, search, feedMode, loading, error, artistMap, onSave, onArtist, onPinClick }: HomeProps) {
  return (
    <main style={{ padding: "24px 20px 60px" }}>
      {error ? (
        <div role="alert" style={{ textAlign: "center", padding: "100px 0", color: "#ff9b9b" }}>
          <p style={{ fontSize: 18 }}>No se pudo cargar el feed</p>
          <p style={{ fontSize: 14 }}>{error}</p>
        </div>
      ) : loading ? (
        <p style={{ textAlign: "center", padding: "100px 0", color: "#7a909f" }}>Cargando feed…</p>
      ) : pins.length === 0 ? (
        <div style={{ textAlign: "center", padding: "100px 0", color: "#7a909f" }}>
          <p style={{ fontSize: 18, fontFamily: "'Playfair Display', serif", marginBottom: 8 }}>
            {search
              ? `Sin resultados para "${search}"`
              : feedMode === "Siguiendo"
                ? "Aún no hay publicaciones de artistas que sigues."
                : "No hay recomendaciones disponibles por ahora."}
          </p>
          <p style={{ fontSize: 14 }}>
            {search
              ? "Intenta con otro término o categoría."
              : feedMode === "Siguiendo"
                ? "Sigue algunos artistas para ver sus publicaciones aquí."
                : "Vuelve más tarde o interactúa con obras para personalizar tu feed."}
          </p>
        </div>
      ) : (
        <div className="feed-grid">
          {pins.map((pin) => (
            <TarjetaPin key={pin.id} pin={pin} artist={artistMap[pin.artistId]} onSave={onSave} onArtist={onArtist} onPinClick={onPinClick} />
          ))}
        </div>
      )}
    </main>
  );
}