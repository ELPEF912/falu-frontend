import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ShoppingBag,
  CheckCircle2,
  XCircle,
  ExternalLink,
  MessageSquare,
  ArrowRight,
  Layers
} from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { useAuth } from '../context/AuthContext';
import { sincronizarDatosPuntualesDesdeNube } from '../services/api';

interface RegistroCompra {
  id_compra?: number;
  id_usuario: number;
  id_producto: number;
  id_vendedor?: number;
  titulo_snapshot?: string;
  precio_snapshot?: number;
  imagen_snapshot?: string | null;
  categoria_snapshot?: string;
  cantidad?: number;
  fecha: string;
  estado_compra?: 'completada' | 'cancelada_sin_stock';
  motivo_cancelacion?: string;
}

export default function MisCompras() {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [misCompras, setMisCompras] = useState<any[]>([]);

  const cargarComprasApiladas = () => {
    if (!user) return;
    const comprasGuardadas: RegistroCompra[] = JSON.parse(
      localStorage.getItem('falu_compras_usuarios') || '[]'
    );
    const catalogo = JSON.parse(
      localStorage.getItem('falu_productos_locales') || '[]'
    );

    const mias = comprasGuardadas.filter(
      (c) => Number(c.id_usuario) === Number(user.id_usuario)
    );

    const mapaApilado = new Map<string, any>();

    mias.forEach((c) => {
      const estado = c.estado_compra || 'completada';
      const claveGrupo = `${c.id_producto}_${estado}`;
      const prod = catalogo.find(
        (p: any) => String(p.id_producto) === String(c.id_producto)
      );

      if (mapaApilado.has(claveGrupo)) {
        const existente = mapaApilado.get(claveGrupo);
        existente.cantidad += Number(c.cantidad || 1);
      } else {
        mapaApilado.set(claveGrupo, {
          key_unica: claveGrupo,
          id_producto: c.id_producto,
          id_vendedor: c.id_vendedor || prod?.id_vendedor || 1,
          vendedor_nombre: prod?.vendedor_nombre || 'Vendedor Falú',
          titulo: prod?.titulo || c.titulo_snapshot || 'Producto de catálogo',
          precio: Number(prod?.precio ?? c.precio_snapshot ?? 0),
          imagen_url:
            prod?.imagen_url ||
            prod?.imagenes?.[0] ||
            c.imagen_snapshot ||
            null,
          categoria: prod?.categoria || c.categoria_snapshot || 'General',
          cantidad: Number(c.cantidad || 1),
          fecha: c.fecha,
          estado_compra: estado,
          motivo_cancelacion: c.motivo_cancelacion
        });
      }
    });

    setMisCompras(Array.from(mapaApilado.values()));
  };

  useEffect(() => {
    if (!isAuthenticated || !user) {
      navigate('/login');
      return;
    }
    sincronizarDatosPuntualesDesdeNube().then(() => {
      cargarComprasApiladas();
    });
    cargarComprasApiladas();

    window.addEventListener('falu_actualizacion', cargarComprasApiladas);
    return () => {
      window.removeEventListener('falu_actualizacion', cargarComprasApiladas);
    };
  }, [isAuthenticated, user, navigate]);

  const abrirChatConVendedor = (item: any) => {
    if (!user) return;
    const conversaciones = JSON.parse(
      localStorage.getItem('falu_conversaciones_chat') || '[]'
    );
    let conv = conversaciones.find(
      (c: any) =>
        Number(c.id_producto) === Number(item.id_producto) &&
        Number(c.id_comprador) === Number(user.id_usuario)
    );

    if (!conv) {
      conv = {
        id_conversacion: Date.now(),
        id_producto: Number(item.id_producto),
        titulo_producto: item.titulo,
        id_vendedor: Number(item.id_vendedor || 1),
        vendedor_nombre: item.vendedor_nombre || 'Vendedor Falú',
        id_comprador: Number(user.id_usuario),
        comprador_nombre: `${user.nombre} ${user.apellido || ''}`.trim(),
        iniciado_por_comprador: true,
        no_leidos_vendedor: 0,
        no_leidos_comprador: 0,
        mensajes: []
      };
      conversaciones.unshift(conv);
      localStorage.setItem(
        'falu_conversaciones_chat',
        JSON.stringify(conversaciones)
      );
    }

    window.dispatchEvent(
      new CustomEvent('falu_abrir_chat_manual', {
        detail: { id_conversacion: conv.id_conversacion }
      })
    );
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <Navbar />

      <main className="max-w-5xl w-full mx-auto px-4 py-8 flex-1">
        <div className="mb-6">
          <h1 className="text-2xl font-extrabold text-slate-900">
            Mis Compras
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Tus compras de un mismo artículo se agrupan automáticamente mostrando el total de unidades adquiridas
          </p>
        </div>

        {misCompras.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-2xs">
            <ShoppingBag className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h2 className="text-base font-extrabold text-slate-800 mb-1">
              Todavía no realizaste compras
            </h2>
            <p className="text-xs text-slate-500 mb-6">
              Cuando compres un artículo en Falú, aparecerá acá junto con el acceso al chat con el vendedor.
            </p>
            <Link
              to="/"
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-6 py-3 rounded-full"
            >
              <span>Ir al catálogo</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {misCompras.map((item) => {
              const cancelada = item.estado_compra === 'cancelada_sin_stock';

              return (
                <div
                  key={item.key_unica}
                  className={`bg-white rounded-2xl border p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-2xs ${
                    cancelada
                      ? 'border-red-300 bg-red-50/20'
                      : 'border-slate-200'
                  }`}
                >
                  <div className="flex items-start sm:items-center gap-4">
                    <div className="relative w-20 h-20 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                      {item.imagen_url ? (
                        <img
                          src={item.imagen_url}
                          alt={item.titulo}
                          className={`w-full h-full object-cover ${
                            cancelada ? 'grayscale opacity-60' : ''
                          }`}
                        />
                      ) : (
                        <ShoppingBag className="w-8 h-8 text-slate-300" />
                      )}

                      {item.cantidad > 1 && (
                        <span className="absolute bottom-1 right-1 bg-blue-900 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-xs">
                          x{item.cantidad}
                        </span>
                      )}
                    </div>

                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {cancelada ? (
                          <span className="inline-flex items-center gap-1 bg-red-600 text-white text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full">
                            <XCircle className="w-3 h-3" />
                            Error al procesar (Sin stock disponible)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full">
                            <CheckCircle2 className="w-3 h-3" />
                            Compra confirmada
                          </span>
                        )}

                        {item.cantidad > 1 && (
                          <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-800 border border-blue-200 text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                            <Layers className="w-3 h-3" />
                            {item.cantidad} unidades apiladas
                          </span>
                        )}

                        <span className="text-xs text-slate-400">
                          Última compra: {item.fecha}
                        </span>
                      </div>

                      <Link
                        to={`/producto/${item.id_producto}`}
                        className="text-sm font-extrabold text-slate-900 hover:text-blue-600 block"
                      >
                        {item.titulo}
                      </Link>

                      <p className="text-xs font-bold text-slate-700">
                        Total: ARS $
                        {(item.precio * item.cantidad).toLocaleString('es-AR')}{' '}
                        <span className="text-slate-400 font-normal">
                          ({item.cantidad}{' '}
                          {item.cantidad === 1 ? 'unidad' : 'unidades'} a ARS $
                          {item.precio.toLocaleString('es-AR')} c/u)
                        </span>
                      </p>

                      {cancelada && (
                        <p className="text-xs text-red-700 font-semibold mt-1">
                          {item.motivo_cancelacion ||
                            'Error: No se pudo procesar la compra porque ya no quedaba stock disponible en la base de datos.'}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 self-end sm:self-center shrink-0">
                    {!cancelada && (
                      <button
                        type="button"
                        onClick={() => abrirChatConVendedor(item)}
                        className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-colors"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>Mensajes con el vendedor</span>
                      </button>
                    )}

                    <Link
                      to={`/producto/${item.id_producto}`}
                      className="px-3.5 py-2 rounded-xl border border-slate-300 hover:border-blue-600 text-xs font-bold text-slate-700 hover:text-blue-600 flex items-center gap-1.5 transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>
                        {cancelada ? 'Ver publicación' : 'Ver / Calificar'}
                      </span>
                    </Link>
                  </div>
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