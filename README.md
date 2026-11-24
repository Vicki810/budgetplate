# BudgetPlate Canada

**[Open the app](https://vicki810.github.io/budgetplate/)**

A weekly grocery budget optimizer built around the operations research diet problem. BudgetPlate uses mixed-integer linear programming to find a low-cost basket that meets editable nutrition targets, respects food preferences, uses pantry inventory, and buys whole packages.

## What it does

- Models nine nutrition measures: calories, protein, carbohydrates, fat, fibre, sodium, calcium, iron, and vitamin C.
- Supports dietary exclusions, must-include foods, pantry quantities, and editable grocery prices.
- Reports checkout cost, budget shortfall when applicable, nutrition totals, and leftover food.
- Offers 131 everyday grocery choices backed by a searchable subset of 6,961 USDA nutrition records.
- Runs entirely in the browser; no account, API key, or server-side solver is required.

## Optimization and data

The model minimizes purchase cost. Food consumption is continuous; package counts are integers. Nutrient ranges, pantry supply, food caps, and preferences constrain the solution. HiGHS runs in a Web Worker through WebAssembly, and the app independently checks returned solutions. A six-second solve limit means results are described as the **best basket found**, not a guaranteed global optimum.

The 46 starting foods use USDA FoodData Central SR Legacy nutrition. Of their starting prices, 44 match Statistics Canada national averages for September 2026; oats and vanilla ice cream use labeled estimates. These are reference prices, not current quotes from local stores. Users can enter their own prices.

See [the model, sources, assumptions, and validation](docs/MODEL.md) for the formulation and full data notes. This is a grocery basket planner, not a meal schedule or personalized dietary advice.

## Tools

JavaScript, HTML/CSS, HiGHS WebAssembly, and Python for data preparation. GitHub Actions publishes the static app to GitHub Pages.

## Run locally

Install Python 3, then run this command from the project folder:

```sh
python3 -m http.server 8765 --directory dist
```

Open `http://localhost:8765`. Keep the terminal running; press **Ctrl+C** to stop. Open the app through this local server rather than double-clicking `index.html`, so its data files and solver can load.

## Make changes

| File | What it controls |
| --- | --- |
| `dist/index.html` | Page text and structure |
| `dist/style.css` | Colours, spacing, and appearance |
| `dist/app.mjs` | Forms, saved preferences, and results |
| `dist/model.mjs` | Optimization model and solution checks |
| `dist/nutrition-targets.mjs` | Nutrition defaults and input validation |
| `dist/foods.json` | Starting foods, prices, and source information |

Changes committed to the `main` branch are tested and published automatically. In GitHub, open **Actions** to see whether publishing succeeded. Local edits reach the live website only after they are committed and pushed to this repository.

Preferences and custom prices are saved in each browser. They do not automatically transfer from another website address or device.

## Run the checks

Install Node.js 22 or newer, then run:

```sh
node test.mjs
node test-food-library.mjs
node test-grocery-choices.mjs
node test-source-data.mjs
node test-nutrition-targets.mjs
```

The tests cover model constraints, integer purchases, dietary exclusions, pantry use, required foods, data mappings, price provenance, and editable nutrient targets. Data-preparation scripts are optional; the app includes the prepared data it needs.

## Sources and third-party software

- [Statistics Canada table 18-10-0245-01](https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=1810024501)
- [USDA FoodData Central](https://fdc.nal.usda.gov/)
- [HiGHS JavaScript](https://github.com/lovasoa/highs-js); its license is included in [`dist/vendor/HIGHS-LICENSE`](dist/vendor/HIGHS-LICENSE).
