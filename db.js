const sql = require('mssql');

// Los datos de conexion salen de variables de entorno (.env en local,
// panel "Environment" en Render). La contrasena NUNCA va en el codigo.
function configuracion() {
  return {
    user: process.env.DB_USER || 'UsuarioEncuestas',
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER || 'svr-sql-ctezo.southcentralus.cloudapp.azure.com',
    database: process.env.DB_NAME || 'db_WebDevUMG',
    port: Number(process.env.DB_PORT || 1433),
    options: { encrypt: true, trustServerCertificate: true },
    pool: { max: 5, min: 0, idleTimeoutMillis: 30000 },
    connectionTimeout: 20000,
    requestTimeout: 20000
  };
}

let poolPromise = null;

function getPool() {
  if (!process.env.DB_PASSWORD) {
    return Promise.reject(new Error('Falta la variable de entorno DB_PASSWORD'));
  }
  if (!poolPromise) {
    poolPromise = new sql.ConnectionPool(configuracion())
      .connect()
      .catch(err => {
        poolPromise = null; // permite reintentar en la siguiente peticion
        throw err;
      });
  }
  return poolPromise;
}

module.exports = { sql, getPool };
