import { useState } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import {
  FileText,
  ShieldCheck,
  Users,
  ShoppingBag,
  Store,
  RefreshCcw,
  Lock,
  Cookie,
  Scale,
  ChevronRight
} from 'lucide-react';

interface SeccionCondicion {
  id: string;
  numero: string;
  titulo: string;
  icono: any;
}

const INDICE_SECCIONES: SeccionCondicion[] = [
  { id: 'introduccion', numero: '1', titulo: 'Introducción y Rol de Falú', icono: FileText },
  { id: 'registro-identidad', numero: '2', titulo: 'Registro, DNI y Seguridad', icono: ShieldCheck },
  { id: 'roles-conducta', numero: '3', titulo: 'Roles y Prohibición de Auto-compra', icono: Users },
  { id: 'publicaciones', numero: '4', titulo: 'Política de Publicaciones y Stock', icono: ShoppingBag },
  { id: 'vendedores-reputacion', numero: '5', titulo: 'Vendedores y Reputación Contextual', icono: Store },
  { id: 'compras-devoluciones', numero: '6', titulo: 'Compras, Cancelaciones y Devoluciones', icono: RefreshCcw },
  { id: 'moderacion-chats', numero: '7', titulo: 'Reseñas, Chats y Moderación', icono: Scale },
  { id: 'privacidad', numero: '8', titulo: 'Política de Privacidad y Datos', icono: Lock },
  { id: 'cookies', numero: '9', titulo: 'Política de Cookies y Almacenamiento', icono: Cookie }
];

