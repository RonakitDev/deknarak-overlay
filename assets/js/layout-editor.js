(function (scope) {
  'use strict';
  function mount({ id, frame, sourceUrl, onChange }) {
    const api=scope.OverlayLayout, base=api.profile(id==='index'), form=document.getElementById('layout-form');
    if (!form) return;
    const storageKey='deknarak-layout:v1:'+location.pathname+':'+id;
    const params=new URLSearchParams(location.search);
    let active=api.hasParams(params), settings=api.fromParams(params,base);
    if (!active) {
      try { const saved=JSON.parse(localStorage.getItem(storageKey)); if (saved?.version===1) { settings=api.normalize(saved.settings,base); active=true; } } catch {}
    }
    const status=document.getElementById('layout-status');
    function send() {
      frame.contentWindow?.postMessage({type:'deknarak:layout',settings,reset:!active},location.protocol==='file:'?'*':location.origin);
    }
    function sync() {
      form.querySelectorAll('[data-key]').forEach(input=>{
        const key=input.dataset.key;
        if (input.type==='checkbox') input.checked=settings[key];
        else input.value=typeof settings[key]==='number'?String(Math.round(settings[key]*1000)/1000):settings[key];
        if (key==='x') input.max=1060-settings.width;
        if (key==='y') { input.min=base.minY; input.max=base.dashboardY-32-settings.height; }
        if (key==='height') input.max=base.dashboardY-32-base.minY;
      });
      const coordinates=document.getElementById('layout-coordinates');
      coordinates.replaceChildren(...[['X',settings.x],['Y',settings.y],['W',settings.width],['H',settings.height]].map(([label,value])=>{
        const cell=document.createElement('span'),number=document.createElement('b');cell.textContent=label;number.textContent=String(Math.round(value*100)/100)+' px';cell.append(number);return cell;
      }));
      const url=new URL(sourceUrl);
      if (active) url.search=api.toParams(settings).toString();
      onChange(url.href);
    }
    function update(next) {
      active=true;settings=api.normalize(next,base);sync();send();
      const current=new URL(location.href);api.keys.forEach(key=>current.searchParams.delete(key));api.toParams(settings).forEach((value,key)=>current.searchParams.set(key,value));
      try { history.replaceState(null,'',current.href); } catch {}
      status.textContent='ปรับตัวอย่างแล้วค่ะ คัดลอกลิงก์ด้านล่างเพื่อนำค่าชุดนี้ไปใช้';
    }
    function handle(input) {
      const key=input.dataset.key;if (!key) return;
      const next={...settings,[key]:input.type==='checkbox'?input.checked:input.type==='range'||input.type==='number'?Number(input.value):input.value};
      if (key==='ratio') next.locked=next.ratio!=='custom';
      if (key==='locked'&&next.locked&&next.ratio==='custom') next.ratio='16:9';
      if (key==='height'&&settings.locked) next.width=Number(input.value)*api.ratios[settings.ratio];
      update(next);
    }
    form.addEventListener('submit',event=>event.preventDefault());
    form.addEventListener('input',event=>{if(event.target.type==='range')handle(event.target);});
    form.addEventListener('change',event=>{if(event.target.type!=='range')handle(event.target);});
    document.getElementById('layout-center').addEventListener('click',()=>update({...settings,x:(1080-settings.width)/2}));
    document.getElementById('layout-save').addEventListener('click',()=>{
      try { localStorage.setItem(storageKey,JSON.stringify({version:1,settings}));status.textContent='บันทึกในเบราว์เซอร์นี้แล้วค่ะ แบบอื่นยังใช้ค่าของตัวเอง'; }
      catch { status.textContent='บันทึกในเครื่องไม่ได้ค่ะ ใช้ลิงก์ด้านล่างเก็บค่าชุดนี้แทนได้'; }
    });
    document.getElementById('layout-reset').addEventListener('click',()=>{
      settings=api.normalize({},base);active=false;try{localStorage.removeItem(storageKey);}catch{}
      const current=new URL(location.href);api.keys.forEach(key=>current.searchParams.delete(key));try{history.replaceState(null,'',current.href);}catch{}
      sync();send();status.textContent='คืนเลย์เอาต์เดิมและล้างค่าที่บันทึกของแบบนี้แล้วค่ะ';
    });
    frame.addEventListener('load',send);sync();send();
  }
  scope.GameLayoutEditor={mount};
})(globalThis);
