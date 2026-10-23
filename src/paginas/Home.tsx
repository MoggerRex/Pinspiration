import type { Artist, Pin } from "../tipos";
import { TarjetaPin } from "../componentes/TarjetaPin";

interface HomeProps {
  pins: Pin[];
  search: string;
  artistMap: Record<string, Artist>;
  onSave: (pin: Pin) => void;
  onArtist: (artistId: string) => void;
  onPinClick: (pin: Pin) => void;
}

export function Home({ pins, search, artistMap, onSave, onArtist, onPinClick }: HomeProps) {
  return (
    <main style={{ padding: "24px 20px 60px" }}>
      {pins.length === 0 ? (
        <div style={{ textAlign: "center", padding: "100px 0", color: "#7a909f" }}>
          <p style={{ fontSize: 18, fontFamily: "'Playfair Display', serif", marginBottom: 8 }}>Sin resultados para "{search}"</p>
          <p style={{ fontSize: 14 }}>Intenta con otro término o categoría.</p>
        </div>
      ) : (
        <div className="masonry-grid">
          {pins.map((pin) => (
            <TarjetaPin key={pin.id} pin={pin} artist={artistMap[pin.artistId]} onSave={onSave} onArtist={onArtist} onPinClick={onPinClick} />
          ))}
        </div>
      )}
    </main>
  );
}