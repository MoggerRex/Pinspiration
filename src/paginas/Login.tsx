import { useState, useEffect, type ReactNode } from 'react';
import {
  motion,
  AnimatePresence,
  MotionConfig,
  type Variants,
  type Transition,
} from 'framer-motion';
import './Login.css';

interface LoginProps {
  onLogin: (userData: any) => void;
}

/* ─── Misma condición que el @media del CSS ─── */
const MOBILE_QUERY = '(max-width: 768px), (max-width: 1024px) and (max-height: 600px)';

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(query).matches
  );

  useEffect(() => {
    const mq = window.matchMedia(query);
    const handler = () => setMatches(mq.matches);
    handler();
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [query]);

  return matches;
}

/* ─── Configuración de animación ─── */
const spring: Transition = { type: 'spring', stiffness: 120, damping: 20, mass: 1 };

type PanelCustom = { axis: 'x' | 'y'; dir: 1 | -1 };

// Los paneles se deslizan (resorte) y se desvanecen (tween suave)
const panelVariants: Variants = {
  active: {
    x: 0,
    y: 0,
    opacity: 1,
    visibility: 'visible',
    transition: { x: spring, y: spring, opacity: { duration: 0.45 } },
  },
  inactive: ({ axis, dir }: PanelCustom) => ({
    x: axis === 'x' ? `${dir * 100}%` : 0,
    y: axis === 'y' ? `${dir * 100}%` : 0,
    opacity: 0,
    transition: { x: spring, y: spring, opacity: { duration: 0.35 } },
    transitionEnd: { visibility: 'hidden' },
  }),
};

// Entrada escalonada de los elementos internos
const contentVariants: Variants = {
  active: { transition: { staggerChildren: 0.07, delayChildren: 0.25 } },
  inactive: { transition: { staggerChildren: 0.03, staggerDirection: -1 } },
};

const itemVariants: Variants = {
  inactive: { opacity: 0, y: 14 },
  active: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } },
};

/* ─── Componentes ─── */
const Panel = ({
  className,
  active,
  axis,
  dir,
  children,
}: {
  className: string;
  active: boolean;
  axis: 'x' | 'y';
  dir: 1 | -1;
  children: ReactNode;
}) => (
  <motion.div
    className={`${className} ${active ? 'active' : ''}`}
    variants={panelVariants}
    custom={{ axis, dir }}
    initial={false}
    animate={active ? 'active' : 'inactive'}
  >
    {children}
  </motion.div>
);

const Item = ({ children }: { children: ReactNode }) => (
  <motion.div className="stagger-item" variants={itemVariants}>
    {children}
  </motion.div>
);

const CardBackground = ({ activeView }: { activeView: string }) => (
  // `layout` anima automáticamente el cambio de posición definido en el CSS
  <motion.div
    layout
    transition={spring}
    className={`card-bg ${activeView === 'login' ? 'login' : ''}`}
  />
);

const HeroPanel = ({
  type,
  activeView,
  axis,
  dir,
  title,
  text,
  buttonText,
  onToggle,
}: {
  type: string;
  activeView: string;
  axis: 'x' | 'y';
  dir: 1 | -1;
  title: string;
  text: string;
  buttonText: string;
  onToggle: () => void;
}) => (
  <Panel className={`hero ${type}`} active={activeView === type} axis={axis} dir={dir}>
    <motion.div className="hero-content" variants={contentVariants}>
      <motion.h2 variants={itemVariants}>{title}</motion.h2>
      <motion.p variants={itemVariants}>{text}</motion.p>
      <motion.button
        type="button"
        onClick={onToggle}
        variants={itemVariants}
        whileTap={{ scale: 0.96 }}
      >
        {buttonText}
      </motion.button>
    </motion.div>
  </Panel>
);

const SocialButtons = () => (
  <div className="sso-buttons">
    <button type="button" className="sso-btn">G</button>
    <button type="button" className="sso-btn">F</button>
    <button type="button" className="sso-btn">in</button>
  </div>
);

const BrandHeader = () => (
  <div className="brand-header">
    <div className="brand-logo-icon">P</div>
    <span className="brand-title">Pinspiration</span>
  </div>
);

const ErrorMessage = ({ message }: { message: string }) => (
  <motion.div
    className="login-error"
    initial={{ opacity: 0, x: -8 }}
    animate={{ opacity: 1, x: [0, -6, 6, -4, 4, 0] }}
    transition={{ duration: 0.4 }}
  >
    {message}
  </motion.div>
);

