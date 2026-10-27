const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function generateUUID() {
  if (typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'uuid-' + Math.random().toString(36).substring(2, 11) + '-' + Date.now().toString(36);
}

const DEFAULT_CONFIG = {
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

let dbFilePath = '';
let dbCache = null;

function getInitialDatabase() {
  return {
    version: 1,
    fechaCreacion: new Date().toISOString(),
    configuracion: { ...DEFAULT_CONFIG },
    clientes: [],
    productos: [],
    ventas: [],
    movimientos: [],
    servicios: [],
  };
}

function initStorage(userDataDir) {
  if (!fs.existsSync(userDataDir)) {
    fs.mkdirSync(userDataDir, { recursive: true });
  }

  dbFilePath = path.join(userDataDir, 'mototaller_db.json');

  if (fs.existsSync(dbFilePath)) {
    try {
      const raw = fs.readFileSync(dbFilePath, 'utf-8');
      dbCache = JSON.parse(raw);
      // Ensure all arrays and config exist
      if (!dbCache.clientes) dbCache.clientes = [];
      if (!dbCache.productos) dbCache.productos = [];
      if (!dbCache.ventas) dbCache.ventas = [];
      if (!dbCache.movimientos) dbCache.movimientos = [];
      if (!dbCache.configuracion) dbCache.configuracion = { ...DEFAULT_CONFIG };
    } catch (err) {
      console.error('Error leyendo base de datos local JSON, creando respaldo:', err);
      const backupPath = path.join(userDataDir, `mototaller_db_corrupt_${Date.now()}.json`);
      try {
        fs.copyFileSync(dbFilePath, backupPath);
      } catch (_) {}
      dbCache = getInitialDatabase();
      persist();
    }
  } else {
    dbCache = getInitialDatabase();
    persist();
  }

  return dbFilePath;
}

function persist() {
  if (!dbFilePath || !dbCache) return;
  const tempPath = dbFilePath + '.tmp';
  try {
    fs.writeFileSync(tempPath, JSON.stringify(dbCache, null, 2), 'utf-8');
    fs.renameSync(tempPath, dbFilePath);
  } catch (err) {
    console.error('Error persistiendo base de datos local en disco:', err);
  }
}

function getAll() {
  return {
    clientes: dbCache.clientes || [],
    productos: dbCache.productos || [],
    ventas: dbCache.ventas || [],
    movimientos: dbCache.movimientos || [],
    configuracion: dbCache.configuracion || { ...DEFAULT_CONFIG },
  };
}

function saveCliente(data) {
  const isUpdate = Boolean(data.id);
  const cliente = {
    id: data.id || generateUUID(),
    nombre: (data.nombre || '').trim(),
    documento: (data.documento || '').trim(),
    telefono: (data.telefono || '').trim(),
    email: (data.email || '').trim(),
    direccion: (data.direccion || '').trim(),
    observaciones: (data.observaciones || '').trim(),
    activo: data.activo !== undefined ? Boolean(data.activo) : true,
    fechaRegistro: data.fechaRegistro || new Date().toISOString(),
  };

  const idx = dbCache.clientes.findIndex((c) => c.id === cliente.id);
  if (idx >= 0) {
    dbCache.clientes[idx] = { ...dbCache.clientes[idx], ...cliente };
  } else {
    dbCache.clientes.push(cliente);
  }
  persist();
  return cliente;
}

function toggleClienteActivo(id) {
  const c = dbCache.clientes.find((x) => x.id === id);
  if (!c) throw new Error('Cliente no encontrado');
  c.activo = !c.activo;
  persist();
  return c.activo;
}

function deleteCliente(id) {
  const initialLength = dbCache.clientes.length;
  dbCache.clientes = dbCache.clientes.filter((c) => c.id !== id);
  const deleted = dbCache.clientes.length < initialLength;
  if (deleted) persist();
  return deleted;
}

function saveProducto(data) {
  const isUpdate = Boolean(data.id);
  const now = new Date().toISOString();
  const producto = {
    id: data.id || generateUUID(),
    codigo: (data.codigo || '').trim().toUpperCase(),
    nombre: (data.nombre || '').trim(),
    categoria: data.categoria || 'Otros',
    tipoRepuesto: data.tipoRepuesto || 'no_aplica',
    marca: (data.marca || '').trim() || 'Genérica',
    descripcion: (data.descripcion || '').trim(),
    garantiaMeses: Number(data.garantiaMeses) || 0,
    stock: Math.max(0, Number(data.stock) || 0),
    stockMinimo: Math.max(0, Number(data.stockMinimo) || 2),
    costoUnitario: Math.max(0, Number(data.costoUnitario) || 0),
    precioVenta: Math.max(0, Number(data.precioVenta) || 0),
    proveedor: (data.proveedor || '').trim(),
    proveedorContacto: (data.proveedorContacto || '').trim(),
    activo: data.activo !== undefined ? Boolean(data.activo) : true,
    fechaRegistro: data.fechaRegistro || now,
  };

  const idx = dbCache.productos.findIndex((p) => p.id === producto.id);
  if (idx >= 0) {
    dbCache.productos[idx] = { ...dbCache.productos[idx], ...producto };
  } else {
    dbCache.productos.push(producto);
    // Registro de movimiento inicial si tiene stock
    if (producto.stock > 0) {
      dbCache.movimientos.push({
        id: generateUUID(),
        fecha: now,
        productoId: producto.id,
        productoCodigo: producto.codigo,
        productoNombre: producto.nombre,
        tipo: 'entrada',
        cantidad: producto.stock,
        motivo: 'Inventario inicial al registrar producto',
        stockAnterior: 0,
        stockNuevo: producto.stock,
      });
    }
  }
  persist();
  return producto;
}

function toggleProductoActivo(id) {
  const p = dbCache.productos.find((x) => x.id === id);
  if (!p) throw new Error('Producto no encontrado');
  p.activo = !p.activo;
  persist();
  return p.activo;
}

function deleteProducto(id) {
  const initialLength = dbCache.productos.length;
  dbCache.productos = dbCache.productos.filter((p) => p.id !== id);
  const deleted = dbCache.productos.length < initialLength;
  if (deleted) persist();
  return deleted;
}

function ajustarStock(productoId, tipo, cantidad, motivo) {
  const p = dbCache.productos.find((x) => x.id === productoId);
  if (!p) throw new Error('Producto no encontrado');

  const stockAnterior = p.stock || 0;
  let stockNuevo = stockAnterior;

  if (tipo === 'entrada') {
    stockNuevo = stockAnterior + cantidad;
  } else if (tipo === 'salida' || tipo === 'venta') {
    if (stockAnterior < cantidad) {
      throw new Error(`Stock insuficiente. Disponible: ${stockAnterior}, requerido: ${cantidad}`);
    }
    stockNuevo = stockAnterior - cantidad;
  } else if (tipo === 'ajuste') {
    stockNuevo = cantidad;
  }

  p.stock = Math.max(0, stockNuevo);

  dbCache.movimientos.push({
    id: generateUUID(),
    fecha: new Date().toISOString(),
    productoId: p.id,
    productoCodigo: p.codigo,
    productoNombre: p.nombre,
    tipo: tipo,
    cantidad: cantidad,
    motivo: motivo || 'Ajuste manual de stock',
    stockAnterior: stockAnterior,
    stockNuevo: p.stock,
  });

  persist();
  return p;
}

function saveVenta(ventaData, esNueva = true) {
  const now = new Date().toISOString();
  let conf = dbCache.configuracion || { ...DEFAULT_CONFIG };

  let numFactura = ventaData.numeroFactura;
  if (esNueva && (!numFactura || numFactura.trim() === '')) {
    const prefijo = conf.prefijoFactura || 'FAC';
    const sig = conf.siguienteNumeroFactura || 1;
    numFactura = `${prefijo}-${String(sig).padStart(4, '0')}`;
    conf.siguienteNumeroFactura = sig + 1;
    dbCache.configuracion = conf;
  }

  const items = ventaData.items || [];
  const total = Number(ventaData.total) || 0;
  const montoPagado = Number(ventaData.montoPagado) || 0;
  const saldoPendiente = Math.max(0, total - montoPagado);

  const venta = {
    id: ventaData.id || generateUUID(),
    numeroFactura: numFactura,
    fecha: ventaData.fecha || now,
    tipoVenta: ventaData.tipoVenta || 'venta_directa',
    tipoComprobante: ventaData.tipoComprobante || 'factura',
    clienteId: ventaData.clienteId || 'cli-anonimo',
    clienteNombre: ventaData.clienteNombre || 'Consumidor Final',
    clienteDocumento: ventaData.clienteDocumento || '',
    clienteTelefono: ventaData.clienteTelefono || '',
    clienteDireccion: ventaData.clienteDireccion || '',
    items: items,
    subtotal: Number(ventaData.subtotal) || 0,
    subtotalRepuestosOriginales: Number(ventaData.subtotalRepuestosOriginales) || 0,
    subtotalRepuestosGenericos: Number(ventaData.subtotalRepuestosGenericos) || 0,
    subtotalHerramientas: Number(ventaData.subtotalHerramientas) || 0,
    subtotalLubricantes: Number(ventaData.subtotalLubricantes) || 0,
    subtotalOtrosProductos: Number(ventaData.subtotalOtrosProductos) || 0,
    subtotalServicios: Number(ventaData.subtotalServicios) || 0,
    subtotalProductos: Number(ventaData.subtotalProductos) || 0,
    manoDeObra: Number(ventaData.manoDeObra) || 0,
    descuento: Number(ventaData.descuento) || 0,
    otrosCargos: Number(ventaData.otrosCargos) || 0,
    total: total,
    metodoPagoPrincipal: ventaData.metodoPagoPrincipal || 'efectivo',
    montoRecibido: Number(ventaData.montoRecibido) || total,
    cambioDevuelto: Number(ventaData.cambioDevuelto) || 0,
    montoPagado: montoPagado,
    saldoPendiente: saldoPendiente,
    pagos: ventaData.pagos || [],
    estado: ventaData.estado || (saldoPendiente <= 0 ? 'completada' : 'pendiente_pago'),
    observaciones: ventaData.observaciones || '',
    fechaActualizacion: now,
  };

  if (esNueva) {
    // Descontar inventario para artículos físicos
    for (const item of items) {
      if (!item.esServicio && item.productoId) {
        const prod = dbCache.productos.find((p) => p.id === item.productoId);
        if (prod) {
          const anterior = prod.stock;
          prod.stock = Math.max(0, prod.stock - item.cantidad);
          dbCache.movimientos.push({
            id: generateUUID(),
            fecha: now,
            productoId: prod.id,
            productoCodigo: prod.codigo,
            productoNombre: prod.nombre,
            tipo: 'venta',
            cantidad: item.cantidad,
            motivo: `Venta Factura #${venta.numeroFactura}`,
            stockAnterior: anterior,
            stockNuevo: prod.stock,
          });
        }
      }
    }
    dbCache.ventas.unshift(venta);
  } else {
    const idx = dbCache.ventas.findIndex((v) => v.id === venta.id);
    if (idx >= 0) {
      dbCache.ventas[idx] = venta;
    } else {
      dbCache.ventas.unshift(venta);
    }
  }

  persist();
  return venta;
}

function anularVenta(id, revertirStock = true) {
  const v = dbCache.ventas.find((x) => x.id === id);
  if (!v) throw new Error('Venta no encontrada');
  if (v.estado === 'anulada') throw new Error('La venta ya se encuentra anulada');

  v.estado = 'anulada';
  v.fechaActualizacion = new Date().toISOString();

  if (revertirStock && v.items) {
    for (const item of v.items) {
      if (!item.esServicio && item.productoId) {
        const prod = dbCache.productos.find((p) => p.id === item.productoId);
        if (prod) {
          const anterior = prod.stock;
          prod.stock += item.cantidad;
          dbCache.movimientos.push({
            id: generateUUID(),
            fecha: new Date().toISOString(),
            productoId: prod.id,
            productoCodigo: prod.codigo,
            productoNombre: prod.nombre,
            tipo: 'ajuste',
            cantidad: item.cantidad,
            motivo: `Reintegro por anulación de Factura #${v.numeroFactura}`,
            stockAnterior: anterior,
            stockNuevo: prod.stock,
          });
        }
      }
    }
  }

  persist();
  return v;
}

function registrarPagoVenta(ventaId, pagoData) {
  const v = dbCache.ventas.find((x) => x.id === ventaId);
  if (!v) throw new Error('Venta no encontrada');
  if (v.estado === 'anulada') throw new Error('No se pueden registrar pagos a una venta anulada');

  const nuevoPago = {
    id: generateUUID(),
    fecha: pagoData.fecha || new Date().toISOString(),
    monto: Number(pagoData.monto) || 0,
    metodo: pagoData.metodo || 'efectivo',
    nota: pagoData.nota || 'Abono registrado',
  };

  if (!v.pagos) v.pagos = [];
  v.pagos.push(nuevoPago);

  v.montoPagado = (Number(v.montoPagado) || 0) + nuevoPago.monto;
  v.saldoPendiente = Math.max(0, v.total - v.montoPagado);
  if (v.saldoPendiente <= 0) {
    v.estado = 'completada';
  }
  v.fechaActualizacion = new Date().toISOString();

  persist();
  return v;
}

function saveConfiguracion(config) {
  dbCache.configuracion = { ...config, clave: 'taller_principal' };
  persist();
  return dbCache.configuracion;
}

function exportarBaseDatosJSON() {
  const payload = {
    app: 'MotoTaller Pro',
    version: '1.0.0',
    exportDate: new Date().toISOString(),
    configuracion: dbCache.configuracion || { ...DEFAULT_CONFIG },
    clientes: dbCache.clientes || [],
    productos: dbCache.productos || [],
    ventas: dbCache.ventas || [],
    movimientos: dbCache.movimientos || [],
  };
  return JSON.stringify(payload, null, 2);
}

function importarBaseDatosJSON(jsonStr) {
  const data = JSON.parse(jsonStr);
  if (Array.isArray(data.clientes)) dbCache.clientes = data.clientes;
  if (Array.isArray(data.productos)) dbCache.productos = data.productos;
  if (Array.isArray(data.ventas)) dbCache.ventas = data.ventas;
  if (Array.isArray(data.movimientos)) dbCache.movimientos = data.movimientos;
  if (data.configuracion && typeof data.configuracion === 'object') {
    dbCache.configuracion = { ...DEFAULT_CONFIG, ...data.configuracion };
  }
  persist();
  return {
    clientes: dbCache.clientes.length,
    productos: dbCache.productos.length,
    ventas: dbCache.ventas.length,
  };
}

function migrateFromIndexedDB(data) {
  let countClientes = 0;
  let countProductos = 0;
  let countVentas = 0;
  let countMovimientos = 0;

  if (Array.isArray(data.clientes) && data.clientes.length > 0) {
    for (const c of data.clientes) {
      if (!dbCache.clientes.some((x) => x.id === c.id)) {
        dbCache.clientes.push(c);
        countClientes++;
      }
    }
  }

  if (Array.isArray(data.productos) && data.productos.length > 0) {
    for (const p of data.productos) {
      if (!dbCache.productos.some((x) => x.id === p.id)) {
        dbCache.productos.push(p);
        countProductos++;
      }
    }
  }

  if (Array.isArray(data.ventas) && data.ventas.length > 0) {
    for (const v of data.ventas) {
      if (!dbCache.ventas.some((x) => x.id === v.id)) {
        dbCache.ventas.push(v);
        countVentas++;
      }
    }
  }

  if (Array.isArray(data.movimientos) && data.movimientos.length > 0) {
    for (const m of data.movimientos) {
      if (!dbCache.movimientos.some((x) => x.id === m.id)) {
        dbCache.movimientos.push(m);
        countMovimientos++;
      }
    }
  }

  if (data.configuracion && typeof data.configuracion === 'object') {
    dbCache.configuracion = { ...dbCache.configuracion, ...data.configuracion };
  }

  persist();
  return {
    migrated: true,
    counts: {
      clientes: countClientes,
      productos: countProductos,
      ventas: countVentas,
      movimientos: countMovimientos,
    },
  };
}

function limpiarBaseDatos() {
  dbCache = getInitialDatabase();
  persist();
}

function cargarDatosDemo() {
  const now = Date.now();
  const demoClientes = [
    {
      id: generateUUID(),
      nombre: 'Juan Camilo Morales',
      documento: '1020455621',
      telefono: '3104529811',
      email: 'camilo.morales@email.com',
      direccion: 'Carrera 45 # 12-30',
      observaciones: 'Yamaha MT-09. Frecuente en electricidad y mantenimiento general.',
      activo: true,
      fechaRegistro: new Date(now - 30 * 86400000).toISOString(),
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
      fechaRegistro: new Date(now - 25 * 86400000).toISOString(),
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
      fechaRegistro: new Date(now - 15 * 86400000).toISOString(),
    },
  ];

  const demoProductos = [
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
      stock: 5,
      stockMinimo: 2,
      costoUnitario: 145000,
      precioVenta: 215000,
      activo: true,
      fechaRegistro: new Date(now - 28 * 86400000).toISOString(),
    },
    {
      id: generateUUID(),
      codigo: 'OEM-HON-BAT',
      nombre: 'Batería de Gel YUASA 12V 9Ah YTX9-BS Original',
      categoria: 'Repuestos Originales',
      tipoRepuesto: 'original',
      marca: 'Yuasa Battery OEM',
      descripcion: 'Batería sellada libre de mantenimiento de alto amperaje.',
      proveedor: 'Fanalca Honda Repuestos',
      proveedorContacto: '312 890 1234',
      garantiaMeses: 6,
      stock: 8,
      stockMinimo: 3,
      costoUnitario: 110000,
      precioVenta: 165000,
      activo: true,
      fechaRegistro: new Date(now - 22 * 86400000).toISOString(),
    },
    {
      id: generateUUID(),
      codigo: 'GEN-PAS-DEL',
      nombre: 'Pastillas de Freno Semimetálicas Genéricas (Delanteras)',
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
      fechaRegistro: new Date(now - 20 * 86400000).toISOString(),
    },
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
      fechaRegistro: new Date(now - 15 * 86400000).toISOString(),
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
      fechaRegistro: new Date(now - 10 * 86400000).toISOString(),
    },
  ];

  dbCache.clientes = demoClientes;
  dbCache.productos = demoProductos;
  dbCache.ventas = [];
  dbCache.movimientos = [];

  demoProductos.forEach((p) => {
    dbCache.movimientos.push({
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

  dbCache.configuracion = {
    ...DEFAULT_CONFIG,
    siguienteNumeroFactura: 1,
    siguienteNumero: 1,
  };

  persist();
  return {
    clientes: demoClientes.length,
    productos: demoProductos.length,
    ventas: 0,
  };
}

module.exports = {
  initStorage,
  getAll,
  saveCliente,
  toggleClienteActivo,
  deleteCliente,
  saveProducto,
  toggleProductoActivo,
  deleteProducto,
  ajustarStock,
  saveVenta,
  anularVenta,
  registrarPagoVenta,
  saveConfiguracion,
  exportarBaseDatosJSON,
  importarBaseDatosJSON,
  cargarDatosDemo,
  migrateFromIndexedDB,
  limpiarBaseDatos,
};
