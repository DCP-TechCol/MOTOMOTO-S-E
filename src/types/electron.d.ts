import {
  Cliente,
  Producto,
  Venta,
  MovimientoInventario,
  ConfiguracionTaller,
  PagoVenta,
  TipoMovimiento,
} from './index';

export interface ElectronDBData {
  clientes: Cliente[];
  productos: Producto[];
  ventas: Venta[];
  movimientos: MovimientoInventario[];
  configuracion: ConfiguracionTaller;
}

export interface ElectronDBAPI {
  getAll: () => Promise<ElectronDBData>;
  saveCliente: (cliente: Partial<Cliente> & { nombre: string; telefono: string }) => Promise<Cliente>;
  toggleClienteActivo: (id: string) => Promise<boolean>;
  deleteCliente: (id: string) => Promise<boolean>;
  saveProducto: (producto: Partial<Producto> & { codigo: string; nombre: string; precioVenta: number }) => Promise<Producto>;
  toggleProductoActivo: (id: string) => Promise<boolean>;
  deleteProducto: (id: string) => Promise<boolean>;
  ajustarStock: (params: { productoId: string; tipo: TipoMovimiento; cantidad: number; motivo: string }) => Promise<Producto>;
  saveVenta: (params: { venta: Partial<Venta>; esNueva?: boolean }) => Promise<Venta>;
  anularVenta: (params: { id: string; revertirStock?: boolean }) => Promise<Venta>;
  registrarPagoVenta: (params: { ventaId: string; pagoData: Omit<PagoVenta, 'id'> }) => Promise<Venta>;
  saveConfiguracion: (config: ConfiguracionTaller) => Promise<ConfiguracionTaller>;
  importarBaseDatosJSON: (jsonStr: string) => Promise<{ clientes: number; productos: number; ventas: number }>;
  exportarBaseDatosJSON: () => Promise<string>;
  cargarDatosDemo: () => Promise<{ clientes: number; productos: number; ventas: number }>;
  limpiarBaseDatos: () => Promise<void>;
  migrateFromIndexedDB: (data: Partial<ElectronDBData>) => Promise<{ migrated: boolean; counts: Record<string, number> }>;
}

export interface ElectronSystemAPI {
  openUserDataFolder: () => Promise<string>;
  minimizeWindow: () => void;
  maximizeWindow: () => void;
  closeWindow: () => void;
}

export interface ElectronAPI {
  isElectron: boolean;
  platform: string;
  appVersion: string;
  db: ElectronDBAPI;
  system: ElectronSystemAPI;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
