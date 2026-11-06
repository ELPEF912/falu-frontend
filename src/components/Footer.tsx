import { useState, useEffect, type FormEvent } from 'react';
import {
  ShoppingBag,
  MessageSquare,
  Send,
  X,
  Flag,
  ChevronLeft,
  Trash2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { sincronizarSoloChatBajoDemanda } from '../services/api';

interface MensajeChat {
  id_mensaje: number;
  id_remitente: number;
  remitente_nombre: string;
  texto: string;
  fecha_hora: string;
  creado_en?: number;
}

interface ConversacionChat {
  id_conversacion: number;
  id_producto: number;
  titulo_producto: string;
  id_vendedor: number;
  vendedor_nombre: string;
  id_comprador: number;
  comprador_nombre: string;
  iniciado_por_comprador?: boolean;
  no_leidos_vendedor?: number;
  no_leidos_comprador?: number;
  mensajes: MensajeChat[];
}

const MOTIVOS_REPORTE_CHAT = [
  'Spam o publicidad engañosa',
  'Insultos o lenguaje ofensivo',
  'Intento de estafa o fraude fuera de Falú',
  'Acoso o conducta inapropiada',
  'Otro'
];

const CUATRO_HORAS_MS = 4 * 60 * 60 * 1000;

export default function Footer() {
  const { user, isAuthenticated } = useAuth();

  const [chatAbierto, setChatAbierto] = useState(false);
  const [conversaciones, setConversaciones] = useState<ConversacionChat[]>([]);
  const [conversacionActivaId, setConversacionActivaId] = useState<
    number | null
  >(null);
  const [nuevoMensaje, setNuevoMensaje] = useState('');

  const [modalReporteChat, setModalReporteChat] = useState(false);
  const [motivoReporte, setMotivoReporte] = useState(MOTIVOS_REPORTE_CHAT[0]);

  const cargarConversaciones = () => {
    if (!isAuthenticated || !user) {
      setConversaciones([]);
      return;
    }

    const guardadas: ConversacionChat[] = JSON.parse(
      localStorage.getItem('falu_conversaciones_chat') || '[]'
    );
    const compras: any[] = JSON.parse(
      localStorage.getItem('falu_compras_usuarios') || '[]'
    );
    const catalogo: any[] = JSON.parse(
      localStorage.getItem('falu_productos_locales') || '[]'
    );

    let huboAutocreacion = false;
    compras.forEach((c) => {
      if (c.estado_compra === 'cancelada_sin_stock') return;
      if (Number(c.id_usuario) !== Number(user.id_usuario)) return;

      const prod = catalogo.find(
        (p) => String(p.id_producto) === String(c.id_producto)
      );
      const idVend = Number(c.id_vendedor || prod?.id_vendedor || 1);
      if (idVend === Number(user.id_usuario)) return;

      const existe = guardadas.some(
        (conv) =>
          Number(conv.id_producto) === Number(c.id_producto) &&
          Number(conv.id_comprador) === Number(user.id_usuario)
      );

      if (!existe) {
        guardadas.unshift({
          id_conversacion: Date.now() + Math.floor(Math.random() * 10000),
          id_producto: Number(c.id_producto),
          titulo_producto:
            prod?.titulo || c.titulo_snapshot || 'Producto comprado',
          id_vendedor: idVend,
          vendedor_nombre: prod?.vendedor_nombre || 'Vendedor Falú',
          id_comprador: Number(user.id_usuario),
          comprador_nombre: `${user.nombre} ${user.apellido || ''}`.trim(),
          iniciado_por_comprador: true,
          no_leidos_vendedor: 0,
          no_leidos_comprador: 0,
          mensajes: []
        });
        huboAutocreacion = true;
      }
    });

    if (huboAutocreacion) {
      localStorage.setItem(
        'falu_conversaciones_chat',
        JSON.stringify(guardadas)
      );
    }

    const mias = guardadas.filter(
      (c) =>
        Number(c.id_comprador) === Number(user.id_usuario) ||
        Number(c.id_vendedor) === Number(user.id_usuario)
    );

    setConversaciones(mias);
  };

  useEffect(() => {
    cargarConversaciones();

    const handleAbrirManual = (e: any) => {
      sincronizarSoloChatBajoDemanda().finally(() => {
        cargarConversaciones();
        setChatAbierto(true);
        if (e?.detail?.id_conversacion) {
          setConversacionActivaId(Number(e.detail.id_conversacion));
        }
      });
    };

    window.addEventListener('falu_actualizacion', cargarConversaciones);
    window.addEventListener('falu_nuevo_mensaje_chat', cargarConversaciones);
    window.addEventListener('storage', cargarConversaciones);
    window.addEventListener('falu_abrir_chat_manual', handleAbrirManual);

    return () => {
      window.removeEventListener('falu_actualizacion', cargarConversaciones);
      window.removeEventListener(
        'falu_nuevo_mensaje_chat',
        cargarConversaciones
      );
      window.removeEventListener('storage', cargarConversaciones);
      window.removeEventListener('falu_abrir_chat_manual', handleAbrirManual);
    };
  }, [user, isAuthenticated]);

  const abrirCerrarWidgetChat = () => {
    const nuevoEstado = !chatAbierto;
    setChatAbierto(nuevoEstado);
    if (nuevoEstado) {
      sincronizarSoloChatBajoDemanda().then(() => {
        cargarConversaciones();
      });
    }
  };

  const seleccionarConversacion = (conv: ConversacionChat) => {
    setConversacionActivaId(conv.id_conversacion);
    if (!user) return;

    const todas: ConversacionChat[] = JSON.parse(
      localStorage.getItem('falu_conversaciones_chat') || '[]'
    );
    const actualizadas = todas.map((c) => {
      if (c.id_conversacion !== conv.id_conversacion) return c;
      if (Number(c.id_vendedor) === Number(user.id_usuario)) {
        return { ...c, no_leidos_vendedor: 0 };
      }
      return { ...c, no_leidos_comprador: 0 };
    });
    localStorage.setItem(
      'falu_conversaciones_chat',
      JSON.stringify(actualizadas)
    );
    cargarConversaciones();
  };

  const handleEnviarMensaje = (e: FormEvent) => {
    e.preventDefault();
    if (!user || !conversacionActivaId || !nuevoMensaje.trim()) return;

    const msgObj: MensajeChat = {
      id_mensaje: Date.now(),
      id_remitente: user.id_usuario,
      remitente_nombre: `${user.nombre} ${user.apellido || ''}`.trim(),
      texto: nuevoMensaje.trim(),
      fecha_hora: new Date().toLocaleTimeString('es-AR', {
        hour: '2-digit',
        minute: '2-digit'
      }),
      creado_en: Date.now()
    };

    const todas: ConversacionChat[] = JSON.parse(
      localStorage.getItem('falu_conversaciones_chat') || '[]'
    );

    const actualizadas = todas.map((c) => {
      if (c.id_conversacion !== conversacionActivaId) return c;
      const soyComprador = Number(c.id_comprador) === Number(user.id_usuario);
      return {
        ...c,
        iniciado_por_comprador: true,
        no_leidos_vendedor: soyComprador
          ? (c.no_leidos_vendedor || 0) + 1
          : c.no_leidos_vendedor || 0,
        no_leidos_comprador: !soyComprador
          ? (c.no_leidos_comprador || 0) + 1
          : c.no_leidos_comprador || 0,
        mensajes: [...(c.mensajes || []), msgObj]
      };
    });

    localStorage.setItem(
      'falu_conversaciones_chat',
      JSON.stringify(actualizadas)
    );
    setNuevoMensaje('');
    cargarConversaciones();
  };

  const handleEliminarMensajePropio = (idMensaje: number, creadoEn?: number) => {
    if (!user || !conversacionActivaId) return;
    if (!creadoEn || Date.now() - creadoEn > CUATRO_HORAS_MS) {
      alert('Solo podés eliminar mensajes dentro de las primeras 4 horas.');
      return;
    }

    const todas: ConversacionChat[] = JSON.parse(
      localStorage.getItem('falu_conversaciones_chat') || '[]'
    );
    const actualizadas = todas.map((c) => {
      if (c.id_conversacion !== conversacionActivaId) return c;
      return {
        ...c,
        mensajes: (c.mensajes || []).filter((m) => m.id_mensaje !== idMensaje)
      };
    });

    localStorage.setItem(
      'falu_conversaciones_chat',
      JSON.stringify(actualizadas)
    );
    cargarConversaciones();
  };

  const handleReportarChat = (e: FormEvent) => {
    e.preventDefault();
    if (!user || !conversacionActiva) return;

    const soyComprador =
      Number(conversacionActiva.id_comprador) === Number(user.id_usuario);
    const idAcusado = soyComprador
      ? conversacionActiva.id_vendedor
      : conversacionActiva.id_comprador;
    const nombreAcusado = soyComprador
      ? conversacionActiva.vendedor_nombre
      : conversacionActiva.comprador_nombre;

    const ultimos20 = (conversacionActiva.mensajes || []).slice(-20);

    const reportes = JSON.parse(
      localStorage.getItem('falu_reportes_chats_admin') || '[]'
    );
    reportes.unshift({
      id_reporte_chat: Date.now(),
      id_conversacion: conversacionActiva.id_conversacion,
      id_producto: conversacionActiva.id_producto,
      titulo_producto: conversacionActiva.titulo_producto,
      reportado_por_id: user.id_usuario,
      reportado_por_nombre: `${user.nombre} ${user.apellido || ''}`.trim(),
      id_usuario_acusado: idAcusado,
      nombre_usuario_acusado: nombreAcusado,
      motivo: motivoReporte,
      fecha_reporte: new Date().toLocaleString('es-AR'),
      ultimos_20_mensajes: ultimos20,
      estado_revision: 'no_revisado'
    });

    localStorage.setItem('falu_reportes_chats_admin', JSON.stringify(reportes));
    setModalReporteChat(false);
    alert(
      'Conversación reportada a Administración junto con la copia de los últimos 20 mensajes.'
    );
  };

  const conversacionActiva = conversaciones.find(
    (c) => c.id_conversacion === conversacionActivaId
  );

  const totalNoLeidos = conversaciones.reduce((acc, c) => {
    if (!user) return acc;
    if (Number(c.id_vendedor) === Number(user.id_usuario)) {
      return acc + Number(c.no_leidos_vendedor || 0);
    }
    return acc + Number(c.no_leidos_comprador || 0);
  }, 0);

  return (
    <>
      <footer className="bg-slate-900 text-slate-400 text-xs py-8 mt-12 border-t border-slate-800">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-white font-bold">
            <ShoppingBag className="w-4 h-4 text-blue-400" />
            <span>Falú Marketplace © {new Date().getFullYear()}</span>
          </div>
          <p className="text-slate-500 text-center sm:text-right">
            Plataforma de comercio electrónico — Todos los derechos reservados
          </p>
        </div>
      </footer>

      {isAuthenticated && user && (
        <div className="fixed bottom-4 right-4 z-50">
          {!chatAbierto ? (
            <button
              type="button"
              data-falu-chat-trigger="true"
              onClick={abrirCerrarWidgetChat}
              className="bg-blue-900 hover:bg-blue-800 text-white px-4 py-3 rounded-full shadow-xl flex items-center gap-2 font-bold text-xs border border-blue-700 transition-transform hover:scale-105"
            >
              <MessageSquare className="w-4 h-4" />
              <span>Mensajes ({conversaciones.length})</span>
              {totalNoLeidos > 0 && (
                <span className="bg-red-600 text-white text-[10px] font-extrabold px-1.5 py-0.5 rounded-full">
                  {totalNoLeidos > 99 ? '+99' : totalNoLeidos}
                </span>
              )}
            </button>
          ) : (
            <div className="bg-white w-80 sm:w-96 h-[430px] rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
              <div className="bg-blue-900 text-white px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  {conversacionActiva && (
                    <button
                      type="button"
                      onClick={() => setConversacionActivaId(null)}
                      className="p-1 hover:bg-blue-800 rounded-lg"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                  )}
                  <MessageSquare className="w-4 h-4 shrink-0" />
                  <span className="text-xs font-extrabold truncate">
                    {conversacionActiva
                      ? conversacionActiva.titulo_producto
                      : 'Mis Mensajes Post-Venta'}
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  {conversacionActiva && (
                    <button
                      type="button"
                      onClick={() => setModalReporteChat(true)}
                      title="Reportar conversación"
                      className="p-1.5 text-blue-200 hover:text-red-300"
                    >
                      <Flag className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setChatAbierto(false)}
                    className="p-1 text-blue-200 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {!conversacionActiva ? (
                <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
                  {conversaciones.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-400">
                      Todavía no tenés conversaciones activas. Al comprar o vender un producto, el chat con la otra parte aparecerá acá.
                    </div>
                  ) : (
                    conversaciones.map((c) => {
                      const soyComprador =
                        Number(c.id_comprador) === Number(user.id_usuario);
                      const nombreContraparte = soyComprador
                        ? c.vendedor_nombre
                        : c.comprador_nombre;
                      const ultimoMsg =
                        c.mensajes && c.mensajes.length > 0
                          ? c.mensajes[c.mensajes.length - 1].texto
                          : 'Tocá para enviar un mensaje...';

                      return (
                        <button
                          key={c.id_conversacion}
                          type="button"
                          onClick={() => seleccionarConversacion(c)}
                          className="w-full text-left p-3.5 hover:bg-slate-50 transition-colors flex flex-col gap-1"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-extrabold text-slate-900 truncate">
                              {nombreContraparte}
                            </span>
                            <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                              {soyComprador ? 'Vendedor' : 'Comprador'}
                            </span>
                          </div>
                          <span className="text-[11px] font-semibold text-slate-600 truncate">
                            Producto: {c.titulo_producto}
                          </span>
                          <span className="text-[11px] text-slate-400 truncate">
                            {ultimoMsg}
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>
              ) : (
                <>
                  <div className="flex-1 p-3 overflow-y-auto space-y-2.5 bg-slate-50">
                    {(!conversacionActiva.mensajes ||
                      conversacionActiva.mensajes.length === 0) && (
                      <p className="text-center text-[11px] text-slate-400 py-6">
                        Escribí el primer mensaje para coordinar la entrega del producto.
                      </p>
                    )}

                    {(conversacionActiva.mensajes || []).map((m) => {
                      const esMio =
                        Number(m.id_remitente) === Number(user.id_usuario);
                      const puedeBorrar =
                        esMio &&
                        m.creado_en &&
                        Date.now() - m.creado_en <= CUATRO_HORAS_MS;

                      return (
                        <div
                          key={m.id_mensaje}
                          className={`flex flex-col ${
                            esMio ? 'items-end' : 'items-start'
                          }`}
                        >
                          <div
                            className={`max-w-[80%] rounded-2xl px-3 py-2 text-xs ${
                              esMio
                                ? 'bg-blue-600 text-white rounded-br-xs'
                                : 'bg-white border border-slate-200 text-slate-800 rounded-bl-xs'
                            }`}
                          >
                            <p>{m.texto}</p>
                            <div className="flex items-center justify-end gap-2 mt-1 text-[9px] opacity-75">
                              <span>{m.fecha_hora}</span>
                              {puedeBorrar && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleEliminarMensajePropio(
                                      m.id_mensaje,
                                      m.creado_en
                                    )
                                  }
                                  title="Eliminar mensaje"
                                >
                                  <Trash2 className="w-2.5 h-2.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <form
                    onSubmit={handleEnviarMensaje}
                    className="p-2.5 bg-white border-t border-slate-200 flex items-center gap-2"
                  >
                    <input
                      type="text"
                      value={nuevoMensaje}
                      onChange={(e) => setNuevoMensaje(e.target.value)}
                      placeholder="Escribí un mensaje..."
                      className="flex-1 text-xs px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:border-blue-600"
                    />
                    <button
                      type="submit"
                      className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-xl"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </form>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {modalReporteChat && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200">
            <h3 className="text-sm font-extrabold text-slate-900 mb-2">
              Reportar conversación
            </h3>
            <form onSubmit={handleReportarChat} className="space-y-3">
              <div className="space-y-1.5">
                {MOTIVOS_REPORTE_CHAT.map((m) => (
                  <label
                    key={m}
                    className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer"
                  >
                    <input
                      type="radio"
                      name="motivoChat"
                      checked={motivoReporte === m}
                      onChange={() => setMotivoReporte(m)}
                    />
                    <span>{m}</span>
                  </label>
                ))}
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalReporteChat(false)}
                  className="text-xs font-bold text-slate-500 px-3 py-1.5"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-red-600 text-white text-xs font-bold px-4 py-1.5 rounded-xl"
                >
                  Enviar reporte
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}