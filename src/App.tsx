/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Cliente,
  Producto,
  Venta,
  MovimientoInventario,
  ConfiguracionTaller,
  SeccionApp,
  PagoVenta,
  TipoMovimiento,
} from './types';
import {
  getClientes,
  saveCliente,
  toggleClienteActivo,
  getProductos,
  saveProducto,
  toggleProductoActivo,
  ajustarStock,
  getVentas,
  saveVenta,
  anularVenta,
  registrarPagoVenta,
  getMovimientos,
  getConfiguracion,
  saveConfiguracion,
  exportarBaseDatosJSON,
  importarBaseDatosJSON,
  cargarDatosDemo,
  limpiarTodaLaBaseDatos,
} from './db/indexedDB';

import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { DashboardView } from './components/dashboard/DashboardView';
import { PuntoDeVentaView } from './components/ventas/PuntoDeVentaView';
import { HistorialVentasView } from './components/ventas/HistorialVentasView';
import { FacturaModal } from './components/ventas/FacturaModal';
import { ClientesView } from './components/clientes/ClientesView';
import { ProductosView } from './components/productos/ProductosView';
import { InventarioView } from './components/inventario/InventarioView';
import { ReportesView } from './components/reportes/ReportesView';
import { ConfiguracionView } from './components/configuracion/ConfiguracionView';
import { CheckCircle2, AlertCircle, Info, Menu, X, ShoppingCart } from 'lucide-react';

