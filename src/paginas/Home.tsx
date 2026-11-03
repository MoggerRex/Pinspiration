import type { Artist, Pin } from "../tipos";
import { TarjetaPin } from "../componentes/TarjetaPin";

interface HomeProps {
  pins: Pin[];
  artists: Artist[];
  search: string;
  searchType: "publicaciones" | "artistas";
  feedMode: "Siguiendo" | "Para ti";
  loading: boolean;
  error: string | null;
  searchLoading: boolean;
  searchError: string | null;
  artistMap: Record<string, Artist>;
  onSave: (pin: Pin) => void;
  onArtist: (artistId: string) => void;
  onPinClick: (pin: Pin) => void;
}

export function Home({
  pins,
  artists,
  search,
  searchType,
  feedMode,
  loading,
  error,
  searchLoading,
  searchError,
  artistMap,
  onSave,
  onArtist,
  onPinClick,
}: HomeProps) {
  const query = search.trim().toLocaleLowerCase();
  const matchedArtists = artists.filter((artist) =>
    [artist.name, artist.handle, `@${artist.handle}`, artist.bio].some((value) =>
      value?.toLocaleLowerCase().includes(query.replace(/^@/, ""))
    )
  );

  if (search && searchType === "artistas") {
    return (
      <main style={{ padding: "24px 20px 60px" }}>
        {matchedArtists.length === 0 ? (
          <div style={{ textAlign: "center", padding: "72px 0", color: "#7a909f" }}>
            <p style={{ fontSize: 18, fontFamily: "'Playfair Display', serif" }}>
              No se encontraron artistas para "{search}"
            </p>
            <p style={{ fontSize: 14 }}>Prueba con otro nombre o usuario.</p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 14 }}>
            {matchedArtists.map((artist) => (
              <button
                key={artist.id}
                type="button"
                onClick={() => onArtist(artist.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  padding: 16,
                  color: "#e8eef2",
                  textAlign: "left",
                  background: "#1a2228",
                  border: "1px solid #242f38",
                  borderRadius: 16,
                  cursor: "pointer",
                  transition: "border-color 0.15s, transform 0.15s",
                }}
                onMouseEnter={(event) => {
                  event.currentTarget.style.borderColor = "#00385a";
                  event.currentTarget.style.transform = "translateY(-2px)";
                }}
                onMouseLeave={(event) => {
                  event.currentTarget.style.borderColor = "#242f38";
                  event.currentTarget.style.transform = "translateY(0)";
                }}
              >
                <img
                  src={artist.avatar}
                  alt=""
                  style={{ width: 54, height: 54, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
                />
                <span style={{ minWidth: 0 }}>
                  <strong style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {artist.name}
                  </strong>
                  <small style={{ display: "block", marginTop: 4, color: "#7a909f" }}>@{artist.handle}</small>
                  <small style={{ display: "block", marginTop: 6, color: "#b0c8d8" }}>
                    {artist.followers} seguidores · {artist.publications ?? 0} publicaciones
                  </small>
                </span>
              </button>
            ))}
          </div>
        )}
      </main>
    );
  }

  if (search && searchType === "publicaciones") {
    if (searchError) {
      return (
        <main style={{ padding: "24px 20px 60px" }}>
          <div role="alert" style={{ textAlign: "center", padding: "72px 0", color: "#ff9b9b" }}>
            <p style={{ fontSize: 18 }}>No se pudieron cargar las publicaciones</p>
            <p style={{ fontSize: 14 }}>{searchError}</p>
          </div>
        </main>
      );
    }
    if (searchLoading) {
      return (
        <main style={{ padding: "24px 20px 60px" }}>
          <p style={{ textAlign: "center", padding: "72px 0", color: "#7a909f" }}>
            Buscando publicaciones…
          </p>
        </main>
      );
    }
  }

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