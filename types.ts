
// Profil de l'apiculteur
export interface BeekeeperProfile {
  companyName: string; // Nom de l'exploitation (ex: Le Rucher Du Vieux Juigné)
  napi: string;
  siret: string;
  address: string; // Adresse du siège
  status: string; // Statut (Micro BA, etc.)
  creationDate: string; // Date de création
  vetName: string;
  vetAddress: string;
}

// Configuration des Coûts Unitaires
export interface UnitCostConfig {
  jar250: number;
  jar500: number;
  jar1kg: number;
  lid: number;
  label250: number;
  label500: number;
  label1kg: number;
  feedingYearly: number; // Coût GLOBAL annuel du nourrissement
  treatmentYearly: number; // Coût GLOBAL annuel des traitements
}

// 1. Registre d'Élevage
export interface Apiary {
  id: string;
  name: string;
  location: string; // Coordonnées ou description
}

export interface Hive {
  id: string;
  name: string; // ex: Ruche 01
  apiaryId: string; // Rucher d'appartenance
}

export enum MovementType {
  TRANSHUMANCE = "Transhumance",
  ACHAT = "Achat",
  VENTE = "Vente",
  DIVISION = "Division",
  REUNION = "Réunion",
  MORT = "Mortalité"
}

export interface ColonyMovement {
  id: string;
  date: string;
  type: MovementType | string;
  description: string;
  originApiaryId?: string;
  destinationApiaryId?: string;
  quantity: number; // Nombre de ruches/reines
}

export interface SanitaryIntervention {
  id: string;
  date: string;
  drugName: string;
  batchNumber: string; // Numéro de lot du médicament
  quantity: string; // ex: 2 lanières
  posology: string;
  notes?: string;
  apiaryId?: string; // Rucher concerné
  hiveId?: string; // Ruche spécifique (obsolète, gardé pour compatibilité)
  hiveIds?: string[]; // NOUVEAU: Liste des IDs de ruches concernées
}

export interface Feeding {
  id: string;
  date: string;
  foodType: string; // Sirop, Candi, Sucre
  quantity: string;
  apiaryId: string; // Rucher nourri
  hiveId?: string; // Ruche spécifique (obsolète)
  hiveIds?: string[]; // NOUVEAU: Liste des IDs
}

// 2. Cahier de Miellerie
export interface Harvest {
  id: string;
  date: string;
  apiaryId: string;
  honeyType: string; // Acacia, Châtaignier, etc.
  quantityKg: number;
  batchId: string; // Identifiant interne de lot de vrac
}

export interface Packaging {
  id: string;
  date: string;
  harvestBatchIds: string[]; // Provenance du miel (mélange possible)
  quantityPots: number;
  potSize: string; // ex: 500g
  finalBatchNumber: string; // Le numéro sur l'étiquette
  ddm: string; // Date de Durabilité Minimale
  honeyType?: string; // Nouveau : Type de miel mis en pot
  calculatedCost?: number; // Coût calculé des fournitures (pots, étiquettes...)
}

// 3. Ventes & Produits & Clients
export type PaymentMethod = 'ESPECES' | 'CB' | 'CHEQUE' | 'VIREMENT' | 'DON' | 'AUTRE';

export interface Product {
  id: string;
  name: string;
  potSize: string;
  price: number;
  imageUrl?: string;
  currentBatchId?: string; // ID du Packaging/Lot actif pour ce produit
}

export interface Client {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  notes?: string;
  totalSpent?: number; // Calculated on fly usually, but helpful type hint
}

export interface Sale {
  id: string;
  date: string;
  finalBatchNumber: string; // Lien vers le conditionnement
  quantitySold: number;
  buyerType: 'DIRECT' | 'WHOLESALE'; // Gardé pour compatibilité
  buyerName?: string; // Sert désormais de champ "Client OU Lieu de vente"
  clientId?: string; // Lien optionnel vers un client enregistré
  
  // Financial & Product Data
  paymentMethod?: PaymentMethod;
  totalPrice?: number;
  productName?: string; // Pour affichage historique si le produit est supprimé
  format?: string; // Nouveau champ: Format/Poids (ex: 500g) stocké au moment de la vente
}

// 4. Finances & Dépenses
export type ExpenseCategory = 'MATERIEL' | 'NOURRISSEMENT' | 'SOIN' | 'CONDITIONNEMENT' | 'ADMINISTRATIF' | 'AUTRE';

export interface Expense {
    id: string;
    date: string;
    store?: string; // Magasin / Fournisseur (ex: Icko, Gamm Vert)
    description: string;
    category: ExpenseCategory;
    amount: number;
}

export type ViewState = 'DASHBOARD' | 'BREEDING' | 'HONEY' | 'SETTINGS' | 'EXPENSES' | 'CLIENTS';