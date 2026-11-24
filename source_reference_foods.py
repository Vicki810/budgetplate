"""Apply auditable USDA nutrition and verified Canadian reference-price metadata.

Run after extract_data.py. USDA nutrients are copied exactly from the checked-in
official-data subset. Existing package sizes, yields and food caps remain model
assumptions; they are not certified by either data provider.
"""
import json
from pathlib import Path

ROOT = Path(__file__).parent
# food id: (FDC id, exact Statistics Canada product, food basis, mapping note)
MAPPINGS = {
 'f5': ('171287','Eggs, 1 dozen','Raw edible egg; shell excluded','Whole fresh egg. Egg size and edible yield are package assumptions.'),
 'f6': ('171267','Milk, 4 litres','Ready to drink','Generic 2% milk with vitamins A and D; brand fortification can differ.'),
 'f7': ('173414','Block cheese, 500 grams','Ready to eat','Cheddar is the nutrition reference for the broader block-cheese price category.'),
 'f8': ('170886','Yogurt, 500 grams','Ready to eat','Plain low-fat yogurt. Flavoured or Greek yogurt needs a different record.'),
 'f9': ('172373','Chicken drumsticks, per kilogram','Raw edible meat and skin; bones excluded','Drumstick meat and skin. The 70% edible yield is a model assumption.'),
 'f10': ('171077','Chicken breasts, per kilogram','Raw boneless, skinless meat','Boneless, skinless chicken breast; no added solution.'),
 'f11': ('171447','Whole chicken, per kilogram','Raw edible meat and skin; bones excluded','Whole broiler/fryer meat and skin. The 68% edible yield is a model assumption.'),
 'f12': ('174036','Ground beef, per kilogram','Raw edible meat','Representative ground beef: 80% lean / 20% fat. The national price covers ground beef broadly.'),
 'f13': ('167843','Pork shoulder cuts, per kilogram','Raw edible lean and fat; bones excluded','Whole shoulder, separable lean and fat. Package yield is a separate model assumption.'),
 'f14': ('167818','Pork loin cuts, per kilogram','Raw edible lean and fat','Generic pork loin, separable lean and fat. The purchase unit assumes boneless meat.'),
 'f15': ('173709','Canned tuna, 170 grams','Drained edible weight','Light tuna in water, drained solids. The assumed drained yield is 70% of the can weight.'),
 'f16': ('173690','Canned salmon, 213 grams','Canned contents as sold','Pink salmon, total can contents, including edible bones.'),
 'f17': ('172448','Tofu, 350 grams','Ready to use','Firm tofu set with calcium sulfate and magnesium chloride. Nutrition, especially calcium, varies by brand and coagulant.'),
 'f18': ('172420','Dried lentils, 900 grams','Dry weight; cook before eating','Raw dry lentils; do not enter cooked weights.'),
 'f19': ('173734','Dry beans and legumes, 900 grams','Dry weight; cook before eating','Dry black beans represent the broader beans-and-legumes price category.'),
 'f20': ('174285','Canned beans and lentils, 540 millilitres','Drained edible weight','Red kidney beans, drained solids, represent the broader canned-beans-and-lentils price category. The 60% drained yield is a model assumption.'),
 'f21': ('175182','Canned baked beans, 398 millilitres','Canned contents as sold','Plain or vegetarian baked beans; this reference excludes pork.'),
 'f22': ('174266','Peanut butter, 1 kilogram','Ready to eat','Smooth peanut butter with salt. Check the label for added ingredients.'),
 'f23': ('173806','Peanuts, 450 grams','Ready to eat','Dry-roasted peanuts without salt. Salted products have different sodium values.'),
 'f24': ('170563','Sunflower seeds, 400 grams','Ready to eat; shells excluded','Dry-roasted sunflower kernels without salt; pack weight assumes kernels, not in-shell seeds.'),
 'f25': ('172456','Soy milk, 1.89 litres','Ready to drink','Original/vanilla soy milk with added calcium and vitamins A and D. Fortification and sugar vary by brand.'),
 'f26': ('169756','White rice, 2 kilograms','Dry weight; cook before eating','Unenriched long-grain white rice; fortified or different rice varieties may differ.'),
 'f27': ('169703','Brown rice, 900 grams','Dry weight; cook before eating','Raw long-grain brown rice.'),
 'f28': ('169736','Dry or fresh pasta, 500 grams','Dry weight; cook before eating','Dry enriched pasta is the nutrition reference; the national price category also includes fresh pasta.'),
 'f29': ('168936','Wheat flour, 2.5 kilograms','Dry weight; cook before eating','Enriched, unbleached all-purpose wheat flour.'),
 'f30': ('174924','White bread, 675 grams','Ready to eat','Commercially prepared white bread; sodium and fortification vary by product.'),
 'f31': ('173904',None,'Dry weight; cook before eating','Regular/quick oats, dry and not fortified.'),
 'f32': ('173944','Bananas, per kilogram','Raw edible fruit; peel excluded','Generic raw bananas.'),
 'f33': ('171688','Apples, per kilogram','Raw edible fruit with skin; core excluded','Raw apples with skin.'),
 'f34': ('169097','Oranges, per kilogram','Raw edible fruit; peel excluded','Raw oranges, all commercial varieties.'),
 'f35': ('168173','Frozen strawberries, 600 grams','Frozen edible weight','Unsweetened frozen strawberries.'),
 'f36': ('170026','Potatoes, 4.54 kilograms','Raw edible flesh and skin; cook before eating','Raw potato flesh and skin. Discarded material is handled by the separate yield assumption.'),
 'f37': ('168482','Sweet potatoes, per kilogram','Raw edible weight; cook before eating','Raw, unprepared sweet potato.'),
 'f38': ('170393','Carrots, 1.36 kilograms','Raw edible weight','Raw carrots.'),
 'f39': ('169975','Cabbage, per kilogram','Raw edible weight','Raw cabbage.'),
 'f40': ('170000','Onions, 1.36 kilograms','Raw edible weight; peel excluded','Raw onions.'),
 'f41': ('170379','Broccoli, unit','Raw edible weight','Raw broccoli. A 450 g head and 60% edible yield are model assumptions; the national price is per unit.'),
 'f42': ('170108','Peppers, per kilogram','Raw edible weight; seeds and stem excluded','Red bell peppers represent the broader peppers price category; green peppers have different nutrient values.'),
 'f43': ('169251','Mushrooms, 227 grams','Raw edible weight','Raw white mushrooms.'),
 'f44': ('170471','Frozen mixed vegetables, 750 grams','Frozen unprepared weight; cook before eating','Generic frozen mixed vegetables; the mix varies by brand.'),
 'f45': ('169287','Frozen spinach, 300 grams','Frozen unprepared weight; cook before eating','Frozen spinach, chopped or leaf, unprepared.'),
 'f46': ('170016','Frozen peas, 750 grams','Frozen unprepared weight; cook before eating','Frozen green peas, unprepared.'),
 'f47': ('169968','Frozen broccoli, 500 grams','Frozen unprepared weight; cook before eating','Frozen chopped broccoli, unprepared.'),
 'f48': ('170051','Canned tomatoes, 796 millilitres','Canned contents as sold','Red ripe tomatoes packed in tomato juice; includes the liquid.'),
 'f49': ('171411','Vegetable oil, 3 litres','Ready to use','Soybean cooking oil represents generic vegetable oil. Different blends may differ.'),
 'icecream_vanilla': ('167575',None,'Ready to eat; weigh in grams, not mL','Generic vanilla ice cream. Pack size and price are app estimates, not a store product.'),
}


