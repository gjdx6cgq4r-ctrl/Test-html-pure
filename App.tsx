import React, { useState, useEffect } from 'react';
import { ViewState, BeekeeperProfile, Apiary, Hive, Product, Sale, Expense, UnitCostConfig } from './types';
import * as Storage from './services/storageService';
import * as PDFService from './services/pdfService';
import { BreedingRegister } from './components/BreedingRegister';
import { HoneyTraceability } from './components/HoneyTraceability';
import { Expenses } from './components/Expenses';
import { ClientManager } from './components/ClientManager';
import { 
  BookOpen, Droplets, LayoutDashboard, Settings, Bug, Upload, Download, FileText,
  MapPin, Plus, Trash2, List, Save, BookOpenText, Wallet, TrendingUp, TrendingDown, PackageCheck, AlertTriangle, X, Layers, Calendar, Users, ChevronDown, ChevronRight, ShoppingCart
} from 'lucide-react';

// --- CUSTOM ICONS ---
export const HiveIcon = ({ size = 24, className = "" }: { size?: number, className?: string }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    {/* Toit */}
    <rect x="3" y="3" width="18" height="4" rx="1" />
    {/* Corps */}
    <rect x="5" y="7" width="14" height="11" />
    {/* Entrée */}
    <path d="M9 14h6" />
    {/* Pieds */}
    <path d="M6 18v3" />
    <path d="M18 18v3" />
  </svg>
);

// --- ROBUST STRING NORMALIZER ---
const normalizeString = (str?: string) => {
    if (!str) return '';
    return str
        .toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "") 
        .replace(/\s+/g, '') 
        .trim();
};

// --- CONSTANTS ---
const LEGAL_STATUSES = ['Micro BA', 'Réel Simplifié', 'Particulier / Familial', 'Association', 'Société (EARL/GAEC)'];

