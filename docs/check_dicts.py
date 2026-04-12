#!/usr/bin/env python3
import pymysql

conn = pymysql.connect(host='47.94.213.128', port=23306, user='ruoyi',
                       password='app123456', db='ry-vue', charset='utf8mb4')
cur = conn.cursor()

# 1. sys_dict_type 中 osg_ 开头
print("=== sys_dict_type (osg_*) ===")
cur.execute(
    "SELECT dict_id, dict_name, dict_type, create_by, create_time "
    "FROM sys_dict_type WHERE dict_type LIKE 'osg_%%' ORDER BY dict_id"
)
for r in cur.fetchall():
    print(f"  id={r[0]} | {r[1]} | {r[2]} | by={r[3]} | {r[4]}")

# 2. osg_position_* 在 dict_data 中但未注册于 dict_type
print("\n=== osg_position_* data (未注册于 sys_dict_type?) ===")
cur.execute(
    "SELECT DISTINCT d.dict_type, "
    "  (SELECT COUNT(*) FROM sys_dict_type t WHERE t.dict_type=d.dict_type) AS reg, "
    "  COUNT(*) AS cnt, MIN(d.create_by) AS cb "
    "FROM sys_dict_data d "
    "WHERE d.dict_type LIKE 'osg_position%%' "
    "GROUP BY d.dict_type ORDER BY d.dict_type"
)
for r in cur.fetchall():
    print(f"  {r[0]:40s} | registered={'YES' if r[1]>0 else 'NO':3s} | {r[2]:3d} rows | create_by={r[3]}")

# 3. osg_company_name 详情
print("\n=== osg_company_name 详情 ===")
cur.execute(
    "SELECT dict_code, dict_value, dict_label, dict_sort, css_class, create_by, create_time "
    "FROM sys_dict_data WHERE dict_type='osg_company_name' ORDER BY dict_sort"
)
for r in cur.fetchall():
    print(f"  code={r[0]} | val={r[1]:20s} | label={r[2]:20s} | sort={r[3]} | css={r[4]} | by={r[5]} | {r[6]}")

# 4. osg_company_type 详情
print("\n=== osg_company_type 详情 ===")
cur.execute(
    "SELECT dict_code, dict_value, dict_label, dict_sort, css_class, create_by, create_time "
    "FROM sys_dict_data WHERE dict_type='osg_company_type' ORDER BY dict_sort"
)
for r in cur.fetchall():
    print(f"  code={r[0]} | val={r[1]:20s} | label={r[2]:20s} | sort={r[3]} | css={r[4]} | by={r[5]} | {r[6]}")

# 5. 代码 seed 的 osg_company_type vs DB 的 osg_company_type
print("\n=== 代码 seed osg_company_type (from dict_data, create_by=codex?) ===")
cur.execute(
    "SELECT dict_value, create_by FROM sys_dict_data "
    "WHERE dict_type='osg_company_type' ORDER BY dict_sort"
)
for r in cur.fetchall():
    print(f"  {r[0]:20s} | create_by={r[1]}")

cur.close()
conn.close()
