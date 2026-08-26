import { auth, unauthorized, store } from './_shared.mjs';

export default async (req)=>{
  const u=new URL(req.url);
  const id=u.searchParams.get('id');
  const page=u.searchParams.get('page')==='2'?2:1;
  if(!id)return new Response('Missing id',{status:400});

  const meta=await store().get(`submissions/meta/${id}`,{type:'json',consistency:'strong'});
  if(!meta)return new Response('Not found',{status:404});

  // Admin can always view. LINE can fetch only with the unguessable per-submission share key.
  const share=u.searchParams.get('share');
  const sharedAccess=!!share && !!meta.lineShareKey && share===meta.lineShareKey;
  if(!sharedAccess && !auth(req))return unauthorized();

  const key=page===2?meta.imageKey2:meta.imageKey;
  if(!key)return new Response('Not found',{status:404});
  const data=await store().get(key,{type:'arrayBuffer',consistency:'strong'});
  if(!data)return new Response('Not found',{status:404});
  return new Response(data,{headers:{
    'Content-Type':'image/png',
    'Cache-Control': sharedAccess ? 'public, max-age=86400' : 'private,no-store',
    'X-Content-Type-Options':'nosniff'
  }});
};
