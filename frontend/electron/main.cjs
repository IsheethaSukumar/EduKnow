const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const axios = require('axios');

let mainWindow;
let backendProcess;

function createMainWindow() {
    mainWindow = new BrowserWindow({
        width: 1280,
        height: 800,
        show: false, // Don't show the window until it's ready
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false, // Simplified for now, consider improving security later
        }
    });

    // Determine if we're in development or production
    const isDev = !app.isPackaged;

    if (isDev) {
        mainWindow.loadURL('http://localhost:5173');
        mainWindow.webContents.openDevTools();
    } else {
        mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    }

    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

function startBackend() {
    const isDev = !app.isPackaged;
    let backendPath;

    if (isDev) {
        // In dev, we use the local python launcher
        backendPath = 'py'; // Or 'python' depending on environment
        const backendArgs = [path.join(__dirname, '../../backend/launcher.py')];
        backendProcess = spawn(backendPath, backendArgs);
    } else {
        // In production, we run the bundled .exe
        backendPath = path.join(process.resourcesPath, 'backend', 'launcher.exe');
        backendProcess = spawn(backendPath);
    }

    backendProcess.stdout.on('data', (data) => {
        console.log(`Backend: ${data}`);
    });

    backendProcess.stderr.on('data', (data) => {
        console.error(`Backend Error: ${data}`);
    });
}

// Ensure backend is reachable before showing the UI
async function waitForBackend(url, timeout = 30000) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
        try {
            await axios.get(url);
            return true;
        } catch (e) {
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }
    return false;
}

app.whenReady().then(async () => {
    console.log("Starting backend...");
    startBackend();

    console.log("Waiting for backend health check...");
    const isReady = await waitForBackend('http://127.0.0.1:8000/api/health');

    if (isReady) {
        console.log("Backend is ready!");
        createMainWindow();
    } else {
        console.error("Backend failed to start in time.");
        app.quit();
    }
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('quit', () => {
    // Kill the backend process on exit
    if (backendProcess) {
        backendProcess.kill();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createMainWindow();
    }
});
