require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { sql, getPool } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ---------- Validacion del JSON maestro-detalle ----------
function textoValido(v) {
  return typeof v === 'string' && v.trim().length > 0;
}

function validarRegistro(body) {
  if (!body || typeof body !== 'object') {
    return { error: 'Se esperaba un JSON con "maestro" y "detalle".' };
  }
  const { maestro, detalle } = body;
  if (!maestro || typeof maestro !== 'object') {
    return { error: 'Falta el objeto "maestro" (carnet, nombre, correo).' };
  }
  if (!textoValido(maestro.carnet) || maestro.carnet.trim().length > 25) {
    return { error: 'El carnet es obligatorio (maximo 25 caracteres).' };
  }
  if (!textoValido(maestro.nombre) || maestro.nombre.trim().length > 150) {
    return { error: 'El nombre es obligatorio (maximo 150 caracteres).' };
  }
  if (!textoValido(maestro.correo) || maestro.correo.trim().length > 150) {
    return { error: 'El correo es obligatorio (maximo 150 caracteres).' };
  }
  if (!Array.isArray(detalle)) {
    return { error: 'Falta el arreglo "detalle" con las misiones.' };
  }
  // Si una mision viene repetida, gana la ultima.
  const porMision = new Map();
  for (const d of detalle) {
    if (!d || !Number.isInteger(d.misionId)) {
      return { error: 'Cada elemento del detalle necesita un "misionId" entero.' };
    }
    if (typeof d.estado !== 'boolean') {
      return { error: 'El "estado" de la mision ' + d.misionId + ' debe ser true o false.' };
    }
    porMision.set(d.misionId, d.estado);
  }
  return {
    maestro: {
      carnet: maestro.carnet.trim(),
      nombre: maestro.nombre.trim(),
      correo: maestro.correo.trim()
    },
    detalle: [...porMision].map(([misionId, estado]) => ({ misionId, estado }))
  };
}

function errorServidor(res, err) {
  console.error('Error:', err.message);
  const sinBD = /DB_PASSWORD/.test(err.message);
  res.status(500).json({
    error: sinBD ? err.message : 'No se pudo completar la operacion en la base de datos.',
    detalle: err.message
  });
}

// ---------- Rutas ----------
app.get('/api/health', (req, res) => {
  res.json({ estado: 'ok', hora: new Date().toISOString() });
});

// Diagnostico de la conexion a SQL Server
app.get('/api/health/db', async (req, res) => {
  try {
    const pool = await getPool();
    await pool.request().query('SELECT 1 AS ok');
    res.json({ estado: 'ok', baseDeDatos: 'conectada' });
  } catch (err) {
    res.status(500).json({ estado: 'error', baseDeDatos: 'sin conexion', detalle: err.message });
  }
});

// Catalogo de misiones
app.get('/api/misiones', async (req, res) => {
  try {
    const pool = await getPool();
    const r = await pool.request().query(
      'SELECT MisionID, Nombre, Descripcion FROM Misiones ORDER BY MisionID'
    );
    res.json(r.recordset.map(m => ({
      misionId: m.MisionID,
      nombre: m.Nombre,
      descripcion: m.Descripcion
    })));
  } catch (err) {
    errorServidor(res, err);
  }
});

// Estudiantes con sus misiones y estado
app.get('/api/estudiantes', async (req, res) => {
  try {
    const pool = await getPool();
    const est = await pool.request().query(
      'SELECT Carnet, Nombre, Correo FROM Estudiantes ORDER BY Nombre'
    );
    const mis = await pool.request().query(
      'SELECT MisionID, Nombre FROM Misiones ORDER BY MisionID'
    );
    const det = await pool.request().query(
      'SELECT Carnet, MisionID, Estado FROM EstudianteMisiones'
    );

    const estados = new Map(); // carnet -> Map(misionId -> estado)
    for (const d of det.recordset) {
      if (!estados.has(d.Carnet)) estados.set(d.Carnet, new Map());
      estados.get(d.Carnet).set(d.MisionID, !!d.Estado);
    }

    const total = mis.recordset.length;
    const lista = est.recordset.map(e => {
      const mapa = estados.get(e.Carnet) || new Map();
      const misiones = mis.recordset.map(m => ({
        misionId: m.MisionID,
        nombre: m.Nombre,
        estado: mapa.get(m.MisionID) === true
      }));
      const completadas = misiones.filter(m => m.estado).length;
      return {
        carnet: e.Carnet,
        nombre: e.Nombre,
        correo: e.Correo,
        misionesCompletadas: completadas,
        totalMisiones: total,
        porcentajeAvance: total ? Math.round((completadas * 100) / total) : 0,
        misiones
      };
    });
    res.json(lista);
  } catch (err) {
    errorServidor(res, err);
  }
});

