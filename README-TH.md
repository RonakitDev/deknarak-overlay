# DEKNARAK — TikTok LIVE Studio Edition

เวอร์ชันนี้ไม่มี Cloudflare, WebSocket, Bridge, API หรือข้อมูล WAITING ปลอม ๆ
HTML เป็นกรอบตกแต่งเท่านั้น ส่วน Alert / Goal / Creator rankings ให้ TikTok LIVE Studio แสดงเอง

## อัปโหลด GitHub Pages
อัปโหลด index.html, styles.html, preview.html พร้อมโฟลเดอร์ assets/ และ overlays/ โดยรักษาโครงสร้างโฟลเดอร์เดิม ห้ามย้ายไฟล์ด้านในขึ้นมาไว้ที่ root
(ลบ tools/legacy/config.js, tools/legacy/bridge.py และ bridge.mjs ได้หากไม่ใช้งาน)
รอ GitHub Pages deploy แล้วเปิด styles.html เพื่อเลือกแบบและคัดลอกลิงก์ Overlay ใหม่จากหน้าพรีวิว ส่วน index.html ยังคงเป็น Default

## จัด Source ใน TikTok LIVE Studio
1. Game Capture: ภาพเกมเป็นชั้นล่างสุด
2. Link: URL GitHub Pages เป็นชั้นเหนือ Game Capture และขยายให้เต็ม 9:16
3. Goal: Add Source > Goal แล้วลากวางบริเวณกล่อง LIVE GOAL ด้านล่าง
4. Creator rankings: Add Source > Creator rankings แล้วลากวางในกล่อง CREATOR RANKINGS
5. Alert: Add Source > Alert แล้วลากวางกลางภาพเกม (หรือบริเวณที่ต้องการ) โดยให้อยู่เหนือ Link

## ตำแหน่งคร่าว ๆ บน Canvas 1080 × 1920
- Game area: x=35..1045, y=330..1170
- Goal widget content: x=65..1015, y=1300..1455
- Rankings widget content: x=65..1015, y=1527..1842
- Alert: วางกลางเกมประมาณ x=150..930, y=580..800

หมายเหตุ: LIVE Studio แต่ละเวอร์ชันอาจมีการจัดขนาด/รูปแบบ widget ต่างกัน
กล่องใน HTML เป็นเพียงกรอบ ไม่สามารถรับค่าจาก Widget TikTok โดยตรงได้
ถ้า Link แสดงพื้นหลังทึบแทนโปร่งใส ต้องตรวจสอบคุณสมบัติ Source ของ LIVE Studio
