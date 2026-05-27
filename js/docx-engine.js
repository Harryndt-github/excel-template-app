/* ================================================================
   Native DOCX Template Engine
   - Stores original .docx in IndexedDB
   - Scans only explicit {{placeholders}} from OOXML
   - Replaces placeholders directly in Word XML parts
   - Supports basic table row repeat blocks: {{#items}} ... {{/items}}
   ================================================================ */

const DocxStore = {
  DB_NAME: 'excelmapper_docx_templates',
  DB_VERSION: 1,
  STORE_NAME: 'docx_files',
  _db: null,

  async open() {
    if (this._db) return this._db;
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);
      request.onupgradeneeded = event => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(this.STORE_NAME)) {
          db.createObjectStore(this.STORE_NAME);
        }
      };
      request.onsuccess = event => {
        this._db = event.target.result;
        resolve(this._db);
      };
      request.onerror = event => reject(event.target.error);
    });
  },

  async save(id, arrayBuffer) {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.STORE_NAME, 'readwrite');
      tx.objectStore(this.STORE_NAME).put(arrayBuffer, id);
      tx.oncomplete = () => resolve(true);
      tx.onerror = event => reject(event.target.error);
    });
  },

  async load(id) {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const request = db.transaction(this.STORE_NAME, 'readonly')
        .objectStore(this.STORE_NAME)
        .get(id);
      request.onsuccess = event => resolve(event.target.result || null);
      request.onerror = event => reject(event.target.error);
    });
  },

  async remove(id) {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.STORE_NAME, 'readwrite');
      tx.objectStore(this.STORE_NAME).delete(id);
      tx.oncomplete = () => resolve(true);
      tx.onerror = event => reject(event.target.error);
    });
  },

  async has(id) {
    return !!(await this.load(id));
  }
};

