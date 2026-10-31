import { useMemo, useState, useEffect } from "react";
import type { Artist, Board, Pin, PinType, View } from "./tipos";
import { ARTISTS, INITIAL_BOARDS, ME, PINS } from "./datos";

import { BarraNavegacion } from "./componentes/BarraNavegacion";
import { ModalGuardarPin } from "./componentes/VentanasFlotantes";
import { MenuHamburguesa } from "./drawers/MenuHamburguesa";
import { Historial } from "./drawers/Historial";
import { SobreNosotros } from "./drawers/SobreNosotros";

import { Home } from "./paginas/Home";
import { Perfil } from "./paginas/Perfil";
import { Tableros } from "./paginas/Tableros";
import { DetalleObra } from "./paginas/DetalleObra";
import { CrearPublicacion } from "./paginas/CrearPublicacion";
import { Login } from "./paginas/Login";
import { API, fullUrl } from "./api";

// Convierte las rutas /uploads/... de un pin en URLs completas
const normalizarPinApi = (p: Pin): Pin => ({
  ...p,
  imgUrl: fullUrl(p.imgUrl),
  media: p.media?.map(fullUrl),
});

export default function App() {
  // Estado de sesión persistente con localStorage
  const [user, setUser] = useState<any>(() => {
    const saved = localStorage.getItem("pinspiration_user");
    return saved ? JSON.parse(saved) : null;
  });

  const [view, setView] = useState<View>("feed");
  const [search, setSearch] = useState("");
  const [activeType, setActiveType] = useState<PinType | "Todos">("Todos");
  const [profileId, setProfileId] = useState<string | null>(null);
  const [savePin, setSavePin] = useState<Pin | null>(null);
  const [savedNotif, setSavedNotif] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [history, setHistory] = useState<Pin[]>([]);
  // Publicaciones cargadas desde MySQL (perfil propio, perfiles visitados y recién publicadas)
  const [dbPins, setDbPins] = useState<Pin[]>([]);
  const [artists, setArtists] = useState<Artist[]>(ARTISTS);

  // ─── Control de Pila de Navegación de Publicaciones ───
  const [pinStack, setPinStack] = useState<Pin[]>([]);
  const [prevView, setPrevView] = useState<View>("feed");

  // La obra activa siempre es la última agregada a la pila
  const activePin = pinStack[pinStack.length - 1] || null;

  const [boards, setBoards] = useState<Board[]>(
    INITIAL_BOARDS.map((b) => ({ ...b, pins: [] }))
  );

  // Mapa de artistas robusto que combina MySQL y los respaldos estáticos
  const artistMap = useMemo(() => {
    const map: Record<string, any> = {};
    // 1. Cargar artistas estáticos de respaldo ("a1", "a2", etc.)
    ARTISTS.forEach((a) => {
      map[a.id] = a;
    });
    // 2. Sobrescribir/agregar usuarios reales de la base de datos MySQL
    artists.forEach((a) => {
      map[a.id] = a;
      map[String(a.id)] = a;
    });
    return map;
  }, [artists]);

  const allPins = useMemo(() => [...dbPins, ...PINS], [dbPins]);

  const filteredPins = useMemo(() => {
    let pins = allPins;
    if (activeType !== "Todos") pins = pins.filter((p) => p.type === activeType);
    if (search.trim()) {
      const q = search.toLowerCase();
      pins = pins.filter((p) => {
        const artist = artistMap[p.artistId] || ARTISTS[0];
        return (
          p.title.toLowerCase().includes(q) ||
          p.type.toLowerCase().includes(q) ||
          p.tags.some((t) => t.toLowerCase().includes(q)) ||
          artist?.name.toLowerCase().includes(q) ||
          artist?.handle.toLowerCase().includes(q)
        );
      });
    }
    return pins;
  }, [activeType, search, allPins, artistMap]);

  // Cargar lista de artistas desde MySQL
  useEffect(() => {
    fetch(`${API}/api/usuarios`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          const formattedArtists = data.map((u: any) => ({
            id: String(u.id),
            name: u.nombre,
            handle: u.handle.startsWith("@") ? u.handle.slice(1) : u.handle,
            avatar: fullUrl(u.avatar) || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200",
            bio: u.bio || "Sin descripción aún.",
            followers: 0,
            following: 0,
            headerBg: u.header_bg,
          }));
          setArtists(formattedArtists);
        }
      })
      .catch((err) => console.error("Error al obtener usuarios:", err));
  }, []);

  // ─── Bloqueo del scroll en el fondo al abrir la modal de Guardar ───
  useEffect(() => {
    if (savePin) {
      document.documentElement.style.overflow = "hidden";
      document.body.style.overflow = "hidden";
    } else {
      document.documentElement.style.overflow = "";
      document.body.style.overflow = "";
    }

    return () => {
      document.documentElement.style.overflow = "";
      document.body.style.overflow = "";
    };
  }, [savePin]);

  // Cargar tableros e historial cuando cambia el usuario activo
  useEffect(() => {
    if (user?.id) {
      // 1. Cargar Tableros con sus pines desde MySQL
      fetch(`${API}/api/tableros/${user.id}`)
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data)) {
            const formattedBoards = data.map((b: any) => ({
              id: String(b.tablero_id),
              name: b.tablero_nombre,
              pins: (b.pines || []).map((pin: any) => {
                const matchedPin = PINS.find((p) => p.id === String(pin.id));
                return matchedPin || normalizarPinApi(pin);
              }),
            }));
            setBoards(formattedBoards);
          }
        })
        .catch((err) => console.error("Error al obtener tableros:", err));

      // 2. Cargar Historial desde MySQL (vista_historial_vista)
      fetch(`${API}/api/historial/${user.id}`)
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data)) {
            const formattedHistory: Pin[] = data.map((h: any) => {
              const matchedPin = PINS.find((p) => p.id === String(h.publicacion_id));
              if (matchedPin) return matchedPin;

              return {
                id: String(h.publicacion_id),
                title: h.titulo,
                type: h.categoria as PinType,
                imgUrl:
                  fullUrl(h.img_url) ||
                  "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=600",
                imgH: 300,
                artistId: String(h.artista_id),
                likes: 0,
                saves: 0,
                tags: [],
              };
            });
            setHistory(formattedHistory);
          }
        })
        .catch((err) => console.error("Error al obtener historial:", err));
    }
  }, [user?.id]);

  // ─── Perfil: datos del usuario + publicaciones desde MySQL (vista_perfil_usuario) ───
  // Aplica los datos del servidor al usuario activo y a la lista de artistas
  function aplicarUsuarioApi(u: any, esPropio: boolean) {
    const avatar = fullUrl(u.avatar);
    if (esPropio) {
      setUser((prev: any) => (prev ? { ...prev, ...u, avatar } : prev));
    }
    setArtists((prev) =>
      prev.map((a) =>
        String(a.id) === String(u.id)
          ? { ...a, name: u.nombre, bio: u.bio || a.bio, headerBg: u.headerBg, followers: u.seguidores, following: u.siguiendo, ...(avatar ? { avatar } : {}) }
          : a
      )
    );
  }

  function cargarPerfil(id: string | number) {
    const esPropio = String(id) === String(user?.id);
    fetch(`${API}/api/perfil/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error(`Error HTTP ${res.status} al cargar el perfil`);
        return res.json();
      })
      .then(({ usuario, publicaciones }) => {
        const pins = (publicaciones as Pin[]).map(normalizarPinApi);
        // Reemplaza las publicaciones previas de ese usuario por las de la BD
        setDbPins((prev) => [...pins, ...prev.filter((p) => String(p.artistId) !== String(id))]);
        aplicarUsuarioApi(usuario, esPropio);
      })
      .catch((err) => console.error("Error al cargar perfil:", err));
  }

  // Al iniciar sesión: cargar el perfil propio (así la personalización persiste entre sesiones y dispositivos)
  useEffect(() => {
    if (user?.id) cargarPerfil(user.id);
  }, [user?.id]);

  // Al abrir el perfil de un artista: cargar sus publicaciones
  useEffect(() => {
    if (view === "profile" && profileId && /^\d+$/.test(String(profileId))) {
      cargarPerfil(profileId);
    }
  }, [view, profileId]);

  // Mantener el usuario de la sesión guardado en localStorage
  useEffect(() => {
    if (user) localStorage.setItem("pinspiration_user", JSON.stringify(user));
  }, [user]);

  function openPin(pin: Pin) {
    setHistory((prev) => [pin, ...prev.filter((p) => p.id !== pin.id)].slice(0, 50));

    if (view !== "pin") {
      setPrevView(view);
    }

    setPinStack((prev) => [...prev, pin]);
    setView("pin");
    window.scrollTo({ top: 0, behavior: "smooth" });

    // Guardar visualización en MySQL
    if (user?.id && pin.id) {
      fetch(`${API}/api/historial`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          usuario_id: user.id,
          publicacion_id: pin.id,
          pin: pin,
        }),
      })
        .then((res) => {
          if (!res.ok) throw new Error(`Error HTTP ${res.status} al guardar el historial`);
        })
        .catch((err) => console.error("Error guardando en historial:", err));
    }
  }

  function handleBackFromPin() {
    if (pinStack.length > 1) {
      setPinStack((prev) => prev.slice(0, -1));
    } else {
      setPinStack([]);
      setView(prevView);
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleCreateBoard(name: string) {
    if (!user?.id) return;

    fetch(`${API}/api/tableros`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ usuario_id: user.id, nombre: name }),
    })
      .then((res) => res.json())
      .then((newBoard) => {
        if (newBoard.error) throw new Error(newBoard.error);
        setBoards((prev) => [
          ...prev,
          { id: String(newBoard.id), name: newBoard.nombre, pins: [] },
        ]);
      })
      .catch((err) => console.error("Error creando tablero:", err));
  }

  function handleSaveToBoard(boardId: string) {
    if (!savePin || !user?.id) return;

    fetch(`${API}/api/tableros/guardar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tablero_id: boardId,
        usuario_id: user.id,
        publicacion_id: savePin.id,
        pin: savePin,
      }),
    })
      .then((res) => {
        if (!res.ok) throw new Error(`Error HTTP ${res.status} al guardar el pin`);
        setBoards((prev) =>
          prev.map((b) =>
            b.id === boardId
              ? {
                  ...b,
                  pins: b.pins.find((p) => p.id === savePin.id)
                    ? b.pins
                    : [...b.pins, savePin],
                }
              : b
          )
        );
        const boardName = boards.find((b) => b.id === boardId)?.name;
        setSavePin(null);
        setSavedNotif(`Guardado en "${boardName}"`);
        setTimeout(() => setSavedNotif(null), 2500);
      })
      .catch((err) => console.error("Error guardando en tablero:", err));
  }

  function handleArtist(id: string) {
    setProfileId(id);
    setView("profile");
  }

  const handleUpdateUser = (updatedData: any) => {
    const anterior = user;
    setUser(updatedData); // actualización optimista: el modal se cierra y el perfil cambia al instante

    fetch(`${API}/api/perfil/${updatedData.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nombre: updatedData.nombre ?? updatedData.name,
        bio: updatedData.bio,
        avatar: updatedData.avatar,
        headerBg: updatedData.headerBg,
      }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || `Error HTTP ${res.status}`);
        aplicarUsuarioApi(data, true); // reemplaza la imagen base64 por la ruta guardada en el servidor
      })
      .catch((err) => {
        console.error("Error guardando el perfil:", err);
        setUser(anterior); // revertir
        setSavedNotif("No se pudo guardar el perfil");
        setTimeout(() => setSavedNotif(null), 2500);
      });
  };

  if (!user) {
    return <Login onLogin={(userData) => setUser(userData)} />;
  }

  return (
    <div style={{ minHeight: "100vh", background: "#13191d", color: "#e8eef2" }}>
      <BarraNavegacion
        search={search}
        onSearch={setSearch}
        view={view}
        onView={(v) => {
          setView(v);
          setSearch("");
          setPinStack([]);
          if (v === "profile") setProfileId(user?.id || ME.id);
        }}
        activeType={activeType}
        onType={setActiveType}
        onHamburger={() => setDrawerOpen(true)}
      />

      <MenuHamburguesa
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        boards={boards}
        history={history}
        user={user}
        onNavigate={(v) => {
          setDrawerOpen(false);
          setView(v);
          setPinStack([]);
          if (v === "profile") setProfileId(user?.id || ME.id);
        }}
        onArtists={() => {
          setDrawerOpen(false);
          setView("profile");
          setProfileId(null);
          setPinStack([]);
        }}
        onLogout={() => {
          localStorage.removeItem("pinspiration_user");
          setUser(null);
          setDrawerOpen(false);
        }}
      />

      {savedNotif && (
        <div
          style={{
            position: "fixed",
            bottom: 28,
            left: "50%",
            transform: "translateX(-50%)",
            background: "#00385a",
            color: "#fff",
            borderRadius: 30,
            padding: "10px 24px",
            fontFamily: "'DM Sans', sans-serif",
            fontWeight: 600,
            fontSize: 14,
            zIndex: 200,
            boxShadow: "0 4px 24px rgba(0,56,90,0.5)",
            animation: "slideUp 0.2s ease",
          }}
        >
          {savedNotif}
        </div>
      )}

      {savePin && (
        <ModalGuardarPin
          pin={savePin}
          boards={boards}
          onClose={() => setSavePin(null)}
          onSaveToBoard={handleSaveToBoard}
          onCreateBoard={handleCreateBoard}
        />
      )}

      {view === "feed" && (
        <Home
          pins={filteredPins}
          search={search}
          artistMap={artistMap}
          onSave={(p) => setSavePin(p)}
          onArtist={handleArtist}
          onPinClick={openPin}
        />
      )}

      {view === "profile" && (
        <Perfil
          profileId={profileId}
          allPins={allPins}
          currentUser={user}
          artists={artists}
          onUpdateUser={handleUpdateUser}
          onBack={() => {
            setView("feed");
            setProfileId(null);
          }}
          onSave={(p) => setSavePin(p)}
          onPinClick={openPin}
          onSelectArtist={(id) => setProfileId(id)}
        />
      )}

      {view === "pin" && activePin && (
        <DetalleObra
          pin={activePin}
          allPins={allPins}
          artistMap={artistMap}
          currentUser={user}
          onBack={handleBackFromPin}
          onArtist={handleArtist}
          onSave={(p) => setSavePin(p)}
          onPin={openPin}
          onSelectCategory={(categoria) => {
            setActiveType(categoria as PinType);
            setSearch("");
            setPinStack([]);
            setView("feed");
          }}
          onSelectTag={(tag) => {
            setSearch(tag);
            setActiveType("Todos");
            setPinStack([]);
            setView("feed");
          }}
        />
      )}

      {view === "boards" && (
        <Tableros
          boards={boards}
          artistMap={artistMap}
          onBack={() => setView("feed")}
          onPinClick={openPin}
          onSave={(p) => setSavePin(p)}
        />
      )}

      {view === "crear" && (
        <CrearPublicacion
          currentUser={user}
          onBack={() => setView("feed")}
          onPublish={(pin) => {
            setDbPins((prev) => [pin, ...prev]);
            setTimeout(() => setView("feed"), 800);
          }}
        />
      )}

      {view === "historial" && (
        <Historial
          history={history}
          onSave={(p) => setSavePin(p)}
          onPinClick={openPin}
          onBack={() => setView("feed")}
        />
      )}

      {view === "sobre" && <SobreNosotros onBack={() => setView("feed")} />}
    </div>
  );
}