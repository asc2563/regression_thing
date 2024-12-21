import { app, BrowserWindow, ipcMain, IpcMainEvent, IpcMainInvokeEvent, Menu } from 'electron';
import path from 'path';
import { promises as fs } from 'fs';
import { ChildProcessWithoutNullStreams } from 'child_process';

// Type for file write operation data
interface FileWriteData {
  path: string;
  content: string;
}

// Type for file rename operation data
interface FileRenameData {
  oldPath: string;
  newPath: string;
}

// Type for file/directory details
interface FileDetails {
  name: string;
  path: string;
  isDirectory: boolean;
  size: number;
  created: Date;
  modified: Date;
  extension: string;
  type: 'file' | 'directory';
}

// Global variables with explicit typing
let powershell: ChildProcessWithoutNullStreams | null = null;

// Electron-specific environment variables (added type safety)
declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string | undefined;
declare const MAIN_WINDOW_VITE_NAME: string;

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

const createWindow = (): void => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Load the index.html of the app.
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`));
  }

  // Define menu template
  const menuTemplate: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'File',
      submenu: [
        { role: 'quit' }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' }
      ]
    },
    {
      label: 'analysis', // New button label
      submenu: [
        {
          label: 'Regression',
          click: () => {
            console.log('Do Regression thingy');
          }
        }
      ]
    }
  ];

  // Set application menu
  const menu = Menu.buildFromTemplate(menuTemplate);
  Menu.setApplicationMenu(menu);
};

// File system write operation
const fswrite = async (data: FileWriteData): Promise<{ success: boolean }> => {
  try {
    await fs.writeFile(data.path, data.content);
    return { success: true };
  } catch (error) {
    console.error("Error writing file:", error);
    throw error;
  }
};

// File system read operation
const fsread = async (filePath: string): Promise<string> => {
  try {
    // Check file existence
    await fs.access(filePath);

    // Read file
    const data = await fs.readFile(filePath);
    return data.toString();
  } catch (error) {
    console.error("Error reading file:", error);
    throw error;
  }
};

// File system rename operation
const fsrename = async (data: FileRenameData): Promise<boolean> => {
  try {
    // Check source file exists
    await fs.access(data.oldPath);

    // Check destination does not exist
    try {
      await fs.access(data.newPath);
      throw new Error("Destination file already exists");
    } catch {
      // This catch means the destination file does not exist, which is good
    }

    // Perform rename
    await fs.rename(data.oldPath, data.newPath);
    return true;
  } catch (error) {
    console.error("Error renaming file:", error);
    throw error;
  }
};

// List directory contents
const fslist = async (dirPath: string): Promise<FileDetails[]> => {
  try {
    // Check directory existence
    await fs.access(dirPath);

    // Read directory
    const files = await fs.readdir(dirPath);

    // Get file details
    const fileDetails = await Promise.all(
      files.map(async (file): Promise<FileDetails | null> => {
        const fullPath = path.join(dirPath, file);
        try {
          const stats = await fs.stat(fullPath);
          return {
            name: file,
            path: fullPath,
            isDirectory: stats.isDirectory(),
            size: stats.size,
            created: stats.birthtime,
            modified: stats.mtime,
            extension: path.extname(file),
            type: stats.isDirectory() ? "directory" : "file",
          };
        } catch (error) {
          console.error(`Error getting stats for ${file}:`, error);
          return null;
        }
      })
    );

    // Filter out any null entries
    return fileDetails.filter((item): item is FileDetails => item !== null);
  } catch (error) {
    console.error("Error reading directory:", error);
    throw error;
  }
};

// Setup IPC handlers and listeners
const setupIpcHandlers = (): void => {
  // File write IPC handler
  ipcMain.on("fswrite", async (event: IpcMainEvent, data: FileWriteData) => {
    try {
      await fswrite(data);
      event.reply("fswrite-complete", { success: true });
    } catch (error) {
      event.reply("fswrite-complete", {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });

  // File read IPC handler
  ipcMain.handle("fsread", async (_event: IpcMainInvokeEvent, filePath: string) => {
    return await fsread(filePath);
  });

  // File delete IPC handler
  ipcMain.on("fsdelete", async (event: IpcMainEvent, filePath: string) => {
    try {
      await fs.unlink(filePath);
      event.reply("fsdelete-complete", { success: true });
    } catch (error) {
      event.reply("fsdelete-complete", {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });

  // File rename IPC handler
  ipcMain.handle("fsrename", async (_event: IpcMainInvokeEvent, data: FileRenameData) => {
    try {
      await fsrename(data);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  });

  // File list IPC handler
  ipcMain.handle("fslist", async (_event: IpcMainInvokeEvent, dirPath: string) => {
    try {
      const files = await fslist(dirPath);
      return { success: true, files };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  });

  // Terminal input IPC handler
  ipcMain.on("terminal-input", (event: IpcMainEvent, data: string) => {
    if (powershell) {
      powershell.stdin.write(data + "\n");
    } else {
      // Start PowerShell process
      import("child_process").then(({ spawn }) => {
        powershell = spawn("powershell.exe", ["-NoLogo"]);

        // Handle PowerShell output
        powershell.stdout.on("data", (outputData: Buffer) => {
          const mainWindow = BrowserWindow.getAllWindows()[0];
          if (mainWindow) {
            mainWindow.webContents.send(
              "terminal-output",
              outputData.toString()
            );
          }
        });

        powershell.stderr.on("data", (errorData: Buffer) => {
          const mainWindow = BrowserWindow.getAllWindows()[0];
          if (mainWindow) {
            mainWindow.webContents.send(
              "terminal-error",
              errorData.toString()
            );
          }
        });

        // Write initial input
        powershell.stdin.write(data + "\n");
      });
    }
  });
};

// App lifecycle event handlers
app.on('ready', () => {
  createWindow();
  setupIpcHandlers();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});