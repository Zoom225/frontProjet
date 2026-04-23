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
    <section class="page-shell max-w-5xl">
      <mat-card class="card-soft">
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
            <p class="status-error mt-4">{{ errorMessage() }}</p>
          }

          <!-- Bloc creation rapide de match -->
          <div class="mt-6">
            <div class="mb-3 flex items-center gap-2">
              <span style="font-size:1.4rem;">🎾</span>
              <h3 style="margin:0; font-size:1.1rem; font-weight:700; color:#14532d;">Créer un match rapidement</h3>
            </div>
            <div class="grid gap-3 md:grid-cols-2">
              <!-- Match PUBLIC -->
              <a [routerLink]="['/member/matches/new']" [queryParams]="{type:'PUBLIC'}"
                 style="display:block; text-decoration:none; border-radius:1rem; padding:1.25rem 1.5rem;
                        background: linear-gradient(135deg, #dcfce7, #bbf7d0);
                        border: 2px solid #4ade80; transition: transform 0.15s, box-shadow 0.15s;"
                 onmouseover="this.style.transform='translateY(-3px)';this.style.boxShadow='0 8px 24px rgba(34,197,94,0.25)'"
                 onmouseout="this.style.transform='translateY(0)';this.style.boxShadow='none'">
                <div style="display:flex; align-items:center; gap:0.75rem; margin-bottom:0.5rem;">
                  <span style="font-size:2rem;">🌍</span>
                  <div>
                    <div style="font-size:0.7rem; font-weight:700; letter-spacing:0.08em; text-transform:uppercase; color:#15803d;">Match ouvert</div>
                    <div style="font-size:1.15rem; font-weight:800; color:#14532d;">Créer match PUBLIC</div>
                  </div>
                </div>
                <p style="margin:0; font-size:0.85rem; color:#166534;">N'importe quel membre peut rejoindre · 15 €/joueur · 4 joueurs requis</p>
              </a>

              <!-- Match PRIVÉ -->
              <a [routerLink]="['/member/matches/new']" [queryParams]="{type:'PRIVE'}"
                 style="display:block; text-decoration:none; border-radius:1rem; padding:1.25rem 1.5rem;
                        background: linear-gradient(135deg, #ede9fe, #ddd6fe);
                        border: 2px solid #a78bfa; transition: transform 0.15s, box-shadow 0.15s;"
                 onmouseover="this.style.transform='translateY(-3px)';this.style.boxShadow='0 8px 24px rgba(139,92,246,0.25)'"
                 onmouseout="this.style.transform='translateY(0)';this.style.boxShadow='none'">
                <div style="display:flex; align-items:center; gap:0.75rem; margin-bottom:0.5rem;">
                  <span style="font-size:2rem;">🔒</span>
                  <div>
                    <div style="font-size:0.7rem; font-weight:700; letter-spacing:0.08em; text-transform:uppercase; color:#7c3aed;">Match sur invitation</div>
                    <div style="font-size:1.15rem; font-weight:800; color:#4c1d95;">Créer match PRIVÉ</div>
                  </div>
                </div>
                <p style="margin:0; font-size:0.85rem; color:#5b21b6;">Tu invites 3 joueurs par matricule · Converti en public si incomplet la veille</p>
              </a>
            </div>
          </div>

          <!-- Navigation rapide -->
          <div class="mt-6 grid gap-4 md:grid-cols-3">
            <a routerLink="/member/matches" class="card-soft block rounded-2xl p-5 no-underline transition hover:-translate-y-0.5 hover:shadow-md">
              <p class="text-sm font-medium uppercase tracking-wide text-indigo-700">🔍 Explorer</p>
              <p class="mt-2 text-xl font-semibold text-slate-900">Matchs publics</p>
              <p class="mt-2 text-sm text-slate-600">Rejoins rapidement une partie disponible.</p>
            </a>
            <a routerLink="/member/reservations" class="card-soft block rounded-2xl p-5 no-underline transition hover:-translate-y-0.5 hover:shadow-md">
              <p class="text-sm font-medium uppercase tracking-wide text-emerald-700">📋 Suivi</p>
              <p class="mt-2 text-xl font-semibold text-slate-900">Mes reservations</p>
              <p class="mt-2 text-sm text-slate-600">Paye, annule ou suis tes inscriptions.</p>
            </a>
            <a routerLink="/member/payments" class="card-soft block rounded-2xl p-5 no-underline transition hover:-translate-y-0.5 hover:shadow-md">
              <p class="text-sm font-medium uppercase tracking-wide text-orange-700">💳 Finances</p>
              <p class="mt-2 text-xl font-semibold text-slate-900">Mes paiements</p>
              <p class="mt-2 text-sm text-slate-600">Historique de tes paiements.</p>
            </a>
          </div>

          <div class="mt-6 flex flex-wrap gap-3">
            <button mat-flat-button color="primary" type="button" (click)="reload()">Rafraichir</button>
            <a mat-stroked-button routerLink="/member/matches">Matchs publics</a>
            <a mat-stroked-button routerLink="/member/reservations">Mes reservations</a>
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

