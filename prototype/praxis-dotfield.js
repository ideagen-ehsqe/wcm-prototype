/* =====================================================================
   Praxis Dot Field — a single-canvas animated dot grid.

   One <canvas>, one draw loop. Every dot is drawn with arc() each frame
   (no per-element DOM style writes / paint), so it stays smooth at 4000+
   dots regardless of how many are active. Shared by the login page and the
   animation lab.

   Usage:
     var field = PraxisDotField.create(canvasEl, { global:{...} });
     field.setMode('wave');            // or any PraxisDotField.MODES key
     field.setParam('speed', 0.4);     // live mode param
     field.setGlobal('spacing', 22);   // live global param (rebuilds grid)
     field.destroy();

   Registries for UI generation:
     PraxisDotField.GLOBAL  -> [{key,label,min,max,step,def,type}]
     PraxisDotField.MODES   -> { key: {label, controls:[...]} }
   ===================================================================== */
window.PraxisDotField = (function(){
  var TAU = Math.PI*2, WHITE=[255,255,255], WHITE_STR='rgb(255,255,255)';
  function clamp(v,a,b){ return v<a?a:(v>b?b:v); }
  function mix(a,b,t){ return [a[0]+(b[0]-a[0])*t, a[1]+(b[1]-a[1])*t, a[2]+(b[2]-a[2])*t]; }
  function rgb(c){ return 'rgb('+(c[0]|0)+','+(c[1]|0)+','+(c[2]|0)+')'; }
  function hex(h){ h=(h||'').replace('#',''); if(h.length===3) h=h[0]+h[0]+h[1]+h[1]+h[2]+h[2];
    return [parseInt(h.slice(0,2),16)||0, parseInt(h.slice(2,4),16)||0, parseInt(h.slice(4,6),16)||0]; }

  /* ---- control registries (also define defaults) ---- */
  var GLOBAL = [
    {key:'spacing',   label:'Dot spacing',       min:8,  max:44, step:1,   def:18, rebuild:true},
    {key:'dotRadius', label:'Dot size',          min:0.5,max:3.5,step:0.1, def:1.2},
    {key:'restAlpha', label:'Resting brightness',min:0,  max:0.6,step:0.02,def:0.18},
    {key:'teal',      label:'Signature A',        type:'color', def:'#29d2d7'},
    {key:'magenta',   label:'Signature B',        type:'color', def:'#e30072'},
    // shared origin — the dot field, the glow and the ring all key off this one point
    {key:'originX',   label:'Origin X (shared)', min:0,  max:1,  step:0.01,def:0.5, rebuild:true},
    {key:'originY',   label:'Origin Y (shared)', min:0,  max:1,  step:0.01,def:0.5, rebuild:true},
    {key:'glow',      label:'Glow intensity',    min:0,  max:2.5,step:0.05,def:1},
    {key:'glowSize',  label:'Glow size',         min:0.1,max:1.2,step:0.02,def:0.44},
    {key:'glowSpread',label:'Glow spread',       min:0,  max:0.6,step:0.02,def:0.16},
    {key:'glowBalance',label:'Glow balance A↔B', min:0,  max:1,  step:0.05,def:0.5},
    {key:'ring',      label:'Sphere ring',       min:0,  max:1,  step:0.05,def:1},
    {key:'ringSize',  label:'Ring size',         min:0.4,max:1,  step:0.02,def:0.82},
    {key:'edgeFade',  label:'Edge fade',          type:'toggle', def:true},
    {key:'fadeExtent',label:'Field reach',       min:0.5,max:3,  step:0.05, def:1},
    {key:'loop',      label:'Loop',               type:'toggle', def:false},
    {key:'loopDelay', label:'Loop delay (ms)',   min:0,  max:3000,step:100, def:700}
  ];

  var MODES = {
    wave:         {label:'Wave (ripple)',        controls:[
      {key:'speed',min:0.05,max:1,step:0.01,def:0.3,label:'Wave speed'},
      {key:'waveWidth',min:40,max:320,step:5,def:120,label:'Wave width'},
      {key:'amp',min:0,max:20,step:1,def:6,label:'Ripple amplitude'},
      {key:'colorSpread',min:0.05,max:1,step:0.05,def:0.3,label:'Colour spread'}]},
    sweep:        {label:'Wave — left to right', controls:[
      {key:'speed',min:0.1,max:1.5,step:0.02,def:0.55,label:'Sweep speed'},
      {key:'waveWidth',min:60,max:360,step:5,def:150,label:'Band width'},
      {key:'amp',min:0,max:20,step:1,def:6,label:'Ripple amplitude'}]},
    rippleLoop:   {label:'Ripple — looping',     controls:[
      {key:'speed',min:0.05,max:1,step:0.01,def:0.3,label:'Wave speed'},
      {key:'waveWidth',min:40,max:320,step:5,def:120,label:'Wave width'},
      {key:'amp',min:0,max:20,step:1,def:6,label:'Ripple amplitude'},
      {key:'colorSpread',min:0.05,max:1,step:0.05,def:0.3,label:'Colour spread'}]},
    sonar:        {label:'Sonar ping',           controls:[
      {key:'speed',min:0.1,max:0.8,step:0.01,def:0.34,label:'Ring speed'},
      {key:'ringWidth',min:40,max:220,step:5,def:95,label:'Ring width'},
      {key:'period',min:800,max:5000,step:100,def:2300,label:'Ping interval (ms)'}]},
    radar:        {label:'Radar sweep',          controls:[
      {key:'angSpeed',min:0.0005,max:0.005,step:0.0001,def:0.0017,label:'Beam speed'},
      {key:'wake',min:0.4,max:3.14,step:0.05,def:1.5,label:'Wake length'}]},
    diagonal:     {label:'Diagonal light sweep', controls:[
      {key:'speed',min:0.1,max:1.5,step:0.02,def:0.62,label:'Sweep speed'},
      {key:'band',min:60,max:360,step:5,def:170,label:'Band width'}]},
    breathe:      {label:'Breathing field',      controls:[
      {key:'period',min:1500,max:8000,step:100,def:3800,label:'Breath period (ms)'},
      {key:'ring',min:0,max:0.02,step:0.001,def:0.006,label:'Radial phase'},
      {key:'sizePulse',min:0,max:1.4,step:0.05,def:0.8,label:'Size pulse'}]},
    flow:         {label:'Flow field drift',     controls:[
      {key:'amp',min:0,max:16,step:0.5,def:7,label:'Drift distance'},
      {key:'scale',min:0.004,max:0.03,step:0.001,def:0.012,label:'Field scale'},
      {key:'speed',min:0.0001,max:0.002,step:0.0001,def:0.0007,label:'Evolve speed'}]},
    rain:         {label:'Rain cascade',         controls:[
      {key:'speed',min:0.05,max:0.5,step:0.01,def:0.22,label:'Fall speed'},
      {key:'tail',min:60,max:300,step:10,def:150,label:'Tail length'}]},
    constellation:{label:'Constellation (grid)', controls:[
      {key:'nodeSpacing',min:24,max:160,step:0.5, def:54,    label:'Node spacing'},   // px grid — decimals ok
      {key:'nodeSize',   min:0.6,max:3,step:0.1,   def:1.25,  label:'Node size'},
      {key:'nodeBright', min:0.4,max:1,step:0.05,  def:1,     label:'Node brightness'},
      {key:'nodeOpacity',min:0,max:1,step:0.05,    def:1,     label:'Node opacity'},
      {key:'twinkle',    min:0.0002,max:0.004,step:0.0001,def:0.0012,label:'Twinkle speed'},
      {key:'fieldDim',   min:0,max:0.4,step:0.02,  def:0.12,  label:'Field dot brightness'},
      {key:'linkDist',   min:30,max:200,step:2,    def:66,    label:'Link distance', rebuild:true},
      {key:'linkThresh', min:0,max:0.9,step:0.05,  def:0.45,  label:'Link threshold'},
      {key:'linkBright', min:0,max:2,step:0.05,    def:1,     label:'Link brightness'},
      {key:'linkOpacity',min:0,max:1.5,step:0.05,  def:0.6,   label:'Link opacity'},
      {key:'linkWidth',  min:0.5,max:3,step:0.25,  def:1,     label:'Link width'},
      {key:'linkColor',  type:'color',             def:'#5ce0e5', label:'Link colour'}]},
    organic:{label:'Organic network',            controls:[
      {key:'count',      min:20,max:320,step:1,    def:90,    label:'Node count', rebuild:true},
      {key:'driftSpeed', min:0,max:2.5,step:0.05,  def:0.5,   label:'Drift speed'},
      {key:'nodeSize',   min:0.6,max:4,step:0.1,   def:1.6,   label:'Node size'},
      {key:'nodeBright', min:0.4,max:1,step:0.05,  def:0.9,   label:'Node brightness'},
      {key:'nodeOpacity',min:0,max:1,step:0.05,    def:1,     label:'Node opacity'},
      {key:'twinkle',    min:0.0002,max:0.004,step:0.0001,def:0.001,label:'Twinkle speed'},
      {key:'linkDist',   min:40,max:280,step:5,    def:150,   label:'Link distance'},
      {key:'linkOpacity',min:0,max:1.5,step:0.05,  def:0.7,   label:'Link opacity'},
      {key:'linkWidth',  min:0.5,max:3,step:0.25,  def:1,     label:'Link width'},
      {key:'linkColor',  type:'color',             def:'#5ce0e5', label:'Link colour'}]},
    vortex:       {label:'Gravity vortex',       controls:[
      {key:'dur',min:1200,max:5000,step:100,def:2600,label:'Duration (ms)'},
      {key:'turns',min:1,max:6,step:0.5,def:3,label:'Spiral turns'}]},
    logo:         {label:'Logo formation',       controls:[
      {key:'text',type:'text',def:'ideagen',label:'Wordmark'},
      {key:'hold',min:800,max:4000,step:100,def:2700,label:'Hold before settle (ms)'}]},
    magnet:       {label:'Cursor magnet',        controls:[
      {key:'radius',min:60,max:240,step:5,def:120,label:'Reach'},
      {key:'push',min:0,max:40,step:1,def:16,label:'Push strength'}]},
    fade:         {label:'Fade in',              controls:[
      {key:'stagger',min:200,max:2000,step:50,def:900,label:'Stagger (ms)'}]},
    twinkle:      {label:'Twinkle',              controls:[
      {key:'speed',min:0.0004,max:0.003,step:0.0001,def:0.0011,label:'Twinkle speed'},
      {key:'depth',min:0.1,max:1,step:0.05,def:0.72,label:'Depth'}]},
    static:       {label:'Static',               controls:[]}
  };

  function defaults(list){ var o={}; for(var i=0;i<list.length;i++){ o[list[i].key]=list[i].def; } return o; }

  // glow used to carry its own centre; it now shares the field origin. Saved configs
  // from before that change still name the old keys, so fold them onto the origin.
  var LEGACY={ glowX:'originX', glowY:'originY' };
  function unlegacy(src){ var o={}; for(var k in src){ o[LEGACY[k]||k]=src[k]; } return o; }

  /* ---- Field ---- */
  function Field(canvas, opts){
    this.canvas=canvas; this.ctx=canvas.getContext('2d');
    this.g = Object.assign(defaults(GLOBAL), unlegacy((opts&&opts.global)||{}));
    this.tealRGB=hex(this.g.teal); this.magRGB=hex(this.g.magenta);
    this.mode='wave'; this.p=defaults(MODES.wave.controls);
    this.dots=[]; this.nodes=[]; this.pairs=[];
    this.pointer={x:-9999,y:-9999};
    this.startTime=null; this.raf=null; this._lastFill=null;
    var self=this;
    this._loop=function(now){ self._frame(now); };
    this._onMove=function(ev){ var r=canvas.getBoundingClientRect(); self.pointer.x=ev.clientX-r.left; self.pointer.y=ev.clientY-r.top; };
    this._onOut=function(){ self.pointer.x=self.pointer.y=-9999; };
    this._onResize=function(){ self.resize(); };
    window.addEventListener('mousemove', this._onMove);   // window, so a pointer-events:none canvas still tracks
    document.addEventListener('mouseleave', this._onOut);
    window.addEventListener('resize', this._onResize);
    this.resize();
  }

  Field.prototype.resize=function(){
    var c=this.canvas, r=c.getBoundingClientRect();
    var W=Math.max(1, Math.round(r.width)), H=Math.max(1, Math.round(r.height));
    var dpr=Math.min(window.devicePixelRatio||1, 2);
    c.width=W*dpr; c.height=H*dpr; this.ctx.setTransform(dpr,0,0,dpr,0,0);
    this.W=W; this.H=H; this._origin(); this.maxDist=Math.hypot(W,H);
    this._fx=(0.62*W)*(0.62*W); this._fy=(0.60*H)*(0.60*H);  // radial edge-fade denominators
    var ex=(this.g.fadeExtent||1); ex*=ex; this._ext2=ex; this._fxE=this._fx*ex; this._fyE=this._fy*ex;
    this._build();
  };

  // the single point everything radiates from: dot dist/angle, edge fade, glow and ring
  Field.prototype._origin=function(){
    var ox=this.g.originX, oy=this.g.originY;
    this.cx=this.W*(ox==null?0.5:ox); this.cy=this.H*(oy==null?0.5:oy);
  };

  Field.prototype._build=function(){
    var sp=this.g.spacing, W=this.W, H=this.H, cx=this.cx, cy=this.cy, dots=[];
    for(var y=Math.round(sp/2); y<H; y+=sp){
      for(var x=Math.round(sp/2); x<W; x+=sp){
        var dx=x-cx, dy=y-cy;
        dots.push({x:x,y:y,dist:Math.hypot(dx,dy),angle:Math.atan2(dy,dx),
                   seed:Math.random()*TAU, seed0:Math.random()*TAU});
      }
    }
    this.dots=dots;
    this._buildNodes();
    if(this.mode==='organic') this._buildOrganic();
    if(this.mode==='logo') this._computeLogo();
  };

  // constellation (grid): nodes on their own px grid, so spacing can be any decimal value
  Field.prototype._buildNodes=function(){
    var ns=(this.p&&this.p.nodeSpacing)||54, W=this.W, H=this.H, nodes=[];
    for(var y=ns/2; y<H; y+=ns){ for(var x=ns/2; x<W; x+=ns){ nodes.push({x:x,y:y,nseed:Math.random()*TAU,br:0.3}); } }
    var R=(this.p&&this.p.linkDist)||66, pairs=[];
    for(var i=0;i<nodes.length;i++){ for(var j=i+1;j<nodes.length;j++){ var dx=nodes[i].x-nodes[j].x, dy=nodes[i].y-nodes[j].y; if(dx*dx+dy*dy<R*R) pairs.push([nodes[i],nodes[j]]); } }
    this.nodes=nodes; this.pairs=pairs;
  };

  // organic network: randomly scattered nodes that drift and re-link each frame
  Field.prototype._buildOrganic=function(){
    var n=(this.p&&this.p.count)||90, W=this.W, H=this.H, arr=[];
    for(var i=0;i<n;i++){ arr.push({ x:Math.random()*W, y:Math.random()*H, vx:(Math.random()*2-1), vy:(Math.random()*2-1), seed:Math.random()*TAU, br:0.3 }); }
    this.orgNodes=arr;
  };

  Field.prototype._computeLogo=function(){
    var W=this.W,H=this.H, cv=document.createElement('canvas'); cv.width=W; cv.height=H;
    var g=cv.getContext('2d'); g.fillStyle='#fff'; g.textAlign='center'; g.textBaseline='middle';
    g.font='700 '+Math.min(W*0.13,150)+'px Gilroy,"Segoe UI",sans-serif';
    g.fillText(this.p.text||'ideagen', this.cx, Math.round(this.cy));
    var img=g.getImageData(0,0,W,H).data, minx=W, maxx=0;
    for(var i=0;i<this.dots.length;i++){ var d=this.dots[i];
      d.inLogo = img[((d.y*W)+d.x)*4+3] > 100;
      if(d.inLogo){ if(d.x<minx)minx=d.x; if(d.x>maxx)maxx=d.x; } }
    this._logoMin=minx; this._logoSpan=(maxx-minx)||1;
  };

  Field.prototype.setMode=function(name){
    if(!MODES[name]) name='wave';
    this.mode=name; this.p=defaults(MODES[name].controls);
    this.startTime=null;
    if(name==='constellation') this._buildNodes();
    if(name==='organic') this._buildOrganic();
    if(name==='logo') this._computeLogo();
    return this;
  };
  Field.prototype.setParam=function(k,v){ this.p[k]=v;
    if(this.mode==='constellation' && (k==='nodeSpacing'||k==='linkDist')) this._buildNodes();
    if(this.mode==='organic' && k==='count') this._buildOrganic();
    if(this.mode==='logo' && k==='text') this._computeLogo();
    return this; };
  Field.prototype.setGlobal=function(k,v){
    k=LEGACY[k]||k; this.g[k]=v;
    if(k==='originX'||k==='originY') this._origin();
    if(k==='teal') this.tealRGB=hex(v);
    if(k==='magenta') this.magRGB=hex(v);
    if(k==='fadeExtent'){ var ex=(v||1); ex*=ex; this._ext2=ex; this._fxE=this._fx*ex; this._fyE=this._fy*ex; }
    var def=null; for(var i=0;i<GLOBAL.length;i++) if(GLOBAL[i].key===k) def=GLOBAL[i];
    if(def&&def.rebuild) this._build();
    return this; };
  Field.prototype.restart=function(){ this.startTime=null; return this; };
  Field.prototype.getConfig=function(){ return { mode:this.mode, global:Object.assign({},this.g), params:Object.assign({},this.p) }; };
  Field.prototype.applyConfig=function(cfg){
    if(!cfg) return this;
    if(cfg.mode && MODES[cfg.mode]) this.setMode(cfg.mode);   // resets p to mode defaults
    if(cfg.global){ for(var gk in cfg.global) this.setGlobal(gk, cfg.global[gk]); }
    if(cfg.params){ for(var pk in cfg.params) this.p[pk]=cfg.params[pk]; }
    // rebuild derived structures now that params are in place
    if(this.mode==='constellation') this._buildNodes();
    if(this.mode==='organic') this._buildOrganic();
    if(this.mode==='logo') this._computeLogo();
    this.startTime=null;
    return this;
  };

  Field.prototype.start=function(){ if(!this.raf) this.raf=requestAnimationFrame(this._loop); return this; };
  Field.prototype.stop=function(){ if(this.raf){ cancelAnimationFrame(this.raf); this.raf=null; } return this; };
  Field.prototype.destroy=function(){ this.stop();
    window.removeEventListener('mousemove',this._onMove);
    document.removeEventListener('mouseleave',this._onOut);
    window.removeEventListener('resize',this._onResize); };

  Field.prototype.sig=function(t){ return mix(this.tealRGB,this.magRGB,clamp(t,0,1)); };
  Field.prototype._dot=function(x,y,a,r,col){
    if(this.g.edgeFade){ var dx=x-this.cx, dy=y-this.cy, nr=Math.sqrt(dx*dx/this._fxE + dy*dy/this._fyE);
      a *= nr<0.46 ? 1 : (nr>0.92 ? 0 : (0.92-nr)/0.46); }
    if(a<=0.01) return; var c=this.ctx;
    c.globalAlpha=a>1?1:a; if(col!==this._lastFill){ c.fillStyle=col; this._lastFill=col; }
    c.beginPath(); c.arc(x,y,r,0,TAU); c.fill(); };

  // ambient background: signature glow + faint sphere ring (a nod to the original
  // login's network-globe). Drawn on the canvas so it's lab-tunable and unmasked.
  Field.prototype._bg=function(){
    var c=this.ctx, W=this.W, H=this.H, g=this.g, t=this.tealRGB, m=this.magRGB, big=Math.max(W,H);
    var ox=this.cx, oy=this.cy;   // shared origin — same point the renderers radiate from
    c.globalAlpha=1;
    if(g.glow>0){
      var gx=ox, spread=(g.glowSpread==null?0.16:g.glowSpread);
      // the two signature lobes straddle the origin symmetrically, so their midpoint stays on it
      var tY=oy-H*spread/2, mY=oy+H*spread/2, rad=big*(g.glowSize==null?0.44:g.glowSize);
      var bal=(g.glowBalance==null?0.5:g.glowBalance), tealI=0.11*g.glow*(1-bal)*2, magI=0.08*g.glow*bal*2;
      if(tealI>0.002){ var gr=c.createRadialGradient(gx,tY,0,gx,tY,rad);
        gr.addColorStop(0,'rgba('+(t[0]|0)+','+(t[1]|0)+','+(t[2]|0)+','+tealI.toFixed(3)+')'); gr.addColorStop(1,'rgba('+(t[0]|0)+','+(t[1]|0)+','+(t[2]|0)+',0)');
        c.fillStyle=gr; c.fillRect(0,0,W,H); }
      if(magI>0.002){ var g2=c.createRadialGradient(gx,mY,0,gx,mY,rad);
        g2.addColorStop(0,'rgba('+(m[0]|0)+','+(m[1]|0)+','+(m[2]|0)+','+magI.toFixed(3)+')'); g2.addColorStop(1,'rgba('+(m[0]|0)+','+(m[1]|0)+','+(m[2]|0)+',0)');
        c.fillStyle=g2; c.fillRect(0,0,W,H); }
    }
    if(g.ring>0){
      var R=Math.min(W,H)*0.5*g.ringSize, cx=ox, cy=oy;
      var rg=c.createRadialGradient(cx,cy,R*0.72,cx,cy,R*1.06);
      rg.addColorStop(0,'rgba('+(t[0]|0)+','+(t[1]|0)+','+(t[2]|0)+',0)'); rg.addColorStop(0.85,'rgba('+(t[0]|0)+','+(t[1]|0)+','+(t[2]|0)+','+(0.05*g.ring).toFixed(3)+')'); rg.addColorStop(1,'rgba('+(t[0]|0)+','+(t[1]|0)+','+(t[2]|0)+',0)');
      c.fillStyle=rg; c.beginPath(); c.arc(cx,cy,R*1.06,0,TAU); c.fill();
      c.strokeStyle='rgba(255,255,255,'+(0.06*g.ring).toFixed(3)+')'; c.lineWidth=1; c.beginPath(); c.arc(cx,cy,R,0,TAU); c.stroke();
    }
    this._lastFill=null;
  };

  Field.prototype._duration=function(){
    var p=this.p, ww=p.waveWidth||120;
    switch(this.mode){
      case 'wave':   return (this.maxDist+ww)/(p.speed||0.3);
      case 'sweep':  return (this.W+ww)/(p.speed||0.55);
      case 'vortex': return p.dur||2600;
      case 'logo':   return (p.hold||2700)+1200;
      case 'fade':   return (p.stagger||900)+800;
      default:       return null;   // continuous modes loop on their own
    }
  };

  Field.prototype._frame=function(now){
    if(this.startTime==null) this.startTime=now;
    var e=now-this.startTime;
    if(this.g.loop){ var dur=this._duration(); if(dur!=null && e > dur + (this.g.loopDelay||700)){ this.startTime=now; e=0; } }
    var ctx=this.ctx; ctx.globalAlpha=1; ctx.clearRect(0,0,this.W,this.H); this._lastFill=null;
    this._bg();
    (REND[this.mode]||REND.wave).call(this,e);
    this.raf=requestAnimationFrame(this._loop);
  };

  /* ---- renderers ---- */
  var REND={};

  Field.prototype._radial=function(e, loop){
    var p=this.p, ww=p.waveWidth, amp=p.amp, speed=p.speed, cr=this.maxDist*(p.colorSpread||0.3);
    var baseR=this.g.dotRadius, restA=this.g.restAlpha;
    var period=this.maxDist+ww*2, front=loop?(e*speed)%period:e*speed;
    var decay=loop?1:Math.max(0.25,1-e*0.0006);
    for(var i=0;i<this.dots.length;i++){ var d=this.dots[i];
      var diff=d.dist-front, ad=Math.abs(diff), op, band= ad<ww?Math.cos(diff/ww*Math.PI/2):0;
      if(loop){ op=restA + (band>0?band*(1-restA):0); }
      else { op = restA + clamp((front-(d.dist-ww))/ww,0,1)*(1-restA); }
      var disp = ad<ww ? Math.sin(diff/ww*TAU)*amp*decay : 0;
      var col=WHITE_STR, r=baseR, a=op;
      if(band>0.04 && d.dist<cr){ col=rgb(mix(WHITE,this.sig(d.dist/cr),band)); r=baseR*(1+band*1.3); a=Math.max(a,restA+band*(1-restA)); }
      this._dot(d.x+Math.cos(d.angle)*disp, d.y+Math.sin(d.angle)*disp, a, r, col);
    }
  };
  REND.wave=function(e){ this._radial(e,false); };
  REND.rippleLoop=function(e){ this._radial(e,true); };

  REND.sweep=function(e){
    var p=this.p, ww=p.waveWidth, amp=p.amp, speed=p.speed, W=this.W, baseR=this.g.dotRadius, restA=this.g.restAlpha;
    var front=e*speed, decay=Math.max(0.3,1-e*0.0005);
    for(var i=0;i<this.dots.length;i++){ var d=this.dots[i];
      var diff=d.x-front, ad=Math.abs(diff), band= ad<ww?Math.cos(diff/ww*Math.PI/2):0;
      var op=restA + clamp((front-(d.x-ww))/ww,0,1)*(1-restA);
      var disp= ad<ww ? Math.sin(diff/ww*TAU)*amp*decay : 0;
      var col=WHITE_STR, r=baseR, a=op;
      if(band>0.04){ col=rgb(mix(WHITE,this.sig(d.x/W),band)); r=baseR*(1+band*1.3); a=Math.max(a,restA+band*(1-restA)); }
      this._dot(d.x, d.y+disp, a, r, col);
    }
  };

  REND.sonar=function(e){
    var p=this.p, speed=p.speed, ringW=p.ringWidth, period=p.period, baseR=this.g.dotRadius, restA=this.g.restAlpha;
    var n=Math.ceil((this.maxDist+ringW)/(speed*period))+1;
    for(var i=0;i<this.dots.length;i++){ var d=this.dots[i], boost=0;
      for(var k=0;k<n;k++){ var front=(e-k*period)*speed; if(front<0) continue; var diff=d.dist-front; if(Math.abs(diff)<ringW){ var b=Math.cos(diff/ringW*Math.PI/2); if(b>boost) boost=b; } }
      var col=WHITE_STR, r=baseR, a=restA+boost*(1-restA);
      if(boost>0.5){ col=rgb(mix(WHITE,this.sig(d.dist/this.maxDist),boost)); r=baseR*(1+boost*1.1); }
      this._dot(d.x,d.y,a,r,col);
    }
  };

  REND.radar=function(e){
    var p=this.p, beam=(e*p.angSpeed)%TAU, wake=p.wake, baseR=this.g.dotRadius, restA=this.g.restAlpha;
    for(var i=0;i<this.dots.length;i++){ var d=this.dots[i];
      var a0=d.angle<0?d.angle+TAU:d.angle, delta=((beam-a0)%TAU+TAU)%TAU, boost= delta<wake?(1-delta/wake):0;
      var col=WHITE_STR, r=baseR, a=restA+boost*(1-restA);
      if(delta<0.12){ var f=1-delta/0.12; col=rgb(mix(WHITE,this.sig(d.dist/this.maxDist),f)); r=baseR*(1+f); }
      this._dot(d.x,d.y,a,r,col);
    }
  };

  REND.diagonal=function(e){
    var p=this.p, band=p.band, speed=p.speed, W=this.W, H=this.H, maxP=W+H, baseR=this.g.dotRadius, restA=this.g.restAlpha;
    var front=(e*speed)%(maxP+band*2)-band;
    for(var i=0;i<this.dots.length;i++){ var d=this.dots[i], pp=d.x+d.y, diff=Math.abs(pp-front), boost= diff<band?Math.cos(diff/band*Math.PI/2):0;
      var col=WHITE_STR, r=baseR, a=restA+boost*(1-restA);
      if(boost>0.5){ col=rgb(mix(WHITE,this.sig(pp/maxP),boost)); r=baseR*(1+boost*1.2); }
      this._dot(d.x,d.y,a,r,col);
    }
  };

  REND.breathe=function(e){
    var p=this.p, baseR=this.g.dotRadius, restA=this.g.restAlpha;
    for(var i=0;i<this.dots.length;i++){ var d=this.dots[i];
      var b=0.5+0.5*Math.sin((e/p.period)*TAU - d.dist*p.ring);
      this._dot(d.x,d.y, restA+(0.95-restA)*b, baseR*(0.65+b*p.sizePulse), WHITE_STR);
    }
  };

  REND.flow=function(e){
    var p=this.p, amp=p.amp, sc=p.scale, sp=p.speed, baseR=this.g.dotRadius, restA=this.g.restAlpha;
    for(var i=0;i<this.dots.length;i++){ var d=this.dots[i];
      var nz=Math.sin(d.x*sc+e*sp)+Math.cos(d.y*sc*0.92-e*sp*0.7)+Math.sin((d.x+d.y)*sc*0.7+e*sp*0.6), ang=nz*Math.PI;
      var a=restA+(0.65-restA)*(0.5+0.5*Math.sin(e*0.001+d.seed0));
      this._dot(d.x+Math.cos(ang)*amp, d.y+Math.sin(ang)*amp, a, baseR, WHITE_STR);
    }
  };

  REND.rain=function(e){
    var p=this.p, tail=p.tail, H=this.H, baseR=this.g.dotRadius, restA=this.g.restAlpha;
    if(!this._cols||this._colsSp!==this.g.spacing){ this._cols={}; this._colsSp=this.g.spacing;
      for(var i=0;i<this.dots.length;i++){ var x=this.dots[i].x; if(!(x in this._cols)) this._cols[x]={seed:Math.random()*H, sp:0.6+Math.random()*0.9}; } }
    for(i=0;i<this.dots.length;i++){ var d=this.dots[i], c=this._cols[d.x], head=((e*p.speed*c.sp+c.seed)%(H+tail)), below=head-d.y;
      var op=restA, col=WHITE_STR, r=baseR;
      if(below>=0 && below<tail){ op=restA+(1-restA)*(1-below/tail); if(below<16){ var f=1-below/16; col=rgb(mix(WHITE,this.sig(0.1),f)); r=baseR*(1+f*0.8); } }
      this._dot(d.x,d.y,op,r,col);
    }
  };

  REND.constellation=function(e){
    var g=this.ctx, p=this.p, baseR=this.g.dotRadius;
    var tw=p.twinkle, nodeSize=p.nodeSize, nodeBright=p.nodeBright, nodeOp=p.nodeOpacity, fieldDim=p.fieldDim;
    var thresh=p.linkThresh, lbr=p.linkBright, lop=p.linkOpacity, lc=hex(p.linkColor||'#5ce0e5');
    // dim background field (all dots)
    for(var i=0;i<this.dots.length;i++){ var d=this.dots[i]; this._dot(d.x,d.y,fieldDim,baseR,WHITE_STR); }
    // node brightness (twinkle between 0.28 and nodeBright)
    for(i=0;i<this.nodes.length;i++){ var nd=this.nodes[i]; nd.br=0.28+(nodeBright-0.28)*(0.5+0.5*Math.sin(e*tw+nd.nseed)); }
    // links — brightness (contrast) and opacity (master fade) are independent
    g.globalAlpha=1; g.lineWidth=p.linkWidth;
    for(i=0;i<this.pairs.length;i++){ var a=this.pairs[i][0], b=this.pairs[i][1], al=Math.min(a.br,b.br);
      if(al>thresh){ var la=clamp((al-thresh)*lbr,0,1)*lop; if(la>0.01){ g.strokeStyle='rgba('+(lc[0]|0)+','+(lc[1]|0)+','+(lc[2]|0)+','+la.toFixed(3)+')'; g.beginPath(); g.moveTo(a.x,a.y); g.lineTo(b.x,b.y); g.stroke(); } } }
    this._lastFill=null;
    // nodes — brightness (twinkle peak) × opacity (master fade)
    for(i=0;i<this.nodes.length;i++){ var n=this.nodes[i]; this._dot(n.x,n.y, n.br*nodeOp, baseR*nodeSize, WHITE_STR); }
  };

  // organic network — scattered drifting nodes; links form/break by proximity as they move
  REND.organic=function(e){
    var g=this.ctx, p=this.p, baseR=this.g.dotRadius, W=this.W, H=this.H;
    var nodes=this.orgNodes||[], R=p.linkDist, drift=p.driftSpeed, lc=hex(p.linkColor||'#5ce0e5'), lop=p.linkOpacity;
    for(var i=0;i<nodes.length;i++){ var nd=nodes[i];
      nd.x+=nd.vx*drift; nd.y+=nd.vy*drift;
      if(nd.x<0){nd.x=0;nd.vx=-nd.vx;} else if(nd.x>W){nd.x=W;nd.vx=-nd.vx;}
      if(nd.y<0){nd.y=0;nd.vy=-nd.vy;} else if(nd.y>H){nd.y=H;nd.vy=-nd.vy;}
      nd.br=0.3+(p.nodeBright-0.3)*(0.5+0.5*Math.sin(e*p.twinkle+nd.seed));
    }
    g.globalAlpha=1; g.lineWidth=p.linkWidth;
    for(i=0;i<nodes.length;i++){ for(var j=i+1;j<nodes.length;j++){ var a=nodes[i],b=nodes[j], dx=a.x-b.x, dy=a.y-b.y, d2=dx*dx+dy*dy;
      if(d2<R*R){ var la=(1-Math.sqrt(d2)/R)*lop; if(la>0.01){ g.strokeStyle='rgba('+(lc[0]|0)+','+(lc[1]|0)+','+(lc[2]|0)+','+clamp(la,0,1).toFixed(3)+')'; g.beginPath(); g.moveTo(a.x,a.y); g.lineTo(b.x,b.y); g.stroke(); } } } }
    this._lastFill=null;
    for(i=0;i<nodes.length;i++){ var n=nodes[i]; this._dot(n.x,n.y, n.br*p.nodeOpacity, baseR*p.nodeSize, WHITE_STR); }
  };

  REND.vortex=function(e){
    var p=this.p, dur=p.dur, rot=Math.PI*p.turns, ep=1-Math.pow(1-clamp(e/dur,0,1),3), baseR=this.g.dotRadius;
    for(var i=0;i<this.dots.length;i++){ var d=this.dots[i], ang=d.angle-(1-ep)*rot, r=d.dist*ep;
      this._dot(this.cx+Math.cos(ang)*r, this.cy+Math.sin(ang)*r, ep, baseR, WHITE_STR);
    }
  };

  REND.logo=function(e){
    var p=this.p, hold=p.hold, baseR=this.g.dotRadius, restA=this.g.restAlpha, min=this._logoMin||0, span=this._logoSpan||1;
    var settle=clamp((e-hold)/1000,0,1), restEnd=0.85;
    for(var i=0;i<this.dots.length;i++){ var d=this.dots[i];
      if(d.inLogo){ var tt=(d.x-min)/span, appear=clamp((e-tt*800)/500,0,1);
        var col= appear<1 ? rgb(mix(this.sig(tt),WHITE,appear)) : WHITE_STR;
        this._dot(d.x,d.y, Math.max(appear, restEnd*settle), baseR*(1+(1-appear)*0.6), col);
      } else {
        this._dot(d.x,d.y, restA*0.4 + (restEnd-restA*0.4)*settle, baseR, WHITE_STR);
      }
    }
  };

  REND.magnet=function(e){
    var p=this.p, R=p.radius, push=p.push, baseR=this.g.dotRadius, restA=this.g.restAlpha, mx=this.pointer.x, my=this.pointer.y, g=this.ctx;
    // pointer glow
    if(mx>-9000){ var gr=g.createRadialGradient(mx,my,0,mx,my,110); var t=this.tealRGB;
      gr.addColorStop(0,'rgba('+(t[0]|0)+','+(t[1]|0)+','+(t[2]|0)+',0.16)'); gr.addColorStop(1,'rgba('+(t[0]|0)+','+(t[1]|0)+','+(t[2]|0)+',0)');
      g.globalAlpha=1; g.fillStyle=gr; g.beginPath(); g.arc(mx,my,110,0,TAU); g.fill(); this._lastFill=null; }
    for(var i=0;i<this.dots.length;i++){ var d=this.dots[i], dx=d.x-mx, dy=d.y-my, col=WHITE_STR, r=baseR, a=restA, ox=0, oy=0;
      if(dx>-R&&dx<R&&dy>-R&&dy<R){ var dd=Math.sqrt(dx*dx+dy*dy); if(dd<R){ var f=1-dd/R; ox=(dx/(dd||1))*push*f; oy=(dy/(dd||1))*push*f; r=baseR*(1+f*1.6); a=restA+(1-restA)*f; col=rgb(mix(WHITE,this.sig(1-f),0.85)); } }
      this._dot(d.x+ox,d.y+oy,a,r,col);
    }
  };

  REND.fade=function(e){
    var p=this.p, baseR=this.g.dotRadius, md=this.maxDist;
    for(var i=0;i<this.dots.length;i++){ var d=this.dots[i], delay=(d.dist/md)*p.stagger, a=clamp((e-delay)/700,0,1);
      this._dot(d.x,d.y,a,baseR,WHITE_STR); }
  };

  REND.twinkle=function(e){
    var p=this.p, baseR=this.g.dotRadius, restA=this.g.restAlpha;
    for(var i=0;i<this.dots.length;i++){ var d=this.dots[i], v=(1-p.depth)+p.depth*(0.5+0.5*Math.sin(e*p.speed+d.seed+d.dist*0.02));
      this._dot(d.x,d.y,restA+(1-restA)*v,baseR,WHITE_STR); }
  };

  REND.static=function(){ var baseR=this.g.dotRadius;
    for(var i=0;i<this.dots.length;i++){ var d=this.dots[i]; this._dot(d.x,d.y,0.85,baseR,WHITE_STR); } };

  return {
    GLOBAL:GLOBAL, MODES:MODES,
    create:function(canvas,opts){ return new Field(canvas,opts); }
  };
})();
