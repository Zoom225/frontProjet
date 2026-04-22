import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { MatchesApiService } from '../../../core/api/matches-api.service';
import { ReservationsApiService } from '../../../core/api/reservations-api.service';
import { SitesApiService } from '../../../core/api/sites-api.service';
import { AdminSessionService } from '../../../core/auth/admin-session.service';
import { MatchResponse } from '../../../shared/models/match.model';
import { ReservationResponse } from '../../../shared/models/reservation.model';
import { SiteResponse } from '../../../shared/models/site-terrain.model';
import { extractApiErrorMessage } from '../../../shared/utils/api-error.util';

@Component({
  selector: 'app-admin-matches-page',
  standalone: true,
  imports: [CommonModule, RouterLink, MatCardModule, MatButtonModule, MatProgressSpinnerModule],
  template: `
    <section class="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 class="text-2xl font-semibold text-slate-900">Gestion des matchs</h1>
          <p class="text-sm text-slate-600">Consultation, details, conversion en public.</p>
        </div>
        <a mat-stroked-button routerLink="/admin">Retour dashboard</a>
      </div>

      @if (loading()) {
        <mat-spinner diameter="32"></mat-spinner>
      }
      @if (message()) {
        <p class="text-sm text-emerald-700">{{ message() }}</p>
      }
      @if (errorMessage()) {
        <p class="text-sm text-red-600">{{ errorMessage() }}</p>
      }

      <div class="grid gap-4 lg:grid-cols-2">
        @for (match of filteredMatches(); track match.id) {
          <mat-card>
            <mat-card-header>
              <mat-card-title>{{ match.terrainNom }} - {{ match.siteNom }}</mat-card-title>
              <mat-card-subtitle>{{ match.date }} · {{ match.heureDebut }} - {{ match.heureFin }}</mat-card-subtitle>
            </mat-card-header>
            <mat-card-content class="space-y-2">
              <p><strong>Organisateur:</strong> {{ match.organisateurNom }}</p>
              <p><strong>Type:</strong> {{ match.typeMatch }}</p>
              <p><strong>Statut:</strong> {{ match.statut }}</p>
              <p><strong>Joueurs:</strong> {{ match.nbJoueursActuels }}/4</p>

              @if (selectedMatchId() === match.id) {
                <div class="rounded border border-slate-200 p-3">
                  <p class="mb-2 font-medium">Reservations du match</p>
                  @for (reservation of selectedReservations(); track reservation.id) {
                    <div class="mb-2 rounded bg-slate-50 p-2 text-sm">
                      {{ reservation.membreNom }} · {{ reservation.statut }} · {{ reservation.paiement.statut }}
                    </div>
                  } @empty {
                    <p class="text-sm text-slate-600">Aucune reservation.</p>
                  }
                </div>
              }
            </mat-card-content>
            <mat-card-actions>
              <button mat-stroked-button type="button" (click)="showReservations(match)">
                {{ selectedMatchId() === match.id ? 'Masquer details' : 'Voir details' }}
              </button>
              <button
                mat-flat-button
                color="primary"
                type="button"
                (click)="convertToPublic(match.id)"
                [disabled]="match.typeMatch !== 'PRIVE'"
              >
                Convertir en public
              </button>
            </mat-card-actions>
          </mat-card>
        }
      </div>
    </section>
  `
})
export class AdminMatchesPage {
  private readonly matchesApi = inject(MatchesApiService);
  private readonly reservationsApi = inject(ReservationsApiService);
  private readonly sitesApi = inject(SitesApiService);
  private readonly adminSession = inject(AdminSessionService);

  readonly loading = signal(false);
  readonly message = signal('');
  readonly errorMessage = signal('');
  readonly matches = signal<MatchResponse[]>([]);
  readonly sites = signal<SiteResponse[]>([]);
  readonly selectedMatchId = signal<number | null>(null);
  readonly selectedReservations = signal<ReservationResponse[]>([]);

  readonly filteredMatches = computed(() => {
    if (this.adminSession.isGlobalAdmin()) {
      return this.matches();
    }
    const siteNames = new Set(this.sites().map((site) => site.nom));
    return this.matches().filter((match) => siteNames.has(match.siteNom));
  });

  constructor() {
    this.loadData();
  }

  loadData(): void {
    this.loading.set(true);
    forkJoin({
      matches: this.matchesApi.getAll(),
      sites: this.sitesApi.getAll()
    }).subscribe({
      next: ({ matches, sites }) => {
        this.matches.set(matches);
        this.sites.set(this.adminSession.isGlobalAdmin() ? sites : sites.filter((site) => site.id === this.adminSession.siteId()));
        this.loading.set(false);
      },
      error: (error) => {
        this.loading.set(false);
        this.errorMessage.set(extractApiErrorMessage(error, 'Impossible de charger les matchs admin.'));
      }
    });
  }

  showReservations(match: MatchResponse): void {
    if (this.selectedMatchId() === match.id) {
      this.selectedMatchId.set(null);
      this.selectedReservations.set([]);
      return;
    }

    this.selectedMatchId.set(match.id);
    this.reservationsApi.getByMatch(match.id).subscribe({
      next: (reservations) => this.selectedReservations.set(reservations),
      error: (error) => {
        this.errorMessage.set(extractApiErrorMessage(error, 'Impossible de charger les reservations du match.'));
      }
    });
  }

  convertToPublic(matchId: number): void {
    this.message.set('');
    this.errorMessage.set('');

    this.matchesApi.convertToPublic(matchId).subscribe({
      next: () => {
        this.message.set('Match converti en public.');
        this.loadData();
      },
      error: (error) => {
        this.errorMessage.set(extractApiErrorMessage(error, 'Conversion impossible.'));
      }
    });
  }
}

