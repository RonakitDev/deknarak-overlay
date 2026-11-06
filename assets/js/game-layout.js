(function (scope) {
  'use strict';
  const ratios = { '16:9':16/9, '21:9':21/9, '4:3':4/3, '1:1':1, '9:16':9/16 };
  const keys = ['gameWidth','gameHeight','gameX','gameY','gameRatio','lockRatio','followPanel'];
  function profile(isDefault) {
    return isDefault
      ? { width:1010,height:568.125,x:35,y:465.9375,minY:330,dashboardY:1195,gap:160.9375 }
      : { width:1000,height:562.5,x:40,y:420,minY:420,dashboardY:1125,gap:142.5 };
  }
  function number(value, fallback) { const result = Number(value); return value === null || value === undefined || value === '' || !Number.isFinite(result) ? fallback : result; }
  function clamp(value, min, max) { return Math.max(min,Math.min(max,value)); }
  function normalize(input, base) {
    const ratio = Object.hasOwn(ratios,input.ratio) ? input.ratio : input.ratio === 'custom' ? 'custom' : '16:9';
    const locked = input.locked !== false && ratio !== 'custom';
    const maxHeight = base.dashboardY - 32 - base.minY;
    let width = clamp(number(input.width,base.width),320,1040);
    let height = locked ? width / ratios[ratio] : clamp(number(input.height,base.height),120,maxHeight);
    if (height > maxHeight) { height=maxHeight; if (locked) width=height*ratios[ratio]; }
    const x = clamp(number(input.x,base.x),20,1060-width);
    const y = clamp(number(input.y,base.y),base.minY,base.dashboardY-32-height);
    const follow = input.follow !== false;
    const dashboardY = follow ? Math.min(base.dashboardY,y+height+base.gap) : base.dashboardY;
    return {width,height,x,y,ratio,locked,follow,dashboardY};
  }
  function fromParams(params, base) {
    return normalize({width:params.get('gameWidth'),height:params.get('gameHeight'),x:params.get('gameX'),y:params.get('gameY'),ratio:params.get('gameRatio') || '16:9',locked:params.get('lockRatio') !== '0',follow:params.get('followPanel') !== '0'},base);
  }
  function toParams(settings) {
    const value = n => String(Math.round(n*1000)/1000);
    return new URLSearchParams({gameWidth:value(settings.width),gameHeight:value(settings.height),gameX:value(settings.x),gameY:value(settings.y),gameRatio:settings.ratio,lockRatio:settings.locked?'1':'0',followPanel:settings.follow?'1':'0'});
  }
  const api = {ratios,keys,profile,normalize,fromParams,toParams,hasParams:params=>keys.some(key=>params.has(key))};
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  scope.OverlayLayout = api;
  if (typeof document === 'undefined') return;
  const game = document.querySelector('.game-area');
  const root = document.getElementById('overlay');
  if (!game || !root) return;
  const base = profile(!!document.querySelector('.game-surround'));
  const selectors = ['.game-area','.dashboard','.upper-surface','.lower-surface','.intermission','.surround-top','.surround-bottom','.rail','.side-text','.game-caption','.game-label','.game-line','.bottom-game-label','.corner','.intermission .ornament'];
  const originals = [...new Set(selectors.flatMap(selector=>[...document.querySelectorAll(selector)]))].map(element=>[element,element.getAttribute('style')]);
  const rootStyle = root.getAttribute('style');
  const originalLabel=game.getAttribute('aria-label');
  const caption=game.querySelector('.game-caption>span:last-child');
  const originalCaption=caption?.textContent;
  let fills = [];
  function reset() {
    for (const [element,style] of originals) { if (style===null) element.removeAttribute('style'); else element.setAttribute('style',style); }
    if (rootStyle===null) root.removeAttribute('style'); else root.setAttribute('style',rootStyle);
    if (originalLabel===null) game.removeAttribute('aria-label'); else game.setAttribute('aria-label',originalLabel);
    if (caption) caption.textContent=originalCaption;
    for (const fill of fills) fill.remove(); fills=[];
  }
  function set(selector,values) { document.querySelectorAll(selector).forEach(element=>Object.assign(element.style,values)); }
  function apply(input) {
    const s=normalize(input,base), bottom=s.y+s.height, px=n=>n+'px';
    root.style.isolation='isolate';
    game.setAttribute('aria-label','พื้นที่ Game Capture '+Math.round(s.width)+' × '+Math.round(s.height)+' พิกเซล');
    if(caption) caption.textContent='LIVE FEED / '+(s.locked?s.ratio:'CUSTOM');
    Object.assign(game.style,{left:px(s.x),top:px(s.y),width:px(s.width),height:px(s.height),transform:'none',aspectRatio:'auto'});
    set('.dashboard',{top:px(s.dashboardY),height:px(1920-s.dashboardY)});
    set('.upper-surface',{height:px(s.y)});set('.lower-surface',{top:px(bottom)});
    set('.intermission',{top:px(bottom),height:px(s.dashboardY-bottom)});
    set('.intermission .ornament',{fontSize:px(Math.min(60,(s.dashboardY-bottom)*.55)),lineHeight:'1'});
    set('.surround-top',{height:px(s.y-235)});set('.surround-bottom',{top:px(bottom),height:px(s.dashboardY-bottom)});
    set('.rail',{top:px(s.y+20),height:px(Math.max(0,s.height-40))});
    set('.side-text',{display:s.height<360?'none':''});
    const small=s.width<600;
    set('.game-caption',{fontSize:small?'10px':'',letterSpacing:small?'1px':''});
    set('.game-label',{fontSize:small?'12px':'',letterSpacing:small?'1px':''});set('.game-line',{display:small?'none':''});
    set('.bottom-game-label',{fontSize:small?'10px':'',letterSpacing:small?'2px':''});
    set('.corner',{width:px(Math.min(74,s.height/3)),height:px(Math.min(74,s.height/3))});
    if (!fills.length) fills=[0,1].map(()=>{const fill=document.createElement('div');fill.setAttribute('aria-hidden','true');Object.assign(fill.style,{position:'absolute',zIndex:'-1',pointerEvents:'none'});root.append(fill);return fill;});
    const surface=document.querySelector('.lower-surface,.surround-bottom');
    const background=surface?getComputedStyle(surface).background:'var(--paper,#0b1020)';
    fills.forEach((fill,index)=>Object.assign(fill.style,{top:px(s.y),height:px(s.height),left:px(index? s.x+s.width:0),width:px(index?1080-s.x-s.width:s.x),background}));
  }
  const params=new URLSearchParams(location.search);
  if (api.hasParams(params)) apply(fromParams(params,base));
  window.addEventListener('message',event=>{
    if (window.parent===window || event.source!==window.parent || (location.protocol==='file:' ? event.origin!=='null' : event.origin!==location.origin)) return;
    if (event.data?.type!=='deknarak:layout') return;
    if (event.data.reset===true) reset(); else if (event.data.settings) apply(event.data.settings);
  });
})(globalThis);
