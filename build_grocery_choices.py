"""Curated grocery names mapped explicitly to existing USDA reference records.

This is an editorial list, not search-volume analytics. USDA nutrients are kept
unchanged. Cut/brand/species assumptions belong in source details, not titles.
"""
import json
from pathlib import Path

ROOT = Path(__file__).parent
library = json.loads((ROOT / 'dist/usda-library.json').read_text())
records = {f['fdcId']: f for f in library['foods']}
choices = []


def add(name, fdc, category, form, diet, group='Other', aliases='', **extra):
    record = records[str(fdc)]  # fail loudly if the complete source record is absent
    food = dict(id=extra.pop('id', name.lower().replace(' ', '-').replace('(', '').replace(')', '')),
                name=name, fdcId=str(fdc), category=category, form=form, dietProfile=diet,
                foodGroup=group, aliases=aliases.split('|') if aliases else [], **extra)
    assert food['id'] not in {f['id'] for f in choices}
    choices.append(food)

# Grocery meat labels follow Canadian terminology. Nutrition uses a named proxy,
# not a promise that every package bearing that label has the same fat content.
for name, fdc, fat, aliases in [
 ('Lean ground beef',171796,15,'ground beef|minced beef|beef mince|hamburger meat'),
 ('Extra-lean ground beef',174030,10,'extra lean beef|ground beef|minced beef'),
 ('Medium ground beef',174036,20,'ground beef|beef mince'),
 ('Regular ground beef',168652,30,'ground beef|hamburger meat')]:
    add(name,fdc,'Meat & poultry','Raw','meat','Protein',aliases,ediblePercent=100,
        referenceNote=f'Representative raw ground-beef reference with {fat}% fat. Canadian categories specify maximum fat, not one exact composition: extra-lean 10%, lean 17%, medium 23%, regular 30%. Your package may differ.',
        categorySourceUrl='https://inspection.canada.ca/en/food-labels/labelling/industry/meat-and-poultry-products')
add('Beef shank',169441,'Meat & poultry','Raw · bone-in','meat','Protein','shank|soup beef|beef soup bones',referenceNote='Uses USDA raw shank crosscuts, lean meat only. Bone and trimmed fat are excluded from nutrition and edible weight; marrow is not modeled.')
add('Stewing beef',171206,'Meat & poultry','Raw · boneless','meat','Protein','beef stew|beef cubes|diced beef',referenceNote='Uses raw chuck for stew, lean and fat, all grades.')
add('Sirloin steak',168726,'Meat & poultry','Raw · boneless','meat','Protein','beef steak|top sirloin|beef strips|stir fry beef',referenceNote='Representative steak reference: raw top sirloin, lean and fat, all grades. Other steak cuts can differ.')
add('Ribeye steak',173402,'Meat & poultry','Raw · boneless','meat','Protein','beef steak|rib eye',referenceNote='Uses raw boneless ribeye, lean and fat, all grades.')
add('Beef roast',168660,'Meat & poultry','Raw · boneless','meat','Protein','chuck roast|pot roast',referenceNote='Representative raw boneless chuck-eye roast, lean and fat, all grades.')
add('Chicken breast',171077,'Meat & poultry','Raw · boneless, skinless','meat','Protein','chicken breasts|chicken fillet')
add('Chicken thighs',173627,'Meat & poultry','Raw · boneless, skinless','meat','Protein','chicken thigh|dark meat',ediblePercent=100,yieldNote='Assumes boneless, skinless thighs: all pack weight is edible. Use another entry for bone-in thighs.')
add('Bone-in chicken thighs',172385,'Meat & poultry','Raw · bone-in, skin-on','meat','Protein','chicken thighs with skin',ediblePercent=75,yieldNote='App estimate: 75% edible after removing bones. Adjust for your pack.',referenceNote='Uses raw thigh meat and skin. Bone allowance is an editable app estimate, not a measured yield for your pack.')
add('Chicken wings',172390,'Meat & poultry','Raw · bone-in, skin-on','meat','Protein','wing|wings')
add('Chicken drumsticks',172373,'Meat & poultry','Raw · bone-in, skin-on','meat','Protein','chicken legs|drumstick',ediblePercent=70,yieldNote='App estimate: 70% edible after removing bones. Adjust for your pack.',referenceNote='Uses raw drumstick meat and skin. Bone allowance is an editable app estimate, not a measured yield for your pack.')
add('Whole chicken',171447,'Meat & poultry','Raw · bone-in, skin-on','meat','Protein','roasting chicken')
add('Ground chicken',171116,'Meat & poultry','Raw','meat','Protein','chicken mince|minced chicken')
add('Ground turkey',171505,'Meat & poultry','Raw','meat','Protein','turkey mince|minced turkey',ediblePercent=100)
add('Turkey breast',171098,'Meat & poultry','Raw · boneless, skinless','meat','Protein','turkey fillet',ediblePercent=100,yieldNote='Assumes boneless, skinless breast.')
add('Pork chops',167839,'Meat & poultry','Raw · boneless','pork','Protein','pork chop|pork loin chops')
add('Pork shoulder',167843,'Meat & poultry','Raw · bone-in','pork','Protein','pork roast|pulled pork meat')
add('Pork tenderloin',168312,'Meat & poultry','Raw · boneless','pork','Protein','pork fillet')
add('Ground pork',167902,'Meat & poultry','Raw','pork','Protein','pork mince|minced pork',ediblePercent=100)
for name, form, edible in [('Salmon fillet','Raw · boneless',100),('Salmon steak','Raw · bone-in',85)]:
    add(name,175167,'Fish & seafood',form,'meat','Protein','salmon|fresh salmon|frozen salmon|fish',ediblePercent=edible,
        referenceNote='Uses raw farmed Atlantic salmon as a representative nutrition reference for unspecified salmon. Species and farming method affect nutrition. Fillet and steak share the same edible-flesh reference; the bone allowance differs.',
        yieldNote='Assumes a boneless fillet with all flesh and skin eaten. Adjust if you discard skin.' if edible==100 else 'App estimate: 85% edible after removing the central bone. Adjust for your steak; this is not a USDA steak-specific yield.')
