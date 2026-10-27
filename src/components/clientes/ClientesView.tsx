import React, { useState, useMemo } from 'react';
import {
  Users,
  Search,
  Plus,
  Edit,
  Eye,
  UserCheck,
  UserX,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Bike,
  FileText,
  AlertCircle,
} from 'lucide-react';
import { Cliente, Servicio } from '../../types';
import { formatDate, formatDateTime, formatMoney } from '../../utils/formatters';
import { Modal } from '../common/Modal';
import { EstadoServicioBadge } from '../common/Badge';

interface ClientesViewProps {
  clientes: Cliente[];
  servicios: Servicio[];
  onGuardarCliente: (cliente: Partial<Cliente> & { nombre: string; telefono: string }) => Promise<void>;
  onToggleActivo: (id: string) => Promise<void>;
  onVerServicio: (servicio: Servicio) => void;
  onNuevoServicioConCliente?: (cliente: Cliente) => void;
}

export const ClientesView: React.FC<ClientesViewProps> = ({
  clientes,
  servicios,
  onGuardarCliente,
  onToggleActivo,
  onVerServicio,
  onNuevoServicioConCliente,
}) => {
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<'todos' | 'activos' | 'inactivos'>('activos');

  // Modal Crear / Editar
  const [modalEditarOpen, setModalEditarOpen] = useState(false);
  const [clienteEnEdicion, setClienteEnEdicion] = useState<Partial<Cliente> | null>(null);
  const [errorForm, setErrorForm] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  // Modal Ver Detalle & Historial
  const [modalDetalleOpen, setModalDetalleOpen] = useState(false);
  const [clienteSeleccionado, setClienteSeleccionado] = useState<Cliente | null>(null);

  // Filtrado reactivo en memoria sobre IndexedDB data
  const clientesFiltrados = useMemo(() => {
    const q = busqueda.toLowerCase().trim();
    return clientes.filter((c) => {
      // Filtro de estado
      if (filtroEstado === 'activos' && !c.activo) return false;
      if (filtroEstado === 'inactivos' && c.activo) return false;

      if (!q) return true;
      const matchNombre = c.nombre.toLowerCase().includes(q);
      const matchDoc = c.documento ? c.documento.toLowerCase().includes(q) : false;
      const matchTel = c.telefono.toLowerCase().includes(q);
      const matchEmail = c.email ? c.email.toLowerCase().includes(q) : false;
      return matchNombre || matchDoc || matchTel || matchEmail;
    });
  }, [clientes, busqueda, filtroEstado]);

  const abrirCrear = () => {
    setClienteEnEdicion({
      nombre: '',
      documento: '',
      telefono: '',
      email: '',
      direccion: '',
      observaciones: '',
      activo: true,
    });
    setErrorForm(null);
    setModalEditarOpen(true);
  };

  const abrirEditar = (c: Cliente) => {
    setClienteEnEdicion({ ...c });
    setErrorForm(null);
    setModalEditarOpen(true);
  };

  const abrirDetalle = (c: Cliente) => {
    setClienteSeleccionado(c);
    setModalDetalleOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clienteEnEdicion?.nombre?.trim()) {
      setErrorForm('El nombre completo es obligatorio.');
      return;
    }
    if (!clienteEnEdicion?.telefono?.trim()) {
      setErrorForm('El número de teléfono es obligatorio.');
      return;
    }

    try {
      setGuardando(true);
      setErrorForm(null);
      await onGuardarCliente({
        ...clienteEnEdicion,
        nombre: clienteEnEdicion.nombre.trim(),
        telefono: clienteEnEdicion.telefono.trim(),
      });
      setModalEditarOpen(false);
      setClienteEnEdicion(null);
    } catch (err: unknown) {
      setErrorForm((err as Error).message || 'Error al guardar el cliente.');
    } finally {
      setGuardando(false);
    }
  };

  // Historial de servicios del cliente seleccionado
  const serviciosCliente = useMemo(() => {
    if (!clienteSeleccionado) return [];
    return servicios.filter((s) => s.clienteId === clienteSeleccionado.id);
  }, [servicios, clienteSeleccionado]);

  return (
    <div className="space-y-4">
      {/* Action Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
        <div className="flex flex-1 items-center gap-2 max-w-md bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 focus-within:border-red-500 transition-colors">
          <Search className="w-4 h-4 text-zinc-500 shrink-0" />
          <input
            type="text"
            placeholder="Buscar por nombre, documento o teléfono..."
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

        <div className="flex items-center gap-2 shrink-0">
          {/* Segmented Filter */}
          <div className="flex items-center gap-1 p-1 bg-zinc-950 border border-zinc-800 rounded-lg text-xs">
            <button
              onClick={() => setFiltroEstado('activos')}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                filtroEstado === 'activos'
                  ? 'bg-zinc-800 text-white shadow-xs'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Activos
            </button>
            <button
              onClick={() => setFiltroEstado('inactivos')}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                filtroEstado === 'inactivos'
                  ? 'bg-zinc-800 text-white shadow-xs'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Inactivos
            </button>
            <button
              onClick={() => setFiltroEstado('todos')}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                filtroEstado === 'todos'
                  ? 'bg-zinc-800 text-white shadow-xs'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Todos ({clientes.length})
            </button>
          </div>

          <button
            onClick={abrirCrear}
            className="px-3.5 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-500 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm shadow-red-900/30 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo Cliente</span>
          </button>
        </div>
      </div>

      {/* Table Card */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-xs">
        {clientesFiltrados.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="w-10 h-10 text-zinc-600 mx-auto mb-2" />
            <p className="text-sm font-medium text-zinc-300">No se encontraron clientes</p>
            <p className="text-xs text-zinc-400 mt-1">
              {busqueda ? 'No hay clientes que coincidan con la búsqueda.' : 'Aún no has registrado ningún cliente.'}
            </p>
            <button
              onClick={abrirCrear}
              className="mt-4 px-3.5 py-1.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-500 rounded-lg inline-flex items-center gap-1.5 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Crear Primer Cliente
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-950/60 text-zinc-400">
                  <th className="px-4 py-3 font-medium">Cliente</th>
                  <th className="px-4 py-3 font-medium">Documento</th>
                  <th className="px-4 py-3 font-medium">Teléfono / WhatsApp</th>
                  <th className="px-4 py-3 font-medium">Email & Dirección</th>
                  <th className="px-4 py-3 font-medium">Registro</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                  <th className="px-4 py-3 font-medium text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {clientesFiltrados.map((c) => (
                  <tr
                    key={c.id}
                    className={`hover:bg-zinc-800/40 transition-colors ${!c.activo ? 'opacity-60 bg-zinc-950/20' : ''}`}
                  >
                    <td className="px-4 py-3.5">
                      <div className="font-semibold text-zinc-100">{c.nombre}</div>
                      {c.observaciones && (
                        <div className="text-[11px] text-zinc-400 truncate max-w-xs">{c.observaciones}</div>
                      )}
                    </td>
                    <td className="px-4 py-3.5 font-mono text-zinc-300">
                      {c.documento || <span className="text-zinc-500 font-sans italic">Sin documento</span>}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1.5 text-zinc-200">
                        <Phone className="w-3.5 h-3.5 text-red-500/80" />
                        <span className="font-mono">{c.telefono}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-zinc-400">
                      <div className="truncate max-w-xs">{c.email || '-'}</div>
                      <div className="text-[11px] text-zinc-400 truncate max-w-xs">{c.direccion || '-'}</div>
                    </td>
                    <td className="px-4 py-3.5 text-zinc-400 whitespace-nowrap">
                      {formatDate(c.fechaRegistro)}
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      {c.activo ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          Activo
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-zinc-500">
                          <span className="w-1.5 h-1.5 rounded-full bg-zinc-600" />
                          Inactivo
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={() => abrirDetalle(c)}
                          title="Ver detalle e historial"
                          className="p-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => abrirEditar(c)}
                          title="Editar cliente"
                          className="p-1.5 text-zinc-400 hover:text-amber-300 hover:bg-zinc-800 rounded transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onToggleActivo(c.id)}
                          title={c.activo ? 'Desactivar cliente' : 'Activar cliente'}
                          className={`p-1.5 rounded transition-colors ${
                            c.activo
                              ? 'text-zinc-400 hover:text-red-400 hover:bg-zinc-800'
                              : 'text-zinc-500 hover:text-emerald-400 hover:bg-zinc-800'
                          }`}
                        >
                          {c.activo ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Crear / Editar Cliente */}
      <Modal
        isOpen={modalEditarOpen}
        onClose={() => setModalEditarOpen(false)}
        title={clienteEnEdicion?.id ? 'Editar Cliente' : 'Registrar Nuevo Cliente'}
        subtitle="Los datos se guardarán de forma local y permanente en IndexedDB"
        maxWidth="lg"
      >
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorForm && (
            <div className="p-3 bg-red-950/60 border border-red-800/80 rounded-lg flex items-center gap-2 text-xs text-red-300">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorForm}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1">
              Nombre Completo <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={clienteEnEdicion?.nombre || ''}
              onChange={(e) => setClienteEnEdicion((prev) => ({ ...prev, nombre: e.target.value }))}
              placeholder="Ej: Juan Carlos Pérez"
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-red-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">
                Documento de Identidad (Opcional)
              </label>
              <input
                type="text"
                value={clienteEnEdicion?.documento || ''}
                onChange={(e) => setClienteEnEdicion((prev) => ({ ...prev, documento: e.target.value }))}
                placeholder="Cédula, DNI o NIT"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-red-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">
                Teléfono / WhatsApp <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                required
                value={clienteEnEdicion?.telefono || ''}
                onChange={(e) => setClienteEnEdicion((prev) => ({ ...prev, telefono: e.target.value }))}
                placeholder="Ej: 312 456 7890"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-red-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">
                Correo Electrónico (Opcional)
              </label>
              <input
                type="email"
                value={clienteEnEdicion?.email || ''}
                onChange={(e) => setClienteEnEdicion((prev) => ({ ...prev, email: e.target.value }))}
                placeholder="cliente@ejemplo.com"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-red-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">
                Dirección (Opcional)
              </label>
              <input
                type="text"
                value={clienteEnEdicion?.direccion || ''}
                onChange={(e) => setClienteEnEdicion((prev) => ({ ...prev, direccion: e.target.value }))}
                placeholder="Calle / Barrio / Ciudad"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-red-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1">
              Observaciones (Motos habituales, preferencias, etc.)
            </label>
            <textarea
              rows={3}
              value={clienteEnEdicion?.observaciones || ''}
              onChange={(e) => setClienteEnEdicion((prev) => ({ ...prev, observaciones: e.target.value }))}
              placeholder="Ej: Dueño de Yamaha FZ25. Prefiere aceite sintético Motul."
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-red-500 resize-none"
            />
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="cliente-activo"
              checked={clienteEnEdicion?.activo ?? true}
              onChange={(e) => setClienteEnEdicion((prev) => ({ ...prev, activo: e.target.checked }))}
              className="rounded bg-zinc-950 border-zinc-700 text-red-600 focus:ring-0"
            />
            <label htmlFor="cliente-activo" className="text-xs text-zinc-300 cursor-pointer">
              Cliente activo para órdenes de servicio y compras
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800">
            <button
              type="button"
              onClick={() => setModalEditarOpen(false)}
              className="px-4 py-2 text-xs font-medium text-zinc-300 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={guardando}
              className="px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-500 rounded-lg transition-colors disabled:opacity-50"
            >
              {guardando ? 'Guardando...' : clienteEnEdicion?.id ? 'Guardar Cambios' : 'Registrar Cliente'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Detalle Cliente & Historial de Servicios */}
      {clienteSeleccionado && (
        <Modal
          isOpen={modalDetalleOpen}
          onClose={() => setModalDetalleOpen(false)}
          title={`Ficha del Cliente: ${clienteSeleccionado.nombre}`}
          subtitle={`Registrado el ${formatDate(clienteSeleccionado.fechaRegistro)}`}
          maxWidth="2xl"
        >
          <div className="p-6 space-y-6">
            {/* Info Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-zinc-950/60 border border-zinc-800 rounded-lg space-y-2">
                <div className="text-[11px] font-semibold text-zinc-400 uppercase">Contacto</div>
                <div className="flex items-center gap-2 text-zinc-200">
                  <Phone className="w-4 h-4 text-red-500/80 shrink-0" />
                  <span className="font-mono">{clienteSeleccionado.telefono}</span>
                </div>
                {clienteSeleccionado.email && (
                  <div className="flex items-center gap-2 text-zinc-300">
                    <Mail className="w-4 h-4 text-zinc-500 shrink-0" />
                    <span className="truncate">{clienteSeleccionado.email}</span>
                  </div>
                )}
                {clienteSeleccionado.direccion && (
                  <div className="flex items-center gap-2 text-zinc-300">
                    <MapPin className="w-4 h-4 text-zinc-500 shrink-0" />
                    <span>{clienteSeleccionado.direccion}</span>
                  </div>
                )}
              </div>

              <div className="p-3 bg-zinc-950/60 border border-zinc-800 rounded-lg space-y-2">
                <div className="text-[11px] font-semibold text-zinc-400 uppercase">Identificación y Estado</div>
                <div className="text-zinc-300">
                  <span className="text-zinc-500">Documento: </span>
                  <span className="font-mono text-zinc-200">{clienteSeleccionado.documento || 'No registrado'}</span>
                </div>
                <div className="text-zinc-300">
                  <span className="text-zinc-500">Estado: </span>
                  <span className={clienteSeleccionado.activo ? 'text-emerald-400 font-medium' : 'text-zinc-500'}>
                    {clienteSeleccionado.activo ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
                {clienteSeleccionado.observaciones && (
                  <div className="text-zinc-400 text-[11px] pt-1 border-t border-zinc-800">
                    <span className="text-zinc-500">Notas: </span>
                    {clienteSeleccionado.observaciones}
                  </div>
                )}
              </div>
            </div>

            {/* Historial de Compras y Facturación */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-red-500" />
                  <h4 className="text-xs font-semibold text-zinc-200 uppercase tracking-wider">
                    Historial de Facturación y Compras ({serviciosCliente.length})
                  </h4>
                </div>
                {onNuevoServicioConCliente && (
                  <button
                    onClick={() => {
                      setModalDetalleOpen(false);
                      onNuevoServicioConCliente(clienteSeleccionado);
                    }}
                    className="text-xs text-red-400 hover:text-red-300 font-medium flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Facturar a este Cliente</span>
                  </button>
                )}
              </div>

              {serviciosCliente.length === 0 ? (
                <div className="p-6 bg-zinc-950/40 border border-zinc-800 rounded-lg text-center text-xs text-zinc-400">
                  Este cliente aún no registra facturas ni compras.
                </div>
              ) : (
                <div className="border border-zinc-800 rounded-lg overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-zinc-950 border-b border-zinc-800 text-zinc-400">
                        <th className="px-3 py-2 font-medium">Factura N°</th>
                        <th className="px-3 py-2 font-medium">Fecha</th>
                        <th className="px-3 py-2 font-medium">Detalle / Moto</th>
                        <th className="px-3 py-2 font-medium">Estado</th>
                        <th className="px-3 py-2 font-medium text-right">Total</th>
                        <th className="px-3 py-2 font-medium text-right">Saldo</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800">
                      {serviciosCliente.map((s) => (
                        <tr
                          key={s.id}
                          onClick={() => {
                            setModalDetalleOpen(false);
                            onVerServicio(s);
                          }}
                          className="hover:bg-zinc-800/40 cursor-pointer transition-colors"
                        >
                          <td className="px-3 py-2.5 font-mono text-red-400 font-medium">
                            {s.numeroFactura || (s as any).numeroServicio}
                          </td>
                          <td className="px-3 py-2.5 text-zinc-300 whitespace-nowrap">
                            {formatDate(s.fecha)}
                          </td>
                          <td className="px-3 py-2.5 text-zinc-300">
                            {s.placaMoto ? `Moto ${s.placaMoto}` : s.tipoVenta === 'venta_directa' ? 'Venta mostrador' : 'Taller'}
                          </td>
                          <td className="px-3 py-2.5">
                            <span className="capitalize text-[11px] text-zinc-300">{s.estado}</span>
                          </td>
                          <td className="px-3 py-2.5 font-mono text-right text-zinc-200">
                            {formatMoney(s.total)}
                          </td>
                          <td className="px-3 py-2.5 font-mono text-right text-amber-400">
                            {s.saldoPendiente > 0 ? formatMoney(s.saldoPendiente) : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => setModalDetalleOpen(false)}
                className="px-4 py-2 text-xs font-medium text-zinc-300 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
