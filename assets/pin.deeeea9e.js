
(function(){
 var API=(window.SLATE_API||'').replace(/\/$/,'');
 document.addEventListener('click', function(e){
   var b = e.target.closest && e.target.closest('.fig-pin');
   if(!b || b.disabled) return;
   e.preventDefault();
   var on = b.getAttribute('aria-pressed') === 'true';
   var lab = b.querySelector('.fig-pin-t');
   var args = {};
   try { args = JSON.parse(b.getAttribute('data-args')||'{}'); } catch(err){}
   b.disabled = true;
   var body = on
     ? {drop:true, id:+b.getAttribute('data-id')}
     : {tool:b.getAttribute('data-tool'), args:args,
        chart:b.getAttribute('data-chart'),
        title:b.getAttribute('data-title')};
   fetch(API+'/api/widget', {method:'POST', credentials:'include',
     headers:{'content-type':'application/json'}, body:JSON.stringify(body)})
   .then(function(r){ return r.json().then(function(j){ return [r.status,j]; }); })
   .then(function(p){
     var st = p[0], j = p[1];
     b.disabled = false;
     // A DEAD END IS WORSE THAN NO BUTTON. Say what it needs, in place.
     if(st === 401){ b.classList.add('needs');
       if(lab) lab.textContent = 'Sign in to keep'; return; }
     if(st === 409){ b.classList.add('needs');
       if(lab) lab.textContent = 'Dashboard full'; return; }
     if(st !== 200){ if(lab) lab.textContent = 'Could not keep'; return; }
     var gal = b.closest('.gal');
     var cid = b.getAttribute('data-chart');
     if(j.saved){ b.setAttribute('aria-pressed','true');
       b.setAttribute('data-id', j.id);
       b.setAttribute('aria-label','Remove this chart from your dashboard');
       if(lab) lab.textContent = 'Kept';
       if(gal && window.slateSetKept) window.slateSetKept(gal, cid, j.id); }
     else { b.setAttribute('aria-pressed','false');
       b.removeAttribute('data-id');
       b.setAttribute('aria-label','Keep this chart on your dashboard');
       if(lab) lab.textContent = 'Keep';
       if(gal && window.slateSetKept) window.slateSetKept(gal, cid, null); }
   })
   .catch(function(){ b.disabled = false;
     if(lab) lab.textContent = 'Could not keep'; });
 });
})();
