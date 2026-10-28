import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Shield,
  ShieldCheck,
  ShoppingBag,
  Flag,
  MessageSquare,
  FileText,
  UserCog,
  EyeOff,
  RotateCcw,
  Trash2,
  CheckCircle2,
  Clock,
  Search,
  ExternalLink,
  UserPlus,
  Star,
  AlertTriangle,
  MessageCircleQuestion,
  ChevronRight,
  Lock
} from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { useAuth } from '../context/AuthContext';

export type RolSistema = 'superadmin' | 'admin' | 'usuario';
export type EstadoReporte = 'no_revisado' | 'en_revision' | 'solucionado';

export interface RegistroSancionCuenta {
  fecha: string;
  tipo: 'aviso' | 'suspension_temporal' | 'baneo_definitivo' | 'rehabilitacion';
  motivo: string;
  admin_nombre: string;
  dias?: number;
}

export interface UsuarioRegistradoAdmin {
  id_usuario: number;
  nombre: string;
  apellido: string;
  email: string;
  rol: RolSistema;
  estado_cuenta: 'activo' | 'suspendido' | 'baneado';
  avisos?: number;
  suspendido_hasta?: number | null;
  motivo_sancion?: string | null;
  historial_sanciones?: RegistroSancionCuenta[];
}

export interface LogAuditoria {
  id_log: number;
  fecha: string;
  admin_nombre: string;
  rol_admin: string;
  tipo_entidad?: 'producto' | 'pregunta' | 'opinion' | 'chat' | 'usuario';
  accion: string;
  detalle: string;
  snapshot?: any;
}

const EMAIL_UNICO_SUPERADMIN = 'papumore2016@gmail.com';

function esCuentaSuperAdminOficial(user: any): boolean {
  if (!user) return false;
  const emailUser = (user.email || '').trim().toLowerCase();
  const emailJefe = EMAIL_UNICO_SUPERADMIN.trim().toLowerCase();

  if (emailJefe && emailJefe !== 'tu_correo_principal@gmail.com') {
    return emailUser === emailJefe;
  }
  return Number(user.id_usuario) === 1;
}

export function sincronizarUsuarioEnSistema(user: any) {
  if (!user) return;
  const lista: UsuarioRegistradoAdmin[] = JSON.parse(
    localStorage.getItem('falu_usuarios_sistema') || '[]'
  );

  const esSuper = esCuentaSuperAdminOficial(user);

  // Limpia cualquier cuenta que haya quedado como 'superadmin' por error en este navegador
  const listaCorregida = lista.map((u) => {
    const coincideUsuario =
      Number(u.id_usuario) === Number(user.id_usuario) ||
      (u.email && user.email && u.email.toLowerCase() === user.email.toLowerCase());

    if (coincideUsuario) {
      if (esSuper) return { ...u, rol: 'superadmin' as RolSistema };
      if (u.rol === 'superadmin') return { ...u, rol: 'usuario' as RolSistema };
      return u;
    }

    if (u.rol === 'superadmin' && !esCuentaSuperAdminOficial(u)) {
      return { ...u, rol: 'usuario' as RolSistema };
    }
    return u;
  });

  const existe = listaCorregida.some(
    (u) =>
      Number(u.id_usuario) === Number(user.id_usuario) ||
      (u.email && user.email && u.email.toLowerCase() === user.email.toLowerCase())
  );

  if (!existe) {
    const nuevo: UsuarioRegistradoAdmin = {
      id_usuario: Number(user.id_usuario || Date.now()),
      nombre: user.nombre || 'Usuario',
      apellido: user.apellido || '',
      email: user.email || '',
      rol: esSuper ? 'superadmin' : 'usuario',
      estado_cuenta: 'activo',
      avisos: 0,
      suspendido_hasta: null,
      motivo_sancion: null,
      historial_sanciones: []
    };
    listaCorregida.push(nuevo);
  }

  localStorage.setItem('falu_usuarios_sistema', JSON.stringify(listaCorregida));
}

export function obtenerRolUsuario(user: any): RolSistema {
  if (!user) return 'usuario';

  if (esCuentaSuperAdminOficial(user)) {
    return 'superadmin';
  }

  const listaUsuarios: UsuarioRegistradoAdmin[] = JSON.parse(
    localStorage.getItem('falu_usuarios_sistema') || '[]'
  );

  const encontrado = listaUsuarios.find(
    (u) =>
      Number(u.id_usuario) === Number(user.id_usuario) ||
      u.email?.toLowerCase() === user.email?.toLowerCase()
  );

  if (encontrado && encontrado.rol === 'admin') {
    return 'admin';
  }

  return 'usuario';
}
export function obtenerEstadoDisciplinarioUsuario(
  idUsuario?: number,
  email?: string
): {
  bloqueadoParaentrar: boolean;
  mensajeBloqueo: string;
  avisos: number;
  ultimo_motivo: string;
} {
  const lista: UsuarioRegistradoAdmin[] = JSON.parse(
    localStorage.getItem('falu_usuarios_sistema') || '[]'
  );

  const encontrado = lista.find(
    (u) =>
      (idUsuario !== undefined && Number(u.id_usuario) === Number(idUsuario)) ||
      (email && u.email && u.email.toLowerCase() === email.toLowerCase())
  );

  if (!encontrado) {
    return {
      bloqueadoParaentrar: false,
      mensajeBloqueo: '',
      avisos: 0,
      ultimo_motivo: ''
    };
  }

  const avisos = encontrado.avisos || 0;
  const ultimoMotivo = encontrado.motivo_sancion || '';

  if (encontrado.estado_cuenta === 'baneado') {
    return {
      bloqueadoParaentrar: true,
      mensajeBloqueo: `Tu cuenta fue BANEADA DEFINITIVAMENTE de Falú.\nMotivo registrado: ${
        encontrado.motivo_sancion || 'Incumplimiento grave reiterado'
      }\nAvisos previos acumulados: ${avisos}/3.`,
      avisos,
      ultimo_motivo: ultimoMotivo
    };
  }

  if (
    encontrado.estado_cuenta === 'suspendido' &&
    encontrado.suspendido_hasta &&
    Date.now() < encontrado.suspendido_hasta
  ) {
    const fechaFin = new Date(encontrado.suspendido_hasta).toLocaleString('es-AR');
    return {
      bloqueadoParaentrar: true,
      mensajeBloqueo: `Tu cuenta se encuentra SUSPENDIDA TEMPORALMENTE hasta el ${fechaFin}.\nMotivo registrado: ${
        encontrado.motivo_sancion || 'Sanción administrativa'
      }\nAvisos acumulados en tu cuenta: ${avisos}/3.`,
      avisos,
      ultimo_motivo: ultimoMotivo
    };
  }

  return {
    bloqueadoParaentrar: false,
    mensajeBloqueo: '',
    avisos,
    ultimo_motivo: ultimoMotivo
  };
}

export function esUsuarioAdminOSuperAdmin(user: any): boolean {
  const rol = obtenerRolUsuario(user);
  return rol === 'admin' || rol === 'superadmin';
}

export function registrarLogAuditoria(params: {
  admin_nombre: string;
  rol_admin: string;
  tipo_entidad?: 'producto' | 'pregunta' | 'opinion' | 'chat' | 'usuario';
  accion: string;
  detalle: string;
  snapshot?: any;
}) {
  const logs: LogAuditoria[] = JSON.parse(
    localStorage.getItem('falu_auditoria_logs') || '[]'
  );
  const nuevoLog: LogAuditoria = {
    id_log: Date.now() + Math.floor(Math.random() * 1000),
    fecha: new Date().toLocaleString('es-AR'),
    admin_nombre: params.admin_nombre,
    rol_admin: params.rol_admin,
    tipo_entidad: params.tipo_entidad || 'producto',
    accion: params.accion,
    detalle: params.detalle,
    snapshot: params.snapshot || null
  };
  localStorage.setItem('falu_auditoria_logs', JSON.stringify([nuevoLog, ...logs]));
  window.dispatchEvent(new Event('falu_actualizacion'));
}

