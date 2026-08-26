import { auth, unauthorized, store } from './_shared.mjs';

export default async (req)=>{
  if(!auth(req))return unauthorized();
  const s=store();
  if(req.method==='GET'){
    const {blobs}=await s.list({prefix:'line-admins/'});
    const admins=[];
    for(const b of blobs){const a=await s.get(b.key,{type:'json',consistency:'strong'});if(a)admins.push(a)}
    admins.sort((a,b)=>new Date(a.registeredAt||0)-new Date(b.registeredAt||0));
    return Response.json({ownerConfigured:!!process.env.LINE_ADMIN_USER_ID,admins});
  }
  if(req.method==='DELETE'){
    const id=new URL(req.url).searchParams.get('id');
    if(!id)return new Response('Missing id',{status:400});
    await s.delete(`line-admins/${id}`);
    return Response.json({ok:true});
  }
  return new Response('Method not allowed',{status:405});
};