// Registro maestro-detalle en un solo POST (se puede repetir las veces necesarias)
app.post('/api/registro', async (req, res) => {
  const v = validarRegistro(req.body);
  if (v.error) return res.status(400).json({ error: v.error });
  const { maestro, detalle } = v;

  let tx = null;
  let iniciada = false;
  try {
    const pool = await getPool();
    tx = new sql.Transaction(pool);
    await tx.begin();
    iniciada = true;

    // 1. Validar contra el catalogo ANTES de escribir nada
    const cat = await new sql.Request(tx).query('SELECT MisionID FROM Misiones');
    const existentes = new Set(cat.recordset.map(r => r.MisionID));
    const faltantes = detalle.filter(d => !existentes.has(d.misionId)).map(d => d.misionId);
    if (faltantes.length) {
      await tx.rollback();
      iniciada = false;
      return res.status(400).json({
        error: 'Error de referencia: las misiones ' + faltantes.join(', ') + ' no existen en el catalogo.'
      });
    }

    // 2. Maestro: insertar si es nuevo, actualizar si ya existe
    const ya = await new sql.Request(tx)
      .input('carnet', sql.VarChar(25), maestro.carnet)
      .query('SELECT 1 AS x FROM Estudiantes WHERE Carnet = @carnet');
    const esNuevo = ya.recordset.length === 0;

    const rq = new sql.Request(tx)
      .input('carnet', sql.VarChar(25), maestro.carnet)
      .input('nombre', sql.NVarChar(150), maestro.nombre)
      .input('correo', sql.NVarChar(150), maestro.correo);
    if (esNuevo) {
      await rq.query('INSERT INTO Estudiantes (Carnet, Nombre, Correo) VALUES (@carnet, @nombre, @correo)');
    } else {
      await rq.query('UPDATE Estudiantes SET Nombre = @nombre, Correo = @correo WHERE Carnet = @carnet');
    }

    // 3. Detalle: insertar o actualizar el estado de cada mision
    let insertadas = 0;
    let actualizadas = 0;
    for (const d of detalle) {
      const previo = await new sql.Request(tx)
        .input('carnet', sql.VarChar(25), maestro.carnet)
        .input('mision', sql.Int, d.misionId)
        .query('SELECT 1 AS x FROM EstudianteMisiones WHERE Carnet = @carnet AND MisionID = @mision');

      const rd = new sql.Request(tx)
        .input('carnet', sql.VarChar(25), maestro.carnet)
        .input('mision', sql.Int, d.misionId)
        .input('estado', sql.Bit, d.estado);
      if (previo.recordset.length) {
        await rd.query('UPDATE EstudianteMisiones SET Estado = @estado WHERE Carnet = @carnet AND MisionID = @mision');
        actualizadas++;
      } else {
        await rd.query('INSERT INTO EstudianteMisiones (Carnet, MisionID, Estado) VALUES (@carnet, @mision, @estado)');
        insertadas++;
      }
    }

    await tx.commit();
    iniciada = false;
    res.json({
      ok: true,
      estudiante: esNuevo ? 'creado' : 'actualizado',
      carnet: maestro.carnet,
      misionesInsertadas: insertadas,
      misionesActualizadas: actualizadas
    });
  } catch (err) {
    if (tx && iniciada) {
      try { await tx.rollback(); } catch (e) { /* ya cerrada */ }
    }
    // 2627 / 2601: violacion de llave unica (por ejemplo, correo repetido)
    if (err.number === 2627 || err.number === 2601) {
      return res.status(409).json({
        error: 'Conflicto: ese correo o registro ya existe con otro carnet.'
      });
    }
    errorServidor(res, err);
  }
});

app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

if (require.main === module) {
  app.listen(PORT, () => console.log('Servidor listo en el puerto ' + PORT));
}

module.exports = app;
