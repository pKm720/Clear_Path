const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'ClearPath API Documentation',
      version: '1.0.0',
      description: 'API for health-first navigation using real-time AQI data.',
    },
    servers: [
      {
        url: 'http://localhost:8080',
        description: 'Local development server',
      },
    ],
  },
  apis: ['./src/routes/*.js'], // Path to the API docs
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
