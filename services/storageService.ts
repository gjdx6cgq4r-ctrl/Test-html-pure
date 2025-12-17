import { 
  BeekeeperProfile, Apiary, Hive, ColonyMovement, SanitaryIntervention, 
  Feeding, Harvest, Packaging, Sale, Product, Expense, Client, UnitCostConfig
} from '../types';

// CHANGEMENT DES CLES (_v2) POUR FORCER L'AFFICHAGE DES DONNEES FICTIVES
const STORAGE_KEYS = {
  PROFILE: 'apigest_profile_v2',
  APIARIES: 'apigest_apiaries_v2',
  HIVES: 'apigest_hives_v2', 
  MOVEMENTS: 'apigest_movements_v2',
  INTERVENTIONS: 'apigest_interventions_v2',
  FEEDINGS: 'apigest_feedings_v2',
  HARVESTS: 'apigest_harvests_v2',
  PACKAGING: 'apigest_packaging_v2',
  SALES: 'apigest_sales_v2',
  PRODUCTS: 'apigest_products_v2',
  HONEY_TYPES: 'apigest_honey_types_v2',
  FOOD_TYPES: 'apigest_food_types_v2', // Nouvelle clé pour les nourritures
  EXPENSES: 'apigest_expenses_v2',
  CLIENTS: 'apigest_clients_v2',
  COST_CONFIG: 'apigest_cost_config_v2',
};

// --- DATA FICTIVE (DEMO) ---
const SAMPLE_PROFILE: BeekeeperProfile = { 
  companyName: 'Le Rucher des Saveurs', 
  napi: 'A1234567', 
  siret: '80012345600019',
  address: '12 Chemin des Abeilles, 49000 Angers',
  status: 'Micro BA',
  creationDate: '2020-01-15',
  vetName: 'Dr. Vétérinaire', 
  vetAddress: 'Clinique Vet, Angers' 
};

const SAMPLE_COST_CONFIG: UnitCostConfig = {
  jar250: 0.30,
  jar500: 0.45,
  jar1kg: 0.60,
  lid: 0.15,
  label250: 0.10,
  label500: 0.10,
  label1kg: 0.12,
  feedingYearly: 300,
  treatmentYearly: 150
};

const SAMPLE_APIARIES: Apiary[] = [
    { id: 'api_1', name: 'Rucher du Château', location: 'Parc du Château' },
    { id: 'api_2', name: 'Rucher Forêt', location: 'Forêt de Juigné' }
];

const SAMPLE_HIVES: Hive[] = [
    { id: 'h_1', name: 'Ruche 01', apiaryId: 'api_1' },
    { id: 'h_2', name: 'Ruche 02', apiaryId: 'api_1' },
    { id: 'h_3', name: 'Ruche 03', apiaryId: 'api_1' },
    { id: 'h_4', name: 'Ruche 04', apiaryId: 'api_1' },
    { id: 'h_5', name: 'Ruche 05', apiaryId: 'api_1' },
    { id: 'h_6', name: 'Ruche F1', apiaryId: 'api_2' },
    { id: 'h_7', name: 'Ruche F2', apiaryId: 'api_2' },
    { id: 'h_8', name: 'Ruche F3', apiaryId: 'api_2' }
];

const SAMPLE_MOVEMENTS: ColonyMovement[] = [
    { id: 'mov_1', date: '2024-03-15', type: 'Transhumance', description: 'Déplacement sur Colza', originApiaryId: 'api_1', destinationApiaryId: 'api_2', quantity: 3 }
];

const SAMPLE_INTERVENTIONS: SanitaryIntervention[] = [
    { id: 'int_1', date: '2024-08-20', drugName: 'Apivar', batchNumber: 'L8833', quantity: '2 lanières', posology: 'Traitement fin de saison', apiaryId: 'api_1', hiveId: '' },
    { id: 'int_2', date: '2024-12-15', drugName: 'Acide Oxalique', batchNumber: 'AO-22', quantity: '30ml', posology: 'Dégouttement hors couvain', apiaryId: 'api_2', hiveId: '' }
];

