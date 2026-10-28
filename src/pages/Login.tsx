import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, ShieldAlert } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  obtenerEstadoDisciplinarioUsuario,
  sincronizarUsuarioEnSistema
} from './AdminPanel';

export default function Login() {
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [detalleSancion, setDetalleSancion] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setDetalleSancion(null);
    setCargando(true);

    // 1. Verificar sanciones por correo antes de loguear
    const disciplinaPrevia = obtenerEstadoDisciplinarioUsuario(undefined, email);
    if (disciplinaPrevia.bloqueadoParaentrar) {
      setDetalleSancion(disciplinaPrevia.mensajeBloqueo);
      setCargando(false);
      return;
    }

    try {
      const response = await api.post('/auth/login', { email, password });
      const data = response.data || {};

      const tokenRecibido =
        data.token || data.accessToken || data.jwt || 'token_activo';

      // Soporta cualquier clave que devuelva el backend (usuario, user o datos en la raíz)
      const rawUser = data.usuario || data.user || data.data || data;

      // Busco si ya teníamos el nombre de este usuario en el padrón local
      const padronLocal = JSON.parse(
        localStorage.getItem('falu_usuarios_sistema') || '[]'
      );
      const usuarioEnPadron = padronLocal.find(
        (u: any) =>
          u.email && u.email.toLowerCase() === email.trim().toLowerCase()
      );

      const usuarioNormalizado = {
        id_usuario: Number(
          rawUser?.id_usuario ??
            rawUser?.id ??
            usuarioEnPadron?.id_usuario ??
            Date.now()
        ),
        nombre:
          rawUser?.nombre ||
          rawUser?.name ||
          usuarioEnPadron?.nombre ||
          email.trim().split('@')[0],
        apellido:
          rawUser?.apellido ||
          rawUser?.lastname ||
          usuarioEnPadron?.apellido ||
          '',
        email: rawUser?.email || email.trim(),
        roles: Array.isArray(rawUser?.roles)
          ? rawUser.roles
          : rawUser?.rol
          ? [rawUser.rol]
          : []
      };

      // 2. Verificar si su ID tiene suspensión activa o baneo
      const disciplinaId = obtenerEstadoDisciplinarioUsuario(
        usuarioNormalizado.id_usuario,
        usuarioNormalizado.email
      );
      if (disciplinaId.bloqueadoParaentrar) {
        setDetalleSancion(disciplinaId.mensajeBloqueo);
        setCargando(false);
        return;
      }

      sincronizarUsuarioEnSistema(usuarioNormalizado);
      login(tokenRecibido, usuarioNormalizado);
      navigate('/');
    } catch (err: any) {
      setError(
        err.response?.data?.error ||
          err.response?.data?.mensaje ||
          'Credenciales inválidas o servidor desconectado'
      );
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-10 border border-slate-100">
        
        <div className="text-center mb-8">
          <div className="mx-auto h-16 w-16 bg-blue-900 rounded-full flex items-center justify-center shadow-md mb-5">
            <Lock className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Iniciar Sesión
          </h2>
          <p className="mt-2 text-sm text-slate-500 font-medium">
            Ingresá tus credenciales para acceder a Falú
          </p>
        </div>

        {detalleSancion && (
          <div className="mb-5 bg-red-50 border-2 border-red-300 text-red-800 p-4 rounded-2xl text-xs space-y-1.5">
            <div className="flex items-center gap-2 font-extrabold text-sm text-red-900">
              <ShieldAlert className="w-5 h-5 text-red-600 shrink-0" />
              <span>Acceso restringido por Moderación</span>
            </div>
            <p className="leading-relaxed whitespace-pre-line">{detalleSancion}</p>
          </div>
        )}

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm font-medium text-center">
            {error}
          </div>
        )}

        <form className="space-y-5" onSubmit={handleSubmit}>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">
              Correo electrónico
            </label>
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
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-bold text-slate-700">
                Contraseña
              </label>
              <Link
                to="/forgot-password"
                className="text-xs font-bold text-blue-600 hover:underline"
              >
                ¿Olvidaste tu contraseña?
              </Link>
            </div>
            <div className="relative">
              <input
                type={mostrarPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="block w-full px-4 py-3 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-600 outline-none"
                required
              />
              <button
                type="button"
                onClick={() => setMostrarPassword(!mostrarPassword)}
                className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-blue-600"
              >
                {mostrarPassword ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={cargando}
            className="w-full py-4 px-4 mt-4 border border-transparent rounded-full shadow-md text-base font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400"
          >
            {cargando ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col items-center">
          <p className="text-sm text-slate-600 font-medium">
            ¿No tenés una cuenta?{' '}
            <Link
              to="/register"
              className="font-bold text-blue-600 hover:underline"
            >
              Crear cuenta
            </Link>
          </p>
        </div>

      </div>
    </div>
  );
}