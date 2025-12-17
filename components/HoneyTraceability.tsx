import React, { useState, useEffect, useMemo } from 'react';
import { 
  Harvest, Packaging, Sale, Apiary, Product, PaymentMethod, Client, UnitCostConfig
} from '../types';
import * as Storage from '../services/storageService';
import { Archive, Package, ShoppingCart, Plus, Trash2, User, Building2, Store, CreditCard, Banknote, ImagePlus, History, Calendar, Edit2, BookOpenText, X, Check, AlertTriangle, Save, Search, Gift, Landmark, Copy, ArrowDown, ArrowUp, ArrowUpDown, ChevronDown, ChevronRight, Calculator, Coins, MapPin } from 'lucide-react';

// Helper to compress images before storage to avoid QuotaExceededError
const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                // Limit max dimension to 800px to save space
                const MAX_WIDTH = 800; 
                const scaleSize = MAX_WIDTH / img.width;
                
                if (scaleSize < 1) {
                    canvas.width = MAX_WIDTH;
                    canvas.height = img.height * scaleSize;
                } else {
                    canvas.width = img.width;
                    canvas.height = img.height;
                }
                
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
                // Compress to JPEG 70% quality
                resolve(canvas.toDataURL('image/jpeg', 0.7)); 
            };
            img.onerror = (err) => reject(err);
        };
        reader.onerror = (err) => reject(err);
    });
};

// --- ROBUST STRING NORMALIZER ---
const normalizeString = (str?: string) => {
    if (!str) return '';
    return str
        .toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Remove accents
        .replace(/\s+/g, '') // Remove ALL spaces
        .trim();
};

// Helper to safely extract year from YYYY-MM-DD string without timezone issues
const getYearFromDateStr = (dateStr?: string) => {
    if (!dateStr) return new Date().getFullYear();
    const parts = dateStr.split('-');
    if (parts.length > 0) return parseInt(parts[0]);
    return new Date(dateStr).getFullYear();
};

// Internal Confirm Modal for this component
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

interface SaleGroup {
    id: string;
    date: string;
    buyerName: string;
    paymentMethod: string;
    totalPrice: number;
    items: Sale[];
}

interface HoneyTraceabilityProps {
  initialTab?: 'HARVEST' | 'PACKAGING' | 'POS' | 'REVENUE' | 'PRODUCTS';
}

