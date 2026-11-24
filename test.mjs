import assert from 'node:assert/strict';
import fs from 'node:fs';
import {optimize,defaults,eligible,buildModel,validate} from './dist/model.mjs';
import {restoreFoods,preferenceIssues} from './dist/preferences.mjs';
const foods=JSON.parse(fs.readFileSync(new URL('./dist/foods.json',import.meta.url)));
for(const diet of ['any','vegetarian','vegan','no-pork']){
 const settings={...defaults,diet},r=optimize(foods,settings);
 assert.equal(r.status,'success',diet);assert(r.total>=r.lowerBound-0.01);assert(r.items.every(f=>eligible(f,settings)&&Number.isInteger(f.packs)&&f.used<=f.maxGrams+0.001&&f.left>=-0.001));
 assert(Math.abs(r.total-r.items.reduce((a,f)=>a+f.price*f.packs,0))<0.001);
 const reconstructed={feasible:true};for(const f of r.items){reconstructed['eat_'+f.id]=f.used/100;reconstructed['buy_'+f.id]=f.packs;}assert(validate(buildModel(foods,settings),reconstructed));
 console.log(diet,JSON.stringify({cost:r.total,bound:r.lowerBound,items:r.items.length}));
}
assert.equal(optimize(foods.map(f=>({...f,enabled:false})),defaults).status,'infeasible');
const low=optimize(foods,{...defaults,budget:1});assert.equal(low.status,'success');assert.equal(low.withinBudget,false);
const pantry=optimize(foods.map(f=>({...f,pantry:f.maxGrams})),defaults);assert.equal(pantry.status,'success');assert.equal(pantry.total,0);
const dairy=optimize(foods,{...defaults,dairyFree:true});assert.equal(dairy.status,'success');assert(dairy.items.every(f=>!f.dairy));
console.log('PASS: dietary filters, package integrality, all constraints, costs, infeasibility, low budget, pantry, dairy exclusion.');

const picks={f10:300,f17:350,icecream_vanilla:150};
const chosen=foods.map(f=>({...f,minGrams:picks[f.id]||0}));
const requested=optimize(chosen,defaults);
assert.equal(requested.status,'success');
for(const [id,grams]of Object.entries(picks)){
 const item=requested.items.find(f=>f.id===id);
 assert(item&&item.used>=grams-0.01,`${id} must be eaten, not just bought`);
 assert(item.packs>=1);
}
const rebuilt={feasible:true};for(const f of requested.items){rebuilt['eat_'+f.id]=f.used/100;rebuilt['buy_'+f.id]=f.packs;}
assert(validate(buildModel(chosen,defaults),rebuilt));
const stock=optimize(chosen.map(f=>({...f,pantry:f.maxGrams})),defaults);
assert.equal(stock.status,'success');assert.equal(stock.total,0);
for(const [id,grams]of Object.entries(picks))assert(stock.items.find(f=>f.id===id).used>=grams-0.01);
for(const settings of [{...defaults,diet:'vegetarian'},{...defaults,diet:'vegan'},{...defaults,dairyFree:true}])assert.equal(optimize(chosen,settings).status,'preferences');
assert(preferenceIssues(chosen.map(f=>f.id==='f10'?{...f,enabled:false}:f),defaults).some(x=>x.includes('switched off')));
assert.equal(optimize(chosen.map(f=>({...f,minGrams:f.maxGrams+1})),defaults).status,'preferences');
for(const invalid of [NaN,-1,Infinity,1.5])assert(preferenceIssues([{...foods[0],minGrams:invalid}],defaults).length);
const overBudget=optimize(chosen,{...defaults,budget:1});assert.equal(overBudget.status,'success');assert.equal(overBudget.withinBudget,false);
for(const id of Object.keys(picks))assert(overBudget.items.some(f=>f.id===id));
const saved=restoreFoods(foods,[{id:'f10',price:9,pantry:100,minGrams:300}]);
assert.equal(saved.find(f=>f.id==='f10').minGrams,300);assert.equal(saved.find(f=>f.id==='f10').price,9);assert.equal(saved.find(f=>f.id==='icecream_vanilla').minGrams,0);
assert(restoreFoods(foods).every(f=>f.minGrams===0));
console.log('PASS: chicken, tofu and ice cream required together; pantry covers favourites; dietary conflicts; disabled foods; caps; invalid quantities; budget shortfall preserves choices; saved choices migrate.');
console.log('Must-include example checkout:',requested.total.toFixed(2));
