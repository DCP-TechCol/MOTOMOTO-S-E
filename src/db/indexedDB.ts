import {
  Cliente,
  Producto,
  Venta,
  ItemVenta,
  PagoVenta,
  EstadoVenta,
  MovimientoInventario,
  ConfiguracionTaller,
  TipoMovimiento,
} from '../types';
import { generateUUID, formatServiceNumber } from '../utils/formatters';

const DB_NAME = 'MotoTallerDB';
const DB_VERSION = 2;

const DEFAULT_CONFIG: ConfiguracionTaller = {
  clave: 'taller_principal',
  nombreTaller: 'MOTOMOTO S&E',
  nit: '901.458.789-1',
  telefono: '+57 312 456 7890',
  direccion: 'Av. Principal # 45-22, Zona Motos',
  ciudad: 'Medellín',
  email: 'contacto@motomoto.local',
  piePaginaRecibo: 'Especialistas en Electricidad de Motos, Taller Mecánico, Repuestos Originales y Genéricos. Garantía en mano de obra y repuestos.',
  prefijoFactura: 'FAC',
  siguienteNumeroFactura: 1,
  prefijoServicio: 'FAC',
  siguienteNumero: 1,
};

let dbInstance: IDBDatabase | null = null;

export function openDatabase(): Promise<IDBDatabase> {
  if (dbInstance) {
    return Promise.resolve(dbInstance);
  }

  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB no está soportado en este entorno.'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Store: Clientes
      if (!db.objectStoreNames.contains('clientes')) {
        const clientesStore = db.createObjectStore('clientes', { keyPath: 'id' });
        clientesStore.createIndex('nombre', 'nombre', { unique: false });
        clientesStore.createIndex('documento', 'documento', { unique: false });
        clientesStore.createIndex('telefono', 'telefono', { unique: false });
        clientesStore.createIndex('activo', 'activo', { unique: false });
      }

      // Store: Productos
      if (!db.objectStoreNames.contains('productos')) {
        const productosStore = db.createObjectStore('productos', { keyPath: 'id' });
        productosStore.createIndex('codigo', 'codigo', { unique: false });
        productosStore.createIndex('nombre', 'nombre', { unique: false });
        productosStore.createIndex('categoria', 'categoria', { unique: false });
        productosStore.createIndex('tipoRepuesto', 'tipoRepuesto', { unique: false });
        productosStore.createIndex('marca', 'marca', { unique: false });
        productosStore.createIndex('activo', 'activo', { unique: false });
      }

      // Store: Ventas y Facturas
      if (!db.objectStoreNames.contains('ventas')) {
        const ventasStore = db.createObjectStore('ventas', { keyPath: 'id' });
        ventasStore.createIndex('numeroFactura', 'numeroFactura', { unique: true });
        ventasStore.createIndex('clienteId', 'clienteId', { unique: false });
        ventasStore.createIndex('estado', 'estado', { unique: false });
        ventasStore.createIndex('fecha', 'fecha', { unique: false });
        ventasStore.createIndex('tipoVenta', 'tipoVenta', { unique: false });
      }

      // Compatibilidad con store 'servicios' previo
      if (!db.objectStoreNames.contains('servicios')) {
        const serviciosStore = db.createObjectStore('servicios', { keyPath: 'id' });
        serviciosStore.createIndex('numeroServicio', 'numeroServicio', { unique: false });
      }

      // Store: Movimientos de Inventario
      if (!db.objectStoreNames.contains('movimientos')) {
        const movimientosStore = db.createObjectStore('movimientos', { keyPath: 'id' });
        movimientosStore.createIndex('productoId', 'productoId', { unique: false });
        movimientosStore.createIndex('fecha', 'fecha', { unique: false });
        movimientosStore.createIndex('tipo', 'tipo', { unique: false });
      }

      // Store: Configuracion
      if (!db.objectStoreNames.contains('configuracion')) {
        db.createObjectStore('configuracion', { keyPath: 'clave' });
      }
    };

    request.onsuccess = (event) => {
      dbInstance = (event.target as IDBOpenDBRequest).result;
      ensureDefaultConfig(dbInstance).then(() => {
        resolve(dbInstance!);
      });
    };

    request.onerror = (event) => {
      reject((event.target as IDBOpenDBRequest).error);
    };
  });
}

