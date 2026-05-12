/* PolicyRanker v3 — Hybrid Rule Engine
   Layer 1: Hard Eligibility | Layer 2: Rich contractData
   Layer 3: Commercial 40% + Risk 35% + Product 25% | Layer 4: Softmax + Cosine */

const PolicyRanker = {
  PROJECT_TYPE_MAP: {
    nha_o:['nhà ở','chung cư','căn hộ'], lien_ke:['liền kề','biệt thự','townhouse'],
    dat_nen:['đất nền','đất'], thuong_mai:['thương mại','officetel','shophouse'],
    nghi_duong:['nghỉ dưỡng','resort','condotel'],
  },
  PRODUCT_PROJ_MAP: { nha_o:['nha_o','lien_ke'], dat_nen:['dat_nen'], thuong_mai:['thuong_mai','nghi_duong'] },

  _sig(x,k=1){ return 1/(1+Math.exp(-k*x)); },
  _softmax(arr){ const m=Math.max(...arr),e=arr.map(s=>Math.exp(s-m)),s=e.reduce((a,b)=>a+b,0); return e.map(v=>+(v/s*100).toFixed(1)); },
  _cosine(a,b){ const d=a.reduce((s,v,i)=>s+v*b[i],0),mA=Math.sqrt(a.reduce((s,v)=>s+v*v,0)),mB=Math.sqrt(b.reduce((s,v)=>s+v*v,0)); return mA&&mB?d/(mA*mB):0; },

  _rankScore(r){ if(!r)return 60; const u=r.toUpperCase(); if(u.includes('A+'))return 100; if(u.includes('A'))return 90; if(u.includes('B+'))return 78; if(u.includes('B'))return 70; if(u.includes('C+'))return 58; if(u.includes('C'))return 50; if(u.includes('D'))return 30; return 60; },
  _payment(amt,n,rate){ const r=(rate/100)/12; return r>0?amt*r*Math.pow(1+r,n)/(Math.pow(1+r,n)-1):amt/n; },

  _hardEligibility(inp, ctx){
    const rs=[];
    if(inp.ltv>ctx.maxLtv) rs.push(`LTV ${inp.ltv}% vượt tối đa ${ctx.maxLtv}%`);
    if(inp.loanTermMonths>ctx.maxTermMonths) rs.push(`Kỳ hạn ${inp.loanTermMonths}T vượt tối đa ${ctx.maxTermMonths}T`);
    if(ctx.effectiveFrom&&inp.applicationDate&&inp.applicationDate<ctx.effectiveFrom) rs.push('Chính sách chưa đến thời gian áp dụng');
    if(ctx.effectiveTo&&inp.applicationDate&&inp.applicationDate>ctx.effectiveTo) rs.push('Chính sách đã hết hiệu lực');
    if(ctx.maxDsr&&inp.estimatedDsr&&inp.estimatedDsr>ctx.maxDsr) rs.push(`DSR ${inp.estimatedDsr}% vượt tối đa ${ctx.maxDsr}%`);
    return { eligible:rs.length===0, reasons:rs };
  },

  _scoreCommercial(nim,targetNIM,bucketRate,cof){
    const nimScore=Math.round(this._sig((nim-targetNIM+1)*1.5)*100);
    const spreadScore=Math.round(this._sig((bucketRate-cof-2.0)*1.0)*100);
    return { nimScore, spreadScore, total:Math.round(nimScore*0.65+spreadScore*0.35) };
  },

  _scoreRisk(inp,ctx,rankScore){
    const ltvScore=Math.round(this._sig((ctx.maxLtv-inp.ltv)*0.3)*100);
    const maxDsr=ctx.maxDsr||50, estDsr=inp.estimatedDsr||35;
    const dsrScore=Math.round(this._sig((maxDsr-estDsr)*0.35)*100);
    return { ltvScore, dsrScore, rankScore, total:Math.round(ltvScore*0.40+dsrScore*0.35+rankScore*0.25) };
  },

  _scoreProduct(inp,ctx,name){
    const termScore=Math.round(this._sig((ctx.maxTermMonths-inp.loanTermMonths)*0.1)*100);
    const graceScore=Math.round(this._sig((ctx.graceBase-12)*0.15)*100);
    const kws=this.PROJECT_TYPE_MAP[inp.projectType]||[];
    const projectScore=kws.some(k=>name.toLowerCase().includes(k))?100:55;
    const allowed=this.PRODUCT_PROJ_MAP[inp.productType]||[];
    const productScore=!inp.productType||!allowed.length?75:(allowed.includes(inp.projectType)?100:50);
    return { termScore, graceScore, projectScore, productScore, total:Math.round(termScore*0.35+graceScore*0.20+projectScore*0.25+productScore*0.20) };
  },

  _reason(p,inp){
    const pts=[];
    if(p.nim>=(parseFloat(inp.targetNIM)||3)) pts.push(`NIM ${p.nim}% đạt mục tiêu`);
    if(p.risk.ltvScore>=70) pts.push(`LTV ${inp.ltv}% trong ngưỡng`);
    if(p.risk.dsrScore>=60) pts.push('DSR kiểm soát tốt');
    if(p.product.termScore>=70) pts.push('Kỳ hạn phù hợp');
    if(p.policyCtx.graceBase>=24) pts.push(`Ân hạn ${p.policyCtx.graceBase}T`);
    if(p.commercial.spreadScore>=70) pts.push('Biên thương mại tốt');
    return pts.join(' · ')||'Cân bằng các tiêu chí';
  },

  rank(inp){
    const projects=(typeof RateCenter!=='undefined')?RateCenter.getProjects():[];
    const eligible=[], ineligible=[];

    projects.forEach(proj=>{
      (proj.packages||[]).forEach(pkg=>{
        const fields={}; (pkg.fields||[]).forEach(f=>{fields[f.id]=f.value;});
        const ctx={
          maxLtv:parseFloat(fields['f_ltv'])||80,
          maxTermMonths:(parseFloat(fields['f_max_term'])||25)*12,
          effectiveFrom:fields['f_effective_from']||null,
          effectiveTo:fields['f_effective_to']||null,
          maxDsr:parseFloat(fields['f_max_dsr'])||null,
          graceBase:pkg.graceRules?.baseMonths||0,
        };

        const chk=this._hardEligibility(inp,ctx);
        if(!chk.eligible){ ineligible.push({projectName:proj.name,policyName:pkg.name,reasons:chk.reasons}); return; }

        const buckets=(typeof RateRuleEngine!=='undefined')?RateRuleEngine.normalizeBuckets(pkg.rateBuckets||[]).filter(b=>b.rate!==''&&b.rate!==undefined):[];
        const sorted=[...buckets].sort((a,b)=>a.maxMonths-b.maxMonths);
        const fitBucket=sorted.find(b=>inp.loanTermMonths<=b.maxMonths)||sorted[sorted.length-1];
        const bucketRate=fitBucket?parseFloat(fitBucket.rate)||0:0;

        const contractData={
          'Xếp hạng khách hàng':inp.customerRank||'','Phân khúc khách hàng':inp.customerSegment||'',
          'Mục đích vay':inp.purpose||'','Loại sản phẩm':inp.productType||'','Loại dự án':inp.projectType||'',
          'LTV':inp.ltv||0,'DSR hiện tại':inp.currentDsr||0,'DSR sau vay':inp.estimatedDsr||0,
          'Thu nhập':inp.monthlyIncome||0,'Số tiền vay':inp.loanAmount||0,
        };
        let adjDelta=0;
        if(typeof RateRuleEngine!=='undefined'&&RateRuleEngine.evaluateAdjustments)
          adjDelta=(RateRuleEngine.evaluateAdjustments(pkg,contractData)||{}).totalDelta||0;

        const effectiveRate=bucketRate+adjDelta, cof=parseFloat(inp.costOfFund)||4.5, nim=+(effectiveRate-cof).toFixed(2);
        const rankScore=this._rankScore(inp.customerRank);
        const commercial=this._scoreCommercial(nim,parseFloat(inp.targetNIM)||3,bucketRate,cof);
        const risk=this._scoreRisk(inp,ctx,rankScore);
        const product=this._scoreProduct(inp,ctx,proj.name+' '+pkg.name);
        const blended=+(commercial.total*0.40+risk.total*0.35+product.total*0.25).toFixed(1);
        const cVec=[inp.ltv/100,inp.loanTermMonths/360,(parseFloat(inp.targetNIM)||3)/8,(inp.estimatedDsr||35)/100];
        const pVec=[ctx.maxLtv/100,ctx.maxTermMonths/360,nim/8,(ctx.maxDsr||50)/100];
        const cosineScore=+(this._cosine(cVec,pVec)*100).toFixed(1);
        const finalScore=+(blended*0.8+cosineScore*0.2).toFixed(1);

        eligible.push({
          projectId:proj.id,projectName:proj.name,pkgId:pkg.id,policyName:pkg.name,
          fitBucket,bucketRate,adjDelta,effectiveRate,nim,policyCtx:ctx,
          commercial,risk,product,cosineScore,score:{total:finalScore},
          feeRules:pkg.feeRules||[],fields,
        });
      });
    });

    eligible.sort((a,b)=>b.score.total-a.score.total);
    const top5=eligible.slice(0,5);
    if(top5.length>0){ const p=this._softmax(top5.map(c=>c.score.total)); top5.forEach((c,i)=>{c.confidence=p[i]; c.reasonText=this._reason(c,inp);}); }
    return { inp, top5, ineligible, allEligible:eligible.length, allCount:eligible.length+ineligible.length };
  },
};

