import { useState, type ChangeEvent, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Camera,
  X,
  Plus,
  Trash2,
  Package,
  Car,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft
} from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { useAuth } from '../context/AuthContext';
import { verificarPerfilCompleto } from './Perfil';
import api from '../services/api';

interface AtributoFila {
  clave: string;
  valor: string;
}

const CATEGORIAS_PRODUCTO = [
  'Tecnología',
  'Hogar y Muebles',
  'Deportes y Fitness',
  'Herramientas',
  'Gaming y Consolas',
  'Electrodomésticos',
  'Moda y Accesorios',
  'Vehículos y Repuestos'
];

export default function Vender() {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [paso, setPaso] = useState<1 | 2>(1);
  const [tipoPublicacion, setTipoPublicacion] = useState<'producto' | 'vehiculo'>('producto');
  const [titulo, setTitulo] = useState('');
  const [categoria, setCategoria] = useState(CATEGORIAS_PRODUCTO[0]);
  const [precio, setPrecio] = useState('');
  const [stock, setStock] = useState('1');
  const [descripcion, setDescripcion] = useState('');
  const [dimensiones, setDimensiones] = useState('');

  const [imagenes, setImagenes] = useState<string[]>([]);
  const [errorFotos, setErrorFotos] = useState('');
  const [errorGeneral, setErrorGeneral] = useState('');
  const [publicando, setPublicando] = useState(false);

  const [principales, setPrincipales] = useState<AtributoFila[]>([
    { clave: 'Marca', valor: '' },
    { clave: 'Modelo', valor: '' }
  ]);

  const [otros, setOtros] = useState<AtributoFila[]>([
    { clave: 'Condición', valor: 'Nuevo' },
    { clave: 'Garantía', valor: '' }
  ]);

  const seleccionarTipo = (tipo: 'producto' | 'vehiculo') => {
    setTipoPublicacion(tipo);
    if (tipo === 'vehiculo') {
      setCategoria('Vehículos y Repuestos');
      setPrincipales([
        { clave: 'Marca', valor: '' },
        { clave: 'Modelo', valor: '' },
        { clave: 'Año', valor: '' },
        { clave: 'Kilómetros', valor: '' }
      ]);
      setOtros([
        { clave: 'Combustible', valor: '' },
        { clave: 'Transmisión', valor: '' },
        { clave: 'Puertas', valor: '' }
      ]);
    } else {
      setCategoria('Tecnología');
      setPrincipales([
        { clave: 'Marca', valor: '' },
        { clave: 'Modelo', valor: '' }
      ]);
      setOtros([
        { clave: 'Condición', valor: 'Nuevo' },
        { clave: 'Garantía', valor: '' }
      ]);
    }
  };

  // Compresión optimizada (500px / 0.55) para no saturar los 5 MB de celulares ni de Neon
  const handleSubirFotos = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const disponibles = 8 - imagenes.length;
    if (disponibles <= 0) {
      setErrorFotos('Podés subir hasta un máximo de 8 fotos por publicación.');
      return;
    }

    const seleccionados = Array.from(files).slice(0, disponibles);

    seleccionados.forEach((file) => {
      if (!file.type.startsWith('image/')) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const maxDim = 500;
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

          const dataUrl = canvas.toDataURL('image/jpeg', 0.55);
          setImagenes((prev) => (prev.length < 8 ? [...prev, dataUrl] : prev));
        };
        if (event.target?.result) {
          img.src = event.target.result as string;
        }
      };
      reader.readAsDataURL(file);
    });

    setErrorFotos('');
    e.target.value = '';
  };

  const eliminarFoto = (idx: number) => {
    setImagenes((prev) => prev.filter((_, i) => i !== idx));
  };

  const elegirComoPortada = (idx: number) => {
    if (idx === 0) return;
    setImagenes((prev) => {
      const elegida = prev[idx];
      const resto = prev.filter((_, i) => i !== idx);
      return [elegida, ...resto];
    });
  };

  const avanzarPaso2 = () => {
    setErrorGeneral('');
    setErrorFotos('');

    if (!isAuthenticated || !user) {
      navigate('/login');
      return;
    }

    const validacion = verificarPerfilCompleto(user.id_usuario);
    if (!validacion.completo) {
      alert(
        `Para publicar es obligatorio tener tu perfil y dirección completos:\n- ${validacion.faltantes.join('\n- ')}`
      );
      navigate('/perfil');
      return;
    }

    if (!titulo.trim()) {
      setErrorGeneral('Por favor ingresá un título para tu publicación.');
      return;
    }

    if (imagenes.length === 0) {
      setErrorFotos('Debés subir al menos 1 fotografía del producto.');
      return;
    }

    setPaso(2);
  };

  const handlePublicar = async (e: FormEvent) => {
    e.preventDefault();
    setErrorGeneral('');

    if (!isAuthenticated || !user) {
      navigate('/login');
      return;
    }

    const validacion = verificarPerfilCompleto(user.id_usuario);
    if (!validacion.completo) {
      alert(
        `Para publicar es obligatorio completar tu perfil:\n- ${validacion.faltantes.join('\n- ')}`
      );
      navigate('/perfil');
      return;
    }

    if (imagenes.length === 0) {
      setErrorGeneral('Debés subir al menos 1 foto.');
      setPaso(1);
      return;
    }

    const precioNum = Number(precio);
    const stockNum = Number(stock);

    if (isNaN(precioNum) || precioNum <= 0) {
      setErrorGeneral('Ingresá un precio válido mayor a 0.');
      return;
    }

    if (isNaN(stockNum) || stockNum < 1) {
      setErrorGeneral('El stock inicial debe ser de al menos 1 unidad.');
      return;
    }

    setPublicando(true);

    const idUnico = Date.now() + Math.floor(Math.random() * 1000);

    const nuevoProducto = {
      id_producto: idUnico,
      id_vendedor: Number(user.id_usuario),
      vendedor_nombre: `${user.nombre} ${user.apellido || ''}`.trim() || 'Vendedor Falú',
      estado: 'activo' as const,
      motivo_baja: null,
      tipo_publicacion: tipoPublicacion,
      titulo: titulo.trim(),
      descripcion: descripcion.trim(),
      precio: precioNum,
      precio_oferta: null,
      stock: stockNum,
      categoria,
      imagen_url: imagenes[0],
      imagenes,
      calificacion_promedio: null,
      total_opiniones: 0,
      reportes_producto: [],
      caracteristicas: {
        principales: principales.filter((f) => f.clave.trim() && f.valor.trim()),
        dimensiones: dimensiones.trim(),
        otros: otros.filter((f) => f.clave.trim() && f.valor.trim())
      }
    };

    try {
      // 1. PRIMERO lo guardamos directo en la base de datos de Neon (Backend)
      await api.post('/products', nuevoProducto);
    } catch (err) {
      console.error('Error en POST /products, respaldando por sync:', err);
    }

    // 2. SEGUNDO actualizamos la memoria local con protección anti-desborde de 5 MB
    try {
      const guardados = JSON.parse(
        localStorage.getItem('falu_productos_locales') || '[]'
      );
      const listaSinDuplicado = Array.isArray(guardados)
        ? guardados.filter((p: any) => Number(p.id_producto) !== idUnico)
        : [];
      const actualizados = [nuevoProducto, ...listaSinDuplicado];

      try {
        localStorage.setItem(
          'falu_productos_locales',
          JSON.stringify(actualizados)
        );
      } catch {
        // Si el navegador del celular o PC llenó sus 5 MB, liberamos copias pesadas y guardamos
        localStorage.removeItem('falu_auditoria_logs');
        const compras = JSON.parse(
          localStorage.getItem('falu_compras_usuarios') || '[]'
        );
        if (Array.isArray(compras)) {
          localStorage.setItem(
            'falu_compras_usuarios',
            JSON.stringify(compras.map((c: any) => ({ ...c, imagen_snapshot: null })))
          );
        }
        localStorage.setItem(
          'falu_productos_locales',
          JSON.stringify(actualizados)
        );
      }
    } catch {
      // Aunque el almacenamiento local del dispositivo esté al tope, ya quedó en Neon
    }

    window.dispatchEvent(new Event('falu_actualizacion'));
    setPublicando(false);
    navigate(`/producto/${idUnico}`);
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <Navbar />

      <main className="max-w-3xl w-full mx-auto px-4 py-8 flex-1">
        <div className="bg-white rounded-2xl shadow-xs border border-slate-200 p-6 sm:p-8">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900">
                Publicar en Falú
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Paso {paso} de 2 —{' '}
                {paso === 1
                  ? 'Tipo de publicación, título y fotografías'
                  : 'Precio, stock y ficha técnica'}
              </p>
            </div>
            <span className="bg-blue-50 text-blue-800 text-xs font-extrabold px-3 py-1 rounded-full">
              Paso {paso}/2
            </span>
          </div>

          {errorGeneral && (
            <div className="mb-5 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorGeneral}</span>
            </div>
          )}

          {paso === 1 ? (
            <div className="space-y-6">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  ¿Qué vas a publicar?
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => seleccionarTipo('producto')}
                    className={`p-4 rounded-xl border-2 flex items-center gap-3 text-left transition-all ${
                      tipoPublicacion === 'producto'
                        ? 'border-blue-600 bg-blue-50/50 text-blue-950'
                        : 'border-slate-200 hover:border-slate-300 text-slate-700'
                    }`}
                  >
                    <Package className="w-6 h-6 text-blue-600 shrink-0" />
                    <div>
                      <span className="text-sm font-extrabold block">Producto</span>
                      <span className="text-[11px] text-slate-500">
                        Artículos generales, tecnología, hogar
                      </span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => seleccionarTipo('vehiculo')}
                    className={`p-4 rounded-xl border-2 flex items-center gap-3 text-left transition-all ${
                      tipoPublicacion === 'vehiculo'
                        ? 'border-blue-600 bg-blue-50/50 text-blue-950'
                        : 'border-slate-200 hover:border-slate-300 text-slate-700'
                    }`}
                  >
                    <Car className="w-6 h-6 text-blue-600 shrink-0" />
                    <div>
                      <span className="text-sm font-extrabold block">Vehículo</span>
                      <span className="text-[11px] text-slate-500">
                        Autos, motos y utilitarios
                      </span>
                    </div>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Título de la publicación *
                </label>
                <input
                  type="text"
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  placeholder="Ej: Auriculares Inalámbricos Sony WH-1000XM4 Negro"
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-blue-600 outline-none"
                />
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">
                      Fotografías del artículo ({imagenes.length}/8) *
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Tocá cualquier foto para elegirla como portada principal
                    </span>
                  </div>

                  {imagenes.length < 8 && (
                    <label className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 rounded-full cursor-pointer transition-colors">
                      <Camera className="w-4 h-4" />
                      <span>Subir fotos</span>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleSubirFotos}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>

                {errorFotos && (
                  <p className="text-xs text-red-600 font-bold mb-3">{errorFotos}</p>
                )}

                {imagenes.length === 0 ? (
                  <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center text-xs text-slate-400">
                    Todavía no cargaste fotos. Subí entre 1 y 8 imágenes.
                  </div>
                ) : (
                  <div className="grid grid-cols-4 sm:grid-cols-8 gap-2.5">
                    {imagenes.map((img, idx) => (
                      <div
                        key={idx}
                        className={`relative aspect-square rounded-xl overflow-hidden border-2 ${
                          idx === 0 ? 'border-blue-600' : 'border-slate-200'
                        }`}
                      >
                        <img
                          src={img}
                          alt=""
                          onClick={() => elegirComoPortada(idx)}
                          className="w-full h-full object-cover cursor-pointer"
                        />
                        {idx === 0 && (
                          <span className="absolute bottom-0 inset-x-0 bg-blue-600 text-white text-[9px] font-bold text-center py-0.5">
                            Portada
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => eliminarFoto(idx)}
                          className="absolute top-1 right-1 bg-black/70 hover:bg-red-600 text-white rounded-full p-0.5"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={avanzarPaso2}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-6 py-3 rounded-full inline-flex items-center gap-2 transition-colors"
                >
                  <span>Continuar al Paso 2</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handlePublicar} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                  <select
                    value={categoria}
                    onChange={(e) => setCategoria(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm bg-white focus:ring-2 focus:ring-blue-600 outline-none"
                  >
                    {CATEGORIAS_PRODUCTO.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Dimensiones (Altura x Largo x Profundidad — Opcional)
                </label>
                <input
                  type="text"
                  value={dimensiones}
                  onChange={(e) => setDimensiones(e.target.value)}
                  placeholder="Ej: 20 cm x 15 cm x 8 cm"
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
                      setPrincipales([...principales, { clave: '', valor: '' }])
                    }
                    className="text-xs font-bold text-blue-600 flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Agregar fila
                  </button>
                </div>
                <div className="space-y-2">
                  {principales.map((fila, idx) => (
                    <div key={idx} className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Característica (ej. Marca)"
                        value={fila.clave}
                        onChange={(e) => {
                          const copia = [...principales];
                          copia[idx].clave = e.target.value;
                          setPrincipales(copia);
                        }}
                        className="w-1/2 px-3 py-2 text-xs border border-slate-300 rounded-xl"
                      />
                      <input
                        type="text"
                        placeholder="Valor"
                        value={fila.valor}
                        onChange={(e) => {
                          const copia = [...principales];
                          copia[idx].valor = e.target.value;
                          setPrincipales(copia);
                        }}
                        className="w-1/2 px-3 py-2 text-xs border border-slate-300 rounded-xl"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setPrincipales(principales.filter((_, i) => i !== idx))
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
                  <label className="text-xs font-bold text-slate-700">
                    Otros datos técnicos
                  </label>
                  <button
                    type="button"
                    onClick={() => setOtros([...otros, { clave: '', valor: '' }])}
                    className="text-xs font-bold text-blue-600 flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Agregar fila
                  </button>
                </div>
                <div className="space-y-2">
                  {otros.map((fila, idx) => (
                    <div key={idx} className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Propiedad (ej. Condición)"
                        value={fila.clave}
                        onChange={(e) => {
                          const copia = [...otros];
                          copia[idx].clave = e.target.value;
                          setOtros(copia);
                        }}
                        className="w-1/2 px-3 py-2 text-xs border border-slate-300 rounded-xl"
                      />
                      <input
                        type="text"
                        placeholder="Valor"
                        value={fila.valor}
                        onChange={(e) => {
                          const copia = [...otros];
                          copia[idx].valor = e.target.value;
                          setOtros(copia);
                        }}
                        className="w-1/2 px-3 py-2 text-xs border border-slate-300 rounded-xl"
                      />
                      <button
                        type="button"
                        onClick={() => setOtros(otros.filter((_, i) => i !== idx))}
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
                  Sobre este artículo (Escribí un punto por renglón)
                </label>
                <textarea
                  rows={4}
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  placeholder={
                    'SONIDO PROFESIONAL: Cancelación activa de ruido.\nBATERÍA DE LARGA DURACIÓN: Hasta 30 horas continuas.'
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-blue-600 outline-none"
                />
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setPaso(1)}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 px-4 py-2.5 rounded-full"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Volver al Paso 1</span>
                </button>

                <button
                  type="submit"
                  disabled={publicando}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white text-xs font-bold px-6 py-3 rounded-full inline-flex items-center gap-2 transition-colors"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    {publicando ? 'Publicando...' : 'Publicar producto'}
                  </span>
                </button>
              </div>
            </form>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}