function ensureDefaultConfig(db: IDBDatabase): Promise<void> {
  return new Promise((resolve) => {
    try {
      const tx = db.transaction('configuracion', 'readwrite');
      const store = tx.objectStore('configuracion');
      const getReq = store.get(DEFAULT_CONFIG.clave);

      getReq.onsuccess = () => {
        if (!getReq.result) {
          store.put(DEFAULT_CONFIG);
        } else {
          const cur = getReq.result as ConfiguracionTaller;
          let mod = false;
          if (cur.nombreTaller !== 'MOTOMOTO S&E') {
            cur.nombreTaller = 'MOTOMOTO S&E';
            mod = true;
          }
          if (!cur.prefijoFactura) {
            cur.prefijoFactura = 'FAC';
            mod = true;
          }
          if (!cur.siguienteNumeroFactura) {
            cur.siguienteNumeroFactura = cur.siguienteNumero || 1;
            mod = true;
          }
          if (mod) store.put(cur);
        }
        resolve();
      };
      getReq.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

// -------------------------------------------------------------
// CLIENTES CRUD
// -------------------------------------------------------------
export async function getClientes(): Promise<Cliente[]> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('clientes', 'readonly');
    const store = tx.objectStore('clientes');
    const req = store.getAll();
    req.onsuccess = () => {
      const list = (req.result || []) as Cliente[];
      list.sort((a, b) => new Date(b.fechaRegistro).getTime() - new Date(a.fechaRegistro).getTime());
      resolve(list);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function getClienteById(id: string): Promise<Cliente | null> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('clientes', 'readonly');
    const store = tx.objectStore('clientes');
    const req = store.get(id);
    req.onsuccess = () => resolve((req.result as Cliente) || null);
    req.onerror = () => reject(req.error);
  });
}

export async function saveCliente(cliente: Partial<Cliente> & { nombre: string; telefono: string }): Promise<Cliente> {
  const db = await openDatabase();
  const esNuevo = !cliente.id;
  const registroFinal: Cliente = {
    id: cliente.id || generateUUID(),
    nombre: cliente.nombre.trim(),
    documento: cliente.documento?.trim() || '',
    telefono: cliente.telefono.trim(),
    email: cliente.email?.trim() || '',
    direccion: cliente.direccion?.trim() || '',
    observaciones: cliente.observaciones?.trim() || '',
    activo: cliente.activo ?? true,
    fechaRegistro: cliente.fechaRegistro || new Date().toISOString(),
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction('clientes', 'readwrite');
    const store = tx.objectStore('clientes');
    const req = store.put(registroFinal);
    req.onsuccess = () => resolve(registroFinal);
    req.onerror = () => reject(new Error(esNuevo ? 'Error al crear el cliente.' : 'Error al actualizar el cliente.'));
  });
}

export async function toggleClienteActivo(id: string): Promise<boolean> {
  const db = await openDatabase();
  const cliente = await getClienteById(id);
  if (!cliente) throw new Error('Cliente no encontrado.');

  cliente.activo = !cliente.activo;
  return new Promise((resolve, reject) => {
    const tx = db.transaction('clientes', 'readwrite');
    const store = tx.objectStore('clientes');
    const req = store.put(cliente);
    req.onsuccess = () => resolve(cliente.activo);
    req.onerror = () => reject(req.error);
  });
}

// -------------------------------------------------------------
// PRODUCTOS CRUD (REPUESTOS ORIGINALES, GENÉRICOS, HERRAMIENTAS)
// -------------------------------------------------------------
export async function getProductos(): Promise<Producto[]> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('productos', 'readonly');
    const store = tx.objectStore('productos');
    const req = store.getAll();
    req.onsuccess = () => {
      const list = (req.result || []) as Producto[];
      list.sort((a, b) => a.nombre.localeCompare(b.nombre));
      resolve(list);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function getProductoById(id: string): Promise<Producto | null> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('productos', 'readonly');
    const store = tx.objectStore('productos');
    const req = store.get(id);
    req.onsuccess = () => resolve((req.result as Producto) || null);
    req.onerror = () => reject(req.error);
  });
}

export async function saveProducto(
  producto: Partial<Producto> & { codigo: string; nombre: string; precioVenta: number }
): Promise<Producto> {
  const db = await openDatabase();
  const esNuevo = !producto.id;
  const codigoLimpio = producto.codigo.trim().toUpperCase();

  const todos = await getProductos();
  const repetido = todos.find((p) => p.codigo.toUpperCase() === codigoLimpio && p.id !== producto.id);
  if (repetido) {
    throw new Error(`Ya existe un producto con el código SKU o de barras "${codigoLimpio}".`);
  }

  const stockInicial = Number(producto.stock) || 0;
  const tipoRepuesto = producto.tipoRepuesto || (
    producto.categoria === 'Repuestos Originales'
      ? 'original'
      : producto.categoria === 'Repuestos Genéricos'
      ? 'generico'
      : 'no_aplica'
  );

  const registroFinal: Producto = {
    id: producto.id || generateUUID(),
    codigo: codigoLimpio,
    nombre: producto.nombre.trim(),
    categoria: producto.categoria || 'Repuestos Originales',
    tipoRepuesto,
    marca: producto.marca?.trim() || 'Genérica',
    descripcion: producto.descripcion?.trim() || '',
    garantiaMeses: Number(producto.garantiaMeses) || (tipoRepuesto === 'original' ? 6 : 1),
    stock: stockInicial,
    stockMinimo: Number(producto.stockMinimo) || 2,
    costoUnitario: Number(producto.costoUnitario) || 0,
    precioVenta: Number(producto.precioVenta) || 0,
    proveedor: producto.proveedor?.trim() || '',
    proveedorContacto: producto.proveedorContacto?.trim() || '',
    activo: producto.activo ?? true,
    fechaRegistro: producto.fechaRegistro || new Date().toISOString(),
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction(['productos', 'movimientos'], 'readwrite');
    const prodStore = tx.objectStore('productos');
    const movStore = tx.objectStore('movimientos');

    const req = prodStore.put(registroFinal);
    req.onsuccess = () => {
      if (esNuevo && stockInicial > 0) {
        const mov: MovimientoInventario = {
          id: generateUUID(),
          fecha: new Date().toISOString(),
          productoId: registroFinal.id,
          productoCodigo: registroFinal.codigo,
          productoNombre: registroFinal.nombre,
          tipo: 'entrada',
          cantidad: stockInicial,
          motivo: 'Inventario inicial al registrar producto',
          stockAnterior: 0,
          stockNuevo: stockInicial,
        };
        movStore.put(mov);
      }
      resolve(registroFinal);
    };
    req.onerror = () => reject(new Error('Error al guardar el producto.'));
  });
}

export async function toggleProductoActivo(id: string): Promise<boolean> {
  const db = await openDatabase();
  const prod = await getProductoById(id);
  if (!prod) throw new Error('Producto no encontrado.');

  prod.activo = !prod.activo;
  return new Promise((resolve, reject) => {
    const tx = db.transaction('productos', 'readwrite');
    const store = tx.objectStore('productos');
    const req = store.put(prod);
    req.onsuccess = () => resolve(prod.activo);
    req.onerror = () => reject(req.error);
  });
}

