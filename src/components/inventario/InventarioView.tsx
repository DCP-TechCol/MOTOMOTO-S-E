import React, { useState, useMemo } from 'react';
import {
  Boxes,
  Search,
  ArrowUpDown,
  Download,
  AlertTriangle,
  TrendingUp,
  Package,
  Layers,
  FileSpreadsheet,
} from 'lucide-react';
import { Producto, MovimientoInventario, TipoMovimiento } from '../../types';
import { formatMoney, formatDateTime, downloadCSV } from '../../utils/formatters';

interface InventarioViewProps {
  productos: Producto[];
  movimientos: MovimientoInventario[];
  onAjustarStock: (productoId: string, tipo: TipoMovimiento, cantidad: number, motivo: string) => Promise<void>;
  onIrAProductos: () => void;
}

export const InventarioView: React.FC<InventarioViewProps> = ({
  productos,
  movimientos,
  onAjustarStock,
  onIrAProductos,
}) => {
  const [busqueda, setBusqueda] = useState('');
  const [filtroTipo, setFiltroTipo] = useState<string>('todos');

  // Métricas globales del inventario
  const valorTotalCosto = useMemo(() => {
    return productos.reduce((sum, p) => sum + (p.activo ? p.costoUnitario * p.stock : 0), 0);
  }, [productos]);

  const valorTotalVenta = useMemo(() => {
    return productos.reduce((sum, p) => sum + (p.activo ? p.precioVenta * p.stock : 0), 0);
  }, [productos]);

  const gananciaPotencial = valorTotalVenta - valorTotalCosto;

  const totalUnidades = useMemo(() => {
    return productos.reduce((sum, p) => sum + (p.activo ? p.stock : 0), 0);
  }, [productos]);

  const productosCriticos = useMemo(() => {
    return productos.filter((p) => p.activo && p.stock <= p.stockMinimo);
  }, [productos]);

  // Filtrado de movimientos
  const movimientosFiltrados = useMemo(() => {
    const q = busqueda.toLowerCase().trim();
    return movimientos.filter((m) => {
      if (filtroTipo !== 'todos' && m.tipo !== filtroTipo) return false;
      if (!q) return true;
      const matchCod = m.productoCodigo.toLowerCase().includes(q);
      const matchNom = m.productoNombre.toLowerCase().includes(q);
      const matchMot = m.motivo.toLowerCase().includes(q);
      return matchCod || matchNom || matchMot;
    });
  }, [movimientos, busqueda, filtroTipo]);

  const exportarMovimientosCSV = () => {
    const data = movimientos.map((m) => ({
      Fecha: formatDateTime(m.fecha),
      SKU: m.productoCodigo,
      Producto: m.productoNombre,
      Tipo: m.tipo,
      Cantidad: m.cantidad,
      'Stock Anterior': m.stockAnterior,
      'Stock Nuevo': m.stockNuevo,
      Motivo: m.motivo,
      Referencia: m.referenciaId || '',
    }));
    downloadCSV(`kardex_inventario_${new Date().toISOString().slice(0, 10)}.csv`, data);
  };

  return (
    <div className="space-y-6">
      {/* Financial Valuation Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-xs uppercase font-medium">Valor al Costo</span>
            <Layers className="w-4 h-4 text-zinc-400" />
          </div>
          <div className="text-xl font-bold font-mono text-zinc-100 mt-2">
            {formatMoney(valorTotalCosto)}
          </div>
          <div className="text-[11px] text-zinc-400 mt-0.5">Capital invertido en bodega</div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-xs uppercase font-medium">Valor a la Venta</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl font-bold font-mono text-emerald-400 mt-2">
            {formatMoney(valorTotalVenta)}
          </div>
          <div className="text-[11px] text-zinc-400 mt-0.5">
            Margen proyectado: {formatMoney(gananciaPotencial)}
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-xs uppercase font-medium">Unidades Físicas</span>
            <Package className="w-4 h-4 text-zinc-400" />
          </div>
          <div className="text-xl font-bold font-mono text-zinc-100 mt-2">
            {totalUnidades}
          </div>
          <div className="text-[11px] text-zinc-400 mt-0.5">
            Distribuidas en {productos.filter((p) => p.activo).length} SKUs activos
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
          <div className="flex items-center justify-between text-amber-400">
            <span className="text-xs uppercase font-medium">Alertas de Stock</span>
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div className="text-xl font-bold font-mono text-amber-400 mt-2">
            {productosCriticos.length}
          </div>
          <div className="text-[11px] text-zinc-400 mt-0.5">
            Productos en nivel crítico o agotado
          </div>
        </div>
      </div>

      {/* Kardex Header and Toolbar */}
      <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-zinc-100">Kardex General de Movimientos</h3>
            <p className="text-xs text-zinc-400">
              Historial de entradas, salidas y consumo de repuestos en órdenes de servicio
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={exportarMovimientosCSV}
              className="px-3 py-1.5 text-xs font-medium text-zinc-300 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors flex items-center gap-1.5 border border-zinc-700/60"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span>Exportar Kardex (CSV)</span>
            </button>
            <button
              onClick={onIrAProductos}
              className="px-3 py-1.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-500 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <Boxes className="w-3.5 h-3.5" />
              <span>Ir a Catálogo</span>
            </button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2 border-t border-zinc-800">
          <div className="flex flex-1 items-center gap-2 max-w-md bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5">
            <Search className="w-4 h-4 text-zinc-500 shrink-0" />
            <input
              type="text"
              placeholder="Buscar por SKU, producto o motivo..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full bg-transparent text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none"
            />
          </div>

          {/* Type filters */}
          <div className="flex items-center gap-1 p-1 bg-zinc-950 border border-zinc-800 rounded-lg text-xs">
            <button
              onClick={() => setFiltroTipo('todos')}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                filtroTipo === 'todos' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Todos ({movimientos.length})
            </button>
            <button
              onClick={() => setFiltroTipo('entrada')}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                filtroTipo === 'entrada' ? 'bg-zinc-800 text-emerald-400' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Entradas
            </button>
            <button
              onClick={() => setFiltroTipo('servicio')}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                filtroTipo === 'servicio' ? 'bg-zinc-800 text-blue-400' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Servicios
            </button>
            <button
              onClick={() => setFiltroTipo('salida')}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                filtroTipo === 'salida' ? 'bg-zinc-800 text-red-400' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Salidas
            </button>
            <button
              onClick={() => setFiltroTipo('ajuste')}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                filtroTipo === 'ajuste' ? 'bg-zinc-800 text-amber-400' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Ajustes
            </button>
          </div>
        </div>
      </div>

      {/* Kardex Movements Table */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-xs">
        {movimientosFiltrados.length === 0 ? (
          <div className="p-12 text-center text-xs text-zinc-400">
            No hay registros de movimientos en el kardex con los filtros aplicados.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-zinc-950/60 border-b border-zinc-800 text-zinc-400">
                  <th className="px-4 py-3 font-medium">Fecha y Hora</th>
                  <th className="px-4 py-3 font-medium">SKU</th>
                  <th className="px-4 py-3 font-medium">Producto / Herramienta</th>
                  <th className="px-4 py-3 font-medium">Tipo Movimiento</th>
                  <th className="px-4 py-3 font-medium text-center">Cantidad</th>
                  <th className="px-4 py-3 font-medium text-center">Stock Anterior → Nuevo</th>
                  <th className="px-4 py-3 font-medium">Motivo / Documento</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {movimientosFiltrados.map((m) => (
                  <tr key={m.id} className="hover:bg-zinc-800/40 transition-colors">
                    <td className="px-4 py-3 text-zinc-400 whitespace-nowrap">
                      {formatDateTime(m.fecha)}
                    </td>
                    <td className="px-4 py-3 font-mono text-zinc-300 font-medium whitespace-nowrap">
                      {m.productoCodigo}
                    </td>
                    <td className="px-4 py-3 text-zinc-200 font-medium">
                      {m.productoNombre}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {m.tipo === 'entrada' && (
                        <span className="text-emerald-400 font-medium">+ Entrada de Inventario</span>
                      )}
                      {m.tipo === 'salida' && (
                        <span className="text-red-400 font-medium">- Salida / Merma</span>
                      )}
                      {(m.tipo === 'venta' || m.tipo === 'servicio') && (
                        <span className="text-blue-400 font-medium">🧾 Venta / Factura</span>
                      )}
                      {m.tipo === 'ajuste' && (
                        <span className="text-amber-400 font-medium">↺ Conteo / Ajuste Físico</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-center font-bold text-zinc-100">
                      {m.cantidad}
                    </td>
                    <td className="px-4 py-3 font-mono text-center text-zinc-400">
                      {m.stockAnterior} → <span className="text-zinc-100 font-semibold">{m.stockNuevo}</span>
                    </td>
                    <td className="px-4 py-3 text-zinc-300 max-w-xs truncate">
                      {m.motivo}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
