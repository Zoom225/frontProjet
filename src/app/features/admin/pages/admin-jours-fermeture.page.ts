import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { JoursFermetureApiService } from '../../../core/api/jours-fermeture-api.service';
import { SitesApiService } from '../../../core/api/sites-api.service';
import { AdminSessionService } from '../../../core/auth/admin-session.service';
import { JourFermetureResponse, SiteResponse } from '../../../shared/models/site-terrain.model';
import { extractApiErrorMessage } from '../../../shared/utils/api-error.util';

@Component({
  selector: 'app-admin-jours-fermeture-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCheckboxModule,
    MatButtonModule,
    MatProgressSpinnerModule
  ],
  template: `
    <section class="page-shell">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 class="text-2xl font-semibold text-slate-900">Jours de fermeture</h1>
          <p class="text-sm text-slate-600">Gestion des fermetures globales et par site.</p>
        </div>
        <a mat-stroked-button routerLink="/admin">Retour dashboard</a>
      </div>

      <mat-card class="card-soft">
        <mat-card-header>
          <mat-card-title>Ajouter un jour de fermeture</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <form [formGroup]="form" class="grid gap-4 pt-4 md:grid-cols-2" (ngSubmit)="save()">
            <mat-form-field appearance="outline">
              <mat-label>Date</mat-label>
              <input matInput type="date" formControlName="date" />
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Raison (optionnel)</mat-label>
              <input matInput formControlName="raison" />
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Site concerne</mat-label>
              <mat-select formControlName="siteId" [disabled]="form.controls.global.value === true">
                <mat-option [value]="null">Aucun (global)</mat-option>
                @for (site of sites(); track site.id) {
                  <mat-option [value]="site.id">{{ site.nom }}</mat-option>
                }
              </mat-select>
            </mat-form-field>

            <div class="flex items-center gap-3">
              <mat-checkbox formControlName="global" (change)="onGlobalChange($event.checked)">
                Fermeture globale (tous les sites)
              </mat-checkbox>
            </div>

            @if (message()) {
              <p class="status-success md:col-span-2">{{ message() }}</p>
            }
            @if (errorMessage()) {
              <p class="status-error md:col-span-2">{{ errorMessage() }}</p>
            }

            <div class="flex items-center gap-3 md:col-span-2">
              <button mat-flat-button color="primary" type="submit" [disabled]="loading() || form.invalid">
                Ajouter
              </button>
              <button mat-stroked-button type="button" (click)="resetForm()">Reinitialiser</button>
              @if (loading()) {
                <mat-spinner diameter="24"></mat-spinner>
              }
            </div>
          </form>
        </mat-card-content>
      </mat-card>

      <div class="grid gap-4 md:grid-cols-2">
        @for (jour of filteredJours(); track jour.id) {
          <mat-card class="card-soft">
            <mat-card-header>
              <mat-card-title>{{ jour.date }}</mat-card-title>
              <mat-card-subtitle>
                {{ jour.global ? 'GLOBAL' : ('Site: ' + (jour.siteNom ?? '')) }}
              </mat-card-subtitle>
            </mat-card-header>
            <mat-card-content>
              <p><strong>Raison:</strong> {{ jour.raison || 'Non precisee' }}</p>
            </mat-card-content>
            <mat-card-actions>
              <button mat-stroked-button color="warn" type="button" (click)="remove(jour.id)">
                Supprimer
              </button>
            </mat-card-actions>
          </mat-card>
        } @empty {
          @if (!loading()) {
            <mat-card>
              <mat-card-content class="py-6 text-slate-600">Aucun jour de fermeture configure.</mat-card-content>
            </mat-card>
          }
        }
      </div>
    </section>
  `
})
export class AdminJoursFermeturePage {
  private readonly joursFermetureApi = inject(JoursFermetureApiService);
  private readonly sitesApi = inject(SitesApiService);
  private readonly adminSession = inject(AdminSessionService);

  readonly loading = signal(false);
  readonly message = signal('');
  readonly errorMessage = signal('');
  readonly jours = signal<JourFermetureResponse[]>([]);
  readonly sites = signal<SiteResponse[]>([]);

  readonly filteredJours = computed(() => {
    if (this.adminSession.isGlobalAdmin()) {
      return this.jours();
    }
    const siteId = this.adminSession.siteId();
    return this.jours().filter((j) => j.global || j.siteId === siteId);
  });

  readonly form = new FormGroup({
    date: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    raison: new FormControl('', { nonNullable: true }),
    global: new FormControl(false, { nonNullable: true }),
    siteId: new FormControl<number | null>(null)
  });

  constructor() {
    this.loadData();
    if (this.adminSession.isSiteAdmin()) {
      this.form.controls.siteId.setValue(this.adminSession.siteId());
    }
  }

  loadData(): void {
    this.loading.set(true);
    forkJoin({
      jours: this.joursFermetureApi.getAll(),
      sites: this.sitesApi.getAll()
    }).subscribe({
      next: ({ jours, sites }) => {
        this.jours.set(jours);
        this.sites.set(this.adminSession.isGlobalAdmin() ? sites : sites.filter((s) => s.id === this.adminSession.siteId()));
        this.loading.set(false);
      },
      error: (error) => {
        this.loading.set(false);
        this.errorMessage.set(extractApiErrorMessage(error, 'Impossible de charger les jours de fermeture.'));
      }
    });
  }

  onGlobalChange(isGlobal: boolean): void {
    if (isGlobal) {
      this.form.controls.siteId.setValue(null);
    }
  }

  resetForm(): void {
    this.message.set('');
    this.errorMessage.set('');
    this.form.reset({
      date: '',
      raison: '',
      global: false,
      siteId: this.adminSession.isSiteAdmin() ? this.adminSession.siteId() : null
    });
  }

  save(): void {
    if (this.form.invalid || this.loading()) {
      return;
    }

    this.loading.set(true);
    this.message.set('');
    this.errorMessage.set('');

    const raw = this.form.getRawValue();
    this.joursFermetureApi.create({
      date: raw.date,
      raison: raw.raison,
      global: raw.global,
      siteId: raw.global ? null : raw.siteId
    }).subscribe({
      next: () => {
        this.loading.set(false);
        this.resetForm();
        this.message.set('Jour de fermeture ajoute.');
        this.loadData();
      },
      error: (error) => {
        this.loading.set(false);
        this.errorMessage.set(extractApiErrorMessage(error, 'Ajout impossible.'));
      }
    });
  }

  remove(id: number): void {
    this.message.set('');
    this.errorMessage.set('');

    this.joursFermetureApi.delete(id).subscribe({
      next: () => {
        this.message.set('Jour de fermeture supprime.');
        this.loadData();
      },
      error: (error) => {
        this.errorMessage.set(extractApiErrorMessage(error, 'Suppression impossible.'));
      }
    });
  }
}

