import { auth, unauthorized, store, getConfig, setConfig, normalizeZones, DEFAULT_ZONES, normalizeTextStyles, DEFAULT_TEXT_STYLES } from './_shared.mjs';
export default async (req)=>{
  if(!auth(req))return unauthorized();
  const c=await getConfig();
  if(req.method==='GET')return Response.json({...c,defaultZones:DEFAULT_ZONES,defaultTextStyles:DEFAULT_TEXT_STYLES});
  const url=new URL(req.url);
  if(req.method==='DELETE' && url.searchParams.get('action')==='clear-special'){
    if(c.special?.key) await store().delete(c.special.key);
    c.special=null;await setConfig(c);return Response.json({ok:true});
  }

  if(req.method==='PATCH'){
    const body=await req.json().catch(()=>null);
    const type=body?.type;
    if(!['standard','special'].includes(type))return new Response('Invalid type',{status:400});
    if(!c[type])return new Response('ยังไม่มีธีมนี้ให้บันทึก Safe Zone',{status:400});
    c[type].zones=normalizeZones(body.zones||{});
    c[type].textStyles=normalizeTextStyles(body.textStyles||c[type].textStyles||{});
    await setConfig(c);
    return Response.json({ok:true,zones:c[type].zones,textStyles:c[type].textStyles});
  }
  if(req.method!=='POST')return new Response('Method not allowed',{status:405});
  const fd=await req.formData();
  const type=fd.get('type');
  const file=fd.get('image');
  if(!file||typeof file==='string')return new Response('Missing image',{status:400});
  let zones=DEFAULT_ZONES,textStyles=DEFAULT_TEXT_STYLES;
  try{zones=normalizeZones(JSON.parse(String(fd.get('zones')||'{}')))}catch{}
  try{textStyles=normalizeTextStyles(JSON.parse(String(fd.get('textStyles')||'{}')))}catch{}
  const key=`backgrounds/${type}-${Date.now()}.png`;
  await store().set(key,await file.arrayBuffer());
  if(type==='standard'){
    if(c.standard?.key) await store().delete(c.standard.key);
    c.standard={name:String(fd.get('name')||'Standard 1'),key,zones,textStyles};
  }else if(type==='special'){
    const start=String(fd.get('start')||''),end=String(fd.get('end')||'');
    if(!start||!end)return new Response('กรุณากำหนดวันเริ่มและวันสิ้นสุด',{status:400});
    if(start>end)return new Response('วันสิ้นสุดต้องไม่น้อยกว่าวันเริ่ม',{status:400});
    if(c.special?.key) await store().delete(c.special.key);
    c.special={name:String(fd.get('name')||'Special'),start,end,key,zones,textStyles};
  }else return new Response('Invalid type',{status:400});
  await setConfig(c);return Response.json({ok:true});
};
