import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api'
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token') || localStorage.getItem('falu_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

const CLAVES_NUBE = new Set([
  'falu_productos_locales',
  'falu_preguntas_productos',
  'falu_opiniones_productos',
  'falu_notificaciones',
  'falu_conversaciones_chat',
  'falu_reportes_chats_admin',
  'falu_compras_usuarios',
  'falu_usuarios_sistema',
  'falu_auditoria_logs',
  'falu_seguidores_tiendas'
]);

let aplicandoDatosDelServidor = false;
let cargaInicialCompletada = false;
let motorIniciado = false;
let ultimaSincronizacionMs = 0;

// Sincroniza datos bajo demanda (con freno de 15 segundos para evitar descargas repetidas en useEffect)
export async function sincronizarDatosPuntualesDesdeNube(
  forzar = false
): Promise<Record<string, any> | null> {
  const ahora = Date.now();
  if (!forzar && cargaInicialCompletada && ahora - ultimaSincronizacionMs < 15000) {
    return null;
  }

  try {
    ultimaSincronizacionMs = ahora;
    const res = await api.get('/sync');
    const store = res.data?.store;
    if (!store || typeof store !== 'object') return null;

    const setItemOriginal = Storage.prototype.setItem;
    aplicandoDatosDelServidor = true;

    for (const clave of CLAVES_NUBE) {
      if (store[clave] !== undefined) {
        setItemOriginal.call(
          window.localStorage,
          clave,
          JSON.stringify(store[clave])
        );
      }
    }

    aplicandoDatosDelServidor = false;
    cargaInicialCompletada = true;
    window.dispatchEvent(new Event('falu_actualizacion'));
    return store;
  } catch {
    aplicandoDatosDelServidor = false;
    cargaInicialCompletada = true;
    return null;
  }
}

// Consulta liviana exclusiva para actualizar solo el chat cuando el usuario abre la ventana de mensajes
export async function sincronizarSoloChatBajoDemanda(): Promise<void> {
  try {
    const res = await api.get('/sync?clave=falu_conversaciones_chat');
    const chatsRemotos = res.data?.datos;
    if (Array.isArray(chatsRemotos)) {
      const setItemOriginal = Storage.prototype.setItem;
      aplicandoDatosDelServidor = true;
      setItemOriginal.call(
        window.localStorage,
        'falu_conversaciones_chat',
        JSON.stringify(chatsRemotos)
      );
      aplicandoDatosDelServidor = false;
      window.dispatchEvent(new Event('falu_nuevo_mensaje_chat'));
    }
  } catch {
    aplicandoDatosDelServidor = false;
  }
}

function iniciarMotorBajoDemanda() {
  if (typeof window === 'undefined' || motorIniciado) return;
  motorIniciado = true;

  const setItemOriginal = Storage.prototype.setItem;

  // Solo envía a la base de datos la clave exacta que el usuario acaba de modificar
  Storage.prototype.setItem = function (clave: string, valor: string) {
    const valorAnterior = window.localStorage.getItem(clave);
    setItemOriginal.call(this, clave, valor);

    // Si el valor no cambió, no gasta red enviándolo a Neon
    if (valorAnterior === valor) return;

    if (
      this === window.localStorage &&
      !aplicandoDatosDelServidor &&
      CLAVES_NUBE.has(clave)
    ) {
      try {
        const datosParseados = JSON.parse(valor);
        if (
          !cargaInicialCompletada &&
          Array.isArray(datosParseados) &&
          datosParseados.length === 0
        ) {
          return;
        }
        api.post('/sync', { clave, datos: datosParseados }).catch(() => {});
      } catch {
        // Ignorar si no es JSON
      }
    }
  };

  // ÚNICA descarga inicial al abrir la aplicación (sin setInterval en segundo plano)
  sincronizarDatosPuntualesDesdeNube(true);
}

iniciarMotorBajoDemanda();

export default api;