// --- CUSTOM CHART COMPONENTS ---
const SimpleDonutChart = ({ data }: { data: { name: string; value: number; color: string }[] }) => {
    const total = data.reduce((sum, item) => sum + item.value, 0);
    if (total === 0) return <div className="h-40 flex items-center justify-center text-gray-400 text-xs">Pas de données</div>;

    let currentAngle = 0;
    const gradientParts = data.map(item => {
        const percentage = (item.value / total) * 100;
        const start = currentAngle;
        const end = currentAngle + percentage;
        currentAngle = end;
        return `${item.color} ${start}% ${end}%`;
    });
    
    const gradientString = `conic-gradient(${gradientParts.join(', ')})`;

    return (
        <div className="flex flex-col items-center justify-center">
            {/* Donut */}
            <div className="relative w-32 h-32 rounded-full mb-4 shadow-sm" style={{ background: gradientString }}>
                <div className="absolute inset-4 bg-white rounded-full flex items-center justify-center flex-col">
                    <span className="text-xs text-gray-400">Total</span>
                    <span className="font-bold text-gray-800">{total.toFixed(0)}€</span>
                </div>
            </div>
            {/* Legend */}
            <div className="w-full space-y-1">
                {data.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-xs items-center">
                        <div className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full" style={{ background: item.color }}></span>
                            <span className="text-gray-600">{item.name}</span>
                        </div>
                        <span className="font-bold">{item.value.toFixed(0)} €</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

const SimpleBarChart = ({ data }: { data: { name: string; value: number }[] }) => {
    const max = Math.max(...data.map(d => d.value), 1);
    
    if(data.length === 0) return <div className="h-40 flex items-center justify-center text-gray-400 text-xs">Pas de données</div>;

    return (
        <div className="space-y-3 w-full">
            {data.map((item, idx) => (
                <div key={idx} className="w-full">
                    <div className="flex justify-between text-xs mb-1">
                        <span className="font-medium text-gray-700">{item.name}</span>
                        <span className="font-bold text-honey-600">{item.value.toFixed(0)} €</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                        <div 
                            className="bg-honey-500 h-2.5 rounded-full" 
                            style={{ width: `${(item.value / max) * 100}%` }}
                        ></div>
                    </div>
                </div>
            ))}
        </div>
    );
};

// CUSTOM CONFIRM MODAL COMPONENT
const ConfirmModal = ({ isOpen, title, message, onConfirm, onCancel }: { isOpen: boolean, title: string, message: string, onConfirm: () => void, onCancel: () => void }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6 animate-in fade-in zoom-in duration-200">
                <div className="flex items-center gap-3 text-red-600 mb-4">
                    <AlertTriangle size={28} />
                    <h3 className="text-xl font-bold">{title}</h3>
                </div>
                <p className="text-gray-600 mb-6">{message}</p>
                <div className="flex gap-3 justify-end">
                    <button onClick={onCancel} className="px-4 py-2 text-gray-600 font-medium hover:bg-gray-100 rounded-lg">Annuler</button>
                    <button onClick={onConfirm} className="px-4 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 shadow-sm">Confirmer</button>
                </div>
            </div>
        </div>
    );
};

const App: React.FC = () => {
  const [view, setView] = useState<ViewState>('DASHBOARD');
  const [honeyTab, setHoneyTab] = useState<'HARVEST' | 'PACKAGING' | 'POS' | 'REVENUE' | 'PRODUCTS'>('HARVEST');
  
  const [profile, setProfile] = useState<BeekeeperProfile>({
    companyName: 'Le Rucher Du Vieux Juigné',
    napi: '', siret: '', address: '', status: 'Micro BA', creationDate: '', vetName: '', vetAddress: ''
  });
  const [apiaries, setApiaries] = useState<Apiary[]>([]);
  const [hives, setHives] = useState<Hive[]>([]);
  
  // ROBUST COST CONFIG INITIALIZATION
  const [costConfig, setCostConfig] = useState<UnitCostConfig>(() => {
    const fromStorage = Storage.getCostConfig();
    return fromStorage || {
        jar250: 0, jar500: 0, jar1kg: 0, lid: 0, label250: 0, label500: 0, label1kg: 0, feedingYearly: 0, treatmentYearly: 0
    };
  });
  
  // Custom Legal Status State
  const [isCustomStatus, setIsCustomStatus] = useState(false);

  // Dashboard Data State
  const [dashboardData, setDashboardData] = useState<{
      stockValue: number;
      totalSalesYear: number;
      totalExpensesYear: number;
      salesByType: {name: string, value: number}[];
      salesByPayment: {name: string, value: number, color: string}[];
      stockDetails: {name: string, quantity: number, value: number}[];
  }>({
      stockValue: 0,
      totalSalesYear: 0,
      totalExpensesYear: 0,
      salesByType: [],
      salesByPayment: [],
      stockDetails: []
  });

  // EXPORT DATES STATE (For PDF Reports)
  const currentYear = new Date().getFullYear();
  
  // Helper to get local date string YYYY-MM-DD to avoid UTC issues
  const getLocalDateStr = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [exportStartDate, setExportStartDate] = useState(`${currentYear}-01-01`);
  const [exportEndDate, setExportEndDate] = useState(getLocalDateStr());

  // CONFIRMATION MODAL STATE
  const [confirmModal, setConfirmModal] = useState<{isOpen: boolean, title: string, message: string, onConfirm: () => void} | null>(null);

  // Form states
  const [newApiary, setNewApiary] = useState({ name: '', location: '' });
  // Modified state for hive count to support empty placeholder
  const [newHive, setNewHive] = useState<{name: string, apiaryId: string, count: number | ''}>({ name: '', apiaryId: '', count: '' });

  // Accordion State for Hive Settings
  const [expandedApiaryId, setExpandedApiaryId] = useState<string | null>(null);

  const refreshAppData = () => {
    const loadedProfile = Storage.getProfile();
    setProfile(loadedProfile);
    
    // Check if the loaded status is a custom one
    if (loadedProfile && loadedProfile.status && !LEGAL_STATUSES.includes(loadedProfile.status)) {
        setIsCustomStatus(true);
    } else {
        setIsCustomStatus(false);
    }

    setApiaries(Storage.getApiaries());
    setHives(Storage.hives.getAll());
    
    // SAFE LOAD COST CONFIG
    const loadedCosts = Storage.getCostConfig();
    if(loadedCosts) setCostConfig(loadedCosts);

    // --- DASHBOARD CALCULATIONS ---
    const sales = Storage.sales.getAll();
    const expenses = Storage.expenses.getAll();
    const products = Storage.products.getAll();
    const packaging = Storage.packaging.getAll();

    // 1. Stock Value Calculation
    let totalStockVal = 0;
    const stockDet: {name: string, quantity: number, value: number}[] = [];

    products.forEach(prod => {
        if(prod.currentBatchId) {
            const batch = packaging.find(p => p.id === prod.currentBatchId);
            if(batch) {
                const initialQty = Number(batch.quantityPots) || 0;
                const soldQty = sales
                    .filter(s => {
                         const sBatch = normalizeString(s.finalBatchNumber);
                         const bBatch = normalizeString(batch.finalBatchNumber);
                         const sName = normalizeString(s.productName);
                         const pName = normalizeString(prod.name);
                         const sFormat = normalizeString(s.format);
                         const pFormat = normalizeString(prod.potSize);

                         if (sBatch && sBatch !== bBatch && !sBatch.includes('inconnu') && sBatch !== 'vrac') return false;

                         if (sBatch && bBatch && sBatch === bBatch) {
                             if (sFormat) return sFormat === pFormat;
                             if (s.quantitySold > 0 && s.totalPrice !== undefined && s.totalPrice > 0) {
                                 const unitPrice = s.totalPrice / s.quantitySold;
                                 if (Math.abs(unitPrice - prod.price) > 2.0) return false; 
                             }
                             return true; 
                         }
                         if (sName === pName) {
                             if (sFormat) return sFormat === pFormat;
                             return true; 
                         }
                         if (sName === (pName + pFormat)) return true;
                         return false;
                    })
                    .reduce((sum, s) => sum + (Number(s.quantitySold) || 0), 0);
                
                const remaining = Math.max(0, initialQty - soldQty);
                const value = remaining * prod.price;
                const batchYear = new Date(batch.date).getFullYear();
                
                if(remaining > 0.001) {
                    totalStockVal += value;
                    stockDet.push({ 
                        name: `${prod.name} ${prod.potSize} (${batchYear})`, 
                        quantity: remaining, 
                        value: value 
                    });
                }
            }
        }
    });

    // 2. Financials
    const currentYearSales = sales.filter(s => new Date(s.date).getFullYear() === currentYear);
    const currentYearExpenses = expenses.filter(e => new Date(e.date).getFullYear() === currentYear);
    const totalSales = currentYearSales.reduce((sum, s) => sum + (s.totalPrice || 0), 0);
    const totalExp = currentYearExpenses.reduce((sum, e) => sum + e.amount, 0);

    // 3. Charts Data
    const salesTypeMap = new Map<string, number>(); 
    const displayLabelMap = new Map<string, string>(); 

    currentYearSales.forEach(s => {
        let label = s.productName || 'Autre';
        let format = s.format;
        if (!format) {
            const matchingProduct = products.find(p => p.name === s.productName);
            if (matchingProduct && matchingProduct.potSize) format = matchingProduct.potSize;
            else {
                const matchingBatch = packaging.find(p => p.finalBatchNumber === s.finalBatchNumber);
                if(matchingBatch && matchingBatch.potSize) format = matchingBatch.potSize;
            }
        }
        if (format) label = `${label} ${format}`;
        const displayLabel = label.trim();
        const key = normalizeString(displayLabel);
        salesTypeMap.set(key, (salesTypeMap.get(key) || 0) + (s.totalPrice || 0));
        if (!displayLabelMap.has(key)) displayLabelMap.set(key, displayLabel);
    });

    const salesByTypeData = Array.from(salesTypeMap.entries()).map(([key, value]) => ({ 
        name: displayLabelMap.get(key) || key, 
        value 
    }));

    const paymentMap = new Map<string, number>();
    currentYearSales.forEach(s => {
        const key = s.paymentMethod || 'Autre';
        if (key === 'DON') return;
        paymentMap.set(key, (paymentMap.get(key) || 0) + (s.totalPrice || 0));
    });
    
    const paymentColors: {[key: string]: string} = {
        'ESPECES': '#22c55e', 'CB': '#3b82f6', 'CHEQUE': '#a855f7', 
        'VIREMENT': '#6366f1', 'DON': '#ec4899', 'AUTRE': '#9ca3af'
    };
    
    const salesByPaymentData = Array.from(paymentMap.entries()).map(([name, value]) => ({ 
        name, value, color: paymentColors[name] || '#9ca3af'
    }));

    setDashboardData({
        stockValue: totalStockVal,
        totalSalesYear: totalSales,
        totalExpensesYear: totalExp,
        salesByType: salesByTypeData,
        salesByPayment: salesByPaymentData,
        stockDetails: stockDet
    });
  };

  useEffect(() => { refreshAppData(); }, [view]);
  useEffect(() => { Storage.saveProfile(profile); }, [profile]);
  useEffect(() => { if(costConfig) Storage.saveCostConfig(costConfig); }, [costConfig]);

  const handleAddApiary = () => {
    if (!newApiary.name) return;
    Storage.saveApiary({ ...newApiary, id: Storage.generateId() });
    setNewApiary({ name: '', location: '' });
    refreshAppData();
  };

  const confirmDeleteApiary = (id: string) => {
      setConfirmModal({
          isOpen: true,
          title: "Supprimer le rucher ?",
          message: "ATTENTION : Supprimer ce rucher supprimera définitivement toutes les ruches qui s'y trouvent. Cette action est irréversible.",
          onConfirm: () => {
                Storage.deleteApiary(id);
                const hivesToRemove = hives.filter(h => h.apiaryId === id);
                hivesToRemove.forEach(h => Storage.hives.delete(h.id));
                setApiaries(prev => prev.filter(a => a.id !== id));
                setHives(prev => prev.filter(h => h.apiaryId !== id));
                setConfirmModal(null);
          }
      });
  };

  const handleAddHive = () => {
      if(!newHive.name || !newHive.apiaryId) return;
      const count = newHive.count === '' ? 1 : Math.max(1, newHive.count);
      const baseName = newHive.name.trim();
      const match = baseName.match(/^(.*?)(\d+)$/);

      let prefix = baseName;
      let startNum = 1;
      let padLength = 0;
      let isPattern = false;

      if (match) {
           prefix = match[1];
           const numStr = match[2];
           startNum = parseInt(numStr, 10);
           padLength = numStr.length;
           isPattern = true;
      } else if (count > 1) {
           prefix = baseName + " ";
           startNum = 1;
           isPattern = true;
      }

      for(let i = 0; i < count; i++) {
           let finalName = baseName;
           if (isPattern) {
               const currentNum = startNum + i;
               const numStr = padLength > 0 ? String(currentNum).padStart(padLength, '0') : String(currentNum);
               finalName = `${prefix}${numStr}`;
           }
           Storage.hives.add({
                id: Storage.generateId(),
                name: finalName,
                apiaryId: newHive.apiaryId
           });
      }
      setNewHive(prev => ({ ...prev, name: '', count: '' })); // Reset count to empty
      refreshAppData();
  };

  const confirmDeleteHive = (id: string) => {
      setConfirmModal({
          isOpen: true,
          title: "Supprimer la ruche ?",
          message: "Voulez-vous vraiment supprimer cette ruche de la liste ?",
          onConfirm: () => {
            Storage.hives.delete(id);
            setHives(prev => prev.filter(h => h.id !== id));
            setConfirmModal(null);
          }
      });
  };

  const handleExportJSON = () => {
    Storage.saveProfile(profile);
    const data = Storage.exportAllData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    
    // --- FEATURE: DATE & TIME IN EXPORT NAME ---
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    
    link.download = `apigest_backup_${year}-${month}-${day}_${hours}h${minutes}.json`;
    // ------------------------------------------
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportJSON = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setConfirmModal({
        isOpen: true,
        title: "Restaurer une sauvegarde ?",
        message: "ATTENTION : Toutes les données actuelles seront REMPLACÉES par celles de la sauvegarde. Cette action est irréversible.",
        onConfirm: () => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const content = e.target?.result as string;
                if (content) {
                    const success = Storage.importAllData(content);
                    if (success) {
                        alert("Sauvegarde restaurée avec succès ! La page va se recharger.");
                        window.location.reload();
                    } else {
                        alert("Erreur: Le fichier de sauvegarde est invalide ou corrompu.");
                    }
                }
            };
            reader.readAsText(file);
            setConfirmModal(null);
        }
    });
    event.target.value = '';
  };

  const NavItem = ({ id, label, icon: Icon }: { id: ViewState, label: string, icon: any }) => (
    <button
      onClick={() => { setView(id); if(id === 'HONEY') setHoneyTab('HARVEST'); }}
      className={`flex flex-col items-center justify-center p-2 rounded-full w-full md:w-auto md:flex-row md:justify-start md:px-4 md:py-3 transition-all ${
        view === id 
          ? 'text-honey-600 bg-honey-50 font-bold' 
          : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
      }`}
    >
      <Icon size={24} className="mb-1 md:mb-0 md:mr-3" />
      <span className="text-xs md:text-base">{label}</span>
    </button>
  );

  return (
    <div className="min-h-screen flex flex-col md:flex-row relative">
      {/* GLOBAL CONFIRM MODAL */}
      {confirmModal && confirmModal.isOpen && (
          <ConfirmModal 
            isOpen={confirmModal.isOpen} 
            title={confirmModal.title} 
            message={confirmModal.message} 
            onConfirm={confirmModal.onConfirm} 
            onCancel={() => setConfirmModal(null)} 
          />
      )}

      {/* RESTORED NAVIGATION (BOTTOM MOBILE / SIDE DESKTOP) */}
      <nav className="fixed bottom-0 left-0 w-full bg-white border-t border-gray-200 z-50 md:relative md:w-64 md:h-screen md:border-t-0 md:border-r md:flex md:flex-col p-2 shadow-lg md:shadow-none safe-area-bottom">
        <div className="hidden md:flex items-center gap-3 px-4 py-6 border-b mb-4">
          <div className="w-10 h-10 bg-honey-500 rounded-full flex items-center justify-center text-white font-bold">AG</div>
          <div>
            <h1 className="font-bold text-gray-900">ApiGest</h1>
            <p className="text-xs text-gray-500">V1.19</p>
          </div>
        </div>
        
        <div className="flex justify-around md:flex-col md:gap-2">
          <NavItem id="DASHBOARD" label="Accueil" icon={LayoutDashboard} />
          <NavItem id="BREEDING" label="Élevage" icon={HiveIcon} />
          <NavItem id="HONEY" label="Miellerie" icon={Droplets} />
          <NavItem id="EXPENSES" label="Dépenses" icon={Wallet} />
          <NavItem id="CLIENTS" label="Clients" icon={Users} />
          <NavItem id="SETTINGS" label="Réglages" icon={Settings} />
        </div>

        <div className="hidden md:block mt-auto p-4 text-xs text-gray-400 text-center">
            &copy; 2025 ApiGest V1.19
        </div>
      </nav>

      {/* MAIN CONTENT */}
      <main className="flex-1 pb-48 md:pb-8 p-4 md:p-8 overflow-y-auto h-screen bg-gray-50">
        <div className="max-w-5xl mx-auto">
          
          {view === 'DASHBOARD' && (
            <div className="space-y-6">
              <header className="mb-6 flex flex-row justify-between items-center gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-gray-800">
                        {profile.companyName || "Mon Exploitation"}
                    </h1>
                    <p className="text-gray-600 mt-1">Tableau de bord financier & stock</p>
                </div>
                
                {/* RESTORED HONEYCOMB SHOPPING BUTTON */}
                <button 
                    onClick={() => {
                        setHoneyTab('POS');
                        setView('HONEY');
                    }}
                    className="relative group w-12 h-12 flex items-center justify-center transition-transform hover:scale-105 flex-shrink-0"
                    title="Accéder à la caisse"
                >
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full text-honey-500 group-hover:text-honey-600 drop-shadow-md">
                        <path d="M12 2l9 5.2v10.4l-9 5.2-9-5.2V7.2L12 2z" />
                    </svg>
                    <ShoppingCart size={20} className="absolute text-white" />
                </button>
              </header>

              {/* DASHBOARD WIDGETS */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                 <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm font-medium text-gray-500 uppercase">Recettes {currentYear}</p>
                            <h3 className="text-3xl font-bold text-green-600 mt-1">+{dashboardData.totalSalesYear.toFixed(0)} €</h3>
                        </div>
                        <div className="p-2 bg-green-50 rounded-lg text-green-600"><TrendingUp /></div>
                    </div>
                 </div>

                 <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm font-medium text-gray-500 uppercase">Dépenses {currentYear}</p>
                            <h3 className="text-3xl font-bold text-red-600 mt-1">-{dashboardData.totalExpensesYear.toFixed(0)} €</h3>
                        </div>
                        <div className="p-2 bg-red-50 rounded-lg text-red-600"><TrendingDown /></div>
                    </div>
                 </div>

                 <div className="bg-gradient-to-br from-honey-500 to-honey-600 text-white p-6 rounded-xl shadow-md flex flex-col justify-between">
                    <div>
                        <p className="text-sm font-medium text-honey-100 uppercase">Résultat {currentYear}</p>
                        <h3 className="text-3xl font-bold mt-1">
                            {(dashboardData.totalSalesYear - dashboardData.totalExpensesYear) > 0 ? '+' : ''}
                            {(dashboardData.totalSalesYear - dashboardData.totalExpensesYear).toFixed(0)} €
                        </h3>
                    </div>
                    <div className="mt-2 text-xs text-honey-100">
                        {(dashboardData.totalExpensesYear - dashboardData.totalSalesYear) > 0 ? (
                            <>
                                <span className="font-bold">Reste à couvrir (Objectif) : {(dashboardData.totalExpensesYear - dashboardData.totalSalesYear).toFixed(0)} €</span>
                                <br/>
                                <span className="opacity-75">Sur un total de {dashboardData.totalExpensesYear.toFixed(0)} € de dépenses</span>
                            </>
                        ) : (
                            <>
                                <span className="font-bold">Objectif Rentabilité Atteint !</span>
                                <br/>
                                <span className="opacity-75">Toutes les dépenses sont couvertes.</span>
                            </>
                        )}
                    </div>
                 </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                      <div className="flex justify-between items-center mb-6">
                        <h3 className="font-bold text-gray-800 flex items-center gap-2"><PackageCheck size={20}/> Stock Restant</h3>
                        <span className="bg-blue-100 text-blue-800 font-bold px-3 py-1 rounded-lg">{dashboardData.stockValue.toFixed(0)} €</span>
                      </div>
                      
                      <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
                          {dashboardData.stockDetails.length === 0 && <p className="text-sm text-gray-400 italic">Aucun stock en rayon (lots terminés ou non créés).</p>}
                          {dashboardData.stockDetails.map((item, idx) => (
                              <div key={idx} className="flex justify-between items-center text-sm border-b border-gray-50 pb-2">
                                  <span className="font-medium text-gray-700">{item.name}</span>
                                  <div className="text-right">
                                      <div className="font-bold text-gray-900">{item.quantity} pots</div>
                                      <div className="text-xs text-gray-500">Val: {item.value.toFixed(0)} €</div>
                                  </div>
                              </div>
                          ))}
                      </div>
                  </div>

                  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center">
                       <h3 className="font-bold text-gray-800 mb-6 self-start w-full">Moyens de Paiement</h3>
                       <div className="w-full">
                           <SimpleDonutChart data={dashboardData.salesByPayment} />
                       </div>
                  </div>

                  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 lg:col-span-2">
                      <h3 className="font-bold text-gray-800 mb-4">Ventes par Type de Miel</h3>
                      <div className="w-full">
                          <SimpleBarChart data={dashboardData.salesByType} />
                      </div>
                  </div>
              </div>

            </div>
          )}

          {view === 'BREEDING' && <BreedingRegister />}
          {view === 'HONEY' && <HoneyTraceability initialTab={honeyTab} />}
          {view === 'EXPENSES' && <Expenses />}
          {view === 'CLIENTS' && <ClientManager />}
          {/* ASSISTANT REMOVED */}

          {view === 'SETTINGS' && (
             <div className="space-y-6">
                {/* 1. Identity */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                            <Settings /> Paramètres de l'exploitation
                        </h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Nom de l'entreprise</label>
                        <input 
                            type="text" 
                            value={profile.companyName} 
                            onChange={e => setProfile({...profile, companyName: e.target.value})}
                            className="w-full border p-2 rounded-lg font-bold text-honey-800"
                            placeholder="Le Rucher Du Vieux Juigné"
                        />
                        </div>
                        
                        <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Adresse Siège Social</label>
                        <input 
                            type="text" 
                            value={profile.address} 
                            onChange={e => setProfile({...profile, address: e.target.value})}
                            className="w-full border p-2 rounded-lg"
                            placeholder="123 Route des Abeilles, 49000 Angers"
                        />
                        </div>

                        <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">N° NAPI</label>
                        <input 
                            type="text" 
                            value={profile.napi} 
                            onChange={e => setProfile({...profile, napi: e.target.value})}
                            className="w-full border p-2 rounded-lg"
                        />
                        </div>
                        <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">N° SIRET</label>
                        <input 
                            type="text" 
                            value={profile.siret} 
                            onChange={e => setProfile({...profile, siret: e.target.value})}
                            className="w-full border p-2 rounded-lg"
                        />
                        </div>

                        <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Statut Juridique</label>
                        {!isCustomStatus ? (
                            <select 
                                value={LEGAL_STATUSES.includes(profile.status) ? profile.status : ''} 
                                onChange={e => {
                                    if(e.target.value === 'CUSTOM') {
                                        setIsCustomStatus(true);
                                        setProfile({...profile, status: ''});
                                    } else {
                                        setProfile({...profile, status: e.target.value});
                                    }
                                }}
                                className="w-full border p-2 rounded-lg bg-white"
                            >
                                <option value="">Choisir...</option>
                                {LEGAL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                                <option value="CUSTOM" className="text-blue-600 font-bold">+ Autre / Personnalisé...</option>
                            </select>
                        ) : (
                            <div className="flex gap-2">
                                <input 
                                    type="text" 
                                    value={profile.status} 
                                    onChange={e => setProfile({...profile, status: e.target.value})}
                                    className="w-full border p-2 rounded-lg"
                                    placeholder="Ex: SAS, SNC..."
                                    autoFocus
                                />
                                <button 
                                    onClick={() => { setIsCustomStatus(false); setProfile({...profile, status: 'Micro BA'}); }}
                                    className="px-3 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg flex items-center justify-center border"
                                    title="Revenir à la liste"
                                >
                                    <List size={20}/>
                                </button>
                            </div>
                        )}
                        </div>
                        <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Date création</label>
                        <input 
                            type="date" 
                            value={profile.creationDate} 
                            onChange={e => setProfile({...profile, creationDate: e.target.value})}
                            className="w-full border px-3 h-11 rounded-lg bg-white appearance-none"
                        />
                        </div>

                        <div className="md:col-span-2 border-t pt-4 mt-2">
                        <h3 className="font-semibold text-gray-800 mb-3">Vétérinaire sanitaire / PSE</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
                                <input 
                                type="text" 
                                value={profile.vetName} 
                                onChange={e => setProfile({...profile, vetName: e.target.value})}
                                className="w-full border p-2 rounded-lg"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Adresse / Coordonnées</label>
                                <input 
                                type="text" 
                                value={profile.vetAddress} 
                                onChange={e => setProfile({...profile, vetAddress: e.target.value})}
                                className="w-full border p-2 rounded-lg"
                                />
                            </div>
                        </div>
                        </div>
                    </div>
                </div>

                {/* 3. Cost Configuration */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <Wallet /> Coûts de Production (Unitaires)
                    </h2>
                    <p className="text-sm text-gray-500 mb-4">
                        Définissez ici vos coûts d'achat pour calculer automatiquement la rentabilité lors de la mise en pot.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Pots */}
                        <div className="bg-gray-50 p-4 rounded-lg">
                            <h4 className="font-bold text-gray-700 mb-3 border-b pb-1">Prix des Pots (vide)</h4>
                            <div className="space-y-2">
                                <div>
                                    <label className="text-xs text-gray-500">Pot 250g (€)</label>
                                    <input type="number" step="0.01" className="w-full border p-2 rounded" value={costConfig?.jar250 || ''} placeholder="0" onChange={e => setCostConfig({...costConfig!, jar250: parseFloat(e.target.value) || 0})} />
                                </div>
                                <div>
                                    <label className="text-xs text-gray-500">Pot 500g (€)</label>
                                    <input type="number" step="0.01" className="w-full border p-2 rounded" value={costConfig?.jar500 || ''} placeholder="0" onChange={e => setCostConfig({...costConfig!, jar500: parseFloat(e.target.value) || 0})} />
                                </div>
                                <div>
                                    <label className="text-xs text-gray-500">Pot 1kg (€)</label>
                                    <input type="number" step="0.01" className="w-full border p-2 rounded" value={costConfig?.jar1kg || ''} placeholder="0" onChange={e => setCostConfig({...costConfig!, jar1kg: parseFloat(e.target.value) || 0})} />
                                </div>
                            </div>
                        </div>

                        {/* Étiquettes & Couvercles */}
                        <div className="bg-gray-50 p-4 rounded-lg">
                            <h4 className="font-bold text-gray-700 mb-3 border-b pb-1">Étiquettes & Couvercles</h4>
                            <div className="space-y-2">
                                <div>
                                    <label className="text-xs text-gray-500">Couvercle (Unique) (€)</label>
                                    <input type="number" step="0.01" className="w-full border p-2 rounded" value={costConfig?.lid || ''} placeholder="0" onChange={e => setCostConfig({...costConfig!, lid: parseFloat(e.target.value) || 0})} />
                                </div>
                                <div>
                                    <label className="text-xs text-gray-500">Étiquette 250g (€)</label>
                                    <input type="number" step="0.01" className="w-full border p-2 rounded" value={costConfig?.label250 || ''} placeholder="0" onChange={e => setCostConfig({...costConfig!, label250: parseFloat(e.target.value) || 0})} />
                                </div>
                                <div>
                                    <label className="text-xs text-gray-500">Étiquette 500g (€)</label>
                                    <input type="number" step="0.01" className="w-full border p-2 rounded" value={costConfig?.label500 || ''} placeholder="0" onChange={e => setCostConfig({...costConfig!, label500: parseFloat(e.target.value) || 0})} />
                                </div>
                                <div>
                                    <label className="text-xs text-gray-500">Étiquette 1kg (€)</label>
                                    <input type="number" step="0.01" className="w-full border p-2 rounded" value={costConfig?.label1kg || ''} placeholder="0" onChange={e => setCostConfig({...costConfig!, label1kg: parseFloat(e.target.value) || 0})} />
                                </div>
                            </div>
                        </div>

                        {/* Charges Annuelles Globales */}
                        <div className="bg-gray-50 p-4 rounded-lg">
                            <h4 className="font-bold text-gray-700 mb-3 border-b pb-1">Charges Annuelles Globales</h4>
                            <div className="space-y-2">
                                <div>
                                    <label className="text-xs text-gray-500">Total Nourrissement / An (€)</label>
                                    <input 
                                        type="number" 
                                        step="0.01" 
                                        className="w-full border p-2 rounded font-mono text-amber-700 font-bold" 
                                        value={costConfig?.feedingYearly || ''} 
                                        onChange={e => setCostConfig({...costConfig!, feedingYearly: parseFloat(e.target.value) || 0})} 
                                        placeholder="Ex: 450 (Total factures)"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-gray-500">Total Traitements / An (€)</label>
                                    <input 
                                        type="number" 
                                        step="0.01" 
                                        className="w-full border p-2 rounded font-mono text-red-700 font-bold" 
                                        value={costConfig?.treatmentYearly || ''} 
                                        onChange={e => setCostConfig({...costConfig!, treatmentYearly: parseFloat(e.target.value) || 0})} 
                                        placeholder="Ex: 120 (Total factures)"
                                    />
                                </div>
                            </div>
                            <div className="mt-3 text-xs text-blue-600 bg-blue-50 p-2 rounded border border-blue-100">
                                <p className="font-bold mb-1">ℹ️ Comment ça marche ?</p>
                                Ces montants seront divisés par la totalité de votre récolte de l'année (Vrac) pour ajouter un coût "soin & nourriture" à chaque pot.
                            </div>
                        </div>
                    </div>
                </div>
                
                {/* 2. Apiary Management */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <MapPin /> Gestion des Ruchers
                    </h2>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-4">
                        <input
                            type="text"
                            placeholder="Nom (ex: Forêt Nord)"
                            className="border p-2 rounded-lg"
                            value={newApiary.name}
                            onChange={e => setNewApiary({ ...newApiary, name: e.target.value })}
                        />
                        <input
                            type="text"
                            placeholder="Emplacement / Ville"
                            className="border p-2 rounded-lg"
                            value={newApiary.location}
                            onChange={e => setNewApiary({ ...newApiary, location: e.target.value })}
                        />
                        <button 
                            onClick={handleAddApiary}
                            className="bg-honey-500 hover:bg-honey-600 text-white p-2 rounded-lg flex justify-center items-center gap-2 font-semibold"
                        >
                            <Plus size={18} /> Ajouter
                        </button>
                    </div>

                    <div className="space-y-2 max-h-60 overflow-y-auto mb-6">
                        {apiaries.length === 0 && <p className="text-gray-400 italic text-sm">Aucun rucher enregistré.</p>}
                        {apiaries.map(apiary => (
                            <div key={apiary.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border border-gray-100">
                                <div>
                                    <h3 className="font-bold text-sm text-gray-800">{apiary.name}</h3>
                                    <p className="text-gray-500 text-xs">{apiary.location}</p>
                                </div>
                                <button 
                                    type="button"
                                    onClick={() => confirmDeleteApiary(apiary.id)} 
                                    className="text-red-400 hover:text-red-600 p-2 rounded hover:bg-red-50 transition"
                                    title="Supprimer ce rucher"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        ))}
                    </div>

                    {/* HIVE MANAGEMENT (ACCORDION STYLE) */}
                    <div className="border-t pt-4">
                        <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                            <HiveIcon size={20} className="text-gray-800"/> Gestion des Ruches
                        </h3>
                        <p className="text-sm text-gray-500 mb-2">Ajoutez des ruches individuellement ou en série.</p>
                        
                        {/* Creation Form */}
                        <div className="flex flex-col gap-2 mb-4 p-4 bg-honey-50 rounded-xl border border-honey-100">
                             <div className="flex flex-col md:flex-row gap-2">
                                <select 
                                    className="border p-2 rounded-lg flex-1 bg-white"
                                    value={newHive.apiaryId}
                                    onChange={e => setNewHive({...newHive, apiaryId: e.target.value})}
                                >
                                    <option value="">Choisir un rucher...</option>
                                    {apiaries.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                                </select>
                                <input 
                                    type="text"
                                    className="border p-2 rounded-lg flex-1"
                                    placeholder="Nom de départ (ex: Ruche 01)"
                                    value={newHive.name}
                                    onChange={e => setNewHive({...newHive, name: e.target.value})}
                                />
                             </div>
                             
                             <div className="flex items-center gap-2">
                                 <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border flex-shrink-0">
                                     <Layers size={16} className="text-gray-500"/>
                                     <span className="text-sm font-medium text-gray-600">Quantité :</span>
                                     <input 
                                        type="number" 
                                        min="1" 
                                        max="100"
                                        className="w-16 border border-gray-300 rounded-lg focus:outline-none focus:border-honey-500 text-center font-bold"
                                        value={newHive.count}
                                        placeholder="1"
                                        onChange={e => {
                                            const val = parseInt(e.target.value);
                                            setNewHive({...newHive, count: isNaN(val) ? '' : val})
                                        }}
                                     />
                                 </div>
                                 <button onClick={handleAddHive} className="bg-honey-500 hover:bg-honey-600 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 font-bold flex-grow shadow-sm transition">
                                    <Plus size={18}/> {(newHive.count === '' || newHive.count === 1) ? 'Créer' : `Créer ${newHive.count} ruches`}
                                </button>
                             </div>
                             {newHive.count !== '' && newHive.count > 1 && (
                                 <p className="text-xs text-honey-700 italic">
                                     Astuce : Si le nom finit par un nombre (ex: "Ruche 01"), la numérotation suivra automatiquement (02, 03...).
                                 </p>
                             )}
                        </div>

                        {/* Hive List - Accordion Per Apiary */}
                        <div className="space-y-2">
                            {apiaries.map(apiary => {
                                const apiaryHives = hives.filter(h => h.apiaryId === apiary.id);
                                const isExpanded = expandedApiaryId === apiary.id;
                                
                                return (
                                    <div key={apiary.id} className="border rounded-lg bg-gray-50 overflow-hidden">
                                        <button 
                                            onClick={() => setExpandedApiaryId(isExpanded ? null : apiary.id)}
                                            className="w-full flex justify-between items-center p-3 hover:bg-gray-100 transition"
                                        >
                                            <div className="font-bold text-gray-700 flex items-center gap-2">
                                                {isExpanded ? <ChevronDown size={18}/> : <ChevronRight size={18}/>}
                                                {apiary.name}
                                            </div>
                                            <span className="text-xs bg-white border px-2 py-1 rounded text-gray-500">
                                                {apiaryHives.length} ruches
                                            </span>
                                        </button>
                                        
                                        {isExpanded && (
                                            <div className="bg-white border-t p-2 space-y-1">
                                                {apiaryHives.length === 0 && <div className="text-xs text-gray-400 italic p-2">Aucune ruche.</div>}
                                                {apiaryHives.map(hive => (
                                                    <div key={hive.id} className="flex justify-between items-center p-2 hover:bg-gray-50 rounded">
                                                        <div className="flex items-center gap-2 text-sm text-gray-700">
                                                            <HiveIcon size={16} className="text-honey-500"/>
                                                            {hive.name}
                                                        </div>
                                                        <button 
                                                            onClick={() => confirmDeleteHive(hive.id)}
                                                            className="text-gray-300 hover:text-red-500"
                                                        >
                                                            <Trash2 size={16}/>
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* 4. Data Management (Import/Export) */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <Save /> Données & Sauvegardes
                    </h2>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* JSON Backup */}
                        <div className="space-y-3">
                            <h3 className="font-bold text-gray-700 border-b pb-2">Sauvegarde Complète (JSON)</h3>
                            <p className="text-xs text-gray-500">
                                Exportez toutes vos données pour les mettre en sécurité ou les transférer sur un autre appareil.
                            </p>
                            <div className="flex gap-2">
                                <button onClick={handleExportJSON} className="flex items-center gap-2 bg-blue-100 text-blue-800 px-4 py-2 rounded-lg hover:bg-blue-200 transition font-medium text-sm">
                                    <Download size={16}/> Exporter Sauvegarde
                                </button>
                                <label className="flex items-center gap-2 bg-gray-100 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-200 transition font-medium text-sm cursor-pointer">
                                    <Upload size={16}/> Restaurer
                                    <input type="file" accept=".json" onChange={handleImportJSON} className="hidden" />
                                </label>
                            </div>
                        </div>

                        {/* PDF Reports */}
                        <div className="space-y-3">
                             <h3 className="font-bold text-gray-700 border-b pb-2">Rapports PDF (Officiels)</h3>
                             <div className="flex items-center gap-2 mb-2">
                                 <input type="date" value={exportStartDate} onChange={e => setExportStartDate(e.target.value)} className="border p-1 rounded text-xs" />
                                 <span className="text-gray-400">-</span>
                                 <input type="date" value={exportEndDate} onChange={e => setExportEndDate(e.target.value)} className="border p-1 rounded text-xs" />
                             </div>
                             <div className="flex flex-wrap gap-2">
                                 <button onClick={() => PDFService.generateBreedingRegisterPDF(exportStartDate, exportEndDate)} className="flex-1 justify-center flex items-center gap-1 bg-red-50 text-red-700 border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-100 text-xs font-bold">
                                     <FileText size={14}/> Registre Élevage
                                 </button>
                                 <button onClick={() => PDFService.generateHoneyTraceabilityPDF(exportStartDate, exportEndDate)} className="flex-1 justify-center flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-200 px-3 py-1.5 rounded-lg hover:bg-amber-100 text-xs font-bold">
                                     <FileText size={14}/> Cahier Miellerie
                                 </button>
                                 <button onClick={() => PDFService.generateSalesPDF(exportStartDate, exportEndDate)} className="flex-1 justify-center flex items-center gap-1 bg-green-50 text-green-700 border border-green-200 px-3 py-1.5 rounded-lg hover:bg-green-100 text-xs font-bold">
                                     <FileText size={14}/> Livre Recettes
                                 </button>
                             </div>
                        </div>
                    </div>
                </div>
             </div>
          )}

        </div>
      </main>
    </div>
  );
};

export default App;