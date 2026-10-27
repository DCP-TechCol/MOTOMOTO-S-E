# MotoTaller Pro - Guía de Ejecución y Generación de Instalador Windows (.exe)

Esta aplicación de gestión de inventario y punto de venta para talleres y venta de repuestos/herramientas ha sido adaptada para funcionar de forma nativa como aplicación de escritorio para Windows utilizando **Electron**.

---

## 🚀 Características Principales

1. **Acceso directo en el Escritorio**: El instalador de Windows (NSIS) crea automáticamente accesos directos en el Escritorio y en el Menú Inicio.
2. **100% Offline (Sin Conexión)**: No requiere internet, servidores externos, ni servicios en la nube para inventario, facturación ni reportes.
3. **Persistencia Local Segura**: Los datos se almacenan en un archivo local atómico en tu disco duro (`%APPDATA%\MotoTaller Pro\mototaller_db.json`) protegiendo cada registro contra caídas de energía o cierres inesperados.
4. **Sin XAMPP ni MySQL**: Todo el motor de datos es autónomo y no requiere instalar servidores pesados.
5. **Migración Automática**: Si ya tenías datos guardados en el navegador (IndexedDB), la aplicación los detecta e importa automáticamente al disco en el primer inicio.
6. **Seguridad Electron**: Configurada con `contextIsolation: true`, `nodeIntegration: false`, Content Security Policy (CSP) y puente IPC tipado mediante `contextBridge`.

---

## 💻 Requisitos en Windows

- **Sistema Operativo**: Windows 10 o Windows 11 (64 bits).
- **Node.js**: Versión 20 o 22 LTS (descárgalo de [nodejs.org](https://nodejs.org/)).

---

## 🛠️ Instrucciones de Prueba y Desarrollo en Windows

1. **Descargar / Clonar el repositorio** en tu equipo con Windows.
2. Abrir la terminal (PowerShell o CMD) en la carpeta del proyecto.
3. Instalar las dependencias:
   ```bash
   npm install
   ```
4. **Modo Desarrollo con Electron**:
   - En una primera terminal, inicia el servidor Vite:
     ```bash
     npm run dev
     ```
   - En una segunda terminal, abre la ventana de Electron conectada a tu servidor:
     ```bash
     npm run electron:dev
     ```
   - O ejecuta la aplicación empaquetada directamente con `npm run electron:start` una vez compilada.

---

## 📦 Generar el Instalador de Windows (.exe)

Para crear el archivo instalador oficial para Windows:

1. Ejecuta el comando de compilación y empaquetado:
   ```bash
   npm run build:win
   ```
   *Este comando compilará el frontend con Vite y empaquetará el instalador con `electron-builder`.*

2. Al terminar, encontrarás los archivos generados en la carpeta **`release/`**:
   - **`MotoTaller Pro Setup 1.0.0.exe`**: Instalador clásico con asistente de instalación, creación de acceso directo en el escritorio y desinstalador.
   - **`MotoTaller Pro 1.0.0.exe`** (si usas `npm run build:portable`): Versión portable que se ejecuta de inmediato sin necesidad de instalar.

---

## 📂 Ubicación de la Base de Datos en Windows

La base de datos local y los respaldos se guardan en la carpeta de datos de usuario de Windows:

```
C:\Users\<TuUsuario>\AppData\Roaming\MotoTaller Pro\mototaller_db.json
```

Puedes abrir esta carpeta en cualquier momento directamente desde la aplicación:
- Haciendo clic en el botón **"Datos Locales"** en la barra superior (Header).
- O desde la sección **Configuración y Respaldo Local** > **"Abrir Carpeta"**.
- O desde el menú de la ventana: **Archivo > Abrir Carpeta de Datos Locales**.
