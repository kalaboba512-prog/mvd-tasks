
'use strict';
const $=(s,r=document)=>r.querySelector(s);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
async function init(){
 const el=$('#app');
 try{
  const r=await fetch('case.json',{cache:'no-cache'});if(!r.ok)throw Error('Материалы временно недоступны. Обновите страницу.');
  const c=await r.json(); document.title=c.name+' — Ночная смена';
  $('#case-num').textContent='ДЕЛО N-'+String(c.number).padStart(2,'0');
  $('h1').textContent=c.name.replace('Ночная смена · ','');$('#story').textContent=c.story;
  $('#category').textContent=c.category;$('#score').textContent=c.value+' очков';
  const files=$('#downloads'),evidence=$('#evidence');
  for(const file of c.files){
   const a=document.createElement('a');a.className='download';a.href=file;a.download=file;a.innerHTML=esc(file)+'<span>↓</span>';files.append(a);
   if(/\.(png|jpe?g|gif)$/i.test(file))imageCard(file,evidence);
   else if(/\.(wav|mp3|ogg)$/i.test(file))audioCard(file,evidence);
   else{const div=document.createElement('div');div.className='media-card file-only';div.innerHTML='<span class="filename">'+esc(file)+'</span><p class="muted">Скачайте исходный материал для исследования.</p><a href="'+encodeURI(file)+'" download>Скачать файл →</a>';evidence.append(div);}
  }
  if(c.extras?.archive){const div=document.createElement('div');div.className='media-card file-only';div.innerHTML='<h2>Архив «Северный»</h2><p class="muted">Веб-страницы, старые документы и журналы. Начните с главной страницы.</p><a href="'+esc(c.extras.archive)+'" target="_blank" rel="noopener">Открыть архив →</a>';evidence.prepend(div);}
  if(c.extras?.document){const box=document.createElement('div');box.className='media-card file-only';const a=document.createElement('a');a.href=c.extras.document;a.target='_blank';a.rel='noopener';a.textContent=c.extras.document_label||'Открыть материал';box.append(a);evidence.prepend(box);}
  const notes=$('#notes'),key='mvd-archive-notes-'+c.number;try{notes.value=localStorage.getItem(key)||'';}catch{}
  notes.addEventListener('input',()=>{try{localStorage.setItem(key,notes.value);$('#saved').textContent='Заметки сохранены в этом браузере';}catch{$('#saved').textContent='Автосохранение недоступно';}});
  $('#export-notes').onclick=()=>{const u=URL.createObjectURL(new Blob([notes.value],{type:'text/plain;charset=utf-8'}));const a=document.createElement('a');a.href=u;a.download='case-'+c.number+'-notes.txt';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);};
  const submit=$('#submit');submit.href=c.ctfd_id?'https://mvd-ctf.onrender.com/challenges#'+encodeURIComponent(c.name)+'-'+c.ctfd_id:'https://mvd-ctf.onrender.com/challenges';
  el.hidden=false;$('#loading').remove();
 }catch(e){$('#loading').className='error';$('#loading').textContent=e.message;}
}
function imageCard(file,parent){
 const card=document.createElement('section');card.className='media-card';
 card.innerHTML='<div class="media-top"><span class="filename">'+esc(file)+'</span><a href="'+encodeURI(file)+'" download>Оригинал ↓</a></div><div class="viewport"><img src="'+encodeURI(file)+'" alt="Материал дела: '+esc(file)+'"></div><div class="toolbar"><label>Масштаб <input type="range" min="50" max="300" value="100" aria-label="Масштаб изображения"></label><output>100%</output><button type="button" class="rotate">Повернуть ↻</button><button type="button" class="brightness">Осветлить</button></div>';
 parent.append(card);const img=$('img',card),range=$('input',card);let angle=0,light=false;
 range.oninput=()=>{img.style.width=range.value+'%';img.style.maxWidth='none';$('output',card).textContent=range.value+'%';};
 $('.rotate',card).onclick=()=>{angle=(angle+90)%360;img.style.transform='rotate('+angle+'deg)';};
 $('.brightness',card).onclick=()=>{light=!light;img.classList.toggle('light',light);};
}
function fft(re,im){const n=re.length;for(let i=1,j=0;i<n;i++){let b=n>>1;for(;j&b;b>>=1)j^=b;j^=b;if(i<j){[re[i],re[j]]=[re[j],re[i]];[im[i],im[j]]=[im[j],im[i]];}}for(let len=2;len<=n;len<<=1){const ang=-2*Math.PI/len,wr0=Math.cos(ang),wi0=Math.sin(ang);for(let i=0;i<n;i+=len){let wr=1,wi=0;for(let j=0;j<len/2;j++){const a=i+j,b=a+len/2,tr=re[b]*wr-im[b]*wi,ti=re[b]*wi+im[b]*wr;re[b]=re[a]-tr;im[b]=im[a]-ti;re[a]+=tr;im[a]+=ti;const tmp=wr*wr0-wi*wi0;wi=wr*wi0+wi*wr0;wr=tmp;}}}}
function audioCard(file,parent){
 const card=document.createElement('section');card.className='media-card';
 card.innerHTML='<div class="media-top"><span class="filename">'+esc(file)+'</span><a href="'+encodeURI(file)+'" download>Оригинал ↓</a></div><div class="audio-body"><audio controls preload="metadata" src="'+encodeURI(file)+'"></audio><div class="audio-controls"><label>Скорость <select class="speed"><option value="0.5">0.5×</option><option value="0.75">0.75×</option><option value="1" selected>1×</option><option value="1.25">1.25×</option><option value="1.5">1.5×</option></select></label><label>Канал <select class="channel"><option value="mid">L+R</option><option value="side">L−R</option><option value="left">L</option><option value="right">R</option></select></label><label><input type="checkbox" class="reverse"> Реверс</label><button type="button" class="listen">Прослушать канал</button><button type="button" class="stop">Стоп</button></div><div class="audio-controls"><label>От <input class="minhz" type="number" value="0" min="0" max="23000" step="100"> Гц</label><label>До <input class="maxhz" type="number" value="10000" min="100" max="24000" step="100"> Гц</label><button type="button" class="spectrum">Спектрограмма</button></div><canvas width="1000" height="300" aria-label="Спектрограмма звука"></canvas><p class="audio-status" aria-live="polite">Выберите канал и диапазон частот для исследования.</p></div>';
 parent.append(card);let ctx,buffer,source;const status=$('.audio-status',card),audio=$('audio',card);
 $('.speed',card).onchange=e=>{audio.playbackRate=+e.target.value;};
 async function decoded(){ctx ||= new AudioContext();if(!buffer){status.textContent='Загрузка исходного звука…';const r=await fetch(file);if(!r.ok)throw Error('Не удалось загрузить звук');buffer=await ctx.decodeAudioData(await r.arrayBuffer());}return buffer;}
 function channel(b){const l=b.getChannelData(0),r=b.numberOfChannels>1?b.getChannelData(1):l,out=new Float32Array(l.length),sel=$('.channel',card).value;for(let i=0;i<out.length;i++)out[i]=sel==='left'?l[i]:sel==='right'?r[i]:sel==='side'?(l[i]-r[i])/2:(l[i]+r[i])/2;if($('.reverse',card).checked)out.reverse();return out;}
 $('.stop',card).onclick=()=>{if(source){try{source.stop();}catch{}source=null;}audio.pause();};
 $('.listen',card).onclick=async()=>{try{const b=await decoded();await ctx.resume();if(source)try{source.stop();}catch{}audio.pause();const samples=channel(b);let peak=0;for(const x of samples)peak=Math.max(peak,Math.abs(x));if(peak>0)for(let i=0;i<samples.length;i++)samples[i]=samples[i]/peak*.8;const bb=ctx.createBuffer(1,samples.length,b.sampleRate);bb.copyToChannel(samples,0);source=ctx.createBufferSource();source.buffer=bb;source.playbackRate.value=+$('.speed',card).value;source.connect(ctx.destination);source.start();status.textContent='Воспроизведение выбранного канала';source.onended=()=>{status.textContent='Воспроизведение завершено';};}catch(e){status.textContent=e.message;}};
 $('.spectrum',card).onclick=async()=>{const btn=$('.spectrum',card);btn.disabled=true;try{const b=await decoded(),samples=channel(b),low=+$('.minhz',card).value,high=Math.min(+$('.maxhz',card).value,b.sampleRate/2);if(high<=low)throw Error('Верхняя частота должна быть больше нижней');status.textContent='Расчёт спектрограммы…';await new Promise(r=>setTimeout(r,30));const canvas=$('canvas',card),g=canvas.getContext('2d'),W=1000,H=300,n=2048,out=g.createImageData(W,H),lo=Math.floor(low*n/b.sampleRate),hi=Math.ceil(high*n/b.sampleRate);const re=new Float64Array(n),im=new Float64Array(n),window=new Float64Array(n);for(let i=0;i<n;i++)window[i]=.5-.5*Math.cos(2*Math.PI*i/(n-1));let peak=-100;const mags=new Float32Array(W*H);for(let x=0;x<W;x++){const start=Math.floor(x/W*Math.max(0,samples.length-n));for(let k=0;k<n;k++){re[k]=(samples[start+k]||0)*window[k];im[k]=0;}fft(re,im);for(let y=0;y<H;y++){const bin=Math.min(n/2-1,Math.max(0,Math.floor(hi-(hi-lo)*y/H))),v=20*Math.log10(Math.hypot(re[bin],im[bin])+1e-10);mags[y*W+x]=v;peak=Math.max(peak,v);}}for(let i=0;i<W*H;i++){const v=Math.max(0,Math.min(1,(mags[i]-peak+65)/65)),p=i*4;out.data[p]=Math.round(15+240*v*v);out.data[p+1]=Math.round(25+210*v);out.data[p+2]=Math.round(35+160*Math.sqrt(v));out.data[p+3]=255;}g.putImageData(out,0,0);g.fillStyle='#fff';g.font='12px monospace';g.fillText(Math.round(high)+' Hz',8,17);g.fillText(low+' Hz',8,H-8);status.textContent=b.duration.toFixed(2)+' с · '+b.sampleRate+' Гц · '+b.numberOfChannels+' канала';}catch(e){status.textContent=e.message;}finally{btn.disabled=false;}};
}
init();
