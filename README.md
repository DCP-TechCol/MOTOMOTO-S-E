💻 Pasos Exactos para Probar y Generar tu Instalador en Windows. Abre la terminal en la carpeta de tu proyecto en tu equipo Windows:
Paso 1: Probar en modo escritorio (Desarrollo)
npm run electron:dev
Se abrirá la ventana de escritorio de MotoTaller Pro con las herramientas de desarrollo habilitadas.

Paso 2: Generar el instalador .exe de Windows
npm run electron:build

📦 Resultado en la Carpeta /release
Una vez finalizada la compilación, encontrarás los siguientes archivos listos para usar y distribuir en tu taller:

MotoTaller Pro Setup 1.0.0.exe (Instalador Oficial NSIS):
* Asistente de instalación en español.
* Crea automáticamente el acceso directo en el Escritorio y en el Menú Inicio.
* Se abre con doble clic sin necesidad de abrir ningún navegador.
* Incluye desinstalador en el Panel de Control de Windows.

MotoTaller Pro 1.0.0.exe (Versión Portable):
* Ejecutable directo sin instalación (ideal para llevar en una memoria USB).
Toda la documentación detallada quedó además guardada en el archivo README_WINDOWS_INSTALLER.md en la raíz del proyecto.
