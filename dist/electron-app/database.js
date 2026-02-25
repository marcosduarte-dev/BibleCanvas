import initSqlJs from 'sql.js';
import path from 'path';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { homedir } from 'os';
const DB_DIR = path.join(homedir(), '.biblecanvas');
const DB_PATH = path.join(DB_DIR, 'biblecanvas.db');
const SCHEMA = {
    versoes: `CREATE TABLE IF NOT EXISTS versoes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    sigla TEXT UNIQUE NOT NULL,
    idioma TEXT DEFAULT 'pt-br'
  )`,
    livros: `CREATE TABLE IF NOT EXISTS livros (
    id INTEGER PRIMARY KEY,
    testamento TEXT,
    nome TEXT NOT NULL,
    sigla TEXT,
    ordem INTEGER
  )`,
    versiculos: `CREATE TABLE IF NOT EXISTS versiculos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    versao_id INTEGER,
    livro_id INTEGER,
    capitulo INTEGER,
    numero INTEGER,
    texto TEXT NOT NULL,
    FOREIGN KEY(versao_id) REFERENCES versoes(id),
    FOREIGN KEY(livro_id) REFERENCES livros(id)
  )`,
    anotacoes_canvas: `CREATE TABLE IF NOT EXISTS anotacoes_canvas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    livro_id INTEGER,
    capitulo INTEGER,
    dados_json TEXT,
    ultima_atualizacao DATETIME,
    UNIQUE(livro_id, capitulo),
    FOREIGN KEY(livro_id) REFERENCES livros(id)
  )`
};
export const CANONICAL_BOOKS = [
    { id: 1, testamento: 'VT', nome: 'Gênesis', sigla: 'Gn' },
    { id: 2, testamento: 'VT', nome: 'Êxodo', sigla: 'Êx' },
    { id: 3, testamento: 'VT', nome: 'Levítico', sigla: 'Lv' },
    { id: 4, testamento: 'VT', nome: 'Números', sigla: 'Nm' },
    { id: 5, testamento: 'VT', nome: 'Deuteronômio', sigla: 'Dt' },
    { id: 6, testamento: 'VT', nome: 'Josué', sigla: 'Js' },
    { id: 7, testamento: 'VT', nome: 'Juízes', sigla: 'Jz' },
    { id: 8, testamento: 'VT', nome: 'Rute', sigla: 'Rt' },
    { id: 9, testamento: 'VT', nome: '1 Samuel', sigla: '1Sm' },
    { id: 10, testamento: 'VT', nome: '2 Samuel', sigla: '2Sm' },
    { id: 11, testamento: 'VT', nome: '1 Reis', sigla: '1Rs' },
    { id: 12, testamento: 'VT', nome: '2 Reis', sigla: '2Rs' },
    { id: 13, testamento: 'VT', nome: '1 Crônicas', sigla: '1Cr' },
    { id: 14, testamento: 'VT', nome: '2 Crônicas', sigla: '2Cr' },
    { id: 15, testamento: 'VT', nome: 'Esdras', sigla: 'Ed' },
    { id: 16, testamento: 'VT', nome: 'Neemias', sigla: 'Ne' },
    { id: 17, testamento: 'VT', nome: 'Ester', sigla: 'Et' },
    { id: 18, testamento: 'VT', nome: 'Jó', sigla: 'Jó' },
    { id: 19, testamento: 'VT', nome: 'Salmos', sigla: 'Sl' },
    { id: 20, testamento: 'VT', nome: 'Provérbios', sigla: 'Pv' },
    { id: 21, testamento: 'VT', nome: 'Eclesiastes', sigla: 'Ec' },
    { id: 22, testamento: 'VT', nome: 'Cantares', sigla: 'Ct' },
    { id: 23, testamento: 'VT', nome: 'Isaías', sigla: 'Is' },
    { id: 24, testamento: 'VT', nome: 'Jeremias', sigla: 'Jr' },
    { id: 25, testamento: 'VT', nome: 'Lamentações', sigla: 'Lm' },
    { id: 26, testamento: 'VT', nome: 'Ezequiel', sigla: 'Ez' },
    { id: 27, testamento: 'VT', nome: 'Daniel', sigla: 'Dn' },
    { id: 28, testamento: 'VT', nome: 'Oseias', sigla: 'Os' },
    { id: 29, testamento: 'VT', nome: 'Joel', sigla: 'Jl' },
    { id: 30, testamento: 'VT', nome: 'Amós', sigla: 'Am' },
    { id: 31, testamento: 'VT', nome: 'Obadias', sigla: 'Ob' },
    { id: 32, testamento: 'VT', nome: 'Jonas', sigla: 'Jn' },
    { id: 33, testamento: 'VT', nome: 'Miqueias', sigla: 'Mq' },
    { id: 34, testamento: 'VT', nome: 'Naum', sigla: 'Na' },
    { id: 35, testamento: 'VT', nome: 'Habacuque', sigla: 'Hc' },
    { id: 36, testamento: 'VT', nome: 'Sofonias', sigla: 'Sf' },
    { id: 37, testamento: 'VT', nome: 'Ageu', sigla: 'Ag' },
    { id: 38, testamento: 'VT', nome: 'Zacarias', sigla: 'Zc' },
    { id: 39, testamento: 'VT', nome: 'Malaquias', sigla: 'Ml' },
    { id: 40, testamento: 'NT', nome: 'Mateus', sigla: 'Mt' },
    { id: 41, testamento: 'NT', nome: 'Marcos', sigla: 'Mc' },
    { id: 42, testamento: 'NT', nome: 'Lucas', sigla: 'Lc' },
    { id: 43, testamento: 'NT', nome: 'João', sigla: 'Jo' },
    { id: 44, testamento: 'NT', nome: 'Atos', sigla: 'At' },
    { id: 45, testamento: 'NT', nome: 'Romanos', sigla: 'Rm' },
    { id: 46, testamento: 'NT', nome: '1 Coríntios', sigla: '1Co' },
    { id: 47, testamento: 'NT', nome: '2 Coríntios', sigla: '2Co' },
    { id: 48, testamento: 'NT', nome: 'Gálatas', sigla: 'Gl' },
    { id: 49, testamento: 'NT', nome: 'Efésios', sigla: 'Ef' },
    { id: 50, testamento: 'NT', nome: 'Filipenses', sigla: 'Fp' },
    { id: 51, testamento: 'NT', nome: 'Colossenses', sigla: 'Cl' },
    { id: 52, testamento: 'NT', nome: '1 Tessalonicenses', sigla: '1Ts' },
    { id: 53, testamento: 'NT', nome: '2 Tessalonicenses', sigla: '2Ts' },
    { id: 54, testamento: 'NT', nome: '1 Timóteo', sigla: '1Tm' },
    { id: 55, testamento: 'NT', nome: '2 Timóteo', sigla: '2Tm' },
    { id: 56, testamento: 'NT', nome: 'Tito', sigla: 'Tt' },
    { id: 57, testamento: 'NT', nome: 'Filemom', sigla: 'Fm' },
    { id: 58, testamento: 'NT', nome: 'Hebreus', sigla: 'Hb' },
    { id: 59, testamento: 'NT', nome: 'Tiago', sigla: 'Tg' },
    { id: 60, testamento: 'NT', nome: '1 Pedro', sigla: '1Pe' },
    { id: 61, testamento: 'NT', nome: '2 Pedro', sigla: '2Pe' },
    { id: 62, testamento: 'NT', nome: '1 João', sigla: '1Jo' },
    { id: 63, testamento: 'NT', nome: '2 João', sigla: '2Jo' },
    { id: 64, testamento: 'NT', nome: '3 João', sigla: '3Jo' },
    { id: 65, testamento: 'NT', nome: 'Judas', sigla: 'Jd' },
    { id: 66, testamento: 'NT', nome: 'Apocalipse', sigla: 'Ap' }
];
const TABLE_NAMES = Object.keys(SCHEMA);
// Global database instance
let dbInstance = null;
let initialized = false;
/**
 * Saves the database to disk
 */
