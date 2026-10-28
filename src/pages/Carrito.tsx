import { Link, useNavigate } from 'react-router-dom';
import {
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  ShoppingBag,
  ArrowRight,
  AlertTriangle,
  BellRing
} from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { verificarPerfilCompleto } from './Perfil';

export default function Carrito() {
  const {
    items,
    cambiarCantidad,
    eliminarDelCarrito,
    vaciarCarrito,
    totalItems,
    precioTotal,
    hayProductosSinStock
  } = useCart();
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const handleContinuarCompra = () => {
    if (!isAuthenticated || !user) {
      navigate('/login');
      return;
    }

    if (hayProductosSinStock) {
      return;
    }

    const validacion = verificarPerfilCompleto(user.id_usuario);
    if (!validacion.completo) {
      alert(
        `Para poder comprar es obligatorio completar todos tus datos de perfil:\n- ${validacion.faltantes.join('\n- ')}`
      );
      navigate('/perfil');
      return;
    }

    alert(
      `Total a abonar: ARS $${precioTotal.toLocaleString('es-AR')}. ¡Listo para confirmar la orden!`
    );
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <Navbar />

      <main className="max-w-7xl w-full mx-auto px-4 py-8 flex-1">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900">
              Carrito de compras
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Revisá tus productos seleccionados antes de finalizar la compra
            </p>
          </div>

          {items.length > 0 && (
            <button
              type="button"
              onClick={vaciarCarrito}
              className="text-xs font-bold text-red-600 hover:underline flex items-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Vaciar carrito
            </button>
          )}
        </div>

        {items.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 flex flex-col items-center justify-center text-center shadow-2xs">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 mb-4">
              <ShoppingCart className="w-8 h-8" />
            </div>
            <h2 className="text-lg font-extrabold text-slate-900 mb-1.5">
              {isAuthenticated && user
                ? `¡Hola, ${user.nombre}! Tu carrito está vacío`
                : 'Tu carrito de compras está vacío'}
            </h2>
            <p className="text-xs text-slate-500 max-w-md mb-6 leading-relaxed">
              Agregá productos desde el catálogo para ver el resumen y calcular el importe total de tu compra.
            </p>
            <button
              type="button"
              onClick={() => navigate('/')}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-6 py-3 rounded-full transition-colors shadow-xs"
            >
              Explorar productos
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* Lista de Productos en el Carrito*/}
            <div className="lg:col-span-8 space-y-3">
              {items.map((item) => {
                const sinStock = item.stock_maximo <= 0;
                const subtotalItem = Number(item.precio) * item.cantidad;

                return (
                  <div
                    key={item.id_producto}
                    className={`rounded-2xl border p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all ${
                      sinStock
                        ? 'bg-red-50/40 border-red-200'
                        : 'bg-white border-slate-200'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <Link
                        to={`/producto/${item.id_producto}`}
                        className="w-20 h-20 rounded-xl bg-slate-100 overflow-hidden border border-slate-200 shrink-0 flex items-center justify-center"
                      >
                        {item.imagen_url ? (
                          <img
                            src={item.imagen_url}
                            alt={item.titulo}
                            className={`w-full h-full object-cover ${
                              sinStock ? 'grayscale opacity-75' : ''
                            }`}
                          />
                        ) : (
                          <ShoppingBag className="w-8 h-8 text-slate-300" />
                        )}
                      </Link>

                      <div>
                        <Link
                          to={`/producto/${item.id_producto}`}
                          className="text-sm font-bold text-slate-900 hover:text-blue-600 line-clamp-2"
                        >
                          {item.titulo}
                        </Link>
                        <p className="text-xs text-slate-500 mt-1">
                          Precio unitario: ARS ${Number(item.precio).toLocaleString('es-AR')}
                        </p>

                        {/* Aviso cuando el producto tiene Stock 0 */}
                        {sinStock && (
                          <div className="mt-2 bg-red-100/90 border border-red-200 text-red-800 px-3 py-1.5 rounded-lg text-[11px] font-semibold flex items-center gap-1.5">
                            <BellRing className="w-3.5 h-3.5 text-red-600 shrink-0" />
                            <span>
                              No hay stock actualmente. Te avisaremos en Notificaciones apenas el vendedor reponga unidades.
                            </span>
                          </div>
                        )}

                        <button
                          type="button"
                          onClick={() => eliminarDelCarrito(item.id_producto)}
                          className="text-xs font-semibold text-red-500 hover:text-red-700 mt-2 inline-flex items-center gap-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Eliminar del carrito
                        </button>
                      </div>
                    </div>

                    {/* Controles de Cantidad (Muestra 1 bloqueado si no hay stock) */}
                    <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-3 border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100">
                      <div className="flex items-center border border-slate-300 rounded-xl overflow-hidden bg-slate-50">
                        <button
                          type="button"
                          disabled={sinStock}
                          onClick={() =>
                            cambiarCantidad(item.id_producto, item.cantidad - 1)
                          }
                          className="p-2 text-slate-600 hover:bg-slate-200 disabled:opacity-35 transition-colors"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="px-3.5 text-xs font-bold text-slate-900">
                          {item.cantidad}
                        </span>
                        <button
                          type="button"
                          disabled={sinStock || item.cantidad >= item.stock_maximo}
                          onClick={() =>
                            cambiarCantidad(item.id_producto, item.cantidad + 1)
                          }
                          className="p-2 text-slate-600 hover:bg-slate-200 disabled:opacity-35 transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="text-right">
                        <span className="text-[11px] text-slate-400 block">
                          {sinStock ? 'Sin stock' : 'Subtotal'}
                        </span>
                        <span
                          className={`text-base font-extrabold ${
                            sinStock ? 'text-slate-400 line-through' : 'text-slate-900'
                          }`}
                        >
                          ARS ${subtotalItem.toLocaleString('es-AR')}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Resumen de Compra con Bloqueo si hay un ítem sin stock*/}
            <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs sticky top-24">
              <h2 className="text-base font-extrabold text-slate-900 pb-4 border-b border-slate-100">
                Resumen de compra
              </h2>

              <div className="space-y-3 py-4 text-xs border-b border-slate-100">
                <div className="flex items-center justify-between text-slate-600">
                  <span>Productos ({totalItems})</span>
                  <span className="font-semibold text-slate-800">
                    ARS ${precioTotal.toLocaleString('es-AR')}
                  </span>
                </div>

                {items.map((item) => (
                  <div
                    key={item.id_producto}
                    className="flex items-center justify-between text-[11px] text-slate-400 pl-2"
                  >
                    <span className="truncate max-w-[180px]">
                      {item.cantidad}x {item.titulo}{' '}
                      {item.stock_maximo <= 0 ? '(Sin stock)' : ''}
                    </span>
                    <span>
                      ${(Number(item.precio) * item.cantidad).toLocaleString('es-AR')}
                    </span>
                  </div>
                ))}
              </div>

              <div className="flex items-baseline justify-between py-4">
                <span className="text-sm font-extrabold text-slate-900">
                  Total a pagar
                </span>
                <span className="text-2xl font-extrabold text-blue-900">
                  ARS ${precioTotal.toLocaleString('es-AR')}
                </span>
              </div>

              {hayProductosSinStock && (
                <div className="mb-4 bg-amber-50 border border-amber-200 text-amber-900 p-3 rounded-xl text-xs flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span>
                    Tenés productos <strong>sin stock</strong> en tu carrito. No podés iniciar el pago hasta que el vendedor reponga unidades (te llegará una notificación) o los quites del carrito.
                  </span>
                </div>
              )}

              <button
                type="button"
                disabled={hayProductosSinStock}
                onClick={handleContinuarCompra}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:text-slate-500 text-white font-bold text-sm py-3.5 rounded-xl flex items-center justify-center gap-2 transition-colors shadow-sm"
              >
                <span>
                  {hayProductosSinStock
                    ? 'Compra bloqueada (Producto sin stock)'
                    : 'Continuar compra'}
                </span>
                {!hayProductosSinStock && <ArrowRight className="w-4 h-4" />}
              </button>
            </div>

          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}