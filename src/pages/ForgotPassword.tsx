import { useState } from 'react';
import { Link } from 'react-router-dom';
import { KeyRound, ArrowLeft } from 'lucide-react';
import api from '../services/api';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMensaje('');
    setCargando(true);

    try {
      // Dispara la generación del Token temporal en el backend
      const response = await api.post('/auth/forgot-password', { email });
      // Cartel verde con el mensaje del backend
      setMensaje(response.data.mensaje);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al procesar la solicitud');
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-10 border border-slate-100 relative">
        
        <Link to="/login" className="absolute top-6 left-6 text-slate-400 hover:text-blue-600">
          <ArrowLeft className="h-6 w-6" />
        </Link>

        <div className="text-center mb-8 mt-2">
          <div className="mx-auto h-16 w-16 bg-blue-900 rounded-full flex items-center justify-center shadow-md mb-5">
            <KeyRound className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Recuperar clave</h2>
          <p className="mt-2 text-sm text-slate-500 font-medium px-4">
            Ingresá tu correo y te enviaremos un enlace para restablecer tu contraseña.
          </p>
        </div>

        {/* Mensaje de Error */}
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm font-medium text-center">
            {error}
          </div>
        )}

        {/* Mensaje de Éxito (Color Verde) */}
        {mensaje && (
          <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl text-sm font-medium text-center">
            {mensaje}
          </div>
        )}

        <form className="space-y-6" onSubmit={handleSubmit}>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Correo electrónico</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ejemplo@correo.com"
              className="block w-full px-4 py-3.5 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-600 outline-none"
              required
            />
          </div>

          <button
            type="submit"
            disabled={cargando}
            className="w-full py-4 px-4 mt-2 border border-transparent rounded-full shadow-md text-base font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400"
          >
            {cargando ? 'Enviando...' : 'Enviar enlace'}
          </button>
        </form>

      </div>
    </div>
  );
}