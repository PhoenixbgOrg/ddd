
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type { Batch, ReprintLog, RawMaterialDefinition, Recipe } from '../domain/types';
import type { CurrentUser } from './App';
import { storageService } from '../services/storageService';
import { getLabelInfo, formatIngredients } from '../domain/labelDomain';

const GHS_PICTOGRAMS: Record<string, { label: string; svg: string }> = {
    GHS02: { label: 'Запалимо', svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect x="5" y="5" width="90" height="90" transform="rotate(45 50 50)" fill="white" stroke="red" stroke-width="4"/><path d="M50 20c-4 8-6 14-6 18 0 3 1 6 3 8-1-8 4-11 5-17 4 5 6 10 6 14 0 4-2 7-4 9 6-1 11-7 11-14 0-3-1-6-2-9 4 3 8 9 8 16 0 11-9 20-21 20S29 56 29 45c0-6 3-12 7-16-1 3-2 6-2 9 0 7 5 13 11 14-2-2-4-5-4-9 0-4 2-9 6-14 1 6 6 9 5 17 2-2 3-5 3-8 0-4-2-10-6-18z" fill="black"/></svg>` },
    GHS07: { label: 'Дразнещо', svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect x="5" y="5" width="90" height="90" transform="rotate(45 50 50)" fill="white" stroke="red" stroke-width="4"/><path d="M45.8 21.3h8.4v37.5h-8.4V21.3zm4.2 51.9c-2.9 0-5.3-2.4-5.3-5.3s2.4-5.3 5.3-5.3 5.3 2.4 5.3 5.3-2.4 5.3-5.3 5.3z" fill="black"/></svg>` },
    GHS08: { label: 'Опасност за здравето', svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect x="5" y="5" width="90" height="90" transform="rotate(45 50 50)" fill="white" stroke="red" stroke-width="4"/><path d="M50 25c-7 0-13 6-13 13 0 4 2 8 5 10-5 3-9 9-9 15v9h34v-9c0-6-4-12-9-15 3-2 5-6 5-10 0-7-6-13-13-13zm0 8c3 0 5 2 5 5s-2 5-5 5-5-2-5-5 2-5 5-5z" fill="black"/></svg>` },
    GHS09: { label: 'Опасност за околната среда', svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect x="5" y="5" width="90" height="90" transform="rotate(45 50 50)" fill="white" stroke="red" stroke-width="4"/><path d="M25 65h50v5H25z" fill="black"/><path d="M35 62c2-6 6-10 11-12l4 6c-4 1-7 4-8 8h-7z" fill="black"/><path d="M60 60c0-5 2-9 5-12l3 5c-2 2-3 4-3 7h-5z" fill="black"/><path d="M55 40c3-4 5-9 5-14 4 3 7 8 7 14s-3 11-7 14c0-5-2-10-5-14z" fill="black"/></svg>` },
};

const DEFAULT_FOOTER_TEXT = `ПРОИЗВЕДЕНО В БЪЛГАРИЯ • РЪЧНА ИЗРАБОТКА • САМО ЗА ВЪНШНА УПОТРЕБА`;
const DEFAULT_UFI = 'GWF2-21D4-PKJ6-VKNW';

interface LabelGeneratorProps {
  currentUser: CurrentUser;
}

