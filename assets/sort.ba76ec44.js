
(function(){
 // ONE SORT FOR EVERY TABLE ON THE SITE (2026-10-07). It replaced a sort
 // that only the player indexes had, by mouse, one column at a time.
 //   click            sort by this column (numbers high first, words A-Z)
 //   click again      reverse it;  a third click restores the page's order
 //   shift/cmd-click  or a long press on a phone: add this column as the
 //                    next tiebreaker (1, 2, 3 show the order)
 // A table opts out with data-nosort; one with merged cells is left alone,
 // because a row there is not one record.
 var BLANK = /^(|\u2014|\u2013|-|n\/a|NA)$/i;
 function eligible(t){
  if(!t || t.dataset.st || 'nosort' in t.dataset) return false;
  if(!t.tHead || t.tHead.rows.length !== 1 || t.tBodies.length !== 1)
   return false;
  if(t.tBodies[0].rows.length < 2) return false;
  return !t.querySelector('[colspan],[rowspan]');
 }
 function raw(row, i){
  // A row's data-v ("a|b|c") is the page's own sort key for each column.
  if(row.dataset.v !== undefined){
   var p = row.dataset.v.split('|');
   if(i < p.length && p[i] !== '') return p[i];
  }
  var c = row.cells[i];
  if(!c) return '';
  return c.dataset.v !== undefined ? c.dataset.v : c.textContent.trim();
 }
 // A NUMBER IS WHAT THE CELL STARTS WITH: "85% 11/13" sorts as 85, "+0.51"
 // as 0.51, "3.7 rec" as 3.7. "WR2" or "Week 3" is text, not 2 or 3.
 function num(s){
  var m = String(s).replace(/\u2212/g,'-')
   .match(/^\s*([+-]?)\$?(\d[\d,]*\.?\d*|\.\d+)/);
  return m ? parseFloat(m[1] + m[2].replace(/,/g,'')) : NaN;
 }
 function setup(t){
  t.dataset.st = '1';
  var heads = [].slice.call(t.tHead.rows[0].cells), body = t.tBodies[0];
  [].slice.call(body.rows).forEach(function(r, k){ r.dataset.o = k; });
  var kind = heads.map(function(th, i){
   if(th.dataset.s) return th.dataset.s === 'v' ? 'n' : 't';
   var n = 0, b = 0, rows = body.rows;
   for(var k = 0; k < rows.length; k++){
    var v = raw(rows[k], i);
    if(BLANK.test(v)) continue;
    b++; if(!isNaN(num(v))) n++;
   }
   return b && n / b >= 0.6 ? 'n' : 't';
  });
  heads.forEach(function(th){
   if(!th.textContent.trim()) return;           // an icon or a blank column
   th.classList.add('st');
   var b = document.createElement('button');
   b.type = 'button'; b.className = 'sh';
   b.title = 'Sort. Shift-click, or press and hold, to sort by a second column.';
   while(th.firstChild) b.appendChild(th.firstChild);
   th.appendChild(b);
  });
  t._sort = {keys: [], kind: kind, heads: heads};
 }
 function apply(t){
  var S = t._sort, body = t.tBodies[0], rows = [].slice.call(body.rows);
  rows.sort(function(a, b){
   for(var j = 0; j < S.keys.length; j++){
    var K = S.keys[j], x = raw(a, K.i), y = raw(b, K.i);
    var bx = BLANK.test(x), by = BLANK.test(y);
    if(S.kind[K.i] === 'n'){ x = num(x); y = num(y);
     bx = bx || isNaN(x); by = by || isNaN(y); }
    if(bx || by){ if(bx && by) continue; return bx ? 1 : -1; } // blanks last
    var c = S.kind[K.i] === 'n' ? x - y :
     String(x).localeCompare(String(y), undefined, {numeric: true,
                                                     sensitivity: 'base'});
    if(c) return K.asc ? c : -c;
   }
   return a.dataset.o - b.dataset.o;
  });
  rows.forEach(function(r){ body.appendChild(r); });
  var said = [];
  S.heads.forEach(function(th, i){
   var k = -1;
   S.keys.forEach(function(K, j){ if(K.i === i) k = j; });
   var si = th.querySelector('.si');
   if(k < 0){ th.removeAttribute('aria-sort'); if(si) si.remove(); return; }
   var K = S.keys[k];
   if(k === 0) th.setAttribute('aria-sort', K.asc ? 'ascending' : 'descending');
   else th.removeAttribute('aria-sort');
   if(!si){ si = document.createElement('span'); si.className = 'si';
            si.setAttribute('aria-hidden', 'true');
            th.querySelector('.sh').appendChild(si); }
   si.innerHTML = (K.asc ? '\u2191' : '\u2193') +
    (S.keys.length > 1 ? '<sup>' + (k + 1) + '</sup>' : '');
   // SAID IN PRIORITY ORDER, not column order: "by TD rate, then trips"
   // is a different instruction from "by trips, then TD rate".
   said[k] = th.textContent.replace(/[\u2191\u2193]\d*$/, '').trim()
             + (K.asc ? ' ascending' : ' descending');
  });
  live().textContent = said.length ? 'Sorted by ' + said.join(', then ')
                                   : 'Original order';
 }
 var L;
 function live(){
  if(!L){ L = document.createElement('div'); L.setAttribute('aria-live','polite');
   L.style.cssText = 'position:absolute;width:1px;height:1px;overflow:hidden;'
                   + 'clip:rect(0 0 0 0)';
   document.body.appendChild(L); }
  return L;
 }
 function press(th, add){
  var t = th.closest('table'), S = t._sort;
  var i = S.heads.indexOf(th), dflt = S.kind[i] === 't';
  var k = -1;
  S.keys.forEach(function(K, j){ if(K.i === i) k = j; });
  if(!add){
   if(S.keys.length === 1 && k === 0){
    if(S.keys[0].flipped) S.keys = [];          // third click: page order
    else { S.keys[0].asc = !S.keys[0].asc; S.keys[0].flipped = true; }
   } else S.keys = [{i: i, asc: dflt}];
  } else if(k < 0) S.keys.push({i: i, asc: dflt});
  else if(!S.keys[k].flipped){ S.keys[k].asc = !S.keys[k].asc;
                                S.keys[k].flipped = true; }
  else S.keys.splice(k, 1);
  apply(t);
  if(window.slateEvent) window.slateEvent('table_sort', add ? 'multi' : 'single');
 }
 function scan(root){
  (root.querySelectorAll ? root : document).querySelectorAll('table')
   .forEach(function(t){ if(eligible(t)) setup(t); });
 }
 // A TABLE BUILT LATER IS SORTABLE TOO: the rankings FLEX board and the
 // My Team tables are written by script after load.
 scan(document);
 new MutationObserver(function(ms){
  ms.forEach(function(m){ m.addedNodes.forEach(function(n){
   if(n.nodeType === 1){ if(n.tagName === 'TABLE' ? eligible(n) && setup(n) : 0); scan(n); }
  }); });
 }).observe(document.body, {childList: true, subtree: true});
 // EXPOSED so a page that reorders its own table (the rankings' scoring
 // switch) can drop a sort it has just overridden.
 window.slateSortReset = function(t){
  if(!t || !t._sort) return;
  // The page's new order becomes the order a third click returns to.
  [].slice.call(t.tBodies[0].rows).forEach(function(r, k){ r.dataset.o = k; });
  t._sort.keys = []; apply(t);
 };
 var held = null, skip = false;
 function headOf(e){
  var th = e.target.closest && e.target.closest('th.st');
  return th && th.closest('table')._sort ? th : null;
 }
 document.addEventListener('click', function(e){
  var th = headOf(e); if(!th) return;
  if(skip){ skip = false; e.preventDefault(); return; }
  e.preventDefault();
  press(th, e.shiftKey || e.metaKey || e.ctrlKey);
 });
 // PRESS AND HOLD ON A PHONE adds the column: there is no shift key.
 document.addEventListener('pointerdown', function(e){
  var th = headOf(e); if(!th || e.pointerType === 'mouse') return;
  held = setTimeout(function(){ held = null; skip = true; press(th, true);
   if(navigator.vibrate) navigator.vibrate(10); }, 500);
 });
 ['pointerup','pointercancel','pointerleave'].forEach(function(ev){
  document.addEventListener(ev, function(){ if(held){ clearTimeout(held); held = null; } });
 });
 document.addEventListener('contextmenu', function(e){ if(headOf(e)) e.preventDefault(); });
})();
