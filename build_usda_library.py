"""Build the browser food library from official USDA downloads (standard library only).

Usage: python3 build_usda_library.py SR_LEGACY_CSV.zip SR28_ASC.zip
The downloads are not committed. Missing nutrient values are never changed to zero.
"""
import csv
import hashlib
import io
import json
from pathlib import Path
import sys
import zipfile

LEGACY_URL = 'https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_sr_legacy_food_csv_2018-04.zip'
YIELD_URL = 'https://fdc.nal.usda.gov/fdc-datasets/SR-Legacy-Archive/sr28asc.zip'
NUTRIENTS = {'1008': 'calories', '1003': 'protein', '1004': 'fat', '1005': 'carbs',
             '1079': 'fibre', '1087': 'calcium', '1089': 'iron', '1162': 'vitaminC', '1093': 'sodium'}


def build(legacy_path, yield_path):
    legacy = zipfile.ZipFile(legacy_path)
    sr28 = zipfile.ZipFile(yield_path)

    def rows(filename):
        path = next(n for n in legacy.namelist() if n.endswith('/' + filename))
        return csv.DictReader(io.TextIOWrapper(legacy.open(path), encoding='utf-8-sig'))

    categories = {r['id']: r['description'] for r in rows('food_category.csv')}
    ndb = {r['fdc_id']: r['NDB_number'].zfill(5) for r in rows('sr_legacy_food.csv')}
    values = {}
    for r in rows('food_nutrient.csv'):
        if r['nutrient_id'] in NUTRIENTS and r['amount'] != '':
            values.setdefault(r['fdc_id'], {})[NUTRIENTS[r['nutrient_id']]] = float(r['amount'])
    filename = next(n for n in sr28.namelist() if n.endswith('FOOD_DES.txt'))
    refuse = {}
    for r in csv.reader(io.TextIOWrapper(sr28.open(filename), encoding='latin-1'), delimiter='^', quotechar='~'):
        if r[8] != '':
            refuse[r[0]] = {'description': r[2], 'percent': float(r[8]), 'note': r[7]}
    foods = []
    for r in rows('food.csv'):
        nutrients = values.get(r['fdc_id'], {})
        # The optimizer requires all nine values; unknown is not the same as zero.
        if len(nutrients) != len(NUTRIENTS):
            continue
        f = {'fdcId': r['fdc_id'], 'ndbId': ndb[r['fdc_id']], 'description': r['description'],
             'category': categories[r['food_category_id']], 'categoryId': int(r['food_category_id']),
             'nutrients': nutrients}
        waste = refuse.get(f['ndbId'])
        # Never apply a historical yield to a changed food description.
        if waste and waste['description'].casefold() == f['description'].casefold():
            f['ediblePercent'] = 100 - waste['percent']
            f['refuseNote'] = waste['note']
        foods.append(f)
    output = {'source': 'USDA FoodData Central · SR Legacy (April 2018)',
              'sourceUrl': 'https://fdc.nal.usda.gov/download-datasets/',
              'downloadUrl': LEGACY_URL, 'yieldDownloadUrl': YIELD_URL,
              'yieldSource': 'USDA SR28 (revised May 2016), FOOD_DES refuse percentage',
              'sha256': {Path(p).name: hashlib.sha256(Path(p).read_bytes()).hexdigest() for p in (legacy_path, yield_path)},
              'basis': 'per 100 g edible portion in the preparation state in the description',
              'missingPolicy': 'Records missing any of the nine modeled nutrients are excluded, never zero-filled.',
              'foods': foods}
    path = Path(__file__).parent / 'dist' / 'usda-library.json'
    path.write_text(json.dumps(output, ensure_ascii=False, separators=(',', ':')) + '\n')
    print(f'{len(foods):,} complete USDA records; {path.stat().st_size:,} bytes')


if __name__ == '__main__':
    build(*sys.argv[1:])
