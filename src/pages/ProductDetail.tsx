import { useState, useEffect, useRef, type ChangeEvent, type FormEvent } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ShoppingBag,
  ShoppingCart,
  Package,
  Star,
  ThumbsUp,
  Flag,
  ImagePlus,
  Video,
  Send,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  X,
  MessageCircleQuestion,
  Edit3,
  ShieldAlert,
  EyeOff,
  RotateCcw,
  Plus,
  Trash2,
  Camera,
  Clock
} from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { verificarPerfilCompleto } from './Perfil';
import {
  registrarEventosPostCompra,
  notificarReposicionStock
} from './Notificaciones';
import {
  esUsuarioAdminOSuperAdmin,
  obtenerRolUsuario,
  registrarLogAuditoria
} from './AdminPanel';
import api from '../services/api';
import SobreEsteArticulo from '../components/SobreEsteArticulo';

interface AtributoFila {
  clave: string;
  valor: string;
}

interface MediaItem {
  tipo: 'imagen' | 'video';
  url: string;
}

export interface ReporteDetalle {
  id_reporte: number;
  id_usuario: number;
  usuario_nombre: string;
  motivo: string;
  descripcion: string;
  fecha: string;
}

interface Opinion {
  id_opinion: number;
  id_producto: number;
  id_comprador: number;
  comprador_nombre: string;
  calificacion: number;
  comentario: string;
  archivos_media: MediaItem[];
  likes: number;
  usuarios_like: number[];
  reportes: ReporteDetalle[];
  fecha: string;
  creado_en?: number;
}

interface Pregunta {
  id_pregunta: number;
  id_producto: number;
  id_usuario?: number;
  usuario_nombre: string;
  texto_pregunta: string;
  texto_respuesta?: string;
  fecha: string;
  creado_en?: number;
  reportes?: ReporteDetalle[];
}

export interface ProductoDetalle {
  id_producto: number;
  id_vendedor?: number;
  vendedor_nombre?: string;
  estado?: 'activo' | 'pausado' | 'oculto';
  motivo_baja?: string | null;
  tipo_publicacion?: string;
  titulo: string;
  descripcion?: string;
  precio: number;
  precio_oferta?: number | null;
  stock: number;
  categoria: string;
  imagen_url?: string;
  imagenes?: string[];
  calificacion_promedio?: number | null;
  total_opiniones?: number;
  reportes_producto?: ReporteDetalle[];
  caracteristicas?: {
    principales?: AtributoFila[];
    dimensiones?: string;
    otros?: AtributoFila[];
  };
}

// 4 razones específicas + "Otro" para Reportar Producto
const RAZONES_REPORTE_PRODUCTO = [
  'Producto prohibido o ilegal',
  'Publicación fraudulenta o estafa',
  'Producto falsificado o réplica no autorizada',
  'Precio o descripción engañosa',
  'Otro'
] as const;

// Motivos para Reportar Pregunta u Opinión
const MOTIVOS_REPORTE_INTERACCION = [
  'Spam',
  'Mensaje de odio',
  'Contenido sexual',
  'Imagen o lenguaje inadecuado',
  'Otro'
] as const;

const MOTIVOS_BAJA_ADMIN = [
  'Incumplimiento de normas de la plataforma',
  'Producto prohibido o ilegal',
  'Publicación engañosa o sospecha de fraude',
  'Imágenes o lenguaje inapropiado'
] as const;

const CATEGORIAS_EDITABLES = [
  'Tecnología',
  'Hogar y Muebles',
  'Deportes y Fitness',
  'Herramientas',
  'Gaming y Consolas',
  'Electrodomésticos',
  'Moda y Accesorios',
  'Vehículos y Repuestos'
];

