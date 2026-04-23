import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { RouterLink } from '@angular/router';
import { SitesApiService } from '../../../core/api/sites-api.service';
import { AdminSessionService } from '../../../core/auth/admin-session.service';
import { SiteRequest, SiteResponse } from '../../../shared/models/site-terrain.model';
import { extractApiErrorMessage } from '../../../shared/utils/api-error.util';

@Component({
  selector: 'app-admin-sites-page',
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
    <section class="page-shell">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 class="text-2xl font-semibold text-slate-900">Gestion des sites</h1>
          <p class="text-sm text-slate-600">Creation, edition et suppression des sites.</p>
        </div>
        <a mat-stroked-button routerLink="/admin">Retour dashboard</a>
      </div>

      <mat-card class="card-soft">
        <mat-card-header><mat-card-title>{{ editingId() ? 'Modifier un site' : 'Nouveau site' }}</mat-card-title></mat-card-header>
        <mat-card-content>
          <form [formGroup]="form" class="grid gap-4 pt-4 md:grid-cols-2" (ngSubmit)="save()">
            <mat-form-field appearance="outline"><mat-label>Nom</mat-label><input matInput formControlName="nom" /></mat-form-field>
            <mat-form-field appearance="outline"><mat-label>Adresse</mat-label><input matInput formControlName="adresse" /></mat-form-field>
            <mat-form-field appearance="outline"><mat-label>Ouverture</mat-label><input matInput type="time" formControlName="heureOuverture" /></mat-form-field>
            <mat-form-field appearance="outline"><mat-label>Fermeture</mat-label><input matInput type="time" formControlName="heureFermeture" /></mat-form-field>
            <mat-form-field appearance="outline"><mat-label>Duree match (min)</mat-label><input matInput type="number" formControlName="dureeMatchMinutes" /></mat-form-field>
            <mat-form-field appearance="outline"><mat-label>Pause entre matchs (min)</mat-label><input matInput type="number" formControlName="dureeEntreMatchMinutes" /></mat-form-field>
            <mat-form-field appearance="outline"><mat-label>Annee civile</mat-label><input matInput type="number" formControlName="anneeCivile" /></mat-form-field>

            @if (message()) {
              <p class="status-success md:col-span-2">{{ message() }}</p>
            }
            @if (errorMessage()) {
              <p class="status-error md:col-span-2">{{ errorMessage() }}</p>
            }

            <div class="flex items-center gap-3 md:col-span-2">
              <button mat-flat-button color="primary" type="submit" [disabled]="loading() || form.invalid">Enregistrer</button>
              <button mat-stroked-button type="button" (click)="resetForm()">Reinitialiser</button>
              @if (loading()) { <mat-spinner diameter="24"></mat-spinner> }
            </div>
          </form>
        </mat-card-content>
      </mat-card>

      <div class="grid gap-4 md:grid-cols-2">
        @for (site of sites(); track site.id) {
          <mat-card class="card-soft">
            <mat-card-header>
              <mat-card-title>{{ site.nom }}</mat-card-title>
              <mat-card-subtitle>{{ site.adresse }}</mat-card-subtitle>
            </mat-card-header>
            <mat-card-content>
              <p><strong>Horaires:</strong> {{ site.heureOuverture }} - {{ site.heureFermeture }}</p>
              <p><strong>Match:</strong> {{ site.dureeMatchMinutes }} min</p>
              <p><strong>Pause:</strong> {{ site.dureeEntreMatchMinutes }} min</p>
              <p><strong>Annee:</strong> {{ site.anneeCivile }}</p>
            </mat-card-content>
            <mat-card-actions>
              <button mat-stroked-button type="button" (click)="edit(site)">Modifier</button>
              <button mat-stroked-button color="warn" type="button" (click)="remove(site.id)">Supprimer</button>
            </mat-card-actions>
          </mat-card>
        }
      </div>
    </section>
  `
})
export class AdminSitesPage {
  private readonly sitesApi = inject(SitesApiService);
  private readonly adminSession = inject(AdminSessionService);

  readonly loading = signal(false);
  readonly message = signal('');
  readonly errorMessage = signal('');
  readonly editingId = signal<number | null>(null);
  readonly sites = signal<SiteResponse[]>([]);

  readonly form = new FormGroup({
    nom: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    adresse: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    heureOuverture: new FormControl('08:00', { nonNullable: true, validators: [Validators.required] }),
    heureFermeture: new FormControl('22:00', { nonNullable: true, validators: [Validators.required] }),
    dureeMatchMinutes: new FormControl(90, { nonNullable: true, validators: [Validators.required] }),
    dureeEntreMatchMinutes: new FormControl(15, { nonNullable: true, validators: [Validators.required] }),
    anneeCivile: new FormControl(new Date().getFullYear(), { nonNullable: true, validators: [Validators.required] })
  });

  constructor() {
    this.loadSites();
  }

  loadSites(): void {
    this.sitesApi.getAll().subscribe({
      next: (sites) => {
        this.sites.set(this.adminSession.isGlobalAdmin() ? sites : sites.filter((site) => site.id === this.adminSession.siteId()));
      },
      error: (error) => {
        this.errorMessage.set(extractApiErrorMessage(error, 'Impossible de charger les sites.'));
      }
    });
  }

  edit(site: SiteResponse): void {
    this.editingId.set(site.id);
    this.form.patchValue({ ...site });
  }

  resetForm(): void {
    this.editingId.set(null);
    this.form.reset({
      nom: '',
      adresse: '',
      heureOuverture: '08:00',
      heureFermeture: '22:00',
      dureeMatchMinutes: 90,
      dureeEntreMatchMinutes: 15,
      anneeCivile: new Date().getFullYear()
    });
  }

  save(): void {
    if (this.form.invalid || this.loading() || this.adminSession.isSiteAdmin()) {
      if (this.adminSession.isSiteAdmin()) {
        this.errorMessage.set('Un admin SITE ne peut pas modifier les sites.');
      }
      return;
    }

    this.loading.set(true);
    const payload = this.form.getRawValue() as SiteRequest;
    const request$ = this.editingId() ? this.sitesApi.update(this.editingId()!, payload) : this.sitesApi.create(payload);
    request$.subscribe({
      next: () => {
        const wasEditing = this.editingId() !== null;
        this.loading.set(false);
        this.resetForm();
        this.message.set(wasEditing ? 'Site mis a jour.' : 'Site cree.');
        this.loadSites();
      },
      error: (error) => {
        this.loading.set(false);
        this.errorMessage.set(extractApiErrorMessage(error, 'Sauvegarde du site impossible.'));
      }
    });
  }

  remove(id: number): void {
    if (this.adminSession.isSiteAdmin()) {
      this.errorMessage.set('Un admin SITE ne peut pas supprimer de site.');
      return;
    }

    this.sitesApi.delete(id).subscribe({
      next: () => {
        this.message.set('Site supprime.');
        this.loadSites();
      },
      error: (error) => {
        this.errorMessage.set(extractApiErrorMessage(error, 'Suppression du site impossible.'));
      }
    });
  }
}

