# นำเว็บ DELEF FEST GOPASS ขึ้นออนไลน์

## วิธีง่ายที่สุด: Render

1. สร้างบัญชี Render และเชื่อม GitHub
2. อัปโหลดโฟลเดอร์โปรเจกต์นี้ขึ้น GitHub repository ใหม่
3. ใน Render เลือก **New → Web Service** แล้วเลือก repository
4. Build Command: `npm install`
5. Start Command: `npm start`
6. ตั้ง Environment Variables:
   - `ADMIN_USER` = ชื่อผู้ใช้แอดมิน
   - `ADMIN_PASS` = รหัสผ่านแอดมินที่เดายาก
   - `ADMIN_RESET` = `false`
7. Deploy แล้ว Render จะให้ลิงก์ `https://....onrender.com`

## สำคัญเรื่องข้อมูล

โปรเจกต์นี้ใช้ไฟล์ JSON และโฟลเดอร์ uploads เป็นที่เก็บข้อมูล/รูปภาพ ดังนั้นบริการแบบฟรีที่ไม่มี persistent disk อาจทำให้ข้อมูลหรือรูปที่อัปโหลดหายเมื่อมีการสร้าง instance ใหม่/รีดีพลอย

ถ้าจะเปิดใช้งานจริงแบบมีข้อมูลถาวร ควรย้าย `events/orders` ไปฐานข้อมูล เช่น PostgreSQL/Supabase และย้ายรูปไป object storage เช่น S3/Supabase Storage ก่อน

## ทดสอบหลัง Deploy

เปิด:
- `/index.html` หน้าเว็บ
- `/admin/login.html` หน้าแอดมิน
- `/api/health` ควรตอบ JSON ว่า `ok: true`
