import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Bell,
  ShoppingBag,
  MessageCircleQuestion,
  Star,
  AlertTriangle,
  PackageCheck,
  CheckCheck,
  Trash2,
  ExternalLink,
  MapPin
} from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { useAuth } from '../context/AuthContext';

export type TipoNotificacion =
  | 'venta'
  | 'pregunta'
  | 'opinion'
  | 'sin_stock'
  | 'stock_repuesto';

export interface NotificacionItem {
  id_notificacion: number;
  tipo: TipoNotificacion;
  id_usuario_destino: number;
  id_producto: number;
  producto_titulo: string;
  comprador_nombre?: string;
  fecha_compra: string;
  direccion_entrega?: string;
  mensaje_extra?: string;
  calificacion?: number;
  leida: boolean;
}

// 1. Notificación de Venta + Creación de canal de chat post-venta
export function registrarEventosPostCompra(params: {
  id_producto: number;
  titulo_producto: string;
  id_vendedor: number;
  vendedor_nombre: string;
  id_comprador: number;
  comprador_nombre: string;
}) {
  const ahora = new Date().toLocaleString('es-AR');

  // Obtener dirección principal del comprador para enviársela al vendedor
  const perfiles = JSON.parse(
    localStorage.getItem('falu_perfiles_usuarios') || '{}'
  );
  const perfilComprador = perfiles[params.id_comprador];
  let direccionTexto = 'Dirección acordada con el comprador';

  if (
    perfilComprador &&
    Array.isArray(perfilComprador.direcciones) &&
    perfilComprador.direcciones.length > 0
  ) {
    const dir = perfilComprador.direcciones[0];
    direccionTexto = `${dir.calle} ${dir.numero}, ${dir.localidad}, ${dir.provincia} (CP: ${dir.codigo_postal})`;
  }

  const todasNotif: NotificacionItem[] = JSON.parse(
    localStorage.getItem('falu_notificaciones') || '[]'
  );

  const nuevaNotifVenta: NotificacionItem = {
    id_notificacion: Date.now() + Math.floor(Math.random() * 1000),
    tipo: 'venta',
    id_usuario_destino: Number(params.id_vendedor),
    id_producto: Number(params.id_producto),
    producto_titulo: params.titulo_producto,
    comprador_nombre: params.comprador_nombre,
    fecha_compra: ahora,
    direccion_entrega: direccionTexto,
    mensaje_extra: `¡Vendiste este producto a ${params.comprador_nombre}! Prepará el paquete para enviarlo al domicilio indicado.`,
    leida: false
  };

  localStorage.setItem(
    'falu_notificaciones',
    JSON.stringify([nuevaNotifVenta, ...todasNotif])
  );

  // Habilitar conversación en el chat post-venta
  const conversaciones = JSON.parse(
    localStorage.getItem('falu_conversaciones_chat') || '[]'
  );
  const yaExisteChat = conversaciones.some(
    (c: any) =>
      Number(c.id_producto) === Number(params.id_producto) &&
      Number(c.id_comprador) === Number(params.id_comprador)
  );

  if (!yaExisteChat) {
    conversaciones.unshift({
      id_conversacion: Date.now(),
      id_producto: Number(params.id_producto),
      titulo_producto: params.titulo_producto,
      id_vendedor: Number(params.id_vendedor),
      vendedor_nombre: params.vendedor_nombre,
      id_comprador: Number(params.id_comprador),
      comprador_nombre: params.comprador_nombre,
      iniciado_por_comprador: false,
      no_leidos_vendedor: 0,
      no_leidos_comprador: 0,
      mensajes: []
    });
    localStorage.setItem(
      'falu_conversaciones_chat',
      JSON.stringify(conversaciones)
    );
  }

  window.dispatchEvent(new Event('falu_actualizacion'));
}

// 2. Notificación al vendedor cuando su producto se queda SIN STOCK (stock === 0)
export function notificarProductoSinStock(params: {
  id_producto: number;
  titulo_producto: string;
  id_vendedor: number;
}) {
  const todasNotif: NotificacionItem[] = JSON.parse(
    localStorage.getItem('falu_notificaciones') || '[]'
  );

  const alertaSinStock: NotificacionItem = {
    id_notificacion: Date.now() + Math.floor(Math.random() * 1000) + 1,
    tipo: 'sin_stock',
    id_usuario_destino: Number(params.id_vendedor),
    id_producto: Number(params.id_producto),
    producto_titulo: params.titulo_producto,
    fecha_compra: new Date().toLocaleString('es-AR'),
    mensaje_extra:
      '¡Atención! Tu publicación se quedó sin stock disponible (0 unidades). Entrá a la publicación para reponer unidades.',
    leida: false
  };

  localStorage.setItem(
    'falu_notificaciones',
    JSON.stringify([alertaSinStock, ...todasNotif])
  );
  window.dispatchEvent(new Event('falu_actualizacion'));
}

