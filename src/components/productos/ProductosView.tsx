import React, { useState, useMemo } from 'react';
import {
  Wrench,
  Search,
  Plus,
  Edit,
  AlertTriangle,
  ArrowUpDown,
  History,
  Tag,
  DollarSign,
  PackageCheck,
  CheckCircle2,
  AlertCircle,
  Eye,
  ShieldCheck,
  Cog,
  Zap,
  Truck,
  Phone,
} from 'lucide-react';
import { Producto, CategoriaProducto, MovimientoInventario, TipoMovimiento } from '../../types';
import { formatMoney, formatDate, formatDateTime } from '../../utils/formatters';
import { Modal } from '../common/Modal';

const CATEGORIAS_PRODUCTO: CategoriaProducto[] = [
  'Repuestos Originales',
  'Repuestos Genéricos',
  'Repuestos de motor',
  'Herramientas de taller',
  'Herramientas manuales',
  'Frenos y suspensión',
  'Sistema eléctrico',
  'Lubricantes y químicos',
  'Accesorios y lujos',
  'Consumibles',
  'Otros',
];

interface ProductosViewProps {
  productos: Producto[];
  movimientos: MovimientoInventario[];
  onGuardarProducto: (producto: Partial<Producto> & { codigo: string; nombre: string; precioVenta: number }) => Promise<void>;
  onToggleActivo: (id: string) => Promise<void>;
  onAjustarStock: (productoId: string, tipo: TipoMovimiento, cantidad: number, motivo: string) => Promise<void>;
}