export default function AdminPanel() {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const rolReal = obtenerRolUsuario(user);
  const [vistaSimulada, setVistaSimulada] = useState<'superadmin' | 'admin'>(
    rolReal === 'superadmin' ? 'superadmin' : 'admin'
  );
  const esSuperAdminActivo = rolReal === 'superadmin' && vistaSimulada === 'superadmin';

  const [seccionActiva, setSeccionActiva] = useState<
    | 'rep_productos'
    | 'rep_preguntas'
    | 'opiniones'
    | 'chats'
    | 'publicaciones'
    | 'sanciones'
    | 'auditoria'
    | 'roles'
  >('rep_productos');

  const [filtroEstadoReporte, setFiltroEstadoReporte] = useState<
    'todos' | EstadoReporte
  >('todos');

  const [productos, setProductos] = useState<any[]>([]);
  const [productosReportados, setProductosReportados] = useState<any[]>([]);
  const [preguntasReportadas, setPreguntasReportadas] = useState<any[]>([]);
  const [busquedaProducto, setBusquedaProducto] = useState('');
  const [opinionesReportadas, setOpinionesReportadas] = useState<any[]>([]);
  const [chatsReportados, setChatsReportados] = useState<any[]>([]);
  const [chatDesplegadoId, setChatDesplegadoId] = useState<number | null>(null);
  const [logsAuditoria, setLogsAuditoria] = useState<LogAuditoria[]>([]);
  const [usuariosSistema, setUsuariosSistema] = useState<UsuarioRegistradoAdmin[]>([]);

  const [usuarioASancionar, setUsuarioASancionar] =
    useState<UsuarioRegistradoAdmin | null>(null);
  const [tipoMedidaDisciplinaria, setTipoMedidaDisciplinaria] = useState<
    'aviso' | 'suspension_dias' | 'baneo' | 'limpiar'
  >('aviso');
  const [diasSuspension, setDiasSuspension] = useState<string>('3');
  const [motivoSancionInput, setMotivoSancionInput] = useState('');

  const [nuevoUsuarioNombre, setNuevoUsuarioNombre] = useState('');
  const [nuevoUsuarioEmail, setNuevoUsuarioEmail] = useState('');
  const [nuevoUsuarioRol, setNuevoUsuarioRol] = useState<RolSistema>('admin');

  const nombreAdminActual = user
    ? `${user.nombre} ${user.apellido || ''}`.trim()
    : 'Administrador';

  const cargarTodoElPanel = () => {
    const prods = JSON.parse(localStorage.getItem('falu_productos_locales') || '[]');
    setProductos(prods);

    const prodsConRep = prods
      .filter(
        (p: any) =>
          Array.isArray(p.reportes_producto) && p.reportes_producto.length > 0
      )
      .map((p: any) => ({
        ...p,
        estado_revision: (p.estado_revision_reporte || 'no_revisado') as EstadoReporte,
        admin_encargado: p.admin_encargado_reporte || null,
        resolucion: p.resolucion_reporte || null
      }));
    setProductosReportados(prodsConRep);

    const todasPregs = JSON.parse(
      localStorage.getItem('falu_preguntas_productos') || '[]'
    );
    const pregsConRep = todasPregs
      .filter((pr: any) => Array.isArray(pr.reportes) && pr.reportes.length > 0)
      .map((pr: any) => ({
        ...pr,
        estado_revision: (pr.estado_revision || 'no_revisado') as EstadoReporte,
        admin_encargado: pr.admin_encargado || null,
        resolucion: pr.resolucion || null
      }));
    setPreguntasReportadas(pregsConRep);

    const todasOpiniones = JSON.parse(
      localStorage.getItem('falu_opiniones_productos') || '[]'
    );
    const conReportes = todasOpiniones
      .filter((op: any) => Array.isArray(op.reportes) && op.reportes.length > 0)
      .map((op: any) => ({
        ...op,
        estado_revision: (op.estado_revision || 'no_revisado') as EstadoReporte,
        admin_encargado: op.admin_encargado || null,
        resolucion: op.resolucion || null
      }));
    setOpinionesReportadas(conReportes);

    const todosChatsRep = JSON.parse(
      localStorage.getItem('falu_reportes_chats_admin') || '[]'
    ).map((cr: any) => ({
      ...cr,
      estado_revision: (cr.estado_revision || 'no_revisado') as EstadoReporte,
      admin_encargado: cr.admin_encargado || null,
      resolucion: cr.resolucion || null
    }));
    setChatsReportados(todosChatsRep);

    const logs = JSON.parse(localStorage.getItem('falu_auditoria_logs') || '[]');
    setLogsAuditoria(logs);

    const guardadosUsuarios: UsuarioRegistradoAdmin[] = JSON.parse(
      localStorage.getItem('falu_usuarios_sistema') || '[]'
    );
    const mapaUsuarios = new Map<string, UsuarioRegistradoAdmin>();

    guardadosUsuarios.forEach((u) => {
      mapaUsuarios.set(String(u.id_usuario), {
        ...u,
        avisos: u.avisos || 0,
        historial_sanciones: u.historial_sanciones || []
      });
    });

    prods.forEach((p: any) => {
      if (p.id_vendedor && !mapaUsuarios.has(String(p.id_vendedor))) {
        mapaUsuarios.set(String(p.id_vendedor), {
          id_usuario: Number(p.id_vendedor),
          nombre: p.vendedor_nombre || `Usuario #${p.id_vendedor}`,
          apellido: '',
          email: `usuario${p.id_vendedor}@falu.com`,
          rol: 'usuario',
          estado_cuenta: 'activo',
          avisos: 0,
          historial_sanciones: []
        });
      }
    });

    todasPregs.forEach((pr: any) => {
      if (pr.id_usuario && !mapaUsuarios.has(String(pr.id_usuario))) {
        mapaUsuarios.set(String(pr.id_usuario), {
          id_usuario: Number(pr.id_usuario),
          nombre: pr.usuario_nombre || `Usuario #${pr.id_usuario}`,
          apellido: '',
          email: `usuario${pr.id_usuario}@falu.com`,
          rol: 'usuario',
          estado_cuenta: 'activo',
          avisos: 0,
          historial_sanciones: []
        });
      }
    });

    todasOpiniones.forEach((op: any) => {
      if (op.id_comprador && !mapaUsuarios.has(String(op.id_comprador))) {
        mapaUsuarios.set(String(op.id_comprador), {
          id_usuario: Number(op.id_comprador),
          nombre: op.comprador_nombre || `Usuario #${op.id_comprador}`,
          apellido: '',
          email: `usuario${op.id_comprador}@falu.com`,
          rol: 'usuario',
          estado_cuenta: 'activo',
          avisos: 0,
          historial_sanciones: []
        });
      }
    });

    const listaFinalUsuarios = Array.from(mapaUsuarios.values());
    localStorage.setItem(
      'falu_usuarios_sistema',
      JSON.stringify(listaFinalUsuarios)
    );
    setUsuariosSistema(listaFinalUsuarios);
  };

  useEffect(() => {
    if (!isAuthenticated || !user) {
      navigate('/login');
      return;
    }
    if (!esUsuarioAdminOSuperAdmin(user)) {
      navigate('/');
      return;
    }
    cargarTodoElPanel();
  }, [isAuthenticated, user, navigate]);

  // =========================================================================
  // FUNCIÓN CENTRAL ANTI-CONFLICTO DE INTERESES (Impide auto-juzgarse)
  // =========================================================================
  const evaluarConflictoDeInteres = (
    idAutorDenunciado?: number,
    nombreAutorDenunciado?: string
  ): { bloqueado: boolean; motivoBloqueo: string } => {
    if (!user) return { bloqueado: false, motivoBloqueo: '' };

    const nombreActualLimpio = nombreAdminActual.toLowerCase();
    const soyElDenunciadoPorId =
      idAutorDenunciado !== undefined &&
      Number(idAutorDenunciado) === Number(user.id_usuario);
    const soyElDenunciadoPorNombre =
      Boolean(nombreAutorDenunciado) &&
      nombreAutorDenunciado!.trim().toLowerCase() === nombreActualLimpio;

    // Regla 1: Ningún Admin ni Super Admin puede tomar ni resolver un reporte contra sí mismo
    if (soyElDenunciadoPorId || soyElDenunciadoPorNombre) {
      return {
        bloqueado: true,
        motivoBloqueo:
          'Conflicto de interés bloqueado: Este reporte involucra tu propia cuenta. Debe ser revisado por otro Administrador.'
      };
    }

    // Regla 2: Un Admin normal no puede tomar ni resolver reportes contra un Super Admin
    const usuarioDenunciadoObj = usuariosSistema.find(
      (u) =>
        (idAutorDenunciado !== undefined &&
          Number(u.id_usuario) === Number(idAutorDenunciado)) ||
        (nombreAutorDenunciado &&
          `${u.nombre} ${u.apellido}`.trim().toLowerCase() ===
            nombreAutorDenunciado.trim().toLowerCase())
    );

    if (usuarioDenunciadoObj?.rol === 'superadmin' && !esSuperAdminActivo) {
      return {
        bloqueado: true,
        motivoBloqueo:
          'Jerarquía insuficiente: Este reporte involucra a un Super Admin y requiere revisión de nivel Super Admin.'
      };
    }

    return { bloqueado: false, motivoBloqueo: '' };
  };

  // =========================================================================
  // 1. GESTIÓN DE REPORTES DE PRODUCTOS
  // =========================================================================
  const tomarReporteProducto = (idProducto: number) => {
    const prods = JSON.parse(localStorage.getItem('falu_productos_locales') || '[]');
    const target = prods.find((p: any) => String(p.id_producto) === String(idProducto));
    if (
      target &&
      evaluarConflictoDeInteres(target.id_vendedor, target.vendedor_nombre).bloqueado
    ) {
      return;
    }

    let prodSnapshot: any = null;
    const actualizados = prods.map((p: any) => {
      if (String(p.id_producto) !== String(idProducto)) return p;
      prodSnapshot = {
        ...p,
        estado_revision_reporte: 'en_revision',
        admin_encargado_reporte: nombreAdminActual
      };
      return prodSnapshot;
    });

    localStorage.setItem('falu_productos_locales', JSON.stringify(actualizados));

    registrarLogAuditoria({
      admin_nombre: nombreAdminActual,
      rol_admin: esSuperAdminActivo ? 'Super Admin' : 'Administrador',
      tipo_entidad: 'producto',
      accion: 'Reporte de producto tomado en revisión',
      detalle: `Publicación "${prodSnapshot?.titulo}" (#${idProducto}) puesta "En revisión por ${nombreAdminActual}"`,
      snapshot: prodSnapshot
    });

    cargarTodoElPanel();
  };

  const solucionarReporteProducto = (
    idProducto: number,
    decision: 'bajar_producto' | 'desestimar'
  ) => {
    const prods = JSON.parse(localStorage.getItem('falu_productos_locales') || '[]');
    const target = prods.find((p: any) => String(p.id_producto) === String(idProducto));
    if (
      target &&
      evaluarConflictoDeInteres(target.id_vendedor, target.vendedor_nombre).bloqueado
    ) {
      return;
    }

    let prodSnapshot: any = null;
    const actualizados = prods.map((p: any) => {
      if (String(p.id_producto) !== String(idProducto)) return p;
      prodSnapshot = {
        ...p,
        estado: decision === 'bajar_producto' ? 'oculto' : p.estado,
        motivo_baja:
          decision === 'bajar_producto'
            ? 'Dado de baja tras auditoría de reportes de usuarios'
            : p.motivo_baja,
        estado_revision_reporte: 'solucionado',
        admin_encargado_reporte: p.admin_encargado_reporte || nombreAdminActual,
        resolucion_reporte:
          decision === 'bajar_producto'
            ? 'Publicación dada de baja / ocultada del catálogo'
            : 'Reportes desestimados (Publicación cumple las normas)'
      };
      return prodSnapshot;
    });

    localStorage.setItem('falu_productos_locales', JSON.stringify(actualizados));

    registrarLogAuditoria({
      admin_nombre: nombreAdminActual,
      rol_admin: esSuperAdminActivo ? 'Super Admin' : 'Administrador',
      tipo_entidad: 'producto',
      accion:
        decision === 'bajar_producto'
          ? 'Reporte de producto solucionado (Publicación ocultada)'
          : 'Reporte de producto desestimado (Sin sanción)',
      detalle: `Publicación "${prodSnapshot?.titulo}" (#${idProducto}): ${prodSnapshot?.resolucion_reporte}`,
      snapshot: prodSnapshot
    });

    cargarTodoElPanel();
  };

  // =========================================================================
  // 2. GESTIÓN DE REPORTES DE PREGUNTAS
  // =========================================================================
  const tomarReportePregunta = (idPregunta: number) => {
    const todas = JSON.parse(
      localStorage.getItem('falu_preguntas_productos') || '[]'
    );
    const target = todas.find((pr: any) => pr.id_pregunta === idPregunta);
    if (
      target &&
      evaluarConflictoDeInteres(target.id_usuario, target.usuario_nombre).bloqueado
    ) {
      return;
    }

    let pregSnap: any = null;
    const actualizadas = todas.map((pr: any) => {
      if (pr.id_pregunta !== idPregunta) return pr;
      pregSnap = {
        ...pr,
        estado_revision: 'en_revision',
        admin_encargado: nombreAdminActual
      };
      return pregSnap;
    });
    localStorage.setItem('falu_preguntas_productos', JSON.stringify(actualizadas));

    registrarLogAuditoria({
      admin_nombre: nombreAdminActual,
      rol_admin: esSuperAdminActivo ? 'Super Admin' : 'Administrador',
      tipo_entidad: 'pregunta',
      accion: 'Reporte de pregunta tomado en revisión',
      detalle: `Pregunta #${idPregunta} de ${pregSnap?.usuario_nombre} puesta en revisión`,
      snapshot: pregSnap
    });

    cargarTodoElPanel();
  };

  const solucionarReportePregunta = (
    idPregunta: number,
    decision: 'eliminar_pregunta' | 'desestimar'
  ) => {
    const todas = JSON.parse(
      localStorage.getItem('falu_preguntas_productos') || '[]'
    );
    const target = todas.find((pr: any) => pr.id_pregunta === idPregunta);
    if (
      target &&
      evaluarConflictoDeInteres(target.id_usuario, target.usuario_nombre).bloqueado
    ) {
      return;
    }

    let pregSnap: any = null;
    const actualizadas = todas.map((pr: any) => {
      if (pr.id_pregunta !== idPregunta) return pr;
      pregSnap = {
        ...pr,
        estado_revision: 'solucionado',
        admin_encargado: pr.admin_encargado || nombreAdminActual,
        texto_pregunta:
          decision === 'eliminar_pregunta'
            ? '[Pregunta eliminada por moderación por infringir las normas de Falú]'
            : pr.texto_pregunta,
        resolucion:
          decision === 'eliminar_pregunta'
            ? 'Pregunta eliminada por infracción'
            : 'Reporte desestimado (Pregunta válida)'
      };
      return pregSnap;
    });

    localStorage.setItem('falu_preguntas_productos', JSON.stringify(actualizadas));

    registrarLogAuditoria({
      admin_nombre: nombreAdminActual,
      rol_admin: esSuperAdminActivo ? 'Super Admin' : 'Administrador',
      tipo_entidad: 'pregunta',
      accion:
        decision === 'eliminar_pregunta'
          ? 'Reporte de pregunta solucionado (Pregunta eliminada)'
          : 'Reporte de pregunta desestimado',
      detalle: `Pregunta #${idPregunta} de ${pregSnap?.usuario_nombre}: ${pregSnap?.resolucion}`,
      snapshot: pregSnap
    });

    cargarTodoElPanel();
  };

  // =========================================================================
  // 3. GESTIÓN DE REPORTES DE OPINIONES
  // =========================================================================
  const tomarReporteOpinion = (idOpinion: number) => {
    const todas = JSON.parse(
      localStorage.getItem('falu_opiniones_productos') || '[]'
    );
    const target = todas.find((op: any) => op.id_opinion === idOpinion);
    if (
      target &&
      evaluarConflictoDeInteres(target.id_comprador, target.comprador_nombre).bloqueado
    ) {
      return;
    }

    let opSnap: any = null;
    const actualizadas = todas.map((op: any) => {
      if (op.id_opinion !== idOpinion) return op;
      opSnap = {
        ...op,
        estado_revision: 'en_revision',
        admin_encargado: nombreAdminActual
      };
      return opSnap;
    });
    localStorage.setItem('falu_opiniones_productos', JSON.stringify(actualizadas));

    registrarLogAuditoria({
      admin_nombre: nombreAdminActual,
      rol_admin: esSuperAdminActivo ? 'Super Admin' : 'Administrador',
      tipo_entidad: 'opinion',
      accion: 'Reporte de opinión tomado en revisión',
      detalle: `Opinión #${idOpinion} de ${opSnap?.comprador_nombre} puesta en revisión`,
      snapshot: opSnap
    });

    cargarTodoElPanel();
  };

  const solucionarReporteOpinion = (
    idOpinion: number,
    idProducto: number,
    decision: 'eliminar_opinion' | 'desestimar_reporte'
  ) => {
    const todas = JSON.parse(
      localStorage.getItem('falu_opiniones_productos') || '[]'
    );
    const target = todas.find((op: any) => op.id_opinion === idOpinion);
    if (
      target &&
      evaluarConflictoDeInteres(target.id_comprador, target.comprador_nombre).bloqueado
    ) {
      return;
    }

    let opSnap: any = null;
    const actualizadas = todas.map((op: any) => {
      if (op.id_opinion !== idOpinion) return op;
      opSnap = {
        ...op,
        estado_revision: 'solucionado',
        admin_encargado: op.admin_encargado || nombreAdminActual,
        comentario:
          decision === 'eliminar_opinion'
            ? '[Opinión retirada por la administración por incumplir las normas de Falú]'
            : op.comentario,
        archivos_media: decision === 'eliminar_opinion' ? [] : op.archivos_media,
        resolucion:
          decision === 'eliminar_opinion'
            ? 'Opinión eliminada por infracción'
            : 'Reporte desestimado (Reseña válida)'
      };
      return opSnap;
    });

    localStorage.setItem('falu_opiniones_productos', JSON.stringify(actualizadas));

    registrarLogAuditoria({
      admin_nombre: nombreAdminActual,
      rol_admin: esSuperAdminActivo ? 'Super Admin' : 'Administrador',
      tipo_entidad: 'opinion',
      accion:
        decision === 'eliminar_opinion'
          ? 'Reporte de opinión solucionado (Opinión eliminada)'
          : 'Reporte de opinión desestimado',
      detalle: `Opinión #${idOpinion} (Producto #${idProducto}): ${opSnap?.resolucion}`,
      snapshot: opSnap
    });

    cargarTodoElPanel();
  };

  // =========================================================================
  // 4. GESTIÓN DE REPORTES DE CHATS
  // =========================================================================
  const tomarReporteChat = (idReporteChat: number) => {
    const todos = JSON.parse(
      localStorage.getItem('falu_reportes_chats_admin') || '[]'
    );
    const target = todos.find((c: any) => c.id_reporte_chat === idReporteChat);
    if (
      target &&
      evaluarConflictoDeInteres(
        target.id_usuario_acusado,
        target.nombre_usuario_acusado
      ).bloqueado
    ) {
      return;
    }

    let chatSnap: any = null;
    const actualizados = todos.map((c: any) => {
      if (c.id_reporte_chat !== idReporteChat) return c;
      chatSnap = {
        ...c,
        estado_revision: 'en_revision',
        admin_encargado: nombreAdminActual
      };
      return chatSnap;
    });
    localStorage.setItem('falu_reportes_chats_admin', JSON.stringify(actualizados));

    registrarLogAuditoria({
      admin_nombre: nombreAdminActual,
      rol_admin: esSuperAdminActivo ? 'Super Admin' : 'Administrador',
      tipo_entidad: 'chat',
      accion: 'Reporte de chat tomado en revisión',
      detalle: `Expediente de chat #${idReporteChat} (${chatSnap?.titulo_producto}) tomado por ${nombreAdminActual}`,
      snapshot: chatSnap
    });

    cargarTodoElPanel();
  };

  const solucionarReporteChat = (
    idReporteChat: number,
    resolucionTexto: string
  ) => {
    const todos = JSON.parse(
      localStorage.getItem('falu_reportes_chats_admin') || '[]'
    );
    const target = todos.find((c: any) => c.id_reporte_chat === idReporteChat);
    if (
      target &&
      evaluarConflictoDeInteres(
        target.id_usuario_acusado,
        target.nombre_usuario_acusado
      ).bloqueado
    ) {
      return;
    }

    let chatSnap: any = null;
    const actualizados = todos.map((c: any) => {
      if (c.id_reporte_chat !== idReporteChat) return c;
      chatSnap = {
        ...c,
        estado_revision: 'solucionado',
        admin_encargado: c.admin_encargado || nombreAdminActual,
        resolucion: resolucionTexto
      };
      return chatSnap;
    });
    localStorage.setItem('falu_reportes_chats_admin', JSON.stringify(actualizados));

    registrarLogAuditoria({
      admin_nombre: nombreAdminActual,
      rol_admin: esSuperAdminActivo ? 'Super Admin' : 'Administrador',
      tipo_entidad: 'chat',
      accion: 'Reporte de chat solucionado',
      detalle: `Expediente de chat #${idReporteChat}: ${resolucionTexto}`,
      snapshot: chatSnap
    });

    cargarTodoElPanel();
  };

  // =========================================================================
  // 5. SISTEMA DE AVISOS (1/3 a 3/3), SUSPENSIÓN POR DÍAS Y BANEO DEFINITIVO
  // =========================================================================
  const handleAplicarMedidaDisciplinaria = (e: FormEvent) => {
    e.preventDefault();
    if (!usuarioASancionar || !motivoSancionInput.trim()) return;

    const fechaActual = new Date().toLocaleString('es-AR');
    let usuarioModificado: UsuarioRegistradoAdmin | null = null;
    let textoAccionAuditoria = '';

    const actualizados = usuariosSistema.map((u) => {
      if (Number(u.id_usuario) !== Number(usuarioASancionar.id_usuario)) return u;

      const avisosActuales = u.avisos || 0;
      const historialPrevio = u.historial_sanciones || [];

      if (tipoMedidaDisciplinaria === 'aviso') {
        const nuevosAvisos = Math.min(3, avisosActuales + 1);
        const nuevoRegistro: RegistroSancionCuenta = {
          fecha: fechaActual,
          tipo: 'aviso',
          motivo: `Aviso ${nuevosAvisos}/3: ${motivoSancionInput.trim()}`,
          admin_nombre: nombreAdminActual
        };
        textoAccionAuditoria = `Aplicación de Aviso ${nuevosAvisos}/3 a usuario`;
        usuarioModificado = {
          ...u,
          avisos: nuevosAvisos,
          motivo_sancion: motivoSancionInput.trim(),
          historial_sanciones: [nuevoRegistro, ...historialPrevio]
        };
        return usuarioModificado;
      }

      if (tipoMedidaDisciplinaria === 'suspension_dias') {
        const cantDias = Math.max(1, Number(diasSuspension) || 3);
        const hastaMs = Date.now() + cantDias * 24 * 60 * 60 * 1000;
        const nuevoRegistro: RegistroSancionCuenta = {
          fecha: fechaActual,
          tipo: 'suspension_temporal',
          motivo: `Suspendido por ${cantDias} días: ${motivoSancionInput.trim()}`,
          admin_nombre: nombreAdminActual,
          dias: cantDias
        };
        textoAccionAuditoria = `Suspensión temporal (${cantDias} días) sin poder loguearse`;
        usuarioModificado = {
          ...u,
          estado_cuenta: 'suspendido',
          suspendido_hasta: hastaMs,
          motivo_sancion: motivoSancionInput.trim(),
          historial_sanciones: [nuevoRegistro, ...historialPrevio]
        };
        return usuarioModificado;
      }

      if (tipoMedidaDisciplinaria === 'baneo') {
        const nuevoRegistro: RegistroSancionCuenta = {
          fecha: fechaActual,
          tipo: 'baneo_definitivo',
          motivo: `Baneo definitivo: ${motivoSancionInput.trim()}`,
          admin_nombre: nombreAdminActual
        };
        textoAccionAuditoria = 'Baneo definitivo de cuenta';
        usuarioModificado = {
          ...u,
          estado_cuenta: 'baneado',
          suspendido_hasta: null,
          motivo_sancion: motivoSancionInput.trim(),
          historial_sanciones: [nuevoRegistro, ...historialPrevio]
        };
        return usuarioModificado;
      }

      const nuevoRegistro: RegistroSancionCuenta = {
        fecha: fechaActual,
        tipo: 'rehabilitacion',
        motivo: `Cuenta rehabilitada: ${motivoSancionInput.trim()}`,
        admin_nombre: nombreAdminActual
      };
      textoAccionAuditoria = 'Rehabilitación de cuenta / Levantamiento de sanción';
      usuarioModificado = {
        ...u,
        estado_cuenta: 'activo',
        suspendido_hasta: null,
        motivo_sancion: motivoSancionInput.trim(),
        historial_sanciones: [nuevoRegistro, ...historialPrevio]
      };
      return usuarioModificado;
    });

    localStorage.setItem('falu_usuarios_sistema', JSON.stringify(actualizados));
    setUsuariosSistema(actualizados);

    if (usuarioModificado) {
      const todasNotif = JSON.parse(
        localStorage.getItem('falu_notificaciones') || '[]'
      );
      todasNotif.unshift({
        id_notificacion: Date.now(),
        tipo: 'stock_repuesto',
        id_usuario_destino: (usuarioModificado as UsuarioRegistradoAdmin).id_usuario,
        id_producto: 0,
        producto_titulo: `Constancia Administrativa (${textoAccionAuditoria})`,
        fecha_compra: fechaActual,
        mensaje_extra: `Motivo: "${motivoSancionInput.trim()}". Avisos acumulados en tu cuenta: ${
          (usuarioModificado as UsuarioRegistradoAdmin).avisos || 0
        }/3. Aplicado por ${nombreAdminActual}.`,
        leida: false
      });
      localStorage.setItem('falu_notificaciones', JSON.stringify(todasNotif));

      registrarLogAuditoria({
        admin_nombre: nombreAdminActual,
        rol_admin: esSuperAdminActivo ? 'Super Admin' : 'Administrador',
        tipo_entidad: 'usuario',
        accion: textoAccionAuditoria,
        detalle: `Usuario: ${(usuarioModificado as UsuarioRegistradoAdmin).nombre} (${
          (usuarioModificado as UsuarioRegistradoAdmin).email
        }) — Motivo: "${motivoSancionInput.trim()}" — Avisos acumulados: ${
          (usuarioModificado as UsuarioRegistradoAdmin).avisos || 0
        }/3`,
        snapshot: usuarioModificado
      });
    }

    setUsuarioASancionar(null);
    setMotivoSancionInput('');
    window.dispatchEvent(new Event('falu_actualizacion'));
  };

  // =========================================================================
  // 6. MODERACIÓN DIRECTA DE PUBLICACIONES Y ROLES (SUPER ADMIN)
  // =========================================================================
  const cambiarEstadoPublicacion = (
    idProducto: number,
    nuevoEstado: 'activo' | 'oculto',
    motivo?: string
  ) => {
    const prods = JSON.parse(localStorage.getItem('falu_productos_locales') || '[]');
    let prodModificado: any = null;

    const actualizados = prods.map((p: any) => {
      if (String(p.id_producto) !== String(idProducto)) return p;
      prodModificado = {
        ...p,
        estado: nuevoEstado,
        motivo_baja:
          nuevoEstado === 'oculto'
            ? motivo || 'Incumplimiento de normas de Falú'
            : null
      };
      return prodModificado;
    });

    localStorage.setItem('falu_productos_locales', JSON.stringify(actualizados));

    registrarLogAuditoria({
      admin_nombre: nombreAdminActual,
      rol_admin: esSuperAdminActivo ? 'Super Admin' : 'Administrador',
      tipo_entidad: 'producto',
      accion:
        nuevoEstado === 'oculto'
          ? 'Baja / Ocultamiento de publicación'
          : 'Restauración de publicación',
      detalle: `Publicación "${prodModificado?.titulo}" (#${idProducto}) cambió a estado: ${nuevoEstado.toUpperCase()}`,
      snapshot: prodModificado
    });

    cargarTodoElPanel();
  };

  const eliminarPublicacionDefinitivamente = (idProducto: number, titulo: string) => {
    const prods = JSON.parse(localStorage.getItem('falu_productos_locales') || '[]');
    const prodBorrado = prods.find(
      (p: any) => String(p.id_producto) === String(idProducto)
    );
    const actualizados = prods.filter(
      (p: any) => String(p.id_producto) !== String(idProducto)
    );
    localStorage.setItem('falu_productos_locales', JSON.stringify(actualizados));

    registrarLogAuditoria({
      admin_nombre: nombreAdminActual,
      rol_admin: esSuperAdminActivo ? 'Super Admin' : 'Administrador',
      tipo_entidad: 'producto',
      accion: 'Eliminación definitiva de publicación',
      detalle: `Se eliminó la publicación "${titulo}" (#${idProducto})`,
      snapshot: prodBorrado
    });

    cargarTodoElPanel();
  };

  const cambiarRolDeUsuario = (idUsuarioTarget: number, nuevoRol: RolSistema) => {
    if (!esSuperAdminActivo) return;

    let usuarioSnap: any = null;
    const actualizados = usuariosSistema.map((u) => {
      if (Number(u.id_usuario) !== Number(idUsuarioTarget)) return u;
      usuarioSnap = { ...u, rol: nuevoRol };
      return usuarioSnap;
    });
    localStorage.setItem('falu_usuarios_sistema', JSON.stringify(actualizados));
    setUsuariosSistema(actualizados);

    registrarLogAuditoria({
      admin_nombre: nombreAdminActual,
      rol_admin: 'Super Admin',
      tipo_entidad: 'usuario',
      accion: 'Cambio de rol administrativo',
      detalle: `Se asignó el rol "${nuevoRol.toUpperCase()}" al usuario ${
        usuarioSnap?.nombre || idUsuarioTarget
      }`,
      snapshot: usuarioSnap
    });
  };

  const handleAgregarUsuarioConRol = (e: FormEvent) => {
    e.preventDefault();
    if (!esSuperAdminActivo || !nuevoUsuarioNombre.trim() || !nuevoUsuarioEmail.trim()) {
      return;
    }

    const existente = usuariosSistema.find(
      (u) => u.email.toLowerCase() === nuevoUsuarioEmail.trim().toLowerCase()
    );

    let actualizados: UsuarioRegistradoAdmin[];
    let snap: UsuarioRegistradoAdmin;
    if (existente) {
      snap = {
        ...existente,
        nombre: nuevoUsuarioNombre.trim(),
        rol: nuevoUsuarioRol
      };
      actualizados = usuariosSistema.map((u) =>
        u.email.toLowerCase() === nuevoUsuarioEmail.trim().toLowerCase() ? snap : u
      );
    } else {
      snap = {
        id_usuario: Date.now(),
        nombre: nuevoUsuarioNombre.trim(),
        apellido: '',
        email: nuevoUsuarioEmail.trim(),
        rol: nuevoUsuarioRol,
        estado_cuenta: 'activo',
        avisos: 0,
        historial_sanciones: []
      };
      actualizados = [...usuariosSistema, snap];
    }

    localStorage.setItem('falu_usuarios_sistema', JSON.stringify(actualizados));
    setUsuariosSistema(actualizados);

    registrarLogAuditoria({
      admin_nombre: nombreAdminActual,
      rol_admin: 'Super Admin',
      tipo_entidad: 'usuario',
      accion: 'Asignación de rol por correo',
      detalle: `Se otorgó rol "${nuevoUsuarioRol.toUpperCase()}" a ${nuevoUsuarioNombre.trim()} (${nuevoUsuarioEmail.trim()})`,
      snapshot: snap
    });

    setNuevoUsuarioNombre('');
    setNuevoUsuarioEmail('');
  };

  const renderizarBadgeEstado = (
    estado: EstadoReporte,
    adminEncargado?: string | null
  ) => {
    if (estado === 'no_revisado') {
      return (
        <span className="inline-flex items-center gap-1 bg-red-100 text-red-700 border border-red-200 text-[11px] font-bold px-2.5 py-1 rounded-full">
          <Clock className="w-3 h-3" />
          No revisado
        </span>
      );
    }
    if (estado === 'en_revision') {
      return (
        <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 border border-blue-200 text-[11px] font-bold px-2.5 py-1 rounded-full">
          <Shield className="w-3 h-3" />
          En revisión por {adminEncargado || 'Administrador'}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 border border-emerald-200 text-[11px] font-bold px-2.5 py-1 rounded-full">
        <CheckCircle2 className="w-3 h-3" />
        Solucionado {adminEncargado ? `(por ${adminEncargado})` : ''}
      </span>
    );
  };

  const prodsRepFiltrados = productosReportados.filter(
    (p) => filtroEstadoReporte === 'todos' || p.estado_revision === filtroEstadoReporte
  );

  const pregsRepFiltradas = preguntasReportadas.filter(
    (p) => filtroEstadoReporte === 'todos' || p.estado_revision === filtroEstadoReporte
  );

  const opinionesFiltradas = opinionesReportadas.filter(
    (op) =>
      filtroEstadoReporte === 'todos' || op.estado_revision === filtroEstadoReporte
  );

  const chatsFiltrados = chatsReportados.filter(
    (ch) =>
      filtroEstadoReporte === 'todos' || ch.estado_revision === filtroEstadoReporte
  );

  const productosFiltrados = productos.filter((p) =>
    (p.titulo || '').toLowerCase().includes(busquedaProducto.toLowerCase())
  );

  const pestanasAdmin = [
    {
      id: 'rep_productos',
      label: `Reportes de productos (${productosReportados.length})`,
      icon: ShoppingBag
    },
    {
      id: 'rep_preguntas',
      label: `Reportes de preguntas (${preguntasReportadas.length})`,
      icon: MessageCircleQuestion
    },
    {
      id: 'opiniones',
      label: `Reportes de opiniones (${opinionesReportadas.length})`,
      icon: Flag
    },
    {
      id: 'chats',
      label: `Reportes de chats (${chatsReportados.length})`,
      icon: MessageSquare
    },
    {
      id: 'sanciones',
      label: `Avisos (1/3) y Sanciones (${usuariosSistema.length})`,
      icon: AlertTriangle
    },
    {
      id: 'publicaciones',
      label: `Publicaciones (${productos.length})`,
      icon: EyeOff
    },
    {
      id: 'auditoria',
      label: `Auditoría (${logsAuditoria.length})`,
      icon: FileText
    },
    ...(esSuperAdminActivo
      ? [
          {
            id: 'roles',
            label: `Gestión de Administradores`,
            icon: UserCog
          }
        ]
      : [])
  ];

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <Navbar />

      <main className="max-w-6xl w-full mx-auto px-4 py-8 flex-1">
        
        {/* Encabezado */}
        <div className="mb-6 bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-xs ${
                esSuperAdminActivo ? 'bg-amber-500' : 'bg-blue-900'
              }`}
            >
              {esSuperAdminActivo ? (
                <ShieldCheck className="w-6 h-6" />
              ) : (
                <Shield className="w-6 h-6" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-extrabold text-slate-900">
                  Centro de Administración y Moderación
                </h1>
                <span
                  className={`text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                    esSuperAdminActivo
                      ? 'bg-amber-100 text-amber-800 border border-amber-300'
                      : 'bg-blue-100 text-blue-900 border border-blue-200'
                  }`}
                >
                  {esSuperAdminActivo ? 'Super Admin' : 'Administrador'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Operador activo: <strong>{nombreAdminActual}</strong>
              </p>
            </div>
          </div>

          {rolReal === 'superadmin' && (
            <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-xl border border-slate-200 text-xs shrink-0">
              <span className="text-slate-500 font-semibold pl-2">Vista:</span>
              <button
                type="button"
                onClick={() => setVistaSimulada('superadmin')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-colors ${
                  vistaSimulada === 'superadmin'
                    ? 'bg-blue-900 text-white'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Super Admin
              </button>
              <button
                type="button"
                onClick={() => {
                  setVistaSimulada('admin');
                  if (seccionActiva === 'roles') setSeccionActiva('rep_productos');
                }}
                className={`px-3 py-1.5 rounded-lg font-bold transition-colors ${
                  vistaSimulada === 'admin'
                    ? 'bg-blue-900 text-white'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Admin Normal
              </button>
            </div>
          )}
        </div>

        {/* Pestañas */}
        <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-4 no-scrollbar">
          {pestanasAdmin.map((tab) => {
            const Icono = tab.icon;
            const activa = seccionActiva === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSeccionActiva(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap border transition-all ${
                  activa
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

        {/* Filtro de los 3 estados */}
        {['rep_productos', 'rep_preguntas', 'opiniones', 'chats'].includes(
          seccionActiva
        ) && (
          <div className="flex flex-wrap items-center gap-2 mb-5 bg-white p-3 rounded-xl border border-slate-200 text-xs">
            <span className="font-bold text-slate-600 mr-1">
              Filtrar por estado del reporte:
            </span>
            {[
              { id: 'todos', label: 'Todos' },
              { id: 'no_revisado', label: 'No revisados' },
              { id: 'en_revision', label: 'En revisión' },
              { id: 'solucionado', label: 'Solucionados' }
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFiltroEstadoReporte(f.id as any)}
                className={`px-3 py-1.5 rounded-lg font-bold transition-colors ${
                  filtroEstadoReporte === f.id
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        )}

        {/* =====================================================================
            PESTAÑA 1: REPORTES DE PRODUCTOS (Con Bloqueo de Conflicto de Intereses)
           ===================================================================== */}
        {seccionActiva === 'rep_productos' && (
          <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4 shadow-2xs">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Reportes de Publicaciones de Productos
              </h2>
              <p className="text-xs text-slate-500">
                Incluye link directo al producto, cantidad total de reportes acumulados, razones y la descripción escrita por cada usuario
              </p>
            </div>

            {prodsRepFiltrados.length === 0 ? (
              <p className="text-xs text-slate-500 py-8 text-center">
                No hay productos reportados en este estado.
              </p>
            ) : (
              <div className="space-y-4">
                {prodsRepFiltrados.map((prod) => {
                  const listaRep = prod.reportes_producto || [];
                  const razonesUnicas = Array.from(
                    new Set(listaRep.map((r: any) => r.motivo))
                  );
                  const conflicto = evaluarConflictoDeInteres(
                    prod.id_vendedor,
                    prod.vendedor_nombre
                  );

                  return (
                    <div
                      key={prod.id_producto}
                      className="p-5 rounded-xl border border-slate-200 bg-slate-50/60 space-y-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          {prod.imagen_url && (
                            <img
                              src={prod.imagen_url}
                              alt={prod.titulo}
                              className="w-14 h-14 rounded-xl object-cover border border-slate-200"
                            />
                          )}
                          <div>
                            <Link
                              to={`/producto/${prod.id_producto}`}
                              className="text-sm font-extrabold text-blue-600 hover:underline flex items-center gap-1"
                            >
                              <span>{prod.titulo}</span>
                              <ExternalLink className="w-3.5 h-3.5" />
                            </Link>
                            <p className="text-xs text-slate-500">
                              Vendedor: <strong>{prod.vendedor_nombre || 'Vendedor'}</strong> — Estado actual:{' '}
                              <strong className="uppercase">{prod.estado || 'activo'}</strong>
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="bg-red-600 text-white text-xs font-extrabold px-3 py-1 rounded-full">
                            {listaRep.length}{' '}
                            {listaRep.length === 1 ? 'reporte recibido' : 'reportes recibidos'}
                          </span>
                          {renderizarBadgeEstado(
                            prod.estado_revision,
                            prod.admin_encargado
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="font-bold text-slate-700">Razones:</span>
                        {razonesUnicas.map((raz: any, idx: number) => (
                          <span
                            key={idx}
                            className="bg-red-50 border border-red-200 text-red-700 font-bold px-2.5 py-0.5 rounded-full"
                          >
                            {raz}
                          </span>
                        ))}
                      </div>

                      <div className="space-y-2">
                        <span className="text-xs font-bold text-slate-700 block">
                          Detalle de reportes enviados por los usuarios:
                        </span>
                        {listaRep.map((r: any) => (
                          <div
                            key={r.id_reporte}
                            className="bg-white p-3 rounded-xl border border-slate-200 text-xs space-y-1"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-extrabold text-slate-900">
                                Reportado por: {r.usuario_nombre}
                              </span>
                              <span className="text-slate-400">{r.fecha}</span>
                            </div>
                            <p className="text-red-700 font-semibold">
                              Razón elegida: {r.motivo}
                            </p>
                            <p className="text-slate-700">
                              Descripción: "{r.descripcion}"
                            </p>
                          </div>
                        ))}
                      </div>

                      {prod.resolucion && (
                        <p className="text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-2 rounded-lg">
                          Resolución final: {prod.resolucion}
                        </p>
                      )}

                      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200">
                        <Link
                          to={`/producto/${prod.id_producto}`}
                          className="text-xs font-bold text-blue-600 hover:underline inline-flex items-center gap-1"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          Ir directo al producto
                        </Link>

                        {conflicto.bloqueado ? (
                          <span className="inline-flex items-center gap-1.5 bg-amber-100 border border-amber-300 text-amber-900 text-xs font-bold px-3.5 py-2 rounded-xl">
                            <Lock className="w-3.5 h-3.5 shrink-0" />
                            <span>{conflicto.motivoBloqueo}</span>
                          </span>
                        ) : (
                          <div className="flex flex-wrap items-center gap-2">
                            {prod.estado_revision === 'no_revisado' && (
                              <button
                                type="button"
                                onClick={() => tomarReporteProducto(prod.id_producto)}
                                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 rounded-xl"
                              >
                                Tomar reporte (En revisión por {user?.nombre})
                              </button>
                            )}

                            {prod.estado_revision !== 'solucionado' && (
                              <>
                                <button
                                  type="button"
                                  onClick={() =>
                                    solucionarReporteProducto(
                                      prod.id_producto,
                                      'bajar_producto'
                                    )
                                  }
                                  className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-4 py-2 rounded-xl"
                                >
                                  Solucionar: Bajar / Ocultar producto
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    solucionarReporteProducto(
                                      prod.id_producto,
                                      'desestimar'
                                    )
                                  }
                                  className="bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold px-4 py-2 rounded-xl"
                                >
                                  Solucionar: Desestimar reporte
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* =====================================================================
            PESTAÑA 2: REPORTES DE PREGUNTAS (Con Bloqueo de Conflicto de Intereses)
           ===================================================================== */}
        {seccionActiva === 'rep_preguntas' && (
          <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4 shadow-2xs">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Reportes de Preguntas en Publicaciones
              </h2>
              <p className="text-xs text-slate-500">
                Consultas reportadas por usuarios o vendedores
              </p>
            </div>

            {pregsRepFiltradas.length === 0 ? (
              <p className="text-xs text-slate-500 py-8 text-center">
                No hay preguntas reportadas en este estado.
              </p>
            ) : (
              <div className="space-y-4">
                {pregsRepFiltradas.map((pr) => {
                  const conflicto = evaluarConflictoDeInteres(
                    pr.id_usuario,
                    pr.usuario_nombre
                  );

                  return (
                    <div
                      key={pr.id_pregunta}
                      className="p-5 rounded-xl border border-slate-200 bg-slate-50/60 space-y-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <span className="text-xs font-extrabold text-slate-900">
                            Autor de la pregunta: {pr.usuario_nombre}
                          </span>
                          <span className="text-xs text-slate-400 ml-2">({pr.fecha})</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="bg-red-600 text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full">
                            {pr.reportes.length}{' '}
                            {pr.reportes.length === 1 ? 'reporte' : 'reportes'}
                          </span>
                          {renderizarBadgeEstado(pr.estado_revision, pr.admin_encargado)}
                        </div>
                      </div>

                      <p className="text-sm text-slate-800 bg-white p-3.5 rounded-xl border border-slate-200">
                        "{pr.texto_pregunta}"
                      </p>

                      <div className="space-y-1.5">
                        {pr.reportes.map((r: any, idx: number) => (
                          <div
                            key={idx}
                            className="text-xs bg-white p-2.5 rounded-lg border border-slate-200"
                          >
                            <strong>{r.usuario_nombre}</strong> reportó por{' '}
                            <strong className="text-red-700">{r.motivo}</strong>: "
                            {r.descripcion}"
                          </div>
                        ))}
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200">
                        <Link
                          to={`/producto/${pr.id_producto}`}
                          className="text-xs font-bold text-blue-600 hover:underline inline-flex items-center gap-1"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          Ver publicación
                        </Link>

                        {conflicto.bloqueado ? (
                          <span className="inline-flex items-center gap-1.5 bg-amber-100 border border-amber-300 text-amber-900 text-xs font-bold px-3.5 py-2 rounded-xl">
                            <Lock className="w-3.5 h-3.5 shrink-0" />
                            <span>{conflicto.motivoBloqueo}</span>
                          </span>
                        ) : (
                          <div className="flex flex-wrap items-center gap-2">
                            {pr.estado_revision === 'no_revisado' && (
                              <button
                                type="button"
                                onClick={() => tomarReportePregunta(pr.id_pregunta)}
                                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 rounded-xl"
                              >
                                Tomar reporte (En revisión por {user?.nombre})
                              </button>
                            )}
                            {pr.estado_revision !== 'solucionado' && (
                              <>
                                <button
                                  type="button"
                                  onClick={() =>
                                    solucionarReportePregunta(
                                      pr.id_pregunta,
                                      'eliminar_pregunta'
                                    )
                                  }
                                  className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-4 py-2 rounded-xl"
                                >
                                  Solucionar: Eliminar pregunta
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    solucionarReportePregunta(
                                      pr.id_pregunta,
                                      'desestimar'
                                    )
                                  }
                                  className="bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold px-4 py-2 rounded-xl"
                                >
                                  Solucionar: Desestimar
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* =====================================================================
            PESTAÑA 3: REPORTES DE OPINIONES (Con Bloqueo de Conflicto de Intereses)
           ===================================================================== */}
        {seccionActiva === 'opiniones' && (
          <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4 shadow-2xs">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Bandeja de Reportes de Opiniones
              </h2>
              <p className="text-xs text-slate-500">
                Reseñas denunciadas con su motivo, usuario y descripción
              </p>
            </div>

            {opinionesFiltradas.length === 0 ? (
              <p className="text-xs text-slate-500 py-8 text-center">
                No hay reportes de opiniones en este estado.
              </p>
            ) : (
              <div className="space-y-4">
                {opinionesFiltradas.map((op) => {
                  const conflicto = evaluarConflictoDeInteres(
                    op.id_comprador,
                    op.comprador_nombre
                  );

                  return (
                    <div
                      key={op.id_opinion}
                      className="p-5 rounded-xl border border-slate-200 bg-slate-50/60 space-y-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-extrabold text-slate-900">
                            Autor de la opinión: {op.comprador_nombre}
                          </span>
                          <span className="text-xs text-slate-400">({op.fecha})</span>
                          <div className="flex items-center">
                            {[1, 2, 3, 4, 5].map((s) => (
                              <Star
                                key={s}
                                className={`w-3.5 h-3.5 ${
                                  s <= op.calificacion
                                    ? 'fill-amber-400 text-amber-400'
                                    : 'text-slate-300'
                                }`}
                              />
                            ))}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="bg-red-600 text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full">
                            {op.reportes.length}{' '}
                            {op.reportes.length === 1 ? 'reporte' : 'reportes'}
                          </span>
                          {renderizarBadgeEstado(op.estado_revision, op.admin_encargado)}
                        </div>
                      </div>

                      <p className="text-sm text-slate-800 bg-white p-3.5 rounded-xl border border-slate-200">
                        "{op.comentario}"
                      </p>

                      <div className="space-y-1.5">
                        {op.reportes.map((r: any, i: number) => (
                          <div
                            key={i}
                            className="text-xs bg-white p-2.5 rounded-lg border border-slate-200"
                          >
                            <strong>
                              {r.usuario_nombre || `Usuario #${r.id_usuario}`}
                            </strong>{' '}
                            reportó por{' '}
                            <strong className="text-red-700">{r.motivo}</strong>
                            {r.descripcion ? `: "${r.descripcion}"` : ''}
                          </div>
                        ))}
                      </div>

                      {op.resolucion && (
                        <p className="text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-2 rounded-lg">
                          Resolución final: {op.resolucion}
                        </p>
                      )}

                      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-200/80">
                        <Link
                          to={`/producto/${op.id_producto}`}
                          className="text-xs font-bold text-blue-600 hover:underline inline-flex items-center gap-1"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          Ver publicación del producto
                        </Link>

                        {conflicto.bloqueado ? (
                          <span className="inline-flex items-center gap-1.5 bg-amber-100 border border-amber-300 text-amber-900 text-xs font-bold px-3.5 py-2 rounded-xl">
                            <Lock className="w-3.5 h-3.5 shrink-0" />
                            <span>{conflicto.motivoBloqueo}</span>
                          </span>
                        ) : (
                          <div className="flex flex-wrap items-center gap-2">
                            {op.estado_revision === 'no_revisado' && (
                              <button
                                type="button"
                                onClick={() => tomarReporteOpinion(op.id_opinion)}
                                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 rounded-xl"
                              >
                                Tomar reporte (En revisión por {user?.nombre})
                              </button>
                            )}

                            {op.estado_revision !== 'solucionado' && (
                              <>
                                <button
                                  type="button"
                                  onClick={() =>
                                    solucionarReporteOpinion(
                                      op.id_opinion,
                                      op.id_producto,
                                      'eliminar_opinion'
                                    )
                                  }
                                  className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-4 py-2 rounded-xl"
                                >
                                  Solucionar: Eliminar opinión
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    solucionarReporteOpinion(
                                      op.id_opinion,
                                      op.id_producto,
                                      'desestimar_reporte'
                                    )
                                  }
                                  className="bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold px-4 py-2 rounded-xl"
                                >
                                  Solucionar: Desestimar
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* =====================================================================
            PESTAÑA 4: REPORTES DE CHATS (Con Bloqueo de Conflicto de Intereses)
           ===================================================================== */}
        {seccionActiva === 'chats' && (
          <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4 shadow-2xs">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Reportes de Conversaciones (Copia de últimos 20 mensajes)
              </h2>
              <p className="text-xs text-slate-500">
                Auditoría de chats post-venta reportados entre compradores y proveedores
              </p>
            </div>

            {chatsFiltrados.length === 0 ? (
              <p className="text-xs text-slate-500 py-8 text-center">
                No hay reportes de chats registrados en este estado.
              </p>
            ) : (
              <div className="space-y-4">
                {chatsFiltrados.map((rep) => {
                  const abierto = chatDesplegadoId === rep.id_reporte_chat;
                  const conflicto = evaluarConflictoDeInteres(
                    rep.id_usuario_acusado,
                    rep.nombre_usuario_acusado
                  );

                  return (
                    <div
                      key={rep.id_reporte_chat}
                      className="p-5 rounded-xl border border-slate-200 bg-slate-50/60 space-y-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <span className="text-xs font-extrabold text-slate-900 block">
                            Producto: {rep.titulo_producto}
                          </span>
                          <span className="text-xs text-slate-500">
                            Reportado por: <strong>{rep.reportado_por_nombre}</strong>
                            {rep.nombre_usuario_acusado
                              ? ` contra ${rep.nombre_usuario_acusado}`
                              : ''}{' '}
                            | Fecha: {rep.fecha_reporte}
                          </span>
                        </div>

                        {renderizarBadgeEstado(
                          rep.estado_revision,
                          rep.admin_encargado
                        )}
                      </div>

                      <div className="text-xs font-bold text-red-700 bg-red-50 border border-red-200 px-3 py-2 rounded-lg w-fit">
                        Motivo denunciado: {rep.motivo}
                      </div>

                      <div>
                        <button
                          type="button"
                          onClick={() =>
                            setChatDesplegadoId(abierto ? null : rep.id_reporte_chat)
                          }
                          className="text-xs font-bold text-blue-600 hover:underline"
                        >
                          {abierto
                            ? 'Ocultar transcripción de mensajes'
                            : `Ver copia de los últimos ${
                                rep.ultimos_20_mensajes?.length || 0
                              } mensajes enviados`}
                        </button>

                        {abierto && (
                          <div className="mt-3 bg-white border border-slate-200 rounded-xl p-4 max-h-60 overflow-y-auto space-y-2 text-xs">
                            {!rep.ultimos_20_mensajes ||
                            rep.ultimos_20_mensajes.length === 0 ? (
                              <p className="text-slate-400">
                                El chat fue reportado sin mensajes previos.
                              </p>
                            ) : (
                              rep.ultimos_20_mensajes.map((m: any) => (
                                <div
                                  key={m.id_mensaje}
                                  className="p-2.5 rounded-lg bg-slate-50 border border-slate-100"
                                >
                                  <div className="flex justify-between text-[11px] text-slate-400 mb-0.5">
                                    <strong className="text-blue-900">
                                      {m.remitente_nombre}
                                    </strong>
                                    <span>{m.fecha_hora}</span>
                                  </div>
                                  <p className="text-slate-700">{m.texto}</p>
                                </div>
                              ))
                            )}
                          </div>
                        )}
                      </div>

                      {rep.resolucion && (
                        <p className="text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-2 rounded-lg">
                          Resolución final: {rep.resolucion}
                        </p>
                      )}

                      <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-slate-200/80">
                        {conflicto.bloqueado ? (
                          <span className="inline-flex items-center gap-1.5 bg-amber-100 border border-amber-300 text-amber-900 text-xs font-bold px-3.5 py-2 rounded-xl">
                            <Lock className="w-3.5 h-3.5 shrink-0" />
                            <span>{conflicto.motivoBloqueo}</span>
                          </span>
                        ) : (
                          <>
                            {rep.estado_revision === 'no_revisado' && (
                              <button
                                type="button"
                                onClick={() => tomarReporteChat(rep.id_reporte_chat)}
                                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 rounded-xl"
                              >
                                Tomar reporte (En revisión por {user?.nombre})
                              </button>
                            )}

                            {rep.estado_revision !== 'solucionado' && (
                              <>
                                <button
                                  type="button"
                                  onClick={() =>
                                    solucionarReporteChat(
                                      rep.id_reporte_chat,
                                      'Se aplicó advertencia / sanción a la parte infractora'
                                    )
                                  }
                                  className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-4 py-2 rounded-xl"
                                >
                                  Solucionar: Sancionar infractor
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    solucionarReporteChat(
                                      rep.id_reporte_chat,
                                      'Reporte desestimado tras auditar los 20 mensajes'
                                    )
                                  }
                                  className="bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold px-4 py-2 rounded-xl"
                                >
                                  Solucionar: Desestimar
                                </button>
                              </>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* =====================================================================
            PESTAÑA 5: AVISOS (HASTA 3) Y SANCIONES DE CUENTAS
           ===================================================================== */}
        {seccionActiva === 'sanciones' && (
          <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-5 shadow-2xs">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Sistema de Avisos (1/3 a 3/3) y Sanciones de Cuentas
              </h2>
              <p className="text-xs text-slate-500">
                Podés aplicar hasta 3 avisos preventivos a una cuenta y, ante reincidencia o falta grave, suspenderla por X días sin poder loguearse o banearla definitivamente
              </p>
            </div>

            <div className="divide-y divide-slate-100">
              {usuariosSistema.map((u) => {
                const avisos = u.avisos || 0;
                const conflictoUsuario = evaluarConflictoDeInteres(
                  u.id_usuario,
                  `${u.nombre} ${u.apellido}`
                );
                const suspendidoActivo =
                  u.estado_cuenta === 'suspendido' &&
                  u.suspendido_hasta &&
                  Date.now() < u.suspendido_hasta;

                return (
                  <div
                    key={u.id_usuario}
                    className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-bold text-slate-900">
                          {u.nombre} {u.apellido}
                        </span>
                        <span className="text-xs text-slate-400">({u.email})</span>

                        <span
                          className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded-full border ${
                            avisos >= 3
                              ? 'bg-red-100 text-red-800 border-red-300'
                              : avisos > 0
                              ? 'bg-amber-100 text-amber-800 border-amber-300'
                              : 'bg-slate-100 text-slate-600 border-slate-200'
                          }`}
                        >
                          Avisos: {avisos} / 3
                        </span>

                        {u.estado_cuenta === 'baneado' && (
                          <span className="bg-red-600 text-white text-[10px] font-extrabold px-2.5 py-0.5 rounded-full">
                            BANEADO DEFINITIVAMENTE
                          </span>
                        )}

                        {suspendidoActivo && (
                          <span className="bg-orange-500 text-white text-[10px] font-extrabold px-2.5 py-0.5 rounded-full">
                            SUSPENDIDO HASTA{' '}
                            {new Date(u.suspendido_hasta!).toLocaleDateString('es-AR')}
                          </span>
                        )}
                      </div>

                      {u.motivo_sancion && (
                        <p className="text-xs text-red-700 font-medium">
                          Última constancia registrada: "{u.motivo_sancion}"
                        </p>
                      )}
                    </div>

                    {conflictoUsuario.bloqueado ? (
                      <span className="text-xs font-semibold text-slate-400 italic">
                        Acción restringida sobre esta cuenta
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setUsuarioASancionar(u);
                          setTipoMedidaDisciplinaria(
                            (u.avisos || 0) >= 3 ? 'suspension_dias' : 'aviso'
                          );
                        }}
                        className="bg-slate-900 hover:bg-blue-900 text-white text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-1.5 w-fit transition-colors"
                      >
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                        <span>Aplicar aviso / Sancionar cuenta</span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* =====================================================================
            PESTAÑA 6: MODERACIÓN DE PUBLICACIONES
           ===================================================================== */}
        {seccionActiva === 'publicaciones' && (
          <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-5 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Control y Moderación de Publicaciones
                </h2>
                <p className="text-xs text-slate-500">
                  Bajar, ocultar o restaurar cualquier publicación del marketplace
                </p>
              </div>

              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={busquedaProducto}
                  onChange={(e) => setBusquedaProducto(e.target.value)}
                  placeholder="Buscar publicación..."
                  className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl outline-none focus:border-blue-600"
                />
              </div>
            </div>

            {productosFiltrados.length === 0 ? (
              <p className="text-xs text-slate-500 py-8 text-center">
                No hay publicaciones que coincidan con la búsqueda.
              </p>
            ) : (
              <div className="space-y-3">
                {productosFiltrados.map((prod) => {
                  const estaOculto = prod.estado === 'oculto';
                  return (
                    <div
                      key={prod.id_producto}
                      className={`p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                        estaOculto
                          ? 'bg-red-50/40 border-red-200'
                          : 'bg-white border-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-3.5">
                        <div className="w-14 h-14 rounded-xl bg-slate-100 overflow-hidden border border-slate-200 shrink-0 flex items-center justify-center">
                          {prod.imagen_url ? (
                            <img
                              src={prod.imagen_url}
                              alt={prod.titulo}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <ShoppingBag className="w-6 h-6 text-slate-300" />
                          )}
                        </div>
                        <div>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              estaOculto
                                ? 'bg-red-100 text-red-700'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {estaOculto ? 'Oculto / Dado de baja' : 'Activo en catálogo'}
                          </span>
                          <Link
                            to={`/producto/${prod.id_producto}`}
                            className="text-sm font-bold text-slate-900 hover:text-blue-600 block mt-0.5"
                          >
                            {prod.titulo}
                          </Link>
                          <span className="text-xs font-extrabold text-slate-700">
                            ARS ${Number(prod.precio).toLocaleString('es-AR')}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 self-end sm:self-center">
                        <Link
                          to={`/producto/${prod.id_producto}`}
                          className="px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:border-blue-600 hover:text-blue-600 flex items-center gap-1"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          Ir a la publicación
                        </Link>

                        {estaOculto ? (
                          <button
                            type="button"
                            onClick={() =>
                              cambiarEstadoPublicacion(prod.id_producto, 'activo')
                            }
                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl flex items-center gap-1"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            Restaurar
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() =>
                              cambiarEstadoPublicacion(
                                prod.id_producto,
                                'oculto',
                                'Incumplimiento de normas detectado por Administración'
                              )
                            }
                            className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl flex items-center gap-1"
                          >
                            <EyeOff className="w-3.5 h-3.5" />
                            Bajar / Ocultar
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() =>
                            eliminarPublicacionDefinitivamente(
                              prod.id_producto,
                              prod.titulo
                            )
                          }
                          className="p-2 rounded-xl border border-slate-200 text-slate-400 hover:text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* =====================================================================
            PESTAÑA 7: AUDITORÍA INTERACTIVA
           ===================================================================== */}
        {seccionActiva === 'auditoria' && (
          <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4 shadow-2xs">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Registro de Auditoría (Hacé clic en un registro para abrir su expediente completo)
              </h2>
              <p className="text-xs text-slate-500">
                Cada entrada abre una página detallada con el producto, chat, pregunta, opinión o usuario sancionado/desestimado
              </p>
            </div>

            {logsAuditoria.length === 0 ? (
              <p className="text-xs text-slate-500 py-8 text-center">
                Aún no se registraron acciones administrativas en el historial.
              </p>
            ) : (
              <div className="space-y-2.5">
                {logsAuditoria.map((log) => (
                  <Link
                    key={log.id_log}
                    to={`/admin/auditoria/${log.id_log}`}
                    className="p-4 rounded-xl border border-slate-200 hover:border-blue-600 hover:bg-blue-50/30 flex items-center justify-between gap-4 transition-all group"
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-extrabold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-100 text-blue-900">
                          {log.tipo_entidad || 'sistema'}
                        </span>
                        <span className="text-sm font-extrabold text-slate-900 group-hover:text-blue-700">
                          {log.accion}
                        </span>
                        <span className="bg-slate-100 text-slate-700 font-bold px-2 py-0.5 rounded text-[10px]">
                          {log.rol_admin}: {log.admin_nombre}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600">{log.detalle}</p>
                      <span className="text-[11px] text-slate-400 block">
                        Fecha: {log.fecha}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 text-xs font-bold text-blue-600 shrink-0">
                      <span>Ver expediente</span>
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {/* =====================================================================
            PESTAÑA 8: GESTIÓN DE ADMINISTRADORES (EXCLUSIVO SUPER ADMIN)
           ===================================================================== */}
        {seccionActiva === 'roles' && esSuperAdminActivo && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs">
              <div className="flex items-center gap-2 mb-1">
                <UserPlus className="w-5 h-5 text-blue-900" />
                <h2 className="text-base font-bold text-slate-900">
                  Otorgar rol de Administrador a un usuario
                </h2>
              </div>
              <p className="text-xs text-slate-500 mb-4">
                Exclusivo Super Admin: Asigná o quitá permisos administrativos.
              </p>

              <form
                onSubmit={handleAgregarUsuarioConRol}
                className="grid grid-cols-1 sm:grid-cols-4 gap-3"
              >
                <input
                  type="text"
                  required
                  value={nuevoUsuarioNombre}
                  onChange={(e) => setNuevoUsuarioNombre(e.target.value)}
                  placeholder="Nombre y Apellido"
                  className="px-3.5 py-2.5 text-xs border border-slate-300 rounded-xl outline-none focus:border-blue-600"
                />
                <input
                  type="email"
                  required
                  value={nuevoUsuarioEmail}
                  onChange={(e) => setNuevoUsuarioEmail(e.target.value)}
                  placeholder="Correo electrónico"
                  className="px-3.5 py-2.5 text-xs border border-slate-300 rounded-xl outline-none focus:border-blue-600"
                />
                <select
                  value={nuevoUsuarioRol}
                  onChange={(e) => setNuevoUsuarioRol(e.target.value as RolSistema)}
                  className="px-3.5 py-2.5 text-xs border border-slate-300 rounded-xl bg-white outline-none focus:border-blue-600"
                >
                  <option value="admin">Rol: Administrador</option>
                  <option value="usuario">Rol: Usuario estándar</option>
                  <option value="superadmin">Rol: Super Admin</option>
                </select>
                <button
                  type="submit"
                  className="bg-blue-900 hover:bg-blue-800 text-white text-xs font-bold py-2.5 px-4 rounded-xl"
                >
                  Asignar rol
                </button>
              </form>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs space-y-4">
              <h3 className="text-base font-bold text-slate-900">
                Padrón de Roles del Sistema
              </h3>

              <div className="divide-y divide-slate-100">
                {usuariosSistema.map((u) => {
                  const esMiUsuario =
                    user && Number(u.id_usuario) === Number(user.id_usuario);
                  return (
                    <div
                      key={u.id_usuario}
                      className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div>
                        <span className="text-sm font-bold text-slate-900 mr-2">
                          {u.nombre} {u.apellido}
                        </span>
                        <span className="text-xs font-bold uppercase px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-900">
                          {u.rol}
                        </span>
                        <p className="text-xs text-slate-500 mt-0.5">{u.email}</p>
                      </div>

                      {!esMiUsuario && (
                        <div className="flex gap-2">
                          {u.rol === 'usuario' ? (
                            <button
                              type="button"
                              onClick={() => cambiarRolDeUsuario(u.id_usuario, 'admin')}
                              className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl"
                            >
                              Hacer Administrador
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() =>
                                cambiarRolDeUsuario(u.id_usuario, 'usuario')
                              }
                              className="bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold px-3.5 py-2 rounded-xl"
                            >
                              Quitar rol de Admin
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* MODAL PARA APLICAR AVISO (1/3 a 3/3), SUSPENSIÓN POR DÍAS O BANEO */}
      {usuarioASancionar && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-base font-extrabold text-slate-900 mb-1">
              Sancionar o advertir a {usuarioASancionar.nombre}
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Avisos actuales en su cuenta:{' '}
              <strong>{usuarioASancionar.avisos || 0} de 3</strong>
            </p>

            <form onSubmit={handleAplicarMedidaDisciplinaria} className="space-y-4">
              <div className="space-y-2 text-xs">
                <label className="flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer font-semibold">
                  <input
                    type="radio"
                    name="tipoMedida"
                    checked={tipoMedidaDisciplinaria === 'aviso'}
                    onChange={() => setTipoMedidaDisciplinaria('aviso')}
                  />
                  <span>
                    Sumar 1 Aviso preventivo (Quedará en{' '}
                    {Math.min(3, (usuarioASancionar.avisos || 0) + 1)}/3)
                  </span>
                </label>

                <label className="flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer font-semibold">
                  <input
                    type="radio"
                    name="tipoMedida"
                    checked={tipoMedidaDisciplinaria === 'suspension_dias'}
                    onChange={() => setTipoMedidaDisciplinaria('suspension_dias')}
                  />
                  <span>
                    Suspender cuenta por X días sin poder loguearse
                  </span>
                </label>

                {tipoMedidaDisciplinaria === 'suspension_dias' && (
                  <div className="pl-6">
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Cantidad de días de suspensión:
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="365"
                      value={diasSuspension}
                      onChange={(e) => setDiasSuspension(e.target.value)}
                      className="w-32 px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-bold"
                    />
                  </div>
                )}

                <label className="flex items-center gap-2.5 p-3 rounded-xl border border-red-200 bg-red-50/50 text-red-900 cursor-pointer font-semibold">
                  <input
                    type="radio"
                    name="tipoMedida"
                    checked={tipoMedidaDisciplinaria === 'baneo'}
                    onChange={() => setTipoMedidaDisciplinaria('baneo')}
                  />
                  <span>Banear cuenta definitivamente</span>
                </label>

                <label className="flex items-center gap-2.5 p-3 rounded-xl border border-emerald-200 bg-emerald-50/50 text-emerald-900 cursor-pointer font-semibold">
                  <input
                    type="radio"
                    name="tipoMedida"
                    checked={tipoMedidaDisciplinaria === 'limpiar'}
                    onChange={() => setTipoMedidaDisciplinaria('limpiar')}
                  />
                  <span>Rehabilitar cuenta (Levantar suspensión/baneo)</span>
                </label>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Motivo oficial (Quedará registrado en la cuenta y en Auditoría) *
                </label>
                <textarea
                  rows={3}
                  required
                  value={motivoSancionInput}
                  onChange={(e) => setMotivoSancionInput(e.target.value)}
                  placeholder="Detallá el motivo de la medida..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 outline-none focus:border-blue-600"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setUsuarioASancionar(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-5 py-2 rounded-xl"
                >
                  Confirmar medida
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
