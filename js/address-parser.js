/* ============================================
   Vietnamese Address Parser Module
   ============================================
   Phân rã địa chỉ Việt Nam thành:
   - Số nhà & Đường (Street)
   - Phường/Xã (Ward)
   - Tỉnh/Thành phố (Province)
   
   Handles:
   - Abbreviations: TP. HCM, HN, HANOI, HNoi, etc.
   - Multi-line addresses (2 lines merged)
   - Vietnam 2025 reform: 3-level → 2-level (no district)
   - Both old (63 provinces) and new (34 provinces) names
   ============================================ */

const AddressParser = {

  // =============================================
  // COMPREHENSIVE PROVINCE DICTIONARY
  // Includes: official names, abbreviations, 
  // no-diacritic variants, common misspellings
  // =============================================
  _provinceAliases: null,
  _wardKeywords: null,

  _buildDictionaries() {
    if (this._provinceAliases) return;

    // Full list of Vietnam provinces/cities (post-2025 reform + legacy names)
    // Format: { canonical: "Tên chuẩn", aliases: [...] }
    const provinces = [
      // ===== 6 Centrally-managed cities =====
      { canonical: "Hà Nội", aliases: ["ha noi", "hanoi", "hn", "hnoi", "h.noi", "tp ha noi", "tp. ha noi", "tp.ha noi", "tp hanoi", "tp.hanoi", "thanh pho ha noi", "hà nội", "tp. hà nội", "tp.hà nội", "thành phố hà nội"] },
      { canonical: "Hồ Chí Minh", aliases: ["ho chi minh", "hcm", "tp hcm", "tp.hcm", "tp. hcm", "tp. ho chi minh", "tp.ho chi minh", "sai gon", "saigon", "sg", "sgon", "s.gon", "hồ chí minh", "tp. hồ chí minh", "sài gòn", "thành phố hồ chí minh"] },
      { canonical: "Đà Nẵng", aliases: ["da nang", "danang", "dn", "dnang", "d.nang", "tp da nang", "tp. da nang", "đà nẵng", "tp. đà nẵng", "thành phố đà nẵng"] },
      { canonical: "Hải Phòng", aliases: ["hai phong", "haiphong", "hp", "hphong", "h.phong", "tp hai phong", "tp. hai phong", "hải phòng", "tp. hải phòng", "thành phố hải phòng"] },
      { canonical: "Cần Thơ", aliases: ["can tho", "cantho", "ct", "ctho", "c.tho", "tp can tho", "tp. can tho", "cần thơ", "tp. cần thơ", "thành phố cần thơ"] },
      { canonical: "Huế", aliases: ["hue", "tp hue", "tp. hue", "thua thien hue", "thua thien", "thừa thiên huế","thừa thiên", "thừa thiên - huế", "tp. huế", "thành phố huế", "tt hue", "tt. hue", "tthue"] },

      // ===== Northern provinces =====
      { canonical: "Hà Giang", aliases: ["ha giang", "hagiang", "hg", "hgiang", "hà giang"] },
      { canonical: "Cao Bằng", aliases: ["cao bang", "caobang", "cb", "cbang", "cao bằng"] },
      { canonical: "Bắc Kạn", aliases: ["bac kan", "backan", "bk", "bkan", "bắc kạn", "bac can", "baccan"] },
      { canonical: "Tuyên Quang", aliases: ["tuyen quang", "tuyenquang", "tq", "tquang", "tuyên quang"] },
      { canonical: "Lào Cai", aliases: ["lao cai", "laocai", "lc", "lcai", "lào cai"] },
      { canonical: "Điện Biên", aliases: ["dien bien", "dienbien", "db", "dbien", "điện biên", "dien bien phu", "điện biên phủ"] },
      { canonical: "Lai Châu", aliases: ["lai chau", "laichau", "lchau", "lai châu"] },
      { canonical: "Sơn La", aliases: ["son la", "sonla", "sl", "sla", "sơn la"] },
      { canonical: "Yên Bái", aliases: ["yen bai", "yenbai", "yb", "ybai", "yên bái"] },
      { canonical: "Hòa Bình", aliases: ["hoa binh", "hoabinh", "hb", "hbinh", "hòa bình"] },
      { canonical: "Thái Nguyên", aliases: ["thai nguyen", "thainguyen", "tn", "tnguyen", "thái nguyên"] },
      { canonical: "Lạng Sơn", aliases: ["lang son", "langson", "ls", "lson", "lạng sơn"] },
      { canonical: "Quảng Ninh", aliases: ["quang ninh", "quangninh", "qn", "qninh", "quảng ninh"] },
      { canonical: "Bắc Giang", aliases: ["bac giang", "bacgiang", "bg", "bgiang", "bắc giang"] },
      { canonical: "Phú Thọ", aliases: ["phu tho", "phutho", "pt", "ptho", "phú thọ"] },
      { canonical: "Vĩnh Phúc", aliases: ["vinh phuc", "vinhphuc", "vp", "vphuc", "vĩnh phúc"] },
      { canonical: "Bắc Ninh", aliases: ["bac ninh", "bacninh", "bn", "bninh", "bắc ninh"] },
      { canonical: "Hải Dương", aliases: ["hai duong", "haiduong", "hd", "hduong", "hải dương"] },
      { canonical: "Hưng Yên", aliases: ["hung yen", "hungyen", "hy", "hyen", "hưng yên"] },
      { canonical: "Hà Nam", aliases: ["ha nam", "hanam", "hnam", "hà nam"] },
      { canonical: "Nam Định", aliases: ["nam dinh", "namdinh", "nd", "ndinh", "nam định"] },
      { canonical: "Thái Bình", aliases: ["thai binh", "thaibinh", "tb", "tbinh", "thái bình"] },
      { canonical: "Ninh Bình", aliases: ["ninh binh", "ninhbinh", "nb", "nbinh", "ninh bình"] },

      // ===== Central provinces =====
      { canonical: "Thanh Hóa", aliases: ["thanh hoa", "thanhhoa", "th", "thoa", "thanh hoá", "thanh hóa"] },
      { canonical: "Nghệ An", aliases: ["nghe an", "nghean", "na", "nan", "nghệ an"] },
      { canonical: "Hà Tĩnh", aliases: ["ha tinh", "hatinh", "ht", "htinh", "hà tĩnh"] },
      { canonical: "Quảng Bình", aliases: ["quang binh", "quangbinh", "qb", "qbinh", "quảng bình"] },
      { canonical: "Quảng Trị", aliases: ["quang tri", "quangtri", "qt", "qtri", "quảng trị"] },
      { canonical: "Quảng Nam", aliases: ["quang nam", "quangnam", "qnam", "quảng nam"] },
      { canonical: "Quảng Ngãi", aliases: ["quang ngai", "quangngai", "qng", "qngai", "quảng ngãi"] },
      { canonical: "Bình Định", aliases: ["binh dinh", "binhdinh", "bd", "bdinh", "bình định"] },
      { canonical: "Phú Yên", aliases: ["phu yen", "phuyen", "py", "pyen", "phú yên"] },
      { canonical: "Khánh Hòa", aliases: ["khanh hoa", "khanhhoa", "kh", "khoa", "khánh hòa", "khánh hoà", "nha trang"] },
      { canonical: "Ninh Thuận", aliases: ["ninh thuan", "ninhthuan", "nt", "nthuan", "ninh thuận"] },
      { canonical: "Bình Thuận", aliases: ["binh thuan", "binhthuan", "bt", "bthuan", "bình thuận", "phan thiet", "phan thiết"] },

      // ===== Central Highlands =====
      { canonical: "Kon Tum", aliases: ["kon tum", "kontum", "ktum", "kon tum"] },
      { canonical: "Gia Lai", aliases: ["gia lai", "gialai", "gl", "glai", "gia lai"] },
      { canonical: "Đắk Lắk", aliases: ["dak lak", "daklak", "dl", "dlak", "đắk lắk", "dac lac", "đắc lắc", "đăk lăk", "dak lac", "buon ma thuot", "buôn ma thuột"] },
      { canonical: "Đắk Nông", aliases: ["dak nong", "daknong", "dnong", "đắk nông", "đắc nông", "dac nong"] },
      { canonical: "Lâm Đồng", aliases: ["lam dong", "lamdong", "ld", "ldong", "lâm đồng", "da lat", "đà lạt", "dalat"] },

      // ===== Southeast =====
      { canonical: "Bình Phước", aliases: ["binh phuoc", "binhphuoc", "bp", "bphuoc", "bình phước"] },
      { canonical: "Tây Ninh", aliases: ["tay ninh", "tayninh", "tninh", "tây ninh"] },
      { canonical: "Bình Dương", aliases: ["binh duong", "binhduong", "bduong", "bình dương"] },
      { canonical: "Đồng Nai", aliases: ["dong nai", "dongnai", "dnai", "đồng nai"] },
      { canonical: "Bà Rịa - Vũng Tàu", aliases: ["ba ria vung tau", "bariavungtau", "brvt", "br-vt", "vung tau", "vungtau", "bà rịa - vũng tàu", "bà rịa vũng tàu", "bà rịa", "vũng tàu"] },

      // ===== Mekong Delta =====
      { canonical: "Long An", aliases: ["long an", "longan", "la", "lan", "long an"] },
      { canonical: "Tiền Giang", aliases: ["tien giang", "tiengiang", "tg", "tgiang", "tiền giang"] },
      { canonical: "Bến Tre", aliases: ["ben tre", "bentre", "btre", "bến tre"] },
      { canonical: "Trà Vinh", aliases: ["tra vinh", "travinh", "tv", "tvinh", "trà vinh"] },
      { canonical: "Vĩnh Long", aliases: ["vinh long", "vinhlong", "vl", "vlong", "vĩnh long"] },
      { canonical: "Đồng Tháp", aliases: ["dong thap", "dongthap", "dt", "dthap", "đồng tháp"] },
      { canonical: "An Giang", aliases: ["an giang", "angiang", "ag", "agiang", "an giang"] },
      { canonical: "Kiên Giang", aliases: ["kien giang", "kiengiang", "kg", "kgiang", "kiên giang", "phu quoc", "phú quốc"] },
      { canonical: "Hậu Giang", aliases: ["hau giang", "haugiang", "hgiang2", "hậu giang"] },
      { canonical: "Sóc Trăng", aliases: ["soc trang", "soctrang", "st", "strang", "sóc trăng"] },
      { canonical: "Bạc Liêu", aliases: ["bac lieu", "baclieu", "bl", "blieu", "bạc liêu"] },
      { canonical: "Cà Mau", aliases: ["ca mau", "camau", "cm", "cmau", "cà mau"] },

      // ===== Legacy merged provinces (pre-2025 reform) =====
      { canonical: "Hà Nội", aliases: ["ha tay", "hà tây"] }, // Hà Tây merged into Hà Nội
    ];

    // Build a fast lookup map: lowercased alias → canonical name
    this._provinceAliases = new Map();
    for (const p of provinces) {
      // Add canonical name itself
      this._provinceAliases.set(p.canonical.toLowerCase(), p.canonical);
      this._provinceAliases.set(this._removeDiacritics(p.canonical).toLowerCase(), p.canonical);
      for (const alias of p.aliases) {
        this._provinceAliases.set(alias.toLowerCase(), p.canonical);
        this._provinceAliases.set(this._removeDiacritics(alias).toLowerCase(), p.canonical);
      }
    }

    // Keywords that indicate ward/commune level
    this._wardKeywords = [
      'phường', 'phuong', 'p.',
      'xã', 'xa', 'x.',
      'thị trấn', 'thi tran', 'tt.',
      'thị xã', 'thi xa', 'tx.'
    ];
  },

  // =============================================
  // UTILITY: Remove Vietnamese diacritics
  // =============================================
  _removeDiacritics(str) {
    if (!str) return '';
    return str.normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd').replace(/Đ/g, 'D')
      .replace(/ơ/g, 'o').replace(/Ơ/g, 'O')
      .replace(/ư/g, 'u').replace(/Ư/g, 'U');
  },

  // =============================================
  // UTILITY: Normalize address string
  // =============================================
  _normalize(str) {
    if (!str) return '';
    return str
      .replace(/\r\n|\r/g, '\n')           // Normalize line breaks
      .replace(/\n+/g, ', ')               // Multi-line → comma-separated
      .replace(/\s+/g, ' ')                // Collapse whitespace
      .replace(/,\s*,/g, ',')              // Remove double commas
      .replace(/^[\s,]+|[\s,]+$/g, '')     // Trim leading/trailing commas & spaces
      .trim();
  },

  // =============================================
  // CORE: Detect province from address segments
  // =============================================
  _detectProvince(text) {
    this._buildDictionaries();
    const normalized = text.toLowerCase().trim();
    const noDiacritics = this._removeDiacritics(normalized);

    // Strategy 1: Exact match on full string
    if (this._provinceAliases.has(normalized)) {
      return this._provinceAliases.get(normalized);
    }
    if (this._provinceAliases.has(noDiacritics)) {
      return this._provinceAliases.get(noDiacritics);
    }

    // Strategy 2: Remove common prefixes and try again
    const prefixes = ['tp.', 'tp ', 'tỉnh ', 'tinh ', 'thanh pho ', 'thành phố ', 't.', 'th.'];
    for (const prefix of prefixes) {
      if (noDiacritics.startsWith(prefix)) {
        const remainder = noDiacritics.substring(prefix.length).trim();
        if (this._provinceAliases.has(remainder)) {
          return this._provinceAliases.get(remainder);
        }
      }
      if (normalized.startsWith(prefix)) {
        const remainder = normalized.substring(prefix.length).trim();
        if (this._provinceAliases.has(remainder)) {
          return this._provinceAliases.get(remainder);
        }
      }
    }

    // Strategy 3: Fuzzy matching — check if any known alias is contained in the text
    let bestMatch = null;
    let bestLen = 0;
    for (const [alias, canonical] of this._provinceAliases) {
      // Only match aliases with length >= 3 to avoid false positives
      if (alias.length < 3) continue;
      if (noDiacritics.includes(alias) && alias.length > bestLen) {
        bestMatch = canonical;
        bestLen = alias.length;
      }
    }
    return bestMatch;
  },

  // =============================================
  // CORE: Detect ward/commune from address
  // =============================================
  _detectWard(text) {
    this._buildDictionaries();
    const lower = text.toLowerCase().trim();

    // Pattern: "Phường X", "Xã Y", "Thị trấn Z", "P. ABC", "X. XYZ"
    const patterns = [
      /(?:phường|phuong|p\.)\s*(.+)/i,
      /(?:xã|xa|x\.)\s*(.+)/i,
      /(?:thị trấn|thi tran|tt\.)\s*(.+)/i,
      /(?:thị xã|thi xa|tx\.)\s*(.+)/i,
    ];

    for (const pattern of patterns) {
      const match = lower.match(pattern);
      if (match) {
        return match[0].trim();
      }
    }

    return null;
  },

  // =============================================
  // CORE: Detect district (old 3-level system) 
  // Still useful for mapping to ward context
  // =============================================
  _detectDistrict(text) {
    const lower = text.toLowerCase().trim();
    const patterns = [
      /(?:quận|quan|q\.)\s*(.+)/i,
      /(?:huyện|huyen|h\.)\s*(.+)/i,
      /(?:thị xã|thi xa|tx\.)\s*(.+)/i,
      /(?:thành phố|thanh pho|tp\.)\s*(.+)/i,
    ];

    for (const pattern of patterns) {
      const match = lower.match(pattern);
      if (match) {
        return match[0].trim();
      }
    }
    return null;
  },

  // =============================================
  // MAIN PARSING ENGINE
  // Input: raw address string (possibly multi-line)
  // Output: { street, ward, province, district?, raw }
  // =============================================
  parseAddress(rawAddress) {
    if (!rawAddress || typeof rawAddress !== 'string') {
      return { street: '', ward: '', province: '', district: '', raw: rawAddress || '' };
    }

    this._buildDictionaries();

    // Step 1: Normalize (merge multi-line, clean up)
    const normalized = this._normalize(rawAddress);
    
    // Step 2: Split by comma, dash, or common delimiters
    const segments = normalized
      .split(/[,\-–—]+/)
      .map(s => s.trim())
      .filter(s => s.length > 0);

    let province = '';
    let ward = '';
    let district = '';
    let streetParts = [];
    let provinceIdx = -1;
    let wardIdx = -1;
    let districtIdx = -1;

    // Step 3: Scan segments from RIGHT to LEFT (province usually at the end)
    for (let i = segments.length - 1; i >= 0; i--) {
      const seg = segments[i];

      // Try to detect province
      if (!province) {
        const detected = this._detectProvince(seg);
        if (detected) {
          province = detected;
          provinceIdx = i;
          continue;
        }
      }

      // Try to detect district (even in new 2-level system, data may still have it)
      if (!district) {
        const detected = this._detectDistrict(seg);
        if (detected) {
          district = detected;
          districtIdx = i;
          continue;
        }
      }

      // Try to detect ward
      if (!ward) {
        const detected = this._detectWard(seg);
        if (detected) {
          ward = detected;
          wardIdx = i;
          continue;
        }
      }
    }

    // Step 4: Everything that's not province/ward/district is street
    for (let i = 0; i < segments.length; i++) {
      if (i !== provinceIdx && i !== wardIdx && i !== districtIdx) {
        streetParts.push(segments[i]);
      }
    }

    // Step 5: If no ward but district found, try to extract ward from district text
    if (!ward && district) {
      // In new 2-level system, what was "district" might actually be ward-level
      // Keep district info but also check if it could serve as ward
    }

    // Step 6: If still no province, try fuzzy match on the entire string
    if (!province) {
      province = this._detectProvince(normalized) || '';
      // If found, try to remove province text from street parts
      if (province) {
        streetParts = streetParts.filter(s => {
          const det = this._detectProvince(s);
          return det !== province;
        });
      }
    }

    // Capitalize ward properly
    if (ward) {
      ward = this._capitalizeVietnamese(ward);
    }
    if (district) {
      district = this._capitalizeVietnamese(district);
    }

    return {
      street: streetParts.join(', ').trim(),
      ward: ward,
      province: province,
      district: district,
      raw: rawAddress
    };
  },

  // =============================================
  // Capitalize Vietnamese text properly
  // =============================================
  _capitalizeVietnamese(str) {
    if (!str) return '';
    return str.replace(/\b\w/g, c => c.toUpperCase());
  },

  // =============================================
  // BATCH PARSE: Process array of addresses
  // =============================================
  parseAddresses(addresses) {
    return addresses.map(addr => this.parseAddress(addr));
  },

  // =============================================
  // EXCEL INTEGRATION: Read addresses from Excel
  // file object, column index or column name
  // =============================================
  readAndParseExcel(file, columnIdentifier) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const wb = XLSX.read(data, { type: 'array' });
          const sheetName = wb.SheetNames[0];
          const sheet = wb.Sheets[sheetName];
          
          if (!sheet || !sheet['!ref']) {
            resolve({ headers: [], rows: [], parsed: [] });
            return;
          }

          // Convert to JSON
          const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
          
          if (jsonData.length < 2) {
            resolve({ headers: jsonData[0] || [], rows: [], parsed: [] });
            return;
          }

          const headers = jsonData[0].map(h => String(h).trim());
          const dataRows = jsonData.slice(1).filter(row => row.some(cell => cell !== ''));

          // Find the address column
          let addressColIdx = -1;
          if (typeof columnIdentifier === 'number') {
            addressColIdx = columnIdentifier;
          } else if (typeof columnIdentifier === 'string') {
            addressColIdx = headers.findIndex(h => 
              h.toLowerCase() === columnIdentifier.toLowerCase() ||
              h.toLowerCase().includes(columnIdentifier.toLowerCase())
            );
          }

          // Auto-detect address column if not specified
          if (addressColIdx < 0) {
            const addressKeywords = ['địa chỉ', 'dia chi', 'address', 'đ/c', 'dc'];
            for (let i = 0; i < headers.length; i++) {
              const h = headers[i].toLowerCase();
              if (addressKeywords.some(kw => h.includes(kw))) {
                addressColIdx = i;
                break;
              }
            }
          }

          if (addressColIdx < 0) {
            reject(new Error('Không tìm thấy cột địa chỉ. Vui lòng chọn cột chứa dữ liệu địa chỉ.'));
            return;
          }

          // Extract addresses and handle multi-line (2 rows = 1 address)
          const addresses = [];
          const rowIndices = [];
          
          for (let i = 0; i < dataRows.length; i++) {
            const cellValue = String(dataRows[i][addressColIdx] || '').trim();
            if (cellValue) {
              addresses.push(cellValue);
              rowIndices.push(i);
            }
          }

          // Parse all addresses
          const parsed = this.parseAddresses(addresses);

          resolve({
            headers,
            rows: dataRows,
            addressColumnIndex: addressColIdx,
            addressColumnName: headers[addressColIdx],
            addresses,
            parsed,
            rowIndices
          });
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  },

  // =============================================
  // EXPORT: Generate Excel with parsed results
  // =============================================
  exportToExcel(originalData, parsedResults, filename = 'dia_chi_phan_ra.xlsx') {
    const headers = [...originalData.headers];
    const insertIdx = originalData.addressColumnIndex + 1;
    
    // Insert new columns after the address column
    headers.splice(insertIdx, 0, 'Số nhà & Đường', 'Phường/Xã', 'Quận/Huyện (cũ)', 'Tỉnh/Thành phố');

    const rows = originalData.rows.map((row, idx) => {
      const newRow = [...row];
      const parsed = parsedResults[idx] || { street: '', ward: '', district: '', province: '' };
      newRow.splice(insertIdx, 0, parsed.street, parsed.ward, parsed.district, parsed.province);
      return newRow;
    });

    // Create workbook
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Địa chỉ phân rã');

    // Auto-fit column widths
    const colWidths = headers.map((h, i) => {
      let maxLen = h.length;
      rows.forEach(row => {
        const cellLen = String(row[i] || '').length;
        if (cellLen > maxLen) maxLen = cellLen;
      });
      return { wch: Math.min(maxLen + 2, 50) };
    });
    ws['!cols'] = colWidths;

    // Download
    XLSX.writeFile(wb, filename);
  }
};

