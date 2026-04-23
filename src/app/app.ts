import { CommonModule, DOCUMENT } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatToolbarModule } from '@angular/material/toolbar';
import { Router, RouterModule } from '@angular/router';
import { AdminSessionService } from './core/auth/admin-session.service';
import { MemberSessionService } from './core/auth/member-session.service';

@Component({
  selector: 'app-root',
  imports: [CommonModule, RouterModule, MatToolbarModule, MatButtonModule],
  template: `
    <mat-toolbar class="app-toolbar toolbar-blur" color="primary">
      <div class="mx-auto flex w-full max-w-7xl items-center justify-between gap-2 px-2 py-1">
        <a routerLink="/" class="inline-flex items-center gap-2 text-base font-semibold text-white no-underline sm:text-lg">
          <span class="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/20">P</span>
          <span>PadelPlay</span>
        </a>

        <nav class="hidden items-center gap-1 md:flex">
          <a mat-button routerLink="/" routerLinkActive="active-link" [routerLinkActiveOptions]="{ exact: true }">Accueil</a>
          <a mat-button routerLink="/member" routerLinkActive="active-link">Membre</a>
          <a mat-button routerLink="/admin" routerLinkActive="active-link">Admin</a>

          @if (memberSession.isAuthenticated()) {
            <a mat-button routerLink="/member/profile" routerLinkActive="active-link">Profil</a>
            <a mat-button routerLink="/member/matches" routerLinkActive="active-link">Matchs</a>
            <a mat-flat-button color="accent" routerLink="/member/matches/new" routerLinkActive="active-link">Creer match</a>
            <a mat-button routerLink="/member/reservations" routerLinkActive="active-link">Reservations</a>
            <a mat-button routerLink="/member/payments" routerLinkActive="active-link">Paiements</a>
            <button mat-stroked-button type="button" (click)="logoutMember()">Logout membre</button>
          } @else {
            <a mat-stroked-button routerLink="/member">Espace membre</a>
          }

          @if (adminSession.isAuthenticated()) {
            <a mat-button routerLink="/admin/members" routerLinkActive="active-link">Membres admin</a>
            <a mat-button routerLink="/admin/matches" routerLinkActive="active-link">Matchs admin</a>
            <a mat-button routerLink="/admin/sites" routerLinkActive="active-link">Sites</a>
            <a mat-button routerLink="/admin/terrains" routerLinkActive="active-link">Terrains</a>
            <a mat-button routerLink="/admin/fermetures" routerLinkActive="active-link">Fermetures</a>
            <button mat-stroked-button type="button" (click)="logoutAdmin()">Logout admin</button>
          } @else {
            <a mat-stroked-button routerLink="/admin/login">Login admin</a>
          }

          <button mat-stroked-button type="button" (click)="toggleTheme()">
            {{ isOceanTheme() ? 'Theme classique' : 'Theme ocean' }}
          </button>
        </nav>

        <button mat-stroked-button type="button" class="md:hidden" (click)="toggleMobileMenu()">
          {{ mobileMenuOpen() ? 'Fermer' : 'Menu' }}
        </button>
      </div>

      @if (mobileMenuOpen()) {
        <div class="mx-auto mt-2 w-full max-w-7xl rounded-xl bg-white/10 p-2 backdrop-blur-sm md:hidden">
          <nav class="grid gap-1">
            <a mat-button routerLink="/" (click)="closeMobileMenu()">Accueil</a>
            <a mat-button routerLink="/member" (click)="closeMobileMenu()">Membre</a>
            <a mat-button routerLink="/admin" (click)="closeMobileMenu()">Admin</a>

            @if (memberSession.isAuthenticated()) {
              <a mat-button routerLink="/member/profile" (click)="closeMobileMenu()">Profil membre</a>
              <a mat-button routerLink="/member/matches" (click)="closeMobileMenu()">Matchs</a>
              <a mat-button routerLink="/member/matches/new" (click)="closeMobileMenu()">Creer match</a>
              <a mat-button routerLink="/member/reservations" (click)="closeMobileMenu()">Reservations</a>
              <a mat-button routerLink="/member/payments" (click)="closeMobileMenu()">Paiements</a>
            }

            @if (adminSession.isAuthenticated()) {
              <a mat-button routerLink="/admin/members" (click)="closeMobileMenu()">Membres admin</a>
              <a mat-button routerLink="/admin/matches" (click)="closeMobileMenu()">Matchs admin</a>
              <a mat-button routerLink="/admin/sites" (click)="closeMobileMenu()">Sites</a>
              <a mat-button routerLink="/admin/terrains" (click)="closeMobileMenu()">Terrains</a>
              <a mat-button routerLink="/admin/fermetures" (click)="closeMobileMenu()">Fermetures</a>
            }

            <button mat-stroked-button type="button" (click)="toggleTheme()">
              {{ isOceanTheme() ? 'Theme classique' : 'Theme ocean' }}
            </button>
          </nav>
        </div>
      }
    </mat-toolbar>

    <main class="min-h-[calc(100vh-64px)] bg-gradient-to-b from-slate-50 to-slate-100/70">
      <router-outlet></router-outlet>
    </main>
  `,
  styles: [
    `
      .app-toolbar {
        position: sticky;
        top: 0;
        z-index: 20;
      }

      .active-link {
        background: rgba(255, 255, 255, 0.2);
        border-radius: 6px;
      }
    `
  ]
})
export class App {
  private static readonly THEME_KEY = 'padel_theme';

  readonly adminSession = inject(AdminSessionService);
  readonly memberSession = inject(MemberSessionService);
  readonly mobileMenuOpen = signal(false);
  readonly isOceanTheme = signal(false);
  private readonly router = inject(Router);
  private readonly document = inject(DOCUMENT);

  constructor() {
    const storedTheme = localStorage.getItem(App.THEME_KEY);
    const isOcean = storedTheme === 'ocean';
    this.isOceanTheme.set(isOcean);
    this.applyTheme(isOcean);
  }

  toggleMobileMenu(): void {
    this.mobileMenuOpen.update((value) => !value);
  }

  closeMobileMenu(): void {
    this.mobileMenuOpen.set(false);
  }

  toggleTheme(): void {
    const next = !this.isOceanTheme();
    this.isOceanTheme.set(next);
    this.applyTheme(next);
    localStorage.setItem(App.THEME_KEY, next ? 'ocean' : 'classic');
  }

  private applyTheme(isOcean: boolean): void {
    this.document.body.classList.toggle('ocean-theme', isOcean);
  }

  logoutAdmin(): void {
    this.adminSession.clearSession();
    this.closeMobileMenu();
    this.router.navigateByUrl('/admin/login');
  }

  logoutMember(): void {
    this.memberSession.clearMember();
    this.closeMobileMenu();
    this.router.navigateByUrl('/member');
  }
}
