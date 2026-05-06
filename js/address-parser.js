/* ============================================
   Vietnamese Address Parser Module — Enhanced v2.0
   ============================================
   Phân rã địa chỉ Việt Nam thông minh:
   - LLM-like noise removal (lọc dữ liệu thừa)
   - Smart abbreviation handling (P15, PThanh Xuan, QTan Binh)
   - Old 3-tier → New 2-tier conversion
   - Street-based context inference
   - Ambiguity warnings for user confirmation
   
   Dependencies: VietnamAddressData (address-data.js)
   ============================================ */

const AddressParser = {

  // =============================================
  // COMPREHENSIVE PROVINCE DICTIONARY
  // =============================================
  _provinceAliases: null,
  _wardKeywords: null,

  _buildDictionaries() {
    if (this._provinceAliases) return;

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
      { canonical: "Kon Tum", aliases: ["kon tum", "kontum", "ktum"] },
      { canonical: "Gia Lai", aliases: ["gia lai", "gialai", "gl", "glai"] },
      { canonical: "Đắk Lắk", aliases: ["dak lak", "daklak", "dl", "dlak", "đắk lắk", "dac lac", "đắc lắc", "đăk lăk", "dak lac", "buon ma thuot", "buôn ma thuột"] },
      { canonical: "Đắk Nông", aliases: ["dak nong", "daknong", "dnong", "đắk nông", "đắc nông", "dac nong"] },
      { canonical: "Lâm Đồng", aliases: ["lam dong", "lamdong", "ld", "ldong", "lâm đồng", "da lat", "đà lạt", "dalat"] },

      // ===== Southeast =====
      { canonical: "Bình Phước", aliases: ["binh phuoc", "binhphuoc", "bp", "bphuoc", "bình phước"] },
      { canonical: "Tây Ninh", aliases: ["tay ninh", "tayninh", "tninh", "tây ninh"] },
      { canonical: "Bình Dương", aliases: ["binh duong", "binhduong", "bduong", "bình dương"] },
      { canonical: "Đồng Nai", aliases: ["dong nai", "dongnai", "dnai", "đồng nai", "t. dong nai", "t.dong nai", "tinh dong nai"] },
      { canonical: "Bà Rịa - Vũng Tàu", aliases: ["ba ria vung tau", "bariavungtau", "brvt", "br-vt", "vung tau", "vungtau", "bà rịa - vũng tàu", "bà rịa vũng tàu", "bà rịa", "vũng tàu"] },

      // ===== Mekong Delta =====
      { canonical: "Long An", aliases: ["long an", "longan", "la", "lan", "t. long an", "t.long an"] },
      { canonical: "Tiền Giang", aliases: ["tien giang", "tiengiang", "tg", "tgiang", "tiền giang", "t. tien giang", "t.tien giang"] },
      { canonical: "Bến Tre", aliases: ["ben tre", "bentre", "btre", "bến tre", "t. ben tre", "t.ben tre"] },
      { canonical: "Trà Vinh", aliases: ["tra vinh", "travinh", "tv", "tvinh", "trà vinh", "t. tra vinh", "t.tra vinh"] },
      { canonical: "Vĩnh Long", aliases: ["vinh long", "vinhlong", "vl", "vlong", "vĩnh long", "t. vinh long", "t.vinh long"] },
      { canonical: "Đồng Tháp", aliases: ["dong thap", "dongthap", "dt", "dthap", "đồng tháp", "t. dong thap", "t.dong thap"] },
      { canonical: "An Giang", aliases: ["an giang", "angiang", "ag", "agiang", "t. an giang", "t.an giang", "tinh an giang"] },
      { canonical: "Kiên Giang", aliases: ["kien giang", "kiengiang", "kg", "kgiang", "kiên giang", "phu quoc", "phú quốc"] },
      { canonical: "Hậu Giang", aliases: ["hau giang", "haugiang", "hgiang2", "hậu giang"] },
      { canonical: "Sóc Trăng", aliases: ["soc trang", "soctrang", "st", "strang", "sóc trăng"] },
      { canonical: "Bạc Liêu", aliases: ["bac lieu", "baclieu", "bl", "blieu", "bạc liêu"] },
      { canonical: "Cà Mau", aliases: ["ca mau", "camau", "cm", "cmau", "cà mau"] },

      // ===== Legacy merged provinces =====
      { canonical: "Hà Nội", aliases: ["ha tay", "hà tây"] },
    ];

    this._provinceAliases = new Map();
    for (const p of provinces) {
      this._provinceAliases.set(p.canonical.toLowerCase(), p.canonical);
      this._provinceAliases.set(this._removeDiacritics(p.canonical).toLowerCase(), p.canonical);
      for (const alias of p.aliases) {
        this._provinceAliases.set(alias.toLowerCase(), p.canonical);
        this._provinceAliases.set(this._removeDiacritics(alias).toLowerCase(), p.canonical);
      }
    }

    this._wardKeywords = [
      'phường', 'phuong', 'p.',
      'xã', 'xa', 'x.',
      'thị trấn', 'thi tran', 'tt.',
      'thị xã', 'thi xa', 'tx.'
    ];
  },

  // =============================================
  // UTILITY: Remove Vietnamese diacritics
  // Cross-platform robust version — works on all browsers
  // Uses direct character map FIRST (no reliance on NFD decomposition)
  // then NFD as secondary pass for any remaining combining marks
  // =============================================
  _removeDiacritics(str) {
    if (!str) return '';
    // Step 1: Direct replacement map for Vietnamese characters
    // This handles all cases where NFD decomposition may be incomplete
    // or normalize() is unavailable (IE11, old Edge)
    const MAP = {
      'à':'a','á':'a','â':'a','ã':'a','ä':'a','å':'a','ā':'a','ă':'a',
      'À':'A','Á':'A','Â':'A','Ã':'A','Ä':'A','Å':'A','Ā':'A','Ă':'A',
      'ấ':'a','ầ':'a','ẩ':'a','ẫ':'a','ậ':'a','ắ':'a','ằ':'a','ẳ':'a','ẵ':'a','ặ':'a',
      'Ấ':'A','Ầ':'A','Ẩ':'A','Ẫ':'A','Ậ':'A','Ắ':'A','Ằ':'A','Ẳ':'A','Ẵ':'A','Ặ':'A',
      'è':'e','é':'e','ê':'e','ë':'e','ē':'e','ě':'e',
      'È':'E','É':'E','Ê':'E','Ë':'E','Ē':'E','Ě':'E',
      'ế':'e','ề':'e','ể':'e','ễ':'e','ệ':'e',
      'Ế':'E','Ề':'E','Ể':'E','Ễ':'E','Ệ':'E',
      'ì':'i','í':'i','î':'i','ï':'i','ī':'i','ĩ':'i','ị':'i','ỉ':'i',
      'Ì':'I','Í':'I','Î':'I','Ï':'I','Ī':'I','Ĩ':'I','Ị':'I','Ỉ':'I',
      'ò':'o','ó':'o','ô':'o','õ':'o','ö':'o','ō':'o',
      'Ò':'O','Ó':'O','Ô':'O','Õ':'O','Ö':'O','Ō':'O',
      'ố':'o','ồ':'o','ổ':'o','ỗ':'o','ộ':'o',
      'Ố':'O','Ồ':'O','Ổ':'O','Ỗ':'O','Ộ':'O',
      'ơ':'o','Ơ':'O',
      'ớ':'o','ờ':'o','ở':'o','ỡ':'o','ợ':'o',
      'Ớ':'O','Ờ':'O','Ở':'O','Ỡ':'O','Ợ':'O',
      'ù':'u','ú':'u','û':'u','ü':'u','ū':'u','ũ':'u','ụ':'u','ủ':'u',
      'Ù':'U','Ú':'U','Û':'U','Ü':'U','Ū':'U','Ũ':'U','Ụ':'U','Ủ':'U',
      'ư':'u','Ư':'U',
      'ứ':'u','ừ':'u','ử':'u','ữ':'u','ự':'u',
      'Ứ':'U','Ừ':'U','Ử':'U','Ữ':'U','Ự':'U',
      'ý':'y','ỳ':'y','ỷ':'y','ỹ':'y','ỵ':'y',
      'Ý':'Y','Ỳ':'Y','Ỷ':'Y','Ỹ':'Y','Ỵ':'Y',
      'đ':'d','Đ':'D',
    };
    // Build regex from map keys (cached in prototype)
    if (!AddressParser._diacriticsRegex) {
      AddressParser._diacriticsRegex = new RegExp('[' + Object.keys(MAP).join('') + ']', 'g');
    }
    let result = str.replace(AddressParser._diacriticsRegex, (ch) => MAP[ch] || ch);
    // Step 2: NFD strip for any remaining combining characters (safety net)
    try {
      result = result.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    } catch (e) {
      // normalize not available (IE11) — direct map above is sufficient
    }
    return result;
  },
  _diacriticsRegex: null,

  // =============================================
  // UTILITY: Normalize address string
  // =============================================
  _normalize(str) {
    if (!str) return '';
    return str
      .replace(/\r\n|\r/g, '\n')
      .replace(/\n+/g, ', ')
      .replace(/\s+/g, ' ')
      .replace(/,\s*,/g, ',')
      .replace(/^[\s,]+|[\s,]+$/g, '')
      .trim();
  },

  // =============================================
  // CORE: Detect province from address segments
  // =============================================
  _detectProvince(text) {
    this._buildDictionaries();
    const normalized = text.toLowerCase().trim();
    const noDiacritics = this._removeDiacritics(normalized);

    // Strategy 1: Exact match
    if (this._provinceAliases.has(normalized)) {
      return this._provinceAliases.get(normalized);
    }
    if (this._provinceAliases.has(noDiacritics)) {
      return this._provinceAliases.get(noDiacritics);
    }

    // Strategy 2: Remove common prefixes and exact match remainder
    const prefixes = ['tp.', 'tp ', 'tỉnh ', 'tinh ', 'thanh pho ', 'thành phố ', 't.', 'th.'];
    for (const prefix of prefixes) {
      for (const source of [noDiacritics, normalized]) {
        if (source.startsWith(prefix)) {
          const remainder = source.substring(prefix.length).trim();
          if (this._provinceAliases.has(remainder)) {
            return this._provinceAliases.get(remainder);
          }
        }
      }
    }

    // Strategy 3: Fuzzy substring match (strict — not for streets)
    const hasHouseNumber = /^\d+[A-Za-z]?\s/.test(text.trim()) || /^\d+\//.test(text.trim());
    if (!hasHouseNumber) {
      let bestMatch = null;
      let bestLen = 0;
      for (const [alias, canonical] of this._provinceAliases) {
        if (alias.length < 3) continue;
        if (noDiacritics.includes(alias) && alias.length > bestLen) {
          const coverage = alias.length / noDiacritics.replace(/\s+/g, '').length;
          if (coverage >= 0.6) {
            bestMatch = canonical;
            bestLen = alias.length;
          }
        }
      }
      if (bestMatch) return bestMatch;
    }

    // Strategy 4: PREFIX-based fuzzy match for truncated data
    // e.g., "Tinh Nghe" → strip prefix "tinh " → "nghe" → matches "nghe an" (Nghệ An)
    // e.g., "TP. HC" → strip prefix "tp. " → "hc" → matches "hcm" (Hồ Chí Minh)
    for (const prefix of prefixes) {
      for (const source of [noDiacritics, normalized]) {
        if (source.startsWith(prefix)) {
          const remainder = source.substring(prefix.length).trim();
          if (remainder.length >= 2) {
            const match = this._fuzzyMatchProvince(remainder);
            if (match) return match;
          }
        }
      }
    }

    // Strategy 5: Bare prefix match (no "tinh/tp" prefix, just the name fragment)
    if (!hasHouseNumber && noDiacritics.length >= 3) {
      const match = this._fuzzyMatchProvince(noDiacritics);
      if (match) return match;
    }

    return null;
  },

  // =============================================
  // FUZZY: Match truncated province name via prefix
  // "nghe" → "Nghệ An", "hc" → "Hồ Chí Minh"
  // =============================================
  _fuzzyMatchProvince(fragment) {
    this._buildDictionaries();
    // Strip ellipsis, dots, and truncation artifacts: "hc…" → "hc"
    const cleanFrag = fragment.replace(/[…\.·]+$/g, '').replace(/[^a-zA-ZÀ-ỹđĐ\s]/g, '');
    const fragNorm = this._removeDiacritics(cleanFrag).toLowerCase().trim();
    if (fragNorm.length < 2) return null;

    let bestMatch = null;
    let bestScore = 0;

    for (const [alias, canonical] of this._provinceAliases) {
      if (alias.length < 3) continue;
      const aliasNorm = this._removeDiacritics(alias).toLowerCase();

      // Check if alias STARTS WITH the fragment (truncated input)
      if (aliasNorm.startsWith(fragNorm)) {
        // Score: how much of the alias does the fragment cover?
        const score = fragNorm.length / aliasNorm.length;
        // Require at least 40% coverage for short aliases, 30% for longer ones
        const minCoverage = aliasNorm.length <= 5 ? 0.5 : 0.3;
        if (score >= minCoverage && score > bestScore) {
          bestMatch = canonical;
          bestScore = score;
        }
      }

      // Also check space-insensitive match: "nghean" starts with "nghe"
      const aliasCompact = aliasNorm.replace(/\s+/g, '');
      const fragCompact = fragNorm.replace(/\s+/g, '');
      if (aliasCompact.startsWith(fragCompact) && fragCompact.length >= 2) {
        const score = fragCompact.length / aliasCompact.length;
        const minCoverage = aliasCompact.length <= 5 ? 0.5 : 0.3;
        if (score >= minCoverage && score > bestScore) {
          bestMatch = canonical;
          bestScore = score;
        }
      }
    }

    return bestMatch;
  },

  // =============================================
  // UTILITY: Normalize ward/district name — fix broken spacing
  // "Truong V inh" → "Truong Vinh", "Thanh X uan" → "Thanh Xuan"
  // =============================================
  _normalizeAdminName(name) {
    if (!name) return '';
    // Merge single-character fragments with the next word
    // "Truong V inh" → Split: ["Truong", "V", "inh"] → Merge: ["Truong", "Vinh"]
    // Also handles capitalized: "Truong V Inh" → ["Truong", "VInh"] → capitalize → "Truong Vinh"
    const words = name.split(/\s+/);
    const merged = [];
    for (let i = 0; i < words.length; i++) {
      if (words[i].length === 1 && i + 1 < words.length) {
        // Single char + next word → merge them (regardless of case)
        const combined = words[i] + words[i + 1].toLowerCase();
        merged.push(combined.charAt(0).toUpperCase() + combined.slice(1));
        i++; // skip next
      } else {
        merged.push(words[i]);
      }
    }
    return merged.join(' ');
  },

  // =============================================
  // FUZZY: Match ward name against system database
  // Returns best canonical ward name or null
  // =============================================
  _fuzzyMatchWard(wardName, province) {
    if (!wardName) return null;
    // NOTE: province can be empty/null — in that case we do a global search
    // across all provinces and infer province from the matched ward.

    // Strip prefix (Phường/Xã/Thị trấn) before normalizing — critical for correct matching
    const wardNameNoPfx = wardName.replace(/^(Phường|Phong|Xã|Thị trấn|Phuong|Xa|Thi tran)\s+/i, '').trim();
    const normWard = this._removeDiacritics(wardNameNoPfx).toLowerCase().replace(/\s+/g, '');
    if (normWard.length < 2) return null;
    const results = [];

    // === Strategy 1: Search legacy _oldAdminData (province-specific, only if province known) ===
    if (province) {
      const provData = VietnamAddressData._oldAdminData?.[province];
      if (provData) {
        for (const [distName, distData] of Object.entries(provData.districts)) {
          for (const w of distData.wards) {
            const wName = w.replace(/^(Phường|Xã|Thị trấn)\s+/i, '');
            const wNorm = this._removeDiacritics(wName).toLowerCase().replace(/\s+/g, '');

            if (wNorm === normWard) {
              return { canonicalWard: w, district: distName, confidence: 1.0, source: 'legacy' };
            }
            if (wNorm.startsWith(normWard) && normWard.length >= 3) {
              results.push({ canonicalWard: w, district: distName, confidence: normWard.length / wNorm.length, source: 'legacy' });
            }
            if (normWard.startsWith(wNorm) && wNorm.length >= 3) {
              results.push({ canonicalWard: w, district: distName, confidence: wNorm.length / normWard.length, source: 'legacy' });
            }
          }
        }
      }
    }

    // === Strategy 2: Search 2025 Master Ward Data (3,321 wards, 34 provinces) ===
    if (typeof MASTER_WARDS_2025 !== 'undefined') {
      // Province-specific search (only run when province is known)
      if (province) {
        const normProv = this._removeDiacritics(province).toLowerCase().replace(/\s+/g, '');

        for (const [masterProv, wards] of Object.entries(MASTER_WARDS_2025)) {
          const masterNorm = this._removeDiacritics(masterProv).toLowerCase().replace(/\s+/g, '');

          // Check if this province matches
          if (masterNorm !== normProv &&
              !masterNorm.includes(normProv) &&
              !normProv.includes(masterNorm)) continue;

          for (const w of wards) {
            const wName = w.replace(/^(Phường|Xã|Thị trấn)\s+/i, '');
            const wNorm = this._removeDiacritics(wName).toLowerCase().replace(/\s+/g, '');
            const wFullNorm = this._removeDiacritics(w).toLowerCase().replace(/\s+/g, '');

            if (wNorm === normWard || wFullNorm === normWard) {
              // Province already known — no need for inferredProvince
              return { canonicalWard: w, district: null, confidence: 1.0, source: '2025' };
            }
            if (wNorm.startsWith(normWard) && normWard.length >= 3) {
              results.push({ canonicalWard: w, district: null, confidence: normWard.length / wNorm.length, source: '2025' });
            }
            if (normWard.startsWith(wNorm) && wNorm.length >= 3) {
              results.push({ canonicalWard: w, district: null, confidence: wNorm.length / normWard.length, source: '2025' });
            }
          }
        }
      }

      // Global search when: (a) province is unknown, OR (b) province-specific search found nothing
      // CRITICAL: Results from global search MUST have inferredProvince so parseAddress can fill province
      if (results.length === 0) {
        for (const [masterProv, wards] of Object.entries(MASTER_WARDS_2025)) {
          for (const w of wards) {
            const wName = w.replace(/^(Phường|Xã|Thị trấn)\s+/i, '');
            const wNorm = this._removeDiacritics(wName).toLowerCase().replace(/\s+/g, '');
            if (wNorm === normWard) {
              // Exact match — highest confidence
              results.push({ canonicalWard: w, district: null, confidence: 0.9, source: '2025', inferredProvince: masterProv });
            } else if (normWard.length >= 5 && wNorm.length >= 5) {
              // Near-miss: allow 1-character difference for data entry errors
              // e.g. "nhantrach" vs "nhontrach" (a→o, 1 char diff at pos 2)
              // e.g. "diennien"  vs "diennanh"  etc.
              const lenDiff = Math.abs(normWard.length - wNorm.length);
              if (lenDiff <= 1) {
                const shorter = normWard.length <= wNorm.length ? normWard : wNorm;
                const longer  = normWard.length <= wNorm.length ? wNorm   : normWard;
                let diffs = longer.length - shorter.length; // count length diff as 1 error
                for (let i = 0; i < shorter.length && diffs <= 1; i++) {
                  if (shorter[i] !== longer[i]) diffs++;
                }
                if (diffs === 1) {
                  // Near-miss: confidence just above 0.7 threshold
                  results.push({ canonicalWard: w, district: null, confidence: 0.72, source: '2025-fuzzy', inferredProvince: masterProv });
                }
              }
            }
          }
        }
      }
    }


    if (results.length === 0) return null;
    results.sort((a, b) => b.confidence - a.confidence);
    return results[0];
  },

  // =============================================
  // ENHANCED v3: Detect ward with smart abbreviation
  // Returns: { ward: "Phường 15", remainder: "..." } or null
  // =============================================
  _detectWard(text) {
    this._buildDictionaries();
    const trimmed = text.trim();
    if (!trimmed) return null;

    // Strategy 1: The ENTIRE segment is a ward abbreviation
    const abbr = VietnamAddressData.parseWardAbbreviation(trimmed);
    if (abbr) {
      return { ward: abbr.value, remainder: '' };
    }

    // Strategy 2: Standard full-word patterns at the start
    const fullPatterns = [
      { regex: /^(phường|phuong)\s+(.+)/i, prefix: 'Phường' },
      { regex: /^(xã|xa)\s+(.+)/i, prefix: 'Xã' },
      { regex: /^(thị trấn|thi tran)\s+(.+)/i, prefix: 'Thị trấn' },
    ];
    for (const { regex, prefix } of fullPatterns) {
      const match = trimmed.match(regex);
      if (match) {
        let name = match[2].trim();
        // Handle ALL CAPS ward names (with or without spaces): ME LINH → Me Linh, THANH XUAN → Thanh Xuan
        if (name === name.toUpperCase() && name.length > 1) {
          name = name.toLowerCase().replace(/(?:^|\s)\S/g, c => c.toUpperCase());
        }
        return { ward: `${prefix} ${name}`, remainder: '' };
      }
    }


    // Strategy 3: Ward abbreviation is embedded at END of segment
    // e.g., "45/5 Tran Thai Tong P15"
    const endPatterns = [
      // P + digits at end
      { regex: /^(.+?)\s+[Pp]\.?\s*(\d+)$/, build: (m) => `Phường ${m[2]}` },
      // Phường/phuong + text at end
      { regex: /^(.+?)\s+((?:phường|phuong)\s+.+)$/i, build: (m) => {
        const w = m[2].replace(/^(phường|phuong)\s+/i, 'Phường ');
        return w;
      }},
      // P + CamelCase name at end (PThanh Xuan, PBinh Thanh)
      { regex: /^(.+?)\s+[Pp]\.?([A-ZĐ][a-zàáảãạăắằẳẵặâấầẩẫậèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵđ]+(?:\s+[A-Za-zĐđàáảãạăắằẳẵặâấầẩẫậèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵ]+)*)$/, build: (m) => {
        let name = m[2].trim();
        if (!/\s/.test(name)) {
          name = name.replace(/([a-z])([A-Z])/g, '$1 $2').trim();
        }
        return `Phường ${name}`;
      }},
    ];

    for (const { regex, build } of endPatterns) {
      const match = trimmed.match(regex);
      if (match) {
        return { ward: build(match), remainder: match[1].trim() };
      }
    }

    return null;
  },

  // =============================================
  // ENHANCED v3: Detect district with smart abbreviation
  // Returns: { district: "Quận Tân Bình", remainder: "..." } or null
  // =============================================
  _detectDistrict(text) {
    const trimmed = text.trim();
    if (!trimmed) return null;

    // Strategy 1: The ENTIRE segment is a district abbreviation
    const abbr = VietnamAddressData.parseDistrictAbbreviation(trimmed);
    if (abbr) {
      return { district: abbr.value, remainder: '' };
    }

    // Strategy 2: Standard full-word patterns
    const fullPatterns = [
      { regex: /^(quận|quan)\s+(.+)/i, prefix: 'Quận' },
      { regex: /^(huyện|huyen)\s+(.+)/i, prefix: 'Huyện' },
      { regex: /^(thị xã|thi xa)\s+(.+)/i, prefix: 'Thị xã' },
    ];
    for (const { regex, prefix } of fullPatterns) {
      const match = trimmed.match(regex);
      if (match) {
        return { district: `${prefix} ${match[2].trim()}`, remainder: '' };
      }
    }

    // Strategy 3: District abbreviation at END of segment
    const endPatterns = [
      // Q + digits at end
      { regex: /^(.+?)\s+[Qq]\.?\s*(\d+)$/, build: (m) => `Quận ${m[2]}` },
      // Quận/quan + text at end
      { regex: /^(.+?)\s+((?:quận|quan|huyện|huyen)\s+.+)$/i, build: (m) => {
        const d = m[2].replace(/^(quận|quan)\s+/i, 'Quận ').replace(/^(huyện|huyen)\s+/i, 'Huyện ');
        return d;
      }},
      // Q + CamelCase name at end
      { regex: /^(.+?)\s+[Qq]\.?\s*([A-ZĐ][a-zàáảãạăắằẳẵặâấầẩẫậèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵđ]+(?:\s+[A-Za-zĐđàáảãạăắằẳẵặâấầẩẫậèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵ]+)*)$/, build: (m) => {
        let name = m[2].trim();
        if (!/\s/.test(name)) {
          name = name.replace(/([a-z])([A-Z])/g, '$1 $2').trim();
        }
        return `Quận ${name}`;
      }},
    ];

    for (const { regex, build } of endPatterns) {
      const match = trimmed.match(regex);
      if (match) {
        return { district: build(match), remainder: match[1].trim() };
      }
    }

    return null;
  },

  // =============================================
  // Check if a segment is noise/junk
  // =============================================
  _isNoise(text) {
    const lower = text.toLowerCase().trim();
    if (lower.length < 2) return false;
    const noDiacritics = this._removeDiacritics(lower);

    // Exact match noise words
    const noiseWords = [
      'dia chi moi', 'dia chi moi',
      'dia chi cu', 'dia chi cu',
      'nha moi', 'nha moi', 'nha cu', 'nha cu',
      'giao hang', 'giao hang', 'nhan tai', 'nhan tai',
      'lien he', 'lien he', 'ghi chu', 'ghi chu',
      'note', 'luu y', 'luu y',
      // Metadata annotations
      'dia danh hanh chinh moi', 'dia danh hanh chinh',
      'theo dia chi moi', 'theo dia chi cu', 'theo dia chi',
      'theo dia danh hanh chinh moi', 'theo dia danh hanh chinh',
      'theo dia danh', 'theo',
      'di a danh hanh chinh moi', 'di a danh hanh chinh',
      'di a danh h',
      // Residual fragments left after partial 'DI A DANH' removal
      'hanh chinh moi', 'hanh chinh',
    ];

    // Exact match (after removing diacritics)
    if (noiseWords.some(n => this._removeDiacritics(n) === noDiacritics)) {
      return true;
    }

    // Partial/truncated match — segment STARTS WITH a noise phrase
    const noiseStartPatterns = [
      'dia danh hanh', 'dia danh', 'di a danh',
      'theo dia', 'theo dia chi', 'theo dia danh',
    ];
    if (noiseStartPatterns.some(p => noDiacritics.startsWith(this._removeDiacritics(p)))) {
      return true;
    }

    // Standalone "THEO" at word level  
    if (noDiacritics === 'theo') {
      return true;
    }

    return false;
  },

  // =============================================
  // Post-process: Clean leftover noise from street output
  // =============================================
  _cleanStreetOutput(street) {
    if (!street) return '';
    let cleaned = street;

    // Remove known trailing/inline noise phrases (longest match first)
    const noiseFragments = [
      'DIA DANH HANH CHINH MOI', 'DIA DANH HANH CHINH', 'DIA DANH HANH',
      'DIA DANH', 'DI A DANH HANH CHINH MOI', 'DI A DANH H', 'DI A DANH',
      'THEO DIA CHI MOI', 'THEO DIA CHI CU', 'THEO DIA CHI',
      'THEO DIA DANH HANH CHINH MOI', 'THEO DIA DANH HANH CHINH',
      'THEO DIA DANH', 'THEO DIA CH',
      'dia danh hanh chinh moi', 'dia danh hanh chinh', 'dia danh hanh',
      'dia danh', 'di a danh',
      'theo dia chi moi', 'theo dia chi cu', 'theo dia chi',
      'theo dia danh', 'theo dia ch',
      'ĐỊA DANH HÀNH CHÍNH MỚI', 'ĐỊA DANH HÀNH CHÍNH',
      'THEO ĐỊA CHỈ MỚI', 'THEO ĐỊA CHỈ CŨ', 'THEO ĐỊA CHỈ',
      'THEO ĐỊA DANH', 'địa danh hành chính mới',
      'theo địa chỉ mới', 'theo địa chỉ', 'theo địa danh',
    ];

    // Sort longest first for greedy matching
    noiseFragments.sort((a, b) => b.length - a.length);

    for (const frag of noiseFragments) {
      const fragNorm = this._removeDiacritics(frag).toUpperCase();
      const cleanedNorm = this._removeDiacritics(cleaned).toUpperCase();
      const idx = cleanedNorm.indexOf(fragNorm);
      if (idx >= 0) {
        cleaned = cleaned.substring(0, idx) + cleaned.substring(idx + frag.length);
      }
    }

    // Remove standalone "THEO" at the end of street (after comma or as last word)
    cleaned = cleaned.replace(/,\s*THEO\s*$/i, '');
    cleaned = cleaned.replace(/\s+THEO\s*$/i, '');

    // Remove ONLY truncated province abbreviations leaked into street (e.g. "TP. HC…", "TP. H…")
    // DO NOT remove full province names like "TP. HA NOI", "T. AN GIANG" — these are needed for province detection
    // Truncated = province initials (1-4 chars) followed by ellipsis or end-of-string
    cleaned = cleaned.replace(/,\s*TP\.?\s+[A-ZĐa-zđÀ-ỹ]{1,4}[…\.]+\s*$/i, '');
    cleaned = cleaned.replace(/,\s*T\.?\s+[A-ZĐa-zđÀ-ỹ]{1,4}[…\.]+\s*$/i, '');


    // Clean up trailing/leading commas, spaces, dots, ellipsis
    cleaned = cleaned.replace(/[,\s…]+$/g, '').replace(/^[,\s…]+/g, '').trim();
    // Remove double commas or comma-space patterns
    cleaned = cleaned.replace(/,\s*,/g, ',').replace(/,\s*$/g, '').trim();

    return cleaned;
  },

  // =============================================
  // INVERTED LOOKUP TABLE: Build once, reuse
  // Maps normKey(name) → { ward?, district?, province, type }
  // =============================================
  _adminLookup: null,

  _buildAdminLookup() {
    if (this._adminLookup) return;
    this._buildDictionaries();
    VietnamAddressData._buildOldAdminData();

    const lookup = new Map();

    const norm = (s) => {
      if (!s) return '';
      return this._removeDiacritics(s).toLowerCase().replace(/\s+/g, ' ').trim();
    };

    // Helper: add entry, keeping highest-confidence if key exists
    const add = (key, entry) => {
      if (!key || key.length < 2) return;
      if (!lookup.has(key)) lookup.set(key, entry);
    };

    // ── 1. PROVINCES ──────────────────────────────────────
    // Use _provinceAliases which already contains all aliases
    for (const [alias, canonical] of this._provinceAliases) {
      const k = alias.replace(/\s+/g, ' ').trim();
      if (k.length >= 2) {
        add(k, { type: 'province', province: canonical });
      }
    }

    // ── 2. DISTRICTS from _oldAdminData (added FIRST so they take priority over same-name wards)
    for (const [provName, provData] of Object.entries(VietnamAddressData._oldAdminData)) {
      for (const [distName, distData] of Object.entries(provData.districts)) {
        const distBase = distName.replace(/^(Quận|Huyện|Thị xã)\s+/i, '');
        add(norm(distBase), { type: 'district', district: distName, province: provName });
        add(norm(distName), { type: 'district', district: distName, province: provName });
        for (const alias of (distData.aliases || [])) {
          add(norm(alias), { type: 'district', district: distName, province: provName });
        }
      }
    }

    // ── 3. WARDS from _oldAdminData (được thêm sau district — key đã tồn tại sẽ không đè)
    for (const [provName, provData] of Object.entries(VietnamAddressData._oldAdminData)) {
      for (const [distName, distData] of Object.entries(provData.districts)) {
        for (const wardFull of (distData.wards || [])) {
          const wardBase = wardFull.replace(/^(Phường|Xã|Thị trấn)\s+/i, '');
          add(norm(wardBase), { type: 'ward', ward: wardFull, district: distName, province: provName });
          add(norm(wardFull), { type: 'ward', ward: wardFull, district: distName, province: provName });
        }
      }
    }

    // ── 3. WARDS from MASTER_WARDS_2025 (3,321 wards) ────
    if (typeof MASTER_WARDS_2025 !== 'undefined') {
      for (const [masterProv, wards] of Object.entries(MASTER_WARDS_2025)) {
        for (const wardFull of wards) {
          const wardBase = wardFull.replace(/^(Phường|Xã|Thị trấn)\s+/i, '');
          const kBase = norm(wardBase);
          const kFull = norm(wardFull);
          // Only add if not already in lookup (oldAdminData has more detail)
          if (kBase && !lookup.has(kBase)) {
            lookup.set(kBase, { type: 'ward', ward: wardFull, district: null, province: masterProv });
          }
          if (kFull && !lookup.has(kFull)) {
            lookup.set(kFull, { type: 'ward', ward: wardFull, district: null, province: masterProv });
          }
        }
      }
    }

    this._adminLookup = lookup;
  },

  // =============================================
  // SMART SEGMENTATION v2: Right-to-Left Suffix Scanner
  // Dùng inverted lookup table, không dùng sliding window phức tạp
  //
  // Thuật toán:
  //   1. Tách địa chỉ thành mảng từ (words)
  //   2. Từ cuối cùng, cộng dồn từng từ sang trái → kiểm tra bảng tra cứu
  //   3. Greedy longest match: ưu tiên chuỗi dài nhất khớp
  //   4. Thứ tự nhận diện: PROVINCE → WARD → DISTRICT (từ phải sang trái)
  //   5. Phần còn lại bên trái = số nhà & đường
  //
  // Ví dụ: "C5 119 Tran Duy Hung Yen Hoa Ha Noi"
  //   → suffix "Noi"        → không khớp
  //   → suffix "Ha Noi"     → PROVINCE "Hà Nội" ✓ (provinceStart=7)
  //   → suffix "Hoa"        → không khớp (trong context sau khi bỏ province)
  //   → suffix "Yen Hoa"    → WARD "Phường Yên Hòa" ✓ (wardStart=5)
  //   → street = words[0..5) = "C5 119 Tran Duy Hung"
  // =============================================
  _smartSegmentNoComma(text) {
    this._buildAdminLookup();

    const words = text.trim().split(/\s+/);
    if (words.length < 3) return null;

    const norm = (s) => this._removeDiacritics(s).toLowerCase().replace(/\s+/g, ' ').trim();

    let province = '';
    let provinceStart = -1;
    let ward = '';
    let wardStart = -1;
    let district = '';
    let districtStart = -1;

    // ── PASS 1: Tìm PROVINCE từ cuối chuỗi ─────────────────
    // Quét suffix từ DÀI → ngắn (4→1 từ), lấy match dài nhất trước
    // Ưu tiên dài để "Ho Chi Minh" (3 từ) thắng "Minh" (1 từ)
    for (let winSize = 4; winSize >= 1; winSize--) {
      const start = words.length - winSize;
      if (start < 0) continue;
      const candidate = norm(words.slice(start).join(' '));
      const entry = this._adminLookup.get(candidate);
      if (entry && entry.type === 'province') {
        province = entry.province;
        provinceStart = start;
        break; // Lấy match DÀI nhất trước
      }
    }

    // Nếu chưa tìm được tỉnh, thử với alias ngắn hơn (1 từ)
    // Đây là safety net cho các tỉnh tên 1 từ như "Huế", "Hà Giang"
    const rightBound = provinceStart >= 0 ? provinceStart : words.length;

    // ── PASS 2: Tìm WARD từ phần còn lại sau tỉnh ────────────
    // Thử suffix 1→4 từ từ rightBound, lấy match DÀI nhất
    const provNorm = province ? norm(province) : '';
    const _provMatch = (entryProv) => {
      if (!provNorm || !entryProv) return true; // không biết tỉnh → chấp nhận mọi
      const ep = norm(entryProv);
      return ep.includes(provNorm) || provNorm.includes(ep);
    };

    let bestWardMatch = null;
    let bestWardLen = 0;
    for (let winSize = 1; winSize <= Math.min(4, rightBound); winSize++) {
      const start = rightBound - winSize;
      if (start < 0) break;
      const candidate = norm(words.slice(start, rightBound).join(' '));
      const entry = this._adminLookup.get(candidate);
      if (entry && entry.type === 'ward' && _provMatch(entry.province)) {
        if (winSize > bestWardLen) {
          bestWardMatch = { ...entry, start };
          bestWardLen = winSize;
        }
      }
    }
    if (bestWardMatch) {
      ward = bestWardMatch.ward;
      wardStart = bestWardMatch.start;
      if (!province && bestWardMatch.province) province = bestWardMatch.province;
      if (!district && bestWardMatch.district) district = bestWardMatch.district;
    }

    // ── PASS 3: Tìm DISTRICT ─────────────────────────────────
    // Trong cấu trúc địa chỉ Việt Nam: [street] [ward] [district] [province]
    // District có thể nằm:
    //   A) Giữa ward và province: "Ben Nghe | Quan 1 | Ho Chi Minh"
    //   B) Trước ward (bên trái): hiếm gặp hơn
    // ⇒ Tìm trong [wardEnd..provinceStart) trước, rồi [0..wardStart)
    if (!district) {
      const wardEnd = wardStart >= 0 ? wardStart + bestWardLen : -1;

      // Phương án A: giữa ward và province
      const afterWardBound = { from: wardEnd >= 0 ? wardEnd : rightBound, to: rightBound };
      // Phương án B: bên trái ward
      const beforeWardBound = { from: 0, to: wardStart >= 0 ? wardStart : rightBound };

      const searchRegions = wardEnd >= 0
        ? [afterWardBound, beforeWardBound]   // A trước, B sau
        : [beforeWardBound];                   // không có ward → chỉ bên trái

      outer:
      for (const region of searchRegions) {
        const regionLen = region.to - region.from;
        if (regionLen <= 0) continue;
        for (let winSize = Math.min(4, regionLen); winSize >= 1; winSize--) {
          // Thử các vị trí trong region (bắt đầu từ phải)
          for (let start = region.to - winSize; start >= region.from; start--) {
            const candidate = norm(words.slice(start, start + winSize).join(' '));
            const entry = this._adminLookup.get(candidate);
            if (entry && entry.type === 'district' && _provMatch(entry.province)) {
              district = entry.district;
              districtStart = start;
              if (!province && entry.province) province = entry.province;
              break outer;
            }
          }
        }
      }
    }

    // ── Không tìm được gì → trả về null để normal parsing xử lý ─
    if (!province && !ward && !district) return null;
    // Nếu chỉ có tỉnh → normal parsing đã làm được, không cần override
    if (!ward && !district) return null;

    // ── Xác định phần đường ─────────────────────────────────
    const streetEnd = Math.min(
      districtStart  >= 0 ? districtStart  : Infinity,
      wardStart      >= 0 ? wardStart      : Infinity,
      provinceStart  >= 0 ? provinceStart  : Infinity
    );
    const streetSegment = words.slice(0, streetEnd === Infinity ? words.length : streetEnd).join(' ').trim();

    const segments = [];
    if (streetSegment) segments.push(streetSegment);
    if (ward)          segments.push(`__WARD__:${ward}`);
    if (district)      segments.push(`__DISTRICT__:${district}`);
    if (province)      segments.push(province);

    return { segments, province, ward, district, street: streetSegment };
  },

  // =============================================
  // MAIN PARSING ENGINE — v3.0
  // =============================================
  parseAddress(rawAddress) {
    if (!rawAddress || typeof rawAddress !== 'string') {
      return { street: '', ward: '', province: '', district: '', newWard: '', newDistrict: '', isConverted: false, conversionNote: '', warnings: [], raw: rawAddress || '' };
    }

    this._buildDictionaries();

    // Step 1: Clean noise from address
    const cleanResult = VietnamAddressData.cleanAddress(rawAddress);
    const normalized = this._normalize(cleanResult.cleaned);
    
    // Step 2: Split by comma, semicolon or fullwidth punctuation ONLY
    // IMPORTANT: Do NOT split on plain hyphen (-) — it breaks:
    //   'Lo 5-6 Cho Nong San' → ['Lo 5', '6 Cho Nong San']
    //   'P95-162 TON DUC THANG' → ['P95', '162...']
    // En-dash (–) and em-dash (—) are safe address-component separators.
    const rawSegments = normalized
      .split(/[,;|\uFF0C\u3001\u2022]+|[\s]+[–—][\s]+/)
      .map(s => s.trim())
      .filter(s => s.length > 0);

    // Step 2.5: Nếu chỉ có DUY NHẤT 1 segment (địa chỉ không có dấu phân cách)
    // → Thử phân tích thông minh từ phải sang trái theo database
    // Ví dụ: "C5 119 Tran Duy Hung Yen Hoa Ha Noi"
    let noCommaResult = null;
    if (rawSegments.length === 1) {
      noCommaResult = this._smartSegmentNoComma(rawSegments[0]);
    }

    // Step 3: Filter out noise segments
    const filteredSegments = rawSegments.filter(s => !this._isNoise(s));
    const removedNoise = rawSegments.filter(s => this._isNoise(s));
    const allRemovedNoise = [...(cleanResult.noiseRemoved || []), ...removedNoise];

    // Step 4: Pre-expand segments — detect embedded abbreviations
    // e.g., "45/5 Tran Thai Tong P15 Q Tan Binh" → separate pieces
    const segments = [];
    for (const seg of filteredSegments) {
      let current = seg;
      let extracted = [];

      // Try ward extraction
      const wardResult = this._detectWard(current);
      if (wardResult) {
        extracted.push({ type: 'ward', value: wardResult.ward });
        if (wardResult.remainder) {
          current = wardResult.remainder; // Street part remains
        } else {
          current = ''; // Entire segment was a ward
        }
      }

      // Try district extraction from remaining (only if there's still content)
      // IMPORTANT: First check if the segment is a province abbreviation to avoid
      // false-positives like "Hnoi" → "Huyện noi" instead of "Hà Nội"
      if (current.trim()) {
        const isProvince = this._detectProvince(current.trim());
        if (!isProvince) {
          const distResult = this._detectDistrict(current);
          if (distResult) {
            extracted.push({ type: 'district', value: distResult.district });
            if (distResult.remainder) {
              current = distResult.remainder;
            } else {
              current = '';
            }
          }
        }
      }

      // Push street part if any
      if (current.trim()) {
        segments.push(current.trim());
      }

      // Push extracted items as separate tagged segments
      for (const item of extracted.reverse()) {
        segments.push(`__${item.type.toUpperCase()}__:${item.value}`);
      }
    }

    // Nếu phân tích no-comma thành công, seed kết quả từ đó
    let province = noCommaResult ? (noCommaResult.province || '') : '';
    let ward     = noCommaResult ? (noCommaResult.ward     || '') : '';
    let district = noCommaResult ? (noCommaResult.district || '') : '';
    let streetParts = [];
    let provinceIdx = -1;
    let wardIdx = -1;
    let districtIdx = -1;
    let warnings = [];

    // Nếu no-comma đã tách được: đưa phần đường vào streetParts và bỏ qua các bước scan segment
    if (noCommaResult) {
      const streetSeg = noCommaResult.segments.find(s => !s.startsWith('__') && !this._detectProvince(s));
      if (streetSeg) streetParts.push(streetSeg);
      warnings.push({
        type: 'no_comma_segmented',
        message: `Địa chỉ không có dấu phân cách — tự động nhận diện: đường="${streetSeg || ''}", phường/xã="${ward}", quận/huyện="${district}", tỉnh/TP="${province}"`,
        severity: 'info'
      });
    }

    // Track noise removal
    if (allRemovedNoise.length > 0) {
      warnings.push({
        type: 'noise_removed',
        message: `Đã loại bỏ dữ liệu thừa: "${allRemovedNoise.join('", "')}"`,
        severity: 'info'
      });
    }

    // Step 5–7: Chỉ chạy scan segment khi KHÔNG dùng no-comma segmentation
    if (!noCommaResult) {
      // Step 5: First pass — handle pre-tagged segments
      for (let i = 0; i < segments.length; i++) {
        const seg = segments[i];
        if (seg.startsWith('__WARD__:') && !ward) {
          ward = seg.substring('__WARD__:'.length);
          wardIdx = i;
        } else if (seg.startsWith('__DISTRICT__:') && !district) {
          district = seg.substring('__DISTRICT__:'.length);
          districtIdx = i;
        }
      }

      // Step 6: Scan remaining segments RIGHT to LEFT
      for (let i = segments.length - 1; i >= 0; i--) {
        if (i === wardIdx || i === districtIdx) continue;
        const seg = segments[i];
        if (seg.startsWith('__WARD__:') || seg.startsWith('__DISTRICT__:')) continue;

        // Try to detect province
        if (!province) {
          const detected = this._detectProvince(seg);
          if (detected) {
            province = detected;
            provinceIdx = i;
            continue;
          }
        }

        // Try to detect district (entire segment)
        if (!district) {
          const detected = this._detectDistrict(seg);
          if (detected && !detected.remainder) {
            district = detected.district;
            districtIdx = i;
            if (!province) {
              const lookup = VietnamAddressData.lookupDistrictInOldData(district);
              if (lookup) province = lookup.province;
            }
            continue;
          }
        }

        // Try to detect ward (entire segment)
        if (!ward) {
          const detected = this._detectWard(seg);
          if (detected && !detected.remainder) {
            ward = detected.ward;
            wardIdx = i;
            continue;
          }
        }
      }

      // Step 7: Collect remaining as street
      for (let i = 0; i < segments.length; i++) {
        if (i === provinceIdx || i === wardIdx || i === districtIdx) continue;
        const seg = segments[i];
        if (seg.startsWith('__WARD__:') || seg.startsWith('__DISTRICT__:')) continue;
        if (seg.trim()) streetParts.push(seg.trim());
      }
    }

    // Step 8: If still no province, fuzzy match
    if (!province) {
      province = this._detectProvince(normalized) || '';
      if (province) {
        streetParts = streetParts.filter(s => this._detectProvince(s) !== province);
      }
    }

    // Step 9: Validate numeric ward
    if (ward && province) {
      const numMatch = ward.match(/Phường\s+(\d+)/i);
      if (numMatch && district) {
        const validation = VietnamAddressData.validateNumericWard(numMatch[1], district, province);
        if (validation.valid && validation.ambiguous) {
          const distList = validation.suggestions.map(s => s.district).join(', ');
          warnings.push({ type: 'ambiguous_ward', message: `Phường ${numMatch[1]} tồn tại tại nhiều quận: ${distList}`, severity: 'warning', suggestions: validation.suggestions });
        } else if (!validation.valid) {
          warnings.push({ type: 'ward_not_found', message: `Không tìm thấy Phường ${numMatch[1]} tại ${district}`, severity: 'warning' });
        }
      } else if (numMatch && !district) {
        const validation = VietnamAddressData.validateNumericWard(numMatch[1], null, province);
        if (validation.valid) {
          if (validation.ambiguous) {
            warnings.push({ type: 'ambiguous_ward', message: `Phường ${numMatch[1]} có thể thuộc: ${validation.suggestions.map(s => s.district).join(', ')}`, severity: 'warning', suggestions: validation.suggestions });
          } else if (validation.suggestions.length === 1) {
            district = validation.suggestions[0].district;
          }
        }
      }
    }

    // Step 10: Infer district from street name
    if (!district && province && streetParts.length > 0) {
      const streetText = streetParts.join(' ');
      const streetMatches = VietnamAddressData.inferFromStreet(streetText, province);
      if (streetMatches.length === 1) {
        district = streetMatches[0].district;
        warnings.push({ type: 'inferred_district', message: `Suy luận từ đường "${streetMatches[0].street}": thuộc ${district}`, severity: 'info' });
      } else if (streetMatches.length > 1) {
        const unique = [...new Set(streetMatches.map(m => m.district))];
        if (unique.length > 1) {
          warnings.push({ type: 'ambiguous_street', message: `Đường có thể thuộc: ${unique.join(', ')}`, severity: 'warning', suggestions: streetMatches });
        }
        district = streetMatches[0].district;
      }
    }

    // Capitalize properly
    if (ward) ward = this._capitalizeVietnamese(ward);
    if (district) district = this._capitalizeVietnamese(district);

    // Step 8.5: Normalize ward name (fix broken spacing) and fuzzy match
    if (ward) {
      // Extract the ward name part (after Phường/Xã/Thị trấn prefix)
      const wardPrefixMatch = ward.match(/^(Phường|Xã|Thị Trấn)\s+(.+)$/i);
      if (wardPrefixMatch) {
        const prefix = this._capitalizeVietnamese(wardPrefixMatch[1]);
        let wardNamePart = wardPrefixMatch[2];
        
        // Fix broken spacing: "Truong V inh" → "Truong Vinh"
        const normalized = this._normalizeAdminName(wardNamePart);
        if (normalized !== wardNamePart) {
          wardNamePart = normalized;
          ward = `${prefix} ${this._capitalizeVietnamese(wardNamePart)}`;
          warnings.push({
            type: 'ward_name_fixed',
            message: `Sửa lỗi khoảng trắng: "${wardPrefixMatch[2]}" → "${wardNamePart}"`,
            severity: 'info'
          });
        }

        // Try fuzzy match — ALWAYS run, even when province is unknown.
        // When province is empty, _fuzzyMatchWard does a global search and
        // returns inferredProvince so we can fill in missing province from ward.
        VietnamAddressData._buildOldAdminData();
        const fuzzyResult = this._fuzzyMatchWard(wardNamePart, province || null);
        if (fuzzyResult && fuzzyResult.confidence >= 0.7) {
          const oldWard = ward;
          ward = fuzzyResult.canonicalWard;
          // Only infer district if not already set
          if (!district && fuzzyResult.district) {
            district = fuzzyResult.district;
          }
          // Use inferredProvince only when province was not already explicitly detected
          if (!province && fuzzyResult.inferredProvince) {
            province = fuzzyResult.inferredProvince;
          }
          warnings.push({
            type: 'ward_fuzzy_matched',
            message: `Suy luận: "${oldWard}" → "${ward}"${district ? ` (${district})` : ''}${!province ? '' : ` - ${province}`}`,
            severity: 'info'
          });
        }

      }
    }

    // Step 11: Convert old 3-tier → new 2-tier address
    const conversion = VietnamAddressData.convertTo2Tier(ward, district, province);
    
    if (conversion.converted) {
      warnings.push({
        type: 'address_converted',
        message: `Đã chuyển đổi sang địa chỉ mới 2 cấp: ${conversion.note}`,
        severity: 'info'
      });
    }

    // Step 12: Post-process street — remove any leftover noise fragments
    const rawStreet = streetParts.join(', ').trim();
    let cleanedStreet = this._cleanStreetOutput(rawStreet);

    // Step 12.5: Standardize street name from database
    // "ng t minh khai" → "Nguyễn Thị Minh Khai"
    // "dien bien phu" → "Điện Biên Phủ"
    if (cleanedStreet) {
      const stdResult = VietnamAddressData.standardizeStreetName(cleanedStreet, province || null);
      if (stdResult && stdResult.confidence >= 0.6) {
        const oldStreet = cleanedStreet;
        cleanedStreet = stdResult.full;
        
        // Auto-fill missing district/province from street match
        if (!district && stdResult.district) {
          district = stdResult.district;
        }
        if (!province && stdResult.province) {
          province = stdResult.province;
        }
        
        if (oldStreet.toLowerCase() !== cleanedStreet.toLowerCase()) {
          warnings.push({
            type: 'street_standardized',
            message: `Chuẩn hóa đường: "${oldStreet}" → "${cleanedStreet}"`,
            severity: 'info'
          });
        }
      }
    }

    return {
      street: cleanedStreet,
      ward: ward,
      province: province,
      district: district,
      // New 2-tier fields
      newWard: conversion.newWard || ward,
      newDistrict: conversion.newDistrict || district,
      isConverted: conversion.converted,
      conversionNote: conversion.note,
      warnings: warnings,
      raw: rawAddress
    };
  },

  // =============================================
  // Capitalize Vietnamese text properly
  // =============================================
  _capitalizeVietnamese(str) {
    if (!str) return '';
    // Lowercase first to normalize, then capitalize each word
    return str.toLowerCase().split(/\s+/).map(word => {
      if (!word) return word;
      return word.charAt(0).toUpperCase() + word.slice(1);
    }).join(' ');
  },

  // =============================================
  // BATCH PARSE
  // =============================================
  parseAddresses(addresses) {
    return addresses.map(addr => this.parseAddress(addr));
  },

  // =============================================
  // EXCEL INTEGRATION
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

          const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
          
          if (jsonData.length < 2) {
            resolve({ headers: jsonData[0] || [], rows: [], parsed: [] });
            return;
          }

          const headers = jsonData[0].map(h => String(h).trim());
          const dataRows = jsonData.slice(1).filter(row => row.some(cell => cell !== ''));

          let addressColIdx = -1;
          if (typeof columnIdentifier === 'number') {
            addressColIdx = columnIdentifier;
          } else if (typeof columnIdentifier === 'string') {
            addressColIdx = headers.findIndex(h => 
              h.toLowerCase() === columnIdentifier.toLowerCase() ||
              h.toLowerCase().includes(columnIdentifier.toLowerCase())
            );
          }

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

          const addresses = [];
          const rowIndices = [];
          
          for (let i = 0; i < dataRows.length; i++) {
            const cellValue = String(dataRows[i][addressColIdx] || '').trim();
            if (cellValue) {
              addresses.push(cellValue);
              rowIndices.push(i);
            }
          }

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
  // Output format: Old 3-tier → New 2-tier (no District)
  // =============================================
  exportToExcel(originalData, parsedResults, filename = 'dia_chi_phan_ra.xlsx') {
    const headers = [...originalData.headers];
    const insertIdx = originalData.addressColumnIndex + 1;
    
    // Insert columns: Old 3-tier breakdown + New 2-tier clean output
    headers.splice(insertIdx, 0, 
      // --- Phân rã gốc (3 cấp) ---
      'Số nhà & Đường (gốc)', 
      'Phường/Xã (gốc)', 
      'Quận/Huyện (gốc)', 
      'Tỉnh/TP (gốc)',
      // --- Địa chỉ mới (2 cấp) ---
      'Số nhà & Đường (mới)',
      'Phường/Xã (mới)', 
      'Tỉnh/TP (mới)',
      // --- Metadata ---
      'Đã chuyển đổi',
      'Ghi chú',
      'Cảnh báo'
    );

    const rows = originalData.rows.map((row, idx) => {
      const newRow = [...row];
      const parsed = parsedResults[idx] || { 
        street: '', ward: '', district: '', province: '', 
        newWard: '', newDistrict: '', isConverted: false, conversionNote: '',
        warnings: [] 
      };
      const warningText = (parsed.warnings || [])
        .filter(w => w.severity === 'warning')
        .map(w => w.message)
        .join('; ');
      
      // New 2-tier: Ward may change, District is REMOVED
      const finalWard = parsed.newWard || parsed.ward || '';
      const finalProvince = parsed.province || '';

      newRow.splice(insertIdx, 0, 
        // Old 3-tier
        parsed.street, 
        parsed.ward,
        parsed.district, 
        parsed.province,
        // New 2-tier (no district)
        parsed.street,
        finalWard,
        finalProvince,
        // Metadata
        parsed.isConverted ? 'Có' : 'Không',
        parsed.conversionNote || '',
        warningText
      );
      return newRow;
    });

    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Địa chỉ phân rã');

    const colWidths = headers.map((h, i) => {
      let maxLen = h.length;
      rows.forEach(row => {
        const cellLen = String(row[i] || '').length;
        if (cellLen > maxLen) maxLen = cellLen;
      });
      return { wch: Math.min(maxLen + 2, 50) };
    });
    ws['!cols'] = colWidths;

    XLSX.writeFile(wb, filename);
  }
};

