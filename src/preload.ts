import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';

// Type definitions for file operations
interface FileWriteData {
    path: string;
    content: string;
}

interface FileRenameData {
    oldPath: string;
    newPath: string;
}

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

interface FileOperationResult {
    success: boolean;
    error?: string;
}

interface ListFilesResult {
    success: boolean;
    files?: FileDetails[];
    error?: string;
}

// Extend the Window interface to include our preload methods
declare global {
    interface Window {
        preload: {
            writeFile: (data: FileWriteData) => Promise<FileOperationResult>;
            readFile: (path: string) => Promise<string>;
            deleteFile: (path: string) => Promise<FileOperationResult>;
            renameFile: (data: FileRenameData) => Promise<FileOperationResult>;
            listFiles: (dirPath: string) => Promise<ListFilesResult>;
            sendTerminalInput: (input: string) => void;
            onTerminalOutput: (callback: (output: string) => void) => void;
            onTerminalError: (callback: (error: string) => void) => void;
            offTerminalOutput: () => void;
            offTerminalError: () => void;
        };
    }
}

// Expose methods to the renderer process
contextBridge.exposeInMainWorld('preload', {
    // File write operation
    writeFile: (data: FileWriteData): Promise<FileOperationResult> => {
        return new Promise((resolve) => {
            ipcRenderer.send("fswrite", data);
            ipcRenderer.once("fswrite-complete", (_event: IpcRendererEvent, result: FileOperationResult) => {
                resolve(result);
            });
        });
    },

    // File read operation
    readFile: (path: string): Promise<string> => {
        return ipcRenderer.invoke("fsread", path);
    },

    // File delete operation
    deleteFile: (path: string): Promise<FileOperationResult> => {
        return new Promise((resolve) => {
            ipcRenderer.send("fsdelete", path);
            ipcRenderer.once("fsdelete-complete", (_event: IpcRendererEvent, result: FileOperationResult) => {
                resolve(result);
            });
        });
    },

    // File rename operation
    renameFile: (data: FileRenameData): Promise<FileOperationResult> => {
        return ipcRenderer.invoke("fsrename", data);
    },

    // List files in a directory
    listFiles: (dirPath: string): Promise<ListFilesResult> => {
        return ipcRenderer.invoke("fslist", dirPath);
    },

    // Terminal input/output operations
    sendTerminalInput: (input: string): void => {
        ipcRenderer.send("terminal-input", input);
    },

    // Terminal output listener
    onTerminalOutput: (callback: (output: string) => void): void => {
        const wrappedCallback = (_event: IpcRendererEvent, output: string) => {
            callback(output);
        };
        ipcRenderer.on("terminal-output", wrappedCallback);
    },

    // Terminal error listener
    onTerminalError: (callback: (error: string) => void): void => {
        const wrappedCallback = (_event: IpcRendererEvent, error: string) => {
            callback(error);
        };
        ipcRenderer.on("terminal-error", wrappedCallback);
    },

    // Method to remove terminal output listener
    offTerminalOutput: (): void => {
        ipcRenderer.removeAllListeners("terminal-output");
    },

    // Method to remove terminal error listener
    offTerminalError: (): void => {
        ipcRenderer.removeAllListeners("terminal-error");
    },
});