add('Smoked salmon',171985,'Fish & seafood','Ready to eat','meat','Protein','salmon|lox',ediblePercent=100,referenceNote='Uses a generic smoked salmon (lox) reference. Salt and preparation vary by brand.')
add('Canned salmon',173690,'Fish & seafood','Canned · contents as sold','meat','Protein','salmon tin|tinned salmon',ediblePercent=100,referenceNote='Uses canned pink salmon, total contents, including edible bones.')
add('Canned tuna',173709,'Fish & seafood','Canned · drained','meat','Protein','tuna|tinned tuna|tuna in water',ediblePercent=100,packageNote='Enter the drained weight shown on the can, not the weight including water.')
for name,fdc in [('Cod fillet',171955),('Haddock fillet',171964),('Tilapia fillet',175176),('Trout fillet',173717)]:
    add(name,fdc,'Fish & seafood','Raw · boneless','meat','Protein','fish|fish fillet|'+name.split()[0],ediblePercent=100,yieldNote='Assumes a boneless fillet. Adjust if you discard skin.',referenceNote='Representative raw fish reference. See the full USDA description for the species used.')
add('Shrimp',174210,'Fish & seafood','Raw · peeled','meat','Protein','prawns|peeled shrimp|frozen shrimp',ediblePercent=100,yieldNote='Assumes peeled shrimp. Shell-on shrimp need a lower edible percentage.')
add('Eggs',171287,'Dairy & eggs','Raw · in shell','eggs','Protein','egg|large eggs',referenceNote='Uses raw whole egg. Shells are excluded from edible weight.')
add('Egg whites',172183,'Dairy & eggs','Raw · liquid','eggs','Protein','liquid egg whites',ediblePercent=100)
for name,fdc in [('2% milk',171267),('1% milk',170872),('Whole milk',171265),('Skim milk',171269)]:
    add(name,fdc,'Dairy & eggs','Ready to drink','dairy','Protein','milk|dairy|'+('3.25% milk' if name=='Whole milk' else ''),ediblePercent=100,referenceNote='Uses a generic fortified fluid-milk reference. Use pack weight in grams; the form does not convert litres automatically.')
for name,fdc,aliases in [('Plain yogurt',170886,'yoghurt|yogurt'),('Greek yogurt',170903,'greek yoghurt|yogurt'),('Cheddar cheese',173414,'cheese|block cheese'),('Mozzarella cheese',170846,'cheese|pizza cheese'),('Cottage cheese',172182,'cheese'),('Feta cheese',173420,'cheese'),('Parmesan cheese',171247,'cheese|grated parmesan')]:
    add(name,fdc,'Dairy & eggs','Ready to eat','dairy','Protein',aliases,ediblePercent=100,referenceNote='Representative plain product. Fat, salt and fortification can vary by brand; the exact reference is listed below.')
