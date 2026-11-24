# BudgetPlate Canada

A browser grocery optimizer for one person for seven days. Built as a usable student project, with mixed-integer optimization, source-linked USDA nutrition and Canadian national reference prices.

See the [project README](../README.md) for setup and publishing. Paths below are relative to the repository root.

## What works

- Weekly budget comparison against whole-package checkout cost.
- “Foods I want this week” lets you require a minimum number of edible grams for each favourite. Quick buttons add chicken breast, tofu or vanilla ice cream; the dropdown covers every food. You can also mark Must include on a pantry card. Amounts persist locally and appear in the result and CSV.
- Vegetarian, vegan, no-pork and dairy-ingredient exclusions, plus individual food switches.
- Food already in the pantry reduces new purchases.
- Package price, store, date and source fields persist in browser local storage.
- Shopping checklist, CSV download, edible quantities used and left over.
- Editable daily limits for all nine nutrition measures, with reference defaults, saved custom limits and a nutrition-only reset. All nine appear in the results. Optional food-group minimums remain separate.
- A worker runs HiGHS 1.15.4 WebAssembly. All returned constraints and package counts are independently checked before display. The model has a six-second solve limit and 0.5% MIP relative tolerance. The UI makes the conservative claim “best basket found.”
- Changing inputs hides stale results. Infeasibility and search failures get distinct messages.

## Nutrition targets

Open **Nutrition & variety settings** to edit calories, protein, carbohydrates, fat, fibre, sodium, calcium, iron and vitamin C. Inputs state whether they are minimums or maximums, in grams or milligrams per day. The calorie target above the panel is its minimum. Every limit becomes a weekly MILP constraint; there are no extra hidden nutrient bounds. Invalid or reversed ranges are rejected before solving, and the model validates inputs again inside the worker.

At 2,000 kcal/day, defaults are: calories 2,000–2,200 kcal, protein at least 75 g, carbohydrate 225–325 g, fat 44.4–77.8 g, fibre 28–70 g, sodium at most 2,300 mg, calcium 1,300–2,500 mg, iron 18–45 mg and vitamin C 90–2,000 mg.

