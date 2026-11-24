// General adult starting references; the UI links their sources and app choices.
export const nutrientTargets=[
 {key:'calories',name:'Calories',unit:'kcal',minKey:'calories',maxKey:'caloriesMax',inputMax:8000},
 {key:'protein',name:'Protein',unit:'g',minKey:'protein',inputMax:500},
 {key:'carbs',name:'Carbohydrates',unit:'g',minKey:'carbsMin',maxKey:'carbsMax',inputMax:1500},
 {key:'fat',name:'Fat',unit:'g',minKey:'fatMin',maxKey:'fatMax',inputMax:500},
 {key:'fibre',name:'Fibre',unit:'g',minKey:'fibre',maxKey:'fibreMax',inputMax:200},
 {key:'sodium',name:'Sodium',unit:'mg',maxKey:'sodiumMax',inputMax:10000},
 {key:'calcium',name:'Calcium',unit:'mg',minKey:'calciumMin',maxKey:'calciumMax',inputMax:5000},
 {key:'iron',name:'Iron',unit:'mg',minKey:'ironMin',maxKey:'ironMax',inputMax:100},
 {key:'vitaminC',name:'Vitamin C',unit:'mg',minKey:'vitaminCMin',maxKey:'vitaminCMax',inputMax:4000}
];
const round=x=>Math.round(x*10)/10;
export function nutritionDefaults(calories=2000){
 return {calories,caloriesMax:round(calories*1.1),protein:round(calories*.15/4),
  carbsMin:round(calories*.45/4),carbsMax:round(calories*.65/4),
  fatMin:round(calories*.2/9),fatMax:round(calories*.35/9),
  fibre:28,fibreMax:70,sodiumMax:2300,
  calciumMin:1300,calciumMax:2500,ironMin:18,ironMax:45,vitaminCMin:90,vitaminCMax:2000};
}
export const defaults={budget:60,...nutritionDefaults(),diet:'any',dairyFree:false,variety:true};
export function restoreSettings(saved={}){
 if(!saved||typeof saved!=='object'||Array.isArray(saved))saved={};
 const calories=Number.isFinite(saved.calories)?saved.calories:defaults.calories;
 const restored={...defaults,...nutritionDefaults(calories)};
 for(const key of Object.keys(defaults))if(Object.hasOwn(saved,key)&&saved[key]!==undefined)restored[key]=saved[key];
 return restored;
}
export function updateCalorieDefaults(settings,previousCalories,customKeys=[]){
 const next={...settings};
 if(!Number.isFinite(next.calories)||next.calories<1200||next.calories>4000)return next;
 const previous=nutritionDefaults(previousCalories),fresh=nutritionDefaults(next.calories),custom=new Set(customKeys);
 for(const key of ['caloriesMax','protein','carbsMin','carbsMax','fatMin','fatMax']){
  if(!custom.has(key)&&next[key]===previous[key])next[key]=fresh[key];
 }
 return next;
}
export function resetNutrition(settings){
 const calories=Number.isFinite(settings.calories)&&settings.calories>=1200&&settings.calories<=4000?settings.calories:2000;
 return {...settings,...nutritionDefaults(calories)};
}
export function settingsIssues(s){
 const issues=[];
 if(!Number.isFinite(s.budget)||s.budget<0||s.budget>1000)issues.push({field:'budget',message:'Enter a weekly budget from $0 to $1,000.'});
 for(const t of nutrientTargets){
  for(const [bound,field]of [['minimum',t.minKey],['maximum',t.maxKey]]){
   if(!field)continue;
   const value=s[field],min=field==='calories'?1200:0,max=field==='calories'?4000:t.inputMax;
   if(!Number.isFinite(value)||value<min||value>max)issues.push({field,message:`${t.name} ${bound}: enter a number from ${min} to ${max} ${t.unit}/day.`});
  }
  if(t.minKey&&t.maxKey&&Number.isFinite(s[t.minKey])&&Number.isFinite(s[t.maxKey])&&s[t.minKey]>s[t.maxKey]){
   issues.push({field:t.maxKey,message:`${t.name}: the maximum must be at least the minimum.`});
  }
 }
 return issues;
}
export function weeklyNutrientBounds(s){
 return Object.fromEntries(nutrientTargets.map(t=>[t.key,{
  ...(t.minKey?{min:s[t.minKey]*7}:{}),...(t.maxKey?{max:s[t.maxKey]*7}:{})
 }]));
}
export function dailyRangeText(bounds,unit){
 const format=value=>new Intl.NumberFormat('en-CA',{maximumFractionDigits:1}).format(value/7);
 if(bounds.min!==undefined&&bounds.max!==undefined)return `${format(bounds.min)}–${format(bounds.max)} ${unit}`;
 if(bounds.min!==undefined)return `At least ${format(bounds.min)} ${unit}`;
 return `At most ${format(bounds.max)} ${unit}`;
}
