import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  IdCard,
  UserCheck,
  Award,
  FileSpreadsheet,
  Mail,
  Phone,
  User,
  CheckCircle2,
  ChevronRight,
  MapPin,
  MessageCircleQuestion,
  Search,
  Receipt,
  Store,
  Plus,
  Trash2,
  AlertCircle
} from 'lucide-react';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import Footer from '../components/Footer';

export interface DatosPerfilUsuario {
  nombreApellido: string;
  dni: string;
  estadoCivil: string;
  nombreElegido: string;
  condicionFiscal: string;
  emailComunicaciones: string;
  telefono: string;
  nombreUsuario: string;
}

export interface DireccionUsuario {
  id_direccion: number;
  nombre_destinatario: string;
  calle: string;
  numero: string;
  piso?: string;
  departamento?: string;
  localidad: string;
  provincia: string;
  codigo_postal: string;
  predeterminada: boolean;
}

export interface TiendaSeguida {
  id_vendedor: number;
  nombre_tienda: string;
  fecha_seguimiento: string;
}

// Función global que verifica si el usuario tiene todo el registro obligatorio para poder comprar
export function verificarPerfilCompleto(idUsuario: number): {
  completo: boolean;
  faltantes: string[];
} {
  const rawPerfil = localStorage.getItem(`falu_perfil_${idUsuario}`);
  const rawDirecciones = localStorage.getItem(`falu_direcciones_${idUsuario}`);

  const faltantes: string[] = [];

  if (!rawPerfil) {
    return {
      completo: false,
      faltantes: [
        'Información personal (DNI, Estado civil, Nombre elegido)',
        'Datos fiscales (Condición fiscal)',
        'Datos de la cuenta (Teléfono numérico y Nombre de usuario)',
        'Al menos una dirección de envío registrada'
      ]
    };
  }

  const perfil: DatosPerfilUsuario = JSON.parse(rawPerfil);
  const direcciones: DireccionUsuario[] = rawDirecciones ? JSON.parse(rawDirecciones) : [];

  if (!perfil.nombreApellido?.trim()) faltantes.push('Nombre y apellido');
  if (!/^\d{7,9}$/.test((perfil.dni || '').trim())) {
    faltantes.push('Número de DNI válido (solo números, 7 a 9 dígitos)');
  }
  if (!perfil.estadoCivil?.trim()) faltantes.push('Estado civil');
  if (!perfil.nombreElegido?.trim()) faltantes.push('Nombre elegido');
  if (!perfil.condicionFiscal?.trim()) faltantes.push('Condición fiscal');
  if (!perfil.emailComunicaciones?.trim()) faltantes.push('E-mail de comunicaciones');
  if (!/^\+?\d{8,15}$/.test((perfil.telefono || '').replace(/\s+/g, ''))) {
    faltantes.push('Teléfono válido (solo números, ej: +542932538775)');
  }
  if (!perfil.nombreUsuario?.trim()) faltantes.push('Nombre de usuario');
  if (direcciones.length === 0) {
    faltantes.push('Al menos una dirección de envío guardada');
  }

  return {
    completo: faltantes.length === 0,
    faltantes
  };
}

