import React, { useState, useRef } from 'react';
import {
  Settings,
  HardDrive,
  Download,
  Upload,
  Sparkles,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Database,
  Save,
  ShieldCheck,
  Building2,
  FolderOpen,
} from 'lucide-react';
import { ConfiguracionTaller } from '../../types';
import { ConfirmDialog } from '../common/ConfirmDialog';

interface ConfiguracionViewProps {
  configuracion: ConfiguracionTaller;
  onGuardarConfiguracion: (config: ConfiguracionTaller) => Promise<void>;
  onExportarJSON: () => Promise<void>;
  onImportarJSON: (jsonStr: string) => Promise<void>;
  onCargarDemo: () => Promise<void>;
  onLimpiarBaseDatos: () => Promise<void>;
  conteos: {
    clientes: number;
    productos: number;
    servicios: number;
    movimientos: number;
  };
}

export const ConfiguracionView: React.FC<ConfiguracionViewProps> = ({
  configuracion,
  onGuardarConfiguracion,
  onExportarJSON,
  onImportarJSON,
  onCargarDemo,
  onLimpiarBaseDatos,
  conteos,
}) => {
  const [formData, setFormData] = useState<ConfiguracionTaller>({ ...configuracion });
  const [guardando, setGuardando] = useState(false);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);
  const [mensajeError, setMensajeError] = useState<string | null>(null);

  // Dialogs
  const [confirmLimpiarOpen, setConfirmLimpiarOpen] = useState(false);
  const [confirmDemoOpen, setConfirmDemoOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleGuardar = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setGuardando(true);
      setMensajeError(null);
      await onGuardarConfiguracion(formData);
      setMensajeExito('Datos del taller guardados exitosamente en la configuración local.');
      setTimeout(() => setMensajeExito(null), 4000);
    } catch (err: unknown) {
      setMensajeError((err as Error).message || 'Error al guardar la configuración.');
    } finally {
      setGuardando(false);
    }
  };

  const handleSeleccionarArchivo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        await onImportarJSON(text);
        setMensajeExito('Copia de seguridad restaurada correctamente en IndexedDB.');
        setTimeout(() => setMensajeExito(null), 4000);
      } catch (err: unknown) {
        setMensajeError((err as Error).message || 'El archivo seleccionado no es válido.');
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Notifications */}
      {mensajeExito && (
        <div className="p-4 bg-emerald-950/70 border border-emerald-800 rounded-xl flex items-center gap-3 text-xs text-emerald-300">
          <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
          <span>{mensajeExito}</span>
        </div>
      )}

      {mensajeError && (
        <div className="p-4 bg-red-950/70 border border-red-800 rounded-xl flex items-center gap-3 text-xs text-red-300">
          <AlertCircle className="w-5 h-5 shrink-0 text-red-400" />
          <span>{mensajeError}</span>
        </div>
      )}

      {/* Formulario Datos del Negocio */}
      <form onSubmit={handleGuardar} className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-red-500" />
            <div>
              <h3 className="text-sm font-semibold text-zinc-100">Datos Comerciales del Taller</h3>
              <p className="text-xs text-zinc-400">Información visible en comprobantes impresos y recibos</p>
            </div>
          </div>
          <button
            type="submit"
            disabled={guardando}
            className="px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-500 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm shadow-red-900/40"
          >
            <Save className="w-4 h-4" />
            <span>{guardando ? 'Guardando...' : 'Guardar Datos'}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1">Nombre del Taller / Negocio</label>
            <input
              type="text"
              required
              value={formData.nombreTaller}
              onChange={(e) => setFormData((prev) => ({ ...prev, nombreTaller: e.target.value }))}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-red-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1">NIT / Cédula / Identificación Tributaria</label>
            <input
              type="text"
              value={formData.nit}
              onChange={(e) => setFormData((prev) => ({ ...prev, nit: e.target.value }))}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-red-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1">Teléfono / WhatsApp</label>
            <input
              type="text"
              value={formData.telefono}
              onChange={(e) => setFormData((prev) => ({ ...prev, telefono: e.target.value }))}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-red-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1">Ciudad / Municipio</label>
            <input
              type="text"
              value={formData.ciudad}
              onChange={(e) => setFormData((prev) => ({ ...prev, ciudad: e.target.value }))}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-red-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1">Prefijo de Facturas y Ventas</label>
            <input
              type="text"
              value={formData.prefijoFactura || formData.prefijoServicio || 'FAC'}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  prefijoFactura: e.target.value.toUpperCase(),
                  prefijoServicio: e.target.value.toUpperCase(),
                }))
              }
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs font-mono font-bold text-zinc-100 uppercase focus:outline-none focus:border-red-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-zinc-300 mb-1">Dirección del Taller</label>
          <input
            type="text"
            value={formData.direccion}
            onChange={(e) => setFormData((prev) => ({ ...prev, direccion: e.target.value }))}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-red-500"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-zinc-300 mb-1">
            Pie de Página del Comprobante (Garantías, Términos y Agradecimiento)
          </label>
          <textarea
            rows={2}
            value={formData.piePaginaRecibo}
            onChange={(e) => setFormData((prev) => ({ ...prev, piePaginaRecibo: e.target.value }))}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-red-500 resize-none"
          />
        </div>
      </form>

      {/* Almacenamiento Local Offline & Respaldo */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-zinc-800 gap-2">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="text-sm font-semibold text-zinc-100">
                {typeof window !== 'undefined' && Boolean(window.electronAPI?.isElectron)
                  ? 'Almacenamiento Local de Escritorio (Disco Duro / %APPDATA%)'
                  : 'Almacenamiento Local en IndexedDB'}
              </h3>
              <p className="text-xs text-zinc-400">
                {typeof window !== 'undefined' && Boolean(window.electronAPI?.isElectron)
                  ? 'Base de datos persistente en mototaller_db.json en tu disco local'
                  : 'Estado de tu base de datos offline, respaldos y utilidades'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {typeof window !== 'undefined' && Boolean(window.electronAPI?.isElectron) && (
              <button
                type="button"
                onClick={() => window.electronAPI?.system?.openUserDataFolder?.()}
                className="px-2.5 py-1 text-xs text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 rounded-md border border-zinc-700 flex items-center gap-1.5 transition-colors"
                title="Abrir carpeta de datos en el Explorador de Windows"
              >
                <FolderOpen className="w-3.5 h-3.5 text-amber-400" />
                <span>Abrir Carpeta</span>
              </button>
            )}
            <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
              100% Sin Internet
            </span>
          </div>
        </div>

        {/* Resumen de registros guardados */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3 bg-zinc-950/70 border border-zinc-800 rounded-lg">
            <span className="text-zinc-500 text-[11px] block">Clientes Registrados:</span>
            <span className="text-lg font-mono font-bold text-zinc-100 mt-1 block">{conteos.clientes}</span>
          </div>
          <div className="p-3 bg-zinc-950/70 border border-zinc-800 rounded-lg">
            <span className="text-zinc-500 text-[11px] block">Catálogo Productos:</span>
            <span className="text-lg font-mono font-bold text-zinc-100 mt-1 block">{conteos.productos}</span>
          </div>
          <div className="p-3 bg-zinc-950/70 border border-zinc-800 rounded-lg">
            <span className="text-zinc-500 text-[11px] block">Facturas y Ventas:</span>
            <span className="text-lg font-mono font-bold text-zinc-100 mt-1 block">{conteos.servicios}</span>
          </div>
          <div className="p-3 bg-zinc-950/70 border border-zinc-800 rounded-lg">
            <span className="text-zinc-500 text-[11px] block">Movimientos Kardex:</span>
            <span className="text-lg font-mono font-bold text-zinc-100 mt-1 block">{conteos.movimientos}</span>
          </div>
        </div>

        {/* Backup & Restore Buttons */}
        <div className="p-4 bg-zinc-950/50 border border-zinc-800/80 rounded-xl space-y-3">
          <h4 className="text-xs font-semibold text-zinc-300">Respaldo y Recuperación de Datos</h4>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Puedes exportar toda la base de datos a un archivo <code>.json</code> en tu disco duro para guardar copias de seguridad de tu negocio o transferir los datos a otro equipo.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              onClick={onExportarJSON}
              className="px-4 py-2 text-xs font-semibold text-zinc-100 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors flex items-center gap-2 border border-zinc-700"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              <span>Descargar Copia de Seguridad (.json)</span>
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 text-xs font-semibold text-zinc-100 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors flex items-center gap-2 border border-zinc-700"
            >
              <Upload className="w-4 h-4 text-blue-400" />
              <span>Restaurar Copia desde Archivo</span>
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleSeleccionarArchivo}
              accept=".json"
              className="hidden"
            />
          </div>
        </div>

        {/* Carga de Datos Demo y Reset */}
        <div className="pt-2 border-t border-zinc-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div>
            <h4 className="text-xs font-semibold text-zinc-300">Poblado de Datos y Mantenimiento</h4>
            <p className="text-[11px] text-zinc-400">
              Herramientas para demostración o reinicio completo de almacenamiento
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setConfirmDemoOpen(true)}
              className="px-3.5 py-2 text-xs font-medium text-amber-300 bg-amber-950/60 hover:bg-amber-900/60 border border-amber-800/60 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <Sparkles className="w-4 h-4" />
              <span>Cargar Datos Demo</span>
            </button>

            <button
              onClick={() => setConfirmLimpiarOpen(true)}
              className="px-3.5 py-2 text-xs font-medium text-red-400 bg-red-950/60 hover:bg-red-900/60 border border-red-800/60 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <Trash2 className="w-4 h-4" />
              <span>Limpiar Base de Datos</span>
            </button>
          </div>
        </div>
      </div>

      {/* Confirmación Limpiar BD */}
      <ConfirmDialog
        isOpen={confirmLimpiarOpen}
        onClose={() => setConfirmLimpiarOpen(false)}
        onConfirm={async () => {
          await onLimpiarBaseDatos();
          setMensajeExito('Se han borrado todos los datos de IndexedDB.');
        }}
        title="¿Limpiar toda la base de datos?"
        message="Esta acción eliminará todos los clientes, productos, inventario y servicios guardados en el navegador. Esta acción es irreversible a menos que tengas un archivo de respaldo."
        confirmText="Sí, vaciar base de datos"
        isDestructive={true}
      />

      {/* Confirmación Cargar Demo */}
      <ConfirmDialog
        isOpen={confirmDemoOpen}
        onClose={() => setConfirmDemoOpen(false)}
        onConfirm={async () => {
          await onCargarDemo();
          setMensajeExito('Datos de prueba cargados exitosamente (clientes, herramientas, aceites y servicios).');
        }}
        title="¿Cargar datos de demostración?"
        message="Se incorporarán herramientas de taller (torquímetros, extractores), lubricantes (Motul), repuestos (bujías NGK, pastillas Brembo), clientes con motos registradas y servicios de muestra."
        confirmText="Cargar datos demo"
        isDestructive={false}
      />
    </div>
  );
};