export async function ajustarStock(
  productoId: string,
  tipo: TipoMovimiento,
  cantidad: number,
  motivo: string,
  referenciaId?: string
): Promise<Producto> {
  if (cantidad <= 0 && tipo !== 'ajuste') {
    throw new Error('La cantidad debe ser mayor a 0.');
  }

  const db = await openDatabase();
  const prod = await getProductoById(productoId);
  if (!prod) throw new Error('Producto no encontrado.');

  const stockAnterior = prod.stock;
  let stockNuevo = stockAnterior;

  if (tipo === 'entrada') {
    stockNuevo = stockAnterior + cantidad;
  } else if (tipo === 'salida' || tipo === 'venta') {
    if (stockAnterior < cantidad) {
      throw new Error(`Stock insuficiente para "${prod.nombre}". Disponible: ${stockAnterior}, requerido: ${cantidad}`);
    }
    stockNuevo = stockAnterior - cantidad;
  } else if (tipo === 'ajuste') {
    stockNuevo = cantidad;
  }

  prod.stock = stockNuevo;

  const movimiento: MovimientoInventario = {
    id: generateUUID(),
    fecha: new Date().toISOString(),
    productoId: prod.id,
    productoCodigo: prod.codigo,
    productoNombre: prod.nombre,
    tipo,
    cantidad: tipo === 'ajuste' ? Math.abs(stockNuevo - stockAnterior) : cantidad,
    motivo: motivo.trim() || 'Ajuste manual de existencias',
    referenciaId,
    stockAnterior,
    stockNuevo,
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction(['productos', 'movimientos'], 'readwrite');
    const prodStore = tx.objectStore('productos');
    const movStore = tx.objectStore('movimientos');

    prodStore.put(prod);
    movStore.put(movimiento);

    tx.oncomplete = () => resolve(prod);
    tx.onerror = () => reject(tx.error);
  });
}

// -------------------------------------------------------------
// VENTAS Y FACTURACIÓN CON SERVICIOS Y REPUESTOS DETALLADOS
// -------------------------------------------------------------
export async function getVentas(): Promise<Venta[]> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('ventas', 'readonly');
    const store = tx.objectStore('ventas');
    const req = store.getAll();
    req.onsuccess = () => {
      const list = (req.result || []) as Venta[];
      list.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
      resolve(list);
    };
    req.onerror = () => reject(req.error);
  });
}

export const getServicios = getVentas;

export async function getVentaById(id: string): Promise<Venta | null> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('ventas', 'readonly');
    const store = tx.objectStore('ventas');
    const req = store.get(id);
    req.onsuccess = () => resolve((req.result as Venta) || null);
    req.onerror = () => reject(req.error);
  });
}

export const getServicioById = getVentaById;