const SAMPLE_FEEDINGS: Feeding[] = [
    { id: 'feed_1', date: '2024-02-10', foodType: 'Candi', quantity: '1 pain 2.5kg', apiaryId: 'api_1', hiveId: '' },
    { id: 'feed_2', date: '2024-09-01', foodType: 'Sirop 50/50', quantity: '3 Litres', apiaryId: 'api_2', hiveId: '' }
];

const SAMPLE_HARVESTS: Harvest[] = [
    { id: 'har_1', date: '2024-05-20', apiaryId: 'api_2', honeyType: 'Printemps', quantityKg: 45, batchId: 'VRAC-2024-001' },
    { id: 'har_2', date: '2024-07-15', apiaryId: 'api_1', honeyType: 'Toutes fleurs', quantityKg: 80, batchId: 'VRAC-2024-002' }
];

const SAMPLE_PACKAGING: Packaging[] = [
    { id: 'pkg_1', date: '2024-06-01', harvestBatchIds: ['har_1'], quantityPots: 80, potSize: '500g', finalBatchNumber: '2024-PRI', ddm: '2026-06-01', honeyType: 'Printemps' },
    { id: 'pkg_2', date: '2024-08-01', harvestBatchIds: ['har_2'], quantityPots: 70, potSize: '1kg', finalBatchNumber: '2024-ETF', ddm: '2026-08-01', honeyType: 'Toutes fleurs' }
];

const SAMPLE_PRODUCTS: Product[] = [
    { id: 'prod_1', name: 'Miel de Printemps Crémeux', potSize: '500g', price: 7.50, currentBatchId: 'pkg_1' },
    { id: 'prod_2', name: 'Miel Toutes Fleurs', potSize: '1kg', price: 14.00, currentBatchId: 'pkg_2' }
];

const SAMPLE_CLIENTS: Client[] = [
    { id: 'cli_1', name: 'Mme Durand', phone: '0601020304', email: 'durand@email.com', address: 'Angers' },
    { id: 'cli_2', name: 'Épicerie Du Coin', phone: '0241000000', address: 'Place du village' }
];

const SAMPLE_SALES: Sale[] = [
    { id: 'sale_1', date: '2024-06-15', finalBatchNumber: '2024-PRI', quantitySold: 2, buyerType: 'DIRECT', buyerName: 'Mme Durand', clientId: 'cli_1', paymentMethod: 'ESPECES', totalPrice: 15.00, productName: 'Miel de Printemps Crémeux', format: '500g' },
    { id: 'sale_2', date: '2024-09-10', finalBatchNumber: '2024-ETF', quantitySold: 10, buyerType: 'WHOLESALE', buyerName: 'Épicerie Du Coin', clientId: 'cli_2', paymentMethod: 'VIREMENT', totalPrice: 140.00, productName: 'Miel Toutes Fleurs', format: '1kg' }
];

const SAMPLE_EXPENSES: Expense[] = [
    { id: 'exp_1', date: '2024-01-10', store: 'Icko', description: 'Cire Gauffrée', category: 'MATERIEL', amount: 150.00 },
    { id: 'exp_2', date: '2024-03-05', store: 'Pharmacie', description: 'Acide Formique', category: 'SOIN', amount: 45.50 },
    { id: 'exp_3', date: '2024-05-15', store: 'Verrerie de l\'Ouest', description: 'Pots 500g + Couvercles', category: 'CONDITIONNEMENT', amount: 200.00 }
];

// --- ROBUST ID GENERATOR ---
export const generateId = (): string => {
  return 'id_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
};

// Generic helper with Default Value Support
const get = <T>(key: string, defaultVal: T): T => {
  const stored = localStorage.getItem(key);
  try {
    return stored ? JSON.parse(stored) : defaultVal;
  } catch (e) {
    console.error(`Error parsing key ${key}`, e);
    return defaultVal;
  }
};

