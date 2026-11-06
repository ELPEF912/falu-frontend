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
  'falu_seguidores_tiendas',
  'falu_perfiles_usuarios'
]);

let aplicandoDatosDelServidor = false;
let cargaInicialCompletada = false;
let motorIniciado = false;
let ultimaSincronizacionMs = 0;
let ultimaEscrituraLocalMs = 0;

// Guarda en localStorage sin romper la aplicación si el navegador llega al límite de 5 MB
function guardarSeguroEnLocalStorage(
  setItemOriginal: (k: string, v: string) => void,
  clave: string,
  valor: string
) {
  try {
    setItemOriginal.call(window.localStorage, clave, valor);
  } catch {
    // Si se llenaron los 5 MB del navegador, limpiamos miniaturas pesadas de compras/auditoría y reintentamos
    try {
      const compras = JSON.parse(
        window.localStorage.getItem('falu_compras_usuarios') || '[]'
      );
      if (Array.isArray(compras) && compras.length > 0) {
        const comprasLivianas = compras.map((c: any) => ({
          ...c,
          imagen_snapshot: null
        }));
        setItemOriginal.call(
          window.localStorage,
          'falu_compras_usuarios',
          JSON.stringify(comprasLivianas)
        );
      }
      window.localStorage.removeItem('falu_auditoria_logs');
      setItemOriginal.call(window.localStorage, clave, valor);
    } catch {
      // Aunque el navegador local no tenga más espacio, permitimos que continúe hacia Neon
    }
  }
}

export async function sincronizarDatosPuntualesDesdeNube(
  forzar = false
): Promise<Record<string, any> | null> {
  const ahora = Date.now();

  if (ahora - ultimaEscrituraLocalMs < 4000) {
    return null;
  }

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
        const valorRemoto = store[clave];
        const valorLocalActual = window.localStorage.getItem(clave);

        if (
          Array.isArray(valorRemoto) &&
          valorRemoto.length === 0 &&
          valorLocalActual &&
          valorLocalActual !== '[]' &&
          clave !== 'falu_productos_locales'
        ) {
          continue;
        }

        // Fusionar perfiles de distintas cuentas en lugar de pisarlos
        if (
          clave === 'falu_perfiles_usuarios' &&
          valorRemoto &&
          typeof valorRemoto === 'object' &&
          !Array.isArray(valorRemoto)
        ) {
          const perfilesLocales = JSON.parse(valorLocalActual || '{}');
          const fusionados = { ...valorRemoto, ...perfilesLocales };
          guardarSeguroEnLocalStorage(
            setItemOriginal,
            clave,
            JSON.stringify(fusionados)
          );
          continue;
        }

        guardarSeguroEnLocalStorage(
          setItemOriginal,
          clave,
          JSON.stringify(valorRemoto)
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

export async function sincronizarSoloChatBajoDemanda(): Promise<void> {
  if (Date.now() - ultimaEscrituraLocalMs < 3000) return;

  try {
    const res = await api.get('/sync?clave=falu_conversaciones_chat');
    const chatsRemotos = res.data?.datos;
    if (Array.isArray(chatsRemotos) && chatsRemotos.length > 0) {
      const chatsLocales = JSON.parse(
        window.localStorage.getItem('falu_conversaciones_chat') || '[]'
      );

      const mapa = new Map<number, any>();
      chatsLocales.forEach((c: any) => mapa.set(Number(c.id_conversacion), c));
      chatsRemotos.forEach((c: any) => {
        const existente = mapa.get(Number(c.id_conversacion));
        if (
          !existente ||
          (Array.isArray(c.mensajes) &&
            c.mensajes.length >= (existente.mensajes?.length || 0))
        ) {
          mapa.set(Number(c.id_conversacion), c);
        }
      });

      const unificados = Array.from(mapa.values());
      const setItemOriginal = Storage.prototype.setItem;
      aplicandoDatosDelServidor = true;
      guardarSeguroEnLocalStorage(
        setItemOriginal,
        'falu_conversaciones_chat',
        JSON.stringify(unificados)
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

  Storage.prototype.setItem = function (clave: string, valor: string) {
    const valorAnterior = window.localStorage.getItem(clave);

    // Nunca bloquear la ejecución aunque localStorage esté al límite de 5 MB
    guardarSeguroEnLocalStorage(setItemOriginal, clave, valor);

    if (valorAnterior === valor) return;

    if (
      this === window.localStorage &&
      !aplicandoDatosDelServidor &&
      CLAVES_NUBE.has(clave)
    ) {
      ultimaEscrituraLocalMs = Date.now();
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

  sincronizarDatosPuntualesDesdeNube(true);
}

iniciarMotorBajoDemanda();

export default api;