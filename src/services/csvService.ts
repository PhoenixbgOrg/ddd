
/**
 * Utility to convert array of objects to CSV string and vice-versa.
 */

export const csvService = {
    exportToCsv: <T extends Record<string, any>>(data: T[], filename: string) => {
        if (data.length === 0) return;
        
        const headers = Object.keys(data[0]);
        const csvRows = [headers.join(',')];

        for (const row of data) {
            const values = headers.map(header => {
                const val = row[header];
                const escaped = ('' + (val ?? '')).replace(/"/g, '""');
                return `"${escaped}"`;
            });
            csvRows.push(values.join(','));
        }

        const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + csvRows.join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    },

    importFromCsv: <T>(csvText: string, mapFn: (row: Record<string, string>) => T): T[] => {
        const lines = csvText.split('\n').filter(l => l.trim());
        if (lines.length < 2) return [];

        const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
        const result: T[] = [];

        for (let i = 1; i < lines.length; i++) {
            // Simple regex to handle quoted commas
            const rowValues: string[] = [];
            let inQuote = false;
            let currentVal = '';
            const line = lines[i];
            
            for(let charIndex=0; charIndex<line.length; charIndex++) {
                const char = line[charIndex];
                if(char === '"') {
                    inQuote = !inQuote;
                } else if (char === ',' && !inQuote) {
                    rowValues.push(currentVal.trim().replace(/^"|"$/g, '').replace(/""/g, '"'));
                    currentVal = '';
                } else {
                    currentVal += char;
                }
            }
            rowValues.push(currentVal.trim().replace(/^"|"$/g, '').replace(/""/g, '"'));

            if (rowValues.length === headers.length) {
                const rowObj: Record<string, string> = {};
                headers.forEach((h, idx) => {
                    rowObj[h] = rowValues[idx];
                });
                try {
                    result.push(mapFn(rowObj));
                } catch (e) {
                    console.warn("Failed to map row", i, e);
                }
            }
        }
        return result;
    }
};
