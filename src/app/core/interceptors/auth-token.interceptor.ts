import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AdminSessionService } from '../auth/admin-session.service';

export const authTokenInterceptor: HttpInterceptorFn = (req, next) => {
  const session = inject(AdminSessionService);
  const token = session.token();

  const isApiCall = req.url.startsWith('/api');
  const isLoginCall = req.url.includes('/api/auth/login');

  if (!token || !isApiCall || isLoginCall) {
    return next(req);
  }

  return next(
    req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    })
  );
};

