import React, { useState, useMemo, useEffect } from 'react';
import {
  ShoppingCart,
  Search,
  Plus,
  Minus,
  Trash2,
  DollarSign,
  User,
  Bike,
  Wrench,
  Zap,
  Receipt,
  CreditCard,
  Banknote,
  Tag,
  UserPlus,
  AlertCircle,
  ShieldCheck,
  Cog,
  Sparkles,
  Info,
} from 'lucide-react';
import {
  Producto,
  Cliente,
  Venta,
  ItemVenta,
  TipoItemVenta,
  MetodoPago,
  TipoComprobante,
  TipoVenta,
  CategoriaProducto,
} from '../../types';
import { formatMoney, formatServiceNumber } from '../../utils/formatters';
import { Modal } from '../common/Modal';

interface PuntoDeVentaViewProps {
  productos: Producto[];
  clientes: Cliente[];
  ventaParaEditar?: Venta | null;
  prefijoFactura: string;
  siguienteNumeroFactura: number;
  onEmitirVenta: (venta: Partial<Venta>, esNueva: boolean) => Promise<Venta>;
  onGuardarClienteRapido: (cliente: Partial<Cliente> & { nombre: string; telefono: string }) => Promise<Cliente>;
  onVerFacturaModal: (venta: Venta) => void;
  onCancelarEdicion?: () => void;
}

// Servicios predefinidos comunes de MOTOMOTO S&E
const SERVICIOS_ELECTRICOS_FRECUENTES = [
  { nombre: 'Diagnóstico sistema de carga y batería', precio: 25000 },
  { nombre: 'Rebobinado y mantenimiento de corona / estator', precio: 75000 },
  { nombre: 'Reparación / reemplazo de ramal y cableado eléctrico', precio: 45000 },
  { nombre: 'Instalación de luces exploradoras LED con relé', precio: 35000 },
  { nombre: 'Revisión y cambio de regulador / rectificador', precio: 20000 },
  { nombre: 'Reparación de motor de arranque y bendix', precio: 40000 },
  { nombre: 'Instalación de alarma / rastreador GPS', precio: 50000 },
];

const SERVICIOS_MECANICOS_FRECUENTES = [
  { nombre: 'Mantenimiento preventivo general y engrase', precio: 60000 },
  { nombre: 'Calibración y ajuste de válvulas / punterías', precio: 30000 },
  { nombre: 'Sincronización y limpieza de carburador / inyector', precio: 35000 },
  { nombre: 'Cambio de kit de arrastre (piñón, corona, cadena)', precio: 25000 },
  { nombre: 'Mantenimiento de suspensión delantera (aceite y retenes)', precio: 45000 },
  { nombre: 'Servicio de frenos y purga de líquido hidráulico', precio: 25000 },
  { nombre: 'Reparación y ajuste de motor / clutch embrague', precio: 120000 },
];