export function saveDatabase(db) {
    try {
        const data = db.export();
        const buffer = Buffer.from(data);
        writeFileSync(DB_PATH, buffer);
    }
    catch (error) {
        console.error('Error saving database:', error);
        throw error;
    }
}
/**
 * Validates that all required tables exist in the database
 */
function validateSchema(db) {
    try {
        const results = db.exec("SELECT name FROM sqlite_master WHERE type='table'");
        if (results.length === 0)
            return false;
        const existingTables = new Set(results[0].values.map((row) => row[0]));
        return TABLE_NAMES.every(tableName => existingTables.has(tableName));
    }
    catch {
        return false;
    }
}
/**
 * Initializes the database with the required schema
 */
function initializeSchema(db) {
    TABLE_NAMES.forEach(tableName => {
        db.run(SCHEMA[tableName]);
    });
    // Insert canonical books if they don't exist
    CANONICAL_BOOKS.forEach(book => {
        db.run('INSERT OR IGNORE INTO livros (id, testamento, nome, sigla, ordem) VALUES (?, ?, ?, ?, ?)', [book.id, book.testamento, book.nome, book.sigla, book.id]);
    });
}
/**
 * Ensures the .biblecanvas directory exists
 */
function ensureDirectory() {
    if (!existsSync(DB_DIR)) {
        mkdirSync(DB_DIR, { recursive: true });
    }
}
/**
 * Gets or creates the database connection
 * Initializes schema if database is new or corrupted
 */
