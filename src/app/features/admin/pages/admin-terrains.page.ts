import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { SitesApiService } from '../../../core/api/sites-api.service';
import { TerrainsApiService } from '../../../core/api/terrains-api.service';
import { AdminSessionService } from '../../../core/auth/admin-session.service';
import { SiteResponse, TerrainRequest, TerrainResponse } from '../../../shared/models/site-terrain.model';
import { extractApiErrorMessage } from '../../../shared/utils/api-error.util';

@Component({
  selector: 'app-admin-terrains-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatProgressSpinnerModule
  ],
  template: `
    <section class="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 class="text-2xl font-semibold text-slate-900">Gestion des terrains</h1>
          <p class="text-sm text-slate-600">CRUD des terrains par site.</p>
        </div>
        <a mat-stroked-button routerLink="/admin">Retour dashboard</a>
      </div>

      <mat-card>
        <mat-card-header><mat-card-title>{{ editingId() ? 'Modifier un terrain' : 'Nouveau terrain' }}</mat-card-title></mat-card-header>
        <mat-card-content>
          <form [formGroup]="form" class="grid gap-4 pt-4 md:grid-cols-2" (ngSubmit)="save()">
            <mat-form-field appearance="outline">
              <mat-label>Nom du terrain</mat-label>
              <input matInput formControlName="nom" />
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Site</mat-label>
              <mat-select formControlName="siteId" [disabled]="adminSession.isSiteAdmin()">
                @for (site of sites(); track site.id) {
                  <mat-option [value]="site.id">{{ site.nom }}</mat-option>
                }
              </mat-select>
            </mat-form-field>

            @if (message()) {
              <p class="text-sm text-emerald-700 md:col-span-2">{{ message() }}</p>
            }
            @if (errorMessage()) {
              <p class="text-sm text-red-600 md:col-span-2">{{ errorMessage() }}</p>
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
        @for (terrain of filteredTerrains(); track terrain.id) {
          <mat-card>
            <mat-card-header>
              <mat-card-title>{{ terrain.nom }}</mat-card-title>
              <mat-card-subtitle>{{ terrain.siteNom }}</mat-card-subtitle>
            </mat-card-header>
            <mat-card-actions>
              <button mat-stroked-button type="button" (click)="edit(terrain)">Modifier</button>
              <button mat-stroked-button color="warn" type="button" (click)="remove(terrain.id)">Supprimer</button>
            </mat-card-actions>
          </mat-card>
        }
      </div>
    </section>
  `
})
export class AdminTerrainsPage {
  private readonly terrainsApi = inject(TerrainsApiService);
  private readonly sitesApi = inject(SitesApiService);
  readonly adminSession = inject(AdminSessionService);

  readonly loading = signal(false);
  readonly message = signal('');
  readonly errorMessage = signal('');
  readonly editingId = signal<number | null>(null);
  readonly terrains = signal<TerrainResponse[]>([]);
  readonly sites = signal<SiteResponse[]>([]);

  readonly filteredTerrains = computed(() => {
    if (this.adminSession.isGlobalAdmin()) {
      return this.terrains();
    }
    return this.terrains().filter((terrain) => terrain.siteId === this.adminSession.siteId());
  });

  readonly form = new FormGroup({
    nom: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    siteId: new FormControl<number | null>(null, { validators: [Validators.required] })
  });

  constructor() {
    this.loadData();
  }

  loadData(): void {
    forkJoin({
      terrains: this.terrainsApi.getAll(),
      sites: this.sitesApi.getAll()
    }).subscribe({
      next: ({ terrains, sites }) => {
        this.terrains.set(terrains);
        const filteredSites = this.adminSession.isGlobalAdmin() ? sites : sites.filter((site) => site.id === this.adminSession.siteId());
        this.sites.set(filteredSites);
        if (this.adminSession.isSiteAdmin() && this.adminSession.siteId()) {
          this.form.controls.siteId.setValue(this.adminSession.siteId());
        }
      },
      error: (error) => {
        this.errorMessage.set(extractApiErrorMessage(error, 'Impossible de charger les terrains.'));
      }
    });
  }

  edit(terrain: TerrainResponse): void {
    this.editingId.set(terrain.id);
    this.form.patchValue({ nom: terrain.nom, siteId: terrain.siteId });
  }

  resetForm(): void {
    this.editingId.set(null);
    this.form.reset({ nom: '', siteId: this.adminSession.isSiteAdmin() ? this.adminSession.siteId() : null });
  }

  save(): void {
    if (this.form.invalid || this.loading()) {
      return;
    }

    this.loading.set(true);
    const payload = this.form.getRawValue() as TerrainRequest;
    if (this.adminSession.isSiteAdmin()) {
      payload.siteId = this.adminSession.siteId()!;
    }

    const request$ = this.editingId() ? this.terrainsApi.update(this.editingId()!, payload) : this.terrainsApi.create(payload);
    request$.subscribe({
      next: () => {
        this.loading.set(false);
        this.message.set(this.editingId() ? 'Terrain mis a jour.' : 'Terrain cree.');
        this.resetForm();
        this.loadData();
      },
      error: (error) => {
        this.loading.set(false);
        this.errorMessage.set(extractApiErrorMessage(error, 'Sauvegarde du terrain impossible.'));
      }
    });
  }

  remove(id: number): void {
    this.terrainsApi.delete(id).subscribe({
      next: () => {
        this.message.set('Terrain supprime.');
        this.loadData();
      },
      error: (error) => {
        this.errorMessage.set(extractApiErrorMessage(error, 'Suppression du terrain impossible.'));
      }
    });
  }
}