const DocxEngine = {
  lastReport: null,

  async importDocx(file, templateId) {
    if (typeof JSZip === 'undefined') {
      throw new Error('JSZip chưa được tải');
    }
    const arrayBuffer = await file.arrayBuffer();
    await DocxStore.save(templateId, arrayBuffer);
    const zip = await JSZip.loadAsync(arrayBuffer);
    const placeholders = await this.scanPlaceholders(zip);
    return { placeholders, hasOriginal: true };
  },

  async hasOriginalDocx(templateId) {
    return DocxStore.has(templateId);
  },

  async exportDocx(templateId, replacements, repeatBlocks = {}, directReplacements = []) {
    if (typeof JSZip === 'undefined') {
      throw new Error('JSZip chưa được tải');
    }
    const arrayBuffer = await DocxStore.load(templateId);
    if (!arrayBuffer) {
      throw new Error('Không tìm thấy file .docx gốc. Vui lòng upload lại template Word.');
    }

    // Tự động bổ sung _bangchu cho các trường số tiền
    if (typeof NumberToWords !== 'undefined') {
      replacements = NumberToWords.expandBangChu(replacements || {});
    }

    const zip = await JSZip.loadAsync(arrayBuffer);
    const report = this.createMergeReport(replacements, directReplacements);
    const directCounters = {};
    const xmlFiles = Object.keys(zip.files).filter(name =>
      name.startsWith('word/') &&
      name.endsWith('.xml') &&
      !name.includes('/_rels/')
    );

    for (const fileName of xmlFiles) {
      const file = zip.file(fileName);
      if (!file) continue;
      const original = await file.async('string');
      let xml = original;
      xml = this.processRepeatBlocks(xml, repeatBlocks);
      xml = this.replacePlaceholdersInXml(xml, replacements, report, fileName);
      // Target-text/occurrence mapping follows the prototype engine and is scoped
      // to the document body so header/footer text does not shift occurrence order.
      if (fileName === 'word/document.xml') {
        xml = this.replaceDirectTextInXml(xml, directReplacements, report, fileName, directCounters);
      }
      // Only overwrite ZIP entry when content actually changed.
      // Skipping unchanged files (especially word/numbering.xml, word/styles.xml)
      // preserves their original binary representation and avoids namespace/encoding
      // issues that can corrupt automatic heading numbering in Word.
      if (xml !== original) {
        zip.file(fileName, xml);
      }
    }
    this.finalizeMergeReport(report);
    this.lastReport = report;

    return zip.generateAsync({
      type: 'blob',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 }
    });
  },

  createMergeReport(replacements = {}, directReplacements = []) {
    return {
      applied: [],
      notFound: [],
      skipped: [],
      errors: [],
      placeholderRules: Object.keys(replacements || {}).map(key => ({
        key,
        value: String(replacements[key] ?? ''),
        applied: 0,
        parts: []
      })),
      directRules: (directReplacements || [])
        .filter(item => item && item.targetText)
        .map((item, idx) => ({
          idx,
          field: item.field || '',
          targetText: String(item.targetText || ''),
          value: String(item.value ?? ''),
          mode: item.mode || 'replace',
          occurrence: Number(item.occurrence) || 0,
          applied: 0,
          foundCount: 0,
          parts: []
        }))
    };
  },

  finalizeMergeReport(report) {
    if (!report) return report;
    report.placeholderRules.forEach(rule => {
      if (rule.applied > 0) {
        report.applied.push({
          type: 'placeholder',
          field: rule.key,
          target: `{{${rule.key}}}`,
          value: rule.value,
          count: rule.applied,
          parts: rule.parts
        });
      } else {
        report.notFound.push({
          type: 'placeholder',
          field: rule.key,
          searched: `{{${rule.key}}}`,
          value: rule.value
        });
      }
    });
    report.directRules.forEach(rule => {
      if (rule.applied > 0) {
        report.applied.push({
          type: 'target',
          field: rule.field,
          target: rule.targetText,
          occurrence: rule.occurrence || 'all',
          value: rule.value,
          count: rule.applied,
          parts: rule.parts
        });
      } else {
        report.notFound.push({
          type: 'target',
          field: rule.field,
          searched: rule.targetText,
          occurrence: rule.occurrence || 'all',
          totalFound: rule.foundCount,
          value: rule.value
        });
      }
    });
    return report;
  },

  async scanPlaceholders(zip) {
    const found = new Set();
    const xmlFiles = Object.keys(zip.files).filter(name =>
      name.startsWith('word/') &&
      name.endsWith('.xml') &&
      !name.includes('/_rels/')
    );

    for (const fileName of xmlFiles) {
      const file = zip.file(fileName);
      if (!file) continue;
      const xml = await file.async('string');
      this.extractPlaceholdersFromXml(xml).forEach(name => found.add(name));
    }
    return Array.from(found);
  },

  extractPlaceholdersFromXml(xmlText) {
    const text = this.extractWordText(xmlText);
    const found = new Set();
    const regex = /\{\{([^}]+)\}\}/g;
    let match;
    while ((match = regex.exec(text)) !== null) {
      const name = (match[1] || '').trim();
      if (name) found.add(name);
    }
    return Array.from(found);
  },

  extractWordText(xmlText) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlText, 'application/xml');
    if (doc.getElementsByTagName('parsererror').length) return '';
    const wordNs = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
    return Array.from(doc.getElementsByTagNameNS(wordNs, 't'))
      .map(node => node.textContent || '')
      .join('');
  },

  replacePlaceholdersInXml(xmlText, replacements, report = null, partName = '') {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlText, 'application/xml');
    if (doc.getElementsByTagName('parsererror').length) return xmlText;

    const wordNs = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
    const paragraphs = Array.from(doc.getElementsByTagNameNS(wordNs, 'p'));
    let changed = false;
    paragraphs.forEach(paragraph => {
      const textNodes = Array.from(paragraph.getElementsByTagNameNS(wordNs, 't'));
      const applied = this.replaceInTextNodes(textNodes, replacements);
      if (applied.length) {
        changed = true;
        if (report) this.recordPlaceholderApplications(report, applied, partName);
      }
    });

    return changed ? this._serializeDocxXml(doc, xmlText) : xmlText;
  },

  replaceDirectTextInXml(xmlText, directReplacements, report = null, partName = '', counters = {}) {
    const pairs = (directReplacements || [])
      .filter(item => item && item.targetText && item.value !== undefined && item.value !== null)
      .map((item, idx) => ({
        idx,
        target: String(item.targetText),
        value: String(item.value),
        mode: item.mode || 'replace',
        occurrence: Number(item.occurrence) || 0,
        field: item.field || ''
      }));
    if (!pairs.length) return xmlText;

    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlText, 'application/xml');
    if (doc.getElementsByTagName('parsererror').length) return xmlText;

    const wordNs = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
    const paragraphs = Array.from(doc.getElementsByTagNameNS(wordNs, 'p'));
    let changed = false;
    paragraphs.forEach(paragraph => {
      const textNodes = Array.from(paragraph.getElementsByTagNameNS(wordNs, 't'));
      const result = this.replaceTextPairsInNodes(textNodes, pairs, counters);
      if (result.changed) changed = true;
      if (report) this.recordDirectApplications(report, result, partName);
    });
    return changed ? this._serializeDocxXml(doc, xmlText) : xmlText;
  },

  replaceTextPairsInNodes(textNodes, pairs, counters = {}) {
    const result = { changed: false, applied: [], found: [] };
    if (!textNodes.length || !pairs.length) return result;
    let fullText = textNodes.map(node => node.textContent || '').join('');
    const jobs = [];

    const targets = Array.from(new Set(pairs.map(pair => pair.target)));
    targets.forEach(target => {
      let index = fullText.indexOf(target);
      while (index !== -1) {
        counters[target] = (counters[target] || 0) + 1;
        const occurrence = counters[target];
        result.found.push({ target, occurrence });
        const matchingPair = pairs.find(pair =>
          pair.target === target &&
          (!pair.occurrence || pair.occurrence === occurrence)
        );
        if (matchingPair) {
          const replacement = matchingPair.mode === 'append'
            ? target + ' ' + matchingPair.value
            : matchingPair.value;
          jobs.push({ start: index, end: index + target.length, value: replacement });
          result.applied.push({
            idx: matchingPair.idx,
            field: matchingPair.field,
            target,
            occurrence,
            value: matchingPair.value
          });
        }
        index = fullText.indexOf(target, index + target.length);
      }
    });
    if (!jobs.length) return result;

    const ranges = [];
    let cursor = 0;
    textNodes.forEach((node, nodeIndex) => {
      const len = (node.textContent || '').length;
      ranges.push({ node, nodeIndex, start: cursor, end: cursor + len });
      cursor += len;
    });

    jobs.sort((a, b) => b.start - a.start).forEach(job => {
      const startInfo = ranges.find(item => job.start >= item.start && job.start <= item.end);
      const endInfo = ranges.find(item => job.end >= item.start && job.end <= item.end);
      if (!startInfo || !endInfo) return;
      const startText = startInfo.node.textContent || '';
      const endText = endInfo.node.textContent || '';
      const startOffset = job.start - startInfo.start;
      const endOffset = job.end - endInfo.start;

      if (startInfo.nodeIndex === endInfo.nodeIndex) {
        startInfo.node.textContent = startText.slice(0, startOffset) + job.value + startText.slice(endOffset);
      } else {
        startInfo.node.textContent = startText.slice(0, startOffset) + job.value;
        for (let i = startInfo.nodeIndex + 1; i < endInfo.nodeIndex; i++) {
          ranges[i].node.textContent = '';
        }
        endInfo.node.textContent = endText.slice(endOffset);
      }
      startInfo.node.setAttribute('xml:space', 'preserve');
    });

    result.changed = true;
    return result;
  },

  // Serialize a modified DOCX XML document while preserving the original's
  // XML declaration and root-element namespace declarations.
  // XMLSerializer drops the <?xml?> header and may alter namespace prefixes
  // (e.g. w: → ns0:) which breaks Word's heading-numbering lookup.
  _serializeDocxXml(doc, originalXml) {
    let serialized = new XMLSerializer().serializeToString(doc);

    // 1. Remap any namespace prefix changes made by XMLSerializer (e.g. w: → ns0:).
    //    Firefox and some Chromium versions rename prefixes. Replacing only the root tag
    //    (step 3) would leave child elements with undeclared prefixes, causing docx-preview
    //    to miss <w:numPr> elements and break multi-level heading counter display.
    const origNs = this._extractNamespaceMap(originalXml); // uri → original prefix
    const serNs  = this._extractNamespaceMap(serialized);  // uri → serialized prefix
    const remap  = {};
    for (const [uri, origPrefix] of Object.entries(origNs)) {
      const serPrefix = serNs[uri];
      if (serPrefix && serPrefix !== origPrefix) remap[serPrefix] = origPrefix;
    }
    if (Object.keys(remap).length > 0) {
      // Sort longest-first so "ns10:" is remapped before "ns1:" (prevents partial matches)
      const pairs = Object.entries(remap).sort((a, b) => b[0].length - a[0].length);
      for (const [from, to] of pairs) {
        serialized = serialized.split(`<${from}:`).join(`<${to}:`);
        serialized = serialized.split(`</${from}:`).join(`</${to}:`);
        serialized = serialized.split(` ${from}:`).join(` ${to}:`);
        serialized = serialized.split(`\t${from}:`).join(`\t${to}:`);
        serialized = serialized.split(`\n${from}:`).join(`\n${to}:`);
        serialized = serialized.split(`xmlns:${from}=`).join(`xmlns:${to}=`);
      }
    }

    // 2. Restore <?xml …?> declaration that XMLSerializer omits
    const xmlDeclMatch = originalXml.match(/^<\?xml[^?]*\?>/);
    if (xmlDeclMatch && !serialized.startsWith('<?xml')) {
      serialized = xmlDeclMatch[0] + serialized;
    }

    // 3. Replace the serialized root element opening tag with the original one.
    //    This preserves all xmlns: namespace bindings (w:, r:, mc:, w14:, …)
    //    and the mc:Ignorable attribute exactly as Word created them.
    const origRoot = this._extractRootOpenTag(originalXml);
    const serRoot  = this._extractRootOpenTag(serialized);
    if (origRoot && serRoot && origRoot !== serRoot) {
      const idx = serialized.indexOf(serRoot);
      if (idx !== -1) {
        serialized = serialized.slice(0, idx) + origRoot + serialized.slice(idx + serRoot.length);
      }
    }

    return serialized;
  },

  // Parse xmlns:prefix="uri" declarations from a root tag → returns {uri: prefix}.
  _extractNamespaceMap(xml) {
    const rootTag = this._extractRootOpenTag(xml);
    if (!rootTag) return {};
    const map = {};
    const re = /xmlns:([a-zA-Z0-9_-]+)="([^"]+)"/g;
    let m;
    while ((m = re.exec(rootTag)) !== null) {
      map[m[2]] = m[1]; // uri → prefix
    }
    return map;
  },

  // Extract the first element opening tag (<tagName …>) handling quoted attr values.
  _extractRootOpenTag(xml) {
    // Skip past any <?xml?> or <!-- --> preamble
    let i = 0;
    while (i < xml.length && xml[i] !== '<') i++;
    if (i >= xml.length) return null;
    // Skip processing instructions / comments
    while (i < xml.length && (xml.slice(i, i+2) === '<?' || xml.slice(i, i+4) === '<!--')) {
      if (xml.slice(i, i+2) === '<?') {
        i = xml.indexOf('?>', i) + 2;
      } else {
        i = xml.indexOf('-->', i) + 3;
      }
      while (i < xml.length && xml[i] !== '<') i++;
    }
    if (i >= xml.length) return null;
    const start = i;
    i++; // skip '<'
    let inQuote = false, qc = '';
    while (i < xml.length) {
      const ch = xml[i];
      if (inQuote) { if (ch === qc) inQuote = false; }
      else if (ch === '"' || ch === "'") { inQuote = true; qc = ch; }
      else if (ch === '>') { return xml.slice(start, i + 1); }
      i++;
    }
    return null;
  },

  replaceInTextNodes(textNodes, replacements) {
    if (!textNodes.length || !Object.keys(replacements).length) return [];
    let fullText = textNodes.map(node => node.textContent || '').join('');
    const jobs = [];
    const applied = [];

    Object.entries(replacements).forEach(([key, value]) => {
      const token = `{{${key}}}`;
      let index = fullText.indexOf(token);
      while (index !== -1) {
        jobs.push({ start: index, end: index + token.length, value: String(value ?? '') });
        applied.push({ key, token, value: String(value ?? '') });
        index = fullText.indexOf(token, index + token.length);
      }
    });
    if (!jobs.length) return [];

    const ranges = [];
    let cursor = 0;
    textNodes.forEach((node, nodeIndex) => {
      const len = (node.textContent || '').length;
      ranges.push({ node, nodeIndex, start: cursor, end: cursor + len });
      cursor += len;
    });

    jobs.sort((a, b) => b.start - a.start).forEach(job => {
      const startInfo = ranges.find(item => job.start >= item.start && job.start <= item.end);
      const endInfo = ranges.find(item => job.end >= item.start && job.end <= item.end);
      if (!startInfo || !endInfo) return;

      const startText = startInfo.node.textContent || '';
      const endText = endInfo.node.textContent || '';
      const startOffset = job.start - startInfo.start;
      const endOffset = job.end - endInfo.start;

      if (startInfo.nodeIndex === endInfo.nodeIndex) {
        startInfo.node.textContent = startText.slice(0, startOffset) + job.value + startText.slice(endOffset);
      } else {
        startInfo.node.textContent = startText.slice(0, startOffset) + job.value;
        for (let i = startInfo.nodeIndex + 1; i < endInfo.nodeIndex; i++) {
          ranges[i].node.textContent = '';
        }
        endInfo.node.textContent = endText.slice(endOffset);
      }

      startInfo.node.setAttribute('xml:space', 'preserve');
    });

    return applied;
  },

  recordPlaceholderApplications(report, applied, partName) {
    (applied || []).forEach(item => {
      const rule = report.placeholderRules.find(r => r.key === item.key);
      if (!rule) return;
      rule.applied += 1;
      if (partName && !rule.parts.includes(partName)) rule.parts.push(partName);
    });
  },

  recordDirectApplications(report, result, partName) {
    (result.found || []).forEach(item => {
      report.directRules
        .filter(rule => rule.targetText === item.target)
        .forEach(rule => { rule.foundCount += 1; });
    });
    (result.applied || []).forEach(item => {
      const rule = report.directRules[item.idx];
      if (!rule) return;
      rule.applied += 1;
      if (partName && !rule.parts.includes(partName)) rule.parts.push(partName);
    });
  },

  processRepeatBlocks(xmlText, repeatBlocks) {
    if (!repeatBlocks || !Object.keys(repeatBlocks).length) return xmlText;
    let result = xmlText;

    Object.entries(repeatBlocks).forEach(([blockName, rows]) => {
      if (!Array.isArray(rows) || !rows.length) return;
      const startToken = `{{#${blockName}}}`;
      const endToken = `{{/${blockName}}}`;
      const startIndex = result.indexOf(startToken);
      const endIndex = result.indexOf(endToken);
      if (startIndex === -1 || endIndex === -1 || endIndex < startIndex) return;

      const rowStart = Math.max(
        result.lastIndexOf('<w:tr ', startIndex),
        result.lastIndexOf('<w:tr>', startIndex)
      );
      const rowEnd = result.indexOf('</w:tr>', endIndex);
      if (rowStart === -1 || rowEnd === -1) return;

      const closeEnd = rowEnd + '</w:tr>'.length;
      const templateRow = result.slice(rowStart, closeEnd);
      const clonedRows = rows.map(rowData => {
        let row = templateRow.replace(startToken, '').replace(endToken, '');
        Object.entries(rowData || {}).forEach(([key, value]) => {
          row = row.split(`{{${key}}}`).join(String(value ?? ''));
        });
        return row;
      }).join('');

      result = result.slice(0, rowStart) + clonedRows + result.slice(closeEnd);
    });

    return result;
  }
};
