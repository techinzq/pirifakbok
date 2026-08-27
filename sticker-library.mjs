import { auth, unauthorized, store } from './_shared.mjs';
const INDEX='stickers/index-v2';
const LEGACY_INDEX='stickers/index-v1';
const safe=(s,max=60)=>String(s||'').replace(/[<>]/g,'').trim().slice(0,max);
async function list(){
  const s=store();
  let items=await s.get(INDEX,{type:'json',consistency:'strong'});
  if(!items){
    const legacy=(await s.get(LEGACY_INDEX,{type:'json',consistency:'strong'}))||[];
    items=legacy.map(x=>({...x,origin:x.origin||'admin'}));
    if(items.length) await s.setJSON(INDEX,items);
  }
  return items||[];
}
async function save(v){await store().setJSON(INDEX,v)}
const allowed=new Set(['image/png','image/webp','image/jpeg']);
async function persistFile(file,{name,category='community',origin='community'}={}){
  if(!file||typeof file==='string')return {error:'Missing image',status:400};
  if(!allowed.has(file.type))return {error:'PNG, WebP, JPG only',status:400};
  const max=origin==='community'?2*1024*1024:4*1024*1024;
  if(file.size>max)return {error:origin==='community'?'à¹à¸à¸¥à¹à¹à¸«à¸à¹à¹à¸à¸´à¸ 2 MB':'File too large',status:400};
  const bytes=await file.arrayBuffer();
  const hashBuf=new Uint8Array(await crypto.subtle.digest('SHA-256',bytes));const digest=Array.from(hashBuf,b=>b.toString(16).padStart(2,'0')).join('').slice(0,24);
  let items=await list();
  const duplicate=items.find(x=>x.hash===digest);
  if(duplicate)return {ok:true,item:duplicate,duplicate:true};
  const id=crypto.randomUUID(),ext=file.type==='image/png'?'png':file.type==='image/webp'?'webp':'jpg',key=`stickers/files/${id}.${ext}`;
  await store().set(key,bytes);
  const item={id,key,mime:file.type,name:safe(name||file.name||'Sticker'),category:safe(category||'community',24),origin,hash:digest,createdAt:new Date().toISOString()};
  items.unshift(item);
  // Keep a bounded shared library so anonymous uploads cannot grow forever.
  const keep=items.slice(0,400), removed=items.slice(400);
  for(const old of removed){try{await store().delete(old.key)}catch{}}
  await save(keep);
  return {ok:true,item};
}
export default async (req)=>{
  const u=new URL(req.url),s=store(),origin=u.origin;
  if(req.method==='GET'){
    const id=u.searchParams.get('id');
    if(id){const items=await list(),x=items.find(a=>a.id===id);if(!x)return new Response('Not found',{status:404});const buf=await s.get(x.key,{type:'arrayBuffer',consistency:'strong'});if(!buf)return new Response('Not found',{status:404});return new Response(buf,{headers:{'Content-Type':x.mime||'image/png','Cache-Control':'public,max-age=3600'}})}
    const items=await list();
    return Response.json(items.map(x=>({...x,imageUrl:`${origin}/sticker-library?id=${encodeURIComponent(x.id)}`})),{headers:{'Cache-Control':'no-store'}});
  }
  if(req.method==='POST'){
    const fd=await req.formData();
    const isAdmin=auth(req);
    // Anonymous uploads are intentionally allowed for the shared community library.
    const out=await persistFile(fd.get('image'),{
      name:fd.get('name'),
      category:isAdmin?safe(fd.get('category')||'cute',24):'community',
      origin:isAdmin?'admin':'community'
    });
    if(out.error)return new Response(out.error,{status:out.status});
    return Response.json({ok:true,id:out.item.id,duplicate:!!out.duplicate,imageUrl:`${origin}/sticker-library?id=${encodeURIComponent(out.item.id)}`,item:{...out.item,imageUrl:`${origin}/sticker-library?id=${encodeURIComponent(out.item.id)}`}});
  }
  if(req.method==='DELETE'){
    if(!auth(req))return unauthorized();
    const id=u.searchParams.get('id');if(!id)return new Response('Missing id',{status:400});let items=await list();const x=items.find(a=>a.id===id);if(x)await s.delete(x.key);items=items.filter(a=>a.id!==id);await save(items);return Response.json({ok:true});
  }
  return new Response('Method not allowed',{status:405});
};
