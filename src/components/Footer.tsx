import { useState, useEffect, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  Mail,
  HelpCircle,
  FileText,
  ArrowRight,
  MessageSquare,
  ArrowUp,
  X,
  Send,
  Search,
  Flag,
  ChevronLeft
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export interface MensajeChat {
  id_mensaje: number;
  id_remitente: number;
  remitente_nombre: string;
  texto: string;
  fecha_hora: string;
  leido: boolean;
}

export interface ConversacionChat {
  id_conversacion: string;
  id_producto: number;
  titulo_producto: string;
  id_comprador: number;
  comprador_nombre: string;
  id_vendedor: number;
  vendedor_nombre: string;
  mensajes: MensajeChat[];
}

export default function Footer() {
  const { user, isAuthenticated } = useAuth();

  const [chatAbierto, setChatAbierto] = useState(false);
  const [conversaciones, setConversaciones] = useState<ConversacionChat[]>([]);
  const [idConvActiva, setIdConvActiva] = useState<string | null>(null);
  const [busquedaContacto, setBusquedaContacto] = useState('');
  const [mensajeTexto, setMensajeTexto] = useState('');

  // Estados para reportar chat (envía los últimos 20 mensajes al panel Admin)
  const [modalReporteChat, setModalReporteChat] = useState(false);
  const [motivoReporteChat, setMotivoReporteChat] = useState('Spam o estafa');
  const [avisoReporteEnviado, setAvisoReporteEnviado] = useState('');

  const cargarConversaciones = () => {
    if (!isAuthenticated || !user) {
      setConversaciones([]);
      return;
    }

    const todas: ConversacionChat[] = JSON.parse(
      localStorage.getItem('falu_chats_operaciones') || '[]'
    );
    
    // Filtrar conversaciones según el rol del usuario:
    // - Si soy el COMPRADOR: veo el chat apenas compré el producto para poder hablarle al proveedor.
    // - Si soy el VENDEDOR: solo veo el chat si el comprador ya me envió al menos 1 mensaje (mensajes.length > 0).
    const visiblesParaMi = todas.filter((c) => {
      const soyComprador = Number(c.id_comprador) === Number(user.id_usuario);
      const soyVendedor = Number(c.id_vendedor) === Number(user.id_usuario);

      if (soyComprador) return true;
      if (soyVendedor && c.mensajes.length > 0) return true;
      return false;
    });

    setConversaciones(visiblesParaMi);
  };

  useEffect(() => {
    cargarConversaciones();
    window.addEventListener('storage', cargarConversaciones);
    window.addEventListener('falu_actualizacion', cargarConversaciones);
    return () => {
      window.removeEventListener('storage', cargarConversaciones);
      window.removeEventListener('falu_actualizacion', cargarConversaciones);
    };
  }, [isAuthenticated, user]);

  // Marcar mensajes como leídos al abrir una conversación específica
  const seleccionarConversacion = (idConv: string) => {
    setIdConvActiva(idConv);
    if (!user) return;

    const todas: ConversacionChat[] = JSON.parse(
      localStorage.getItem('falu_chats_operaciones') || '[]'
    );

    const actualizadas = todas.map((c) => {
      if (c.id_conversacion !== idConv) return c;
      return {
        ...c,
        mensajes: c.mensajes.map((m) =>
          Number(m.id_remitente) !== Number(user.id_usuario)
            ? { ...m, leido: true }
            : m
        )
      };
    });

    localStorage.setItem('falu_chats_operaciones', JSON.stringify(actualizadas));
    cargarConversaciones();
  };

  // Enviar un mensaje dentro de la conversación activa
  const handleEnviarMensaje = (e: FormEvent) => {
    e.preventDefault();
    if (!mensajeTexto.trim() || !user || !idConvActiva) return;

    const todas: ConversacionChat[] = JSON.parse(
      localStorage.getItem('falu_chats_operaciones') || '[]'
    );

    const nuevoMsg: MensajeChat = {
      id_mensaje: Date.now(),
      id_remitente: user.id_usuario,
      remitente_nombre: `${user.nombre} ${user.apellido || ''}`.trim(),
      texto: mensajeTexto.trim(),
      fecha_hora: new Date().toLocaleTimeString('es-AR', {
        hour: '2-digit',
        minute: '2-digit'
      }),
      leido: false
    };

    const actualizadas = todas.map((c) =>
      c.id_conversacion === idConvActiva
        ? { ...c, mensajes: [...c.mensajes, nuevoMsg] }
        : c
    );

    localStorage.setItem('falu_chats_operaciones', JSON.stringify(actualizadas));
    setMensajeTexto('');
    cargarConversaciones();
    window.dispatchEvent(new Event('falu_actualizacion'));
  };

  // Reportar conversación enviando copia de los últimos 20 mensajes al Administrador
  const handleReportarChat = (e: FormEvent) => {
    e.preventDefault();
    if (!user || !idConvActiva) return;

    const conv = conversaciones.find((c) => c.id_conversacion === idConvActiva);
    if (!conv) return;

    const ultimos20Mensajes = conv.mensajes.slice(-20);

    const reportesAdmin = JSON.parse(
      localStorage.getItem('falu_reportes_chats_admin') || '[]'
    );
    const soyComprador = Number(conv.id_comprador) === Number(user.id_usuario);
    const idAcusado = soyComprador ? conv.id_vendedor : conv.id_comprador;
    const nombreAcusado = soyComprador ? conv.vendedor_nombre : conv.comprador_nombre;

    reportesAdmin.unshift({
      id_reporte_chat: Date.now(),
      fecha_reporte: new Date().toLocaleString('es-AR'),
      id_conversacion: conv.id_conversacion,
      titulo_producto: conv.titulo_producto,
      reportado_por_id: user.id_usuario,
      reportado_por_nombre: `${user.nombre} ${user.apellido || ''}`.trim(),
      id_usuario_acusado: idAcusado,
      nombre_usuario_acusado: nombreAcusado,
      motivo: motivoReporteChat,
      ultimos_20_mensajes: ultimos20Mensajes
    });

    localStorage.setItem(
      'falu_reportes_chats_admin',
      JSON.stringify(reportesAdmin)
    );

    setModalReporteChat(false);
    setAvisoReporteEnviado(
      'Se envió el reporte con copia de los últimos 20 mensajes a los administradores.'
    );
    setTimeout(() => setAvisoReporteEnviado(''), 4000);
  };

  // Calcular total de mensajes recibidos no leídos (Tope 99 / +99)
  const totalNoLeidos = user
    ? conversaciones.reduce((acc, conv) => {
        const noLeidosConv = conv.mensajes.filter(
          (m) => Number(m.id_remitente) !== Number(user.id_usuario) && !m.leido
        ).length;
        return acc + noLeidosConv;
      }, 0)
    : 0;

  // Filtrar conversaciones por buscador (nombre de cliente, proveedor o producto)
  const conversacionesFiltradas = conversaciones.filter((c) => {
    const termino = busquedaContacto.toLowerCase();
    return (
      c.comprador_nombre.toLowerCase().includes(termino) ||
      c.vendedor_nombre.toLowerCase().includes(termino) ||
      c.titulo_producto.toLowerCase().includes(termino)
    );
  });

  const conversacionActiva = conversaciones.find(
    (c) => c.id_conversacion === idConvActiva
  );

  return (
    <>
      <footer id="seccion-soporte" className="bg-white border-t border-slate-200 mt-12">
        <div className="max-w-7xl mx-auto px-4 py-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-sm">
            
            <div className="space-y-2.5">
              <div className="flex items-center gap-2 text-blue-900 font-bold text-base">
                <Mail className="w-5 h-5" />
                <h3>Soporte Falú</h3>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Si tenés inconvenientes técnicos con tu cuenta, problemas con una publicación o necesitás reportar una incidencia a los administradores de la plataforma, comunicate directamente por correo electrónico.
              </p>
              <p className="text-xs font-semibold text-slate-800 pt-1">
                Contacto oficial:{' '}
                <a
                  href="mailto:soporte.falu@gmail.com"
                  className="text-blue-600 hover:underline"
                >
                  falu.soporte@gmail.com
                </a>
              </p>
            </div>

            <div className="space-y-2.5">
              <Link
                to="/ayuda"
                className="flex items-center gap-2 text-blue-900 hover:text-blue-600 font-bold text-base transition-colors w-fit"
              >
                <HelpCircle className="w-5 h-5" />
                <h3>Ayuda</h3>
              </Link>
              <p className="text-xs text-slate-600 leading-relaxed">
                Accedé al centro de ayuda para consultar sobre devoluciones, reclamos, envíos, cupones y preguntas frecuentes sobre compras, ventas y tu cuenta.
              </p>
              <Link
                to="/ayuda"
                className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:underline pt-1"
              >
                <span>Ir al Centro de Ayuda</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="space-y-2.5">
              <Link
                to="/condiciones-uso"
                className="flex items-center gap-2 text-blue-900 hover:text-blue-600 font-bold text-base transition-colors w-fit"
              >
                <FileText className="w-5 h-5" />
                <h3>Condiciones de Uso</h3>
              </Link>
              <p className="text-xs text-slate-600 leading-relaxed">
                Conocé los términos, políticas de uso, responsabilidades de compradores y vendedores y las normativas vigentes dentro del marketplace.
              </p>
              <Link
                to="/condiciones-uso"
                className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:underline pt-1"
              >
                <span>Leer Términos y Condiciones</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
              <p className="text-[11px] text-slate-400 pt-1">
                © {new Date().getFullYear()} Falú Marketplace. Todos los derechos reservados.
              </p>
            </div>

          </div>
        </div>
      </footer>

      {/* DOCK FLOTANTE GLOBAL DE MENSAJES Y ARRIBA (Tercera Foto) */}
      <div className="fixed bottom-6 right-5 z-50 flex flex-col items-end gap-3">
        
        {chatAbierto && (
          <div className="bg-white w-80 sm:w-96 rounded-2xl shadow-2xl border border-slate-200 overflow-hidden mb-1">
            
            {/* Encabezado del Chat */}
            <div className="bg-blue-900 text-white px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                {conversacionActiva ? (
                  <button
                    type="button"
                    onClick={() => setIdConvActiva(null)}
                    className="text-blue-200 hover:text-white mr-1"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                ) : (
                  <MessageSquare className="w-5 h-5 shrink-0" />
                )}

                <div className="truncate">
                  <h4 className="text-sm font-bold leading-none truncate">
                    {conversacionActiva
                      ? Number(conversacionActiva.id_comprador) === Number(user?.id_usuario)
                        ? `Proveedor: ${conversacionActiva.vendedor_nombre}`
                        : `Cliente: ${conversacionActiva.comprador_nombre}`
                      : 'Mensajes'}
                  </h4>
                  <span className="text-[11px] text-blue-200 truncate block mt-0.5">
                    {conversacionActiva
                      ? conversacionActiva.titulo_producto
                      : 'Clientes y proveedores de tus compras'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {conversacionActiva && (
                  <button
                    type="button"
                    onClick={() => setModalReporteChat(true)}
                    title="Reportar chat al Administrador"
                    className="text-blue-200 hover:text-red-300 p-1"
                  >
                    <Flag className="w-4 h-4" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setChatAbierto(false)}
                  className="text-blue-200 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {avisoReporteEnviado && (
              <div className="bg-amber-50 border-b border-amber-200 text-amber-800 px-3 py-2 text-[11px] font-semibold">
                {avisoReporteEnviado}
              </div>
            )}

            {!isAuthenticated ? (
              <div className="p-6 h-60 flex flex-col items-center justify-center text-center bg-slate-50">
                <p className="text-xs text-slate-600 mb-3">
                  Iniciá sesión para hablar con tus proveedores o clientes.
                </p>
                <Link
                  to="/login"
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 rounded-full transition-colors"
                >
                  Iniciar Sesión
                </Link>
              </div>
            ) : !conversacionActiva ? (
              /* VISTA 1: Buscador de Clientes/Proveedores y Lista de Conversaciones */
              <div className="flex flex-col h-72 bg-slate-50">
                <div className="p-2.5 bg-white border-b border-slate-200">
                  <div className="relative flex items-center">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3" />
                    <input
                      type="text"
                      value={busquedaContacto}
                      onChange={(e) => setBusquedaContacto(e.target.value)}
                      placeholder="Buscar cliente, proveedor o producto..."
                      className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-100 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto divide-y divide-slate-200/70">
                  {conversacionesFiltradas.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-center p-6 text-xs text-slate-400">
                      No hay conversaciones disponibles. Los chats se habilitan para el comprador al adquirir un producto, y para el vendedor cuando recibe el primer mensaje.
                    </div>
                  ) : (
                    conversacionesFiltradas.map((conv) => {
                      const soyComprador =
                        Number(conv.id_comprador) === Number(user?.id_usuario);
                      const nombreContraparte = soyComprador
                        ? `Proveedor: ${conv.vendedor_nombre}`
                        : `Cliente: ${conv.comprador_nombre}`;
                      const ultimoMensaje =
                        conv.mensajes[conv.mensajes.length - 1]?.texto ||
                        'Hacé clic para enviar el primer mensaje...';
                      const noLeidos = conv.mensajes.filter(
                        (m) =>
                          Number(m.id_remitente) !== Number(user?.id_usuario) &&
                          !m.leido
                      ).length;

                      return (
                        <button
                          key={conv.id_conversacion}
                          type="button"
                          onClick={() => seleccionarConversacion(conv.id_conversacion)}
                          className="w-full p-3.5 bg-white hover:bg-blue-50/50 text-left flex items-center justify-between gap-2 transition-colors"
                        >
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-900 truncate">
                              {nombreContraparte}
                            </p>
                            <p className="text-[11px] font-semibold text-blue-700 truncate">
                              {conv.titulo_producto}
                            </p>
                            <p className="text-[11px] text-slate-500 truncate mt-0.5">
                              {ultimoMensaje}
                            </p>
                          </div>

                          {noLeidos > 0 && (
                            <span className="bg-blue-600 text-white text-[10px] font-bold px-1.5 min-w-5 h-5 rounded-full flex items-center justify-center shrink-0">
                              {noLeidos > 99 ? '+99' : noLeidos}
                            </span>
                          )}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            ) : (
              /* VISTA 2: Mensajes de la Conversación Seleccionada */
              <>
                <div className="p-4 h-60 overflow-y-auto bg-slate-50 space-y-2.5 text-xs flex flex-col">
                  {conversacionActiva.mensajes.length === 0 ? (
                    <div className="m-auto text-center text-slate-400 px-4">
                      Escribí el primer mensaje para iniciar la consulta con el vendedor sobre tu compra.
                    </div>
                  ) : (
                    conversacionActiva.mensajes.map((msg) => {
                      const esMio =
                        Number(msg.id_remitente) === Number(user?.id_usuario);
                      return (
                        <div
                          key={msg.id_mensaje}
                          className={`max-w-[82%] p-2.5 rounded-xl border ${
                            esMio
                              ? 'self-end bg-blue-600 text-white border-blue-600'
                              : 'self-start bg-white text-slate-800 border-slate-200'
                          }`}
                        >
                          <p className="text-[10px] font-bold opacity-80 mb-0.5">
                            {msg.remitente_nombre}
                          </p>
                          <p className="leading-snug">{msg.texto}</p>
                          <span className="text-[9px] opacity-70 mt-1 block text-right">
                            {msg.fecha_hora}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>

                <form
                  onSubmit={handleEnviarMensaje}
                  className="p-2.5 bg-white border-t border-slate-200 flex items-center gap-2"
                >
                  <input
                    type="text"
                    value={mensajeTexto}
                    onChange={(e) => setMensajeTexto(e.target.value)}
                    placeholder="Escribí un mensaje..."
                    className="flex-1 text-xs px-3 py-2 bg-slate-100 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                  <button
                    type="submit"
                    className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-full transition-colors"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </form>
              </>
            )}
          </div>
        )}

        {/* Pastilla Flotante de Mensajes y Arriba (Tercera Foto) con contador hasta 99 / +99 */}
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-1.5 flex flex-col items-center gap-1">
          <button
            type="button"
            onClick={() => setChatAbierto(!chatAbierto)}
            className="relative flex flex-col items-center justify-center w-14 py-2 rounded-xl hover:bg-slate-100 text-slate-700 hover:text-blue-600 transition-colors"
          >
            {totalNoLeidos > 0 && (
              <span className="absolute top-0.5 right-1 bg-blue-600 text-white text-[10px] font-bold px-1.5 min-w-4 h-4 rounded-full flex items-center justify-center">
                {totalNoLeidos > 99 ? '+99' : totalNoLeidos}
              </span>
            )}
            <MessageSquare className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] font-bold">Mensajes</span>
          </button>

          <div className="w-8 h-px bg-slate-200" />

          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="flex flex-col items-center justify-center w-14 py-1.5 rounded-xl hover:bg-slate-100 text-slate-700 hover:text-blue-600 transition-colors"
          >
            <ArrowUp className="w-4 h-4 mb-0.5" />
            <span className="text-[10px] font-semibold">Arriba</span>
          </button>
        </div>
      </div>

      {/* MODAL PARA REPORTAR CHAT (Envía los últimos 20 mensajes al Administrador) */}
      {modalReporteChat && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-2">
              Reportar conversación
            </h3>
            <p className="text-xs text-slate-600 mb-4">
              Se enviará una copia de los <strong>últimos 20 mensajes</strong> de este chat a la pestaña de Administradores para su auditoría.
            </p>

            <form onSubmit={handleReportarChat} className="space-y-4">
              <select
                value={motivoReporteChat}
                onChange={(e) => setMotivoReporteChat(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white"
              >
                <option value="Spam o estafa">Spam o intento de estafa</option>
                <option value="Lenguaje ofensivo o acoso">Lenguaje ofensivo o acoso</option>
                <option value="Intento de evasión de la plataforma">
                  Intento de evasión de la plataforma
                </option>
                <option value="Incumplimiento en la entrega">
                  Incumplimiento en el acuerdo de entrega
                </option>
              </select>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalReporteChat(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-4 py-2 rounded-xl"
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