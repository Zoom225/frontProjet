import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Router } from '@angular/router';
import { MembresApiService } from '../../../core/api/membres-api.service';
import { MemberSessionService } from '../../../core/auth/member-session.service';

@Component({
  selector: 'app-member-home-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatProgressSpinnerModule
  ],
  template: `
    <section class="page-shell max-w-5xl">
      <mat-card class="card-soft">
        <mat-card-header>
          <mat-card-title>Identification membre</mat-card-title>
          <mat-card-subtitle>Entrez votre matricule pour acceder a votre espace</mat-card-subtitle>
        </mat-card-header>

        <mat-card-content>
          <form [formGroup]="form" class="mt-4 flex flex-col gap-3" (ngSubmit)="submit()">
            <mat-form-field appearance="outline">
              <mat-label>Matricule</mat-label>
              <input matInput formControlName="matricule" placeholder="Ex: G1234, S12345, L12345" />
            </mat-form-field>

            <p class="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
              Matricule GLOBAL: G1234 · SITE: S12345 · LIBRE: L12345
            </p>

            @if (errorMessage()) {
              <p class="status-error">{{ errorMessage() }}</p>
            }

            <div class="mt-2 flex items-center gap-3">
              <button mat-flat-button color="primary" type="submit" [disabled]="form.invalid || loading()">
                Acceder a mon espace
              </button>

              @if (loading()) {
                <mat-spinner diameter="24"></mat-spinner>
              }
            </div>
          </form>
        </mat-card-content>
      </mat-card>
    </section>
  `
})
export class MemberHomePage {
  private readonly membresApi = inject(MembresApiService);
  private readonly memberSession = inject(MemberSessionService);
  private readonly router = inject(Router);

  readonly loading = signal(false);
  readonly errorMessage = signal('');

  readonly form = new FormGroup({
    matricule: new FormControl('', {
      nonNullable: true,
      validators: [
        Validators.required,
        Validators.pattern(/^(G\d{4}|S\d{5}|L\d{5})$/)
      ]
    })
  });

  constructor() {
    if (this.memberSession.isAuthenticated()) {
      this.router.navigateByUrl('/member/profile');
    }
  }

  submit(): void {
    if (this.form.invalid || this.loading()) {
      return;
    }

    this.loading.set(true);
    this.errorMessage.set('');

    const matricule = this.form.controls.matricule.getRawValue().trim().toUpperCase();

    this.membresApi.getByMatricule(matricule).subscribe({
      next: (member) => {
        this.memberSession.setMember(member);
        this.loading.set(false);
        this.router.navigateByUrl('/member/profile');
      },
      error: () => {
        this.loading.set(false);
        this.errorMessage.set('Matricule introuvable. Verifiez la valeur saisie.');
      }
    });
  }
}
