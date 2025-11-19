
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type { Batch, ReprintLog, RawMaterialDefinition, Recipe } from '../types';
import type { CurrentUser } from '../App';

const GHS_PICTOGRAMS: Record<string, { label: string; svg: string }> = {
    GHS02: {
      label: 'Запалимо',
      svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect x="5" y="5" width="90" height="90" transform="rotate(45 50 50)" fill="white" stroke="red" stroke-width="4"/><path d="M50 20c-4 8-6 14-6 18 0 3 1 6 3 8-1-8 4-11 5-17 4 5 6 10 6 14 0 4-2 7-4 9 6-1 11-7 11-14 0-3-1-6-2-9 4 3 8 9 8 16 0 11-9 20-21 20S29 56 29 45c0-6 3-12 7-16-1 3-2 6-2 9 0 7 5 13 11 14-2-2-4-5-4-9 0-4 2-9 6-14 1 6 6 9 5 17 2-2 3-5 3-8 0-4-2-10-6-18z" fill="black"/></svg>`,
    },
    GHS07: {
      label: 'Дразнещо',
      svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect x="5" y="5" width="90" height="90" transform="rotate(45 50 50)" fill="white" stroke="red" stroke-width="4"/><path d="M45.8 21.3h8.4v37.5h-8.4V21.3zm4.2 51.9c-2.9 0-5.3-2.4-5.3-5.3s2.4-5.3 5.3-5.3 5.3 2.4 5.3 5.3-2.4 5.3-5.3 5.3z" fill="black"/></svg>`,
    },
    GHS08: {
      label: 'Опасност за здравето',
      svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect x="5" y="5" width="90" height="90" transform="rotate(45 50 50)" fill="white" stroke="red" stroke-width="4"/><path d="M50 25c-7 0-13 6-13 13 0 4 2 8 5 10-5 3-9 9-9 15v9h34v-9c0-6-4-12-9-15 3-2 5-6 5-10 0-7-6-13-13-13zm0 8c3 0 5 2 5 5s-2 5-5 5-5-2-5-5 2-5 5-5z" fill="black"/></svg>`,
    },
    GHS09: {
      label: 'Опасност за околната среда',
      svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect x="5" y="5" width="90" height="90" transform="rotate(45 50 50)" fill="white" stroke="red" stroke-width="4"/><path d="M25 65h50v5H25z" fill="black"/><path d="M35 62c2-6 6-10 11-12l4 6c-4 1-7 4-8 8h-7z" fill="black"/><path d="M60 60c0-5 2-9 5-12l3 5c-2 2-3 4-3 7h-5z" fill="black"/><path d="M55 40c3-4 5-9 5-14 4 3 7 8 7 14s-3 11-7 14c0-5-2-10-5-14z" fill="black"/></svg>`,
    },
};

const DEFAULT_FOOTER_TEXT = `ПРОИЗВЕДЕНО В БЪЛГАРИЯ • РЪЧНА ИЗРАБОТКА • САМО ЗА ВЪНШНА УПОТРЕБА`;
const DEFAULT_UFI = 'GWF2-21D4-PKJ6-VKNW';
const DEFAULT_FORMULATION_NUMBER = 189123930;

