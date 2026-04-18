#!/usr/bin/env python3
"""Generate SQL to import osg_company_name from docs/bank.xlsx Sheet1."""
import re
import openpyxl
import os

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
wb = openpyxl.load_workbook(os.path.join(BASE, 'docs', 'bank.xlsx'))
ws1 = wb['Sheet1']

cat_map = {
    'Bulge Bracket': 'bulge_bracket',
    'Elite Boutique': 'elite_boutique',
    'Middle Market': 'middle_market',
    'Buyside': 'buyside',
    'Consulting': 'consulting',
    'SWE/PM': 'swe_pm',
    'Other Company': 'other_company',
}

rows = []
for row in ws1.iter_rows(min_row=2, values_only=True):
    name = str(row[1]).strip().replace("'", "''")
    cat = str(row[2]).strip()
    parent_value = cat_map.get(cat, 'other_company')
    dv = name.lower().strip()
    dv = re.sub(r'[^a-z0-9\u4e00-\u9fa5]+', '_', dv)
    dv = dv.strip('_') or 'dict_value'
    dv = dv.replace("'", "''")
    remark = '{"parentValue":"' + parent_value + '"}'
    rows.append((name, dv, remark))

out = os.path.join(BASE, 'sql', 'osg_company_name_import.sql')
with open(out, 'w', encoding='utf-8') as f:
    f.write("-- Auto-generated from docs/bank.xlsx Sheet1\n")
    f.write("DELETE FROM sys_dict_data WHERE dict_type='osg_company_name';\n\n")

    for i in range(0, len(rows), 100):
        chunk = rows[i:i+100]
        f.write("INSERT INTO sys_dict_data (dict_sort, dict_label, dict_value, dict_type, status, is_default, create_by, create_time, remark) VALUES\n")
        vals = []
        for idx, (name, dv, remark) in enumerate(chunk):
            sort_order = 1000 - (i + idx)
            vals.append(f"({sort_order}, '{name}', '{dv}', 'osg_company_name', '0', 'N', 'admin', NOW(), '{remark}')")
        f.write(",\n".join(vals) + ";\n\n")

print(f"Generated {len(rows)} rows -> {out}")