add('Butter',173410,'Pantry','Ready to use','dairy','Other','salted butter',ediblePercent=100)
add('Whipping cream',170859,'Dairy & eggs','Ready to use','dairy','Other','heavy cream|cream',ediblePercent=100)
for name,fdc,aliases in [('Firm tofu',172448,'tofu|bean curd'),('Soft tofu',172449,'tofu|silken tofu|bean curd')]:
    add(name,fdc,'Plant proteins','Ready to use','vegan','Protein',aliases,ediblePercent=100,referenceNote='Uses calcium-set tofu. Calcium varies with the coagulant and brand.')
add('Edamame',168410,'Plant proteins','Frozen · shelled','vegan','Protein','soybeans|soya beans',ediblePercent=100,yieldNote='Assumes shelled edamame; pods are not included in pack weight.')
for name,fdc,form,aliases in [('Dried lentils',172420,'Dry','lentils|green lentils|brown lentils'),('Red lentils',174284,'Dry','lentils|split red lentils'),('Dried chickpeas',173756,'Dry','chickpeas|garbanzo beans'),('Canned chickpeas',173800,'Canned · drained','chickpeas|garbanzo beans'),('Dried black beans',173734,'Dry','black beans'),('Canned black beans',175238,'Canned · contents as sold','black beans'),('Dried kidney beans',173744,'Dry','kidney beans|red beans'),('Canned kidney beans',174285,'Canned · drained','kidney beans|red beans')]:
    add(name,fdc,'Plant proteins',form,'vegan','Protein',aliases,ediblePercent=100,
        packageNote='Enter the drained weight shown on the can, not the weight including water.' if 'drained' in form else '',
        referenceNote='Generic reference; canned black beans use a low-sodium record, while other canned products may differ in salt.' if fdc==175238 else '')
add('Hummus',174289,'Plant proteins','Ready to eat','vegan','Protein','chickpea dip',ediblePercent=100)
add('Peanut butter',174266,'Plant proteins','Ready to eat','vegan','Protein','pb|peanut spread',ediblePercent=100)
for name,fdc,aliases in [('Peanuts',173806,'roasted peanuts'),('Almonds',170567,'almond'),('Walnuts',170187,'walnut'),('Cashews',170162,'cashew nuts'),('Sunflower seeds',170562,'sunflower kernels'),('Chia seeds',170554,'chia')]:
    add(name,fdc,'Nuts & seeds','Ready to eat','vegan','Protein',aliases,ediblePercent=100)
add('Soy milk',172456,'Plant proteins','Ready to drink','vegan','Protein','soymilk|soya milk|plant milk',ediblePercent=100,referenceNote='Uses a fortified original/vanilla soy drink. Fortification and added sugar vary by brand.')
add('Almond milk',174832,'Pantry','Ready to drink','vegan','Other','almond drink|plant milk',ediblePercent=100,referenceNote='Uses unsweetened shelf-stable almond drink.')
for name,fdc,aliases,group in [('White rice',168877,'rice|long grain rice|basmati rice|jasmine rice','Other'),('Brown rice',169703,'rice|wholegrain rice','Wholegrain'),('Rolled oats',173904,'oats|oatmeal|porridge','Wholegrain'),('Pasta',169736,'spaghetti|macaroni|penne|noodles','Other'),('All-purpose flour',168936,'flour|plain flour|wheat flour','Other')]:
    add(name,fdc,'Grains & bread','Dry','vegan',group,aliases,ediblePercent=100,
        referenceNote='Uses regular enriched long-grain white rice as a generic reference. Basmati and jasmine can differ.' if name=='White rice' else '')
for name,fdc,group,aliases in [('White bread',174924,'Other','bread|toast'),('Whole-wheat bread',172688,'Wholegrain','bread|wholemeal bread|brown bread'),('Pita bread',174915,'Other','pita|flatbread'),('Flour tortillas',167535,'Other','wraps|tortilla|flour wraps'),('Corn tortillas',175036,'Other','tortilla|corn wraps')]:
    add(name,fdc,'Grains & bread','Ready to use','unknown',group,aliases,ediblePercent=100,referenceNote='Generic bread or wrap reference. Check your package for milk, eggs or animal fats before choosing a dietary profile.')
