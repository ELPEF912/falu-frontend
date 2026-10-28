import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Store,
  Star,
  ShoppingBag,
  ShoppingCart,
  Heart,
  Info,
  CheckCircle2,
  PackageCheck,
  UserPlus,
  UserCheck
} from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import api from '../services/api';

interface ProductoVendedor {
  id_producto: number;
  id_vendedor?: number;
  vendedor_nombre?: string;
  estado?: string;
  titulo: string;
  precio: number;
  precio_oferta?: number | null;
  stock: number;
  categoria: string;
  imagen_url?: string | null;
  calificacion_promedio?: number | null;
  total_opiniones?: number;
}

export default function TiendaVendedor() {
  const { idVendedor } = useParams<{ idVendedor: string }>();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { agregarAlCarrito } = useCart();

  const [productosVendedor, setProductosVendedor] = useState<ProductoVendedor[]>([]);
  const [nombreVendedor, setNombreVendedor] = useState<string>('Vendedor Falú');
  const [categoriaFiltro, setCategoriaFiltro] = useState<string>('Todas');
  const [ordenPrecio, setOrdenPrecio] = useState<'relevantes' | 'menor' | 'mayor'>('relevantes');
  const [ventasConcretadas, setVentasConcretadas] = useState<number>(0);
  const [siguiendo, setSiguiendo] = useState<boolean>(false);
  const [favoritosIds, setFavoritosIds] = useState<number[]>([]);

  useEffect(() => {
    const cargarTienda = async () => {
      const locales: ProductoVendedor[] = JSON.parse(
        localStorage.getItem('falu_productos_locales') || '[]'
      );
      let todos = [...locales];

      try {
        const res = await api.get('/products');
        if (Array.isArray(res.data)) {
          const idsLocales = new Set(locales.map((p) => String(p.id_producto)));
          const remotos = res.data.filter(
            (r: ProductoVendedor) => !idsLocales.has(String(r.id_producto))
          );
          todos = [...locales, ...remotos];
        }
      } catch {
      }

      const delVendedor = todos.filter(
        (p) =>
          p.estado !== 'oculto' &&
          String(p.id_vendedor || 1) === String(idVendedor)
      );

      setProductosVendedor(delVendedor);

      if (delVendedor.length > 0 && delVendedor[0].vendedor_nombre) {
        setNombreVendedor(delVendedor[0].vendedor_nombre);
      } else if (user && String(user.id_usuario) === String(idVendedor)) {
        setNombreVendedor(`${user.nombre} ${user.apellido || ''}`.trim());
      }

      // Contabilizar ventas concretadas de productos de este vendedor
      const idsProductosVendedor = new Set(
        delVendedor.map((p) => String(p.id_producto))
      );
      const compras: { id_producto: number; id_vendedor?: number }[] = JSON.parse(
        localStorage.getItem('falu_compras_usuarios') || '[]'
      );
      const totalVentas = compras.filter(
        (c) =>
          String(c.id_vendedor) === String(idVendedor) ||
          idsProductosVendedor.has(String(c.id_producto))
      ).length;
      setVentasConcretadas(totalVentas);

      // Estado de seguimiento y favoritos del usuario actual
      if (user) {
        const seguidos: { id_vendedor: number }[] = JSON.parse(
          localStorage.getItem(`falu_seguidos_${user.id_usuario}`) || '[]'
        );
        setSiguiendo(
          seguidos.some((s) => String(s.id_vendedor) === String(idVendedor))
        );

        const favs: { id_usuario: number; id_producto: number }[] = JSON.parse(
          localStorage.getItem('falu_favoritos_usuarios') || '[]'
        );
        setFavoritosIds(
          favs
            .filter((f) => Number(f.id_usuario) === Number(user.id_usuario))
            .map((f) => Number(f.id_producto))
        );
      }
    };

    cargarTienda();
  }, [idVendedor, user]);

  // Seguir / Dejar de seguir a este vendedor (Se sincroniza con Perfil.tsx)
  const toggleSeguirVendedor = () => {
    if (!isAuthenticated || !user) {
      navigate('/login');
      return;
    }

    const key = `falu_seguidos_${user.id_usuario}`;
    const seguidos: {
      id_vendedor: number;
      nombre_tienda: string;
      fecha_seguimiento: string;
    }[] = JSON.parse(localStorage.getItem(key) || '[]');

    if (siguiendo) {
      const actualizados = seguidos.filter(
        (s) => String(s.id_vendedor) !== String(idVendedor)
      );
      localStorage.setItem(key, JSON.stringify(actualizados));
      setSiguiendo(false);
    } else {
      const nuevo = {
        id_vendedor: Number(idVendedor),
        nombre_tienda: nombreVendedor,
        fecha_seguimiento: new Date().toLocaleDateString('es-AR')
      };
      localStorage.setItem(key, JSON.stringify([nuevo, ...seguidos]));
      setSiguiendo(true);
    }
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

  // Categorías presentes en los productos de este vendedor
  const categoriasDelVendedor = [
    'Todas',
    ...Array.from(new Set(productosVendedor.map((p) => p.categoria)))
  ];

  // Filtrar y ordenar publicaciones
  const productosMostrados = productosVendedor
    .filter((p) => categoriaFiltro === 'Todas' || p.categoria === categoriaFiltro)
    .sort((a, b) => {
      if (ordenPrecio === 'menor') return Number(a.precio) - Number(b.precio);
      if (ordenPrecio === 'mayor') return Number(b.precio) - Number(a.precio);
      return 0;
    });

  // Cálculo global de estrellas y opiniones recibidas por este vendedor
  const productosCalificados = productosVendedor.filter(
    (p) => p.total_opiniones && p.total_opiniones > 0 && p.calificacion_promedio
  );
  const totalOpinionesVendedor = productosCalificados.reduce(
    (acc, p) => acc + (p.total_opiniones || 0),
    0
  );
  const promedioGeneralVendedor =
    productosCalificados.length > 0
      ? Number(
          (
            productosCalificados.reduce(
              (acc, p) => acc + Number(p.calificacion_promedio) * (p.total_opiniones || 1),
              0
            ) / totalOpinionesVendedor
          ).toFixed(1)
        )
      : null;

  const esMiPropiaTienda = Boolean(
    user && String(user.id_usuario) === String(idVendedor)
  );

  const historialLimitado = ventasConcretadas < 10;

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <Navbar />

      <main className="max-w-7xl w-full mx-auto px-4 py-8 flex-1">
        
        {/* ENCABEZADO*/}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-5 border-b border-slate-200 mb-6">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
              Publicaciones de {nombreVendedor}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              {productosMostrados.length}{' '}
              {productosMostrados.length === 1 ? 'resultado' : 'resultados'}
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-600 font-medium">Ordenar por:</span>
            <select
              value={ordenPrecio}
              onChange={(e) => setOrdenPrecio(e.target.value as any)}
              className="bg-transparent font-bold text-slate-900 focus:outline-none cursor-pointer"
            >
              <option value="relevantes">Más relevantes</option>
              <option value="menor">Menor precio</option>
              <option value="mayor">Mayor precio</option>
            </select>
          </div>
        </div>

        {/* DISTRIBUCIÓN: PRODUCTOS A LA IZQUIERDA/CENTRO + REPUTACIÓN A LA DERECHA */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* COLUMNA IZQUIERDA/CENTRAL: Filtros rápidos + Grilla de Productos */}
          <div className="lg:col-span-8 space-y-5">
            
            {/* Filtro por categorías del vendedor */}
            {categoriasDelVendedor.length > 2 && (
              <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                {categoriasDelVendedor.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategoriaFiltro(cat)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border whitespace-nowrap transition-colors ${
                      categoriaFiltro === cat
                        ? 'bg-blue-900 text-white border-blue-900'
                        : 'bg-white text-slate-700 border-slate-300 hover:border-blue-600'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            )}

            {productosMostrados.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
                <p className="text-sm font-bold text-slate-700">
                  Este vendedor aún no tiene publicaciones activas en esta categoría.
                </p>
              </div>
            ) : (
              /* Grilla de tarjetas*/
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {productosMostrados.map((prod) => {
                  const tieneOpiniones =
                    prod.total_opiniones &&
                    prod.total_opiniones > 0 &&
                    prod.calificacion_promedio;

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
                          className="absolute top-2.5 right-2.5 z-10 w-8 h-8 rounded-full bg-white/90 hover:bg-white shadow-xs flex items-center justify-center"
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

                      <div className="p-4 flex flex-col flex-1 justify-between">
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                            {prod.categoria}
                          </span>
                          <h3 className="text-xs sm:text-sm text-slate-800 font-medium line-clamp-2 leading-snug mb-2 group-hover:text-blue-600">
                            {prod.titulo}
                          </h3>

                          {tieneOpiniones ? (
                            <div className="flex items-center gap-1 text-xs text-slate-500 mb-2">
                              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                              <span className="font-bold text-slate-800">
                                {Number(prod.calificacion_promedio).toFixed(1)}
                              </span>
                              <span>({prod.total_opiniones})</span>
                            </div>
                          ) : null}
                        </div>

                        <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                          <span className="text-lg font-extrabold text-slate-900">
                            $ {Number(prod.precio).toLocaleString('es-AR')}
                          </span>

                          {!esMiPropiaTienda && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                agregarAlCarrito(prod);
                              }}
                              title="Agregar al carrito"
                              className="border border-slate-300 text-slate-700 hover:bg-blue-900 hover:text-white hover:border-blue-900 rounded-full p-2 transition-colors"
                            >
                              <ShoppingCart className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* COLUMNA DERECHA: PERFIL Y REPUTACIÓN CONTEXTUAL*/}
          <aside className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs sticky top-24 space-y-6">
            
            {/* Identidad del Vendedor + Botón Seguir */}
            <div className="flex items-start justify-between gap-3 pb-5 border-b border-slate-100">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-blue-900 text-white font-extrabold text-lg flex items-center justify-center shadow-xs shrink-0">
                  <Store className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-slate-900 leading-tight">
                    {nombreVendedor}
                  </h2>
                  <span className="text-xs text-slate-500">
                    Tienda registrada en Falú
                  </span>
                </div>
              </div>

              {!esMiPropiaTienda && (
                <button
                  type="button"
                  onClick={toggleSeguirVendedor}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-colors shrink-0 ${
                    siguiendo
                      ? 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-red-50 hover:text-red-600 hover:border-red-200'
                      : 'bg-blue-600 border-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {siguiendo ? (
                    <>
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>Siguiendo</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>Seguir</span>
                    </>
                  )}
                </button>
              )}
            </div>

            {/* BLOQUE DE REPUTACIÓN CONTEXTUAL*/}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                Reputación del vendedor
              </h3>

              {historialLimitado ? (
                /* AVISO CONTEXTUAL CUANDO TIENE MENOS DE 10 VENTAS */
                <div className="bg-amber-50/90 border border-amber-200 rounded-xl p-4 space-y-2">
                  <div className="flex items-center gap-2 text-amber-900 font-extrabold text-sm">
                    <Info className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Historial aún limitado</span>
                  </div>
                  <p className="text-xs text-amber-800 leading-relaxed">
                    Este vendedor registra <strong>{ventasConcretadas}</strong> de las{' '}
                    <strong>10 operaciones</strong> requeridas para calcular una métrica global representativa.
                  </p>
                  <p className="text-[11px] text-amber-700/90 leading-normal pt-1 border-t border-amber-200/60">
                    Para garantizar equidad comercial, Falú muestra sus indicadores reales sin penalizar su perfil por tener un volumen inicial reducido.
                  </p>
                </div>
              ) : (
                /* REPUTACIÓN CONSOLIDADA (10 O MÁS VENTAS) */
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div className="text-xs text-emerald-900">
                    <p className="font-extrabold text-sm">Vendedor con historial consolidado</p>
                    <p className="mt-0.5 text-emerald-700">
                      Superó el umbral de 10 ventas completadas con desempeño verificado en la plataforma.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* MÉTRICAS OBJETIVAS (Estrellas, Productos Vendidos y Publicaciones Activas) */}
            <div className="grid grid-cols-3 gap-2.5 text-center">
              <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3">
                <div className="flex items-center justify-center gap-1 text-slate-900 font-extrabold text-base">
                  <PackageCheck className="w-4 h-4 text-blue-600" />
                  <span>{ventasConcretadas}</span>
                </div>
                <span className="text-[11px] text-slate-500 block mt-1">
                  Ventas concretadas
                </span>
              </div>

              <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3">
                <div className="flex items-center justify-center gap-1 text-slate-900 font-extrabold text-base">
                  <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                  <span>{promedioGeneralVendedor ?? '—'}</span>
                </div>
                <span className="text-[11px] text-slate-500 block mt-1">
                  {totalOpinionesVendedor > 0
                    ? `${totalOpinionesVendedor} opiniones`
                    : 'Sin opiniones'}
                </span>
              </div>

              <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3">
                <span className="text-slate-900 font-extrabold text-base block">
                  {productosVendedor.length}
                </span>
                <span className="text-[11px] text-slate-500 block mt-1">
                  Publicaciones
                </span>
              </div>
            </div>

            {/* Desglose visual de estrellas si ya recibió opiniones en sus productos */}
            {promedioGeneralVendedor && (
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-600 font-medium">
                  Calificación promedio en productos:
                </span>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      className={`w-3.5 h-3.5 ${
                        s <= Math.round(promedioGeneralVendedor)
                          ? 'fill-amber-400 text-amber-400'
                          : 'text-slate-300'
                      }`}
                    />
                  ))}
                  <span className="font-bold text-slate-900 ml-1">
                    {promedioGeneralVendedor} / 5
                  </span>
                </div>
              </div>
            )}

          </aside>

        </div>
      </main>

      <Footer />
    </div>
  );
}