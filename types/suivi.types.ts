/* Réponses de `/api/suivi/` — voir `yessal-backend/accounts/suivi.py` (même contrat que le web). */

export type Periode = "mois" | "3mois" | "tout";
export type RepartitionPar = "ldd" | "daara" | "titre" | "pays";

export interface SuiviPersonne {
  id: number;
  name: string;
  title: string | null;
  avatar: string | null;
}

export interface SuiviJef {
  id: number;
  donor: SuiviPersonne;
  amount: number;
  campaign: { id: number; name: string };
  method: string;
  daara: string | null;
  created_at: string;
}

export interface SuiviNdiguel {
  id: number;
  name: string;
  status: "active" | "pending";
  goal_amount: number | null;
  collected: number;
  pct: number | null;
  deadline: string;
  opens_on: string | null;
  recurrent: boolean;
}

export interface SuiviAlerte {
  kind: string;
  strong: string;
  text: string;
}

export interface SuiviOverview {
  period: Periode;
  since: string | null;
  donations: { amount: number; count: number; diaspora_pct: number; pending: { amount: number; count: number } };
  members: { total: number; pending: number; titled: number };
  campaigns: { active: number; upcoming: number };
  ldd: { active: number; total: number; top: string | null };
  coordinators: { total: number; daaras: number };
  monthly: { month: string; amount: number; count: number }[];
  campaigns_list: SuiviNdiguel[];
  alerts: SuiviAlerte[];
  coordinators_list: (SuiviPersonne & { daara: { id: number; name: string } | null; amount: number; count: number })[];
  recent: SuiviJef[];
}

export interface SuiviRepartitionLigne {
  id: number | string | null;
  name: string;
  amount: number;
  count: number;
  pct: number;
  members?: number;
  ldd?: string | null;
}

export interface SuiviRepartition {
  by: RepartitionPar;
  period: Periode;
  total: number;
  without_jef: number | null;
  rows: SuiviRepartitionLigne[];
}

export interface SuiviDaara {
  id: number;
  name: string;
  ldd: { id: number; name: string } | null;
  period: Periode;
  coordinator: (SuiviPersonne & { phone: string | null }) | null;
  amount: number;
  count: number;
  members_count: number;
  donors_count: number;
  members: (SuiviPersonne & { role: string; amount: number; count: number })[];
  donations: SuiviJef[];
}

export const PERIODES: { value: Periode; label: string }[] = [
  { value: "mois", label: "Ce mois" },
  { value: "3mois", label: "3 mois" },
  { value: "tout", label: "Depuis le début" },
];

export function lirePeriode(value?: string | null): Periode {
  return value === "mois" || value === "3mois" ? value : "tout";
}
