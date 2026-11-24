import {searchUSDA,searchGroceries,withGroceryChoice,foodDefaults,createCustomFood,dietProfiles,foodGroups,nutrientUnits} from './food-library.mjs';
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=n=>new Intl.NumberFormat('en-CA',{style:'currency',currency:'CAD'}).format(n);
export function initFoodLibrary({getFoods,onCommit}){
 const $=s=>document.querySelector(s),dialog=$('#add-food-dialog'),form=$('#new-food-form');
 let library=null,loading=null,selected=null,editing=null,limit=8,detailed=false;
 $('#new-diet').innerHTML=Object.entries(dietProfiles).map(([k,v])=>`<option value="${k}">${esc(v.label)}</option>`).join('');
 $('#new-group').innerHTML=Object.entries(foodGroups).map(([k,v])=>`<option value="${k}">${esc(v)}</option>`).join('');
 async function load(){
  if(library)return library;
  if(!loading)loading=Promise.all(['usda-library.json','grocery-choices.json'].map(path=>fetch(path).then(r=>{if(!r.ok)throw Error('Could not load the food library. Check your connection and try again.');return r.json();}))).then(([data,common])=>{library={...data,choices:common.choices};return library;}).finally(()=>{loading=null;});
  return loading;
 }
 function renderSearch(){
  if(!library)return;
  const query=$('#usda-search').value.trim(),matches=detailed?searchUSDA(library.foods,query):searchGroceries(library.choices,query);
  $('#usda-status').textContent=detailed?(query?`${matches.length.toLocaleString()} detailed USDA records. Match the food and preparation carefully.`:'Detailed USDA search. Enter a food name to see the original records.'):(query?`${matches.length} everyday ${matches.length===1?'choice':'choices'}. Pick the one that matches your groceries.`:'A few everyday favourites. Search by the name on the package.');
  $('#usda-matches').innerHTML=matches.slice(0,limit).map(f=>detailed?`<button type="button" class="nutrition-choice" data-usda="${f.fdcId}"><strong>${esc(f.description)}</strong><span>${f.nutrients.calories} kcal · ${f.nutrients.protein} g protein per 100 g edible</span></button>`:`<button type="button" class="nutrition-choice" data-grocery="${esc(f.id)}"><strong>${esc(f.name)}</strong><span>${esc(f.form)}</span></button>`).join('');
  if(query&&!matches.length)$('#usda-matches').innerHTML=detailed?'<p class="library-empty">No match with complete nutrition data. Try a simpler name or another preparation.</p>':'<p class="library-empty">No everyday match yet. Try a simpler name, or open the detailed USDA search below.</p>';
  $('#usda-more').hidden=matches.length<=limit;
  $('#back-simple-search').hidden=!detailed;$('#advanced-food-search').hidden=detailed;$('#food-search-examples').hidden=detailed;
  $('#usda-search').placeholder=detailed?'Search the original USDA descriptions…':'Try lean ground beef or salmon fillet…';
 }
 function showPicker(){selected=null;$('#food-lookup').hidden=false;$('#food-details').hidden=true;$('#add-food-title').textContent='Add a food';$('#usda-search').focus();renderSearch();}
 function updatePreview(){
  const grams=Number($('#new-grams').value),percent=Number($('#new-yield').value),price=Number($('#new-price').value);
  const edible=grams*percent/100;
  $('#package-preview').textContent=edible>0&&Number.isFinite(edible)?`${grams.toLocaleString()} g pack → ${Math.round(edible).toLocaleString()} g edible${price>0?` · ${money(price/edible*100)} per 100 g edible`:''}.`:'';
  $('#new-minimum-wrap').hidden=!$('#new-required').checked;$('#new-minimum').disabled=!$('#new-required').checked;
  $('#new-minimum').max=$('#new-cap').value;
  $('#diet-review-note').textContent=$('#new-diet').value==='unknown'?'Not checked: this food will be left out when a dietary filter is on. Open “Dietary details & weekly limit” to choose a profile.':'You can change the dietary details above. For packaged or prepared foods, check the ingredients.';
 }
 function choose(record,old=null){
  selected=record;const d=old?{...old,ediblePercent:old.edibleYield*100}:foodDefaults(record);
  $('#food-lookup').hidden=true;$('#food-details').hidden=false;$('#add-food-title').textContent=old?'Edit your food':'Your food, your price';
  const choice=record.groceryChoice;
  $('#selected-description').closest('details').open=false;
  $('#selected-name').textContent=old?.name||choice?.name||record.description;
  $('#selected-form').textContent=choice?.form||'Detailed USDA selection';
  $('#selected-description').textContent=`USDA reference: ${record.description}`;
  $('#selected-reference-note').textContent=choice?.referenceNote||old?.referenceNote||'Typical nutrition for this reference food. Actual products may differ.';
  $('#category-source-link').hidden=!choice?.categorySourceUrl;if(choice?.categorySourceUrl)$('#category-source-link').href=choice.categorySourceUrl;
  $('#selected-source').textContent=`USDA SR Legacy · FDC ${record.fdcId} · NDB ${record.ndbId}`;
  $('#nutrition-preview').innerHTML=[['calories','Calories'],['protein','Protein'],['fibre','Fibre']].map(([k,label])=>`<div><strong>${record.nutrients[k]}<small> ${nutrientUnits[k]}</small></strong><span>${label}</span></div>`).join('');
  $('#all-food-nutrients').innerHTML=Object.entries(record.nutrients).map(([key,n])=>`<div><dt>${key==='vitaminC'?'Vitamin C':key}</dt><dd>${n} ${nutrientUnits[key]}</dd></div>`).join('');
  const fields={name:'name',price:'price',grams:'grams',yield:'ediblePercent',cap:'maxGrams',diet:'dietProfile',group:'foodGroup',store:'store'};
  for(const [el,key]of Object.entries(fields))$('#new-'+el).value=d[key];
  $('#new-required').checked=d.minGrams>0;$('#new-minimum').value=d.minGrams||150;
  $('#new-diet-details').open=false;$('#new-food-error').hidden=true;$('#new-food-submit').textContent=old?'Save changes':'Add to my foods';
  $('#change-nutrition').hidden=!!old;
  $('#yield-note').textContent=choice?.yieldNote||old?.yieldNote||(choice?.ediblePercent===100?'Assumes the full pack weight is edible. Adjust if you discard bones, skin or other waste.':record.ediblePercent!==undefined?`USDA estimate: ${100-record.ediblePercent}% removed. Adjust the edible percentage for your actual pack.`:'100% assumes all of the pack is edible. Lower it for bones, peel or other waste.');
  $('#state-note').textContent=choice?.packageNote||(choice?.form==='Dry'?'Enter dry pack weight. Cook before eating.':/\braw\b/i.test(record.description)?'Enter raw pack weight. Cooking weight changes are not modeled.':/cooked|roasted|fried|baked|boiled|stewed/i.test(record.description)&&!choice?'Enter weight in this cooked/prepared form, not raw grocery-pack weight.':'Enter pack weight in grams, not millilitres.');
  updatePreview();dialog.scrollTop=0;$('#new-price').focus();
 }
 async function open(id=null){
  editing=id?getFoods().find(f=>f.id===id):null;
  form.reset();$('#usda-search').value='';$('#usda-matches').innerHTML='';$('#usda-more').hidden=true;$('#usda-status').textContent='Loading foods…';limit=8;detailed=false;$('#advanced-food-search').open=false;
  showPicker();dialog.showModal();$('#usda-search').focus();
  try{await load();if(!dialog.open)return;renderSearch();if(editing){const record=library.foods.find(f=>f.fdcId===editing.fdcId);if(!record)throw Error('This nutrition record could not be loaded. Please try again.');const choice=library.choices.find(f=>f.id===editing.commonFoodId&&f.fdcId===record.fdcId);choose(choice?withGroceryChoice(record,choice):record,editing);}}
  catch(error){$('#usda-status').textContent=error.message;$('#usda-matches').innerHTML='<button type="button" class="secondary" id="retry-usda">Try loading again</button>';}
 }
 document.addEventListener('click',e=>{
  if(e.target.closest('[data-open-add]'))open();
  const edit=e.target.closest('[data-edit-food]');if(edit)open(edit.dataset.editFood);
  const pick=e.target.closest('[data-usda]');if(pick)choose(library.foods.find(f=>f.fdcId===pick.dataset.usda));
  const grocery=e.target.closest('[data-grocery]');if(grocery){const choice=library.choices.find(f=>f.id===grocery.dataset.grocery);choose(withGroceryChoice(library.foods.find(f=>f.fdcId===choice.fdcId),choice));}
  const example=e.target.closest('[data-food-query]');if(example){$('#usda-search').value=example.dataset.foodQuery;limit=8;renderSearch();}
  if(e.target.closest('#retry-usda'))open(editing?.id);
 });
 $('#close-add-food').addEventListener('click',()=>dialog.close());
 $('#cancel-new-food').addEventListener('click',()=>dialog.close());
 $('#change-nutrition').addEventListener('click',showPicker);
 $('#usda-search').addEventListener('input',()=>{limit=8;renderSearch();});
 $('#usda-more').addEventListener('click',()=>{limit+=8;renderSearch();});
 $('#use-detailed-search').addEventListener('click',()=>{detailed=true;limit=8;renderSearch();});
 $('#back-simple-search').addEventListener('click',()=>{detailed=false;limit=8;renderSearch();});
 form.addEventListener('input',updatePreview);
 form.addEventListener('invalid',e=>{const section=e.target.closest('details');if(section)section.open=true;},true);
 form.addEventListener('submit',e=>{
  e.preventDefault();if(!selected||!form.reportValidity())return;
  try{
   const values={name:$('#new-name').value,price:$('#new-price').value,grams:$('#new-grams').value,ediblePercent:$('#new-yield').value,maxGrams:$('#new-cap').value,dietProfile:$('#new-diet').value,foodGroup:$('#new-group').value,store:$('#new-store').value,minGrams:$('#new-required').checked?$('#new-minimum').value:0};
   const food=createCustomFood(selected,{...editing,...values},editing?.id||`custom_${crypto.randomUUID().replaceAll('-','')}`);
   onCommit(food,!!editing);dialog.close();
  }catch(error){$('#new-food-error').hidden=false;$('#new-food-error').textContent=error.message;}
 });
}
