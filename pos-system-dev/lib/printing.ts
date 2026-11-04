// Centralized printing abstraction. This avoids hard dependencies on native modules
// during serverless/edge deploys (e.g. Vercel) and lets us fall back gracefully.
// Native packages (like legacy 'printer') MUST be optional.

export interface PrintJobOptions {
  content: string;
  copies?: number;
  printerName?: string;
  mode?: 'system' | 'thermal' | 'network';
  raw?: boolean; // if true, send raw bytes/string directly
}

export interface PrintJobResult {
  success: boolean;
  jobId?: string;
  warning?: string;
  error?: string;
}

// Attempt dynamic import of legacy printer lib
async function loadLegacyPrinter(): Promise<any | null> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('printer');
    return mod;
  } catch (_e) {
    return null; // not installed or failed to build (expected in serverless)
  }
}

// Example: Using escpos stack already in dependencies
async function loadEscpos(): Promise<any | null> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const escpos = require('escpos');
    return escpos;
  } catch (_e) {
    return null;
  }
}

export async function submitPrintJob(opts: PrintJobOptions): Promise<PrintJobResult> {
  const { content, copies = 1, printerName, mode = 'system', raw } = opts;

  // Prefer escpos for thermal receipts
  if (mode === 'thermal') {
    const escpos = await loadEscpos();
    if (escpos) {
      try {
        // Auto-select interface (USB) if available
        let device: any;
        try {
          device = new escpos.USB();
        } catch (_usbErr) {
          // Fallback to mock
          return {
            success: false,
            warning: 'ESC/POS USB interface not available in this environment',
            error: 'No USB device'
          };
        }
        const printer = new escpos.Printer(device);
        return await new Promise<PrintJobResult>((resolve) => {
          device.open(async () => {
            try {
              printer.text(content);
              if (!raw) printer.cut();
              printer.close();
              resolve({ success: true, jobId: `escpos_${Date.now()}` });
            } catch (e: any) {
              resolve({ success: false, error: e?.message || 'ESC/POS print failed' });
            }
          });
        });
      } catch (e: any) {
        return { success: false, error: e?.message || 'ESC/POS error' };
      }
    }
  }

  // Legacy system printer path
  if (mode === 'system') {
    const legacy = await loadLegacyPrinter();
    if (legacy) {
      try {
        return await new Promise<PrintJobResult>((resolve) => {
          legacy.printDirect({
            data: content,
            printer: printerName,
            type: raw ? 'RAW' : 'TEXT',
            success: (jobId: number) => resolve({ success: true, jobId: `printer_${jobId}` }),
            error: (err: Error) => resolve({ success: false, error: err.message })
          });
        });
      } catch (e: any) {
        return { success: false, error: e?.message || 'Legacy printer failure' };
      }
    }
    return {
      success: false,
      warning: 'Legacy native printer module unavailable (not installed or failed to build).',
      error: 'Printer module not present'
    };
  }

  // Network printing (raw socket / IPP) placeholder
  if (mode === 'network') {
    // Placeholder: integrate ipp or raw socket here
    return {
      success: false,
      warning: 'Network printer implementation pending',
    };
  }

  return { success: false, error: 'Unsupported print mode' };
}

export async function listSystemPrinters(): Promise<{ name: string; isDefault?: boolean }[]> {
  const legacy = await loadLegacyPrinter();
  if (legacy && typeof legacy.getPrinters === 'function') {
    try {
      const printers = legacy.getPrinters();
      return printers.map((p: any) => ({ name: p.name, isDefault: p.isDefault }));
    } catch (_e) {
      return [];
    }
  }
  return [];
}