for name,fdc,aliases in [('Apples',171688,'apple'),('Bananas',173944,'banana'),('Oranges',169097,'orange'),('Grapes',174683,'grape|green grapes|red grapes'),('Strawberries',167762,'strawberry|berries'),('Blueberries',171711,'blueberry|berries'),('Raspberries',167755,'raspberry|berries'),('Mango',169910,'mangoes|mangos'),('Pineapple',169124,'pineapples'),('Peaches',169928,'peach'),('Pears',169118,'pear'),('Watermelon',167765,'melon'),('Avocado',171705,'avocados'),('Lemon',167746,'lemons')]:
    add(name,fdc,'Fruit','Fresh','vegan','Fruit',aliases)
add('Frozen strawberries',168173,'Fruit','Frozen · unsweetened','vegan','Fruit','frozen berries|strawberries',ediblePercent=100)
add('Frozen blueberries',173950,'Fruit','Frozen · unsweetened','vegan','Fruit','frozen berries|blueberries',ediblePercent=100)
for name,fdc,aliases in [('Broccoli',170379,'broccoli florets'),('Carrots',170393,'carrot'),('Spinach',168462,'baby spinach'),('Kale',168421,''),('Cabbage',169975,'green cabbage'),('Cauliflower',169986,''),('Romaine lettuce',169247,'lettuce|salad leaves'),('Iceberg lettuce',169248,'lettuce'),('Cucumber',168409,'cucumbers'),('Tomatoes',170457,'tomato'),('Onions',170000,'onion|yellow onion'),('Garlic',169230,'garlic cloves'),('Red bell peppers',170108,'peppers|bell pepper|capsicum'),('Green bell peppers',170427,'peppers|bell pepper|capsicum'),('Mushrooms',169251,'white mushrooms|button mushrooms'),('Zucchini',169291,'courgette'),('Green beans',169961,'beans|string beans'),('Celery',169988,''),('Eggplant',169228,'aubergine')]:
    add(name,fdc,'Vegetables','Fresh','vegan','Vegetable',aliases)
for name,fdc,aliases in [('Potatoes',170026,'potato|white potatoes'),('Sweet potatoes',168482,'sweet potato'),('Corn',168538,'sweetcorn|sweet corn')]:
    add(name,fdc,'Vegetables','Raw','vegan','Starchy',aliases)
for name,fdc,group,aliases in [('Frozen mixed vegetables',170471,'Vegetable','mixed veg|frozen veg'),('Frozen peas',170016,'Starchy','peas|green peas'),('Frozen broccoli',169968,'Vegetable','broccoli florets'),('Frozen spinach',169287,'Vegetable','spinach')]:
    add(name,fdc,'Vegetables','Frozen · cook before eating','vegan',group,aliases,ediblePercent=100)
add('Canned tomatoes',170051,'Pantry','Canned · contents as sold','vegan','Vegetable','tinned tomatoes|diced tomatoes',ediblePercent=100)
add('Crushed tomatoes',170501,'Pantry','Canned · contents as sold','vegan','Vegetable','tomatoes|passata',ediblePercent=100)
for name,fdc,diet,aliases in [('Olive oil',171413,'vegan','cooking oil'),('Canola oil',172336,'vegan','vegetable oil|cooking oil'),('Sugar',169655,'vegan','white sugar|granulated sugar'),('Mayonnaise',171009,'eggs','mayo')]:
    add(name,fdc,'Pantry','Ready to use',diet,'Other',aliases,ediblePercent=100)
add('Pasta sauce',171192,'Pantry','Ready to use','unknown','Other','marinara|spaghetti sauce|tomato sauce',ediblePercent=100,referenceNote='Generic marinara sauce. Check your product ingredients for dietary filters.')
for name,fdc,diet,aliases in [('Vanilla ice cream',167575,'dairy','ice cream|icecream'),('Chocolate ice cream',168809,'dairy','ice cream|icecream'),('Milk chocolate',167587,'dairy','chocolate|chocolate bar'),('Potato chips',169677,'vegan','chips|crisps|plain chips')]:
    add(name,fdc,'Snacks & treats','Ready to eat',diet,'Other',aliases,ediblePercent=100,referenceNote='Generic product reference. Check the package for brand-specific nutrition and ingredients.')

payload={'description':'Curated everyday grocery names, not a measured ranking of search popularity.',
         'nutritionPolicy':'Each choice maps to one unchanged USDA reference; substitutions and edible-yield assumptions are disclosed in source details.',
         'choices':choices}
(ROOT/'dist/grocery-choices.json').write_text(json.dumps(payload,indent=2,ensure_ascii=False)+'\n')
print(f'{len(choices)} curated grocery choices, {len(set(f["fdcId"] for f in choices))} USDA records.')
