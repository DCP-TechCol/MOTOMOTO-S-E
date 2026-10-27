const { app, BrowserWindow, ipcMain, shell, Menu } = require('electron');
const path = require('path');
const storage = require('./storage.cjs');

let mainWindow = null;

function createWindow() {
  const userDataPath = app.getPath('userData');
  storage.initStorage(userDataPath);

  mainWindow = new BrowserWindow({
    width: 1366,
    height: 868,
    minWidth: 1024,
    minHeight: 700,
    backgroundColor: '#09090b',
    title: 'MotoTaller Pro - Gestión de Taller y Herramientas',
    icon: path.join(__dirname, '../public/assets/aistudio/image_b67a324e.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  // App menu
  const menuTemplate = [
    {
      label: 'Archivo',
      submenu: [
        {
          label: 'Abrir Carpeta de Datos Locales',
          click: () => {
            shell.openPath(app.getPath('userData'));
          },
        },
        { type: 'separator' },
        {
          label: 'Salir',
          accelerator: 'CmdOrCtrl+Q',
          click: () => {
            app.quit();
          },
        },
      ],
    },
    {
      label: 'Ver',
      submenu: [
        { label: 'Recargar', accelerator: 'CmdOrCtrl+R', click: () => mainWindow.reload() },
        { label: 'Pantalla Completa', accelerator: 'F11', click: () => mainWindow.setFullScreen(!mainWindow.isFullScreen()) },
        {
          label: 'Herramientas de Desarrollador',
          accelerator: 'CmdOrCtrl+Shift+I',
          click: () => mainWindow.webContents.toggleDevTools(),
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(menuTemplate);
  Menu.setApplicationMenu(menu);

  const devUrl = process.env.VITE_DEV_SERVER_URL;
  if (devUrl) {
    mainWindow.loadURL(devUrl);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Single instance lock
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    setupIPCHandlers();
    createWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

function setupIPCHandlers() {
  // Database handlers
  ipcMain.handle('db:get-all', async () => {
    return storage.getAll();
  });

  ipcMain.handle('db:save-cliente', async (_, cliente) => {
    return storage.saveCliente(cliente);
  });

  ipcMain.handle('db:toggle-cliente-activo', async (_, id) => {
    return storage.toggleClienteActivo(id);
  });

  ipcMain.handle('db:delete-cliente', async (_, id) => {
    return storage.deleteCliente(id);
  });

  ipcMain.handle('db:save-producto', async (_, producto) => {
    return storage.saveProducto(producto);
  });

  ipcMain.handle('db:toggle-producto-activo', async (_, id) => {
    return storage.toggleProductoActivo(id);
  });

  ipcMain.handle('db:delete-producto', async (_, id) => {
    return storage.deleteProducto(id);
  });

  ipcMain.handle('db:ajustar-stock', async (_, { productoId, tipo, cantidad, motivo }) => {
    return storage.ajustarStock(productoId, tipo, cantidad, motivo);
  });

  ipcMain.handle('db:save-venta', async (_, { venta, esNueva }) => {
    return storage.saveVenta(venta, esNueva);
  });

  ipcMain.handle('db:anular-venta', async (_, { id, revertirStock }) => {
    return storage.anularVenta(id, revertirStock);
  });

  ipcMain.handle('db:registrar-pago-venta', async (_, { ventaId, pagoData }) => {
    return storage.registrarPagoVenta(ventaId, pagoData);
  });

  ipcMain.handle('db:save-configuracion', async (_, config) => {
    return storage.saveConfiguracion(config);
  });

  ipcMain.handle('db:importar-json', async (_, jsonStr) => {
    return storage.importarBaseDatosJSON(jsonStr);
  });

  ipcMain.handle('db:exportar-json', async () => {
    return storage.exportarBaseDatosJSON();
  });

  ipcMain.handle('db:limpiar-db', async () => {
    return storage.limpiarBaseDatos();
  });

  ipcMain.handle('db:migrate-from-indexeddb', async (_, data) => {
    return storage.migrateFromIndexedDB(data);
  });

  // System handlers
  ipcMain.handle('system:open-user-data-folder', async () => {
    const userData = app.getPath('userData');
    await shell.openPath(userData);
    return userData;
  });

  ipcMain.on('window:minimize', () => {
    if (mainWindow) mainWindow.minimize();
  });

  ipcMain.on('window:maximize', () => {
    if (mainWindow) {
      if (mainWindow.isMaximized()) mainWindow.unmaximize();
      else mainWindow.maximize();
    }
  });

  ipcMain.on('window:close', () => {
    if (mainWindow) mainWindow.close();
  });
}
