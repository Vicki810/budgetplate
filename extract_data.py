import json
import openpyxl
from source_reference_foods import apply_references
from pathlib import Path
import argparse
parser = argparse.ArgumentParser(description='Import a Phase 1 workbook and apply verified reference nutrition and prices.')
parser.add_argument('workbook', type=Path, help='Path to BudgetPlate_Phase1.xlsx (optional historical input; not needed to run the app)')
args = parser.parse_args()
w = openpyxl.load_workbook(args.workbook)
foods=[]
keys=['calories','protein','fat','carbs','fibre','calcium','iron','vitaminC','sodium']
for rowno,r in enumerate(list(w['Foods'].values)[4:],5):
    name=r[0]
    dairy=name in ['Milk (2%)','Block cheese (cheddar)','Plain yogurt']
    fruit=name in ['Bananas','Apples','Oranges','Frozen strawberries']
    foods.append(dict(id=f'f{rowno}',name=name,group=r[1],package=r[2],price=r[3],grams=r[4],edibleYield=r[5],nutrients=dict(zip(keys,r[7:16])),maxGrams=r[16]*1000,vegetarian=bool(r[18]),vegan=bool(r[18]) and not dairy and name!='Eggs',dairy=dairy,pork='Pork' in name,fruit=fruit,vegetable=r[1]=='Veg & fruit' and not fruit,wholegrain=name in ['Rolled oats','Brown rice'],enabled=name!='Wheat flour (all-purpose)',pantry=0,store='',observed='',url='',priceStatus='demo',source=f'BudgetPlate_Phase1.xlsx · Foods row {rowno}',basis='Dry weight; cook before eating' if name in ['Dried lentils','Dry beans (black)','White rice','Brown rice','Dry pasta','Rolled oats','Wheat flour (all-purpose)'] else 'Edible weight; prepare as appropriate'))
output = Path(__file__).with_name('dist').joinpath('foods.json')
if output.exists():
    workbook_ids = {f['id'] for f in foods}
    foods.extend(f for f in json.loads(output.read_text()) if f['id'] not in workbook_ids)
output.write_text(json.dumps(apply_references(foods),indent=2)+'\n')
