import crypto from 'node:crypto';
import { store } from './_shared.mjs';

const encoder = new TextEncoder();

function safeEq(a,b){
  const aa=Buffer.from(String(a||''));
  const bb=Buffer.from(String(b||''));
  if(aa.length!==bb.length)return false;
  return crypto.timingSafeEqual(aa,bb);
}
function verifySignature(raw,signature,secret){
  if(!secret || !signature)return false;
  const digest=crypto.createHmac('sha256',secret).update(raw).digest('base64');
  return safeEq(digest,signature);
}
async function lineReply(replyToken,messages){
  const token=process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if(!token || !replyToken)return;
  const r=await fetch('https://api.line.me/v2/bot/message/reply',{
    method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},
    body:JSON.stringify({replyToken,messages:Array.isArray(messages)?messages:[messages]})
  });
  if(!r.ok)console.error('LINE reply failed',r.status,(await r.text()).slice(0,500));
}
async function textReply(replyToken,text){return lineReply(replyToken,{type:'text',text:String(text).slice(0,5000)})}
async function getProfile(userId){
  const token=process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if(!token)return null;
  try{
    const r=await fetch(`https://api.line.me/v2/bot/profile/${encodeURIComponent(userId)}`,{headers:{Authorization:`Bearer ${token}`}});
    if(!r.ok)return null;
    const p=await r.json();
    return {displayName:String(p.displayName||''),pictureUrl:String(p.pictureUrl||'')};
  }catch{return null}
}
async function isAdmin(userId){return !!(await store().get(`line-admins/${userId}`,{type:'json',consistency:'strong'}))}
async function registerAdmin(userId){
  const p=await getProfile(userId);
  await store().setJSON(`line-admins/${userId}`,{userId,displayName:p?.displayName||'',pictureUrl:p?.pictureUrl||'',registeredAt:new Date().toISOString()});
}
async function clearState(userId){try{await store().delete(`line-register-state/${userId}`)}catch{}}

async function handleEvent(ev){
  const userId=ev?.source?.userId;
  if(!userId)return;
  const s=store();

  if(ev.type==='follow'){
    await textReply(ev.replyToken,'สวัสดี 👋\nถ้าเป็นทีมแอดมิน ให้พิมพ์ “สมัครแอดมิน” เพื่อรับแจ้งเตือนงานใหม่');
    return;
  }
  if(ev.type!=='message' || ev.message?.type!=='text')return;
  const text=String(ev.message.text||'').trim();

  if(text==='สมัครแอดมิน'){
    if(await isAdmin(userId)){
      await textReply(ev.replyToken,'✅ LINE นี้ลงทะเบียนเป็นแอดมินอยู่แล้ว\nต่อไปจะได้รับแจ้งเตือนเมื่อมีงานใหม่');
      return;
    }
    await s.setJSON(`line-register-state/${userId}`,{expiresAt:Date.now()+15*60*1000,attempts:0});
    await textReply(ev.replyToken,'กรุณาส่ง “รหัสสมัครแอดมิน” ภายใน 15 นาที');
    return;
  }

  if(text==='ยกเลิกแอดมิน'){
    await s.delete(`line-admins/${userId}`);
    await clearState(userId);
    await textReply(ev.replyToken,'ยกเลิกการรับแจ้งเตือนแอดมินเรียบร้อยแล้ว');
    return;
  }

  const state=await s.get(`line-register-state/${userId}`,{type:'json',consistency:'strong'});
  if(!state)return;
  if(Date.now()>Number(state.expiresAt||0)){
    await clearState(userId);
    await textReply(ev.replyToken,'หมดเวลาลงทะเบียนแล้ว กรุณาพิมพ์ “สมัครแอดมิน” ใหม่');
    return;
  }

  const code=process.env.ADMIN_REGISTER_CODE||'';
  if(code && safeEq(text,code)){
    await registerAdmin(userId);
    await clearState(userId);
    await textReply(ev.replyToken,'✅ ลงทะเบียนแอดมินเรียบร้อย\nต่อไปเมื่อมีลูกเพจส่งงาน LINE นี้จะได้รับแจ้งเตือนอัตโนมัติ');
    return;
  }

  const attempts=Number(state.attempts||0)+1;
  if(attempts>=5){
    await clearState(userId);
    await textReply(ev.replyToken,'รหัสไม่ถูกต้องครบ 5 ครั้ง กรุณาพิมพ์ “สมัครแอดมิน” เพื่อเริ่มใหม่');
  }else{
    await s.setJSON(`line-register-state/${userId}`,{...state,attempts});
    await textReply(ev.replyToken,`รหัสไม่ถูกต้อง ลองใหม่ได้อีก ${5-attempts} ครั้ง`);
  }
}

export default async (req)=>{
  if(req.method!=='POST')return new Response('OK');
  const raw=await req.text();
  const secret=process.env.LINE_CHANNEL_SECRET;
  const signature=req.headers.get('x-line-signature');
  if(!verifySignature(raw,signature,secret))return new Response('Invalid signature',{status:401});
  let body;
  try{body=JSON.parse(raw)}catch{return new Response('Bad JSON',{status:400})}
  for(const ev of body.events||[]){
    try{await handleEvent(ev)}catch(e){console.error('Webhook event error',e?.message||e)}
  }
  return new Response('OK',{status:200});
};
