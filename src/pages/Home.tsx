import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ShoppingCart,
  Heart,
  Star,
  ShoppingBag,
  PackageOpen,
  ArrowUpDown
} from 'lucide-react';
import Navbar, { CATEGORIAS_FALU } from '../components/Navbar';
import Footer from '../components/Footer';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import api from '../services/api';

interface Producto {
  id_producto: number;
  id_vendedor?: number;
  estado?: 'activo' | 'pausado' | 'oculto';
  titulo: string;
  precio: number;
  precio_oferta?: number | null;
  stock: number;
  categoria: string;
  imagen_url?: string | null;
  calificacion_promedio?: number | null;
  total_opiniones?: number;
}

export default function Home() {
  const { user, isAuthenticated } = useAuth();
  const { agregarAlCarrito } = useCart();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const categoriaActiva = searchParams.get('categoria') || 'Todas';
  const busquedaActiva = searchParams.get('q') || '';

  const [productos, setProductos] = useState<Producto[]>([]);
  const [cargandoProductos, setCargandoProductos] = useState(true);
  const [favoritosIds, setFavoritosIds] = useState<number[]>([]);
  const [ordenPrecio, setOrdenPrecio] = useState<'relevantes' | 'menor' | 'mayor'>('relevantes');

  useEffect(() => {
    const obtenerProductos = async () => {
      setCargandoProductos(true);
      const locales: Producto[] = JSON.parse(
        localStorage.getItem('falu_productos_locales') || '[]'
      );
      try {
        const res = await api.get('/products');
        const remotos = Array.isArray(res.data) ? res.data : [];
        const idsLocales = new Set(locales.map((p) => String(p.id_producto)));
        const remotosSinDuplicar = remotos.filter(
          (r: Producto) => !idsLocales.has(String(r.id_producto))
        );
        setProductos([...locales, ...remotosSinDuplicar]);
      } catch {
        setProductos(locales);
      } finally {
        setCargandoProductos(false);
      }
    };

    obtenerProductos();
  }, []);

  useEffect(() => {
    if (!isAuthenticated || !user) {
      setFavoritosIds([]);
      return;
    }

    const guardados: { id_usuario: number; id_producto: number }[] = JSON.parse(
      localStorage.getItem('falu_favoritos_usuarios') || '[]'
    );
    setFavoritosIds(
      guardados
        .filter((f) => Number(f.id_usuario) === Number(user.id_usuario))
        .map((f) => Number(f.id_producto))
    );
  }, [isAuthenticated, user]);

  const cambiarCategoriaPildora = (cat: string) => {
    const params = new URLSearchParams(searchParams);
    if (cat === 'Todas') {
      params.delete('categoria');
    } else {
      params.set('categoria', cat);
    }
    setSearchParams(params);
  };

  const toggleFavorito = (idProducto: number) => {
    if (!isAuthenticated || !user) {
      navigate('/login');
      return;
    }
    const guardados: { id_usuario: number; id_producto: number }[] = JSON.parse(
      localStorage.getItem('falu_favoritos_usuarios') || '[]'
    );
    const existe = guardados.some(
      (f) =>
        Number(f.id_usuario) === Number(user.id_usuario) &&
        Number(f.id_producto) === Number(idProducto)
    );

    const nuevos = existe
      ? guardados.filter(
          (f) =>
            !(
              Number(f.id_usuario) === Number(user.id_usuario) &&
              Number(f.id_producto) === Number(idProducto)
            )
        )
      : [...guardados, { id_usuario: user.id_usuario, id_producto: idProducto }];

    localStorage.setItem('falu_favoritos_usuarios', JSON.stringify(nuevos));
    setFavoritosIds(
      nuevos
        .filter((f) => Number(f.id_usuario) === Number(user.id_usuario))
        .map((f) => Number(f.id_producto))
    );
  };

  // Filtra productos ocultos (Admin) y pausados (Vendedor), y aplica ordenamiento por precio
  const productosFiltrados = productos
    .filter((prod) => {
      if (prod.estado === 'oculto' || prod.estado === 'pausado') return false;
      const coincideCategoria =
        categoriaActiva === 'Todas' || prod.categoria === categoriaActiva;
      const coincideBusqueda = (prod.titulo || '')
        .toLowerCase()
        .includes(busquedaActiva.toLowerCase());
      return coincideCategoria && coincideBusqueda;
    })
    .sort((a, b) => {
      const precioA =
        a.precio_oferta && a.precio_oferta > 0 && a.precio_oferta < a.precio
          ? Number(a.precio_oferta)
          : Number(a.precio);
      const precioB =
        b.precio_oferta && b.precio_oferta > 0 && b.precio_oferta < b.precio
          ? Number(b.precio_oferta)
          : Number(b.precio);

      if (ordenPrecio === 'menor') return precioA - precioB;
      if (ordenPrecio === 'mayor') return precioB - precioA;
      return 0;
    });

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <Navbar />

      {/* CINTA DE PÍLDORAS DE CATEGORÍAS */}
      <section className="bg-white border-b border-slate-200 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-2.5 overflow-x-auto no-scrollbar">
          {CATEGORIAS_FALU.map((cat) => {
            const activa = categoriaActiva === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => cambiarCategoriaPildora(cat)}
                className={`px-4 py-2 rounded-full text-xs sm:text-sm font-semibold whitespace-nowrap border transition-all ${
                  activa
                    ? 'bg-blue-900 text-white border-blue-900'
                    : 'bg-white text-slate-700 border-slate-300 hover:border-blue-600 hover:text-blue-600'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </section>

      {/* CATÁLOGO DE PRODUCTOS CON ORDENAMIENTO POR PRECIO*/}
      <main className="max-w-7xl mx-auto px-4 py-8 flex-1 w-full">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div>
            <h2 className="text-lg font-bold text-slate-800">
              {categoriaActiva === 'Todas'
                ? 'Catálogo de Productos'
                : `Categoría: ${categoriaActiva}`}
            </h2>
            <span className="text-xs text-slate-500">
              {productosFiltrados.length}{' '}
              {productosFiltrados.length === 1
                ? 'producto disponible'
                : 'productos disponibles'}
            </span>
          </div>

          {/* Selector de ordenamiento ascendente/descendente*/}
          <div className="flex items-center gap-2 bg-white border border-slate-200 px-3.5 py-2 rounded-xl text-xs shadow-2xs w-fit">
            <ArrowUpDown className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span className="text-slate-500 font-medium">Ordenar por:</span>
            <select
              value={ordenPrecio}
              onChange={(e) => setOrdenPrecio(e.target.value as any)}
              className="bg-transparent font-extrabold text-slate-900 focus:outline-none cursor-pointer"
            >
              <option value="relevantes">Más recientes</option>
              <option value="menor">Menor precio</option>
              <option value="mayor">Mayor precio</option>
            </select>
          </div>
        </div>

        {cargandoProductos ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500 text-sm">
            Cargando productos publicados...
          </div>
        ) : productosFiltrados.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 flex flex-col items-center justify-center text-center">
            <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 mb-4">
              <PackageOpen className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-slate-800 mb-1">
              Aún no hay productos publicados
            </h3>
            <p className="text-xs text-slate-500 max-w-md mb-5">
              Los productos aparecerán acá automáticamente a medida que los vendedores los creen desde su panel.
            </p>
            <button
              type="button"
              onClick={() => navigate(isAuthenticated ? '/vender' : '/login')}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-5 py-2.5 rounded-full transition-colors"
            >
              Publicar un producto
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {productosFiltrados.map((prod) => {
              const tieneOfertaReal =
                prod.precio_oferta && prod.precio_oferta > 0 && prod.precio_oferta < prod.precio;
              const tieneOpinionesReales =
                prod.total_opiniones && prod.total_opiniones > 0 && prod.calificacion_promedio;
              const esMio =
                user && prod.id_vendedor && Number(prod.id_vendedor) === Number(user.id_usuario);

              return (
                <div
                  key={prod.id_producto}
                  onClick={() => navigate(`/producto/${prod.id_producto}`)}
                  className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-md transition-all flex flex-col group cursor-pointer"
                >
                  <div className="relative aspect-square w-full bg-slate-100 overflow-hidden flex items-center justify-center">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorito(prod.id_producto);
                      }}
                      title="Guardar en favoritos"
                      className="absolute top-2.5 right-2.5 z-10 w-8 h-8 rounded-full bg-white/90 hover:bg-white shadow-xs flex items-center justify-center transition-transform hover:scale-110"
                    >
                      <Heart
                        className={`w-4 h-4 ${
                          favoritosIds.includes(Number(prod.id_producto))
                            ? 'fill-blue-600 text-blue-600'
                            : 'text-slate-500'
                        }`}
                      />
                    </button>

                    {prod.imagen_url ? (
                      <img
                        src={prod.imagen_url}
                        alt={prod.titulo}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <ShoppingBag className="w-10 h-10 text-slate-300" />
                    )}
                  </div>

                  <div className="p-3.5 flex flex-col flex-1 justify-between">
                    <div>
                      <h3 className="text-xs text-slate-700 font-medium line-clamp-2 leading-snug mb-2 group-hover:text-blue-700">
                        {prod.titulo}
                      </h3>

                      <div className="flex items-center justify-between gap-1 mt-2">
                        <div>
                          <div className="flex items-baseline gap-1">
                            <span className="text-[11px] font-bold text-slate-600">ARS</span>
                            <span className="text-lg font-extrabold text-slate-900 leading-none">
                              ${(tieneOfertaReal ? prod.precio_oferta! : prod.precio).toLocaleString('es-AR')}
                            </span>
                          </div>

                          {tieneOfertaReal && (
                            <span className="text-[11px] text-slate-400 line-through block mt-0.5">
                              ${prod.precio.toLocaleString('es-AR')}
                            </span>
                          )}
                        </div>

                        {!esMio && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              agregarAlCarrito(prod);
                            }}
                            title="Agregar al carrito"
                            className="border border-slate-300 text-slate-700 hover:bg-blue-900 hover:text-white hover:border-blue-900 rounded-full p-2 flex items-center justify-center transition-colors shrink-0"
                          >
                            <ShoppingCart className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    {tieneOpinionesReales ? (
                      <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                        <div className="flex items-center gap-1 text-slate-800 font-semibold">
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                          <span>{Number(prod.calificacion_promedio).toFixed(1)}</span>
                        </div>
                        <span>({prod.total_opiniones} opiniones)</span>
                      </div>
                    ) : null}
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