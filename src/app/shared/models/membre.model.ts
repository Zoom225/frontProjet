import { TypeMembre } from './enums.model';

export interface MembreRequest {
  matricule: string;
  nom: string;
  prenom: string;
  email: string;
  typeMembre: TypeMembre;
  siteId?: number;
}

export interface MembreResponse {
  id: number;
  matricule: string;
  nom: string;
  prenom: string;
  email: string;
  typeMembre: TypeMembre;
  siteId: number | null;
  siteNom: string | null;
  solde: number;
}