export default function CondicionesUso() {
  const [seccionActiva, setSeccionActiva] = useState<string>('introduccion');

  const irASeccion = (id: string) => {
    setSeccionActiva(id);
    const elemento = document.getElementById(id);
    if (elemento) {
      const offset = 95;
      const topPos = elemento.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top: topPos, behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <Navbar />

      <main className="max-w-7xl w-full mx-auto px-4 py-8 flex-1">
        
        {/* Encabezado */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 mb-6 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-blue-900 text-white flex items-center justify-center shrink-0 shadow-xs">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900">
                  Términos, Condiciones y Políticas de Falú
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  Marco normativo integral para Visitantes, Compradores y Vendedores (Versión 1.0)
                </p>
              </div>
            </div>
            <span className="text-xs font-bold text-blue-800 bg-blue-50 border border-blue-200 px-3.5 py-1.5 rounded-full w-fit">
              Anexos A – F Unificados
            </span>
          </div>
        </div>

        {/* Contenedor Principal: Índice a la izquierda + Contenido a la derecha */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* COLUMNA IZQUIERDA: ÍNDICE INTERACTIVO FIJO */}
          <aside className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs lg:sticky lg:top-24">
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 px-3 py-2">
              Índice de contenidos
            </h2>
            <nav className="space-y-1 mt-1">
              {INDICE_SECCIONES.map((item) => {
                const Icono = item.icono;
                const activa = seccionActiva === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => irASeccion(item.id)}
                    className={`w-full px-3 py-2.5 rounded-xl text-left text-xs font-semibold flex items-center justify-between gap-2 transition-all ${
                      activa
                        ? 'bg-blue-900 text-white shadow-2xs'
                        : 'text-slate-700 hover:bg-slate-100 hover:text-blue-900'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icono
                        className={`w-4 h-4 shrink-0 ${
                          activa ? 'text-blue-200' : 'text-slate-400'
                        }`}
                      />
                      <span className="truncate">
                        {item.numero}. {item.titulo}
                      </span>
                    </div>
                    <ChevronRight
                      className={`w-3.5 h-3.5 shrink-0 ${
                        activa ? 'text-white' : 'text-slate-300'
                      }`}
                    />
                  </button>
                );
              })}
            </nav>
          </aside>

          {/* COLUMNA DERECHA: DESARROLLO DE LAS POLÍTICAS */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* 1. INTRODUCCIÓN Y ROL DE FALÚ (Anexo A) */}
            <section
              id="introduccion"
              className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-2xs space-y-3"
            >
              <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-blue-50 text-blue-900 text-xs font-extrabold flex items-center justify-center">
                  1
                </span>
                Introducción y Naturaleza del Marketplace
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Los presentes Términos y Condiciones regulan el acceso y utilización de <strong>Falú</strong>, una plataforma web de comercio electrónico bajo modalidad Marketplace diseñada para conectar compradores y vendedores en un entorno digital seguro, organizado y transparente.
              </p>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Falú actúa como intermediario tecnológico facilitando el catálogo, el carrito de compras y los canales de comunicación. Al navegar como visitante o registrarse con una cuenta, el usuario acepta íntegramente estas disposiciones. En caso de no estar de acuerdo, deberá abstenerse de utilizar los servicios.
              </p>
            </section>

            {/* 2. REGISTRO, VERIFICACIÓN DE DNI Y SEGURIDAD*/}
            <section
              id="registro-identidad"
              className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-2xs space-y-3"
            >
              <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-blue-50 text-blue-900 text-xs font-extrabold flex items-center justify-center">
                  2
                </span>
                Registro de Cuenta, Validación Obligatoria y Seguridad
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Cada cuenta es personal, única e intransferible, estando destinada exclusivamente a personas mayores de edad con capacidad legal para contratar. No se permite el uso de identidades falsas ni datos de terceros.
              </p>
              <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-4 text-xs text-blue-950 space-y-1.5">
                <p className="font-bold">
                  Requisito obligatorio para operar y comprar en Falú:
                </p>
                <p className="leading-relaxed">
                  Si bien cualquier visitante puede explorar el catálogo públicamente, para confirmar compras es obligatorio haber completado en la sección <strong>Mi Perfil</strong>: Nombre y apellido real, <strong>Número de DNI válido</strong> (numérico), Estado civil, Condición fiscal, <strong>Teléfono de contacto</strong> (numérico) y al menos una <strong>Dirección de entrega</strong> con código postal válido.
                </p>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                El usuario es responsable de resguardar la confidencialidad de su contraseña. Ante cualquier sospecha de acceso no autorizado, deberá restablecer su clave de inmediato y notificar a Soporte.
              </p>
            </section>

            {/* 3. ROLES DE USUARIO Y PROHIBICIÓN DE AUTO-INTERACCIÓN*/}
            <section
              id="roles-conducta"
              className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-2xs space-y-3"
            >
              <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-blue-50 text-blue-900 text-xs font-extrabold flex items-center justify-center">
                  3
                </span>
                Roles de Usuario y Prohibición de Auto-compra
              </h2>
              <ul className="space-y-2 text-xs sm:text-sm text-slate-600 list-disc list-inside leading-relaxed">
                <li>
                  <strong>Visitantes:</strong> Pueden explorar el catálogo, filtrar por categorías, ver fichas técnicas y consultar la reputación de los vendedores sin iniciar sesión.
                </li>
                <li>
                  <strong>Compradores:</strong> Pueden guardar favoritos, gestionar su carrito, realizar preguntas en publicaciones ajenas, adquirir productos y calificar aquellos artículos que hayan comprado.
                </li>
                <li>
                  <strong>Vendedores:</strong> Pueden publicar productos o vehículos, editar precios, fotos y características técnicas, administrar stock y responder consultas de interesados.
                </li>
                <li>
                  <strong>Administradores y Super Admin:</strong> Supervisan el cumplimiento normativo, auditan reportes de reseñas o chats, ocultan publicaciones en infracción y gestionan los privilegios del sistema.
                </li>
              </ul>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-900">
                <strong>Bloqueo de auto-interacción comercial:</strong> Por transparencia y prevención de fraude, el sistema bloquea técnicamente que un vendedor compre sus propios productos, los agregue a su carrito, realice preguntas en sus propias publicaciones o emita reseñas sobre sus artículos para manipular su calificación.
              </div>
            </section>

            {/* 4. POLÍTICA DE PUBLICACIONES Y STOCK*/}
            <section
              id="publicaciones"
              className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-2xs space-y-3"
            >
              <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-blue-50 text-blue-900 text-xs font-extrabold flex items-center justify-center">
                  4
                </span>
                Política de Publicaciones, Artículos Prohibidos y Stock
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Toda publicación debe incluir título claro, categoría correcta, precio expresado en Pesos Argentinos (ARS), cantidad real disponible en stock, hasta 8 fotografías fieles al artículo y sus características técnicas principales y dimensiones.
              </p>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                <strong>Artículos estrictamente prohibidos:</strong> Está prohibido publicar productos ilegales, sustancias prohibidas, armas o elementos de uso restringido, artículos falsificados, réplicas no autorizadas o bienes obtenidos de forma ilícita. Tampoco se permite el uso de títulos engañosos ni duplicar publicaciones para saturar el buscador.
              </p>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                <strong>Reserva en carrito sin stock y alertas de reposición:</strong> Cuando un producto alcanza stock 0, los compradores no podrán ejecutar su compra inmediata, pero podrán conservarlo o añadirlo a su carrito (con cantidad 1 bloqueada para pago) con el fin de recibir una notificación automática en la plataforma apenas el vendedor reponga unidades.
              </p>
            </section>

            {/* 5. POLÍTICA PARA VENDEDORES Y REPUTACIÓN CONTEXTUAL*/}
            <section
              id="vendedores-reputacion"
              className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-2xs space-y-3"
            >
              <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-blue-50 text-blue-900 text-xs font-extrabold flex items-center justify-center">
                  5
                </span>
                Obligaciones del Vendedor y Reputación Contextual
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                El vendedor es el único responsable por la veracidad de las características declaradas, el mantenimiento del stock actualizado, la atención respetuosa de las consultas públicas y la preparación de los pedidos.
              </p>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                <strong>Equidad comercial — Reputación Contextual:</strong> Para evitar que una única calificación aislada distorsione la imagen de un comerciante nuevo, Falú aplica un umbral estadístico de <strong>10 ventas concretadas</strong>. Mientras el vendedor posea menos de 10 operaciones, su tienda pública exhibirá el indicador <em>"Historial aún limitado"</em> junto a sus métricas reales, brindando contexto transparente al comprador.
              </p>
            </section>

            {/* 6. COMPRAS, PAGOS, CANCELACIONES Y DEVOLUCIONES*/}
            <section
              id="compras-devoluciones"
              className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-2xs space-y-3"
            >
              <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-blue-50 text-blue-900 text-xs font-extrabold flex items-center justify-center">
                  6
                </span>
                Compras, Pagos, Cancelaciones y Devoluciones
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Antes de confirmar una operación, el comprador puede verificar el detalle de productos, cantidades, precios unitarios y el subtotal acumulado en su carrito. Falú no almacena datos sensibles de tarjetas de crédito o débito.
              </p>
              <ul className="space-y-1.5 text-xs sm:text-sm text-slate-600 list-disc list-inside leading-relaxed">
                <li>
                  <strong>Cancelaciones:</strong> El comprador puede solicitar la cancelación antes del despacho. El vendedor solo podrá cancelar por falta imprevista de stock, error evidente en la publicación o fuerza mayor justificada.
                </li>
                <li>
                  <strong>Devoluciones:</strong> Proceden cuando el artículo recibido no coincide con la ficha técnica publicada, presenta defectos o daños previos, o es un producto distinto al solicitado.
                </li>
              </ul>
            </section>

            {/* 7. MODERACIÓN DE RESEÑAS, MENSAJERÍA Y SANCIONES*/}
            <section
              id="moderacion-chats"
              className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-2xs space-y-3"
            >
              <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-blue-50 text-blue-900 text-xs font-extrabold flex items-center justify-center">
                  7
                </span>
                Reseñas Verificadas, Mensajería Post-Venta y Sanciones
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                <strong>Calificaciones y contenido multimedia:</strong> Solo los usuarios que hayan registrado la compra de un artículo pueden calificarlo de 1 a 5 estrellas y adjuntar fotos o videos demostrativos. Cualquier usuario puede reportar una reseña bajo las causales de <em>Spam</em>, <em>Mensaje de odio</em>, <em>Contenido sexual</em> o <em>Imagen inadecuada</em>.
              </p>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                <strong>Regla de mensajería directa y auditoría:</strong> El canal de chat interno se habilita tras la compra. Para evitar la saturación operativa del comerciante, la conversación solo aparece en la bandeja del vendedor una vez que el comprador envía el primer mensaje. Ante conductas abusivas o intentos de estafa, cualquiera de las partes puede reportar el chat, autorizando el envío automático de los <strong>últimos 20 mensajes</strong> a los Administradores como prueba documental.
              </p>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                El incumplimiento de estas normas faculta a los Administradores a ocultar publicaciones, eliminar reseñas y suspender temporal o definitivamente las cuentas involucradas.
              </p>
            </section>

            {/* 8. POLÍTICA DE PRIVACIDAD Y PROTECCIÓN DE DATOS*/}
            <section
              id="privacidad"
              className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-2xs space-y-3"
            >
              <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-blue-50 text-blue-900 text-xs font-extrabold flex items-center justify-center">
                  8
                </span>
                Política de Privacidad y Tratamiento de Datos Personales
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Falú recopila únicamente los datos necesarios para la operatoria comercial: nombre, DNI, correo electrónico, teléfono, domicilios de entrega, historial de búsquedas, favoritos, publicaciones, compras y ventas. Las contraseñas se almacenan de manera irreversible mediante algoritmos de hash criptográfico (<code>bcrypt</code>).
              </p>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                <strong>No comercialización y confidencialidad:</strong> Falú no vende ni alquila datos personales a terceros. La dirección de entrega del comprador solo se comparte con el vendedor correspondiente a los efectos de gestionar el envío del producto adquirido. El titular de los datos puede acceder, rectificar y actualizar su información en cualquier momento desde su panel de perfil.
              </p>
            </section>

            {/* 9. POLÍTICA DE COOKIES Y ALMACENAMIENTO LOCAL*/}
            <section
              id="cookies"
              className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-2xs space-y-3"
            >
              <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-blue-50 text-blue-900 text-xs font-extrabold flex items-center justify-center">
                  9
                </span>
                Política de Cookies y Tecnologías de Almacenamiento
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Falú utiliza cookies y almacenamiento local del navegador (<code>localStorage</code> y tokens JWT) con finalidades estrictamente funcionales:
              </p>
              <ul className="space-y-1.5 text-xs sm:text-sm text-slate-600 list-disc list-inside leading-relaxed">
                <li>
                  <strong>Esenciales y de Autenticación:</strong> Mantener la sesión iniciada de forma segura y proteger las rutas privadas.
                </li>
                <li>
                  <strong>Persistencia de Carrito y Preferencias:</strong> Conservar los productos agregados al carrito, favoritos y las últimas búsquedas del usuario entre sesiones.
                </li>
                <li>
                  <strong>Rendimiento:</strong> Optimizar los tiempos de respuesta de la interfaz y prevenir fallos durante la navegación.
                </li>
              </ul>
              <p className="text-xs text-slate-500 pt-2 border-t border-slate-100">
                Para consultas legales, reportes o ejercicio de derechos sobre datos personales, escribinos al canal oficial de administración:{' '}
                <a
                  href="mailto:soporte.falu@gmail.com"
                  className="font-bold text-blue-600 hover:underline"
                >
                  falu.soporte@gmail.com
                </a>
              </p>
            </section>

          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}