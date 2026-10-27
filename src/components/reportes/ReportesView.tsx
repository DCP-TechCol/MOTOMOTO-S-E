import React, { useMemo } from 'react';
import {
  BarChart3,
  DollarSign,
  TrendingUp,
  Download,
  Calendar,
  FileSpreadsheet,
  PieChart,
  Wrench,
  Users,
  CheckCircle,
  Banknote,
  CreditCard,
  Clock,
  Zap,
  ShieldCheck,
  Cog,
  Sparkles,
} from 'lucide-react';
import { Venta, Producto, Cliente } from '../../types';
import { formatMoney, formatDateTime, formatDate, downloadCSV } from '../../utils/formatters';

interface ReportesViewProps {
  ventas: Venta[];
  productos: Producto[];
  clientes: Cliente[];
}

export const ReportesView: React.FC<ReportesViewProps> = ({
  ventas,
  productos,
  clientes,
}) => {
  // Cálculos financieros y desglose por líneas de negocio MOTOMOTO S&E
  const metricas = useMemo(() => {
    const ventasValidas = ventas.filter((v) => v.estado !== 'anulada');

    const totalFacturado = ventasValidas.reduce((sum, v) => sum + v.total, 0);
    const totalCobrado = ventasValidas.reduce(
      (sum, v) => sum + (v.montoPagado || (v.pagos?.reduce((acc, p) => acc + p.monto, 0) || 0)),
      0
    );
    const totalPorCobrar = ventasValidas.reduce((sum, v) => sum + (v.saldoPendiente || 0), 0);

    // Desglose por los 4 Pilares de MOTOMOTO S&E
    let totalElectricidad = 0;
    let totalTallerMecanico = 0;
    let totalRepuestosOriginales = 0;
    let totalRepuestosGenericos = 0;
    let totalOtros = 0;

    ventasValidas.forEach((v) => {
      totalElectricidad += v.subtotalElectricidad || 0;
      totalTallerMecanico += (v.subtotalTallerMecanico || 0) + (v.manoDeObra && !v.subtotalTallerMecanico ? v.manoDeObra : 0);
      totalRepuestosOriginales += v.subtotalRepuestosOriginales || 0;
      totalRepuestosGenericos += v.subtotalRepuestosGenericos || 0;
      totalOtros += v.subtotalOtrosProductos || 0;
    });

    // Conteo y montos por medio de pago (Cierre de caja)
    const porMetodo: Record<string, { cantidad: number; total: number }> = {
      efectivo: { cantidad: 0, total: 0 },
      transferencia: { cantidad: 0, total: 0 },
      tarjeta: { cantidad: 0, total: 0 },
      credito: { cantidad: 0, total: 0 },
    };

    ventasValidas.forEach((v) => {
      const m = v.metodoPagoPrincipal || 'efectivo';
      if (!porMetodo[m]) porMetodo[m] = { cantidad: 0, total: 0 };
      porMetodo[m].cantidad += 1;
      porMetodo[m].total += v.total;
    });

    // Artículos más vendidos
    const articulosUso: Record<string, { nombre: string; cantidad: number; totalGenerado: number }> = {};
    ventasValidas.forEach((v) => {
      v.items?.forEach((it) => {
        if (!articulosUso[it.productoId]) {
          articulosUso[it.productoId] = {
            nombre: it.nombre,
            cantidad: 0,
            totalGenerado: 0,
          };
        }
        articulosUso[it.productoId].cantidad += it.cantidad;
        articulosUso[it.productoId].totalGenerado += it.subtotal;
      });
    });

    const topArticulos = Object.values(articulosUso)
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 6);

    return {
      totalFacturado,
      totalCobrado,
      totalPorCobrar,
      totalElectricidad,
      totalTallerMecanico,
      totalRepuestosOriginales,
      totalRepuestosGenericos,
      totalOtros,
      porMetodo,
      topArticulos,
      totalVentas: ventasValidas.length,
    };
  }, [ventas]);

  // Exportaciones CSV
  const exportarVentasCSV = () => {
    const data = ventas.map((v) => ({
      'Factura N°': v.numeroFactura,
      Fecha: formatDateTime(v.fecha),
      'Tipo Venta': v.tipoVenta,
      Cliente: v.clienteNombre,
      Teléfono: v.clienteTelefono || '',
      'Placa Moto': v.placaMoto || '',
      '⚡ Subtotal Electricidad': v.subtotalElectricidad || 0,
      '🔧 Subtotal Mecánica': v.subtotalTallerMecanico || v.manoDeObra || 0,
      '⭐ Subtotal Rep. Originales': v.subtotalRepuestosOriginales || 0,
      '⚙️ Subtotal Rep. Genéricos': v.subtotalRepuestosGenericos || 0,
      '🧰 Otros Insumos': v.subtotalOtrosProductos || 0,
      Descuento: v.descuento || 0,
      'Total Factura': v.total,
      'Medio Pago': v.metodoPagoPrincipal,
      'Saldo Pendiente': v.saldoPendiente || 0,
      Estado: v.estado,
    }));
    downloadCSV(`motomoto_facturacion_${new Date().toISOString().slice(0, 10)}.csv`, data);
  };

  const exportarProductosCSV = () => {
    const data = productos.map((p) => ({
      SKU: p.codigo,
      Nombre: p.nombre,
      'Tipo Repuesto': p.tipoRepuesto,
      'Garantía (Meses)': p.garantiaMeses || 0,
      Categoría: p.categoria,
      Marca: p.marca,
      Proveedor: p.proveedor || '',
      'Contacto Proveedor': p.proveedorContacto || '',
      Stock: p.stock,
      'Stock Mínimo': p.stockMinimo,
      'Costo Unitario': p.costoUnitario,
      'Precio Venta': p.precioVenta,
      Activo: p.activo ? 'Sí' : 'No',
    }));
    downloadCSV(`motomoto_inventario_${new Date().toISOString().slice(0, 10)}.csv`, data);
  };

  const exportarClientesCSV = () => {
    const data = clientes.map((c) => ({
      Nombre: c.nombre,
      Documento: c.documento || '',
      Teléfono: c.telefono,
      Email: c.email || '',
      Dirección: c.direccion || '',
      'Fecha Registro': formatDate(c.fechaRegistro),
      Activo: c.activo ? 'Sí' : 'No',
    }));
    downloadCSV(`motomoto_clientes_${new Date().toISOString().slice(0, 10)}.csv`, data);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
        <div>
          <h3 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-red-500" />
            <span>Reportes Financieros y Cierre de Caja · MOTOMOTO S&E</span>
          </h3>
          <p className="text-xs text-zinc-400">
            Arqueo de ingresos por pilar de negocio, medio de pago y exportación de datos
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={exportarVentasCSV}
            className="px-3 py-1.5 text-xs font-medium text-zinc-200 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors flex items-center gap-1.5 border border-zinc-700/60"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            <span>Facturas Detalladas (CSV)</span>
          </button>
          <button
            onClick={exportarProductosCSV}
            className="px-3 py-1.5 text-xs font-medium text-zinc-200 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors flex items-center gap-1.5 border border-zinc-700/60"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-blue-400" />
            <span>Inventario (CSV)</span>
          </button>
          <button
            onClick={exportarClientesCSV}
            className="px-3 py-1.5 text-xs font-medium text-zinc-200 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors flex items-center gap-1.5 border border-zinc-700/60"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-amber-400" />
            <span>Clientes (CSV)</span>
          </button>
        </div>
      </div>

      {/* Main Financial KPI Strips */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-xs uppercase font-medium">Facturación Total</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-zinc-100 mt-2">
            {formatMoney(metricas.totalFacturado)}
          </div>
          <div className="text-[11px] text-zinc-400 mt-0.5">{metricas.totalVentas} facturas emitidas</div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-xs uppercase font-medium">Recaudado Efectivo & Banco</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-400 mt-2">
            {formatMoney(metricas.totalCobrado)}
          </div>
          <div className="text-[11px] text-zinc-400 mt-0.5">Dinero efectivamente cobrado</div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
          <div className="flex items-center justify-between text-amber-400">
            <span className="text-xs uppercase font-medium">Cuentas por Cobrar (Crédito)</span>
            <Clock className="w-4 h-4" />
          </div>
          <div className="text-2xl font-bold font-mono text-amber-400 mt-2">
            {formatMoney(metricas.totalPorCobrar)}
          </div>
          <div className="text-[11px] text-zinc-400 mt-0.5">Saldos pendientes de clientes</div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-xs uppercase font-medium">Servicios de Taller</span>
            <Wrench className="w-4 h-4 text-red-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-zinc-100 mt-2">
            {formatMoney(metricas.totalElectricidad + metricas.totalTallerMecanico)}
          </div>
          <div className="text-[11px] text-zinc-400 mt-0.5">
            Mano de obra (Eléctrica + Mecánica)
          </div>
        </div>
      </div>

      {/* Franja Especial: Desglose por los 4 Pilares de MOTOMOTO S&E */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <div>
            <h4 className="text-xs font-semibold text-zinc-100 uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-red-500" />
              <span>Rendimiento por Línea de Negocio (Los 4 Pilares de MOTOMOTO S&E)</span>
            </h4>
            <p className="text-xs text-zinc-400">
              Distribución de ingresos generados en el taller y ventas de repuestos
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Pilar 1: Electricidad */}
          <div className="p-4 bg-zinc-950/80 border border-amber-800/40 rounded-xl space-y-1">
            <div className="flex items-center justify-between text-amber-400">
              <span className="text-xs font-bold flex items-center gap-1.5">
                <Zap className="w-4 h-4 fill-amber-400" />
                Electricidad de Motos
              </span>
            </div>
            <div className="text-xl font-bold font-mono text-amber-300 mt-1">
              {formatMoney(metricas.totalElectricidad)}
            </div>
            <p className="text-[10px] text-zinc-400">
              Estatores, sistemas de carga, arneses y exploradoras
            </p>
          </div>

          {/* Pilar 2: Taller Mecánico */}
          <div className="p-4 bg-zinc-950/80 border border-orange-800/40 rounded-xl space-y-1">
            <div className="flex items-center justify-between text-orange-400">
              <span className="text-xs font-bold flex items-center gap-1.5">
                <Wrench className="w-4 h-4" />
                Taller Mecánico
              </span>
            </div>
            <div className="text-xl font-bold font-mono text-orange-300 mt-1">
              {formatMoney(metricas.totalTallerMecanico)}
            </div>
            <p className="text-[10px] text-zinc-400">
              Mantenimiento preventivo, motor, frenos y suspensión
            </p>
          </div>

          {/* Pilar 3: Repuestos Originales */}
          <div className="p-4 bg-zinc-950/80 border border-emerald-800/40 rounded-xl space-y-1">
            <div className="flex items-center justify-between text-emerald-400">
              <span className="text-xs font-bold flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4" />
                Repuestos Originales
              </span>
            </div>
            <div className="text-xl font-bold font-mono text-emerald-300 mt-1">
              {formatMoney(metricas.totalRepuestosOriginales)}
            </div>
            <p className="text-[10px] text-zinc-400">
              Línea OEM con respaldo y garantía oficial de fábrica
            </p>
          </div>

          {/* Pilar 4: Repuestos Genéricos */}
          <div className="p-4 bg-zinc-950/80 border border-blue-800/40 rounded-xl space-y-1">
            <div className="flex items-center justify-between text-blue-400">
              <span className="text-xs font-bold flex items-center gap-1.5">
                <Cog className="w-4 h-4" />
                Repuestos Genéricos
              </span>
            </div>
            <div className="text-xl font-bold font-mono text-blue-300 mt-1">
              {formatMoney(metricas.totalRepuestosGenericos)}
            </div>
            <p className="text-[10px] text-zinc-400">
              Alternativos de alta rotación para todas las marcas
            </p>
          </div>
        </div>
      </div>

      {/* Arqueo de Caja y Artículos Más Vendidos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
            <h4 className="text-xs font-semibold text-zinc-200 uppercase tracking-wider flex items-center gap-2">
              <Banknote className="w-4 h-4 text-emerald-400" />
              <span>Arqueo por Medio de Pago (Cierre de Caja)</span>
            </h4>
          </div>

          <div className="space-y-3">
            {Object.entries(metricas.porMetodo).map(([metodo, info]) => {
              const pct = metricas.totalFacturado > 0 ? Math.round((info.total / metricas.totalFacturado) * 100) : 0;
              return (
                <div key={metodo} className="p-3 bg-zinc-950/60 border border-zinc-800 rounded-lg space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-zinc-200 uppercase tracking-wide">
                      {metodo === 'efectivo'
                        ? '💵 Efectivo en Caja'
                        : metodo === 'transferencia'
                        ? '📲 Transferencia / Nequi'
                        : metodo === 'tarjeta'
                        ? '💳 Tarjetas / Datáfono'
                        : '⏳ Ventas a Crédito'}
                    </span>
                    <span className="font-mono font-bold text-zinc-100">
                      {formatMoney(info.total)}{' '}
                      <span className="text-zinc-500 font-normal">({pct}%)</span>
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-zinc-900 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        metodo === 'efectivo'
                          ? 'bg-emerald-500'
                          : metodo === 'transferencia'
                          ? 'bg-blue-500'
                          : metodo === 'tarjeta'
                          ? 'bg-purple-500'
                          : 'bg-amber-500'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="text-[11px] text-zinc-400 flex justify-between">
                    <span>{info.cantidad} comprobantes</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Productos Más Vendidos */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
            <h4 className="text-xs font-semibold text-zinc-200 uppercase tracking-wider flex items-center gap-2">
              <Wrench className="w-4 h-4 text-red-500" />
              <span>Artículos y Servicios con Mayor Rotación</span>
            </h4>
          </div>

          <div className="space-y-2.5">
            {metricas.topArticulos.length === 0 ? (
              <div className="p-8 text-center text-xs text-zinc-500">
                Aún no hay ventas de productos registradas
              </div>
            ) : (
              metricas.topArticulos.map((item, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-zinc-950/60 border border-zinc-800 rounded-lg flex items-center justify-between"
                >
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-zinc-200 truncate">{item.nombre}</div>
                    <div className="text-[11px] text-zinc-400 mt-0.5">
                      {item.cantidad} unidades / servicios facturados
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xs font-mono font-bold text-zinc-100">
                      {formatMoney(item.totalGenerado)}
                    </div>
                    <div className="text-[10px] text-zinc-400">Total facturado</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
