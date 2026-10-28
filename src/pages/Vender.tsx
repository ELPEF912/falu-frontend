import { useState, type ChangeEvent, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShoppingBag,
  Car,
  Sparkles,
  Camera,
  X,
  Plus,
  Trash2,
  ArrowLeft,
  CheckCircle2
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
interface AtributoFila {
  clave: string;
  valor: string;
}

const CATEGORIAS_PRODUCTOS = [
  'Tecnología',
  'Hogar y Muebles',
  'Deportes y Fitness',
  'Herramientas',
  'Gaming y Consolas',
  'Electrodomésticos',
  'Moda y Accesorios'
];

export default function Vender() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  // Control de pasos
  const [paso, setPaso] = useState<1 | 2>(1);
  const [tipoPublicacion, setTipoPublicacion] = useState<'producto' | 'vehiculo'>('producto');

  // Datos Paso 1
  const [titulo, setTitulo] = useState('');
  const [imagenes, setImagenes] = useState<string[]>([]);
  const [errorPaso1, setErrorPaso1] = useState('');

  // Datos Paso 2
  const [precio, setPrecio] = useState('');
  const [stock, setStock] = useState('1');
  const [categoria, setCategoria] = useState('Tecnología');
  const [descripcion] = useState('');
  const [puntosArticulo, setPuntosArticulo] = useState<string[]>([
  '',
  ''
  ]);

  // Tablas de Características (Se adaptan según sea Producto o Vehículo)
  const [principales, setPrincipales] = useState<AtributoFila[]>([
    { clave: 'Marca', valor: '' },
    { clave: 'Línea', valor: '' },
    { clave: 'Modelo', valor: '' },
    { clave: 'Color', valor: '' }
  ]);

  // Dimensiones (Altura x Largo x Profundidad)
  const [altura, setAltura] = useState('');
  const [largo, setLargo] = useState('');
  const [profundidad, setProfundidad] = useState('');

  // Otros (Propiedades adicionales)
  const [otros, setOtros] = useState<AtributoFila[]>([
    { clave: 'Materiales', valor: '' },
    { clave: 'Condición', valor: 'Nuevo' }
  ]);

  const [enviando, setEnviando] = useState(false);
  const [errorGeneral, setErrorGeneral] = useState('');

  // Cambiar entre Productos y Vehículos ajusta las filas sugeridas
  const cambiarTipo = (nuevoTipo: 'producto' | 'vehiculo') => {
    setTipoPublicacion(nuevoTipo);
    if (nuevoTipo === 'vehiculo') {
      setCategoria('Vehículos y Repuestos');
      setPrincipales([
        { clave: 'Marca', valor: '' },
        { clave: 'Modelo', valor: '' },
        { clave: 'Año', valor: '' },
        { clave: 'Kilómetros', valor: '' },
        { clave: 'Color', valor: '' }
      ]);
      setOtros([
        { clave: 'Transmisión', valor: '' },
        { clave: 'Combustible', valor: '' },
        { clave: 'Único dueño', valor: 'Sí' }
      ]);
    } else {
      setCategoria('Tecnología');
      setPrincipales([
        { clave: 'Marca', valor: '' },
        { clave: 'Línea', valor: '' },
        { clave: 'Modelo', valor: '' },
        { clave: 'Color', valor: '' }
      ]);
      setOtros([
        { clave: 'Materiales', valor: '' },
        { clave: 'Condición', valor: 'Nuevo' }
      ]);
    }
  };

  // Subir hasta 8 fotos (Las comprime automáticamente para no saturar la BD)
  const handleSubirFotos = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const cantidadDisponible = 8 - imagenes.length;
    if (cantidadDisponible <= 0) {
      setErrorPaso1('Ya alcanzaste el límite máximo de 8 fotos.');
      return;
    }

    const archivosSeleccionados = Array.from(files).slice(0, cantidadDisponible);

    archivosSeleccionados.forEach((file) => {
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

          setImagenes((prev) => (prev.length < 8 ? [...prev, dataUrl] : prev));
        };
        if (event.target?.result) {
          img.src = event.target.result as string;
        }
      };
      reader.readAsDataURL(file);
    });

    setErrorPaso1('');
    e.target.value = '';
  };

  const eliminarFoto = (index: number) => {
    setImagenes((prev) => prev.filter((_, i) => i !== index));
  };

  const avanzarPaso2 = () => {
    if (!titulo.trim()) {
      setErrorPaso1('Por favor, ingresá el nombre de lo que querés publicar.');
      return;
    }
    if (imagenes.length === 0) {
      setErrorPaso1('Subí al menos 1 foto (podés cargar hasta 8).');
      return;
    }

    setErrorPaso1('');
    setPaso(2);
  };


  // Funciones para manejar las tablas dinámicas de Características y Otros
  const actualizarFila = (
    lista: AtributoFila[],
    setLista: (val: AtributoFila[]) => void,
    index: number,
    campo: 'clave' | 'valor',
    nuevoTexto: string
  ) => {
    const copia = [...lista];
    copia[index][campo] = nuevoTexto;
    setLista(copia);
  };

  const agregarFila = (lista: AtributoFila[], setLista: (val: AtributoFila[]) => void) => {
    setLista([...lista, { clave: '', valor: '' }]);
  };

  const eliminarFila = (
    lista: AtributoFila[],
    setLista: (val: AtributoFila[]) => void,
    index: number
  ) => {
    if (lista.length <= 1) return;
    setLista(lista.filter((_, i) => i !== index));
  };

  const handlePublicar = async (e: FormEvent) => {
    e.preventDefault();
    setErrorGeneral('');
    setEnviando(true);

    const principalesLimpias = principales.filter(
      (f) => f.clave.trim() !== '' && f.valor.trim() !== ''
    );
    const otrosLimpios = otros.filter(
      (f) => f.clave.trim() !== '' && f.valor.trim() !== ''
    );

    const dimensionesFormateadas =
      altura.trim() || largo.trim() || profundidad.trim()
        ? `${altura || '0'} cm x ${largo || '0'} cm x ${profundidad || '0'} cm`
        : '';

if (!isAuthenticated || !user) {
      navigate('/login');
      return;
    }
    const descripcionFinal = puntosArticulo
      .map((p) => p.trim())
      .filter((p) => p !== '')
      .join('\n');

    const payloadProducto = {
      id_producto: Date.now(),
      id_vendedor: user.id_usuario,
      vendedor_nombre: `${user.nombre} ${user.apellido || ''}`.trim(),
      estado: 'activo',
      motivo_baja: null,
      tipo_publicacion: tipoPublicacion,
      titulo: titulo.trim(),
      precio: Number(precio),
      stock: Number(stock) || 1,
      categoria: tipoPublicacion === 'vehiculo' ? 'Vehículos y Repuestos' : categoria,
      imagen_url: imagenes[0],
      imagenes: imagenes,
      descripcion: descripcionFinal || descripcion.trim(),
      caracteristicas: {
        principales: principalesLimpias,
        dimensiones: dimensionesFormateadas,
        otros: otrosLimpios
      }
    };

    try {
      // 1. Intento guardar en el Backend PostgreSQL
      const res = await api.post('/products', payloadProducto);
      const idFinal = res.data?.id_producto || payloadProducto.id_producto;

      // 2. Guardo también copia en localStorage para garantizar que las 8 fotos y tablas se vean siempre
      const guardadosLocal = JSON.parse(localStorage.getItem('falu_productos_locales') || '[]');
      localStorage.setItem(
        'falu_productos_locales',
        JSON.stringify([{ ...payloadProducto, id_producto: idFinal }, ...guardadosLocal])
      );

      navigate(`/producto/${idFinal}`);
    } catch {
      // Si el backend aún no tiene creada la ruta POST /products, lo persistimos localmente para probar el circuito completo
      const guardadosLocal = JSON.parse(localStorage.getItem('falu_productos_locales') || '[]');
      localStorage.setItem(
        'falu_productos_locales',
        JSON.stringify([payloadProducto, ...guardadosLocal])
      );
      navigate(`/producto/${payloadProducto.id_producto}`);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <Navbar />
      {paso === 1 && (
        <>
          {/* Pestañas Superiores: Solo Productos y Vehículos */}
          <div className="bg-white border-b border-slate-200">
            <div className="max-w-md mx-auto grid grid-cols-2">
              <button
                type="button"
                onClick={() => cambiarTipo('producto')}
                className={`flex flex-col items-center justify-center py-4 gap-1.5 border-b-2 transition-all ${
                  tipoPublicacion === 'producto'
                    ? 'border-blue-600 text-blue-600 font-bold'
                    : 'border-transparent text-slate-600 hover:text-slate-900 font-medium'
                }`}
              >
                <ShoppingBag className="w-5 h-5" />
                <span className="text-xs sm:text-sm">Productos</span>
              </button>

              <button
                type="button"
                onClick={() => cambiarTipo('vehiculo')}
                className={`flex flex-col items-center justify-center py-4 gap-1.5 border-b-2 transition-all ${
                  tipoPublicacion === 'vehiculo'
                    ? 'border-blue-600 text-blue-600 font-bold'
                    : 'border-transparent text-slate-600 hover:text-slate-900 font-medium'
                }`}
              >
                <Car className="w-5 h-5" />
                <span className="text-xs sm:text-sm">Vehículos</span>
              </button>
            </div>
          </div>

          {/* Contenedor Principal Paso 1 */}
          <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-12 flex flex-col items-center">
            <div className="flex items-center gap-2.5 mb-8 text-center">
              <Sparkles className="w-7 h-7 text-blue-600 shrink-0 fill-blue-600" />
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                {tipoPublicacion === 'producto'
                  ? '¿Qué producto querés publicar?'
                  : '¿Qué vehículo querés publicar?'}
              </h1>
            </div>

            {/* Tarjeta Blanca Principal*/}
            <div className="w-full bg-white rounded-3xl shadow-md border border-slate-200/80 p-6 sm:p-8">
              {errorPaso1 && (
                <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-2.5 rounded-xl text-xs font-semibold">
                  {errorPaso1}
                </div>
              )}

              {/* Input de Nombre + Botón Continuar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pb-5 border-b border-slate-100">
                <input
                  type="text"
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  placeholder={
                    tipoPublicacion === 'producto'
                      ? 'Ej: Consola PlayStation 5 o Mochila Portanotebook Milano'
                      : 'Ej: Ford Fiesta Kinetic 1.6 SE 2018 5 Puertas'
                  }
                  className="flex-1 text-base sm:text-lg text-slate-800 placeholder-slate-400 focus:outline-none py-2"
                />
                <button
                  type="button"
                  onClick={avanzarPaso2}
                  disabled={!titulo.trim() || imagenes.length === 0}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold text-sm px-6 py-2.5 rounded-lg transition-colors shrink-0"
                >
                  Continuar
                </button>
              </div>

              {/* Botón de Subir Fotos (Máximo 8) */}
              <div className="pt-5">
                <div className="flex items-center justify-between mb-3">
                  <label className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-slate-300 hover:border-blue-600 text-xs sm:text-sm font-semibold text-slate-700 hover:text-blue-600 cursor-pointer transition-colors">
                    <Camera className="w-4 h-4" />
                    <span>Subir fotos ({imagenes.length}/8)</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleSubirFotos}
                      className="hidden"
                    />
                  </label>
                  <span className="text-xs text-slate-400">
                    La primera foto será la portada
                  </span>
                </div>

                {/* Grilla de previsualización de hasta 8 fotos */}
                {imagenes.length > 0 && (
                  <div className="grid grid-cols-4 sm:grid-cols-8 gap-2.5 mt-4">
                    {imagenes.map((imgSrc, idx) => (
                      <div
                        key={idx}
                        className={`relative aspect-square rounded-xl overflow-hidden border-2 ${
                          idx === 0 ? 'border-blue-600' : 'border-slate-200'
                        }`}
                      >
                        <img
                          src={imgSrc}
                          alt={`Foto ${idx + 1}`}
                          className="w-full h-full object-cover"
                        />
                        {idx === 0 && (
                          <span className="absolute bottom-0 inset-x-0 bg-blue-600 text-white text-[9px] font-bold text-center py-0.5">
                            Portada
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => eliminarFoto(idx)}
                          className="absolute top-1 right-1 bg-black/70 hover:bg-red-600 text-white rounded-full p-0.5 transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </main>
        </>
      )}

      {/*CARACTERÍSTICAS PRINCIPALES, DIMENSIONES Y OTROS*/}
      {paso === 2 && (
        <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-8">
          <button
            type="button"
            onClick={() => setPaso(1)}
            className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Modificar título o fotos ({imagenes.length}/8 cargadas)
          </button>

          <form onSubmit={handlePublicar} className="space-y-8">
            {/* Resumen Superior + Precio y Stock */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <div className="flex flex-col md:flex-row gap-6 items-start md:items-center justify-between pb-6 border-b border-slate-100">
                <div className="flex items-center gap-4">
                  <img
                    src={imagenes[0]}
                    alt={titulo}
                    className="w-16 h-16 rounded-xl object-cover border border-slate-200"
                  />
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full">
                      {tipoPublicacion === 'producto' ? 'Producto' : 'Vehículo'}
                    </span>
                    <h2 className="text-xl font-extrabold text-slate-900 mt-1">{titulo}</h2>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Precio (ARS) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={precio}
                    onChange={(e) => setPrecio(e.target.value)}
                    placeholder="Ej: 45000"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-blue-600 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Stock disponible *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={stock}
                    onChange={(e) => setStock(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-blue-600 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Categoría *
                  </label>
                  {tipoPublicacion === 'vehiculo' ? (
                    <input
                      type="text"
                      disabled
                      value="Vehículos y Repuestos"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-100 text-slate-600 text-sm font-semibold"
                    />
                  ) : (
                    <select
                      value={categoria}
                      onChange={(e) => setCategoria(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm bg-white focus:ring-2 focus:ring-blue-600 outline-none"
                    >
                      {CATEGORIAS_PRODUCTOS.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
            </div>

            {/* BLOQUE DE CARACTERÍSTICAS DEL PRODUCTO*/}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8">
              <h3 className="text-xl font-bold text-slate-900 mb-6">
                Características del {tipoPublicacion}
              </h3>

              {errorGeneral && (
                <div className="mb-4 bg-red-50 text-red-600 p-3 rounded-xl text-xs font-semibold">
                  {errorGeneral}
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                
                {/* COLUMNA IZQUIERDA: Características principales */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-base font-bold text-slate-800">
                      Características principales
                    </h4>
                    <button
                      type="button"
                      onClick={() => agregarFila(principales, setPrincipales)}
                      className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Agregar fila
                    </button>
                  </div>

                  <div className="rounded-xl overflow-hidden border border-slate-200">
                    {principales.map((item, idx) => (
                      <div
                        key={idx}
                        className={`flex items-center gap-2 p-2.5 ${
                          idx % 2 === 0 ? 'bg-slate-100/90' : 'bg-white'
                        }`}
                      >
                        <input
                          type="text"
                          value={item.clave}
                          onChange={(e) =>
                            actualizarFila(principales, setPrincipales, idx, 'clave', e.target.value)
                          }
                          placeholder="Característica (Ej: Marca)"
                          className="w-2/5 px-2.5 py-1.5 text-xs font-semibold text-slate-800 bg-transparent border border-transparent focus:border-slate-300 focus:bg-white rounded outline-none"
                        />
                        <input
                          type="text"
                          value={item.valor}
                          onChange={(e) =>
                            actualizarFila(principales, setPrincipales, idx, 'valor', e.target.value)
                          }
                          placeholder="Valor (Ej: Madu)"
                          className="flex-1 px-2.5 py-1.5 text-xs text-slate-700 bg-white border border-slate-200 rounded focus:border-blue-600 outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => eliminarFila(principales, setPrincipales, idx)}
                          className="text-slate-400 hover:text-red-500 p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* COLUMNA DERECHA: Dimensiones y Otros */}
                <div className="space-y-6">
                  
                  {/* Sub-bloque: Dimensiones */}
                  <div>
                    <h4 className="text-base font-bold text-slate-800 mb-3">Dimensiones</h4>
                    <div className="bg-slate-100/90 rounded-xl p-4 border border-slate-200">
                      <label className="block text-xs font-semibold text-slate-700 mb-2">
                        Altura x Largo x Profundidad (en cm)
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        <input
                          type="number"
                          placeholder="Altura (28)"
                          value={altura}
                          onChange={(e) => setAltura(e.target.value)}
                          className="px-3 py-2 text-xs bg-white rounded-lg border border-slate-200 focus:border-blue-600 outline-none"
                        />
                        <input
                          type="number"
                          placeholder="Largo (39)"
                          value={largo}
                          onChange={(e) => setLargo(e.target.value)}
                          className="px-3 py-2 text-xs bg-white rounded-lg border border-slate-200 focus:border-blue-600 outline-none"
                        />
                        <input
                          type="number"
                          placeholder="Prof. (10)"
                          value={profundidad}
                          onChange={(e) => setProfundidad(e.target.value)}
                          className="px-3 py-2 text-xs bg-white rounded-lg border border-slate-200 focus:border-blue-600 outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Sub-bloque: Otros */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-base font-bold text-slate-800">Otros</h4>
                      <button
                        type="button"
                        onClick={() => agregarFila(otros, setOtros)}
                        className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Agregar fila
                      </button>
                    </div>

                    <div className="rounded-xl overflow-hidden border border-slate-200">
                      {otros.map((item, idx) => (
                        <div
                          key={idx}
                          className={`flex items-center gap-2 p-2.5 ${
                            idx % 2 === 0 ? 'bg-slate-100/90' : 'bg-white'
                          }`}
                        >
                          <input
                            type="text"
                            value={item.clave}
                            onChange={(e) =>
                              actualizarFila(otros, setOtros, idx, 'clave', e.target.value)
                            }
                            placeholder="Ej: Es resistente al agua"
                            className="w-2/5 px-2.5 py-1.5 text-xs font-semibold text-slate-800 bg-transparent border border-transparent focus:border-slate-300 focus:bg-white rounded outline-none"
                          />
                          <input
                            type="text"
                            value={item.valor}
                            onChange={(e) =>
                              actualizarFila(otros, setOtros, idx, 'valor', e.target.value)
                            }
                            placeholder="Ej: Sí / Ecocuero"
                            className="flex-1 px-2.5 py-1.5 text-xs text-slate-700 bg-white border border-slate-200 rounded focus:border-blue-600 outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => eliminarFila(otros, setOtros, idx)}
                            className="text-slate-400 hover:text-red-500 p-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              </div>

            {/* BLOQUE "SOBRE ESTE ARTÍCULO" EN ÍNDICES / VIÑETAS */}
              <div className="mt-6 pt-6 border-t border-slate-100">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <label className="block text-sm font-extrabold text-slate-900">
                      Sobre este artículo (Descripción por índices)
                    </label>
                    <p className="text-xs text-slate-500">
                      Escribí cada característica en un punto separado. Tip: Si ponés palabras en <strong>MAYÚSCULAS</strong> seguidas de dos puntos (ej: <strong>CALIDAD PREMIUM:</strong>), se verán más grandes e imponentes.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPuntosArticulo([...puntosArticulo, ''])}
                    className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Agregar punto
                  </button>
                </div>

                <div className="space-y-2.5 mt-3">
                  {puntosArticulo.map((punto, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <span className="text-slate-900 font-black text-lg leading-none mt-2 select-none">
                        •
                      </span>
                      <input
                        type="text"
                        value={punto}
                        onChange={(e) => {
                          const copia = [...puntosArticulo];
                          copia[idx] = e.target.value;
                          setPuntosArticulo(copia);
                        }}
                        placeholder={
                          idx === 0
                            ? 'Ej: MÁXIMO RENDIMIENTO: Procesador de última generación para uso intensivo...'
                            : 'Ej: Diseño ergonómico: Materiales resistentes y livianos...'
                        }
                        className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm focus:ring-2 focus:ring-blue-600 outline-none"
                      />
                      {puntosArticulo.length > 1 && (
                        <button
                          type="button"
                          onClick={() =>
                            setPuntosArticulo(
                              puntosArticulo.filter((_, i) => i !== idx)
                            )
                          }
                          className="text-slate-400 hover:text-red-500 p-2"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              {/* Botón Final de Publicación */}
              <div className="mt-8 flex justify-end">
                <button
                  type="submit"
                  disabled={enviando}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold text-sm px-8 py-3.5 rounded-full shadow-md flex items-center gap-2 transition-all"
                >
                  <CheckCircle2 className="w-5 h-5" />
                  <span>{enviando ? 'Publicando...' : 'Confirmar y Publicar'}</span>
                </button>
              </div>
            </div>
          </form>
        </main>
      )}
      <Footer/>
    </div>
  );
}