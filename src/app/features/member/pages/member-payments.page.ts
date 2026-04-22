import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { RouterLink } from '@angular/router';
import { PaiementsApiService } from '../../../core/api/paiements-api.service';
import { MemberSessionService } from '../../../core/auth/member-session.service';
import { PaiementResponse } from '../../../shared/models/reservation.model';
import { extractApiErrorMessage } from '../../../shared/utils/api-error.util';

@Component({
  selector: 'app-member-payments-page',
  standalone: true,
  imports: [CommonModule, RouterLink, MatButtonModule, MatCardModule, MatChipsModule, MatProgressSpinnerModule],
  template: `
    <section class="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 class="text-2xl font-semibold text-slate-900">Mes paiements</h1>
          <p class="text-sm text-slate-600">Historique des paiements et remboursements.</p>
        </div>
        <a mat-stroked-button routerLink="/member/reservations">Mes reservations</a>
      </div>

      @if (loading()) {
        <mat-spinner diameter="32"></mat-spinner>
      }

      @if (errorMessage()) {
        <p class="text-sm text-red-600">{{ errorMessage() }}</p>
      }

      <mat-card>
        <mat-card-content class="grid gap-4 pt-4 md:grid-cols-3">
          <div>
            <p class="text-sm text-slate-500">Total paiements</p>
            <p class="text-xl font-semibold">{{ payments().length }}</p>
          </div>
          <div>
            <p class="text-sm text-slate-500">Total paye</p>
            <p class="text-xl font-semibold">{{ totalPaid() }} EUR</p>
          </div>
          <div>
            <p class="text-sm text-slate-500">En attente / rembourses</p>
            <p class="text-xl font-semibold">{{ pendingCount() }} / {{ refundedCount() }}</p>
          </div>
        </mat-card-content>
      </mat-card>

      <div class="grid gap-4 md:grid-cols-2">
        @for (payment of payments(); track payment.id) {
          <mat-card>
            <mat-card-header>
              <mat-card-title>Paiement #{{ payment.id }}</mat-card-title>
              <mat-card-subtitle>{{ payment.datePaiement || 'Pas encore regle' }}</mat-card-subtitle>
            </mat-card-header>
            <mat-card-content>
              <p><strong>Montant:</strong> {{ payment.montant }} EUR</p>
              <mat-chip-set>
                <mat-chip [highlighted]="true">{{ payment.statut }}</mat-chip>
              </mat-chip-set>
            </mat-card-content>
          </mat-card>
        } @empty {
          @if (!loading()) {
            <mat-card>
              <mat-card-content class="py-6 text-slate-600">Aucun paiement trouve.</mat-card-content>
            </mat-card>
          }
        }
      </div>
    </section>
  `
})
export class MemberPaymentsPage {
  private readonly paiementsApi = inject(PaiementsApiService);
  private readonly memberSession = inject(MemberSessionService);

  readonly loading = signal(false);
  readonly errorMessage = signal('');
  readonly payments = signal<PaiementResponse[]>([]);
  readonly memberId = computed(() => this.memberSession.memberId());
  readonly totalPaid = computed(() =>
    this.payments()
      .filter((payment) => payment.statut === 'PAYE')
      .reduce((sum, payment) => sum + payment.montant, 0)
  );
  readonly pendingCount = computed(() => this.payments().filter((payment) => payment.statut === 'EN_ATTENTE').length);
  readonly refundedCount = computed(() => this.payments().filter((payment) => payment.statut === 'REMBOURSE').length);

  constructor() {
    this.loadPayments();
  }

  loadPayments(): void {
    const memberId = this.memberId();
    if (!memberId) {
      this.errorMessage.set('Aucun membre connecte.');
      return;
    }

    this.loading.set(true);
    this.paiementsApi.getByMembre(memberId).subscribe({
      next: (payments) => {
        this.payments.set(payments);
        this.loading.set(false);
      },
      error: (error) => {
        this.loading.set(false);
        this.errorMessage.set(extractApiErrorMessage(error, 'Impossible de charger les paiements.'));
      }
    });
  }
}
