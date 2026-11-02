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

// Claves globales compartidas en tiempo real entre todos los dispositivos
const CLAVES_COMPARTIDAS = new Set([
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
let cargaInicialTerminada = false;
let motorIniciado = false;

function iniciarMotorTiempoReal() {
  if (typeof window === 'undefined' || motorIniciado) return;
  motorIniciado = true;

  const setItemOriginal = Storage.prototype.setItem;

  // Intercepta cada guardado local y lo sube inmediatamente a Neon PostgreSQL
  Storage.prototype.setItem = function (clave: string, valor: string) {
    setItemOriginal.call(this, clave, valor);

    if (
      this === window.localStorage &&
      !aplicandoDatosDelServidor &&
      cargaInicialTerminada &&
      CLAVES_COMPARTIDAS.has(clave)
    ) {
      try {
        const datosParseados = JSON.parse(valor);
        api.post('/sync', { clave, datos: datosParseados }).catch(() => {});
      } catch {
        // Ignorar si no es JSON válido
      }
    }
  };

  // Descarga novedades de Neon PostgreSQL cada 2 segundos y actualiza la pantalla en vivo
  const sincronizarDesdeNube = async () => {
    try {
      const res = await api.get('/sync');
      const store = res.data?.store;
      if (!store || typeof store !== 'object') {
        cargaInicialTerminada = true;
        return;
      }

      let huboCambiosNuevos = false;
      aplicandoDatosDelServidor = true;

      for (const clave of CLAVES_COMPARTIDAS) {
        const valorRemoto = store[clave];
        const valorLocalStr = window.localStorage.getItem(clave);

        if (valorRemoto !== undefined) {
          const remotoStr = JSON.stringify(valorRemoto);
          if (remotoStr !== valorLocalStr) {
            setItemOriginal.call(window.localStorage, clave, remotoStr);
            huboCambiosNuevos = true;
          }
        } else if (!cargaInicialTerminada && valorLocalStr) {
          // Si la nube aún no tenía esta clave pero la PC sí, la sube por primera vez
          try {
            const parsed = JSON.parse(valorLocalStr);
            if (Array.isArray(parsed) && parsed.length > 0) {
              api.post('/sync', { clave, datos: parsed }).catch(() => {});
            }
          } catch {
            // Ignorar
          }
        }
      }

      aplicandoDatosDelServidor = false;
      cargaInicialTerminada = true;

      if (huboCambiosNuevos) {
        window.dispatchEvent(new Event('falu_actualizacion'));
        window.dispatchEvent(new Event('storage'));
      }
    } catch {
      aplicandoDatosDelServidor = false;
      cargaInicialTerminada = true;
    }
  };

  sincronizarDesdeNube();
  setInterval(sincronizarDesdeNube, 2000);
}

iniciarMotorTiempoReal();

export default api;
