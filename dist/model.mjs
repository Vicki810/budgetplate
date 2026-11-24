import loadHighs from './vendor/highs.mjs';
import {preferenceIssues} from './preferences.mjs';
import {fitsDiet} from './food-library.mjs';
import {restoreSettings,settingsIssues,weeklyNutrientBounds} from './nutrition-targets.mjs';
export {defaults} from './nutrition-targets.mjs';
const highs=await loadHighs();
export function toLP(m){
 const names=Object.keys(m.variables),terms=k=>names.filter(v=>m.variables[v][k]).map(v=>`${m.variables[v][k]<0?'-':'+'} ${Math.abs(m.variables[v][k])} ${v}`).join(' ')||`0 ${names[0]}`;
 const lines=['Minimize',`obj: ${terms('cost')}`,'Subject To'];
 for(const [k,b]of Object.entries(m.constraints)){if(b.min!==undefined)lines.push(`${k}_min: ${terms(k)} >= ${b.min}`);if(b.max!==undefined)lines.push(`${k}_max: ${terms(k)} <= ${b.max}`);}
 lines.push('Bounds',...names.map(v=>`0 <= ${v}`));if(Object.keys(m.ints).length)lines.push('Generals',...Object.keys(m.ints));lines.push('End');return lines.join('\n');
}
function solve(m){const r=highs.solve(toLP(m),{time_limit:6,mip_rel_gap:0.005,output_flag:false});return {feasible:r.Status==='Optimal'||r.Status==='Time limit reached',status:r.Status,result:r.ObjectiveValue,...Object.fromEntries(Object.entries(r.Columns||{}).map(([k,v])=>[k,v.Primal]))};}
export function eligible(f,s){return f.enabled&&fitsDiet(f,s);}
export function buildModel(foods,s,integer=true){
 s=restoreSettings(s);
 const invalid=settingsIssues(s);if(invalid.length)throw new Error(invalid.map(i=>i.message).join(' '));
 const c=weeklyNutrientBounds(s);
 if(s.variety)Object.assign(c,{fruit:{min:7},vegetable:{min:14},nonstarchy:{min:7},wholegrain:{min:3.5},proteinFoods:{min:7}});
 const m={optimize:'cost',opType:'min',constraints:c,variables:{},ints:{},options:{timeout:6000,tolerance:0.005}};
 for(const f of foods.filter(f=>eligible(f,s))){
  const id=f.id,pack=f.grams*f.edibleYield/100,max=f.maxGrams/100;
  c['supply_'+id]={max:f.pantry/100};c['cap_'+id]={min:(f.minGrams??0)/100,max};c['buycap_'+id]={max:Math.ceil(f.maxGrams/(f.grams*f.edibleYield))};
  m.variables['eat_'+id]={cost:0,...f.nutrients,['supply_'+id]:1,['cap_'+id]:1,fruit:f.fruit?1:0,vegetable:f.vegetable?1:0,nonstarchy:(f.nonstarchy??(f.vegetable&&!['Potatoes','Sweet potatoes'].includes(f.name)))?1:0,wholegrain:f.wholegrain?1:0,proteinFoods:f.group==='Protein'?1:0};
  m.variables['buy_'+id]={cost:f.price,['supply_'+id]:-pack,['buycap_'+id]:1};
  if(integer)m.ints['buy_'+id]=1;
 }
 return m;
}
export function validate(model,result,tol=0.001){
 if(!result.feasible)return false;
 for(const [v,c] of Object.entries(model.variables)){const x=result[v]||0;if(!Number.isFinite(x)||x < -tol)return false;if(model.ints[v]&&Math.abs(x-Math.round(x))>tol)return false;}
 for(const [k,b] of Object.entries(model.constraints)){let x=0;for(const [v,c] of Object.entries(model.variables))x+=(result[v]||0)*(c[k]||0);if(b.min!==undefined&&x<b.min-tol||b.max!==undefined&&x>b.max+tol)return false;}
 return true;
}
export function optimize(foods,s){
 s=restoreSettings(s);
 const invalid=settingsIssues(s);if(invalid.length)return {status:'settings',issues:invalid.map(i=>i.message)};
 const issues=preferenceIssues(foods,s);
 if(issues.length)return {status:'preferences',issues};
 if(!foods.some(f=>eligible(f,s)))return {status:'infeasible'};
 const model=buildModel(foods,s),relaxed=buildModel(foods,s,false);
 const lp=solve(relaxed);
 if(lp.status==='Infeasible')return {status:'infeasible'};
 if(lp.status!=='Optimal')return {status:'timeout'};
 const r=solve(model);
 if(!validate(model,r))return {status:'timeout',lowerBound:lp.result};
 const items=foods.map(f=>({...f,used:Math.max(0,(r['eat_'+f.id]||0)*100),packs:Math.round(r['buy_'+f.id]||0)})).filter(f=>f.used>0.001||f.packs>0).map(f=>({...f,cost:f.packs*f.price,left:f.pantry+f.packs*f.grams*f.edibleYield-f.used}));
 const total=items.reduce((a,f)=>a+f.cost,0),nutrients={};
 for(const k of Object.keys(model.constraints).filter(k=>Object.hasOwn(foods[0].nutrients,k)))nutrients[k]=items.reduce((a,f)=>a+f.used/100*f.nutrients[k],0)/7;
 return {status:'success',items,total,nutrients,lowerBound:Math.max(0,lp.result),withinBudget:total<=s.budget+0.005,consumedCost:items.reduce((a,f)=>a+f.used/(f.grams*f.edibleYield)*f.price,0),constraints:model.constraints};
}
