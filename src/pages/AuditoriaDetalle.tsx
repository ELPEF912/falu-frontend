import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  FileText,
  ShoppingBag,
  MessageSquare,
  User,
  Flag,
  ExternalLink,
  Shield,
  Calendar
} from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { useAuth } from '../context/AuthContext';
import { esUsuarioAdminOSuperAdmin, type LogAuditoria } from './AdminPanel';

export default function AuditoriaDetalle() {
  const { idLog } = useParams<{ idLog: string }>();
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  if (!isAuthenticated || !esUsuarioAdminOSuperAdmin(user)) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center p-6">
          <p className="text-sm font-bold text-slate-700 mb-3">
            Acceso exclusivo para Administradores.
          </p>
          <Link to="/" className="text-xs font-bold text-blue-600 hover:underline">
            Volver al inicio
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

type LogAuditoriaConSnapshot = LogAuditoria & {
    tipo_entidad?: string;
    snapshot?: Record<string, any>;
  };

  const logs: LogAuditoriaConSnapshot[] = JSON.parse(
    localStorage.getItem('falu_auditoria_logs') || '[]'
  );
  const log = logs.find((l) => String(l.id_log) === String(idLog));

  if (!log) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center p-6">
          <p className="text-sm font-bold text-slate-700 mb-3">
            No se encontró el expediente de auditoría solicitado.
          </p>
          <button
            type="button"
            onClick={() => navigate('/admin')}
            className="bg-blue-600 text-white text-xs font-bold px-4 py-2 rounded-full"
          >
            Volver al Panel Admin
          </button>
        </div>
        <Footer />
      </div>
    );
  }

  const snap = log.snapshot;

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <Navbar />

      <main className="max-w-4xl w-full mx-auto px-4 py-8 flex-1 space-y-6">
        <button
          type="button"
          onClick={() => navigate('/admin')}
          className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver al Panel de Administración
        </button>

        {/* Encabezado del Expediente de Auditoría */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-2xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-blue-900 text-white flex items-center justify-center">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-600 block">
                  Expediente de Auditoría #{log.id_log}
                </span>
                <h1 className="text-lg sm:text-xl font-extrabold text-slate-900">
                  {log.accion}
                </h1>
              </div>
            </div>

            <span className="text-xs text-slate-500 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              {log.fecha}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-blue-900" />
              <span>
                Ejecutado por: <strong>{log.admin_nombre}</strong> ({log.rol_admin})
              </span>
            </div>
            <div>
              <span>
                Tipo de elemento auditado:{' '}
                <strong className="uppercase">{log.tipo_entidad || 'General'}</strong>
              </span>
            </div>
          </div>

          <div>
            <h2 className="text-xs font-bold uppercase text-slate-400 mb-1">
              Resumen de la operación
            </h2>
            <p className="text-sm text-slate-800 font-medium bg-white p-3.5 rounded-xl border border-slate-200">
              {log.detalle}
            </p>
          </div>
        </div>

        {/* DETALLE ESPECÍFICO SEGÚN LO QUE SE HAYA AUDITADO (Producto / Chat / Pregunta / Opinión / Usuario) */}
        {snap && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-2xs space-y-4">
            <h2 className="text-base font-extrabold text-slate-900 border-b border-slate-100 pb-3">
              Evidencia y contenido completo del elemento auditado
            </h2>

            {/* CASO 1: ES UN PRODUCTO */}
            {log.tipo_entidad === 'producto' && (
              <div className="space-y-4 text-xs">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div className="flex items-center gap-4">
                    {snap.imagen_url ? (
                      <img
                        src={snap.imagen_url}
                        alt={snap.titulo}
                        className="w-20 h-20 rounded-xl object-cover border border-slate-200"
                      />
                    ) : (
                      <ShoppingBag className="w-12 h-12 text-slate-300" />
                    )}
                    <div>
                      <h3 className="text-base font-extrabold text-slate-900">
                        {snap.titulo}
                      </h3>
                      <p className="text-slate-600">
                        Vendedor: <strong>{snap.vendedor_nombre || 'Vendedor'}</strong> | Categoría: {snap.categoria}
                      </p>
                      <p className="text-sm font-extrabold text-blue-900 mt-1">
                        ARS ${Number(snap.precio || 0).toLocaleString('es-AR')} — Estado resultante:{' '}
                        <span className="uppercase">{snap.estado}</span>
                      </p>
                    </div>
                  </div>

                  <Link
                    to={`/producto/${snap.id_producto}`}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2.5 rounded-xl flex items-center gap-1.5 shrink-0"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Abrir publicación
                  </Link>
                </div>

                {Array.isArray(snap.reportes_producto) &&
                  snap.reportes_producto.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-bold text-slate-800">
                        Reportes recibidos en esta publicación ({snap.reportes_producto.length}):
                      </h4>
                      {snap.reportes_producto.map((r: any, idx: number) => (
                        <div
                          key={idx}
                          className="p-3 rounded-xl border border-slate-200 bg-slate-50"
                        >
                          <p className="font-bold text-slate-900">
                            Usuario: {r.usuario_nombre} ({r.fecha})
                          </p>
                          <p className="text-red-700 font-semibold">
                            Razón: {r.motivo}
                          </p>
                          <p className="text-slate-700">
                            Descripción: "{r.descripcion}"
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
              </div>
            )}

            {/* CASO 2: ES UN CHAT REPORTADO */}
            {log.tipo_entidad === 'chat' && (
              <div className="space-y-4 text-xs">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <p className="font-bold text-slate-900 text-sm">
                    Conversación sobre producto: {snap.titulo_producto}
                  </p>
                  <p className="text-slate-600 mt-0.5">
                    Denunciado por: <strong>{snap.reportado_por_nombre}</strong> | Motivo: <strong className="text-red-700">{snap.motivo}</strong>
                  </p>
                  {snap.resolucion && (
                    <p className="text-emerald-800 font-bold mt-1">
                      Decisión tomada: {snap.resolucion}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <h4 className="font-bold text-slate-800 flex items-center gap-1.5">
                    <MessageSquare className="w-4 h-4 text-blue-600" />
                    Transcripción de los últimos mensajes archivados:
                  </h4>
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2 max-h-80 overflow-y-auto">
                    {!snap.ultimos_20_mensajes ||
                    snap.ultimos_20_mensajes.length === 0 ? (
                      <p className="text-slate-400">Sin mensajes de texto en el expediente.</p>
                    ) : (
                      snap.ultimos_20_mensajes.map((m: any) => (
                        <div
                          key={m.id_mensaje}
                          className="bg-white p-3 rounded-lg border border-slate-200"
                        >
                          <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                            <strong className="text-blue-900">
                              {m.remitente_nombre}
                            </strong>
                            <span>{m.fecha_hora}</span>
                          </div>
                          <p className="text-slate-800">{m.texto}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* CASO 3: ES UNA OPINIÓN O PREGUNTA */}
            {(log.tipo_entidad === 'opinion' || log.tipo_entidad === 'pregunta') && (
              <div className="space-y-4 text-xs">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                  <p className="font-bold text-slate-900">
                    Autor: {snap.comprador_nombre || snap.usuario_nombre} ({snap.fecha})
                  </p>
                  <p className="text-sm text-slate-800 bg-white p-3 rounded-lg border border-slate-200">
                    "{snap.comentario || snap.texto_pregunta}"
                  </p>
                  {snap.resolucion && (
                    <p className="font-bold text-emerald-800">
                      Resolución: {snap.resolucion}
                    </p>
                  )}
                  <Link
                    to={`/producto/${snap.id_producto}`}
                    className="inline-flex items-center gap-1 text-blue-600 font-bold hover:underline pt-1"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Ver producto asociado
                  </Link>
                </div>

                {Array.isArray(snap.reportes) && snap.reportes.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-bold text-slate-800 flex items-center gap-1">
                      <Flag className="w-3.5 h-3.5 text-red-600" />
                      Reportes que motivaron la revisión:
                    </h4>
                    {snap.reportes.map((r: any, idx: number) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl border border-slate-200 bg-slate-50"
                      >
                        <p className="font-bold text-slate-900">
                          Reportado por: {r.usuario_nombre || `Usuario #${r.id_usuario}`}
                        </p>
                        <p className="text-red-700 font-semibold">Motivo: {r.motivo}</p>
                        {r.descripcion && (
                          <p className="text-slate-700">Descripción: "{r.descripcion}"</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* CASO 4: ES UN USUARIO SANCIONADO / ADVERTIDO */}
            {log.tipo_entidad === 'usuario' && (
              <div className="space-y-4 text-xs">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-1.5">
                  <div className="flex items-center gap-2 font-extrabold text-sm text-slate-900">
                    <User className="w-4 h-4 text-blue-900" />
                    <span>
                      {snap.nombre} {snap.apellido} ({snap.email})
                    </span>
                  </div>
                  <p>
                    Estado actual de la cuenta:{' '}
                    <strong className="uppercase">{snap.estado_cuenta}</strong> | Avisos acumulados:{' '}
                    <strong>{snap.avisos || 0} / 3</strong>
                  </p>
                  {snap.suspendido_hasta && (
                    <p className="text-red-700 font-bold">
                      Sin permiso para loguearse hasta:{' '}
                      {new Date(snap.suspendido_hasta).toLocaleString('es-AR')}
                    </p>
                  )}
                </div>

                {Array.isArray(snap.historial_sanciones) &&
                  snap.historial_sanciones.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-bold text-slate-800">
                        Historial disciplinario registrado en esta cuenta:
                      </h4>
                      {snap.historial_sanciones.map((h: any, idx: number) => (
                        <div
                          key={idx}
                          className="p-3 rounded-xl border border-slate-200 bg-slate-50"
                        >
                          <div className="flex justify-between font-bold text-slate-900">
                            <span className="uppercase">{h.tipo}</span>
                            <span className="text-slate-400">{h.fecha}</span>
                          </div>
                          <p className="text-slate-700 mt-1">{h.motivo}</p>
                          <span className="text-[11px] text-slate-400 block mt-0.5">
                            Aplicado por: {h.admin_nombre}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
              </div>
            )}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}