export enum Severity {
  HIGH = "High",
  MEDIUM = "Medium",
  LOW = "Low",
  NONE = "None"
}

export interface Interaction {
  drugA: string;
  drugB: string;
  severity: Severity;
  description: string;
  recommendation?: string;
}

export interface InteractionResult {
  severity: Severity;
  description: string;
  interactions: Interaction[];
  sideEffects: string[];
  problems: string[];
  alternatives: string[];
  alerts: string[];
  patientContraindications?: {
    elderly: string[];
    pregnant: string[];
    renallyImpaired: string[];
    other?: string[];
  };
}

export interface Drug {
  id: string;
  name: string;
}

export interface HistoryEntry {
  id: string;
  uid: string;
  timestamp: number;
  drugs: string[];
  result: InteractionResult;
}