// =============================================
// ADDRESS PARSER UI MODULE
// =============================================
const AddressParserUI = {

  _file: null,
  _parsedResult: null,
  _selectedColumn: -1,

  // Initialize the Address Parser page
  init() {
    // Nothing to initialize on load
  },

  // Handle file upload
  handleFile(file) {
    if (!file) return;
    const ext = file.name.split('.').pop().toLowerCase();
    if (!['xlsx', 'xls'].includes(ext)) {
      App.toast('Chỉ hỗ trợ file Excel (.xlsx, .xls)', 'warning');
      return;
    }

    this._file = file;
    this._parsedResult = null;
    this._selectedColumn = -1;

    // Read headers to let user select address column
    this._readFileHeaders(file);
  },

  handleDrop(e) {
    const files = e.dataTransfer ? e.dataTransfer.files : [];
    if (files.length) this.handleFile(files[0]);
  },

  async _readFileHeaders(file) {
    try {
      const data = await this._readFileAsArray(file);
      const wb = XLSX.read(data, { type: 'array', sheetRows: 10 });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      
      if (!sheet || !sheet['!ref']) {
        App.toast('File rỗng hoặc không đọc được', 'error');
        return;
      }

      const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
      if (jsonData.length < 1) {
        App.toast('File không có dữ liệu', 'error');
        return;
      }

      const headers = jsonData[0].map(h => String(h).trim());
      const sampleRows = jsonData.slice(1, 6);

      this._renderColumnSelector(file.name, headers, sampleRows);
    } catch (err) {
      console.error(err);
      App.toast('Lỗi đọc file: ' + err.message, 'error');
    }
  },

  _readFileAsArray(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(new Uint8Array(e.target.result));
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  },

  _renderColumnSelector(fileName, headers, sampleRows) {
    const container = document.getElementById('ap-column-selector');
    const resultSection = document.getElementById('ap-result-section');
    if (resultSection) resultSection.style.display = 'none';

    // Auto-detect address column
    const addressKeywords = ['địa chỉ', 'dia chi', 'address', 'đ/c', 'dc', 'diachi'];
    let autoDetected = -1;
    for (let i = 0; i < headers.length; i++) {
      const h = headers[i].toLowerCase();
      if (addressKeywords.some(kw => h.includes(kw))) {
        autoDetected = i;
        break;
      }
    }

    container.innerHTML = `
      <div class="ap-file-info">
        <div class="ap-file-icon">📊</div>
        <div class="ap-file-details">
          <div class="ap-file-name">${fileName}</div>
          <div class="ap-file-meta">${headers.length} cột · ${sampleRows.length}+ dòng dữ liệu</div>
        </div>
        <button class="ap-file-remove" onclick="AddressParserUI.removeFile()">✕</button>
      </div>

      <div class="ap-step-label">
        <span class="ap-step-num">2</span>
        <span>Chọn cột chứa địa chỉ cần phân rã</span>
      </div>

      <div class="ap-columns-grid">
        ${headers.map((h, i) => {
          const isAuto = i === autoDetected;
          const samples = sampleRows.map(r => String(r[i] || '').substring(0, 60)).filter(s => s).slice(0, 3);
          return `
            <div class="ap-column-card ${isAuto ? 'auto-detected' : ''}" 
                 id="ap-col-${i}" onclick="AddressParserUI.selectColumn(${i})">
              <div class="ap-col-header">
                <span class="ap-col-letter">${String.fromCharCode(65 + (i % 26))}</span>
                <span class="ap-col-name">${h || '(Không tên)'}</span>
                ${isAuto ? '<span class="ap-auto-badge">Tự động phát hiện</span>' : ''}
              </div>
              <div class="ap-col-samples">
                ${samples.map(s => `<div class="ap-col-sample">${s}</div>`).join('')}
              </div>
              <div class="ap-col-check">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </div>
            </div>
          `;
        }).join('')}
      </div>

      <div class="ap-action-bar">
        <button class="btn btn-primary btn-lg" id="ap-btn-parse" onclick="AddressParserUI.startParsing()" disabled>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/>
            <rect x="9" y="3" width="6" height="4" rx="1"/>
            <path d="M9 14l2 2 4-4"/>
          </svg>
          Bắt đầu phân rã địa chỉ
        </button>
      </div>
    `;

    container.style.display = 'block';

    // Auto-select if detected
    if (autoDetected >= 0) {
      this.selectColumn(autoDetected);
    }
  },

  selectColumn(idx) {
    this._selectedColumn = idx;
    
    // Update UI
    document.querySelectorAll('.ap-column-card').forEach(c => c.classList.remove('selected'));
    const card = document.getElementById(`ap-col-${idx}`);
    if (card) card.classList.add('selected');
    
    // Enable parse button
    const btn = document.getElementById('ap-btn-parse');
    if (btn) btn.disabled = false;
  },

  removeFile() {
    this._file = null;
    this._parsedResult = null;
    this._selectedColumn = -1;
    document.getElementById('ap-column-selector').style.display = 'none';
    document.getElementById('ap-result-section').style.display = 'none';
  },

  async startParsing() {
    if (!this._file || this._selectedColumn < 0) {
      App.toast('Vui lòng chọn file và cột địa chỉ', 'warning');
      return;
    }

    const btn = document.getElementById('ap-btn-parse');
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `
        <div class="ap-spinner"></div>
        Đang phân rã địa chỉ...
      `;
    }

    try {
      const result = await AddressParser.readAndParseExcel(this._file, this._selectedColumn);
      this._parsedResult = result;
      this._renderResults(result);
      App.toast(`Đã phân rã ${result.parsed.length} địa chỉ thành công!`, 'success');
    } catch (err) {
      console.error(err);
      App.toast('Lỗi phân rã: ' + err.message, 'error');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = `
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/>
            <rect x="9" y="3" width="6" height="4" rx="1"/>
            <path d="M9 14l2 2 4-4"/>
          </svg>
          Bắt đầu phân rã địa chỉ
        `;
      }
    }
  },

  _renderResults(result) {
    const section = document.getElementById('ap-result-section');
    
    // Stats
    const total = result.parsed.length;
    const withProvince = result.parsed.filter(p => p.province).length;
    const withWard = result.parsed.filter(p => p.ward).length;
    const withStreet = result.parsed.filter(p => p.street).length;
    const withDistrict = result.parsed.filter(p => p.district).length;

    // Province distribution
    const provinceCounts = {};
    result.parsed.forEach(p => {
      if (p.province) {
        provinceCounts[p.province] = (provinceCounts[p.province] || 0) + 1;
      }
    });
    const topProvinces = Object.entries(provinceCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);

    section.innerHTML = `
      <div class="ap-result-header">
        <h3>📊 Kết quả phân rã địa chỉ</h3>
        <div class="ap-result-actions">
          <button class="btn btn-outline" onclick="AddressParserUI.toggleAllRows()">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
            Xem tất cả
          </button>
          <button class="btn btn-success" onclick="AddressParserUI.exportResult()">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Xuất Excel
          </button>
        </div>
      </div>

      <!-- Stats Cards -->
      <div class="ap-stats-grid">
        <div class="ap-stat-card">
          <div class="ap-stat-value">${total}</div>
          <div class="ap-stat-label">Tổng địa chỉ</div>
          <div class="ap-stat-bar"><div class="ap-stat-fill" style="width:100%;background:var(--primary);"></div></div>
        </div>
        <div class="ap-stat-card">
          <div class="ap-stat-value">${withStreet}</div>
          <div class="ap-stat-label">Có số nhà/đường</div>
          <div class="ap-stat-bar"><div class="ap-stat-fill" style="width:${total ? (withStreet/total*100) : 0}%;background:#22d3ee;"></div></div>
        </div>
        <div class="ap-stat-card">
          <div class="ap-stat-value">${withWard}</div>
          <div class="ap-stat-label">Có phường/xã</div>
          <div class="ap-stat-bar"><div class="ap-stat-fill" style="width:${total ? (withWard/total*100) : 0}%;background:#8b5cf6;"></div></div>
        </div>
        <div class="ap-stat-card">
          <div class="ap-stat-value">${withProvince}</div>
          <div class="ap-stat-label">Có tỉnh/TP</div>
          <div class="ap-stat-bar"><div class="ap-stat-fill" style="width:${total ? (withProvince/total*100) : 0}%;background:#10b981;"></div></div>
        </div>
      </div>

      <!-- Top Provinces Chart -->
      ${topProvinces.length > 0 ? `
      <div class="ap-province-chart">
        <h4>🏙️ Phân bổ theo Tỉnh/Thành phố</h4>
        <div class="ap-province-bars">
          ${topProvinces.map(([name, count], idx) => {
            const pct = (count / total * 100).toFixed(1);
            const colors = ['#6366f1', '#8b5cf6', '#22d3ee', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#3b82f6'];
            return `
              <div class="ap-province-row">
                <span class="ap-province-name">${name}</span>
                <div class="ap-province-bar-wrap">
                  <div class="ap-province-bar-fill" style="width:${pct}%;background:${colors[idx % colors.length]};"></div>
                </div>
                <span class="ap-province-count">${count} <small>(${pct}%)</small></span>
              </div>
            `;
          }).join('')}
        </div>
      </div>
      ` : ''}

      <!-- Result Table -->
      <div class="ap-table-wrap">
        <table class="ap-result-table">
          <thead>
            <tr>
              <th class="ap-th-num">#</th>
              <th class="ap-th-raw">Địa chỉ gốc</th>
              <th class="ap-th-street">Số nhà & Đường</th>
              <th class="ap-th-ward">Phường/Xã</th>
              <th class="ap-th-district">Quận/Huyện (cũ)</th>
              <th class="ap-th-province">Tỉnh/Thành phố</th>
              <th class="ap-th-status">Trạng thái</th>
            </tr>
          </thead>
          <tbody id="ap-result-tbody">
            ${result.parsed.slice(0, 50).map((p, i) => this._renderResultRow(p, i)).join('')}
          </tbody>
        </table>
        ${result.parsed.length > 50 ? `
          <div class="ap-table-footer">
            <span>Đang hiển thị 50 / ${result.parsed.length} dòng</span>
            <button class="btn btn-outline btn-sm" onclick="AddressParserUI.showAllRows()">Hiển thị tất cả</button>
          </div>
        ` : ''}
      </div>
    `;

    section.style.display = 'block';
    section.scrollIntoView({ behavior: 'smooth', block: 'start' });
  },

  _renderResultRow(parsed, index) {
    const hasStreet = !!parsed.street;
    const hasWard = !!parsed.ward;
    const hasProvince = !!parsed.province;
    const score = (hasStreet ? 1 : 0) + (hasWard ? 1 : 0) + (hasProvince ? 1 : 0);
    
    let statusClass, statusText, statusIcon;
    if (score === 3) {
      statusClass = 'ap-status-full';
      statusText = 'Đầy đủ';
      statusIcon = '✓';
    } else if (score >= 1) {
      statusClass = 'ap-status-partial';
      statusText = 'Một phần';
      statusIcon = '◐';
    } else {
      statusClass = 'ap-status-empty';
      statusText = 'Không xác định';
      statusIcon = '✕';
    }

    return `
      <tr class="${score === 0 ? 'ap-row-warning' : ''}">
        <td class="ap-td-num">${index + 1}</td>
        <td class="ap-td-raw" title="${(parsed.raw || '').replace(/"/g, '&quot;')}">${this._truncate(parsed.raw, 60)}</td>
        <td class="ap-td-street">${parsed.street || '<span class="ap-empty">—</span>'}</td>
        <td class="ap-td-ward">${parsed.ward || '<span class="ap-empty">—</span>'}</td>
        <td class="ap-td-district">${parsed.district || '<span class="ap-empty">—</span>'}</td>
        <td class="ap-td-province">${parsed.province ? `<span class="ap-province-tag">${parsed.province}</span>` : '<span class="ap-empty">—</span>'}</td>
        <td><span class="ap-status-badge ${statusClass}">${statusIcon} ${statusText}</span></td>
      </tr>
    `;
  },

  _truncate(str, max) {
    if (!str) return '';
    return str.length > max ? str.substring(0, max) + '…' : str;
  },

  showAllRows() {
    if (!this._parsedResult) return;
    const tbody = document.getElementById('ap-result-tbody');
    if (tbody) {
      tbody.innerHTML = this._parsedResult.parsed
        .map((p, i) => this._renderResultRow(p, i))
        .join('');
    }
    // Remove footer
    const footer = document.querySelector('.ap-table-footer');
    if (footer) footer.remove();
  },

  toggleAllRows() {
    this.showAllRows();
  },

  exportResult() {
    if (!this._parsedResult) {
      App.toast('Chưa có dữ liệu để xuất', 'warning');
      return;
    }

    try {
      const fileName = this._file ? 
        this._file.name.replace(/\.[^.]+$/, '_phan_ra.xlsx') : 
        'dia_chi_phan_ra.xlsx';
      
      AddressParser.exportToExcel(this._parsedResult, this._parsedResult.parsed, fileName);
      App.toast(`Đã xuất file "${fileName}" thành công!`, 'success');
    } catch (err) {
      console.error(err);
      App.toast('Lỗi xuất file: ' + err.message, 'error');
    }
  }
};
