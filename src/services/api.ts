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
let descargaInicialExitosa = false;
let motorIniciado = false;
const cacheRemotoConocido: Record<string, string> = {};

function iniciarMotorTiempoReal() {
  if (typeof window === 'undefined' || motorIniciado) return;
  motorIniciado = true;

  const setItemOriginal = Storage.prototype.setItem;

  Storage.prototype.setItem = function (clave: string, valor: string) {
    setItemOriginal.call(this, clave, valor);

    // Solo sube cambios a Neon si ya descargó exitosamente el estado de la nube al menos una vez
    if (
      this === window.localStorage &&
      !aplicandoDatosDelServidor &&
      descargaInicialExitosa &&
      CLAVES_COMPARTIDAS.has(clave)
    ) {
      try {
        const datosParseados = JSON.parse(valor);

        // Evita que un navegador recién abierto sobrescriba la nube con un array vacío por accidente
        const previoRemoto = cacheRemotoConocido[clave];
        if (
          Array.isArray(datosParseados) &&
          datosParseados.length === 0 &&
          previoRemoto &&
          previoRemoto !== '[]' &&
          clave !== 'falu_productos_locales'
        ) {
          return;
        }

        cacheRemotoConocido[clave] = valor;
        api.post('/sync', { clave, datos: datosParseados }).catch(() => {});
      } catch {
        // Ignorar si no es JSON válido
      }
    }
  };

  const sincronizarDesdeNube = async () => {
    try {
      const res = await api.get('/sync');
      const store = res.data?.store;
      if (!store || typeof store !== 'object') {
        return;
      }

      let huboCambiosNuevos = false;
      aplicandoDatosDelServidor = true;

      for (const clave of CLAVES_COMPARTIDAS) {
        const valorRemoto = store[clave];
        const valorLocalStr = window.localStorage.getItem(clave);

        if (valorRemoto !== undefined) {
          const remotoStr = JSON.stringify(valorRemoto);
          cacheRemotoConocido[clave] = remotoStr;

          if (remotoStr !== valorLocalStr) {
            setItemOriginal.call(window.localStorage, clave, remotoStr);
            huboCambiosNuevos = true;
          }
        } else if (descargaInicialExitosa && valorLocalStr) {
          try {
            const parsed = JSON.parse(valorLocalStr);
            if (Array.isArray(parsed) && parsed.length > 0) {
              cacheRemotoConocido[clave] = valorLocalStr;
              api.post('/sync', { clave, datos: parsed }).catch(() => {});
            }
          } catch {
            // Ignorar
          }
        }
      }

      aplicandoDatosDelServidor = false;
      descargaInicialExitosa = true;

      if (huboCambiosNuevos) {
        window.dispatchEvent(new Event('falu_actualizacion'));
        window.dispatchEvent(new Event('storage'));
      }
    } catch {
      aplicandoDatosDelServidor = false;
      // Si el servidor está despertando, NO marcamos descargaInicialExitosa en true
      // para impedir que datos locales vacíos pisen la base de datos
    }
  };

  sincronizarDesdeNube();
  setInterval(sincronizarDesdeNube, 2000);
}

iniciarMotorTiempoReal();

export default api;
