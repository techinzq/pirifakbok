import { store } from './_shared.mjs';
export default async (req)=>{const key=new URL(req.url).searchParams.get('key');if(!key)return new Response('Missing key',{status:400});const data=await store().get(key,{type:'arrayBuffer',consistency:'strong'});if(!data)return new Response('Not found',{status:404});return new Response(data,{headers:{'Content-Type':'image/png','Cache-Control':'no-store'}})};
