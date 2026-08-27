/* #ฝากบอกพิริ v9 — Mini Graphic Editor */
(()=>{
  const C=document.querySelector('#postCanvas'); if(!C) return;
  const CX=C.getContext('2d');
  const stickerCache=new Map();
  const builtins={
    recommended:[['emoji','✨'],['emoji','💖'],['emoji','⭐'],['emoji','📌'],['emoji','🔥'],['label','ด่วน!'],['label','น่ารักมาก'],['label','OMG']],
    cute:[['emoji','🎀'],['emoji','🩷'],['emoji','🌷'],['emoji','🐰'],['emoji','🐱'],['emoji','🍒'],['emoji','🧸'],['emoji','☁️'],['emoji','🫧'],['emoji','💫']],
    cool:[['emoji','🔥'],['emoji','⚡'],['emoji','💥'],['emoji','🖤'],['emoji','😎'],['emoji','💎'],['emoji','🪩'],['label','ICONIC'],['label','SLAY'],['label','เริ่ด!']],
    reaction:[['emoji','😂'],['emoji','😭'],['emoji','😱'],['emoji','🤨'],['emoji','👀'],['emoji','🫠'],['label','555+'],['label','เอ๊ะ!'],['label','จริงดิ'],['label','กรี๊ด'],['label','ใจเย็น'],['label','อุ๊ย!']],
    sparkle:[['emoji','✨'],['emoji','⭐'],['emoji','🌟'],['emoji','💫'],['emoji','🫧'],['emoji','🌈'],['emoji','☀️'],['emoji','🌙']],
    arrow:[['emoji','➡️'],['emoji','⬅️'],['emoji','⬆️'],['emoji','⬇️'],['emoji','↗️'],['emoji','↘️'],['emoji','👉'],['emoji','👈'],['label','→'],['label','!!!']],
    seasonal:[['emoji','🎄'],['emoji','🎅'],['emoji','🎁'],['emoji','❄️'],['emoji','☃️'],['emoji','🎃'],['emoji','👻'],['emoji','💘'],['emoji','🌹'],['emoji','🎉']]
  };
  let publicStickers=[];
  let state=null, selected=null, drag=null, undoStack=[],redoStack=[],previewClean=false;
  let lastTheme='';
  const deep=v=>JSON.parse(JSON.stringify(v));
  const themeBase=()=>{
    const z=(typeof zones==='function'?zones():DEFAULT_ZONES);
    const mk=(key,extra={})=>({id:key,type:'text',key,x:z[key].x,y:z[key].y,w:z[key].w,h:z[key].h,rotation:0,opacity:1,fontFamily:'Tahoma',fontSize:key==='headline'?82:key==='body'?40:29,color:'',align:'left',bold:key==='headline',italic:false,lineHeight:key==='headline'?1.12:key==='body'?1.5:1.15,outline:false,outlineColor:'#000000',outlineWidth:4,shadow:true,shadowColor:'#000000',glow:false,glowColor:'#00ffff',background:false,backgroundColor:'#ffffff',...extra});
    return {texts:{headline:mk('headline'),body:mk('body'),instagram:mk('instagram',{fontSize:29,w:z.instagram.w})},customTexts:[],stickers:[]};
  };
  function ensureState(){
    const sig=(activeTheme?.name||'Standard')+'|'+JSON.stringify(activeTheme?.zones||{});
    if(!state){state=themeBase();lastTheme=sig;syncAllFromTheme();}
    else if(lastTheme!==sig && !state.dirty){state=themeBase();lastTheme=sig;syncAllFromTheme();}
    return state;
  }
  function syncAllFromTheme(){
    if(!state)return; ['headline','body','instagram'].forEach(k=>{
      const s=typeof textStyleFor==='function'?textStyleFor(k):{};
      if(s.colorMode==='custom')state.texts[k].color=s.color;
      state.texts[k].shadow=s.shadowEnabled!==false;state.texts[k].shadowColor=s.shadowColor||'#000';
    });
  }
  function currentTextObj(){ensureState(); if(selected?.kind==='custom')return state.customTexts.find(x=>x.id===selected.id);const key=selected?.kind==='text'?selected.key:(document.querySelector('.target-chip.active')?.dataset.textTarget||'headline');return state.texts[key];}
  function textValue(o){if(o.key==='headline')return document.querySelector('#headline').value;if(o.key==='body')return document.querySelector('#bodyText').value;if(o.key==='instagram')return normalizeInstagram(document.querySelector('#instagram').value);return o.text||''}
  function snapshot(){ensureState();undoStack.push(JSON.stringify(state));if(undoStack.length>40)undoStack.shift();redoStack=[]}
  function restore(raw){state=JSON.parse(raw);render();syncControls();updateSelectionBox()}
  function undo(){if(!undoStack.length)return;redoStack.push(JSON.stringify(state));restore(undoStack.pop())}
  function redo(){if(!redoStack.length)return;undoStack.push(JSON.stringify(state));restore(redoStack.pop())}
  function fontString(o){return `${o.italic?'italic ':''}${o.bold?'900':'500'} ${o.fontSize}px "${o.fontFamily}", Tahoma, sans-serif`}
  function getTextLines(c,o,text){
    c.font=fontString(o);const explicit=String(text||'').split('\n'),lines=[];
    for(const para of explicit){if(!para){lines.push('');continue}let line='';for(const ch of Array.from(para)){const t=line+ch;if(c.measureText(t).width>o.w&&line){lines.push(line);line=ch}else line=t}if(line||!lines.length)lines.push(line)}return lines;
  }
  function effectiveColor(o){if(o.color)return o.color;try{return analyzeRegion(CX,{x:o.x,y:o.y,w:o.w,h:o.h}).color}catch{return'#111'}}
  function drawTextObject(c,o,text){if(!text)return;const lines=getTextLines(c,o,text),lh=o.fontSize*o.lineHeight,totalH=lines.length*lh;const col=effectiveColor(o);c.save();c.translate(o.x+o.w/2,o.y+totalH/2);c.rotate((o.rotation||0)*Math.PI/180);c.translate(-(o.x+o.w/2),-(o.y+totalH/2));c.globalAlpha=o.opacity??1;c.font=fontString(o);c.textBaseline='top';c.textAlign=o.align||'left';let ax=o.x;if(o.align==='center')ax=o.x+o.w/2;else if(o.align==='right')ax=o.x+o.w;
    if(o.background){c.save();c.fillStyle=hexAlpha(o.backgroundColor||'#fff',.72);roundedRectOn(c,o.x-14,o.y-10,o.w+28,totalH+20,18);c.fill();c.restore()}
    lines.forEach((line,i)=>{const y=o.y+i*lh;if(o.glow){c.shadowColor=o.glowColor||'#00ffff';c.shadowBlur=Math.max(12,o.fontSize*.35);c.shadowOffsetX=0;c.shadowOffsetY=0}else if(o.shadow){c.shadowColor=o.shadowColor||'#000';c.shadowBlur=8;c.shadowOffsetY=3;c.shadowOffsetX=0}else{c.shadowColor='transparent';c.shadowBlur=0}
      if(o.outline){c.lineJoin='round';c.strokeStyle=o.outlineColor||'#000';c.lineWidth=o.outlineWidth||4;c.strokeText(line,ax,y)}c.fillStyle=col;c.fillText(line,ax,y);c.shadowColor='transparent';
      if(o.underline){const w=c.measureText(line).width,ux=o.align==='center'?ax-w/2:o.align==='right'?ax-w:ax;c.fillRect(ux,y+o.fontSize*1.02,w,Math.max(2,o.fontSize*.04))}
    });c.restore();return {lines,totalH};
  }
  function hexAlpha(hex,a){const h=String(hex||'#fff').replace('#','');const v=h.length===3?h.split('').map(x=>x+x).join(''):h;return `rgba(${parseInt(v.slice(0,2),16)},${parseInt(v.slice(2,4),16)},${parseInt(v.slice(4,6),16)},${a})`}
  function imageForSticker(s){
  if(stickerCache.has(s.src))return stickerCache.get(s.src);
  const i=new Image();
  i.onload=()=>{
    if(i.naturalWidth&&i.naturalHeight&&!s.aspect){
      s.aspect=i.naturalWidth/i.naturalHeight
    }
    render()
  };
  stickerCache.set(s.src,i);

  if(/^https?:\/\//i.test(s.src)){
    fetch(s.src,{mode:'cors',cache:'no-store'})
      .then(r=>{if(!r.ok)throw new Error('Sticker load failed '+r.status);return r.blob()})
      .then(b=>{
        const u=URL.createObjectURL(b);
        i.onload=()=>{
          if(i.naturalWidth&&i.naturalHeight&&!s.aspect){
            s.aspect=i.naturalWidth/i.naturalHeight
          }
          render();
          setTimeout(()=>URL.revokeObjectURL(u),1000)
        };
        i.src=u
      })
      .catch(()=>{i.crossOrigin='anonymous';i.src=s.src});
  }else{
    i.src=s.src
  }
  return i
}
  function drawSticker(c,s){c.save();c.globalAlpha=s.opacity??1;c.translate(s.x,s.y);c.rotate((s.rotation||0)*Math.PI/180);c.scale(s.flipX?-1:1,1);const size=s.size||120;if(s.kind==='emoji'){c.font=`${size}px Apple Color Emoji, Segoe UI Emoji, sans-serif`;c.textAlign='center';c.textBaseline='middle';c.fillText(s.value,0,0)}else if(s.kind==='label'){c.font=`900 ${Math.max(22,size*.34)}px Impact, Tahoma, sans-serif`;const m=c.measureText(s.value),w=Math.max(size,m.width+26),h=Math.max(48,size*.48);c.fillStyle='rgba(255,255,255,.92)';c.strokeStyle='#111';c.lineWidth=Math.max(3,size*.025);roundedRectOn(c,-w/2,-h/2,w,h,18);c.fill();c.stroke();c.fillStyle='#111';c.textAlign='center';c.textBaseline='middle';c.fillText(s.value,0,2)}else if(s.kind==='image'){const im=imageForSticker(s),ratio=s.aspect||((im?.naturalWidth&&im?.naturalHeight)?im.naturalWidth/im.naturalHeight:1),h=size/Math.max(.15,ratio);if(im?.complete&&im.naturalWidth)c.drawImage(im,-size/2,-h/2,size,h)}c.restore()}
  function originalDrawBase(){
    CX.clearRect(0,0,W,H);drawThemeOn(CX);const z=zones();const photo=photoImages[0]||null;if(photo){CX.save();roundedRectOn(CX,z.photo.x,z.photo.y,z.photo.w,z.photo.h,34);CX.clip();drawCoverOn(CX,photo,z.photo.x,z.photo.y,z.photo.w,z.photo.h);CX.restore()}drawBadge(CX);
  }
  function renderV9(){ensureState();originalDrawBase();
    const order=['headline','body','instagram']; let overflow=false;
    for(const k of order){const o=state.texts[k],t=textValue(o);if(!t)continue;const out=drawTextObject(CX,o,t);if(out){const maxH=o.h||H-o.y; if(out.totalH>maxH+6)overflow=true}}
    const z=zones(),ds=resolveTextStyle(CX,z.date,'date');CX.save();CX.fillStyle=ds.color;CX.font='700 29px Tahoma, sans-serif';CX.textBaseline='top';applyShadow(CX,ds);CX.fillText('วันที่ฝาก '+thaiDepositDate(),z.date.x,z.date.y);CX.restore();
    state.customTexts.forEach(o=>drawTextObject(CX,o,o.text));state.stickers.forEach(s=>drawSticker(CX,s));
    textOverflow=overflow;const warn=document.querySelector('#textWarning');if(warn){warn.classList.toggle('hidden',!overflow);warn.textContent='ข้อความล้นพื้นที่ แนะนำให้ขึ้นบรรทัดเอง ลดขนาด หรือย้ายตำแหน่งก่อนส่ง'}const sb=document.querySelector('#submitBtn');if(sb)sb.disabled=overflow;
    renderGallery();requestAnimationFrame(updateSelectionBox);
  }
  render=renderV9;

  // Selection overlay + snap guides
  const previewCard=document.querySelector('.preview-card');
  const sel=document.createElement('div');sel.className='canvas-selection hidden';previewCard.appendChild(sel);
  const gv=document.createElement('div');gv.className='snap-guide-v';previewCard.appendChild(gv);const gh=document.createElement('div');gh.className='snap-guide-h';previewCard.appendChild(gh);
  function canvasRectToCss(b){const cr=C.getBoundingClientRect(),pr=previewCard.getBoundingClientRect(),sx=cr.width/W,sy=cr.height/H;return{left:cr.left-pr.left+b.x*sx,top:cr.top-pr.top+b.y*sy,width:b.w*sx,height:b.h*sy}}
  function selectedObject(){ensureState();if(!selected)return null;if(selected.kind==='text')return state.texts[selected.key];if(selected.kind==='custom')return state.customTexts.find(x=>x.id===selected.id);if(selected.kind==='sticker')return state.stickers.find(x=>x.id===selected.id);return null}
  function objectBounds(o){if(!o)return null;if(o.type==='text'){const t=textValue(o),lines=getTextLines(CX,o,t),h=Math.max(o.fontSize,lines.length*o.fontSize*o.lineHeight);return{x:o.x,y:o.y,w:o.w,h}}const w=o.size||120,h=o.kind==='image'?w/Math.max(.15,o.aspect||1):w;return{x:o.x-w/2,y:o.y-h/2,w,h}}
  function updateSelectionBox(){if(previewClean||!selected){sel.classList.add('hidden');return}const o=selectedObject(),b=objectBounds(o);if(!b){sel.classList.add('hidden');return}const q=canvasRectToCss(b);sel.classList.remove('hidden');Object.assign(sel.style,{left:q.left+'px',top:q.top+'px',width:q.width+'px',height:q.height+'px'});}
  function eventPoint(e){const r=C.getBoundingClientRect();return{x:(e.clientX-r.left)*W/r.width,y:(e.clientY-r.top)*H/r.height}}
  function hitTest(p){ensureState();for(let i=state.stickers.length-1;i>=0;i--){const s=state.stickers[i],b=objectBounds(s);if(p.x>=b.x&&p.x<=b.x+b.w&&p.y>=b.y&&p.y<=b.y+b.h)return{kind:'sticker',id:s.id}}for(let i=state.customTexts.length-1;i>=0;i--){const o=state.customTexts[i],b=objectBounds(o);if(p.x>=b.x&&p.x<=b.x+b.w&&p.y>=b.y&&p.y<=b.y+b.h)return{kind:'custom',id:o.id}}for(const k of ['instagram','body','headline']){const o=state.texts[k],b=objectBounds(o);if(textValue(o)&&p.x>=b.x&&p.x<=b.x+b.w&&p.y>=b.y&&p.y<=b.y+b.h)return{kind:'text',key:k}}return null}
  C.addEventListener('pointerdown',e=>{if(previewClean)return;e.preventDefault();const p=eventPoint(e),h=hitTest(p);if(!h){selected=null;updateSelectionBox();return}selected=h;snapshot();syncControls();const o=selectedObject();drag={dx:p.x-o.x,dy:p.y-o.y};try{C.setPointerCapture(e.pointerId)}catch{}C.classList.add('dragging');updateSelectionBox()});
  C.addEventListener('pointermove',e=>{if(!drag||!selected)return;e.preventDefault();const p=eventPoint(e),o=selectedObject();if(!o){drag=null;return}let nx=p.x-drag.dx,ny=p.y-drag.dy;if(o.type!=='text'){const b=objectBounds(o),halfW=b.w/2,halfH=b.h/2;nx=Math.max(halfW,Math.min(W-halfW,nx));ny=Math.max(halfH,Math.min(H-halfH,ny));if(Math.abs(nx-W/2)<18){nx=W/2;gv.style.display='block'}else gv.style.display='none';if(Math.abs(ny-H/2)<18){ny=H/2;gh.style.display='block'}else gh.style.display='none';o.x=nx;o.y=ny}else{nx=Math.max(-o.w*.6,Math.min(W-20,nx));ny=Math.max(0,Math.min(H-20,ny));if(Math.abs((nx+o.w/2)-W/2)<18){nx=W/2-o.w/2;gv.style.display='block'}else gv.style.display='none';o.x=nx;o.y=ny}state.dirty=true;render()});
  const endDrag=()=>{drag=null;C.classList.remove('dragging');gv.style.display=gh.style.display='none';updateSelectionBox()};C.addEventListener('pointerup',endDrag);C.addEventListener('pointercancel',endDrag);
  C.addEventListener('dblclick',()=>{const o=selectedObject();if(!o)return;if(selected.kind==='custom'){const v=prompt('แก้ข้อความ',o.text);if(v!==null){snapshot();o.text=v;state.dirty=true;render()}}else if(selected.kind==='text'){const id=selected.key==='body'?'bodyText':selected.key;document.querySelector('#'+id)?.focus()}});

  const presets={
    normal:{fontFamily:'Tahoma',color:'',bold:false,italic:false,outline:false,shadow:true,glow:false,background:false},
    headline:{fontFamily:'Impact',color:'#ffffff',bold:true,outline:true,outlineColor:'#111111',outlineWidth:5,shadow:true,glow:false,background:false},
    cute:{fontFamily:'Comic Sans MS',color:'#ff5fa2',bold:true,outline:true,outlineColor:'#ffffff',outlineWidth:7,shadow:true,shadowColor:'#ffb4d2',glow:false,background:false},
    cool:{fontFamily:'Impact',color:'#111111',bold:true,italic:true,outline:true,outlineColor:'#ffffff',outlineWidth:4,shadow:true,shadowColor:'#ff3b30',glow:false,background:false},
    neon:{fontFamily:'Impact',color:'#ffffff',bold:true,outline:false,shadow:false,glow:true,glowColor:'#00eaff',background:false},
    outline:{fontFamily:'Tahoma',color:'#ffffff',bold:true,outline:true,outlineColor:'#000000',outlineWidth:6,shadow:false,glow:false,background:false},
    minimal:{fontFamily:'Georgia',color:'#111111',bold:false,italic:false,outline:false,shadow:false,glow:false,background:true,backgroundColor:'#ffffff'}
  };
  function setSelectedTextTarget(k){selected={kind:'text',key:k};document.querySelectorAll('.target-chip').forEach(x=>x.classList.toggle('active',x.dataset.textTarget===k));syncControls();updateSelectionBox()}
  document.querySelectorAll('.target-chip').forEach(b=>b.onclick=()=>setSelectedTextTarget(b.dataset.textTarget));
  document.querySelectorAll('.preset-card').forEach(b=>b.onclick=()=>{const o=currentTextObj();if(!o)return;snapshot();Object.assign(o,presets[b.dataset.preset]);state.dirty=true;syncControls();render()});
  function syncControls(){const o=currentTextObj();if(!o||o.type!=='text')return;const set=(id,v)=>{const e=document.querySelector(id);if(e)e.value=v};set('#userFont',o.fontFamily);set('#userFontSize',o.fontSize);document.querySelector('#fontSizeValue').textContent=Math.round(o.fontSize);set('#userTextColor',o.color||effectiveColor(o));set('#userTextOpacity',Math.round((o.opacity??1)*100));set('#userLineHeight',Math.round((o.lineHeight||1.2)*100));set('#userRotation',o.rotation||0);document.querySelector('#boldBtn').classList.toggle('active',!!o.bold);document.querySelector('#italicBtn').classList.toggle('active',!!o.italic);document.querySelectorAll('.align-btn').forEach(x=>x.classList.toggle('active',x.dataset.align===(o.align||'left')));document.querySelector('#outlineToggle').checked=!!o.outline;document.querySelector('#shadowToggleUser').checked=!!o.shadow;document.querySelector('#glowToggle').checked=!!o.glow;document.querySelector('#textBgToggle').checked=!!o.background;set('#outlineColor',o.outlineColor||'#000000');set('#effectColor',o.glow?o.glowColor:(o.shadowColor||'#000000'));set('#textBgColor',o.backgroundColor||'#ffffff');set('#outlineWidth',o.outlineWidth||4);
    const sc=document.querySelector('#stickerControls');sc.classList.toggle('hidden',selected?.kind!=='sticker');if(selected?.kind==='sticker'){const s=selectedObject();set('#stickerSize',s.size||120);set('#stickerRotation',s.rotation||0);set('#stickerOpacity',Math.round((s.opacity??1)*100))}
  }
  const bind=(id,fn,event='input')=>{const e=document.querySelector(id);if(e)e.addEventListener(event,()=>{const o=currentTextObj();if(!o)return;snapshot();fn(o,e);state.dirty=true;syncControls();render()})};
  bind('#userFont',(o,e)=>o.fontFamily=e.value,'change');bind('#userFontSize',(o,e)=>o.fontSize=+e.value);bind('#userTextColor',(o,e)=>o.color=e.value);bind('#userTextOpacity',(o,e)=>o.opacity=+e.value/100);bind('#userLineHeight',(o,e)=>o.lineHeight=+e.value/100);bind('#userRotation',(o,e)=>o.rotation=+e.value);bind('#outlineColor',(o,e)=>o.outlineColor=e.value);bind('#textBgColor',(o,e)=>o.backgroundColor=e.value);bind('#outlineWidth',(o,e)=>o.outlineWidth=+e.value);
  document.querySelector('#effectColor').addEventListener('input',e=>{const o=currentTextObj();if(!o)return;snapshot();o.shadowColor=e.target.value;o.glowColor=e.target.value;state.dirty=true;render()});
  [['#boldBtn','bold'],['#italicBtn','italic']].forEach(([id,k])=>document.querySelector(id).onclick=()=>{const o=currentTextObj();snapshot();o[k]=!o[k];state.dirty=true;syncControls();render()});
  document.querySelectorAll('.align-btn').forEach(b=>b.onclick=()=>{const o=currentTextObj();snapshot();o.align=b.dataset.align;state.dirty=true;syncControls();render()});
  [['#outlineToggle','outline'],['#shadowToggleUser','shadow'],['#glowToggle','glow'],['#textBgToggle','background']].forEach(([id,k])=>document.querySelector(id).onchange=e=>{const o=currentTextObj();snapshot();o[k]=e.target.checked;state.dirty=true;syncControls();render()});

  document.querySelectorAll('[data-editor-panel]').forEach(b=>b.onclick=()=>{document.querySelectorAll('.editor-tool').forEach(x=>x.classList.remove('active'));b.classList.add('active');const p=b.dataset.editorPanel;document.querySelector('#textEditorPanel').classList.toggle('hidden',p!=='text');document.querySelector('#stickerEditorPanel').classList.toggle('hidden',p!=='stickers')});
  document.querySelector('#undoBtn').onclick=undo;document.querySelector('#redoBtn').onclick=redo;
  document.querySelector('#resetLayoutBtn').onclick=()=>{if(!confirm('รีเซ็ตตำแหน่งและสไตล์ข้อความ/สติ๊กเกอร์ของหน้านี้?'))return;snapshot();state=themeBase();syncAllFromTheme();selected={kind:'text',key:'headline'};render();syncControls()};
  document.querySelector('#previewModeBtn').onclick=()=>{previewClean=!previewClean;previewCard.classList.toggle('preview-clean',previewClean);document.querySelector('#previewModeBtn').classList.toggle('active',previewClean);document.querySelector('#previewModeBtn span').textContent=previewClean?'กลับไปแก้':'ดูภาพจริง';updateSelectionBox()};
  document.querySelector('#addTextBtn').onclick=()=>{const t=prompt('พิมพ์ข้อความที่ต้องการเพิ่ม');if(!t)return;snapshot();const o={id:'ct-'+crypto.randomUUID(),type:'text',text:t,x:120,y:520,w:840,h:180,rotation:0,opacity:1,fontFamily:'Tahoma',fontSize:54,color:'#111111',align:'center',bold:true,italic:false,lineHeight:1.15,outline:false,outlineColor:'#000',outlineWidth:4,shadow:true,shadowColor:'#000',glow:false,glowColor:'#00ffff',background:false,backgroundColor:'#fff'};state.customTexts.push(o);selected={kind:'custom',id:o.id};state.dirty=true;render();syncControls()};

  function stickerData(cat){if(cat==='community')return publicStickers.map(x=>['image',x.imageUrl,x.name,x.id]);if(cat==='admin')return publicStickers.filter(x=>x.origin==='admin').map(x=>['image',x.imageUrl,x.name,x.id]);return builtins[cat]||[]}
  function renderStickerGrid(cat='recommended'){const box=document.querySelector('#stickerGrid');box.innerHTML='';const data=stickerData(cat);if(!data.length){box.innerHTML='<div class="empty" style="grid-column:1/-1">ยังไม่มีสติ๊กเกอร์ในหมวดนี้</div>';return}data.forEach(item=>{const [kind,val,label]=item,b=document.createElement('button');b.className='sticker-item';if(kind==='image'){const im=document.createElement('img');im.src=val;im.alt=label||'sticker';b.appendChild(im)}else if(kind==='label'){b.innerHTML=`<span class="sticker-label">${val}</span>`}else b.textContent=val;b.onclick=()=>addSticker(kind,val,label);box.appendChild(b)})}
  function addSticker(kind,val,label,aspect){snapshot();const s={id:'st-'+crypto.randomUUID(),type:'sticker',kind,x:W/2,y:H/2,size:kind==='label'?170:kind==='image'?220:120,rotation:0,opacity:1,flipX:false,value:kind==='image'?'':val,src:kind==='image'?val:'',label:label||val,aspect:aspect||null};state.stickers.push(s);selected={kind:'sticker',id:s.id};state.dirty=true;render();syncControls()}
  document.querySelectorAll('.sticker-tab').forEach(b=>b.onclick=()=>{document.querySelectorAll('.sticker-tab').forEach(x=>x.classList.remove('active'));b.classList.add('active');renderStickerGrid(b.dataset.stickerCat)});
  document.querySelector('#userStickerUpload').onchange=async e=>{const f=e.target.files[0];e.target.value='';if(!f)return;const status=document.querySelector('#communityStickerStatus');if(f.size>2*1024*1024){if(status)status.textContent='ไฟล์ใหญ่เกิน 2 MB กรุณาลดขนาดก่อน';return}if(status)status.textContent='กำลังอัปโหลดเข้าคลังรวม…';try{const fd=new FormData();fd.append('image',f);fd.append('name',f.name.replace(/\.[^.]+$/,''));const r=await fetch('https://fakbok-api.onrender.com/sticker-library',{method:'POST',body:fd});if(!r.ok)throw new Error(await r.text());const out=await r.json();await loadPublicStickers();const item=publicStickers.find(x=>x.id===out.id)||out.item;addSticker('image',item.imageUrl||out.imageUrl,item.name||f.name);document.querySelectorAll('.sticker-tab').forEach(x=>x.classList.toggle('active',x.dataset.stickerCat==='community'));renderStickerGrid('community');if(status)status.textContent=out.duplicate?'มีรูปนี้ในคลังอยู่แล้ว — เพิ่มลงภาพให้แล้ว':'บันทึกเข้าคลังรวมแล้ว ✓ คนอื่นก็ใช้รูปนี้ได้';}catch(err){console.error(err);if(status)status.textContent='อัปโหลดไม่สำเร็จ ลองใหม่อีกครั้ง';}};
  const stickerBind=(id,key,scale=1)=>document.querySelector(id).oninput=e=>{if(selected?.kind!=='sticker')return;const s=selectedObject();snapshot();s[key]=+e.target.value*scale;state.dirty=true;render();syncControls()};stickerBind('#stickerSize','size');stickerBind('#stickerRotation','rotation');stickerBind('#stickerOpacity','opacity',.01);
  document.querySelector('#flipStickerBtn').onclick=()=>{if(selected?.kind!=='sticker')return;snapshot();const s=selectedObject();s.flipX=!s.flipX;render()};document.querySelector('#duplicateStickerBtn').onclick=()=>{if(selected?.kind!=='sticker')return;snapshot();const s=deep(selectedObject());s.id='st-'+crypto.randomUUID();s.x+=35;s.y+=35;state.stickers.push(s);selected={kind:'sticker',id:s.id};render();syncControls()};document.querySelector('#deleteStickerBtn').onclick=()=>{if(selected?.kind!=='sticker')return;snapshot();state.stickers=state.stickers.filter(x=>x.id!==selected.id);selected=null;render();syncControls()};

  async function loadPublicStickers(){try{const r=await fetch('https://fakbok-api.onrender.com/sticker-library',{cache:'no-store'});if(!r.ok)return;publicStickers=await r.json();{const cat=document.querySelector('.sticker-tab.active')?.dataset.stickerCat;if(cat==='admin'||cat==='community')renderStickerGrid(cat)}}catch{}}
  async function loadAdminStickerList(){if(!adminAuth)return;const box=document.querySelector('#adminStickerList');if(!box)return;box.innerHTML='<div class="empty" style="grid-column:1/-1">กำลังโหลด...</div>';try{const r=await fetch('https://fakbok-api.onrender.com/sticker-library?admin=1',{headers:authHeaders(),cache:'no-store'});const items=await r.json();box.innerHTML='';if(!items.length){box.innerHTML='<div class="empty" style="grid-column:1/-1">ยังไม่มีสติ๊กเกอร์ของเพจ</div>';return}items.forEach(x=>{const d=document.createElement('div');d.className='admin-sticker-card';d.innerHTML=`<img src="${x.imageUrl}" alt=""><small>${escapeHtml(x.name||'Sticker')}</small><small>${escapeHtml(x.category||'')}</small>`;const del=document.createElement('button');del.textContent='ลบ';del.onclick=async()=>{if(!confirm('ลบสติ๊กเกอร์นี้?'))return;await fetch('https://fakbok-api.onrender.com/sticker-library?id='+encodeURIComponent(x.id),{method:'DELETE',headers:authHeaders()});await loadAdminStickerList();await loadPublicStickers()};d.appendChild(del);box.appendChild(d)})}catch{box.innerHTML='<div class="empty" style="grid-column:1/-1">โหลดไม่สำเร็จ</div>'}}
  document.querySelector('#uploadAdminStickerBtn')?.addEventListener('click',async()=>{const f=document.querySelector('#adminStickerFile').files[0];if(!f)return alert('เลือกไฟล์สติ๊กเกอร์ก่อน');const fd=new FormData();fd.append('image',f);fd.append('name',document.querySelector('#adminStickerName').value||f.name);fd.append('category',document.querySelector('#adminStickerCategory').value);const r=await fetch('https://fakbok-api.onrender.com/sticker-library',{method:'POST',headers:authHeaders(),body:fd});if(!r.ok)return alert('อัปโหลดไม่สำเร็จ');document.querySelector('#adminStickerFile').value='';document.querySelector('#adminStickerName').value='';await loadAdminStickerList();await loadPublicStickers()});
  document.querySelector('#refreshStickerAdminBtn')?.addEventListener('click',loadAdminStickerList);document.querySelector('#adminOpen')?.addEventListener('click',()=>setTimeout(loadAdminStickerList,300));document.querySelector('#adminLoginBtn')?.addEventListener('click',()=>setTimeout(loadAdminStickerList,700));

  // Reset editor after successful submit (original handler clears fields)
  const mo=new MutationObserver(()=>{const t=document.querySelector('#submitStatus')?.textContent||'';if(t.includes('ส่งเรียบร้อย')){state=themeBase();syncAllFromTheme();selected=null;undoStack=[];redoStack=[];render()}});mo.observe(document.querySelector('#submitStatus'),{childList:true,subtree:true,characterData:true});
  renderStickerGrid();loadPublicStickers();ensureState();selected={kind:'text',key:'headline'};syncControls();render();
})();
