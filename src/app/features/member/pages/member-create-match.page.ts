import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { AbstractControl, FormControl, FormGroup, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { TypeMembre } from '../../../shared/models/enums.model';
import { MatchResponse } from '../../../shared/models/match.model';
import { SiteResponse, TerrainResponse } from '../../../shared/models/site-terrain.model';
import { MatchesApiService } from '../../../core/api/matches-api.service';
import { MembresApiService } from '../../../core/api/membres-api.service';
import { ReservationsApiService } from '../../../core/api/reservations-api.service';
import { SitesApiService } from '../../../core/api/sites-api.service';
import { TerrainsApiService } from '../../../core/api/terrains-api.service';
import { MemberSessionService } from '../../../core/auth/member-session.service';
import { extractApiErrorMessage } from '../../../shared/utils/api-error.util';
import { MembreResponse } from '../../../shared/models/membre.model';

const BOOKING_DELAY_DAYS: Record<TypeMembre, number> = {
  GLOBAL: 21,
  SITE: 14,
  LIBRE: 5
};

const formatDateForInput = (date: Date): string => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getRequiredBookingDays = (memberType?: TypeMembre | null): number => BOOKING_DELAY_DAYS[memberType ?? 'LIBRE'];

const createMinBookingDateValidator = (getMinDate: () => string): ValidatorFn => {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = `${control.value ?? ''}`.trim();
    if (!value) {
      return null;
    }

    const minDate = getMinDate();
    return value < minDate ? { minBookingDate: { minDate, actualDate: value } } : null;
  };
};