export const PuntoDeVentaView: React.FC<PuntoDeVentaViewProps> = ({
  productos,
  clientes,
  ventaParaEditar,
  prefijoFactura,
  siguienteNumeroFactura,
  onEmitirVenta,
  onGuardarClienteRapido,
  onVerFacturaModal,
  onCancelarEdicion,
}) => {
  const esNueva = !ventaParaEditar;

  // Estado de ítems en la factura
  const [items, setItems] = useState<ItemVenta[]>(ventaParaEditar?.items || []);
  const [tipoComprobante, setTipoComprobante] = useState<TipoComprobante>(
    ventaParaEditar?.tipoComprobante || 'factura'
  );

  // Cliente
  const [clienteId, setClienteId] = useState<string>(ventaParaEditar?.clienteId || 'cliente_general');
  const [clienteNombre, setClienteNombre] = useState<string>(
    ventaParaEditar?.clienteNombre || 'Consumidor Final / Mostrador'
  );
  const [clienteDocumento, setClienteDocumento] = useState<string>(ventaParaEditar?.clienteDocumento || '');
  const [clienteTelefono, setClienteTelefono] = useState<string>(ventaParaEditar?.clienteTelefono || '');

  // Datos de la Motocicleta
  const [incluyeServicioMoto, setIncluyeServicioMoto] = useState<boolean>(
    Boolean(ventaParaEditar?.incluyeServicioMoto || (ventaParaEditar?.items?.some((i) => i.esServicio)))
  );
  const [marcaMoto, setMarcaMoto] = useState<string>(ventaParaEditar?.marcaMoto || '');
  const [modeloMoto, setModeloMoto] = useState<string>(ventaParaEditar?.modeloMoto || '');
  const [placaMoto, setPlacaMoto] = useState<string>(ventaParaEditar?.placaMoto || '');
  const [kilometraje, setKilometraje] = useState<string>(ventaParaEditar?.kilometraje || '');
  const [mecanicoResponsable, setMecanicoResponsable] = useState<string>(
    ventaParaEditar?.mecanicoResponsable || ''
  );
  const [fallaReportada, setFallaReportada] = useState<string>(ventaParaEditar?.fallaReportada || '');

  // Cargos y descuentos
  const [descuento, setDescuento] = useState<number>(ventaParaEditar?.descuento || 0);
  const [otrosCargos, setOtrosCargos] = useState<number>(ventaParaEditar?.otrosCargos || 0);
  const [observaciones, setObservaciones] = useState<string>(ventaParaEditar?.observaciones || '');

  // Cobro y método de pago
  const [metodoPago, setMetodoPago] = useState<MetodoPago>(
    ventaParaEditar?.metodoPagoPrincipal || 'efectivo'
  );
  const [montoRecibido, setMontoRecibido] = useState<number>(ventaParaEditar?.montoRecibido || 0);

  // Filtros del catálogo de productos
  const [busquedaProducto, setBusquedaProducto] = useState<string>('');
  const [filtroPilar, setFiltroPilar] = useState<'todos' | 'original' | 'generico' | 'electrico' | 'taller' | 'lubricante' | 'herramienta'>('todos');

  // UI state
  const [errorAlerta, setErrorAlerta] = useState<string | null>(null);
  const [guardando, setGuardando] = useState<boolean>(false);

  // Modal para agregar servicio eléctrico rápido
  const [modalServicioElecOpen, setModalServicioElecOpen] = useState(false);
  const [servElecNombre, setServElecNombre] = useState('');
  const [servElecPrecio, setServElecPrecio] = useState<number>(30000);
  const [servElecGarantia, setServElecGarantia] = useState('3 meses de garantía eléctrica');
  const [servElecNota, setServElecNota] = useState('');

  // Modal para agregar servicio mecánico rápido
  const [modalServicioMecOpen, setModalServicioMecOpen] = useState(false);
  const [servMecNombre, setServMecNombre] = useState('');
  const [servMecPrecio, setServMecPrecio] = useState<number>(40000);
  const [servMecGarantia, setServMecGarantia] = useState('3 meses de garantía en mano de obra');
  const [servMecNota, setServMecNota] = useState('');

  // Modal cliente rápido
  const [modalClienteRapidoOpen, setModalClienteRapidoOpen] = useState<boolean>(false);
  const [nuevoNombre, setNuevoNombre] = useState<string>('');
  const [nuevoTelefono, setNuevoTelefono] = useState<string>('');
  const [nuevoDoc, setNuevoDoc] = useState<string>('');

  // Número de factura sugerido
  const numeroFacturaSugerido = useMemo(() => {
    if (ventaParaEditar?.numeroFactura) return ventaParaEditar.numeroFactura;
    return formatServiceNumber(prefijoFactura || 'FAC', siguienteNumeroFactura || 1);
  }, [ventaParaEditar, prefijoFactura, siguienteNumeroFactura]);

  // Manejar cambio de cliente
  const handleCambiarCliente = (cId: string) => {
    setClienteId(cId);
    if (cId === 'cliente_general') {
      setClienteNombre('Consumidor Final / Mostrador');
      setClienteDocumento('');
      setClienteTelefono('');
    } else {
      const cli = clientes.find((c) => c.id === cId);
      if (cli) {
        setClienteNombre(cli.nombre);
        setClienteDocumento(cli.documento || '');
        setClienteTelefono(cli.telefono || '');
      }
    }
  };

  // Filtrar catálogo de productos disponibles
  const productosFiltrados = useMemo(() => {
    const q = busquedaProducto.toLowerCase().trim();
    return productos.filter((p) => {
      if (!p.activo) return false;

      // Filtro de los 4 pilares
      if (filtroPilar === 'original' && p.tipoRepuesto !== 'original') return false;
      if (filtroPilar === 'generico' && p.tipoRepuesto !== 'generico') return false;
      if (filtroPilar === 'electrico' && p.categoria !== 'Sistema eléctrico') return false;
      if (filtroPilar === 'taller' && p.categoria !== 'Repuestos de motor' && p.categoria !== 'Frenos y suspensión') return false;
      if (filtroPilar === 'lubricante' && p.categoria !== 'Lubricantes y químicos') return false;
      if (filtroPilar === 'herramienta' && !p.categoria.includes('Herramientas')) return false;

      if (!q) return true;
      return (
        p.codigo.toLowerCase().includes(q) ||
        p.nombre.toLowerCase().includes(q) ||
        p.marca.toLowerCase().includes(q) ||
        p.categoria.toLowerCase().includes(q)
      );
    });
  }, [productos, busquedaProducto, filtroPilar]);

  // Cálculos de subtotales por pilar comercial MOTOMOTO S&E
  const {
    subtotalElectricidad,
    subtotalTallerMecanico,
    subtotalRepuestosOriginales,
    subtotalRepuestosGenericos,
    subtotalOtrosProductos,
    subtotalServicios,
    subtotalProductos,
    totalCalculado,
  } = useMemo(() => {
    let elec = 0;
    let mec = 0;
    let orig = 0;
    let gen = 0;
    let otros = 0;

    items.forEach((it) => {
      if (it.tipoItem === 'servicio_electrico') {
        elec += it.subtotal;
      } else if (it.tipoItem === 'servicio_mecanico') {
        mec += it.subtotal;
      } else if (it.tipoItem === 'repuesto_original') {
        orig += it.subtotal;
      } else if (it.tipoItem === 'repuesto_generico') {
        gen += it.subtotal;
      } else {
        otros += it.subtotal;
      }
    });

    const servs = elec + mec;
    const prods = orig + gen + otros;
    const subtotalBruto = servs + prods + (Number(otrosCargos) || 0);
    const total = Math.max(0, subtotalBruto - (Number(descuento) || 0));

    return {
      subtotalElectricidad: elec,
      subtotalTallerMecanico: mec,
      subtotalRepuestosOriginales: orig,
      subtotalRepuestosGenericos: gen,
      subtotalOtrosProductos: otros,
      subtotalServicios: servs,
      subtotalProductos: prods,
      totalCalculado: total,
    };
  }, [items, otrosCargos, descuento]);

  // Sincronizar monto recibido en efectivo
  useEffect(() => {
    if (metodoPago === 'efectivo' && (montoRecibido === 0 || montoRecibido < totalCalculado)) {
      setMontoRecibido(totalCalculado);
    }
  }, [totalCalculado, metodoPago]);

  // Cambio / Vueltos devueltos
  const cambioDevuelto = useMemo(() => {
    if (metodoPago !== 'efectivo') return 0;
    return Math.max(0, (Number(montoRecibido) || 0) - totalCalculado);
  }, [metodoPago, montoRecibido, totalCalculado]);

  // Saldo pendiente en caso de venta a crédito
  const saldoPendiente = useMemo(() => {
    if (metodoPago === 'credito') {
      return Math.max(0, totalCalculado - (Number(montoRecibido) || 0));
    }
    return 0;
  }, [metodoPago, montoRecibido, totalCalculado]);

  // Agregar producto físico al carrito
  const agregarProductoAlCarrito = (prod: Producto) => {
    setErrorAlerta(null);
    const itemExistente = items.find((i) => i.productoId === prod.id && !i.esServicio);
    const cantActual = itemExistente ? itemExistente.cantidad : 0;

    if (cantActual + 1 > prod.stock) {
      setErrorAlerta(`¡Stock máximo alcanzado! Solo hay ${prod.stock} unidades de "${prod.nombre}".`);
      return;
    }

    // Determinar tipo de ítem de negocio
    let tipoItem: TipoItemVenta = 'otro';
    let garantiaTexto = '';

    if (prod.tipoRepuesto === 'original') {
      tipoItem = 'repuesto_original';
      garantiaTexto = prod.garantiaMeses ? `${prod.garantiaMeses} meses garantía oficial OEM` : 'Garantía Original de Fábrica';
    } else if (prod.tipoRepuesto === 'generico') {
      tipoItem = 'repuesto_generico';
      garantiaTexto = 'Garantía estándar 30 días';
    } else if (prod.categoria === 'Lubricantes y químicos') {
      tipoItem = 'lubricante';
    } else if (prod.categoria.includes('Herramientas')) {
      tipoItem = 'herramienta';
    }

    if (itemExistente) {
      setItems((prev) =>
        prev.map((i) =>
          i.productoId === prod.id && !i.esServicio
            ? { ...i, cantidad: i.cantidad + 1, subtotal: (i.cantidad + 1) * i.precioUnitario }
            : i
        )
      );
    } else {
      setItems((prev) => [
        ...prev,
        {
          productoId: prod.id,
          codigo: prod.codigo,
          nombre: prod.nombre,
          tipoItem,
          esServicio: false,
          cantidad: 1,
          precioUnitario: prod.precioVenta,
          costoUnitario: prod.costoUnitario,
          subtotal: prod.precioVenta,
          garantia: garantiaTexto,
          nota: prod.marca ? `Marca: ${prod.marca}` : undefined,
        },
      ]);
    }
  };

  // Agregar un servicio de electricidad
  const handleAgregarServicioElectrico = () => {
    if (!servElecNombre.trim()) {
      setErrorAlerta('Ingresa el nombre o descripción del servicio eléctrico.');
      return;
    }
    const precio = Number(servElecPrecio) || 0;
    const nuevoItem: ItemVenta = {
      productoId: `srv-elec-${Date.now()}`,
      codigo: 'ELEC-SRV',
      nombre: servElecNombre.trim(),
      tipoItem: 'servicio_electrico',
      esServicio: true,
      cantidad: 1,
      precioUnitario: precio,
      costoUnitario: 0,
      subtotal: precio,
      garantia: servElecGarantia.trim() || 'Garantía eléctrica MOTOMOTO S&E',
      nota: servElecNota.trim() || undefined,
    };

    setItems((prev) => [...prev, nuevoItem]);
    setIncluyeServicioMoto(true);
    setModalServicioElecOpen(false);
    setServElecNombre('');
    setServElecNota('');
    setErrorAlerta(null);
  };

  // Agregar un servicio de taller mecánico
  const handleAgregarServicioMecanico = () => {
    if (!servMecNombre.trim()) {
      setErrorAlerta('Ingresa el nombre o descripción del servicio mecánico.');
      return;
    }
    const precio = Number(servMecPrecio) || 0;
    const nuevoItem: ItemVenta = {
      productoId: `srv-mec-${Date.now()}`,
      codigo: 'MEC-SRV',
      nombre: servMecNombre.trim(),
      tipoItem: 'servicio_mecanico',
      esServicio: true,
      cantidad: 1,
      precioUnitario: precio,
      costoUnitario: 0,
      subtotal: precio,
      garantia: servMecGarantia.trim() || 'Garantía en mano de obra mecánica',
      nota: servMecNota.trim() || undefined,
    };

    setItems((prev) => [...prev, nuevoItem]);
    setIncluyeServicioMoto(true);
    setModalServicioMecOpen(false);
    setServMecNombre('');
    setServMecNota('');
    setErrorAlerta(null);
  };

  const modificarCantidad = (index: number, delta: number) => {
    const item = items[index];
    const nuevaCant = item.cantidad + delta;

    if (nuevaCant <= 0) {
      setItems((prev) => prev.filter((_, i) => i !== index));
      return;
    }

    if (!item.esServicio) {
      const prod = productos.find((p) => p.id === item.productoId);
      if (prod && nuevaCant > prod.stock) {
        setErrorAlerta(`Existencias insuficientes. Máximo disponible: ${prod.stock}`);
        return;
      }
    }

    setErrorAlerta(null);
    setItems((prev) =>
      prev.map((it, i) =>
        i === index
          ? { ...it, cantidad: nuevaCant, subtotal: nuevaCant * it.precioUnitario }
          : it
      )
    );
  };

  const modificarPrecio = (index: number, nuevoPrecio: number) => {
    if (nuevoPrecio < 0) return;
    setItems((prev) =>
      prev.map((it, i) =>
        i === index
          ? { ...it, precioUnitario: nuevoPrecio, subtotal: it.cantidad * nuevoPrecio }
          : it
      )
    );
  };

  const eliminarItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Crear cliente rápido
  const handleCrearClienteRapido = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoNombre.trim() || !nuevoTelefono.trim()) {
      setErrorAlerta('El nombre y teléfono son obligatorios.');
      return;
    }
    try {
      const cli = await onGuardarClienteRapido({
        nombre: nuevoNombre.trim(),
        telefono: nuevoTelefono.trim(),
        documento: nuevoDoc.trim(),
        activo: true,
      });
      handleCambiarCliente(cli.id);
      setModalClienteRapidoOpen(false);
      setNuevoNombre('');
      setNuevoTelefono('');
      setNuevoDoc('');
    } catch (err: unknown) {
      setErrorAlerta((err as Error).message);
    }
  };

  // Finalizar y emitir factura
  const handleCobrarFactura = async () => {
    setErrorAlerta(null);

    if (items.length === 0) {
      setErrorAlerta('Agrega al menos un servicio (eléctrico/mecánico) o un repuesto a la factura.');
      return;
    }

    if (metodoPago === 'credito' && clienteId === 'cliente_general') {
      setErrorAlerta('Para ventas a crédito debes seleccionar un cliente registrado con nombre y teléfono.');
      return;
    }

    try {
      setGuardando(true);

      const tieneServicio = items.some((i) => i.esServicio);
      const tieneProductos = items.some((i) => !i.esServicio);

      const tipoVenta: TipoVenta =
        tieneServicio && tieneProductos
          ? 'mixta'
          : tieneServicio
          ? 'servicio_taller'
          : 'venta_directa';

      const ventaGuardada = await onEmitirVenta(
        {
          id: ventaParaEditar?.id,
          numeroFactura: numeroFacturaSugerido,
          fecha: new Date().toISOString(),
          tipoVenta,
          tipoComprobante,
          clienteId,
          clienteNombre,
          clienteDocumento,
          clienteTelefono,
          incluyeServicioMoto: tieneServicio || incluyeServicioMoto,
          marcaMoto: incluyeServicioMoto ? marcaMoto : '',
          modeloMoto: incluyeServicioMoto ? modeloMoto : '',
          placaMoto: incluyeServicioMoto ? placaMoto.toUpperCase() : '',
          kilometraje: incluyeServicioMoto ? kilometraje : '',
          fallaReportada: incluyeServicioMoto ? fallaReportada : '',
          mecanicoResponsable: incluyeServicioMoto ? mecanicoResponsable : '',
          manoDeObra: subtotalServicios,
          items,
          subtotalElectricidad,
          subtotalTallerMecanico,
          subtotalRepuestosOriginales,
          subtotalRepuestosGenericos,
          subtotalOtrosProductos,
          subtotalServicios,
          subtotalProductos,
          descuento: Number(descuento) || 0,
          otrosCargos: Number(otrosCargos) || 0,
          total: totalCalculado,
          metodoPagoPrincipal: metodoPago,
          montoRecibido: Number(montoRecibido) || totalCalculado,
          cambioDevuelto,
          montoPagado: metodoPago === 'credito' ? Number(montoRecibido) || 0 : totalCalculado,
          saldoPendiente,
          estado: saldoPendiente > 0 ? 'pendiente_pago' : 'completada',
          observaciones,
          fechaActualizacion: new Date().toISOString(),
        },
        esNueva
      );

      // Limpiar y abrir modal de factura para imprimir
      onVerFacturaModal(ventaGuardada);
      if (esNueva) {
        setItems([]);
        setClienteId('cliente_general');
        setClienteNombre('Consumidor Final / Mostrador');
        setClienteDocumento('');
        setClienteTelefono('');
        setIncluyeServicioMoto(false);
        setMarcaMoto('');
        setModeloMoto('');
        setPlacaMoto('');
        setKilometraje('');
        setMecanicoResponsable('');
        setFallaReportada('');
        setDescuento(0);
        setOtrosCargos(0);
        setObservaciones('');
        setMontoRecibido(0);
      }
    } catch (err: unknown) {
      setErrorAlerta((err as Error).message || 'Error al emitir la factura.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="flex flex-col xl:flex-row gap-6 items-start pb-12">
      {/* Columna Izquierda: Acciones de los 4 Pilares y Catálogo */}
      <div className="w-full xl:w-7/12 space-y-4">
        {/* Barra Rápida de los 4 Pilares de MOTOMOTO S&E */}
        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl space-y-3 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-red-500" />
                <span>Facturación Rápida por Servicios y Repuestos</span>
              </h2>
              <p className="text-xs text-zinc-400">
                Selecciona la línea de servicio o busca un repuesto en el catálogo
              </p>
            </div>
            <span className="text-[11px] font-mono font-bold text-red-400 bg-red-950/60 border border-red-800/60 px-2 py-0.5 rounded">
              MOTOMOTO S&E
            </span>
          </div>

          {/* Botones directos de los 4 Pilares */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
            <button
              type="button"
              onClick={() => setModalServicioElecOpen(true)}
              className="p-2.5 rounded-lg bg-zinc-950 border border-amber-600/50 hover:border-amber-500 hover:bg-amber-950/20 text-left transition-all group flex flex-col justify-between"
            >
              <div className="flex items-center gap-1.5 text-amber-400 text-xs font-bold mb-1">
                <Zap className="w-3.5 h-3.5 fill-amber-400" />
                <span>Electricidad</span>
              </div>
              <span className="text-[11px] text-zinc-400 group-hover:text-zinc-200">
                + Agregar labor eléctrica
              </span>
            </button>

            <button
              type="button"
              onClick={() => setModalServicioMecOpen(true)}
              className="p-2.5 rounded-lg bg-zinc-950 border border-orange-600/50 hover:border-orange-500 hover:bg-orange-950/20 text-left transition-all group flex flex-col justify-between"
            >
              <div className="flex items-center gap-1.5 text-orange-400 text-xs font-bold mb-1">
                <Wrench className="w-3.5 h-3.5" />
                <span>Taller Mecánico</span>
              </div>
              <span className="text-[11px] text-zinc-400 group-hover:text-zinc-200">
                + Agregar mano de obra
              </span>
            </button>

            <button
              type="button"
              onClick={() => setFiltroPilar(filtroPilar === 'original' ? 'todos' : 'original')}
              className={`p-2.5 rounded-lg border text-left transition-all group flex flex-col justify-between ${
                filtroPilar === 'original'
                  ? 'bg-emerald-950/50 border-emerald-500 text-emerald-200 ring-1 ring-emerald-500'
                  : 'bg-zinc-950 border-emerald-800/40 hover:border-emerald-500 hover:bg-emerald-950/20'
              }`}
            >
              <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-bold mb-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Repuestos OEM</span>
              </div>
              <span className="text-[11px] text-zinc-400 group-hover:text-zinc-200">
                {filtroPilar === 'original' ? 'Filtro activo (Quitar)' : 'Filtrar originales'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setFiltroPilar(filtroPilar === 'generico' ? 'todos' : 'generico')}
              className={`p-2.5 rounded-lg border text-left transition-all group flex flex-col justify-between ${
                filtroPilar === 'generico'
                  ? 'bg-blue-950/50 border-blue-500 text-blue-200 ring-1 ring-blue-500'
                  : 'bg-zinc-950 border-blue-800/40 hover:border-blue-500 hover:bg-blue-950/20'
              }`}
            >
              <div className="flex items-center gap-1.5 text-blue-400 text-xs font-bold mb-1">
                <Cog className="w-3.5 h-3.5" />
                <span>Genéricos</span>
              </div>
              <span className="text-[11px] text-zinc-400 group-hover:text-zinc-200">
                {filtroPilar === 'generico' ? 'Filtro activo (Quitar)' : 'Filtrar alternativos'}
              </span>
            </button>
          </div>
        </div>

        {/* Buscador y Pestañas del Catálogo */}
        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl space-y-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex-1 flex items-center gap-2 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 focus-within:border-red-500">
              <Search className="w-4 h-4 text-zinc-500 shrink-0" />
              <input
                type="text"
                placeholder="Buscar por repuesto, código SKU, marca (Bajaj, Yamaha, Suzuki, Motul)..."
                value={busquedaProducto}
                onChange={(e) => setBusquedaProducto(e.target.value)}
                className="w-full bg-transparent text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none"
              />
              {busquedaProducto && (
                <button
                  onClick={() => setBusquedaProducto('')}
                  className="text-xs text-zinc-500 hover:text-zinc-300"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Selector de Filtro de Pilar */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
              {[
                { id: 'todos', label: 'Todos' },
                { id: 'original', label: '⭐ Originales' },
                { id: 'generico', label: '⚙️ Genéricos' },
                { id: 'electrico', label: '⚡ Eléctricos' },
                { id: 'lubricante', label: '🛢️ Lubricantes' },
                { id: 'herramienta', label: '🧰 Herramientas' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFiltroPilar(tab.id as any)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs whitespace-nowrap font-medium transition-colors ${
                    filtroPilar === tab.id
                      ? 'bg-red-600 text-white shadow-sm'
                      : 'bg-zinc-950 border border-zinc-800 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Alerta de Error */}
        {errorAlerta && (
          <div className="p-3 bg-red-950/70 border border-red-800 rounded-xl flex items-center gap-2.5 text-xs text-red-300">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{errorAlerta}</span>
          </div>
        )}

        {/* Grilla de Productos Físicos en Catálogo */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[600px] overflow-y-auto pr-1">
          {productosFiltrados.length === 0 ? (
            <div className="col-span-full p-12 text-center text-xs text-zinc-500 bg-zinc-900 border border-zinc-800 rounded-xl">
              No se encontraron repuestos o productos con el filtro aplicado.
            </div>
          ) : (
            productosFiltrados.map((prod) => {
              const agotado = prod.stock <= 0;
              const bajo = prod.stock <= prod.stockMinimo && !agotado;
              const enCarrito = items.find((it) => it.productoId === prod.id && !it.esServicio)?.cantidad || 0;

              return (
                <div
                  key={prod.id}
                  onClick={() => !agotado && agregarProductoAlCarrito(prod)}
                  className={`p-3 bg-zinc-900 border rounded-xl flex flex-col justify-between transition-all select-none ${
                    agotado
                      ? 'opacity-40 border-zinc-800/80 cursor-not-allowed'
                      : 'border-zinc-800 hover:border-red-500 hover:bg-zinc-800/60 cursor-pointer'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-1 mb-1">
                      <span className="text-[10px] font-mono text-zinc-400 bg-zinc-950 px-1.5 py-0.5 rounded border border-zinc-800">
                        {prod.codigo}
                      </span>
                      {prod.tipoRepuesto === 'original' ? (
                        <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-800/70 px-1.5 py-0.5 rounded flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3" />
                          ORIGINAL
                        </span>
                      ) : prod.tipoRepuesto === 'generico' ? (
                        <span className="text-[10px] font-medium text-blue-300 bg-blue-950/80 border border-blue-800/70 px-1.5 py-0.5 rounded flex items-center gap-1">
                          <Cog className="w-3 h-3" />
                          GENÉRICO
                        </span>
                      ) : (
                        <span className="text-[10px] text-zinc-400 bg-zinc-950 px-1.5 py-0.5 rounded border border-zinc-800">
                          {prod.categoria.split(' ')[0]}
                        </span>
                      )}
                    </div>

                    <h3 className="text-xs font-semibold text-zinc-100 line-clamp-2 leading-snug">
                      {prod.nombre}
                    </h3>
                    <p className="text-[11px] text-zinc-400 mt-0.5">{prod.marca || 'Genérica'}</p>
                  </div>

                  <div className="mt-3 pt-2 border-t border-zinc-800/60 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-red-400 font-mono">
                        {formatMoney(prod.precioVenta)}
                      </div>
                      <div className="text-[10px] text-zinc-400">
                        Stock: <span className={agotado ? 'text-red-400 font-bold' : bajo ? 'text-amber-400' : 'text-zinc-300'}>{prod.stock}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      {enCarrito > 0 && (
                        <span className="text-[10px] font-bold bg-red-600 text-white px-1.5 py-0.5 rounded-full">
                          {enCarrito}
                        </span>
                      )}
                      <button
                        type="button"
                        disabled={agotado}
                        className="w-6 h-6 rounded bg-zinc-800 text-zinc-200 flex items-center justify-center hover:bg-red-600 hover:text-white transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Columna Derecha: Factura Actual / Detalle de Cobro */}
      <div className="w-full xl:w-5/12 space-y-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 shadow-xl space-y-4">
          {/* Header de la Factura */}
          <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
            <div>
              <div className="flex items-center gap-2">
                <Receipt className="w-4 h-4 text-red-500" />
                <span className="text-xs font-bold text-zinc-100 uppercase tracking-wider">
                  Detalle de Factura
                </span>
                <span className="text-xs font-mono font-bold text-red-400">
                  {numeroFacturaSugerido}
                </span>
              </div>
              <p className="text-[11px] text-zinc-400">MOTOMOTO S&E · Taller y Venta de Repuestos</p>
            </div>

            <select
              value={tipoComprobante}
              onChange={(e) => setTipoComprobante(e.target.value as TipoComprobante)}
              className="bg-zinc-950 border border-zinc-800 text-xs text-zinc-300 rounded-lg px-2.5 py-1 focus:outline-none focus:border-red-500"
            >
              <option value="factura">Factura</option>
              <option value="ticket">Ticket POS</option>
              <option value="orden_servicio">Orden Taller</option>
            </select>
          </div>

          {/* Selector de Cliente */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <label className="font-medium text-zinc-300 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-red-400" />
                <span>Cliente:</span>
              </label>
              <button
                type="button"
                onClick={() => setModalClienteRapidoOpen(true)}
                className="text-[11px] text-red-400 hover:text-red-300 flex items-center gap-1"
              >
                <UserPlus className="w-3 h-3" />
                <span>+ Nuevo Cliente</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <select
                value={clienteId}
                onChange={(e) => handleCambiarCliente(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 text-xs text-zinc-200 rounded-lg px-3 py-2 focus:outline-none focus:border-red-500"
              >
                <option value="cliente_general">Consumidor Final / Mostrador</option>
                {clientes
                  .filter((c) => c.activo)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre} {c.telefono ? `(${c.telefono})` : ''}
                    </option>
                  ))}
              </select>

              <input
                type="text"
                placeholder="Nombre para la factura"
                value={clienteNombre}
                onChange={(e) => setClienteNombre(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 text-xs text-zinc-200 rounded-lg px-3 py-2 focus:outline-none focus:border-red-500"
              />
            </div>
          </div>

          {/* Datos del Vehículo / Moto (Opcional o si tiene servicio de taller) */}
          <div className="border border-zinc-800/80 bg-zinc-950/60 rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bike className="w-4 h-4 text-zinc-400" />
                <span className="text-xs font-semibold text-zinc-200">Datos de la Moto (Taller)</span>
              </div>
              <label className="text-[11px] text-zinc-400 flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={incluyeServicioMoto}
                  onChange={(e) => setIncluyeServicioMoto(e.target.checked)}
                  className="rounded bg-zinc-900 border-zinc-700 text-red-600 focus:ring-0"
                />
                <span>Incluir moto en factura</span>
              </label>
            </div>

            {incluyeServicioMoto && (
              <div className="grid grid-cols-3 gap-2 pt-1 text-xs">
                <div>
                  <label className="text-[10px] text-zinc-400 block mb-0.5">Placa</label>
                  <input
                    type="text"
                    placeholder="Ej: ABC-12D"
                    value={placaMoto}
                    onChange={(e) => setPlacaMoto(e.target.value.toUpperCase())}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-zinc-100 font-mono font-bold focus:outline-none focus:border-red-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-zinc-400 block mb-0.5">Marca / Modelo</label>
                  <input
                    type="text"
                    placeholder="Pulsar NS200"
                    value={modeloMoto}
                    onChange={(e) => setModeloMoto(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-zinc-100 focus:outline-none focus:border-red-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-zinc-400 block mb-0.5">Mecánico</label>
                  <input
                    type="text"
                    placeholder="Responsable"
                    value={mecanicoResponsable}
                    onChange={(e) => setMecanicoResponsable(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-zinc-100 focus:outline-none focus:border-red-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Tabla de Artículos y Servicios en Factura */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-zinc-400 px-1">
              <span>Conceptos facturados ({items.length})</span>
              {items.length > 0 && (
                <button
                  type="button"
                  onClick={() => setItems([])}
                  className="text-[11px] text-red-400 hover:text-red-300"
                >
                  Vaciar carrito
                </button>
              )}
            </div>

            <div className="max-h-60 overflow-y-auto space-y-2 pr-1 divide-y divide-zinc-800/60">
              {items.length === 0 ? (
                <div className="p-8 text-center bg-zinc-950 rounded-xl border border-dashed border-zinc-800 text-xs text-zinc-500">
                  <ShoppingCart className="w-6 h-6 mx-auto mb-2 text-zinc-600" />
                  Factura vacía. Agrega servicios o repuestos para comenzar.
                </div>
              ) : (
                items.map((it, idx) => (
                  <div key={idx} className="pt-2 first:pt-0 space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {/* Badge de Pilar */}
                          {it.tipoItem === 'servicio_electrico' ? (
                            <span className="text-[9px] font-bold text-amber-400 bg-amber-950/80 border border-amber-800/80 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                              <Zap className="w-2.5 h-2.5 fill-amber-400" />
                              ELECTRICIDAD
                            </span>
                          ) : it.tipoItem === 'servicio_mecanico' ? (
                            <span className="text-[9px] font-bold text-orange-400 bg-orange-950/80 border border-orange-800/80 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                              <Wrench className="w-2.5 h-2.5" />
                              TALLER MECÁNICO
                            </span>
                          ) : it.tipoItem === 'repuesto_original' ? (
                            <span className="text-[9px] font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-800/80 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                              <ShieldCheck className="w-2.5 h-2.5" />
                              ORIGINAL OEM
                            </span>
                          ) : it.tipoItem === 'repuesto_generico' ? (
                            <span className="text-[9px] font-medium text-blue-300 bg-blue-950/80 border border-blue-800/80 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                              <Cog className="w-2.5 h-2.5" />
                              GENÉRICO
                            </span>
                          ) : (
                            <span className="text-[9px] text-zinc-400 bg-zinc-950 px-1.5 py-0.5 rounded border border-zinc-800">
                              {it.tipoItem}
                            </span>
                          )}

                          <span className="text-xs font-semibold text-zinc-100">{it.nombre}</span>
                        </div>

                        {it.garantia && (
                          <div className="text-[10px] text-zinc-400 flex items-center gap-1 mt-0.5">
                            <Info className="w-2.5 h-2.5 text-zinc-500" />
                            <span>{it.garantia}</span>
                          </div>
                        )}
                      </div>

                      <div className="text-right">
                        <div className="text-xs font-mono font-bold text-zinc-100">
                          {formatMoney(it.subtotal)}
                        </div>
                        <div className="text-[10px] text-zinc-500 font-mono">
                          {formatMoney(it.precioUnitario)} c/u
                        </div>
                      </div>
                    </div>

                    {/* Controles de Cantidad y Precio */}
                    <div className="flex items-center justify-between text-xs pt-1">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => modificarCantidad(idx, -1)}
                          className="w-5 h-5 rounded bg-zinc-800 text-zinc-300 hover:bg-zinc-700 flex items-center justify-center text-xs"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-7 text-center font-mono font-bold text-zinc-200">
                          {it.cantidad}
                        </span>
                        <button
                          type="button"
                          onClick={() => modificarCantidad(idx, 1)}
                          className="w-5 h-5 rounded bg-zinc-800 text-zinc-300 hover:bg-zinc-700 flex items-center justify-center text-xs"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 text-[11px] text-zinc-400">
                          <span>$</span>
                          <input
                            type="number"
                            min="0"
                            step="100"
                            value={it.precioUnitario}
                            onChange={(e) => modificarPrecio(idx, parseFloat(e.target.value) || 0)}
                            className="w-20 bg-zinc-950 border border-zinc-800 rounded px-1.5 py-0.5 text-zinc-200 font-mono text-right focus:outline-none focus:border-red-500"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => eliminarItem(idx)}
                          className="p-1 text-zinc-500 hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Subtotales Desglosados por los 4 Pilares de MOTOMOTO S&E */}
          {items.length > 0 && (
            <div className="p-3 bg-zinc-950/80 rounded-xl border border-zinc-800 space-y-1.5 text-xs">
              <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider pb-1 border-b border-zinc-800 flex justify-between">
                <span>Desglose por Línea MOTOMOTO S&E</span>
                <span>Subtotal</span>
              </div>

              {subtotalElectricidad > 0 && (
                <div className="flex justify-between text-amber-400">
                  <span className="flex items-center gap-1">
                    <Zap className="w-3 h-3 fill-amber-400" />
                    Electricidad de Motos:
                  </span>
                  <span className="font-mono font-semibold">{formatMoney(subtotalElectricidad)}</span>
                </div>
              )}

              {subtotalTallerMecanico > 0 && (
                <div className="flex justify-between text-orange-400">
                  <span className="flex items-center gap-1">
                    <Wrench className="w-3 h-3" />
                    Taller Mecánico:
                  </span>
                  <span className="font-mono font-semibold">{formatMoney(subtotalTallerMecanico)}</span>
                </div>
              )}

              {subtotalRepuestosOriginales > 0 && (
                <div className="flex justify-between text-emerald-400">
                  <span className="flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" />
                    Repuestos Originales OEM:
                  </span>
                  <span className="font-mono font-semibold">{formatMoney(subtotalRepuestosOriginales)}</span>
                </div>
              )}

              {subtotalRepuestosGenericos > 0 && (
                <div className="flex justify-between text-blue-300">
                  <span className="flex items-center gap-1">
                    <Cog className="w-3 h-3" />
                    Repuestos Genéricos:
                  </span>
                  <span className="font-mono font-semibold">{formatMoney(subtotalRepuestosGenericos)}</span>
                </div>
              )}

              {subtotalOtrosProductos > 0 && (
                <div className="flex justify-between text-zinc-400">
                  <span>Herramientas y Lubricantes:</span>
                  <span className="font-mono font-semibold">{formatMoney(subtotalOtrosProductos)}</span>
                </div>
              )}

              {/* Descuentos y cargos */}
              <div className="pt-2 border-t border-zinc-800 grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-zinc-400 block">Descuento ($)</label>
                  <input
                    type="number"
                    min="0"
                    value={descuento}
                    onChange={(e) => setDescuento(parseFloat(e.target.value) || 0)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-xs text-emerald-400 font-mono font-bold text-right focus:outline-none focus:border-red-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-zinc-400 block">Otros Cargos ($)</label>
                  <input
                    type="number"
                    min="0"
                    value={otrosCargos}
                    onChange={(e) => setOtrosCargos(parseFloat(e.target.value) || 0)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-xs text-zinc-200 font-mono text-right focus:outline-none focus:border-red-500"
                  />
                </div>
              </div>

              {/* Gran Total */}
              <div className="pt-2 border-t border-zinc-700 flex justify-between items-center text-sm font-bold text-zinc-100">
                <span className="text-zinc-200">TOTAL FACTURA:</span>
                <span className="text-base text-red-500 font-mono font-extrabold">
                  {formatMoney(totalCalculado)}
                </span>
              </div>
            </div>
          )}

          {/* Métodos de Pago y Cobro */}
          <div className="space-y-3 pt-2 border-t border-zinc-800">
            <div className="grid grid-cols-4 gap-1.5 text-xs">
              {(['efectivo', 'transferencia', 'tarjeta', 'credito'] as MetodoPago[]).map((met) => (
                <button
                  key={met}
                  type="button"
                  onClick={() => setMetodoPago(met)}
                  className={`py-2 rounded-lg font-medium capitalize text-center transition-colors ${
                    metodoPago === met
                      ? 'bg-red-600 text-white font-bold shadow-sm'
                      : 'bg-zinc-950 border border-zinc-800 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {met}
                </button>
              ))}
            </div>

            {metodoPago === 'efectivo' && (
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="text-[10px] text-zinc-400 block mb-0.5">Efectivo Recibido</label>
                  <input
                    type="number"
                    min="0"
                    value={montoRecibido}
                    onChange={(e) => setMontoRecibido(parseFloat(e.target.value) || 0)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-zinc-100 font-mono font-bold focus:outline-none focus:border-red-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-zinc-400 block mb-0.5">Cambio / Vueltos</label>
                  <div className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-emerald-400 font-mono font-bold">
                    {formatMoney(cambioDevuelto)}
                  </div>
                </div>
              </div>
            )}

            {metodoPago === 'credito' && (
              <div className="p-2.5 bg-amber-950/40 border border-amber-800/60 rounded-lg text-xs text-amber-200">
                <div className="flex justify-between font-bold">
                  <span>Saldo a Crédito:</span>
                  <span className="font-mono">{formatMoney(saldoPendiente)}</span>
                </div>
                <p className="text-[10px] text-amber-300/80 mt-1">
                  Se creará una cuenta por cobrar asociada al cliente {clienteNombre}.
                </p>
              </div>
            )}

            <button
              type="button"
              disabled={guardando || items.length === 0}
              onClick={handleCobrarFactura}
              className="w-full py-3 bg-red-600 hover:bg-red-500 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-red-900/30 flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <DollarSign className="w-4 h-4" />
              <span>
                {guardando
                  ? 'Guardando Factura...'
                  : esNueva
                  ? `Emitir y Cobrar ${formatMoney(totalCalculado)}`
                  : `Guardar Cambios Factura`}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Modal: Agregar Servicio Eléctrico Rápido */}
      <Modal
        isOpen={modalServicioElecOpen}
        onClose={() => setModalServicioElecOpen(false)}
        title="⚡ Agregar Servicio de Electricidad de Motos"
        subtitle="Mano de obra especializada en sistema eléctrico, carga, encendido e iluminación"
        maxWidth="md"
      >
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
              Servicios Eléctricos Frecuentes (Clic para auto-completar)
            </label>
            <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-1 bg-zinc-950 rounded-lg border border-zinc-800">
              {SERVICIOS_ELECTRICOS_FRECUENTES.map((srv, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setServElecNombre(srv.nombre);
                    setServElecPrecio(srv.precio);
                  }}
                  className="text-[11px] text-zinc-300 bg-zinc-900 hover:bg-amber-950 hover:text-amber-200 border border-zinc-800 px-2 py-1 rounded text-left transition-colors"
                >
                  ⚡ {srv.nombre} ({formatMoney(srv.precio)})
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1">
              Descripción del Trabajo Eléctrico <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="Ej: Rebobinado de corona, cambio de estator, reparación de ramal..."
              value={servElecNombre}
              onChange={(e) => setServElecNombre(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-red-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">
                Precio Mano de Obra ($)
              </label>
              <input
                type="number"
                min="0"
                step="500"
                value={servElecPrecio}
                onChange={(e) => setServElecPrecio(parseFloat(e.target.value) || 0)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs font-mono font-bold text-amber-400 focus:outline-none focus:border-red-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">
                Términos de Garantía
              </label>
              <input
                type="text"
                value={servElecGarantia}
                onChange={(e) => setServElecGarantia(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-red-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1">
              Notas Técnicas / Diagnóstico Inicial
            </label>
            <textarea
              rows={2}
              value={servElecNota}
              onChange={(e) => setServElecNota(e.target.value)}
              placeholder="Voltaje medido, componentes inspeccionados..."
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-red-500 resize-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-zinc-800">
            <button
              type="button"
              onClick={() => setModalServicioElecOpen(false)}
              className="px-4 py-2 text-xs font-medium text-zinc-300 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleAgregarServicioElectrico}
              className="px-4 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-500 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <Zap className="w-3.5 h-3.5 fill-white" />
              <span>Agregar Servicio Eléctrico</span>
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal: Agregar Servicio Mecánico Rápido */}
      <Modal
        isOpen={modalServicioMecOpen}
        onClose={() => setModalServicioMecOpen(false)}
        title="🔧 Agregar Servicio de Taller Mecánico"
        subtitle="Mano de obra en motor, frenos, transmisión, suspensión y mantenimiento"
        maxWidth="md"
      >
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
              Servicios Mecánicos Frecuentes (Clic para auto-completar)
            </label>
            <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-1 bg-zinc-950 rounded-lg border border-zinc-800">
              {SERVICIOS_MECANICOS_FRECUENTES.map((srv, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setServMecNombre(srv.nombre);
                    setServMecPrecio(srv.precio);
                  }}
                  className="text-[11px] text-zinc-300 bg-zinc-900 hover:bg-orange-950 hover:text-orange-200 border border-zinc-800 px-2 py-1 rounded text-left transition-colors"
                >
                  🔧 {srv.nombre} ({formatMoney(srv.precio)})
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1">
              Descripción del Trabajo Mecánico <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="Ej: Mantenimiento general, cambio kit de arrastre, calibración válvulas..."
              value={servMecNombre}
              onChange={(e) => setServMecNombre(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-red-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">
                Precio Mano de Obra ($)
              </label>
              <input
                type="number"
                min="0"
                step="500"
                value={servMecPrecio}
                onChange={(e) => setServMecPrecio(parseFloat(e.target.value) || 0)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs font-mono font-bold text-orange-400 focus:outline-none focus:border-red-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">
                Términos de Garantía
              </label>
              <input
                type="text"
                value={servMecGarantia}
                onChange={(e) => setServMecGarantia(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-red-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1">
              Notas Técnicas / Procedimiento Realizado
            </label>
            <textarea
              rows={2}
              value={servMecNota}
              onChange={(e) => setServMecNota(e.target.value)}
              placeholder="Torque aplicado, holguras revisadas, estado de componentes..."
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-red-500 resize-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-zinc-800">
            <button
              type="button"
              onClick={() => setModalServicioMecOpen(false)}
              className="px-4 py-2 text-xs font-medium text-zinc-300 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleAgregarServicioMecanico}
              className="px-4 py-2 text-xs font-semibold text-white bg-orange-600 hover:bg-orange-500 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <Wrench className="w-3.5 h-3.5" />
              <span>Agregar Servicio Mecánico</span>
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal: Registro Rápido de Cliente */}
      <Modal
        isOpen={modalClienteRapidoOpen}
        onClose={() => setModalClienteRapidoOpen(false)}
        title="Registro Rápido de Cliente"
        subtitle="Agrega los datos básicos para asociar la factura y moto"
        maxWidth="sm"
      >
        <form onSubmit={handleCrearClienteRapido} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1">
              Nombre Completo <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="Ej: Carlos Gómez"
              value={nuevoNombre}
              onChange={(e) => setNuevoNombre(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-red-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1">
              Teléfono / WhatsApp <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              required
              placeholder="Ej: 300 123 4567"
              value={nuevoTelefono}
              onChange={(e) => setNuevoTelefono(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-red-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1">
              Cédula / NIT / Documento (Opcional)
            </label>
            <input
              type="text"
              placeholder="Ej: 1020304050"
              value={nuevoDoc}
              onChange={(e) => setNuevoDoc(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-red-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
            <button
              type="button"
              onClick={() => setModalClienteRapidoOpen(false)}
              className="px-4 py-2 text-xs font-medium text-zinc-300 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-500 rounded-lg transition-colors"
            >
              Guardar y Seleccionar
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
