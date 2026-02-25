import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { initializeDatabase, closeDatabase, saveDatabase, CANONICAL_BOOKS } from './database.js';
// Define __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
let db = null;
const createWindow = () => {
    const win = new BrowserWindow({
        title: 'Bible Canvas',
        icon: path.join(app.getAppPath(), 'book.png'),
        width: 800,
        height: 600,
        show: false,
        autoHideMenuBar: true,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: true
        }
    });
    win.maximize();
    win.show();
    win.loadFile('dist/index.html');
};
/**
 * Initialize IPC handlers for database queries
 */
function setupIpcHandlers() {
    // Query all versions
    ipcMain.handle('db:get-versoes', () => {
        try {
            const results = db.exec('SELECT * FROM versoes');
            if (results.length === 0)
                return { success: true, data: [] };
            const columns = results[0].columns;
            const data = results[0].values.map((row) => Object.fromEntries(columns.map((col, i) => [col, row[i]])));
            return { success: true, data };
        }
        catch (error) {
            console.error('Error querying versoes:', error);
            return { success: false, error: String(error) };
        }
    });
    // Query all books
    ipcMain.handle('db:get-livros', () => {
        try {
            const results = db.exec('SELECT * FROM livros ORDER BY ordem');
            if (results.length === 0)
                return { success: true, data: [] };
            const columns = results[0].columns;
            const data = results[0].values.map((row) => Object.fromEntries(columns.map((col, i) => [col, row[i]])));
            return { success: true, data };
        }
        catch (error) {
            console.error('Error querying livros:', error);
            return { success: false, error: String(error) };
        }
    });
    // Query verses for a specific book/chapter/version
    ipcMain.handle('db:get-versiculos', (_event, { versao_id, livro_id, capitulo }) => {
        try {
            const results = db.exec('SELECT * FROM versiculos WHERE versao_id = ? AND livro_id = ? AND capitulo = ? ORDER BY numero', [versao_id, livro_id, capitulo]);
            if (results.length === 0)
                return { success: true, data: [] };
            const columns = results[0].columns;
            const data = results[0].values.map((row) => Object.fromEntries(columns.map((col, i) => [col, row[i]])));
            return { success: true, data };
        }
        catch (error) {
            console.error('Error querying versiculos:', error);
            return { success: false, error: String(error) };
        }
    });
    // Get canvas annotation for a book/chapter
    ipcMain.handle('db:get-anotacao', (_event, { livro_id, capitulo }) => {
        try {
            const results = db.exec('SELECT * FROM anotacoes_canvas WHERE livro_id = ? AND capitulo = ?', [livro_id, capitulo]);
            if (results.length === 0)
                return { success: true, data: null };
            const columns = results[0].columns;
            const rowData = results[0].values[0];
            const data = rowData
                ? Object.fromEntries(columns.map((col, i) => [col, rowData[i]]))
                : null;
            return { success: true, data };
        }
        catch (error) {
            console.error('Error querying anotacao:', error);
            return { success: false, error: String(error) };
        }
    });
    // Save or update canvas annotation
    ipcMain.handle('db:save-anotacao', (_event, { livro_id, capitulo, dados_json }) => {
        try {
            db.run(`INSERT INTO anotacoes_canvas (livro_id, capitulo, dados_json, ultima_atualizacao)
                VALUES (?, ?, ?, datetime('now'))
                ON CONFLICT(livro_id, capitulo)
                DO UPDATE SET dados_json = excluded.dados_json, ultima_atualizacao = datetime('now')`, [livro_id, capitulo, dados_json]);
            saveDatabase(db);
            return { success: true };
        }
        catch (error) {
            console.error('Error saving anotacao:', error);
            return { success: false, error: String(error) };
        }
    });
    // Import a new version from JSON
    ipcMain.handle('db:import-version', (_event, { nome, sigla, idioma, jsonData }) => {
        try {
            // First, start a transaction implicitly or just insert version
            let data;
            try {
                data = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;
            }
            catch (e) {
                return { success: false, error: 'Invalid JSON format' };
            }
            db.run('BEGIN TRANSACTION');
            // 1. Insert version
            db.run('INSERT INTO versoes (nome, sigla, idioma) VALUES (?, ?, ?)', [nome, sigla, idioma || 'pt-br']);
            // Get the inserted version ID
            const result = db.exec('SELECT last_insert_rowid() as id');
            const versionId = result[0].values[0][0];
            // 2. Process books
            for (const book of data) {
                // Find matching canonical book either by exact sigla match, exact name match, or guess
                const canonicalBook = CANONICAL_BOOKS.find(b => b.sigla.toLowerCase() === book.abbrev.toLowerCase() ||
                    b.nome.toLowerCase() === book.name.toLowerCase());
                if (!canonicalBook) {
                    console.warn(`Could not find canonical match for book: ${book.name} (${book.abbrev}). Skipping...`);
                    continue; // Skip unrecognized books
                }
                // Insert verses chapter by chapter
                if (Array.isArray(book.chapters)) {
                    book.chapters.forEach((chapterVerses, chapterIndex) => {
                        const capitulo = chapterIndex + 1; // 1-based chapter
                        chapterVerses.forEach((verseText, verseIndex) => {
                            const numero = verseIndex + 1; // 1-based verse
                            db.run('INSERT INTO versiculos (versao_id, livro_id, capitulo, numero, texto) VALUES (?, ?, ?, ?, ?)', [versionId, canonicalBook.id, capitulo, numero, verseText]);
                        });
                    });
                }
            }
            db.run('COMMIT');
            saveDatabase(db);
            return { success: true, data: { id: versionId } };
        }
        catch (error) {
            console.error('Error importing version:', error);
            try {
                db.run('ROLLBACK');
            }
            catch (e) { }
            return { success: false, error: String(error) };
        }
    });
    // Delete an existing version
    ipcMain.handle('db:delete-version', (_event, { versao_id }) => {
        try {
            db.run('BEGIN TRANSACTION');
            // Delete verses first (due to foreign key constraints, though SQLite might ignore them if PRAGMA foreign_keys=OFF)
            db.run('DELETE FROM versiculos WHERE versao_id = ?', [versao_id]);
            // Delete the version
            db.run('DELETE FROM versoes WHERE id = ?', [versao_id]);
            db.run('COMMIT');
            saveDatabase(db);
            return { success: true };
        }
        catch (error) {
            console.error('Error deleting version:', error);
            try {
                db.run('ROLLBACK');
            }
            catch (e) { }
            return { success: false, error: String(error) };
        }
    });
}
app.whenReady().then(async () => {
    try {
        // Initialize database before creating the window
        db = await initializeDatabase();
        console.log('Database initialized successfully');
        // Setup IPC handlers after database is ready
        setupIpcHandlers();
        // Create the window
        createWindow();
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('Fatal error during app initialization:', errorMessage);
        // Show error dialog
        await dialog.showErrorBox('Database Initialization Failed', `Failed to initialize the application database:\n\n${errorMessage}\n\nThe application will now close.`);
        // Exit the app
        app.quit();
    }
    // needed if we are not quitting the app on all window close.
    // app.on('activate', () => {
    //     if (BrowserWindow.getAllWindows().length === 0) {
    //         createWindow()
    //     }
    // })
});
app.on('window-all-closed', () => {
    // Close database connection before quitting
    if (db) {
        closeDatabase();
    }
    app.quit();
});
