import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {restoreFoods} from './dist/preferences.mjs';
import {nutrientUnits} from './dist/food-library.mjs';
import {priceKind,priceLabel,currentPriceSource,basketPriceSummary,shoppingRows} from './dist/provenance.mjs';

const read=path=>JSON.parse(readFileSync(new URL(path,import.meta.url),'utf8'));
const foods=read('./dist/foods.json'),library=read('./dist/usda-library.json'),prices=read('./data/statcan-2026-09-canada.json');
const records=new Map(library.foods.map(f=>[f.fdcId,f]));
assert.equal(foods.length,46);
assert.equal(new Set(foods.map(f=>f.id)).size,46);
for(const f of foods){
 const record=records.get(f.fdcId);
 assert(record,`${f.name} needs an official record`);
 assert.equal(f.ndbId,record.ndbId);assert.equal(f.usdaDescription,record.description);
 assert.deepEqual(f.nutrients,record.nutrients,`${f.name} must retain exact source values`);
 assert.deepEqual(Object.keys(f.nutrients).sort(),Object.keys(nutrientUnits).sort());
 assert(Object.values(f.nutrients).every(n=>Number.isFinite(n)&&n>=0));
 assert(f.basis&&f.nutritionNote&&f.quantityNote&&f.nutritionSourceUrl);
 if(f.priceStatus==='national'){
  const row=prices.rows.find(row=>row.Products.trim()===f.priceProduct);
  assert(row,`${f.name} needs a matching price category`);
  assert.equal(f.price,Number(row.VALUE));assert.equal(f.referencePrice,f.price);
  assert.equal(f.priceVector,row.VECTOR);assert.equal(f.priceGeography,'Canada');
  assert.equal(row.GEO,'Canada');assert.equal(row.REF_DATE,'2026-09');
  assert.equal(f.priceReferencePeriod,row.REF_DATE);
  assert.equal(row.UOM,'Dollars');assert.equal(row.SCALAR_FACTOR,'units');
  assert.equal(f.priceSourceUrl,prices.sourceUrl);
 }
}
assert.equal(foods.filter(f=>f.priceStatus==='national').length,44);
assert.deepEqual(foods.filter(f=>f.priceStatus==='estimate').map(f=>f.id),['f31','icecream_vanilla']);
const chicken=foods.find(f=>f.id==='f10'),oats=foods.find(f=>f.id==='f31');
// Old cached nutrition and old demo badges must not undo the reference-data upgrade.
const restored=restoreFoods(foods,[{...chicken,priceStatus:'demo',nutrients:{calories:999},minGrams:300,pantry:100,store:'My store'}]).find(f=>f.id===chicken.id);
assert.deepEqual(restored.nutrients,chicken.nutrients);assert.equal(priceKind(restored),'national');
assert.equal(restored.minGrams,300);assert.equal(restored.pantry,100);assert.equal(restored.store,'My store');
for(const old of [{...chicken,priceStatus:'user'},{...chicken,price:9,priceStatus:'demo'},{id:chicken.id,price:9}]){
 const saved=restoreFoods(foods,[old]).find(f=>f.id===chicken.id);
 assert.equal(saved.price,old.price);assert.equal(priceKind(saved),'user');
 assert.equal(currentPriceSource(saved).geography,'');
 assert.equal(currentPriceSource(saved).period,'');
}
assert.equal(restoreFoods(foods,[{...oats,priceStatus:'demo'}]).find(f=>f.id===oats.id).priceStatus,'estimate');
assert.equal(priceLabel(chicken),'NATIONAL AVERAGE');assert.equal(priceLabel(oats),'PRICE ESTIMATE');
assert.equal(priceKind({...chicken,price:9}),'user');
const item=(f,packs=1)=>({...f,packs,used:100,left:200,cost:packs*f.price});
assert.equal(basketPriceSummary([item(chicken,0)]),'From your pantry');
assert.equal(basketPriceSummary([item(chicken),item(oats)]),'National averages + price estimates');
const own={...chicken,price:9,priceStatus:'user',url:'https://example.com/my-price',observed:'2026-11-23'};
const rows=shoppingRows({total:chicken.price+oats.price+9,items:[item(chicken),item(oats),item(own)]});
const objects=rows.slice(3).map(row=>Object.fromEntries(rows[2].map((key,i)=>[key,row[i]])));
assert.equal(objects[0]['Price geography'],'Canada');assert.equal(objects[0]['Price reference period'],'2026-09');
assert.equal(objects[1]['Price status'],'PRICE ESTIMATE');assert.equal(objects[1]['Price geography'],'');
assert.equal(objects[2]['Price status'],'YOUR PRICE');assert.equal(objects[2]['Price geography'],'');
assert.equal(objects[2]['Price source URL'],own.url);assert.equal(objects[2]['Observed date'],own.observed);
assert.equal(objects[2]['USDA FDC ID'],chicken.fdcId);assert.equal(objects[2]['USDA description'],chicken.usdaDescription);
console.log('PASS: 46 exact USDA mappings; 44 official national prices; 2 estimates; saved-price migration; source-aware shopping exports.');
