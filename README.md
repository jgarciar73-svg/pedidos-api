# Pedidos API (Maestro-Detalle)

Reto Web - API en Node.js/Express con frontend.

Autor: Joshua Eduardo Garcia Reyes - Carnet 1890-22-5831

## Que hace

Un pedido (maestro) tiene varias lineas de producto (detalle). El frontend en `/` permite crear, ver y eliminar pedidos.

## Ejecutar en local

```bash
npm install
npm start
```

Abrir http://localhost:3000

## Endpoints

| Metodo | Ruta | Descripcion |
|--------|------|-------------|
| GET | /api/health | Estado del servicio |
| GET | /api/pedidos | Lista de pedidos con total |
| GET | /api/pedidos/:id | Un pedido con su detalle |
| POST | /api/pedidos | Crea pedido (cliente, detalles[]) |
| PUT | /api/pedidos/:id | Actualiza cliente o fecha |
| DELETE | /api/pedidos/:id | Elimina pedido |
| POST | /api/pedidos/:id/detalles | Agrega linea al detalle |
| DELETE | /api/pedidos/:id/detalles/:detalleId | Elimina una linea |

Ejemplo de POST /api/pedidos:

```json
{
  "cliente": "Maria Lopez",
  "detalles": [
    { "producto": "Teclado", "cantidad": 2, "precio": 100 }
  ]
}
```

## Pruebas

```bash
npm test
BASE_URL=https://tu-app.onrender.com npm test
```

## Despliegue en Render

- Build command: `npm install`
- Start command: `npm start`
