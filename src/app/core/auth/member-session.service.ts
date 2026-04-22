import { Injectable, computed, signal } from '@angular/core';
import { MembreResponse } from '../../shared/models/membre.model';

export const MEMBER_SESSION_KEY = 'padel_member_session';

@Injectable({ providedIn: 'root' })
export class MemberSessionService {
  private readonly memberState = signal<MembreResponse | null>(this.loadFromStorage());

  readonly member = computed(() => this.memberState());
  readonly memberId = computed(() => this.memberState()?.id ?? null);
  readonly matricule = computed(() => this.memberState()?.matricule ?? null);
  readonly isAuthenticated = computed(() => !!this.memberState()?.id);

  setMember(member: MembreResponse): void {
    this.memberState.set(member);
    localStorage.setItem(MEMBER_SESSION_KEY, JSON.stringify(member));
  }

  clearMember(): void {
    this.memberState.set(null);
    localStorage.removeItem(MEMBER_SESSION_KEY);
  }

  private loadFromStorage(): MembreResponse | null {
    const raw = localStorage.getItem(MEMBER_SESSION_KEY);
    if (!raw) {
      return null;
    }

    try {
      return JSON.parse(raw) as MembreResponse;
    } catch {
      localStorage.removeItem(MEMBER_SESSION_KEY);
      return null;
    }
  }
}

