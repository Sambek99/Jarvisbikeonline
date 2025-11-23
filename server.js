import express from 'express';
import mysql from 'mysql2/promise';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

// --- 1. CONEXIÓN A BASE DE DATOS ---
const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: 'Root_1234!', // <--- Asegúrate que esta sea tu contraseña correcta
    database: 'jarvisbike_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// --- 2. ENDPOINT: BUSCAR (Lista general) ---
app.get('/api/search', async (req, res) => {
    try {
        const { q } = req.query;
        if (!q) return res.json([]);

        // Buscamos hasta 50 coincidencias por SKU o Descripción
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
        console.error(error);
        res.status(500).send('Error en el servidor');
    }
});

// --- 3. ENDPOINT: DETALLES Y COMPATIBILIDAD ---
app.get('/api/details/:sku', async (req, res) => {
    try {
        const { sku } = req.params;

        // Buscamos modelos compatibles para este repuesto específico
        const [compatibles] = await pool.execute(
            `SELECT m.nombre_comercial 
             FROM matriz_compatibilidad mc
             JOIN modelos_moto m ON mc.codigo_modelo = m.codigo_modelo
             WHERE mc.sku = ?`,
            [sku]
        );

        res.json(compatibles.map(c => c.nombre_comercial));

    } catch (error) {
        console.error(error);
        res.status(500).send('Error buscando detalles');
    }
});

// --- 4. ENDPOINT: ALTERNATIVAS INTELIGENTES (Con Boost por Nombre) ---
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

        // Lógica de Relevancia Híbrida
        if (q) {
            // Tomamos la primera palabra clave (Ej: "USB" de "USB AVATAR")
            const keyword = q.split(' ')[0]; 
            
            // Ordenamos: Primero los que contengan la palabra clave, luego el resto por precio
            sql += ` ORDER BY (CASE WHEN descripcion LIKE ? THEN 0 ELSE 1 END), precio ASC`;
            params.push(`%${keyword}%`);
        } else {
            // Si no hay palabra clave, solo precio
            sql += ` ORDER BY precio ASC`;
        }

        sql += ` LIMIT 10`;

        const [rows] = await pool.execute(sql, params);
        res.json(rows);

    } catch (error) {
        console.error(error);
        res.status(500).send('Error buscando alternativas');
    }
});

// --- 5. ENDPOINT: AUTOCOMPLETADO (DICCIONARIO) ---
app.get('/api/suggestions', async (req, res) => {
    try {
        const { q } = req.query;
        if (!q || q.length < 2) return res.json([]); // Mínimo 2 letras

        // Buscamos nombres únicos que coincidan
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

// --- INICIO DEL SERVIDOR ---
const PORT = 3001;
app.listen(PORT, () => {
    console.log(`🚀 Servidor API escuchando en http://localhost:${PORT}`);
});