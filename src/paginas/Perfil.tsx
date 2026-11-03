import { useEffect, useState } from "react";
import type { Artist, Pin } from "../tipos";
import { formatNum } from "../ayudantes";
import { TarjetaPin } from "../componentes/TarjetaPin";
import { ArrowLeft, Bookmark, UserRoundPlus, Pencil, X, Trash2, Upload } from "lucide-react";
import { HexColorPicker } from "react-colorful";
import { API, fullUrl } from "../api";

interface PerfilProps {
  profileId: string | null;
  allPins: Pin[];
  currentUser: any;
  artists: Artist[];
  onUpdateUser: (updatedData: any) => void;
  onBack: () => void;
  onSave: (pin: Pin) => void;
  onPinClick: (pin: Pin) => void;
  onDeleteSelectedPublications: (pins: Pin[]) => Promise<string[]>;
  onSaveSelectedPublications: (pins: Pin[]) => void;
  onSelectArtist: (id: string) => void;
  isFollowing: boolean;
  onToggleFollow: (artistId: string, following: boolean) => void;
}

export function Perfil({
  profileId,
  allPins,
  currentUser,
  artists,
  onUpdateUser,
  onBack,
  onSave,
  onPinClick,
  onDeleteSelectedPublications,
  onSaveSelectedPublications,
  onSelectArtist,
  isFollowing,
  onToggleFollow,
}: PerfilProps) {
  // Estado para la ventana flotante de Edición
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editAvatar, setEditAvatar] = useState("");
  const [editHeaderBg, setEditHeaderBg] = useState("");

  // Modo de selección de color: "presets" o "picker"
  const [colorSelectionMode, setColorSelectionMode] = useState<"presets" | "picker">("presets");
  const [customColor, setCustomColor] = useState("#00385a");
  const [followListType, setFollowListType] = useState<"seguidores" | "seguidos" | null>(null);
  const [followUsers, setFollowUsers] = useState<Artist[]>([]);
  const [followListLoading, setFollowListLoading] = useState(false);
  const [followListError, setFollowListError] = useState("");
  const [profilePins, setProfilePins] = useState<Pin[]>([]);
  const [profilePinsLoading, setProfilePinsLoading] = useState(false);
  const [profilePinsError, setProfilePinsError] = useState("");
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedPublicationIds, setSelectedPublicationIds] = useState<Set<string>>(new Set());
  const [deletingSelected, setDeletingSelected] = useState(false);
  const [returnToFollowList, setReturnToFollowList] = useState<{
    profileId: string;
    type: "seguidores" | "seguidos";
  } | null>(null);

  useEffect(() => {
    if (!followListType || !profileId) return;

    let active = true;
    setFollowListLoading(true);
    setFollowListError("");
    fetch(`${API}/api/usuarios/${encodeURIComponent(String(profileId))}/${followListType}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "No se pudo cargar la lista");
        return data;
      })
      .then((data) => {
        if (!active) return;
        setFollowUsers(data.map((user: any) => ({
          id: String(user.artista_id),
          name: user.nombre,
          handle: String(user.handle || "").replace(/^@/, ""),
          avatar: fullUrl(user.avatar),
          bio: user.bio || "",
          followers: Number(user.seguidores) || 0,
          following: Number(user.siguiendo) || 0,
          publications: Number(user.publicaciones) || 0,
          headerBg: user.header_bg,
        })));
      })
      .catch((err) => {
        console.error("Error al cargar la lista de seguimiento:", err);
        if (active) setFollowListError(err instanceof Error ? err.message : "No se pudo cargar la lista");
      })
      .finally(() => {
        if (active) setFollowListLoading(false);
      });

    return () => {
      active = false;
    };
  }, [followListType, profileId]);

  useEffect(() => {
    if (!profileId || !/^\d+$/.test(String(profileId))) {
      setProfilePins([]);
      setProfilePinsLoading(false);
      setProfilePinsError("");
      return;
    }

    let active = true;
    setProfilePinsLoading(true);
    setProfilePinsError("");
    fetch(`${API}/api/perfil/${encodeURIComponent(String(profileId))}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "No se pudieron cargar las publicaciones");
        return data;
      })
      .then((data) => {
        if (!active) return;
        const publicaciones = Array.isArray(data.publicaciones) ? data.publicaciones : [];
        setProfilePins(publicaciones.map((pin: Pin) => ({
          ...pin,
          imgUrl: fullUrl(pin.imgUrl),
          media: pin.media?.map(fullUrl),
        })));
      })
      .catch((err) => {
        console.error("Error al cargar las publicaciones del perfil:", err);
        if (active) {
          setProfilePins([]);
          setProfilePinsError(err instanceof Error ? err.message : "No se pudieron cargar las publicaciones");
        }
      })
      .finally(() => {
        if (active) setProfilePinsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [profileId]);

  useEffect(() => {
    setSelectionMode(false);
    setSelectedPublicationIds(new Set());
  }, [profileId]);

  const isOwnProfile = profileId === currentUser?.id || String(profileId) === String(currentUser?.id) || profileId === "me";

  if (!profileId) {
    return (
      <div style={{ width: "100%", padding: "32px 24px", boxSizing: "border-box" }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, marginBottom: 24 }}>Artistas en Pinspiration</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 16 }}>
          {artists.map((a) => (
            <div key={a.id} onClick={() => onSelectArtist(a.id)}
              style={{ background: "#1a2228", border: "1.5px solid #242f38", borderRadius: 16, padding: 20, cursor: "pointer", transition: "border-color 0.15s, transform 0.15s" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "#00385a"; (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "#242f38"; (e.currentTarget as HTMLElement).style.transform = "translateY(0)"; }}
            >
              <img src={a.avatar} alt={a.name} style={{ width: 56, height: 56, borderRadius: "50%", objectFit: "cover", border: "2px solid #00385a", marginBottom: 12 }} />
              <p style={{ margin: "0 0 2px", fontWeight: 600, fontSize: 16 }}>{a.name}</p>
              <p style={{ margin: "0 0 8px", fontSize: 12, color: "#7a909f" }}>@{a.handle}</p>
              <p style={{ margin: "0 0 12px", fontSize: 13, color: "#b0c8d8", lineHeight: 1.4 }}>{a.bio}</p>
              <span style={{ fontSize: 13, color: "#7a909f" }}><strong style={{ color: "#e8eef2" }}>{formatNum(a.followers)}</strong> seguidores</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Si es mi propio perfil, usamos los datos del usuario logueado
  const artist = isOwnProfile
    ? {
        id: currentUser.id,
        name: currentUser.nombre || currentUser.name || "Usuario",
        handle: currentUser.handle?.startsWith("@") ? currentUser.handle : `@${currentUser.handle || "usuario"}`,
        email: currentUser.email,
        avatar: currentUser.avatar || currentUser.avatar_url || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200",
        bio: currentUser.bio || "Sin descripción aún.",
        followers: currentUser.seguidores ?? 0,
        following: currentUser.siguiendo ?? 0,
        headerBg: currentUser.headerBg || currentUser.header_bg || "linear-gradient(0deg, #13191d 5%, #00385a 100%)",
      }
    : artists.find((a) => String(a.id) === String(profileId)) || artists[0];

  if (!artist) {
    return (
      <div role="status" style={{ textAlign: "center", padding: "72px 20px", color: "#7a909f" }}>
        <p>Este artista no está disponible.</p>
        <button type="button" onClick={onBack}>Volver</button>
      </div>
    );
  }

  const pins = /^\d+$/.test(String(profileId))
    ? profilePins
    : allPins.filter((p) => String(p.artistId) === String(isOwnProfile ? currentUser.id : profileId));
  const artistMap = Object.fromEntries(artists.map((a) => [a.id, a]));
  const selectedPublications = pins.filter((pin) => selectedPublicationIds.has(pin.id));

  const togglePublicationSelection = (pin: Pin) => {
    setSelectedPublicationIds((previous) => {
      const next = new Set(previous);
      if (next.has(pin.id)) next.delete(pin.id);
      else next.add(pin.id);
      return next;
    });
  };

  const cancelSelection = () => {
    setSelectionMode(false);
    setSelectedPublicationIds(new Set());
  };

  const handleDeleteSelected = async () => {
    if (selectedPublications.length === 0 || deletingSelected) return;
    setDeletingSelected(true);
    try {
      const deletedIds = await onDeleteSelectedPublications(selectedPublications);
      if (deletedIds.length > 0) {
        setProfilePins((previous) => previous.filter((pin) => !deletedIds.includes(pin.id)));
        setSelectedPublicationIds((previous) => {
          const next = new Set(previous);
          deletedIds.forEach((id) => next.delete(id));
          return next;
        });
      }
    } finally {
      setDeletingSelected(false);
    }
  };

  const handleOpenEdit = () => {
    setEditName(artist.name);
    setEditBio(artist.bio);
    setEditAvatar(artist.avatar);
    setEditHeaderBg(artist.headerBg || "linear-gradient(0deg, #13191d 5%, #00385a 100%)");
    setColorSelectionMode("presets");
    setIsEditing(true);
  };

  const handleSaveEdit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const updated = {
      ...currentUser,
      nombre: editName,
      name: editName,
      bio: editBio,
      avatar: editAvatar,
      headerBg: editHeaderBg,
    };
    onUpdateUser(updated);
    setIsEditing(false);
  };

  const handleAvatarFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setEditAvatar(ev.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const PRESET_COLOR_GRID = [
    [
      { label: "Transparente", value: "transparent" },
      { label: "Pinspiration", value: "linear-gradient(0deg, #13191d 5%, #00385a 100%)" },
      { label: "Rojo", value: "linear-gradient(0deg, #13191d 5%, #8b0000 100%)" },
      { label: "Verde", value: "linear-gradient(0deg, #13191d 5%, #006400 100%)" },
    ],
    [
      { label: "Morado", value: "linear-gradient(0deg, #13191d 5%, #4b0082 100%)" },
      { label: "Dorado", value: "linear-gradient(0deg, #13191d 5%, #b8860b 100%)" },
      { label: "Negro", value: "#000000" },
      { label: "Blanco", value: "#ffffff" },
    ],
  ];

  const applyCustomColor = (hex: string) => {
    setCustomColor(hex);
    const bgGradient = `linear-gradient(0deg, #13191d 5%, ${hex} 100%)`;
    setEditHeaderBg(bgGradient);
  };

  const headerBgValue = artist.headerBg || "";
  const isWhiteHeader =
    headerBgValue === "#ffffff" ||
    headerBgValue.toLowerCase() === "#fff" ||
    headerBgValue.toLowerCase().includes("#ffffff");

  const openFollowList = (type: "seguidores" | "seguidos") => {
    setReturnToFollowList(null);
    setFollowListType(type);
  };

  const handleProfileBack = () => {
    if (returnToFollowList) {
      const previousList = returnToFollowList;
      setReturnToFollowList(null);
      onSelectArtist(previousList.profileId);
      setFollowListType(previousList.type);
      return;
    }
    onBack();
  };

  if (followListType) {
    return (
      <main style={{ minHeight: "100vh", padding: "28px 20px 60px", background: "#13191d", color: "#e8eef2" }}>
        <div style={{ maxWidth: 760, margin: "0 auto" }}>
          <button
            type="button"
            onClick={() => setFollowListType(null)}
            className="cat-pill"
            style={{ display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 24 }}
          >
            <ArrowLeft size={16} />
            <span>Volver al perfil</span>
          </button>
          <h1 style={{ margin: "0 0 6px", fontFamily: "'Playfair Display', serif", fontSize: 28 }}>
            {followListType === "seguidores" ? "Seguidores" : "Siguiendo"}
          </h1>
          <p style={{ margin: "0 0 24px", color: "#7a909f", fontSize: 14 }}>
            {followListType === "seguidores"
              ? `Personas que siguen a ${artist.name}`
              : `Artistas que sigue ${artist.name}`}
          </p>
          {followListLoading ? (
            <p style={{ color: "#7a909f", padding: "40px 0", textAlign: "center" }}>Cargando…</p>
          ) : followListError ? (
            <p role="alert" style={{ color: "#ff8a8a", padding: "40px 0", textAlign: "center" }}>{followListError}</p>
          ) : followUsers.length === 0 ? (
            <p style={{ color: "#7a909f", padding: "40px 0", textAlign: "center" }}>
              {followListType === "seguidores"
                ? "Aún no tiene seguidores."
                : "Aún no sigue a ningún artista."}
            </p>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
              {followUsers.map((followUser) => (
                <button
                  key={followUser.id}
                  type="button"
                  onClick={() => {
                    setReturnToFollowList({ profileId: String(profileId), type: followListType });
                    setFollowListType(null);
                    onSelectArtist(followUser.id);
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    padding: 16,
                    background: "#1a2228",
                    border: "1px solid #242f38",
                    borderRadius: 14,
                    color: "#e8eef2",
                    textAlign: "left",
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
                    src={followUser.avatar}
                    alt=""
                    style={{ width: 52, height: 52, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
                  />
                  <span style={{ minWidth: 0 }}>
                    <strong style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {followUser.name}
                    </strong>
                    <small style={{ display: "block", marginTop: 4, color: "#7a909f" }}>@{followUser.handle}</small>
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </main>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#13191d" }}>
      {/* Cabecera del Perfil estilo Móvil */}
      <div
        style={{
          background: artist.headerBg || "linear-gradient(0deg, #13191d 5%, #00385a 100%)",
          paddingTop: 24,
          paddingBottom: 24,
          paddingLeft: 20,
          paddingRight: 20,
          transition: "background 0.3s ease",
        }}
      >
        {/* 1. Fila con Foto y a la altura de la foto el Nombre y estadísticas */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 12 }}>
          <img
            src={artist.avatar}
            alt={artist.name}
            style={{ width: 84, height: 84, borderRadius: "50%", objectFit: "cover", border: "3px solid #00385a", flexShrink: 0 }}
          />
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
            <h1
              style={{
                margin: 0,
                fontFamily: "'Playfair Display', serif",
                fontSize: 22,
                fontWeight: 700,
                color: isWhiteHeader ? "#111111" : "#e8eef2",
              }}
            >
              {artist.name}
            </h1>

            {/* Estadísticas: pines, seguidores, siguiendo */}
            <div style={{ display: "flex", gap: 16, fontSize: 13 }}>
              <div>
                <strong style={{ display: "block", color: isWhiteHeader ? "#111111" : "#e8eef2", fontSize: 14 }}>{pins.length}</strong>
                <span style={{ color: isWhiteHeader ? "#555555" : "#7a909f", fontSize: 11 }}>pines</span>
              </div>
              <button
                type="button"
                onClick={() => openFollowList("seguidores")}
                style={{ background: "none", border: 0, padding: 0, textAlign: "left", cursor: "pointer", color: "inherit" }}
              >
                <strong style={{ display: "block", color: isWhiteHeader ? "#111111" : "#e8eef2", fontSize: 14 }}>{formatNum(artist.followers)}</strong>
                <span style={{ color: isWhiteHeader ? "#555555" : "#7a909f", fontSize: 11 }}>seguidores</span>
              </button>
              <button
                type="button"
                onClick={() => openFollowList("seguidos")}
                style={{ background: "none", border: 0, padding: 0, textAlign: "left", cursor: "pointer", color: "inherit" }}
              >
                <strong style={{ display: "block", color: isWhiteHeader ? "#111111" : "#e8eef2", fontSize: 14 }}>{formatNum(artist.following)}</strong>
                <span style={{ color: isWhiteHeader ? "#555555" : "#7a909f", fontSize: 11 }}>siguiendo</span>
              </button>
            </div>
          </div>
        </div>

        {/* 2. Handle (@usuario) debajo de la foto de perfil */}
        <p style={{ margin: "0 0 4px", fontSize: 13, color: isWhiteHeader ? "#444444" : "#7a909f", fontWeight: 500 }}>
          {artist.handle?.startsWith("@") ? artist.handle : `@${artist.handle}`}
        </p>

        {/* 3. Correo electrónico abajo del handle */}
        {isOwnProfile && currentUser?.email && (
          <p style={{ margin: "0 0 10px", color: isWhiteHeader ? "#004080" : "#5db8e8", fontSize: 13 }}>
            {currentUser.email}
          </p>
        )}

        {/* 4. Biografía abajo del correo */}
        <p
          style={{
            margin: "0 0 16px",
            fontSize: 14,
            color: isWhiteHeader ? "#333333" : "#b0c8d8",
            lineHeight: 1.4,
          }}
        >
          {artist.bio}
        </p>

        {/* 5. Botón de editar perfil ubicado al extremo izquierdo dentro de contenedor tipo píldora */}
        {isOwnProfile ? (
          <button
            onClick={handleOpenEdit}
            className="cat-pill"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 16px",
              fontSize: 13,
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            <Pencil size={15} />
            <span>Editar perfil</span>
          </button>
        ) : /^\d+$/.test(String(artist.id)) ? (
          <button
            onClick={() => onToggleFollow(String(artist.id), !isFollowing)}
            className="cat-pill"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 16px",
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            <UserRoundPlus size={16} />
            <span>{isFollowing ? "Siguiendo" : "Seguir"}</span>
          </button>
        ) : null}

        <div style={{ height: 1, background: "#242f38", marginTop: 16 }} />
      </div>

      {/* Grid de Publicaciones */}
      <div style={{ width: "100%", padding: `16px 20px ${selectionMode ? 116 : 60}px`, boxSizing: "border-box" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontFamily: "'Playfair Display', serif", fontSize: 20, color: "#e8eef2", fontWeight: 600 }}>
            Publicaciones
          </h3>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {isOwnProfile && (
              <button
                type="button"
                onClick={selectionMode ? cancelSelection : () => setSelectionMode(true)}
                className="cat-pill"
                style={{ display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer" }}
              >
                {selectionMode && <X size={16} />}
                <span>{selectionMode ? "Cancelar" : "Seleccionar"}</span>
              </button>
            )}
            <button
              onClick={handleProfileBack}
              className="cat-pill"
              style={{ display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer" }}
            >
              <ArrowLeft size={16} />
              <span>Volver</span>
            </button>
          </div>
        </div>

        {profilePinsLoading && /^\d+$/.test(String(profileId)) ? (
          <p style={{ color: "#7a909f", textAlign: "center", padding: "60px 0" }}>Cargando publicaciones…</p>
        ) : profilePinsError && /^\d+$/.test(String(profileId)) ? (
          <p role="alert" style={{ color: "#ff8a8a", textAlign: "center", padding: "60px 0" }}>{profilePinsError}</p>
        ) : pins.length === 0 ? (
          <p style={{ color: "#7a909f", textAlign: "center", padding: "60px 0" }}>No hay pines aún.</p>
        ) : (
          <div className="masonry-grid">
            {pins.map((pin) => (
              <TarjetaPin
                key={pin.id}
                pin={pin}
                artist={isOwnProfile ? artist : artistMap[pin.artistId]}
                onSave={onSave}
                onArtist={() => {}}
                onPinClick={onPinClick}
                selectionMode={isOwnProfile && selectionMode}
                selected={selectedPublicationIds.has(pin.id)}
                onToggleSelection={togglePublicationSelection}
              />
            ))}
          </div>
        )}
      </div>

      {isOwnProfile && selectionMode && (
        <footer
          style={{
            position: "fixed",
            inset: "auto 0 0",
            zIndex: 900,
            display: "grid",
            gridTemplateColumns: "1fr auto 1fr",
            alignItems: "center",
            gap: 12,
            padding: "14px 20px calc(14px + env(safe-area-inset-bottom))",
            background: "rgba(26, 34, 40, 0.97)",
            borderTop: "1px solid #2b3942",
            boxShadow: "0 -8px 24px rgba(0,0,0,0.28)",
            backdropFilter: "blur(12px)",
          }}
        >
          <button
            type="button"
            aria-label="Guardar publicaciones seleccionadas"
            disabled={selectedPublications.length === 0}
            onClick={() => {
              onSaveSelectedPublications(selectedPublications);
              cancelSelection();
            }}
            style={{
              justifySelf: "start",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 44,
              height: 44,
              color: "#fff",
              background: selectedPublications.length ? "#00385a" : "#263139",
              border: 0,
              borderRadius: 12,
              cursor: selectedPublications.length ? "pointer" : "not-allowed",
              opacity: selectedPublications.length ? 1 : 0.55,
            }}
          >
            <Bookmark size={18} />
          </button>
          <span style={{ color: "#b0c8d8", fontSize: 14, fontWeight: 600, textAlign: "center", whiteSpace: "nowrap" }}>
            Seleccionar publicaciones
            {selectedPublications.length > 0 && (
              <small style={{ display: "block", marginTop: 2, color: "#7a909f", fontSize: 11 }}>
                {selectedPublications.length} seleccionada{selectedPublications.length === 1 ? "" : "s"}
              </small>
            )}
          </span>
          <button
            type="button"
            aria-label="Eliminar publicaciones seleccionadas"
            disabled={selectedPublications.length === 0 || deletingSelected}
            onClick={handleDeleteSelected}
            style={{
              justifySelf: "end",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 44,
              height: 44,
              color: "#fff",
              background: selectedPublications.length ? "#8b2635" : "#263139",
              border: 0,
              borderRadius: 12,
              cursor: selectedPublications.length && !deletingSelected ? "pointer" : "not-allowed",
              opacity: selectedPublications.length ? 1 : 0.55,
            }}
          >
            <Trash2 size={18} />
          </button>
        </footer>
      )}

      {/* Modal de Edición de Perfil */}
      {isEditing && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.75)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: 20,
          }}
        >
          <div
            style={{
              background: "#1a2228",
              border: "1px solid #242f38",
              borderRadius: 20,
              padding: 28,
              width: "100%",
              maxWidth: 480,
              boxShadow: "0 16px 40px rgba(0,0,0,0.6)",
              position: "relative",
            }}
          >
            {colorSelectionMode === "presets" ? (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                  <h3 style={{ margin: 0, fontFamily: "'Playfair Display', serif", fontSize: 22, color: "#e8eef2" }}>
                    Editar Perfil
                  </h3>
                  <button
                    onClick={() => setIsEditing(false)}
                    style={{ background: "none", border: "none", color: "#7a909f", cursor: "pointer" }}
                  >
                    <X size={20} />
                  </button>
                </div>

                <form onSubmit={handleSaveEdit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <label style={{ fontSize: 13, color: "#7a909f", fontWeight: 500 }}>
                    Nombre
                    <input
                      className="search-bar"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      style={{ display: "block", width: "100%", marginTop: 4, padding: "8px 12px", fontSize: 13 }}
                    />
                  </label>

                  <label style={{ fontSize: 13, color: "#7a909f", fontWeight: 500 }}>
                    Descripción / Bio
                    <textarea
                      value={editBio}
                      onChange={(e) => setEditBio(e.target.value)}
                      rows={3}
                      style={{
                        display: "block",
                        width: "100%",
                        marginTop: 4,
                        padding: "8px 12px",
                        background: "#13191d",
                        border: "1.5px solid #242f38",
                        borderRadius: 12,
                        color: "#e8eef2",
                        fontSize: 13,
                        fontFamily: "'DM Sans', sans-serif",
                        resize: "vertical",
                        outline: "none",
                      }}
                    />
                  </label>

                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <span style={{ fontSize: 13, color: "#7a909f", fontWeight: 500 }}>Foto de perfil</span>
                    <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                      <img
                        src={editAvatar}
                        alt="preview"
                        style={{ width: 48, height: 48, borderRadius: "50%", objectFit: "cover", border: "2px solid #00385a" }}
                      />
                      <label
                        className="btn-secondary"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          fontSize: 12,
                          padding: "6px 12px",
                          cursor: "pointer",
                        }}
                      >
                        <Upload size={14} />
                        <span>Subir imagen</span>
                        <input type="file" accept="image/*" onChange={handleAvatarFile} style={{ display: "none" }} />
                      </label>
                    </div>
                    <input
                      className="search-bar"
                      value={editAvatar}
                      onChange={(e) => setEditAvatar(e.target.value)}
                      placeholder="O pega una URL de imagen..."
                      style={{ width: "100%", marginTop: 4, padding: "6px 12px", fontSize: 12 }}
                    />
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <span style={{ fontSize: 13, color: "#7a909f", fontWeight: 500 }}>Color del fondo del encabezado</span>
                    
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        type="button"
                        onClick={() => setColorSelectionMode("presets")}
                        className="btn-secondary"
                        style={{
                          flex: 1,
                          padding: "6px 12px",
                          fontSize: 12,
                          background: "#00385a",
                          color: "#fff",
                          borderColor: "#00385a",
                        }}
                      >
                        Predefinidos
                      </button>
                      <button
                        type="button"
                        onClick={() => setColorSelectionMode("picker")}
                        className="btn-secondary"
                        style={{
                          flex: 1,
                          padding: "6px 12px",
                          fontSize: 12,
                          background: "#13191d",
                          color: "#7a909f",
                          borderColor: "#242f38",
                        }}
                      >
                        Cuadrado cromático
                      </button>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 4 }}>
                      {PRESET_COLOR_GRID.map((row, rIdx) => (
                        <div key={rIdx} style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
                          {row.map((opt) => (
                            <button
                              key={opt.label}
                              type="button"
                              onClick={() => setEditHeaderBg(opt.value)}
                              style={{
                                padding: "8px 4px",
                                borderRadius: 10,
                                border: editHeaderBg === opt.value ? "2px solid #5db8e8" : "1px solid #242f38",
                                background: opt.value === "transparent" ? "#13191d" : opt.value,
                                color: opt.value === "#ffffff" ? "#000" : "#fff",
                                fontSize: 11,
                                fontWeight: 600,
                                cursor: "pointer",
                                textAlign: "center",
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                              }}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      className="btn-secondary"
                      style={{ flex: 1 }}
                    >
                      Cancelar
                    </button>
                    <button type="submit" className="btn-primary" style={{ flex: 1 }}>
                      Guardar cambios
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <button
                    type="button"
                    onClick={() => setColorSelectionMode("presets")}
                    className="cat-pill"
                    style={{ display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer" }}
                  >
                    <ArrowLeft size={16} />
                    <span>Volver</span>
                  </button>
                  <h4 style={{ margin: 0, fontFamily: "'Playfair Display', serif", fontSize: 18, color: "#e8eef2" }}>
                    Seleccionar Color
                  </h4>
                </div>

                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 16,
                    padding: 16,
                    background: "#13191d",
                    borderRadius: 16,
                    border: "1px solid #242f38",
                  }}
                >
                  <div style={{ width: "100%", display: "flex", justifyContent: "center" }}>
                    <HexColorPicker
                      color={customColor}
                      onChange={(col) => applyCustomColor(col)}
                      style={{ width: "100%", height: 180 }}
                    />
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 12, width: "100%" }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: 12, color: "#7a909f", display: "block", marginBottom: 4 }}>
                        Código Hexadecimal
                      </label>
                      <input
                        className="search-bar"
                        value={customColor}
                        onChange={(e) => applyCustomColor(e.target.value)}
                        placeholder="#000000"
                        style={{ width: "100%", padding: "8px 12px", fontSize: 14, fontFamily: "monospace" }}
                      />
                    </div>

                    <div style={{ textAlign: "center" }}>
                      <span style={{ fontSize: 12, color: "#7a909f", display: "block", marginBottom: 4 }}>
                        Muestra
                      </span>
                      <div
                        style={{
                          width: 48,
                          height: 38,
                          borderRadius: 10,
                          background: customColor,
                          border: "2px solid #242f38",
                          boxShadow: "0 2px 8px rgba(0,0,0,0.4)",
                        }}
                      />
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                  <button
                    type="button"
                    onClick={() => setColorSelectionMode("presets")}
                    className="btn-secondary"
                    style={{ flex: 1 }}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSaveEdit()}
                    className="btn-primary"
                    style={{ flex: 1 }}
                  >
                    Guardar cambios
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}