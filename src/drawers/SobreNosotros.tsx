import { IconMail, IconInstagram, IconTwitter, IconLinkedin } from "../componentes/Iconos";
import {
  ArrowLeft,
  LayoutDashboard,
  TableOfContents,
  Users,
  ChartColumnStacked,
} from "lucide-react";

interface SobreNosotrosProps {
  onBack: () => void;
}

export function SobreNosotros({ onBack }: SobreNosotrosProps) {
  return (
    <div style={{ minHeight: "100vh", background: "#13191d", width: "100%" }}>
      {/* Cabecera con degradado a todo el ancho */}
      <div
        style={{
          background: "linear-gradient(0deg, #13191d 5%, #00385a 100%)",
          paddingTop: 32,
          paddingBottom: 24,
          paddingLeft: 24,
          paddingRight: 24,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <h1
              style={{
                margin: "0 0 4px",
                fontFamily: "'Playfair Display', serif",
                fontSize: 32,
                fontWeight: 700,
                color: "#e8eef2",
              }}
            >
              Sobre Nosotros
            </h1>
            <p style={{ margin: 0, color: "#7a909f", fontSize: 14 }}>
              Conoce más sobre la historia y misión de Pinspiration
            </p>
          </div>

          <button
            onClick={onBack}
            className="cat-pill"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              cursor: "pointer",
            }}
          >
            <ArrowLeft size={16} />
            <span>Volver</span>
          </button>
        </div>
        <div style={{ height: 1, background: "#242f38", marginTop: 8 }} />
      </div>

      {/* Contenido principal ocupando todo el ancho de la pantalla */}
      <div
        style={{
          width: "100%",
          padding: "32px 24px 60px",
          boxSizing: "border-box",
        }}
      >
        {/* 1. Nuestra Misión */}
        <div style={{ marginBottom: 40 }}>
          <h3
            style={{
              textAlign: "center",
              margin: "0 0 14px",
              fontFamily: "'Playfair Display', serif",
              fontSize: 22,
              color: "#e8eef2",
            }}
          >
            Nuestra misión y que ofrecemos
          </h3>
          <p
            style={{
              textAlign: "center",
              margin: 0,
              fontSize: 15,
              color: "#b0c8d8",
              lineHeight: 1.8,
            }}
          >
            Pinspiration nació para dar a los artistas un espacio propio — un
            lugar donde el arte 2D, el 3D y la fotografía sean los protagonistas,
            sin ruido ni distracción. Creemos que la inspiración visual merece
            una plataforma hecha exclusivamente para quienes la crean.
          </p>
        </div>

        {/* 2. ¿Qué ofrecemos? (4 columnas con sus respectivos iconos arriba) */}
        <div style={{ marginBottom: 40 }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 24,
            }}
          >
            {[
              {
                icon: (
                  <LayoutDashboard
                    size={28}
                    style={{ color: "#1a7abf", marginBottom: 12 }}
                  />
                ),
                title: "Feed masonry curado",
                desc: "Descubre obras de arte organizadas en un feed visual dinámico.",
              },
              {
                icon: (
                  <TableOfContents
                    size={28}
                    style={{ color: "#1a7abf", marginBottom: 12 }}
                  />
                ),
                title: "Tableros personalizados",
                desc: "Colecciona y organiza los pines que te inspiran en tus propios tableros.",
              },
              {
                icon: (
                  <Users
                    size={28}
                    style={{ color: "#1a7abf", marginBottom: 12 }}
                  />
                ),
                title: "Perfiles de artista",
                desc: "Cada artista tiene su espacio para mostrar toda su obra al mundo.",
              },
              {
                icon: (
                  <ChartColumnStacked
                    size={28}
                    style={{ color: "#1a7abf", marginBottom: 12 }}
                  />
                ),
                title: "Categorías especializadas",
                desc: "Arte 2D, 3D, Fotografía y Edición — sin contenido fuera de lugar.",
              },
            ].map(({ icon, title, desc }) => (
              <div
                key={title}
                style={{
                  textAlign: "center",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                }}
              >
                {icon}
                <p
                  style={{
                    margin: "0 0 8px",
                    fontWeight: 600,
                    fontSize: 15,
                    color: "#e8eef2",
                  }}
                >
                  {title}
                </p>
                <p
                  style={{
                    margin: 0,
                    fontSize: 13,
                    color: "#7a909f",
                    lineHeight: 1.5,
                  }}
                >
                  {desc}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Línea divisoria */}
        <div style={{ height: 1, background: "#242f38", margin: "40px 0" }} />

        {/* 3. Nuestros valores (2 filas de 3 columnas cada una) */}
        <div style={{ marginBottom: 40 }}>
          <h3
            style={{
              textAlign: "center",
              margin: "0 0 20px",
              fontFamily: "'Playfair Display', serif",
              fontSize: 22,
              color: "#e8eef2",
            }}
          >
            Nuestros valores
          </h3>

          <div
            style={{
              textAlign: "center",
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 20,
            }}
          >
            {[
              {
                title: "Inspiración",
                desc: "Fomentamos la creatividad continua al conectar artistas con obras que despiertan nuevas ideas.",
              },
              {
                title: "Arte",
                desc: "Valoramos la expresión visual en todas sus formas: 2D, 3D, fotografía y edición digital.",
              },
              {
                title: "Comunidad",
                desc: "Construimos un entorno de respeto y colaboración enfocado en apoyar a los creadores.",
              },
              {
                title: "Creatividad",
                desc: "Impulsamos la exploración de nuevas técnicas y estilos artísticos sin límites ni restricciones.",
              },
              {
                title: "Diversidad visual",
                desc: "Aceptamos la variedad de disciplinas artísticas dando a cada una su propio lugar.",
              },
              {
                title: "Autenticidad",
                desc: "Promovemos el trabajo original y genuino de cada artista dentro de la plataforma.",
              },
            ].map(({ title, desc }) => (
              <div
                key={title}
                style={{
                  padding: "18px 20px",
                  background: "#1a2228",
                  borderRadius: 14,
                  border: "1px solid #242f38",
                }}
              >
                <p
                  style={{
                    margin: "0 0 6px",
                    fontWeight: 600,
                    fontFamily: "'Playfair Display', serif",
                    fontSize: 16,
                    color: "#1a7abf",
                  }}
                >
                  {title}
                </p>
                <p
                  style={{
                    margin: 0,
                    fontSize: 13,
                    color: "#7a909f",
                    lineHeight: 1.5,
                  }}
                >
                  {desc}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Línea divisoria */}
        <div style={{ height: 1, background: "#242f38", margin: "40px 0" }} />

        {/* Sección de Colaboración / Redes */}
        <div
          style={{
            marginTop: 40,
            padding: "24px 20px",
            background: "#1a2228",
            borderRadius: 16,
            border: "1px solid #242f38",
            textAlign: "center",
          }}
        >
          <p
            style={{
              margin: "0 0 16px",
              fontSize: 14,
              fontWeight: 600,
              color: "#e8eef2",
            }}
          >
            ¿Tienes preguntas o quieres colaborar?
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: 12,
            }}
          >
            {[
              {
                icon: <IconMail />,
                label: "contacto@pinspiration.art",
                href: "mailto:contacto@pinspiration.art",
              },
              {
                icon: <IconInstagram />,
                label: "@pinspiration.art",
                href: "#",
              },
              {
                icon: <IconTwitter />,
                label: "@PinspirationArt",
                href: "#",
              },
              {
                icon: <IconLinkedin />,
                label: "Pinspiration Art",
                href: "#",
              },
            ].map(({ icon, label, href }) => (
              <a
                key={label}
                href={href}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  padding: "10px 14px",
                  background: "#13191d",
                  borderRadius: 10,
                  color: "#b0c8d8",
                  textDecoration: "none",
                  fontSize: 13,
                  border: "1px solid #242f38",
                  transition: "border-color 0.15s, color 0.15s",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = "#00385a";
                  (e.currentTarget as HTMLElement).style.color = "#e8eef2";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = "#242f38";
                  (e.currentTarget as HTMLElement).style.color = "#b0c8d8";
                }}
              >
                {icon}
                <span
                  style={{
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {label}
                </span>
              </a>
            ))}
          </div>
        </div>

        {/* Línea divisoria previa al footer */}
        <div style={{ height: 1, background: "#242f38", margin: "36px 0 20px" }} />

        {/* Footer */}
        <footer style={{ textAlign: "center" }}>
          <p style={{ margin: 0, fontSize: 12, color: "#7a909f" }}>
            © 2026 Pinspiration · Todos los derechos reservados
          </p>
        </footer>
      </div>
    </div>
  );
}