// 3. Notificación cuando el vendedor repone stock
export function notificarReposicionStock(
  idProducto: number,
  tituloProducto: string,
  nuevoStock: number
) {
  if (nuevoStock <= 0) return;

  const todasNotif: NotificacionItem[] = JSON.parse(
    localStorage.getItem('falu_notificaciones') || '[]'
  );
  const favoritos: { id_usuario: number; id_producto: number }[] = JSON.parse(
    localStorage.getItem('falu_favoritos_usuarios') || '[]'
  );

  const usuariosInteresados = new Set<number>();

  favoritos.forEach((f) => {
    if (String(f.id_producto) === String(idProducto)) {
      usuariosInteresados.add(Number(f.id_usuario));
    }
  });

  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith('falu_carrito_')) {
      const idUserStr = k.replace('falu_carrito_', '');
      const idUserNum = Number(idUserStr);
      if (!isNaN(idUserNum)) {
        try {
          const items = JSON.parse(localStorage.getItem(k) || '[]');
          if (
            Array.isArray(items) &&
            items.some((it: any) => String(it.id_producto) === String(idProducto))
          ) {
            usuariosInteresados.add(idUserNum);
          }
        } catch {
          // Ignorar
        }
      }
    }
  }

  if (usuariosInteresados.size === 0) return;

  const nuevas: NotificacionItem[] = [];
  usuariosInteresados.forEach((idDestino) => {
    nuevas.push({
      id_notificacion: Date.now() + Math.floor(Math.random() * 10000),
      tipo: 'stock_repuesto',
      id_usuario_destino: idDestino,
      id_producto: Number(idProducto),
      producto_titulo: tituloProducto,
      fecha_compra: new Date().toLocaleString('es-AR'),
      mensaje_extra: `¡Volvió a entrar stock! Ahora hay ${nuevoStock} unidades disponibles para comprar.`,
      leida: false
    });
  });

  localStorage.setItem(
    'falu_notificaciones',
    JSON.stringify([...nuevas, ...todasNotif])
  );
  window.dispatchEvent(new Event('falu_actualizacion'));
}

// 4. Notificación cuando te hacen una PREGUNTA en tu publicación
export function notificarNuevaPregunta(params: {
  id_producto: number;
  titulo_producto: string;
  id_vendedor: number;
  usuario_pregunta_nombre: string;
  texto_pregunta: string;
}) {
  const todasNotif: NotificacionItem[] = JSON.parse(
    localStorage.getItem('falu_notificaciones') || '[]'
  );

  const nueva: NotificacionItem = {
    id_notificacion: Date.now() + Math.floor(Math.random() * 1000),
    tipo: 'pregunta',
    id_usuario_destino: Number(params.id_vendedor),
    id_producto: Number(params.id_producto),
    producto_titulo: params.titulo_producto,
    comprador_nombre: params.usuario_pregunta_nombre,
    fecha_compra: new Date().toLocaleString('es-AR'),
    mensaje_extra: `${params.usuario_pregunta_nombre} preguntó: "${params.texto_pregunta}"`,
    leida: false
  };

  localStorage.setItem(
    'falu_notificaciones',
    JSON.stringify([nueva, ...todasNotif])
  );
  window.dispatchEvent(new Event('falu_actualizacion'));
}

// 5. Notificación al comprador cuando el vendedor RESPONDE su pregunta
export function notificarRespuestaPregunta(params: {
  id_producto: number;
  titulo_producto: string;
  id_usuario_destino: number;
  texto_respuesta: string;
}) {
  const todasNotif: NotificacionItem[] = JSON.parse(
    localStorage.getItem('falu_notificaciones') || '[]'
  );

  const nueva: NotificacionItem = {
    id_notificacion: Date.now() + Math.floor(Math.random() * 1000),
    tipo: 'pregunta',
    id_usuario_destino: Number(params.id_usuario_destino),
    id_producto: Number(params.id_producto),
    producto_titulo: params.titulo_producto,
    fecha_compra: new Date().toLocaleString('es-AR'),
    mensaje_extra: `El vendedor respondió tu consulta: "${params.texto_respuesta}"`,
    leida: false
  };

  localStorage.setItem(
    'falu_notificaciones',
    JSON.stringify([nueva, ...todasNotif])
  );
  window.dispatchEvent(new Event('falu_actualizacion'));
}