def apply_references(foods):
    library = json.loads((ROOT/'dist/usda-library.json').read_text())
    records = {r['fdcId']: r for r in library['foods']}
    prices = json.loads((ROOT/'data/statcan-2026-09-canada.json').read_text())
    rows = {r['Products'].strip(): r for r in prices['rows']}
    report = []
    for food in foods:
        if food['id'] not in MAPPINGS:
            continue
        fdc, product, basis, note = MAPPINGS[food['id']]
        record = records[fdc]
        if food['id']=='icecream_vanilla':
            food['package']='500 g tub (estimate)'
        food.setdefault('workbookSource', food.get('source') if food['id'].startswith('f') else None)
        food.update(nutrients=record['nutrients'].copy(), fdcId=fdc, ndbId=record['ndbId'],
                    usdaDescription=record['description'], nutritionStatus='usda',
                    source=f"USDA FoodData Central · SR Legacy (April 2018) · FDC {fdc} / NDB {record['ndbId']}",
                    nutritionSourceUrl=library['sourceUrl'], nutritionDownloadUrl=library['downloadUrl'],
                    nutritionNote=note, basis=basis,
                    quantityNote='Pack weights, edible yields and weekly caps are model assumptions; adjust to the product you buy.')
        if product:
            row = rows[product]
            assert row['VALUE'] and row['GEO']=='Canada' and row['REF_DATE']=='2026-09'
            assert row['UOM']=='Dollars' and row['SCALAR_FACTOR']=='units'
            assert abs(float(row['VALUE'])-food['price']) < 0.00001, f"Price mismatch: {food['name']}"
            food.update(priceStatus='national', referencePrice=float(row['VALUE']),
                        priceSource='Statistics Canada · Table 18-10-0245-01',
                        priceSourceUrl=prices['sourceUrl'],priceProduct=product,
                        priceReferencePeriod='2026-09',priceGeography='Canada',
                        priceVector=row['VECTOR'],priceVerifiedOn=prices['verifiedOn'])
        else:
            food.update(priceStatus='estimate', referencePrice=food['price'],
                        priceSource='App estimate',
                        priceSourceUrl='',priceProduct='',priceReferencePeriod='',priceGeography='',priceVector='')
        report.append(dict(id=food['id'],name=food['name'],fdcId=fdc,ndbId=record['ndbId'],
                           usdaDescription=record['description'],basis=basis,nutritionNote=note,
                           priceStatus=food['priceStatus'],price=food['price'],priceProduct=product,
                           priceVector=food['priceVector'],referencePeriod=food['priceReferencePeriod'],
                           geography=food['priceGeography']))
    assert len(report)==46, 'Every original food must have a reference mapping.'
    (ROOT/'data/reference-food-audit.json').write_text(json.dumps(report,indent=2)+'\n')
    return foods


if __name__=='__main__':
    path=ROOT/'dist/foods.json'
    path.write_text(json.dumps(apply_references(json.loads(path.read_text())),indent=2)+'\n')
    print('46 USDA mappings; 44 matching September 2026 Canada prices; 2 clearly labeled estimates.')
