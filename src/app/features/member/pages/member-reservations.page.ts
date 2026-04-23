import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { RouterLink } from '@angular/router';
import { MatchesApiService } from '../../../core/api/matches-api.service';
import { MembresApiService } from '../../../core/api/membres-api.service';
import { PaiementsApiService } from '../../../core/api/paiements-api.service';
import { ReservationsApiService } from '../../../core/api/reservations-api.service';
import { MemberSessionService } from '../../../core/auth/member-session.service';
import { MatchResponse } from '../../../shared/models/match.model';
import { ReservationResponse } from '../../../shared/models/reservation.model';
import { extractApiErrorMessage } from '../../../shared/utils/api-error.util';

@Component({
  selector: 'app-member-reservations-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    MatCardModule,
    MatButtonModule,
    MatChipsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatProgressSpinnerModule
  ],
  template: `
    <section class="page-shell">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 class="title-gradient text-2xl font-semibold">Mes reservations</h1>
          <p class="text-sm text-slate-600">Paiement et annulation de vos inscriptions.</p>
        </div>
        <div class="flex gap-2">
          <a mat-flat-button color="primary" routerLink="/member/matches/new" [queryParams]="{ type: 'PUBLIC' }">Creer un match PUBLIC</a>
          <a mat-flat-button color="accent" routerLink="/member/matches/new" [queryParams]="{ type: 'PRIVE' }">Creer un match PRIVE</a>
          <a mat-stroked-button routerLink="/member/matches">Matchs publics</a>
          <a mat-stroked-button routerLink="/member/payments">Mes paiements</a>
        </div>
      </div>

      @if (loading()) {
        <mat-spinner diameter="32"></mat-spinner>
      }

      @if (message()) {
        <p class="status-success">{{ message() }}</p>
      }

      @if (errorMessage()) {
        <p class="status-error">{{ errorMessage() }}</p>
      }

      <mat-card class="card-soft panel-gradient">
        <mat-card-header>
          <mat-card-title>Gestion des joueurs (mes matchs)</mat-card-title>
          <mat-card-subtitle>Ajoute ou retire des joueurs uniquement sur tes matchs PRIVE.</mat-card-subtitle>
        </mat-card-header>
        <mat-card-content class="grid gap-4 md:grid-cols-3">
          <mat-form-field appearance="outline">
            <mat-label>Match prive organise</mat-label>
            <mat-select [value]="managedMatchId()" (valueChange)="onManagedMatchChange($event)">
              <mat-option [value]="null">Choisir un match PRIVE</mat-option>
              @for (match of managedMatches(); track match.id) {
                <mat-option [value]="match.id">
                  #{{ match.id }} - {{ match.date }} {{ match.heureDebut }} ({{ match.typeMatch }})
                </mat-option>
              }
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Matricule a ajouter</mat-label>
            <input matInput [formControl]="inviteMatricule" placeholder="Ex: G1002" />
          </mat-form-field>

          <div class="flex items-end gap-2">
            <button
              mat-flat-button
              color="primary"
              type="button"
              (click)="addPlayer()"
              [disabled]="!selectedManagedMatch() || inviteMatricule.invalid || actionId() !== null"
            >
              Ajouter joueur
            </button>
          </div>

          @if (!managedMatches().length) {
            <div class="md:col-span-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              Aucun match PRIVE organise pour l'instant. Utilise les boutons ci-dessus pour creer un match PUBLIC ou PRIVE.
            </div>
          }

          @if (selectedManagedMatch()) {
            <div class="md:col-span-3 rounded-lg border border-slate-200 bg-white p-4">
              <p class="mb-3 text-sm font-semibold text-slate-800">Modifier ou supprimer le match #{{ selectedManagedMatch()!.id }}</p>
              <form [formGroup]="managedMatchForm" class="grid gap-3 md:grid-cols-4" (ngSubmit)="updateManagedMatch()">
                <mat-form-field appearance="outline">
                  <mat-label>Date</mat-label>
                  <input matInput type="date" formControlName="date" />
                </mat-form-field>

                <mat-form-field appearance="outline">
                  <mat-label>Heure debut</mat-label>
                  <input matInput type="time" formControlName="heureDebut" />
                </mat-form-field>

                <mat-form-field appearance="outline">
                  <mat-label>Type</mat-label>
                  <mat-select formControlName="typeMatch">
                    <mat-option value="PRIVE">PRIVE</mat-option>
                    <mat-option value="PUBLIC">PUBLIC</mat-option>
                  </mat-select>
                </mat-form-field>

                <div class="flex items-end gap-2">
                  <button mat-flat-button color="primary" type="submit" [disabled]="managedMatchForm.invalid || actionId() !== null">
                    Enregistrer
                  </button>
                  <button mat-stroked-button color="warn" type="button" (click)="deleteManagedMatch()" [disabled]="actionId() !== null">
                    Supprimer
                  </button>
                </div>
              </form>
            </div>
          }

          <div class="md:col-span-3">
            @if (managedReservations().length) {
              <div class="grid gap-2 md:grid-cols-2">
                @for (res of managedReservations(); track res.id) {
                  <div class="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <p class="font-medium text-slate-800">{{ res.membreNom }}</p>
                    <p class="text-sm text-slate-600">Reservation: {{ res.statut }} · Paiement: {{ res.paiement?.statut || 'N/A' }}</p>
                    <div class="mt-2">
                      <button
                        mat-stroked-button
                        color="warn"
                        type="button"
                        (click)="removePlayer(res)"
                        [disabled]="actionId() === res.id || res.statut === 'ANNULEE' || res.membreId === memberId()"
                      >
                        Retirer ce joueur
                      </button>
                    </div>
                  </div>
                }
              </div>
            } @else {
              <p class="text-sm text-slate-600">Aucun joueur gere pour le match selectionne.</p>
            }
          </div>
        </mat-card-content>
      </mat-card>

      <div class="grid gap-4 lg:grid-cols-2">
        @for (reservation of reservations(); track reservation.id) {
          <mat-card class="card-soft">
            <mat-card-header>
              <mat-card-title>Reservation #{{ reservation.id }}</mat-card-title>
              <mat-card-subtitle>{{ reservation.matchDateTime }}</mat-card-subtitle>
            </mat-card-header>
            <mat-card-content class="space-y-2">
              <p><strong>Joueur:</strong> {{ reservation.membreNom }}</p>
              <p><strong>Match:</strong> #{{ reservation.matchId }}</p>
              <mat-chip-set>
                <mat-chip [highlighted]="true">Reservation: {{ reservation.statut }}</mat-chip>
                <mat-chip [highlighted]="true">Paiement: {{ reservation.paiement?.statut || 'N/A' }}</mat-chip>
              </mat-chip-set>
              <p><strong>Montant:</strong> {{ reservation.paiement?.montant ?? 0 }} EUR</p>
            </mat-card-content>
            <mat-card-actions>
              <button
                mat-flat-button
                color="primary"
                type="button"
                (click)="pay(reservation)"
                [disabled]="reservation.paiement?.statut !== 'EN_ATTENTE' || actionId() === reservation.id"
              >
                Payer
              </button>
              <button
                mat-stroked-button
                type="button"
                (click)="cancel(reservation)"
                [disabled]="reservation.statut === 'ANNULEE' || actionId() === reservation.id"
              >
                Annuler
              </button>
            </mat-card-actions>
          </mat-card>
        } @empty {
          @if (!loading()) {
            <mat-card>
              <mat-card-content class="py-6 text-slate-600">Aucune reservation trouvee.</mat-card-content>
            </mat-card>
          }
        }
      </div>
    </section>
  `
})
export class MemberReservationsPage {
  private readonly matchesApi = inject(MatchesApiService);
  private readonly membresApi = inject(MembresApiService);
  private readonly reservationsApi = inject(ReservationsApiService);
  private readonly paiementsApi = inject(PaiementsApiService);
  private readonly memberSession = inject(MemberSessionService);

