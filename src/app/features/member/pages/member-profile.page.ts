import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Router, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { MembresApiService } from '../../../core/api/membres-api.service';
import { MemberSessionService } from '../../../core/auth/member-session.service';
import { MembreResponse } from '../../../shared/models/membre.model';

@Component({
  selector: 'app-member-profile-page',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatCardModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatChipsModule
  ],
  template: `
    <section class="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8">
      <mat-card>
        <mat-card-header>
          <mat-card-title>Mon profil membre</mat-card-title>
          <mat-card-subtitle>Informations rechargees depuis le backend</mat-card-subtitle>
        </mat-card-header>

        <mat-card-content>
          @if (loading()) {
            <div class="py-4">
              <mat-spinner diameter="28"></mat-spinner>
            </div>
          } @else if (profile()) {
            <div class="grid gap-4 md:grid-cols-2">
              <div>
                <p><strong>Nom:</strong> {{ profile()!.nom }}</p>
                <p><strong>Prenom:</strong> {{ profile()!.prenom }}</p>
                <p><strong>Email:</strong> {{ profile()!.email || 'Non renseigne' }}</p>
                <p><strong>Matricule:</strong> {{ profile()!.matricule }}</p>
              </div>

              <div>
                <p><strong>Type:</strong> {{ profile()!.typeMembre }}</p>
                <p><strong>Site:</strong> {{ profile()!.siteNom || 'Tous les sites' }}</p>
                <p><strong>Solde:</strong> {{ profile()!.solde }} EUR</p>
              </div>
            </div>

            <div class="mt-4 flex flex-wrap gap-2">
              <mat-chip-set>
                <mat-chip [highlighted]="true" [color]="hasPenalty() ? 'warn' : 'primary'">
                  Penalite active: {{ hasPenalty() ? 'Oui' : 'Non' }}
                </mat-chip>
                <mat-chip [highlighted]="true" [color]="hasBalance() ? 'warn' : 'primary'">
                  Solde en attente: {{ hasBalance() ? 'Oui' : 'Non' }}
                </mat-chip>
              </mat-chip-set>
            </div>
          }

          @if (errorMessage()) {
            <p class="mt-4 text-sm text-red-600">{{ errorMessage() }}</p>
          }

          <div class="mt-6 flex flex-wrap gap-3">
            <button mat-flat-button color="primary" type="button" (click)="reload()">Rafraichir</button>
            <a mat-stroked-button routerLink="/member">Retour espace membre</a>
            <button mat-stroked-button type="button" (click)="logout()">Deconnexion membre</button>
          </div>
        </mat-card-content>
      </mat-card>
    </section>
  `
})
export class MemberProfilePage {
  private readonly membresApi = inject(MembresApiService);
  private readonly memberSession = inject(MemberSessionService);
  private readonly router = inject(Router);

  readonly loading = signal(false);
  readonly errorMessage = signal('');
  readonly profile = signal<MembreResponse | null>(null);
  readonly hasPenalty = signal(false);
  readonly hasBalance = signal(false);
  readonly memberId = computed(() => this.memberSession.memberId());

  constructor() {
    this.reload();
  }

  reload(): void {
    const memberId = this.memberId();
    if (!memberId) {
      this.logout();
      return;
    }

    this.loading.set(true);
    this.errorMessage.set('');

    forkJoin({
      profile: this.membresApi.getById(memberId),
      hasPenalty: this.membresApi.hasPenalty(memberId),
      hasBalance: this.membresApi.hasBalance(memberId)
    }).subscribe({
      next: ({ profile, hasPenalty, hasBalance }) => {
        this.profile.set(profile);
        this.memberSession.setMember(profile);
        this.hasPenalty.set(hasPenalty);
        this.hasBalance.set(hasBalance);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.errorMessage.set('Impossible de charger le profil membre.');
      }
    });
  }

  logout(): void {
    this.memberSession.clearMember();
    this.router.navigateByUrl('/member');
  }
}

