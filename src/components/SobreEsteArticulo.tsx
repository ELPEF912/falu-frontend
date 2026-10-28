import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface Props {
  descripcion?: string;
}

// Resalta palabras en MAYÚSCULAS con tipografía más imponente
function resaltarMayusculasImponentes(texto: string) {
  const partes = texto.split(/([A-ZÁÉÍÓÚÑ]{2,}(?:\s+[A-ZÁÉÍÓÚÑ0-9]{2,})*)/g);

  return partes.map((parte, i) => {
    const esMayusculaImponente = /^[A-ZÁÉÍÓÚÑ]{2,}(?:\s+[A-ZÁÉÍÓÚÑ0-9]{2,})*$/.test(
      parte.trim()
    );
    if (esMayusculaImponente) {
      return (
        <span
          key={i}
          className="font-black text-slate-950 tracking-wide text-[13.5px] sm:text-[14.5px]"
        >
          {parte}
        </span>
      );
    }
    return <span key={i}>{parte}</span>;
  });
}

function renderizarLineaIndice(linea: string) {
  const limpia = linea.replace(/^[•\-*]\s*/, '').trim();
  const posDosPuntos = limpia.indexOf(':');

  if (posDosPuntos > 0 && posDosPuntos < 65) {
    const encabezado = limpia.slice(0, posDosPuntos + 1);
    const cuerpo = limpia.slice(posDosPuntos + 1);

    const encabezadoTodoMayus =
      encabezado === encabezado.toUpperCase() && /[A-ZÁÉÍÓÚÑ]/.test(encabezado);

    return (
      <>
        <span
          className={
            encabezadoTodoMayus
              ? 'font-black text-slate-950 tracking-wide text-[13.5px] sm:text-[14.5px]'
              : 'font-bold text-slate-900'
          }
        >
          {encabezado}
        </span>
        <span>{resaltarMayusculasImponentes(cuerpo)}</span>
      </>
    );
  }

  return resaltarMayusculasImponentes(limpia);
}

export default function SobreEsteArticulo({ descripcion }: Props) {
  const [expandido, setExpandido] = useState(false);

  if (!descripcion || !descripcion.trim()) return null;

  // Convierte cada renglón o viñeta en un ítem del índice
  const puntos = descripcion
    .split(/\n+/)
    .map((l) => l.replace(/^[•\-*]\s*/, '').trim())
    .filter((l) => l.length > 0);

  if (puntos.length === 0) return null;

  const requiereColapsar = puntos.length > 3 || descripcion.length > 380;
  const puntosVisibles =
    requiereColapsar && !expandido ? puntos.slice(0, 3) : puntos;

  return (
    <div className="mt-5 pt-5 border-t border-slate-200">
      <h2 className="text-base font-extrabold text-slate-950 mb-3">
        Sobre este artículo
      </h2>

      <div className="relative">
        <ul className="space-y-2.5 text-xs sm:text-[13.5px] text-slate-800 leading-relaxed">
          {puntosVisibles.map((punto, idx) => (
            <li key={idx} className="flex items-start gap-2.5">
              <span className="text-slate-950 font-black text-base leading-snug select-none">
                •
              </span>
              <div className="flex-1">{renderizarLineaIndice(punto)}</div>
            </li>
          ))}
        </ul>

        {/* Efecto sutil de desvanecimiento cuando está contraído, igual a la captura */}
        {requiereColapsar && !expandido && (
          <div className="h-6 bg-linear-to-t from-white to-transparent -mt-6 relative pointer-events-none" />
        )}
      </div>

      {requiereColapsar && (
        <button
          type="button"
          onClick={() => setExpandido(!expandido)}
          className="mt-2 inline-flex items-center gap-1 text-xs sm:text-sm font-semibold text-blue-700 hover:text-blue-900 hover:underline transition-colors"
        >
          {expandido ? (
            <>
              <ChevronUp className="w-4 h-4 text-slate-700" />
              <span>Mostrar menos</span>
            </>
          ) : (
            <>
              <ChevronDown className="w-4 h-4 text-slate-700" />
              <span>Mostrar más</span>
            </>
          )}
        </button>
      )}
    </div>
  );
}