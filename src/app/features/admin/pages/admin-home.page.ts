import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { MatchesApiService } from '../../../core/api/matches-api.service';
import { MembresApiService } from '../../../core/api/membres-api.service';
import { ReservationsApiService } from '../../../core/api/reservations-api.service';
import { SitesApiService } from '../../../core/api/sites-api.service';
import { TerrainsApiService } from '../../../core/api/terrains-api.service';
import { AdminSessionService } from '../../../core/auth/admin-session.service';
import { MatchResponse } from '../../../shared/models/match.model';
import { MembreResponse } from '../../../shared/models/membre.model';
import { ReservationResponse } from '../../../shared/models/reservation.model';
import { SiteResponse, TerrainResponse } from '../../../shared/models/site-terrain.model';
import { extractApiErrorMessage } from '../../../shared/utils/api-error.util';

@Component({
  selector: 'app-admin-home-page',
  standalone: true,
  imports: [CommonModule, RouterLink, MatCardModule, MatButtonModule, MatProgressSpinnerModule],
  template: `
    <section class="page-shell">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 class="title-gradient text-2xl font-semibold">Dashboard administrateur</h1>
          <p class="text-sm text-slate-600">
            Vue {{ adminSession.isGlobalAdmin() ? 'globale' : 'site' }} des indicateurs principaux.
          </p>
        </div>
        <div class="flex flex-wrap gap-2">
          <a mat-stroked-button routerLink="/admin/members">Membres</a>
          <a mat-stroked-button routerLink="/admin/matches">Matchs</a>
          <a mat-stroked-button routerLink="/admin/sites">Sites</a>
          <a mat-stroked-button routerLink="/admin/terrains">Terrains</a>
          <a mat-stroked-button routerLink="/admin/fermetures">Fermetures</a>
        </div>
      </div>

      @if (loading()) {
        <mat-spinner diameter="32"></mat-spinner>
      }

      @if (errorMessage()) {
        <p class="status-error">{{ errorMessage() }}</p>
      }

      <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <mat-card class="kpi-card panel-gradient"><mat-card-content class="py-2"><p class="text-sm text-sky-700">Matchs</p><p class="text-3xl font-semibold text-slate-900">{{ matches().length }}</p></mat-card-content></mat-card>
        <mat-card class="kpi-card panel-gradient"><mat-card-content class="py-2"><p class="text-sm text-indigo-700">Reservations</p><p class="text-3xl font-semibold text-slate-900">{{ reservations().length }}</p></mat-card-content></mat-card>
        <mat-card class="kpi-card panel-gradient"><mat-card-content class="py-2"><p class="text-sm text-violet-700">Membres</p><p class="text-3xl font-semibold text-slate-900">{{ members().length }}</p></mat-card-content></mat-card>
        <mat-card class="kpi-card panel-gradient"><mat-card-content class="py-2"><p class="text-sm text-emerald-700">Chiffre d'affaires</p><p class="text-3xl font-semibold text-slate-900">{{ revenue() }} EUR</p></mat-card-content></mat-card>
      </div>

      <div class="grid gap-4 lg:grid-cols-2">
        <mat-card class="card-soft">
          <mat-card-header>
            <mat-card-title>Occupation par site</mat-card-title>
          </mat-card-header>
          <mat-card-content class="space-y-2">
            @for (item of occupancyBySite(); track item.site) {
              <div class="flex items-center justify-between rounded border border-slate-200 px-3 py-2">
                <span>{{ item.site }}</span>
                <strong>{{ item.count }} match(s)</strong>
              </div>
            } @empty {
              <p class="text-slate-600">Aucune donnee.</p>
            }
          </mat-card-content>
        </mat-card>

        <mat-card class="card-soft">
          <mat-card-header>
            <mat-card-title>Ressources</mat-card-title>
          </mat-card-header>
          <mat-card-content class="space-y-2">
            <p><strong>Sites visibles:</strong> {{ sites().length }}</p>
            <p><strong>Terrains visibles:</strong> {{ terrains().length }}</p>
            <p><strong>Matchs complets:</strong> {{ completeMatchesCount() }}</p>
            <p><strong>Reservations en attente:</strong> {{ pendingReservationsCount() }}</p>
          </mat-card-content>
        </mat-card>
      </div>
    </section>
  `
})
export class AdminHomePage {
  private readonly matchesApi = inject(MatchesApiService);
  private readonly membresApi = inject(MembresApiService);
  private readonly reservationsApi = inject(ReservationsApiService);
  private readonly sitesApi = inject(SitesApiService);
  private readonly terrainsApi = inject(TerrainsApiService);
  readonly adminSession = inject(AdminSessionService);