export async function saveVenta(ventaData: Partial<Venta>, esNueva: boolean = true): Promise<Venta> {
  const db = await openDatabase();
  const config = await getConfiguracion();

  let numeroFactura = ventaData.numeroFactura;
  if (esNueva || !numeroFactura) {
    const prefijo = config.prefijoFactura || 'FAC';
    const seq = config.siguienteNumeroFactura || 1;
    numeroFactura = formatServiceNumber(prefijo, seq);
  }

  const ventaId = ventaData.id || generateUUID();
  const fechaActual = new Date().toISOString();

  // Mapear ítems y clasificar subtotales
  let subtotalElectricidad = 0;
  let subtotalTallerMecanico = 0;
  let subtotalRepuestosOriginales = 0;
  let subtotalRepuestosGenericos = 0;
  let subtotalOtrosProductos = 0;

  const items: ItemVenta[] = (ventaData.items || []).map((item) => {
    const cant = Number(item.cantidad) || 1;
    const pu = Number(item.precioUnitario) || 0;
    const lineSubtotal = cant * pu;

    if (item.tipoItem === 'servicio_electrico') {
      subtotalElectricidad += lineSubtotal;
    } else if (item.tipoItem === 'servicio_mecanico') {
      subtotalTallerMecanico += lineSubtotal;
    } else if (item.tipoItem === 'repuesto_original') {
      subtotalRepuestosOriginales += lineSubtotal;
    } else if (item.tipoItem === 'repuesto_generico') {
      subtotalRepuestosGenericos += lineSubtotal;
    } else {
      subtotalOtrosProductos += lineSubtotal;
    }

    return {
      productoId: item.productoId,
      codigo: item.codigo,
      nombre: item.nombre,
      tipoItem: item.tipoItem || 'repuesto_original',
      esServicio: Boolean(item.esServicio),
      cantidad: cant,
      precioUnitario: pu,
      costoUnitario: item.costoUnitario || 0,
      subtotal: lineSubtotal,
      garantia: item.garantia || '',
      nota: item.nota || '',
    };
  });

  // Si se ingresó mano de obra plana adicional en el formulario
  const manoDeObraAdicional = Number(ventaData.manoDeObra) || 0;
  if (manoDeObraAdicional > 0 && subtotalElectricidad === 0 && subtotalTallerMecanico === 0) {
    subtotalTallerMecanico += manoDeObraAdicional;
  }

  const subtotalServicios = subtotalElectricidad + subtotalTallerMecanico;
  const subtotalProductos = subtotalRepuestosOriginales + subtotalRepuestosGenericos + subtotalOtrosProductos;

  const descuento = Number(ventaData.descuento) || 0;
  const otrosCargos = Number(ventaData.otrosCargos) || 0;
  const total = Math.max(0, subtotalServicios + subtotalProductos + otrosCargos - descuento);

  // Pagos y cambio
  const metodoPago = ventaData.metodoPagoPrincipal || 'efectivo';
  const montoRecibido = Number(ventaData.montoRecibido) ?? total;

  let montoPagado = Number(ventaData.montoPagado) ?? total;
  let cambioDevuelto = 0;

  if (metodoPago === 'efectivo' && montoRecibido >= total) {
    cambioDevuelto = montoRecibido - total;
    montoPagado = total;
  } else if (metodoPago === 'credito') {
    montoPagado = Number(ventaData.montoPagado) || 0;
  } else {
    montoPagado = Math.min(montoRecibido, total);
  }

  const saldoPendiente = Math.max(0, total - montoPagado);

  const listaPagos: PagoVenta[] = ventaData.pagos && ventaData.pagos.length > 0
    ? [...ventaData.pagos]
    : montoPagado > 0
    ? [
        {
          id: generateUUID(),
          fecha: ventaData.fecha || fechaActual,
          monto: montoPagado,
          metodo: metodoPago,
          nota: metodoPago === 'efectivo' ? `Pago en caja (Recibido: $ ${montoRecibido.toLocaleString()})` : 'Pago registrado',
        },
      ]
    : [];

  const estado: EstadoVenta = ventaData.estado || (saldoPendiente === 0 ? 'completada' : 'pendiente_pago');

  const ventaFinal: Venta = {
    id: ventaId,
    numeroFactura,
    fecha: ventaData.fecha || fechaActual,
    tipoVenta: ventaData.tipoVenta || (subtotalServicios > 0 ? (subtotalProductos > 0 ? 'mixta' : 'servicio_taller') : 'venta_directa'),
    tipoComprobante: ventaData.tipoComprobante || 'factura',
    clienteId: ventaData.clienteId || 'cliente_general',
    clienteNombre: ventaData.clienteNombre || 'Consumidor Final / Mostrador',
    clienteDocumento: ventaData.clienteDocumento || '',
    clienteTelefono: ventaData.clienteTelefono || '',
    clienteDireccion: ventaData.clienteDireccion || '',

    incluyeServicioMoto: Boolean(ventaData.incluyeServicioMoto || subtotalServicios > 0 || ventaData.placaMoto),
    marcaMoto: ventaData.marcaMoto || '',
    modeloMoto: ventaData.modeloMoto || '',
    placaMoto: ventaData.placaMoto?.toUpperCase() || '',
    kilometraje: ventaData.kilometraje || '',
    fallaReportada: ventaData.fallaReportada || '',
    mecanicoResponsable: ventaData.mecanicoResponsable || '',

    items,

    subtotalElectricidad,
    subtotalTallerMecanico,
    subtotalRepuestosOriginales,
    subtotalRepuestosGenericos,
    subtotalOtrosProductos,

    subtotalServicios,
    subtotalProductos,
    manoDeObra: subtotalServicios,

    descuento,
    otrosCargos,
    total,

    metodoPagoPrincipal: metodoPago,
    montoRecibido,
    cambioDevuelto,
    montoPagado,
    saldoPendiente,
    pagos: listaPagos,

    estado,
    observaciones: ventaData.observaciones || '',
    fechaActualizacion: fechaActual,
    historialCambios: ventaData.historialCambios || [
      {
        fecha: fechaActual,
        descripcion: esNueva ? `Factura ${numeroFactura} generada.` : 'Factura actualizada.',
      },
    ],
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction(['ventas', 'productos', 'movimientos', 'configuracion'], 'readwrite');
    const vtaStore = tx.objectStore('ventas');
    const prodStore = tx.objectStore('productos');
    const movStore = tx.objectStore('movimientos');
    const confStore = tx.objectStore('configuracion');

    if (esNueva) {
      config.siguienteNumeroFactura = (config.siguienteNumeroFactura || 1) + 1;
      config.siguienteNumero = config.siguienteNumeroFactura;
      confStore.put(config);
    }

    if (!esNueva) {
      const getOldReq = vtaStore.get(ventaId);
      getOldReq.onsuccess = () => {
        const oldVenta = getOldReq.result as Venta | undefined;
        // Solo ajustar stock de ítems físicos que NO sean mano de obra
        const oldFisicos = (oldVenta?.items || []).filter((i) => !i.esServicio);
        const newFisicos = items.filter((i) => !i.esServicio);

        aplicarDeltasStock(oldFisicos, newFisicos, ventaFinal, prodStore, movStore)
          .then(() => {
            vtaStore.put(ventaFinal);
          })
          .catch(reject);
      };
      getOldReq.onerror = () => reject(getOldReq.error);
    } else {
      const newFisicos = items.filter((i) => !i.esServicio);
      aplicarDeltasStock([], newFisicos, ventaFinal, prodStore, movStore)
        .then(() => {
          vtaStore.put(ventaFinal);
        })
        .catch(reject);
    }

    tx.oncomplete = () => resolve(ventaFinal);
    tx.onerror = () => reject(tx.error);
  });
}

export const saveServicio = (data: Partial<Venta>, esNuevo: boolean) => saveVenta(data, esNuevo);

function aplicarDeltasStock(
  itemsAntiguos: ItemVenta[],
  itemsNuevos: ItemVenta[],
  venta: Venta,
  prodStore: IDBObjectStore,
  movStore: IDBObjectStore
): Promise<void> {
  return new Promise((resolve, reject) => {
    const cantAnt: Record<string, number> = {};
    for (const it of itemsAntiguos) {
      if (it.productoId && !it.esServicio) {
        cantAnt[it.productoId] = (cantAnt[it.productoId] || 0) + it.cantidad;
      }
    }

    const cantNue: Record<string, number> = {};
    for (const it of itemsNuevos) {
      if (it.productoId && !it.esServicio) {
        cantNue[it.productoId] = (cantNue[it.productoId] || 0) + it.cantidad;
      }
    }

    const todosIds = Array.from(new Set([...Object.keys(cantAnt), ...Object.keys(cantNue)]));
    if (todosIds.length === 0) {
      resolve();
      return;
    }

    let processed = 0;
    for (const pId of todosIds) {
      const getProd = prodStore.get(pId);
      getProd.onsuccess = () => {
        const prod = getProd.result as Producto | undefined;
        if (prod) {
          const antes = cantAnt[pId] || 0;
          const despues = cantNue[pId] || 0;
          const delta = despues - antes;

          if (delta !== 0) {
            const stockAnterior = prod.stock;
            const stockNuevo = stockAnterior - delta;
            prod.stock = Math.max(0, stockNuevo);
            prodStore.put(prod);

            const mov: MovimientoInventario = {
              id: generateUUID(),
              fecha: new Date().toISOString(),
              productoId: prod.id,
              productoCodigo: prod.codigo,
              productoNombre: prod.nombre,
              tipo: delta > 0 ? 'venta' : 'entrada',
              cantidad: Math.abs(delta),
              motivo: delta > 0 ? `Venta en Factura #${venta.numeroFactura}` : `Ajuste/Devolución por edición de #${venta.numeroFactura}`,
              referenciaId: venta.id,
              stockAnterior,
              stockNuevo: prod.stock,
            };
            movStore.put(mov);
          }
        }
        processed++;
        if (processed === todosIds.length) {
          resolve();
        }
      };
      getProd.onerror = () => reject(getProd.error);
    }
  });
}