const INGREDIENT_TRANSLATIONS: Record<string, string> = {
    'def-mat-wood-charcoal-powder': 'Wood charcoal (powder)',
    'def-mat-coconut-charcoal-granules': 'Coconut charcoal (granules)',
    'def-mat-corn-starch': 'Corn starch',
    'def-mat-catnip': 'Catnip',
    'def-mat-sage': 'Sage',
    'def-mat-lemongrass': 'Lemongrass',
    'def-mat-lmm-mix': 'LMM blend (Lavender, Mint, Lemon balm)',
    'def-mat-colophony-powder': 'Colophony (powder)',
    'def-mat-colophony-granules': 'Colophony (granules)',
    'def-mat-tapioca': 'Tapioca',
    'def-mat-gum-arabic': 'Gum arabic',
    'def-mat-clove': 'Clove',
    'def-mat-rosemary': 'Rosemary',
    'def-mat-cinnamon': 'Cinnamon',
    'def-mat-xanthan-gum': 'Xanthan gum',
};

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
  
  // Override state
  const [overrideMinutes, setOverrideMinutes] = useState<string>('');

  const [reprintReason, setReprintReason] = useState('');
  const [reprintedBy, setReprintedBy] = useState(currentUserName);
  const [reprintLogs, setReprintLogs] = useState<ReprintLog[]>([]);
  
  useEffect(() => {
    setReprintedBy(currentUserName);
  }, [currentUserName]);

  const loadData = useCallback(() => {
    try {
      const storedBatchesRaw = localStorage.getItem('ddd_batches');
      if (storedBatchesRaw) {
        let batches: Batch[] = JSON.parse(storedBatchesRaw);
        // Ensure required fields exist
        let needsUpdate = false;
        batches = batches.map(b => {
            if (b.ufi === undefined || b.formulationNumber === undefined) {
                needsUpdate = true;
                return { ...b, ufi: DEFAULT_UFI, formulationNumber: DEFAULT_FORMULATION_NUMBER };
            }
            return b;
        });

        if (needsUpdate) {
            localStorage.setItem('ddd_batches', JSON.stringify(batches));
        }
        setSavedBatches(batches);
      }

      const storedLogs = localStorage.getItem('ddd_reprint_logs');
      if (storedLogs) setReprintLogs(JSON.parse(storedLogs));

      const storedDefs = localStorage.getItem('ddd_raw_material_definitions');
      if(storedDefs) setMaterialDefinitions(JSON.parse(storedDefs));
      
      const storedRecipes = localStorage.getItem('ddd_recipes');
      if (storedRecipes) setRecipes(JSON.parse(storedRecipes));

    } catch (error) {
      console.error("Грешка при зареждане на данни:", error);
    }
  }, []);

  useEffect(() => {
    loadData();
    const handleStorageUpdate = (event: StorageEvent) => {
        if (['ddd_batches', 'ddd_reprint_logs', 'ddd_raw_material_definitions', 'ddd_recipes'].includes(event.key || '')) {
            loadData();
        }
    };
    window.addEventListener('storage', handleStorageUpdate);
    return () => {
        window.removeEventListener('storage', handleStorageUpdate);
    };
  }, [loadData]);

  useEffect(() => {
    const now = new Date();
    now.setMonth(now.getMonth() + expMonths);
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    setExpDate(`${day}.${month}.${year}`);
  }, [expMonths]);

  const formatIngredientsFromBatch = useCallback((batch: Batch, language: 'bg' | 'en'): string => {
    if (!batch.recipeIngredients || batch.recipeIngredients.length === 0) return '';
    const sortedIngredients = [...batch.recipeIngredients].sort((a, b) => b.grams - a.grams);
    const ingredientsText = sortedIngredients.map(ing => {
        const definition = materialDefinitions.find(def => def.id === ing.rawMaterialId);
        if (!definition) return null;
        let name: string;
        if(language === 'en') {
            name = INGREDIENT_TRANSLATIONS[definition.id] || definition.name;
        } else {
            name = definition.name;
        }
        const isAllergen = definition.isAllergen;
        return isAllergen ? `⚠ ${name}` : name;
    }).filter(Boolean).join(', ');
    return ingredientsText;
  }, [materialDefinitions]);

  const getLabelInfo = useCallback((batch: Batch, language: 'bg' | 'en') => {
      const recipe = recipes.find(r => r.id === batch.recipeId);
      
      // Logic: 
      // 1. Check if batch has an override. If defined (>0), use it.
      // 2. Else, check if batch has a snapshot default.
      // 3. Else, fallback to recipe default.
      const override = batch.labelDurationMinutesPerTabletOverride;
      const batchDefault = batch.labelDurationMinutesPerTablet;
      const recipeDefault = recipe?.labelDurationMinutesPerTablet;
      
      let minutes = 0;
      if (override && override > 0) {
          minutes = override;
      } else if (batchDefault && batchDefault > 0) {
          minutes = batchDefault;
      } else if (recipeDefault && recipeDefault > 0) {
          minutes = recipeDefault;
      }
      
      const baseNameBg = recipe?.name || batch.batchType;
      const baseNameEn = recipe?.labelVariantNameEn || (recipe?.name === 'Гръцка рецепта' ? 'Greek Recipe' : recipe?.name || 'Incense Tablets');
      
      let title = '';
      if (language === 'bg') {
           title = minutes > 0 
            ? `Таблетки за ароматен дим за открито – „${baseNameBg} ${minutes}“`
            : `Таблетки за ароматен дим за открито – „${baseNameBg}“`;
      } else {
           title = minutes > 0 
            ? `Outdoor incense tablets – "${baseNameEn} ${minutes}"`
            : `Outdoor incense tablets – "${baseNameEn}"`;
      }

      let durationText = '';
      let totalDurationText = '';

      if (minutes > 0) {
          const mins = Math.floor(minutes);
          const hours = mins / 60;
          // Formatting: BG uses comma, EN uses dot. 1 decimal place.
          const hoursTextBg = hours.toFixed(1).replace('.', ',');
          const hoursTextEn = hours.toFixed(1);
  
          if(language === 'en'){
              durationText = `Approximate duration of effect: about ${mins} minutes (approximately ${hoursTextEn} hours) per tablet under normal conditions (no strong wind).`;
          } else {
              durationText = `Ориентировъчна продължителност на действие: около ${mins} минути (приблизително ${hoursTextBg} часа) на таблетка при нормални условия (без силен вятър).`;
          }
          
          if (batch.tabletCount > 1) {
              const totalMinutes = mins * batch.tabletCount;
              const totalHours = totalMinutes / 60;
              const totalHoursTextBg = totalHours.toFixed(1).replace('.', ',');
              const totalHoursTextEn = totalHours.toFixed(1);

              if (language === 'bg') {
                  totalDurationText = `Общо потенциално време на тлеене при последователно използване: около ${totalMinutes} минути (приблизително ${totalHoursTextBg} часа) за цялата опаковка.`;
              } else {
                  totalDurationText = `Total potential burn time when used consecutively: about ${totalMinutes} minutes (approximately ${totalHoursTextEn} hours) for the whole package.`;
              }
          }

      } else {
          if(language === 'en'){
            durationText = "Approximate duration of effect: depends on usage conditions.";
          } else {
            durationText = "Ориентировъчна продължителност на действие: зависи от условията на употреба.";
          }
      }
      
      // Quantity Singular/Plural logic
      let quantityText = '';
      if (language === 'bg') {
          if (batch.tabletCount === 1) {
              quantityText = `Количество: 1 бр. таблетка`;
          } else {
              quantityText = `Количество: ${batch.tabletCount} бр. таблетки`;
          }
      } else {
          if (batch.tabletCount === 1) {
               quantityText = `Quantity: 1 tablet`;
          } else {
               quantityText = `Quantity: ${batch.tabletCount} tablets`;
          }
      }

      return { title, durationText, totalDurationText, quantityText };
  }, [recipes]);
  
  const handleLoadBatch = (batchId: string) => {
    const batch = savedBatches.find(b => b.id === batchId);
    if (!batch) return;

    setSelectedBatchId(batchId);
    setProductName(batch.batchType);
    setBatchCode(batch.batchName);
    setLoadedBatch(batch);
    setStatus(`Заредена партида: ${batch.batchName}`);
    generateQRCodes(batch.batchType, batch.batchName);
    
    // Determine default override value to show in input
    if (batch.labelDurationMinutesPerTabletOverride) {
        setOverrideMinutes(batch.labelDurationMinutesPerTabletOverride.toString());
    } else {
        // If no override, show empty or placeholder? 
        // Prompt says: Default value in the input = batch.labelDurationMinutesPerTablet (if set), otherwise empty.
        // Note: batch.labelDurationMinutesPerTablet might be missing if old batch.
        // We can fallback to recipe if needed, but strictly speaking the "default" for the OVERRIDE input is the snapshot.
        // However, for better UX, if snapshot exists, prefill it? Or keep it empty to indicate "no override"?
        // Prompt says: "Default value in the input = batch.labelDurationMinutesPerTablet (if set), otherwise empty."
        // If I change this input, I save it to override.
        setOverrideMinutes(batch.labelDurationMinutesPerTablet ? batch.labelDurationMinutesPerTablet.toString() : '');
    }
  };
  
  const handleOverrideChange = (val: string) => {
      setOverrideMinutes(val);
  };
  
  const saveBatchOverride = () => {
      if (!loadedBatch) return;
      
      const valNum = parseInt(overrideMinutes, 10);
      const newOverride = (!isNaN(valNum) && valNum > 0) ? valNum : undefined;
      
      const updatedBatch: Batch = {
          ...loadedBatch,
          labelDurationMinutesPerTabletOverride: newOverride
      };
      
      const newSavedBatches = savedBatches.map(b => b.id === updatedBatch.id ? updatedBatch : b);
      setSavedBatches(newSavedBatches);
      localStorage.setItem('ddd_batches', JSON.stringify(newSavedBatches));
      setLoadedBatch(updatedBatch);
      setStatus(`Запазена корекция на време за партида ${updatedBatch.batchName}`);
  };
  
  const generateQRCodes = (prodName?: string, bCode?: string) => {
    const pName = prodName || productName;
    const bName = bCode || batchCode;
    if (!pName || !bName) {
      alert("Моля, първо заредете партида или въведете име на продукт и код.");
      return;
    }
    const data = `БЪЛГАРСКИ DDD ПРОТОТИП | ${pName} | Партида: ${bName}`;
    const encoded = encodeURIComponent(data);
    const url = `https://api.qrserver.com/v1/create-qr-code/?data=${encoded}&size=120x120`;
    setQrCodeUrl(url);
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
      id: `${Date.now()}`,
      timestamp: new Date().toISOString(),
      productName,
      batchCode,
      reprintedBy,
      reason: reprintReason,
    };

    const updatedLogs = [...reprintLogs, newLog];
    setReprintLogs(updatedLogs);
    localStorage.setItem('ddd_reprint_logs', JSON.stringify(updatedLogs));
    setReprintReason('');
    alert("Логът за препечатване е записан. Сега ще се генерира етикетът.");
    handlePrint();
  };

  const handlePrint = () => {
    if (!loadedBatch) {
      alert("Моля, първо заредете партида, за да генерирате етикет.");
      return;
    }

    if (loadedBatch.isTestBatch && !loadedBatch.testApprovalOrderNumber) {
        alert("Не може да се отпечата тестова партида без номер на заповед.\nCannot print a test batch label without approval order number.");
        return;
    }
    
    const printWindow = window.open('', '', 'width=800,height=600');
    if (!printWindow) {
      alert("Блокиран прозорец за печат. Разрешете pop-up и опитайте отново.");
      return;
    }

    // IMPORTANT: Styles adjusted to fit strictly on 100mm x 150mm without breaking pages
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
        }
        .label { 
            width: 100mm; 
            height: 150mm; 
            box-sizing: border-box; 
            padding: 3mm; 
            display: flex; 
            flex-direction: column; 
            page-break-inside: avoid;
            position: relative;
            overflow: hidden; /* Ensure no spillover creates a second page */
        }
        
        /* Header Compacting */
        .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1mm;}
        .header h1 { font-size: 9pt; margin: 0; font-weight: bold; width: 75%; line-height: 1.1; }
        .ghs-icons { display: flex; gap: 0.5mm; }
        .ghs-icon svg { width: 12mm; height: 12mm; }
        
        /* Info Grid Compacting */
        .batch-info { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1mm; font-size: 6.5pt; }
        .batch-info div p { margin: 0; line-height: 1.2; }
        .qr-code { width: 18mm; height: 18mm; margin-left: 2mm; }

        /* Sections */
        .section-title { font-size: 6.5pt; font-weight: bold; margin-top: 1mm; margin-bottom: 0.5mm; border-bottom: 0.5px solid black; }
        .main-text p, .main-text div { font-size: 5.8pt; line-height: 1.15; margin: 0 0 0.5mm 0; text-align: justify; }
        
        /* Footer / UFI */
        .ufi-expiry-section { margin-top: 1mm; font-size: 5.8pt; }
        .ufi-expiry-section .ufi { font-size: 6.5pt; font-weight: bold; margin-bottom: 0.5mm; }

        .test-sample { color: red; font-weight: bold; font-size: 8pt; text-align: center; margin-bottom: 1mm; border: 1px dashed red; padding: 0.5mm; }
        strong { font-weight: bold; }
        
        /* Divider */
        .lang-divider { border: 0; border-top: 1px dashed #999; margin: 2mm 0; }
        
        /* English Section specific tweaks if needed */
        .english-content h1 { font-size: 8.5pt; font-weight: bold; margin: 0 0 1mm 0; }
      </style>`;

    const {
        batchName, tabletCount, tabletWeight, hazardPictograms, ufi
    } = loadedBatch;
    
    const isApprovedTestBatch = loadedBatch.isTestBatch && !!loadedBatch.testApprovalOrderNumber;

    const hasAllergens = loadedBatch.recipeIngredients.some(ing => {
        const def = materialDefinitions.find(d => d.id === ing.rawMaterialId);
        return def?.isAllergen;
    });
    
    const ingredientsHtmlBg = formatIngredientsFromBatch(loadedBatch, 'bg');
    const infoBg = getLabelInfo(loadedBatch, 'bg');
    
    const ingredientsHtmlEn = formatIngredientsFromBatch(loadedBatch, 'en');
    const infoEn = getLabelInfo(loadedBatch, 'en');

    const activeGhs = hazardPictograms || [];
    const ghsIconsHtml = activeGhs.map(code => {
      const icon = GHS_PICTOGRAMS[code];
      return icon ? `<div class="ghs-icon">${icon.svg}</div>` : '';
    }).join('');

    const labelsHtml = Array.from({ length: labelCount }).map(() => `
      <div class="label">
        <!-- Bulgarian Block -->
        <div>
            ${isApprovedTestBatch ? `<div class="test-sample">ТЕСТОВА ПАРТИДА – НЕ Е ПРЕДНАЗНАЧЕНО ЗА ПРОДАЖБА<br><span style="font-size: 7pt; font-weight: normal;">Заповед № ${loadedBatch.testApprovalOrderNumber}</span></div>` : ''}
            <div class="header">
                <h1>${infoBg.title}</h1>
                <div class="ghs-icons">${ghsIconsHtml}</div>
            </div>
        </div>

        <div class="content">
            <div class="batch-info">
                 <div>
                    <p><strong>Партида:</strong> ${batchName}</p>
                    <p><strong>${infoBg.quantityText}</strong></p>
                    <p><strong>Тегло на таблетка:</strong> ~${tabletWeight.toFixed(1)} g</p>
                 </div>
                 ${qrCodeUrl ? `<img src="${qrCodeUrl}" alt="QR код" class="qr-code" />` : ''}
            </div>

            <div class="main-text">
                <div class="section-title">Съставки</div>
                <p>${ingredientsHtmlBg}.</p>

                <div class="section-title">Начин на употреба</div>
                <p>Запалете таблетката по ръба с ветроустойчива запалка и я оставете да тлее на огнеустойчива повърхност, далеч от запалими материали. ${infoBg.durationText}</p>
                ${infoBg.totalDurationText ? `<p>${infoBg.totalDurationText}</p>` : ''}
                
                <div class="section-title">Внимание</div>
                <p>Да се използва само на открито или в добре проветриви помещения. Да се пази далеч от деца, домашни любимци и храни. Да не се оставя без надзор. Да не се вдишва директно димът. При поява на дразнене – прекратете употребата и проветрете.</p>

                <div class="section-title">Съхранение</div>
                <p>На сухо и хладно място, далеч от пряка слънчева светлина и източници на топлина.</p>

                ${hasAllergens ? `<p style="margin-top: 1mm;">⚠ – потенциален алерген</p>` : ''}

                <div class="ufi-expiry-section">
                  <p class="ufi">UFI: ${ufi || DEFAULT_UFI}</p>
                  <p>Срок на годност: до ${expDate} (при ненарушена вакуумна опаковка).</p>
                </div>
            </div>
        </div>

        <hr class="lang-divider">

        <!-- English Block -->
        <div class="english-content">
             ${isApprovedTestBatch ? `<div class="test-sample" style="font-size: 7pt; border-color: red;">TEST BATCH – NOT FOR SALE<br><span style="font-weight: normal;">Approval order No. ${loadedBatch.testApprovalOrderNumber}</span></div>` : ''}
             <h1>${infoEn.title}</h1>
             <div class="batch-info">
                 <div>
                    <p><strong>Batch:</strong> ${batchName}</p>
                    <p><strong>${infoEn.quantityText}</strong></p>
                    <p><strong>Tablet weight:</strong> ~${tabletWeight.toFixed(1)} g</p>
                 </div>
            </div>
            <div class="main-text">
                <div class="section-title">Ingredients</div>
                <p>${ingredientsHtmlEn}.</p>

                <div class="section-title">Directions for use</div>
                <p>Light the tablet along the edge and let it smoulder in a suitable fireproof holder outdoors. Do not leave unattended. ${infoEn.durationText}</p>
                ${infoEn.totalDurationText ? `<p>${infoEn.totalDurationText}</p>` : ''}
                
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
      </div>
    `).join('');

    printWindow.document.write(`<html><head><title>Печат на етикети - ${batchName}</title>${styles}</head><body>${labelsHtml}</body></html>`);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 500);
  };
  
  const hasAllergens = useMemo(() => {
    if (!loadedBatch) return false;
    return loadedBatch.recipeIngredients.some(ing => {
        const def = materialDefinitions.find(d => d.id === ing.rawMaterialId);
        return def?.isAllergen;
    });
  }, [loadedBatch, materialDefinitions]);
  
  const isBatchMarkedAsTest = loadedBatch?.isTestBatch || false;
  const isTestBatchApproved = isBatchMarkedAsTest && !!loadedBatch?.testApprovalOrderNumber;

  const previewInfoBg = loadedBatch ? getLabelInfo(loadedBatch, 'bg') : null;
  const previewInfoEn = loadedBatch ? getLabelInfo(loadedBatch, 'en') : null;

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
          <div>
            <label className="block text-sm mb-1 font-medium text-gray-600">Име на продукта</label>
            <input type="text" value={productName} readOnly className="w-full p-2 rounded border border-gray-300 bg-gray-200" />
          </div>
          <div>
            <label className="block text-sm mb-1 font-medium text-gray-600">Код / Партида</label>
            <input type="text" value={batchCode} readOnly className="w-full p-2 rounded border border-gray-300 bg-gray-200" />
          </div>
          
          {/* Burn Time Override Section */}
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
          </div>
        </div>

        <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg space-y-3">
          <h3 className="font-semibold mb-2 text-gray-700">2. Генериран изглед на етикета</h3>
           {loadedBatch && previewInfoBg && previewInfoEn ? (
               <div className="border p-2 text-xs h-full overflow-y-auto bg-white font-mono">
                {/* Bulgarian Preview */}
                <p><strong>{previewInfoBg.title}</strong></p>
                <p><strong>Партида:</strong> {loadedBatch.batchName}</p>
                <p><strong>{previewInfoBg.quantityText}</strong></p>
                <p><strong>Тегло на таблетка:</strong> ~{loadedBatch.tabletWeight.toFixed(1)} g</p>
                <hr className="my-1" />
                 <p><strong>Съставки:</strong> <span dangerouslySetInnerHTML={{ __html: formatIngredientsFromBatch(loadedBatch, 'bg') }}></span>.</p>
                <p><strong>Употреба:</strong> ... {previewInfoBg.durationText}</p>
                {previewInfoBg.totalDurationText && <p>{previewInfoBg.totalDurationText}</p>}
                 {hasAllergens && <p className="mt-1">⚠ – потенциален алерген</p>}
                 <p><strong>UFI:</strong> {loadedBatch.ufi}</p>
                 <p><strong>Срок на годност:</strong> до {expDate}</p>

                <hr className="my-2 border-dashed"/>

                {/* English Preview */}
                <p><strong>{previewInfoEn.title}</strong></p>
                <p><strong>Batch:</strong> {loadedBatch.batchName}</p>
                <p><strong>{previewInfoEn.quantityText}</strong></p>
                <p><strong>Tablet weight:</strong> ~{loadedBatch.tabletWeight.toFixed(1)} g</p>
                <hr className="my-1" />
                <p><strong>Ingredients:</strong> <span dangerouslySetInnerHTML={{ __html: formatIngredientsFromBatch(loadedBatch, 'en') }}></span>.</p>
                <p><strong>Directions:</strong> ... {previewInfoEn.durationText}</p>
                {previewInfoEn.totalDurationText && <p>{previewInfoEn.totalDurationText}</p>}
                {hasAllergens && <p className="mt-1">⚠ – potential allergen</p>}
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
                <div className="flex items-center gap-2">
                     <input id="test-sample-check" type="checkbox" checked={isBatchMarkedAsTest} disabled className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded disabled:bg-gray-100 disabled:cursor-not-allowed"/>
                    <label htmlFor="test-sample-check" className="text-sm font-medium text-gray-700">
                        Тестова партида
                        {isBatchMarkedAsTest && !isTestBatchApproved && <span className="text-red-600 ml-1">(чака одобрение)</span>}
                        {isTestBatchApproved && <span className="text-green-600 ml-1">(одобрена)</span>}
                    </label>
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
           <p className="text-sm text-gray-600">Използвайте тази секция само ако трябва да препечатате повреден или липсващ етикет. Действието се записва в дневник.</p>
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
            <button onClick={saveReprintLogAndPrint} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded text-sm font-semibold disabled:bg-gray-400" disabled={!loadedBatch}>Препечатай и впиши в дневника</button>
          </div>

          {reprintLogs.length > 0 && (
            <div className="mt-4 max-h-40 overflow-y-auto text-sm border-t pt-2">
              <h4 className="font-semibold mb-1 text-gray-700">История на препечатките:</h4>
              <ul className="space-y-1">
                {reprintLogs.slice().reverse().map(log => (
                  <li key={log.id} className="border-b border-gray-200 pb-1 text-xs">
                    <div><strong>{log.productName}</strong> • Партида: {log.batchCode}</div>
                    <div className="text-gray-500">{new Date(log.timestamp).toLocaleString('bg-BG')} • {log.reprintedBy} • {log.reason}</div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        </div>
      )}
    </div>
    </div>
  );
};

export default LabelGenerator;
