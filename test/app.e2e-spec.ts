import { Test, TestingModule } from '@nestjs/testing';
import {
  INestApplication,
  RequestMethod,
  ValidationPipe,
} from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { TokenService } from './../src/modules/auth/token.service';

// Boots the real module graph (needs a valid .env) without touching the
// database: every request here is rejected before reaching Supabase.
describe('Life Link API (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1', {
      exclude: [{ path: 'health', method: RequestMethod.GET }],
    });
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /health is public', () => {
    return request(app.getHttpServer())
      .get('/health')
      .expect(200)
      .expect({ ok: true });
  });

  it.each([
    '/api/v1/profile',
    '/api/v1/home',
    '/api/v1/requests',
    '/api/v1/auth/me',
  ])('GET %s requires a token', (path) =>
    request(app.getHttpServer()).get(path).expect(401),
  );

  it('rejects a forged token', () => {
    return request(app.getHttpServer())
      .get('/api/v1/profile')
      .set('Authorization', 'Bearer not-a-real-token')
      .expect(401);
  });

  it('validates the register payload', () => {
    return request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ name: 'A', email: 'nope', password: 'short' })
      .expect(400);
  });

  it('rejects unknown fields', () => {
    return request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'a@b.co', password: 'x', isAdmin: true })
      .expect(400);
  });

  it.each([
    '/api/v1/appointments/mine',
    '/api/v1/leaderboard',
    '/api/v1/announcements',
    '/api/v1/admin/dashboard',
  ])('GET %s requires a token', (path) =>
    request(app.getHttpServer()).get(path).expect(401),
  );

  describe('as a regular user', () => {
    // A correctly signed token for a donor; role checks run before any DB call.
    const userToken = () =>
      app.get(TokenService).signAccessToken({
        id: '00000000-0000-4000-8000-000000000001',
        email: 'donor@example.com',
        role: 'user',
        hospital_id: null,
      });

    it.each([
      ['get', '/api/v1/admin/dashboard'],
      ['get', '/api/v1/admin/analytics'],
      ['get', '/api/v1/admin/users'],
      ['get', '/api/v1/admin/reports'],
      ['post', '/api/v1/admin/announcements'],
    ] as const)('%s %s is forbidden', (method, path) =>
      request(app.getHttpServer())
        [method](path)
        .set('Authorization', `Bearer ${userToken()}`)
        .expect(403),
    );

    it('validates appointment bookings', () =>
      request(app.getHttpServer())
        .post('/api/v1/appointments')
        .set('Authorization', `Bearer ${userToken()}`)
        .send({ hospitalId: 'not-a-uuid', scheduledAt: 'tomorrow' })
        .expect(400));

    it('validates ratings', () =>
      request(app.getHttpServer())
        .post('/api/v1/requests/00000000-0000-4000-8000-000000000002/ratings')
        .set('Authorization', `Bearer ${userToken()}`)
        .send({ target: 'donor', score: 9 })
        .expect(400));

    it('validates reports', () =>
      request(app.getHttpServer())
        .post('/api/v1/reports')
        .set('Authorization', `Bearer ${userToken()}`)
        .send({ targetType: 'planet', targetId: 'x', reason: 'boredom' })
        .expect(400));
  });
});
