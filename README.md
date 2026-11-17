# KTAF NJSLA Explorer

An interactive view of New Jersey's statewide NJSLA and NJGPA results for spring 2022 through spring 2026, covering every district, charter and school, with KIPP Newark, KIPP Camden and KIPP Paterson highlighted.

Open `index.html` through a web server (for example GitHub Pages, or `python3 -m http.server` in this folder). It will not load data when opened straight from disk.

## What is here

- `index.html` - the page and its styles
- `app.js` - the charts, tables and filters
- `runtime.js` - loads the data files and redraws the page
- `data/` - seven CSV files built from the state's files

## Source

New Jersey Department of Education statewide assessment data files (105 workbooks), downloaded November 13, 2026 from https://www.nj.gov/education/assessment/results/reports/. Nothing here comes from KIPP's own systems.

- % proficient is Level 4 or 5 on ELA and Math, Level 3 or 4 on Science, and Graduation Ready on NJGPA.
- KIPP Newark is TEAM Academy Charter School, KIPP Camden is KIPP Cooper Norcross Academy, and KIPP Paterson is Paterson Prep Charter School, which joined KIPP for 2025-26.
- Results the state suppresses are never filled in.
- 2025-26 ELA, Math and NJGPA results come from the new adaptive tests, so compare gaps to the state across years, not raw rates.

The "About these figures" section at the bottom of the page has the full notes.
