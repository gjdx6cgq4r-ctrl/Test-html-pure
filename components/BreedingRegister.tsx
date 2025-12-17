import React, { useState, useEffect } from 'react';
import { 
  Apiary, Hive, ColonyMovement, SanitaryIntervention, Feeding, MovementType 
} from '../types';
import * as Storage from '../services/storageService';
import { Trash2, MapPin, Syringe, Truck, Utensils, Bug, ChevronDown, ChevronRight, Save, Edit2, X, Check, List, Tag, FileText, MoreHorizontal, Clock, Square, CheckSquare } from 'lucide-react';

// --- CUSTOM HIVE ICON (DUPLICATED FOR ISOLATION) ---
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

const TREATMENT_OPTIONS = [
  "Apivar",
  "Apitraz",
  "Apistan",
  "Bayvarol",
  "Apiguard",
  "Thymovar",
  "Apilife Var",
  "MAQS",
  "Formic Pro",
  "Varromed",
  "Oxybee",
  "Apibioxal",
  "Acide Oxalique (Sublimation)",
  "Acide Oxalique (Dégouttement)",
  "Acide Formique",
  "Polyvar"
];

export const BreedingRegister: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'APIARY' | 'MOVEMENTS' | 'SANITARY' | 'FEEDING'>('APIARY');
  const [apiaries, setApiaries] = useState<Apiary[]>([]);
  const [hives, setHives] = useState<Hive[]>([]);
  const [movements, setMovements] = useState<ColonyMovement[]>([]);
  const [interventions, setInterventions] = useState<SanitaryIntervention[]>([]);
  const [feedings, setFeedings] = useState<Feeding[]>([]);
  
  // Custom Lists States
  const [foodTypes, setFoodTypes] = useState<string[]>([]);

  // Accordion State
  const [expandedApiaryId, setExpandedApiaryId] = useState<string | null>(null);
  const [expandedInterventionId, setExpandedInterventionId] = useState<string | null>(null);
  const [expandedFeedingId, setExpandedFeedingId] = useState<string | null>(null);

  // Edit States
  const [editingFeedingId, setEditingFeedingId] = useState<string | null>(null);

  // MODAL EDIT STATE (Sanitary)
  const [editInterventionData, setEditInterventionData] = useState<SanitaryIntervention | null>(null);
  const [isCustomTreatmentEdit, setIsCustomTreatmentEdit] = useState(false);

  // Custom Input Mode State (Create Form)
  const [isCustomTreatment, setIsCustomTreatment] = useState(false);
  const [isCustomFoodType, setIsCustomFoodType] = useState(false);
  
  // Hive Selection UI State
  const [showHiveSelector, setShowHiveSelector] = useState(false);

  // Form States
  const [newIntervention, setNewIntervention] = useState<Partial<SanitaryIntervention>>({
    date: new Date().toISOString().split('T')[0],
    drugName: '',
    batchNumber: '',
    quantity: '',
    posology: '',
    apiaryId: '',
    hiveIds: []
  });
  
  const [newMovement, setNewMovement] = useState<Partial<ColonyMovement>>({
    date: new Date().toISOString().split('T')[0],
    type: MovementType.TRANSHUMANCE,
    description: '',
    originApiaryId: '',
    destinationApiaryId: '',
    quantity: 0
  });

  const [newFeeding, setNewFeeding] = useState<Partial<Feeding>>({
    date: new Date().toISOString().split('T')[0],
    foodType: '',
    quantity: '',
    apiaryId: '',
    hiveIds: []
  });

  const refreshData = () => {
    setApiaries(Storage.getApiaries());
    setHives(Storage.hives.getAll());
    setMovements(Storage.movements.getAll());
    setInterventions(Storage.interventions.getAll());
    setFeedings(Storage.feedings.getAll());
    setFoodTypes(Storage.getFoodTypes());
  };

  useEffect(() => {
    refreshData();
  }, []);

  // --- MULTI-SELECT HIVE LOGIC ---
  const toggleHiveSelection = (hiveId: string, type: 'SANITARY' | 'FEEDING') => {
      if (type === 'SANITARY') {
          setNewIntervention(prev => {
              const currentIds = prev.hiveIds || [];
              if (currentIds.includes(hiveId)) {
                  return { ...prev, hiveIds: currentIds.filter(id => id !== hiveId) };
              } else {
                  return { ...prev, hiveIds: [...currentIds, hiveId] };
              }
          });
      } else {
          setNewFeeding(prev => {
              const currentIds = prev.hiveIds || [];
              if (currentIds.includes(hiveId)) {
                  return { ...prev, hiveIds: currentIds.filter(id => id !== hiveId) };
              } else {
                  return { ...prev, hiveIds: [...currentIds, hiveId] };
              }
          });
      }
  };

  const selectAllHives = (apiaryId: string, type: 'SANITARY' | 'FEEDING') => {
      const allHives = getHivesForApiary(apiaryId).map(h => h.id);
      if (type === 'SANITARY') {
          setNewIntervention(prev => ({ ...prev, hiveIds: allHives }));
      } else {
          setNewFeeding(prev => ({ ...prev, hiveIds: allHives }));
      }
  };

  const deselectAllHives = (type: 'SANITARY' | 'FEEDING') => {
      if (type === 'SANITARY') {
          setNewIntervention(prev => ({ ...prev, hiveIds: [] }));
      } else {
          setNewFeeding(prev => ({ ...prev, hiveIds: [] }));
      }
  };

  // --- SANITARY LOGIC ---
  const handleSaveIntervention = () => {
    if (!newIntervention.drugName || !newIntervention.batchNumber) return;
    
    Storage.interventions.add({
        ...newIntervention as SanitaryIntervention,
        id: Storage.generateId()
    });

    setNewIntervention({
        date: new Date().toISOString().split('T')[0],
        drugName: '',
        batchNumber: '',
        quantity: '',
        posology: '',
        apiaryId: '',
        hiveIds: []
    });
    setIsCustomTreatment(false);
    refreshData();
  };

  const handleOpenEditModal = (item: SanitaryIntervention) => {
      setEditInterventionData({ ...item });
      if (item.drugName && !TREATMENT_OPTIONS.includes(item.drugName)) {
          setIsCustomTreatmentEdit(true);
      } else {
          setIsCustomTreatmentEdit(false);
      }
  };

  const handleSaveEditModal = () => {
      if (!editInterventionData || !editInterventionData.drugName || !editInterventionData.batchNumber) return;
      Storage.interventions.update(editInterventionData);
      setEditInterventionData(null);
      refreshData();
  };

  // --- MOVEMENT LOGIC ---
  const handleAddMovement = () => {
      if (!newMovement.type || !newMovement.description) return;
      Storage.movements.add({
          ...newMovement as ColonyMovement,
          id: Storage.generateId()
      });
      setNewMovement({
        date: new Date().toISOString().split('T')[0],
        type: MovementType.TRANSHUMANCE,
        description: '',
        originApiaryId: '',
        destinationApiaryId: '',
        quantity: 0
      });
      refreshData();
  }

  // --- FEEDING LOGIC ---
  const handleSaveFeeding = () => {
      if(!newFeeding.foodType || !newFeeding.quantity) return;

      if (isCustomFoodType && newFeeding.foodType && !foodTypes.includes(newFeeding.foodType)) {
          Storage.saveFoodTypes([...foodTypes, newFeeding.foodType]);
      }

      if (editingFeedingId) {
          Storage.feedings.update({
              ...newFeeding as Feeding,
              id: editingFeedingId
          });
          setEditingFeedingId(null);
      } else {
          Storage.feedings.add({
            ...newFeeding as Feeding,
            id: Storage.generateId()
        });
      }
      
      setNewFeeding({
        date: new Date().toISOString().split('T')[0],
        foodType: '',
        quantity: '',
        apiaryId: '',
        hiveIds: []
      });
      setIsCustomFoodType(false);
      refreshData();
  }

  const handleEditFeeding = (item: Feeding) => {
      setEditingFeedingId(item.id);
      setNewFeeding({ ...item });
      if (item.foodType && !foodTypes.includes(item.foodType)) {
          setIsCustomFoodType(true);
      } else {
          setIsCustomFoodType(false);
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelFeedingEdit = () => {
      setEditingFeedingId(null);
      setNewFeeding({
        date: new Date().toISOString().split('T')[0],
        foodType: '',
        quantity: '',
        apiaryId: '',
        hiveIds: []
      });
      setIsCustomFoodType(false);
  };

  const getApiaryName = (id?: string) => apiaries.find(a => a.id === id)?.name || 'N/A';
  const getHiveName = (id?: string) => hives.find(h => h.id === id)?.name || '';
  const getHivesForApiary = (apiaryId: string) => hives.filter(h => h.apiaryId === apiaryId);

  // Helper to display hive count or list
  const getTargetDisplayText = (apiaryId?: string, hiveId?: string, hiveIds?: string[]) => {
      if (!apiaryId) return "-";
      const totalHivesInApiary = getHivesForApiary(apiaryId).length;
      
      // Legacy single ID
      if (hiveId) return `Ruche : ${getHiveName(hiveId)}`;
      
      // New Array IDs
      if (hiveIds && hiveIds.length > 0) {
          if (hiveIds.length === totalHivesInApiary && totalHivesInApiary > 0) return `Tout le rucher (${totalHivesInApiary} ruches)`;
          return `${hiveIds.length} ruches sélectionnées`;
      }
      
      return `Tout le rucher (${totalHivesInApiary} ruches)`;
  };

  // Helper Component for Hive Selection Dropdown
  const HiveSelector = ({ 
    apiaryId, 
    selectedIds, 
    onToggle, 
    onSelectAll, 
    onDeselectAll 
  }: { 
    apiaryId: string, 
    selectedIds: string[], 
    onToggle: (id: string) => void,
    onSelectAll: () => void,
    onDeselectAll: () => void
  }) => {
      const apiaryHives = getHivesForApiary(apiaryId);
      if (apiaryHives.length === 0) return <div className="p-2 text-xs text-gray-400 italic">Aucune ruche dans ce rucher.</div>;

      return (
          <div className="absolute top-full left-0 w-full bg-white border border-gray-200 rounded-lg shadow-xl z-50 mt-1 max-h-60 overflow-y-auto">
              <div className="sticky top-0 bg-gray-50 p-2 border-b flex justify-between items-center text-xs">
                  <button onClick={onSelectAll} className="text-blue-600 font-bold hover:underline">Tout cocher</button>
                  <button onClick={onDeselectAll} className="text-gray-500 hover:text-gray-700">Aucune</button>
              </div>
              {apiaryHives.map(h => (
                  <div 
                    key={h.id} 
                    className="flex items-center gap-2 p-2 hover:bg-blue-50 cursor-pointer border-b last:border-0"
                    onClick={() => onToggle(h.id)}
                  >
                      <div className={`w-4 h-4 rounded border flex items-center justify-center ${selectedIds.includes(h.id) ? 'bg-blue-600 border-blue-600' : 'bg-white border-gray-300'}`}>
                          {selectedIds.includes(h.id) && <Check size={12} className="text-white"/>}
                      </div>
                      <span className={`text-sm ${selectedIds.includes(h.id) ? 'font-bold text-gray-800' : 'text-gray-600'}`}>{h.name}</span>
                  </div>
              ))}
          </div>
      );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-4">
        <div className="flex overflow-x-auto gap-2 pb-2 flex-grow no-scrollbar">
            {[
            { id: 'APIARY', label: 'Mes Ruchers', icon: MapPin },
            { id: 'MOVEMENTS', label: 'Mouvements', icon: Truck },
            { id: 'SANITARY', label: 'Soins (Sanitaire)', icon: Syringe },
            { id: 'FEEDING', label: 'Nourrissement', icon: Utensils },
            ].map((tab) => (
            <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id as any); handleCancelFeedingEdit(); }}
                className={`flex items-center gap-2 px-4 py-3 rounded-full whitespace-nowrap text-sm font-medium transition-colors ${
                activeTab === tab.id 
                    ? 'bg-honey-600 text-white shadow-md' 
                    : 'bg-white text-gray-600 hover:bg-honey-50 border border-gray-200'
                }`}
                title={tab.label}
            >
                <tab.icon size={20} />
                <span className="hidden md:inline">{tab.label}</span>
            </button>
            ))}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 md:p-6">
        
        {/* APIARY VIEW - UNCHANGED */}
        {activeTab === 'APIARY' && (
          <div>
            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <MapPin className="text-honey-600" />
              Vos Ruchers et Ruches
            </h2>
            <div className="space-y-2">
              {apiaries.length === 0 && <p className="text-gray-400 italic">Aucun rucher enregistré.</p>}
              {apiaries.map(apiary => {
                const apiaryHives = getHivesForApiary(apiary.id);
                const isExpanded = expandedApiaryId === apiary.id;
                return (
                  <div key={apiary.id} className="border border-gray-200 rounded-lg overflow-hidden bg-white">
                    <button onClick={() => setExpandedApiaryId(isExpanded ? null : apiary.id)} className="w-full flex justify-between items-center p-3 bg-gray-50 hover:bg-gray-100 transition text-left">
                        <div className="flex items-center gap-2">
                            {isExpanded ? <ChevronDown size={20} className="text-gray-500"/> : <ChevronRight size={20} className="text-gray-500"/>}
                            <div><h3 className="font-bold text-lg text-gray-800">{apiary.name}</h3><p className="text-gray-500 text-xs">{apiary.location}</p></div>
                        </div>
                        <span className="text-xs font-bold bg-white px-2 py-1 rounded border text-gray-500">{apiaryHives.length} ruches</span>
                    </button>
                    {isExpanded && (
                      <div className="border-t border-gray-100 bg-white">
                          {apiaryHives.length === 0 ? (<div className="p-6 text-center text-gray-400 text-sm italic">Aucune ruche déclarée dans ce rucher.</div>) : (
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 divide-y md:divide-y-0">
                                  {apiaryHives.map(hive => (
                                      <div key={hive.id} className="flex items-center gap-3 p-3 border-b md:border-r border-gray-100 last:border-0 hover:bg-honey-50 transition-colors">
                                          <div className="text-honey-600 flex-shrink-0"><HiveIcon size={22} /></div>
                                          <span className="font-bold text-gray-700">{hive.name}</span>
                                      </div>
                                  ))}
                              </div>
                          )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* SANITARY SECTION */}
        {activeTab === 'SANITARY' && (
          <div>
            {/* ... Modal omitted for brevity, keeping only main changes ... */}
            
            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Syringe className="text-honey-600" />
              Interventions Sanitaires
            </h2>
            
            {/* CREATE FORM */}
            <div className="flex flex-col gap-4 mb-8 p-6 rounded-xl border bg-gray-50 border-gray-200 relative">
               <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex flex-col gap-1">
                      <label className="text-xs font-bold text-gray-500 uppercase">Date</label>
                      <input type="date" className="border px-3 rounded-lg w-full h-11 bg-white appearance-none" value={newIntervention.date} onChange={e => setNewIntervention({ ...newIntervention, date: e.target.value })} />
                  </div>
                  
                  <div className="md:col-span-2 flex flex-col gap-1">
                      <label className="text-xs font-bold text-gray-500 uppercase">Rucher / Ruches concernées</label>
                      <div className="flex gap-2 relative">
                          <select 
                              className="border px-3 rounded-lg flex-1 h-11 bg-white" 
                              value={newIntervention.apiaryId} 
                              onChange={e => setNewIntervention({ ...newIntervention, apiaryId: e.target.value, hiveIds: [] })}
                          >
                              <option value="">Choisir Rucher...</option>
                              {apiaries.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                          </select>
                          
                          {/* MULTI SELECT BUTTON */}
                          <div className="flex-1 relative">
                              <button
                                  className={`border px-3 rounded-lg w-full h-11 bg-white flex justify-between items-center ${!newIntervention.apiaryId ? 'opacity-50 cursor-not-allowed' : ''}`}
                                  disabled={!newIntervention.apiaryId}
                                  onClick={() => setShowHiveSelector(!showHiveSelector)}
                              >
                                  <span className="truncate text-sm font-medium">
                                      {(newIntervention.hiveIds?.length || 0) === 0 ? "Tout le rucher" : `${newIntervention.hiveIds?.length} ruche(s) sélec.`}
                                  </span>
                                  <ChevronDown size={16} className="text-gray-500"/>
                              </button>
                              
                              {showHiveSelector && newIntervention.apiaryId && (
                                  <>
                                      <div className="fixed inset-0 z-40" onClick={() => setShowHiveSelector(false)}/>
                                      <HiveSelector 
                                          apiaryId={newIntervention.apiaryId} 
                                          selectedIds={newIntervention.hiveIds || []} 
                                          onToggle={(id) => toggleHiveSelection(id, 'SANITARY')}
                                          onSelectAll={() => selectAllHives(newIntervention.apiaryId!, 'SANITARY')}
                                          onDeselectAll={() => deselectAllHives('SANITARY')}
                                      />
                                  </>
                              )}
                          </div>
                      </div>
                  </div>
               </div>

              {/* ... Drug Inputs ... */}
              <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">Nom du médicament</label>
                  {!isCustomTreatment ? (
                      <select className="border px-3 rounded-lg w-full font-medium bg-white h-11" value={TREATMENT_OPTIONS.includes(newIntervention.drugName || '') ? newIntervention.drugName : ''} onChange={(e) => { const val = e.target.value; if (val === 'OTHER_CUSTOM') { setIsCustomTreatment(true); setNewIntervention({ ...newIntervention, drugName: '' }); } else { setNewIntervention({ ...newIntervention, drugName: val }); } }}>
                          <option value="">-- Choisir un traitement --</option>
                          {TREATMENT_OPTIONS.map((t, idx) => (<option key={idx} value={t}>{t}</option>))}
                          <option value="OTHER_CUSTOM" className="font-bold text-blue-600 bg-blue-50">Autre / Saisie libre...</option>
                      </select>
                  ) : (
                      <div className="flex gap-2">
                          <input type="text" placeholder="Nom du traitement..." className="border px-3 rounded-lg w-full font-medium h-11 bg-white" value={newIntervention.drugName} onChange={e => setNewIntervention({ ...newIntervention, drugName: e.target.value })} autoFocus />
                          <button onClick={() => { setIsCustomTreatment(false); setNewIntervention({ ...newIntervention, drugName: '' }); }} className="bg-gray-100 hover:bg-gray-200 text-gray-600 px-3 rounded-lg border border-gray-200 h-11 flex items-center justify-center"><List size={20} /></button>
                      </div>
                  )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1"><label className="text-xs font-bold text-red-500 uppercase">N° de LOT (Crucial)</label><input type="text" placeholder="Numéro de lot" className="border-2 border-red-200 bg-white px-3 rounded-lg w-full h-11" value={newIntervention.batchNumber} onChange={e => setNewIntervention({ ...newIntervention, batchNumber: e.target.value })} /></div>
                  <div className="flex flex-col gap-1"><label className="text-xs font-bold text-gray-500 uppercase">Quantité administrée</label><input type="text" placeholder="Ex: 2 lanières par ruche" className="border px-3 rounded-lg w-full h-11 bg-white" value={newIntervention.quantity} onChange={e => setNewIntervention({ ...newIntervention, quantity: e.target.value })} /></div>
              </div>
               <div className="flex flex-col gap-1"><label className="text-xs font-bold text-gray-500 uppercase">Posologie / Observations</label><textarea rows={2} placeholder="Détails..." className="border p-2 rounded-lg w-full resize-y bg-white" value={newIntervention.posology} onChange={e => setNewIntervention({ ...newIntervention, posology: e.target.value })} /></div>
               <button onClick={handleSaveIntervention} className="w-full text-white p-3 rounded-xl flex justify-center items-center gap-2 font-bold shadow-sm transition bg-red-600 hover:bg-red-700"><Save size={20}/> Enregistrer le traitement</button>
            </div>

            {/* LIST DESIGN - Accordion Style */}
            <div className="space-y-4">
              {interventions.length === 0 && <div className="text-center py-8 text-gray-400 italic bg-gray-50 rounded-xl border border-dashed border-gray-300">Aucun traitement sanitaire enregistré.</div>}
              {interventions.map(int => {
                  const isExpanded = expandedInterventionId === int.id;
                  return (
                    <div key={int.id} className="bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-all overflow-hidden">
                        <div onClick={() => setExpandedInterventionId(isExpanded ? null : int.id)} className="p-5 cursor-pointer relative">
                            <div className="flex justify-between items-start">
                                <div className="w-full">
                                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                                        <h3 className="text-xl md:text-2xl font-bold text-gray-900 leading-none">{int.drugName || "Traitement"}</h3>
                                        {int.batchNumber && (<span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-xs font-semibold tracking-wide border border-gray-200">Lot #{int.batchNumber}</span>)}
                                    </div>
                                    <div className="flex justify-between items-center mt-2">
                                        <div className="flex items-center gap-1 text-gray-500 text-sm"><Clock size={14} />{new Date(int.date).toLocaleDateString('fr-FR')}</div>
                                        <div className="flex items-center gap-2 text-gray-900 font-bold text-sm text-right">
                                            <Syringe size={16} className="text-gray-400 flex-shrink-0" /><span>{int.quantity || "?"}</span>
                                            {int.posology && (<span className="text-gray-900 font-normal italic text-xs hidden sm:inline border-l border-gray-300 pl-2 ml-1">{int.posology}</span>)}
                                        </div>
                                    </div>
                                </div>
                                <div className="text-gray-400 p-1 hover:bg-gray-100 rounded-full transition ml-2 flex-shrink-0 self-start"><MoreHorizontal size={20} /></div>
                            </div>
                        </div>
                        {isExpanded && <div className="h-px bg-gray-100 mx-5"></div>}
                        {isExpanded && (
                            <div className="p-5 animate-in fade-in slide-in-from-top-2 duration-200 bg-gray-50/50">
                                <div className="flex justify-between items-center">
                                    <div className="flex gap-3 items-center">
                                        <MapPin size={22} className="text-gray-400" />
                                        <div>
                                            <div className="font-bold text-gray-800 text-lg leading-tight">{getApiaryName(int.apiaryId)}</div>
                                            <div className="text-sm text-gray-600 font-medium">
                                                {getTargetDisplayText(int.apiaryId, int.hiveId, int.hiveIds)}
                                            </div>
                                            {int.hiveIds && int.hiveIds.length > 0 && int.hiveIds.length < getHivesForApiary(int.apiaryId || '').length && (
                                                <div className="mt-2 flex flex-wrap gap-1">
                                                    {int.hiveIds.map(hid => (
                                                        <span key={hid} className="text-[10px] bg-white border px-1 rounded text-gray-500">{getHiveName(hid)}</span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex gap-4 pr-2">
                                        <button onClick={(e) => { e.stopPropagation(); handleOpenEditModal(int); }} className="text-gray-400 hover:text-gray-600 transition" title="Modifier"><Edit2 size={20}/></button>
                                        <button onClick={(e) => { e.stopPropagation(); if(window.confirm('Supprimer ?')) { Storage.interventions.delete(int.id); refreshData(); } }} className="text-gray-400 hover:text-red-500 transition" title="Supprimer"><Trash2 size={20}/></button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                  );
              })}
            </div>
          </div>
        )}

        {/* MOVEMENTS SECTION - Unchanged */}
        {activeTab === 'MOVEMENTS' && (
           <div>
             {/* ... Keeping existing Movement UI ... */}
             <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2"><Truck className="text-honey-600" /> Mouvements</h2>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 bg-blue-50 p-4 rounded-xl border border-blue-100">
               <input type="date" className="border px-3 h-11 rounded-lg bg-white appearance-none" value={newMovement.date} onChange={e => setNewMovement({ ...newMovement, date: e.target.value })} />
               <select className="border px-3 h-11 rounded-lg bg-white" value={newMovement.type} onChange={e => setNewMovement({ ...newMovement, type: e.target.value })}>{Object.values(MovementType).map(t => <option key={t} value={t}>{t}</option>)}</select>
               <input type="text" placeholder="Description" className="border px-3 h-11 rounded-lg md:col-span-2 bg-white" value={newMovement.description} onChange={e => setNewMovement({ ...newMovement, description: e.target.value })} />
               <div className="flex flex-col md:flex-row gap-2 md:col-span-2">
                   <select className="border px-3 h-11 rounded-lg w-full bg-white" value={newMovement.originApiaryId} onChange={e => setNewMovement({ ...newMovement, originApiaryId: e.target.value })}><option value="">Départ</option>{apiaries.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select>
                   <select className="border px-3 h-11 rounded-lg w-full bg-white" value={newMovement.destinationApiaryId} onChange={e => setNewMovement({ ...newMovement, destinationApiaryId: e.target.value })}><option value="">Arrivée</option>{apiaries.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select>
               </div>
               <input type="number" placeholder="Quantité de ruches" className="border px-3 h-11 rounded-lg md:col-span-2 bg-white" value={newMovement.quantity || ''} onChange={e => setNewMovement({ ...newMovement, quantity: parseInt(e.target.value) })} />
               <button onClick={handleAddMovement} className="bg-blue-600 text-white p-2 rounded-lg md:col-span-2 font-bold hover:bg-blue-700 transition">Enregistrer le mouvement</button>
            </div>
            <div className="space-y-2">
                {movements.map(m => (
                    <div key={m.id} className="p-3 border-b flex flex-col md:flex-row justify-between md:items-center">
                        <div><span className="font-bold text-blue-800 text-sm uppercase px-2 py-1 bg-blue-100 rounded mr-2">{m.type}</span><span className="font-medium">{m.description}</span><div className="text-sm text-gray-500 mt-1">{m.quantity} ruches | De: {getApiaryName(m.originApiaryId)} Vers: {getApiaryName(m.destinationApiaryId)}</div></div>
                        <div className="flex items-center gap-4 mt-2 md:mt-0"><span className="text-sm text-gray-400">{new Date(m.date).toLocaleDateString()}</span><button onClick={() => { Storage.movements.delete(m.id); refreshData(); }} className="text-red-400 hover:text-red-600"><Trash2 size={16} /></button></div>
                    </div>
                ))}
            </div>
           </div>
        )}

        {/* FEEDING SECTION */}
        {activeTab === 'FEEDING' && (
           <div>
             <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Utensils className="text-honey-600" />
                Nourrissement
            </h2>

             {/* FEEDING FORM REDESIGNED to match Sanitary */}
             <div className={`flex flex-col gap-4 mb-6 p-6 rounded-xl border transition-all ${editingFeedingId ? 'bg-blue-50 border-blue-200 shadow-md' : 'bg-gray-50 border-gray-200'}`}>
               {editingFeedingId && (<div className="flex items-center gap-2 text-blue-700 font-bold mb-2"><Edit2 size={18} /> Mode Modification</div>)}

               <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex flex-col gap-1">
                      <label className="text-xs font-bold text-gray-500 uppercase">Date</label>
                      <input type="date" className="border px-3 h-11 rounded-lg bg-white appearance-none" value={newFeeding.date} onChange={e => setNewFeeding({ ...newFeeding, date: e.target.value })} />
                  </div>
                  
                  {/* Location Selectors + MULTI */}
                  <div className="md:col-span-2 flex flex-col gap-1">
                       <label className="text-xs font-bold text-gray-500 uppercase">Rucher / Ruches concernées</label>
                       <div className="flex gap-2 relative">
                           <select 
                             className="border px-3 h-11 rounded-lg flex-1 bg-white" 
                             value={newFeeding.apiaryId} 
                             onChange={e => setNewFeeding({ ...newFeeding, apiaryId: e.target.value, hiveIds: [] })}
                           >
                               <option value="">Choisir Rucher...</option>
                               {apiaries.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                           </select>

                           {/* MULTI SELECT BUTTON FOR FEEDING */}
                           <div className="flex-1 relative">
                              <button
                                  className={`border px-3 rounded-lg w-full h-11 bg-white flex justify-between items-center ${!newFeeding.apiaryId ? 'opacity-50 cursor-not-allowed' : ''}`}
                                  disabled={!newFeeding.apiaryId}
                                  onClick={() => setShowHiveSelector(!showHiveSelector)}
                              >
                                  <span className="truncate text-sm font-medium">
                                      {(newFeeding.hiveIds?.length || 0) === 0 ? "Tout le rucher" : `${newFeeding.hiveIds?.length} ruche(s) sélec.`}
                                  </span>
                                  <ChevronDown size={16} className="text-gray-500"/>
                              </button>
                              
                              {showHiveSelector && newFeeding.apiaryId && (
                                  <>
                                      <div className="fixed inset-0 z-40" onClick={() => setShowHiveSelector(false)}/>
                                      <HiveSelector 
                                          apiaryId={newFeeding.apiaryId} 
                                          selectedIds={newFeeding.hiveIds || []} 
                                          onToggle={(id) => toggleHiveSelection(id, 'FEEDING')}
                                          onSelectAll={() => selectAllHives(newFeeding.apiaryId!, 'FEEDING')}
                                          onDeselectAll={() => deselectAllHives('FEEDING')}
                                      />
                                  </>
                              )}
                          </div>
                      </div>
                  </div>
               </div>

               {/* CUSTOM FOOD TYPE SELECTOR */}
               <div className="flex flex-col gap-1">
                   <label className="text-xs font-bold text-gray-500 uppercase">Type de nourriture</label>
                   {!isCustomFoodType ? (
                       <select className="border px-3 h-11 rounded-lg w-full bg-white" value={foodTypes.includes(newFeeding.foodType || '') ? newFeeding.foodType : ''} onChange={(e) => { const val = e.target.value; if (val === 'NEW_FOOD') { setIsCustomFoodType(true); setNewFeeding({ ...newFeeding, foodType: '' }); } else { setNewFeeding({ ...newFeeding, foodType: val }); } }} >
                           <option value="">-- Choisir --</option>
                           {foodTypes.map((t, idx) => <option key={idx} value={t}>{t}</option>)}
                           <option value="NEW_FOOD" className="font-bold text-blue-600 bg-blue-50">+ Ajouter un type...</option>
                       </select>
                   ) : (
                       <div className="flex gap-2">
                           <input type="text" placeholder="Ex: Sirop Thym..." className="border px-3 h-11 rounded-lg w-full font-medium bg-white" value={newFeeding.foodType} onChange={e => setNewFeeding({ ...newFeeding, foodType: e.target.value })} autoFocus />
                           <button onClick={() => { setIsCustomFoodType(false); setNewFeeding({ ...newFeeding, foodType: '' }); }} className="bg-gray-100 hover:bg-gray-200 text-gray-600 px-3 rounded-lg border border-gray-200 h-11 flex items-center justify-center"><List size={20} /></button>
                       </div>
                   )}
               </div>

               <div className="flex flex-col gap-1">
                   <label className="text-xs font-bold text-gray-500 uppercase">Quantité Totale</label>
                   <input type="text" placeholder="Ex: 20 Litres, 5 pains de 2kg..." className="border px-3 h-11 rounded-lg w-full bg-white" value={newFeeding.quantity} onChange={e => setNewFeeding({ ...newFeeding, quantity: e.target.value })} />
               </div>
               
               <div className="flex gap-2 mt-2">
                   {editingFeedingId && (
                       <button onClick={handleCancelFeedingEdit} className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 p-3 rounded-xl font-bold flex justify-center items-center gap-2 transition"><X size={20} /> Annuler</button>
                   )}
                   <button onClick={handleSaveFeeding} className={`flex-1 text-white p-3 rounded-xl flex justify-center items-center gap-2 font-bold transition shadow-sm ${editingFeedingId ? 'bg-blue-600 hover:bg-blue-700' : 'bg-yellow-600 hover:bg-yellow-700'}`}>
                     {editingFeedingId ? <><Check size={20}/> Mettre à jour</> : <><Save size={20}/> Enregistrer le nourrissement</>}
                   </button>
               </div>
            </div>

            {/* LIST DESIGN - Redesigned to match Sanitary Accordion */}
            <div className="space-y-4">
                {feedings.length === 0 && <div className="text-gray-400 text-center py-4 italic">Aucun nourrissement enregistré.</div>}
                {feedings.map(f => {
                    const isExpanded = expandedFeedingId === f.id;
                    return (
                        <div key={f.id} className="bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-all overflow-hidden">
                             <div onClick={() => setExpandedFeedingId(isExpanded ? null : f.id)} className="p-5 cursor-pointer relative">
                                <div className="flex justify-between items-start">
                                    <div className="w-full">
                                        <div className="flex items-center gap-2 mb-2">
                                            <h3 className="text-xl font-bold text-gray-900 leading-none">{f.foodType}</h3>
                                        </div>
                                        <div className="flex justify-between items-center mt-2">
                                            <div className="flex items-center gap-1 text-gray-500 text-sm"><Clock size={14} />{new Date(f.date).toLocaleDateString('fr-FR')}</div>
                                            <div className="flex items-center gap-2 text-gray-900 font-bold text-sm text-right">
                                                <Utensils size={16} className="text-gray-400 flex-shrink-0" /><span>{f.quantity}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-gray-400 p-1 hover:bg-gray-100 rounded-full transition ml-2 flex-shrink-0 self-start"><MoreHorizontal size={20} /></div>
                                </div>
                             </div>

                             {isExpanded && <div className="h-px bg-gray-100 mx-5"></div>}
                             {isExpanded && (
                                <div className="p-5 animate-in fade-in slide-in-from-top-2 duration-200 bg-gray-50/50">
                                    <div className="flex justify-between items-center">
                                        <div className="flex gap-3 items-center">
                                            <MapPin size={22} className="text-gray-400" />
                                            <div>
                                                <div className="font-bold text-gray-800 text-lg leading-tight">{getApiaryName(f.apiaryId)}</div>
                                                <div className="text-sm text-gray-600 font-medium">
                                                    {getTargetDisplayText(f.apiaryId, f.hiveId, f.hiveIds)}
                                                </div>
                                                {f.hiveIds && f.hiveIds.length > 0 && f.hiveIds.length < getHivesForApiary(f.apiaryId || '').length && (
                                                    <div className="mt-2 flex flex-wrap gap-1">
                                                        {f.hiveIds.map(hid => (
                                                            <span key={hid} className="text-[10px] bg-white border px-1 rounded text-gray-500">{getHiveName(hid)}</span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex gap-4 pr-2">
                                            <button onClick={(e) => { e.stopPropagation(); handleEditFeeding(f); }} className="text-gray-400 hover:text-blue-500 transition" title="Modifier"><Edit2 size={20}/></button>
                                            <button onClick={(e) => { e.stopPropagation(); if(window.confirm('Supprimer ?')) { Storage.feedings.delete(f.id); refreshData(); } }} className="text-gray-400 hover:text-red-500 transition" title="Supprimer"><Trash2 size={20}/></button>
                                        </div>
                                    </div>
                                </div>
                             )}
                        </div>
                    );
                })}
            </div>
           </div>
        )}

      </div>
    </div>
  );
};