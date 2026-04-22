import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { MatchesApiService } from '../../../core/api/matches-api.service';
import { ReservationsApiService } from '../../../core/api/reservations-api.service';
import { SitesApiService } from '../../../core/api/sites-api.service';
import { MemberSessionService } from '../../../core/auth/member-session.service';
import { MatchResponse } from '../../../shared/models/match.model';
import { SiteResponse } from '../../../shared/models/site-terrain.model';
import { extractApiErrorMessage } from '../../../shared/utils/api-error.util';

@Component({
  selector: 'app-member-public-matches-page',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatCardModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatProgressSpinnerModule
  ],
  template: `
    <section class="page-shell">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 class="text-2xl font-semibold text-slate-900">Matchs publics</h1>
          <p class="text-sm text-slate-600">Rejoins un match public disponible. Premier paye = premier servi.</p>
        </div>
        <div class="flex gap-2">
          <a mat-stroked-button routerLink="/member/profile">Mon profil</a>
          <a mat-flat-button color="primary" routerLink="/member/matches/new">Creer un match</a>
        </div>
      </div>

      <mat-card class="card-soft">
        <mat-card-content class="grid gap-4 pt-4 md:grid-cols-3">
          <mat-form-field appearance="outline">
            <mat-label>Filtrer par site</mat-label>
            <mat-select [value]="selectedSiteId()" (valueChange)="selectedSiteId.set($event)">
              <mat-option [value]="0">Tous les sites</mat-option>
              @for (site of sites(); track site.id) {
                <mat-option [value]="site.id">{{ site.nom }}</mat-option>
              }
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline" class="md:col-span-2">
            <mat-label>Recherche</mat-label>
            <input
              matInput
              [value]="search()"
              (input)="search.set(($any($event.target)).value)"
              placeholder="Terrain, site, organisateur"
            />
          </mat-form-field>
        </mat-card-content>
      </mat-card>

      @if (loading()) {
        <div class="py-4">
          <mat-spinner diameter="32"></mat-spinner>
        </div>
      }

      @if (message()) {
        <p class="status-success">{{ message() }}</p>
      }

      @if (errorMessage()) {
        <p class="status-error">{{ errorMessage() }}</p>
      }

      <div class="grid gap-4 lg:grid-cols-2">
        @for (match of filteredMatches(); track match.id) {
          <mat-card class="card-soft">
            <mat-card-header>
              <mat-card-title>{{ match.terrainNom }} - {{ match.siteNom }}</mat-card-title>
              <mat-card-subtitle>
                {{ match.date }} · {{ match.heureDebut }} - {{ match.heureFin }}
              </mat-card-subtitle>
            </mat-card-header>
            <mat-card-content class="space-y-2">
              <p><strong>Organisateur:</strong> {{ match.organisateurNom }}</p>
              <p><strong>Statut:</strong> {{ match.statut }}</p>
              <p><strong>Type:</strong> {{ match.typeMatch }}</p>
              <p><strong>Joueurs:</strong> {{ match.nbJoueursActuels }}/4</p>
              <p><strong>Prix par joueur:</strong> {{ match.prixParJoueur }} EUR</p>
            </mat-card-content>
            <mat-card-actions>
              <button
                mat-flat-button
                color="primary"
                type="button"
                (click)="joinMatch(match)"
                [disabled]="joiningMatchId() === match.id"
              >
                {{ joiningMatchId() === match.id ? 'Reservation...' : 'Rejoindre' }}
              </button>
            </mat-card-actions>
          </mat-card>
        } @empty {
          @if (!loading()) {
            <mat-card>
              <mat-card-content class="py-6 text-slate-600">
                Aucun match public ne correspond aux filtres.
              </mat-card-content>
            </mat-card>
          }
        }
      </div>
    </section>
  `
})
export class MemberPublicMatchesPage {
  private readonly matchesApi = inject(MatchesApiService);
  private readonly sitesApi = inject(SitesApiService);
  private readonly reservationsApi = inject(ReservationsApiService);
  private readonly memberSession = inject(MemberSessionService);

  readonly loading = signal(false);
  readonly joiningMatchId = signal<number | null>(null);
  readonly message = signal('');
  readonly errorMessage = signal('');
  readonly matches = signal<MatchResponse[]>([]);
  readonly sites = signal<SiteResponse[]>([]);
  readonly selectedSiteId = signal<number>(0);
  readonly search = signal('');

  readonly filteredMatches = computed(() => {
    const siteId = this.selectedSiteId();
    const search = this.search().trim().toLowerCase();

    return this.matches().filter((match) => {
      const matchesSite = !siteId || this.sites().find((site) => site.id === siteId)?.nom === match.siteNom;
      const haystack = `${match.terrainNom} ${match.siteNom} ${match.organisateurNom}`.toLowerCase();
      const matchesSearch = !search || haystack.includes(search);
      return matchesSite && matchesSearch;
    });
  });

  constructor() {
    this.loadData();
  }

  loadData(): void {
    this.loading.set(true);
    this.message.set('');
    this.errorMessage.set('');

    forkJoin({
      matches: this.matchesApi.getPublic(),
      sites: this.sitesApi.getAll()
    }).subscribe({
      next: ({ matches, sites }) => {
        this.matches.set(matches);
        this.sites.set(sites);
        this.loading.set(false);
      },
      error: (error) => {
        this.loading.set(false);
        this.errorMessage.set(extractApiErrorMessage(error, 'Impossible de charger les matchs publics.'));
      }
    });
  }

  joinMatch(match: MatchResponse): void {
    const memberId = this.memberSession.memberId();
    if (!memberId) {
      this.errorMessage.set('Aucun membre connecte.');
      return;
    }

    this.joiningMatchId.set(match.id);
    this.message.set('');
    this.errorMessage.set('');

    this.reservationsApi
      .create({
        matchId: match.id,
        membreId: memberId,
        requesterId: memberId
      })
      .subscribe({
        next: () => {
          this.joiningMatchId.set(null);
          this.message.set('Reservation creee. Va dans Mes reservations pour payer.');
        },
        error: (error) => {
          this.joiningMatchId.set(null);
          this.errorMessage.set(extractApiErrorMessage(error, 'Impossible de reserver ce match.'));
        }
      });
  }
}

