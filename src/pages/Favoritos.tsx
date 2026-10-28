import Navbar from '../components/Navbar';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingBag, Heart, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import Footer from '../components/Footer';

interface FavoritoRegistro {
  id_usuario: number;
  id_producto: number;
}

interface Producto {
  id_producto: number;
  titulo: string;
  precio: number;
  categoria: string;
  imagen_url?: string;
}

export default function Favoritos() {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [favoritos, setFavoritos] = useState<Producto[]>([]);

  useEffect(() => {
    if (!isAuthenticated || !user) {
      navigate('/login');
      return;
    }

    const cargarFavoritos = async () => {
      const guardados: FavoritoRegistro[] = JSON.parse(
        localStorage.getItem('falu_favoritos_usuarios') || '[]'
      );
      const misIds = new Set(
        guardados
          .filter((f) => Number(f.id_usuario) === Number(user.id_usuario))
          .map((f) => String(f.id_producto))
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

      setFavoritos(catalogo.filter((p) => misIds.has(String(p.id_producto))));
    };

    cargarFavoritos();
  }, [isAuthenticated, user, navigate]);

  const quitarDeFavoritos = (idProducto: number) => {
    if (!user) return;
    const guardados: FavoritoRegistro[] = JSON.parse(
      localStorage.getItem('falu_favoritos_usuarios') || '[]'
    );
    const actualizados = guardados.filter(
      (f) =>
        !(
          Number(f.id_usuario) === Number(user.id_usuario) &&
          String(f.id_producto) === String(idProducto)
        )
    );
    localStorage.setItem('falu_favoritos_usuarios', JSON.stringify(actualizados));
    setFavoritos((prev) =>
      prev.filter((p) => String(p.id_producto) !== String(idProducto))
    );
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <header>
        <Navbar />
      </header>

      <main className="max-w-6xl w-full mx-auto px-4 py-8 flex-1">
        <div className="mb-6">
          <h1 className="text-2xl font-extrabold text-slate-900">Mis favoritos</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Productos que guardaste para seguir de cerca
          </p>
        </div>

        {favoritos.length === 0 ? (
          /* Estado vacío personalizado*/
          <div className="bg-white rounded-2xl border border-slate-200 p-12 flex flex-col items-center justify-center text-center shadow-2xs">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 mb-4">
              <Heart className="w-8 h-8" />
            </div>
            <h2 className="text-lg font-extrabold text-slate-900 mb-1.5">
              ¡Hola, {user?.nombre}! Aún no tenés productos en favoritos
            </h2>
            <p className="text-xs text-slate-500 max-w-md mb-6 leading-relaxed">
              Tocá el ícono del corazón en cualquier publicación del catálogo para guardarla en tu lista personal y encontrarla rápido cuando quieras.
            </p>
            <button
              type="button"
              onClick={() => navigate('/')}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-6 py-3 rounded-full transition-colors shadow-xs"
            >
              Descubrir productos
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {favoritos.map((prod) => (
              <div
                key={prod.id_producto}
                onClick={() => navigate(`/producto/${prod.id_producto}`)}
                className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-md transition-all flex flex-col group cursor-pointer relative"
              >
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    quitarDeFavoritos(prod.id_producto);
                  }}
                  title="Quitar de favoritos"
                  className="absolute top-2.5 right-2.5 z-10 w-8 h-8 rounded-full bg-white/90 hover:bg-white text-red-500 shadow-xs flex items-center justify-center transition-transform hover:scale-110"
                >
                  <Trash2 className="w-4 h-4" />
                </button>

                <div className="aspect-square w-full bg-slate-100 overflow-hidden flex items-center justify-center">
                  {prod.imagen_url ? (
                    <img
                      src={prod.imagen_url}
                      alt={prod.titulo}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <ShoppingBag className="w-10 h-10 text-slate-300" />
                  )}
                </div>

                <div className="p-3.5">
                  <h3 className="text-xs text-slate-700 font-medium line-clamp-2 mb-2">
                    {prod.titulo}
                  </h3>
                  <span className="text-base font-extrabold text-slate-900">
                    ARS ${Number(prod.precio).toLocaleString('es-AR')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
      <Footer/>
    </div>
  );
}