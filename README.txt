#ฝากบอกพิริ — v10 Shared Meme Library + Stable Editor

ต่อจาก v8 โดยคงระบบเดิม: Theme, Safe Zone, LINE OA, Multi-admin, Job number, duplicate protection, 10 photos, page 2, download-all, IG validation, auto date.

ใหม่ใน v10:
- ลูกเพจลากหัวข้อ/รายละเอียด/Instagram บน Canvas ได้
- Enter กำหนดบรรทัดเอง
- Text presets: ปกติ / พาดหัว / คิขุ / เท่ / Neon / ขาวขอบดำ / Minimal
- Advanced: Font, size, color, opacity, line-height, rotation, bold, italic, align, outline, shadow, glow, text background
- เพิ่ม Text Box ใหม่ได้
- Sticker/Meme library: แนะนำ / คิขุ / เท่ / Reaction / วิ้ง / ลูกศร / เทศกาล
- ลาก, ปรับขนาด, หมุน, opacity, flip, duplicate, delete stickers
- Upload sticker/meme ส่วนตัวต่อโพสต์
- Admin Sticker Library: อัป PNG/WebP/JPG แล้วลูกเพจเห็นในหมวด ของเพจ ทันที โดยไม่ต้อง deploy ใหม่
- Undo/Redo, Reset layout, Snap center guides, Preview clean
- Background, #ฝากบอกพิริ, วันที่ฝาก และ Canvas 1080x1350 ยังล็อกไว้

Deploy: อัป ZIP ทับ Site เดิมได้ Environment Variables และ LINE Webhook เดิมไม่ต้องตั้งใหม่
Rollback: ถ้าไม่ชอบ ให้ deploy ZIP v8 เดิมทับกลับได้ เว็บและข้อมูลใน Netlify Blobs/Environment Variables ยังอยู่

v10 fixes
- Fixes editor freezing after uploading a meme/sticker by uploading the image to Netlify storage first instead of storing a large data URL inside editor undo state.
- Uploaded meme/sticker images preserve their aspect ratio and can be dragged, resized, rotated, flipped, duplicated, and deleted from the current post.
- Anonymous uploads are saved to a shared "คลังรวม" library immediately. Everyone visiting the site can reuse them.
- Admin uploads remain visible in "ของเพจ" and also appear in the shared library.
- Admin can delete shared/library items from Sticker Library.
- Community uploads are limited to 2 MB each and the shared library is capped at 400 items to reduce storage abuse.
