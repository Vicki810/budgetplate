import {initFoodLibrary} from './add-food-ui.mjs';
import {defaults,nutrientTargets,nutritionDefaults,restoreSettings,updateCalorieDefaults,resetNutrition,settingsIssues,weeklyNutrientBounds,dailyRangeText} from './nutrition-targets.mjs';
import {nutrientUnits} from './food-library.mjs';
import {priceLabel,currentPriceSource,basketPriceSummary,shoppingRows} from './provenance.mjs';
import {restoreFoods,defaultMinimum,preferenceIssues} from './preferences.mjs';
const $=s=>document.querySelector(s),money=x=>new Intl.NumberFormat('en-CA',{style:'currency',currency:'CAD'}).format(x),qty=x=>x>=1000?`${(x/1000).toFixed(2)} kg`:`${Math.round(x)} g`,esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const base=await fetch('foods.json').then(r=>{if(!r.ok)throw Error('Food data unavailable');return r.json()});
let foods=restoreFoods(base),settings={...defaults},result=null,worker=null,timer=null,nutritionCustomKeys=new Set();
try{const saved=JSON.parse(localStorage.getItem('budgetplate-v1'));if(saved){settings=restoreSettings(saved.settings);nutritionCustomKeys=new Set(Array.isArray(saved.customNutrition)?saved.customNutrition:[]);foods=restoreFoods(base,saved.foods||[]);}}catch{}
renderNutritionInputs();
syncSettingsFields();
let calorieBasis=Number.isFinite(settings.calories)?settings.calories:2000;
function syncSettingsFields(){for(const [k,v]of Object.entries(settings)){const e=$('#'+k);if(e)e.type==='checkbox'?e.checked=v:e.value=v??'';}}
function renderNutritionInputs(){
 $('#nutrition-target-inputs').innerHTML=nutrientTargets.map(t=>{
  const fields=[['Minimum',t.minKey],['Maximum',t.maxKey]].filter(([,key])=>key&&key!=='calories');
  return `<fieldset class="nutrient-setting"><legend>${t.name} <span>${t.unit}/day</span></legend><div class="target-pair ${fields.length===1?'one-limit':''}">${fields.map(([label,key])=>`<div><label for="${key}">${label}</label><input id="${key}" aria-label="${t.name} ${label.toLowerCase()} · ${t.unit}/day" type="number" min="0" max="${t.inputMax}" step="${t.unit==='kcal'?'1':'0.1'}" required></div>`).join('')}</div>${t.key==='calories'?'<p class="field-note">The minimum is your calorie target above.</p>':''}${['carbs','fat'].includes(t.key)?`<p class="field-note" id="${t.key}-reference"></p>`:''}</fieldset>`;
 }).join('');
 const bounds=weeklyNutrientBounds(defaults);
 $('#default-target-table').innerHTML=`<table class="default-target-table"><thead><tr><th>Measure</th><th>Daily limits</th></tr></thead><tbody>${nutrientTargets.map(t=>`<tr><td>${t.name}</td><td>${dailyRangeText(bounds[t.key],t.unit)}</td></tr>`).join('')}</tbody></table>`;
 updateTargetHints();
}
function updateTargetHints(){
 const basis=Number.isFinite(settings.calories)&&settings.calories>=1200&&settings.calories<=4000?settings.calories:2000;
 const n=nutritionDefaults(basis);
 $('#carbs-reference').textContent=`Default: ${n.carbsMin}–${n.carbsMax} g (45–65% of target calories).`;
 $('#fat-reference').textContent=`Default: ${n.fatMin}–${n.fatMax} g (20–35% of target calories).`;
}
function renderTargetIssues(){
 const issues=settingsIssues(settings),box=$('#nutrition-issues');
 box.hidden=!issues.length;
 box.innerHTML=issues.length?`<strong>Review your daily limits</strong><ul>${issues.map(i=>`<li>${esc(i.message)}</li>`).join('')}</ul>`:'';
 for(const key of Object.keys(defaults)){const e=$('#'+key);if(!e||e.type!=='number')continue;const issue=issues.find(i=>i.field===key);e.setCustomValidity(issue?.message||'');if(issue)e.setAttribute('aria-invalid','true');else e.removeAttribute('aria-invalid');}
 return issues;
}
$('#reset-nutrition').addEventListener('click',()=>{
 readSettings();settings=resetNutrition(settings);nutritionCustomKeys.clear();calorieBasis=settings.calories;syncSettingsFields();updateTargetHints();renderTargetIssues();save();stale();
 const note=$('#nutrition-reset-note');note.hidden=false;note.textContent=`Nutrition defaults restored for ${settings.calories} kcal/day.`;
});
$('#settings').addEventListener('invalid',e=>{if($('#nutrition-settings').contains(e.target))$('#nutrition-settings').open=true;},true);
function save(){try{localStorage.setItem('budgetplate-v1',JSON.stringify({foods,settings,customNutrition:[...nutritionCustomKeys]}));return true;}catch{const b=$('#food-feedback');b.hidden=false;b.className='alert';b.textContent='Browser storage is unavailable or full. Your changes work for this visit but could not be saved for next time.';return false;}}
function readSettings(){
 for(const k of Object.keys(defaults)){const e=$('#'+k);settings[k]=e.type==='checkbox'?e.checked:e.type==='number'?(e.value===''?null:Number(e.value)):e.value;}
 if(Number.isFinite(settings.calories)&&settings.calories>=1200&&settings.calories<=4000&&settings.calories!==calorieBasis){
  const adjusted=updateCalorieDefaults(settings,calorieBasis,nutritionCustomKeys);
  for(const key of Object.keys(settings))if(adjusted[key]!==settings[key])$('#'+key).value=adjusted[key];
  settings=adjusted;calorieBasis=settings.calories;
 }
 updateTargetHints();return settings;
}
function view(id){if(!['plan','prices','about'].includes(id))id='plan';document.querySelectorAll('.view').forEach(e=>e.hidden=e.id!==id);document.querySelectorAll('.tabs button').forEach(e=>{const active=e.dataset.view===id;e.classList.toggle('active',active);if(active)e.setAttribute('aria-current','page');else e.removeAttribute('aria-current');});if(location.hash!=='#'+id)history.replaceState(null,'','#'+id);}
document.addEventListener('click',e=>{const b=e.target.closest('[data-view]');if(b)view(b.dataset.view);});
window.addEventListener('hashchange',()=>view(location.hash.slice(1)));view(location.hash.slice(1)||'plan');
function stale(){if(worker){worker.terminate();worker=null;clearTimeout(timer);}$('#solve').disabled=false;$('#solve').innerHTML='Build my grocery week <span>→</span>';$('#results').setAttribute('aria-busy','false');if(result||$('#results .busy')){$('#results').innerHTML='<div class="empty card"><span class="empty-symbol">↻</span><h2>Your inputs have changed.</h2><p>Build your grocery week again to see an updated basket.</p></div>';result=null;}}
$('#settings').addEventListener('input',e=>{if(e.target.id!=='calories'&&Object.hasOwn(nutritionDefaults(),e.target.id))nutritionCustomKeys.add(e.target.id);readSettings();renderTargetIssues();$('#nutrition-reset-note').hidden=true;save();stale();renderPreferenceIssues();});
document.querySelectorAll('[data-budget]').forEach(b=>b.addEventListener('click',()=>{$('#budget').value=b.dataset.budget;readSettings();renderTargetIssues();save();stale();}));
$('#settings').addEventListener('submit',e=>{e.preventDefault();run();});
function run(){readSettings();const targetIssues=renderTargetIssues();if(targetIssues.length){$('#nutrition-settings').open=true;$('#'+targetIssues[0].field).focus();$('#'+targetIssues[0].field).reportValidity();return;}if(!$('#settings').reportValidity())return;save();stale();const invalid=[...document.querySelectorAll('#favourite-list input')].find(e=>!e.checkValidity());if(invalid){invalid.reportValidity();invalid.focus();return;}if(renderPreferenceIssues()){ $('#preference-issues').scrollIntoView({block:'center',behavior:'smooth'});return;}$('#solve').disabled=true;$('#solve').textContent='Finding your basket…';$('#results').setAttribute('aria-busy','true');$('#results').innerHTML='<div class="empty card"><span class="empty-symbol busy">◌</span><h2>Putting your budget to work.</h2><p>Checking nutrition, packages and what’s in your pantry…</p></div>';worker=new Worker('worker.mjs',{type:'module'});worker.onmessage=e=>finish(e.data);worker.onerror=e=>{console.error('BudgetPlate worker',e.message);finish({status:'error'});};worker.postMessage({foods,settings});timer=setTimeout(()=>finish({status:'timeout'}),12000);}
function finish(r){clearTimeout(timer);worker?.terminate();worker=null;$('#solve').disabled=false;$('#solve').innerHTML='Rebuild my grocery week <span>↻</span>';$('#results').setAttribute('aria-busy','false');result=r;if(r.status==='settings'){$('#results').innerHTML=`<div class="card alert"><h2>Review your nutrition targets</h2><ul>${r.issues.map(s=>`<li>${esc(s)}</li>`).join('')}</ul></div>`;return;}if(r.status==='preferences'){$('#results').innerHTML=`<div class="card alert"><h2>Review your must-include foods</h2><ul>${r.issues.map(s=>`<li>${esc(s)}</li>`).join('')}</ul></div>`;return;}if(r.message)console.error(r.message);if(r.status!=='success'){const infeasible=r.status==='infeasible';$('#results').innerHTML=`<div class="empty card"><span class="empty-symbol">${infeasible?'↔':'↻'}</span><h2>${infeasible?'These settings don’t fit together.':'No verified basket returned.'}</h2><p>${infeasible?'The available foods cannot meet all the current constraints.<br>Try smaller must-include amounts, enable more foods, review your targets, or turn off the variety rule.':'The search reached its limit or encountered an error.<br>Try again or enable more foods. Your budget may still be feasible.'}</p><button class="secondary" data-view="prices">Review available foods</button></div>`;return;}renderResult(r);}
function renderResult(r){const diff=settings.budget-r.total,meta=basketPriceSummary(r.items),gap=r.total>0?Math.max(0,(r.total-r.lowerBound)/r.total*100):0;
 $('#results').innerHTML=`<div class="result-head"><div><p class="eyebrow">YOUR WEEK, SORTED</p><h2>A little more room in your budget.</h2></div><span class="small-badge">${r.items.length} foods · 7 days</span></div>${!r.withinBudget?`<div class="alert"><strong>This basket is ${money(-diff)} over budget.</strong> ${r.lowerBound>settings.budget+0.01?'Even the relaxed model exceeds your budget under these settings.':'A cheaper basket may still exist; this search does not prove your budget impossible.'} Try pantry items, updated prices or different food choices.</div>`:''}<div class="cost-card ${r.withinBudget?'':'over'}"><div><div class="cost-label">Estimated checkout</div><div class="cost-number">${money(r.total)}<small>CAD</small></div><div class="cost-copy">${r.items.reduce((a,f)=>a+f.packs,0)} whole purchase units · ${meta}</div></div><div class="budget-side"><div class="cost-label">${r.withinBudget?'Left in your budget':'Above your budget'}</div><strong>${money(Math.abs(diff))}</strong><div class="budget-bar"><span style="width:${Math.min(100,settings.budget>0?r.total/settings.budget*100:100)}%"></span></div><div class="cost-copy">of your ${money(settings.budget)} weekly budget</div></div></div><p class="result-note">Best basket found · ${money(r.consumedCost)} worth of food used. Checkout includes whole packages; pantry stock has no new cost. Nutrition uses USDA reference foods; actual products and preparation may differ.</p><div class="shopping card"><div class="card-header"><div><h2>Your shopping list</h2><p>Tick items off as you shop. Amounts used are for the full week.</p></div><button class="secondary" id="download">↓ Save list</button></div><div class="table-wrap"><table><thead><tr><th>Food / package</th><th>Buy</th><th>Use / left</th><th>Cost</th></tr></thead><tbody>${r.items.map(f=>`<tr><td><div class="food-cell"><label><input type="checkbox" aria-label="Mark ${esc(f.name)} as packed"><span>${esc(f.name)}<small class="food-sub">${esc(f.package)}${f.basis.startsWith('Dry')?' · dry':''}</small>${f.minGrams?`<small class="must-label">Must include · at least ${qty(f.minGrams)}</small>`:''}</span></label></div></td><td>${f.packs||'Pantry'}${f.packs?`<span class="food-sub">${f.packs===1?'unit':'units'}</span>`:''}</td><td>${qty(f.used)}<span class="food-sub">${qty(Math.max(0,f.left))} left</span></td><td>${money(f.cost)}</td></tr>`).join('')}</tbody></table></div><div class="table-total"><span>Estimated checkout total</span><strong>${money(r.total)}</strong></div></div><div class="card nutrition"><div class="section-heading"><span class="step">✓</span><h2>Nutrition, at a glance</h2></div><p class="muted">All nine measures, averaged over the week. Every selected limit is checked.</p><div class="nutrition-grid">${nutrientTargets.map(t=>`<div class="metric"><span>${t.name}</span><strong>${new Intl.NumberFormat('en-CA',{maximumFractionDigits:t.key==='calories'?0:1}).format(r.nutrients[t.key])}<small> ${t.unit}</small></strong><span class="metric-target">${dailyRangeText(r.constraints[t.key],t.unit)}</span></div>`).join('')}</div><details class="more-nutrients"><summary>See targets & solver details</summary><table><thead><tr><th>Nutrient</th><th>Daily average</th><th>Daily range</th></tr></thead><tbody>${nutrientTargets.map(t=>`<tr><td>${t.name}</td><td>${r.nutrients[t.key].toFixed(1)} ${t.unit}</td><td>${dailyRangeText(r.constraints[t.key],t.unit)}</td></tr>`).join('')}</tbody></table><p>Relaxed-model cost floor: ${money(r.lowerBound)}. This basket is at most ${gap.toFixed(1)}% above that floor as a share of its checkout cost. This is a conservative bound, not a reported solver optimality gap.</p><p>Dry/raw edible weights follow the source data; cooking changes water weight and can change nutrients. There is no day-by-day meal schedule.</p><button class="text-button" data-view="about">Read the assumptions & data sources ↗</button></details></div>`;
 if(!r.withinBudget)$('#results .result-head h2').textContent='A basket to work toward.';
 $('#download').addEventListener('click',download);
}
function download(){if(result?.status!=='success')return;const rows=shoppingRows(result);const csv=rows.map(row=>row.map(v=>{let s=String(v);if(/^[=+@-]/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"';}).join(',')).join('\r\n');const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='BudgetPlate-Canada-shopping-list.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function priceDetails(food){
 const p=currentPriceSource(food);
 // Only ordinary web URLs can become links, including saved user URLs.
 const link=/^https?:\/\//i.test(p.url)?` <a href="${esc(p.url)}" target="_blank" rel="noopener">Price source ↗</a>`:'';
 return esc(p.text)+link;
}
function nutritionDetails(f){
 const names={calories:'Calories',protein:'Protein',fat:'Fat',carbs:'Carbohydrate',fibre:'Fibre',calcium:'Calcium',iron:'Iron',vitaminC:'Vitamin C',sodium:'Sodium'};
 return `<details class="food-nutrition"><summary>Nutrition facts & source</summary>
  <p><strong>Per 100 g edible food</strong><br>${esc(f.basis)}.</p>
  <dl class="food-nutrient-list">${Object.entries(nutrientUnits).map(([key,unit])=>`<div><dt>${names[key]}</dt><dd>${f.nutrients[key]} ${unit}</dd></div>`).join('')}</dl>
  <p>${esc(f.nutritionNote||f.referenceNote||'Match the reference preparation to the food you use.')}</p>
  <p class="field-note">${esc(f.usdaDescription)}<br>${esc(f.source)}. <a href="${esc(f.nutritionSourceUrl)}" target="_blank" rel="noopener">Official USDA dataset ↗</a></p>
  <p class="field-note">${esc(f.quantityNote||f.yieldNote||'Pack weight, edible percentage and weekly limit are model inputs.')} Actual products and preparation may differ.</p>
 </details>`;
}
function catalog(){
 const search=$('#search').value.toLowerCase();
 $('#catalog').innerHTML=foods.filter(f=>f.name.toLowerCase().includes(search)).map(f=>`<article class="card food-edit ${f.enabled?'':'disabled'}" data-id="${f.id}">
  <label class="check"><input type="checkbox" data-field="enabled" ${f.enabled?'checked':''} aria-label="Allow ${esc(f.name)}"><span>${esc(f.name)}</span></label>
  ${f.custom?'<span class="custom-source">ADDED BY YOU · USDA NUTRITION</span>':''}
  <div class="meta">${esc(f.package)} · ${Math.round(f.grams*f.edibleYield)} edible g / unit</div>
  <div class="edit-pair"><div><label for="price-${f.id}">Price per unit · CAD</label><input id="price-${f.id}" type="number" min="0.01" max="1000" step="0.01" data-field="price" value="${f.price}" required></div><div><label for="pantry-${f.id}">Already have · edible g</label><input id="pantry-${f.id}" type="number" min="0" max="100000" step="1" data-field="pantry" value="${f.pantry}" required></div></div>
  <p class="field-note">${esc(f.basis)}. Weekly cap: ${qty(f.maxGrams)}.</p>
  <button type="button" class="secondary must-toggle" data-favourite="${f.id}" aria-pressed="${!!f.minGrams}">${f.minGrams?'Must include ✓':'Must include'}</button>
  <span class="badge price-status">${priceLabel(f)}</span>
  ${f.custom?`<div class="custom-food-actions"><button type="button" class="text-button" data-edit-food="${f.id}">Edit food & pack</button><button type="button" class="text-button" data-delete-food="${f.id}" aria-label="Remove ${esc(f.name)} from my foods">Remove food</button></div>`:''}
  <details><summary>Store & price source</summary><p class="field-note price-provenance">${priceDetails(f)}</p>
   <label for="store-${f.id}">Store / location</label><input id="store-${f.id}" data-field="store" value="${esc(f.store)}" placeholder="e.g. store name, street">
   <label for="date-${f.id}">Price observed on</label><input id="date-${f.id}" data-field="observed" type="date" value="${esc(f.observed)}">
   <label for="url-${f.id}">Source URL (optional)</label><input id="url-${f.id}" data-field="url" type="url" value="${esc(f.url)}" placeholder="https://…">
  </details>${nutritionDetails(f)}
 </article>`).join('')||'<div class="catalog-empty"><p>No matching foods in your list.</p><button type="button" class="secondary" data-open-add>Find it in the USDA library</button></div>';
}
$('#search').addEventListener('input',catalog);
$('#catalog').addEventListener('change',e=>{const key=e.target.dataset.field;if(!key)return;const f=foods.find(f=>f.id===e.target.closest('[data-id]').dataset.id);if(!e.target.checkValidity()){e.target.reportValidity();e.target.value=f[key];return;}f[key]=e.target.type==='checkbox'?e.target.checked:e.target.type==='number'?Number(e.target.value):e.target.value;if(key==='price'){f.priceStatus='user';e.target.closest('article').querySelector('.price-status').textContent=priceLabel(f);}if(['price','url'].includes(key))e.target.closest('article').querySelector('.price-provenance').innerHTML=priceDetails(f);e.target.closest('article').classList.toggle('disabled',!f.enabled);save();stale();renderPreferenceIssues();});
$('#reset').addEventListener('click',()=>{if(confirm('Reset the original foods, prices, pantry amounts and must-includes to the reference defaults? Your added foods will be kept.')){foods=[...restoreFoods(base),...foods.filter(f=>f.custom)];save();stale();catalog();renderFavourites();}});
catalog();

function renderPreferenceIssues(){
 const issues=preferenceIssues(foods,settings),box=$('#preference-issues');
 box.hidden=!issues.length;box.className='alert';
 box.innerHTML=issues.length?`<strong>Check your choices</strong><ul>${issues.map(s=>`<li>${esc(s)}</li>`).join('')}</ul>`:'';
 return issues.length;
}
function renderFavourites(){
 const chosen=foods.filter(f=>f.minGrams>0);
 $('#favourite-food').innerHTML='<option value="">Select a food…</option>'+foods.filter(f=>!f.minGrams).map(f=>`<option value="${f.id}">${esc(f.name)}</option>`).join('');
 $('#favourite-list').innerHTML=chosen.length?chosen.map(f=>`<div class="favourite-row" data-food="${f.id}"><div><strong>${esc(f.name)}</strong><span class="food-sub">${esc(f.basis)} · max ${qty(f.maxGrams)} / week</span></div><div><label for="minimum-${f.id}">At least this much / week (g)</label><input id="minimum-${f.id}" data-minimum="${f.id}" type="number" min="1" max="${f.maxGrams}" step="1" value="${f.minGrams}" required></div><button type="button" class="text-button" data-remove-favourite="${f.id}" aria-label="Remove ${esc(f.name)} from must include">Remove</button></div>`).join(''):'<p class="no-favourites">No must-includes yet. Choose a food above, or let the app choose everything.</p>';
 document.querySelectorAll('.quick-picks [data-favourite]').forEach(b=>{const f=foods.find(f=>f.id===b.dataset.favourite);b.disabled=!!f.minGrams;b.setAttribute('aria-pressed',String(!!f.minGrams));});
 renderPreferenceIssues();
}
function selectFavourite(id,remove=false){
 const f=foods.find(f=>f.id===id);if(!f)return;
 f.minGrams=remove?0:(f.minGrams||defaultMinimum(f));
 save();stale();renderFavourites();catalog();
}
document.addEventListener('click',e=>{
 const add=e.target.closest('[data-favourite]'),remove=e.target.closest('[data-remove-favourite]');
 if(add){const f=foods.find(f=>f.id===add.dataset.favourite);selectFavourite(f.id,add.classList.contains('must-toggle')&&f.minGrams>0);}
 if(remove)selectFavourite(remove.dataset.removeFavourite,true);
});
$('#add-favourite').addEventListener('click',()=>{const select=$('#favourite-food');if(!select.value){select.focus();return;}selectFavourite(select.value);});
$('#favourite-list').addEventListener('input',e=>{
 const id=e.target.dataset.minimum;if(!id)return;stale();
 if(e.target.checkValidity()){foods.find(f=>f.id===id).minGrams=Number(e.target.value);save();renderPreferenceIssues();}
});
renderFavourites();

let removedFood=null;
initFoodLibrary({getFoods:()=>foods,onCommit:(food,editing)=>{
 const index=foods.findIndex(f=>f.id===food.id);if(index<0)foods.push(food);else foods[index]=food;
 stale();$('#search').value=food.name;view('prices');catalog();renderFavourites();
 const box=$('#food-feedback');box.hidden=false;box.className='food-feedback';box.innerHTML=`<span><strong>${esc(food.name)}</strong> ${editing?'updated':'added'}. ${food.minGrams?'It is marked Must include.':'Use Must include if you want it in your next plan.'}</span><button type="button" class="secondary" data-view="plan">Plan my week</button>`;
 save();box.scrollIntoView({behavior:'smooth',block:'center'});
}});
document.addEventListener('click',e=>{
 const remove=e.target.closest('[data-delete-food]');
 if(remove){const food=foods.find(f=>f.id===remove.dataset.deleteFood);if(!food?.custom)return;removedFood=food;foods=foods.filter(f=>f.id!==food.id);stale();catalog();renderFavourites();const box=$('#food-feedback');box.hidden=false;box.className='food-feedback';box.innerHTML=`<span>${esc(food.name)} removed.</span><button type="button" class="secondary" id="undo-food-delete">Undo</button>`;save();}
 if(e.target.closest('#undo-food-delete')&&removedFood){foods.push(removedFood);removedFood=null;stale();catalog();renderFavourites();$('#food-feedback').hidden=true;save();}
});