// =============================================
// ADDRESS PARSER UI MODULE — Enhanced v2.0
// =============================================
const AddressParserUI = {

  _file: null,
  _parsedResult: null,
  _selectedColumn: -1,

  init() {
    // Nothing to initialize on load
  },

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

    if (autoDetected >= 0) {
      this.selectColumn(autoDetected);
    }
  },

  selectColumn(idx) {
    this._selectedColumn = idx;
    
    document.querySelectorAll('.ap-column-card').forEach(c => c.classList.remove('selected'));
    const card = document.getElementById(`ap-col-${idx}`);
    if (card) card.classList.add('selected');
    
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
      // Debug info (visible in F12 Console)
      const stats = {
        total: result.parsed.length,
        withProvince: result.parsed.filter(p => p.province).length,
        withDistrict: result.parsed.filter(p => p.district).length,
        withWard: result.parsed.filter(p => p.ward).length,
        converted: result.parsed.filter(p => p.isConverted).length,
      };
      console.log('[AddressParser] Parse complete:', stats);
      if (stats.withProvince === 0 && stats.total > 0) {
        console.warn('[AddressParser] WARNING: No provinces detected! Sample raw:', result.addresses.slice(0, 3));
        console.warn('[AddressParser] _removeDiacritics test:', AddressParser._removeDiacritics ? AddressParser._removeDiacritics('Hồ Chí Minh') : 'N/A');
      }
      App.toast(`Đã phân rã ${result.parsed.length} địa chỉ thành công!`, 'success');
    } catch (err) {
      console.error('[AddressParser] Parse failed:', err);
      console.error('[AddressParser] XLSX available:', typeof XLSX !== 'undefined');
      console.error('[AddressParser] VietnamAddressData available:', typeof VietnamAddressData !== 'undefined');
      console.error('[AddressParser] MASTER_WARDS_2025 available:', typeof MASTER_WARDS_2025 !== 'undefined');
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
    
    const total = result.parsed.length;
    const withProvince = result.parsed.filter(p => p.province).length;
    const withWard = result.parsed.filter(p => p.ward).length;
    const withStreet = result.parsed.filter(p => p.street).length;
    const withDistrict = result.parsed.filter(p => p.district).length;
    const convertedCount = result.parsed.filter(p => p.isConverted).length;
    const accuracy = total > 0 ? ((withProvince / total) * 100).toFixed(1) : 0;

    // Update KPI cards
    const kpiTotal = document.getElementById('ap-kpi-total');
    const kpiParsed = document.getElementById('ap-kpi-parsed');
    const kpiAccuracy = document.getElementById('ap-kpi-accuracy');
    if (kpiTotal) kpiTotal.textContent = total.toLocaleString();
    if (kpiParsed) kpiParsed.textContent = withProvince.toLocaleString();
    if (kpiAccuracy) kpiAccuracy.textContent = accuracy + '%';

    section.innerHTML = `
      <div class="ap-result-wrap">
        <!-- Results Header -->
        <div class="ap-result-header">
          <div class="ap-result-title-wrap">
            <h3 class="ap-result-title">Kết quả phân tích</h3>
            <span class="ap-live-badge"><span class="ap-live-dot"></span> LIVE DATA</span>
            ${convertedCount > 0 ? `<span class="ap-converted-badge">🔄 ${convertedCount} đã chuyển đổi 2 cấp</span>` : ''}
          </div>
          <div class="ap-result-controls">
            <input type="text" class="ap-search-input" placeholder="Tìm kiếm địa chỉ..." 
                   oninput="AddressParserUI.filterResults(this.value)">
            <button class="ap-filter-btn" title="Bộ lọc">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
              </svg>
            </button>
          </div>
        </div>

        <!-- Data Table -->
        <div class="ap-table-wrap">
          <table class="ap-result-table">
            <thead>
              <tr>
                <th rowspan="2">ĐỊA CHỈ GỐC</th>
                <th colspan="4" class="ap-th-group-old">📋 ĐỊA CHỈ CŨ (3 CẤP)</th>
                <th colspan="3" class="ap-th-group-new">✨ ĐỊA CHỈ MỚI (2 CẤP)</th>
                <th rowspan="2">GHI CHÚ</th>
              </tr>
              <tr>
                <th class="ap-th-old">SỐ NHÀ & ĐƯỜNG</th>
                <th class="ap-th-old">PHƯỜNG/XÃ</th>
                <th class="ap-th-old">QUẬN/HUYỆN</th>
                <th class="ap-th-old">TỈNH/TP</th>
                <th class="ap-th-new">SỐ NHÀ & ĐƯỜNG</th>
                <th class="ap-th-new">PHƯỜNG/XÃ</th>
                <th class="ap-th-new">TỈNH/TP</th>
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

        <!-- Stats Bar -->
        <div class="ap-stats-bar">
          <div class="ap-stat-item">
            <span>Tổng:</span>
            <span class="ap-stat-value">${total}</span>
          </div>
          <div class="ap-stat-item">
            <span>Có đường:</span>
            <span class="ap-stat-value">${withStreet}</span>
          </div>
          <div class="ap-stat-item">
            <span>Có phường:</span>
            <span class="ap-stat-value">${withWard}</span>
          </div>
          <div class="ap-stat-item">
            <span>Đã chuyển 2 cấp:</span>
            <span class="ap-stat-value ap-stat-converted">${convertedCount}</span>
          </div>
          <button class="btn btn-success ap-download-btn" onclick="AddressParserUI.exportResult()">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Xuất Excel
          </button>
        </div>
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
    
    // Determine if this row was converted from 3-tier to 2-tier
    const isConverted = parsed.isConverted;
    const rowClass = isConverted ? 'ap-row-converted' : '';

    // New 2-tier: Ward may change, District is REMOVED
    const newWard = parsed.newWard || parsed.ward || '';
    const province = parsed.province || '';

    // Build conversion note for display
    let noteHtml = '';
    if (isConverted && parsed.conversionNote) {
      noteHtml = `<span class="ap-note-converted">🔄 ${parsed.conversionNote}</span>`;
    } else if (parsed.warnings && parsed.warnings.length > 0) {
      const warns = parsed.warnings.filter(w => w.severity === 'warning');
      if (warns.length > 0) {
        noteHtml = `<span class="ap-note-warning">⚠️ ${warns[0].message}</span>`;
      }
    }

    return `
      <tr class="${rowClass}">
        <td>${this._truncate(parsed.raw, 45) || '<span class="ap-empty">—</span>'}</td>
        <td class="ap-td-old">${parsed.street || '<span class="ap-empty">—</span>'}</td>
        <td class="ap-td-old">${parsed.ward || '<span class="ap-empty">—</span>'}</td>
        <td class="ap-td-old">${parsed.district || '<span class="ap-empty">—</span>'}</td>
        <td class="ap-td-old">${province || '<span class="ap-empty">—</span>'}</td>
        <td class="ap-td-new">${parsed.street || '<span class="ap-empty">—</span>'}</td>
        <td class="ap-td-new">${newWard || '<span class="ap-empty">—</span>'}</td>
        <td class="ap-td-new">${province || '<span class="ap-empty">—</span>'}</td>
        <td>${noteHtml || '<span class="ap-empty">—</span>'}</td>
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
    const footer = document.querySelector('.ap-table-footer');
    if (footer) footer.remove();
  },

  toggleAllRows() {
    this.showAllRows();
  },

  filterResults(query) {
    if (!this._parsedResult) return;
    const q = query.toLowerCase().trim();
    const tbody = document.getElementById('ap-result-tbody');
    if (!tbody) return;

    if (!q) {
      tbody.innerHTML = this._parsedResult.parsed
        .slice(0, 50)
        .map((p, i) => this._renderResultRow(p, i))
        .join('');
      return;
    }

    const filtered = this._parsedResult.parsed.filter(p =>
      (p.raw || '').toLowerCase().includes(q) ||
      (p.street || '').toLowerCase().includes(q) ||
      (p.ward || '').toLowerCase().includes(q) ||
      (p.district || '').toLowerCase().includes(q) ||
      (p.province || '').toLowerCase().includes(q)
    );

    tbody.innerHTML = filtered.length > 0
      ? filtered.map((p, i) => this._renderResultRow(p, i)).join('')
      : '<tr><td colspan="9" style="text-align:center;padding:32px;color:var(--text-muted);">Không tìm thấy kết quả</td></tr>';
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
  },

  // Parse manual address input
  parseManual() {
    const input = document.getElementById('ap-manual-input');
    if (!input || !input.value.trim()) {
      App.toast('Vui lòng nhập địa chỉ cần phân rã', 'warning');
      return;
    }

    const addresses = input.value.trim().split('\n').filter(a => a.trim());
    const parsed = AddressParser.parseAddresses(addresses);

    // Create a mock result similar to file upload
    this._parsedResult = {
      headers: ['Địa chỉ'],
      rows: addresses.map(a => [a]),
      addressColumnIndex: 0,
      addressColumnName: 'Địa chỉ',
      addresses: addresses,
      parsed: parsed,
      rowIndices: addresses.map((_, i) => i)
    };

    this._renderResults(this._parsedResult);
    App.toast(`Đã phân rã ${parsed.length} địa chỉ thành công!`, 'success');
  },

  // Load sample data for testing
  loadSampleData() {
    const sampleAddresses = [
      '123 Trần Não, P. Bình An, Q2, TP.HCM',
      '45/5 Võ Văn Ngân, P. Linh Chiểu, Q. Thủ Đức, HCM',
      '789 Lê Văn Việt, P. Tăng Nhơn Phú A, Q9, TP HCM',
      '12 Nguyễn Huệ, P. Bến Nghé, Q1, TP. Hồ Chí Minh',
      '56 Quang Trung, P15, Gò Vấp, HCM',
      '90 Cộng Hòa, P4, Q. Tân Bình, Hồ Chí Minh',
      '34 Kha Vạn Cân, Linh Đông, Thủ Đức, HCM',
      '88 Nguyễn Duy Trinh, P. Long Trường, Quận 9, TP.HCM',
    ];

    const input = document.getElementById('ap-manual-input');
    if (input) {
      input.value = sampleAddresses.join('\n');
    }

    App.toast('Đã tải dữ liệu mẫu — bấm "PHÂN RÃ NGAY" để phân tích', 'info');
  }
};
