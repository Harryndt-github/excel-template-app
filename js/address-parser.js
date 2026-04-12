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
      { canonical: "Đồng Nai", aliases: ["dong nai", "dongnai", "dnai", "đồng nai"] },
      { canonical: "Bà Rịa - Vũng Tàu", aliases: ["ba ria vung tau", "bariavungtau", "brvt", "br-vt", "vung tau", "vungtau", "bà rịa - vũng tàu", "bà rịa vũng tàu", "bà rịa", "vũng tàu"] },

      // ===== Mekong Delta =====
      { canonical: "Long An", aliases: ["long an", "longan", "la", "lan"] },
      { canonical: "Tiền Giang", aliases: ["tien giang", "tiengiang", "tg", "tgiang", "tiền giang"] },
      { canonical: "Bến Tre", aliases: ["ben tre", "bentre", "btre", "bến tre"] },
      { canonical: "Trà Vinh", aliases: ["tra vinh", "travinh", "tv", "tvinh", "trà vinh"] },
      { canonical: "Vĩnh Long", aliases: ["vinh long", "vinhlong", "vl", "vlong", "vĩnh long"] },
      { canonical: "Đồng Tháp", aliases: ["dong thap", "dongthap", "dt", "dthap", "đồng tháp"] },
      { canonical: "An Giang", aliases: ["an giang", "angiang", "ag", "agiang"] },
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

    // Strategy 2: Remove common prefixes
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

    // Strategy 3: Fuzzy — longest alias match
    let bestMatch = null;
    let bestLen = 0;
    for (const [alias, canonical] of this._provinceAliases) {
      if (alias.length < 3) continue;
      if (noDiacritics.includes(alias) && alias.length > bestLen) {
        bestMatch = canonical;
        bestLen = alias.length;
      }
    }
    return bestMatch;
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
        return { ward: `${prefix} ${match[2].trim()}`, remainder: '' };
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
        const name = m[2].replace(/([a-z])([A-Z])/g, '$1 $2').trim();
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
        const name = m[2].replace(/([a-z])([A-Z])/g, '$1 $2').trim();
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
    if (lower.length < 3) return false;
    const noiseWords = [
      'dia chi moi', 'đia chi moi', 'địa chỉ mới',
      'dia chi cu', 'địa chỉ cũ',
      'nha moi', 'nhà mới', 'nha cu', 'nhà cũ',
      'giao hang', 'giao hàng', 'nhan tai', 'nhận tại',
      'lien he', 'liên hệ', 'ghi chu', 'ghi chú',
      'note', 'luu y', 'lưu ý',
    ];
    const noDiacritics = this._removeDiacritics(lower);
    return noiseWords.some(n => {
      const normNoise = this._removeDiacritics(n);
      return noDiacritics === normNoise;
    });
  },

  // =============================================
  // MAIN PARSING ENGINE — v3.0
  // =============================================
  parseAddress(rawAddress) {
    if (!rawAddress || typeof rawAddress !== 'string') {
      return { street: '', ward: '', province: '', district: '', newWard: '', warnings: [], raw: rawAddress || '' };
    }

    this._buildDictionaries();

    // Step 1: Clean noise from address
    const cleanResult = VietnamAddressData.cleanAddress(rawAddress);
    const normalized = this._normalize(cleanResult.cleaned);
    
    // Step 2: Split by comma, dash, or common delimiters
    const rawSegments = normalized
      .split(/[,\-–—]+/)
      .map(s => s.trim())
      .filter(s => s.length > 0);

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

      // Try ward extraction from end first
      const wardResult = this._detectWard(current);
      if (wardResult && wardResult.remainder) {
        extracted.push({ type: 'ward', value: wardResult.ward });
        current = wardResult.remainder;
      }

      // Try district extraction from end of remaining
      const distResult = this._detectDistrict(current);
      if (distResult && distResult.remainder) {
        extracted.push({ type: 'district', value: distResult.district });
        current = distResult.remainder;
      }

      // Push street part if any
      if (current.trim()) {
        segments.push(current.trim());
      }

      // Push extracted items as separate tagged segments
      for (const item of extracted.reverse()) {
        segments.push(`__${item.type.toUpperCase()}__:${item.value}`);
      }

      // If nothing was extracted, push original segment
      if (extracted.length === 0 && !current.trim()) {
        segments.push(seg);
      }
    }

    let province = '';
    let ward = '';
    let district = '';
    let streetParts = [];
    let provinceIdx = -1;
    let wardIdx = -1;
    let districtIdx = -1;
    let warnings = [];

    // Track noise removal
    if (allRemovedNoise.length > 0) {
      warnings.push({
        type: 'noise_removed',
        message: `Đã loại bỏ dữ liệu thừa: "${allRemovedNoise.join('", "')}"`,
        severity: 'info'
      });
    }

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
    let newWard = ward;
    if (ward) ward = this._capitalizeVietnamese(ward);
    if (district) district = this._capitalizeVietnamese(district);
    if (newWard) newWard = this._capitalizeVietnamese(newWard);

    return {
      street: streetParts.join(', ').trim(),
      ward: ward,
      province: province,
      district: district,
      newWard: newWard,
      warnings: warnings,
      raw: rawAddress
    };
  },

  // =============================================
  // Capitalize Vietnamese text properly
  // =============================================
  _capitalizeVietnamese(str) {
    if (!str) return '';
    // Split by spaces and capitalize first letter of each word  
    // Avoid using \b\w which breaks on Vietnamese diacritics
    return str.split(/\s+/).map(word => {
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
  // =============================================
  exportToExcel(originalData, parsedResults, filename = 'dia_chi_phan_ra.xlsx') {
    const headers = [...originalData.headers];
    const insertIdx = originalData.addressColumnIndex + 1;
    
    // Insert new columns
    headers.splice(insertIdx, 0, 'Số nhà & Đường', 'Phường/Xã', 'Quận/Huyện (cũ)', 'Tỉnh/Thành phố', 'Cảnh báo');

    const rows = originalData.rows.map((row, idx) => {
      const newRow = [...row];
      const parsed = parsedResults[idx] || { street: '', ward: '', district: '', province: '', warnings: [] };
      const warningText = (parsed.warnings || [])
        .filter(w => w.severity === 'warning')
        .map(w => w.message)
        .join('; ');
      newRow.splice(insertIdx, 0, parsed.street, parsed.ward, parsed.district, parsed.province, warningText);
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
    
    const total = result.parsed.length;
    const withProvince = result.parsed.filter(p => p.province).length;
    const withWard = result.parsed.filter(p => p.ward).length;
    const withStreet = result.parsed.filter(p => p.street).length;
    const withDistrict = result.parsed.filter(p => p.district).length;
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
                <th>ĐỊA CHỈ GỐC</th>
                <th>SỐ NHÀ</th>
                <th>TÊN ĐƯỜNG</th>
                <th>PHƯỜNG/XÃ</th>
                <th>QUẬN/HUYỆN</th>
                <th>TỈNH/THÀNH PHỐ</th>
                <th>ĐỘ TIN CẬY</th>
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
            <span>Có quận:</span>
            <span class="ap-stat-value">${withDistrict}</span>
          </div>
          <div class="ap-stat-item">
            <span>Có tỉnh:</span>
            <span class="ap-stat-value">${withProvince}</span>
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
    
    let confClass, confText;
    if (score === 3) {
      confClass = 'ap-conf-high';
      confText = 'High';
    } else if (score >= 2) {
      confClass = 'ap-conf-medium';
      confText = 'Medium';
    } else {
      confClass = 'ap-conf-low';
      confText = 'Low';
    }

    // Split street into number and name
    const streetParts = (parsed.street || '').match(/^(\d+[\/\-]?\d*[a-zA-Z]?)\s+(.+)$/);
    const houseNum = streetParts ? streetParts[1] : '';
    const streetName = streetParts ? streetParts[2] : (parsed.street || '');

    return `
      <tr>
        <td>${this._truncate(parsed.raw, 50) || '<span class="ap-empty">—</span>'}</td>
        <td>${houseNum || '<span class="ap-empty">—</span>'}</td>
        <td>${streetName || '<span class="ap-empty">—</span>'}</td>
        <td>${parsed.ward || '<span class="ap-empty">—</span>'}</td>
        <td>${parsed.district || '<span class="ap-empty">—</span>'}</td>
        <td>${parsed.province || '<span class="ap-empty">—</span>'}</td>
        <td><span class="ap-confidence ${confClass}">● ${confText}</span></td>
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
      : '<tr><td colspan="7" style="text-align:center;padding:32px;color:var(--text-muted);">Không tìm thấy kết quả</td></tr>';
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