const LabelGenerator: React.FC<LabelGeneratorProps> = ({ currentUser }) => {
  const { role: userRole, name: currentUserName } = currentUser;
  const [productName, setProductName] = useState('');
  const [batchCode, setBatchCode] = useState('');
  const [expMonths, setExpMonths] = useState(12);
  const [expDate, setExpDate] = useState('');
  const [footerText, setFooterText] = useState(DEFAULT_FOOTER_TEXT);
  const [labelCount, setLabelCount] = useState(10);
  const [status, setStatus] = useState('');

  const [savedBatches, setSavedBatches] = useState<Batch[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [materialDefinitions, setMaterialDefinitions] = useState<RawMaterialDefinition[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState<string>('');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [loadedBatch, setLoadedBatch] = useState<Batch | null>(null);
  
  const [overrideMinutes, setOverrideMinutes] = useState<string>('');
  const [reprintReason, setReprintReason] = useState('');
  const [reprintedBy, setReprintedBy] = useState(currentUserName);
  const [reprintLogs, setReprintLogs] = useState<ReprintLog[]>([]);
  
  useEffect(() => { setReprintedBy(currentUserName); }, [currentUserName]);

  const loadData = useCallback(() => {
      setSavedBatches(storageService.getBatches());
      setReprintLogs(storageService.getReprintLogs());
      setMaterialDefinitions(storageService.getRawMaterials());
      setRecipes(storageService.getRecipes());
  }, []);

  useEffect(() => {
    loadData();
    const handleStorageUpdate = (event: StorageEvent) => {
        if (['ddd_batches', 'ddd_reprint_logs', 'ddd_raw_material_definitions', 'ddd_recipes'].includes(event.key || '')) {
            loadData();
        }
    };
    window.addEventListener('storage', handleStorageUpdate);
    return () => window.removeEventListener('storage', handleStorageUpdate);
  }, [loadData]);

  useEffect(() => {
    const now = new Date();
    now.setMonth(now.getMonth() + expMonths);
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    setExpDate(`${day}.${month}.${year}`);
  }, [expMonths]);

  // --- Logic Helpers ---
  
  const getPreviewInfo = useCallback((batch: Batch, language: 'bg' | 'en') => {
      const recipe = recipes.find(r => r.id === batch.recipeId);
      const info = getLabelInfo(batch, recipe, language);
      const ingInfo = formatIngredients(batch, materialDefinitions, language);
      info.ingredientsText = ingInfo.text;
      info.hasAllergens = ingInfo.hasAllergens;
      return info;
  }, [recipes, materialDefinitions]);

  const handleLoadBatch = (batchId: string) => {
    const batch = savedBatches.find(b => b.id === batchId);
    if (!batch) return;

    setSelectedBatchId(batchId);
    setProductName(batch.batchType);
    setBatchCode(batch.batchName);
    setLoadedBatch(batch);
    setStatus(`Заредена партида: ${batch.batchName}`);
    generateQRCodes(batch.batchType, batch.batchName);
    
    setOverrideMinutes(batch.labelDurationMinutesPerTabletOverride 
        ? batch.labelDurationMinutesPerTabletOverride.toString() 
        : (batch.labelDurationMinutesPerTablet ? batch.labelDurationMinutesPerTablet.toString() : ''));
  };
  
  const handleOverrideChange = (val: string) => setOverrideMinutes(val);
  
  const saveBatchOverride = () => {
      if (!loadedBatch) return;
      const valNum = parseInt(overrideMinutes, 10);
      const newOverride = (!isNaN(valNum) && valNum > 0) ? valNum : undefined;
      
      const updatedBatch: Batch = { ...loadedBatch, labelDurationMinutesPerTabletOverride: newOverride };
      storageService.saveBatches(savedBatches.map(b => b.id === updatedBatch.id ? updatedBatch : b));
      setSavedBatches(prev => prev.map(b => b.id === updatedBatch.id ? updatedBatch : b));
      setLoadedBatch(updatedBatch);
      setStatus(`Запазена корекция на време за партида ${updatedBatch.batchName}`);
  };
  
  const generateQRCodes = (prodName?: string, bCode?: string) => {
    const pName = prodName || productName;
    const bName = bCode || batchCode;
    if (!pName || !bName) return;
    const data = `БЪЛГАРСКИ DDD ПРОТОТИП | ${pName} | Партида: ${bName}`;
    const encoded = encodeURIComponent(data);
    setQrCodeUrl(`https://api.qrserver.com/v1/create-qr-code/?data=${encoded}&size=120x120`);
  };

  const saveReprintLogAndPrint = () => {
    if (userRole !== 'Администратор') {
        alert("Нямате права за тази операция.");
        return;
    }
    if (!productName || !batchCode || !reprintedBy || !reprintReason) {
      alert("Попълнете продукт, партида, кой препечатва и причина.");
      return;
    }
    const newLog: ReprintLog = {
      id: `${Date.now()}`, timestamp: new Date().toISOString(), productName, batchCode, reprintedBy, reason: reprintReason,
    };
    storageService.saveReprintLogs([...reprintLogs, newLog]);
    setReprintLogs(prev => [...prev, newLog]);
    setReprintReason('');
    alert("Логът за препечатване е записан.");
    handlePrint();
  };

  const handlePrint = () => {
    if (!loadedBatch) { alert("Моля, първо заредете партида."); return; }
    if (loadedBatch.isTestBatch && !loadedBatch.testApprovalOrderNumber) {
        alert("Не може да се отпечата тестова партида без номер на заповед.");
        return;
    }
    
    const printWindow = window.open('', '', 'width=800,height=600');
    if (!printWindow) return;

    const styles = `
      <style>
        @media print { @page { size: 100mm 150mm; margin: 0; } }
        body { 
            margin: 0; padding: 0; 
            font-family: Arial, Helvetica, sans-serif; 
            -webkit-print-color-adjust: exact; 
            width: 100mm; 
            color: #000 !important;
            font-weight: 700; /* Base Bold for everything */
        }
        .label-page { 
            width: 100mm; height: 150mm; 
            box-sizing: border-box; padding: 2mm; /* Reduced padding to 2mm to allow larger fonts */
            display: flex; flex-direction: column; 
            page-break-inside: avoid; break-inside: avoid;
            overflow: hidden; position: relative;
        }
        
        /* Main Header: Larger and Extra Bold */
        .header h1 { 
            font-size: 10pt; /* Increased size */
            margin: 0; 
            font-weight: 900; /* Extra Black */
            width: 75%; 
            line-height: 1.1; 
            text-transform: uppercase;
        }
        .ghs-icons { display: flex; gap: 0.5mm; }
        .ghs-icon svg { width: 10mm; height: 10mm; }
        
        /* Batch Info: Slightly larger, bold */
        .batch-info { 
            display: flex; justify-content: space-between; align-items: center; 
            margin-bottom: 1mm; 
            font-size: 7pt; /* Increased from 6.5pt */
            font-weight: 800; 
        }
        .batch-info p { margin: 0; line-height: 1.2; }
        .qr-code { width: 15mm; height: 15mm; margin-left: 2mm; }
        
        /* Section Title: Larger, Extra Bold, Uppercase, Thicker Line */
        .section-title { 
            font-size: 7pt; /* Increased from 6.5pt */
            font-weight: 900; 
            margin-top: 1mm; 
            margin-bottom: 0.5mm; 
            border-bottom: 1.5px solid black; /* Thicker border */
            text-transform: uppercase; 
        }
        
        /* Main Text: Keep size small to fit, but use Bold (700) */
        .main-text p { 
            font-size: 6pt; /* Kept small to fit content */
            line-height: 1.15; 
            margin: 0 0 0.5mm 0; 
            text-align: justify; 
            font-weight: 700; /* Explicit Bold */
        }
        
        /* Footer / UFI */
        .ufi-expiry-section { margin-top: 1mm; font-size: 6pt; font-weight: 700; }
        .ufi-expiry-section .ufi { font-size: 7pt; font-weight: 900; margin-bottom: 0.5mm; }
        
        .test-sample { color: black; border: 2px dashed black; font-weight: 900; font-size: 8pt; text-align: center; margin-bottom: 1mm; padding: 0.5mm; }
        .lang-divider { border: 0; border-top: 1.5px dashed #000; margin: 1.5mm 0; }
        
        /* Footer text very small but bold */
        .footer-small { font-size: 5pt; font-weight: 700; }
      </style>`;

    const infoBg = getPreviewInfo(loadedBatch, 'bg');
    const infoEn = getPreviewInfo(loadedBatch, 'en');
    const { batchName, tabletWeight, hazardPictograms, ufi } = loadedBatch;
    const isTest = loadedBatch.isTestBatch && !!loadedBatch.testApprovalOrderNumber;
    
    const ghsHtml = (hazardPictograms || []).map(k => GHS_PICTOGRAMS[k] ? `<div class="ghs-icon">${GHS_PICTOGRAMS[k].svg}</div>` : '').join('');
    const qrHtml = qrCodeUrl ? `<img src="${qrCodeUrl}" class="qr-code" />` : '';

    const singleLabel = `
      <div class="label-page">
        <!-- BG -->
        ${isTest ? `<div class="test-sample">ТЕСТОВА ПАРТИДА – ЗАПОВЕД № ${loadedBatch.testApprovalOrderNumber}</div>` : ''}
        <div class="header"><h1>${infoBg.title}</h1><div class="ghs-icons">${ghsHtml}</div></div>
        <div class="batch-info">
             <div><p>Партида: ${batchName}</p><p>${infoBg.quantityText}</p><p>Тегло: ~${tabletWeight.toFixed(1)} g</p></div>
             ${qrHtml}
        </div>
        <div class="main-text">
            <div class="section-title">Съставки</div><p>${infoBg.ingredientsText}.</p>
            <div class="section-title">Начин на употреба</div><p>Запалете по ръба, оставете да тлее на огнеустойчива повърхност. ${infoBg.durationText}</p>
            ${infoBg.totalDurationText ? `<p>${infoBg.totalDurationText}</p>` : ''}
            <div class="section-title">Внимание</div><p>Само за открито. Пази от деца и животни. Не вдишвай дима. При дразнене прекрати употреба.</p>
            <div class="section-title">Съхранение</div><p>На сухо и хладно.</p>
            ${infoBg.hasAllergens ? `<p style="margin-top:1mm">⚠ – потенциален алерген</p>` : ''}
            <div class="ufi-expiry-section"><p class="ufi">UFI: ${ufi || DEFAULT_UFI}</p><p>Срок на годност: до ${expDate} (при ненарушена вакуумна опаковка).</p></div>
        </div>

        <hr class="lang-divider">

        <!-- EN -->
        ${isTest ? `<div class="test-sample" style="font-size:7pt;">TEST BATCH – NOT FOR SALE<br>Order No. ${loadedBatch.testApprovalOrderNumber}</div>` : ''}
        <div class="header" style="margin-bottom:0.5mm"><h1>${infoEn.title}</h1></div>
        <div class="batch-info"><div><p>Batch: ${batchName}</p><p>${infoEn.quantityText}</p><p>Weight: ~${tabletWeight.toFixed(1)} g</p></div></div>
        <div class="main-text">
            <div class="section-title">Ingredients</div><p>${infoEn.ingredientsText}.</p>
            <div class="section-title">Directions</div><p>Light edge, smoulder on fireproof surface outdoors. ${infoEn.durationText}</p>
            ${infoEn.totalDurationText ? `<p>${infoEn.totalDurationText}</p>` : ''}
            <div class="section-title">Warning</div><p>Outdoor use only. Keep away from children/pets. Do not inhale smoke. Stop if irritated.</p>
            <div class="section-title">Storage</div><p>Cool and dry place.</p>
            ${infoEn.hasAllergens ? `<p style="margin-top:1mm">⚠ – potential allergen</p>` : ''}
            <div class="ufi-expiry-section"><p class="ufi">UFI: ${ufi || DEFAULT_UFI}</p><p>Best before: ${expDate} (while vacuum packed).</p></div>
        </div>
        <div style="margin-top:auto; text-align:center; border-top:1px solid #000; padding-top:1mm;" class="footer-small">${footerText}</div>
      </div>
    `;

    const fullHtml = Array.from({ length: labelCount }).map(() => singleLabel).join('');
    printWindow.document.write(`<html><head><title>${batchName}</title>${styles}</head><body>${fullHtml}</body></html>`);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 500);
  };
  
  const previewInfoBg = loadedBatch ? getPreviewInfo(loadedBatch, 'bg') : null;
  const previewInfoEn = loadedBatch ? getPreviewInfo(loadedBatch, 'en') : null;

  return (
    <div className="bg-white p-6 rounded-b-lg shadow-lg">
     <div className="space-y-4">
      <h2 className="text-xl font-bold mb-4 text-gray-800">Генератор на етикети</h2>
      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-gray-50 p-4 rounded-lg space-y-3 border">
          <h3 className="font-semibold mb-2 text-gray-700">1. Данни</h3>
          <select value={selectedBatchId} onChange={e => handleLoadBatch(e.target.value)} className="w-full p-2 rounded border">
            <option value="">-- Избери партида --</option>
            {savedBatches.map(b => (<option key={b.id} value={b.id}>{b.id} • {b.batchType}</option>))}
          </select>
          {loadedBatch && (
              <div className="bg-yellow-50 border border-yellow-200 p-2 rounded-md">
                  <label className="block text-xs font-bold text-yellow-800">Корекция време (мин/табл)</label>
                  <div className="flex gap-2 mt-1">
                      <input type="number" value={overrideMinutes} onChange={e => handleOverrideChange(e.target.value)} className="flex-1 p-1 border text-sm" placeholder="Default" />
                      <button onClick={saveBatchOverride} className="px-3 py-1 bg-yellow-600 text-white text-xs rounded">OK</button>
                  </div>
              </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            <div><label className="text-xs">Срок (мес)</label><input type="number" value={expMonths} onChange={e => setExpMonths(parseInt(e.target.value))} className="w-full p-2 border rounded"/></div>
            <div><label className="text-xs">Брой етикети</label><input type="number" value={labelCount} onChange={e => setLabelCount(parseInt(e.target.value))} className="w-full p-2 border rounded"/></div>
          </div>
        </div>

        <div className="bg-gray-50 p-4 rounded-lg border">
          <h3 className="font-semibold mb-2 text-gray-700">2. Преглед</h3>
           {loadedBatch && previewInfoBg ? (
               <div className="border p-2 text-xs h-64 overflow-y-auto bg-white font-mono">
                <p><strong>{previewInfoBg.title}</strong></p>
                <p>{previewInfoBg.ingredientsText}</p>
                <p>{previewInfoBg.durationText}</p>
                <hr className="my-2"/>
                <p><strong>{previewInfoEn?.title}</strong></p>
                <p>{previewInfoEn?.durationText}</p>
               </div>
           ) : <div className="text-gray-500 text-center pt-10">Няма заредена партида</div>}
        </div>
      </div>
      <div className="flex justify-end gap-2 mt-4">
         <button onClick={handlePrint} disabled={!loadedBatch} className="px-6 py-2 bg-green-600 text-white rounded disabled:bg-gray-400">Печат</button>
      </div>
    </div>
    </div>
  );
};

export default LabelGenerator;
