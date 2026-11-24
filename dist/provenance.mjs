// Current price provenance is separate from a food's nutrition reference.
export function priceKind(food){
 if(food.priceStatus==='user')return 'user';
 if(food.priceStatus==='national')return food.price===food.referencePrice?'national':'user';
 return 'estimate';
}
export function priceLabel(food){
 return {national:'NATIONAL AVERAGE',estimate:'PRICE ESTIMATE',user:'YOUR PRICE'}[priceKind(food)];
}
export function currentPriceSource(food){
 const kind=priceKind(food);
 if(kind==='national')return {
  text:`${food.priceSource}. ${food.priceGeography} average, September 2026. Category: ${food.priceProduct}. Series: ${food.priceVector}.`,
  url:food.priceSourceUrl,period:food.priceReferencePeriod,geography:food.priceGeography
 };
 if(kind==='user')return {text:'Your entered price. Store, date and link are recorded below.',url:food.url||'',period:'',geography:''};
 return {text:`${food.priceSource||'App estimate'}; not a collected store price or a Statistics Canada average.`,url:'',period:'',geography:''};
}
export function basketPriceSummary(items){
 const kinds=new Set(items.filter(f=>f.packs>0).map(priceKind));
 if(!kinds.size)return 'From your pantry';
 return [['national','National averages'],['estimate','price estimates'],['user','your prices']]
  .filter(([kind])=>kinds.has(kind)).map(([,label])=>label).join(' + ').replace(/^./,s=>s.toUpperCase());
}
export function shoppingRows(result){
 return [
  ['BudgetPlate Canada shopping list — USDA reference nutrition'],
  ['Checkout CAD',result.total.toFixed(2)],
  ['Food','Purchase unit','Units to buy','Edible grams used','Edible grams left','Checkout CAD','Price status','Store','Observed date','Must include minimum (edible g/week)','Price source','Price source URL','Price reference period','Price geography','USDA FDC ID','USDA NDB ID','USDA description','Nutrition source URL','Nutrition basis','Nutrition reference note'],
  ...result.items.map(f=>{const p=currentPriceSource(f);return [f.name,f.package,f.packs,f.used.toFixed(1),Math.max(0,f.left).toFixed(1),f.cost.toFixed(2),priceLabel(f),f.store||'',f.observed||'',f.minGrams||0,p.text,p.url,p.period,p.geography,f.fdcId,f.ndbId,f.usdaDescription,f.nutritionSourceUrl,f.basis,f.nutritionNote||f.referenceNote||''];})
 ];
}