export async function registrarPagoVenta(ventaId: string, pagoData: Omit<PagoVenta, 'id'>): Promise<Venta> {
  const db = await openDatabase();
  const vta = await getVentaById(ventaId);
  if (!vta) throw new Error('Venta no encontrada.');

  const nuevoPago: PagoVenta = {
    id: generateUUID(),
    fecha: pagoData.fecha || new Date().toISOString(),
    monto: Number(pagoData.monto) || 0,
    metodo: pagoData.metodo || 'efectivo',
    nota: pagoData.nota || 'Abono a saldo',
  };

  const listaPagos = [...(vta.pagos || []), nuevoPago];
  const totalPagado = listaPagos.reduce((sum, p) => sum + p.monto, 0);
  const saldoPendiente = Math.max(0, vta.total - totalPagado);

  vta.pagos = listaPagos;
  vta.montoPagado = totalPagado;
  vta.saldoPendiente = saldoPendiente;
  if (saldoPendiente === 0) {
    vta.estado = 'completada';
  }
  vta.fechaActualizacion = new Date().toISOString();

  if (!vta.historialCambios) vta.historialCambios = [];
  vta.historialCambios.push({
    fecha: new Date().toISOString(),
    descripcion: `Pago recibido: $ ${nuevoPago.monto.toLocaleString()} (${nuevoPago.metodo}). Saldo pendiente: $ ${saldoPendiente.toLocaleString()}`,
  });

  return new Promise((resolve, reject) => {
    const tx = db.transaction('ventas', 'readwrite');
    const store = tx.objectStore('ventas');
    const req = store.put(vta);
    req.onsuccess = () => resolve(vta);
    req.onerror = () => reject(req.error);
  });
}

export const registrarPagoServicio = registrarPagoVenta;

export async function anularVenta(ventaId: string, restaurarStock: boolean = true): Promise<Venta> {
  const db = await openDatabase();
  const vta = await getVentaById(ventaId);
  if (!vta) throw new Error('Venta no encontrada.');

  if (vta.estado === 'anulada') {
    throw new Error('Esta factura ya se encuentra anulada.');
  }

  vta.estado = 'anulada';
  vta.fechaActualizacion = new Date().toISOString();

  if (!vta.historialCambios) vta.historialCambios = [];
  vta.historialCambios.push({
    fecha: new Date().toISOString(),
    descripcion: `Factura ANULADA.${restaurarStock ? ' Repuestos devueltos a bodega.' : ''}`,
  });

  return new Promise((resolve, reject) => {
    const stores = restaurarStock ? ['ventas', 'productos', 'movimientos'] : ['ventas'];
    const tx = db.transaction(stores, 'readwrite');
    const vtaStore = tx.objectStore('ventas');
    vtaStore.put(vta);

    // Solo devolver ítems físicos
    const itemsFisicos = (vta.items || []).filter((i) => !i.esServicio);
    if (restaurarStock && itemsFisicos.length > 0) {
      const prodStore = tx.objectStore('productos');
      const movStore = tx.objectStore('movimientos');

      for (const item of itemsFisicos) {
        const getProd = prodStore.get(item.productoId);
        getProd.onsuccess = () => {
          const prod = getProd.result as Producto | undefined;
          if (prod) {
            const stockAnterior = prod.stock;
            const stockNuevo = stockAnterior + item.cantidad;
            prod.stock = stockNuevo;
            prodStore.put(prod);

            const mov: MovimientoInventario = {
              id: generateUUID(),
              fecha: new Date().toISOString(),
              productoId: prod.id,
              productoCodigo: prod.codigo,
              productoNombre: prod.nombre,
              tipo: 'entrada',
              cantidad: item.cantidad,
              motivo: `Devolución por anulación de Factura #${vta.numeroFactura}`,
              referenciaId: vta.id,
              stockAnterior,
              stockNuevo,
            };
            movStore.put(mov);
          }
        };
      }
    }

    tx.oncomplete = () => resolve(vta);
    tx.onerror = () => reject(tx.error);
  });
}

// -------------------------------------------------------------
// MOVIMIENTOS
// -------------------------------------------------------------
export async function getMovimientos(): Promise<MovimientoInventario[]> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('movimientos', 'readonly');
    const store = tx.objectStore('movimientos');
    const req = store.getAll();
    req.onsuccess = () => {
      const list = (req.result || []) as MovimientoInventario[];
      list.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
      resolve(list);
    };
    req.onerror = () => reject(req.error);
  });
}

// -------------------------------------------------------------
// CONFIGURACION
// -------------------------------------------------------------
export async function getConfiguracion(): Promise<ConfiguracionTaller> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('configuracion', 'readonly');
    const store = tx.objectStore('configuracion');
    const req = store.get(DEFAULT_CONFIG.clave);
    req.onsuccess = () => {
      const conf = (req.result as ConfiguracionTaller) || DEFAULT_CONFIG;
      resolve(conf);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function saveConfiguracion(config: ConfiguracionTaller): Promise<ConfiguracionTaller> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('configuracion', 'readwrite');
    const store = tx.objectStore('configuracion');
    const req = store.put(config);
    req.onsuccess = () => resolve(config);
    req.onerror = () => reject(req.error);
  });
}

// -------------------------------------------------------------
// RESPALDO Y RESTAURACIÓN JSON
// -------------------------------------------------------------
export async function exportarBaseDatosJSON(): Promise<string> {
  const [clientes, productos, ventas, movimientos, configuracion] = await Promise.all([
    getClientes(),
    getProductos(),
    getVentas(),
    getMovimientos(),
    getConfiguracion(),
  ]);

  const backupData = {
    app: 'MOTOMOTO_S_E',
    version: 2,
    fechaExportacion: new Date().toISOString(),
    datos: {
      clientes,
      productos,
      ventas,
      movimientos,
      configuracion,
    },
  };

  return JSON.stringify(backupData, null, 2);
}

