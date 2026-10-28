import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Bell,
  ShoppingBag,
  User,
  Calendar,
  MapPin,
  CheckCheck,
  Trash2,
  PackageCheck
} from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { useAuth } from '../context/AuthContext';

export interface NotificacionFalu {
  id_notificacion: number;
  tipo?: 'venta' | 'stock_repuesto';
  id_usuario_destino: number;
  id_producto: number;
  producto_titulo: string;
  comprador_nombre?: string;
  fecha_compra: string;
  direccion_comprador?: string;
  mensaje_extra?: string;
  leida: boolean;
}

// 1. Dispara notificación al vendedor cuando alguien compra su producto
export function registrarEventosPostCompra(params: {
  id_producto: number;
  titulo_producto: string;
  id_vendedor: number;
  vendedor_nombre: string;
  id_comprador: number;
  comprador_nombre: string;
}) {
  const direccionesComprador = JSON.parse(
    localStorage.getItem(`falu_direcciones_${params.id_comprador}`) || '[]'
  );
  const dirPrincipal = direccionesComprador[0];
  const direccionFormateada = dirPrincipal
    ? `${dirPrincipal.calle} ${dirPrincipal.numero}${
        dirPrincipal.piso ? ` (Piso/Depto: ${dirPrincipal.piso})` : ''
      }, CP ${dirPrincipal.codigo_postal} - ${dirPrincipal.localidad}, ${dirPrincipal.provincia}`
    : 'Dirección verificada en perfil';

  const fechaActual = new Date().toLocaleString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const todasNotif: NotificacionFalu[] = JSON.parse(
    localStorage.getItem('falu_notificaciones') || '[]'
  );

  const nuevaNotif: NotificacionFalu = {
    id_notificacion: Date.now() + Math.floor(Math.random() * 1000),
    tipo: 'venta',
    id_usuario_destino: params.id_vendedor,
    id_producto: params.id_producto,
    producto_titulo: params.titulo_producto,
    comprador_nombre: params.comprador_nombre,
    fecha_compra: fechaActual,
    direccion_comprador: direccionFormateada,
    leida: false
  };

  localStorage.setItem(
    'falu_notificaciones',
    JSON.stringify([nuevaNotif, ...todasNotif])
  );

  const todosChats = JSON.parse(
    localStorage.getItem('falu_chats_operaciones') || '[]'
  );
  const idConv = `${params.id_producto}_${params.id_comprador}_${params.id_vendedor}`;
  const existeChat = todosChats.some((c: any) => c.id_conversacion === idConv);

  if (!existeChat) {
    todosChats.unshift({
      id_conversacion: idConv,
      id_producto: params.id_producto,
      titulo_producto: params.titulo_producto,
      id_comprador: params.id_comprador,
      comprador_nombre: params.comprador_nombre,
      id_vendedor: params.id_vendedor,
      vendedor_nombre: params.vendedor_nombre || 'Vendedor Falú',
      mensajes: []
    });
    localStorage.setItem('falu_chats_operaciones', JSON.stringify(todosChats));
  }

  window.dispatchEvent(new Event('falu_actualizacion'));
}

// 2. Dispara notificación a todos los usuarios que pusieron en su carrito un producto sin stock cuando vuelve a tener stock
export function notificarReposicionStock(
  idProducto: number,
  tituloProducto: string,
  nuevoStock: number
) {
  if (nuevoStock <= 0) return;

  const alertas: { id_usuario: number; id_producto: number; titulo: string }[] =
    JSON.parse(localStorage.getItem('falu_alertas_stock') || '[]');

  const interesados = alertas.filter(
    (a) => String(a.id_producto) === String(idProducto)
  );

  if (interesados.length === 0) return;

  const fechaActual = new Date().toLocaleString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const todasNotif: NotificacionFalu[] = JSON.parse(
    localStorage.getItem('falu_notificaciones') || '[]'
  );

  const nuevasNotificaciones: NotificacionFalu[] = interesados.map((int, idx) => ({
    id_notificacion: Date.now() + idx + 1,
    tipo: 'stock_repuesto',
    id_usuario_destino: int.id_usuario,
    id_producto: idProducto,
    producto_titulo: tituloProducto,
    fecha_compra: fechaActual,
    mensaje_extra: `¡El producto que guardaste en tu carrito volvió a tener stock disponible (${nuevoStock} u.)! Ya podés completar tu compra.`,
    leida: false
  }));

  localStorage.setItem(
    'falu_notificaciones',
    JSON.stringify([...nuevasNotificaciones, ...todasNotif])
  );

  // Limpio las alertas ya enviadas para ese producto
  const alertasRestantes = alertas.filter(
    (a) => String(a.id_producto) !== String(idProducto)
  );
  localStorage.setItem('falu_alertas_stock', JSON.stringify(alertasRestantes));

  window.dispatchEvent(new Event('falu_actualizacion'));
}

