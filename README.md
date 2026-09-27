# API Maestro-Detalle con Catalogo y Control de Estado

Reto Web - Node.js, Express y SQL Server.

Autor: Joshua Eduardo Garcia Reyes - Carnet 1890-22-5831

## Enlaces en linea

- Tablero (frontend): https://pedidos-api-ms9e.onrender.com
- Catalogo de misiones: https://pedidos-api-ms9e.onrender.com/api/misiones
- Estudiantes y avance: https://pedidos-api-ms9e.onrender.com/api/estudiantes
- Registro (POST): https://pedidos-api-ms9e.onrender.com/api/registro

> El servicio esta en el plan gratuito de Render: si estuvo inactivo, la primera peticion puede tardar unos 50 segundos.

## Que hace

- `POST /api/registro` recibe un JSON maestro-detalle: el maestro es el estudiante y el detalle son sus misiones con estado `true/false`.
- Si el carnet no existe lo inserta; si existe, actualiza nombre y correo.
- Cada `misionId` se valida contra el catalogo. Si alguno no existe devuelve un error de referencia y no guarda nada.
- Se puede enviar varias veces: las misiones nuevas se insertan y las existentes actualizan su estado.
- El frontend (`/`) muestra el tablero de avance de todos los alumnos y un formulario para registrar el propio.

## Endpoints

| Metodo | Ruta | Descripcion |
|--------|------|-------------|
| GET | /api/health | Estado del servicio |
| GET | /api/health/db | Prueba la conexion a SQL Server |
| GET | /api/misiones | Catalogo de misiones |
| GET | /api/estudiantes | Estudiantes con sus misiones y porcentaje |
| POST | /api/registro | Registra o actualiza estudiante y misiones |

Ejemplo de POST /api/registro:

```json
{
  "maestro": {
    "carnet": "1890-00-00000",
    "nombre": "NOMBRE COMPLETO",
    "correo": "usuario@miumg.edu.gt"
  },
  "detalle": [
    { "misionId": 1, "estado": true },
    { "misionId": 2, "estado": false }
  ]
}
```

## Ejecutar en local

```bash
npm install
cp .env.example .env   # y escribir DB_PASSWORD
npm start
```

## Variables de entorno

`DB_USER`, `DB_PASSWORD`, `DB_SERVER`, `DB_NAME`. En `DB_SERVER` va el nombre del servidor (`svr-sql-ctezo.southcentralus.cloudapp.azure.com`), no la IP, porque la conexion cifrada no acepta direcciones IP. La contrasena no se guarda en el repositorio: va en `.env` (local) o en la seccion Environment de Render.

## Base de datos

El archivo `database.sql` tiene la estructura de las tres tablas (Estudiantes, Misiones, EstudianteMisiones) segun el diagrama del reto.

## Pruebas

```bash
npm test
BASE_URL=https://tu-app.onrender.com npm test
```

## Despliegue en Render

- Build command: `npm install`
- Start command: `npm start`
- Environment: `DB_PASSWORD` (y opcionalmente el resto)
