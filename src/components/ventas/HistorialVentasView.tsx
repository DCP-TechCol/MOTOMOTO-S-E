import React, { useState, useMemo } from 'react';
import {
  History,
  Search,
  Filter,
  Eye,
  Printer,
  DollarSign,
  AlertCircle,
  Clock,
  CheckCircle2,
  XCircle,
  Plus,
  Bike,
  Tag,
  Receipt,
  RotateCcw,
} from 'lucide-react';
import { Venta, EstadoVenta, PagoVenta, ConfiguracionTaller, TipoVenta } from '../../types';
import { formatMoney, formatDate, formatDateTime } from '../../utils/formatters';
import { Modal } from '../common/Modal';
import { FacturaModal } from './FacturaModal';
import { ConfirmDialog } from '../common/ConfirmDialog';

interface HistorialVentasViewProps {
  ventas: Venta[];
  configuracion: ConfiguracionTaller;
  onRegistrarAbono: (ventaId: string, pago: Omit<PagoVenta, 'id'>) => Promise<void>;
  onAnularVenta: (ventaId: string, revertirStock: boolean) => Promise<void>;
  onNuevaVenta: () => void;
}

export const HistorialVentasView: React.FC<HistorialVentasViewProps> = ({
  ventas,
  configuracion,
  onRegistrarAbono,
  onAnularVenta,
  onNuevaVenta,
}) => {
  const [busqueda, setBusqueda] = useState('');
  const [filtroTipo, setFiltroTipo] = useState<string>('todos');
  const [filtroEstado, setFiltroEstado] = useState<string>('todos');
  const [filtroDesde, setFiltroDesde] = useState<string>('');
  const [filtroHasta, setFiltroHasta] = useState<string>('');

  // Modales
  const [ventaSeleccionada, setVentaSeleccionada] = useState<Venta | null>(null);
  const [facturaModalOpen, setFacturaModalOpen] = useState(false);
  const [modalAbonoOpen, setModalAbonoOpen] = useState(false);
  const [modalAnularOpen, setModalAnularOpen] = useState(false);

  // Formulario Abono
  const [montoAbono, setMontoAbono] = useState<number>(0);
  const [metodoAbono, setMetodoAbono] = useState<string>('efectivo');
  const [notaAbono, setNotaAbono] = useState<string>('');
  const [guardandoAbono, setGuardandoAbono] = useState(false);

  // Anulación
  const [revertirStock, setRevertirStock] = useState(true);
  const [anulando, setAnulando] = useState(false);
  const [errorModal, setErrorModal] = useState<string | null>(null);

  // Filtrado
  const ventasFiltradas = useMemo(() => {
    const q = busqueda.toLowerCase().trim();
    return ventas.filter((v) => {
      if (filtroTipo !== 'todos' && v.tipoVenta !== filtroTipo) return false;
      if (filtroEstado !== 'todos' && v.estado !== filtroEstado) return false;

      if (filtroDesde) {
        const f = v.fecha ? v.fecha.slice(0, 10) : '';
        if (f < filtroDesde) return false;
      }
      if (filtroHasta) {
        const f = v.fecha ? v.fecha.slice(0, 10) : '';
        if (f > filtroHasta) return false;
      }

      if (!q) return true;
      const matchNum = v.numeroFactura.toLowerCase().includes(q);
      const matchCli = v.clienteNombre.toLowerCase().includes(q);
      const matchTel = v.clienteTelefono ? v.clienteTelefono.toLowerCase().includes(q) : false;
      const matchPlaca = v.placaMoto ? v.placaMoto.toLowerCase().includes(q) : false;
      return matchNum || matchCli || matchTel || matchPlaca;
    });
  }, [ventas, busqueda, filtroTipo, filtroEstado, filtroDesde, filtroHasta]);

  const abrirFactura = (v: Venta) => {
    setVentaSeleccionada(v);
    setFacturaModalOpen(true);
  };

  const abrirAbono = (v: Venta) => {
    setVentaSeleccionada(v);
    setMontoAbono(v.saldoPendiente > 0 ? v.saldoPendiente : 0);
    setMetodoAbono('efectivo');
    setNotaAbono('Abono a saldo');
    setErrorModal(null);
    setModalAbonoOpen(true);
  };

  const abrirAnular = (v: Venta) => {
    setVentaSeleccionada(v);
    setRevertirStock(true);
    setErrorModal(null);
    setModalAnularOpen(true);
  };

  const handleGuardarAbono = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ventaSeleccionada) return;
    if (montoAbono <= 0) {
      setErrorModal('El monto a abonar debe ser mayor a 0.');
      return;
    }
    if (montoAbono > ventaSeleccionada.saldoPendiente) {
      setErrorModal(`El monto supera el saldo adeudado ($ ${ventaSeleccionada.saldoPendiente.toLocaleString()}).`);
      return;
    }

    try {
      setGuardandoAbono(true);
      setErrorModal(null);
      await onRegistrarAbono(ventaSeleccionada.id, {
        fecha: new Date().toISOString(),
        monto: montoAbono,
        metodo: metodoAbono as any,
        nota: notaAbono.trim() || 'Abono registrado',
      });
      setModalAbonoOpen(false);
      setVentaSeleccionada(null);
    } catch (err: unknown) {
      setErrorModal((err as Error).message || 'Error al registrar abono.');
    } finally {
      setGuardandoAbono(false);
    }
  };

  const handleConfirmarAnulacion = async () => {
    if (!ventaSeleccionada) return;
    try {
      setAnulando(true);
      await onAnularVenta(ventaSeleccionada.id, revertirStock);
      setModalAnularOpen(false);
      setVentaSeleccionada(null);
    } catch (err: unknown) {
      setErrorModal((err as Error).message || 'Error al anular la factura.');
    } finally {
      setAnulando(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Filter and Actions Toolbar */}
      <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex flex-1 items-center gap-2 max-w-md bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 focus-within:border-red-500 transition-colors">
            <Search className="w-4 h-4 text-zinc-500 shrink-0" />
            <input
              type="text"
              placeholder="Buscar por N° factura, cliente o placa..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full bg-transparent text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none"
            />
            {busqueda && (
              <button
                onClick={() => setBusqueda('')}
                className="text-[11px] text-zinc-400 hover:text-zinc-200"
              >
                Limpiar
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onNuevaVenta}
              className="px-3.5 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-500 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm shadow-red-900/30 shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Nueva Venta / Facturar</span>
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-zinc-800 text-xs">
          {/* Segmented Filter Tipo */}
          <div className="flex items-center gap-1 p-1 bg-zinc-950 border border-zinc-800 rounded-lg">
            <button
              onClick={() => setFiltroTipo('todos')}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                filtroTipo === 'todos' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Todas ({ventas.length})
            </button>
            <button
              onClick={() => setFiltroTipo('venta_directa')}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                filtroTipo === 'venta_directa' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Mostrador
            </button>
            <button
              onClick={() => setFiltroTipo('servicio_taller')}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                filtroTipo === 'servicio_taller' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Servicio Taller
            </button>
            <button
              onClick={() => setFiltroTipo('mixta')}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                filtroTipo === 'mixta' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Mixtas
            </button>
          </div>

          {/* Estado Filter */}
          <div className="flex items-center gap-1 p-1 bg-zinc-950 border border-zinc-800 rounded-lg">
            <button
              onClick={() => setFiltroEstado('todos')}
              className={`px-2 py-1 rounded text-xs transition-colors ${
                filtroEstado === 'todos' ? 'bg-zinc-800 text-white font-medium' : 'text-zinc-400'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setFiltroEstado('completada')}
              className={`px-2 py-1 rounded text-xs transition-colors ${
                filtroEstado === 'completada' ? 'bg-zinc-800 text-emerald-400 font-medium' : 'text-zinc-400'
              }`}
            >
              Pagadas
            </button>
            <button
              onClick={() => setFiltroEstado('pendiente_pago')}
              className={`px-2 py-1 rounded text-xs transition-colors ${
                filtroEstado === 'pendiente_pago' ? 'bg-zinc-800 text-amber-400 font-medium' : 'text-zinc-400'
              }`}
            >
              Con Saldo
            </button>
            <button
              onClick={() => setFiltroEstado('anulada')}
              className={`px-2 py-1 rounded text-xs transition-colors ${
                filtroEstado === 'anulada' ? 'bg-zinc-800 text-red-400 font-medium' : 'text-zinc-400'
              }`}
            >
              Anuladas
            </button>
          </div>

          {/* Rango de fechas */}
          <div className="flex items-center gap-2 text-zinc-400">
            <span className="text-[11px]">Desde:</span>
            <input
              type="date"
              value={filtroDesde}
              onChange={(e) => setFiltroDesde(e.target.value)}
              className="bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-xs text-zinc-200"
            />
            <span className="text-[11px]">Hasta:</span>
            <input
              type="date"
              value={filtroHasta}
              onChange={(e) => setFiltroHasta(e.target.value)}
              className="bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-xs text-zinc-200"
            />
          </div>
        </div>
      </div>

      {/* Tabla de Facturas */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-xs">
        {ventasFiltradas.length === 0 ? (
          <div className="p-12 text-center text-xs text-zinc-400">
            <Receipt className="w-10 h-10 text-zinc-600 mx-auto mb-2" />
            <p className="text-sm font-medium text-zinc-300">No se encontraron ventas o facturas</p>
            <p className="text-xs text-zinc-500 mt-1">
              Prueba modificando los filtros de búsqueda o emite tu primera venta.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-zinc-950/60 border-b border-zinc-800 text-zinc-400">
                  <th className="px-4 py-3 font-medium">Factura N°</th>
                  <th className="px-4 py-3 font-medium">Fecha y Hora</th>
                  <th className="px-4 py-3 font-medium">Tipo Venta</th>
                  <th className="px-4 py-3 font-medium">Cliente</th>
                  <th className="px-4 py-3 font-medium">Artículos / Detalle</th>
                  <th className="px-4 py-3 font-medium">Medio Pago</th>
                  <th className="px-4 py-3 font-medium text-right">Total Factura</th>
                  <th className="px-4 py-3 font-medium text-right">Saldo Pendiente</th>
                  <th className="px-4 py-3 font-medium text-center">Estado</th>
                  <th className="px-4 py-3 font-medium text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {ventasFiltradas.map((v) => (
                  <tr
                    key={v.id}
                    className={`hover:bg-zinc-800/40 transition-colors ${
                      v.estado === 'anulada' ? 'opacity-50 bg-red-950/10' : ''
                    }`}
                  >
                    <td className="px-4 py-3.5 font-mono font-bold text-red-400 whitespace-nowrap">
                      {v.numeroFactura}
                    </td>
                    <td className="px-4 py-3.5 text-zinc-400 whitespace-nowrap">
                      {formatDateTime(v.fecha)}
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      {v.tipoVenta === 'venta_directa' && (
                        <span className="text-zinc-300 font-medium">Mostrador</span>
                      )}
                      {v.tipoVenta === 'servicio_taller' && (
                        <span className="text-blue-400 font-medium">🛠 Taller</span>
                      )}
                      {v.tipoVenta === 'mixta' && (
                        <span className="text-purple-400 font-medium">Piezas + Taller</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="font-semibold text-zinc-100">{v.clienteNombre}</div>
                      {v.placaMoto && (
                        <div className="text-[10px] font-mono text-zinc-400">Moto: {v.placaMoto}</div>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-zinc-300 max-w-xs">
                      <div className="flex items-center gap-1 flex-wrap mb-1">
                        {v.subtotalElectricidad > 0 && (
                          <span className="text-[9px] font-bold text-amber-400 bg-amber-950/80 px-1.5 py-0.2 rounded border border-amber-800/80">
                            ⚡ Electricidad
                          </span>
                        )}
                        {v.subtotalTallerMecanico > 0 && (
                          <span className="text-[9px] font-bold text-orange-400 bg-orange-950/80 px-1.5 py-0.2 rounded border border-orange-800/80">
                            🔧 Mecánica
                          </span>
                        )}
                        {v.subtotalRepuestosOriginales > 0 && (
                          <span className="text-[9px] font-bold text-emerald-400 bg-emerald-950/80 px-1.5 py-0.2 rounded border border-emerald-800/80">
                            ⭐ Original OEM
                          </span>
                        )}
                        {v.subtotalRepuestosGenericos > 0 && (
                          <span className="text-[9px] font-medium text-blue-300 bg-blue-950/80 px-1.5 py-0.2 rounded border border-blue-800/80">
                            ⚙️ Genérico
                          </span>
                        )}
                      </div>
                      <div className="truncate text-xs text-zinc-400">
                        {v.items && v.items.length > 0
                          ? v.items.map((it) => `${it.cantidad}x ${it.nombre}`).join(', ')
                          : v.descripcionServicio || 'Mano de obra'}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 font-mono uppercase text-zinc-300 whitespace-nowrap">
                      {v.metodoPagoPrincipal}
                    </td>
                    <td className="px-4 py-3.5 font-mono text-right font-bold text-zinc-100 whitespace-nowrap">
                      {formatMoney(v.total)}
                    </td>
                    <td className="px-4 py-3.5 font-mono text-right whitespace-nowrap">
                      {v.saldoPendiente > 0 ? (
                        <span className="font-bold text-amber-400">{formatMoney(v.saldoPendiente)}</span>
                      ) : (
                        <span className="text-emerald-400 font-medium text-[11px]">Pagado</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-center whitespace-nowrap">
                      {v.estado === 'completada' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-950 text-emerald-400 border border-emerald-800">
                          Completada
                        </span>
                      )}
                      {v.estado === 'pendiente_pago' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-950 text-amber-400 border border-amber-800">
                          A Crédito
                        </span>
                      )}
                      {v.estado === 'anulada' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-red-950 text-red-400 border border-red-800">
                          Anulada
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={() => abrirFactura(v)}
                          title="Ver e imprimir factura"
                          className="p-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded transition-colors"
                        >
                          <Printer className="w-4 h-4" />
                        </button>

                        {v.saldoPendiente > 0 && v.estado !== 'anulada' && (
                          <button
                            onClick={() => abrirAbono(v)}
                            title="Registrar abono de crédito"
                            className="p-1.5 text-zinc-400 hover:text-emerald-400 hover:bg-zinc-800 rounded transition-colors"
                          >
                            <DollarSign className="w-4 h-4" />
                          </button>
                        )}

                        {v.estado !== 'anulada' && (
                          <button
                            onClick={() => abrirAnular(v)}
                            title="Anular factura y devolver stock"
                            className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-zinc-800 rounded transition-colors"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Factura Imprimible */}
      <FacturaModal
        isOpen={facturaModalOpen}
        onClose={() => setFacturaModalOpen(false)}
        venta={ventaSeleccionada}
        configuracion={configuracion}
      />

      {/* Modal Registrar Abono */}
      {ventaSeleccionada && (
        <Modal
          isOpen={modalAbonoOpen}
          onClose={() => setModalAbonoOpen(false)}
          title={`Registrar Pago a Factura #${ventaSeleccionada.numeroFactura}`}
          subtitle={`Cliente: ${ventaSeleccionada.clienteNombre} · Saldo pendiente: ${formatMoney(
            ventaSeleccionada.saldoPendiente
          )}`}
          maxWidth="md"
        >
          <form onSubmit={handleGuardarAbono} className="p-6 space-y-4">
            {errorModal && (
              <div className="p-3 bg-red-950/70 border border-red-800 rounded-lg flex items-center gap-2 text-xs text-red-300">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorModal}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">
                Monto del Abono ($) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                step="500"
                required
                value={montoAbono}
                onChange={(e) => setMontoAbono(parseFloat(e.target.value) || 0)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm font-mono font-bold text-emerald-400 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">Método de Pago</label>
              <select
                value={metodoAbono}
                onChange={(e) => setMetodoAbono(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-red-500"
              >
                <option value="efectivo">Efectivo en caja</option>
                <option value="transferencia">Transferencia bancaria / Nequi</option>
                <option value="tarjeta">Tarjeta / Datáfono</option>
                <option value="otro">Otro</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">Nota o Comprobante</label>
              <input
                type="text"
                value={notaAbono}
                onChange={(e) => setNotaAbono(e.target.value)}
                placeholder="Ej: Transferencia recibida a Nequi #892"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-red-500"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => setModalAbonoOpen(false)}
                className="px-4 py-2 text-xs font-medium text-zinc-300 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={guardandoAbono}
                className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors disabled:opacity-50"
              >
                {guardandoAbono ? 'Registrando...' : 'Confirmar Abono'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal Anular Factura */}
      {ventaSeleccionada && (
        <Modal
          isOpen={modalAnularOpen}
          onClose={() => setModalAnularOpen(false)}
          title={`¿Anular Factura #${ventaSeleccionada.numeroFactura}?`}
          subtitle="Esta operación anula el comprobante contable"
          maxWidth="md"
        >
          <div className="p-6 space-y-4">
            <p className="text-xs text-zinc-300 leading-relaxed">
              Estás a punto de anular la venta realizada a <strong>{ventaSeleccionada.clienteNombre}</strong> por valor de{' '}
              <strong className="text-red-400">{formatMoney(ventaSeleccionada.total)}</strong>.
            </p>

            <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-lg flex items-center gap-2">
              <input
                type="checkbox"
                id="restituir-stock"
                checked={revertirStock}
                onChange={(e) => setRevertirStock(e.target.checked)}
                className="rounded bg-zinc-900 border-zinc-700 text-red-600 focus:ring-0"
              />
              <label htmlFor="restituir-stock" className="text-xs text-zinc-200 cursor-pointer font-medium">
                Devolver productos y herramientas vendidas al inventario
              </label>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => setModalAnularOpen(false)}
                className="px-4 py-2 text-xs font-medium text-zinc-300 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={anulando}
                onClick={handleConfirmarAnulacion}
                className="px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-500 rounded-lg transition-colors disabled:opacity-50"
              >
                {anulando ? 'Anulando...' : 'Sí, anular factura'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
