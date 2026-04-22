import { Routes } from '@angular/router';
import { adminGuard } from './core/guards/admin.guard';
import { memberGuard } from './core/guards/member.guard';
import { AdminHomePage } from './features/admin/pages/admin-home.page';
import { AdminJoursFermeturePage } from './features/admin/pages/admin-jours-fermeture.page';
import { AdminLoginPage } from './features/admin/pages/admin-login.page';
import { AdminMatchesPage } from './features/admin/pages/admin-matches.page';
import { AdminMembersPage } from './features/admin/pages/admin-members.page';
import { AdminSitesPage } from './features/admin/pages/admin-sites.page';
import { AdminTerrainsPage } from './features/admin/pages/admin-terrains.page';
import { LandingPage } from './features/home/pages/landing.page';
import { MemberCreateMatchPage } from './features/member/pages/member-create-match.page';
import { MemberHomePage } from './features/member/pages/member-home.page';
import { MemberPaymentsPage } from './features/member/pages/member-payments.page';
import { MemberProfilePage } from './features/member/pages/member-profile.page';
import { MemberPublicMatchesPage } from './features/member/pages/member-public-matches.page';
import { MemberReservationsPage } from './features/member/pages/member-reservations.page';

export const routes: Routes = [
  {
    path: '',
    component: LandingPage,
    title: 'PadelPlay - Accueil'
  },
  {
    path: 'member',
    component: MemberHomePage,
    title: 'PadelPlay - Espace membre'
  },
  {
    path: 'member/profile',
    canActivate: [memberGuard],
    component: MemberProfilePage,
    title: 'PadelPlay - Profil membre'
  },
  {
    path: 'member/matches',
    canActivate: [memberGuard],
    component: MemberPublicMatchesPage,
    title: 'PadelPlay - Matchs publics'
  },
  {
    path: 'member/matches/new',
    canActivate: [memberGuard],
    component: MemberCreateMatchPage,
    title: 'PadelPlay - Creer un match'
  },
  {
    path: 'member/reservations',
    canActivate: [memberGuard],
    component: MemberReservationsPage,
    title: 'PadelPlay - Reservations membre'
  },
  {
    path: 'member/payments',
    canActivate: [memberGuard],
    component: MemberPaymentsPage,
    title: 'PadelPlay - Paiements membre'
  },
  {
    path: 'admin/login',
    component: AdminLoginPage,
    title: 'PadelPlay - Login admin'
  },
  {
    path: 'admin',
    canActivate: [adminGuard],
    data: {
      roles: ['GLOBAL', 'SITE']
    },
    component: AdminHomePage,
    title: 'PadelPlay - Dashboard admin'
  },
  {
    path: 'admin/members',
    canActivate: [adminGuard],
    data: { roles: ['GLOBAL', 'SITE'] },
    component: AdminMembersPage,
    title: 'PadelPlay - Membres admin'
  },
  {
    path: 'admin/matches',
    canActivate: [adminGuard],
    data: { roles: ['GLOBAL', 'SITE'] },
    component: AdminMatchesPage,
    title: 'PadelPlay - Matchs admin'
  },
  {
    path: 'admin/sites',
    canActivate: [adminGuard],
    data: { roles: ['GLOBAL', 'SITE'] },
    component: AdminSitesPage,
    title: 'PadelPlay - Sites admin'
  },
  {
    path: 'admin/terrains',
    canActivate: [adminGuard],
    data: { roles: ['GLOBAL', 'SITE'] },
    component: AdminTerrainsPage,
    title: 'PadelPlay - Terrains admin'
  },
  {
    path: 'admin/fermetures',
    canActivate: [adminGuard],
    data: { roles: ['GLOBAL', 'SITE'] },
    component: AdminJoursFermeturePage,
    title: 'PadelPlay - Jours de fermeture'
  },
  {
    path: '**',
    redirectTo: ''
  }
];
