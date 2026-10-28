import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShoppingBag,
  PackageOpen,
  Plus,
  ExternalLink,
  Trash2,
  Star,
  PauseCircle,
  PlayCircle
} from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

interface Producto {
  id_producto: number;
  id_vendedor?: number;
  titulo: string;
  precio: number;
  stock: number;
  categoria: string;
  estado?: 'activo' | 'pausado' | 'oculto';
  imagen_url?: string;
  calificacion_promedio?: number;
  total_opiniones?: number;
}

export default function MisProductos() {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [misPublicaciones, setMisPublicaciones] = useState<Producto[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    if (!isAuthenticated || !user) {
      navigate('/login');
      return;
    }

    const cargarMisProductos = async () => {
      setCargando(true);
      const locales: Producto[] = JSON.parse(
        localStorage.getItem('falu_productos_locales') || '[]'
      );
      let todos = [...locales];

      try {
        const res = await api.get('/products');
        if (Array.isArray(res.data)) {
          const idsLocales = new Set(locales.map((p) => String(p.id_producto)));
          const remotos = res.data.filter(
            (r: Producto) => !idsLocales.has(String(r.id_producto))
          );
          todos = [...locales, ...remotos];
        }
      } catch {
      }

      const filtrados = todos.filter(
        (p) => Number(p.id_vendedor) === Number(user.id_usuario)
      );
      setMisPublicaciones(filtrados);
      setCargando(false);
    };

    cargarMisProductos();
  }, [isAuthenticated, user, navigate]);

  // Pausar o Reactivar publicación
  const togglePausarPublicacion = (idProducto: number) => {
    const locales: Producto[] = JSON.parse(
      localStorage.getItem('falu_productos_locales') || '[]'
    );

    const actualizados = locales.map((p) => {
      if (String(p.id_producto) !== String(idProducto)) return p;
      if (p.estado === 'oculto') return p; // No puede desocultar una sanción administrativa
      const nuevoEstado = p.estado === 'pausado' ? 'activo' : 'pausado';
      return { ...p, estado: nuevoEstado as 'activo' | 'pausado' };
    });

    localStorage.setItem('falu_productos_locales', JSON.stringify(actualizados));
    setMisPublicaciones(
      actualizados.filter((p) => Number(p.id_vendedor) === Number(user?.id_usuario))
    );
  };

  const eliminarPublicacion = (idProducto: number) => {
    const locales: Producto[] = JSON.parse(
      localStorage.getItem('falu_productos_locales') || '[]'
    );
    const actualizados = locales.filter(
      (p) => String(p.id_producto) !== String(idProducto)
    );
    localStorage.setItem('falu_productos_locales', JSON.stringify(actualizados));
    setMisPublicaciones((prev) =>
      prev.filter((p) => String(p.id_producto) !== String(idProducto))
    );
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <Navbar />

      <main className="max-w-6xl w-full mx-auto px-4 py-8 flex-1">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900">Mis productos</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Gestioná tus publicaciones activas, pausadas, stock y precios
            </p>
          </div>
          {misPublicaciones.length > 0 && (
            <button
              type="button"
              onClick={() => navigate('/vender')}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2.5 rounded-full flex items-center gap-1.5 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Nueva publicación
            </button>
          )}
        </div>

        {cargando ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-sm text-slate-500">
            Cargando tus publicaciones...
          </div>
        ) : misPublicaciones.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 flex flex-col items-center justify-center text-center shadow-2xs">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 mb-4">
              <PackageOpen className="w-8 h-8" />
            </div>
            <h2 className="text-lg font-extrabold text-slate-900 mb-1.5">
              ¡Hola, {user?.nombre}! Aún no tenés productos publicados
            </h2>
            <p className="text-xs text-slate-500 max-w-md mb-6 leading-relaxed">
              Tus productos o vehículos aparecerán en este panel automáticamente a medida que los publiques para que puedas controlar su stock, pausarlos o responder preguntas.
            </p>
            <button
              type="button"
              onClick={() => navigate('/vender')}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-6 py-3 rounded-full transition-colors shadow-xs"
            >
              Publicar un producto
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {misPublicaciones.map((prod) => {
              const estaPausado = prod.estado === 'pausado';
              const estaOculto = prod.estado === 'oculto';

              return (
                <div
                  key={prod.id_producto}
                  className={`bg-white rounded-2xl border p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:shadow-sm transition-shadow ${
                    estaPausado
                      ? 'border-amber-200 bg-amber-50/20'
                      : estaOculto
                      ? 'border-red-200 bg-red-50/20'
                      : 'border-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-xl bg-slate-100 overflow-hidden border border-slate-200 shrink-0 flex items-center justify-center">
                      {prod.imagen_url ? (
                        <img
                          src={prod.imagen_url}
                          alt={prod.titulo}
                          className={`w-full h-full object-cover ${
                            estaPausado || estaOculto ? 'grayscale opacity-70' : ''
                          }`}
                        />
                      ) : (
                        <ShoppingBag className="w-6 h-6 text-slate-300" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-semibold text-slate-400">
                          {prod.categoria}
                        </span>
                        {estaOculto ? (
                          <span className="bg-red-100 text-red-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                            Oculto por moderación
                          </span>
                        ) : estaPausado ? (
                          <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                            Publicación pausada
                          </span>
                        ) : (
                          <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                            Activa
                          </span>
                        )}
                      </div>
                      <h3 className="text-sm font-bold text-slate-900">{prod.titulo}</h3>
                      <div className="flex items-center gap-4 mt-1 text-xs text-slate-600">
                        <span className="font-extrabold text-slate-900">
                          ARS ${Number(prod.precio).toLocaleString('es-AR')}
                        </span>
                        <span>Stock: {prod.stock} u.</span>
                        {prod.total_opiniones && prod.total_opiniones > 0 ? (
                          <span className="flex items-center gap-1 text-amber-600 font-semibold">
                            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                            {prod.calificacion_promedio} ({prod.total_opiniones})
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 self-end sm:self-center">
                    {/*Botón Pausar / Reactivar*/}
                    {!estaOculto && (
                      <button
                        type="button"
                        onClick={() => togglePausarPublicacion(prod.id_producto)}
                        className={`px-3.5 py-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-colors ${
                          estaPausado
                            ? 'border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                            : 'border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100'
                        }`}
                      >
                        {estaPausado ? (
                          <>
                            <PlayCircle className="w-3.5 h-3.5" />
                            <span>Reactivar</span>
                          </>
                        ) : (
                          <>
                            <PauseCircle className="w-3.5 h-3.5" />
                            <span>Pausar</span>
                          </>
                        )}
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => navigate(`/producto/${prod.id_producto}`)}
                      className="px-4 py-2 rounded-xl border border-slate-300 hover:border-blue-600 text-xs font-bold text-slate-700 hover:text-blue-600 flex items-center gap-1.5 transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Ver / Modificar
                    </button>

                    <button
                      type="button"
                      onClick={() => eliminarPublicacion(prod.id_producto)}
                      title="Eliminar publicación"
                      className="p-2 rounded-xl border border-slate-200 text-slate-400 hover:text-red-600 hover:border-red-200 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}