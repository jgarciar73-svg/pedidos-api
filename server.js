const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_FILE = process.env.DB_FILE || path.join(__dirname, 'data.json');

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ---------- Persistencia sencilla en archivo JSON ----------
function cargar() {
  try {
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  } catch (e) {
    return { siguientePedido: 1, siguienteDetalle: 1, pedidos: [] };
  }
}

function guardar(db) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
  } catch (e) {
    console.error('No se pudo guardar el archivo:', e.message);
  }
}

let db = cargar();

// ---------- Utilidades ----------
function totalPedido(p) {
  return p.detalles.reduce((s, d) => s + d.cantidad * d.precio, 0);
}

function conTotal(p) {
  return { ...p, total: Number(totalPedido(p).toFixed(2)) };
}

function validarDetalle(d) {
  if (!d || typeof d.producto !== 'string' || !d.producto.trim()) {
    return 'El detalle necesita un producto.';
  }
  if (!Number.isFinite(Number(d.cantidad)) || Number(d.cantidad) <= 0) {
    return 'La cantidad debe ser un numero mayor que 0.';
  }
  if (!Number.isFinite(Number(d.precio)) || Number(d.precio) < 0) {
    return 'El precio debe ser un numero mayor o igual a 0.';
  }
  return null;
}

function nuevoDetalle(d) {
  return {
    id: db.siguienteDetalle++,
    producto: d.producto.trim(),
    cantidad: Number(d.cantidad),
    precio: Number(d.precio)
  };
}

function buscarPedido(req, res) {
  const p = db.pedidos.find(x => x.id === Number(req.params.id));
  if (!p) {
    res.status(404).json({ error: 'Pedido no encontrado' });
    return null;
  }
  return p;
}

// ---------- Rutas ----------
app.get('/api/health', (req, res) => {
  res.json({ estado: 'ok', hora: new Date().toISOString() });
});

// Listar pedidos (maestro)
app.get('/api/pedidos', (req, res) => {
  res.json(db.pedidos.map(conTotal));
});

// Obtener un pedido con su detalle
app.get('/api/pedidos/:id', (req, res) => {
  const p = buscarPedido(req, res);
  if (p) res.json(conTotal(p));
});

// Crear pedido con sus lineas de detalle
app.post('/api/pedidos', (req, res) => {
  const { cliente, fecha, detalles } = req.body || {};
  if (typeof cliente !== 'string' || !cliente.trim()) {
    return res.status(400).json({ error: 'El cliente es obligatorio.' });
  }
  const lineas = Array.isArray(detalles) ? detalles : [];
  for (const d of lineas) {
    const err = validarDetalle(d);
    if (err) return res.status(400).json({ error: err });
  }
  const pedido = {
    id: db.siguientePedido++,
    cliente: cliente.trim(),
    fecha: fecha || new Date().toISOString().slice(0, 10),
    detalles: lineas.map(nuevoDetalle)
  };
  db.pedidos.push(pedido);
  guardar(db);
  res.status(201).json(conTotal(pedido));
});

// Actualizar datos del pedido
app.put('/api/pedidos/:id', (req, res) => {
  const p = buscarPedido(req, res);
  if (!p) return;
  const { cliente, fecha } = req.body || {};
  if (cliente !== undefined) {
    if (typeof cliente !== 'string' || !cliente.trim()) {
      return res.status(400).json({ error: 'El cliente no puede estar vacio.' });
    }
    p.cliente = cliente.trim();
  }
  if (fecha !== undefined) p.fecha = fecha;
  guardar(db);
  res.json(conTotal(p));
});

// Eliminar pedido (y su detalle)
app.delete('/api/pedidos/:id', (req, res) => {
  const idx = db.pedidos.findIndex(x => x.id === Number(req.params.id));
  if (idx === -1) return res.status(404).json({ error: 'Pedido no encontrado' });
  db.pedidos.splice(idx, 1);
  guardar(db);
  res.status(204).end();
});

// Agregar una linea al detalle
app.post('/api/pedidos/:id/detalles', (req, res) => {
  const p = buscarPedido(req, res);
  if (!p) return;
  const err = validarDetalle(req.body);
  if (err) return res.status(400).json({ error: err });
  p.detalles.push(nuevoDetalle(req.body));
  guardar(db);
  res.status(201).json(conTotal(p));
});

// Eliminar una linea del detalle
app.delete('/api/pedidos/:id/detalles/:detalleId', (req, res) => {
  const p = buscarPedido(req, res);
  if (!p) return;
  const idx = p.detalles.findIndex(d => d.id === Number(req.params.detalleId));
  if (idx === -1) return res.status(404).json({ error: 'Detalle no encontrado' });
  p.detalles.splice(idx, 1);
  guardar(db);
  res.json(conTotal(p));
});

// Rutas /api desconocidas
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

if (require.main === module) {
  app.listen(PORT, () => console.log(`Servidor listo en el puerto ${PORT}`));
}

module.exports = app;
