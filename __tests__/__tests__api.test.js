// __tests__/api.test.js
const request = require('supertest');
const app = require('../server'); // Necesitarías exportar 'app' desde server.js

describe('GET /api', () => {
    it('should respond with a 200 status code', async () => {
        const response = await request(app).get('/api');
        expect(response.statusCode).toBe(200);
        expect(response.text).toBe('API del Catalogador funcionando!');
    });
});