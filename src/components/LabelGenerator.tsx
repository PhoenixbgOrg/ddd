
import React, { useState, useEffect, useCallback } from 'react';
import type { Batch, ReprintLog, RawMaterialDefinition, Recipe, CompanySettings, Product } from '../domain/types';
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
  const [showPrice, setShowPrice] = useState(false);

  const [savedBatches, setSavedBatches] = useState<Batch[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [materialDefinitions, setMaterialDefinitions] = useState<RawMaterialDefinition[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [companySettings, setCompanySettings] = useState<CompanySettings | null>(null);
  
  const [selectedBatchId, setSelectedBatchId] = useState<string>('');
  const [linkedProductId, setLinkedProductId] = useState<string>(''); // To link batch to product
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [loadedBatch, setLoadedBatch] = useState<Batch | null>(null);
  
  const [overrideMinutes, setOverrideMinutes] = useState<string>('');
  const [reprintReason, setReprintReason] = useState('');
  const [reprintedBy, setReprintedBy] = useState(currentUserName);
  
  useEffect(() => { setReprintedBy(currentUserName); }, [currentUserName]);

  const loadData = useCallback(() => {
      setSavedBatches(storageService.getBatches());
      setMaterialDefinitions(storageService.getRawMaterials());
      setRecipes(storageService.getRecipes());
      setProducts(storageService.getProducts());
      setCompanySettings(storageService.getCompanySettings());
  }, []);

  useEffect(() => {
    loadData();
    const handleStorageUpdate = (event: StorageEvent) => {
        if (['ddd_batches', 'ddd_reprint_logs', 'ddd_raw_material_definitions', 'ddd_recipes', 'ddd_company_settings', 'ddd_products'].includes(event.key || '')) {
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

  const getPreviewInfo = useCallback((batch: Batch, language: 'bg' | 'en') => {
      const recipe = recipes.find(r => r.id === batch.recipeId);
      const info = getLabelInfo(batch, recipe, language);
      const ingInfo = formatIngredients(batch, materialDefinitions, language);
      info.ingredientsText = ingInfo.text;
      info.hasAllergens = ingInfo.hasAllergens;
      
      // Override title if product is linked
      if (linkedProductId) {
          const prod = products.find(p => p.id === linkedProductId);
          if (prod) {
              // Use product name for title if desired, or keep recipe name logic.
              // Usually label title is specific. Let's append product name if different?
              // For now, we let the ProductManager handle official naming, but the label might need the specific tech name.
              // Let's assume Product Name overrides Batch Type in the title construction if we wanted, 
              // but getLabelInfo uses Recipe Name. 
              // Let's just trust the recipe for the technical description, but maybe use Product Name as the big Header?
              // For this implementation, we will stick to recipe logic for the technical text, 
              // but the Price comes from the product.
          }
      }
      return info;
  }, [recipes, materialDefinitions, linkedProductId, products]);

  const generateQRCodes = (prodName?: string, bCode?: string) => {
      const pName = prodName || productName;
      const bName = bCode || batchCode;
      if (!pName || !bName) {
        return;
      }
      const data = `БЪЛГАРСКИ DDD ПРОТОТИП | ${pName} | Партида: ${bName}`;
      const encoded = encodeURIComponent(data);
      const url = `https://api.qrserver.com/v1/create-qr-code/?data=${encoded}&size=120x120`;
      setQrCodeUrl(url);
  };

  const handleLoadBatch = (batchId: string) => {
    const batch = savedBatches.find(b => b.id === batchId);
    if (!batch) return;

    setSelectedBatchId(batchId);
    setProductName(batch.batchType);
    setBatchCode(batch.batchName);
    setLoadedBatch(batch);
    setStatus(`Заредена партида: ${batch.batchName}`);
    generateQRCodes(batch.batchType, batch.batchName);
    setLinkedProductId(''); // Reset linked product on new batch load
    
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
  
  // Determine price to show
  const getDisplayPrice = (): number | undefined => {
      if (linkedProductId) {
          const p = products.find(x => x.id === linkedProductId);
          if (p) return p.price;
      }
      return loadedBatch?.recommendedSellPrice;
  };

  const handlePrint = () => {
    if (!loadedBatch) {
        alert("Моля, първо заредете партида, за да генерирате етикет.");
        return;
    }

    if (loadedBatch.isTestBatch && !loadedBatch.testApprovalOrderNumber) {
        alert("Не може да се отпечата тестова партида без номер на заповед.\\nCannot print a test batch label without approval order number.");
        return;
    }
    
    const printWindow = window.open('', '', 'width=800,height=600');
    if (!printWindow) {
        alert("Блокиран прозорец за печат. Разрешете pop-up и опитайте отново.");
        return;
    }
    
    const companyInfo = companySettings ? [
        companySettings.companyName,
        companySettings.companyPhone,
        companySettings.companyEmail
    ].filter(Boolean).join(' | ') : '';

    const finalPrice = getDisplayPrice();
    const priceInfo = showPrice && finalPrice
        ? `<div style="margin-top: 1mm; font-weight: bold; font-size: 8pt;">Цена: ${finalPrice.toFixed(2)} лв.</div>` 
        : '';

    const styles = `
      <style>
        @page { 
            size: 100mm 150mm; 
            margin: 0; 
        }
        body { 
            margin: 0; 
            padding: 0; 
            font-family: Arial, sans-serif; 
            -webkit-print-color-adjust: exact; 
            width: 100mm;
            height: 150mm;
            color: #000;
        }
        .label { 
            width: 100mm; 
            height: 150mm; 
            box-sizing: border-box; 
            padding: 2mm; 
            display: flex; 
            flex-direction: column; 
            page-break-inside: avoid;
            position: relative;
            overflow: hidden; 
        }
        .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1mm;}
        .header h1 { font-size: 11pt; margin: 0; font-weight: 900; width: 75%; line-height: 1.1; }
        .ghs-icons { display: flex; gap: 0.5mm; }
        .ghs-icon svg { width: 12mm; height: 12mm; }
        
        .batch-info { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1mm; font-size: 6.5pt; font-weight: 700; }
        .batch-info div p { margin: 0; line-height: 1.2; }
        .qr-code { width: 18mm; height: 18mm; margin-left: 2mm; }
        
        .section-title { font-size: 7.5pt; font-weight: 900; margin-top: 1mm; margin-bottom: 0.5mm; border-bottom: 1px solid black; }
        
        .main-text p, .main-text div { font-size: 6pt; font-weight: 700; line-height: 1.1; margin: 0 0 0.5mm 0; text-align: justify; }
        
        .ufi-expiry-section { margin-top: 1mm; font-size: 6pt; font-weight: 700; }
        .ufi-expiry-section .ufi { font-size: 6.5pt; font-weight: 900; margin-bottom: 0.5mm; }
        
        .test-sample { color: black; font-weight: 900; font-size: 8pt; text-align: center; margin-bottom: 1mm; border: 2px dashed black; padding: 0.5mm; }
        strong { font-weight: 900; }
        .lang-divider { border: 0; border-top: 1.5px dashed #000; margin: 1.5mm 0; }
        
        .english-content h1 { font-size: 10.5pt; font-weight: 900; margin: 0 0 1mm 0; }
        
        .footer-company { font-size: 6pt; text-align: center; margin-top: auto; padding-top: 2mm; border-top: 1px solid #ccc; }
      </style>`;

    const { batchName: bName, tabletCount: tCount, tabletWeight: tWeight, hazardPictograms, ufi } = loadedBatch;
    const isApprovedTestBatch = loadedBatch.isTestBatch && !!loadedBatch.testApprovalOrderNumber;

    const previewInfoBg = getPreviewInfo(loadedBatch, 'bg');
    const previewInfoEn = getPreviewInfo(loadedBatch, 'en');

    // If linked product exists, we might want to use its name for the QR code or Header?
    // For now, keeping the logic simple as requested.
    
    const ingredientsHtmlBg = previewInfoBg.ingredientsText;
    const ingredientsHtmlEn = previewInfoEn.ingredientsText;
    const hasAllergens = previewInfoBg.hasAllergens;

    const activeGhs = hazardPictograms || [];
    const ghsIconsHtml = activeGhs.map(code => {
      const icon = GHS_PICTOGRAMS[code];
      return icon ? `<div class="ghs-icon">${icon.svg}</div>` : '';
    }).join('');

    const labelsHtml = Array.from({ length: labelCount }).map(() => `
        <div class="label">
            <div>
                ${isApprovedTestBatch ? `<div class="test-sample">ТЕСТОВА ПАРТИДА – НЕ Е ПРЕДНАЗНАЧЕНО ЗА ПРОДАЖБА<br><span style="font-size: 7pt; font-weight: 700;">Заповед № ${loadedBatch.testApprovalOrderNumber}</span></div>` : ''}
                <div class="header">
                    <h1>${previewInfoBg.title}</h1>
                    <div class="ghs-icons">${ghsIconsHtml}</div>
                </div>
            </div>
    
            <div class="content">
                <div class="batch-info">
                     <div>
                        <p><strong>Партида:</strong> ${bName}</p>
                        <p><strong>${previewInfoBg.quantityText}</strong></p>
                        <p><strong>Тегло на таблетка:</strong> ~${tWeight.toFixed(1)} g</p>
                     </div>
                     ${qrCodeUrl ? `<img src="${qrCodeUrl}" alt="QR код" class="qr-code" />` : ''}
                </div>
    
                <div class="main-text">
                    <div class="section-title">Съставки</div>
                    <p>${ingredientsHtmlBg}.</p>
    
                    <div class="section-title">Начин на употреба</div>
                    <p>Запалете таблетката по ръба с ветроустойчива запалка и я оставете да тлее на огнеустойчива повърхност, далеч от запалими материали. ${previewInfoBg.durationText}</p>
                    ${previewInfoBg.totalDurationText ? `<p>${previewInfoBg.totalDurationText}</p>` : ''}
                
                    <div class="section-title">Внимание</div>
                    <p>Да се използва само на открито или в добре проветриви помещения. Да се пази далеч от деца, домашни любимци и храни. Да не се оставя без надзор. Да не се вдишва директно димът. При поява на дразнене – прекратете употребата и проветрете.</p>

                    <div class="section-title">Съхранение</div>
                    <p>На сухо и хладно място, далеч от пряка слънчева светлина и източници на топлина.</p>

                    ${hasAllergens ? `<p style="margin-top: 1mm;">⚠ – потенциален алерген</p>` : ''}

                    <div class="ufi-expiry-section">
                    <p class="ufi">UFI: ${ufi || DEFAULT_UFI}</p>
                    <p>Срок на годност: до ${expDate} (при ненарушена вакуумна опаковка).</p>
                    </div>
                    
                    ${priceInfo}
                </div>
            </div>

            <hr class="lang-divider">

            <div class="english-content">
                ${isApprovedTestBatch ? `<div class="test-sample" style="font-size: 7pt; border-color: black;">TEST BATCH – NOT FOR SALE<br><span style="font-weight: normal;">Approval order No. ${loadedBatch.testApprovalOrderNumber}</span></div>` : ''}
                <h1>${previewInfoEn.title}</h1>
                <div class="batch-info">
                    <div>
                        <p><strong>Batch:</strong> ${bName}</p>
                        <p><strong>${previewInfoEn.quantityText}</strong></p>
                        <p><strong>Tablet weight:</strong> ~${tWeight.toFixed(1)} g</p>
                    </div>
                </div>
                <div class="main-text">
                    <div class="section-title">Ingredients</div>
                    <p>${ingredientsHtmlEn}.</p>

                    <div class="section-title">Directions for use</div>
                    <p>Light the tablet along the edge and let it smoulder in a suitable fireproof holder outdoors. Do not leave unattended. ${previewInfoEn.durationText}</p>
                    ${previewInfoEn.totalDurationText ? `<p>${previewInfoEn.totalDurationText}</p>` : ''}
                    
                    <div class="section-title">Warning</div>
                    <p>For outdoor use only. Keep out of reach of children and pets. Do not inhale the smoke directly. If irritation occurs, stop using and ventilate the area.</p>

                    <div class="section-title">Storage</div>
                    <p>Store in a cool, dry place, away from direct sunlight and sources of heat.</p>
                    
                    ${hasAllergens ? `<p style="margin-top: 1mm;">⚠ – potential allergen</p>` : ''}

                    <div class="ufi-expiry-section">
                    <p class="ufi">UFI: ${ufi || DEFAULT_UFI}</p>
                    <p>Best before: ${expDate} (while the vacuum packaging remains intact).</p>
                    </div>
                </div>
            </div>
            
            <div class="footer-company">
                ${companyInfo ? companyInfo : footerText}
            </div>
        </div>
    `).join('');

    printWindow.document.write(`<html><head><title>Печат на етикети - ${bName}</title>${styles}</head><body>${labelsHtml}</body></html>`);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 500);
  };
  
  const isBatchMarkedAsTest = loadedBatch?.isTestBatch || false;
  const isTestBatchApproved = isBatchMarkedAsTest && !!loadedBatch?.testApprovalOrderNumber;
  const previewInfoBg = loadedBatch ? getPreviewInfo(loadedBatch, 'bg') : null;
  const previewInfoEn = loadedBatch ? getPreviewInfo(loadedBatch, 'en') : null;
  const finalDisplayPrice = getDisplayPrice();

  return (
    <div className="bg-white p-6 sm:p-8 rounded-b-lg shadow-lg">
     <div className="space-y-4">
      <h2 className="text-xl font-bold mb-4 text-gray-800">Генератор на етикети</h2>
      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg space-y-3">
          <h3 className="font-semibold mb-2 text-gray-700">1. Основни данни за етикета</h3>
          <div>
            <label className="block text-sm mb-1 font-medium text-gray-600">Зареди от запазена партида</label>
             <select value={selectedBatchId} onChange={e => handleLoadBatch(e.target.value)} className="w-full p-2 rounded border border-gray-300">
                <option value="">-- Избери --</option>
                {savedBatches.map(batch => (<option key={batch.id} value={batch.id}>{batch.id} • {batch.batchType} • {batch.tabletCount} бр.</option>))}
              </select>
          </div>
          
          {/* Linked Product Selector */}
          <div>
            <label className="block text-sm mb-1 font-medium text-blue-700">Свържи с Продукт (за цена и име)</label>
            <select value={linkedProductId} onChange={e => setLinkedProductId(e.target.value)} disabled={!loadedBatch} className="w-full p-2 rounded border border-blue-300 bg-blue-50">
                <option value="">-- Използвай данните от партидата --</option>
                {products.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.price.toFixed(2)} лв)</option>
                ))}
            </select>
            {linkedProductId && <p className="text-xs text-blue-600 mt-1">Цената ще бъде взета от избрания продукт.</p>}
          </div>

          <div>
            <label className="block text-sm mb-1 font-medium text-gray-600">Име на продукта (Партида)</label>
            <input type="text" value={productName} readOnly className="w-full p-2 rounded border border-gray-300 bg-gray-200" />
          </div>
          <div>
            <label className="block text-sm mb-1 font-medium text-gray-600">Код / Партида</label>
            <input type="text" value={batchCode} readOnly className="w-full p-2 rounded border border-gray-300 bg-gray-200" />
          </div>
          
          {loadedBatch && (
              <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-md mt-2">
                  <label className="block text-xs font-bold text-yellow-800 mb-1">Корекция на време на тлеене на 1 таблетка (в минути, само за тази партида)</label>
                  <div className="flex gap-2">
                      <input 
                        type="number" 
                        value={overrideMinutes} 
                        onChange={e => handleOverrideChange(e.target.value)} 
                        className="flex-1 p-1 border border-yellow-300 rounded text-sm"
                        placeholder="Напр. 90"
                      />
                      <button onClick={saveBatchOverride} className="px-3 py-1 bg-yellow-600 text-white text-xs rounded hover:bg-yellow-700">Запази корекция</button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Оставете празно, за да използвате стандартното време от рецептата.</p>
              </div>
          )}

           {loadedBatch && (
                <div className="bg-gray-100 p-2 rounded text-center mt-2">
                    <p className="text-sm font-medium text-gray-700">
                        UFI: <span className="font-bold text-gray-900">{loadedBatch.ufi}</span>
                    </p>
                </div>
            )}
            <div>
              <label className="block text-sm mb-1 font-medium text-gray-600">Срок на годност (месеци)</label>
              <input type="number" value={expMonths} onChange={e => setExpMonths(parseInt(e.target.value) || 0)} className="w-full p-2 rounded border border-gray-300" min={1} max={60}/>
              <p className="text-xs text-gray-500 mt-1">Изчислена дата: <strong>{expDate}</strong></p>
            </div>
           <div className="mt-3">
            <label className="block text-sm mb-1 font-medium text-gray-600">Текст в долния ред (footer)</label>
            <input type="text" value={footerText} onChange={e => setFooterText(e.target.value)} className="w-full p-2 rounded border border-gray-300 text-xs"/>
             <p className="text-xs text-gray-500 mt-1">Ако има въведени данни за фирма в Админ панела, те ще се покажат автоматично най-отдолу.</p>
          </div>
        </div>

        <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg space-y-3">
          <h3 className="font-semibold mb-2 text-gray-700">2. Генериран изглед на етикета</h3>
           {loadedBatch && previewInfoBg && previewInfoEn ? (
               <div className="border p-2 text-xs h-full overflow-y-auto bg-white font-mono">
                <p><strong>{previewInfoBg.title}</strong></p>
                <p><strong>Партида:</strong> {loadedBatch.batchName}</p>
                <p><strong>{previewInfoBg.quantityText}</strong></p>
                <p><strong>Тегло на таблетка:</strong> ~{loadedBatch.tabletWeight.toFixed(1)} g</p>
                <hr className="my-1" />
                 <p><strong>Съставки:</strong> <span dangerouslySetInnerHTML={{ __html: previewInfoBg.ingredientsText }}></span>.</p>
                <p><strong>Употреба:</strong> ... {previewInfoBg.durationText}</p>
                {previewInfoBg.totalDurationText && <p>{previewInfoBg.totalDurationText}</p>}
                 {previewInfoBg.hasAllergens && <p className="mt-1">⚠ – потенциален алерген</p>}
                 <p><strong>UFI:</strong> {loadedBatch.ufi}</p>
                 <p><strong>Срок на годност:</strong> до {expDate}</p>
                 {showPrice && finalDisplayPrice && (
                    <p className="mt-1 font-bold">Цена: {finalDisplayPrice.toFixed(2)} лв.</p>
                 )}

                <hr className="my-2 border-dashed"/>

                <p><strong>{previewInfoEn.title}</strong></p>
                <p><strong>Batch:</strong> {loadedBatch.batchName}</p>
                <p><strong>{previewInfoEn.quantityText}</strong></p>
                <p><strong>Tablet weight:</strong> ~{loadedBatch.tabletWeight.toFixed(1)} g</p>
                <hr className="my-1" />
                <p><strong>Ingredients:</strong> <span dangerouslySetInnerHTML={{ __html: previewInfoEn.ingredientsText }}></span>.</p>
                <p><strong>Directions:</strong> ... {previewInfoEn.durationText}</p>
                {previewInfoEn.totalDurationText && <p>{previewInfoEn.totalDurationText}</p>}
                {previewInfoEn.hasAllergens && <p className="mt-1">⚠ – potential allergen</p>}
                 <p><strong>UFI:</strong> {loadedBatch.ufi}</p>
                 <p><strong>Best before:</strong> {expDate}</p>
               </div>
           ) : (
                <div className="flex items-center justify-center h-full text-gray-500">Заредете партида, за да видите преглед.</div>
           )}
        </div>
      </div>
       <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg space-y-3">
            <h3 className="font-semibold mb-2 text-gray-700">3. Финални настройки и печат</h3>
            <div className="grid md:grid-cols-3 gap-4 items-end">
                <div>
                    <label className="block text-sm mb-1 font-medium text-gray-600">Брой етикети</label>
                    <input type="number" value={labelCount} onChange={e => setLabelCount(parseInt(e.target.value) || 1)} className="w-full p-2 rounded border border-gray-300" min={1} max={200}/>
                </div>
                <div className="flex flex-col gap-2 justify-center">
                     <div className="flex items-center gap-2">
                        <input id="show-price-check" type="checkbox" checked={showPrice} onChange={e => setShowPrice(e.target.checked)} className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"/>
                        <label htmlFor="show-price-check" className="text-sm font-medium text-gray-700">Покажи цена на етикета</label>
                     </div>
                     <div className="flex items-center gap-2">
                         <input id="test-sample-check" type="checkbox" checked={isBatchMarkedAsTest} disabled className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded disabled:bg-gray-100 disabled:cursor-not-allowed"/>
                        <label htmlFor="test-sample-check" className="text-sm font-medium text-gray-700">
                            Тестова партида
                            {isBatchMarkedAsTest && !isTestBatchApproved && <span className="text-red-600 ml-1">(чака одобрение)</span>}
                            {isTestBatchApproved && <span className="text-green-600 ml-1">(одобрена)</span>}
                        </label>
                    </div>
                </div>
            </div>
             <div className="flex justify-end gap-2 mt-4">
                <button onClick={handlePrint} className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded disabled:bg-gray-400" disabled={!loadedBatch}>Печат на етикети</button>
            </div>
            {status && <p className="text-xs text-green-600 text-right mt-2">{status}</p>}
       </div>

       {userRole === 'Администратор' && (
        <div className="border-t-2 border-dashed border-red-300 pt-4 mt-4">
        <div className="bg-red-50 border border-red-200 p-4 rounded-lg space-y-3">
          <h3 className="font-semibold mb-2 text-red-700">Препечатка на етикети (Само за администратори)</h3>
           <p className="text-sm text-gray-600">Използвайте тази секция само ако трябва да препечатате повреден или липсващ етикет.</p>
          <div className="grid md:grid-cols-3 gap-3">
            <div>
              <label className="block text-sm mb-1 font-medium text-gray-600">Кой препечатва?</label>
              <input type="text" value={reprintedBy} onChange={e => setReprintedBy(e.target.value)} className="w-full p-2 rounded border border-gray-300 text-sm" placeholder="Име или инициали"/>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm mb-1 font-medium text-gray-600">Причина за препечатване</label>
              <input type="text" value={reprintReason} onChange={e => setReprintReason(e.target.value)} className="w-full p-2 rounded border border-gray-300 text-sm" placeholder="Напр. корекция на текст, дефект..."/>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-2">
            <button onClick={() => {
                if (!productName || !batchCode || !reprintedBy || !reprintReason) {
                    alert("Попълнете продукт, партида, кой препечатва и причина.");
                    return;
                }
                const newLog: ReprintLog = {
                    id: Date.now().toString(),
                    timestamp: new Date().toISOString(),
                    productName,
                    batchCode,
                    reprintedBy,
                    reason: reprintReason
                };
                storageService.saveReprintLogs([...storageService.getReprintLogs(), newLog]);
                setReprintReason('');
                alert("Логът за препечатване е записан. Сега ще се генерира етикетът.");
                handlePrint();
            }} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded text-sm font-semibold disabled:bg-gray-400" disabled={!loadedBatch}>Препечатай и впиши в дневника</button>
          </div>
        </div>
        </div>
      )}
    </div>
    </div>
  );
};

export default LabelGenerator;