export async function importarBaseDatosJSON(jsonStr: string): Promise<boolean> {
  const parsed = JSON.parse(jsonStr);
  if (!parsed || !parsed.datos) {
    throw new Error('El archivo de respaldo no tiene un formato válido.');
  }

  const { clientes = [], productos = [], ventas = [], servicios = [], movimientos = [], configuracion } = parsed.datos;
  const listaVentas = ventas.length > 0 ? ventas : servicios;
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(['clientes', 'productos', 'ventas', 'movimientos', 'configuracion'], 'readwrite');

    const cliStore = tx.objectStore('clientes');
    const prodStore = tx.objectStore('productos');
    const vtaStore = tx.objectStore('ventas');
    const movStore = tx.objectStore('movimientos');
    const confStore = tx.objectStore('configuracion');

    cliStore.clear();
    prodStore.clear();
    vtaStore.clear();
    movStore.clear();

    clientes.forEach((c: Cliente) => cliStore.put(c));
    productos.forEach((p: Producto) => prodStore.put(p));
    listaVentas.forEach((v: Venta) => vtaStore.put(v));
    movimientos.forEach((m: MovimientoInventario) => movStore.put(m));

    if (configuracion) {
      confStore.put(configuracion);
    }

    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
}

export async function limpiarTodaLaBaseDatos(): Promise<boolean> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['clientes', 'productos', 'ventas', 'movimientos', 'configuracion'], 'readwrite');
    tx.objectStore('clientes').clear();
    tx.objectStore('productos').clear();
    tx.objectStore('ventas').clear();
    tx.objectStore('movimientos').clear();
    tx.objectStore('configuracion').put(DEFAULT_CONFIG);

    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
}

