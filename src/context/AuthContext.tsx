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

export function decodificarTokenJWT(jwt: string): any | null {
  try {
    const base64Url = jwt.split('.')[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      window
        .atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

function armarUsuarioUnificado(rawObj: any, jwt: string | null): User | null {
  const payload = jwt ? decodificarTokenJWT(jwt) : null;

  if (!rawObj && !payload) return null;

  // Priorizar siempre el ID numérico real que viene en el JWT o en la respuesta de la BD
  const idReal = Number(
    payload?.id_usuario ??
      payload?.id ??
      payload?.userId ??
      payload?.sub ??
      rawObj?.id_usuario ??
      rawObj?.id ??
      1
  );

  const email = String(
    rawObj?.email || rawObj?.correo || payload?.email || 'usuario@falu.com'
  )
    .trim()
    .toLowerCase();

  const nombre = String(
    rawObj?.nombre ||
      rawObj?.name ||
      payload?.nombre ||
      payload?.name ||
      (email.includes('@') ? email.split('@')[0] : 'Usuario')
  ).trim();

  const apellido = String(
    rawObj?.apellido || rawObj?.lastname || payload?.apellido || ''
  ).trim();

  const roles = Array.isArray(rawObj?.roles)
    ? rawObj.roles
    : Array.isArray(payload?.roles)
    ? payload.roles
    : rawObj?.rol
    ? [String(rawObj.rol)]
    : payload?.rol
    ? [String(payload.rol)]
    : [];

  return {
    id_usuario: isNaN(idReal) ? 1 : idReal,
    nombre,
    apellido,
    email,
    roles
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('token') || localStorage.getItem('falu_token');
  });

  const [user, setUser] = useState<User | null>(() => {
    const tok = localStorage.getItem('token') || localStorage.getItem('falu_token');
    const guardado = localStorage.getItem('user') || localStorage.getItem('falu_user');
    if (guardado) {
      try {
        const parsed = JSON.parse(guardado);
        const unificado = armarUsuarioUnificado(parsed, tok);
        if (unificado) return unificado;
      } catch {
        // Fallback al token
      }
    }
    return tok ? armarUsuarioUnificado(null, tok) : null;
  });

  useEffect(() => {
    if (user) {
      sincronizarUsuarioEnSistema(user);
    }
  }, [user]);

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
    const usuarioFinal = armarUsuarioUnificado(objetoUsuario, tokenFinal);

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
