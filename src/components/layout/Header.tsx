import React from 'react';
import { Plus, Database, Sparkles, RefreshCw, ShoppingCart } from 'lucide-react';
import { SeccionApp } from '../../types';

interface HeaderProps {
  seccionActual: SeccionApp;
  onNuevaVentaRapida: () => void;
  onCargarDemo: () => void;
  onRefrescar: () => void;
  isCargando?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  seccionActual,
  onNuevaVentaRapida,
  onCargarDemo,
  onRefrescar,
  isCargando = false,
}) => {
  const titulosSeccion: Record<SeccionApp, { title: string; subtitle: string }> = {
    dashboard: {
      title: 'Panel Comercial y Operativo',
      subtitle: 'Resumen de ventas del día, facturación del mes y existencias críticas',
    },
    pos_ventas: {
      title: 'Punto de Venta (POS) y Facturación',
      subtitle: 'Terminal de caja, venta directa de herramientas/repuestos y servicios de moto',
    },
    historial_ventas: {
      title: 'Historial de Facturas y Ventas',
      subtitle: 'Consulta de comprobantes, cobro de saldos a crédito e impresión de tickets',
    },
    clientes: {
      title: 'Directorio de Clientes',
      subtitle: 'Registro de clientes, cuentas corrientes e historial de compras',
    },
    productos: {
      title: 'Catálogo de Herramientas y Repuestos',
      subtitle: 'Control de precios, costos, márgenes y códigos de inventario',
    },
    inventario: {
      title: 'Control de Inventario y Kardex',
      subtitle: 'Valuación de bodega, movimientos de entrada/salida y conteos físicos',
    },
    reportes: {
      title: 'Reportes y Cierre de Caja',
      subtitle: 'Consolidado financiero, ventas por medio de pago y exportación CSV',
    },
    configuracion: {
      title: 'Configuración y Respaldo Local',
      subtitle: 'Datos de facturación, consecutivo de tickets y respaldo en archivo JSON',
    },
  };

  const current = titulosSeccion[seccionActual] || { title: 'MOTOMOTO S&E', subtitle: '' };

  return (
    <header className="h-16 px-6 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-800/80 flex items-center justify-between gap-4 sticky top-0 z-20 no-print">
      {/* Title & Breadcrumb */}
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-red-500">MOTOMOTO S&E</span>
          <span className="text-xs text-zinc-600">/</span>
          <h2 className="text-sm font-semibold text-zinc-100 truncate">{current.title}</h2>
        </div>
        <p className="text-[11px] text-zinc-400 truncate hidden sm:block">{current.subtitle}</p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2.5 shrink-0">
        <button
          onClick={onRefrescar}
          disabled={isCargando}
          title="Actualizar datos desde IndexedDB"
          className="p-2 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 border border-zinc-800 rounded-lg transition-colors text-xs flex items-center gap-1.5"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isCargando ? 'animate-spin' : ''}`} />
          <span className="hidden md:inline">Actualizar</span>
        </button>

        <button
          onClick={onCargarDemo}
          title="Cargar catálogo de herramientas y ventas de demostración"
          className="px-3 py-2 text-zinc-300 hover:text-zinc-100 hover:bg-zinc-900 border border-zinc-800 rounded-lg transition-colors text-xs font-medium flex items-center gap-1.5"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span className="hidden sm:inline">Cargar Datos Demo</span>
        </button>

        <button
          onClick={onNuevaVentaRapida}
          className="px-3.5 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-500 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm shadow-red-900/40"
        >
          <ShoppingCart className="w-4 h-4" />
          <span>+ Facturar / Venta</span>
        </button>
      </div>
    </header>
  );
};
