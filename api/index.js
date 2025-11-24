import express from 'express';
import mysql from 'mysql2/promise';
import cors from 'cors';

const app = express();

// Configuración de CORS para permitir peticiones desde cualquier origen (o tu dominio de Vercel)
app.use(cors());
app.use(express.json());

// --- 1. CONEXIÓN A BASE DE DATOS (AIVEN CLOUD) ---
// Usamos process.env para leer las variables secretas de Vercel
const pool = mysql.createPool({
    host: process.env.DB_HOST,           // Host de Aiven
    port: process.env.DB_PORT || 25437,  // Puerto (Por defecto 25437 en Aiven)
    user: process.env.DB_USER,           // Usuario (avnadmin)
    password: process.env.DB_PASSWORD,   // Contraseña
    database: process.env.DB_NAME,       // Base de datos (defaultdb)
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    ssl: {
        rejectUnauthorized: false        // OBLIGATORIO para conectar a Aiven
    }
});

// --- 2. ENDPOINT: BUSCAR (Lista general) ---
// Retorna hasta 50 resultados que coincidan con SKU o Descripción
app.get('/api/search', async (req, res) => {
    try {
        const { q } = req.query;
        if (!q) return res.json([]);

        const [rows] = await pool.execute(
            `SELECT r.*, g.nombre_tecnico as nombre_grupo 
             FROM inventario_repuestos r
             JOIN grupo_funcional g ON r.id_grupo = g.id_grupo
             WHERE r.sku LIKE ? OR r.descripcion LIKE ? 
             LIMIT 50`, 
            [`%${q}%`, `%${q}%`]
        );

        res.json(rows);

    } catch (error) {
        console.error("Error en búsqueda:", error);
        res.status(500).send('Error en el servidor');
    }
});

// --- 3. ENDPOINT: DETALLES Y COMPATIBILIDAD ---
// Retorna la lista de motos compatibles para un SKU específico
app.get('/api/details/:sku', async (req, res) => {
    try {
        const { sku } = req.params;

        const [compatibles] = await pool.execute(
            `SELECT m.nombre_comercial 
             FROM matriz_compatibilidad mc
             JOIN modelos_moto m ON mc.codigo_modelo = m.codigo_modelo
             WHERE mc.sku = ?`,
            [sku]
        );

        res.json(compatibles.map(c => c.nombre_comercial));

    } catch (error) {
        console.error("Error en detalles:", error);
        res.status(500).send('Error buscando detalles');
    }
});

// --- 4. ENDPOINT: ALTERNATIVAS INTELIGENTES ---
// Busca repuestos del MISMO grupo, con STOCK > 0, y prioriza palabras clave similares
app.get('/api/alternatives/:groupId/:excludeSku', async (req, res) => {
    try {
        const { groupId, excludeSku } = req.params;
        const { q } = req.query; // Recibimos la búsqueda original (Ej: "USB")

        let sql = `
            SELECT * FROM inventario_repuestos 
            WHERE id_grupo = ? 
            AND sku != ? 
            AND stock_actual > 0
        `;
        
        const params = [groupId, excludeSku];

        // Lógica de Relevancia Híbrida:
        // Si busco "USB", ordena primero los que tengan "USB" en el nombre, luego el resto del grupo.
        if (q) {
            const keyword = q.split(' ')[0]; // Tomamos la primera palabra clave
            sql += ` ORDER BY (CASE WHEN descripcion LIKE ? THEN 0 ELSE 1 END), precio ASC`;
            params.push(`%${keyword}%`);
        } else {
            sql += ` ORDER BY precio ASC`;
        }

        sql += ` LIMIT 10`;

        const [rows] = await pool.execute(sql, params);
        res.json(rows);

    } catch (error) {
        console.error("Error en alternativas:", error);
        res.status(500).send('Error buscando alternativas');
    }
});

// --- 5. ENDPOINT: AUTOCOMPLETADO (Opcional) ---
app.get('/api/suggestions', async (req, res) => {
    try {
        const { q } = req.query;
        if (!q || q.length < 2) return res.json([]); 

        const [rows] = await pool.execute(
            `SELECT DISTINCT descripcion, sku 
             FROM inventario_repuestos 
             WHERE descripcion LIKE ? OR sku LIKE ? 
             LIMIT 8`,
            [`%${q}%`, `%${q}%`]
        );

        res.json(rows);

    } catch (error) {
        console.error(error);
        res.status(500).send('Error en sugerencias');
    }
});

// EXPORTACIÓN PARA VERCEL (NO usar app.listen)
export default app;