@Component({
  selector: 'app-member-create-match-page',
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
    <section class="page-shell max-w-6xl">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 class="title-gradient ds-section-title">Creer un match</h1>
          <p class="ds-subtitle">Public ou prive, selon les regles du backend.</p>
          <span class="ds-badge"
                [class]="form.controls.typeMatch.value === 'PRIVE' ? 'ds-badge-info' : 'ds-badge-success'">
            Mode creation : {{ form.controls.typeMatch.value }}
          </span>
        </div>
        <div class="toolbar-actions">
          <a mat-stroked-button routerLink="/member/matches">Retour aux matchs publics</a>
        </div>
      </div>

      <mat-card class="card-soft panel-gradient">
        <mat-card-content>
          <form [formGroup]="form" class="grid gap-4 pt-4 md:grid-cols-2" (ngSubmit)="submit()">
            <mat-form-field appearance="outline">
              <mat-label>Site</mat-label>
              <mat-select formControlName="siteId" (valueChange)="onSiteChange($event)" [disabled]="isSiteMember()">
                @for (site of sites(); track site.id) {
                  <mat-option [value]="site.id">{{ site.nom }}</mat-option>
                }
              </mat-select>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Terrain</mat-label>
              <mat-select formControlName="terrainId" [disabled]="!terrains().length">
                @for (terrain of terrains(); track terrain.id) {
                  <mat-option [value]="terrain.id">{{ terrain.nom }}</mat-option>
                }
              </mat-select>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Date</mat-label>
              <input matInput type="date" formControlName="date" [min]="minBookingDate()" />
              <mat-hint>Date minimale autorisee : {{ minBookingDate() }}</mat-hint>
              @if (form.controls.date.hasError('minBookingDate') && (form.controls.date.dirty || form.controls.date.touched)) {
                <mat-error>{{ bookingDelayErrorMessage() }}</mat-error>
              }
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Heure debut</mat-label>
              <input matInput type="time" formControlName="heureDebut" />
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Type de match</mat-label>
              <mat-select formControlName="typeMatch">
                <mat-option value="PUBLIC">PUBLIC</mat-option>
                <mat-option value="PRIVE">PRIVE</mat-option>
              </mat-select>
            </mat-form-field>

            <div class="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 md:col-span-2">
              <p class="font-semibold text-slate-800">Rappel</p>
              <ul class="ml-4 list-disc space-y-1">
                <li>GLOBAL: au moins 3 semaines a l'avance</li>
                <li>SITE: au moins 2 semaines a l'avance sur son site</li>
                <li>LIBRE: au moins 5 jours a l'avance</li>
              </ul>
              <p class="mt-2 text-slate-500">Premiere date disponible selon votre profil: {{ minBookingDate() }}</p>
            </div>

            @if (!sites().length && !loading()) {
              <p class="status-error md:col-span-2">Aucun site disponible pour creer un match.</p>
            }

            @if (form.controls.siteId.value && !terrains().length && !loading()) {
              <p class="status-error md:col-span-2">Aucun terrain disponible pour le site selectionne.</p>
            }

            @if (form.controls.typeMatch.value === 'PRIVE') {
              <div class="md:col-span-2">
                <p class="mb-2 text-sm font-medium text-slate-800">Joueurs a inviter maintenant (optionnel)</p>
                <div class="grid gap-3 md:grid-cols-3">
                  <mat-form-field appearance="outline">
                    <mat-label>Matricule joueur 2</mat-label>
                    <input matInput formControlName="player1" />
                  </mat-form-field>
                  <mat-form-field appearance="outline">
                    <mat-label>Matricule joueur 3</mat-label>
                    <input matInput formControlName="player2" />
                  </mat-form-field>
                  <mat-form-field appearance="outline">
                    <mat-label>Matricule joueur 4</mat-label>
                    <input matInput formControlName="player3" />
                  </mat-form-field>
                </div>
              </div>
            }

            @if (message()) {
              <p class="status-success md:col-span-2">{{ message() }}</p>
            }

            @if (errorMessage()) {
              <p class="status-error md:col-span-2">{{ errorMessage() }}</p>
            }

            <div class="toolbar-actions justify-start md:col-span-2">
              <button mat-flat-button color="primary" type="submit" [disabled]="loading() || form.invalid || !terrains().length">
                Creer le match
              </button>
              <a mat-stroked-button routerLink="/member/profile">Retour profil</a>
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
export class MemberCreateMatchPage {
  private readonly sitesApi = inject(SitesApiService);
  private readonly terrainsApi = inject(TerrainsApiService);
  private readonly matchesApi = inject(MatchesApiService);
  private readonly membresApi = inject(MembresApiService);
  private readonly reservationsApi = inject(ReservationsApiService);
  private readonly memberSession = inject(MemberSessionService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly loading = signal(false);
  readonly message = signal('');
  readonly errorMessage = signal('');
  readonly sites = signal<SiteResponse[]>([]);
  readonly terrains = signal<TerrainResponse[]>([]);
  readonly member = computed(() => this.memberSession.member());
  readonly isSiteMember = computed(() => this.member()?.typeMembre === 'SITE');
  readonly bookingDelayErrorMessage = computed(() => {
    const memberType = this.member()?.typeMembre ?? 'LIBRE';
    return `Le profil ${memberType} doit reserver au moins ${getRequiredBookingDays(memberType)} jours a l'avance. Premiere date disponible : ${this.minBookingDate()}.`;
  });
  readonly minBookingDate = computed(() => {
    const today = new Date();
    today.setHours(12, 0, 0, 0);
    today.setDate(today.getDate() + getRequiredBookingDays(this.member()?.typeMembre));
    return formatDateForInput(today);
  });

  readonly form = new FormGroup({
    siteId: new FormControl<number | null>(null, { validators: [Validators.required] }),
    terrainId: new FormControl<number | null>(null, { validators: [Validators.required] }),
    date: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, createMinBookingDateValidator(() => this.minBookingDate())]
    }),
    heureDebut: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    typeMatch: new FormControl<'PUBLIC' | 'PRIVE'>('PUBLIC', {
      nonNullable: true,
      validators: [Validators.required]
    }),
    player1: new FormControl('', { nonNullable: true }),
    player2: new FormControl('', { nonNullable: true }),
    player3: new FormControl('', { nonNullable: true })
  });

  constructor() {
    if (!this.memberSession.isAuthenticated()) {
      this.router.navigateByUrl('/member');
      return;
    }

    this.applyPreferredTypeFromQuery();
    this.applyDefaultStartTime();
    this.applyMinimumBookingDate();
    this.loadSites();
  }

  private applyDefaultStartTime(): void {
    if (!this.form.controls.heureDebut.value) {
      this.form.controls.heureDebut.setValue('09:00');
    }
  }

  private applyPreferredTypeFromQuery(): void {
    const preferredType = this.route.snapshot.queryParamMap.get('type')?.toUpperCase();
    if (preferredType === 'PUBLIC' || preferredType === 'PRIVE') {
      this.form.controls.typeMatch.setValue(preferredType);
    }
  }

  loadSites(): void {
    this.errorMessage.set('');
    this.sitesApi.getAll().subscribe({
      next: (sites) => {
        this.sites.set(sites);
        const member = this.member();
        if (member?.typeMembre === 'SITE' && member.siteId) {
          this.form.controls.siteId.setValue(member.siteId);
          this.onSiteChange(member.siteId);
          return;
        }

        if (sites.length) {
          const defaultSiteId = sites[0].id;
          this.form.controls.siteId.setValue(defaultSiteId);
          this.onSiteChange(defaultSiteId);
        }
      },
      error: (error) => {
        this.errorMessage.set(extractApiErrorMessage(error, 'Impossible de charger les sites.'));
      }
    });
  }

  onSiteChange(siteId: number | null): void {
    this.form.controls.terrainId.setValue(null);
    this.terrains.set([]);

    if (!siteId) {
      return;
    }

    this.terrainsApi.getBySite(siteId).subscribe({
      next: (terrains) => {
        this.terrains.set(terrains);
        if (terrains.length) {
          this.form.controls.terrainId.setValue(terrains[0].id);
        }
      },
      error: (error) => {
        this.errorMessage.set(extractApiErrorMessage(error, 'Impossible de charger les terrains.'));
      }
    });
  }

  submit(): void {
    this.form.markAllAsTouched();

    const organiser = this.member();
    if (!organiser?.id || this.form.invalid || this.loading()) {
      if (this.form.controls.date.hasError('minBookingDate')) {
        this.errorMessage.set(this.bookingDelayErrorMessage());
      }
      return;
    }

    const terrainId = this.form.controls.terrainId.value;
    const date = this.form.controls.date.getRawValue();
    const heureDebut = this.form.controls.heureDebut.getRawValue();
    const typeMatch = this.form.controls.typeMatch.getRawValue();

    if (!terrainId) {
      return;
    }

    this.loading.set(true);
    this.message.set('');
    this.errorMessage.set('');

    const payload = {
      terrainId,
      organisateurId: organiser.id,
      date,
      heureDebut,
      typeMatch
    };

    console.log('Creating match with payload:', payload);

    this.matchesApi
      .create(payload)
      .subscribe({
        next: (createdMatch) => {
          console.log('Match created successfully:', createdMatch);
          this.handleInvites(createdMatch, organiser);
        },
        error: (error) => {
          console.error('Match creation failed:', error);
          this.loading.set(false);
          this.errorMessage.set(this.toFriendlyCreationErrorMessage(error));
        }
      });
  }

  private applyMinimumBookingDate(): void {
    const dateControl = this.form.controls.date;
    const minDate = this.minBookingDate();
    const selectedDate = dateControl.getRawValue();

    if (!selectedDate || selectedDate < minDate) {
      dateControl.setValue(minDate);
    }

    dateControl.updateValueAndValidity({ emitEvent: false });
  }

  private toFriendlyCreationErrorMessage(error: unknown): string {
    console.log('=== ERROR IN MATCH CREATION ===');
    const apiMessage = extractApiErrorMessage(error, 'Création du match impossible.');

    console.log('Extracted API message:', apiMessage);

    // Mapping des messages connus
    const errorMappings: Record<string, string> = {
      'outstanding balance': '❌ Vous avez un solde impayé. Réglez vos dettes avant de créer un match.',
      'active penalty': '❌ Vous avez une pénalité active. Attendez avant de créer un match.',
      'must book at least': this.bookingDelayErrorMessage(),
      'slot is already booked': '❌ Ce créneau est déjà réservé. Choisissez un autre horaire.',
      'closed on': '❌ Le site est fermé à cette date.',
      'outside site opening hours': '❌ Cet horaire est en dehors des heures d\'ouverture du site.',
    };

    // Chercher un match dans le message
    for (const [key, message] of Object.entries(errorMappings)) {
      if (apiMessage.toLowerCase().includes(key)) {
        console.log('Matched error key:', key, '→', message);
        return message;
      }
    }

    // Si aucun match, afficher le message extrait
    const friendlyMessage = `❌ Erreur : ${apiMessage}`;
    console.log('No match found, returning:', friendlyMessage);
    console.log('================================');

    return friendlyMessage;
  }

  private handleInvites(createdMatch: MatchResponse, organiser: MembreResponse): void {
    console.log('Starting handleInvites for match:', createdMatch.id);

    // Directement traiter les invites sans auto-inscrire l'organisateur
    // (L'organisateur devra rejoindre via le bouton "Payer" sur sa réservation)
    const invitees = [
      this.form.controls.player1.getRawValue(),
      this.form.controls.player2.getRawValue(),
      this.form.controls.player3.getRawValue()
    ]
      .map((value) => value.trim().toUpperCase())
      .filter(Boolean);

    if (this.form.controls.typeMatch.getRawValue() !== 'PRIVE' || !invitees.length) {
      console.log('No invitees or PUBLIC match, completing creation');
      this.loading.set(false);
      this.message.set('Match créé avec succès. Vous pouvez rejoindre votre match dans vos réservations.');
      setTimeout(() => this.router.navigateByUrl('/member/reservations'), 1000);
      return;
    }

    console.log('Creating invitations for:', invitees);
    forkJoin(invitees.map((matricule) => this.membresApi.getByMatricule(matricule))).subscribe({
      next: (members) => this.createReservationsForInvites(createdMatch.id, organiser.id, members),
      error: (error) => {
        console.error('Error finding invited members:', error);
        this.loading.set(false);
        this.message.set('Match créé, mais au moins un joueur invité est introuvable.');
        this.errorMessage.set(extractApiErrorMessage(error, 'Impossible d\'ajouter tous les joueurs.'));
        setTimeout(() => this.router.navigateByUrl('/member/reservations'), 2000);
      }
    });
  }

  private createReservationsForInvites(matchId: number, organiserId: number, members: MembreResponse[]): void {
    console.log('Creating reservations for', members.length, 'invited members');

    forkJoin(
      members.map((member) =>
        this.reservationsApi.create({
          matchId,
          membreId: member.id,
          requesterId: organiserId
        })
      )
    ).subscribe({
      next: () => {
        console.log('All invitations sent successfully');
        this.loading.set(false);
        this.message.set('Match privé créé avec les joueurs invités. Ils doivent confirmer leur participation.');
        setTimeout(() => this.router.navigateByUrl('/member/reservations'), 1000);
      },
      error: (error) => {
        console.error('Error creating reservations:', error);
        this.loading.set(false);
        this.message.set('Match créé, mais certains joueurs n\'ont pas pu être ajoutés.');
        this.errorMessage.set(extractApiErrorMessage(error, 'Impossible d\'ajouter tous les joueurs.'));
        setTimeout(() => this.router.navigateByUrl('/member/reservations'), 2000);
      }
    });
  }
}