  readonly loading = signal(false);
  readonly errorMessage = signal('');
  readonly matches = signal<MatchResponse[]>([]);
  readonly members = signal<MembreResponse[]>([]);
  readonly reservations = signal<ReservationResponse[]>([]);
  readonly sites = signal<SiteResponse[]>([]);
  readonly terrains = signal<TerrainResponse[]>([]);

  readonly revenue = computed(() =>
    this.reservations()
      .filter((reservation) => reservation.paiement?.statut === 'PAYE')
      .reduce((sum, reservation) => sum + (reservation.paiement?.montant ?? 0), 0)
  );
  readonly completeMatchesCount = computed(() => this.matches().filter((match) => match.statut === 'COMPLET').length);
  readonly pendingReservationsCount = computed(
    () => this.reservations().filter((reservation) => reservation.statut === 'EN_ATTENTE').length
  );
  readonly occupancyBySite = computed(() => {
    const map = new Map<string, number>();
    this.matches().forEach((match) => map.set(match.siteNom, (map.get(match.siteNom) ?? 0) + 1));
    return Array.from(map.entries()).map(([site, count]) => ({ site, count }));
  });

  constructor() {
    this.loadDashboard();
  }

  loadDashboard(): void {
    this.loading.set(true);
    this.errorMessage.set('');

    forkJoin({
      matches: this.matchesApi.getAll(),
      members: this.membresApi.getAll(),
      sites: this.sitesApi.getAll(),
      terrains: this.terrainsApi.getAll()
    }).subscribe({
      next: ({ matches, members, sites, terrains }) => {
        const filteredSites = this.filterSites(sites);
        const filteredTerrains = this.filterTerrains(terrains);
        const filteredMembers = this.filterMembers(members);
        const filteredMatches = this.filterMatches(matches, filteredSites);

        this.sites.set(filteredSites);
        this.terrains.set(filteredTerrains);
        this.members.set(filteredMembers);
        this.matches.set(filteredMatches);

        if (!filteredMatches.length) {
          this.reservations.set([]);
          this.loading.set(false);
          return;
        }

        forkJoin(filteredMatches.map((match) => this.reservationsApi.getByMatch(match.id))).subscribe({
          next: (allReservations) => {
            this.reservations.set(allReservations.flat());
            this.loading.set(false);
          },
          error: (error) => {
            this.loading.set(false);
            this.errorMessage.set(extractApiErrorMessage(error, 'Impossible de charger les reservations admin.'));
          }
        });
      },
      error: (error) => {
        this.loading.set(false);
        this.errorMessage.set(extractApiErrorMessage(error, 'Impossible de charger le dashboard admin.'));
      }
    });
  }

  private filterSites(sites: SiteResponse[]): SiteResponse[] {
    const siteId = this.adminSession.siteId();
    if (this.adminSession.isGlobalAdmin() || !siteId) {
      return sites;
    }
    return sites.filter((site) => site.id === siteId);
  }

  private filterTerrains(terrains: TerrainResponse[]): TerrainResponse[] {
    const siteId = this.adminSession.siteId();
    if (this.adminSession.isGlobalAdmin() || !siteId) {
      return terrains;
    }
    return terrains.filter((terrain) => terrain.siteId === siteId);
  }

  private filterMembers(members: MembreResponse[]): MembreResponse[] {
    const siteId = this.adminSession.siteId();
    if (this.adminSession.isGlobalAdmin() || !siteId) {
      return members;
    }
    return members.filter((member) => member.siteId === siteId || member.siteId === null);
  }

  private filterMatches(matches: MatchResponse[], sites: SiteResponse[]): MatchResponse[] {
    if (this.adminSession.isGlobalAdmin()) {
      return matches;
    }

    const siteNames = new Set(sites.map((site) => site.nom));
    return matches.filter((match) => siteNames.has(match.siteNom));
  }
}
