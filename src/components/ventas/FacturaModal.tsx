import React from 'react';
import {
  Printer,
  X,
  Bike,
  ShieldCheck,
  Wrench,
  Receipt,
  Zap,
  Cog,
  Info,
} from 'lucide-react';
import { Venta, ConfiguracionTaller } from '../../types';
import { formatMoney, formatDateTime } from '../../utils/formatters';

interface FacturaModalProps {
  isOpen: boolean;
  onClose: () => void;
  venta: Venta | null;
  configuracion: ConfiguracionTaller;
}

export const FacturaModal: React.FC<FacturaModalProps> = ({
  isOpen,
  onClose,
  venta,
  configuracion,
}) => {
  if (!isOpen || !venta) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-xs transition-opacity no-print"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Main Dialog */}
      <div className="relative w-full max-w-2xl bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden z-10 my-8">
        {/* Action Header (No-print) */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-900 no-print">
          <div>
            <h3 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
              <Receipt className="w-4 h-4 text-red-500" />
              <span>Factura de Venta / Servicio #{venta.numeroFactura}</span>
            </h3>
            <p className="text-xs text-zinc-400">
              MOTOMOTO S&E · Electricidad · Mecánica · Repuestos Originales & Genéricos
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-500 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm shadow-red-900/40"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir Comprobante</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Invoice Paper (Printable) */}
        <div className="p-6 md:p-8 bg-white text-zinc-900 printable-receipt font-sans">
          {/* Encabezado del Negocio MOTOMOTO S&E */}
          <div className="text-center pb-4 border-b border-zinc-300">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-zinc-950 text-red-500 mb-1 border border-zinc-800 shadow-sm">
              <Bike className="w-7 h-7" />
            </div>
            <h1 className="text-xl font-black uppercase tracking-tight text-zinc-950">
              MOTOMOTO S&E
            </h1>
            <p className="text-xs font-bold text-red-600 uppercase tracking-wide">
              Taller de Repuestos de Moto · Electricidad & Mecánica
            </p>
            <p className="text-xs text-zinc-600 font-semibold mt-1">NIT / RUT: {configuracion.nit}</p>
            <p className="text-xs text-zinc-600">
              {configuracion.direccion} · {configuracion.ciudad}
            </p>
            <p className="text-xs text-zinc-600 font-medium">Tel / WhatsApp: {configuracion.telefono}</p>

            {/* Franja de los 4 Pilares en el encabezado impreso */}
            <div className="mt-3 py-1 px-2 bg-zinc-100 rounded-md border border-zinc-200 text-[10px] font-bold text-zinc-700 flex items-center justify-center gap-3 flex-wrap uppercase">
              <span>⚡ Electricidad</span>
              <span>•</span>
              <span>🔧 Taller Mecánico</span>
              <span>•</span>
              <span>⭐ Repuestos Originales</span>
              <span>•</span>
              <span>⚙️ Repuestos Genéricos</span>
            </div>
          </div>

          {/* Datos de la Factura */}
          <div className="flex items-center justify-between py-3 border-b border-zinc-200 text-xs">
            <div>
              <span className="font-bold text-sm text-red-600 font-mono">
                FACTURA N°: {venta.numeroFactura}
              </span>
              <div className="text-zinc-600 text-[11px] mt-0.5">
                Fecha: {formatDateTime(venta.fecha)}
              </div>
            </div>
            <div className="text-right">
              <span
                className={`inline-block px-2 py-0.5 text-[11px] font-bold uppercase rounded border ${
                  venta.estado === 'completada'
                    ? 'border-emerald-600 text-emerald-700 bg-emerald-50'
                    : venta.estado === 'pendiente_pago'
                    ? 'border-amber-600 text-amber-700 bg-amber-50'
                    : 'border-red-600 text-red-700 bg-red-50'
                }`}
              >
                {venta.estado === 'completada'
                  ? 'PAGADA'
                  : venta.estado === 'pendiente_pago'
                  ? 'CRÉDITO PENDIENTE'
                  : 'ANULADA'}
              </span>
              <div className="text-[11px] text-zinc-600 mt-0.5">
                Medio: {venta.metodoPagoPrincipal.toUpperCase()}
              </div>
            </div>
          </div>

          {/* Cliente y Motocicleta */}
          <div className="grid grid-cols-2 gap-4 py-3 border-b border-zinc-200 text-xs">
            <div>
              <div className="font-bold text-zinc-700 uppercase text-[10px] tracking-wider mb-1">
                Datos del Cliente
              </div>
              <div className="font-semibold text-zinc-900">{venta.clienteNombre}</div>
              {venta.clienteDocumento && (
                <div className="text-zinc-600">Doc: {venta.clienteDocumento}</div>
              )}
              {venta.clienteTelefono && (
                <div className="text-zinc-600">Tel: {venta.clienteTelefono}</div>
              )}
            </div>

            {venta.incluyeServicioMoto ? (
              <div>
                <div className="font-bold text-zinc-700 uppercase text-[10px] tracking-wider mb-1">
                  Datos del Vehículo / Taller
                </div>
                <div className="font-semibold text-zinc-900">
                  {venta.marcaMoto || venta.modeloMoto
                    ? `${venta.marcaMoto || ''} ${venta.modeloMoto || ''}`
                    : 'Motocicleta'}
                </div>
                {venta.placaMoto && (
                  <div className="text-zinc-800 font-mono font-bold">Placa: {venta.placaMoto}</div>
                )}
                {venta.mecanicoResponsable && (
                  <div className="text-zinc-600 text-[11px]">Técnico: {venta.mecanicoResponsable}</div>
                )}
              </div>
            ) : (
              <div className="text-zinc-500 text-[11px] italic flex items-center">
                Venta de mostrador / Tienda de repuestos
              </div>
            )}
          </div>

          {/* Detalle Completo de Conceptos Facturados */}
          {venta.items && venta.items.length > 0 && (
            <div className="py-3 border-b border-zinc-200">
              <div className="font-bold text-zinc-700 uppercase text-[10px] tracking-wider mb-2">
                Detalle de Servicios y Repuestos Facturados
              </div>
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-zinc-300 text-zinc-600 text-[11px]">
                    <th className="py-1 w-10 text-center">Cant</th>
                    <th className="py-1">Descripción / Tipo</th>
                    <th className="py-1 text-right">P. Unit</th>
                    <th className="py-1 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {venta.items.map((item, idx) => {
                    const tagLabel =
                      item.tipoItem === 'servicio_electrico'
                        ? '⚡ Electricidad'
                        : item.tipoItem === 'servicio_mecanico'
                        ? '🔧 Taller Mecánico'
                        : item.tipoItem === 'repuesto_original'
                        ? '⭐ Original OEM'
                        : item.tipoItem === 'repuesto_generico'
                        ? '⚙️ Genérico'
                        : item.tipoItem === 'lubricante'
                        ? '🛢️ Lubricante'
                        : '🧰 Herramienta/Insumo';

                    return (
                      <tr key={idx} className="align-top">
                        <td className="py-1.5 font-mono font-bold text-center">{item.cantidad}</td>
                        <td className="py-1.5">
                          <div className="font-medium text-zinc-900 flex items-center gap-1.5 flex-wrap">
                            <span>{item.nombre}</span>
                            <span className="text-[9px] font-semibold uppercase px-1 py-0.2 bg-zinc-100 border border-zinc-300 rounded text-zinc-700">
                              {tagLabel}
                            </span>
                          </div>
                          {item.garantia && (
                            <div className="text-[10px] text-zinc-600 font-medium">
                              Garantía: {item.garantia}
                            </div>
                          )}
                          {item.nota && (
                            <div className="text-[10px] text-zinc-500 italic">
                              Nota: {item.nota}
                            </div>
                          )}
                        </td>
                        <td className="py-1.5 font-mono text-right text-zinc-600">
                          {formatMoney(item.precioUnitario)}
                        </td>
                        <td className="py-1.5 font-mono text-right font-semibold text-zinc-900">
                          {formatMoney(item.subtotal)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Mano de obra adicional si quedó en compatibilidad sin ítems de servicio */}
          {venta.incluyeServicioMoto && venta.manoDeObra > 0 && !venta.items?.some((i) => i.esServicio) && (
            <div className="py-2.5 border-b border-zinc-200 flex justify-between text-xs text-zinc-800">
              <div>
                <span className="font-bold">Mano de Obra de Taller:</span>
                {venta.descripcionServicio && (
                  <span className="text-zinc-600 block text-[11px]">{venta.descripcionServicio}</span>
                )}
              </div>
              <span className="font-mono font-semibold">{formatMoney(venta.manoDeObra)}</span>
            </div>
          )}

          {/* Desglose Detallado por los 4 Pilares de MOTOMOTO S&E */}
          <div className="py-3 border-b border-zinc-200 space-y-1 text-xs">
            {venta.subtotalElectricidad > 0 && (
              <div className="flex justify-between text-zinc-700 font-medium">
                <span>⚡ Subtotal Electricidad de Motos:</span>
                <span className="font-mono">{formatMoney(venta.subtotalElectricidad)}</span>
              </div>
            )}
            {venta.subtotalTallerMecanico > 0 && (
              <div className="flex justify-between text-zinc-700 font-medium">
                <span>🔧 Subtotal Taller Mecánico:</span>
                <span className="font-mono">{formatMoney(venta.subtotalTallerMecanico)}</span>
              </div>
            )}
            {venta.subtotalRepuestosOriginales > 0 && (
              <div className="flex justify-between text-zinc-700 font-medium">
                <span>⭐ Subtotal Repuestos Originales OEM:</span>
                <span className="font-mono">{formatMoney(venta.subtotalRepuestosOriginales)}</span>
              </div>
            )}
            {venta.subtotalRepuestosGenericos > 0 && (
              <div className="flex justify-between text-zinc-700 font-medium">
                <span>⚙️ Subtotal Repuestos Genéricos:</span>
                <span className="font-mono">{formatMoney(venta.subtotalRepuestosGenericos)}</span>
              </div>
            )}
            {venta.subtotalOtrosProductos > 0 && (
              <div className="flex justify-between text-zinc-600">
                <span>Subtotal Herramientas y Lubricantes:</span>
                <span className="font-mono">{formatMoney(venta.subtotalOtrosProductos)}</span>
              </div>
            )}

            {venta.descuento > 0 && (
              <div className="flex justify-between text-emerald-700 font-medium">
                <span>Descuento Especial:</span>
                <span className="font-mono">- {formatMoney(venta.descuento)}</span>
              </div>
            )}
            {venta.otrosCargos > 0 && (
              <div className="flex justify-between text-zinc-600">
                <span>Otros Cargos:</span>
                <span className="font-mono">{formatMoney(venta.otrosCargos)}</span>
              </div>
            )}

            <div className="flex justify-between pt-2 border-t border-zinc-300 text-sm font-black text-zinc-950">
              <span>TOTAL A PAGAR:</span>
              <span className="font-mono text-red-600 text-base">{formatMoney(venta.total)}</span>
            </div>
          </div>

          {/* Información de Pago y Saldos */}
          <div className="py-3 border-b border-zinc-200 text-xs space-y-1">
            <div className="flex justify-between text-zinc-700">
              <span>Medio de Pago:</span>
              <span className="font-bold uppercase">{venta.metodoPagoPrincipal}</span>
            </div>
            {venta.metodoPagoPrincipal === 'efectivo' && (
              <>
                <div className="flex justify-between text-zinc-600">
                  <span>Efectivo Recibido:</span>
                  <span className="font-mono">{formatMoney(venta.montoRecibido)}</span>
                </div>
                <div className="flex justify-between text-zinc-900 font-semibold">
                  <span>Cambio / Vueltos:</span>
                  <span className="font-mono text-emerald-700">{formatMoney(venta.cambioDevuelto)}</span>
                </div>
              </>
            )}

            {venta.saldoPendiente > 0 && (
              <div className="flex justify-between pt-1 border-t border-dashed border-zinc-300 font-bold text-amber-800">
                <span>Saldo Pendiente (Crédito):</span>
                <span className="font-mono text-sm">{formatMoney(venta.saldoPendiente)}</span>
              </div>
            )}
          </div>

          {/* Observaciones */}
          {venta.observaciones && (
            <div className="py-2 border-b border-zinc-200 text-xs">
              <span className="font-bold text-zinc-700 uppercase text-[10px] tracking-wider block">
                Observaciones:
              </span>
              <span className="text-zinc-600 italic text-[11px]">{venta.observaciones}</span>
            </div>
          )}

          {/* Firmas y Garantías de MOTOMOTO S&E */}
          <div className="pt-4 space-y-4 text-center">
            <div className="grid grid-cols-2 gap-8 text-center text-xs pt-3">
              <div>
                <div className="border-b border-zinc-400 h-8 mb-1" />
                <div className="text-[10px] text-zinc-600 font-semibold">Firma Taller / MOTOMOTO S&E</div>
              </div>
              <div>
                <div className="border-b border-zinc-400 h-8 mb-1" />
                <div className="text-[10px] text-zinc-600 font-semibold">Firma Cliente Conforme</div>
              </div>
            </div>

            <p className="text-[10px] text-zinc-500 pt-2 border-t border-zinc-200 leading-relaxed">
              {configuracion.piePaginaRecibo || 'Repuestos originales cuentan con garantía del fabricante. Garantía eléctrica y mecánica sujeta a revisión en nuestras instalaciones.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
