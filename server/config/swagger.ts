import swaggerJsdoc from 'swagger-jsdoc';

const swaggerOptions = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'EDUPORTAL SMAN 1 Halmahera Tengah API',
      version: '1.0.0',
      description: 'Dokumentasi dan pengujian REST API EDUPORTAL.'
    },
    servers: [
      {
        url: '/',
        description: 'Server EDUPORTAL'
      }
    ],
    paths: {
      '/api/health': {
        get: {
          summary: 'Memeriksa status API EDUPORTAL',
          description: 'Mengambil informasi status server, database, guru, siswa, dan data lainnya.',
          tags: ['System'],
          responses: {
            '200': {
              description: 'API berhasil merespons.',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      ok: { type: 'boolean', example: true },
                      name: { type: 'string' },
                      database: { type: 'string', example: 'PostgreSQL' },
                      announcements: { type: 'integer' },
                      gallery: { type: 'integer' },
                      videos: { type: 'integer' },
                      kombelActivities: { type: 'integer' },
                      teachers: { type: 'integer' },
                      students: { type: 'integer' },
                      ppdb: { type: 'integer' },
                      assignments: { type: 'integer' }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  },
  apis: []
};

export const swaggerSpec = swaggerJsdoc(swaggerOptions);