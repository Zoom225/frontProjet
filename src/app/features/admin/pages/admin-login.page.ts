import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-admin-login-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatProgressSpinnerModule
  ],
  template: `
    <section class="mx-auto flex min-h-[calc(100vh-64px)] w-full max-w-md items-center px-4 py-8">
      <mat-card class="w-full">
        <mat-card-header>
          <mat-card-title>Connexion administrateur</mat-card-title>
          <mat-card-subtitle>Acces reserve aux admins GLOBAL/SITE</mat-card-subtitle>
        </mat-card-header>

        <mat-card-content>
          <form [formGroup]="form" class="mt-4 flex flex-col gap-3" (ngSubmit)="submit()">
            <mat-form-field appearance="outline">
              <mat-label>Email</mat-label>
              <input matInput type="email" formControlName="email" />
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Mot de passe</mat-label>
              <input matInput type="password" formControlName="password" />
            </mat-form-field>

            @if (errorMessage()) {
              <p class="text-sm text-red-600">{{ errorMessage() }}</p>
            }

            <div class="mt-2 flex items-center gap-2">
              <button mat-flat-button color="primary" type="submit" [disabled]="loading() || form.invalid">
                Se connecter
              </button>
              <a mat-stroked-button routerLink="/">Retour</a>
              @if (loading()) {
                <mat-spinner diameter="22"></mat-spinner>
              }
            </div>
          </form>
        </mat-card-content>
      </mat-card>
    </section>
  `
})
export class AdminLoginPage {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly loading = signal(false);
  readonly errorMessage = signal('');

  readonly form = new FormGroup({
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email]
    }),
    password: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required]
    })
  });

  submit(): void {
    if (this.form.invalid || this.loading()) {
      return;
    }

    this.loading.set(true);
    this.errorMessage.set('');

    this.authService.login(this.form.getRawValue()).subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigateByUrl('/admin');
      },
      error: () => {
        this.loading.set(false);
        this.errorMessage.set('Echec de connexion. Verifie email et mot de passe.');
      }
    });
  }
}