const CUATRO_HORAS_MS = 4 * 60 * 60 * 1000;

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { agregarAlCarrito } = useCart();

  const [producto, setProducto] = useState<ProductoDetalle | null>(null);
  const [todosLosProductos, setTodosLosProductos] = useState<ProductoDetalle[]>([]);
  const [indiceFoto, setIndiceFoto] = useState<number>(0);
  const [cargando, setCargando] = useState(true);

  const [haComprado, setHaComprado] = useState(false);
  const [mensajeCompra, setMensajeCompra] = useState('');

  // Estados de Edición
  const [modoEdicion, setModoEdicion] = useState(false);
  const [editTitulo, setEditTitulo] = useState('');
  const [editPrecio, setEditPrecio] = useState('');
  const [editStock, setEditStock] = useState('');
  const [editCategoria, setEditCategoria] = useState('');
  const [editDescripcion, setEditDescripcion] = useState('');
  const [editDimensiones, setEditDimensiones] = useState('');
  const [editPrincipales, setEditPrincipales] = useState<AtributoFila[]>([]);
  const [editOtros, setEditOtros] = useState<AtributoFila[]>([]);
  const [editImagenes, setEditImagenes] = useState<string[]>([]);
  const [errorFotosEdit, setErrorFotosEdit] = useState('');

  // Estados de Moderación Admin
  const [modalBajaAdmin, setModalBajaAdmin] = useState(false);
  const [motivoBajaSeleccionado, setMotivoBajaSeleccionado] = useState<string>(
    MOTIVOS_BAJA_ADMIN[0]
  );

  // Estados de Preguntas y Respuestas
  const [preguntas, setPreguntas] = useState<Pregunta[]>([]);
  const [nuevaPregunta, setNuevaPregunta] = useState('');
  const [respuestasBorrador, setRespuestasBorrador] = useState<Record<number, string>>({});

  // Estados de Opiniones
  const [opiniones, setOpiniones] = useState<Opinion[]>([]);
  const [estrellasSeleccionadas, setEstrellasSeleccionadas] = useState<number>(5);
  const [comentarioOpinion, setComentarioOpinion] = useState('');
  const [mediaOpinion, setMediaOpinion] = useState<MediaItem[]>([]);
  const [errorMedia, setErrorMedia] = useState('');

  // Estados de Reporte de Producto (4 razones + Otro + Descripción)
  const [modalReportarProducto, setModalReportarProducto] = useState(false);
  const [razonReporteProd, setRazonReporteProd] = useState<string>(
    RAZONES_REPORTE_PRODUCTO[0]
  );
  const [descripcionReporteProd, setDescripcionReporteProd] = useState('');

  // Estados de Reporte de Pregunta u Opinión
  const [objetivoReporte, setObjetivoReporte] = useState<{
    tipo: 'opinion' | 'pregunta';
    id: number;
  } | null>(null);
  const [motivoSeleccionado, setMotivoSeleccionado] = useState<string>(
    MOTIVOS_REPORTE_INTERACCION[0]
  );
  const [descripcionReporteInteraccion, setDescripcionReporteInteraccion] = useState('');
  const [avisoReporte, setAvisoReporte] = useState('');

  const carruselRelacionadosRef = useRef<HTMLDivElement>(null);

  const esVendedorDueno = Boolean(
    isAuthenticated &&
      user &&
      producto &&
      Number(producto.id_vendedor) === Number(user.id_usuario)
  );

  const esAdmin = esUsuarioAdminOSuperAdmin(user);

  // Verifica si una pregunta u opinión está dentro del lapso de 4 horas para poder eliminarse
  const estaEnVentanaDe4Horas = (creadoEn?: number): boolean => {
    if (!creadoEn) return false;
    return Date.now() - creadoEn <= CUATRO_HORAS_MS;
  };

  const calcularTiempoRestanteBorrado = (creadoEn?: number): string => {
    if (!creadoEn) return '';
    const restanteMs = CUATRO_HORAS_MS - (Date.now() - creadoEn);
    if (restanteMs <= 0) return '';
    const horas = Math.floor(restanteMs / (1000 * 60 * 60));
    const minutos = Math.ceil((restanteMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${horas}h ${minutos}m restantes`;
  };

  useEffect(() => {
    const cargarDatos = async () => {
      setCargando(true);
      setIndiceFoto(0);
      setMensajeCompra('');

      const guardadosLocal: ProductoDetalle[] = JSON.parse(
        localStorage.getItem('falu_productos_locales') || '[]'
      );

      let listaCompleta: ProductoDetalle[] = [...guardadosLocal];

      try {
        const res = await api.get('/products');
        if (Array.isArray(res.data)) {
          const idsLocales = new Set(guardadosLocal.map((p) => String(p.id_producto)));
          const remotosNuevos = res.data.filter(
            (r: ProductoDetalle) => !idsLocales.has(String(r.id_producto))
          );
          listaCompleta = [...guardadosLocal, ...remotosNuevos];
        }
      } catch {
      }

      setTodosLosProductos(listaCompleta);

      const encontrado = listaCompleta.find(
        (p) => String(p.id_producto) === String(id)
      );

      if (encontrado) {
        setProducto(encontrado);
      } else {
        try {
          const resIndividual = await api.get(`/products/${id}`);
          setProducto(resIndividual.data || null);
        } catch {
          setProducto(null);
        }
      }

      if (user) {
        const comprasGuardadas: { id_usuario: number; id_producto: number }[] = JSON.parse(
          localStorage.getItem('falu_compras_usuarios') || '[]'
        );
        const compro = comprasGuardadas.some(
          (c) =>
            Number(c.id_usuario) === Number(user.id_usuario) &&
            String(c.id_producto) === String(id)
        );
        setHaComprado(compro);
      } else {
        setHaComprado(false);
      }

      const todasPreguntas: Pregunta[] = JSON.parse(
        localStorage.getItem('falu_preguntas_productos') || '[]'
      );
      setPreguntas(todasPreguntas.filter((p) => String(p.id_producto) === String(id)));

      const todasOpiniones: Opinion[] = JSON.parse(
        localStorage.getItem('falu_opiniones_productos') || '[]'
      );
      setOpiniones(todasOpiniones.filter((o) => String(o.id_producto) === String(id)));

      setCargando(false);
    };

    cargarDatos();
  }, [id, user]);

  const guardarCambiosProducto = async (productoActualizado: ProductoDetalle) => {
    setProducto(productoActualizado);

    const guardadosLocal: ProductoDetalle[] = JSON.parse(
      localStorage.getItem('falu_productos_locales') || '[]'
    );
    const nuevaListaLocal = guardadosLocal.map((p) =>
      String(p.id_producto) === String(productoActualizado.id_producto)
        ? productoActualizado
        : p
    );
    localStorage.setItem('falu_productos_locales', JSON.stringify(nuevaListaLocal));
    setTodosLosProductos((prev) =>
      prev.map((p) =>
        String(p.id_producto) === String(productoActualizado.id_producto)
          ? productoActualizado
          : p
      )
    );

    try {
      await api.put(`/products/${productoActualizado.id_producto}`, productoActualizado);
    } catch {
      // Mantiene persistencia local
    }
  };

  // Reportar Producto (4 razones + Otro + Descripción obligatoria)
  const handleConfirmarReporteProducto = (e: FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated || !user || !producto || esVendedorDueno) {
      if (!isAuthenticated) navigate('/login');
      return;
    }
    if (!descripcionReporteProd.trim()) return;

    const nuevoReporte: ReporteDetalle = {
      id_reporte: Date.now(),
      id_usuario: user.id_usuario,
      usuario_nombre: `${user.nombre} ${user.apellido || ''}`.trim(),
      motivo: razonReporteProd,
      descripcion: descripcionReporteProd.trim(),
      fecha: new Date().toLocaleString('es-AR')
    };

    const reportesActuales = Array.isArray(producto.reportes_producto)
      ? producto.reportes_producto
      : [];

    const productoConReporte: ProductoDetalle = {
      ...producto,
      reportes_producto: [nuevoReporte, ...reportesActuales]
    };

    guardarCambiosProducto(productoConReporte);
    setModalReportarProducto(false);
    setDescripcionReporteProd('');
    setAvisoReporte(
      `Publicación reportada a los administradores por "${razonReporteProd}".`
    );
    setTimeout(() => setAvisoReporte(''), 4000);
  };

  const abrirEdicionVendedor = () => {
    if (!producto || !esVendedorDueno) return;
    setEditTitulo(producto.titulo);
    setEditPrecio(String(producto.precio));
    setEditStock(String(producto.stock));
    setEditCategoria(producto.categoria);
    setEditDescripcion(producto.descripcion || '');
    setEditDimensiones(producto.caracteristicas?.dimensiones || '');
    setEditPrincipales(
      producto.caracteristicas?.principales?.length
        ? [...producto.caracteristicas.principales]
        : [{ clave: 'Marca', valor: '' }]
    );
    setEditOtros(
      producto.caracteristicas?.otros?.length
        ? [...producto.caracteristicas.otros]
        : [{ clave: 'Condición', valor: 'Nuevo' }]
    );

    const fotosActuales =
      producto.imagenes && producto.imagenes.length > 0
        ? [...producto.imagenes]
        : producto.imagen_url
        ? [producto.imagen_url]
        : [];
    setEditImagenes(fotosActuales);
    setErrorFotosEdit('');
    setModoEdicion(true);
  };

  const handleSubirFotosEdicion = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const disponibles = 8 - editImagenes.length;
    if (disponibles <= 0) {
      setErrorFotosEdit('Ya alcanzaste el límite máximo de 8 fotos.');
      return;
    }

    const seleccionados = Array.from(files).slice(0, disponibles);

    seleccionados.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const maxDim = 800;
          let width = img.width;
          let height = img.height;

          if (width > height && width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.75);

          setEditImagenes((prev) => (prev.length < 8 ? [...prev, dataUrl] : prev));
        };
        if (event.target?.result) {
          img.src = event.target.result as string;
        }
      };
      reader.readAsDataURL(file);
    });

    setErrorFotosEdit('');
    e.target.value = '';
  };

  const eliminarFotoEdicion = (idx: number) => {
    setEditImagenes((prev) => prev.filter((_, i) => i !== idx));
  };

  const convertirEnPortadaEdicion = (idx: number) => {
    if (idx === 0) return;
    setEditImagenes((prev) => {
      const elegida = prev[idx];
      const resto = prev.filter((_, i) => i !== idx);
      return [elegida, ...resto];
    });
  };

  const handleGuardarEdicion = async (e: FormEvent) => {
    e.preventDefault();
    if (!producto || !esVendedorDueno) return;

    if (editImagenes.length === 0) {
      setErrorFotosEdit('La publicación debe tener al menos 1 foto.');
      return;
    }

    const actualizado: ProductoDetalle = {
      ...producto,
      titulo: editTitulo.trim(),
      precio: Number(editPrecio),
      stock: Number(editStock),
      categoria: editCategoria,
      descripcion: editDescripcion.trim(),
      imagen_url: editImagenes[0],
      imagenes: editImagenes,
      caracteristicas: {
        principales: editPrincipales.filter((f) => f.clave.trim() && f.valor.trim()),
        dimensiones: editDimensiones.trim(),
        otros: editOtros.filter((f) => f.clave.trim() && f.valor.trim())
      }
    };

    await guardarCambiosProducto(actualizado);
    if (Number(editStock) > 0) {
      notificarReposicionStock(
        producto.id_producto,
        editTitulo.trim(),
        Number(editStock)
      );
    }
    setIndiceFoto(0);
    setModoEdicion(false);
  };

  const handleConfirmarBajaAdmin = async (e: FormEvent) => {
    e.preventDefault();
    if (!producto || !esAdmin) return;

    const actualizado: ProductoDetalle = {
      ...producto,
      estado: 'oculto',
      motivo_baja: motivoBajaSeleccionado
    };

    await guardarCambiosProducto(actualizado);
    registrarLogAuditoria({
      admin_nombre: `${user?.nombre || 'Admin'} ${user?.apellido || ''}`.trim(),
      rol_admin:
        obtenerRolUsuario(user) === 'superadmin' ? 'Super Admin' : 'Administrador',
      tipo_entidad: 'producto',
      accion: 'Baja / Ocultamiento desde la publicación',
      detalle: `Publicación "${producto.titulo}" (#${producto.id_producto}) ocultada por motivo: ${motivoBajaSeleccionado}`,
      snapshot: actualizado
    });
    setModalBajaAdmin(false);
  };

  const handleRestaurarPublicacionAdmin = async () => {
    if (!producto || !esAdmin) return;

    const actualizado: ProductoDetalle = {
      ...producto,
      estado: 'activo',
      motivo_baja: null
    };

    await guardarCambiosProducto(actualizado);
    registrarLogAuditoria({
      admin_nombre: `${user?.nombre || 'Admin'} ${user?.apellido || ''}`.trim(),
      rol_admin:
        obtenerRolUsuario(user) === 'superadmin' ? 'Super Admin' : 'Administrador',
      tipo_entidad: 'producto',
      accion: 'Restauración de publicación',
      detalle: `Publicación "${producto.titulo}" (#${producto.id_producto}) restaurada al catálogo público`,
      snapshot: actualizado
    });
  };

  const handleComprarAhora = () => {
    if (!isAuthenticated || !user) {
      navigate('/login');
      return;
    }
    if (!producto || esVendedorDueno || producto.estado === 'oculto' || producto.stock <= 0) {
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

    const comprasGuardadas = JSON.parse(
      localStorage.getItem('falu_compras_usuarios') || '[]'
    );
    comprasGuardadas.push({
      id_usuario: user.id_usuario,
      id_producto: producto.id_producto,
      id_vendedor: producto.id_vendedor || 1,
      fecha: new Date().toLocaleDateString('es-AR')
    });
    localStorage.setItem('falu_compras_usuarios', JSON.stringify(comprasGuardadas));

    registrarEventosPostCompra({
      id_producto: producto.id_producto,
      titulo_producto: producto.titulo,
      id_vendedor: Number(producto.id_vendedor || 1),
      vendedor_nombre: producto.vendedor_nombre || 'Vendedor Falú',
      id_comprador: user.id_usuario,
      comprador_nombre: `${user.nombre} ${user.apellido || ''}`.trim()
    });

    const nuevoStock = Math.max(0, producto.stock - 1);
    const productoActualizado = { ...producto, stock: nuevoStock };
    guardarCambiosProducto(productoActualizado);

    setHaComprado(true);
    setMensajeCompra(
      '¡Compra registrada con éxito! Ahora como comprador verificado podés dejar tu opinión abajo.'
    );
  };

  // Enviar pregunta guardando timestamp
  const handleEnviarPregunta = (e: FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated || !user) {
      navigate('/login');
      return;
    }
    if (!nuevaPregunta.trim() || !producto || esVendedorDueno) return;

    const preguntaObj: Pregunta = {
      id_pregunta: Date.now(),
      id_producto: producto.id_producto,
      id_usuario: user.id_usuario,
      usuario_nombre: `${user.nombre} ${user.apellido || ''}`.trim(),
      texto_pregunta: nuevaPregunta.trim(),
      fecha: new Date().toLocaleString('es-AR'),
      creado_en: Date.now(),
      reportes: []
    };

    const todasPreguntas: Pregunta[] = JSON.parse(
      localStorage.getItem('falu_preguntas_productos') || '[]'
    );
    const actualizadas = [preguntaObj, ...todasPreguntas];
    localStorage.setItem('falu_preguntas_productos', JSON.stringify(actualizadas));

    setPreguntas((prev) => [preguntaObj, ...prev]);
    setNuevaPregunta('');
  };

  // Eliminar mi propia pregunta (Solo permitido dentro de las primeras 4 horas)
  const handleEliminarMiPregunta = (preg: Pregunta) => {
    if (!user || Number(preg.id_usuario) !== Number(user.id_usuario)) return;
    if (!estaEnVentanaDe4Horas(preg.creado_en)) {
      alert('Ya transcurrieron las 4 horas máximas permitidas para eliminar tu pregunta.');
      return;
    }

    const todasPreguntas: Pregunta[] = JSON.parse(
      localStorage.getItem('falu_preguntas_productos') || '[]'
    );
    const actualizadas = todasPreguntas.filter(
      (p) => p.id_pregunta !== preg.id_pregunta
    );
    localStorage.setItem('falu_preguntas_productos', JSON.stringify(actualizadas));
    setPreguntas((prev) => prev.filter((p) => p.id_pregunta !== preg.id_pregunta));
  };

  const handleResponderPregunta = (idPregunta: number) => {
    if (!esVendedorDueno) return;
    const texto = respuestasBorrador[idPregunta];
    if (!texto || !texto.trim()) return;

    const todasPreguntas: Pregunta[] = JSON.parse(
      localStorage.getItem('falu_preguntas_productos') || '[]'
    );
    const actualizadas = todasPreguntas.map((p) =>
      p.id_pregunta === idPregunta ? { ...p, texto_respuesta: texto.trim() } : p
    );
    localStorage.setItem('falu_preguntas_productos', JSON.stringify(actualizadas));

    setPreguntas(
      actualizadas.filter((p) => String(p.id_producto) === String(producto?.id_producto))
    );
  };

  const handleSubirMediaOpinion = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    if (mediaOpinion.length + files.length > 4) {
      setErrorMedia('Podés adjuntar hasta 4 archivos (fotos o videos) por opinión.');
      return;
    }

    Array.from(files).forEach((file) => {
      const esVideo = file.type.startsWith('video/');
      const esImagen = file.type.startsWith('image/');
      if (!esVideo && !esImagen) return;

      if (esVideo && file.size > 15 * 1024 * 1024) {
        setErrorMedia('El video supera el límite de 15MB.');
        return;
      }

      const reader = new FileReader();
      reader.onload = (ev) => {
        const result = ev.target?.result as string;
        if (!result) return;
        setMediaOpinion((prev) => [
          ...prev,
          { tipo: esVideo ? 'video' : 'imagen', url: result }
        ]);
      };
      reader.readAsDataURL(file);
    });

    setErrorMedia('');
    e.target.value = '';
  };

  const recalcularPromedioProducto = (opinionesDeEsteProducto: Opinion[]) => {
    if (!producto) return;
    if (opinionesDeEsteProducto.length === 0) {
      const sinEstrellas: ProductoDetalle = {
        ...producto,
        calificacion_promedio: null,
        total_opiniones: 0
      };
      guardarCambiosProducto(sinEstrellas);
      return;
    }

    const sumaEstrellas = opinionesDeEsteProducto.reduce(
      (acc, item) => acc + item.calificacion,
      0
    );
    const nuevoPromedio = Number(
      (sumaEstrellas / opinionesDeEsteProducto.length).toFixed(1)
    );

    const productoConEstrellas: ProductoDetalle = {
      ...producto,
      calificacion_promedio: nuevoPromedio,
      total_opiniones: opinionesDeEsteProducto.length
    };
    guardarCambiosProducto(productoConEstrellas);
  };

  const handleEnviarOpinion = (e: FormEvent) => {
    e.preventDefault();
    if (esVendedorDueno || !haComprado || !user || !producto || !comentarioOpinion.trim()) {
      return;
    }

    const nuevaOp: Opinion = {
      id_opinion: Date.now(),
      id_producto: producto.id_producto,
      id_comprador: user.id_usuario,
      comprador_nombre: `${user.nombre} ${user.apellido || ''}`.trim(),
      calificacion: estrellasSeleccionadas,
      comentario: comentarioOpinion.trim(),
      archivos_media: mediaOpinion,
      likes: 0,
      usuarios_like: [],
      reportes: [],
      fecha: new Date().toLocaleString('es-AR'),
      creado_en: Date.now()
    };

    const todasOpiniones: Opinion[] = JSON.parse(
      localStorage.getItem('falu_opiniones_productos') || '[]'
    );
    const nuevasOpinionesGlobal = [nuevaOp, ...todasOpiniones];
    localStorage.setItem('falu_opiniones_productos', JSON.stringify(nuevasOpinionesGlobal));

    const opinionesDeEsteProducto = nuevasOpinionesGlobal.filter(
      (o) => String(o.id_producto) === String(producto.id_producto)
    );
    setOpiniones(opinionesDeEsteProducto);
    recalcularPromedioProducto(opinionesDeEsteProducto);

    setComentarioOpinion('');
    setMediaOpinion([]);
    setEstrellasSeleccionadas(5);
  };

  // Eliminar mi propia opinión (Solo dentro de las primeras 4 horas)
  const handleEliminarMiOpinion = (op: Opinion) => {
    if (!user || Number(op.id_comprador) !== Number(user.id_usuario)) return;
    if (!estaEnVentanaDe4Horas(op.creado_en)) {
      alert('Ya transcurrieron las 4 horas máximas permitidas para eliminar tu opinión.');
      return;
    }

    const todasOpiniones: Opinion[] = JSON.parse(
      localStorage.getItem('falu_opiniones_productos') || '[]'
    );
    const nuevasGlobal = todasOpiniones.filter(
      (item) => item.id_opinion !== op.id_opinion
    );
    localStorage.setItem('falu_opiniones_productos', JSON.stringify(nuevasGlobal));

    const deEsteProd = nuevasGlobal.filter(
      (o) => String(o.id_producto) === String(producto?.id_producto)
    );
    setOpiniones(deEsteProd);
    recalcularPromedioProducto(deEsteProd);
  };

  const handleLikeOpinion = (idOpinion: number) => {
    if (!isAuthenticated || !user) {
      navigate('/login');
      return;
    }

    const todasOpiniones: Opinion[] = JSON.parse(
      localStorage.getItem('falu_opiniones_productos') || '[]'
    );

    const actualizadas = todasOpiniones.map((op) => {
      if (op.id_opinion !== idOpinion) return op;
      const yaDioLike = op.usuarios_like.includes(user.id_usuario);
      const nuevosUsuariosLike = yaDioLike
        ? op.usuarios_like.filter((u) => u !== user.id_usuario)
        : [...op.usuarios_like, user.id_usuario];

      return {
        ...op,
        likes: nuevosUsuariosLike.length,
        usuarios_like: nuevosUsuariosLike
      };
    });

    localStorage.setItem('falu_opiniones_productos', JSON.stringify(actualizadas));
    setOpiniones(
      actualizadas.filter((o) => String(o.id_producto) === String(producto?.id_producto))
    );
  };

  // Confirmar Reporte de Pregunta u Opinión (Bloqueando estrictamente auto-reportes)
  const handleConfirmarReporteInteraccion = (e: FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated || !user || !objetivoReporte) {
      navigate('/login');
      return;
    }

    const nuevoReporte: ReporteDetalle = {
      id_reporte: Date.now(),
      id_usuario: user.id_usuario,
      usuario_nombre: `${user.nombre} ${user.apellido || ''}`.trim(),
      motivo: motivoSeleccionado,
      descripcion: descripcionReporteInteraccion.trim() || 'Sin descripción adicional',
      fecha: new Date().toLocaleString('es-AR')
    };

    if (objetivoReporte.tipo === 'opinion') {
      const todasOpiniones: Opinion[] = JSON.parse(
        localStorage.getItem('falu_opiniones_productos') || '[]'
      );

      const actualizadas = todasOpiniones.map((op) => {
        if (op.id_opinion !== objetivoReporte.id) return op;
        // Prohibido auto-reportar opinión propia
        if (Number(op.id_comprador) === Number(user.id_usuario)) return op;
        return {
          ...op,
          reportes: [...(op.reportes || []), nuevoReporte]
        };
      });

      localStorage.setItem('falu_opiniones_productos', JSON.stringify(actualizadas));
      setOpiniones(
        actualizadas.filter((o) => String(o.id_producto) === String(producto?.id_producto))
      );
    } else {
      const todasPreguntas: Pregunta[] = JSON.parse(
        localStorage.getItem('falu_preguntas_productos') || '[]'
      );

      const actualizadas = todasPreguntas.map((pr) => {
        if (pr.id_pregunta !== objetivoReporte.id) return pr;
        // Prohibido auto-reportar pregunta propia
        if (Number(pr.id_usuario) === Number(user.id_usuario)) return pr;
        return {
          ...pr,
          reportes: [...(pr.reportes || []), nuevoReporte]
        };
      });

      localStorage.setItem('falu_preguntas_productos', JSON.stringify(actualizadas));
      setPreguntas(
        actualizadas.filter((p) => String(p.id_producto) === String(producto?.id_producto))
      );
    }

    setObjetivoReporte(null);
    setDescripcionReporteInteraccion('');
    setAvisoReporte(
      `Reporte enviado a los administradores por motivo: "${motivoSeleccionado}".`
    );
    setTimeout(() => setAvisoReporte(''), 4000);
  };

  if (cargando) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center text-sm text-slate-500">
          Cargando publicación...
        </div>
        <Footer />
      </div>
    );
  }

  if (!producto) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center p-4">
          <p className="text-slate-700 font-bold mb-4">No se encontró la publicación</p>
          <Link to="/" className="text-blue-600 font-bold text-sm hover:underline">
            Volver al inicio
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  if (producto.estado === 'oculto' && !esAdmin && !esVendedorDueno) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <EyeOff className="w-12 h-12 text-red-500 mb-3" />
          <h2 className="text-lg font-extrabold text-slate-900 mb-1">
            Publicación no disponible
          </h2>
          <p className="text-xs text-slate-500 max-w-md mb-5">
            Esta publicación fue retirada o pausada por los administradores de Falú por incumplir las normas del sitio.
          </p>
          <Link
            to="/"
            className="bg-blue-600 text-white text-xs font-bold px-5 py-2.5 rounded-full"
          >
            Volver al catálogo
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  const listaFotos =
    producto.imagenes && producto.imagenes.length > 0
      ? producto.imagenes
      : producto.imagen_url
      ? [producto.imagen_url]
      : [];

  const principales = producto.caracteristicas?.principales || [];
  const dimensiones = producto.caracteristicas?.dimensiones || '';
  const otros = producto.caracteristicas?.otros || [];

  const masDelVendedor = todosLosProductos.filter(
    (p) =>
      p.estado !== 'oculto' &&
      String(p.id_producto) !== String(producto.id_producto) &&
      producto.id_vendedor &&
      Number(p.id_vendedor) === Number(producto.id_vendedor)
  );

  const productosRelacionados = todosLosProductos.filter(
    (p) =>
      p.estado !== 'oculto' &&
      String(p.id_producto) !== String(producto.id_producto) &&
      p.categoria === producto.categoria
  );

  const yaOpinoEsteComprador = user
    ? opiniones.some((o) => Number(o.id_comprador) === Number(user.id_usuario))
    : false;

  const desplazarCarrusel = (direccion: 'izq' | 'der') => {
    if (!carruselRelacionadosRef.current) return;
    const desplazamiento = direccion === 'der' ? 320 : -320;
    carruselRelacionadosRef.current.scrollBy({ left: desplazamiento, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <Navbar />

      <main className="max-w-6xl w-full mx-auto px-4 py-8 space-y-8 flex-1">
        
        {avisoReporte && (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-xl text-xs font-bold">
            {avisoReporte}
          </div>
        )}

        {producto.estado === 'oculto' && (
          <div className="bg-red-50 border-2 border-red-300 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <ShieldAlert className="w-6 h-6 text-red-600 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-extrabold text-red-900">
                  Publicación ocultada por un Administrador
                </h3>
                <p className="text-xs text-red-700 mt-0.5">
                  Motivo de sanción: <strong>{producto.motivo_baja}</strong>. Esta publicación no es visible para los compradores en el catálogo.
                </p>
              </div>
            </div>
            {esAdmin && (
              <button
                type="button"
                onClick={handleRestaurarPublicacionAdmin}
                className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1.5 shrink-0 transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                Restaurar publicación
              </button>
            )}
          </div>
        )}

        {esAdmin && producto.estado !== 'oculto' && (
          <div className="bg-slate-900 text-white rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-md">
            <div className="flex items-center gap-2.5">
              <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0" />
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-amber-400 block">
                  Modo Administrador
                </span>
                <p className="text-xs text-slate-300">
                  Si esta publicación infringe alguna norma de Falú, podés bajarla u ocultarla del catálogo público.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setModalBajaAdmin(true)}
              className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-1.5 shrink-0 transition-colors"
            >
              <EyeOff className="w-4 h-4" />
              Bajar / Ocultar publicación
            </button>
          </div>
        )}

        {/* 1. BLOQUE PRINCIPAL*/}
        <div className="bg-white rounded-2xl shadow-xs border border-slate-200 p-6 sm:p-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            <div className="lg:col-span-7 flex flex-col-reverse sm:flex-row gap-4">
              {listaFotos.length > 1 && (
                <div className="flex sm:flex-col gap-2 overflow-x-auto sm:w-16 shrink-0">
                  {listaFotos.map((img, i) => (
                    <button
                      key={i}
                      type="button"
                      onMouseEnter={() => setIndiceFoto(i)}
                      onClick={() => setIndiceFoto(i)}
                      className={`w-14 h-14 rounded-lg overflow-hidden border-2 shrink-0 transition-all ${
                        indiceFoto === i ? 'border-blue-600' : 'border-slate-200'
                      }`}
                    >
                      <img src={img} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}

              <div className="flex-1 aspect-square bg-slate-50 rounded-xl border border-slate-100 overflow-hidden flex items-center justify-center">
                {listaFotos[indiceFoto] ? (
                  <img
                    src={listaFotos[indiceFoto]}
                    alt={producto.titulo}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <Package className="w-16 h-16 text-slate-300" />
                )}
              </div>
            </div>

            <div className="lg:col-span-5 flex flex-col justify-between border border-slate-200 rounded-2xl p-6">
              <div>
                <div className="flex items-center justify-between text-xs text-slate-500 font-semibold gap-2">
                  <span>{producto.categoria}</span>

                  <span>
                    Vendido por{' '}
                    <Link
                      to={`/vendedor/${producto.id_vendedor || 1}`}
                      className="text-blue-600 hover:text-blue-800 font-bold hover:underline transition-colors"
                    >
                      {producto.vendedor_nombre || 'Vendedor Falú'}
                    </Link>
                  </span>
                </div>

                <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-1.5 mb-2 leading-snug">
                  {producto.titulo}
                </h1>

                {opiniones.length > 0 && (
                  <div className="flex items-center gap-2 mb-4">
                    <div className="flex items-center text-amber-400">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`w-4 h-4 ${
                            star <= Math.round(producto.calificacion_promedio || 0)
                              ? 'fill-amber-400 text-amber-400'
                              : 'text-slate-300'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-xs font-bold text-slate-700">
                      {producto.calificacion_promedio}
                    </span>
                    <span className="text-xs text-slate-400">
                      ({opiniones.length} {opiniones.length === 1 ? 'opinión' : 'opiniones'})
                    </span>
                  </div>
                )}

                <div className="my-4">
                  <span className="text-3xl font-extrabold text-slate-900">
                    ARS ${Number(producto.precio).toLocaleString('es-AR')}
                  </span>
                </div>

                <p className="text-xs font-semibold text-slate-700 mt-4">
                  Stock disponible:{' '}
                  <span className="font-normal text-slate-500">
                    ({producto.stock} {producto.stock === 1 ? 'disponible' : 'disponibles'})
                  </span>
                </p>

                <SobreEsteArticulo descripcion={producto.descripcion} />
                {mensajeCompra && (
                  <div className="mt-4 bg-emerald-50 border border-emerald-200 text-emerald-700 p-3 rounded-xl text-xs font-semibold flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{mensajeCompra}</span>
                  </div>
                )}
              </div>

              {esVendedorDueno ? (
                <div className="mt-6 pt-4 border-t border-slate-100 space-y-3">
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-900 font-medium">
                    Sos el vendedor de esta publicación. No podés comprar ni reportar tu propio artículo, pero podés editar sus datos y fotos en cualquier momento.
                  </div>
                  <button
                    type="button"
                    onClick={abrirEdicionVendedor}
                    className="w-full bg-blue-900 hover:bg-blue-800 text-white font-bold text-sm py-3.5 rounded-xl flex items-center justify-center gap-2 transition-colors"
                  >
                    <Edit3 className="w-4 h-4" />
                    Modificar publicación
                  </button>
                </div>
              ) : (
                <div className="space-y-3 mt-6 pt-4">
                  <button
                    type="button"
                    disabled={producto.stock <= 0 || producto.estado === 'oculto'}
                    onClick={handleComprarAhora}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold text-sm py-3.5 rounded-xl transition-colors"
                  >
                    {producto.stock > 0 ? 'Comprar ahora' : 'Sin stock'}
                  </button>
                  <button
                    type="button"
                    disabled={producto.estado === 'oculto'}
                    onClick={() => {
                      agregarAlCarrito(producto);
                      navigate('/carrito');
                    }}
                    className="w-full bg-blue-50 hover:bg-blue-100 disabled:bg-slate-100 disabled:text-slate-400 text-blue-700 font-bold text-sm py-3.5 rounded-xl flex items-center justify-center gap-2 transition-colors"
                  >
                    <ShoppingCart className="w-4 h-4" />
                    {producto.stock > 0
                      ? 'Agregar al carrito'
                      : 'Agregar al carrito (Avisarme cuando haya stock)'}
                  </button>

                  {/* Botón para Reportar Publicación (Bloqueado para el propio vendedor) */}
                  <div className="pt-2 text-center">
                    <button
                      type="button"
                      onClick={() => {
                        if (!isAuthenticated) {
                          navigate('/login');
                          return;
                        }
                        setModalReportarProducto(true);
                      }}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-red-600 transition-colors"
                    >
                      <Flag className="w-3.5 h-3.5" />
                      <span>Reportar esta publicación</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>

        {/* 2. CARRUSELES */}
        {(productosRelacionados.length > 0 || masDelVendedor.length > 0) && (
          <div className="space-y-6">
            {productosRelacionados.length > 0 && (
              <div className="bg-white rounded-2xl shadow-xs border border-slate-200 p-6 sm:p-8 relative">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-xl font-normal text-slate-900">
                    Productos relacionados
                  </h2>
                  <span className="text-xs text-slate-400">Misma categoría</span>
                </div>

                <div className="relative group">
                  <button
                    type="button"
                    onClick={() => desplazarCarrusel('izq')}
                    className="hidden sm:flex absolute -left-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white rounded-full shadow-md border border-slate-200 items-center justify-center text-blue-600 hover:scale-105 transition-transform"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>

                  <div
                    ref={carruselRelacionadosRef}
                    className="flex gap-4 overflow-x-auto no-scrollbar scroll-smooth pb-2"
                  >
                    {productosRelacionados.map((rel) => (
                      <div
                        key={rel.id_producto}
                        onClick={() => navigate(`/producto/${rel.id_producto}`)}
                        className="w-56 shrink-0 bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-md transition-all cursor-pointer flex flex-col"
                      >
                        <div className="aspect-square bg-slate-100 overflow-hidden">
                          {rel.imagen_url ? (
                            <img
                              src={rel.imagen_url}
                              alt={rel.titulo}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <ShoppingBag className="w-8 h-8 text-slate-300" />
                            </div>
                          )}
                        </div>
                        <div className="p-3.5 flex flex-col flex-1 justify-between">
                          <h3 className="text-xs text-slate-700 line-clamp-2 mb-2">
                            {rel.titulo}
                          </h3>
                          <div>
                            <p className="text-lg font-normal text-slate-900">
                              $ {Number(rel.precio).toLocaleString('es-AR')}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => desplazarCarrusel('der')}
                    className="hidden sm:flex absolute -right-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white rounded-full shadow-md border border-slate-200 items-center justify-center text-blue-600 hover:scale-105 transition-transform"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}

            {masDelVendedor.length > 0 && (
              <div className="bg-white rounded-2xl shadow-xs border border-slate-200 p-6 sm:p-8">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-xl font-normal text-slate-900">
                    Más publicaciones de {producto.vendedor_nombre || 'este vendedor'}
                  </h2>
                  <Link
                    to={`/vendedor/${producto.id_vendedor || 1}`}
                    className="text-xs font-bold text-blue-600 hover:underline"
                  >
                    Ir a la página del vendedor
                  </Link>
                </div>
                <div className="flex gap-4 overflow-x-auto pb-2">
                  {masDelVendedor.map((item) => (
                    <div
                      key={item.id_producto}
                      onClick={() => navigate(`/producto/${item.id_producto}`)}
                      className="w-56 shrink-0 bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-md transition-all cursor-pointer"
                    >
                      <div className="aspect-square bg-slate-100">
                        {item.imagen_url && (
                          <img
                            src={item.imagen_url}
                            alt={item.titulo}
                            className="w-full h-full object-cover"
                          />
                        )}
                      </div>
                      <div className="p-3.5">
                        <h3 className="text-xs text-slate-700 line-clamp-2 mb-2">
                          {item.titulo}
                        </h3>
                        <p className="text-lg font-normal text-slate-900">
                          $ {Number(item.precio).toLocaleString('es-AR')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 3. CARACTERÍSTICAS DEL PRODUCTO */}
        {(principales.length > 0 || dimensiones || otros.length > 0) && (
          <div className="bg-white rounded-2xl shadow-xs border border-slate-200 p-6 sm:p-8">
            <h2 className="text-xl sm:text-2xl font-normal text-slate-900 mb-6">
              Características del {producto.tipo_publicacion === 'vehiculo' ? 'vehículo' : 'producto'}
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {principales.length > 0 && (
                <div>
                  <h3 className="text-base font-semibold text-slate-900 mb-3">
                    Características principales
                  </h3>
                  <div className="rounded-lg overflow-hidden border border-slate-100">
                    {principales.map((fila, index) => (
                      <div
                        key={index}
                        className={`grid grid-cols-2 px-4 py-3.5 text-xs sm:text-sm ${
                          index % 2 === 0 ? 'bg-neutral-100' : 'bg-white'
                        }`}
                      >
                        <span className="font-semibold text-slate-800">{fila.clave}</span>
                        <span className="text-slate-700">{fila.valor}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-6">
                {dimensiones && (
                  <div>
                    <h3 className="text-base font-semibold text-slate-900 mb-3">
                      Dimensiones
                    </h3>
                    <div className="rounded-lg overflow-hidden border border-slate-100">
                      <div className="grid grid-cols-2 px-4 py-3.5 text-xs sm:text-sm bg-neutral-100">
                        <span className="font-semibold text-slate-800">
                          Altura x Largo x Profundidad
                        </span>
                        <span className="text-slate-700">{dimensiones}</span>
                      </div>
                    </div>
                  </div>
                )}

                {otros.length > 0 && (
                  <div>
                    <h3 className="text-base font-semibold text-slate-900 mb-3">
                      Otros
                    </h3>
                    <div className="rounded-lg overflow-hidden border border-slate-100">
                      {otros.map((fila, index) => (
                        <div
                          key={index}
                          className={`grid grid-cols-2 px-4 py-3.5 text-xs sm:text-sm ${
                            index % 2 === 0 ? 'bg-neutral-100' : 'bg-white'
                          }`}
                        >
                          <span className="font-semibold text-slate-800">{fila.clave}</span>
                          <span className="text-slate-700">{fila.valor}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 4. PREGUNTAS Y RESPUESTAS*/}
        <div className="bg-white rounded-2xl shadow-xs border border-slate-200 p-6 sm:p-8">
          <div className="flex items-center gap-2 mb-6">
            <MessageCircleQuestion className="w-6 h-6 text-blue-900" />
            <h2 className="text-xl sm:text-2xl font-normal text-slate-900">
              Preguntas y respuestas
            </h2>
          </div>

          {esVendedorDueno ? (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-6 text-xs text-slate-600">
              Sos el vendedor de este producto. No podés realizar preguntas en tu propia publicación, pero desde acá podés responder las consultas de los interesados.
            </div>
          ) : (
            <form onSubmit={handleEnviarPregunta} className="flex flex-col sm:flex-row gap-3 mb-8">
              <input
                type="text"
                value={nuevaPregunta}
                onChange={(e) => setNuevaPregunta(e.target.value)}
                placeholder="Escribí tu pregunta para el vendedor..."
                className="flex-1 px-4 py-3 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-blue-600 outline-none"
              />
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm px-6 py-3 rounded-xl transition-colors shrink-0"
              >
                Preguntar
              </button>
            </form>
          )}

          {preguntas.length === 0 ? (
            <p className="text-xs text-slate-500">
              Nadie hizo preguntas todavía.
            </p>
          ) : (
            <div className="space-y-4">
              {preguntas.map((preg) => {
                const esMiPregunta = Boolean(
                  user && Number(preg.id_usuario) === Number(user.id_usuario)
                );
                const puedeBorrarPregunta =
                  esMiPregunta && estaEnVentanaDe4Horas(preg.creado_en);

                return (
                  <div
                    key={preg.id_pregunta}
                    className="border-b border-slate-100 pb-4 last:border-none"
                  >
                    <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                      <span className="font-semibold text-slate-700">
                        {preg.usuario_nombre}
                      </span>
                      <div className="flex items-center gap-3">
                        <span>{preg.fecha}</span>

                        {/* Si es MI pregunta y está dentro de las 4 horas: Botón Eliminar */}
                        {puedeBorrarPregunta && (
                          <button
                            type="button"
                            onClick={() => handleEliminarMiPregunta(preg)}
                            className="inline-flex items-center gap-1 text-red-600 hover:underline font-bold"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>
                              Eliminar ({calcularTiempoRestanteBorrado(preg.creado_en)})
                            </span>
                          </button>
                        )}

                        {/* Si NO es mi pregunta: Botón Reportar pregunta */}
                        {!esMiPregunta && (
                          <button
                            type="button"
                            onClick={() => {
                              if (!isAuthenticated) {
                                navigate('/login');
                                return;
                              }
                              setObjetivoReporte({
                                tipo: 'pregunta',
                                id: preg.id_pregunta
                              });
                            }}
                            className="inline-flex items-center gap-1 text-slate-400 hover:text-red-600 transition-colors"
                          >
                            <Flag className="w-3 h-3" />
                            <span>Reportar pregunta</span>
                          </button>
                        )}
                      </div>
                    </div>

                    <p className="text-sm text-slate-800 font-medium">
                      {preg.texto_pregunta}
                    </p>

                    {preg.texto_respuesta ? (
                      <div className="mt-2 pl-4 border-l-2 border-slate-300 text-xs text-slate-600">
                        <span className="font-bold text-blue-900 block mb-0.5">
                          Respuesta del vendedor:
                        </span>
                        {preg.texto_respuesta}
                      </div>
                    ) : (
                      esVendedorDueno && (
                        <div className="mt-2 flex items-center gap-2">
                          <input
                            type="text"
                            placeholder="Responder como vendedor..."
                            value={respuestasBorrador[preg.id_pregunta] || ''}
                            onChange={(e) =>
                              setRespuestasBorrador((prev) => ({
                                ...prev,
                                [preg.id_pregunta]: e.target.value
                              }))
                            }
                            className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:border-blue-600 outline-none flex-1 max-w-md"
                          />
                          <button
                            type="button"
                            onClick={() => handleResponderPregunta(preg.id_pregunta)}
                            className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1"
                          >
                            <Send className="w-3 h-3" />
                            Responder
                          </button>
                        </div>
                      )
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 5. OPINIONES DEL PRODUCTO*/}
        <div className="bg-white rounded-2xl shadow-xs border border-slate-200 p-6 sm:p-8">
          <h2 className="text-xl sm:text-2xl font-normal text-slate-900 mb-6">
            Opiniones del producto
          </h2>

          {esVendedorDueno ? (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-8 text-xs text-slate-600">
              Como vendedor de este artículo, no podés calificar ni dejar reseñas sobre tu propio producto.
            </div>
          ) : haComprado && !yaOpinoEsteComprador ? (
            <form
              onSubmit={handleEnviarOpinion}
              className="bg-slate-50 border border-slate-200 rounded-2xl p-5 mb-8 space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-800">
                  Dejá tu opinión como comprador verificado
                </h3>
                <span className="text-[11px] bg-emerald-100 text-emerald-800 font-bold px-2.5 py-0.5 rounded-full">
                  Compra verificada (Eliminable durante 4 hs)
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  ¿Cuántas estrellas le das al producto?
                </label>
                <div className="flex items-center gap-1.5">
                  {[1, 2, 3, 4, 5].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setEstrellasSeleccionadas(num)}
                      className="p-1 focus:outline-none transition-transform hover:scale-110"
                    >
                      <Star
                        className={`w-6 h-6 ${
                          num <= estrellasSeleccionadas
                            ? 'fill-amber-400 text-amber-400'
                            : 'text-slate-300'
                        }`}
                      />
                    </button>
                  ))}
                  <span className="ml-2 text-xs font-bold text-slate-700">
                    {estrellasSeleccionadas} de 5 estrellas
                  </span>
                </div>
              </div>

              <div>
                <textarea
                  rows={3}
                  required
                  value={comentarioOpinion}
                  onChange={(e) => setComentarioOpinion(e.target.value)}
                  placeholder="Contanos qué te pareció el producto, su calidad y funcionamiento..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-sm focus:ring-2 focus:ring-blue-600 outline-none"
                />
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <label className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-300 bg-white hover:border-blue-600 text-xs font-semibold text-slate-700 cursor-pointer transition-colors">
                    <ImagePlus className="w-4 h-4 text-blue-600" />
                    <Video className="w-4 h-4 text-blue-600" />
                    <span>Agregar fotos o videos ({mediaOpinion.length}/4)</span>
                    <input
                      type="file"
                      accept="image/*,video/*"
                      multiple
                      onChange={handleSubirMediaOpinion}
                      className="hidden"
                    />
                  </label>
                  {errorMedia && (
                    <span className="text-xs text-red-600 font-medium">{errorMedia}</span>
                  )}
                </div>

                {mediaOpinion.length > 0 && (
                  <div className="flex gap-2.5 mt-3 overflow-x-auto">
                    {mediaOpinion.map((item, idx) => (
                      <div
                        key={idx}
                        className="relative w-20 h-20 rounded-xl overflow-hidden border border-slate-300 bg-black shrink-0"
                      >
                        {item.tipo === 'video' ? (
                          <video src={item.url} className="w-full h-full object-cover" />
                        ) : (
                          <img src={item.url} alt="" className="w-full h-full object-cover" />
                        )}
                        <button
                          type="button"
                          onClick={() =>
                            setMediaOpinion((prev) => prev.filter((_, i) => i !== idx))
                          }
                          className="absolute top-1 right-1 bg-black/70 text-white rounded-full p-0.5"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-6 py-2.5 rounded-full transition-colors"
                >
                  Publicar opinión
                </button>
              </div>
            </form>
          ) : !haComprado ? (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-8 text-xs text-slate-600">
              Solo los compradores que adquirieron este producto pueden dejar una calificación y subir fotos o videos.
            </div>
          ) : null}

          {opiniones.length === 0 ? (
            <p className="text-xs text-slate-500">
              Este producto aún no tiene opiniones de compradores.
            </p>
          ) : (
            <div className="space-y-6">
              {opiniones.map((op) => {
                const dioLike = user ? op.usuarios_like.includes(user.id_usuario) : false;
                const esMiOpinion = Boolean(
                  user && Number(op.id_comprador) === Number(user.id_usuario)
                );
                const puedeBorrarOpinion =
                  esMiOpinion && estaEnVentanaDe4Horas(op.creado_en);

                return (
                  <div
                    key={op.id_opinion}
                    className="border-b border-slate-100 pb-6 last:border-none"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
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
                        <span className="text-xs font-bold text-slate-800">
                          {op.comprador_nombre}
                        </span>
                      </div>
                      <span className="text-xs text-slate-400">{op.fecha}</span>
                    </div>

                    <p className="text-sm text-slate-700 mt-2 leading-relaxed">
                      {op.comentario}
                    </p>

                    {op.archivos_media && op.archivos_media.length > 0 && (
                      <div className="flex flex-wrap gap-3 mt-3">
                        {op.archivos_media.map((media, idx) => (
                          <div
                            key={idx}
                            className="w-28 h-28 rounded-xl overflow-hidden border border-slate-200 bg-slate-900"
                          >
                            {media.tipo === 'video' ? (
                              <video
                                src={media.url}
                                controls
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <img
                                src={media.url}
                                alt="Foto de opinión"
                                className="w-full h-full object-cover"
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center gap-4 mt-4">
                      <button
                        type="button"
                        onClick={() => handleLikeOpinion(op.id_opinion)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
                          dioLike
                            ? 'bg-blue-50 border-blue-600 text-blue-600'
                            : 'border-slate-300 text-slate-600 hover:border-slate-400'
                        }`}
                      >
                        <ThumbsUp className="w-3.5 h-3.5" />
                        <span>Es útil ({op.likes})</span>
                      </button>

                      {/* Si es MI opinión: NO puedo reportarla; si está en las primeras 4 horas puedo eliminarla */}
                      {esMiOpinion ? (
                        puedeBorrarOpinion ? (
                          <button
                            type="button"
                            onClick={() => handleEliminarMiOpinion(op)}
                            className="inline-flex items-center gap-1 text-xs font-bold text-red-600 hover:underline"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>
                              Eliminar mi opinión ({calcularTiempoRestanteBorrado(op.creado_en)})
                            </span>
                          </button>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
                            <Clock className="w-3 h-3" />
                            Tu opinión (Pasaron las 4 hs para eliminar)
                          </span>
                        )
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            if (!isAuthenticated) {
                              navigate('/login');
                              return;
                            }
                            setObjetivoReporte({
                              tipo: 'opinion',
                              id: op.id_opinion
                            });
                          }}
                          className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-red-600 transition-colors"
                        >
                          <Flag className="w-3.5 h-3.5" />
                          <span>Reportar</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* MODAL PARA REPORTAR PRODUCTO (4 Razones + "Otro" + Descripción) */}
      {modalReportarProducto && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900">
                Reportar publicación
              </h3>
              <button
                type="button"
                onClick={() => setModalReportarProducto(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmarReporteProducto} className="space-y-4">
              <p className="text-xs text-slate-600">
                Seleccioná el motivo del reporte y detallá la situación para los administradores:
              </p>

              <div className="space-y-2">
                {RAZONES_REPORTE_PRODUCTO.map((razon) => (
                  <label
                    key={razon}
                    className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-xs font-semibold cursor-pointer transition-colors ${
                      razonReporteProd === razon
                        ? 'border-blue-600 bg-blue-50/60 text-blue-900'
                        : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="razonReporteProd"
                      value={razon}
                      checked={razonReporteProd === razon}
                      onChange={(e) => setRazonReporteProd(e.target.value)}
                    />
                    <span>{razon}</span>
                  </label>
                ))}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Descripción del reporte *
                </label>
                <textarea
                  rows={3}
                  required
                  value={descripcionReporteProd}
                  onChange={(e) => setDescripcionReporteProd(e.target.value)}
                  placeholder="Describí por qué reportás este producto..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:border-blue-600 outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalReportarProducto(false)}
                  className="px-4 py-2 rounded-full text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-full text-xs font-bold bg-red-600 hover:bg-red-700 text-white"
                >
                  Enviar reporte
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL PARA REPORTAR PREGUNTA U OPINIÓN AJENA */}
      {objetivoReporte !== null && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900">
                Reportar {objetivoReporte.tipo === 'opinion' ? 'opinión' : 'pregunta'}
              </h3>
              <button
                type="button"
                onClick={() => setObjetivoReporte(null)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmarReporteInteraccion} className="space-y-4">
              <div className="space-y-2">
                {MOTIVOS_REPORTE_INTERACCION.map((motivo) => (
                  <label
                    key={motivo}
                    className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-xs font-semibold cursor-pointer transition-colors ${
                      motivoSeleccionado === motivo
                        ? 'border-blue-600 bg-blue-50/60 text-blue-900'
                        : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="motivoReporteInteraccion"
                      value={motivo}
                      checked={motivoSeleccionado === motivo}
                      onChange={(e) => setMotivoSeleccionado(e.target.value)}
                    />
                    <span>{motivo}</span>
                  </label>
                ))}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Descripción adicional *
                </label>
                <textarea
                  rows={2}
                  required
                  value={descripcionReporteInteraccion}
                  onChange={(e) => setDescripcionReporteInteraccion(e.target.value)}
                  placeholder="Detallá el motivo del reporte..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:border-blue-600 outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setObjetivoReporte(null)}
                  className="px-4 py-2 rounded-full text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-full text-xs font-bold bg-red-600 hover:bg-red-700 text-white transition-colors"
                >
                  Enviar reporte
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE EDICIÓN DE PUBLICACIÓN CON GESTIÓN DE FOTOS */}
      {modoEdicion && esVendedorDueno && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
              <h3 className="text-lg font-extrabold text-slate-900">
                Modificar mi publicación
              </h3>
              <button
                type="button"
                onClick={() => setModoEdicion(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleGuardarEdicion} className="space-y-5">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">
                      Fotos de la publicación ({editImagenes.length}/8)
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Tocá una miniatura para elegirla como portada o la X para borrarla
                    </span>
                  </div>

                  {editImagenes.length < 8 && (
                    <label className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold cursor-pointer transition-colors">
                      <Camera className="w-3.5 h-3.5" />
                      <span>Agregar fotos</span>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleSubirFotosEdicion}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>

                {errorFotosEdit && (
                  <p className="text-xs text-red-600 font-semibold mb-2">
                    {errorFotosEdit}
                  </p>
                )}

                <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                  {editImagenes.map((imgUrl, idx) => (
                    <div
                      key={idx}
                      className={`relative aspect-square rounded-lg overflow-hidden border-2 group ${
                        idx === 0 ? 'border-blue-600' : 'border-slate-200'
                      }`}
                    >
                      <img
                        src={imgUrl}
                        alt={`Foto ${idx + 1}`}
                        onClick={() => convertirEnPortadaEdicion(idx)}
                        className="w-full h-full object-cover cursor-pointer"
                      />
                      {idx === 0 && (
                        <span className="absolute bottom-0 inset-x-0 bg-blue-600 text-white text-[9px] font-bold text-center py-0.5">
                          Portada
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => eliminarFotoEdicion(idx)}
                        className="absolute top-1 right-1 bg-black/75 hover:bg-red-600 text-white rounded-full p-0.5 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Título de la publicación
                </label>
                <input
                  type="text"
                  required
                  value={editTitulo}
                  onChange={(e) => setEditTitulo(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-blue-600 outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Precio (ARS)
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={editPrecio}
                    onChange={(e) => setEditPrecio(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-blue-600 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Stock disponible
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={editStock}
                    onChange={(e) => setEditStock(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-blue-600 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Categoría
                  </label>
                  <select
                    value={editCategoria}
                    onChange={(e) => setEditCategoria(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm bg-white focus:ring-2 focus:ring-blue-600 outline-none"
                  >
                    {CATEGORIAS_EDITABLES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Dimensiones (Altura x Largo x Profundidad)
                </label>
                <input
                  type="text"
                  value={editDimensiones}
                  onChange={(e) => setEditDimensiones(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-blue-600 outline-none"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-slate-700">
                    Características principales
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setEditPrincipales([...editPrincipales, { clave: '', valor: '' }])
                    }
                    className="text-xs font-bold text-blue-600 flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Agregar fila
                  </button>
                </div>
                <div className="space-y-2">
                  {editPrincipales.map((fila, idx) => (
                    <div key={idx} className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Característica"
                        value={fila.clave}
                        onChange={(e) => {
                          const copia = [...editPrincipales];
                          copia[idx].clave = e.target.value;
                          setEditPrincipales(copia);
                        }}
                        className="w-1/2 px-3 py-1.5 text-xs border border-slate-300 rounded-lg"
                      />
                      <input
                        type="text"
                        placeholder="Valor"
                        value={fila.valor}
                        onChange={(e) => {
                          const copia = [...editPrincipales];
                          copia[idx].valor = e.target.value;
                          setEditPrincipales(copia);
                        }}
                        className="w-1/2 px-3 py-1.5 text-xs border border-slate-300 rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setEditPrincipales(editPrincipales.filter((_, i) => i !== idx))
                        }
                        className="text-slate-400 hover:text-red-500 px-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-slate-700">Otros</label>
                  <button
                    type="button"
                    onClick={() => setEditOtros([...editOtros, { clave: '', valor: '' }])}
                    className="text-xs font-bold text-blue-600 flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Agregar fila
                  </button>
                </div>
                <div className="space-y-2">
                  {editOtros.map((fila, idx) => (
                    <div key={idx} className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Propiedad"
                        value={fila.clave}
                        onChange={(e) => {
                          const copia = [...editOtros];
                          copia[idx].clave = e.target.value;
                          setEditOtros(copia);
                        }}
                        className="w-1/2 px-3 py-1.5 text-xs border border-slate-300 rounded-lg"
                      />
                      <input
                        type="text"
                        placeholder="Valor"
                        value={fila.valor}
                        onChange={(e) => {
                          const copia = [...editOtros];
                          copia[idx].valor = e.target.value;
                          setEditOtros(copia);
                        }}
                        className="w-1/2 px-3 py-1.5 text-xs border border-slate-300 rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => setEditOtros(editOtros.filter((_, i) => i !== idx))}
                        className="text-slate-400 hover:text-red-500 px-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Descripción
                </label>
                <textarea
                  rows={3}
                  value={editDescripcion}
                  onChange={(e) => setEditDescripcion(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-blue-600 outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModoEdicion(false)}
                  className="px-5 py-2.5 rounded-full text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-full text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Guardar cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL PARA BAJAR PUBLICACIÓN (ADMIN) */}
      {modalBajaAdmin && esAdmin && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-red-600 font-bold">
                <ShieldAlert className="w-5 h-5" />
                <h3 className="text-base">Bajar u ocultar publicación</h3>
              </div>
              <button
                type="button"
                onClick={() => setModalBajaAdmin(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmarBajaAdmin} className="space-y-4">
              <div className="space-y-2">
                {MOTIVOS_BAJA_ADMIN.map((motivo) => (
                  <label
                    key={motivo}
                    className={`flex items-center gap-2.5 p-3 rounded-xl border text-xs font-semibold cursor-pointer ${
                      motivoBajaSeleccionado === motivo
                        ? 'border-red-600 bg-red-50 text-red-900'
                        : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="motivoBajaAdmin"
                      value={motivo}
                      checked={motivoBajaSeleccionado === motivo}
                      onChange={(e) => setMotivoBajaSeleccionado(e.target.value)}
                    />
                    <span>{motivo}</span>
                  </label>
                ))}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalBajaAdmin(false)}
                  className="px-4 py-2 rounded-full text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-full text-xs font-bold bg-red-600 hover:bg-red-700 text-white"
                >
                  Confirmar baja
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