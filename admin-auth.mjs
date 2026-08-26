import { auth, unauthorized } from './_shared.mjs';
export default async (req)=> auth(req)?Response.json({ok:true}):unauthorized();
