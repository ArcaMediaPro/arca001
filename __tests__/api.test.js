// __tests__/api.test.js

const request = require('supertest');
// Necesitamos que server.js exporte la app de Express para poder probarla.
// Asegúrate de añadir 'module.exports = app;' al final de tu server.js
const app = require('../server'); 

describe('Endpoints Básicos de la API', () => {

    it('GET /api debe responder con el mensaje de bienvenida', async () => {
        const response = await request(app).get('/api');
        expect(response.statusCode).toBe(200);
        expect(response.text).toBe('API del Catalogador funcionando!');
    });

    it('GET a una ruta desconocida debe devolver 404', async () => {
        const response = await request(app).get('/una-ruta-que-no-existe');
        // El manejador de errores de Express debería devolver un 404
        // o tu SPA podría devolver el HTML. En este caso, probamos el status.
        expect(response.statusCode).toBe(404); 
    });
    
});