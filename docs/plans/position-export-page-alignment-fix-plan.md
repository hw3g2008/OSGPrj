# 岗位信息导出对齐页面修复方案

## 状态

- ✅ 已确认：导出内容必须与 Admin 岗位信息页面当前列表保持一致
- ✅ 已实现：后端 `OsgPositionController.PositionExportRow` 改为 14 列，与页面列顺序、字段口径完全一致
- ✅ 已验证：本地后端实际下载 `/tmp/positions-after-fix.xlsx`，cols=14、headers 与值与页面第 1 行一一对应
- ✅ 前端静态测试 `positions-t3.spec.ts` 已同步，21/21 通过

## 导出列

1. 岗位名称
2. 公司
3. 公司类别
4. 部门
5. 岗位分类
6. 地区
7. 招聘周期
8. 主攻方向
9. 展示起始
10. 截止时间
11. 状态
12. 投递学员
13. 添加人
14. 添加日期

## 规则

- 展示值按页面口径导出：字典 label、短日期、截止时间 fallback、状态 label、投递学员带「人」
- 导入模板 `template=true` 不变
- 仅影响 Admin 岗位信息导出