Carbohydrate and fat ranges use [Health Canada's adult AMDRs](https://www.canada.ca/en/health-canada/services/food-nutrition/healthy-eating/dietary-reference-intakes/tables/reference-values-macronutrients.html), converted from 45–65% and 20–35% of target calories using 4 and 9 kcal/g, rounded to one decimal. Fibre, calcium, iron, vitamin C and sodium use [Canadian label daily values](https://www.canada.ca/en/health-canada/services/technical-documents-labelling-requirements/table-daily-values/nutrition-labelling.html). The app treats sodium as a ceiling and the others as floors. Calcium and iron ceilings use [upper intake levels for ages 19–50](https://www.canada.ca/en/health-canada/services/food-nutrition/healthy-eating/dietary-reference-intakes/tables/reference-values-elements.html); vitamin C uses its [adult upper intake level](https://www.canada.ca/en/health-canada/services/food-nutrition/healthy-eating/dietary-reference-intakes/tables/reference-values-vitamins.html). Upper limits are not intake goals. The starting calorie target, 10% calorie headroom, 15%-of-calories protein floor and 70 g fibre cap are app planning choices.

Untouched calorie-based defaults follow calorie changes. An explicitly edited limit remains fixed, including when its entered value equals the old default. Custom-field markers are saved separately from numeric settings. Legacy saved budgets, diets, protein/fibre targets and food choices migrate without being discarded; missing limits receive defaults for the saved calorie target. **Reset nutrition defaults** restores nutrition fields for the current calorie target and preserves other choices. Existing users' inferred calcium minimum changes from the previous fixed 1,000 mg to the displayed 1,300 mg reference default.

`node test-nutrition-targets.mjs` checks a custom nine-measure MILP against independently recomputed nutrition totals, invalid ranges, migration, calorie changes, custom overrides, reset and result labels.

## The model, in OR1 language

For food i, let x_i be the number of edible 100 g units used this week, and y_i the number of whole purchase units bought. Both are nonnegative; y_i is integer. Let p_i be the package price, a_i its edible weight in 100 g units, h_i the pantry stock, and u_i the consumption cap.

Minimize sum(p_i * y_i), subject to:

- x_i <= h_i + a_i * y_i
- x_i <= u_i
- x_i >= requested minimum grams / 100 (zero when not selected)
- nutrient minimum <= sum(nutrient coefficient_i * x_i) <= nutrient maximum
- dietary exclusions remove both variables for that food
- optional food-group minimums aggregate eligible consumption quantities

Purchase counts are capped at the number of packages needed to cover each food's maximum consumption from an empty pantry. With nonnegative prices, buying additional unused packages cannot improve the objective. A continuous relaxation supplies a valid lower bound. The budget is a comparison after optimization, rather than a constraint, so a low budget can still show a candidate basket and its shortfall.

This is a mixed-integer linear program (MILP). Relaxing the package variables produces an LP suitable for a first OR1 comparison. The original workbook's continuous food cost is useful for learning, but rounding its answer afterward does not minimize checkout cost.

## Data boundary

All 46 starting foods (45 originally selected from the workbook plus vanilla ice cream) now use exact nutrient values from specific USDA FoodData Central SR Legacy records. The previous rounded workbook nutrition is replaced. Each mapping retains the FDC ID, NDB ID, original USDA description, preparation basis and a note explaining representative matches. The nine values are per 100 g edible food. Generic USDA references may differ from Canadian brands, fortification or a particular product.

The 44 non-estimated starting prices were independently matched to the **Canada, September 2026** rows of [Statistics Canada table 18-10-0245-01](https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=1810024501), including the published purchase unit. No retailer-specific price has been collected. Oats ($4.50 per 1 kg) and vanilla ice cream ($6.99 per 500 g) are estimates. The interface labels national averages, estimates and user-entered prices separately. User overrides keep their provenance after an upgrade and never become labeled as national averages merely because the reference data changed.

`data/statcan-2026-09-canada.json` preserves the official Canada rows, source/download URLs and download SHA-256. `source_reference_foods.py` maps all 46 foods to USDA records, checks each national price against those rows and writes `data/reference-food-audit.json`. `python3 extract_data.py /path/to/BudgetPlate_Phase1.xlsx` applies those mappings when rerun (requires `openpyxl` and the original workbook, which is not included), so it cannot reintroduce the old rounded nutrition. Workbook row provenance remains available in `workbookSource`. Edible yields, package weight conversions and food caps are separate model assumptions, not provider-certified measurements.

Must-include amounts mean food to use during the week, not extra packages that must be purchased. Pantry inventory counts toward the minimum. Dietary conflicts, disabled foods, invalid amounts and amounts above food caps block the solve with an explanation; the app never silently drops a required food. Over-budget baskets retain those choices and show the shortfall. If combined requirements make the model infeasible, reduce a required amount or review the other constraints. Existing saved price and pantry edits are preserved when upgrading.

Nutrition defaults combine adult reference ranges, Canadian label daily values and explicit app planning choices; they are not personalized recommendations or a complete healthy-diet standard. Food-group gram limits are project assumptions, not equivalent to Canada's Food Guide plate proportions. Dry foods use dry weights and must be cooked; cooking loss and nutrient retention are not modeled. Milk is represented using the source's gram conversion. Foods sold “per kg” are conservatively represented as one-kg purchase units; a future model should distinguish variable-weight produce and meat from fixed packages.

The app is a grocery basket, not a meal schedule. It does not validate allergy cross-contact, halal certification, recipes, food safety, storage life, all micronutrients, transport costs, or all tax/delivery charges. Pantry leftovers can be carried into the next run manually, but no automatic expiry tracking is implemented.

## Before a local store pilot

1. Record actual products, branch/location, package weight, price, observation date and source. The interface already collects price provenance; update package/edible weights in `dist/foods.json` when matching real SKUs.
2. Match actual store products and their preparation basis to package labels or an appropriate nutrition reference. Review generic USDA matches, edible yields and volume-to-weight assumptions against each purchased product.
3. Add recipe-based consumption constraints and daily meal scheduling. Measure whether users can actually prepare the basket.
4. Compare against a documented student shopping baseline using the same store, week, package accounting and nutrient rules. Only then report savings percentages.
5. Have students test budget entry, food exclusions, list interpretation and price updates. Record observations and changes, not invented usage numbers.

## Verification

Run `node test.mjs` from this directory. Tests independently check every model constraint, dietary filtering, whole packages, total reconciliation, a too-low budget, fully stocked pantry, all-foods-disabled infeasibility, and dairy exclusion. Test costs use reference prices and estimates; they are not local store shopping quotes. The variety rule requires at least 700 g of vegetables other than potatoes or sweet potatoes, within a 1,400 g vegetable minimum.

Run `node test-source-data.mjs` to check all 46 nutrition mappings, all 44 official prices, the two estimates, legacy saved-price migration, and source attribution in shopping-list exports. `node test-food-library.mjs` and `node test-grocery-choices.mjs` cover added foods and everyday search.

## Source map

- `dist/model.mjs`: model construction, readable LP conversion, HiGHS solve and validation.
- `dist/nutrition-targets.mjs`: reference defaults, settings migration, validation, weekly bounds and result labels.
- `dist/preferences.mjs`: favourite defaults, saved food migration and conflict validation.
- `dist/worker.mjs`: isolated solve worker.
- `dist/app.mjs`: interaction, local persistence, shopping output and CSV export.
- `dist/foods.json`: 46 starting foods with USDA nutrition and separate price provenance.
- `dist/provenance.mjs`: current-price attribution and CSV source columns.
- `source_reference_foods.py`, `data/`: reproducible USDA mappings and official price audit.
- `dist/index.html`, `dist/style.css`: responsive interface.
- `dist/vendor`: pinned HiGHS runtime, WASM and MIT license.

References: [HiGHS JavaScript](https://github.com/lovasoa/highs-js), [Canadian Nutrient File](https://food-nutrition.canada.ca/cnf-fce/), [Food Guide plate](https://www.canada.ca/en/health-canada/services/food-guide/eating-support/cooking/make-healthy-meals-plate.html), [Statistics Canada price table](https://doi.org/10.25318/1810024501-eng).

## Adding foods and prices

Use **Pantry & prices → Add a food**, search a food name, and choose the preparation that matches what you buy. The app fills in the nine modeled nutrients from USDA; enter the pack price in CAD and gross pack weight in grams. An edible percentage converts gross purchase weight to edible supply. For per-kg prices, enter the per-kg price and 1,000 g. Cooked-food records require cooked-food weights; raw-to-cooked conversion is not estimated. Must include is optional and uses edible grams.

The searchable library contains 6,961 SR Legacy records with all nine modeled nutrient fields. It is a local subset of the official [USDA FoodData Central SR Legacy April 2018 CSV release](https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_sr_legacy_food_csv_2018-04.zip), not a live API or an AI estimate. Missing values remain unknown: incomplete records are excluded rather than filled with zero. Data source IDs and descriptions are retained. The library is downloaded only when the add/edit form opens, and only selected records enter the optimization model. No API key is required; searches and entered prices stay in the browser.

For matched, unchanged NDB descriptions, edible percentages come from the refuse field in [USDA SR28, May 2016 revision](https://fdc.nal.usda.gov/fdc-datasets/SR-Legacy-Archive/sr28asc.zip). Otherwise, 100% is clearly marked as an assumption requiring review. Raw chicken wings with meat and skin are FDC 172390 / NDB 05100: per 100 g edible, 191 kcal, 17.52 g protein, 12.85 g fat, 0 g carbohydrate, 0 g fibre, 11 mg calcium, 0.46 mg iron, 0 mg vitamin C and 84 mg sodium. The matched SR28 refuse percentage is 38%, giving a 62% edible yield. Thus 1 kg purchased supplies 620 g raw edible meat and skin, not 1 kg. No store price for wings has been invented or preloaded.

Added foods have editable name, package size, price, edible percentage, weekly cap, dietary profile and food group. Nutrients remain tied to the selected USDA record. These custom foods persist alongside existing saved prices and favourites; Reset demo data preserves them. Removal offers Undo until another removal or reload. Dietary profiles and variety assignments are app suggestions or user judgments, not USDA certifications. Unknown profiles are excluded whenever any dietary filter is active; unknown required foods produce a visible conflict. Plain raw foods in unambiguous groups receive a suggested profile. Other preparations require review for restrictive diets.

Rebuild the library with `python3 build_usda_library.py <SR_Legacy_CSV.zip> <SR28_ASC.zip>`. The checked-in JSON includes source URLs, input archive SHA-256 hashes, nutrient basis and missing-data policy. Source downloads remain outside the repository. USDA data is public domain; see [FoodData Central](https://fdc.nal.usda.gov/).

New files: `dist/food-library.mjs` holds search, data validation and food construction; `dist/add-food-ui.mjs` handles the add/edit form; `dist/usda-library.json` holds the static USDA subset. Run `node test-food-library.mjs` for source-record checks, search, bone yield, preservation after serialization, invalid values, diet conflicts, edible supply, package edits and required-food optimization. These checks complement `node test.mjs`.

## Everyday grocery search

The add-food search now defaults to 131 curated grocery choices with familiar names, rather than exposing the raw USDA descriptions. Examples include Lean ground beef, Beef shank, Salmon fillet and Salmon steak. Search supports ordinary aliases such as beef mince, salmon filet, chickpeas, oats and ice cream. Short raw/dry/canned/bone-in notes distinguish materially different purchase forms. The list is editorially selected, not ranked by search analytics. The full original USDA search remains available under **Can’t find your food?** and never opens automatically on an empty result.

`dist/grocery-choices.json` maps every grocery choice to an unchanged, complete USDA record. `build_grocery_choices.py` contains the reviewed mapping definitions; run it after intentional mapping updates. The simple name is used in the form, pantry, favourites and shopping list, while **Nutrition facts & source** retains the exact USDA description, source ID and representative-food assumptions. Existing saved foods, prices and user-edited names are preserved.

Canadian ground-beef names follow the [CFIA's ground-meat categories](https://inspection.canada.ca/en/food-labels/labelling/industry/meat-and-poultry-products): extra lean maximum 10% fat, lean 17%, medium 23%, regular 30%. The representative USDA references use 10%, 15%, 20% and 30%, respectively; these are disclosed proxies, not claims about the exact contents of a user's package. Salmon fillet and salmon steak use the same raw farmed Atlantic salmon reference per 100 g edible flesh. The fillet assumes 100% edible and the steak starts at an explicitly labeled, editable 85% app estimate for bone allowance. Species and product differences remain disclosed in the source details. Other curated cut and yield assumptions are also labeled; selecting a friendly name does not establish a store-specific nutritional match.

`node test-grocery-choices.mjs` checks all mappings, grocery search and aliases, exact source retention, Canadian fat-category consistency, distinct fillet/steak identity despite a shared USDA record, editable edible weights, persistence and required-food optimization.