const set = <T>(key: string, value: T): void => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e: any) {
    console.error("Storage Error", e);
    if (e.name === 'QuotaExceededError' || e.message?.includes('quota')) {
        throw e;
    }
  }
};

// Profile
export const getProfile = (): BeekeeperProfile => get(STORAGE_KEYS.PROFILE, SAMPLE_PROFILE);
export const saveProfile = (profile: BeekeeperProfile) => set(STORAGE_KEYS.PROFILE, profile);

// Honey Types (Configuration)
const DEFAULT_HONEY_TYPES = ['Toutes fleurs', 'Acacia', 'Châtaignier', 'Printemps', 'Été', 'Forêt', 'Lavande', 'Sapin'];
export const getHoneyTypes = (): string[] => get(STORAGE_KEYS.HONEY_TYPES, DEFAULT_HONEY_TYPES);
export const saveHoneyTypes = (types: string[]) => set(STORAGE_KEYS.HONEY_TYPES, types);

// Food Types (Configuration)
const DEFAULT_FOOD_TYPES = ['Sirop 50/50', 'Sirop 70/30', 'Sirop de stimulation', 'Candi', 'Candi Protéiné', 'Sucre'];
export const getFoodTypes = (): string[] => get(STORAGE_KEYS.FOOD_TYPES, DEFAULT_FOOD_TYPES);
export const saveFoodTypes = (types: string[]) => set(STORAGE_KEYS.FOOD_TYPES, types);

// Unit Costs Configuration
export const getCostConfig = (): UnitCostConfig => get(STORAGE_KEYS.COST_CONFIG, SAMPLE_COST_CONFIG);
export const saveCostConfig = (config: UnitCostConfig) => set(STORAGE_KEYS.COST_CONFIG, config);

// Apiaries
export const getApiaries = (): Apiary[] => get(STORAGE_KEYS.APIARIES, SAMPLE_APIARIES);
export const saveApiary = (apiary: Apiary) => {
  const list = getApiaries();
  const index = list.findIndex(a => a.id === apiary.id);
  if (index >= 0) list[index] = apiary;
  else list.push(apiary);
  set(STORAGE_KEYS.APIARIES, list);
};
export const deleteApiary = (id: string) => {
  const list = getApiaries().filter(a => a.id !== id);
  set(STORAGE_KEYS.APIARIES, list);
};

// Generic List Managers
const createListManager = <T extends { id: string }>(key: string, defaultList: T[] = []) => ({
  getAll: (): T[] => get(key, defaultList),
  add: (item: T) => {
    const list = get(key, defaultList) as T[];
    list.push(item);
    set(key, list);
  },
  update: (item: T) => {
    const list = get(key, defaultList) as T[];
    const index = list.findIndex(i => i.id === item.id);
    if (index !== -1) {
        list[index] = item;
        set(key, list);
    }
  },
  delete: (id: string) => {
    const list = (get(key, defaultList) as T[]).filter(i => i.id !== id);
    set(key, list);
  }
});

// Hives Manager
export const hives = createListManager<Hive>(STORAGE_KEYS.HIVES, SAMPLE_HIVES);

export const movements = createListManager<ColonyMovement>(STORAGE_KEYS.MOVEMENTS, SAMPLE_MOVEMENTS);
export const interventions = createListManager<SanitaryIntervention>(STORAGE_KEYS.INTERVENTIONS, SAMPLE_INTERVENTIONS);
export const feedings = createListManager<Feeding>(STORAGE_KEYS.FEEDINGS, SAMPLE_FEEDINGS);
export const harvests = createListManager<Harvest>(STORAGE_KEYS.HARVESTS, SAMPLE_HARVESTS);
export const packaging = createListManager<Packaging>(STORAGE_KEYS.PACKAGING, SAMPLE_PACKAGING);
export const sales = createListManager<Sale>(STORAGE_KEYS.SALES, SAMPLE_SALES);
export const products = createListManager<Product>(STORAGE_KEYS.PRODUCTS, SAMPLE_PRODUCTS);
export const expenses = createListManager<Expense>(STORAGE_KEYS.EXPENSES, SAMPLE_EXPENSES);
export const clients = createListManager<Client>(STORAGE_KEYS.CLIENTS, SAMPLE_CLIENTS);