// 6. Notificación cuando dejan una OPINIÓN / RESEÑA en tu producto
export function notificarNuevaOpinion(params: {
  id_producto: number;
  titulo_producto: string;
  id_vendedor: number;
  comprador_nombre: string;
  calificacion: number;
  comentario: string;
}) {
  const todasNotif: NotificacionItem[] = JSON.parse(
    localStorage.getItem('falu_notificaciones') || '[]'
  );

  const nueva: NotificacionItem = {
    id_notificacion: Date.now() + Math.floor(Math.random() * 1000),
    tipo: 'opinion',
    id_usuario_destino: Number(params.id_vendedor),
    id_producto: Number(params.id_producto),
    producto_titulo: params.titulo_producto,
    comprador_nombre: params.comprador_nombre,
    calificacion: params.calificacion,
    fecha_compra: new Date().toLocaleString('es-AR'),
    mensaje_extra: `${params.comprador_nombre} calificó tu producto con ${params.calificacion} ★: "${params.comentario}"`,
    leida: false
  };

  localStorage.setItem(
    'falu_notificaciones',
    JSON.stringify([nueva, ...todasNotif])
  );
  window.dispatchEvent(new Event('falu_actualizacion'));
}

export default function Notificaciones() {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [notificaciones, setNotificaciones] = useState<NotificacionItem[]>([]);
  const [apartadoActivo, setApartadoActivo] = useState<
    'todas' | 'ventas' | 'preguntas' | 'opiniones' | 'stock'
  >('todas');

  const cargarMisNotificaciones = () => {
    if (!user) return;
    const todas: NotificacionItem[] = JSON.parse(
      localStorage.getItem('falu_notificaciones') || '[]'
    );
    const mias = todas.filter(
      (n) => Number(n.id_usuario_destino) === Number(user.id_usuario)
    );
    setNotificaciones(mias);
  };

  useEffect(() => {
    if (!isAuthenticated || !user) {
      navigate('/login');
      return;
    }
    cargarMisNotificaciones();

    window.addEventListener('falu_actualizacion', cargarMisNotificaciones);
    window.addEventListener('storage', cargarMisNotificaciones);
    return () => {
      window.removeEventListener('falu_actualizacion', cargarMisNotificaciones);
      window.removeEventListener('storage', cargarMisNotificaciones);
    };
  }, [isAuthenticated, user, navigate]);

  const marcarComoLeida = (idNotificacion: number) => {
    const todas: NotificacionItem[] = JSON.parse(
      localStorage.getItem('falu_notificaciones') || '[]'
    );
    const actualizadas = todas.map((n) =>
      n.id_notificacion === idNotificacion ? { ...n, leida: true } : n
    );
    localStorage.setItem('falu_notificaciones', JSON.stringify(actualizadas));
    cargarMisNotificaciones();
    window.dispatchEvent(new Event('falu_actualizacion'));
  };

  const marcarTodasLeidas = () => {
    if (!user) return;
    const todas: NotificacionItem[] = JSON.parse(
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

  const eliminarNotificacion = (idNotificacion: number) => {
    const todas: NotificacionItem[] = JSON.parse(
      localStorage.getItem('falu_notificaciones') || '[]'
    );
    const actualizadas = todas.filter((n) => n.id_notificacion !== idNotificacion);
    localStorage.setItem('falu_notificaciones', JSON.stringify(actualizadas));
    cargarMisNotificaciones();
    window.dispatchEvent(new Event('falu_actualizacion'));
  };

  const cantVentas = notificaciones.filter((n) => n.tipo === 'venta').length;
  const cantPreguntas = notificaciones.filter((n) => n.tipo === 'pregunta').length;
  const cantOpiniones = notificaciones.filter((n) => n.tipo === 'opinion').length;
  const cantStock = notificaciones.filter(
    (n) => n.tipo === 'sin_stock' || n.tipo === 'stock_repuesto'
  ).length;

  const notificacionesFiltradas = notificaciones.filter((n) => {
    if (apartadoActivo === 'ventas') return n.tipo === 'venta';
    if (apartadoActivo === 'preguntas') return n.tipo === 'pregunta';
    if (apartadoActivo === 'opiniones') return n.tipo === 'opinion';
    if (apartadoActivo === 'stock') {
      return n.tipo === 'sin_stock' || n.tipo === 'stock_repuesto';
    }
    return true;
  });

  const apartados = [
    { id: 'todas', label: `Todas (${notificaciones.length})`, icon: Bell },
    { id: 'ventas', label: `Ventas (${cantVentas})`, icon: ShoppingBag },
    {
      id: 'preguntas',
      label: `Preguntas (${cantPreguntas})`,
      icon: MessageCircleQuestion
    },
    { id: 'opiniones', label: `Opiniones (${cantOpiniones})`, icon: Star },
    {
      id: 'stock',
      label: `Stock y Avisos (${cantStock})`,
      icon: AlertTriangle
    }
  ];

  const renderizarIconoNotificacion = (tipo: TipoNotificacion) => {
    if (tipo === 'venta') {
      return (
        <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
          <ShoppingBag className="w-5 h-5" />
        </div>
      );
    }
    if (tipo === 'pregunta') {
      return (
        <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
          <MessageCircleQuestion className="w-5 h-5" />
        </div>
      );
    }
    if (tipo === 'opinion') {
      return (
        <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
          <Star className="w-5 h-5 fill-amber-400" />
        </div>
      );
    }
    if (tipo === 'sin_stock') {
      return (
        <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center shrink-0">
          <AlertTriangle className="w-5 h-5" />
        </div>
      );
    }
    return (
      <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
        <PackageCheck className="w-5 h-5" />
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <Navbar />

      <main className="max-w-5xl w-full mx-auto px-4 py-8 flex-1">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900">
              Centro de Notificaciones
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Seguimiento en tiempo real de tus ventas, preguntas, opiniones y alertas de stock
            </p>
          </div>

          {notificaciones.some((n) => !n.leida) && (
            <button
              type="button"
              onClick={marcarTodasLeidas}
              className="bg-white border border-slate-300 hover:border-blue-600 text-slate-700 hover:text-blue-600 text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-1.5 w-fit transition-colors"
            >
              <CheckCheck className="w-4 h-4" />
              Marcar todas como leídas
            </button>
          )}
        </div>

        {/* Pestañas / Apartados de Notificaciones */}
        <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-4 no-scrollbar">
          {apartados.map((tab) => {
            const Icono = tab.icon;
            const activo = apartadoActivo === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setApartadoActivo(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap border transition-all ${
                  activo
                    ? 'bg-blue-900 text-white border-blue-900 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:border-blue-600'
                }`}
              >
                <Icono className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {notificacionesFiltradas.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-2xs">
            <Bell className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <h2 className="text-base font-extrabold text-slate-800 mb-1">
              No tenés notificaciones en este apartado
            </h2>
            <p className="text-xs text-slate-500">
              Las novedades de tus ventas, preguntas, reseñas y alertas de stock aparecerán acá en vivo.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {notificacionesFiltradas.map((n) => (
              <div
                key={n.id_notificacion}
                onClick={() => {
                  if (!n.leida) marcarComoLeida(n.id_notificacion);
                }}
                className={`bg-white rounded-2xl border p-5 flex flex-col sm:flex-row items-start justify-between gap-4 transition-all ${
                  n.tipo === 'sin_stock' && !n.leida
                    ? 'border-red-400 bg-red-50/20 shadow-xs'
                    : !n.leida
                    ? 'border-blue-400 bg-blue-50/10 shadow-xs'
                    : 'border-slate-200 opacity-85'
                }`}
              >
                <div className="flex items-start gap-3.5">
                  {renderizarIconoNotificacion(n.tipo)}

                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                          n.tipo === 'venta'
                            ? 'bg-emerald-100 text-emerald-800'
                            : n.tipo === 'pregunta'
                            ? 'bg-blue-100 text-blue-800'
                            : n.tipo === 'opinion'
                            ? 'bg-amber-100 text-amber-800'
                            : n.tipo === 'sin_stock'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-indigo-100 text-indigo-800'
                        }`}
                      >
                        {n.tipo === 'venta'
                          ? 'Nueva Venta'
                          : n.tipo === 'pregunta'
                          ? 'Pregunta / Respuesta'
                          : n.tipo === 'opinion'
                          ? 'Nueva Opinión'
                          : n.tipo === 'sin_stock'
                          ? 'Sin Stock Disponible'
                          : 'Aviso de Stock / Cuenta'}
                      </span>

                      <span className="text-xs text-slate-400">{n.fecha_compra}</span>

                      {!n.leida && (
                        <span className="bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                          Nueva
                        </span>
                      )}
                    </div>

                    <h3 className="text-sm font-extrabold text-slate-900">
                      {n.producto_titulo}
                    </h3>

                    {n.mensaje_extra && (
                      <p className="text-xs text-slate-700 leading-relaxed">
                        {n.mensaje_extra}
                      </p>
                    )}

                    {n.direccion_entrega && (
                      <div className="mt-2 bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-700 flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-blue-600 shrink-0" />
                        <span>
                          <strong>Enviar a:</strong> {n.direccion_entrega}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  {n.id_producto > 0 && (
                    <Link
                      to={`/producto/${n.id_producto}`}
                      className="px-3.5 py-2 rounded-xl border border-slate-300 hover:border-blue-600 text-xs font-bold text-slate-700 hover:text-blue-600 flex items-center gap-1.5 transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>
                        {n.tipo === 'sin_stock' ? 'Reponer stock' : 'Ver producto'}
                      </span>
                    </Link>
                  )}

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      eliminarNotificacion(n.id_notificacion);
                    }}
                    title="Eliminar notificación"
                    className="p-2 rounded-xl border border-slate-200 text-slate-400 hover:text-red-600 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
