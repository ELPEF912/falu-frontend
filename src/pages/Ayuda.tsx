import { useState } from 'react';
import {
  RotateCcw,
  MessageSquareWarning,
  Truck,
  Tag,
  LayoutGrid,
  ChevronRight,
  Wrench
} from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const ACCIONES_RAPIDAS = [
  { label: 'Devolver una compra', icon: RotateCcw },
  { label: 'Iniciar o seguir un reclamo', icon: MessageSquareWarning },
  { label: 'Cuándo llegan mis compras', icon: Truck },
  { label: 'Ayuda con cupones', icon: Tag },
  { label: 'Explorá las preguntas frecuentes', icon: LayoutGrid }
];

const PREGUNTAS_FRECUENTES = ['Compras', 'Ventas', 'Cuenta'];

export default function Ayuda() {
  const [opcionSeleccionada, setOpcionSeleccionada] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <Navbar />

      <main className="max-w-4xl w-full mx-auto px-4 py-10 flex-1 space-y-8">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">
            ¿Con qué podemos ayudarte?
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Centro de autogestión y consultas de Falú
          </p>
        </div>

        {/* BLOQUE 1: Botones principales con íconos*/}
        <div>
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs divide-y divide-slate-100 overflow-hidden">
            {ACCIONES_RAPIDAS.map((item) => {
              const Icono = item.icon;
              return (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => setOpcionSeleccionada(item.label)}
                  className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors text-left"
                >
                  <div className="flex items-center gap-4">
                    <Icono className="w-5 h-5 text-slate-700 shrink-0" />
                    <span className="text-sm font-medium text-slate-900">
                      {item.label}
                    </span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-blue-500 shrink-0" />
                </button>
              );
            })}
          </div>
          <p className="text-xs text-amber-700 font-semibold mt-2.5 flex items-center gap-1.5 px-1">
            <Wrench className="w-3.5 h-3.5" />
            <span>
              Nota: Estos módulos de autogestión se encuentran en desarrollo y estarán habilitados en la próxima versión de la plataforma.
            </span>
          </p>
        </div>

        {/* BLOQUE 2: Preguntas frecuentes*/}
        <div>
          <h2 className="text-xl font-bold text-slate-900 mb-4">
            Preguntas frecuentes
          </h2>

          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs divide-y divide-slate-100 overflow-hidden">
            {PREGUNTAS_FRECUENTES.map((categoria) => (
              <button
                key={categoria}
                type="button"
                onClick={() => setOpcionSeleccionada(`Preguntas frecuentes: ${categoria}`)}
                className="w-full px-6 py-5 flex items-center justify-between hover:bg-slate-50 transition-colors text-left"
              >
                <span className="text-sm font-medium text-slate-900">
                  {categoria}
                </span>
                <ChevronRight className="w-5 h-5 text-blue-600 shrink-0" />
              </button>
            ))}
          </div>

          <p className="text-xs text-amber-700 font-semibold mt-2.5 flex items-center gap-1.5 px-1">
            <Wrench className="w-3.5 h-3.5" />
            <span>
              Nota: El desglose interactivo de preguntas frecuentes se encuentra en desarrollo para una futura versión.
            </span>
          </p>
        </div>

        {/* Aviso dinámico al hacer clic en cualquier botón */}
        {opcionSeleccionada && (
          <div className="bg-blue-50 border border-blue-200 text-blue-900 px-5 py-4 rounded-xl text-xs flex items-center justify-between">
            <span>
              Seleccionaste <strong>"{opcionSeleccionada}"</strong>. Esta función está en desarrollo para la próxima versión de Falú. Por consultas urgentes escribinos a{' '}
              <strong>soporte.falu@gmail.com</strong>.
            </span>
            <button
              type="button"
              onClick={() => setOpcionSeleccionada(null)}
              className="font-bold text-blue-700 hover:underline ml-4"
            >
              Cerrar
            </button>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}