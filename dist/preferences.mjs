import {customFoodIssues,fitsDiet} from './food-library.mjs';
export const defaultMinimum = f => Math.min(f.maxGrams, ({f10:300,f17:350,icecream_vanilla:150}[f.id] || 100));
export function restoreFoods(base,saved=[]){
 if(!Array.isArray(saved))saved=[];
 const restored=base.map(f=>{const old=saved.find(x=>x?.id===f.id)||{};const edits={};
  for(const k of ['price','pantry','enabled','store','observed','url','minGrams'])if(Object.hasOwn(old,k))edits[k]=old[k];
  // Upgrade old demo labels without replacing saved prices or reviving old nutrition.
  if(old.priceStatus==='user'||(Number.isFinite(old.price)&&old.price!==f.price))edits.priceStatus='user';
  return {...f,minGrams:0,...edits};
 });
 const seen=new Set(restored.map(f=>f.id));
 for(const f of saved)if(f?.custom&&!seen.has(f.id)&&!customFoodIssues(f).length){restored.push(f);seen.add(f.id);}
 return restored;
}
export function preferenceIssues(foods,settings){
 const issues=[];
 for(const f of foods){const min=f.minGrams??0;
  if(!Number.isFinite(min)||min<0||!Number.isInteger(min)){issues.push(`Choose a whole number of grams for ${f.name}.`);continue;}
  if(!min)continue;
  if(min>f.maxGrams)issues.push(`${f.name}: your minimum is above its ${f.maxGrams} g weekly limit. Lower the amount.`);
  if(!f.enabled)issues.push(`${f.name} is switched off. Allow it in Pantry & prices or remove it from Must include.`);
  else if(!fitsDiet(f,settings))issues.push(f.custom&&f.dietProfile==='unknown'?`${f.name}: dietary details are not checked yet. Edit this food in Pantry & prices before using dietary filters.`:`${f.name} conflicts with your dietary settings. Change those settings or remove this must-include food.`);
 }
 return issues;
}
