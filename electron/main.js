import { app, BrowserWindow } from 'electron';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
let mainWindow = null;
let backendLoaded = false;
const APP_PORT = process.env.PORT || '3001';

async function waitForBackend(timeoutMs = 10000) {
  const deadline = Date.now() + timeoutMs;
  const healthUrl = `http://127.0.0.1:${APP_PORT}/api/health`;

  while (Date.now() < deadline) {
    try {
      const res = await fetch(healthUrl);
      if (res.ok) return;
    } catch (_) {
      // Server is still starting.
    }
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  throw new Error(`Backend did not become healthy within ${timeoutMs}ms`);
}

async function ensureBackendLoaded() {
  if (backendLoaded) return;

  // Use a writable location in packaged apps (and dev Electron runs).
  process.env.POKER_GRAPH_DATA_DIR = path.join(app.getPath('userData'), 'data');
  process.env.PORT = APP_PORT;
  process.env.POKER_GRAPH_ELECTRON = '1';
  process.env.POKER_GRAPH_DIST_DIR = path.join(path.resolve(__dirname, '..'), 'dist');

  const rootDir = path.resolve(__dirname, '..');
  const serverEntry = path.join(rootDir, 'server', 'index.js');
  await import(pathToFileURL(serverEntry).href);
  await waitForBackend();
  backendLoaded = true;
}

async function createMainWindow() {
  await ensureBackendLoaded();

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    backgroundColor: '#0b1220',
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  const devUrl = process.env.ELECTRON_RENDERER_URL;
  if (devUrl) {
    await mainWindow.loadURL(devUrl);
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    await mainWindow.loadURL(`http://127.0.0.1:${APP_PORT}`);
  }

  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
    console.error(`Renderer failed to load (${errorCode}): ${errorDescription} at ${validatedURL}`);
  });

  mainWindow.webContents.on('render-process-gone', (_event, details) => {
    console.error('Renderer process gone:', details);
  });

  mainWindow.once('ready-to-show', () => {
    if (mainWindow) {
      mainWindow.show();
    }
  });

  if (!app.isPackaged && !devUrl) {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  try {
    await createMainWindow();
  } catch (err) {
    console.error('Failed to start application:', err);
    app.quit();
  }

  app.on('activate', async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      await createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
