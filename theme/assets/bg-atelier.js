/* Real workshop footage: one clip playing, lazy sources, native proportions. */
window.BG = window.BG || {};
(function (BG) {
 BG.initAtelier = function () {
  document.querySelectorAll('[data-atelier]').forEach(function (root) {
   if (root.dataset.ready) return;
   var row=root.querySelector('[data-atelier-row]') || root.querySelector('.bg-atelier__row');
   if (!row) return;
   var list=window.BG_ATELIER || [];
   if (!row.children.length) list.forEach(function (item) {
    var figure=document.createElement('figure'); figure.className='bg-atelier__clip';
    var video=document.createElement('video');video.muted=true;video.playsInline=true;video.preload='none';video.poster=item.poster;video.dataset.src=item.src;video.setAttribute('aria-label',item.label);
    var caption=document.createElement('figcaption');caption.textContent=item.label;
    figure.append(video,caption);row.append(figure);
   });
   var videos=Array.from(row.querySelectorAll('video'));if(!videos.length)return;
   root.dataset.ready='1';root.hidden=false;
   var active=0,visible=false,paused=matchMedia('(prefers-reduced-motion: reduce)').matches;
   var toggle=root.querySelector('[data-atelier-toggle]'),chapters=root.querySelector('[data-atelier-chapters]'),caption=root.querySelector('[data-atelier-caption]');
   if (!chapters) {chapters=document.createElement('div');chapters.className='bg-atelier__chapters';chapters.setAttribute('role','group');chapters.setAttribute('aria-label','Séquences de l’atelier');row.before(chapters);}
   videos.forEach(function (v,i) {
    v.loop=false;var button=document.createElement('button');button.type='button';button.textContent=String(i+1).padStart(2,'0');button.setAttribute('aria-label',v.getAttribute('aria-label') || 'Séquence '+(i+1));button.addEventListener('click',function(){select(i)});chapters.append(button);
    v.addEventListener('ended',function(){if (!paused && visible)select((active+1)%videos.length)});
    v.addEventListener('error',function(){if(caption)caption.textContent='Vidéo indisponible. Choisissez une autre séquence.'});
   });
   function sync(){if(toggle){toggle.textContent=paused?'Lire les séquences':'Mettre en pause';toggle.setAttribute('aria-pressed',String(paused));}}
   function play(){var v=videos[active];if(v.dataset.src && !v.src){v.src=v.dataset.src;v.load()}if(visible&&!paused&&!document.hidden)v.play().catch(function(){paused=true;sync()})}
   function select(index){active=index;videos.forEach(function(v,i){v.pause();v.closest('figure').classList.toggle('is-active',i===index);if(i===index&&v.ended)v.currentTime=0});Array.from(chapters.children).forEach(function(b,i){b.setAttribute('aria-pressed',String(i===index))});if(caption)caption.textContent=String(index+1).padStart(2,'0')+' / '+String(videos.length).padStart(2,'0');play()}
   if(toggle)toggle.addEventListener('click',function(){paused=!paused;if(paused)videos[active].pause();else play();sync()});
   if('IntersectionObserver'in window)new IntersectionObserver(function(es){visible=es[0].isIntersecting;if(visible)play();else videos.forEach(function(v){v.pause()})},{threshold:.2}).observe(row);else{visible=true;play()}
   document.addEventListener('visibilitychange',function(){if(document.hidden)videos.forEach(function(v){v.pause()});else play()});
   select(0);sync();
  });
 };
 document.addEventListener('shopify:section:load',BG.initAtelier);
})(window.BG);