// -------------------------------------------------------------
// DEMO MOTOMOTO S&E: ELECTRICIDAD, TALLER, ORIGINALES Y GENÉRICOS
// -------------------------------------------------------------
export async function cargarDatosDemo(): Promise<{
  clientes: number;
  productos: number;
  ventas: number;
}> {
  const db = await openDatabase();

  const demoClientes: Cliente[] = [
    {
      id: generateUUID(),
      nombre: 'Juan Camilo Morales',
      documento: '1020455621',
      telefono: '3104529811',
      email: 'camilo.morales@email.com',
      direccion: 'Carrera 45 # 12-30',
      observaciones: 'Yamaha MT-09. Frecuente en electricidad y mantenimiento general.',
      activo: true,
      fechaRegistro: new Date(Date.now() - 30 * 86400000).toISOString(),
    },
    {
      id: generateUUID(),
      nombre: 'Mariana Gómez Lozano',
      documento: '1152431902',
      telefono: '3168892341',
      email: 'mariana.gomez@email.com',
      direccion: 'Calle 10A # 34-18',
      observaciones: 'KTM Duke 200. Mantenimiento mecánico periódico.',
      activo: true,
      fechaRegistro: new Date(Date.now() - 25 * 86400000).toISOString(),
    },
    {
      id: generateUUID(),
      nombre: 'Esteban Darío Salazar',
      documento: '71342890',
      telefono: '3007412589',
      email: 'esteban.salazar@correo.co',
      direccion: 'Diagonal 80 # 65-40',
      observaciones: 'Pulsar NS200. Compra repuestos genéricos y originales.',
      activo: true,
      fechaRegistro: new Date(Date.now() - 15 * 86400000).toISOString(),
    },
  ];

  const demoProductos: Producto[] = [
    // 1. REPUESTOS ORIGINALES
    {
      id: generateUUID(),
      codigo: 'OEM-YAM-REG',
      nombre: 'Regulador / Rectificador Original Yamaha MT-03 / R3',
      categoria: 'Repuestos Originales',
      tipoRepuesto: 'original',
      marca: 'Yamaha Genuine Parts (OEM)',
      descripcion: 'Regulador de carga trifásico original de fábrica 1WD-H1960-00.',
      proveedor: 'Incolmotos Yamaha S.A.',
      proveedorContacto: '310 456 7890',
      garantiaMeses: 6,
      stock: 4,
      stockMinimo: 2,
      costoUnitario: 145000,
      precioVenta: 215000,
      activo: true,
      fechaRegistro: new Date(Date.now() - 40 * 86400000).toISOString(),
    },
    {
      id: generateUUID(),
      codigo: 'OEM-HON-EMPQ',
      nombre: 'Juego de Empaques de Culata Original Honda CB190R',
      categoria: 'Repuestos Originales',
      tipoRepuesto: 'original',
      marca: 'Honda Genuine Parts',
      descripcion: 'Empaque de culata metálico multilámina genuino de planta.',
      proveedor: 'Fanalca Honda Repuestos',
      proveedorContacto: '320 890 1234',
      garantiaMeses: 6,
      stock: 8,
      stockMinimo: 3,
      costoUnitario: 35000,
      precioVenta: 55000,
      activo: true,
      fechaRegistro: new Date(Date.now() - 35 * 86400000).toISOString(),
    },
    {
      id: generateUUID(),
      codigo: 'OEM-KTM-PAST',
      nombre: 'Pastillas de Freno Delanteras Brembo OEM KTM Duke',
      categoria: 'Repuestos Originales',
      tipoRepuesto: 'original',
      marca: 'KTM / Brembo Sinter',
      descripcion: 'Compuesto sinterizado original para máxima potencia de frenado.',
      proveedor: 'Auteco Mobility Mayorista',
      proveedorContacto: '315 789 4561',
      garantiaMeses: 3,
      stock: 5,
      stockMinimo: 2,
      costoUnitario: 82000,
      precioVenta: 125000,
      activo: true,
      fechaRegistro: new Date(Date.now() - 28 * 86400000).toISOString(),
    },

    // 2. REPUESTOS GENÉRICOS
    {
      id: generateUUID(),
      codigo: 'GEN-BOB-ALTA',
      nombre: 'Bobina de Alta Tensión Universal 12V con Capuchón',
      categoria: 'Repuestos Genéricos',
      tipoRepuesto: 'generico',
      marca: 'Genérica Calidad AAA',
      descripcion: 'Bobina de encendido reforzada compatible con motos 125cc a 250cc.',
      proveedor: 'Importadora Central de Motopartes',
      proveedorContacto: '311 234 5678',
      garantiaMeses: 1,
      stock: 12,
      stockMinimo: 4,
      costoUnitario: 22000,
      precioVenta: 38000,
      activo: true,
      fechaRegistro: new Date(Date.now() - 25 * 86400000).toISOString(),
    },
    {
      id: generateUUID(),
      codigo: 'GEN-PAS-FRN',
      nombre: 'Pastillas de Freno Semi-Metálicas Genéricas Universales',
      categoria: 'Repuestos Genéricos',
      tipoRepuesto: 'generico',
      marca: 'Standard Parts',
      descripcion: 'Pastillas de reposición económica para freno de disco trasero y delantero.',
      proveedor: 'Distribuidora Rueda Libre',
      proveedorContacto: '314 567 8901',
      garantiaMeses: 1,
      stock: 18,
      stockMinimo: 6,
      costoUnitario: 14000,
      precioVenta: 25000,
      activo: true,
      fechaRegistro: new Date(Date.now() - 20 * 86400000).toISOString(),
    },
    {
      id: generateUUID(),
      codigo: 'GEN-STAT-COR',
      nombre: 'Stator / Corona de Encendido 8 Polos para Moto 150cc',
      categoria: 'Repuestos Genéricos',
      tipoRepuesto: 'generico',
      marca: 'PowerMoto',
      descripcion: 'Bobinado en cobre de alta resistencia térmica.',
      proveedor: 'ElectroMotos Colombia',
      proveedorContacto: '318 901 2345',
      garantiaMeses: 1,
      stock: 6,
      stockMinimo: 2,
      costoUnitario: 48000,
      precioVenta: 78000,
      activo: true,
      fechaRegistro: new Date(Date.now() - 18 * 86400000).toISOString(),
    },

    // 3. LUBRICANTES Y HERRAMIENTAS
    {
      id: generateUUID(),
      codigo: 'LUB-MOT-7100',
      nombre: 'Aceite Sintético Motul 7100 4T 10W-40 (1L)',
      categoria: 'Lubricantes y químicos',
      tipoRepuesto: 'no_aplica',
      marca: 'Motul Francia',
      descripcion: 'Aceite 100% sintético Éster JASO MA2 para motor y caja.',
      proveedor: 'Distribuidora Lubricantes del Norte',
      proveedorContacto: '316 345 6789',
      garantiaMeses: 0,
      stock: 15,
      stockMinimo: 6,
      costoUnitario: 52000,
      precioVenta: 72000,
      activo: true,
      fechaRegistro: new Date(Date.now() - 15 * 86400000).toISOString(),
    },
    {
      id: generateUUID(),
      codigo: 'HER-TORQ-38',
      nombre: 'Torquímetro Digital 3/8" (10-100 Nm) para Taller',
      categoria: 'Herramientas de taller',
      tipoRepuesto: 'no_aplica',
      marca: 'Jonnesway Pro',
      descripcion: 'Llave dinamométrica de precisión para apriete de culatas y tornillería.',
      proveedor: 'Equipos & Herramientas Industriales',
      proveedorContacto: '317 456 1234',
      garantiaMeses: 12,
      stock: 3,
      stockMinimo: 1,
      costoUnitario: 185000,
      precioVenta: 260000,
      activo: true,
      fechaRegistro: new Date(Date.now() - 10 * 86400000).toISOString(),
    },
  ];

  const pRegulador = demoProductos[0];
  const pPastillasOem = demoProductos[2];
  const pBobinaGen = demoProductos[3];
  const pAceite = demoProductos[6];

  const c1 = demoClientes[0];
  const c2 = demoClientes[1];

  const demoVentas: Venta[] = [
    {
      id: generateUUID(),
      numeroFactura: 'FAC-0001',
      fecha: new Date(Date.now() - 1 * 86400000).toISOString(),
      tipoVenta: 'mixta',
      tipoComprobante: 'factura',
      clienteId: c1.id,
      clienteNombre: c1.nombre,
      clienteTelefono: c1.telefono,
      clienteDocumento: c1.documento,
      clienteDireccion: c1.direccion,

      incluyeServicioMoto: true,
      marcaMoto: 'Yamaha',
      modeloMoto: 'MT-09',
      placaMoto: 'MTO-89F',
      kilometraje: '19,200 km',
      fallaReportada: 'La batería no carga y la moto se apaga en marcha.',
      mecanicoResponsable: 'Julián Vargas (Técnico Electricista)',

      items: [
        {
          productoId: 'srv-elec-diag',
          codigo: 'SRV-ELEC',
          nombre: 'Servicio de Electricidad: Diagnóstico y Reparación de Sistema de Carga',
          tipoItem: 'servicio_electrico',
          esServicio: true,
          cantidad: 1,
          precioUnitario: 75000,
          subtotal: 75000,
          garantia: '30 días de garantía',
        },
        {
          productoId: pRegulador.id,
          codigo: pRegulador.codigo,
          nombre: pRegulador.nombre,
          tipoItem: 'repuesto_original',
          esServicio: false,
          cantidad: 1,
          precioUnitario: 215000,
          costoUnitario: 145000,
          subtotal: 215000,
          garantia: '6 meses de garantía OEM',
        },
        {
          productoId: pAceite.id,
          codigo: pAceite.codigo,
          nombre: pAceite.nombre,
          tipoItem: 'lubricante',
          esServicio: false,
          cantidad: 3,
          precioUnitario: 72000,
          costoUnitario: 52000,
          subtotal: 216000,
        },
        {
          productoId: 'srv-mec-oil',
          codigo: 'SRV-MEC',
          nombre: 'Taller Mecánico: Cambio de Aceite, Filtro y Ajuste de Cadena',
          tipoItem: 'servicio_mecanico',
          esServicio: true,
          cantidad: 1,
          precioUnitario: 35000,
          subtotal: 35000,
          garantia: '30 días de garantía',
        },
      ],

      subtotalElectricidad: 75000,
      subtotalTallerMecanico: 35000,
      subtotalRepuestosOriginales: 215000,
      subtotalRepuestosGenericos: 0,
      subtotalOtrosProductos: 216000,

      subtotalServicios: 110000,
      subtotalProductos: 431000,
      manoDeObra: 110000,

      descuento: 21000,
      otrosCargos: 0,
      total: 520000,

      metodoPagoPrincipal: 'transferencia',
      montoRecibido: 520000,
      cambioDevuelto: 0,
      montoPagado: 520000,
      saldoPendiente: 0,
      pagos: [
        {
          id: generateUUID(),
          fecha: new Date(Date.now() - 1 * 86400000).toISOString(),
          monto: 520000,
          metodo: 'transferencia',
          nota: 'Transferencia Bancolombia / Nequi',
        },
      ],
      estado: 'completada',
      observaciones: 'Sistema de carga verificado en 14.4V estabilizado. Regulador original instalado.',
      fechaActualizacion: new Date(Date.now() - 1 * 86400000).toISOString(),
    },
    {
      id: generateUUID(),
      numeroFactura: 'FAC-0002',
      fecha: new Date().toISOString(),
      tipoVenta: 'mixta',
      tipoComprobante: 'factura',
      clienteId: c2.id,
      clienteNombre: c2.nombre,
      clienteTelefono: c2.telefono,
      clienteDocumento: c2.documento,
      clienteDireccion: c2.direccion,

      incluyeServicioMoto: true,
      marcaMoto: 'KTM',
      modeloMoto: 'Duke 200',
      placaMoto: 'KTM-22D',
      kilometraje: '14,300 km',
      fallaReportada: 'Frenada deficiente y chispa débil de encendido.',
      mecanicoResponsable: 'Andrés Morales (Taller Mecánico)',

      items: [
        {
          productoId: pPastillasOem.id,
          codigo: pPastillasOem.codigo,
          nombre: pPastillasOem.nombre,
          tipoItem: 'repuesto_original',
          esServicio: false,
          cantidad: 1,
          precioUnitario: 125000,
          costoUnitario: 82000,
          subtotal: 125000,
          garantia: '3 meses OEM',
        },
        {
          productoId: pBobinaGen.id,
          codigo: pBobinaGen.codigo,
          nombre: pBobinaGen.nombre,
          tipoItem: 'repuesto_generico',
          esServicio: false,
          cantidad: 1,
          precioUnitario: 38000,
          costoUnitario: 22000,
          subtotal: 38000,
          garantia: '1 mes genérico',
        },
        {
          productoId: 'srv-mec-frenos',
          codigo: 'SRV-MEC',
          nombre: 'Taller Mecánico: Desmonte, Limpieza Ultrasónica de Mordaza y Purgado DOT 5.1',
          tipoItem: 'servicio_mecanico',
          esServicio: true,
          cantidad: 1,
          precioUnitario: 45000,
          subtotal: 45000,
        },
        {
          productoId: 'srv-elec-chispa',
          codigo: 'SRV-ELEC',
          nombre: 'Servicio de Electricidad: Calibración y Medición de Resistencia de Bobina',
          tipoItem: 'servicio_electrico',
          esServicio: true,
          cantidad: 1,
          precioUnitario: 25000,
          subtotal: 25000,
        },
      ],

      subtotalElectricidad: 25000,
      subtotalTallerMecanico: 45000,
      subtotalRepuestosOriginales: 125000,
      subtotalRepuestosGenericos: 38000,
      subtotalOtrosProductos: 0,

      subtotalServicios: 70000,
      subtotalProductos: 163000,
      manoDeObra: 70000,

      descuento: 0,
      otrosCargos: 0,
      total: 233000,

      metodoPagoPrincipal: 'efectivo',
      montoRecibido: 250000,
      cambioDevuelto: 17000,
      montoPagado: 233000,
      saldoPendiente: 0,
      pagos: [
        {
          id: generateUUID(),
          fecha: new Date().toISOString(),
          monto: 233000,
          metodo: 'efectivo',
          nota: 'Recibido $ 250.000, cambio devuelto $ 17.000',
        },
      ],
      estado: 'completada',
      observaciones: 'Pastillas asentadas. Chispa con longitud óptima.',
      fechaActualizacion: new Date().toISOString(),
    },
  ];

  return new Promise((resolve, reject) => {
    const tx = db.transaction(['clientes', 'productos', 'ventas', 'movimientos', 'configuracion'], 'readwrite');
    const cliStore = tx.objectStore('clientes');
    const prodStore = tx.objectStore('productos');
    const vtaStore = tx.objectStore('ventas');
    const movStore = tx.objectStore('movimientos');
    const confStore = tx.objectStore('configuracion');

    demoClientes.forEach((c) => cliStore.put(c));

    demoProductos.forEach((p) => {
      prodStore.put(p);
      movStore.put({
        id: generateUUID(),
        fecha: p.fechaRegistro,
        productoId: p.id,
        productoCodigo: p.codigo,
        productoNombre: p.nombre,
        tipo: 'entrada',
        cantidad: p.stock,
        motivo: 'Carga inicial de inventario MOTOMOTO S&E',
        stockAnterior: 0,
        stockNuevo: p.stock,
      });
    });

    demoVentas.forEach((v) => vtaStore.put(v));

    const updatedConfig: ConfiguracionTaller = {
      ...DEFAULT_CONFIG,
      siguienteNumeroFactura: 3,
      siguienteNumero: 3,
    };
    confStore.put(updatedConfig);

    tx.oncomplete = () => {
      resolve({
        clientes: demoClientes.length,
        productos: demoProductos.length,
        ventas: demoVentas.length,
      });
    };
    tx.onerror = () => reject(tx.error);
  });
}