export const HoneyTraceability: React.FC<HoneyTraceabilityProps> = ({ initialTab = 'HARVEST' }) => {
  const [activeTab, setActiveTab] = useState<'HARVEST' | 'PACKAGING' | 'POS' | 'REVENUE' | 'PRODUCTS'>(initialTab);
  const [apiaries, setApiaries] = useState<Apiary[]>([]);
  const [harvests, setHarvests] = useState<Harvest[]>([]);
  const [packagings, setPackagings] = useState<Packaging[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [honeyTypes, setHoneyTypes] = useState<string[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [costConfig, setCostConfig] = useState<UnitCostConfig>(Storage.getCostConfig());

  // Mobile Cart State
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);

  // Sorting State for Revenue Book
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'date', direction: 'desc' });
  
  // Accordion State for Revenue Book
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);

  // Feedback state
  const [formFeedback, setFormFeedback] = useState<{type: 'success' | 'error', message: string} | null>(null);
  
  // Validation state for POS
  const [posError, setPosError] = useState(false);

  // ANIMATION STATES FOR POS
  const [animatingItems, setAnimatingItems] = useState<{id: string, key: number}[]>([]);
  const [cartBounce, setCartBounce] = useState(false);

  // Sync activeTab
  useEffect(() => {
      setActiveTab(initialTab);
  }, [initialTab]);

  // Simple Harvest Form State
  const [newHarvest, setNewHarvest] = useState<Partial<Harvest>>({
    date: new Date().toISOString().split('T')[0],
    honeyType: '',
    quantityKg: 0,
    apiaryId: ''
  });
  const [isCustomHarvestHoneyType, setIsCustomHarvestHoneyType] = useState(false);
  
  // Helper to calculate DDM (+2 years)
  const calculateDDM = (dateStr: string) => {
      if (!dateStr) return '';
      try {
          const d = new Date(dateStr);
          d.setFullYear(d.getFullYear() + 2);
          return d.toISOString().split('T')[0];
      } catch (e) { return ''; }
  };
  
  // Smart Packaging Form State
  const [newPackage, setNewPackage] = useState<Partial<Packaging>>({
    date: new Date().toISOString().split('T')[0],
    quantityPots: 0,
    potSize: '500g',
    finalBatchNumber: '',
    ddm: calculateDDM(new Date().toISOString().split('T')[0]),
    honeyType: ''
  });
  const [isCustomPotSize, setIsCustomPotSize] = useState(false);
  const [isCustomHoneyType, setIsCustomHoneyType] = useState(false);

  // Product details
  const [packagingProductInfo, setPackagingProductInfo] = useState({
    name: '',
    price: 0,
    imageUrl: ''
  });

  // Product Catalog Edit State
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editingBatchInitialQty, setEditingBatchInitialQty] = useState<number>(0);
  
  // Sale Deletion & Editing State
  const [saleToDelete, setSaleToDelete] = useState<string | null>(null);
  const [editingSaleId, setEditingSaleId] = useState<string | null>(null);
  const [tempSaleData, setTempSaleData] = useState<Partial<Sale>>({});

  // POS State
  const [cart, setCart] = useState<{product: Product, quantity: number}[]>([]);
  const [posPaymentMethod, setPosPaymentMethod] = useState<PaymentMethod>('ESPECES');
  const [saleDate, setSaleDate] = useState(new Date().toISOString().split('T')[0]);
  const [posClientLocation, setPosClientLocation] = useState('');
  const [posSelectedClientId, setPosSelectedClientId] = useState('');
  const [clientSearchTerm, setClientSearchTerm] = useState('');
  const [showClientResults, setShowClientResults] = useState(false);

  const refreshData = () => {
    setApiaries(Storage.getApiaries());
    setHarvests(Storage.harvests.getAll());
    const allPackagings = Storage.packaging.getAll();
    setPackagings([...allPackagings].reverse());
    setSales(Storage.sales.getAll());
    setProducts(Storage.products.getAll());
    setHoneyTypes(Storage.getHoneyTypes());
    setClients(Storage.clients.getAll());
    setCostConfig(Storage.getCostConfig());
  };

  useEffect(() => {
    refreshData();
  }, [activeTab]);

  // --- HELPER: SORT SALES ---
  const handleSort = (key: string) => {
      setSortConfig(current => ({
          key,
          direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
      }));
  };

  const getDisplayFormat = (s: Sale) => {
    let displayFormat = s.format;
    if (!displayFormat && s.productName) {
        const matchedProduct = products.find(p => p.name === s.productName);
        if (matchedProduct) displayFormat = matchedProduct.potSize;
    }
    if (!displayFormat) {
        const linkedBatch = packagings.find(p => p.finalBatchNumber === s.finalBatchNumber);
        if (linkedBatch) displayFormat = linkedBatch.potSize;
    }
    return displayFormat || '';
  };

  // --- REVENUE BOOK GROUPING & SORTING ---
  const groupedSales = useMemo(() => {
      const groupsMap = new Map<string, SaleGroup>();
      
      sales.forEach(sale => {
          const key = `${sale.date}-${(sale.buyerName || 'Inconnu').trim()}-${sale.paymentMethod}`;
          
          if (!groupsMap.has(key)) {
              groupsMap.set(key, {
                  id: key,
                  date: sale.date,
                  buyerName: sale.buyerName || 'Vente Directe',
                  paymentMethod: sale.paymentMethod || 'ESPECES',
                  totalPrice: 0,
                  items: []
              });
          }
          const group = groupsMap.get(key)!;
          group.items.push(sale);
          group.totalPrice += (sale.totalPrice || 0);
      });

      const groups = Array.from(groupsMap.values());

      groups.sort((a, b) => {
          let valA: any = '';
          let valB: any = '';

          switch (sortConfig.key) {
              case 'date':
                  return sortConfig.direction === 'asc' 
                    ? new Date(a.date).getTime() - new Date(b.date).getTime()
                    : new Date(b.date).getTime() - new Date(a.date).getTime();
              case 'client':
                  valA = a.buyerName.toLowerCase();
                  valB = b.buyerName.toLowerCase();
                  break;
              case 'payment':
                  valA = a.paymentMethod;
                  valB = b.paymentMethod;
                  break;
              case 'total':
                  valA = a.totalPrice;
                  valB = b.totalPrice;
                  break;
              case 'product': 
                  valA = a.items.length;
                  valB = b.items.length;
                  break;
              default:
                  return 0;
          }

          if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
          if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
          return 0;
      });

      return groups;
  }, [sales, sortConfig, products, packagings]);

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => 
      prev.includes(groupId) ? prev.filter(id => id !== groupId) : [...prev, groupId]
    );
  };

  // --- HELPER: CALCULATE STOCK ---
  const getSoldQuantityForProduct = (p: Product) => {
     if(!p.currentBatchId) return 0;
     const batch = packagings.find(pkg => pkg.id === p.currentBatchId);
     if(!batch) return 0;

     return sales.filter(s => {
         const sBatch = normalizeString(s.finalBatchNumber);
         const bBatch = normalizeString(batch.finalBatchNumber);
         const sName = normalizeString(s.productName);
         const pName = normalizeString(p.name);
         const sFormat = normalizeString(s.format);
         const pFormat = normalizeString(p.potSize);

         if (sBatch && sBatch !== bBatch && !sBatch.includes('inconnu') && sBatch !== 'vrac') return false;

         if (sBatch && bBatch && sBatch === bBatch) {
             if (sFormat) return sFormat === pFormat;
             if (s.quantitySold > 0 && s.totalPrice !== undefined && s.totalPrice > 0) {
                 const unitPrice = s.totalPrice / s.quantitySold;
                 if (Math.abs(unitPrice - p.price) > 2.0) return false; 
             }
             return true; 
         }
         
         if (sName === pName) {
             if (sFormat) return sFormat === pFormat;
             return true; 
         }

         if (sName === (pName + pFormat)) return true;

         return false;
     }).reduce((sum, s) => sum + (Number(s.quantitySold) || 0), 0);
  };

  const getProductStock = (p: Product) => {
      if(!p.currentBatchId) return 0;
      const batch = packagings.find(pkg => pkg.id === p.currentBatchId);
      if(!batch) return 0;

      const initialQty = Number(batch.quantityPots) || 0;
      const soldQty = getSoldQuantityForProduct(p);
      
      return Math.max(0, initialQty - soldQty);
  };

  const getProductYear = (p: Product) => {
      if (!p.currentBatchId) return 'Sans Lot / Année inconnue';
      const batch = packagings.find(b => b.id === p.currentBatchId);
      return batch ? new Date(batch.date).getFullYear().toString() : 'Lot introuvable';
  };

  const productsByYear = products.reduce((acc, product) => {
      const year = getProductYear(product);
      if (!acc[year]) acc[year] = [];
      acc[year].push(product);
      return acc;
  }, {} as Record<string, Product[]>);

  const sortedYears = Object.keys(productsByYear).sort((a, b) => {
      const isANum = !isNaN(Number(a));
      const isBNum = !isNaN(Number(b));
      if (isANum && isBNum) return Number(b) - Number(a); 
      if (!isANum && isBNum) return 1; 
      if (isANum && !isBNum) return -1;
      return a.localeCompare(b);
  });
  
  // --- COST CALCULATION ---
  const getWeightInKg = (size: string): number => {
    const s = size.toLowerCase().replace(/\s+/g, '');
    if(s.includes('1kg') || s.includes('1000g')) return 1;
    if(s.includes('500g') || s.includes('0.5kg')) return 0.5;
    if(s.includes('250g') || s.includes('0.25kg')) return 0.25;
    if(s.includes('125g')) return 0.125;
    const match = s.match(/(\d+(?:\.\d+)?)(?:kg|g)/);
    if(match) {
        let val = parseFloat(match[1]);
        if(s.includes('g') && !s.includes('kg')) val /= 1000;
        return val;
    }
    return 0; // fallback
  };

  const calculateCosts = () => {
    const qty = newPackage.quantityPots || 0;
    const format = newPackage.potSize || '';
    if (qty <= 0) return { material: 0, indirect: 0, total: 0, details: { totalHarvestKg: 0, totalAnnualCosts: 0 } };

    let costPerPot = 0;
    let costPerLabel = 0;
    if (format.includes('250')) { costPerPot = costConfig.jar250; costPerLabel = costConfig.label250; } 
    else if (format.includes('500')) { costPerPot = costConfig.jar500; costPerLabel = costConfig.label500; } 
    else if (format.includes('1kg') || format.includes('1000')) { costPerPot = costConfig.jar1kg; costPerLabel = costConfig.label1kg; }

    const materialCost = qty * (costPerPot + costPerLabel + costConfig.lid);

    const currentYear = getYearFromDateStr(newPackage.date);
    const totalHarvestKg = harvests
        .filter(h => getYearFromDateStr(h.date) === currentYear)
        .reduce((sum, h) => sum + (Number(h.quantityKg) || 0), 0);
    
    const totalAnnualCosts = (costConfig.feedingYearly || 0) + (costConfig.treatmentYearly || 0);

    let indirectCost = 0;
    if (totalHarvestKg > 0) {
        const costPerKg = totalAnnualCosts / totalHarvestKg;
        const batchWeightKg = qty * getWeightInKg(format);
        indirectCost = batchWeightKg * costPerKg;
    }
    return { material: materialCost, indirect: indirectCost, total: materialCost + indirectCost, details: { totalHarvestKg, totalAnnualCosts, currentYear } };
  };
  
  const costs = calculateCosts();

  const getBatchTotalCost = (p: Packaging) => {
      const qty = p.quantityPots || 0;
      const format = p.potSize || '';
      if (qty <= 0) return 0;
      let costPerPot = 0;
      let costPerLabel = 0;
      if (format.includes('250')) { costPerPot = costConfig.jar250; costPerLabel = costConfig.label250; } 
      else if (format.includes('500')) { costPerPot = costConfig.jar500; costPerLabel = costConfig.label500; } 
      else if (format.includes('1kg') || format.includes('1000')) { costPerPot = costConfig.jar1kg; costPerLabel = costConfig.label1kg; }
      
      const materialCost = qty * (costPerPot + costPerLabel + costConfig.lid);
      const batchYear = getYearFromDateStr(p.date);
      const totalHarvestKg = harvests
        .filter(h => getYearFromDateStr(h.date) === batchYear)
        .reduce((sum, h) => sum + (Number(h.quantityKg) || 0), 0);
      
      let indirectCost = 0;
      if (totalHarvestKg > 0) {
          const totalAnnualCosts = (costConfig.feedingYearly || 0) + (costConfig.treatmentYearly || 0);
          const costPerKg = totalAnnualCosts / totalHarvestKg;
          const batchWeightKg = qty * getWeightInKg(format);
          indirectCost = batchWeightKg * costPerKg;
      }
      return materialCost + indirectCost;
  };

  const handleAddHarvest = () => {
    if (!newHarvest.honeyType || !newHarvest.quantityKg) return;
    if (isCustomHarvestHoneyType && newHarvest.honeyType && !honeyTypes.includes(newHarvest.honeyType)) {
        const updatedTypes = [...honeyTypes, newHarvest.honeyType];
        Storage.saveHoneyTypes(updatedTypes);
    }
    const batchId = `VRAC-${new Date().getFullYear()}-${Math.floor(Math.random() * 1000)}`;
    Storage.harvests.add({
      ...newHarvest as Harvest,
      id: Storage.generateId(),
      batchId: batchId
    });
    setNewHarvest({ ...newHarvest, quantityKg: 0, honeyType: '' }); 
    setIsCustomHarvestHoneyType(false);
    refreshData();
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, isEditing = false) => {
    const file = e.target.files?.[0];
    if (file) {
        try {
            const compressedBase64 = await compressImage(file);
            if(isEditing && editingProduct) {
                setEditingProduct({...editingProduct, imageUrl: compressedBase64});
            } else {
                setPackagingProductInfo({...packagingProductInfo, imageUrl: compressedBase64});
            }
        } catch (err) {
            console.error("Image processing error", err);
            alert("Impossible de traiter cette image.");
        }
    }
  };

  const copyDDMToBatch = () => {
      if (!newPackage.ddm) return;
      const [year, month, day] = newPackage.ddm.split('-');
      const formattedDate = `${day}/${month}/${year}`;
      setNewPackage({ ...newPackage, finalBatchNumber: formattedDate });
  };

  const handlePackagingAndProductCreation = () => {
    setFormFeedback(null);
    if(!newPackage.finalBatchNumber) {
        setFormFeedback({type: 'error', message: "Erreur: Le Numéro de lot est obligatoire."});
        return;
    }
    if(!newPackage.quantityPots || newPackage.quantityPots <= 0) {
        setFormFeedback({type: 'error', message: "Erreur: La quantité doit être supérieure à 0."});
        return;
    }
    if (isCustomHoneyType && newPackage.honeyType && !honeyTypes.includes(newPackage.honeyType)) {
        const updatedTypes = [...honeyTypes, newPackage.honeyType];
        Storage.saveHoneyTypes(updatedTypes);
    }
    try {
        const packagingId = Storage.generateId();
        Storage.packaging.add({
            ...newPackage as Packaging,
            id: packagingId,
            harvestBatchIds: [],
            calculatedCost: costs.total
        });
        if (packagingProductInfo.name && packagingProductInfo.price) {
            const newBatchYear = new Date(newPackage.date || new Date()).getFullYear();
            const candidates = products.filter(p => p.name === packagingProductInfo.name && p.potSize === newPackage.potSize);
            let productToUpdate = null;
            for (const p of candidates) {
                if(p.currentBatchId) {
                    const linkedBatch = packagings.find(b => b.id === p.currentBatchId);
                    if(linkedBatch) {
                        const batchYear = new Date(linkedBatch.date).getFullYear();
                        if(batchYear === newBatchYear) {
                            productToUpdate = p;
                            break;
                        }
                    }
                } else {
                     productToUpdate = p;
                     break;
                }
            }
            if (productToUpdate) {
                Storage.products.update({
                    ...productToUpdate,
                    price: packagingProductInfo.price,
                    imageUrl: packagingProductInfo.imageUrl || productToUpdate.imageUrl,
                    currentBatchId: packagingId
                });
            } else {
                Storage.products.add({
                    id: Storage.generateId(),
                    name: packagingProductInfo.name,
                    potSize: newPackage.potSize || '500g',
                    price: packagingProductInfo.price,
                    imageUrl: packagingProductInfo.imageUrl,
                    currentBatchId: packagingId
                });
            }
        }
        const today = new Date().toISOString().split('T')[0];
        setNewPackage({ 
            date: today, 
            quantityPots: 0, 
            potSize: '500g', 
            finalBatchNumber: '', 
            ddm: calculateDDM(today),
            honeyType: ''
        });
        setIsCustomPotSize(false);
        setIsCustomHoneyType(false);
        setPackagingProductInfo({ name: '', price: 0, imageUrl: '' });
        refreshData();
        setFormFeedback({type: 'success', message: "✅ Lot enregistré avec succès !"});
        setTimeout(() => setFormFeedback(null), 5000);
    } catch (error: any) {
        setFormFeedback({type: 'error', message: "Erreur de sauvegarde."});
    }
  };

  const handleSaveProductEdit = () => {
      if(!editingProduct) return;
      Storage.products.update(editingProduct);
      if (editingProduct.currentBatchId) {
          const linkedBatch = packagings.find(b => b.id === editingProduct.currentBatchId);
          if (linkedBatch && linkedBatch.quantityPots !== editingBatchInitialQty) {
              Storage.packaging.update({
                  ...linkedBatch,
                  quantityPots: editingBatchInitialQty
              });
          }
      }
      setEditingProduct(null);
      refreshData();
  };

  // POS Logic
  const addToCart = (product: Product) => {
      setCart(prev => {
          const existing = prev.find(item => item.product.id === product.id);
          if (existing) {
              return prev.map(item => item.product.id === product.id ? {...item, quantity: item.quantity + 1} : item);
          }
          return [...prev, { product, quantity: 1 }];
      });
      setPosError(false); // Clear error on interaction

      // ANIMATION LOGIC
      const key = Date.now();
      setAnimatingItems(prev => [...prev, {id: product.id, key}]);
      setCartBounce(true);
      setTimeout(() => setCartBounce(false), 300); // Reset cart bounce

      // Clean up item animation after it finishes
      setTimeout(() => {
           setAnimatingItems(prev => prev.filter(i => i.key !== key));
      }, 700);
  };

  const removeFromCart = (productId: string) => {
      setCart(prev => prev.filter(item => item.product.id !== productId));
  };

  const cartTotal = cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);

  const handleCheckout = () => {
      if(cart.length === 0) return;
      
      // VALIDATION: Check if either a client is selected OR (Name AND Location are filled manually)
      const isClientSelected = !!posSelectedClientId;
      const isManualClientFilled = clientSearchTerm.trim() !== ''; 
      
      // If nothing is selected and name is empty, ERROR
      if (!isClientSelected && !isManualClientFilled) {
          setPosError(true);
          return;
      }
      
      try {
        let finalClientId = posSelectedClientId;
        let finalClientName = 'Vente Directe';
        
        // 1. Existing Client Selected
        if (isClientSelected) {
             const client = clients.find(c => c.id === posSelectedClientId);
             if(client) finalClientName = client.name;
        } 
        // 2. Manual Client Entry -> CREATE NEW CLIENT
        else if (isManualClientFilled) {
             const newClient: Client = {
                 id: Storage.generateId(),
                 name: clientSearchTerm,
                 address: posClientLocation
             };
             // Add to DB
             Storage.clients.add(newClient);
             
             // Use new ID for the sale link
             finalClientId = newClient.id;
             finalClientName = newClient.name;
        } 
        // 3. Fallback (Only location entered - Rare due to validation)
        else if (posClientLocation.trim()) {
             finalClientName = posClientLocation;
        }

        cart.forEach(item => {
            const linkedBatchId = item.product.currentBatchId;
            const linkedBatch = packagings.find(p => p.id === linkedBatchId);
            const finalBatchNumber = linkedBatch ? linkedBatch.finalBatchNumber : "LOT-INCONNU";
            const finalPrice = posPaymentMethod === 'DON' ? 0 : item.product.price * item.quantity;

            Storage.sales.add({
                id: Storage.generateId(),
                date: saleDate, 
                finalBatchNumber,
                quantitySold: item.quantity,
                buyerType: 'DIRECT',
                buyerName: finalClientName,
                clientId: finalClientId || undefined, // Link to existing or new ID
                paymentMethod: posPaymentMethod,
                totalPrice: finalPrice,
                productName: item.product.name,
                format: item.product.potSize
            });
        });

        setCart([]);
        setPosClientLocation('');
        setPosSelectedClientId('');
        setClientSearchTerm('');
        setPosError(false);
        setIsMobileCartOpen(false);
        
        if(posPaymentMethod === 'DON') {
            alert(`Donation enregistrée ! Le stock a été déduit.`);
            setPosPaymentMethod('ESPECES');
        } else {
            const successMsg = isManualClientFilled ? `Vente enregistrée et client "${finalClientName}" créé !` : `Vente enregistrée !`;
            alert(successMsg);
        }
        
        refreshData();
      } catch (error: any) {
         alert("Erreur lors de l'enregistrement de la vente.");
      }
  };
  
  const confirmDeleteSale = () => {
      if (saleToDelete) {
          Storage.sales.delete(saleToDelete);
          setSaleToDelete(null);
          refreshData();
      }
  };

  const startEditingSale = (sale: Sale) => {
      setEditingSaleId(sale.id);
      setTempSaleData({...sale});
      const groupId = `${sale.date}-${(sale.buyerName || 'Inconnu').trim()}-${sale.paymentMethod}`;
      if (!expandedGroups.includes(groupId)) {
          setExpandedGroups(prev => [...prev, groupId]);
      }
  };

  const saveSaleEdit = () => {
      if (editingSaleId && tempSaleData.id) {
          Storage.sales.update(tempSaleData as Sale);
          setEditingSaleId(null);
          setTempSaleData({});
          refreshData();
      }
  };

  const cancelSaleEdit = () => {
      setEditingSaleId(null);
      setTempSaleData({});
  };

  const STANDARD_SIZES = ['125g', '250g', '500g', '1kg', '3kg', 'Seau'];

  const SortableHeader = ({ label, sortKey, align = 'left' }: { label: string, sortKey: string, align?: 'left' | 'center' | 'right' }) => (
      <th 
        className={`px-4 py-3 cursor-pointer hover:bg-green-100 transition select-none text-${align}`}
        onClick={() => handleSort(sortKey)}
      >
          <div className={`flex items-center gap-1 ${align === 'center' ? 'justify-center' : align === 'right' ? 'justify-end' : ''}`}>
              {label}
              {sortConfig.key === sortKey ? (
                  sortConfig.direction === 'asc' ? <ArrowUp size={14}/> : <ArrowDown size={14}/>
              ) : (
                  <ArrowUpDown size={14} className="text-green-300 opacity-0 group-hover:opacity-100"/>
              )}
          </div>
      </th>
  );

  return (
    <div className="space-y-6">
       <style>{`
          @keyframes flyCart {
            0% { transform: scale(0.5) translateY(0) rotate(0deg); opacity: 1; }
            40% { transform: scale(1.5) translateY(-30px) rotate(-10deg); opacity: 1; }
            100% { transform: scale(0.2) translateY(300px) translateX(200px) rotate(45deg); opacity: 0; }
          }
          .animate-fly-cart {
            animation: flyCart 0.8s ease-in-out forwards;
          }
          .animate-bounce-cart {
            animation: bounce 0.5s;
          }
       `}</style>
       <ConfirmModal 
            isOpen={!!saleToDelete} 
            title="Supprimer la vente ?" 
            message="Cette action supprimera définitivement cette ligne du livre de recettes."
            onConfirm={confirmDeleteSale}
            onCancel={() => setSaleToDelete(null)}
       />
    
       <div className="flex justify-between items-center mb-4">
        <div className="flex gap-2 pb-2 overflow-x-auto flex-grow no-scrollbar">
            {[
            { id: 'HARVEST', label: 'Récoltes', icon: Archive },
            { id: 'PACKAGING', label: 'Mise en Pot', icon: Package },
            { id: 'PRODUCTS', label: 'Catalogue', icon: Store },
            { id: 'POS', label: 'Vente / Caisse', icon: ShoppingCart },
            { id: 'REVENUE', label: 'Livre de Recettes', icon: BookOpenText },
            ].map((tab) => (
            <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-3 rounded-full whitespace-nowrap text-sm font-medium transition-colors ${
                activeTab === tab.id 
                    ? 'bg-amber-600 text-white shadow-md' 
                    : 'bg-white text-gray-600 hover:bg-amber-50 border border-gray-200'
                }`}
                title={tab.label}
            >
                <tab.icon size={20} />
                <span className="hidden md:inline">{tab.label}</span>
            </button>
            ))}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 md:p-6 min-h-[500px]">
        
        {/* HARVEST */}
        {activeTab === 'HARVEST' && (
          <div>
            {/* Same Harvest UI */}
            <h2 className="text-xl font-bold text-gray-800 mb-4">Entrées de Miel (Vrac)</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 bg-amber-50 p-4 rounded-xl border border-amber-100">
               <input type="date" className="border px-3 h-11 rounded-lg bg-white appearance-none" value={newHarvest.date} onChange={e => setNewHarvest({...newHarvest, date: e.target.value})} />
               <select className="border px-3 h-11 rounded-lg bg-white" value={newHarvest.apiaryId} onChange={e => setNewHarvest({...newHarvest, apiaryId: e.target.value})}>
                 <option value="">Choisir un rucher...</option>
                 {apiaries.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
               </select>
               
               {!isCustomHarvestHoneyType ? (
                   <select 
                        className="border px-3 h-11 rounded-lg bg-white" 
                        value={honeyTypes.includes(newHarvest.honeyType || '') ? newHarvest.honeyType : ''}
                        onChange={e => {
                            const val = e.target.value;
                            if (val === 'NEW_TYPE') {
                                setIsCustomHarvestHoneyType(true);
                                setNewHarvest({...newHarvest, honeyType: ''});
                            } else {
                                setNewHarvest({...newHarvest, honeyType: val});
                            }
                        }}
                   >
                       <option value="">Type de Miel...</option>
                       {honeyTypes.map(t => <option key={t} value={t}>{t}</option>)}
                       <option value="NEW_TYPE" className="font-bold text-blue-600 bg-blue-50">+ Ajouter un nouveau...</option>
                   </select>
               ) : (
                    <div className="flex gap-1 h-11">
                        <input 
                            type="text" 
                            className="w-full border px-3 rounded-lg bg-white" 
                            placeholder="Nouveau type..."
                            value={newHarvest.honeyType}
                            onChange={e => setNewHarvest({...newHarvest, honeyType: e.target.value})}
                            autoFocus
                        />
                        <button 
                            onClick={() => { setIsCustomHarvestHoneyType(false); setNewHarvest({...newHarvest, honeyType: ''}); }}
                            className="px-2 text-gray-500 bg-gray-100 rounded hover:bg-gray-200 h-full flex items-center justify-center"
                            title="Revenir à la liste"
                        >
                            <X size={16} />
                        </button>
                    </div>
               )}

               <input type="number" placeholder="Quantité (kg)" className="border px-3 h-11 rounded-lg bg-white" value={newHarvest.quantityKg || ''} onChange={e => setNewHarvest({...newHarvest, quantityKg: parseFloat(e.target.value)})} />
               
               <button onClick={handleAddHarvest} className="bg-amber-500 text-white px-3 h-11 rounded-lg col-span-1 md:col-span-2 lg:col-span-4 font-bold hover:bg-amber-600 transition">
                 Enregistrer la récolte
               </button>
            </div>

            <div className="space-y-2">
                {harvests.map(h => (
                    <div key={h.id} className="flex justify-between p-3 border-b">
                        <div>
                            <span className="font-bold text-amber-800">{h.honeyType}</span>
                            <span className="text-gray-500 text-sm ml-2">({h.quantityKg} kg) - {getYearFromDateStr(h.date)}</span>
                            <div className="text-xs text-gray-400">Lot interne: {h.batchId}</div>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-600">{new Date(h.date).toLocaleDateString()}</span>
                            <button onClick={() => { Storage.harvests.delete(h.id); refreshData(); }} className="text-red-400 hover:text-red-600"><Trash2 size={16} /></button>
                        </div>
                    </div>
                ))}
            </div>
          </div>
        )}

        {/* PACKAGING - Code omitted for brevity as it was not changed */}
        {activeTab === 'PACKAGING' && (
            <div>
                 {/* Re-using existing Packaging UI */}
                 <h2 className="text-xl font-bold text-gray-800 mb-2">Conditionnement & Mise en rayon</h2>
                 <p className="text-sm text-gray-500 mb-6">Créez votre lot sanitaire ET mettez à jour la caisse en même temps.</p>
                 {formFeedback && (
                     <div className={`p-4 mb-4 rounded-xl border flex items-center gap-3 animate-pulse-short ${
                         formFeedback.type === 'success' ? 'bg-green-100 border-green-300 text-green-800' : 'bg-red-100 border-red-300 text-red-800'
                     }`}>
                         {formFeedback.type === 'success' ? <Check className="w-6 h-6"/> : <AlertTriangle className="w-6 h-6"/>}
                         <span className="font-bold text-lg">{formFeedback.message}</span>
                     </div>
                 )}
                 <div className="bg-amber-50 p-6 rounded-xl border border-amber-100">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <h3 className="font-bold text-amber-800 border-b border-amber-200 pb-2">1. Traçabilité (Lot)</h3>
                            <div>
                                <label className="text-xs text-gray-500">Type de Miel</label>
                                {!isCustomHoneyType ? (
                                    <select 
                                        className="w-full border px-3 h-11 rounded-lg bg-white"
                                        value={honeyTypes.includes(newPackage.honeyType || '') ? newPackage.honeyType : ''}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            if (val === 'NEW_TYPE') {
                                                setIsCustomHoneyType(true);
                                                setNewPackage({...newPackage, honeyType: ''});
                                            } else {
                                                setNewPackage({...newPackage, honeyType: val});
                                            }
                                        }}
                                    >
                                        <option value="">Sélectionner le miel...</option>
                                        {honeyTypes.map(t => <option key={t} value={t}>{t}</option>)}
                                        <option value="NEW_TYPE" className="font-bold text-blue-600 bg-blue-50">+ Ajouter un nouveau...</option>
                                    </select>
                                ) : (
                                    <div className="flex gap-1 h-11">
                                        <input type="text" className="w-full border px-3 rounded-lg bg-white" placeholder="Nouveau type" value={newPackage.honeyType} onChange={e => setNewPackage({...newPackage, honeyType: e.target.value})} autoFocus />
                                        <button onClick={() => { setIsCustomHoneyType(false); setNewPackage({...newPackage, honeyType: ''}); }} className="px-2 text-gray-500 bg-gray-100 rounded hover:bg-gray-200 h-full flex items-center justify-center"><X size={16} /></button>
                                    </div>
                                )}
                            </div>
                            <div>
                                <label className="text-xs text-gray-500">Date de mise en pot</label>
                                <input type="date" className="w-full border px-3 h-11 rounded-lg bg-white appearance-none" value={newPackage.date} onChange={e => { const d = e.target.value; setNewPackage({ ...newPackage, date: d, ddm: calculateDDM(d) }); }} />
                            </div>
                            <div>
                                <label className="text-xs text-gray-500">DDM</label>
                                <div className="flex gap-2">
                                    <input type="date" className="flex-1 border px-3 h-11 rounded-lg bg-white appearance-none" value={newPackage.ddm} onChange={e => setNewPackage({...newPackage, ddm: e.target.value})} />
                                    <button onClick={copyDDMToBatch} className="bg-amber-200 hover:bg-amber-300 text-amber-800 px-3 h-11 rounded-lg flex items-center justify-center" disabled={!newPackage.ddm}><ArrowDown size={16} /></button>
                                </div>
                            </div>
                            <div>
                                <label className="text-xs text-gray-500">Numéro de Lot</label>
                                <input type="text" className="w-full border-2 border-amber-300 px-3 h-11 rounded-lg bg-white font-mono" value={newPackage.finalBatchNumber} onChange={e => setNewPackage({...newPackage, finalBatchNumber: e.target.value})} />
                            </div>
                            <div className="flex gap-2">
                                <input type="number" placeholder="Quantité (Pots)" className="flex-1 border px-3 h-11 rounded-lg bg-white" value={newPackage.quantityPots || ''} onChange={e => setNewPackage({...newPackage, quantityPots: parseFloat(e.target.value)})} />
                                <div className="flex-1 h-11">
                                    {!isCustomPotSize ? (
                                        <select className="w-full border px-3 rounded-lg bg-white h-full" value={STANDARD_SIZES.includes(newPackage.potSize || '') ? newPackage.potSize : 'custom'} onChange={(e) => { if(e.target.value === 'custom') { setIsCustomPotSize(true); setNewPackage({...newPackage, potSize: ''}); } else { setNewPackage({...newPackage, potSize: e.target.value}); } }}>
                                            {STANDARD_SIZES.map(size => <option key={size} value={size}>{size}</option>)}
                                            <option value="custom">Autre / Personnalisé...</option>
                                        </select>
                                    ) : (
                                        <div className="flex gap-1 h-full">
                                            <input type="text" className="w-full border px-3 rounded-lg bg-white h-full" value={newPackage.potSize} onChange={e => setNewPackage({...newPackage, potSize: e.target.value})} autoFocus />
                                            <button onClick={() => { setIsCustomPotSize(false); setNewPackage({...newPackage, potSize: '500g'}); }} className="px-2 text-gray-500 bg-gray-100 rounded hover:bg-gray-200 h-full flex items-center justify-center"><X size={16} /></button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="space-y-4">
                            <h3 className="font-bold text-gray-700 border-b border-gray-200 pb-2">2. Info Caisse</h3>
                            <div><label className="text-xs text-gray-500">Nom commercial</label><input type="text" className="w-full border px-3 h-11 rounded-lg bg-white" value={packagingProductInfo.name} onChange={e => setPackagingProductInfo({...packagingProductInfo, name: e.target.value})} /></div>
                            <div>
                                <label className="text-xs text-gray-500">Prix & Photo</label>
                                <div className="flex gap-2 h-11">
                                    <div className="relative flex-1 h-full"><input type="number" className="w-full border px-3 h-full rounded-lg pl-8 bg-white" value={packagingProductInfo.price || ''} onChange={e => setPackagingProductInfo({...packagingProductInfo, price: parseFloat(e.target.value)})} /><span className="absolute left-3 top-3 text-gray-500">€</span></div>
                                    <label className="flex-1 flex items-center justify-center gap-2 cursor-pointer bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-sm h-full"><ImagePlus size={16} /> {packagingProductInfo.imageUrl ? "OK" : "Photo"}<input type="file" accept="image/*" onChange={(e) => handleImageUpload(e)} className="hidden" /></label>
                                </div>
                            </div>
                            <button onClick={handlePackagingAndProductCreation} className="mt-6 w-full bg-amber-600 text-white p-3 rounded-lg font-bold hover:bg-amber-700 transition shadow-sm flex justify-center items-center gap-2"><Save size={20} /> Enregistrer le Lot</button>
                        </div>
                    </div>
                 </div>
                 <div className="space-y-2 mt-6">
                    <h3 className="font-bold text-gray-800">Historique des Lots</h3>
                    {packagings.map(p => (
                        <div key={p.id} className="p-3 border-b flex justify-between items-center bg-white rounded-lg border border-gray-100">
                            <div><span className="font-bold text-amber-800">{p.quantityPots} x {p.potSize}</span><span className="text-gray-500 text-sm ml-2">Lot: {p.finalBatchNumber}</span></div>
                            <button onClick={() => { if(window.confirm('Supprimer ?')) { Storage.packaging.delete(p.id); refreshData(); } }} className="text-red-400 hover:text-red-600"><Trash2 size={16}/></button>
                        </div>
                    ))}
                 </div>
            </div>
        )}

        {/* PRODUCTS - Same logic */}
        {activeTab === 'PRODUCTS' && (
            <div>
                 <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2"><Store /> Catalogue Produits</h2>
                 {editingProduct && (
                     <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                         <div className="bg-white rounded-xl p-6 w-full max-w-sm">
                             <h3 className="text-lg font-bold mb-4">Modifier {editingProduct.name}</h3>
                             <div className="space-y-4">
                                 <div><label className="text-xs text-gray-500">Prix (€)</label><input type="number" className="w-full border px-3 h-11 rounded-lg bg-white" value={editingProduct.price} onChange={e => setEditingProduct({...editingProduct, price: parseFloat(e.target.value)})} /></div>
                                 <div className="flex gap-2 pt-2"><button onClick={() => setEditingProduct(null)} className="flex-1 bg-gray-200 text-gray-800 py-2 rounded-lg font-medium">Annuler</button><button onClick={handleSaveProductEdit} className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-medium">Enregistrer</button></div>
                             </div>
                         </div>
                     </div>
                 )}
                 <div className="space-y-6">
                     {sortedYears.map(year => (
                         <div key={year}>
                             <h3 className="font-bold text-gray-500 border-b mb-3 pb-1">{year}</h3>
                             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {productsByYear[year].map(p => (
                                    <div key={p.id} className="bg-white border rounded-xl p-3 flex gap-3 items-center shadow-sm relative overflow-hidden">
                                        <div className="w-16 h-16 bg-gray-100 rounded-lg flex-shrink-0 overflow-hidden border">
                                            {p.imageUrl ? <img src={p.imageUrl} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-gray-300"><Store size={24}/></div>}
                                        </div>
                                        <div className="flex-grow">
                                            <div className="font-bold text-gray-800">{p.name}</div>
                                            <div className="text-sm text-gray-500">{p.potSize} &bull; <span className="text-black font-bold">{p.price.toFixed(2)} €</span></div>
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <button onClick={() => { setEditingProduct(p); setEditingBatchInitialQty(0); }} className="p-1.5 bg-gray-100 rounded text-blue-600 hover:bg-blue-100"><Edit2 size={16}/></button>
                                            <button onClick={() => { if(window.confirm('Supprimer ?')) { Storage.products.delete(p.id); refreshData(); } }} className="p-1.5 bg-gray-100 rounded text-red-400 hover:bg-red-100"><Trash2 size={16}/></button>
                                        </div>
                                    </div>
                                ))}
                             </div>
                         </div>
                     ))}
                 </div>
            </div>
        )}

        {/* POS / CAISSE */}
        {activeTab === 'POS' && (
            <div className="flex flex-col md:flex-row gap-6 h-full relative">
                {/* MOBILE CART TOGGLE FAB */}
                <button 
                    onClick={() => setIsMobileCartOpen(true)}
                    className={`md:hidden fixed bottom-24 right-4 bg-amber-600 text-white p-4 rounded-full shadow-2xl z-30 flex items-center gap-2 ${cartBounce ? 'animate-bounce-cart' : 'animate-bounce-short'}`}
                >
                    <ShoppingCart size={24} />
                    <span className="font-bold bg-white text-amber-600 rounded-full w-6 h-6 flex items-center justify-center text-xs">{cart.length}</span>
                </button>

                {/* MOBILE OVERLAY */}
                {isMobileCartOpen && (
                    <div 
                        className="fixed inset-0 bg-black/50 z-30 md:hidden backdrop-blur-sm transition-opacity"
                        onClick={() => setIsMobileCartOpen(false)}
                    />
                )}

                {/* LEFT: PRODUCTS GRID */}
                <div className="flex-grow md:w-2/3">
                    <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2"><ShoppingCart/> Caisse Enregistreuse</h2>
                    
                    <div className="space-y-8 pb-20">
                    {sortedYears.map(year => (
                        <div key={year}>
                            <h3 className="font-bold text-gray-400 uppercase text-sm mb-3 border-b pb-1">{year}</h3>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                {productsByYear[year].map(p => {
                                    const stock = getProductStock(p);
                                    return (
                                        <button 
                                            key={p.id} 
                                            disabled={stock <= 0}
                                            onClick={() => addToCart(p)}
                                            className={`relative flex flex-col items-center p-3 rounded-xl border transition-all text-left ${stock > 0 ? 'bg-white hover:border-amber-400 hover:shadow-md cursor-pointer' : 'bg-gray-50 opacity-60 cursor-not-allowed'}`}
                                        >
                                            {/* ANIMATION OVERLAY */}
                                            {animatingItems.filter(i => i.id === p.id).map(anim => (
                                                <div key={anim.key} className="absolute inset-0 flex items-center justify-center pointer-events-none z-50 animate-fly-cart">
                                                    <div className="text-4xl filter drop-shadow-lg transform -scale-x-100">
                                                        🐝
                                                    </div>
                                                </div>
                                            ))}

                                            <div className="w-full aspect-square bg-gray-100 rounded-lg mb-2 overflow-hidden relative">
                                                {p.imageUrl ? (
                                                    <img src={p.imageUrl} className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-amber-200"><Store size={32}/></div>
                                                )}
                                                {stock <= 0 && <div className="absolute inset-0 bg-white/60 flex items-center justify-center font-bold text-red-600 -rotate-12 border-2 border-red-600 rounded-lg m-2">ÉPUISÉ</div>}
                                            </div>
                                            <div className="w-full">
                                                <div className="font-bold text-sm text-gray-800 truncate">{p.name}</div>
                                                <div className="flex justify-between items-center mt-1">
                                                    <span className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">{p.potSize}</span>
                                                    <span className="font-bold text-amber-600">{p.price.toFixed(2)}€</span>
                                                </div>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                    </div>
                </div>

                {/* RIGHT: CART (Sticky Desktop / Slide-over Mobile) */}
                <div 
                    className={`
                        md:w-1/3 bg-white shadow-xl border-l md:border-l-0 md:rounded-xl md:border 
                        md:sticky md:top-4 flex flex-col h-[calc(100vh-100px)] 
                        fixed right-0 top-0 bottom-0 w-80 z-40 transform transition-transform duration-300 
                        ${isMobileCartOpen ? 'translate-x-0' : 'translate-x-full'} md:translate-x-0
                    `} 
                    id="cart-panel"
                >
                    <div className="p-4 bg-gray-50 border-b flex justify-between items-center">
                        <h3 className="font-bold text-gray-800 flex items-center gap-2"><ShoppingCart size={20}/> Panier</h3>
                        <div className="flex items-center gap-3">
                            <div className={`relative w-14 h-14 flex items-center justify-center transition-transform ${cartBounce ? 'scale-125 duration-100' : 'scale-100 duration-300'}`} title="Nombre d'articles">
                                <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full text-amber-500 drop-shadow-md">
                                    <path d="M12 2l9 5.2v10.4l-9 5.2-9-5.2V7.2L12 2z" />
                                </svg>
                                <span className="absolute text-white font-bold text-xl leading-none pt-1">{cart.length}</span>
                            </div>
                            <button onClick={() => setIsMobileCartOpen(false)} className="md:hidden text-gray-500 hover:text-gray-800">
                                <X size={24}/>
                            </button>
                        </div>
                    </div>

                    {/* SALES INFO SECTION (Date + Client) */}
                    <div className="p-4 border-b bg-blue-50/50 space-y-3">
                        {/* 1. DATE */}
                        <div>
                            <label className="text-xs font-bold text-blue-800 uppercase mb-1 flex items-center gap-1">
                                <Calendar size={12}/> Date de vente
                            </label>
                            <div className="flex items-center bg-white border border-blue-200 rounded-lg p-2 shadow-sm">
                                <Calendar size={16} className="text-blue-300 mr-2" />
                                <input 
                                    type="date" 
                                    className="flex-grow bg-transparent text-sm font-bold text-gray-700 outline-none w-full appearance-none"
                                    value={saleDate} 
                                    onChange={e => setSaleDate(e.target.value)} 
                                />
                            </div>
                        </div>

                        {/* 2. CLIENT */}
                        <div>
                            <div className={`text-xs font-bold uppercase mb-1 flex items-center gap-1 ${posError ? 'text-red-600' : 'text-blue-800'}`}>
                                <User size={12}/> Sélection ou création de clients
                            </div>
                            
                            {/* Client Search Box */}
                            <div className="relative z-20">
                                <div 
                                    className={`flex items-center bg-white border rounded-lg p-2 cursor-pointer hover:bg-blue-50 transition shadow-sm ${posError ? 'border-red-500 ring-1 ring-red-500' : 'border-blue-200'}`} 
                                    onClick={() => setShowClientResults(!showClientResults)}
                                >
                                    <Search size={16} className="text-blue-300 mr-2 flex-shrink-0"/>
                                    {posSelectedClientId ? (
                                        <div className="flex-grow font-bold text-blue-900 text-sm truncate">
                                            {clients.find(c => c.id === posSelectedClientId)?.name}
                                        </div>
                                    ) : (
                                        <input 
                                            type="text" 
                                            placeholder="Rechercher OU Nom Prénom..." 
                                            className="flex-grow outline-none bg-transparent text-sm placeholder-blue-300 w-full min-w-0 font-medium"
                                            value={clientSearchTerm}
                                            onChange={(e) => {
                                                setClientSearchTerm(e.target.value); 
                                                setPosSelectedClientId(''); 
                                                setShowClientResults(true);
                                                setPosError(false); // Clear error on typing
                                            }}
                                            onClick={(e) => e.stopPropagation()}
                                        />
                                    )}
                                    {posSelectedClientId && (
                                        <button onClick={(e) => {e.stopPropagation(); setPosSelectedClientId(''); setClientSearchTerm('');}} className="text-gray-400 hover:text-red-500 ml-2">
                                            <X size={16}/>
                                        </button>
                                    )}
                                </div>

                                {/* Dropdown Results - MODIFIED: Only show if there ARE results to prevent overlaying */}
                                {showClientResults && clientSearchTerm && !posSelectedClientId && clients.filter(c => c.name.toLowerCase().includes(clientSearchTerm.toLowerCase())).length > 0 && (
                                    <div className="absolute top-full left-0 w-full bg-white shadow-xl rounded-lg mt-1 border border-gray-100 max-h-48 overflow-y-auto z-50">
                                        {clients
                                            .filter(c => c.name.toLowerCase().includes(clientSearchTerm.toLowerCase()))
                                            .map(c => (
                                            <div 
                                                key={c.id} 
                                                className="p-2 hover:bg-blue-50 cursor-pointer text-sm border-b last:border-0"
                                                onClick={() => {
                                                    setPosSelectedClientId(c.id);
                                                    setClientSearchTerm('');
                                                    setShowClientResults(false);
                                                    setPosClientLocation(''); // Clear location if client selected
                                                    setPosError(false);
                                                }}
                                            >
                                                <div className="font-bold text-gray-800">{c.name}</div>
                                                <div className="text-xs text-gray-500">{c.address}</div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* OR Separator & Location */}
                            {!posSelectedClientId && (
                                <div className="mt-2">
                                    <div className="flex items-center gap-2 mb-1">
                                        <div className="h-px bg-blue-200 flex-grow"></div>
                                        <span className="text-[10px] text-blue-400 font-bold uppercase">Adresse / Entreprise</span>
                                        <div className="h-px bg-blue-200 flex-grow"></div>
                                    </div>
                                    <div className={`flex items-center bg-white border rounded-lg p-2 shadow-sm ${posError && !posClientLocation && !clientSearchTerm ? 'border-red-500 ring-1 ring-red-500' : 'border-blue-200'}`}>
                                        <MapPin size={16} className="text-blue-300 mr-2 flex-shrink-0" />
                                        <input 
                                            type="text" 
                                            placeholder="Adresse ou Nom Entreprise..." 
                                            className="flex-grow bg-transparent text-sm outline-none placeholder-blue-300 w-full min-w-0"
                                            value={posClientLocation}
                                            onChange={e => { setPosClientLocation(e.target.value); setPosError(false); }}
                                        />
                                    </div>
                                    
                                    {posError && (
                                        <p className="text-xs text-red-600 mt-1 font-bold animate-pulse">Veuillez renseigner un nom OU un lieu/entreprise.</p>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex-grow overflow-y-auto p-4 space-y-3">
                        {cart.length === 0 && (
                            <div className="text-center text-gray-400 py-10 flex flex-col items-center">
                                <ShoppingCart size={48} className="mb-2 opacity-20"/>
                                <p>Votre panier est vide</p>
                            </div>
                        )}
                        {cart.map((item, idx) => (
                            <div key={idx} className="flex justify-between items-center bg-white border border-gray-100 p-2 rounded-lg shadow-sm">
                                <div>
                                    <div className="font-bold text-sm text-gray-800">{item.product.name}</div>
                                    <div className="text-xs text-gray-500">{item.product.potSize} x {item.quantity}</div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="font-mono font-bold text-gray-700">{(item.product.price * item.quantity).toFixed(2)}€</div>
                                    <button onClick={() => removeFromCart(item.product.id)} className="text-red-300 hover:text-red-500"><Trash2 size={16}/></button>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="p-4 bg-gray-50 border-t space-y-4">
                        <div className="flex justify-between items-center text-xl font-bold text-gray-900">
                            <span>Total</span>
                            <span>{cartTotal.toFixed(2)} €</span>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-2">
                            {['ESPECES', 'CB', 'CHEQUE', 'VIREMENT', 'DON', 'AUTRE'].map(method => (
                                <button 
                                    key={method}
                                    onClick={() => setPosPaymentMethod(method as PaymentMethod)}
                                    className={`text-xs py-2 rounded border font-medium transition ${posPaymentMethod === method ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-600 hover:bg-gray-100'}`}
                                >
                                    {method}
                                </button>
                            ))}
                        </div>

                        <button 
                            onClick={handleCheckout} 
                            disabled={cart.length === 0}
                            className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition flex justify-center items-center gap-2"
                        >
                            <Check size={20}/> Encaisser
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* REVENUE BOOK */}
        {activeTab === 'REVENUE' && (
          <div>
            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                <BookOpenText /> Livre de Recettes
            </h2>
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-100">
                        <tr>
                            <SortableHeader label="Date" sortKey="date" />
                            <SortableHeader label="Client / Lieu" sortKey="client" />
                            <SortableHeader label="Produits / Détail" sortKey="product" />
                            <SortableHeader label="Paiement" sortKey="payment" />
                            <SortableHeader label="Total Ticket" sortKey="total" align="right" />
                        </tr>
                        </thead>
                    </table>
                </div>

                <div className="divide-y divide-gray-100">
                    {groupedSales.length === 0 && (
                        <div className="text-center py-8 text-gray-500 italic">Aucune vente enregistrée.</div>
                    )}

                    {groupedSales.map(group => {
                        const isExpanded = expandedGroups.includes(group.id) || group.items.some(i => editingSaleId === i.id);

                        return (
                            <div key={group.id} className="bg-white">
                                {/* Group Header (Parent Row) */}
                                <div 
                                    onClick={() => toggleGroup(group.id)}
                                    className="flex items-center py-3 px-4 hover:bg-gray-50 cursor-pointer transition border-l-4 border-transparent hover:border-amber-400"
                                >
                                    {/* Expand Icon */}
                                    <div className="w-8 text-gray-400 flex-shrink-0">
                                        {isExpanded ? <ChevronDown size={18}/> : <ChevronRight size={18}/>}
                                    </div>

                                    {/* Date */}
                                    <div className="w-24 md:w-32 flex-shrink-0 text-gray-700">
                                        {new Date(group.date).toLocaleDateString('fr-FR')}
                                    </div>

                                    {/* Client */}
                                    <div className="flex-grow font-bold text-gray-800 truncate pr-2">
                                        {group.buyerName}
                                    </div>
                                    
                                    {/* Items Count Badge */}
                                    <div className="hidden md:block w-32 flex-shrink-0 text-xs text-gray-500">
                                        {group.items.length} article{group.items.length > 1 ? 's' : ''}
                                    </div>

                                    {/* Payment */}
                                    <div className="w-24 flex-shrink-0">
                                        <span className={`text-xs px-2 py-1 rounded font-bold ${group.paymentMethod === 'ESPECES' ? 'bg-green-100 text-green-700' : group.paymentMethod === 'DON' ? 'bg-pink-100 text-pink-700' : 'bg-gray-100 text-gray-600'}`}>
                                            {group.paymentMethod}
                                        </span>
                                    </div>

                                    {/* Total */}
                                    <div className="w-24 flex-shrink-0 text-right font-bold text-lg text-gray-900">
                                        {group.totalPrice.toFixed(2)} €
                                    </div>
                                </div>

                                {/* Detail Rows (Children) */}
                                {isExpanded && (
                                    <div className="bg-gray-50 px-4 md:pl-16 md:pr-4 py-2 border-t border-gray-100 ml-0 md:ml-4 border-l-2 border-amber-100">
                                        <table className="w-full text-sm">
                                            <thead className="text-xs text-gray-400 uppercase text-left">
                                                <tr>
                                                    <th className="py-1">Produit</th>
                                                    <th className="py-1">Format</th>
                                                    <th className="py-1">Qté</th>
                                                    <th className="py-1 text-right">Prix Total</th>
                                                    <th className="py-1 text-right w-20">Action</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-200">
                                                {group.items.map(s => {
                                                    const isEditing = editingSaleId === s.id;
                                                    // CALCULATE YEAR
                                                    const linkedBatch = packagings.find(p => p.finalBatchNumber === s.finalBatchNumber);
                                                    const batchYear = linkedBatch ? new Date(linkedBatch.date).getFullYear() : '';
                                                    const displayFormat = getDisplayFormat(s);

                                                    return (
                                                        <tr key={s.id} className={isEditing ? 'bg-blue-50' : ''}>
                                                            <td className="py-2 text-gray-700">
                                                                {isEditing ? (
                                                                    <div className="space-y-2">
                                                                        {/* Product Name */}
                                                                        <div>
                                                                            <input type="text" className="border rounded px-1 w-full text-xs font-bold text-gray-800" value={tempSaleData.productName} onChange={e => setTempSaleData({...tempSaleData, productName: e.target.value})} placeholder="Nom Produit" />
                                                                        </div>
                                                                        {/* Grouping Fields Edit */}
                                                                        <div className="grid grid-cols-2 gap-1">
                                                                            <input 
                                                                                type="text" 
                                                                                className="border rounded px-1 w-full text-xs" 
                                                                                value={tempSaleData.buyerName || ''} 
                                                                                onChange={e => setTempSaleData({...tempSaleData, buyerName: e.target.value})} 
                                                                                placeholder="Client"
                                                                                title="Modifier le client"
                                                                            />
                                                                            <select 
                                                                                className="border rounded px-1 w-full text-xs bg-white h-6"
                                                                                value={tempSaleData.paymentMethod}
                                                                                onChange={e => setTempSaleData({...tempSaleData, paymentMethod: e.target.value as PaymentMethod})}
                                                                                title="Modifier le paiement"
                                                                            >
                                                                                {['ESPECES', 'CB', 'CHEQUE', 'VIREMENT', 'DON', 'AUTRE'].map(m => (
                                                                                    <option key={m} value={m}>{m}</option>
                                                                                ))}
                                                                            </select>
                                                                        </div>
                                                                    </div>
                                                                ) : (
                                                                    <>
                                                                        <span className="font-medium">{s.productName || `Lot: ${s.finalBatchNumber}`}</span>
                                                                        {batchYear && <span className="text-gray-400 text-xs ml-1">({batchYear})</span>}
                                                                    </>
                                                                )}
                                                            </td>
                                                            <td className="py-2 text-gray-500 text-xs">
                                                                {displayFormat || '-'}
                                                            </td>
                                                            <td className="py-2 text-gray-600">
                                                                {isEditing ? <input type="number" className="border rounded px-1 w-12" value={tempSaleData.quantitySold} onChange={e => setTempSaleData({...tempSaleData, quantitySold: parseFloat(e.target.value)})} /> : s.quantitySold}
                                                            </td>
                                                            <td className="py-2 text-right font-mono">
                                                                {isEditing ? <input type="number" step="0.01" className="border rounded px-1 w-20 text-right" value={tempSaleData.totalPrice} onChange={e => setTempSaleData({...tempSaleData, totalPrice: parseFloat(e.target.value)})} /> : s.totalPrice?.toFixed(2) + ' €'}
                                                            </td>
                                                            <td className="py-2 text-right">
                                                                <div className="flex justify-end gap-2">
                                                                    {isEditing ? (
                                                                        <>
                                                                            <button onClick={saveSaleEdit} className="text-green-600 hover:text-green-800"><Check size={16}/></button>
                                                                            <button onClick={cancelSaleEdit} className="text-gray-400 hover:text-gray-600"><X size={16}/></button>
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            <button onClick={() => startEditingSale(s)} className="text-blue-400 hover:text-blue-600"><Edit2 size={14}/></button>
                                                                            <button onClick={() => setSaleToDelete(s.id)} className="text-gray-300 hover:text-red-500"><Trash2 size={14}/></button>
                                                                        </>
                                                                    )}
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};