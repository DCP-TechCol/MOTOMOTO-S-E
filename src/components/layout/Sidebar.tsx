import React from 'react';
import {
  LayoutDashboard,
  ShoppingCart,
  Receipt,
  Users,
  Wrench,
  Boxes,
  BarChart3,
  Settings,
  HardDrive,
  Database,
  Bike,
  ShieldCheck,
} from 'lucide-react';
import { SeccionApp } from '../../types';

interface SidebarProps {
  seccionActual: SeccionApp;
  onCambiarSeccion: (seccion: SeccionApp) => void;
  nombreTaller?: string;
  conteos?: {
    clientes: number;
    productos: number;
    stockBajo: number;
    ventasPendientes: number;
  };
}

export const Sidebar: React.FC<SidebarProps> = ({
  seccionActual,
  onCambiarSeccion,
  nombreTaller = 'MOTOMOTO S&E',
  conteos,
}) => {
  const menuItems: {
    id: SeccionApp;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number;
    badgeVariant?: 'neutral' | 'danger' | 'warning';
  }[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
    },
    {
      id: 'pos_ventas',
      label: 'Punto de Venta / Facturar',
      icon: ShoppingCart,
    },
    {
      id: 'historial_ventas',
      label: 'Historial de Ventas',
      icon: Receipt,
      badge: conteos?.ventasPendientes && conteos.ventasPendientes > 0 ? conteos.ventasPendientes : undefined,
      badgeVariant: 'warning',
    },
    {
      id: 'clientes',
      label: 'Clientes',
      icon: Users,
      badge: conteos?.clientes,
    },
    {
      id: 'productos',
      label: 'Productos y Herramientas',
      icon: Wrench,
      badge: conteos?.productos,
    },
    {
      id: 'inventario',
      label: 'Inventario y Kardex',
      icon: Boxes,
      badge: conteos?.stockBajo && conteos.stockBajo > 0 ? conteos.stockBajo : undefined,
      badgeVariant: 'danger',
    },
    {
      id: 'reportes',
      label: 'Reportes y Cierre',
      icon: BarChart3,
    },
    {
      id: 'configuracion',
      label: 'Configuración',
      icon: Settings,
    },
  ];

  return (
    <aside className="w-64 bg-zinc-950 border-r border-zinc-800/80 flex flex-col shrink-0 no-print select-none h-screen sticky top-0">
      {/* Brand Header */}
      <div className="p-5 border-b border-zinc-800/80 flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-red-600 flex items-center justify-center text-white shadow-lg shadow-red-900/30 shrink-0">
          <Bike className="w-6 h-6" />
        </div>
        <div className="min-w-0">
          <h1 className="text-sm font-bold text-zinc-100 truncate tracking-tight">MOTOMOTO S&E</h1>
          <p className="text-xs text-zinc-400 truncate">{nombreTaller}</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        <div className="px-3 pt-2 pb-1 text-[11px] font-semibold tracking-wider text-zinc-400 uppercase">
          Módulos Comerciales
        </div>
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = seccionActual === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onCambiarSeccion(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all group ${
                isActive
                  ? 'bg-red-600/15 text-white font-semibold border border-red-500/40 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <Icon
                  className={`w-4 h-4 shrink-0 transition-colors ${
                    isActive ? 'text-red-500' : 'text-zinc-400 group-hover:text-zinc-200'
                  }`}
                />
                <span className="truncate">{item.label}</span>
              </div>
              {item.badge !== undefined && item.badge > 0 && (
                <span
                  className={`px-1.5 py-0.5 text-[10px] font-mono tabular-nums font-semibold rounded shrink-0 ${
                    item.badgeVariant === 'danger'
                      ? 'bg-red-950 text-red-400 border border-red-800/60'
                      : item.badgeVariant === 'warning'
                      ? 'bg-amber-950 text-amber-300 border border-amber-800/60'
                      : 'bg-zinc-800 text-zinc-400'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Offline IndexedDB Status Box */}
      <div className="p-3 m-3 bg-zinc-900/90 border border-zinc-800 rounded-lg">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-200">
            <Database className="w-3.5 h-3.5 text-emerald-400" />
            <span>Almacenamiento Local</span>
          </div>
          <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium rounded bg-emerald-950/80 text-emerald-400 border border-emerald-800/60">
            IndexedDB Activo
          </span>
        </div>
        <p className="text-[11px] text-zinc-400 leading-relaxed">
          Ventas, facturación y stock guardados de forma autónoma en este equipo.
        </p>
        <div className="mt-2.5 pt-2 border-t border-zinc-800/80 flex items-center justify-between text-[10px] text-zinc-400">
          <div className="flex items-center gap-1">
            <HardDrive className="w-3 h-3 text-zinc-400" />
            <span>Modo Offline</span>
          </div>
          <div className="flex items-center gap-1 text-emerald-400">
            <ShieldCheck className="w-3 h-3" />
            <span>Respaldo Listo</span>
          </div>
        </div>
      </div>
    </aside>
  );
};
