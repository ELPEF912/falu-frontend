import { useState, useEffect, useRef, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ShoppingBag,
  Search,
  MapPin,
  ChevronDown,
  Heart,
  Bell,
  ShoppingCart,
  User as UserIcon,
  LogOut,
  Shield,
  Clock,
  X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { esUsuarioAdminOSuperAdmin, obtenerRolUsuario } from '../pages/AdminPanel';

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

export function obtenerDireccionConNumeroUsuario(idUsuario?: number): string | null {
  if (!idUsuario) return null;

  const formatearDir = (d: any): string | null => {
    if (!d || typeof d !== 'object') return null;
    const calle = String(d.calle || d.direccion || d.domicilio || '').trim();
    const numero = String(d.numero || d.altura || d.nro || '').trim();
    if (!calle) return null;
    return numero ? `${calle} ${numero}` : calle;
  };

  try {
    // 1. Buscar en el diccionario general falu_perfiles_usuarios
    const perfiles = JSON.parse(
      localStorage.getItem('falu_perfiles_usuarios') || '{}'
    );
    const miPerfil = perfiles[idUsuario] || perfiles[String(idUsuario)];
    if (miPerfil) {
      if (Array.isArray(miPerfil.direcciones) && miPerfil.direcciones.length > 0) {
        const dirPrincipal =
          miPerfil.direcciones.find((d: any) => d.principal || d.predeterminada) ||
          miPerfil.direcciones[0];
        const texto = formatearDir(dirPrincipal);
        if (texto) return texto;
      }
      const textoDirecto = formatearDir(miPerfil);
      if (textoDirecto) return textoDirecto;
    }

    // 2. Buscar en clave individual falu_perfil_{id} o falu_direcciones_{id}
    const perfilIndividual = JSON.parse(
      localStorage.getItem(`falu_perfil_${idUsuario}`) || 'null'
    );
    if (perfilIndividual) {
      if (
        Array.isArray(perfilIndividual.direcciones) &&
        perfilIndividual.direcciones.length > 0
      ) {
        const dirP =
          perfilIndividual.direcciones.find(
            (d: any) => d.principal || d.predeterminada
          ) || perfilIndividual.direcciones[0];
        const texto = formatearDir(dirP);
        if (texto) return texto;
      }
      const textoInd = formatearDir(perfilIndividual);
      if (textoInd) return textoInd;
    }

    const dirsIndividuales = JSON.parse(
      localStorage.getItem(`falu_direcciones_${idUsuario}`) || '[]'
    );
    if (Array.isArray(dirsIndividuales) && dirsIndividuales.length > 0) {
      const dirP =
        dirsIndividuales.find((d: any) => d.principal || d.predeterminada) ||
        dirsIndividuales[0];
      const texto = formatearDir(dirP);
      if (texto) return texto;
    }
  } catch {
  }

  return null;
}

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const { totalItems } = useCart();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [terminoBusqueda, setTerminoBusqueda] = useState(
    searchParams.get('q') || ''
  );
  const [mostrarHistorial, setMostrarHistorial] = useState(false);
  const [ultimasBusquedas, setUltimasBusquedas] = useState<string[]>([]);
  const [menuCategoriasAbierto, setMenuCategoriasAbierto] = useState(false);
  const [posicionMenuLeft, setPosicionMenuLeft] = useState(16);

  const [notificacionesNoLeidas, setNotificacionesNoLeidas] = useState(0);
  const [direccionPrincipalTexto, setDireccionPrincipalTexto] =
    useState('Argentina');

  const buscadorRef = useRef<HTMLDivElement>(null);
  const categoriasRef = useRef<HTMLDivElement>(null);
  const botonCategoriasRef = useRef<HTMLButtonElement>(null);
  const contenedorHeaderRef = useRef<HTMLDivElement>(null);

  const esAdmin = esUsuarioAdminOSuperAdmin(user);
  const rolActual = obtenerRolUsuario(user);

  const actualizarContadoresEnVivo = () => {
    if (!isAuthenticated || !user) {
      setNotificacionesNoLeidas(0);
      setDireccionPrincipalTexto('Argentina');
      return;
    }

    // 1. Contador de Notificaciones no leídas
    const todasNotif = JSON.parse(
      localStorage.getItem('falu_notificaciones') || '[]'
    );
    const misNoLeidas = todasNotif.filter(
      (n: any) =>
        Number(n.id_usuario_destino) === Number(user.id_usuario) && !n.leida
    ).length;
    setNotificacionesNoLeidas(misNoLeidas);

    // 2. Dirección con calle y número
    const dirConNumero = obtenerDireccionConNumeroUsuario(user.id_usuario);
    setDireccionPrincipalTexto(dirConNumero || 'Agregar dirección');

    // 3. Historial de búsqueda (últimas 5)
    const claveHist = `falu_historial_busqueda_${user.id_usuario}`;
    const hist: string[] = JSON.parse(localStorage.getItem(claveHist) || '[]');
    setUltimasBusquedas(hist.slice(0, 5));
  };

  useEffect(() => {
    actualizarContadoresEnVivo();
    window.addEventListener('falu_actualizacion', actualizarContadoresEnVivo);
    window.addEventListener('storage', actualizarContadoresEnVivo);
    window.addEventListener('focus', actualizarContadoresEnVivo);
    return () => {
      window.removeEventListener('falu_actualizacion', actualizarContadoresEnVivo);
      window.removeEventListener('storage', actualizarContadoresEnVivo);
      window.removeEventListener('focus', actualizarContadoresEnVivo);
    };
  }, [isAuthenticated, user]);

  useEffect(() => {
    const cerrarMenusAlClickAfuera = (e: MouseEvent) => {
      if (
        buscadorRef.current &&
        !buscadorRef.current.contains(e.target as Node)
      ) {
        setMostrarHistorial(false);
      }
      if (
        categoriasRef.current &&
        !categoriasRef.current.contains(e.target as Node)
      ) {
        setMenuCategoriasAbierto(false);
      }
    };
    document.addEventListener('mousedown', cerrarMenusAlClickAfuera);
    return () =>
      document.removeEventListener('mousedown', cerrarMenusAlClickAfuera);
  }, []);

  const toggleMenuCategorias = () => {
    if (
      !menuCategoriasAbierto &&
      botonCategoriasRef.current &&
      contenedorHeaderRef.current
    ) {
      const rectBoton = botonCategoriasRef.current.getBoundingClientRect();
      const rectHeader = contenedorHeaderRef.current.getBoundingClientRect();
      const leftCalculado = Math.max(12, rectBoton.left - rectHeader.left);
      setPosicionMenuLeft(leftCalculado);
    }
    setMenuCategoriasAbierto(!menuCategoriasAbierto);
  };

  const guardarTerminoEnHistorial = (termino: string) => {
    const limpio = termino.trim();
    if (!limpio || !user) return;
    const claveHist = `falu_historial_busqueda_${user.id_usuario}`;
    const actual: string[] = JSON.parse(localStorage.getItem(claveHist) || '[]');
    const sinDuplicados = [
      limpio,
      ...actual.filter((item) => item.toLowerCase() !== limpio.toLowerCase())
    ];
    localStorage.setItem(claveHist, JSON.stringify(sinDuplicados));
    setUltimasBusquedas(sinDuplicados.slice(0, 5));
  };

  const ejecutarBusqueda = (termino: string) => {
    const limpio = termino.trim();
    if (limpio) {
      guardarTerminoEnHistorial(limpio);
      navigate(`/?q=${encodeURIComponent(limpio)}`);
    } else {
      navigate('/');
    }
    setMostrarHistorial(false);
  };

  const handleSubmitBusqueda = (e: FormEvent) => {
    e.preventDefault();
    ejecutarBusqueda(terminoBusqueda);
  };

  const borrarItemHistorial = (terminoABorrar: string) => {
    if (!user) return;
    const claveHist = `falu_historial_busqueda_${user.id_usuario}`;
    const actual: string[] = JSON.parse(localStorage.getItem(claveHist) || '[]');
    const filtrado = actual.filter((item) => item !== terminoABorrar);
    localStorage.setItem(claveHist, JSON.stringify(filtrado));
    setUltimasBusquedas(filtrado.slice(0, 5));
  };

  const formatearTope99 = (cantidad: number) => {
    if (cantidad > 99) return '+99';
    return String(cantidad);
  };

  return (
    <header className="bg-blue-900 text-white shadow-md sticky top-0 z-40 w-full">
      <div
        ref={contenedorHeaderRef}
        className="max-w-7xl mx-auto px-3 sm:px-4 pt-3 pb-2 relative"
      >
        <div className="flex items-center justify-between gap-2.5 sm:gap-6">
          <Link to="/" className="flex items-center gap-2 shrink-0 group">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white text-blue-900 flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div className="leading-none">
              <span className="text-xl sm:text-2xl font-black tracking-tight block">
                falú
              </span>
              <span className="text-[8px] sm:text-[9px] tracking-widest uppercase text-blue-200 font-bold">
                Marketplace
              </span>
            </div>
          </Link>

          <div ref={buscadorRef} className="flex-1 max-w-2xl relative min-w-0">
            <form onSubmit={handleSubmitBusqueda} className="relative flex">
              <input
                type="text"
                value={terminoBusqueda}
                onFocus={() => setMostrarHistorial(true)}
                onChange={(e) => setTerminoBusqueda(e.target.value)}
                placeholder="Buscar productos, marcas y más..."
                className="w-full pl-3.5 pr-10 py-2 sm:py-2.5 rounded-xl bg-white text-slate-900 text-xs sm:text-sm placeholder:text-slate-400 focus:outline-none shadow-xs"
              />
              <button
                type="submit"
                className="absolute right-0 inset-y-0 px-3 text-slate-500 hover:text-blue-900 flex items-center justify-center"
              >
                <Search className="w-4 h-4" />
              </button>
            </form>

            {mostrarHistorial && ultimasBusquedas.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1.5 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 text-slate-800">
                <div className="px-3.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Últimas búsquedas
                </div>
                {ultimasBusquedas.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between px-3.5 py-2 hover:bg-slate-50 text-xs cursor-pointer"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setTerminoBusqueda(item);
                        ejecutarBusqueda(item);
                      }}
                      className="flex items-center gap-2 flex-1 text-left font-medium text-slate-700"
                    >
                      <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{item}</span>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        borrarItemHistorial(item);
                      }}
                      className="text-slate-400 hover:text-red-500 p-1"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div ref={categoriasRef}>
          <div className="mt-2.5 pt-2 border-t border-blue-800/70 flex items-center justify-between gap-4 overflow-x-auto lg:overflow-visible whitespace-nowrap pb-1">
            <div className="flex items-center gap-3 sm:gap-5 shrink-0">
              <button
                type="button"
                onClick={() => navigate(isAuthenticated ? '/perfil' : '/login')}
                className="flex items-center gap-1.5 text-left hover:text-blue-200 transition-colors shrink-0"
              >
                <MapPin className="w-4 h-4 text-blue-300 shrink-0" />
                <div className="leading-tight">
                  <span className="text-[10px] text-blue-200 block">
                    {isAuthenticated ? `Enviar a ${user?.nombre}` : 'Modo Invitado'}
                  </span>
                  <span className="text-xs font-bold block max-w-36 truncate">
                    {direccionPrincipalTexto}
                  </span>
                </div>
              </button>

              <button
                ref={botonCategoriasRef}
                type="button"
                onClick={toggleMenuCategorias}
                className="flex items-center gap-1 text-xs font-semibold hover:text-blue-200 py-1 shrink-0"
              >
                <span>Categorías</span>
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform ${
                    menuCategoriasAbierto ? 'rotate-180' : ''
                  }`}
                />
              </button>

              <Link
                to={isAuthenticated ? '/vender' : '/login'}
                className="text-xs font-semibold hover:text-blue-200 transition-colors shrink-0"
              >
                Vender
              </Link>

              {esAdmin && (
                <Link
                  to="/admin"
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-extrabold shrink-0 transition-transform hover:scale-105 ${
                    rolActual === 'superadmin'
                      ? 'bg-amber-400 text-slate-950'
                      : 'bg-blue-600 text-white border border-blue-400'
                  }`}
                >
                  <Shield className="w-3.5 h-3.5" />
                  <span>
                    {rolActual === 'superadmin' ? 'Super Admin' : 'Panel Admin'}
                  </span>
                </Link>
              )}
            </div>

            <div className="flex items-center gap-3.5 sm:gap-4 text-xs font-semibold shrink-0">
              {isAuthenticated && user ? (
                <div className="flex items-center gap-2 shrink-0">
                  <Link
                    to="/perfil"
                    className="inline-flex items-center gap-1.5 bg-blue-800/80 hover:bg-blue-800 px-3 py-1.5 rounded-full text-white font-bold transition-colors"
                  >
                    <UserIcon className="w-3.5 h-3.5 text-blue-200" />
                    <span className="max-w-28 truncate">{user.nombre}</span>
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      logout();
                      navigate('/');
                    }}
                    title="Cerrar sesión"
                    className="p-1.5 rounded-full bg-blue-800/50 hover:bg-red-600 text-blue-100 hover:text-white transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2.5 shrink-0">
                  <Link to="/register" className="hover:text-blue-200">
                    Creá tu cuenta
                  </Link>
                  <Link
                    to="/login"
                    className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-3.5 py-1.5 rounded-full transition-colors"
                  >
                    Ingresá
                  </Link>
                </div>
              )}

              <Link
                to={isAuthenticated ? '/mis-productos' : '/login'}
                className="hover:text-blue-200 shrink-0"
              >
                Mis productos
              </Link>

              <Link
                to={isAuthenticated ? '/mis-compras' : '/login'}
                className="hover:text-blue-200 shrink-0"
              >
                Mis compras
              </Link>

              <Link
                to={isAuthenticated ? '/favoritos' : '/login'}
                className="inline-flex items-center gap-1 hover:text-blue-200 shrink-0"
              >
                <span>Favoritos</span>
                <Heart className="w-3.5 h-3.5" />
              </Link>

              <Link
                to={isAuthenticated ? '/notificaciones' : '/login'}
                title="Notificaciones"
                className="relative p-1.5 hover:text-blue-200 transition-colors shrink-0 inline-flex items-center gap-1"
              >
                <Bell className="w-4 h-4" />
                {notificacionesNoLeidas > 0 && (
                  <span className="bg-red-600 text-white text-[10px] font-extrabold px-1.5 py-0.2 rounded-full leading-tight">
                    {formatearTope99(notificacionesNoLeidas)}
                  </span>
                )}
              </Link>

              <Link
                to="/carrito"
                title="Carrito de compras"
                className="relative p-1.5 hover:text-blue-200 transition-colors shrink-0 inline-flex items-center gap-1"
              >
                <ShoppingCart className="w-4 h-4" />
                {totalItems > 0 && (
                  <span className="bg-amber-400 text-slate-950 text-[10px] font-extrabold px-1.5 py-0.2 rounded-full leading-tight">
                    {formatearTope99(totalItems)}
                  </span>
                )}
              </Link>
            </div>
          </div>

          {menuCategoriasAbierto && (
            <div
              style={{ left: `${posicionMenuLeft}px` }}
              className="absolute top-full mt-1 w-56 bg-white text-slate-800 rounded-xl shadow-2xl border border-slate-200 py-2 z-50"
            >
              {CATEGORIAS_FALU.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => {
                    setMenuCategoriasAbierto(false);
                    navigate(
                      cat === 'Todas'
                        ? '/'
                        : `/?categoria=${encodeURIComponent(cat)}`
                    );
                  }}
                  className="w-full text-left px-4 py-2 text-xs font-semibold hover:bg-blue-50 hover:text-blue-700 transition-colors"
                >
                  {cat}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}