// ── UI ─────────────────────────────────────────────────────────
const PolicyAdvisorUI = {
  _lastResult:null,
  render(){ const el=document.getElementById('pa-main'); if(el){ el.innerHTML=this._form(); this._bindAuto(); } },

  _form(){ return `
<div class="pa-layout">
<div class="pa-form-panel">
  <div class="pa-form-header">
    <div class="pa-form-icon">🏆</div>
    <div><div class="pa-form-title">Tư vấn Chính sách Tối ưu</div>
    <div class="pa-form-sub">Hybrid Rule Engine · Hard rules → 3-Group Scoring → Softmax</div></div>
  </div>

  <div class="pa-section-label">💰 Khoản vay</div>
  <div class="pa-grid-2">
    <div class="pa-field"><label>Số tiền vay (tr.đ)</label><input type="number" id="pr-amount" class="pa-input" placeholder="VD: 3000" oninput="PolicyAdvisorUI._autoCalc()"></div>
    <div class="pa-field"><label>Giá trị tài sản (tr.đ)</label><input type="number" id="pr-asset" class="pa-input" placeholder="VD: 5000" oninput="PolicyAdvisorUI._autoCalc()"></div>
    <div class="pa-field"><label>LTV (%)<span class="pa-auto-badge" id="pr-ltv-badge"></span></label><input type="number" id="pr-ltv" class="pa-input" value="70" min="10" max="100" oninput="PolicyAdvisorUI._autoCalc()"></div>
    <div class="pa-field"><label>Kỳ hạn vay (tháng)</label><input type="number" id="pr-term" class="pa-input" value="240" min="6" max="360" oninput="PolicyAdvisorUI._autoCalc()"></div>
  </div>

  <div class="pa-section-label">📊 Tài chính khách hàng</div>
  <div class="pa-grid-2">
    <div class="pa-field"><label>Thu nhập/tháng (tr.đ)</label><input type="number" id="pr-income" class="pa-input" placeholder="VD: 50" oninput="PolicyAdvisorUI._autoCalc()"></div>
    <div class="pa-field"><label>DSR hiện tại (%)</label><input type="number" id="pr-dsr-cur" class="pa-input" value="0" step="0.1"></div>
    <div class="pa-field pa-grid-2-full"><label>DSR sau vay (%) <span class="pa-auto-badge" id="pr-dsr-badge"></span></label><input type="number" id="pr-dsr-est" class="pa-input" placeholder="Auto hoặc nhập tay" step="0.1"></div>
  </div>

  <div class="pa-section-label">👤 Hồ sơ khách hàng</div>
  <div class="pa-grid-2">
    <div class="pa-field"><label>Loại dự án</label><select id="pr-project-type" class="pa-input">
      <option value="nha_o">Nhà ở / Chung cư</option><option value="lien_ke">Liền kề / Biệt thự</option>
      <option value="dat_nen">Đất nền</option><option value="thuong_mai">Thương mại / Officetel</option>
      <option value="nghi_duong">Nghỉ dưỡng</option></select></div>
    <div class="pa-field"><label>Loại sản phẩm</label><select id="pr-product-type" class="pa-input">
      <option value="nha_o">Nhà ở</option><option value="dat_nen">Đất nền</option>
      <option value="thuong_mai">Thương mại</option></select></div>
    <div class="pa-field"><label>Phân khúc KH</label><select id="pr-segment" class="pa-input">
      <option value="mass">Mass</option><option value="vip">VIP / Priority</option>
      <option value="sme">SME / Doanh nghiệp</option></select></div>
    <div class="pa-field"><label>Xếp hạng KH</label><input type="text" id="pr-customer-rank" class="pa-input" placeholder="A+, A, B+, B, C..."></div>
    <div class="pa-field"><label>Mục đích vay</label><select id="pr-purpose" class="pa-input">
      <option value="mua_nha">Mua nhà để ở</option><option value="dau_tu">Đầu tư / Kinh doanh</option>
      <option value="xay_sua">Xây dựng / Sửa chữa</option><option value="chuyen_nhuong">Chuyển nhượng</option></select></div>
    <div class="pa-field"><label>Ngày áp dụng</label><input type="date" id="pr-date" class="pa-input"></div>
  </div>

  <div class="pa-section-label">🏦 Mục tiêu ngân hàng</div>
  <div class="pa-grid-2">
    <div class="pa-field"><label>Chi phí vốn COF (%)</label><input type="number" id="pr-cof" class="pa-input" value="4.5" step="0.1"></div>
    <div class="pa-field"><label>NIM mục tiêu (%)</label><input type="number" id="pr-nim" class="pa-input" value="3.0" step="0.1"></div>
  </div>

  <button class="pa-btn-run" onclick="PolicyAdvisorUI.run()">🏆 Phân tích &amp; Xếp hạng Top-5</button>
</div>
<div class="pa-result-panel" id="pa-results">
  <div class="pa-result-placeholder"><div class="pa-result-ph-icon">🏆</div>
  <div class="pa-result-ph-text">Nhập tham số và nhấn <b>Phân tích</b><br>để xem Top-5 chính sách phù hợp</div></div>
</div>
</div>`; },

  _bindAuto(){
    const today=new Date().toISOString().split('T')[0];
    const dateEl=document.getElementById('pr-date'); if(dateEl&&!dateEl.value) dateEl.value=today;
  },

  _autoCalc(){
    const amt=parseFloat(document.getElementById('pr-amount')?.value)||0;
    const asset=parseFloat(document.getElementById('pr-asset')?.value)||0;
    const income=parseFloat(document.getElementById('pr-income')?.value)||0;
    const term=parseInt(document.getElementById('pr-term')?.value)||240;
    const cof=parseFloat(document.getElementById('pr-cof')?.value)||4.5;
    const refRate=cof+3;

    if(amt>0&&asset>0){
      const ltv=+(amt/asset*100).toFixed(1);
      const el=document.getElementById('pr-ltv'); if(el) el.value=ltv;
      const badge=document.getElementById('pr-ltv-badge'); if(badge) badge.textContent=`auto: ${ltv}%`;
    }
    if(amt>0&&income>0){
      const mp=PolicyRanker._payment(amt,term,refRate);
      const dsr=+(mp/income*100).toFixed(1);
      const el=document.getElementById('pr-dsr-est'); if(el&&!el._manual) el.value=dsr;
      const badge=document.getElementById('pr-dsr-badge'); if(badge) badge.textContent=`auto: ${dsr}%`;
    }
  },

  _readInput(){
    const g=id=>document.getElementById(id);
    return {
      loanAmount:     parseFloat(g('pr-amount')?.value)||0,
      assetValue:     parseFloat(g('pr-asset')?.value)||0,
      ltv:            parseFloat(g('pr-ltv')?.value)||70,
      loanTermMonths: parseInt(g('pr-term')?.value)||240,
      monthlyIncome:  parseFloat(g('pr-income')?.value)||0,
      currentDsr:     parseFloat(g('pr-dsr-cur')?.value)||0,
      estimatedDsr:   parseFloat(g('pr-dsr-est')?.value)||0,
      projectType:    g('pr-project-type')?.value||'nha_o',
      productType:    g('pr-product-type')?.value||'nha_o',
      customerSegment:g('pr-segment')?.value||'mass',
      customerRank:   g('pr-customer-rank')?.value||'',
      purpose:        g('pr-purpose')?.value||'mua_nha',
      applicationDate:g('pr-date')?.value||'',
      costOfFund:     parseFloat(g('pr-cof')?.value)||4.5,
      targetNIM:      parseFloat(g('pr-nim')?.value)||3.0,
    };
  },

  run(){
    const inp=this._readInput();
    const result=PolicyRanker.rank(inp);
    this._lastResult=result;
    this._renderResult(result);
  },

  _renderResult(res){
    const el=document.getElementById('pa-results'); if(!el) return;
    const {top5,ineligible,allEligible,allCount,inp}=res;

    if(!allCount){ el.innerHTML=`<div class="pa-alert pa-alert-warn">⚠️ Chưa có chính sách nào trong Rate Center.</div>`; return; }

    const medals=['🥇','🥈','🥉','4️⃣','5️⃣'];
    const cards=top5.map((p,i)=>{
      const nimColor=p.nim>=(parseFloat(inp?.targetNIM)||3)?'#10b981':'#f59e0b';
      const adjBadge=p.adjDelta!==0?`<span class="pa-adj-badge">${p.adjDelta>0?'+':''}${p.adjDelta}% ĐC</span>`:'';
      const feeHTLS=(p.feeRules.find(f=>f.phase==='inHTLS')?.fee)||'—';
      const confColor=p.confidence>=40?'#10b981':p.confidence>=20?'#f59e0b':'#94a3b8';

      return `<div class="pg-rank-card ${i===0?'pg-rank-card-gold':''}">
<div class="pg-rank-header">
  <span class="pg-rank-medal">${medals[i]}</span>
  <div class="pg-rank-names"><div class="pg-rank-policy">${p.policyName}</div><div class="pg-rank-project">${p.projectName}</div></div>
  <div style="display:flex;flex-direction:column;align-items:flex-end;gap:3px">
    <div class="pg-rank-score"><span class="pg-rank-score-val">${p.score.total}</span><span class="pg-rank-score-unit">/100</span></div>
    <span style="font-size:.68rem;padding:1px 7px;border-radius:99px;background:rgba(16,185,129,.12);color:${confColor}">Softmax <b>${p.confidence}%</b></span>
  </div>
</div>
<div class="pa-reason-text">💡 ${p.reasonText}</div>
<div class="pa-score-groups">
  ${[
    ['Commercial','#6366f1',p.commercial.total,[['NIM',p.commercial.nimScore,'#6366f1'],['Spread',p.commercial.spreadScore,'#818cf8']]],
    ['Risk Fit','#10b981',p.risk.total,[['LTV',p.risk.ltvScore,'#10b981'],['DSR',p.risk.dsrScore,'#34d399'],['Rank',p.risk.rankScore,'#6ee7b7']]],
    ['Product','#f59e0b',p.product.total,[['Kỳ hạn',p.product.termScore,'#f59e0b'],['Dự án',p.product.projectScore,'#fbbf24'],['Ân hạn',p.product.graceScore,'#fcd34d']]],
  ].map(([grp,col,tot,dims])=>`
  <div class="pa-score-group">
    <div class="pa-score-group-header"><span style="color:${col};font-weight:700;font-size:.72rem">${grp}</span><span style="color:${col};font-weight:800;font-size:.85rem">${tot}</span></div>
    ${dims.map(([l,s,c])=>`<div class="pg-score-bar-row"><span class="pg-score-bar-label">${l}</span><div class="pg-score-bar-track"><div class="pg-score-bar-fill" style="width:${s}%;background:${c}"></div></div><span class="pg-score-bar-pts" style="color:${c}">${s}</span></div>`).join('')}
  </div>`).join('')}
</div>
<div class="pg-rank-metrics">
  <div class="pg-rank-metric"><span class="pg-rank-metric-label">Bucket rate</span><span class="pg-rank-metric-val" style="color:#6366f1">${p.bucketRate}%${adjBadge}</span></div>
  <div class="pg-rank-metric"><span class="pg-rank-metric-label">Lãi hiệu lực</span><span class="pg-rank-metric-val" style="color:#6366f1">${p.effectiveRate}%</span></div>
  <div class="pg-rank-metric"><span class="pg-rank-metric-label">NIM ước tính</span><span class="pg-rank-metric-val" style="color:${nimColor}">${p.nim}%</span></div>
  <div class="pg-rank-metric"><span class="pg-rank-metric-label">LTV tối đa</span><span class="pg-rank-metric-val">${p.policyCtx.maxLtv}%</span></div>
  <div class="pg-rank-metric"><span class="pg-rank-metric-label">Kỳ hạn tối đa</span><span class="pg-rank-metric-val">${Math.round(p.policyCtx.maxTermMonths/12)}năm</span></div>
  <div class="pg-rank-metric"><span class="pg-rank-metric-label">Ân hạn</span><span class="pg-rank-metric-val">${p.policyCtx.graceBase}T</span></div>
  <div class="pg-rank-metric"><span class="pg-rank-metric-label">Phí HTLS</span><span class="pg-rank-metric-val">${feeHTLS}%</span></div>
  <div class="pg-rank-metric"><span class="pg-rank-metric-label">Cosine</span><span class="pg-rank-metric-val" style="color:#8b5cf6">${p.cosineScore}/100</span></div>
</div>
</div>`;}).join('');

    const inelHtml=ineligible.length?`
<div class="pa-ineligible-panel">
  <div class="pa-ineligible-toggle" onclick="this.parentElement.classList.toggle('pa-ineligible-open')">
    ⚠️ ${ineligible.length} chính sách không đủ điều kiện <span style="float:right">▼</span>
  </div>
  <div class="pa-ineligible-body">
    ${ineligible.map(p=>`<div class="pa-ineligible-item"><span class="pa-ineligible-name">${p.policyName} — ${p.projectName}</span><span class="pa-ineligible-reasons">${p.reasons.join(' · ')}</span></div>`).join('')}
  </div>
</div>`:'';

    el.innerHTML=`
<div style="padding:10px 18px;border-bottom:1px solid rgba(99,102,241,.1)">
  <div style="font-size:.82rem;color:var(--text-muted)">
    ✅ <b style="color:#10b981">${allEligible}</b> đủ điều kiện · ❌ <b style="color:#f59e0b">${ineligible.length}</b> bị loại · Tổng <b>${allCount}</b> chính sách
  </div>
</div>
<div style="padding:14px 18px;overflow-y:auto">${top5.length?cards:`<div class="pa-alert pa-alert-warn">Không có chính sách nào đủ điều kiện.</div>`}${inelHtml}</div>`;
  },
};

const PolicyGeneratorUI = PolicyAdvisorUI;
