/**
 * Build Master Data from 2025 Ward Merger JSON
 * Source: github.com/phucanhle/vn-xaphuong-2025
 * Generates: data/master-wards-2025.js (loadable in browser)
 */

const fs = require('fs');
const path = require('path');

const rawData = require('../data/danhmucxaphuong.json');

// Province name normalization map
const PROVINCE_CANONICAL = {
  'Thành phố Hà Nội': 'Hà Nội',
  'Tp Hồ Chí Minh': 'Hồ Chí Minh',
  'Tp Hải Phòng': 'Hải Phòng',
  'Tp Đà Nẵng': 'Đà Nẵng',
  'Tp Cần Thơ': 'Cần Thơ',
  'Thành phố Huế': 'Huế',
  'Tỉnh Bắc Ninh': 'Bắc Ninh',
  'Tỉnh Quảng Ninh': 'Quảng Ninh',
  'Tỉnh Hưng Yên': 'Hưng Yên',
  'Tỉnh Ninh Bình': 'Ninh Bình',
  'Tỉnh Cao Bằng': 'Cao Bằng',
  'Tỉnh Tuyên Quang': 'Tuyên Quang',
  'Tỉnh Lào Cai': 'Lào Cai',
  'Tỉnh Thái Nguyên': 'Thái Nguyên',
  'Tỉnh Lạng Sơn': 'Lạng Sơn',
  'Tỉnh Phú Thọ': 'Phú Thọ',
  'Tỉnh Điện Biên': 'Điện Biên',
  'Tỉnh Lai Châu': 'Lai Châu',
  'Tỉnh Sơn La': 'Sơn La',
  'Tỉnh Thanh Hóa': 'Thanh Hóa',
  'Tỉnh Nghệ An': 'Nghệ An',
  'Tỉnh Hà Tĩnh': 'Hà Tĩnh',
  'Tỉnh Quảng Trị': 'Quảng Trị',
  'Tỉnh Quảng Ngãi': 'Quảng Ngãi',
  'Tỉnh Khánh Hòa': 'Khánh Hòa',
  'Tỉnh Gia Lai': 'Gia Lai',
  'Tỉnh Đắk Lắk': 'Đắk Lắk',
  'Tỉnh Lâm Đồng': 'Lâm Đồng',
  'Tỉnh Tây Ninh': 'Tây Ninh',
  'Tỉnh Đồng Nai': 'Đồng Nai',
  'Tỉnh Vĩnh Long': 'Vĩnh Long',
  'Tỉnh Đồng Tháp': 'Đồng Tháp',
  'Tỉnh An Giang': 'An Giang',
  'Tỉnh Cà Mau': 'Cà Mau',
};

// Build structured data: Province → Wards list
const masterData = {};
let totalWards = 0;

for (const prov of rawData) {
  const canonicalName = PROVINCE_CANONICAL[prov.tentinhmoi] || prov.tentinhmoi;
  
  const wards = prov.phuongxa.map(w => w.tenphuongxa);
  totalWards += wards.length;
  
  masterData[canonicalName] = {
    codeBNV: prov.matinhBNV,
    codeTMS: prov.matinhTMS,
    wards: wards
  };
}

console.log(`✅ Processed ${Object.keys(masterData).length} provinces, ${totalWards} wards`);

// Generate JavaScript module for browser use
let jsOutput = `/* ============================================
   MASTER WARD DATA 2025 - Post-Merger
   Generated from: github.com/phucanhle/vn-xaphuong-2025
   Source: Nghị quyết UBTVQH - hiệu lực 01/07/2025
   Total: ${Object.keys(masterData).length} tỉnh/thành, ${totalWards} phường/xã
   ============================================ */

// This data is loaded by address-data.js to provide
// comprehensive ward lookup for the new 2025 admin structure

const MASTER_WARDS_2025 = {\n`;

for (const [provName, provData] of Object.entries(masterData)) {
  jsOutput += `  '${provName}': [\n`;
  for (const ward of provData.wards) {
    jsOutput += `    '${ward.replace(/'/g, "\\'")}',\n`;
  }
  jsOutput += `  ],\n`;
}

jsOutput += `};\n\n`;
jsOutput += `// Export for use in address-data.js\n`;
jsOutput += `if (typeof module !== 'undefined') module.exports = MASTER_WARDS_2025;\n`;

const outPath = path.join(__dirname, '..', 'data', 'master-wards-2025.js');
fs.writeFileSync(outPath, jsOutput, 'utf8');
console.log(`✅ Written to: ${outPath}`);
console.log(`   File size: ${(fs.statSync(outPath).size / 1024).toFixed(1)} KB`);

// Also generate a lookup-friendly version for quick fuzzy matching
// This creates a normalized index: "phuong ben nghe" → "Phường Bến Nghé"
const removeDiacritics = (str) => str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D');

let lookupOutput = `/* Ward Lookup Index — diacritics-free keys for fuzzy matching */\nconst WARD_LOOKUP_INDEX = {\n`;
let lookupCount = 0;

for (const [provName, provData] of Object.entries(masterData)) {
  for (const ward of provData.wards) {
    const key = removeDiacritics(ward).toLowerCase();
    lookupOutput += `  '${key}': { w: '${ward.replace(/'/g, "\\'")}', p: '${provName}' },\n`;
    lookupCount++;
  }
}

lookupOutput += `};\nif (typeof module !== 'undefined') module.exports = WARD_LOOKUP_INDEX;\n`;

const lookupPath = path.join(__dirname, '..', 'data', 'ward-lookup-index.js');
fs.writeFileSync(lookupPath, lookupOutput, 'utf8');
console.log(`✅ Lookup index: ${lookupPath}`);
console.log(`   ${lookupCount} entries, ${(fs.statSync(lookupPath).size / 1024).toFixed(1)} KB`);
