// Pruebas basicas de la API (Mision 5: pruebas de ingreso).
// Uso local:            npm test
// Contra el hosting:    BASE_URL=https://tu-app.onrender.com npm test
const assert = require('assert');
const os = require('os');
const path = require('path');

async function main() {
  let base = process.env.BASE_URL;
  let server;

  if (!base) {
    process.env.DB_FILE = path.join(os.tmpdir(), 'pedidos-test-' + Date.now() + '.json');
    const app = require('../server');
    server = app.listen(0);
    base = 'http://127.0.0.1:' + server.address().port;
  }

  const req = async (metodo, ruta, cuerpo) => {
    const r = await fetch(base + ruta, {
      method: metodo,
      headers: { 'Content-Type': 'application/json' },
      body: cuerpo ? JSON.stringify(cuerpo) : undefined
    });
    const texto = await r.text();
    return { status: r.status, data: texto ? JSON.parse(texto) : null };
  };

  let ok = 0;
  const prueba = async (nombre, fn) => {
    await fn();
    ok++;
    console.log('  OK  ' + nombre);
  };

  console.log('Probando ' + base);

  await prueba('GET /api/health responde ok', async () => {
    const r = await req('GET', '/api/health');
    assert.strictEqual(r.status, 200);
    assert.strictEqual(r.data.estado, 'ok');
  });

  let id;
  await prueba('POST /api/pedidos crea pedido con detalle y calcula total', async () => {
    const r = await req('POST', '/api/pedidos', {
      cliente: 'Cliente Prueba',
      detalles: [
        { producto: 'Teclado', cantidad: 2, precio: 100 },
        { producto: 'Mouse', cantidad: 1, precio: 50.5 }
      ]
    });
    assert.strictEqual(r.status, 201);
    assert.strictEqual(r.data.detalles.length, 2);
    assert.strictEqual(r.data.total, 250.5);
    id = r.data.id;
  });

  await prueba('POST /api/pedidos sin cliente devuelve 400', async () => {
    const r = await req('POST', '/api/pedidos', { detalles: [] });
    assert.strictEqual(r.status, 400);
  });

  await prueba('GET /api/pedidos/:id devuelve el pedido con su detalle', async () => {
    const r = await req('GET', '/api/pedidos/' + id);
    assert.strictEqual(r.status, 200);
    assert.strictEqual(r.data.cliente, 'Cliente Prueba');
  });

  await prueba('POST /api/pedidos/:id/detalles agrega una linea', async () => {
    const r = await req('POST', '/api/pedidos/' + id + '/detalles', { producto: 'Cable', cantidad: 3, precio: 10 });
    assert.strictEqual(r.status, 201);
    assert.strictEqual(r.data.total, 280.5);
  });

  await prueba('PUT /api/pedidos/:id actualiza el cliente', async () => {
    const r = await req('PUT', '/api/pedidos/' + id, { cliente: 'Otro Cliente' });
    assert.strictEqual(r.data.cliente, 'Otro Cliente');
  });

  await prueba('GET /api/pedidos lista los pedidos', async () => {
    const r = await req('GET', '/api/pedidos');
    assert.ok(r.data.some(p => p.id === id));
  });

  await prueba('DELETE /api/pedidos/:id elimina y luego da 404', async () => {
    const d = await req('DELETE', '/api/pedidos/' + id);
    assert.strictEqual(d.status, 204);
    const r = await req('GET', '/api/pedidos/' + id);
    assert.strictEqual(r.status, 404);
  });

  console.log('\n' + ok + ' pruebas pasaron.');
  if (server) server.close();
}

main().catch(e => {
  console.error('FALLO:', e.message);
  process.exit(1);
});