export async function initializeDatabase() {
    try {
        if (initialized && dbInstance) {
            return dbInstance;
        }
        ensureDirectory();
        const SQL = await initSqlJs();
        let db;
        // Check if database file exists
        if (existsSync(DB_PATH)) {
            try {
                const fileBuffer = readFileSync(DB_PATH);
                db = new SQL.Database(new Uint8Array(fileBuffer));
                // Validate schema
                const isValid = validateSchema(db);
                if (!isValid) {
                    console.log('Database schema is missing or corrupted. Reinitializing...');
                    // Drop existing tables
                    TABLE_NAMES.forEach(tableName => {
                        try {
                            db.run(`DROP TABLE IF EXISTS ${tableName}`);
                        }
                        catch (e) {
                            // Ignore errors when dropping non-existent tables
                        }
                    });
                    initializeSchema(db);
                    saveDatabase(db);
                    console.log('Database schema initialized successfully');
                }
                else {
                    console.log('Database schema validated successfully');
                }
            }
            catch (error) {
                console.error('Error loading database file:', error);
                // Create new database
                db = new SQL.Database();
                initializeSchema(db);
                saveDatabase(db);
                console.log('Database schema initialized successfully (new database)');
            }
        }
        else {
            // Create new database
            db = new SQL.Database();
            initializeSchema(db);
            saveDatabase(db);
            console.log('Database schema initialized successfully (new database)');
        }
        dbInstance = db;
        initialized = true;
        return db;
    }
    catch (error) {
        console.error('Failed to initialize database:', error);
        throw new Error(`Database initialization failed: ${error instanceof Error ? error.message : String(error)}`);
    }
}
/**
 * Gets the current database instance
 */
export function getDatabase() {
    if (!dbInstance) {
        throw new Error('Database not initialized. Call initializeDatabase first.');
    }
    return dbInstance;
}
/**
 * Closes the database and saves any pending changes
 */
export function closeDatabase() {
    if (dbInstance) {
        saveDatabase(dbInstance);
        dbInstance.close();
        dbInstance = null;
        initialized = false;
    }
}
/**
 * Gets the database file path (useful for debugging)
 */
export function getDatabasePath() {
    return DB_PATH;
}
/**
 * Gets the database directory path
 */
export function getDatabaseDir() {
    return DB_DIR;
}