export default function Perfil() {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [seccionActiva, setSeccionActiva] = useState<
    'datos' | 'direcciones' | 'preguntas' | 'busquedas' | 'facturacion' | 'seguidos'
  >('datos');

  // Estado de los datos
  const [perfil, setPerfil] = useState<DatosPerfilUsuario>({
    nombreApellido: '',
    dni: '',
    estadoCivil: '',
    nombreElegido: '',
    condicionFiscal: 'Consumidor Final',
    emailComunicaciones: '',
    telefono: '',
    nombreUsuario: ''
  });

  const [campoEditando, setCampoEditando] = useState<keyof DatosPerfilUsuario | null>(null);
  const [valorTemporal, setValorTemporal] = useState('');
  const [errorValidacion, setErrorValidacion] = useState('');
  const [mensajeGuardado, setMensajeGuardado] = useState('');

  // Direcciones
  const [direcciones, setDirecciones] = useState<DireccionUsuario[]>([]);
  const [mostrarFormDireccion, setMostrarFormDireccion] = useState(false);
  const [nuevaDir, setNuevaDir] = useState({
    nombre_destinatario: '',
    calle: '',
    numero: '',
    piso: '',
    departamento: '',
    localidad: '',
    provincia: 'Buenos Aires',
    codigo_postal: ''
  });
  const [errorDireccion, setErrorDireccion] = useState('');

  // Preguntas, Búsquedas, Facturación y Seguidos
  const [misPreguntas, setMisPreguntas] = useState<any[]>([]);
  const [busquedasGuardadas, setBusquedasGuardadas] = useState<string[]>([]);
  const [nuevaBusqueda, setNuevaBusqueda] = useState('');
  const [misComprasFacturacion, setMisComprasFacturacion] = useState<any[]>([]);
  const [tiendasSeguidas, setTiendasSeguidas] = useState<TiendaSeguida[]>([]);

  useEffect(() => {
    if (!isAuthenticated || !user) {
      navigate('/login');
      return;
    }

    const nombreCompletoDefault = `${user.nombre} ${user.apellido || ''}`.trim();
    const usernameDefault = `${(user.apellido || '').toUpperCase()}${user.nombre.toUpperCase()}${user.id_usuario}`;

    // 1. Cargar Perfil
    const guardado = localStorage.getItem(`falu_perfil_${user.id_usuario}`);
    if (guardado) {
      setPerfil(JSON.parse(guardado));
    } else {
      const inicial: DatosPerfilUsuario = {
        nombreApellido: nombreCompletoDefault,
        dni: '',
        estadoCivil: '',
        nombreElegido: nombreCompletoDefault.toUpperCase(),
        condicionFiscal: 'Consumidor Final',
        emailComunicaciones: user.email,
        telefono: '',
        nombreUsuario: usernameDefault
      };
      setPerfil(inicial);
      localStorage.setItem(`falu_perfil_${user.id_usuario}`, JSON.stringify(inicial));
    }

    // 2. Cargar Direcciones
    const dirGuardadas = localStorage.getItem(`falu_direcciones_${user.id_usuario}`);
    if (dirGuardadas) setDirecciones(JSON.parse(dirGuardadas));

    // 3. Cargar Preguntas realizadas por este usuario
    const todasPreguntas = JSON.parse(
      localStorage.getItem('falu_preguntas_productos') || '[]'
    );
    const nombreBuscado = nombreCompletoDefault.toLowerCase();
    setMisPreguntas(
      todasPreguntas.filter(
        (p: any) =>
          Number(p.id_usuario) === Number(user.id_usuario) ||
          (p.usuario_nombre && p.usuario_nombre.toLowerCase() === nombreBuscado)
      )
    );

    // 4. Cargar Búsquedas guardadas
    const busq = localStorage.getItem(`falu_busquedas_${user.id_usuario}`);
    if (busq) setBusquedasGuardadas(JSON.parse(busq));

    // 5. Cargar Compras para Facturación
    const compras = JSON.parse(localStorage.getItem('falu_compras_usuarios') || '[]');
    const catalogo = JSON.parse(localStorage.getItem('falu_productos_locales') || '[]');
    const misC = compras
      .filter((c: any) => Number(c.id_usuario) === Number(user.id_usuario))
      .map((c: any, idx: number) => {
        const prod = catalogo.find(
          (p: any) => String(p.id_producto) === String(c.id_producto)
        );
        return {
          nro_factura: `B-0001-${String(idx + 1).padStart(6, '0')}`,
          fecha: c.fecha,
          titulo: prod?.titulo || `Producto #${c.id_producto}`,
          monto: prod?.precio || c.monto || 0
        };
      });
    setMisComprasFacturacion(misC);

    // 6. Cargar Tiendas/Usuarios seguidos
    const seg = localStorage.getItem(`falu_seguidos_${user.id_usuario}`);
    if (seg) setTiendasSeguidas(JSON.parse(seg));
  }, [isAuthenticated, user, navigate]);

  const abrirEditorCampo = (campo: keyof DatosPerfilUsuario) => {
    setErrorValidacion('');
    setCampoEditando(campo);
    setValorTemporal(perfil[campo] || '');
  };

  const guardarCampoPerfil = (e: FormEvent) => {
    e.preventDefault();
    if (!user || !campoEditando) return;

    const limpio = valorTemporal.trim();
    if (!limpio) {
      setErrorValidacion('Este campo no puede quedar vacío.');
      return;
    }

    // Validación numérica estricta para DNI y Teléfono
    if (campoEditando === 'dni' && !/^\d{7,9}$/.test(limpio)) {
      setErrorValidacion('El DNI debe contener únicamente números (entre 7 y 9 dígitos, sin puntos).');
      return;
    }

    if (campoEditando === 'telefono' && !/^\+?\d{8,15}$/.test(limpio.replace(/\s+/g, ''))) {
      setErrorValidacion('El teléfono debe contener únicamente números (opcional "+" adelante, de 8 a 15 dígitos).');
      return;
    }

    const actualizado = { ...perfil, [campoEditando]: limpio };
    setPerfil(actualizado);
    localStorage.setItem(`falu_perfil_${user.id_usuario}`, JSON.stringify(actualizado));
    setCampoEditando(null);
    setMensajeGuardado('Dato actualizado correctamente.');
    setTimeout(() => setMensajeGuardado(''), 3000);
  };

  const handleAgregarDireccion = (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setErrorDireccion('');

    if (!/^\d+$/.test(nuevaDir.numero.trim())) {
      setErrorDireccion('El número de calle (altura) debe ser estrictamente numérico.');
      return;
    }
    if (!/^\d{4,8}$/.test(nuevaDir.codigo_postal.trim())) {
      setErrorDireccion('El código postal debe contener solo números.');
      return;
    }

    const nueva: DireccionUsuario = {
      id_direccion: Date.now(),
      nombre_destinatario: nuevaDir.nombre_destinatario.trim(),
      calle: nuevaDir.calle.trim(),
      numero: nuevaDir.numero.trim(),
      piso: nuevaDir.piso.trim(),
      departamento: nuevaDir.departamento.trim(),
      localidad: nuevaDir.localidad.trim(),
      provincia: nuevaDir.provincia.trim(),
      codigo_postal: nuevaDir.codigo_postal.trim(),
      predeterminada: direcciones.length === 0
    };

    const actualizadas = [...direcciones, nueva];
    setDirecciones(actualizadas);
    localStorage.setItem(
      `falu_direcciones_${user.id_usuario}`,
      JSON.stringify(actualizadas)
    );
    setMostrarFormDireccion(false);
    setNuevaDir({
      nombre_destinatario: '',
      calle: '',
      numero: '',
      piso: '',
      departamento: '',
      localidad: '',
      provincia: 'Buenos Aires',
      codigo_postal: ''
    });
  };

  const eliminarDireccion = (idDir: number) => {
    if (!user) return;
    const actualizadas = direcciones.filter((d) => d.id_direccion !== idDir);
    setDirecciones(actualizadas);
    localStorage.setItem(
      `falu_direcciones_${user.id_usuario}`,
      JSON.stringify(actualizadas)
    );
  };

  const agregarBusquedaGuardada = (e: FormEvent) => {
    e.preventDefault();
    if (!user || !nuevaBusqueda.trim()) return;
    const actualizadas = [
      nuevaBusqueda.trim(),
      ...busquedasGuardadas.filter((b) => b !== nuevaBusqueda.trim())
    ];
    setBusquedasGuardadas(actualizadas);
    localStorage.setItem(
      `falu_busquedas_${user.id_usuario}`,
      JSON.stringify(actualizadas)
    );
    setNuevaBusqueda('');
  };

  const eliminarBusqueda = (termino: string) => {
    if (!user) return;
    const actualizadas = busquedasGuardadas.filter((b) => b !== termino);
    setBusquedasGuardadas(actualizadas);
    localStorage.setItem(
      `falu_busquedas_${user.id_usuario}`,
      JSON.stringify(actualizadas)
    );
  };

  const dejarDeSeguir = (idVendedor: number) => {
    if (!user) return;
    const actualizadas = tiendasSeguidas.filter((t) => t.id_vendedor !== idVendedor);
    setTiendasSeguidas(actualizadas);
    localStorage.setItem(
      `falu_seguidos_${user.id_usuario}`,
      JSON.stringify(actualizadas)
    );
  };

  const estadoVerificacion = user
    ? verificarPerfilCompleto(user.id_usuario)
    : { completo: false, faltantes: [] };

  const dniValido = /^\d{7,9}$/.test((perfil.dni || '').trim());
  const telefonoValido = /^\+?\d{8,15}$/.test((perfil.telefono || '').replace(/\s+/g, ''));

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <Navbar />

      <main className="max-w-6xl w-full mx-auto px-4 py-8 flex-1">
        {/* Banner de estado de habilitación para comprar */}
        <div
          className={`mb-6 rounded-2xl p-4 border flex items-start gap-3 ${
            estadoVerificacion.completo
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-amber-50 border-amber-200 text-amber-900'
          }`}
        >
          {estadoVerificacion.completo ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          )}
          <div className="text-xs">
            <p className="font-bold text-sm">
              {estadoVerificacion.completo
                ? 'Tu perfil está completo y habilitado para realizar compras en Falú.'
                : 'Requisitos pendientes para poder comprar en Falú:'}
            </p>
            {!estadoVerificacion.completo && (
              <ul className="list-disc list-inside mt-1 space-y-0.5 text-amber-800">
                {estadoVerificacion.faltantes.map((f, i) => (
                  <li key={i}>{f}</li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Pestañas de navegación del Perfil */}
        <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-4 no-scrollbar">
          {[
            { id: 'datos', label: 'Información y Datos', icon: IdCard },
            { id: 'direcciones', label: `Direcciones (${direcciones.length})`, icon: MapPin },
            { id: 'preguntas', label: `Mis preguntas (${misPreguntas.length})`, icon: MessageCircleQuestion },
            { id: 'busquedas', label: `Búsquedas guardadas (${busquedasGuardadas.length})`, icon: Search },
            { id: 'facturacion', label: 'Facturación de compras', icon: Receipt },
            { id: 'seguidos', label: `Tiendas seguidas (${tiendasSeguidas.length})`, icon: Store }
          ].map((tab) => {
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

        {mensajeGuardado && (
          <div className="mb-4 bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-2.5 rounded-xl text-xs font-bold">
            {mensajeGuardado}
          </div>
        )}

        {/* SECCIÓN 1: TARJETAS IDÉNTICAS A LA CAPTURA 1 (Información personal, Datos fiscales, Datos de la cuenta) */}
        {seccionActiva === 'datos' && (
          <div className="space-y-6">
            
            {/* TARJETA 1: Información personal */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100">
                <h2 className="text-lg font-bold text-slate-900">Información personal</h2>
              </div>

              <div className="divide-y divide-slate-100">
                {/* Nombre y apellido */}
                <button
                  type="button"
                  onClick={() => abrirEditorCampo('nombreApellido')}
                  className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors text-left"
                >
                  <div className="flex items-start gap-4">
                    <IdCard className="w-5 h-5 text-slate-500 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        {perfil.nombreApellido || 'Sin completar'}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">Nombre y apellido.</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {perfil.nombreApellido.trim() && (
                      <CheckCircle2 className="w-5 h-5 fill-emerald-500 text-white" />
                    )}
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </div>
                </button>

                {/* Número de DNI */}
                <button
                  type="button"
                  onClick={() => abrirEditorCampo('dni')}
                  className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors text-left"
                >
                  <div className="flex items-start gap-4">
                    <IdCard className="w-5 h-5 text-slate-500 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        {perfil.dni || 'Hacé clic para cargar tu DNI (Obligatorio)'}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">Número de DNI.</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {dniValido && (
                      <CheckCircle2 className="w-5 h-5 fill-emerald-500 text-white" />
                    )}
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </div>
                </button>

                {/* Estado civil */}
                <button
                  type="button"
                  onClick={() => abrirEditorCampo('estadoCivil')}
                  className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors text-left"
                >
                  <div className="flex items-start gap-4">
                    <UserCheck className="w-5 h-5 text-slate-500 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        {perfil.estadoCivil || 'Seleccionar estado civil (Ej: Soltero/a)'}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">Estado civil.</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {perfil.estadoCivil.trim() && (
                      <CheckCircle2 className="w-5 h-5 fill-emerald-500 text-white" />
                    )}
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </div>
                </button>

                {/* Nombre elegido */}
                <button
                  type="button"
                  onClick={() => abrirEditorCampo('nombreElegido')}
                  className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors text-left"
                >
                  <div className="flex items-start gap-4">
                    <Award className="w-5 h-5 text-slate-500 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        {perfil.nombreElegido || 'Sin completar'}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">Nombre elegido.</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {perfil.nombreElegido.trim() && (
                      <CheckCircle2 className="w-5 h-5 fill-emerald-500 text-white" />
                    )}
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </div>
                </button>
              </div>
            </div>

            {/* TARJETA 2: Datos fiscales */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100">
                <h2 className="text-lg font-bold text-slate-900">Datos fiscales</h2>
              </div>

              <button
                type="button"
                onClick={() => abrirEditorCampo('condicionFiscal')}
                className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors text-left"
              >
                <div className="flex items-start gap-4">
                  <FileSpreadsheet className="w-5 h-5 text-slate-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      {perfil.condicionFiscal || 'Consumidor Final'}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">Condición fiscal.</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {perfil.condicionFiscal.trim() && (
                    <CheckCircle2 className="w-5 h-5 fill-emerald-500 text-white" />
                  )}
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </div>
              </button>
            </div>

            {/* TARJETA 3: Datos de la cuenta */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100">
                <h2 className="text-lg font-bold text-slate-900">Datos de la cuenta</h2>
              </div>

              <div className="divide-y divide-slate-100">
                {/* E-mail */}
                <button
                  type="button"
                  onClick={() => abrirEditorCampo('emailComunicaciones')}
                  className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors text-left"
                >
                  <div className="flex items-start gap-4">
                    <Mail className="w-5 h-5 text-slate-500 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        {perfil.emailComunicaciones || 'Sin completar'}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        E-mail donde recibís comunicaciones.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {perfil.emailComunicaciones.trim() && (
                      <CheckCircle2 className="w-5 h-5 fill-emerald-500 text-white" />
                    )}
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </div>
                </button>

                {/* Teléfono */}
                <button
                  type="button"
                  onClick={() => abrirEditorCampo('telefono')}
                  className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors text-left"
                >
                  <div className="flex items-start gap-4">
                    <Phone className="w-5 h-5 text-slate-500 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        {perfil.telefono || 'Hacé clic para cargar tu número (Obligatorio)'}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Número donde recibís códigos de verificación y comunicaciones.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {telefonoValido && (
                      <CheckCircle2 className="w-5 h-5 fill-emerald-500 text-white" />
                    )}
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </div>
                </button>

                {/* Nombre de usuario */}
                <button
                  type="button"
                  onClick={() => abrirEditorCampo('nombreUsuario')}
                  className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors text-left"
                >
                  <div className="flex items-start gap-4">
                    <User className="w-5 h-5 text-slate-500 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        {perfil.nombreUsuario || 'Sin completar'}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">Nombre de usuario.</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {perfil.nombreUsuario.trim() && (
                      <CheckCircle2 className="w-5 h-5 fill-emerald-500 text-white" />
                    )}
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </div>
                </button>
              </div>
            </div>

          </div>
        )}

        {/* SECCIÓN 2: DIRECCIONES GUARDADAS */}
        {seccionActiva === 'direcciones' && (
          <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Mis direcciones</h2>
                <p className="text-xs text-slate-500">
                  Necesitás al menos una dirección cargada para recibir tus compras
                </p>
              </div>
              <button
                type="button"
                onClick={() => setMostrarFormDireccion(!mostrarFormDireccion)}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                Agregar dirección
              </button>
            </div>

            {mostrarFormDireccion && (
              <form
                onSubmit={handleAgregarDireccion}
                className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4"
              >
                {errorDireccion && (
                  <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-lg text-xs font-bold">
                    {errorDireccion}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Nombre del destinatario *
                    </label>
                    <input
                      type="text"
                      required
                      value={nuevaDir.nombre_destinatario}
                      onChange={(e) =>
                        setNuevaDir({ ...nuevaDir, nombre_destinatario: e.target.value })
                      }
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Calle *
                    </label>
                    <input
                      type="text"
                      required
                      value={nuevaDir.calle}
                      onChange={(e) => setNuevaDir({ ...nuevaDir, calle: e.target.value })}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Número (Solo números) *
                    </label>
                    <input
                      type="text"
                      required
                      value={nuevaDir.numero}
                      onChange={(e) => setNuevaDir({ ...nuevaDir, numero: e.target.value })}
                      placeholder="Ej: 1250"
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Localidad *
                    </label>
                    <input
                      type="text"
                      required
                      value={nuevaDir.localidad}
                      onChange={(e) =>
                        setNuevaDir({ ...nuevaDir, localidad: e.target.value })
                      }
                      placeholder="Ej: Punta Alta"
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Provincia *
                    </label>
                    <input
                      type="text"
                      required
                      value={nuevaDir.provincia}
                      onChange={(e) =>
                        setNuevaDir({ ...nuevaDir, provincia: e.target.value })
                      }
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Código Postal (Números) *
                    </label>
                    <input
                      type="text"
                      required
                      value={nuevaDir.codigo_postal}
                      onChange={(e) =>
                        setNuevaDir({ ...nuevaDir, codigo_postal: e.target.value })
                      }
                      placeholder="Ej: 8109"
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Piso / Depto (Opcional)
                    </label>
                    <input
                      type="text"
                      value={nuevaDir.piso}
                      onChange={(e) => setNuevaDir({ ...nuevaDir, piso: e.target.value })}
                      placeholder="Ej: 2 B"
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setMostrarFormDireccion(false)}
                    className="px-4 py-2 text-xs font-bold text-slate-600"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="bg-blue-600 text-white text-xs font-bold px-5 py-2 rounded-lg"
                  >
                    Guardar dirección
                  </button>
                </div>
              </form>
            )}

            {direcciones.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center">
                No tenés direcciones guardadas todavía.
              </p>
            ) : (
              <div className="space-y-3">
                {direcciones.map((d) => (
                  <div
                    key={d.id_direccion}
                    className="p-4 rounded-xl border border-slate-200 flex items-center justify-between"
                  >
                    <div className="flex items-start gap-3">
                      <MapPin className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-bold text-slate-900">
                          {d.calle} {d.numero} {d.piso ? `(${d.piso})` : ''}
                        </p>
                        <p className="text-xs text-slate-500">
                          CP {d.codigo_postal} - {d.localidad}, {d.provincia}
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Recibe: {d.nombre_destinatario}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => eliminarDireccion(d.id_direccion)}
                      className="text-slate-400 hover:text-red-600 p-2"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* SECCIÓN 3: PREGUNTAS QUE HIZO EL USUARIO */}
        {seccionActiva === 'preguntas' && (
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="text-lg font-bold text-slate-900 mb-4">
              Preguntas que realizaste
            </h2>
            {misPreguntas.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center">
                Todavía no hiciste preguntas en ninguna publicación.
              </p>
            ) : (
              <div className="space-y-4">
                {misPreguntas.map((p) => (
                  <div
                    key={p.id_pregunta}
                    className="p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div>
                      <span className="text-[11px] text-slate-400">{p.fecha}</span>
                      <p className="text-sm font-bold text-slate-800">{p.texto_pregunta}</p>
                      {p.texto_respuesta ? (
                        <p className="text-xs text-blue-800 mt-1 pl-3 border-l-2 border-blue-600">
                          Respuesta: {p.texto_respuesta}
                        </p>
                      ) : (
                        <span className="text-[11px] text-amber-600 font-semibold">
                          Aguardando respuesta del vendedor...
                        </span>
                      )}
                    </div>
                    <Link
                      to={`/producto/${p.id_producto}`}
                      className="text-xs font-bold text-blue-600 hover:underline shrink-0"
                    >
                      Ver publicación
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      {/* SECCIÓN 4: BÚSQUEDAS GUARDADAS (Automáticas desde el buscador, de izquierda a derecha) */}
        {seccionActiva === 'busquedas' && (
          <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Búsquedas guardadas</h2>
                <p className="text-xs text-slate-500">
                  Tus búsquedas realizadas en Falú se guardan automáticamente acá para acceder con un clic
                </p>
              </div>
              {busquedasGuardadas.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    if (!user) return;
                    setBusquedasGuardadas([]);
                    localStorage.removeItem(`falu_busquedas_${user.id_usuario}`);
                    window.dispatchEvent(new Event('falu_actualizacion'));
                  }}
                  className="text-xs font-bold text-red-600 hover:underline"
                >
                  Borrar historial
                </button>
              )}
            </div>

            {busquedasGuardadas.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center">
                Todavía no realizaste búsquedas. Todo lo que busques en la barra superior aparecerá acá automáticamente.
              </p>
            ) : (
              /* Se acomodan de izquierda a derecha y bajan al siguiente renglón cuando no hay más espacio */
              <div className="flex flex-row flex-wrap items-center gap-2.5 pt-2">
                {busquedasGuardadas.map((termino) => (
                  <div
                    key={termino}
                    className="inline-flex items-center gap-2 bg-slate-100 hover:bg-slate-200/80 px-4 py-2 rounded-full text-xs font-semibold text-slate-800 transition-colors"
                  >
                    <button
                      type="button"
                      onClick={() => navigate(`/?q=${encodeURIComponent(termino)}`)}
                      className="hover:text-blue-600"
                    >
                      {termino}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        eliminarBusqueda(termino);
                        window.dispatchEvent(new Event('falu_actualizacion'));
                      }}
                      title="Eliminar búsqueda"
                      className="text-slate-400 hover:text-red-600 font-bold"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        {/* SECCIÓN 5: FACTURACIÓN DE SUS COMPRAS */}
        {seccionActiva === 'facturacion' && (
          <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Facturación de mis compras
              </h2>
              <p className="text-xs text-slate-500">
                Comprobantes emitidos bajo condición fiscal:{' '}
                <strong>{perfil.condicionFiscal}</strong> | DNI:{' '}
                <strong>{perfil.dni || 'Sin registrar'}</strong>
              </p>
            </div>

            {misComprasFacturacion.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center">
                No registrás comprobantes de facturación todavía.
              </p>
            ) : (
              <div className="divide-y divide-slate-100">
                {misComprasFacturacion.map((fac, i) => (
                  <div
                    key={i}
                    className="py-3.5 flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-bold text-blue-900 block">
                        Factura {fac.nro_factura}
                      </span>
                      <span className="text-slate-700 font-medium">{fac.titulo}</span>
                      <span className="text-slate-400 block">{fac.fecha}</span>
                    </div>
                    <span className="text-sm font-extrabold text-slate-900">
                      ARS ${Number(fac.monto).toLocaleString('es-AR')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* SECCIÓN 6: TIENDAS Y USUARIOS QUE SIGUE */}
        {seccionActiva === 'seguidos' && (
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="text-lg font-bold text-slate-900 mb-4">
              Tiendas y vendedores que seguís
            </h2>
            {tiendasSeguidas.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center">
                Aún no seguís a ningún vendedor. Podés seguir a una tienda desde la página de cualquiera de sus productos.
              </p>
            ) : (
              <div className="space-y-3">
                {tiendasSeguidas.map((t) => (
                  <div
                    key={t.id_vendedor}
                    className="p-4 rounded-xl border border-slate-200 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <Store className="w-5 h-5 text-blue-900" />
                      <div>
                        <p className="text-sm font-bold text-slate-900">
                          {t.nombre_tienda}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          Siguiendo desde el {t.fecha_seguimiento}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => dejarDeSeguir(t.id_vendedor)}
                      className="text-xs font-bold text-red-600 hover:underline"
                    >
                      Dejar de seguir
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* MODAL PARA EDITAR UN CAMPO DEL PERFIL */}
      {campoEditando && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-3">
              Actualizar dato del perfil
            </h3>

            {errorValidacion && (
              <div className="mb-3 bg-red-50 border border-red-200 text-red-600 p-2.5 rounded-lg text-xs font-semibold">
                {errorValidacion}
              </div>
            )}

            <form onSubmit={guardarCampoPerfil} className="space-y-4">
              {campoEditando === 'estadoCivil' ? (
                <select
                  value={valorTemporal}
                  onChange={(e) => setValorTemporal(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm bg-white"
                >
                  <option value="">Seleccionar...</option>
                  <option value="Soltero/a">Soltero/a</option>
                  <option value="Casado/a">Casado/a</option>
                  <option value="Divorciado/a">Divorciado/a</option>
                  <option value="Viudo/a">Viudo/a</option>
                </select>
              ) : campoEditando === 'condicionFiscal' ? (
                <select
                  value={valorTemporal}
                  onChange={(e) => setValorTemporal(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm bg-white"
                >
                  <option value="Consumidor Final">Consumidor Final</option>
                  <option value="Monotributista">Monotributista</option>
                  <option value="Responsable Inscripto">Responsable Inscripto</option>
                  <option value="Exento">Exento</option>
                </select>
              ) : (
                <input
                  type="text"
                  value={valorTemporal}
                  onChange={(e) => setValorTemporal(e.target.value)}
                  placeholder={
                    campoEditando === 'dni'
                      ? 'Solo números (Ej: 46901000)'
                      : campoEditando === 'telefono'
                      ? 'Solo números (Ej: +542932538775)'
                      : 'Ingresá el valor...'
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-blue-600 outline-none"
                />
              )}

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setCampoEditando(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-5 py-2 rounded-xl"
                >
                  Guardar
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