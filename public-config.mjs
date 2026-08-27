import { getConfig, bangkokDate, DEFAULT_ZONES, DEFAULT_TEXT_STYLES } from './_shared.mjs';
export default async (req)=>{
  const c=await getConfig();
  const today=bangkokDate();
  const standard=c.standard?.key?c.standard:null;
  const specialActive=!!(c.special?.key && c.special.start && c.special.end && today>=c.special.start && today<=c.special.end);
  const active=specialActive?c.special:standard;
  const origin=new URL(req.url).origin;
  const url=(item)=>item?.key?`${origin}/background?key=${encodeURIComponent(item.key)}`:null;
  return Response.json({
    active:active?{name:active.name,type:specialActive?'special':'standard',zones:active.zones||DEFAULT_ZONES,textStyles:active.textStyles||DEFAULT_TEXT_STYLES,start:active.start||null,end:active.end||null}:null,
    backgroundUrl:url(active),
    fallbackBackgroundUrl:specialActive?url(standard):null,
    fallback:standard?{name:standard.name||'Standard',type:'standard',zones:standard.zones||DEFAULT_ZONES,textStyles:standard.textStyles||DEFAULT_TEXT_STYLES}:null,
    today,
    hasStandard:!!standard,
    specialActive
  });
};