export function Login({ onLogin }: LoginProps) {
  const [activeView, setActiveView] = useState<'login' | 'register'>('login');
  const [step, setStep] = useState<'credentials' | 'avatar'>('credentials');

  const isMobile = useMediaQuery(MOBILE_QUERY);
  const axis: 'x' | 'y' = isMobile ? 'y' : 'x';

  // Campos de formulario Login
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Campos de formulario Registro
  const [nombre, setNombre] = useState('');
  const [handle, setHandle] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [avatar, setAvatar] = useState('');
  const [error, setError] = useState('');

  const [tempUser, setTempUser] = useState<any>(null);

  const toggleView = () => {
    setActiveView(activeView === 'login' ? 'register' : 'login');
    setError('');
  };

const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!loginEmail || !loginPassword) {
      setError('Por favor, completa todos los campos.');
      return;
    }

    try {
      const response = await fetch('http://localhost:5000/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: loginEmail,
          password: loginPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Credenciales incorrectas');
        return;
      }

      // Guardar en sesión el usuario real de la base de datos
      localStorage.setItem('pinspiration_user', JSON.stringify(data));
      onLogin(data);
    } catch (err) {
      console.error('Error al conectar con el servidor:', err);
      setError('No se pudo conectar con el servidor. Revisa que backend esté corriendo.');
    }
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!nombre || !handle || !email || !password) {
      setError('Por favor, completa todos los campos requeridos.');
      return;
    }

    const cleanHandle = handle.startsWith('@') ? handle : `@${handle}`;

    const newUser = {
      id: 'u-' + Date.now(),
      nombre,
      handle: cleanHandle,
      email,
      bio: 'Entusiasta del arte y la creatividad visual.',
      headerBg: 'linear-gradient(0deg, #13191d 5%, #00385a 100%)',
      avatar: '',
    };

    setTempUser(newUser);
    setStep('avatar');
  };

  const handleFinishRegister = (avatarUrl?: string) => {
    const defaultAvatar = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200';
    const finalUser = {
      ...tempUser,
      avatar: avatarUrl || defaultAvatar,
    };

    localStorage.setItem('pinspiration_user', JSON.stringify(finalUser));
    onLogin(finalUser);
  };

  const handleAvatarFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setAvatar(ev.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDemoLogin = async () => {
    setError('');
    try {
      const response = await fetch('http://localhost:5000/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'leo@pinspiration.com', password: '123' }),
      });
      const demoUser = await response.json();
      if (!response.ok) {
        setError(demoUser.error || 'No se pudo iniciar la sesión de demostración.');
        return;
      }
      localStorage.setItem('pinspiration_user', JSON.stringify(demoUser));
      onLogin(demoUser);
    } catch (err) {
      console.error('Error al iniciar sesión de demostración:', err);
      setError('No se pudo conectar con el servidor. Revisa que backend esté corriendo.');
    }
  };

  // Dirección de salida de cada panel:
  //  desktop → izquierda (-1) / derecha (+1)
  //  móvil   → arriba (-1) / abajo (+1)
  const dirHeroRegister: 1 | -1 = isMobile ? 1 : -1;
  const dirFormRegister: 1 | -1 = isMobile ? -1 : 1;
  const dirFormLogin: 1 | -1 = isMobile ? 1 : -1;
  const dirHeroLogin: 1 | -1 = isMobile ? -1 : 1;

  return (
    // reducedMotion="user": respeta la preferencia del sistema (quita los movimientos, deja los fades)
    <MotionConfig reducedMotion="user">
      <div className="login-container">
        <AnimatePresence mode="wait" initial={false}>
          {step === 'credentials' ? (
            <motion.div
              // key con isMobile: reinicia las posiciones si cambia el tamaño de pantalla
              key={`card-${isMobile ? 'm' : 'd'}`}
              className="card"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.25 } }}
            >
              <CardBackground activeView={activeView} />

              {/* Panel Hero para el Registro */}
              <HeroPanel
                type="register"
                activeView={activeView}
                axis={axis}
                dir={dirHeroRegister}
                title="¡Bienvenido de nuevo!"
                text="¿Ya tienes cuenta? ¡Inicia sesión e inspírate!"
                buttonText="INICIAR SESIÓN"
                onToggle={toggleView}
              />

              {/* Formulario de Registro */}
              <Panel
                className="form register"
                active={activeView === 'register'}
                axis={axis}
                dir={dirFormRegister}
              >
                <motion.div className="form-content" variants={contentVariants}>
                  <Item><BrandHeader /></Item>
                  <Item><h2>Crear cuenta</h2></Item>
                  <Item><SocialButtons /></Item>
                  {error && activeView === 'register' && <ErrorMessage message={error} />}
                  <Item>
                    <form onSubmit={handleRegisterSubmit}>
                      <input
                        type="text"
                        placeholder="Nombre de creador"
                        value={nombre}
                        onChange={(e) => setNombre(e.target.value)}
                      />
                      <input
                        type="text"
                        placeholder="Handle (@usuario)"
                        value={handle}
                        onChange={(e) => setHandle(e.target.value)}
                      />
                      <input
                        type="email"
                        placeholder="Correo electrónico"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                      <input
                        type="password"
                        placeholder="Contraseña"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                      <motion.button type="submit" whileTap={{ scale: 0.97 }}>
                        REGISTRARSE
                      </motion.button>
                    </form>
                  </Item>
                </motion.div>
              </Panel>

              {/* Panel Hero para el Login */}
              <HeroPanel
                type="login"
                activeView={activeView}
                axis={axis}
                dir={dirHeroLogin}
                title="¡Hola, creador!"
                text="¿Aún no tienes cuenta? ¡Regístrate e inspírate!"
                buttonText="REGISTRARSE"
                onToggle={toggleView}
              />

              {/* Formulario de Login */}
              <Panel
                className="form login"
                active={activeView === 'login'}
                axis={axis}
                dir={dirFormLogin}
              >
                <motion.div className="form-content" variants={contentVariants}>
                  <Item><BrandHeader /></Item>
                  <Item><h2>Iniciar sesión</h2></Item>
                  <Item><SocialButtons /></Item>
                  {error && activeView === 'login' && <ErrorMessage message={error} />}
                  <Item>
                    <form onSubmit={handleLoginSubmit}>
                      <input
                        type="email"
                        placeholder="Correo electrónico"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                      />
                      <input
                        type="password"
                        placeholder="Contraseña"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                      />
                      <motion.button type="submit" whileTap={{ scale: 0.97 }}>
                        INICIAR SESIÓN
                      </motion.button>
                    </form>
                  </Item>

                  <Item>
                    <button
                      type="button"
                      onClick={handleDemoLogin}
                      style={{ marginTop: 8, padding: '8px', fontSize: 11, cursor: 'pointer', background: 'transparent', border: '1px solid #242f38', color: '#7a909f', borderRadius: 10, fontWeight: 500 }}
                    >
                      Entrar rápido como invitado (Valeria Mora)
                    </button>
                  </Item>
                </motion.div>
              </Panel>
            </motion.div>
          ) : (
            /* Paso de Avatar tras el Registro */
            <motion.div
              key="avatar"
              className="login-card-avatar"
              initial={{ opacity: 0, y: 24, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="avatar-step">
                <h3>¿Quieres añadir una foto de perfil?</h3>
                <p className="avatar-sub">Puedes subir una imagen ahora o configurarla después.</p>

                <div className="avatar-preview-box">
                  {avatar ? (
                    <img src={avatar} alt="Preview" className="avatar-preview-img" />
                  ) : (
                    <div className="avatar-placeholder">
                      {tempUser?.nombre?.charAt(0).toUpperCase() || 'P'}
                    </div>
                  )}
                </div>

                <div className="form-group" style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: 13, color: '#7a909f', fontWeight: 500 }}>Sube una imagen</label>
                  <input type="file" accept="image/*" onChange={handleAvatarFile} style={{ marginTop: 4, color: '#e8eef2', fontSize: 13 }} />
                </div>

                <div className="form-group" style={{ marginBottom: 20 }}>
                  <label style={{ fontSize: 13, color: '#7a909f', fontWeight: 500 }}>O pega la URL de una imagen</label>
                  <input
                    type="text"
                    value={avatar}
                    onChange={(e) => setAvatar(e.target.value)}
                    placeholder="https://..."
                    style={{ width: '100%', padding: '10px 14px', background: '#13191d', border: '1.5px solid #242f38', borderRadius: 12, color: '#e8eef2', fontSize: 14, outline: 'none', boxSizing: 'border-box', marginTop: 4 }}
                  />
                </div>

                <div className="avatar-actions" style={{ display: 'flex', gap: 10 }}>
                  <button
                    type="button"
                    onClick={() => handleFinishRegister('')}
                    style={{ flex: 1, padding: '10px', borderRadius: 12, cursor: 'pointer', background: '#13191d', border: '1px solid #242f38', color: '#e8eef2', fontWeight: 600 }}
                  >
                    Omitir
                  </button>
                  <button
                    type="button"
                    onClick={() => handleFinishRegister(avatar)}
                    style={{ flex: 1, padding: '10px', borderRadius: 12, cursor: 'pointer', background: '#00385a', border: 'none', color: '#e8eef2', fontWeight: 600 }}
                  >
                    Guardar y Entrar
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </MotionConfig>
  );
}