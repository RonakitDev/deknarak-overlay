(() => {
  'use strict';
  const styles = [{"id":"index","name":"DEFAULT","description":"Cyber / ฟ้า–ม่วงเดิม"},{"id":"broadcast","name":"BROADCAST","description":"รายการกีฬา / เฉียง คม ตัวหนา"},{"id":"arcade","name":"ARCADE","description":"ตู้เกม / พิกเซล ตัวอักษรซ้อน"},{"id":"editorial","name":"EDITORIAL","description":"นิตยสาร / Serif เส้นบาง จัดเยื้อง"},{"id":"zen","name":"ZEN","description":"ญี่ปุ่น / เรียบ วงกลม พื้นนุ่ม"},{"id":"gojo","name":"GOJO SATORU","description":"Six Eyes / วงแหวนมิติและแสงอนันต์"},{"id":"naruto","name":"NARUTO","description":"Shinobi / วงผนึกและแถบคาดนินจา"},{"id":"itachi","name":"ITACHI","description":"Crimson Moon / จันทร์แดงและเงาอีกา"},{"id":"sasuke","name":"SASUKE","description":"Storm / สายฟ้าและกรอบเฉือนทแยง"},{"id":"onepiece","name":"ONE PIECE","description":"Grand Line / กระดาษแผนที่และเชือกเรือ"},{"id":"hon","name":"HON","description":"แฟนตาซีสงคราม / รูนและกรอบหิน"},{"id":"lol","name":"LEAGUE OF LEGENDS","description":"เวทมนตร์ / ซุ้มประตูและกรอบทอง"},{"id":"fivem","name":"FIVEM","description":"เมืองยามค่ำ / ป้ายถนนและวิทยุ"},{"id":"valorant","name":"VALORANT","description":"ยุทธวิธี / กรอบเฉียงและเส้นเล็ง"},{"id":"pubg","name":"PUBG","description":"สนามรบ / แผนที่ภูมิประเทศและกล่องเสบียง"},{"id":"gojo-character","name":"GOJO / CHARACTER","description":"โกโจ / ภาพตัวละครกับพลังอนันต์"},{"id":"naruto-character","name":"NARUTO / CHARACTER","description":"นารูโตะ / ภาพตัวละครกับกระสุนวงจักร"},{"id":"itachi-character","name":"ITACHI / CHARACTER","description":"อิทาจิ / ภาพตัวละครกับจันทร์แดง"},{"id":"sasuke-character","name":"SASUKE / CHARACTER","description":"ซาสึเกะ / ภาพตัวละครกับสายฟ้า"},{"id":"onepiece-character","name":"LUFFY / CHARACTER","description":"ลูฟี่ / ภาพตัวละครกับธีมเดินเรือ"},{"id":"allstars","name":"ANIME ALL STARS","description":"Gojo × Naruto × Itachi × Sasuke × Luffy / รวมทีม 5 ตัวละคร"},{"id":"hon-character","name":"HON / SCOUT","description":"Scout / นักลอบสังหารแห่ง Newerth"},{"id":"lol-character","name":"LOL / JINX","description":"Jinx / ตัวป่วนแห่ง League of Legends"},{"id":"valorant-character","name":"VALORANT / JETT","description":"Jett / สายลมแห่ง Valorant"},{"id":"pubg-character","name":"PUBG / LEVEL 3 SURVIVOR","description":"ทหารหมวกเลเวล 3 / PUBG"}];
  const requested = new URLSearchParams(window.location.search).get('style');
  const selected = styles.find(style => style.id === requested) || styles[0];
  const frame = document.getElementById('overlay-frame');
  const stage = document.getElementById('stage');
  const pane = document.querySelector('.preview-pane');
  const sourceUrl = new URL(selected.id + '.html', window.location.href).href;
  frame.src = sourceUrl;
  frame.title = 'ตัวอย่าง ' + selected.name;
  document.title = selected.name + ' — DEKNARAK Preview';
  document.getElementById('style-name').textContent = selected.name;
  document.getElementById('style-description').textContent = selected.description;
  document.getElementById('source-link').href = sourceUrl;
  const urlField = document.getElementById('source-url');
  urlField.value = sourceUrl;
  function fitPreview() {
    const padding = window.getComputedStyle(pane);
    const width = pane.clientWidth - parseFloat(padding.paddingLeft) - parseFloat(padding.paddingRight);
    const height = pane.clientHeight - parseFloat(padding.paddingTop) - parseFloat(padding.paddingBottom);
    const scale = Math.max(0, Math.min(width / 1080, height / 1920));
    stage.style.width = 1080 * scale + 'px';
    stage.style.height = 1920 * scale + 'px';
    frame.style.transform = 'scale(' + scale + ')';
  }
  new ResizeObserver(fitPreview).observe(pane);
  fitPreview();
  document.getElementById('copy-button').addEventListener('click', async () => {
    const status = document.getElementById('copy-status');
    if (window.location.protocol === 'file:') {
      urlField.focus(); urlField.select();
      status.textContent = 'นี่คือไฟล์ในเครื่องค่ะ อัปโหลดไฟล์ก่อนใช้เป็นลิงก์ใน TikTok';
      return;
    }
    try {
      await navigator.clipboard.writeText(sourceUrl);
      status.textContent = 'คัดลอกลิงก์ Overlay แล้วค่ะ';
    } catch {
      urlField.focus(); urlField.select();
      status.textContent = 'เลือกข้อความให้แล้วค่ะ กด Ctrl+C เพื่อคัดลอก';
    }
  });
})();
