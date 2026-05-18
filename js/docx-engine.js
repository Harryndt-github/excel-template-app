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

    const zip = await JSZip.loadAsync(arrayBuffer);
    const xmlFiles = Object.keys(zip.files).filter(name =>
      name.startsWith('word/') &&
      name.endsWith('.xml') &&
      !name.includes('/_rels/')
    );

    for (const fileName of xmlFiles) {
      const file = zip.file(fileName);
      if (!file) continue;
      let xml = await file.async('string');
      xml = this.processRepeatBlocks(xml, repeatBlocks);
      xml = this.replacePlaceholdersInXml(xml, replacements);
      xml = this.replaceDirectTextInXml(xml, directReplacements);
      zip.file(fileName, xml);
    }

    return zip.generateAsync({
      type: 'blob',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 }
    });
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

  replacePlaceholdersInXml(xmlText, replacements) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlText, 'application/xml');
    if (doc.getElementsByTagName('parsererror').length) return xmlText;

    const wordNs = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
    const paragraphs = Array.from(doc.getElementsByTagNameNS(wordNs, 'p'));
    let changed = false;
    paragraphs.forEach(paragraph => {
      const textNodes = Array.from(paragraph.getElementsByTagNameNS(wordNs, 't'));
      if (this.replaceInTextNodes(textNodes, replacements)) changed = true;
    });

    return changed ? new XMLSerializer().serializeToString(doc) : xmlText;
  },

  replaceDirectTextInXml(xmlText, directReplacements) {
    const pairs = (directReplacements || [])
      .filter(item => item && item.targetText && item.value !== undefined && item.value !== null)
      .map(item => ({
        target: String(item.targetText),
        value: String(item.value),
        mode: item.mode || 'replace'
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
      if (this.replaceTextPairsInNodes(textNodes, pairs)) changed = true;
    });
    return changed ? new XMLSerializer().serializeToString(doc) : xmlText;
  },

  replaceTextPairsInNodes(textNodes, pairs) {
    if (!textNodes.length || !pairs.length) return false;
    let fullText = textNodes.map(node => node.textContent || '').join('');
    const jobs = [];

    pairs.forEach(pair => {
      let index = fullText.indexOf(pair.target);
      while (index !== -1) {
        const replacement = pair.mode === 'append'
          ? pair.target + ' ' + pair.value
          : pair.value;
        jobs.push({ start: index, end: index + pair.target.length, value: replacement });
        index = fullText.indexOf(pair.target, index + pair.target.length);
      }
    });
    if (!jobs.length) return false;

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

    return true;
  },

  replaceInTextNodes(textNodes, replacements) {
    if (!textNodes.length || !Object.keys(replacements).length) return false;
    let fullText = textNodes.map(node => node.textContent || '').join('');
    const jobs = [];

    Object.entries(replacements).forEach(([key, value]) => {
      const token = `{{${key}}}`;
      let index = fullText.indexOf(token);
      while (index !== -1) {
        jobs.push({ start: index, end: index + token.length, value: String(value ?? '') });
        index = fullText.indexOf(token, index + token.length);
      }
    });
    if (!jobs.length) return false;

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

    return true;
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
