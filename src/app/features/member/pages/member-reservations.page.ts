import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { RouterLink } from '@angular/router';
import { PaiementsApiService } from '../../../core/api/paiements-api.service';
import { ReservationsApiService } from '../../../core/api/reservations-api.service';
import { MemberSessionService } from '../../../core/auth/member-session.service';
import { ReservationResponse } from '../../../shared/models/reservation.model';
import { extractApiErrorMessage } from '../../../shared/utils/api-error.util';

@Component({
  selector: 'app-member-reservations-page',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatCardModule,
    MatButtonModule,
    MatChipsModule,
    MatProgressSpinnerModule
  ],
  template: `
    <section class="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 class="text-2xl font-semibold text-slate-900">Mes reservations</h1>
          <p class="text-sm text-slate-600">Paiement et annulation de vos inscriptions.</p>
        </div>
        <div class="flex gap-2">
          <a mat-stroked-button routerLink="/member/matches">Matchs publics</a>
          <a mat-stroked-button routerLink="/member/payments">Mes paiements</a>
        </div>
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
        @for (reservation of reservations(); track reservation.id) {
          <mat-card>
            <mat-card-header>
              <mat-card-title>Reservation #{{ reservation.id }}</mat-card-title>
              <mat-card-subtitle>{{ reservation.matchDateTime }}</mat-card-subtitle>
            </mat-card-header>
            <mat-card-content class="space-y-2">
              <p><strong>Joueur:</strong> {{ reservation.membreNom }}</p>
              <p><strong>Match:</strong> #{{ reservation.matchId }}</p>
              <mat-chip-set>
                <mat-chip [highlighted]="true">Reservation: {{ reservation.statut }}</mat-chip>
                <mat-chip [highlighted]="true">Paiement: {{ reservation.paiement.statut }}</mat-chip>
              </mat-chip-set>
              <p><strong>Montant:</strong> {{ reservation.paiement.montant }} EUR</p>
            </mat-card-content>
            <mat-card-actions>
              <button
                mat-flat-button
                color="primary"
                type="button"
                (click)="pay(reservation)"
                [disabled]="reservation.paiement.statut !== 'EN_ATTENTE' || actionId() === reservation.id"
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
  private readonly reservationsApi = inject(ReservationsApiService);
  private readonly paiementsApi = inject(PaiementsApiService);
  private readonly memberSession = inject(MemberSessionService);

  readonly loading = signal(false);
  readonly actionId = signal<number | null>(null);
  readonly message = signal('');
  readonly errorMessage = signal('');
  readonly reservations = signal<ReservationResponse[]>([]);
  readonly memberId = computed(() => this.memberSession.memberId());

  constructor() {
    this.loadReservations();
  }

  loadReservations(): void {
    const memberId = this.memberId();
    if (!memberId) {
      this.errorMessage.set('Aucun membre connecte.');
      return;
    }

    this.loading.set(true);
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

