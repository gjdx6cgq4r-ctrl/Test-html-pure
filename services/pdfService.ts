
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as Storage from './storageService';

const generateHeader = (doc: jsPDF, title: string, startDate?: string, endDate?: string) => {
  const profile = Storage.getProfile();
  doc.setFontSize(18);
  doc.text(profile.companyName || "Apiculture", 14, 20);
  
  doc.setFontSize(10);
  doc.setTextColor(100);
  
  let yPos = 26;
  doc.text(`${profile.address || ''}`, 14, yPos);
  if (profile.address) yPos += 6;
  
  doc.text(`NAPI: ${profile.napi} | SIRET: ${profile.siret} | Statut: ${profile.status || '-'}`, 14, yPos);
  yPos += 6;
  
  doc.text(`Vétérinaire: ${profile.vetName} - ${profile.vetAddress}`, 14, yPos);
  
  doc.setDrawColor(200);
  doc.line(14, yPos + 4, 196, yPos + 4);
  
  doc.setFontSize(14);
  doc.setTextColor(0);
  
  let displayTitle = title;
  if (startDate && endDate) {
      const startStr = new Date(startDate).toLocaleDateString('fr-FR');
      const endStr = new Date(endDate).toLocaleDateString('fr-FR');
      displayTitle += ` (${startStr} au ${endStr})`;
  }
  
  doc.text(displayTitle, 14, yPos + 14);
  
  return yPos + 20; // Return Y position where content should start
};

// Helper to filter items by date range using simple string comparison
// This avoids timezone issues where UTC might shift the date back
const filterByDate = <T extends { date: string }>(items: T[], start: string, end: string): T[] => {
    return items.filter(item => {
        // Direct string comparison works perfectly for YYYY-MM-DD
        return item.date >= start && item.date <= end;
    });
};

export const generateBreedingRegisterPDF = (startDate: string, endDate: string) => {
  const doc = new jsPDF();
  const apiaries = Storage.getApiaries();
  const hives = Storage.hives.getAll();
  
  // Filter data based on range
  const interventions = filterByDate(Storage.interventions.getAll(), startDate, endDate);
  const movements = filterByDate(Storage.movements.getAll(), startDate, endDate);
  const feedings = filterByDate(Storage.feedings.getAll(), startDate, endDate);

  const getTargetName = (apiaryId?: string, hiveId?: string) => {
      const apiaryName = apiaries.find(a => a.id === apiaryId)?.name || 'Inconnu';
      const hiveName = hiveId ? hives.find(h => h.id === hiveId)?.name : null;
      return hiveName ? `${apiaryName} > ${hiveName}` : apiaryName;
  };

  const startY = generateHeader(doc, "Registre d'Élevage", startDate, endDate);

  // 1. Interventions Sanitaires
  doc.setFontSize(12);
  doc.text("1. Traitements et Soins Sanitaires", 14, startY);
  autoTable(doc, {
    startY: startY + 5,
    head: [['Date', 'Rucher / Ruche', 'Médicament', 'N° Lot', 'Qté', 'Posologie']],
    body: interventions.length > 0 ? interventions.map(i => [
      new Date(i.date).toLocaleDateString('fr-FR'), 
      getTargetName(i.apiaryId, i.hiveId),
      i.drugName, 
      i.batchNumber, 
      i.quantity, 
      i.posology
    ]) : [['Aucune donnée sur la période', '', '', '', '', '']],
    theme: 'grid',
    headStyles: { fillColor: [220, 38, 38] } // Red for sanitary
  });

  // 2. Mouvements
  let finalY = (doc as any).lastAutoTable.finalY + 15;
  doc.text("2. Mouvements de Cheptel", 14, finalY);
  autoTable(doc, {
    startY: finalY + 5,
    head: [['Date', 'Type', 'Origine > Destination', 'Qté', 'Note']],
    body: movements.length > 0 ? movements.map(m => {
        const origin = apiaries.find(a => a.id === m.originApiaryId)?.name || '-';
        const dest = apiaries.find(a => a.id === m.destinationApiaryId)?.name || '-';
        return [
            new Date(m.date).toLocaleDateString('fr-FR'), 
            m.type, 
            `${origin} > ${dest}`, 
            m.quantity,
            m.description
        ];
    }) : [['Aucune donnée sur la période', '', '', '', '']],
    theme: 'grid',
    headStyles: { fillColor: [37, 99, 235] } // Blue for movements
  });

  // 3. Nourrissement
  finalY = (doc as any).lastAutoTable.finalY + 15;
  // Check for page break
  if (finalY > 250) {
      doc.addPage();
      finalY = 20;
  }
  doc.text("3. Nourrissement", 14, finalY);
  autoTable(doc, {
    startY: finalY + 5,
    head: [['Date', 'Rucher / Ruche', 'Type', 'Quantité']],
    body: feedings.length > 0 ? feedings.map(f => {
      return [
          new Date(f.date).toLocaleDateString('fr-FR'), 
          getTargetName(f.apiaryId, f.hiveId),
          f.foodType, 
          f.quantity
      ];
    }) : [['Aucune donnée sur la période', '', '', '']],
    theme: 'grid',
    headStyles: { fillColor: [202, 138, 4] } // Yellow/Gold for food
  });

  doc.save(`registre_elevage_${startDate}_${endDate}.pdf`);
};

