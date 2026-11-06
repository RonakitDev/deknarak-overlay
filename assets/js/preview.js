(() => {
  'use strict';
  const styles = [
  {
    "id": "index",
    "name": "DEFAULT",
    "description": "Cyber / ฟ้า–ม่วงเดิม",
    "path": "index.html"
  },
  {
    "id": "broadcast",
    "name": "BROADCAST",
    "description": "รายการกีฬา / เฉียง คม ตัวหนา",
    "path": "overlays/original/broadcast.html"
  },
  {
    "id": "arcade",
    "name": "ARCADE",
    "description": "ตู้เกม / พิกเซล ตัวอักษรซ้อน",
    "path": "overlays/original/arcade.html"
  },
  {
    "id": "editorial",
    "name": "EDITORIAL",
    "description": "นิตยสาร / Serif เส้นบาง จัดเยื้อง",
    "path": "overlays/original/editorial.html"
  },
  {
    "id": "zen",
    "name": "ZEN",
    "description": "ญี่ปุ่น / เรียบ วงกลม พื้นนุ่ม",
    "path": "overlays/original/zen.html"
  },
  {
    "id": "gojo",
    "name": "GOJO SATORU",
    "description": "Six Eyes / วงแหวนมิติและแสงอนันต์",
    "path": "overlays/anime/gojo.html"
  },
  {
    "id": "naruto",
    "name": "NARUTO",
    "description": "Shinobi / วงผนึกและแถบคาดนินจา",
    "path": "overlays/anime/naruto.html"
  },
  {
    "id": "itachi",
    "name": "ITACHI",
    "description": "Crimson Moon / จันทร์แดงและเงาอีกา",
    "path": "overlays/anime/itachi.html"
  },
  {
    "id": "sasuke",
    "name": "SASUKE",
    "description": "Storm / สายฟ้าและกรอบเฉือนทแยง",
    "path": "overlays/anime/sasuke.html"
  },
  {
    "id": "onepiece",
    "name": "ONE PIECE",
    "description": "Grand Line / กระดาษแผนที่และเชือกเรือ",
    "path": "overlays/anime/onepiece.html"
  },
  {
    "id": "hon",
    "name": "HON",
    "description": "แฟนตาซีสงคราม / รูนและกรอบหิน",
    "path": "overlays/games/hon.html"
  },
  {
    "id": "lol",
    "name": "LEAGUE OF LEGENDS",
    "description": "เวทมนตร์ / ซุ้มประตูและกรอบทอง",
    "path": "overlays/games/lol.html"
  },
  {
    "id": "fivem",
    "name": "FIVEM",
    "description": "เมืองยามค่ำ / ป้ายถนนและวิทยุ",
    "path": "overlays/games/fivem.html"
  },
  {
    "id": "valorant",
    "name": "VALORANT",
    "description": "ยุทธวิธี / กรอบเฉียงและเส้นเล็ง",
    "path": "overlays/games/valorant.html"
  },
  {
    "id": "pubg",
    "name": "PUBG",
    "description": "สนามรบ / แผนที่ภูมิประเทศและกล่องเสบียง",
    "path": "overlays/games/pubg.html"
  },
  {
    "id": "gojo-character",
    "name": "GOJO / CHARACTER",
    "description": "โกโจ / ภาพตัวละครกับพลังอนันต์",
    "path": "overlays/characters/anime/gojo.html"
  },
  {
    "id": "naruto-character",
    "name": "NARUTO / CHARACTER",
    "description": "นารูโตะ / ภาพตัวละครกับกระสุนวงจักร",
    "path": "overlays/characters/anime/naruto.html"
  },
  {
    "id": "itachi-character",
    "name": "ITACHI / CHARACTER",
    "description": "อิทาจิ / ภาพตัวละครกับจันทร์แดง",
    "path": "overlays/characters/anime/itachi.html"
  },
  {
    "id": "sasuke-character",
    "name": "SASUKE / CHARACTER",
    "description": "ซาสึเกะ / ภาพตัวละครกับสายฟ้า",
    "path": "overlays/characters/anime/sasuke.html"
  },
  {
    "id": "onepiece-character",
    "name": "LUFFY / CHARACTER",
    "description": "ลูฟี่ / ภาพตัวละครกับธีมเดินเรือ",
    "path": "overlays/characters/anime/onepiece.html"
  },
  {
    "id": "allstars",
    "name": "ANIME ALL STARS",
    "description": "Gojo × Naruto × Itachi × Sasuke × Luffy / รวมทีม 5 ตัวละคร",
    "path": "overlays/collections/allstars.html"
  },
  {
    "id": "hon-character",
    "name": "HON / SCOUT",
    "description": "Scout / นักลอบสังหารแห่ง Newerth",
    "path": "overlays/characters/games/hon.html"
  },
  {
    "id": "lol-character",
    "name": "LOL / JINX",
    "description": "Jinx / ตัวป่วนแห่ง League of Legends",
    "path": "overlays/characters/games/lol.html"
  },
  {
    "id": "valorant-character",
    "name": "VALORANT / JETT",
    "description": "Jett / สายลมแห่ง Valorant",
    "path": "overlays/characters/games/valorant.html"
  },
  {
    "id": "pubg-character",
    "name": "PUBG / LEVEL 3 SURVIVOR",
    "description": "ทหารหมวกเลเวล 3 / PUBG",
    "path": "overlays/characters/games/pubg.html"
  },
  {
    "id": "rapunzel",
    "name": "RAPUNZEL",
    "description": "ราพันเซล / หอคอย เปียทอง และโคมลอย",
    "path": "overlays/fairytale/rapunzel.html"
  }
];
  const requested = new URLSearchParams(window.location.search).get('style');
  const selected = styles.find(style => style.id === requested) || styles[0];
  const frame = document.getElementById('overlay-frame');
  const stage = document.getElementById('stage');
  const pane = document.querySelector('.preview-pane');
  const sourceUrl = new URL(selected.path, window.location.href).href;
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
