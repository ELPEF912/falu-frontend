import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ShoppingCart,
  Trash2,
  ArrowRight,
  ShoppingBag,
  Plus,
  Minus,
  CheckCircle2,
  AlertTriangle,
  BellRing,
  RefreshCw
} from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { verificarPerfilCompleto } from './Perfil';
import { registrarEventosPostCompra } from './Notificaciones';
import api from '../services/api';

export default function Carrito() {
  const {
    carrito,
    cambiarCantidad,
    sincronizarStockRealCarrito,
    quitarDelCarrito,
    vaciarCarrito,
    totalItems,
    subtotal
  } = useCart();
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [compraExitosa, setCompraExitosa] = useState(false);

  useEffect(() => {
    const verificarStockEnVivo = async () => {
      try {
        const res = await api.get('/products');
        if (Array.isArray(res.data) && res.data.length > 0) {
          localStorage.setItem('falu_productos_locales', JSON.stringify(res.data));
          sincronizarStockRealCarrito(res.data);
          return;
        }
      } catch {
        // Fallback local si no hay red
      }
      const locales = JSON.parse(
        localStorage.getItem('falu_productos_locales') || '[]'
      );
      sincronizarStockRealCarrito(locales);
    };

    verificarStockEnVivo();
  }, []);

  // Detecta productos sin stock (0) y productos cuya cantidad en carrito supera el stock real actual
  const productosSinStock = carrito.filter((item) => Number(item.stock) <= 0);
  const productosConExcesoDeStock = carrito.filter(
    (item) => Number(item.stock) > 0 && item.cantidad > Number(item.stock)
  );
  const haySinStockEnCarrito = productosSinStock.length > 0;
  const hayExcesoDeStockEnCarrito = productosConExcesoDeStock.length > 0;

  const handleFinalizarCompraCarrito = async () => {
    if (!isAuthenticated || !user) {
      navigate('/login');
      return;
    }

    if (haySinStockEnCarrito) {
      alert(
        'Tenés productos sin stock disponible en tu carrito. Quitálos o esperá a que el vendedor reponga stock para poder pagar.'
      );
      return;
    }

    if (hayExcesoDeStockEnCarrito) {
      alert(
        'Uno o más productos de tu carrito superan el stock real disponible actualmente. Ajustá las cantidades antes de pagar.'
      );
      return;
    }

    const validacion = verificarPerfilCompleto(user.id_usuario);
    if (!validacion.completo) {
      alert(
        `Para poder realizar compras es obligatorio completar todos tus datos en Mi Perfil:\n- ${validacion.faltantes.join('\n- ')}`
      );
      navigate('/perfil');
      return;
    }

    const comprasGuardadas = JSON.parse(
      localStorage.getItem('falu_compras_usuarios') || '[]'
    );
    const productosLocales = JSON.parse(
      localStorage.getItem('falu_productos_locales') || '[]'
    );

    for (const item of carrito) {
      comprasGuardadas.push({
        id_usuario: user.id_usuario,
        id_producto: item.id_producto,
        id_vendedor: item.id_vendedor || 1,
        cantidad: item.cantidad,
        fecha: new Date().toLocaleDateString('es-AR')
      });

      registrarEventosPostCompra({
        id_producto: item.id_producto,
        titulo_producto: item.titulo,
        id_vendedor: Number(item.id_vendedor || 1),
        vendedor_nombre: 'Vendedor Falú',
        id_comprador: user.id_usuario,
        comprador_nombre: `${user.nombre} ${user.apellido || ''}`.trim()
      });
    }

    const catalogoActualizado = productosLocales.map((prod: any) => {
      const itemComprado = carrito.find(
        (c) => String(c.id_producto) === String(prod.id_producto)
      );
      if (!itemComprado) return prod;
      const nuevoStock = Math.max(0, Number(prod.stock) - itemComprado.cantidad);
      const prodModificado = { ...prod, stock: nuevoStock };

      // Actualizar también el stock en Neon PostgreSQL
      api.put(`/products/${prod.id_producto}`, prodModificado).catch(() => {});
      return prodModificado;
    });

    localStorage.setItem('falu_compras_usuarios', JSON.stringify(comprasGuardadas));
    localStorage.setItem(
      'falu_productos_locales',
      JSON.stringify(catalogoActualizado)
    );

    vaciarCarrito();
    setCompraExitosa(true);
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <Navbar />

      <main className="max-w-6xl w-full mx-auto px-4 py-8 flex-1">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2.5">
            <ShoppingCart className="w-6 h-6 text-blue-900" />
            <h1 className="text-2xl font-extrabold text-slate-900">
              Mi carrito de compras
            </h1>
          </div>

          {carrito.length > 0 && (
            <button
              type="button"
              onClick={vaciarCarrito}
              className="text-xs font-bold text-red-600 hover:underline"
            >
              Vaciar carrito
            </button>
          )}
        </div>

        {compraExitosa && (
          <div className="mb-6 bg-emerald-50 border border-emerald-200 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 text-emerald-800">
              <CheckCircle2 className="w-7 h-7 text-emerald-600 shrink-0" />
              <div>
                <h3 className="text-base font-extrabold">
                  ¡Tu compra fue registrada con éxito!
                </h3>
                <p className="text-xs text-emerald-700 mt-0.5">
                  El vendedor ya recibió la notificación con tus datos de envío. Ahora podés calificar los productos comprados o escribirle por el chat de soporte.
                </p>
              </div>
            </div>
            <Link
              to="/mis-compras"
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-5 py-2.5 rounded-full shrink-0"
            >
              Ir a Mis Compras
            </Link>
          </div>
        )}

        {/* AVISO CUANDO EL STOCK REAL BAJÓ Y NO ALCANZA PARA LA CANTIDAD DEL CARRITO */}
        {hayExcesoDeStockEnCarrito && (
          <div className="mb-6 bg-red-50 border-2 border-red-300 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-red-900">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div className="text-xs leading-relaxed">
                <strong className="block text-sm font-extrabold mb-0.5">
                  Stock insuficiente en uno o más productos de tu carrito
                </strong>
                El stock disponible de algunos artículos disminuyó desde que los agregaste y ya no alcanza para cubrir la cantidad que pediste. Ajustá las cantidades al máximo disponible para poder continuar con la compra.
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                productosConExcesoDeStock.forEach((item) => {
                  cambiarCantidad(item.id_producto, Number(item.stock));
                });
              }}
              className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-1.5 shrink-0 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Ajustar todo al stock real
            </button>
          </div>
        )}

        {/* AVISO CUANDO UN PRODUCTO QUEDÓ EN STOCK 0 */}
        {haySinStockEnCarrito && (
          <div className="mb-6 bg-amber-50 border border-amber-300 rounded-2xl p-4 flex items-start gap-3 text-amber-900">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs leading-relaxed">
              <strong className="block font-extrabold mb-0.5">
                Tenés productos sin stock disponible en tu carrito
              </strong>
              Los productos agotados permanecen guardados con cantidad fija en <strong>1</strong> para enviarte una notificación en la campanita apenas el vendedor reponga unidades. Para pagar el resto de tu carrito ahora, quitá los artículos agotados.
            </div>
          </div>
        )}

        {carrito.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 flex flex-col items-center justify-center text-center shadow-2xs">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 mb-4">
              <ShoppingCart className="w-8 h-8" />
            </div>
            <h2 className="text-lg font-extrabold text-slate-900 mb-1.5">
              Tu carrito está vacío
            </h2>
            <p className="text-xs text-slate-500 max-w-md mb-6 leading-relaxed">
              Explorá el catálogo de Falú y agregá los productos que quieras comprar al carrito.
            </p>
            <Link
              to="/"
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-6 py-3 rounded-full transition-colors shadow-xs"
            >
              Descubrir productos
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-3">
              {carrito.map((item) => {
                const precioUnitario =
                  item.precio_oferta &&
                  item.precio_oferta > 0 &&
                  item.precio_oferta < item.precio
                    ? item.precio_oferta
                    : item.precio;

                const stockMax = Math.max(0, Number(item.stock ?? 0));
                const sinStock = stockMax === 0;
                const superaStockReal = !sinStock && item.cantidad > stockMax;

                return (
                  <div
                    key={item.id_producto}
                    className={`bg-white rounded-2xl border p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                      superaStockReal
                        ? 'border-red-400 bg-red-50/30'
                        : sinStock
                        ? 'border-amber-300 bg-amber-50/20'
                        : 'border-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-20 h-20 rounded-xl bg-slate-100 overflow-hidden border border-slate-200 shrink-0 flex items-center justify-center">
                        {item.imagen_url ? (
                          <img
                            src={item.imagen_url}
                            alt={item.titulo}
                            className={`w-full h-full object-cover ${
                              sinStock ? 'grayscale opacity-70' : ''
                            }`}
                          />
                        ) : (
                          <ShoppingBag className="w-7 h-7 text-slate-300" />
                        )}
                      </div>

                      <div>
                        <span className="text-[11px] font-semibold text-blue-600 block">
                          {item.categoria}
                        </span>
                        <Link
                          to={`/producto/${item.id_producto}`}
                          className="text-sm font-bold text-slate-900 hover:text-blue-600 line-clamp-1"
                        >
                          {item.titulo}
                        </Link>
                        <p className="text-base font-extrabold text-slate-900 mt-1">
                          ARS ${(precioUnitario * item.cantidad).toLocaleString('es-AR')}
                        </p>

                        {sinStock ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full mt-1">
                            <BellRing className="w-3 h-3" />
                            Sin stock disponible (Te avisaremos cuando ingrese)
                          </span>
                        ) : superaStockReal ? (
                          <div className="mt-1.5 flex flex-wrap items-center gap-2">
                            <span className="text-[11px] font-extrabold text-red-700 bg-red-100 border border-red-200 px-2.5 py-0.5 rounded-full">
                              ¡Atención! Solo hay {stockMax} u. en stock (tenés {item.cantidad})
                            </span>
                            <button
                              type="button"
                              onClick={() => cambiarCantidad(item.id_producto, stockMax)}
                              className="text-[11px] font-extrabold text-blue-700 underline hover:text-blue-900"
                            >
                              Ajustar a {stockMax} u.
                            </button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400">
                             ARS ${precioUnitario.toLocaleString('es-AR')} c/u — (Stock disponible: {stockMax})
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-4 self-end sm:self-center">
                      <div className="flex items-center border border-slate-300 rounded-xl overflow-hidden bg-slate-50">
                        <button
                          type="button"
                          disabled={sinStock || item.cantidad <= 1}
                          onClick={() =>
                            cambiarCantidad(item.id_producto, item.cantidad - 1)
                          }
                          className="p-2 text-slate-600 hover:bg-slate-200 disabled:opacity-30 transition-colors"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>

                        <input
                          type="number"
                          min={1}
                          max={sinStock ? 1 : stockMax}
                          disabled={sinStock}
                          value={sinStock ? 1 : item.cantidad}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10);
                            if (!isNaN(val)) {
                              cambiarCantidad(item.id_producto, val);
                            }
                          }}
                          className="w-12 text-center text-xs font-extrabold text-slate-900 bg-transparent focus:outline-none disabled:text-slate-400"
                        />

                        <button
                          type="button"
                          disabled={sinStock || item.cantidad >= stockMax}
                          onClick={() =>
                            cambiarCantidad(item.id_producto, item.cantidad + 1)
                          }
                          className="p-2 text-slate-600 hover:bg-slate-200 disabled:opacity-30 transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => quitarDelCarrito(item.id_producto)}
                        title="Quitar del carrito"
                        className="p-2 text-slate-400 hover:text-red-600 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-6 h-fit shadow-2xs">
              <h2 className="text-base font-extrabold text-slate-900 pb-4 border-b border-slate-100">
                Resumen de compra
              </h2>

              <div className="space-y-3 py-4 text-xs text-slate-600 border-b border-slate-100">
                <div className="flex justify-between">
                  <span>Productos ({totalItems})</span>
                  <span className="font-bold text-slate-800">
                    ARS ${subtotal.toLocaleString('es-AR')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Envío</span>
                  <span className="font-bold text-emerald-600">Gratis</span>
                </div>
              </div>

              <div className="flex justify-between items-baseline py-4">
                <span className="text-sm font-bold text-slate-900">Total</span>
                <span className="text-xl font-extrabold text-blue-900">
                  ARS ${subtotal.toLocaleString('es-AR')}
                </span>
              </div>

              <button
                type="button"
                disabled={haySinStockEnCarrito || hayExcesoDeStockEnCarrito}
                onClick={handleFinalizarCompraCarrito}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:text-slate-500 text-white font-bold text-xs py-3.5 rounded-full flex items-center justify-center gap-2 transition-colors shadow-xs"
              >
                <span>
                  {hayExcesoDeStockEnCarrito
                    ? 'Ajustá el stock excedido para comprar'
                    : haySinStockEnCarrito
                    ? 'Quitá los productos sin stock para pagar'
                    : 'Continuar compra'}
                </span>
                {!haySinStockEnCarrito && !hayExcesoDeStockEnCarrito && (
                  <ArrowRight className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
