import swaggerJSDoc from 'swagger-jsdoc';

/**
 * Swagger / OpenAPI yapılandırması.
 * Yollar (paths) route dosyalarındaki @openapi JSDoc bloklarından taranır.
 * Ortak şemalar ve örnekler burada tanımlanır.
 */
const definition = {
  openapi: '3.0.3',
  info: {
    title: 'TaskFlow API',
    version: '1.0.0',
    description:
      'Kanban görev takip uygulaması REST API. Kimlik doğrulama JWT (Bearer) iledir. ' +
      'Tüm SQL sorguları parametrelidir (pg kütüphanesi).',
  },
  servers: [{ url: 'http://localhost:4000', description: 'Yerel geliştirme' }],
  tags: [
    { name: 'Auth', description: 'Kayıt / giriş / oturum' },
    { name: 'Boards', description: 'Board (pano) yönetimi ve üyelik' },
    { name: 'Lists', description: 'Board içindeki listeler' },
    { name: 'Cards', description: 'Kartlar, taşıma ve etiketler' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
    schemas: {
      Error: {
        type: 'object',
        properties: {
          error: { type: 'string', example: 'Geçersiz veya süresi dolmuş token.' },
        },
      },
      User: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          name: { type: 'string', example: 'Umut Boran' },
          email: { type: 'string', example: 'umut@taskflow.dev' },
          created_at: { type: 'string', format: 'date-time', example: '2026-06-27T09:00:00.000Z' },
        },
      },
      AuthResponse: {
        type: 'object',
        properties: {
          user: { $ref: '#/components/schemas/User' },
          token: {
            type: 'string',
            example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MX0.abc123',
          },
        },
      },
      Board: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          name: { type: 'string', example: 'Yaz Stajı Görev Panosu' },
          owner_id: { type: 'integer', example: 1 },
          role: { type: 'string', example: 'admin' },
          created_at: { type: 'string', format: 'date-time', example: '2026-06-27T09:00:00.000Z' },
        },
      },
      List: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          board_id: { type: 'integer', example: 1 },
          title: { type: 'string', example: 'Yapılacak' },
          position: { type: 'integer', example: 0 },
        },
      },
      Card: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 5 },
          list_id: { type: 'integer', example: 2 },
          title: { type: 'string', example: 'Board CRUD uç noktaları' },
          description: { type: 'string', example: 'GET/POST/PUT/DELETE /api/boards.' },
          position: { type: 'integer', example: 0 },
          due_date: { type: 'string', format: 'date', example: '2026-07-08' },
          assigned_to: { type: 'integer', nullable: true, example: 1 },
          label_ids: { type: 'array', items: { type: 'integer' }, example: [3, 1] },
          created_at: { type: 'string', format: 'date-time', example: '2026-06-30T12:00:00.000Z' },
        },
      },
      Label: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          board_id: { type: 'integer', example: 1 },
          name: { type: 'string', example: 'Acil' },
          color: { type: 'string', example: '#eb5a46' },
        },
      },
    },
  },
  security: [{ bearerAuth: [] }],
};

const options = {
  definition,
  // Yolları route dosyalarındaki JSDoc bloklarından tara
  apis: ['./src/routes/*.js'],
};

export const swaggerSpec = swaggerJSDoc(options);
