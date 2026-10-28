import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, UserPlus } from 'lucide-react';
import api from '../services/api';

export default function Register() {
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const navigate = useNavigate();

  // Memoria del formulario
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setCargando(true);

    try {
      // Le mando los datos al backend
      await api.post('/auth/register', { nombre, apellido, email, password });
      
      // Si salió bien, lo mando al Login para que entre
      navigate('/login');
    } catch (err: any) {
      // Si el correo ya existe, muestro el error de Node.js en rojo
      setError(err.response?.data?.error || 'Error al registrar el usuario');
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-10 border border-slate-100">
        
        <div className="text-center mb-8">
          <div className="mx-auto h-16 w-16 bg-blue-900 rounded-full flex items-center justify-center shadow-md mb-5">
            <UserPlus className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Crear cuenta</h2>
          <p className="mt-2 text-sm text-slate-500 font-medium">Unite a Falú y empezá a comprar y vender</p>
        </div>

        {/* Cartel de error */}
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm font-medium text-center">
            {error}
          </div>
        )}

        <form className="space-y-5" onSubmit={handleSubmit}>
          <div className="flex gap-4">
            <div className="w-1/2">
              <label className="block text-sm font-bold text-slate-700 mb-2">Nombre</label>
              <input
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Juan"
                className="block w-full px-4 py-3 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-600 outline-none"
                required
              />
            </div>
            <div className="w-1/2">
              <label className="block text-sm font-bold text-slate-700 mb-2">Apellido</label>
              <input
                type="text"
                value={apellido}
                onChange={(e) => setApellido(e.target.value)}
                placeholder="Pérez"
                className="block w-full px-4 py-3 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-600 outline-none"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Correo electrónico</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ejemplo@correo.com"
              className="block w-full px-4 py-3 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-600 outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Contraseña</label>
            <div className="relative">
              <input
                type={mostrarPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 8 caracteres"
                className="block w-full px-4 py-3 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-600 outline-none"
                required
              />
              <button
                type="button"
                onClick={() => setMostrarPassword(!mostrarPassword)}
                className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-blue-600"
              >
                {mostrarPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={cargando}
            className="w-full py-4 px-4 mt-4 border border-transparent rounded-full shadow-md text-base font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400"
          >
            {cargando ? 'Registrando...' : 'Registrarme'}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col items-center">
          <p className="text-sm text-slate-600 font-medium">
            ¿Ya tenés una cuenta?{' '}
            <Link to="/login" className="font-bold text-blue-600 hover:text-blue-800 hover:underline">
              Iniciar Sesión
            </Link>
          </p>
        </div>

      </div>
    </div>
  );
}