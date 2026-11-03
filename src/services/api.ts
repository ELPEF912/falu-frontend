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

// Todas las claves que se respaldan en Neon PostgreSQL al modificarse
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

// ÚNICAMENTE los mensajes del chat se consultan en tiempo real cada 2 segundos
const CLAVES_TIEMPO_REAL_CHAT = new Set([
  'falu_conversaciones_chat',
  'falu_reportes_chats_admin'
]);

let aplicandoDatosDelServidor = false;
let cargaInicialCompletada = false;
let motorIniciado = false;
let ultimoEnvioChatMs = 0;

// Permite forzar una lectura fresca de todas las claves desde Neon cuando el usuario navega o compra
export async function sincronizarDatosPuntualesDesdeNube(): Promise<Record<string, any> | null> {
  try {
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

function iniciarMotorSelectivo() {
  if (typeof window === 'undefined' || motorIniciado) return;
  motorIniciado = true;

  const setItemOriginal = Storage.prototype.setItem;

  // Cada vez que se guarda algo localmente, lo sube a Neon sin pisar el estado con polling
  Storage.prototype.setItem = function (clave: string, valor: string) {
    setItemOriginal.call(this, clave, valor);

    if (
      this === window.localStorage &&
      !aplicandoDatosDelServidor &&
      CLAVES_NUBE.has(clave)
    ) {
      if (CLAVES_TIEMPO_REAL_CHAT.has(clave)) {
        ultimoEnvioChatMs = Date.now();
      }
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

  // 1. Carga general una sola vez al abrir la página
  sincronizarDatosPuntualesDesdeNube();

  // 2. Tiempo real (cada 2 segundos) EXCLUSIVO para los mensajes del chat
  const sincronizarSoloMensajesEnVivo = async () => {
    // Si el usuario acaba de crear un chat o enviar un mensaje hace menos de 3 seg, esperamos para no pisarlo
    if (Date.now() - ultimoEnvioChatMs < 3000) return;

    try {
      const res = await api.get('/sync');
      const store = res.data?.store;
      if (!store || typeof store !== 'object') return;

      let huboNuevoMensaje = false;
      aplicandoDatosDelServidor = true;

      for (const claveChat of CLAVES_TIEMPO_REAL_CHAT) {
        const valorRemoto = store[claveChat];
        if (valorRemoto !== undefined) {
          const remotoStr = JSON.stringify(valorRemoto);
          const localStr = window.localStorage.getItem(claveChat);
          if (remotoStr !== localStr) {
            setItemOriginal.call(window.localStorage, claveChat, remotoStr);
            huboNuevoMensaje = true;
          }
        }
      }

      aplicandoDatosDelServidor = false;

      if (huboNuevoMensaje) {
        window.dispatchEvent(new Event('falu_nuevo_mensaje_chat'));
        window.dispatchEvent(new Event('falu_actualizacion'));
      }
    } catch {
      aplicandoDatosDelServidor = false;
    }
  };

  setInterval(sincronizarSoloMensajesEnVivo, 2000);
}

iniciarMotorSelectivo();

export default api;