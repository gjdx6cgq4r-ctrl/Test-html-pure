
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Expense, ExpenseCategory } from '../types';
import * as Storage from '../services/storageService';
import { Trash2, PlusCircle, Wallet, Edit2, Check, X, Store, ChevronDown, ChevronRight, Search, Clock, MoreHorizontal, Tag } from 'lucide-react';

interface ExpenseGroup {
    id: string; // Composite ID: date + store
    date: string;
    store: string;
    total: number;
    items: Expense[];
}

export const Expenses: React.FC = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // State for creating new expense
  const [newExpense, setNewExpense] = useState<Partial<Expense>>({
    date: new Date().toISOString().split('T')[0],
    store: '',
    description: '',
    category: 'MATERIEL',
    amount: '' as any
  });

  // Autocomplete State
  const [showStoreSuggestions, setShowStoreSuggestions] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // State for editing existing expense
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<Expense>>({});

  // Expanded Groups State (Array of group IDs)
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);

  const categories: ExpenseCategory[] = ['MATERIEL', 'NOURRISSEMENT', 'SOIN', 'CONDITIONNEMENT', 'ADMINISTRATIF', 'AUTRE'];

  useEffect(() => {
    refreshData();
  }, []);

  // Handle click outside to close suggestions
  useEffect(() => {
      function handleClickOutside(event: MouseEvent) {
          if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
              setShowStoreSuggestions(false);
          }
      }
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const refreshData = () => {
    // Sort by date descending
    setExpenses(Storage.expenses.getAll().sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
  };

  // Generate unique store list for Autocomplete
  const uniqueStores = useMemo(() => {
      const stores = new Set<string>();
      expenses.forEach(e => {
          if (e.store) stores.add(e.store.trim());
      });
      return Array.from(stores).sort();
  }, [expenses]);

  // Filtered suggestions based on input
  const filteredStores = uniqueStores.filter(s => 
      s.toLowerCase().includes((newExpense.store || '').toLowerCase())
  );

  const handleAdd = () => {
      if (!newExpense.description || !newExpense.amount) return;
      
      const cleanStore = (newExpense.store || 'Divers').trim();

      Storage.expenses.add({
          id: Storage.generateId(),
          date: newExpense.date!,
          store: cleanStore, 
          description: newExpense.description!,
          category: newExpense.category!,
          amount: parseFloat(newExpense.amount as any)
      });
      
      setNewExpense({
        ...newExpense,
        store: cleanStore, 
        description: '',
        amount: '' as any
      });
      setShowStoreSuggestions(false);
      refreshData();
  };

  const selectStore = (store: string) => {
      setNewExpense({ ...newExpense, store: store });
      setShowStoreSuggestions(false);
  };

  const handleStartEdit = (exp: Expense) => {
      setEditingId(exp.id);
      setEditData({...exp});
  };

  const handleSaveEdit = () => {
      if(editingId && editData.description && editData.amount) {
          const cleanEditData = {
              ...editData,
              store: (editData.store || 'Divers').trim()
          };
          Storage.expenses.update(cleanEditData as Expense);
          setEditingId(null);
          setEditData({});
          refreshData();
      }
  };

  const handleCancelEdit = () => {
      setEditingId(null);
      setEditData({});
  };

  const toggleGroup = (groupId: string) => {
      setExpandedGroups(prev => 
        prev.includes(groupId) ? prev.filter(g => g !== groupId) : [...prev, groupId]
      );
  };

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

  // --- GROUPING LOGIC ---
  const filteredExpenses = expenses.filter(e => 
      e.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (e.store || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const groupsMap = new Map<string, ExpenseGroup>();

  filteredExpenses.forEach(exp => {
      const storeName = (exp.store || 'Divers').trim();
      const groupId = `${exp.date}-${storeName.toLowerCase()}`;
      
      if (!groupsMap.has(groupId)) {
          groupsMap.set(groupId, {
              id: groupId,
              date: exp.date,
              store: storeName,
              total: 0,
              items: []
          });
      }
      const group = groupsMap.get(groupId)!;
      group.items.push(exp);
      group.total += exp.amount;
  });

  const sortedGroups = Array.from(groupsMap.values()).sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return (
    <div className="space-y-6">
        <div className="bg-gradient-to-r from-red-600 to-red-500 p-6 rounded-xl text-white shadow-md">
            <h2 className="text-2xl font-bold flex items-center gap-2">
                <Wallet /> Gestion des Dépenses
            </h2>
            <p className="text-red-100 mt-2">
                Notez tous vos achats. Ils sont regroupés par ticket (Magasin + Date).
            </p>
            <div className="mt-4 text-3xl font-bold bg-white/20 p-3 rounded-lg inline-block backdrop-blur-sm">
                Total Dépenses : {totalExpenses.toFixed(2)} €
            </div>
        </div>

        {/* INPUT FORM */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><PlusCircle className="text-red-500"/> Nouvelle Dépense</h3>
            
            <div className="flex flex-col gap-4">
                <div className="flex flex-col md:flex-row gap-4">
                    <input 
                        type="date" 
                        className="border p-2 rounded-lg"
                        value={newExpense.date}
                        onChange={e => setNewExpense({...newExpense, date: e.target.value})}
                    />
                    
                    <div className="flex-grow relative" ref={wrapperRef}>
                        <div className="flex items-center gap-2 border p-2 rounded-lg bg-gray-50 focus-within:ring-2 focus-within:ring-red-200">
                            <Store size={18} className="text-gray-400"/>
                            <input 
                                type="text" 
                                placeholder="Magasin / Fournisseur (ex: Icko)"
                                className="bg-transparent outline-none w-full"
                                value={newExpense.store}
                                onChange={e => {
                                    setNewExpense({...newExpense, store: e.target.value});
                                    setShowStoreSuggestions(true);
                                }}
                                onFocus={() => setShowStoreSuggestions(true)}
                                autoComplete="off"
                            />
                        </div>
                        
                        {showStoreSuggestions && filteredStores.length > 0 && (
                            <div className="absolute top-full left-0 w-full bg-white border border-gray-200 rounded-lg shadow-lg mt-1 z-50 max-h-48 overflow-y-auto">
                                {filteredStores.map((store, index) => (
                                    <div 
                                        key={index}
                                        className="px-4 py-2 hover:bg-red-50 cursor-pointer text-sm text-gray-700 flex items-center gap-2"
                                        onClick={() => selectStore(store)}
                                    >
                                        <Store size={14} className="text-gray-400"/>
                                        {store}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                     <select 
                        className="border p-2 rounded-lg md:col-span-3"
                        value={newExpense.category}
                        onChange={e => setNewExpense({...newExpense, category: e.target.value as ExpenseCategory})}
                    >
                        {categories.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <input 
                        type="text" 
                        placeholder="Article (ex: Cire gaufrée)" 
                        className="border p-2 rounded-lg md:col-span-6"
                        value={newExpense.description}
                        onChange={e => setNewExpense({...newExpense, description: e.target.value})}
                    />
                    <input 
                        type="number" 
                        placeholder="Prix €" 
                        className="border p-2 rounded-lg md:col-span-2"
                        value={newExpense.amount}
                        onChange={e => setNewExpense({...newExpense, amount: e.target.value as any})}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') handleAdd();
                        }}
                    />
                    <button 
                        onClick={handleAdd}
                        className="bg-red-600 hover:bg-red-700 text-white p-2 rounded-lg md:col-span-1 flex items-center justify-center"
                    >
                        <PlusCircle size={24} />
                    </button>
                </div>
            </div>
        </div>

        {/* LIST - REDESIGNED ACCORDION STYLE */}
        <div className="space-y-4">
            
            {/* Search Bar */}
            <div className="p-4 rounded-xl border border-gray-100 bg-white">
                <div className="relative">
                    <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
                    <input 
                        type="text" 
                        placeholder="Rechercher une facture, un article..." 
                        className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-200"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {sortedGroups.length === 0 && (
                <div className="text-center py-10 text-gray-400 italic bg-gray-50 rounded-xl border border-dashed border-gray-300">Aucune dépense trouvée.</div>
            )}

            {sortedGroups.map(group => {
                const isExpanded = expandedGroups.includes(group.id) || searchTerm.length > 0;
                
                return (
                    <div key={group.id} className="bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-all overflow-hidden">
                        
                        {/* HEADER CARD */}
                        <div onClick={() => toggleGroup(group.id)} className="p-5 cursor-pointer relative">
                            <div className="flex justify-between items-start">
                                <div className="w-full">
                                    <div className="flex items-center gap-2 mb-2">
                                        <h3 className="text-xl font-bold text-gray-900 leading-none">{group.store}</h3>
                                        <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-xs font-semibold tracking-wide border border-gray-200">
                                            {group.items.length} articles
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center mt-2">
                                        <div className="flex items-center gap-1 text-gray-500 text-sm">
                                            <Clock size={14} />{new Date(group.date).toLocaleDateString('fr-FR')}
                                        </div>
                                        <div className="font-bold text-lg text-red-600">
                                            -{group.total.toFixed(2)} €
                                        </div>
                                    </div>
                                </div>
                                <div className="text-gray-400 p-1 hover:bg-gray-100 rounded-full transition ml-2 flex-shrink-0 self-start">
                                    {isExpanded ? <ChevronDown size={20}/> : <ChevronRight size={20}/>}
                                </div>
                            </div>
                        </div>

                        {/* DIVIDER */}
                        {isExpanded && <div className="h-px bg-gray-100 mx-5"></div>}

                        {/* BODY DETAILS */}
                        {isExpanded && (
                            <div className="bg-gray-50/50 border-t border-gray-100">
                                {group.items.map((exp, idx) => {
                                    const isEditing = editingId === exp.id;
                                    return (
                                        <div key={exp.id} className={`p-4 border-b border-gray-100 last:border-0 ${isEditing ? 'bg-red-50' : 'hover:bg-gray-100/50'}`}>
                                            <div className="flex justify-between items-center">
                                                <div className="flex-grow pr-4">
                                                    {isEditing ? (
                                                        <div className="space-y-2">
                                                            <input 
                                                                type="text" 
                                                                className="border rounded px-2 py-1 w-full font-bold text-gray-800 bg-white" 
                                                                value={editData.description} 
                                                                onChange={e => setEditData({...editData, description: e.target.value})} 
                                                                autoFocus
                                                            />
                                                            <div className="flex gap-2">
                                                                <select className="border rounded px-1 text-xs py-1 flex-1" value={editData.category} onChange={e => setEditData({...editData, category: e.target.value as ExpenseCategory})}>
                                                                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                                                                </select>
                                                                <input type="number" className="border rounded px-2 py-1 w-24 text-right" value={editData.amount} onChange={e => setEditData({...editData, amount: parseFloat(e.target.value) || 0})} />
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div>
                                                            <div className="font-bold text-gray-800">{exp.description}</div>
                                                            <div className="flex items-center gap-2 mt-1">
                                                                <span className="text-[10px] uppercase font-bold tracking-wider text-gray-500 flex items-center gap-1">
                                                                    <Tag size={10}/> {exp.category}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="flex items-center gap-4">
                                                    {!isEditing && (
                                                        <div className="font-mono font-bold text-gray-700">
                                                            {exp.amount.toFixed(2)}€
                                                        </div>
                                                    )}
                                                    
                                                    <div className="flex gap-2">
                                                        {isEditing ? (
                                                            <>
                                                                <button onClick={(e) => {e.stopPropagation(); handleSaveEdit();}} className="text-green-600 hover:bg-green-100 p-1 rounded"><Check size={18} /></button>
                                                                <button onClick={(e) => {e.stopPropagation(); handleCancelEdit();}} className="text-gray-400 hover:bg-gray-200 p-1 rounded"><X size={18} /></button>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <button onClick={(e) => {e.stopPropagation(); handleStartEdit(exp);}} className="text-gray-300 hover:text-blue-500 p-1"><Edit2 size={16}/></button>
                                                                <button onClick={(e) => {e.stopPropagation(); Storage.expenses.delete(exp.id); refreshData();}} className="text-gray-300 hover:text-red-500 p-1"><Trash2 size={16}/></button>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    </div>
  );
};