export const generateHoneyTraceabilityPDF = (startDate: string, endDate: string) => {
  const doc = new jsPDF();
  const apiaries = Storage.getApiaries();
  
  // Filter data
  const harvests = filterByDate(Storage.harvests.getAll(), startDate, endDate);
  const packagings = filterByDate(Storage.packaging.getAll(), startDate, endDate);

  const startY = generateHeader(doc, "Cahier de Miellerie (Traçabilité)", startDate, endDate);

  // 1. Récoltes
  doc.setFontSize(12);
  doc.text("1. Récoltes (Entrées Vrac)", 14, startY);
  autoTable(doc, {
    startY: startY + 5,
    head: [['Date', 'Rucher', 'Miel', 'Poids', 'Ref. Lot Vrac']],
    body: harvests.length > 0 ? harvests.map(h => {
      const apiary = apiaries.find(a => a.id === h.apiaryId);
      return [
        new Date(h.date).toLocaleDateString('fr-FR'), 
        apiary?.name || 'Inconnu', 
        h.honeyType, 
        `${h.quantityKg} kg`, 
        h.batchId
      ];
    }) : [['Aucune donnée sur la période', '', '', '', '']],
    theme: 'grid',
    headStyles: { fillColor: [217, 119, 6] } // Amber
  });

  // 2. Conditionnement
  let finalY = (doc as any).lastAutoTable.finalY + 15;
  doc.text("2. Conditionnement (Mise en pot)", 14, finalY);
  autoTable(doc, {
    startY: finalY + 5,
    head: [['Date', 'Lot Étiquette', 'Conditionnement']],
    body: packagings.length > 0 ? packagings.map(p => [
        new Date(p.date).toLocaleDateString('fr-FR'), 
        p.finalBatchNumber, 
        `${p.quantityPots} x ${p.potSize}`
    ]) : [['Aucune donnée sur la période', '', '']],
    theme: 'grid',
    headStyles: { fillColor: [217, 119, 6] }
  });

  doc.save(`cahier_miellerie_${startDate}_${endDate}.pdf`);
};

export const generateSalesPDF = (startDate: string, endDate: string) => {
  const doc = new jsPDF();
  
  // Filter Data
  let sales = filterByDate(Storage.sales.getAll(), startDate, endDate);
  const packagings = Storage.packaging.getAll();
  const products = Storage.products.getAll();

  // FORCE SORT BY DATE ASCENDING (Chronological) for PDF Export
  // This ensures the PDF is always sorted by date, regardless of the UI sort state.
  sales.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const startY = generateHeader(doc, "Livre de Recettes (Ventes)", startDate, endDate);

  doc.setFontSize(12);
  doc.text("Historique des Ventes", 14, startY);
  
  autoTable(doc, {
    startY: startY + 5,
    head: [['Date', 'Client / Lieu', 'Produit', 'Qté', 'Format', 'Paiement', 'Total']],
    body: sales.length > 0 ? sales.map(s => {
        // Find linked batch for year
        const linkedBatch = packagings.find(p => p.finalBatchNumber === s.finalBatchNumber);
        const batchYear = linkedBatch ? new Date(linkedBatch.date).getFullYear() : '';
        
        // --- IMPROVED FORMAT LOGIC FOR PDF ---
        // 1. Use stored format
        let displayFormat = s.format;

        // 2. Fallback: Product Name Lookup
        if (!displayFormat && s.productName) {
            const matchedProduct = products.find(p => p.name === s.productName);
            if (matchedProduct) displayFormat = matchedProduct.potSize;
        }

        // 3. Fallback: Batch
        if (!displayFormat && linkedBatch) {
            displayFormat = linkedBatch.potSize;
        }

        // Build product display string
        let productDisplay = s.productName || `Lot: ${s.finalBatchNumber}`;
        if(batchYear) {
            productDisplay += ` (${batchYear})`;
        }

        return [
            new Date(s.date).toLocaleDateString('fr-FR'),
            s.buyerName || 'Vente Directe',
            productDisplay,
            s.quantitySold,
            displayFormat || '-',
            s.paymentMethod || '-',
            s.totalPrice ? `${s.totalPrice.toFixed(2)} €` : '-'
        ];
    }) : [['Aucune vente sur la période', '', '', '', '', '', '-']],
    theme: 'grid',
    headStyles: { fillColor: [22, 163, 74] }, // Green for money/sales
    foot: [[
        '', '', '', '', '', 'TOTAL', 
        sales.reduce((sum, s) => sum + (s.totalPrice || 0), 0).toFixed(2) + ' €'
    ]],
    footStyles: { fillColor: [240, 253, 244], textColor: [22, 163, 74], fontStyle: 'bold' }
  });

  doc.save(`livre_recettes_${startDate}_${endDate}.pdf`);
};