export default function Notificaciones() {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [notificaciones, setNotificaciones] = useState<NotificacionFalu[]>([]);

  const cargarMisNotificaciones = () => {
    if (!user) return;
    const todas: NotificacionFalu[] = JSON.parse(
      localStorage.getItem('falu_notificaciones') || '[]'
    );
    setNotificaciones(
      todas.filter(
        (n) => Number(n.id_usuario_destino) === Number(user.id_usuario)
      )
    );
  };

  useEffect(() => {
    if (!isAuthenticated || !user) {
      navigate('/login');
      return;
    }
    cargarMisNotificaciones();
  }, [isAuthenticated, user, navigate]);

  const marcarTodasComoLeidas = () => {
    if (!user) return;
    const todas: NotificacionFalu[] = JSON.parse(
      localStorage.getItem('falu_notificaciones') || '[]'
    );
    const actualizadas = todas.map((n) =>
      Number(n.id_usuario_destino) === Number(user.id_usuario)
        ? { ...n, leida: true }
        : n
    );
    localStorage.setItem('falu_notificaciones', JSON.stringify(actualizadas));
    cargarMisNotificaciones();
    window.dispatchEvent(new Event('falu_actualizacion'));
  };

  const eliminarNotificacion = (idNotif: number) => {
    const todas: NotificacionFalu[] = JSON.parse(
      localStorage.getItem('falu_notificaciones') || '[]'
    );
    const actualizadas = todas.filter((n) => n.id_notificacion !== idNotif);
    localStorage.setItem('falu_notificaciones', JSON.stringify(actualizadas));
    cargarMisNotificaciones();
    window.dispatchEvent(new Event('falu_actualizacion'));
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <Navbar />

      <main className="max-w-5xl w-full mx-auto px-4 py-8 flex-1">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900">
              Notificaciones
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Avisos de ventas, direcciones de entrega y alertas de reposición de stock
            </p>
          </div>

          {notificaciones.some((n) => !n.leida) && (
            <button
              type="button"
              onClick={marcarTodasComoLeidas}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2.5 rounded-full flex items-center gap-1.5 w-fit transition-colors"
            >
              <CheckCheck className="w-4 h-4" />
              Marcar todas como leídas
            </button>
          )}
        </div>

        {notificaciones.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 flex flex-col items-center justify-center text-center shadow-2xs">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 mb-4">
              <Bell className="w-8 h-8" />
            </div>
            <h2 className="text-lg font-extrabold text-slate-900 mb-1.5">
              ¡Hola, {user?.nombre}! No tenés notificaciones nuevas
            </h2>
            <p className="text-xs text-slate-500 max-w-md leading-relaxed">
              Acá recibirás los avisos cuando alguien compre tus publicaciones o cuando vuelva a entrar stock de un producto que guardaste en tu carrito.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {notificaciones.map((notif) => {
              const esAlertaStock = notif.tipo === 'stock_repuesto';

              return (
                <div
                  key={notif.id_notificacion}
                  className={`rounded-2xl border p-5 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                    notif.leida
                      ? 'bg-white border-slate-200'
                      : esAlertaStock
                      ? 'bg-emerald-50/70 border-emerald-300 shadow-xs'
                      : 'bg-blue-50/60 border-blue-300 shadow-xs'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      {!notif.leida && (
                        <span
                          className={`text-white text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            esAlertaStock ? 'bg-emerald-600' : 'bg-blue-600'
                          }`}
                        >
                          {esAlertaStock ? '¡Volvió el stock!' : 'Nueva venta'}
                        </span>
                      )}
                      <span className="text-xs text-slate-500 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {notif.fecha_compra}
                      </span>
                    </div>

                    <Link
                      to={esAlertaStock ? '/carrito' : `/producto/${notif.id_producto}`}
                      className="text-base font-extrabold text-slate-900 hover:text-blue-600 flex items-center gap-2"
                    >
                      {esAlertaStock ? (
                        <PackageCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                      ) : (
                        <ShoppingBag className="w-4 h-4 text-blue-600 shrink-0" />
                      )}
                      <span>
                        {esAlertaStock
                          ? `Stock disponible: ${notif.producto_titulo}`
                          : `Producto vendido: ${notif.producto_titulo}`}
                      </span>
                    </Link>

                    {esAlertaStock ? (
                      <p className="text-xs text-emerald-900 font-medium pt-0.5">
                        {notif.mensaje_extra}
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-xs text-slate-700">
                        <div className="flex items-center gap-1.5">
                          <User className="w-4 h-4 text-slate-400 shrink-0" />
                          <span>
                            Comprador: <strong>{notif.comprador_nombre}</strong>
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-4 h-4 text-blue-600 shrink-0" />
                          <span>
                            Dirección de envío:{' '}
                            <strong>{notif.direccion_comprador}</strong>
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => eliminarNotificacion(notif.id_notificacion)}
                    title="Eliminar notificación"
                    className="text-slate-400 hover:text-red-600 p-2 self-end sm:self-center"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
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