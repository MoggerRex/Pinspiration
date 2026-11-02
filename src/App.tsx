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
  const [feedMode, setFeedMode] = useState<"Siguiendo" | "Para ti">(() => {
    const saved = localStorage.getItem("opcionFeed");
    return saved === "Siguiendo" ? "Siguiendo" : "Para ti";
  });
  const [activeType, setActiveType] = useState<PinType | "Todos">("Todos");
  const [profileId, setProfileId] = useState<string | null>(null);
  const [savePins, setSavePins] = useState<Pin[] | null>(null);
  const [deletionConfirmation, setDeletionConfirmation] = useState<{
    count: number;
    resolve: (accepted: boolean) => void;
  } | null>(null);
  const [savedNotif, setSavedNotif] = useState<string | null>(null);
  const [savedPublicationIds, setSavedPublicationIds] = useState<Set<string>>(new Set());
  const [savedPublicationCounts, setSavedPublicationCounts] = useState<Record<string, number>>({});
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [history, setHistory] = useState<Pin[]>([]);
  // Publicaciones publicadas en MySQL (todas, cargadas desde vista_feed_publicaciones)
  const [feedPins, setFeedPins] = useState<Pin[]>([]);
  const [feedLoading, setFeedLoading] = useState(false);
  const [feedError, setFeedError] = useState<string | null>(null);
  const [artists, setArtists] = useState<Artist[]>(ARTISTS);
  const [followedArtistIds, setFollowedArtistIds] = useState<Set<string>>(new Set());

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

  // Los perfiles y detalles aún pueden referenciar pines estáticos; los feeds usan solo la API.
  const allPins = useMemo(() => {
    const idsBd = new Set(feedPins.map((p) => p.id));
    return [...feedPins, ...PINS.filter((p) => !idsBd.has(p.id))];
  }, [feedPins]);

  const filteredPins = useMemo(() => {
    let pins = feedPins;
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
  }, [activeType, search, feedPins, artistMap]);

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
            followers: Number(u.seguidores) || 0,
            following: Number(u.siguiendo) || 0,
            publications: Number(u.publicaciones) || 0,
            headerBg: u.header_bg,
          }));
          setArtists(formattedArtists);
        }
      })
      .catch((err) => console.error("Error al obtener usuarios:", err));
  }, []);

  // ─── Bloqueo del scroll en el fondo al abrir la modal de Guardar ───
  useEffect(() => {
    if (savePins || deletionConfirmation) {
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
  }, [savePins, deletionConfirmation]);

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

  // Aplica los datos del perfil del servidor al usuario activo y a la lista de artistas.
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

  // ─── Feed: todas las publicaciones publicadas, de la más nueva a la más vieja ───
  // El orden lo aplica el backend (ORDER BY ... DESC) sobre vista_feed_publicaciones.
  function cargarFeed(
    mode: "Siguiendo" | "Para ti",
    userId: string | number,
    signal?: AbortSignal
  ) {
    const endpoint = mode === "Siguiendo"
      ? `/api/feed/siguiendo/${encodeURIComponent(String(userId))}`
      : `/api/feed/para-ti/${encodeURIComponent(String(userId))}`;
    setFeedLoading(true);
    setFeedError(null);
    fetch(`${API}${endpoint}`, { signal })
      .then((res) => {
        if (!res.ok) throw new Error(`Error HTTP ${res.status} al cargar el feed`);
        return res.json();
      })
      .then((data) => {
        if (!Array.isArray(data)) throw new Error("La respuesta del feed no es válida");
        setFeedPins(data.map(normalizarPinApi));
      })
      .catch((err) => {
        if (err.name === "AbortError") return;
        console.error("Error al cargar el feed:", err);
        setFeedPins([]);
        setFeedError(err instanceof Error ? err.message : "Error al cargar el feed");
      })
      .finally(() => {
        if (!signal?.aborted) setFeedLoading(false);
      });
  }

  function cargarPerfil(id: string | number) {
    const esPropio = String(id) === String(user?.id);
    fetch(`${API}/api/perfil/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error(`Error HTTP ${res.status} al cargar el perfil`);
        return res.json();
      })
      .then(({ usuario }) => {
        // Las publicaciones del perfil se consultan aparte para no depender del feed activo.
        aplicarUsuarioApi(usuario, esPropio);
      })
      .catch((err) => console.error("Error al cargar perfil:", err));
  }

  // Al iniciar sesión: cargar los datos del perfil propio.
  useEffect(() => {
    if (user?.id) {
      cargarPerfil(user.id);
    }
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    const controller = new AbortController();
    cargarFeed(feedMode, user.id, controller.signal);
    return () => controller.abort();
  }, [user?.id, feedMode]);

  useEffect(() => {
    if (!user?.id) {
      setFollowedArtistIds(new Set());
      return;
    }

    setFollowedArtistIds(new Set());
    const controller = new AbortController();
    fetch(`${API}/api/usuarios/${encodeURIComponent(String(user.id))}/seguidos`, {
      signal: controller.signal,
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "No se pudieron cargar los artistas seguidos");
        return data;
      })
      .then((data) => {
        if (Array.isArray(data)) {
          setFollowedArtistIds(new Set(data.map((artist: any) => String(artist.artista_id))));
        }
      })
      .catch((err) => {
        if (err.name !== "AbortError") console.error("Error al cargar artistas seguidos:", err);
      });
    return () => controller.abort();
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

  async function handleSaveToBoard(boardId: string) {
    if (!savePins?.length || !user?.id) return;

    try {
      for (const pinToSave of savePins) {
        const response = await fetch(`${API}/api/tableros/guardar`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tablero_id: boardId,
            usuario_id: user.id,
            publicacion_id: pinToSave.id,
            pin: pinToSave,
          }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || `Error HTTP ${response.status}`);

        let savesCount = Number(data.savesCount);
        if (!Number.isFinite(savesCount)) {
          const interactionsResponse = await fetch(
            `${API}/api/publicaciones/${encodeURIComponent(pinToSave.id)}/interacciones?usuario_id=${encodeURIComponent(String(user.id))}`
          );
          const interactions = await interactionsResponse.json();
          if (!interactionsResponse.ok) {
            throw new Error(interactions.error || "Se guardó el pin, pero no se pudo actualizar su contador");
          }
          savesCount = Number(interactions.savesCount) || 0;
        }

        setSavedPublicationIds((prev) => new Set(prev).add(pinToSave.id));
        setSavedPublicationCounts((prev) => ({ ...prev, [pinToSave.id]: savesCount }));
        setBoards((prev) =>
          prev.map((board) =>
            board.id === boardId
              ? {
                  ...board,
                  pins: board.pins.some((pin) => pin.id === pinToSave.id)
                    ? board.pins
                    : [...board.pins, pinToSave],
                }
              : board
          )
        );
      }

      const boardName = boards.find((board) => board.id === boardId)?.name;
      cargarFeed(feedMode, user.id);
      setSavePins(null);
      setSavedNotif(
        savePins.length === 1
          ? `Guardado en "${boardName}"`
          : `${savePins.length} publicaciones guardadas en "${boardName}"`
      );
      setTimeout(() => setSavedNotif(null), 2500);
    } catch (err) {
      console.error("Error guardando en tablero:", err);
      setSavedNotif(err instanceof Error ? err.message : "No se pudo guardar el pin");
      setTimeout(() => setSavedNotif(null), 3000);
    }
  }

  function handleArtist(id: string) {
    setProfileId(id);
    setView("profile");
  }

  function confirmarEliminacion(count: number): Promise<boolean> {
    return new Promise((resolve) => setDeletionConfirmation({ count, resolve }));
  }

  function responderConfirmacionEliminacion(accepted: boolean) {
    if (!deletionConfirmation) return;
    deletionConfirmation.resolve(accepted);
    setDeletionConfirmation(null);
  }

  async function handleDeletePublication(pin: Pin): Promise<boolean> {
    if (!user?.id || String(pin.artistId) !== String(user.id)) return false;
    if (!(await confirmarEliminacion(1))) return false;

    try {
      const response = await fetch(`${API}/api/publicaciones/${encodeURIComponent(pin.id)}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usuario_id: user.id }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "No se pudo eliminar la publicación");

      setFeedPins((prev) => prev.filter((publication) => publication.id !== pin.id));
      setHistory((prev) => prev.filter((publication) => publication.id !== pin.id));
      setBoards((prev) => prev.map((board) => ({
        ...board,
        pins: board.pins.filter((publication) => publication.id !== pin.id),
      })));

      const remainingPinStack = pinStack.filter((publication) => publication.id !== pin.id);
      setPinStack(remainingPinStack);
      if (remainingPinStack.length === 0) setView(prevView);

      if (user?.id) {
        cargarFeed(feedMode, user.id);
        cargarPerfil(user.id);
      }
      setSavedNotif(
        data.archivosPendientes > 0
          ? "Publicación eliminada; algunos archivos no se pudieron limpiar"
          : "Publicación eliminada"
      );
      setTimeout(() => setSavedNotif(null), 3000);
      return true;
    } catch (err) {
      console.error("Error al eliminar publicación:", err);
      setSavedNotif(err instanceof Error ? err.message : "No se pudo eliminar la publicación");
      setTimeout(() => setSavedNotif(null), 3000);
      return false;
    }
  }

  async function handleDeleteSelectedPublications(pins: Pin[]): Promise<string[]> {
    if (!user?.id || pins.length === 0) return [];
    if (!(await confirmarEliminacion(pins.length))) return [];

    const results = await Promise.allSettled(
      pins.map(async (pin) => {
        if (String(pin.artistId) !== String(user.id)) {
          throw new Error(`No eres autor de "${pin.title}"`);
        }
        const response = await fetch(`${API}/api/publicaciones/${encodeURIComponent(pin.id)}`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ usuario_id: user.id }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || `No se pudo eliminar "${pin.title}"`);
        return { id: pin.id, archivosPendientes: Number(data.archivosPendientes) || 0 };
      })
    );

    const eliminadas = results.flatMap((result) =>
      result.status === "fulfilled" ? [result.value] : []
    );
    const deletedIds = eliminadas.map((publication) => publication.id);
    if (deletedIds.length > 0) {
      const deleted = new Set(deletedIds);
      setFeedPins((prev) => prev.filter((pin) => !deleted.has(pin.id)));
      setHistory((prev) => prev.filter((pin) => !deleted.has(pin.id)));
      setBoards((prev) => prev.map((board) => ({
        ...board,
        pins: board.pins.filter((pin) => !deleted.has(pin.id)),
      })));
    }

    const failed = results.filter((result) => result.status === "rejected").length;
    const pendingFiles = eliminadas.reduce((total, publication) => total + publication.archivosPendientes, 0);
    if (failed || pendingFiles) {
      const message = failed
        ? `${deletedIds.length} eliminada(s); ${failed} no se pudieron eliminar`
        : "Publicaciones eliminadas; algunos archivos no se pudieron limpiar";
      setSavedNotif(message);
      if (failed) {
        results.forEach((result) => {
          if (result.status === "rejected") console.error("Error al eliminar publicación seleccionada:", result.reason);
        });
      }
    } else {
      setSavedNotif(`${deletedIds.length} publicación${deletedIds.length === 1 ? "" : "es"} eliminada${deletedIds.length === 1 ? "" : "s"}`);
    }
    setTimeout(() => setSavedNotif(null), 3000);
    return deletedIds;
  }

  async function handleToggleFollow(artistId: string, following: boolean) {
    if (!user?.id || !/^\d+$/.test(String(artistId))) return;
    try {
      const response = await fetch(
        `${API}/api/seguimientos/${encodeURIComponent(String(user.id))}/${encodeURIComponent(artistId)}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ following }),
        }
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "No se pudo actualizar el seguimiento");

      setFollowedArtistIds((prev) => {
        const next = new Set(prev);
        if (data.following) next.add(artistId);
        else next.delete(artistId);
        return next;
      });
      setArtists((prev) => prev.map((artist) => (
        String(artist.id) === artistId
          ? { ...artist, followers: Number(data.followersCount) || 0 }
          : artist
      )));
      setUser((prev: any) => prev ? {
        ...prev,
        following: Number(data.followingCount) || 0,
        siguiendo: Number(data.followingCount) || 0,
      } : prev);
      if (feedMode === "Para ti") cargarFeed(feedMode, user.id);
    } catch (err) {
      console.error("Error al actualizar seguimiento:", err);
      setSavedNotif(err instanceof Error ? err.message : "No se pudo actualizar el seguimiento");
      setTimeout(() => setSavedNotif(null), 2500);
    }
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
        feedMode={feedMode}
        onFeedMode={(mode) => {
          setFeedMode(mode);
          localStorage.setItem("opcionFeed", mode);
        }}
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

      {deletionConfirmation && (
        <div
          className="modal-backdrop"
          onClick={() => responderConfirmacionEliminacion(false)}
        >
          <section
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-confirmation-title"
            aria-describedby="delete-confirmation-description"
            className="modal-box"
            onClick={(event) => event.stopPropagation()}
            style={{
              width: 420,
              maxWidth: "92vw",
              padding: 28,
              color: "#e8eef2",
              boxShadow: "0 20px 60px rgba(0,0,0,0.55)",
            }}
          >
            <h2
              id="delete-confirmation-title"
              style={{ margin: "0 0 12px", fontSize: 20, fontWeight: 700, fontFamily: "'Playfair Display', serif" }}
            >
              Confirmar eliminación
            </h2>
            <p
              id="delete-confirmation-description"
              style={{ margin: "0 0 24px", color: "#b0c8d8", fontSize: 14, lineHeight: 1.6 }}
            >
              ¿Seguro que quieres eliminar {deletionConfirmation.count} publicación
              {deletionConfirmation.count === 1 ? "" : "es"}? Esta acción no se puede deshacer
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button
                type="button"
                onClick={() => responderConfirmacionEliminacion(false)}
                className="cat-pill"
                style={{ padding: "10px 18px", cursor: "pointer" }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => responderConfirmacionEliminacion(true)}
                className="cat-pill delete-confirm-accept"
                style={{ padding: "10px 18px" }}
              >
                Aceptar
              </button>
            </div>
          </section>
        </div>
      )}

      {savePins && (
        <ModalGuardarPin
          pins={savePins}
          boards={boards}
          onClose={() => setSavePins(null)}
          onSaveToBoard={handleSaveToBoard}
          onCreateBoard={handleCreateBoard}
        />
      )}

      {view === "feed" && (
        <Home
          pins={filteredPins}
          search={search}
          feedMode={feedMode}
          loading={feedLoading}
          error={feedError}
          artistMap={artistMap}
          onSave={(p) => setSavePins([p])}
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
          isFollowing={profileId ? followedArtistIds.has(String(profileId)) : false}
          onToggleFollow={handleToggleFollow}
          onUpdateUser={handleUpdateUser}
          onBack={() => {
            setView("feed");
            setProfileId(null);
          }}
          onSave={(p) => setSavePins([p])}
          onPinClick={openPin}
          onDeleteSelectedPublications={handleDeleteSelectedPublications}
          onSaveSelectedPublications={(pins) => setSavePins(pins)}
          onSelectArtist={(id) => setProfileId(id)}
        />
      )}

      {view === "pin" && activePin && (
        <DetalleObra
          pin={activePin}
          allPins={allPins}
          artistMap={artistMap}
          currentUser={user}
          isFollowing={followedArtistIds.has(String(activePin.artistId))}
          onToggleFollow={handleToggleFollow}
          onFeedSignal={() => {
            if (user?.id) cargarFeed(feedMode, user.id);
          }}
          isSavedInBoard={savedPublicationIds.has(activePin.id)}
          savedCount={savedPublicationCounts[activePin.id]}
          onDeletePublication={handleDeletePublication}
          onBack={handleBackFromPin}
          onArtist={handleArtist}
          onSave={(p) => setSavePins([p])}
          onSavedChange={(pin, saved, boardId, savesCount) => {
            setSavedPublicationIds((prev) => {
              const next = new Set(prev);
              if (saved) next.add(pin.id);
              else next.delete(pin.id);
              return next;
            });
            if (typeof savesCount === "number") {
              setSavedPublicationCounts((prev) => ({ ...prev, [pin.id]: savesCount }));
            }
            setBoards((prev) => {
              if (!saved) {
                return prev.map((board) => ({
                  ...board,
                  pins: board.pins.filter((savedPin) => savedPin.id !== pin.id),
                }));
              }

              const id = boardId || `saved-${user.id}`;
              const existing = prev.find((board) => board.id === id);
              if (existing) {
                return prev.map((board) =>
                  board.id === id && !board.pins.some((savedPin) => savedPin.id === pin.id)
                    ? { ...board, pins: [...board.pins, pin] }
                    : board
                );
              }
              return [...prev, { id, name: "Guardados", pins: [pin] }];
            });
          }}
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
          onSave={(p) => setSavePins([p])}
        />
      )}

      {view === "crear" && (
        <CrearPublicacion
          currentUser={user}
          onBack={() => setView("feed")}
          onPublish={() => window.location.reload()}
        />
      )}

      {view === "historial" && (
        <Historial
          history={history}
          onSave={(p) => setSavePins([p])}
          onPinClick={openPin}
          onBack={() => setView("feed")}
        />
      )}

      {view === "sobre" && <SobreNosotros onBack={() => setView("feed")} />}
    </div>
  );
}