import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { MatchRequest, MatchResponse } from '../../shared/models/match.model';
import { apiUrl } from './api-url';

@Injectable({ providedIn: 'root' })
export class MatchesApiService {
  constructor(private readonly http: HttpClient) {}

  getAll(): Observable<MatchResponse[]> {
    return this.http.get<MatchResponse[]>(apiUrl('/matches'));
  }

  getById(id: number): Observable<MatchResponse> {
    return this.http.get<MatchResponse>(apiUrl(`/matches/${id}`));
  }

  getPublic(): Observable<MatchResponse[]> {
    return this.http.get<MatchResponse[]>(apiUrl('/matches/public'));
  }

  getBySite(siteId: number): Observable<MatchResponse[]> {
    return this.http.get<MatchResponse[]>(apiUrl(`/matches/site/${siteId}`));
  }

  getByOrganisateur(organisateurId: number): Observable<MatchResponse[]> {
    return this.http.get<MatchResponse[]>(apiUrl(`/matches/organisateur/${organisateurId}`));
  }

  create(payload: MatchRequest): Observable<MatchResponse> {
    return this.http.post<MatchResponse>(apiUrl('/matches'), payload);
  }

  update(id: number, payload: MatchRequest): Observable<MatchResponse> {
    return this.http.put<MatchResponse>(apiUrl(`/matches/${id}`), payload);
  }

  cancel(id: number, requesterId: number): Observable<void> {
    return this.http.patch<void>(apiUrl(`/matches/${id}/cancel?requesterId=${requesterId}`), {});
  }

  convertToPublic(id: number): Observable<void> {
    return this.http.patch<void>(apiUrl(`/matches/${id}/convert-public`), {});
  }
}

