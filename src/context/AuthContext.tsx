import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { sincronizarUsuarioEnSistema } from '../pages/AdminPanel';

export interface User {
  id_usuario: number;
  nombre: string;
  apellido?: string;
  email: string;
  roles?: string[];
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (arg1: any, arg2?: any) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Función auxiliar para decodificar un JWT si el backend no manda el objeto usuario separado
function extraerUsuarioDeToken(jwt: string, emailFallback = ''): User | null {
  try {
    const base64Url = jwt.split('.')[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(window.atob(base64));

    const id = Number(payload.id_usuario ?? payload.id ?? payload.sub ?? Date.now());
    const email = payload.email || emailFallback || 'usuario@falu.com';
    const nombre =
      payload.nombre ||
      payload.name ||
      (email.includes('@') ? email.split('@')[0] : 'Usuario');

    return {
      id_usuario: id,
      nombre,
      apellido: payload.apellido || '',
      email,
      roles: Array.isArray(payload.roles)
        ? payload.roles
        : payload.rol
        ? [payload.rol]
        : []
    };
  } catch {
    return null;
  }
}

function normalizarObjetoUsuario(raw: any, emailFallback = ''): User | null {
  if (!raw || typeof raw !== 'object') return null;

  const email = raw.email || raw.correo || emailFallback || 'usuario@falu.com';
  const nombre =
    raw.nombre ||
    raw.name ||
    raw.username ||
    (email.includes('@') ? email.split('@')[0] : 'Usuario');

  return {
    id_usuario: Number(raw.id_usuario ?? raw.id ?? Date.now()),
    nombre: String(nombre),
    apellido: raw.apellido ? String(raw.apellido) : '',
    email: String(email),
    roles: Array.isArray(raw.roles)
      ? raw.roles
      : raw.rol
      ? [String(raw.rol)]
      : []
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('token') || localStorage.getItem('falu_token');
  });

  const [user, setUser] = useState<User | null>(() => {
    const guardado =
      localStorage.getItem('user') || localStorage.getItem('falu_user');
    if (guardado) {
      try {
        const parsed = JSON.parse(guardado);
        const norm = normalizarObjetoUsuario(parsed);
        if (norm) return norm;
      } catch {
        // Si estaba corrupto en localStorage, intenta recuperarlo del token
      }
    }
    const tok = localStorage.getItem('token') || localStorage.getItem('falu_token');
    return tok ? extraerUsuarioDeToken(tok) : null;
  });

  useEffect(() => {
    if (user) {
      sincronizarUsuarioEnSistema(user);
    }
  }, [user]);

  // Acepta (token, user) o (user, token) indistintamente
  const login = (arg1: any, arg2?: any) => {
    let tokenRecibido: string | null = null;
    let objetoUsuario: any = null;

    if (typeof arg1 === 'string') {
      tokenRecibido = arg1;
      objetoUsuario = arg2;
    } else if (typeof arg2 === 'string') {
      tokenRecibido = arg2;
      objetoUsuario = arg1;
    } else if (arg1 && typeof arg1 === 'object') {
      tokenRecibido = arg1.token || arg1.accessToken || 'sesion_local_activa';
      objetoUsuario = arg1.usuario || arg1.user || arg1;
    }

    const tokenFinal = tokenRecibido || 'sesion_local_activa';
    let usuarioFinal = normalizarObjetoUsuario(objetoUsuario);

    if (!usuarioFinal && tokenRecibido) {
      usuarioFinal = extraerUsuarioDeToken(tokenRecibido);
    }

    if (usuarioFinal) {
      setToken(tokenFinal);
      setUser(usuarioFinal);
      localStorage.setItem('token', tokenFinal);
      localStorage.setItem('falu_token', tokenFinal);
      localStorage.setItem('user', JSON.stringify(usuarioFinal));
      localStorage.setItem('falu_user', JSON.stringify(usuarioFinal));
      sincronizarUsuarioEnSistema(usuarioFinal);
      window.dispatchEvent(new Event('falu_actualizacion'));
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('falu_token');
    localStorage.removeItem('user');
    localStorage.removeItem('falu_user');
    window.dispatchEvent(new Event('falu_actualizacion'));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: Boolean(user && token),
        login,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe utilizarse dentro de un AuthProvider');
  }
  return context;
};