export const ProductosView: React.FC<ProductosViewProps> = ({
  productos,
  movimientos,
  onGuardarProducto,
  onToggleActivo,
  onAjustarStock,
}) => {
  const [busqueda, setBusqueda] = useState('');
  const [filtroTipoRepuesto, setFiltroTipoRepuesto] = useState<'todos' | 'original' | 'generico' | 'no_aplica'>('todos');
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState<string>('todas');
  const [proveedorSeleccionado, setProveedorSeleccionado] = useState<string>('todos');
  const [filtroStock, setFiltroStock] = useState<'todos' | 'bajo' | 'agotado' | 'activos'>('activos');

  // Modal Crear / Editar
  const [modalEditarOpen, setModalEditarOpen] = useState(false);
  const [productoEnEdicion, setProductoEnEdicion] = useState<Partial<Producto> | null>(null);
  const [errorForm, setErrorForm] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  // Modal Ajuste de Stock
  const [modalAjusteOpen, setModalAjusteOpen] = useState(false);
  const [productoParaAjuste, setProductoParaAjuste] = useState<Producto | null>(null);
  const [tipoAjuste, setTipoAjuste] = useState<TipoMovimiento>('entrada');
  const [cantidadAjuste, setCantidadAjuste] = useState<number>(1);
  const [motivoAjuste, setMotivoAjuste] = useState<string>('');

  // Modal Movimientos del producto
  const [modalKardexOpen, setModalKardexOpen] = useState(false);
  const [productoKardex, setProductoKardex] = useState<Producto | null>(null);

  // Lista única de proveedores para autocompletar y filtro
  const listaProveedores = useMemo(() => {
    const map = new Map<string, number>();
    productos.forEach((p) => {
      if (p.proveedor && p.proveedor.trim()) {
        const nom = p.proveedor.trim();
        map.set(nom, (map.get(nom) || 0) + 1);
      }
    });
    return Array.from(map.entries())
      .map(([nombre, cantidad]) => ({ nombre, cantidad }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [productos]);

  // Filtrado reactivo en memoria
  const productosFiltrados = useMemo(() => {
    const q = busqueda.toLowerCase().trim();
    return productos.filter((p) => {
      // Filtros de estado / stock
      if (filtroStock === 'activos' && !p.activo) return false;
      if (filtroStock === 'bajo' && (!p.activo || p.stock > p.stockMinimo || p.stock === 0)) return false;
      if (filtroStock === 'agotado' && (!p.activo || p.stock > 0)) return false;

      // Filtro de tipo de repuesto
      if (filtroTipoRepuesto !== 'todos' && p.tipoRepuesto !== filtroTipoRepuesto) {
        return false;
      }

      // Filtro de categoría
      if (categoriaSeleccionada !== 'todas' && p.categoria !== categoriaSeleccionada) {
        return false;
      }

      // Filtro por proveedor específico
      if (proveedorSeleccionado !== 'todos' && p.proveedor !== proveedorSeleccionado) {
        return false;
      }

      if (!q) return true;
      const matchCod = p.codigo.toLowerCase().includes(q);
      const matchNom = p.nombre.toLowerCase().includes(q);
      const matchMarca = p.marca.toLowerCase().includes(q);
      const matchCat = p.categoria.toLowerCase().includes(q);
      const matchProv = p.proveedor ? p.proveedor.toLowerCase().includes(q) : false;
      return matchCod || matchNom || matchMarca || matchCat || matchProv;
    });
  }, [productos, busqueda, filtroTipoRepuesto, categoriaSeleccionada, proveedorSeleccionado, filtroStock]);

  const abrirCrear = () => {
    setProductoEnEdicion({
      codigo: '',
      nombre: '',
      categoria: 'Repuestos Originales',
      tipoRepuesto: 'original',
      marca: '',
      proveedor: '',
      proveedorContacto: '',
      descripcion: '',
      garantiaMeses: 6,
      stock: 0,
      stockMinimo: 2,
      costoUnitario: 0,
      precioVenta: 0,
      activo: true,
    });
    setErrorForm(null);
    setModalEditarOpen(true);
  };

  const abrirEditar = (p: Producto) => {
    setProductoEnEdicion({ ...p });
    setErrorForm(null);
    setModalEditarOpen(true);
  };

  const abrirAjuste = (p: Producto) => {
    setProductoParaAjuste(p);
    setTipoAjuste('entrada');
    setCantidadAjuste(1);
    setMotivoAjuste('');
    setErrorForm(null);
    setModalAjusteOpen(true);
  };

  const abrirKardex = (p: Producto) => {
    setProductoKardex(p);
    setModalKardexOpen(true);
  };

  const handleGuardarProducto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productoEnEdicion?.codigo?.trim()) {
      setErrorForm('El código SKU es obligatorio.');
      return;
    }
    if (!productoEnEdicion?.nombre?.trim()) {
      setErrorForm('El nombre de la herramienta o repuesto es obligatorio.');
      return;
    }
    if ((Number(productoEnEdicion?.precioVenta) || 0) < 0) {
      setErrorForm('El precio de venta no puede ser negativo.');
      return;
    }

    try {
      setGuardando(true);
      setErrorForm(null);
      await onGuardarProducto({
        ...productoEnEdicion,
        codigo: productoEnEdicion.codigo.trim().toUpperCase(),
        nombre: productoEnEdicion.nombre.trim(),
        tipoRepuesto: productoEnEdicion.tipoRepuesto || 'no_aplica',
        proveedor: productoEnEdicion.proveedor?.trim() || '',
        proveedorContacto: productoEnEdicion.proveedorContacto?.trim() || '',
        garantiaMeses: Number(productoEnEdicion.garantiaMeses) || 0,
        precioVenta: Number(productoEnEdicion.precioVenta) || 0,
        costoUnitario: Number(productoEnEdicion.costoUnitario) || 0,
        stock: Number(productoEnEdicion.stock) || 0,
        stockMinimo: Number(productoEnEdicion.stockMinimo) || 0,
      });
      setModalEditarOpen(false);
      setProductoEnEdicion(null);
    } catch (err: unknown) {
      setErrorForm((err as Error).message || 'Error al guardar el producto.');
    } finally {
      setGuardando(false);
    }
  };

  const handleGuardarAjuste = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productoParaAjuste) return;
    if (cantidadAjuste <= 0 && tipoAjuste !== 'ajuste') {
      setErrorForm('La cantidad debe ser mayor a 0.');
      return;
    }
    if (!motivoAjuste.trim()) {
      setErrorForm('Debes especificar un motivo o justificación para el ajuste.');
      return;
    }

    try {
      setGuardando(true);
      setErrorForm(null);
      await onAjustarStock(productoParaAjuste.id, tipoAjuste, cantidadAjuste, motivoAjuste.trim());
      setModalAjusteOpen(false);
      setProductoParaAjuste(null);
    } catch (err: unknown) {
      setErrorForm((err as Error).message || 'Error al registrar el movimiento.');
    } finally {
      setGuardando(false);
    }
  };

  // Movimientos filtrados para el modal de Kardex
  const movimientosDelProducto = useMemo(() => {
    if (!productoKardex) return [];
    return movimientos.filter((m) => m.productoId === productoKardex.id);
  }, [movimientos, productoKardex]);

  return (
    <div className="space-y-4">
      {/* Top Filter and Actions Toolbar */}
      <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex flex-1 items-center gap-2 max-w-md bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 focus-within:border-red-500 transition-colors">
            <Search className="w-4 h-4 text-zinc-500 shrink-0" />
            <input
              type="text"
              placeholder="Buscar por SKU, nombre, marca o proveedor..."
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

          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            {/* Categoría Selector */}
            <select
              value={categoriaSeleccionada}
              onChange={(e) => setCategoriaSeleccionada(e.target.value)}
              className="bg-zinc-950 border border-zinc-800 text-xs text-zinc-300 rounded-lg px-3 py-2 focus:outline-none focus:border-red-500"
            >
              <option value="todas">Todas las categorías</option>
              {CATEGORIAS_PRODUCTO.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>

            {/* Proveedor Selector */}
            {listaProveedores.length > 0 && (
              <select
                value={proveedorSeleccionado}
                onChange={(e) => setProveedorSeleccionado(e.target.value)}
                className="bg-zinc-950 border border-zinc-800 text-xs text-zinc-300 rounded-lg px-3 py-2 focus:outline-none focus:border-red-500 max-w-[190px]"
              >
                <option value="todos">Todos los proveedores</option>
                {listaProveedores.map((prv) => (
                  <option key={prv.nombre} value={prv.nombre}>
                    {prv.nombre} ({prv.cantidad})
                  </option>
                ))}
              </select>
            )}

            <button
              onClick={abrirCrear}
              className="px-3.5 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-500 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm shadow-red-900/30 shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Nuevo Producto / Repuesto</span>
            </button>
          </div>
        </div>

        {/* Barra de Filtros Rápidos por los Pilares Comerciales */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-zinc-800/80">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] text-zinc-500 font-medium mr-1">Línea MOTOMOTO:</span>
            {[
              { id: 'todos', label: 'Todos' },
              { id: 'original', label: '⭐ Repuestos Originales OEM' },
              { id: 'generico', label: '⚙️ Repuestos Genéricos' },
              { id: 'no_aplica', label: '🧰 Herramientas & Insumos' },
            ].map((pilar) => (
              <button
                key={pilar.id}
                onClick={() => setFiltroTipoRepuesto(pilar.id as any)}
                className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors ${
                  filtroTipoRepuesto === pilar.id
                    ? 'bg-zinc-100 text-zinc-900 font-bold'
                    : 'bg-zinc-950 border border-zinc-800 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {pilar.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1">
            <span className="text-[11px] text-zinc-500 font-medium mr-1">Existencias:</span>
            {[
              { id: 'activos', label: 'Activos' },
              { id: 'bajo', label: 'Stock Bajo' },
              { id: 'agotado', label: 'Agotados' },
              { id: 'todos', label: 'Ver Todos' },
            ].map((btn) => (
              <button
                key={btn.id}
                onClick={() => setFiltroStock(btn.id as any)}
                className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors ${
                  filtroStock === btn.id
                    ? 'bg-red-600 text-white shadow-xs'
                    : 'bg-zinc-950 border border-zinc-800 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tabla de Productos / Inventario */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-sm">
        {productosFiltrados.length === 0 ? (
          <div className="p-12 text-center">
            <Wrench className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
            <h3 className="text-sm font-semibold text-zinc-300">No se encontraron productos</h3>
            <p className="text-xs text-zinc-400 mt-1">
              {busqueda ? 'Prueba con otros términos de búsqueda.' : 'Aún no has registrado productos en el inventario.'}
            </p>
            <button
              onClick={abrirCrear}
              className="mt-4 px-3.5 py-1.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-500 rounded-lg inline-flex items-center gap-1.5 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Crear Primer Producto
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-950/60 text-zinc-400">
                  <th className="px-4 py-3 font-medium">SKU / Código</th>
                  <th className="px-4 py-3 font-medium">Nombre & Tipo</th>
                  <th className="px-4 py-3 font-medium">Categoría & Marca</th>
                  <th className="px-4 py-3 font-medium">Proveedor / Distribuidor</th>
                  <th className="px-4 py-3 font-medium text-center">Existencias</th>
                  <th className="px-4 py-3 font-medium text-right">Costo Unit.</th>
                  <th className="px-4 py-3 font-medium text-right">P. Venta</th>
                  <th className="px-4 py-3 font-medium text-right">Margen</th>
                  <th className="px-4 py-3 font-medium text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {productosFiltrados.map((p) => {
                  const esAgotado = p.stock === 0;
                  const esBajo = p.stock <= p.stockMinimo && !esAgotado;
                  const margen = p.precioVenta > 0 && p.costoUnitario > 0
                    ? Math.round(((p.precioVenta - p.costoUnitario) / p.precioVenta) * 100)
                    : null;

                  return (
                    <tr
                      key={p.id}
                      className={`hover:bg-zinc-800/40 transition-colors ${!p.activo ? 'opacity-50 bg-zinc-950/20' : ''}`}
                    >
                      <td className="px-4 py-3.5 font-mono text-zinc-300 font-medium whitespace-nowrap">
                        {p.codigo}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-zinc-100">{p.nombre}</span>
                          {p.tipoRepuesto === 'original' ? (
                            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-800/60 px-1.5 py-0.2 rounded inline-flex items-center gap-1">
                              <ShieldCheck className="w-3 h-3" />
                              ORIGINAL
                            </span>
                          ) : p.tipoRepuesto === 'generico' ? (
                            <span className="text-[10px] font-medium text-blue-300 bg-blue-950/80 border border-blue-800/60 px-1.5 py-0.2 rounded inline-flex items-center gap-1">
                              <Cog className="w-3 h-3" />
                              GENÉRICO
                            </span>
                          ) : (
                            <span className="text-[10px] text-zinc-400 bg-zinc-950 border border-zinc-800 px-1.5 py-0.2 rounded">
                              HERRAMIENTA
                            </span>
                          )}
                        </div>
                        {p.descripcion && (
                          <div className="text-[11px] text-zinc-400 truncate max-w-sm mt-0.5">
                            {p.descripcion}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="text-zinc-200">{p.categoria}</div>
                        <div className="text-[11px] text-zinc-400">{p.marca || 'Genérico'}</div>
                      </td>
                      {/* Columna de Proveedor */}
                      <td className="px-4 py-3.5">
                        {p.proveedor ? (
                          <div>
                            <div className="text-zinc-200 font-medium flex items-center gap-1.5">
                              <Truck className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                              <span className="truncate max-w-[150px]">{p.proveedor}</span>
                            </div>
                            {p.proveedorContacto && (
                              <div className="text-[11px] text-zinc-400 flex items-center gap-1 mt-0.5">
                                <Phone className="w-3 h-3 text-zinc-500" />
                                <span>{p.proveedorContacto}</span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-[11px] text-zinc-500 italic">No asignado</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-center whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5 font-mono font-semibold">
                          <span
                            className={`text-sm ${
                              esAgotado
                                ? 'text-red-400'
                                : esBajo
                                ? 'text-amber-400'
                                : 'text-emerald-400'
                            }`}
                          >
                            {p.stock}
                          </span>
                          <span className="text-[10px] text-zinc-400 font-sans font-normal">
                            / mín {p.stockMinimo}
                          </span>
                        </div>
                        {esAgotado && (
                          <div className="text-[10px] text-red-400 font-medium mt-0.5">Agotado</div>
                        )}
                        {esBajo && (
                          <div className="text-[10px] text-amber-400 font-medium mt-0.5">Bajo stock</div>
                        )}
                      </td>
                      <td className="px-4 py-3.5 font-mono text-right text-zinc-400 whitespace-nowrap">
                        {formatMoney(p.costoUnitario)}
                      </td>
                      <td className="px-4 py-3.5 font-mono text-right text-zinc-100 font-semibold whitespace-nowrap">
                        {formatMoney(p.precioVenta)}
                      </td>
                      <td className="px-4 py-3.5 font-mono text-right text-zinc-400 whitespace-nowrap">
                        {margen !== null ? `${margen}%` : '-'}
                      </td>
                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => abrirAjuste(p)}
                            title="Ajustar existencias / entrada de stock"
                            className="p-1.5 text-zinc-400 hover:text-emerald-400 hover:bg-zinc-800 rounded transition-colors"
                          >
                            <ArrowUpDown className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => abrirKardex(p)}
                            title="Ver movimientos (Kardex)"
                            className="p-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded transition-colors"
                          >
                            <History className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => abrirEditar(p)}
                            title="Editar producto"
                            className="p-1.5 text-zinc-400 hover:text-amber-300 hover:bg-zinc-800 rounded transition-colors"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Crear / Editar Producto */}
      <Modal
        isOpen={modalEditarOpen}
        onClose={() => setModalEditarOpen(false)}
        title={productoEnEdicion?.id ? 'Editar Producto o Repuesto' : 'Registrar Nuevo Producto / Repuesto'}
        subtitle="MOTOMOTO S&E · Almacenado localmente en IndexedDB"
        maxWidth="2xl"
      >
        <form onSubmit={handleGuardarProducto} className="p-6 space-y-4">
          {errorForm && (
            <div className="p-3 bg-red-950/60 border border-red-800/80 rounded-lg flex items-center gap-2 text-xs text-red-300">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorForm}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">
                Código SKU <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={productoEnEdicion?.codigo || ''}
                onChange={(e) =>
                  setProductoEnEdicion((prev) => ({ ...prev, codigo: e.target.value.toUpperCase() }))
                }
                placeholder="Ej: OEM-YAM-01"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs font-mono text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-red-500 uppercase"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-zinc-300 mb-1">
                Nombre de la Herramienta o Repuesto <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={productoEnEdicion?.nombre || ''}
                onChange={(e) => setProductoEnEdicion((prev) => ({ ...prev, nombre: e.target.value }))}
                placeholder="Ej: Kit Cilindro y Pistón Yamaha FZ 2.0"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-red-500"
              />
            </div>
          </div>

          {/* Selector de Tipo de Repuesto (Original vs Genérico) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-3 bg-zinc-950 rounded-xl border border-zinc-800">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-zinc-300 mb-1">
                Línea Comercial MOTOMOTO S&E <span className="text-red-500">*</span>
              </label>
              <select
                value={productoEnEdicion?.tipoRepuesto || 'original'}
                onChange={(e) =>
                  setProductoEnEdicion((prev) => ({
                    ...prev,
                    tipoRepuesto: e.target.value as any,
                  }))
                }
                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-red-500 font-semibold"
              >
                <option value="original">⭐ Repuesto Original (OEM de Fábrica)</option>
                <option value="generico">⚙️ Repuesto Genérico (Alternativo de Calidad)</option>
                <option value="no_aplica">🧰 Herramienta / Insumo de Taller (No aplica repuesto)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">
                Garantía (Meses)
              </label>
              <input
                type="number"
                min="0"
                value={productoEnEdicion?.garantiaMeses ?? 6}
                onChange={(e) =>
                  setProductoEnEdicion((prev) => ({
                    ...prev,
                    garantiaMeses: parseInt(e.target.value) || 0,
                  }))
                }
                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-xs font-mono text-zinc-100 focus:outline-none focus:border-red-500"
              />
            </div>
          </div>

          {/* Categoría y Marca */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">
                Categoría <span className="text-red-500">*</span>
              </label>
              <select
                value={productoEnEdicion?.categoria || 'Repuestos Originales'}
                onChange={(e) =>
                  setProductoEnEdicion((prev) => ({
                    ...prev,
                    categoria: e.target.value as CategoriaProducto,
                  }))
                }
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-red-500"
              >
                {CATEGORIAS_PRODUCTO.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">
                Marca / Fabricante
              </label>
              <input
                type="text"
                value={productoEnEdicion?.marca || ''}
                onChange={(e) => setProductoEnEdicion((prev) => ({ ...prev, marca: e.target.value }))}
                placeholder="Ej: Yamaha, Bajaj Genuine, Motul, NGK, Brembo"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-red-500"
              />
            </div>
          </div>

          {/* NUEVO: Proveedor y Contacto del Proveedor */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3 bg-zinc-950/70 border border-zinc-800 rounded-xl">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1 flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5 text-red-500" />
                <span>Proveedor / Distribuidor</span>
              </label>
              <input
                type="text"
                list="proveedores-sugeridos"
                value={productoEnEdicion?.proveedor || ''}
                onChange={(e) => setProductoEnEdicion((prev) => ({ ...prev, proveedor: e.target.value }))}
                placeholder="Ej: Incolmotos Yamaha, Auteco Mayorista..."
                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-red-500"
              />
              <datalist id="proveedores-sugeridos">
                {listaProveedores.map((p) => (
                  <option key={p.nombre} value={p.nombre} />
                ))}
              </datalist>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-zinc-400" />
                <span>Contacto / Teléfono del Proveedor (Opcional)</span>
              </label>
              <input
                type="text"
                value={productoEnEdicion?.proveedorContacto || ''}
                onChange={(e) =>
                  setProductoEnEdicion((prev) => ({ ...prev, proveedorContacto: e.target.value }))
                }
                placeholder="Ej: 310 123 4567 / Asesor Luis"
                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-red-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">
                {productoEnEdicion?.id ? 'Stock Actual' : 'Stock Inicial'}
              </label>
              <input
                type="number"
                min="0"
                value={productoEnEdicion?.stock ?? 0}
                onChange={(e) =>
                  setProductoEnEdicion((prev) => ({ ...prev, stock: parseInt(e.target.value) || 0 }))
                }
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs font-mono text-zinc-100 focus:outline-none focus:border-red-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">
                Stock Mínimo (Alerta)
              </label>
              <input
                type="number"
                min="0"
                value={productoEnEdicion?.stockMinimo ?? 2}
                onChange={(e) =>
                  setProductoEnEdicion((prev) => ({
                    ...prev,
                    stockMinimo: parseInt(e.target.value) || 0,
                  }))
                }
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs font-mono text-zinc-100 focus:outline-none focus:border-red-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">
                Costo Unitario ($)
              </label>
              <input
                type="number"
                min="0"
                step="100"
                value={productoEnEdicion?.costoUnitario ?? 0}
                onChange={(e) =>
                  setProductoEnEdicion((prev) => ({
                    ...prev,
                    costoUnitario: parseFloat(e.target.value) || 0,
                  }))
                }
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs font-mono text-zinc-100 focus:outline-none focus:border-red-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">
                Precio de Venta ($) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                step="100"
                required
                value={productoEnEdicion?.precioVenta ?? 0}
                onChange={(e) =>
                  setProductoEnEdicion((prev) => ({
                    ...prev,
                    precioVenta: parseFloat(e.target.value) || 0,
                  }))
                }
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs font-mono text-zinc-100 font-semibold focus:outline-none focus:border-red-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1">
              Descripción / Compatibilidad con Motos (Opcional)
            </label>
            <textarea
              rows={3}
              value={productoEnEdicion?.descripcion || ''}
              onChange={(e) =>
                setProductoEnEdicion((prev) => ({ ...prev, descripcion: e.target.value }))
              }
              placeholder="Modelos compatibles, especificaciones de torque, procedencia..."
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-red-500 resize-none"
            />
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="producto-activo"
              checked={productoEnEdicion?.activo ?? true}
              onChange={(e) => setProductoEnEdicion((prev) => ({ ...prev, activo: e.target.checked }))}
              className="rounded bg-zinc-950 border-zinc-700 text-red-600 focus:ring-0"
            />
            <label htmlFor="producto-activo" className="text-xs text-zinc-300 cursor-pointer">
              Producto activo para facturación y servicios
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
              {guardando ? 'Guardando...' : productoEnEdicion?.id ? 'Guardar Cambios' : 'Registrar Producto'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Ajuste Rápido de Stock */}
      {productoParaAjuste && (
        <Modal
          isOpen={modalAjusteOpen}
          onClose={() => setModalAjusteOpen(false)}
          title={`Ajuste de Stock: ${productoParaAjuste.nombre}`}
          subtitle={`SKU: ${productoParaAjuste.codigo} · Existencias actuales: ${productoParaAjuste.stock} unidades`}
          maxWidth="md"
        >
          <form onSubmit={handleGuardarAjuste} className="p-6 space-y-4">
            {errorForm && (
              <div className="p-3 bg-red-950/60 border border-red-800/80 rounded-lg flex items-center gap-2 text-xs text-red-300">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorForm}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">
                Tipo de Movimiento
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setTipoAjuste('entrada')}
                  className={`py-2 px-3 text-xs font-medium rounded-lg border transition-colors ${
                    tipoAjuste === 'entrada'
                      ? 'bg-emerald-950 border-emerald-600 text-emerald-300 font-bold'
                      : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  + Entrada (Compra)
                </button>
                <button
                  type="button"
                  onClick={() => setTipoAjuste('salida')}
                  className={`py-2 px-3 text-xs font-medium rounded-lg border transition-colors ${
                    tipoAjuste === 'salida'
                      ? 'bg-red-950 border-red-600 text-red-300 font-bold'
                      : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  - Salida (Baja/Merma)
                </button>
                <button
                  type="button"
                  onClick={() => setTipoAjuste('ajuste')}
                  className={`py-2 px-3 text-xs font-medium rounded-lg border transition-colors ${
                    tipoAjuste === 'ajuste'
                      ? 'bg-amber-950 border-amber-600 text-amber-300 font-bold'
                      : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  = Conteo Físico
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">
                {tipoAjuste === 'ajuste' ? 'Nuevo Total en Inventario' : 'Cantidad a Mover'}
              </label>
              <input
                type="number"
                min="1"
                required
                value={cantidadAjuste}
                onChange={(e) => setCantidadAjuste(parseInt(e.target.value) || 0)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs font-mono text-zinc-100 focus:outline-none focus:border-red-500 font-bold text-lg"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">
                Motivo / Justificación <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Ej: Factura proveedor #4892, conteo de fin de mes, repuesto averiado..."
                value={motivoAjuste}
                onChange={(e) => setMotivoAjuste(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-red-500"
              />
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => setModalAjusteOpen(false)}
                className="px-4 py-2 text-xs font-medium text-zinc-300 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={guardando}
                className="px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-500 rounded-lg transition-colors disabled:opacity-50"
              >
                {guardando ? 'Guardando...' : 'Confirmar Ajuste'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal Historial de Movimientos (Kardex) */}
      {productoKardex && (
        <Modal
          isOpen={modalKardexOpen}
          onClose={() => setModalKardexOpen(false)}
          title={`Kardex de Movimientos: ${productoKardex.nombre}`}
          subtitle={`Código SKU: ${productoKardex.codigo} · Existencias actuales: ${productoKardex.stock}`}
          maxWidth="2xl"
        >
          <div className="p-6 space-y-4">
            {movimientosDelProducto.length === 0 ? (
              <div className="p-8 text-center bg-zinc-950 rounded-xl border border-zinc-800 text-xs text-zinc-500">
                No hay movimientos registrados para este producto todavía.
              </div>
            ) : (
              <div className="max-h-96 overflow-y-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-800 text-zinc-400">
                      <th className="py-2 px-3">Fecha</th>
                      <th className="py-2 px-3">Tipo</th>
                      <th className="py-2 px-3 text-right">Cantidad</th>
                      <th className="py-2 px-3 text-right">Saldo</th>
                      <th className="py-2 px-3">Motivo / Factura</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60">
                    {movimientosDelProducto.map((mov) => {
                      const esPositivo = mov.tipo === 'entrada' || (mov.tipo === 'ajuste' && mov.cantidad >= 0);
                      return (
                        <tr key={mov.id} className="hover:bg-zinc-800/30">
                          <td className="py-2.5 px-3 text-zinc-400 whitespace-nowrap">
                            {formatDateTime(mov.fecha)}
                          </td>
                          <td className="py-2.5 px-3">
                            <span
                              className={`px-2 py-0.5 text-[10px] rounded font-bold uppercase ${
                                mov.tipo === 'entrada'
                                  ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                                  : mov.tipo === 'venta' || mov.tipo === 'salida'
                                  ? 'bg-red-950 text-red-400 border border-red-800'
                                  : 'bg-zinc-800 text-zinc-300'
                              }`}
                            >
                              {mov.tipo}
                            </span>
                          </td>
                          <td
                            className={`py-2.5 px-3 font-mono font-bold text-right ${
                              esPositivo ? 'text-emerald-400' : 'text-red-400'
                            }`}
                          >
                            {esPositivo ? `+${mov.cantidad}` : `-${Math.abs(mov.cantidad)}`}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-right text-zinc-300">
                            {mov.stockNuevo}
                          </td>
                          <td className="py-2.5 px-3 text-zinc-300 max-w-xs truncate">
                            {mov.motivo}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            <div className="flex justify-end pt-3 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => setModalKardexOpen(false)}
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
