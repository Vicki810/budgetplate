export const nutrientUnits={calories:'kcal',protein:'g',fat:'g',carbs:'g',fibre:'g',calcium:'mg',iron:'mg',vitaminC:'mg',sodium:'mg'};
export const dietProfiles={
 unknown:{label:'Not checked yet',vegetarian:false,vegan:false,dairy:true,pork:true},
 vegan:{label:'Plant-based / vegan',vegetarian:true,vegan:true,dairy:false,pork:false},
 eggs:{label:'Vegetarian, no dairy (e.g. eggs)',vegetarian:true,vegan:false,dairy:false,pork:false},
 dairy:{label:'Vegetarian, contains dairy',vegetarian:true,vegan:false,dairy:true,pork:false},
 meat:{label:'Meat or fish, no pork or dairy',vegetarian:false,vegan:false,dairy:false,pork:false},
 meatDairy:{label:'Meat or fish with dairy, no pork',vegetarian:false,vegan:false,dairy:true,pork:false},
 pork:{label:'Contains pork, no dairy',vegetarian:false,vegan:false,dairy:false,pork:true},
 porkDairy:{label:'Contains pork and dairy',vegetarian:false,vegan:false,dairy:true,pork:true}
};
export const foodGroups={Protein:'Protein food',Fruit:'Fruit',Vegetable:'Vegetable (not starchy)',Starchy:'Starchy vegetable',Wholegrain:'Whole grain',Other:'Other / mixed food'};
export function fitsDiet(f,s){
 if(f.custom&&f.dietProfile==='unknown'&&(s.diet!=='any'||s.dairyFree))return false;
 return (s.diet!=='vegetarian'||f.vegetarian)&&(s.diet!=='vegan'||f.vegan)&&(s.diet!=='no-pork'||!f.pork)&&(!s.dairyFree||!f.dairy);
}
const normalize=s=>s.toLowerCase().replace(/icecream/g,'ice cream').replace(/groundbeef/g,'ground beef').replace(/chichen/g,'chicken').replace(/aubergine/g,'eggplant').replace(/courgette/g,'zucchini').replace(/\bfilets?\b/g,'fillet').replace(/\bmince[d]?\b/g,'ground').replace(/[^a-z0-9]+/g,' ').trim().split(/\s+/).map(w=>w.length>3?w.replace(/ies$/,'y').replace(/(potato|tomato|mango)es$/,'$1').replace(/s$/,''):w);
export function searchGroceries(choices,query){
 const terms=normalize(query).filter(Boolean);
 if(!terms.length){const popular=['chicken-breast','lean-ground-beef','salmon-fillet','salmon-steak','firm-tofu','eggs','2%-milk','rolled-oats'];return popular.map(id=>choices.find(f=>f.id===id)).filter(Boolean);}
 return choices.map((f,index)=>{
  const name=normalize(f.name),aliases=normalize((f.aliases||[]).join(' ')),form=normalize(f.form),words=[...name,...aliases,...form];
  if(!terms.every(t=>words.some(w=>w===t||t.length>=2&&w.startsWith(t))))return null;
  let score=terms.reduce((n,t)=>n+(name.includes(t)?20:aliases.includes(t)?10:1),0);
  if(name.join(' ')===terms.join(' '))score+=100;
  if(terms.every(t=>name.includes(t)))score+=20;
  return {f,score,index};
 }).filter(Boolean).sort((a,b)=>b.score-a.score||a.index-b.index).map(x=>x.f);
}
export function withGroceryChoice(record,choice){
 if(!record||!choice||record.fdcId!==choice.fdcId)throw Error('This grocery choice has no matching nutrition reference.');
 return {...record,groceryChoice:choice};
}
export function groceryBasis(choice){
 const form=choice.form.toLowerCase();
 if(form.includes('drained'))return 'Drained edible weight';
 if(form==='dry')return 'Dry weight; cook before eating';
 if(form.includes('raw'))return form.includes('bone-in')?'Raw edible weight; bones excluded':'Raw edible weight';
 if(form.includes('frozen'))return 'Frozen edible weight';
 if(form==='fresh')return 'Fresh edible weight';
 return 'Edible weight as sold';
}
export function searchUSDA(records,query){
 const terms=normalize(query).filter(Boolean);if(!terms.length)return [];
 return records.map(f=>{const words=normalize(f.description),hay=words.join(' ');if(!terms.every(t=>hay.includes(t)))return null;
  let score=terms.reduce((a,t)=>a+(words.includes(t)?15:0),0)-f.description.length/100;
  if(/\braw\b/i.test(f.description))score+=3;
  if(f.fdcId==='172390'&&terms.includes('wing')&&!terms.includes('cooked')&&!terms.includes('fried'))score+=20;
  return {f,score};
 }).filter(Boolean).sort((a,b)=>b.score-a.score).map(x=>x.f);
}
export function foodDefaults(record){
 const d=record.description.toLowerCase(),c=record.categoryId;
 let profile='unknown',group='Other';
 // Only plain foods with an explicit raw state get an inferred dietary profile.
 if(/\braw\b/.test(d)&&!["breaded","with sauce","stuffed","mixture"].some(s=>d.includes(s))){
  if([5,13,15,17].includes(c))profile='meat';
  if(c===10)profile='pork';
  if([9,11,12,16,20].includes(c))profile='vegan';
 }
 if([5,10,12,13,15,16,17].includes(c))group='Protein';
 if(c===9&&!/juice|nectar/.test(d))group='Fruit';
 if(c===11)group=/potato|corn|cassava|yam|taro|plantain/.test(d)?'Starchy':'Vegetable';
 const choice=record.groceryChoice;
 return {name:choice?.name||(record.fdcId==='172390'?'Chicken wings (raw, meat & skin)':record.description),
  grams:1000,ediblePercent:choice?.ediblePercent??record.ediblePercent??100,price:'',maxGrams:1000,dietProfile:choice?.dietProfile||profile,foodGroup:choice?.foodGroup||group,store:'',minGrams:0};
}
export function customFoodIssues(f){
 const errors=[];
 if(!/^custom_[a-zA-Z0-9_-]+$/.test(f.id||''))errors.push('Invalid food identifier.');
 if(typeof f.name!=='string'||!f.name.trim()||f.name.length>200)errors.push('Enter a food name (up to 200 characters).');
 for(const [key,min,max,label]of [['price',0.01,1000,'Price'],['grams',1,100000,'Pack weight'],['edibleYield',0.01,1,'Edible proportion'],['maxGrams',1,10000,'Weekly limit'],['pantry',0,100000,'Pantry amount'],['minGrams',0,10000,'Must-include amount']]){
  if(!Number.isFinite(f[key])||f[key]<min||f[key]>max)errors.push(`${label} must be between ${min} and ${max}.`);
 }
 if(!Number.isInteger(f.maxGrams)||!Number.isInteger(f.minGrams))errors.push('Weekly amounts must be whole grams.');
 if(f.minGrams>f.maxGrams)errors.push('Your must-include amount is above the weekly limit.');
 for(const key of Object.keys(nutrientUnits))if(!Number.isFinite(f.nutrients?.[key])||f.nutrients[key]<0)errors.push(`Missing ${key} data. Choose another USDA entry.`);
 if(!dietProfiles[f.dietProfile]||!foodGroups[f.foodGroup])errors.push('Choose valid dietary and food-group settings.');
 if(!/^\d+$/.test(f.fdcId||''))errors.push('Choose a USDA nutrition record.');
 return errors;
}
export function createCustomFood(record,inputs,id){
 const profile=dietProfiles[inputs.dietProfile]||dietProfiles.unknown;
 const choice=record.groceryChoice;
 const f={id,custom:true,fdcId:record.fdcId,ndbId:record.ndbId,usdaDescription:record.description,
  category:record.category,categoryId:record.categoryId,name:String(inputs.name).trim(),
  package:`${Number(inputs.grams)} g pack`,price:Number(inputs.price),grams:Number(inputs.grams),edibleYield:Number(inputs.ediblePercent)/100,
  nutrients:{...record.nutrients},maxGrams:Number(inputs.maxGrams),minGrams:Number(inputs.minGrams),pantry:Number(inputs.pantry??0),
  enabled:inputs.enabled??true,store:inputs.store||'',observed:inputs.observed||'',url:inputs.url||'',priceStatus:'user',
  dietProfile:inputs.dietProfile,foodGroup:inputs.foodGroup,group:inputs.foodGroup==='Protein'?'Protein':'Other',
  vegetarian:profile.vegetarian,vegan:profile.vegan,dairy:profile.dairy,pork:profile.pork,
  fruit:inputs.foodGroup==='Fruit',vegetable:['Vegetable','Starchy'].includes(inputs.foodGroup),
  nonstarchy:inputs.foodGroup==='Vegetable',wholegrain:inputs.foodGroup==='Wholegrain',
  basis:choice?groceryBasis(choice):record.fdcId==='172390'?'Raw edible meat & skin; bones excluded':`Edible weight as described by USDA: ${record.description}`,
  commonFoodId:choice?.id||inputs.commonFoodId||null,referenceNote:choice?.referenceNote||inputs.referenceNote||'',yieldNote:choice?.yieldNote||inputs.yieldNote||'',
  source:`USDA FoodData Central · SR Legacy (April 2018) · FDC ${record.fdcId} / NDB ${record.ndbId}`,
  nutritionSourceUrl:'https://fdc.nal.usda.gov/download-datasets/',
  usdaEdiblePercent:record.ediblePercent??null,refuseNote:record.refuseNote||''};
 const errors=customFoodIssues(f);if(errors.length)throw new Error(errors.join(' '));
 return f;
}
