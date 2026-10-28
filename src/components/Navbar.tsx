import { useState, useEffect, useRef, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Search,
  MapPin,
  ChevronDown,
  ChevronRight,
  ShoppingCart,
  Bell,
  Heart,
  ShoppingBag,
  Wallet,
  LogOut,
  Clock,
  Shield,
  AlertTriangle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import {
  esUsuarioAdminOSuperAdmin,
  obtenerRolUsuario
} from '../pages/AdminPanel';
import api from '../services/api';

export const CATEGORIAS_FALU = [
  'Todas',
  'Tecnología',
  'Hogar y Muebles',
  'Deportes y Fitness',
  'Herramientas',
  'Gaming y Consolas',
  'Electrodomésticos',
  'Moda y Accesorios',
  'Vehículos y Repuestos'
];

const obtenerEstadoDisciplinarioUsuario = (idUsuario: number, email?: string) => {
  const usuariosSistema = JSON.parse(
    localStorage.getItem('falu_usuarios_sistema') || '[]'
  );

  const usuario = Array.isArray(usuariosSistema)
    ? usuariosSistema.find((item: any) =>
        Number(item.id_usuario) === Number(idUsuario) ||
        (email && String(item.email).toLowerCase() === email.toLowerCase())
      )
    : null;

  const avisos = Number(usuario?.avisos ?? usuario?.avisos_acumulados ?? 0);
  const bloqueadoParaentrar = Boolean(
    usuario?.estado_cuenta === 'suspendido' ||
    usuario?.baneado ||
    usuario?.sancionado
  );
  const ultimoMotivo = usuario?.ultimo_motivo || usuario?.motivo_sancion || '';

  return {
    avisos: Number.isFinite(avisos) ? Math.min(Math.max(avisos, 0), 3) : 0,
    ultimo_motivo: String(ultimoMotivo),
    bloqueadoParaentrar,
    mensajeBloqueo: ultimoMotivo
      ? `Motivo: ${ultimoMotivo}`
      : 'La cuenta fue suspendida por la administración.'
  };
};

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const { totalItems } = useCart();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [textoBusqueda, setTextoBusqueda] = useState(searchParams.get('q') || '');
  const [mostrarHistorial, setMostrarHistorial] = useState(false);
  const [historialBusquedas, setHistorialBusquedas] = useState<string[]>([]);
  const [menuCategoriasAbierto, setMenuCategoriasAbierto] = useState(false);
  const [saldoBilletera, setSaldoBilletera] = useState<number>(0);
  const [notificacionesNoLeidas, setNotificacionesNoLeidas] = useState<number>(0);
  const [avisosAcumulados, setAvisosAcumulados] = useState<number>(0);
  const [ultimoMotivoAviso, setUltimoMotivoAviso] = useState<string>('');

  const buscadorRef = useRef<HTMLFormElement>(null);

  const claveBusquedas = user
    ? `falu_busquedas_${user.id_usuario}`
    : 'falu_busquedas_invitado';

  useEffect(() => {
    setTextoBusqueda(searchParams.get('q') || '');
  }, [searchParams]);

  const sincronizarDatosNavbar = () => {
    const guardadas = JSON.parse(localStorage.getItem(claveBusquedas) || '[]');
    setHistorialBusquedas(Array.isArray(guardadas) ? guardadas : []);

    if (isAuthenticated && user) {
      const todasNotif = JSON.parse(
        localStorage.getItem('falu_notificaciones') || '[]'
      );
      const misNoLeidas = todasNotif.filter(
        (n: any) =>
          Number(n.id_usuario_destino) === Number(user.id_usuario) && !n.leida
      ).length;
      setNotificacionesNoLeidas(misNoLeidas);

      // Verificar si la cuenta tiene avisos (1/3, 2/3, 3/3) o si fue sancionada/baneada
      const disciplina = obtenerEstadoDisciplinarioUsuario(user.id_usuario, user.email);
      setAvisosAcumulados(disciplina.avisos || 0);
      setUltimoMotivoAviso(disciplina.ultimo_motivo || '');

      if (disciplina.bloqueadoParaentrar) {
        alert(
          `Tu sesión fue cerrada porque tu cuenta recibió una sanción administrativa:\n${disciplina.mensajeBloqueo}`
        );
        logout();
        navigate('/login');
      }
    } else {
      setNotificacionesNoLeidas(0);
      setAvisosAcumulados(0);
      setUltimoMotivoAviso('');
    }
  };

  useEffect(() => {
    sincronizarDatosNavbar();
    window.addEventListener('storage', sincronizarDatosNavbar);
    window.addEventListener('falu_actualizacion', sincronizarDatosNavbar);
    return () => {
      window.removeEventListener('storage', sincronizarDatosNavbar);
      window.removeEventListener('falu_actualizacion', sincronizarDatosNavbar);
    };
  }, [isAuthenticated, user, claveBusquedas]);

  useEffect(() => {
    const handleClickAfuera = (e: MouseEvent) => {
      if (buscadorRef.current && !buscadorRef.current.contains(e.target as Node)) {
        setMostrarHistorial(false);
      }
    };
    document.addEventListener('mousedown', handleClickAfuera);
    return () => document.removeEventListener('mousedown', handleClickAfuera);
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      setSaldoBilletera(0);
      return;
    }

    api
      .get('/wallet/balance')
      .then((res) => {
        const saldo = res.data?.saldo_disponible ?? res.data?.saldo ?? 0;
        setSaldoBilletera(Number(saldo));
      })
      .catch(() => setSaldoBilletera(0));
  }, [isAuthenticated]);

  const obtenerIniciales = () => {
    if (!user) return 'IN';
    const n = user.nombre ? user.nombre.trim()[0] : 'U';
    const a = user.apellido ? user.apellido.trim()[0] : '';
    return (n + a).toUpperCase();
  };

  const registrarTerminoBusqueda = (termino: string) => {
    const limpio = termino.trim();
    if (!limpio) return;

    const actuales: string[] = JSON.parse(
      localStorage.getItem(claveBusquedas) || '[]'
    );
    const sinDuplicados = actuales.filter(
      (item) => item.toLowerCase() !== limpio.toLowerCase()
    );
    const nuevas = [limpio, ...sinDuplicados];

    localStorage.setItem(claveBusquedas, JSON.stringify(nuevas));
    setHistorialBusquedas(nuevas);
    window.dispatchEvent(new Event('falu_actualizacion'));
  };

  const ejecutarBusqueda = (termino: string) => {
    const params = new URLSearchParams(searchParams);
    if (termino.trim()) {
      registrarTerminoBusqueda(termino);
      params.set('q', termino.trim());
    } else {
      params.delete('q');
    }
    setMostrarHistorial(false);
    navigate(`/?${params.toString()}`);
  };

  const handleBuscar = (e: FormEvent) => {
    e.preventDefault();
    ejecutarBusqueda(textoBusqueda);
  };

  const seleccionarCategoria = (cat: string) => {
    const params = new URLSearchParams(searchParams);
    if (cat === 'Todas') {
      params.delete('categoria');
    } else {
      params.set('categoria', cat);
    }
    setMenuCategoriasAbierto(false);
    navigate(`/?${params.toString()}`);
  };

  const ultimasCincoBusquedas = historialBusquedas.slice(0, 5);

  return (
    <header className="bg-blue-900 text-white shadow-md sticky top-0 z-40">
      {/* Constancia visible en la cuenta si el usuario acumula avisos administrativos (1/3 a 3/3) */}
      {isAuthenticated && avisosAcumulados > 0 && (
        <div className="bg-amber-500 text-slate-950 text-xs px-4 py-1.5 font-bold">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              Constancia de moderación en tu cuenta: Tenés {avisosAcumulados} de 3 avisos acumulados.
              {ultimoMotivoAviso ? ` Último motivo: "${ultimoMotivoAviso}".` : ''}
            </span>
            <Link to="/notificaciones" className="underline shrink-0">
              Ver detalles
            </Link>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 pt-3 pb-2.5">
        
        {/* FILA 1: Logo + Buscador + Billetera */}
        <div className="flex items-center justify-between gap-4 md:gap-8">
          <Link to="/" className="flex items-center gap-2.5 shrink-0 group">
            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
              <ShoppingBag className="w-6 h-6 text-blue-900" />
            </div>
            <div className="flex flex-col">
              <span className="text-2xl font-extrabold tracking-tight leading-none">
                falú
              </span>
              <span className="text-[10px] text-blue-200 tracking-widest uppercase">
                marketplace
              </span>
            </div>
          </Link>

          <form
            ref={buscadorRef}
            onSubmit={handleBuscar}
            className="flex-1 max-w-2xl relative"
          >
            <div className="relative flex items-center bg-white rounded-md shadow-sm overflow-hidden">
              <input
                type="text"
                value={textoBusqueda}
                onFocus={() => setMostrarHistorial(true)}
                onChange={(e) => setTextoBusqueda(e.target.value)}
                placeholder="Buscar productos, marcas y más..."
                className="w-full py-2.5 pl-4 pr-12 text-sm text-slate-800 placeholder-slate-400 focus:outline-none"
              />
              <button
                type="submit"
                className="absolute right-0 h-full px-3.5 text-slate-500 hover:text-blue-600 border-l border-slate-200 flex items-center justify-center transition-colors"
              >
                <Search className="w-4 h-4" />
              </button>
            </div>

            {mostrarHistorial && ultimasCincoBusquedas.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-white rounded-md shadow-xl border border-slate-200 py-1.5 z-50 text-slate-800">
                {ultimasCincoBusquedas.map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setTextoBusqueda(item);
                      ejecutarBusqueda(item);
                    }}
                    className="w-full px-4 py-2.5 text-left text-sm hover:bg-slate-100 flex items-center gap-3.5 transition-colors"
                  >
                    <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                    <span className="font-medium text-slate-800 truncate">
                      {item}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </form>

          <div className="hidden lg:flex items-center gap-2 bg-blue-950/90 border border-blue-700/60 px-4 py-1.5 rounded-full text-xs">
            <Wallet className="w-4 h-4 text-blue-300 shrink-0" />
            <span className="text-blue-100">Billetera:</span>
            <strong className="text-white font-bold">
              ARS ${saldoBilletera.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
            </strong>
          </div>
        </div>

        {/* FILA 2: Ubicación + Categorías/Vender + [Admin + Perfil o Login] + Mis productos/Mis compras/Favoritos/Notificaciones/Carrito */}
        <div className="flex items-center justify-between mt-3 pt-1 text-xs md:text-sm gap-2">
          
          <div className="flex items-center gap-1.5 text-blue-100 px-2 py-1 shrink-0">
            <MapPin className="w-4 h-4 text-blue-300 shrink-0" />
            <div className="text-left leading-tight">
              <p className="text-[10px] text-blue-200">
                {isAuthenticated && user ? `Usuario: ${user.nombre}` : 'Modo Invitado'}
              </p>
              <p className="font-semibold text-xs">Argentina</p>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-6 text-blue-100 font-medium">
            <div
              className="relative"
              onMouseEnter={() => setMenuCategoriasAbierto(true)}
              onMouseLeave={() => setMenuCategoriasAbierto(false)}
            >
              <button
                type="button"
                onClick={() => setMenuCategoriasAbierto(!menuCategoriasAbierto)}
                className="flex items-center gap-1 hover:text-white py-1 transition-colors"
              >
                <span>Categorías</span>
                <ChevronDown className="w-3.5 h-3.5 opacity-80" />
              </button>

              {menuCategoriasAbierto && (
                <div className="absolute left-0 top-full pt-2 w-64 z-50">
                  <div className="w-3 h-3 bg-neutral-800 rotate-45 ml-6 -mb-1.5" />
                  <div className="bg-neutral-800 text-neutral-100 rounded-md shadow-2xl py-2 border border-neutral-700">
                    {CATEGORIAS_FALU.map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => seleccionarCategoria(cat)}
                        className="w-full px-5 py-2.5 text-left text-sm hover:bg-blue-600 hover:text-white flex items-center justify-between transition-colors"
                      >
                        <span>{cat}</span>
                        <ChevronRight className="w-4 h-4 opacity-60" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => navigate(isAuthenticated ? '/vender' : '/login')}
              className="hover:text-white transition-colors"
            >
              Vender
            </button>
          </nav>

          {/* BLOQUE DERECHO COMPLETO: Siempre muestra todo sin ocultar los accesos */}
          <div className="flex items-center gap-3.5 text-xs md:text-sm font-medium">
            {isAuthenticated && user ? (
              <div className="flex items-center gap-2.5">
                
                {/* Botón Admin / Super Admin EXCLUSIVAMENTE a la izquierda del perfil */}
                {esUsuarioAdminOSuperAdmin(user) && (
                  <Link
                    to="/admin"
                    className="flex items-center gap-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-xs px-3 py-1.5 rounded-full shadow-xs transition-colors shrink-0"
                  >
                    <Shield className="w-3.5 h-3.5" />
                    <span>
                      {obtenerRolUsuario(user) === 'superadmin'
                        ? 'Super Admin'
                        : 'Panel Admin'}
                    </span>
                  </Link>
                )}

                <Link
                  to="/perfil"
                  title="Ir a mi perfil"
                  className="flex items-center gap-2 hover:opacity-90 transition-opacity"
                >
                  <div className="w-7 h-7 rounded-full bg-white text-blue-900 font-extrabold text-xs flex items-center justify-center shadow-sm shrink-0">
                    {obtenerIniciales()}
                  </div>
                  <span className="hidden sm:inline font-semibold uppercase tracking-wide text-xs text-white">
                    {user.nombre}
                  </span>
                </Link>

                <button
                  type="button"
                  onClick={() => {
                    logout();
                    navigate('/');
                  }}
                  title="Cerrar sesión"
                  className="text-blue-200 hover:text-red-300 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              /* Si está deslogueado, siempre muestra Creá tu cuenta e Ingresá */
              <div className="flex items-center gap-2.5">
                <Link
                  to="/register"
                  className="text-blue-100 hover:text-white transition-colors whitespace-nowrap"
                >
                  Creá tu cuenta
                </Link>
                <Link
                  to="/login"
                  className="bg-blue-600 hover:bg-blue-500 text-white px-3.5 py-1 rounded-full font-semibold transition-colors whitespace-nowrap"
                >
                  Ingresá
                </Link>
              </div>
            )}

            {/* Estos 5 accesos quedan FUERA del ternario para verse SIEMPRE */}
            <Link
              to={isAuthenticated ? '/mis-productos' : '/login'}
              className="hidden sm:inline text-blue-100 hover:text-white transition-colors whitespace-nowrap"
            >
              Mis productos
            </Link>

            <Link
              to={isAuthenticated ? '/mis-compras' : '/login'}
              className="hidden sm:inline text-blue-100 hover:text-white transition-colors whitespace-nowrap"
            >
              Mis compras
            </Link>

            <button
              type="button"
              onClick={() => navigate(isAuthenticated ? '/favoritos' : '/login')}
              className="hidden sm:flex items-center gap-1 text-blue-100 hover:text-white transition-colors"
            >
              <span>Favoritos</span>
              <Heart className="w-3.5 h-3.5" />
            </button>

            <Link
              to={isAuthenticated ? '/notificaciones' : '/login'}
              title="Notificaciones"
              className="relative text-blue-100 hover:text-white transition-colors"
            >
              <Bell className="w-5 h-5" />
              {notificacionesNoLeidas > 0 && (
                <span className="absolute -top-1.5 -right-2 bg-red-500 text-white text-[10px] font-bold px-1 min-w-4 h-4 rounded-full flex items-center justify-center">
                  {notificacionesNoLeidas > 99 ? '+99' : notificacionesNoLeidas}
                </span>
              )}
            </Link>

            <Link
              to="/carrito"
              title="Ver carrito de compras"
              className="relative text-blue-100 hover:text-white transition-colors"
            >
              <ShoppingCart className="w-5 h-5" />
              {totalItems > 0 && (
                <span className="absolute -top-1.5 -right-2 bg-blue-500 text-white text-[10px] font-bold px-1 min-w-4 h-4 rounded-full flex items-center justify-center">
                  {totalItems > 99 ? '+99' : totalItems}
                </span>
              )}
            </Link>
          </div>

        </div>
      </div>
    </header>
  );
}