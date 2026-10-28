import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingBag, ArrowLeft, PackageOpen, Star } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

interface CompraRegistro {
  id_usuario: number;
  id_producto: number;
  fecha: string;
}

interface Producto {
  id_producto: number;
  titulo: string;
  precio: number;
  categoria: string;
  imagen_url?: string;
}

export default function MisCompras() {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [comprasDetalle, setComprasDetalle] = useState<
    { fecha: string; producto: Producto }[]
  >([]);

  useEffect(() => {
    if (!isAuthenticated || !user) {
      navigate('/login');
      return;
    }

    const cargarCompras = async () => {
      const registros: CompraRegistro[] = JSON.parse(
        localStorage.getItem('falu_compras_usuarios') || '[]'
      );
      const misRegistros = registros.filter(
        (r) => Number(r.id_usuario) === Number(user.id_usuario)
      );

      const locales: Producto[] = JSON.parse(
        localStorage.getItem('falu_productos_locales') || '[]'
      );
      let catalogo = [...locales];

      try {
        const res = await api.get('/products');
        if (Array.isArray(res.data)) {
          const idsLocales = new Set(locales.map((p) => String(p.id_producto)));
          const remotos = res.data.filter(
            (r: Producto) => !idsLocales.has(String(r.id_producto))
          );
          catalogo = [...locales, ...remotos];
        }
      } catch {
      }

      const cruzados = misRegistros
        .map((reg) => {
          const prod = catalogo.find(
            (p) => String(p.id_producto) === String(reg.id_producto)
          );
          return prod ? { fecha: reg.fecha, producto: prod } : null;
        })
        .filter((item): item is { fecha: string; producto: Producto } => item !== null)
        .reverse();

      setComprasDetalle(cruzados);
    };

    cargarCompras();
  }, [isAuthenticated, user, navigate]);

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <Navbar />
      <main className="max-w-6xl w-full mx-auto px-4 py-8 flex-1">
        <div className="mb-6">
          <h1 className="text-2xl font-extrabold text-slate-900">Mis compras</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Consultá tus productos adquiridos y calificá tu experiencia
          </p>
        </div>

        {comprasDetalle.length === 0 ? (
          /* Estado vacío personalizado */
          <div className="bg-white rounded-2xl border border-slate-200 p-12 flex flex-col items-center justify-center text-center shadow-2xs">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 mb-4">
              <PackageOpen className="w-8 h-8" />
            </div>
            <h2 className="text-lg font-extrabold text-slate-900 mb-1.5">
              ¡Hola, {user?.nombre}! Aún no realizaste compras
            </h2>
            <p className="text-xs text-slate-500 max-w-md mb-6 leading-relaxed">
              Los productos que compres en Falú aparecerán listados acá automáticamente para que puedas seguir su estado y dejar tu opinión como comprador.
            </p>
            <button
              type="button"
              onClick={() => navigate('/')}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-6 py-3 rounded-full transition-colors shadow-xs"
            >
              Explorar productos
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {comprasDetalle.map((item, idx) => (
              <div
                key={idx}
                className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
              >
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-xl bg-slate-100 overflow-hidden border border-slate-200 shrink-0 flex items-center justify-center">
                    {item.producto.imagen_url ? (
                      <img
                        src={item.producto.imagen_url}
                        alt={item.producto.titulo}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <ShoppingBag className="w-6 h-6 text-slate-300" />
                    )}
                  </div>
                  <div>
                    <span className="text-[11px] text-emerald-600 font-bold">
                      Comprado el {item.fecha}
                    </span>
                    <h3 className="text-sm font-bold text-slate-900">
                      {item.producto.titulo}
                    </h3>
                    <p className="text-xs font-extrabold text-slate-700 mt-1">
                      ARS ${Number(item.producto.precio).toLocaleString('es-AR')}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => navigate(`/producto/${item.producto.id_producto}`)}
                  className="bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-1.5 transition-colors self-end sm:self-center"
                >
                  <Star className="w-3.5 h-3.5" />
                  Ver producto / Opinar
                </button>
              </div>
            ))}
          </div>
        )}
      </main>
      <Footer/>
    </div>
  );
}