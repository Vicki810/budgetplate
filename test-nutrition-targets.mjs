import assert from 'node:assert/strict';
import fs from 'node:fs';
import {defaults,restoreSettings,nutritionDefaults,updateCalorieDefaults,resetNutrition,settingsIssues,dailyRangeText} from './dist/nutrition-targets.mjs';
import {optimize,buildModel} from './dist/model.mjs';
const foods=JSON.parse(fs.readFileSync(new URL('./dist/foods.json',import.meta.url)));

assert.equal(defaults.carbsMin,225);assert.equal(defaults.carbsMax,325);
assert.equal(defaults.fatMin,44.4);assert.equal(defaults.fatMax,77.8);
assert.equal(defaults.calciumMin,1300);assert.equal(defaults.sodiumMax,2300);
const old={budget:80,calories:2500,protein:100,fibre:35,diet:'vegan',dairyFree:true,variety:false};
const migrated=restoreSettings(old);
for(const [key,value]of Object.entries(old))assert.equal(migrated[key],value,`Keep saved ${key}`);
assert.equal(migrated.carbsMin,281.3);assert.equal(migrated.carbsMax,406.3);assert.equal(migrated.caloriesMax,2750);
assert.equal(migrated.fatMin,55.6);assert.equal(migrated.fatMax,97.2);
assert.deepEqual(restoreSettings(JSON.parse(JSON.stringify(migrated))),migrated);
const scaled=updateCalorieDefaults({...defaults,calories:2400},2000);
assert.equal(scaled.carbsMin,270);assert.equal(scaled.carbsMax,390);assert.equal(scaled.caloriesMax,2640);
const custom=updateCalorieDefaults({...defaults,calories:2400,carbsMax:280,protein:110},2000);
assert.equal(custom.carbsMax,280);assert.equal(custom.protein,110);assert.equal(custom.carbsMin,270);
// Explicitly editing a limit fixes it even when it equals the old default.
const fixed=updateCalorieDefaults({...defaults,calories:2400},2000,['carbsMax','fatMin']);
assert.equal(fixed.carbsMax,325);assert.equal(fixed.fatMin,44.4);assert.equal(fixed.carbsMin,270);
const reset=resetNutrition({...migrated,carbsMax:300,ironMin:8});
for(const key of ['budget','diet','dairyFree','variety','calories'])assert.equal(reset[key],migrated[key]);
for(const [key,value]of Object.entries(nutritionDefaults(2500)))assert.equal(reset[key],value);

const settings={...defaults,calories:1900,caloriesMax:2050,protein:100,carbsMin:225,carbsMax:285,fatMin:55,fatMax:80,fibre:30,fibreMax:60,sodiumMax:1800,calciumMin:1100,calciumMax:1800,ironMin:18,ironMax:30,vitaminCMin:100,vitaminCMax:500};
assert.deepEqual(settingsIssues(settings),[]);
const result=optimize(foods,settings);assert.equal(result.status,'success');
const expected={calories:[1900,2050],protein:[100,null],carbs:[225,285],fat:[55,80],fibre:[30,60],sodium:[null,1800],calcium:[1100,1800],iron:[18,30],vitaminC:[100,500]};
const model=buildModel(foods,settings);
for(const [key,[min,max]]of Object.entries(expected)){
 assert.equal(model.constraints[key].min,min===null?undefined:min*7);
 assert.equal(model.constraints[key].max,max===null?undefined:max*7);
 const actual=result.items.reduce((sum,f)=>sum+f.used/100*f.nutrients[key],0)/7;
 assert(Math.abs(actual-result.nutrients[key])<0.0001);
 if(min!==null)assert(actual>=min-0.001,`${key} minimum is enforced`);
 if(max!==null)assert(actual<=max+0.001,`${key} maximum is enforced`);
}
assert.equal(Object.keys(result.nutrients).length,9);
assert(result.items.every(f=>Number.isInteger(f.packs)));
for(const overrides of [{carbsMin:400,carbsMax:200},{fatMin:90,fatMax:60},{caloriesMax:1900},{calciumMin:2600},{fibreMax:20},{ironMin:50},{vitaminCMin:2100},{sodiumMax:-1},{protein:null},{carbsMax:NaN},{fatMin:Infinity}]){
 const input={...defaults,...overrides};
 assert(settingsIssues(input).length,JSON.stringify(overrides));
 assert.equal(optimize(foods,input).status,'settings');
}
assert.equal(dailyRangeText({min:1575,max:2275},'g'),'225–325 g');
assert.equal(dailyRangeText({min:525},'g'),'At least 75 g');
assert.equal(dailyRangeText({max:16100},'mg'),'At most 2,300 mg');
console.log('PASS: all nine edited limits reach the MILP and nutrition totals; invalid ranges rejected; saved settings migrate; calorie changes respect custom limits; nutrition reset preserves other preferences.');