export default function App() {
  const [seccionActual, setSeccionActual] = useState<SeccionApp>('pos_ventas');
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [movimientos, setMovimientos] = useState<MovimientoInventario[]>([]);
  const [configuracion, setConfiguracion] = useState<ConfiguracionTaller>({
    clave: 'taller_principal',
    nombreTaller: 'MOTOMOTO S&E',
    nit: '901.458.789-1',
    telefono: '+57 312 456 7890',
    direccion: 'Av. Principal # 45-22, Zona Motos',
    ciudad: 'Medellín',
    email: 'ventas@mototaller.local',
    piePaginaRecibo: 'Garantía de 30 días en repuestos y herramientas. ¡Gracias por su compra!',
    prefijoFactura: 'FAC',
    siguienteNumeroFactura: 1,
  });

  const [cargando, setCargando] = useState(true);
  const [ventaParaEditar, setVentaParaEditar] = useState<Venta | null>(null);
  const [facturaSeleccionada, setFacturaSeleccionada] = useState<Venta | null>(null);

  // Mobile menu drawer
  const [sidebarMobileOpen, setSidebarMobileOpen] = useState(false);

  // Toast notification system
  const [toast, setToast] = useState<{
    show: boolean;
    mensaje: string;
    tipo: 'success' | 'error' | 'info';
  }>({
    show: false,
    mensaje: '',
    tipo: 'success',
  });

  const mostrarToast = (mensaje: string, tipo: 'success' | 'error' | 'info' = 'success') => {
    setToast({ show: true, mensaje, tipo });
    setTimeout(() => {
      setToast((prev) => ({ ...prev, show: false }));
    }, 3800);
  };

  // Cargar datos desde IndexedDB
  const cargarDatos = useCallback(async () => {
    try {
      setCargando(true);
      const [cList, pList, vList, mList, conf] = await Promise.all([
        getClientes(),
        getProductos(),
        getVentas(),
        getMovimientos(),
        getConfiguracion(),
      ]);
      setClientes(cList);
      setProductos(pList);
      setVentas(vList);
      setMovimientos(mList);
      if (conf) setConfiguracion(conf);
    } catch (error) {
      console.error('Error cargando datos de IndexedDB:', error);
      mostrarToast('Error al conectar con la base de datos local IndexedDB.', 'error');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  // Handlers para Clientes
  const handleGuardarCliente = async (clienteData: Partial<Cliente> & { nombre: string; telefono: string }) => {
    const guardado = await saveCliente(clienteData);
    await cargarDatos();
    mostrarToast(`Cliente "${guardado.nombre}" guardado con éxito.`);
  };

  const handleToggleClienteActivo = async (id: string) => {
    const nuevoEstado = await toggleClienteActivo(id);
    await cargarDatos();
    mostrarToast(nuevoEstado ? 'Cliente reactivado.' : 'Cliente desactivado.');
  };

  // Handlers para Productos
  const handleGuardarProducto = async (
    productoData: Partial<Producto> & { codigo: string; nombre: string; precioVenta: number }
  ) => {
    const guardado = await saveProducto(productoData);
    await cargarDatos();
    mostrarToast(`Producto "${guardado.nombre}" (${guardado.codigo}) guardado en inventario.`);
  };

  const handleToggleProductoActivo = async (id: string) => {
    const nuevoEstado = await toggleProductoActivo(id);
    await cargarDatos();
    mostrarToast(nuevoEstado ? 'Producto reactivado.' : 'Producto marcado como inactivo.');
  };

  const handleAjustarStock = async (
    productoId: string,
    tipo: TipoMovimiento,
    cantidad: number,
    motivo: string
  ) => {
    const prod = await ajustarStock(productoId, tipo, cantidad, motivo);
    await cargarDatos();
    mostrarToast(`Stock de "${prod.nombre}" actualizado a ${prod.stock} unidades.`);
  };

  // Handlers para Ventas y Facturación
  const handleEmitirVenta = async (ventaData: Partial<Venta>, esNueva: boolean) => {
    const guardada = await saveVenta(ventaData, esNueva);
    await cargarDatos();
    mostrarToast(`Factura #${guardada.numeroFactura} emitida y stock descontado.`);
    setVentaParaEditar(null);
    return guardada;
  };

  const handleRegistrarAbono = async (ventaId: string, pagoData: Omit<PagoVenta, 'id'>) => {
    const vta = await registrarPagoVenta(ventaId, pagoData);
    await cargarDatos();
    mostrarToast(
      `Abono de $ ${pagoData.monto.toLocaleString()} registrado. Saldo restante: $ ${vta.saldoPendiente.toLocaleString()}.`
    );
  };

  const handleAnularVenta = async (ventaId: string, revertirStock: boolean) => {
    const vta = await anularVenta(ventaId, revertirStock);
    await cargarDatos();
    mostrarToast(
      `Factura #${vta.numeroFactura} anulada.${revertirStock ? ' Artículos devueltos al inventario.' : ''}`
    );
  };

  // Handlers Configuración y Base de Datos
  const handleGuardarConfiguracion = async (config: ConfiguracionTaller) => {
    await saveConfiguracion(config);
    setConfiguracion(config);
    mostrarToast('Datos comerciales del taller actualizados.');
  };

  const handleExportarJSON = async () => {
    const json = await exportarBaseDatosJSON();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup_mototaller_pos_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    mostrarToast('Copia de seguridad descargada exitosamente.');
  };

  const handleImportarJSON = async (jsonStr: string) => {
    await importarBaseDatosJSON(jsonStr);
    await cargarDatos();
    mostrarToast('Base de datos restaurada correctamente desde el archivo JSON.');
  };

  const handleCargarDemo = async () => {
    const res = await cargarDatosDemo();
    await cargarDatos();
    mostrarToast(
      `Demo cargada: ${res.productos} productos/herramientas, ${res.clientes} clientes y ${res.ventas} facturas de muestra.`
    );
  };

  const handleLimpiarBaseDatos = async () => {
    await limpiarTodaLaBaseDatos();
    await cargarDatos();
    setSeccionActual('dashboard');
    mostrarToast('Base de datos reiniciada. Almacenamiento limpio.', 'info');
  };

  // Conteos para los badges del menú
  const conteos = {
    clientes: clientes.filter((c) => c.activo).length,
    productos: productos.filter((p) => p.activo).length,
    stockBajo: productos.filter((p) => p.activo && p.stock <= p.stockMinimo).length,
    ventasPendientes: ventas.filter((v) => v.estado === 'pendiente_pago').length,
    servicios: ventas.length,
    movimientos: movimientos.length,
  };

  return (
    <div className="flex min-h-screen bg-zinc-950 text-zinc-100 selection:bg-red-600 selection:text-white">
      {/* Toast Notification Popup */}
      {toast.show && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl border transition-all animate-in fade-in duration-200 no-print max-w-md bg-zinc-900 border-zinc-700 text-zinc-100">
          {toast.tipo === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />}
          {toast.tipo === 'error' && <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />}
          {toast.tipo === 'info' && <Info className="w-5 h-5 text-blue-400 shrink-0" />}
          <span className="text-xs font-medium leading-relaxed">{toast.mensaje}</span>
        </div>
      )}

      {/* Desktop Sidebar */}
      <div className="hidden lg:block shrink-0">
        <Sidebar
          seccionActual={seccionActual}
          onCambiarSeccion={(sec) => {
            setVentaParaEditar(null);
            setSeccionActual(sec);
          }}
          nombreTaller={configuracion.nombreTaller}
          conteos={conteos}
        />
      </div>

      {/* Mobile Drawer Backdrop */}
      {sidebarMobileOpen && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-xs z-40 lg:hidden no-print"
          onClick={() => setSidebarMobileOpen(false)}
        />
      )}

      {/* Mobile Sidebar Drawer */}
      <div
        className={`fixed top-0 bottom-0 left-0 z-50 w-72 bg-zinc-950 transform transition-transform duration-200 ease-in-out lg:hidden no-print ${
          sidebarMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-4 flex items-center justify-between border-b border-zinc-800">
          <span className="text-sm font-bold text-zinc-100">Menú de Navegación</span>
          <button
            onClick={() => setSidebarMobileOpen(false)}
            className="p-1.5 text-zinc-400 hover:text-zinc-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <Sidebar
          seccionActual={seccionActual}
          onCambiarSeccion={(sec) => {
            setVentaParaEditar(null);
            setSeccionActual(sec);
            setSidebarMobileOpen(false);
          }}
          nombreTaller={configuracion.nombreTaller}
          conteos={conteos}
        />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Header Bar */}
        <div className="lg:hidden h-14 bg-zinc-950 border-b border-zinc-800 px-4 flex items-center justify-between no-print">
          <button
            onClick={() => setSidebarMobileOpen(true)}
            className="p-2 text-zinc-400 hover:text-zinc-100"
          >
            <Menu className="w-6 h-6" />
          </button>
          <span className="text-sm font-bold text-white tracking-wide">MOTOMOTO S&E</span>
          <button
            onClick={() => {
              setVentaParaEditar(null);
              setSeccionActual('pos_ventas');
            }}
            className="px-2.5 py-1 text-xs font-semibold text-white bg-red-600 rounded-md flex items-center gap-1"
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            <span>POS</span>
          </button>
        </div>

        {/* Global Desktop Header */}
        <Header
          seccionActual={seccionActual}
          onNuevaVentaRapida={() => {
            setVentaParaEditar(null);
            setSeccionActual('pos_ventas');
          }}
          onCargarDemo={handleCargarDemo}
          onRefrescar={cargarDatos}
          isCargando={cargando}
        />

        {/* Main View Router */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          {seccionActual === 'dashboard' && (
            <DashboardView
              clientes={clientes}
              productos={productos}
              ventas={ventas}
              onCambiarSeccion={(sec) => setSeccionActual(sec)}
              onVerFactura={(v) => setFacturaSeleccionada(v)}
              onEditarProducto={() => setSeccionActual('productos')}
              onNuevaVenta={() => {
                setVentaParaEditar(null);
                setSeccionActual('pos_ventas');
              }}
            />
          )}

          {seccionActual === 'pos_ventas' && (
            <PuntoDeVentaView
              productos={productos}
              clientes={clientes}
              ventaParaEditar={ventaParaEditar}
              prefijoFactura={configuracion.prefijoFactura || 'FAC'}
              siguienteNumeroFactura={configuracion.siguienteNumeroFactura || 1}
              onEmitirVenta={handleEmitirVenta}
              onGuardarClienteRapido={async (cli) => {
                const nuevo = await saveCliente(cli);
                await cargarDatos();
                return nuevo;
              }}
              onVerFacturaModal={(v) => {
                setFacturaSeleccionada(v);
              }}
              onCancelarEdicion={() => {
                setVentaParaEditar(null);
                setSeccionActual('historial_ventas');
              }}
            />
          )}

          {seccionActual === 'historial_ventas' && (
            <HistorialVentasView
              ventas={ventas}
              configuracion={configuracion}
              onRegistrarAbono={handleRegistrarAbono}
              onAnularVenta={handleAnularVenta}
              onNuevaVenta={() => {
                setVentaParaEditar(null);
                setSeccionActual('pos_ventas');
              }}
            />
          )}

          {seccionActual === 'clientes' && (
            <ClientesView
              clientes={clientes}
              servicios={ventas}
              onGuardarCliente={handleGuardarCliente}
              onToggleActivo={handleToggleClienteActivo}
              onVerServicio={(v) => setFacturaSeleccionada(v)}
              onNuevoServicioConCliente={(c) => {
                setVentaParaEditar(null);
                setSeccionActual('pos_ventas');
              }}
            />
          )}

          {seccionActual === 'productos' && (
            <ProductosView
              productos={productos}
              movimientos={movimientos}
              onGuardarProducto={handleGuardarProducto}
              onToggleActivo={handleToggleProductoActivo}
              onAjustarStock={handleAjustarStock}
            />
          )}

          {seccionActual === 'inventario' && (
            <InventarioView
              productos={productos}
              movimientos={movimientos}
              onAjustarStock={handleAjustarStock}
              onIrAProductos={() => setSeccionActual('productos')}
            />
          )}

          {seccionActual === 'reportes' && (
            <ReportesView
              ventas={ventas}
              productos={productos}
              clientes={clientes}
            />
          )}

          {seccionActual === 'configuracion' && (
            <ConfiguracionView
              configuracion={configuracion}
              onGuardarConfiguracion={handleGuardarConfiguracion}
              onExportarJSON={handleExportarJSON}
              onImportarJSON={handleImportarJSON}
              onCargarDemo={handleCargarDemo}
              onLimpiarBaseDatos={handleLimpiarBaseDatos}
              conteos={conteos}
            />
          )}
        </main>
      </div>

      {/* Modal Factura / Ticket Global */}
      {facturaSeleccionada && (
        <FacturaModal
          isOpen={!!facturaSeleccionada}
          onClose={() => setFacturaSeleccionada(null)}
          venta={facturaSeleccionada}
          configuracion={configuracion}
        />
      )}
    </div>
  );
}