// JSON Import/Export System
export interface FullBackup {
  version: string;
  timestamp: string;
  data: {
    profile: BeekeeperProfile;
    apiaries: Apiary[];
    hives: Hive[]; 
    movements: ColonyMovement[];
    interventions: SanitaryIntervention[];
    feedings: Feeding[];
    harvests: Harvest[];
    packaging: Packaging[];
    sales: Sale[];
    products: Product[];
    honeyTypes: string[];
    foodTypes?: string[]; // Added optional for compatibility
    expenses: Expense[];
    clients: Client[];
    costConfig: UnitCostConfig;
  }
}

export const exportAllData = (): string => {
  const backup: FullBackup = {
    version: '1.20',
    timestamp: new Date().toISOString(),
    data: {
      profile: getProfile(),
      apiaries: getApiaries(),
      hives: hives.getAll(),
      movements: movements.getAll(),
      interventions: interventions.getAll(),
      feedings: feedings.getAll(),
      harvests: harvests.getAll(),
      packaging: packaging.getAll(),
      sales: sales.getAll(),
      products: products.getAll(),
      honeyTypes: getHoneyTypes(),
      foodTypes: getFoodTypes(),
      expenses: expenses.getAll(),
      clients: clients.getAll(),
      costConfig: getCostConfig(),
    }
  };
  return JSON.stringify(backup, null, 2);
};

export const importAllData = (jsonString: string): boolean => {
  try {
    const backup: FullBackup = JSON.parse(jsonString);
    if (!backup || !backup.data) {
        console.error("Invalid backup file");
        return false;
    }

    // CRITICAL: Clear existing data before import
    Object.values(STORAGE_KEYS).forEach(key => localStorage.removeItem(key));

    if (backup.data.profile) saveProfile({ ...SAMPLE_PROFILE, ...backup.data.profile });
    
    if (Array.isArray(backup.data.apiaries)) set(STORAGE_KEYS.APIARIES, backup.data.apiaries);
    if (Array.isArray(backup.data.hives)) set(STORAGE_KEYS.HIVES, backup.data.hives);
    if (Array.isArray(backup.data.honeyTypes) && backup.data.honeyTypes.length > 0) set(STORAGE_KEYS.HONEY_TYPES, backup.data.honeyTypes);
    if (Array.isArray(backup.data.foodTypes) && backup.data.foodTypes.length > 0) set(STORAGE_KEYS.FOOD_TYPES, backup.data.foodTypes);
    
    if (Array.isArray(backup.data.movements)) set(STORAGE_KEYS.MOVEMENTS, backup.data.movements);
    if (Array.isArray(backup.data.interventions)) set(STORAGE_KEYS.INTERVENTIONS, backup.data.interventions);
    if (Array.isArray(backup.data.feedings)) set(STORAGE_KEYS.FEEDINGS, backup.data.feedings);
    
    if (Array.isArray(backup.data.harvests)) set(STORAGE_KEYS.HARVESTS, backup.data.harvests);
    if (Array.isArray(backup.data.packaging)) set(STORAGE_KEYS.PACKAGING, backup.data.packaging);
    if (Array.isArray(backup.data.sales)) set(STORAGE_KEYS.SALES, backup.data.sales);
    if (Array.isArray(backup.data.products)) set(STORAGE_KEYS.PRODUCTS, backup.data.products);
    
    if (Array.isArray(backup.data.expenses)) set(STORAGE_KEYS.EXPENSES, backup.data.expenses);
    if (Array.isArray(backup.data.clients)) set(STORAGE_KEYS.CLIENTS, backup.data.clients);
    
    if (backup.data.costConfig) {
        saveCostConfig(backup.data.costConfig);
    }
    
    return true;
  } catch (e) {
    console.error("Import failed", e);
    return false;
  }
};