  readonly loading = signal(false);
  readonly actionId = signal<number | null>(null);
  readonly message = signal('');
  readonly errorMessage = signal('');
  readonly reservations = signal<ReservationResponse[]>([]);
  readonly organisedMatches = signal<MatchResponse[]>([]);
  readonly managedMatches = computed(() => this.organisedMatches().filter((match) => match.typeMatch === 'PRIVE'));
  readonly selectedManagedMatch = computed(() => {
    const matchId = this.managedMatchId();
    if (!matchId) {
      return null;
    }
    return this.managedMatches().find((match) => match.id === matchId) ?? null;
  });
  readonly managedReservations = signal<ReservationResponse[]>([]);
  readonly managedMatchId = signal<number | null>(null);
  readonly managedMatchForm = new FormGroup({
    date: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    heureDebut: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    typeMatch: new FormControl<'PUBLIC' | 'PRIVE'>('PRIVE', { nonNullable: true, validators: [Validators.required] })
  });
  readonly inviteMatricule = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.pattern(/^(G\d{4}|S\d{5}|L\d{5})$/)]
  });
  readonly memberId = computed(() => this.memberSession.memberId());

  constructor() {
    this.loadReservations();
    this.loadOrganisedMatches();
  }

  loadReservations(): void {
    const memberId = this.memberId();
    if (!memberId) {
      this.errorMessage.set('Aucun membre connecte.');
      return;
    }

    this.loading.set(true);
    this.message.set('');
    this.errorMessage.set('');
    this.reservationsApi.getByMembre(memberId).subscribe({
      next: (reservations) => {
        this.reservations.set(reservations);
        this.loading.set(false);
      },
      error: (error) => {
        this.loading.set(false);
        this.errorMessage.set(extractApiErrorMessage(error, 'Impossible de charger les reservations.'));
      }
    });
  }

  loadOrganisedMatches(): void {
    const memberId = this.memberId();
    if (!memberId) {
      return;
    }

    this.matchesApi.getByOrganisateur(memberId).subscribe({
      next: (matches) => {
        this.organisedMatches.set(matches);
        if (this.managedMatchId() && !this.selectedManagedMatch()) {
          this.managedMatchId.set(null);
          this.managedReservations.set([]);
          this.managedMatchForm.reset({ date: '', heureDebut: '', typeMatch: 'PRIVE' });
        } else {
          this.syncManagedMatchForm();
        }
      },
      error: () => {
        // On garde la page utilisable même si ce chargement échoue.
      }
    });
  }

  onManagedMatchChange(matchId: number | null): void {
    this.managedMatchId.set(matchId);
    this.managedReservations.set([]);

    if (!matchId) {
      this.managedMatchForm.reset({ date: '', heureDebut: '', typeMatch: 'PRIVE' });
      return;
    }

    if (!this.selectedManagedMatch()) {
      this.errorMessage.set('Selection invalide : la gestion des joueurs est reservee aux matchs PRIVE.');
      this.managedMatchId.set(null);
      this.managedMatchForm.reset({ date: '', heureDebut: '', typeMatch: 'PRIVE' });
      return;
    }

    this.syncManagedMatchForm();

    this.reservationsApi.getByMatch(matchId).subscribe({
      next: (reservations) => this.managedReservations.set(reservations),
      error: (error) => {
        this.errorMessage.set(extractApiErrorMessage(error, 'Impossible de charger les joueurs du match.'));
      }
    });
  }

  updateManagedMatch(): void {
    const selectedMatch = this.selectedManagedMatch();
    const requesterId = this.memberId();
    if (!selectedMatch || !requesterId || this.managedMatchForm.invalid || this.actionId() !== null) {
      return;
    }

    this.actionId.set(selectedMatch.id);
    this.message.set('');
    this.errorMessage.set('');

    this.matchesApi
      .update(selectedMatch.id, {
        terrainId: selectedMatch.terrainId,
        organisateurId: requesterId,
        date: this.managedMatchForm.controls.date.getRawValue(),
        heureDebut: this.managedMatchForm.controls.heureDebut.getRawValue(),
        typeMatch: this.managedMatchForm.controls.typeMatch.getRawValue()
      })
      .subscribe({
        next: (updatedMatch) => {
          this.actionId.set(null);
          this.message.set('Match mis a jour avec succes.');
          this.organisedMatches.update((matches) => matches.map((match) => (match.id === updatedMatch.id ? updatedMatch : match)));

          if (updatedMatch.typeMatch !== 'PRIVE') {
            this.managedMatchId.set(null);
            this.managedReservations.set([]);
            this.managedMatchForm.reset({ date: '', heureDebut: '', typeMatch: 'PRIVE' });
          } else {
            this.syncManagedMatchForm();
            this.onManagedMatchChange(updatedMatch.id);
          }
        },
        error: (error) => {
          this.actionId.set(null);
          this.errorMessage.set(extractApiErrorMessage(error, 'Modification du match impossible.'));
        }
      });
  }

  deleteManagedMatch(): void {
    const selectedMatch = this.selectedManagedMatch();
    const requesterId = this.memberId();
    if (!selectedMatch || !requesterId || this.actionId() !== null) {
      return;
    }

    if (!confirm(`Confirmer la suppression (annulation) du match #${selectedMatch.id} ?`)) {
      return;
    }

    this.actionId.set(selectedMatch.id);
    this.message.set('');
    this.errorMessage.set('');

    this.matchesApi.cancel(selectedMatch.id, requesterId).subscribe({
      next: () => {
        this.actionId.set(null);
        this.message.set('Match annule avec succes.');
        this.managedMatchId.set(null);
        this.managedReservations.set([]);
        this.managedMatchForm.reset({ date: '', heureDebut: '', typeMatch: 'PRIVE' });
        this.loadOrganisedMatches();
        this.loadReservations();
      },
      error: (error) => {
        this.actionId.set(null);
        this.errorMessage.set(extractApiErrorMessage(error, 'Suppression du match impossible.'));
      }
    });
  }

  private syncManagedMatchForm(): void {
    const selectedMatch = this.selectedManagedMatch();
    if (!selectedMatch) {
      return;
    }

    this.managedMatchForm.patchValue(
      {
        date: selectedMatch.date,
        heureDebut: selectedMatch.heureDebut.slice(0, 5),
        typeMatch: selectedMatch.typeMatch
      },
      { emitEvent: false }
    );
  }

  addPlayer(): void {
    const requesterId = this.memberId();
    const matchId = this.managedMatchId();
    if (!requesterId || !matchId || !this.selectedManagedMatch() || this.inviteMatricule.invalid || this.actionId() !== null) {
      return;
    }

    const matricule = this.inviteMatricule.getRawValue().trim().toUpperCase();
    this.actionId.set(-1);
    this.message.set('');
    this.errorMessage.set('');

    this.membresApi.getByMatricule(matricule).subscribe({
      next: (member) => {
        this.reservationsApi
          .create({
            matchId,
            membreId: member.id,
            requesterId
          })
          .subscribe({
            next: () => {
              this.actionId.set(null);
              this.inviteMatricule.setValue('');
              this.message.set('Joueur ajoute avec succes.');
              this.onManagedMatchChange(matchId);
              this.loadReservations();
            },
            error: (error) => {
              this.actionId.set(null);
              this.errorMessage.set(extractApiErrorMessage(error, 'Ajout du joueur impossible.'));
            }
          });
      },
      error: (error) => {
        this.actionId.set(null);
        this.errorMessage.set(extractApiErrorMessage(error, 'Matricule introuvable.'));
      }
    });
  }

  removePlayer(reservation: ReservationResponse): void {
    const matchId = this.managedMatchId();
    this.actionId.set(reservation.id);
    this.message.set('');
    this.errorMessage.set('');

    this.reservationsApi.cancel(reservation.id).subscribe({
      next: () => {
        this.actionId.set(null);
        this.message.set('Joueur retire du match.');
        if (matchId) {
          this.onManagedMatchChange(matchId);
        }
        this.loadReservations();
      },
      error: (error) => {
        this.actionId.set(null);
        this.errorMessage.set(extractApiErrorMessage(error, 'Suppression du joueur impossible.'));
      }
    });
  }

  pay(reservation: ReservationResponse): void {
    const memberId = this.memberId();
    if (!memberId) {
      return;
    }

    this.actionId.set(reservation.id);
    this.message.set('');
    this.errorMessage.set('');

    this.paiementsApi.pay(reservation.id, memberId).subscribe({
      next: () => {
        this.actionId.set(null);
        this.message.set('Paiement effectue avec succes.');
        this.loadReservations();
      },
      error: (error) => {
        this.actionId.set(null);
        this.errorMessage.set(extractApiErrorMessage(error, 'Paiement impossible.'));
      }
    });
  }

  cancel(reservation: ReservationResponse): void {
    this.actionId.set(reservation.id);
    this.message.set('');
    this.errorMessage.set('');

    this.reservationsApi.cancel(reservation.id).subscribe({
      next: () => {
        this.actionId.set(null);
        this.message.set('Reservation annulee.');
        this.loadReservations();
      },
      error: (error) => {
        this.actionId.set(null);
        this.errorMessage.set(extractApiErrorMessage(error, 'Annulation impossible.'));
      }
    });
  }
}

