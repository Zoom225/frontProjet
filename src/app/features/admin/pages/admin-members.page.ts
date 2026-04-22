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
import { MembresApiService } from '../../../core/api/membres-api.service';
import { SitesApiService } from '../../../core/api/sites-api.service';
import { AdminSessionService } from '../../../core/auth/admin-session.service';
import { MembreRequest, MembreResponse } from '../../../shared/models/membre.model';
import { TypeMembre } from '../../../shared/models/enums.model';
import { SiteResponse } from '../../../shared/models/site-terrain.model';
import { extractApiErrorMessage } from '../../../shared/utils/api-error.util';

@Component({
  selector: 'app-admin-members-page',
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
          <h1 class="text-2xl font-semibold text-slate-900">Gestion des membres</h1>
          <p class="text-sm text-slate-600">Creation, modification et suppression.</p>
        </div>
        <a mat-stroked-button routerLink="/admin">Retour dashboard</a>
      </div>

      <mat-card>
        <mat-card-header>
          <mat-card-title>{{ editingId() ? 'Modifier un membre' : 'Nouveau membre' }}</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <form [formGroup]="form" class="grid gap-4 pt-4 md:grid-cols-2" (ngSubmit)="save()">
            <mat-form-field appearance="outline">
              <mat-label>Matricule</mat-label>
              <input matInput formControlName="matricule" [readonly]="editingId() !== null" />
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Type</mat-label>
              <mat-select formControlName="typeMembre" [disabled]="editingId() !== null">
                <mat-option value="GLOBAL">GLOBAL</mat-option>
                <mat-option value="SITE">SITE</mat-option>
                <mat-option value="LIBRE">LIBRE</mat-option>
              </mat-select>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Nom</mat-label>
              <input matInput formControlName="nom" />
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Prenom</mat-label>
              <input matInput formControlName="prenom" />
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Email</mat-label>
              <input matInput type="email" formControlName="email" />
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Site</mat-label>
              <mat-select formControlName="siteId">
                <mat-option [value]="null">Aucun site</mat-option>
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
              <button mat-flat-button color="primary" type="submit" [disabled]="loading() || form.invalid">
                {{ editingId() ? 'Enregistrer' : 'Creer' }}
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
        @for (member of filteredMembers(); track member.id) {
          <mat-card>
            <mat-card-header>
              <mat-card-title>{{ member.nom }} {{ member.prenom }}</mat-card-title>
              <mat-card-subtitle>{{ member.matricule }} · {{ member.typeMembre }}</mat-card-subtitle>
            </mat-card-header>
            <mat-card-content class="space-y-1">
              <p><strong>Email:</strong> {{ member.email || 'Non renseigne' }}</p>
              <p><strong>Site:</strong> {{ member.siteNom || 'Tous les sites' }}</p>
              <p><strong>Solde:</strong> {{ member.solde }} EUR</p>
            </mat-card-content>
            <mat-card-actions>
              <button mat-stroked-button type="button" (click)="edit(member)">Modifier</button>
              <button mat-stroked-button type="button" color="warn" (click)="remove(member.id)">Supprimer</button>
            </mat-card-actions>
          </mat-card>
        }
      </div>
    </section>
  `
})
export class AdminMembersPage {
  private readonly membresApi = inject(MembresApiService);
  private readonly sitesApi = inject(SitesApiService);
  private readonly adminSession = inject(AdminSessionService);

  readonly loading = signal(false);
  readonly message = signal('');
  readonly errorMessage = signal('');
  readonly editingId = signal<number | null>(null);
  readonly members = signal<MembreResponse[]>([]);
  readonly sites = signal<SiteResponse[]>([]);

  readonly filteredMembers = computed(() => {
    const siteId = this.adminSession.siteId();
    if (this.adminSession.isGlobalAdmin() || !siteId) {
      return this.members();
    }

    return this.members().filter((member) => member.siteId === siteId || member.siteId === null);
  });

  readonly form = new FormGroup({
    matricule: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    nom: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    prenom: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    email: new FormControl('', { nonNullable: true, validators: [Validators.email] }),
    typeMembre: new FormControl<TypeMembre>('GLOBAL', { nonNullable: true, validators: [Validators.required] }),
    siteId: new FormControl<number | null>(null)
  });

  constructor() {
    this.loadData();
  }

  loadData(): void {
    this.loading.set(true);
    forkJoin({
      members: this.membresApi.getAll(),
      sites: this.sitesApi.getAll()
    }).subscribe({
      next: ({ members, sites }) => {
        this.members.set(members);
        this.sites.set(this.adminSession.isGlobalAdmin() ? sites : sites.filter((site) => site.id === this.adminSession.siteId()));
        this.loading.set(false);
      },
      error: (error) => {
        this.loading.set(false);
        this.errorMessage.set(extractApiErrorMessage(error, 'Impossible de charger les membres.'));
      }
    });
  }

  edit(member: MembreResponse): void {
    this.editingId.set(member.id);
    this.form.patchValue({
      matricule: member.matricule,
      nom: member.nom,
      prenom: member.prenom,
      email: member.email,
      typeMembre: member.typeMembre,
      siteId: member.siteId
    });
  }

  resetForm(): void {
    this.editingId.set(null);
    this.message.set('');
    this.errorMessage.set('');
    this.form.reset({
      matricule: '',
      nom: '',
      prenom: '',
      email: '',
      typeMembre: this.adminSession.isSiteAdmin() ? 'SITE' : 'GLOBAL',
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

    const payload = this.form.getRawValue() as MembreRequest;
    if (this.adminSession.isSiteAdmin()) {
      payload.siteId = this.adminSession.siteId() ?? undefined;
      payload.typeMembre = 'SITE';
    }

    const request$ = this.editingId()
      ? this.membresApi.update(this.editingId()!, payload)
      : this.membresApi.create(payload);

    request$.subscribe({
      next: () => {
        this.loading.set(false);
        this.message.set(this.editingId() ? 'Membre mis a jour.' : 'Membre cree.');
        this.resetForm();
        this.loadData();
      },
      error: (error) => {
        this.loading.set(false);
        this.errorMessage.set(extractApiErrorMessage(error, 'Sauvegarde du membre impossible.'));
      }
    });
  }

  remove(id: number): void {
    this.loading.set(true);
    this.message.set('');
    this.errorMessage.set('');

    this.membresApi.delete(id).subscribe({
      next: () => {
        this.loading.set(false);
        this.message.set('Membre supprime.');
        this.loadData();
      },
      error: (error) => {
        this.loading.set(false);
        this.errorMessage.set(extractApiErrorMessage(error, 'Suppression impossible.'));
      }
    });
  }
}
