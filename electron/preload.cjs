const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  platform: process.platform,
  appVersion: '1.0.0',
  db: {
    getAll: () => ipcRenderer.invoke('db:get-all'),
    saveCliente: (cliente) => ipcRenderer.invoke('db:save-cliente', cliente),
    toggleClienteActivo: (id) => ipcRenderer.invoke('db:toggle-cliente-activo', id),
    deleteCliente: (id) => ipcRenderer.invoke('db:delete-cliente', id),
    saveProducto: (producto) => ipcRenderer.invoke('db:save-producto', producto),
    toggleProductoActivo: (id) => ipcRenderer.invoke('db:toggle-producto-activo', id),
    deleteProducto: (id) => ipcRenderer.invoke('db:delete-producto', id),
    ajustarStock: (params) => ipcRenderer.invoke('db:ajustar-stock', params),
    saveVenta: (params) => ipcRenderer.invoke('db:save-venta', params),
    anularVenta: (params) => ipcRenderer.invoke('db:anular-venta', params),
    registrarPagoVenta: (params) => ipcRenderer.invoke('db:registrar-pago-venta', params),
    saveConfiguracion: (config) => ipcRenderer.invoke('db:save-configuracion', config),
    importarBaseDatosJSON: (jsonStr) => ipcRenderer.invoke('db:importar-json', jsonStr),
    exportarBaseDatosJSON: () => ipcRenderer.invoke('db:exportar-json'),
    cargarDatosDemo: () => ipcRenderer.invoke('db:cargar-demo'),
    limpiarBaseDatos: () => ipcRenderer.invoke('db:limpiar-db'),
    migrateFromIndexedDB: (data) => ipcRenderer.invoke('db:migrate-from-indexeddb', data),
  },
  system: {
    openUserDataFolder: () => ipcRenderer.invoke('system:open-user-data-folder'),
    minimizeWindow: () => ipcRenderer.send('window:minimize'),
    maximizeWindow: () => ipcRenderer.send('window:maximize'),
    closeWindow: () => ipcRenderer.send('window:close'),
  },
});
