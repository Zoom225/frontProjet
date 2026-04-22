import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { MEMBER_SESSION_KEY, MemberSessionService } from './member-session.service';

describe('MemberSessionService', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.resetTestingModule();
  });

  it('should persist and restore a member session', () => {
    TestBed.configureTestingModule({});
    const service = TestBed.inject(MemberSessionService);

    service.setMember({
      id: 1,
      matricule: 'G1234',
      nom: 'Doe',
      prenom: 'John',
      email: 'john@example.com',
      typeMembre: 'GLOBAL',
      siteId: null,
      siteNom: null,
      solde: 0
    });

    expect(service.isAuthenticated()).toBe(true);
    expect(service.memberId()).toBe(1);
    expect(service.matricule()).toBe('G1234');
  });

  it('should restore a member session from localStorage', () => {
    localStorage.setItem(
      MEMBER_SESSION_KEY,
      JSON.stringify({
        id: 9,
        matricule: 'S12345',
        nom: 'Smith',
        prenom: 'Anna',
        email: 'anna@example.com',
        typeMembre: 'SITE',
        siteId: 5,
        siteNom: 'Padel Bruxelles',
        solde: 12
      })
    );

    TestBed.configureTestingModule({});
    const service = TestBed.inject(MemberSessionService);

    expect(service.isAuthenticated()).toBe(true);
    expect(service.memberId()).toBe(9);
    expect(service.matricule()).toBe('S12345');
  });

  it('should clear invalid member localStorage content', () => {
    localStorage.setItem(MEMBER_SESSION_KEY, '{broken');

    TestBed.configureTestingModule({});
    const service = TestBed.inject(MemberSessionService);

    expect(service.isAuthenticated()).toBe(false);
    expect(localStorage.getItem(MEMBER_SESSION_KEY)).toBeNull();
  });

  it('should clear the member session', () => {
    TestBed.configureTestingModule({});
    const service = TestBed.inject(MemberSessionService);

    service.setMember({
      id: 2,
      matricule: 'S12345',
      nom: 'Smith',
      prenom: 'Anna',
      email: 'anna@example.com',
      typeMembre: 'SITE',
      siteId: 1,
      siteNom: 'Site A',
      solde: 10
    });

    service.clearMember();

    expect(service.isAuthenticated()).toBe(false);
    expect(service.member()).toBeNull();
  });
});
