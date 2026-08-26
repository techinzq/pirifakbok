import { auth, unauthorized, store, bangkokDate, thaiBangkokDate } from './_shared.mjs';

function id(){return `${Date.now()}-${crypto.randomUUID()}`}
function shareKey(){return crypto.randomUUID().replaceAll('-','') + crypto.randomUUID().replaceAll('-','')}
function cleanText(v,max=180){return String(v||'').trim().slice(0,max)}
function normalizeInstagram(v){
  let s=String(v||'').trim(); if(!s)return '';
  try{ if(/^https?:\/\//i.test(s)){const u=new URL(s); if(/(^|\.)instagram\.com$/i.test(u.hostname.replace(/^www\./,''))) s=u.pathname.split('/').filter(Boolean)[0]||'';} }catch{}
  s=s.replace(/^@+/,'').replace(/\s+/g,'').replace(/[^A-Za-z0-9._]/g,'').slice(0,30);
  return s?`@${s}`:'';
}
async function nextJobNo(){
  const s=store(); const day=bangkokDate(); const key=`counters/jobs/${day}`;
  let n=Number((await s.get(key,{type:'text',consistency:'strong'}))||0)+1;
  await s.set(key,String(n));
  const [,mm,dd]=day.split('-');
  return `#PIRI-${mm}${dd}-${String(n).padStart(3,'0')}`;
}

async function pushDiscord(meta, req){
  const url = process.env.DISCORD_WEBHOOK_URL;
  if(!url) return {ok:false, skipped:true, reason:'Discord webhook missing'};
  const origin = new URL(req.url).origin;
  const imageUrl = `${origin}/.netlify/functions/submission-image?id=${encodeURIComponent(meta.id)}&page=1&share=${encodeURIComponent(meta.lineShareKey)}`;
  const content = [
    `🔴 มี #ฝากบอกพิริ ใหม่ · ${meta.jobNo}`,
    meta.headline ? `หัวข้อ: ${cleanText(meta.headline,120)}` : '',
    meta.body ? `รายละเอียด: ${cleanText(meta.body,240)}` : '',
    meta.instagram ? `IG: ${meta.instagram}` : '',
    `วันที่ฝาก: ${meta.depositDateText}`,
    `📷 ${meta.photoCount||0} รูป · ${meta.pageCount||1} หน้า`
  ].filter(Boolean).join('\n');
  try{
    const r = await fetch(url,{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        content,
        embeds:[{image:{url:imageUrl}}]
      })
    });
    const body = await r.text();
    if(!r.ok){
      console.error('Discord webhook failed',r.status,body);
      return {ok:false,status:r.status,reason:body.slice(0,500)};
    }
    return {ok:true};
  }catch(e){
    return {ok:false,reason:String(e?.message||e)};
  }
}

export default async (req)=>{
  const s=store();
  if(req.method==='POST'){
    const fd=await req.formData();
    const idem=cleanText(fd.get('idempotencyKey'),100);
    if(idem){
      const existingId=await s.get(`submissions/idempotency/${idem}`,{type:'text',consistency:'strong'});
      if(existingId){const m=await s.get(`submissions/meta/${existingId}`,{type:'json',consistency:'strong'});if(m)return Response.json({ok:true,id:m.id,jobNo:m.jobNo,pageCount:m.pageCount,lineNotified:!!m.lineNotified,duplicate:true})}
    }
    const file=fd.get('image'); if(!file||typeof file==='string')return new Response('Missing image',{status:400});
    const sid=id(),jobNo=await nextJobNo();
    const imageKey=`submissions/images/${sid}-1.png`; await s.set(imageKey,await file.arrayBuffer());
    const file2=fd.get('image2');let imageKey2=null,pageCount=1;
    if(file2&&typeof file2!=='string'){imageKey2=`submissions/images/${sid}-2.png`;await s.set(imageKey2,await file2.arrayBuffer());pageCount=2}
    const meta={
      id:sid,jobNo,imageKey,imageKey2,pageCount,lineShareKey:shareKey(),
      photoCount:Number(fd.get('photoCount')||0),headline:String(fd.get('headline')||''),body:String(fd.get('body')||''),
      depositDate:bangkokDate(),depositDateText:thaiBangkokDate(),instagram:normalizeInstagram(fd.get('instagram')),
      themeName:String(fd.get('themeName')||''),status:'pending',createdAt:new Date().toISOString(),postedAt:null
    };
    await s.setJSON(`submissions/meta/${sid}`,meta); if(idem)await s.set(`submissions/idempotency/${idem}`,sid);
    const line=await pushDiscord(meta,req); meta.lineNotified=!!line.ok;meta.lineNotifiedAt=line.ok?new Date().toISOString():null;meta.lineError=line.ok?null:(line.reason||`HTTP ${line.status||''}`);await s.setJSON(`submissions/meta/${sid}`,meta);
    return Response.json({ok:true,id:sid,jobNo,pageCount,lineNotified:!!line.ok,lineError:line.ok?null:meta.lineError,duplicate:false});
  }
  if(!auth(req))return unauthorized();
  if(req.method==='GET'){
    const status=new URL(req.url).searchParams.get('status')||'pending';const {blobs}=await s.list({prefix:'submissions/meta/'});const out=[];
    for(const b of blobs){const m=await s.get(b.key,{type:'json',consistency:'strong'});if(m&&m.status===status)out.push(m)}
    out.sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));return Response.json(out);
  }
  if(req.method==='PATCH'){
    const {id,status}=await req.json();if(!id||!['pending','done'].includes(status))return new Response('Bad request',{status:400});
    const key=`submissions/meta/${id}`;const m=await s.get(key,{type:'json',consistency:'strong'});if(!m)return new Response('Not found',{status:404});
    m.status=status;m.updatedAt=new Date().toISOString();
    if(status==='done')m.postedAt=new Date().toISOString(); else m.postedAt=null;
    await s.setJSON(key,m);return Response.json({ok:true,postedAt:m.postedAt});
  }
  return new Response('Method not allowed',{status:405});
};
