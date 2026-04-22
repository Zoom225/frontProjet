import { Injectable } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { AuthApiService } from '../api/auth-api.service';
import { LoginRequest, LoginResponse } from '../../shared/models/auth.model';
import { AdminSessionService } from './admin-session.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  constructor(
    private readonly authApi: AuthApiService,
    private readonly adminSession: AdminSessionService
  ) {}

  login(payload: LoginRequest): Observable<LoginResponse> {
    return this.authApi.login(payload).pipe(
      tap((response) => this.adminSession.setSession(response))
    );
  }

  logout(): void {
    this.adminSession.clearSession();
  }
}

