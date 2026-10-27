export type EstadoVenta = 'completada' | 'pendiente_pago' | 'anulada';
export type TipoVenta = 'venta_directa' | 'servicio_taller' | 'mixta';
export type TipoComprobante = 'factura' | 'ticket' | 'orden_servicio';

export type MetodoPago = 'efectivo' | 'transferencia' | 'tarjeta' | 'credito' | 'mixto';

export type TipoItemVenta =
  | 'repuesto_original'
  | 'repuesto_generico'
  | 'servicio_electrico'
  | 'servicio_mecanico'
  | 'herramienta'
  | 'lubricante'
  | 'otro';

export type CategoriaProducto =
  | 'Repuestos Originales'
  | 'Repuestos Genéricos'
  | 'Repuestos de motor'
  | 'Herramientas de taller'
  | 'Herramientas manuales'
  | 'Lubricantes y químicos'
  | 'Frenos y suspensión'
  | 'Sistema eléctrico'
  | 'Accesorios y lujos'
  | 'Consumibles'
  | 'Otros';

export type TipoMovimiento = 'entrada' | 'salida' | 'ajuste' | 'venta' | 'servicio';

export interface Cliente {
  id: string;
  nombre: string;
  documento?: string;
  telefono: string;
  email?: string;
  direccion?: string;
  observaciones?: string;
  activo: boolean;
  fechaRegistro: string;
}

export interface Producto {
  id: string;
  codigo: string; // SKU o Código de barras
  nombre: string;
  categoria: CategoriaProducto;
  tipoRepuesto: 'original' | 'generico' | 'no_aplica'; // Distinción explícita
  marca: string;
  descripcion?: string;
  garantiaMeses?: number;
  stock: number;
  stockMinimo: number;
  costoUnitario: number;
  precioVenta: number;
  proveedor?: string; // Proveedor / Distribuidor
  proveedorContacto?: string; // Teléfono o contacto del proveedor (opcional)
  activo: boolean;
  fechaRegistro: string;
}

export interface ItemVenta {
  productoId: string; // Si es servicio directo, id virtual 'srv-elec-...' o 'srv-mec-...'
  codigo: string;
  nombre: string;
  tipoItem: TipoItemVenta;
  esServicio: boolean; // True si es mano de obra (no descuenta stock físico)
  cantidad: number;
  precioUnitario: number;
  costoUnitario?: number;
  subtotal: number;
  garantia?: string;
  nota?: string;
}

export interface PagoVenta {
  id: string;
  fecha: string;
  monto: number;
  metodo: MetodoPago;
  nota?: string;
}

export interface HistorialEntrada {
  fecha: string;
  descripcion: string;
}

export interface Venta {
  id: string;
  numeroFactura: string; // Ej: FAC-0001
  fecha: string; // ISO string
  tipoVenta: TipoVenta;
  tipoComprobante: TipoComprobante;
  clienteId: string;
  clienteNombre: string;
  clienteDocumento?: string;
  clienteTelefono?: string;
  clienteDireccion?: string;

  // Datos específicos de la moto
  incluyeServicioMoto: boolean;
  marcaMoto?: string;
  modeloMoto?: string;
  placaMoto?: string;
  kilometraje?: string;
  fallaReportada?: string;
  mecanicoResponsable?: string;

  // Items detallados
  items: ItemVenta[];

  // Subtotales detallados por línea de negocio MOTOMOTO S&E
  subtotalElectricidad: number;
  subtotalTallerMecanico: number;
  subtotalRepuestosOriginales: number;
  subtotalRepuestosGenericos: number;
  subtotalOtrosProductos: number;

  subtotalServicios: number; // Electricidad + Mecánica
  subtotalProductos: number; // Originales + Genéricos + Otros
  manoDeObra: number; // Por compatibilidad

  descuento: number;
  otrosCargos: number;
  total: number;

  // Cobro y pagos
  metodoPagoPrincipal: MetodoPago;
  montoRecibido: number;
  cambioDevuelto: number;
  montoPagado: number;
  saldoPendiente: number;
  pagos: PagoVenta[];

  // Estado y notas
  estado: EstadoVenta;
  observaciones?: string;
  fechaActualizacion: string;
  historialCambios?: HistorialEntrada[];

  // Compatibilidad
  descripcionServicio?: string;
}

// Mantener compatibilidad de tipos
export type Servicio = Venta;
export type ItemServicio = ItemVenta;
export type PagoServicio = PagoVenta;
export type EstadoServicio = 'pendiente' | 'en_proceso' | 'finalizado' | 'cancelado';

export interface MovimientoInventario {
  id: string;
  fecha: string;
  productoId: string;
  productoCodigo: string;
  productoNombre: string;
  tipo: TipoMovimiento;
  cantidad: number;
  motivo: string;
  referenciaId?: string;
  stockAnterior: number;
  stockNuevo: number;
}

export interface ConfiguracionTaller {
  clave: string;
  nombreTaller: string;
  nit: string;
  telefono: string;
  direccion: string;
  ciudad: string;
  email: string;
  piePaginaRecibo: string;
  prefijoFactura: string;
  siguienteNumeroFactura: number;
  prefijoServicio?: string;
  siguienteNumero?: number;
}

export type SeccionApp =
  | 'dashboard'
  | 'pos_ventas'
  | 'historial_ventas'
  | 'clientes'
  | 'productos'
  | 'inventario'
  | 'reportes'
  | 'configuracion';
