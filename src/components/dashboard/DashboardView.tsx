import React from 'react';
import {
  Users,
  Wrench,
  AlertTriangle,
  Clock,
  TrendingUp,
  Plus,
  ArrowRight,
  CheckCircle2,
  ShoppingCart,
  Receipt,
  DollarSign,
  Package,
} from 'lucide-react';
import { Cliente, Producto, Venta, SeccionApp } from '../../types';
import { formatMoney, formatDate, formatDateTime } from '../../utils/formatters';

interface DashboardViewProps {
  clientes: Cliente[];
  productos: Producto[];
  ventas: Venta[];
  onCambiarSeccion: (seccion: SeccionApp) => void;
  onVerFactura: (venta: Venta) => void;
  onEditarProducto: (producto: Producto) => void;
  onNuevaVenta: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  clientes,
  productos,
  ventas,
  onCambiarSeccion,
  onVerFactura,
  onEditarProducto,
  onNuevaVenta,
}) => {
  const hoyStr = new Date().toISOString().slice(0, 10);
  const mesActual = new Date().getMonth();
  const anioActual = new Date().getFullYear();

  const totalClientesActivos = clientes.filter((c) => c.activo).length;
  const totalProductosActivos = productos.filter((p) => p.activo).length;

  const productosStockBajo = productos.filter((p) => p.activo && p.stock <= p.stockMinimo);

  const ventasValidas = ventas.filter((v) => v.estado !== 'anulada');

  const ventasHoy = ventasValidas.filter((v) => v.fecha && v.fecha.slice(0, 10) === hoyStr);
  const totalIngresosHoy = ventasHoy.reduce((acc, v) => acc + (v.total || 0), 0);

  const ventasMes = ventasValidas.filter((v) => {
    if (!v.fecha) return false;
    const d = new Date(v.fecha);
    return d.getMonth() === mesActual && d.getFullYear() === anioActual;
  });
  const totalIngresosMes = ventasMes.reduce((acc, v) => acc + (v.total || 0), 0);

  const totalSaldosCobrar = ventasValidas.reduce((acc, v) => acc + (v.saldoPendiente || 0), 0);
  const ventasPendientesCredito = ventasValidas.filter((v) => v.saldoPendiente > 0);

  const ventasRecientes = [...ventas].slice(0, 6);

  return (
    <div className="space-y-6">
      {/* Banner Oficial y Cabecera MOTOMOTO S&E */}
      <div className="rounded-xl overflow-hidden border border-zinc-800/80 shadow-2xl bg-zinc-950">
        <div className="w-full bg-zinc-950 flex items-center justify-center overflow-hidden">
          <img
            src="/assets/aistudio/image_b67a324e.png"
            alt="MOTOMOTO S&E - Taller de Repuestos de Moto"
            className="w-full h-auto max-h-60 object-cover object-center"
          />
        </div>
        <div className="p-4 sm:p-5 bg-gradient-to-r from-zinc-900 via-zinc-900 to-zinc-950 border-t border-zinc-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-lg sm:text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
              <span>MOTOMOTO S&E</span>
              <span className="text-xs font-normal text-zinc-400 hidden sm:inline">
                · Taller de Repuestos de Moto
              </span>
            </h1>
            <p className="text-xs text-zinc-400 mt-0.5">
              Control de inventario de repuestos y herramientas, facturación en mostrador y servicios mecánicos
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              onClick={onNuevaVenta}
              className="px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-500 rounded-lg transition-colors flex items-center gap-2 shadow-sm shadow-red-900/30"
            >
              <ShoppingCart className="w-4 h-4" />
              <span>Nueva Venta / Factura</span>
            </button>
            <button
              onClick={() => onCambiarSeccion('productos')}
              className="px-4 py-2 text-xs font-medium text-zinc-300 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors flex items-center gap-2 border border-zinc-700/60"
            >
              <Wrench className="w-4 h-4 text-zinc-400" />
              <span>Ver Catálogo e Inventario</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3.5">
        {/* Card 1: Ventas Hoy */}
        <div
          onClick={() => onCambiarSeccion('historial_ventas')}
          className="bg-zinc-900/90 border border-zinc-800 p-4 rounded-xl hover:border-zinc-700 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-emerald-400 uppercase tracking-wider">Ventas Hoy</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-3">
            <div className="text-xl font-bold text-emerald-400 font-mono tabular-nums">
              {formatMoney(totalIngresosHoy)}
            </div>
            <div className="text-[11px] text-zinc-400 mt-0.5">{ventasHoy.length} facturas hoy</div>
          </div>
        </div>

        {/* Card 2: Total Mes */}
        <div
          onClick={() => onCambiarSeccion('reportes')}
          className="bg-zinc-900/90 border border-zinc-800 p-4 rounded-xl hover:border-zinc-700 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider">Facturado Mes</span>
            <TrendingUp className="w-4 h-4 text-zinc-400 group-hover:text-zinc-200 transition-colors" />
          </div>
          <div className="mt-3">
            <div className="text-xl font-bold text-zinc-100 font-mono tabular-nums">
              {formatMoney(totalIngresosMes)}
            </div>
            <div className="text-[11px] text-zinc-400 mt-0.5">{ventasMes.length} ventas este mes</div>
          </div>
        </div>

        {/* Card 3: Cuentas por Cobrar */}
        <div
          onClick={() => onCambiarSeccion('historial_ventas')}
          className="bg-zinc-900/90 border border-zinc-800 p-4 rounded-xl hover:border-zinc-700 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-amber-400 uppercase tracking-wider">Por Cobrar</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-3">
            <div className="text-xl font-bold text-amber-400 font-mono tabular-nums">
              {formatMoney(totalSaldosCobrar)}
            </div>
            <div className="text-[11px] text-zinc-400 mt-0.5">{ventasPendientesCredito.length} ventas con saldo</div>
          </div>
        </div>

        {/* Card 4: Productos Activos */}
        <div
          onClick={() => onCambiarSeccion('productos')}
          className="bg-zinc-900/90 border border-zinc-800 p-4 rounded-xl hover:border-zinc-700 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider">Productos</span>
            <Wrench className="w-4 h-4 text-zinc-400 group-hover:text-zinc-200 transition-colors" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-zinc-100 font-mono tabular-nums">
              {totalProductosActivos}
            </div>
            <div className="text-[11px] text-zinc-400 mt-0.5">Herramientas y repuestos</div>
          </div>
        </div>

        {/* Card 5: Stock Bajo */}
        <div
          onClick={() => onCambiarSeccion('inventario')}
          className="bg-zinc-900/90 border border-zinc-800 p-4 rounded-xl hover:border-zinc-700 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-amber-400 uppercase tracking-wider">Stock Bajo</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-3">
            <div
              className={`text-2xl font-bold font-mono tabular-nums ${
                productosStockBajo.length > 0 ? 'text-amber-400' : 'text-zinc-100'
              }`}
            >
              {productosStockBajo.length}
            </div>
            <div className="text-[11px] text-zinc-400 mt-0.5">Por reabastecer</div>
          </div>
        </div>

        {/* Card 6: Clientes */}
        <div
          onClick={() => onCambiarSeccion('clientes')}
          className="bg-zinc-900/90 border border-zinc-800 p-4 rounded-xl hover:border-zinc-700 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider">Clientes</span>
            <Users className="w-4 h-4 text-zinc-400 group-hover:text-zinc-200 transition-colors" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-zinc-100 font-mono tabular-nums">
              {totalClientesActivos}
            </div>
            <div className="text-[11px] text-zinc-400 mt-0.5">Clientes registrados</div>
          </div>
        </div>
      </div>

      {/* Main Grid: Últimas Ventas / Facturas & Alertas de Stock */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 cols): Últimas Ventas */}
        <div className="lg:col-span-2 bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
                <Receipt className="w-4 h-4 text-red-500" />
                <span>Últimas Facturas y Ventas Realizadas</span>
              </h2>
              <p className="text-xs text-zinc-400">Comprobantes emitidos recientemente en mostrador y taller</p>
            </div>
            <button
              onClick={() => onCambiarSeccion('historial_ventas')}
              className="text-xs text-red-400 hover:text-red-300 font-medium flex items-center gap-1 transition-colors"
            >
              <span>Ver todas</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {ventasRecientes.length === 0 ? (
            <div className="p-8 text-center">
              <ShoppingCart className="w-10 h-10 text-zinc-600 mx-auto mb-2" />
              <p className="text-sm font-medium text-zinc-300">No hay facturas emitidas todavía</p>
              <p className="text-xs text-zinc-400 mt-1">
                Abre el Punto de Venta para cobrar artículos o cargar datos de muestra.
              </p>
              <button
                onClick={onNuevaVenta}
                className="mt-4 px-3.5 py-1.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-500 rounded-lg inline-flex items-center gap-1.5 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Nueva Venta
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-zinc-800 bg-zinc-950/40 text-zinc-400">
                    <th className="px-4 py-3 font-medium">Factura</th>
                    <th className="px-4 py-3 font-medium">Fecha</th>
                    <th className="px-4 py-3 font-medium">Cliente</th>
                    <th className="px-4 py-3 font-medium">Tipo</th>
                    <th className="px-4 py-3 font-medium text-right">Total</th>
                    <th className="px-4 py-3 font-medium text-center">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {ventasRecientes.map((v) => (
                    <tr
                      key={v.id}
                      onClick={() => onVerFactura(v)}
                      className="hover:bg-zinc-800/40 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3 font-mono font-bold text-red-400 whitespace-nowrap">
                        {v.numeroFactura}
                      </td>
                      <td className="px-4 py-3 text-zinc-400 whitespace-nowrap">
                        {formatDateTime(v.fecha)}
                      </td>
                      <td className="px-4 py-3 font-medium text-zinc-200">
                        <div className="truncate max-w-[160px]">{v.clienteNombre}</div>
                        {v.placaMoto && (
                          <div className="text-[10px] text-zinc-400 font-mono">Moto: {v.placaMoto}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-zinc-300">
                        {v.tipoVenta === 'venta_directa'
                          ? 'Mostrador'
                          : v.tipoVenta === 'servicio_taller'
                          ? 'Taller'
                          : 'Mixta'}
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-right text-zinc-100 whitespace-nowrap">
                        {formatMoney(v.total)}
                      </td>
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        {v.estado === 'completada' && (
                          <span className="text-[11px] font-semibold text-emerald-400">Pagada</span>
                        )}
                        {v.estado === 'pendiente_pago' && (
                          <span className="text-[11px] font-semibold text-amber-400">
                            Saldo: {formatMoney(v.saldoPendiente)}
                          </span>
                        )}
                        {v.estado === 'anulada' && (
                          <span className="text-[11px] font-semibold text-red-400">Anulada</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right Column (1 col): Productos con Stock Bajo */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <h2 className="text-sm font-semibold text-zinc-100">Stock Crítico en Tienda</h2>
            </div>
            <button
              onClick={() => onCambiarSeccion('inventario')}
              className="text-xs text-amber-400 hover:text-amber-300 font-medium flex items-center gap-1 transition-colors"
            >
              <span>Kardex</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="p-4 flex-1 overflow-y-auto max-h-[380px]">
            {productosStockBajo.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-zinc-400">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mb-2" />
                <p className="text-xs font-medium text-zinc-200">Inventario al día</p>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  Todas las herramientas y repuestos tienen existencias por encima del mínimo.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {productosStockBajo.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => onEditarProducto(p)}
                    className="p-3 bg-zinc-950/60 border border-zinc-800 rounded-lg hover:border-amber-700/50 cursor-pointer transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-zinc-200 truncate">{p.nombre}</div>
                        <div className="text-[11px] text-zinc-400 flex items-center gap-1.5 mt-0.5">
                          <span className="font-mono text-zinc-400">{p.codigo}</span>
                          <span>·</span>
                          <span>{p.marca}</span>
                          {p.proveedor && (
                            <>
                              <span>·</span>
                              <span className="text-zinc-400 truncate max-w-[120px]">🚚 {p.proveedor}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-xs font-mono font-bold text-amber-400">
                          {p.stock} disp.
                        </div>
                        <div className="text-[10px] text-zinc-400">Mín: {p.stockMinimo}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="p-3 bg-zinc-950/40 border-t border-zinc-800 text-[11px] text-zinc-400 flex items-center justify-between">
            <span>Saldos pendientes totales:</span>
            <span className="font-mono font-semibold text-amber-400">{formatMoney(totalSaldosCobrar)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
