// Pruebas de la API (Mision 5). Ninguna escribe datos reales en la base.
// Local (necesita .env con DB_PASSWORD):   npm test
// Contra el hosting:                       BASE_URL=https://tu-app.onrender.com npm test
const assert = require('assert');

async function main() {
  let base = process.env.BASE_URL;
  let server;

  if (!base) {
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
    let data = null;
    try { data = texto ? JSON.parse(texto) : null; } catch (e) { data = texto; }
    return { status: r.status, data };
  };

  const maestro = { carnet: 'PRUEBA-0', nombre: 'Prueba', correo: 'prueba@example.com' };
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
  });

  await prueba('GET /api/health/db confirma conexion a SQL Server', async () => {
    const r = await req('GET', '/api/health/db');
    assert.strictEqual(r.status, 200, JSON.stringify(r.data));
  });

  await prueba('GET /api/misiones devuelve el catalogo', async () => {
    const r = await req('GET', '/api/misiones');
    assert.strictEqual(r.status, 200);
    assert.ok(Array.isArray(r.data) && r.data.length > 0);
    assert.ok('misionId' in r.data[0] && 'nombre' in r.data[0]);
  });

  await prueba('GET /api/estudiantes lista alumnos con sus misiones', async () => {
    const r = await req('GET', '/api/estudiantes');
    assert.strictEqual(r.status, 200);
    assert.ok(Array.isArray(r.data));
    if (r.data.length) assert.ok(Array.isArray(r.data[0].misiones));
  });

  await prueba('POST /api/registro sin maestro devuelve 400', async () => {
    const r = await req('POST', '/api/registro', { detalle: [] });
    assert.strictEqual(r.status, 400);
  });

  await prueba('POST /api/registro con estado no booleano devuelve 400', async () => {
    const r = await req('POST', '/api/registro', { maestro, detalle: [{ misionId: 1, estado: 'si' }] });
    assert.strictEqual(r.status, 400);
  });

  await prueba('POST /api/registro con mision inexistente devuelve error de referencia', async () => {
    const r = await req('POST', '/api/registro', { maestro, detalle: [{ misionId: 99999, estado: true }] });
    assert.strictEqual(r.status, 400);
    assert.ok(/referencia/i.test(r.data.error));
  });

  await prueba('El error de referencia no dejo al estudiante de prueba en la base', async () => {
    const r = await req('GET', '/api/estudiantes');
    assert.ok(!r.data.some(e => e.carnet === maestro.carnet));
  });

  console.log('\n' + ok + ' pruebas pasaron.');
  if (server) server.close();
  process.exit(0);
}

main().catch(e => {
  console.error('FALLO:', e.message);
  process.exit(1);
});
