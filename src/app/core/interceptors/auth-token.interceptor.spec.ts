import { HttpRequest, HttpResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { firstValueFrom, of } from 'rxjs';
import { AdminSessionService } from '../auth/admin-session.service';
import { authTokenInterceptor } from './auth-token.interceptor';

describe('authTokenInterceptor', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
  });

  it('should attach the bearer token on protected API calls', async () => {
    const session = TestBed.inject(AdminSessionService);
    session.setSession({
      token: 'jwt-token',
      email: 'admin@example.com',
      nom: 'Admin',
      prenom: 'Root',
      role: 'GLOBAL',
      siteId: null
    });

    let receivedRequest: HttpRequest<unknown> | null = null;

    await firstValueFrom(
      TestBed.runInInjectionContext(() =>
        authTokenInterceptor(new HttpRequest('GET', '/api/sites'), (req) => {
          receivedRequest = req;
          return of(new HttpResponse({ status: 200 }));
        })
      )
    );

    expect(receivedRequest?.headers.get('Authorization')).toBe('Bearer jwt-token');
  });

  it('should not attach the token on login call', async () => {
    const session = TestBed.inject(AdminSessionService);
    session.setSession({
      token: 'jwt-token',
      email: 'admin@example.com',
      nom: 'Admin',
      prenom: 'Root',
      role: 'GLOBAL',
      siteId: null
    });

    let receivedRequest: HttpRequest<unknown> | null = null;

    await firstValueFrom(
      TestBed.runInInjectionContext(() =>
        authTokenInterceptor(new HttpRequest('POST', '/api/auth/login'), (req) => {
          receivedRequest = req;
          return of(new HttpResponse({ status: 200 }));
        })
      )
    );

    expect(receivedRequest?.headers.has('Authorization')).toBe(false);
  });
});

