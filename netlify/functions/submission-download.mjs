import { auth, unauthorized, store } from './_shared.mjs';

function crc32(buf){
  let c=0xffffffff;
  for(const b of buf){c^=b;for(let k=0;k<8;k++)c=(c>>>1)^((c&1)?0xedb88320:0)}
  return (c^0xffffffff)>>>0;
}
function u16(n){return Uint8Array.of(n&255,(n>>>8)&255)}
function u32(n){return Uint8Array.of(n&255,(n>>>8)&255,(n>>>16)&255,(n>>>24)&255)}
function concat(parts){const len=parts.reduce((a,p)=>a+p.length,0),out=new Uint8Array(len);let o=0;for(const p of parts){out.set(p,o);o+=p.length}return out}
function zipStore(files){
  const enc=new TextEncoder(),locals=[],centrals=[];let offset=0;
  for(const f of files){
    const name=enc.encode(f.name),data=f.data instanceof Uint8Array?f.data:new Uint8Array(f.data),crc=crc32(data),size=data.length;
    const local=concat([u32(0x04034b50),u16(20),u16(0x0800),u16(0),u16(0),u16(0),u32(crc),u32(size),u32(size),u16(name.length),u16(0),name,data]);
    locals.push(local);
    const central=concat([u32(0x02014b50),u16(20),u16(20),u16(0x0800),u16(0),u16(0),u16(0),u32(crc),u32(size),u32(size),u16(name.length),u16(0),u16(0),u16(0),u16(0),u32(0),u32(offset),name]);
    centrals.push(central);offset+=local.length;
  }
  const central=concat(centrals),local=concat(locals),eocd=concat([u32(0x06054b50),u16(0),u16(0),u16(files.length),u16(files.length),u32(central.length),u32(local.length),u16(0)]);
  return concat([local,central,eocd]);
}

export default async (req)=>{
  if(!auth(req))return unauthorized();
  const id=new URL(req.url).searchParams.get('id');if(!id)return new Response('Missing id',{status:400});
  const s=store(),m=await s.get(`submissions/meta/${id}`,{type:'json',consistency:'strong'});if(!m)return new Response('Not found',{status:404});
  const base=(m.jobNo||'PIRI').replace('#',''),files=[];
  const p1=await s.get(m.imageKey,{type:'arrayBuffer',consistency:'strong'});if(p1)files.push({name:`${base}-page-1.png`,data:new Uint8Array(p1)});
  if(m.imageKey2){const p2=await s.get(m.imageKey2,{type:'arrayBuffer',consistency:'strong'});if(p2)files.push({name:`${base}-page-2.png`,data:new Uint8Array(p2)})}
  const out=zipStore(files);
  return new Response(out,{headers:{'Content-Type':'application/zip','Content-Disposition':`attachment; filename="${base}.zip"`,'Cache-Control':'no-store'}});
};
