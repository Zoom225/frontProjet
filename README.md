# Frontend PadelPlay

Application frontend Angular pour la plateforme PadelPlay.

## Prerequis

- Node.js 20+
- npm 10+
- Backend Spring Boot lance sur `http://localhost:8080`

## Installation

```powershell
cd frontend
npm install
```

## Lancer en developpement

```powershell
cd frontend
npm start
```

- Frontend: `http://localhost:4200`
- Le proxy redirige automatiquement `/api/*` vers `http://localhost:8080`
- Fichier proxy: `proxy.conf.json`

## Build production

```powershell
cd frontend
npm run build
```

## Tests unitaires (Vitest)

```powershell
cd frontend
npm test
```

```powershell
cd frontend
npm run test:watch
```

## Fonctionnalites actuellement disponibles

### Espace membre
- Identification par matricule
- Profil membre
- Consultation des matchs publics
- Reservation d un match public
- Creation d un match public ou prive
- Consultation des reservations
- Paiement d une reservation
- Consultation des paiements
- Deconnexion membre

### Espace administrateur
- Login admin JWT
- Interceptor Bearer token
- Guard admin avec roles `GLOBAL` et `SITE`
- Dashboard avec KPI et chiffre d affaires calcule cote frontend
- Gestion des membres
- Gestion des matchs
- Gestion des sites
- Gestion des terrains
- Deconnexion admin

## Routes principales

### Public
- `/`
- `/member`
- `/admin/login`

### Membre
- `/member/profile`
- `/member/matches`
- `/member/matches/new`
- `/member/reservations`
- `/member/payments`

### Admin
- `/admin`
- `/admin/members`
- `/admin/matches`
- `/admin/sites`
- `/admin/terrains`

## Structure actuelle

```text
src/app/
  core/
    api/
    auth/
    guards/
    interceptors/
    services/
  shared/
    models/
    components/
    pipes/
    utils/
  features/
    home/pages/
    member/pages/
    admin/pages/
```

## Variables d environnement

- `src/environments/environment.ts`
- `src/environments/environment.development.ts`

Variable principale:
- `apiBaseUrl` (actuellement `'/api'`)

## Endpoints encapsules

Services API disponibles dans `src/app/core/api/`:
- `AuthApiService`
- `MembresApiService`
- `MatchesApiService`
- `ReservationsApiService`
- `PaiementsApiService`
- `SitesApiService`
- `TerrainsApiService`

## Notes

- UI: Angular Material + TailwindCSS
- Les erreurs backend sont converties en messages lisibles dans l interface
- Les tests actuellement verifies couvrent le shell et les sessions admin/membre
