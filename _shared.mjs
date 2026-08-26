import { getStore } from '@netlify/blobs';

export const DEFAULT_ZONES={
  photo:{x:710,y:145,w:280,h:280},
  headline:{x:78,y:260,w:650,h:310},
  body:{x:78,y:660,w:880,h:355},
  date:{x:78,y:1160,w:520,h:42},
  instagram:{x:78,y:1205,w:520,h:42}
};

export const DEFAULT_TEXT_STYLES={
  headline:{colorMode:'auto',color:'#111111',shadowEnabled:true,shadowColor:'#000000',shadowBlur:8,shadowOffsetY:2},
  body:{colorMode:'auto',color:'#111111',shadowEnabled:true,shadowColor:'#000000',shadowBlur:8,shadowOffsetY:2},
  date:{colorMode:'auto',color:'#111111',shadowEnabled:true,shadowColor:'#000000',shadowBlur:6,shadowOffsetY:2},
  instagram:{colorMode:'auto',color:'#111111',shadowEnabled:true,shadowColor:'#000000',shadowBlur:6,shadowOffsetY:2}
};
function colorOk(v){return /^#[0-9a-f]{6}$/i.test(String(v||''));}
export function normalizeTextStyles(v){
  const out=structuredClone(DEFAULT_TEXT_STYLES);
  for(const k of Object.keys(out)){
    const src=v?.[k]; if(!src) continue;
    out[k].colorMode=src.colorMode==='custom'?'custom':'auto';
    if(colorOk(src.color))out[k].color=src.color;
    out[k].shadowEnabled=src.shadowEnabled!==false;
    if(colorOk(src.shadowColor))out[k].shadowColor=src.shadowColor;
    const b=Number(src.shadowBlur); if(Number.isFinite(b))out[k].shadowBlur=Math.max(0,Math.min(30,b));
    const y=Number(src.shadowOffsetY); if(Number.isFinite(y))out[k].shadowOffsetY=Math.max(-20,Math.min(20,y));
  }
  return out;
}

export function store(){ return getStore({name:'piri-post-generator',consistency:'strong'}); }
export function auth(req){
  const u=req.headers.get('x-admin-user')||'';
  const p=req.headers.get('x-admin-pass')||'';
  const adminUser=process.env.ADMIN_USER || 'adminpr';
  const adminPass=process.env.ADMIN_PASS || 'prpr2569';
  return u===adminUser && p===adminPass;
}
export function unauthorized(){return new Response('Unauthorized',{status:401});}
export function bangkokDate(){return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Bangkok',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());}
export function thaiBangkokDate(){
  const parts=new Intl.DateTimeFormat('th-TH-u-ca-buddhist',{timeZone:'Asia/Bangkok',day:'numeric',month:'short',year:'numeric'}).formatToParts(new Date());
  const map=Object.fromEntries(parts.map(p=>[p.type,p.value]));
  return `${map.day} ${map.month} ${map.year}`.replace(/\s+/g,' ').trim();
}
export function normalizeZones(z){
  const out=structuredClone(DEFAULT_ZONES);
  for(const k of Object.keys(out)){
    if(!z?.[k]) continue;
    for(const f of ['x','y','w','h']){
      const n=Number(z[k][f]);
      if(Number.isFinite(n)) out[k][f]=Math.max(0,Math.round(n));
    }
  }
  return out;
}
export async function getConfig(){
  const s=store();
  const c=(await s.get('config',{type:'json',consistency:'strong'}))||{standard:null,special:null};
  if(c.standard){ c.standard.zones=normalizeZones(c.standard.zones); c.standard.textStyles=normalizeTextStyles(c.standard.textStyles); }
  if(c.special){ c.special.zones=normalizeZones(c.special.zones); c.special.textStyles=normalizeTextStyles(c.special.textStyles); }
  return c;
}
export async function setConfig(v){const s=store();await s.setJSON('config',v);}
