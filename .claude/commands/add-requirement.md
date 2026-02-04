# /add-requirement 命令

## 用法

```
/add-requirement REQ-001
/add-requirement docs/requirements/REQ-001.md
```

## 说明

注册新需求文档，将其添加到项目待处理需求列表。

## 执行流程

```
1. 验证需求文件存在
2. 解析需求 ID
3. 更新 tasks/STATE.yaml 的 requirements 列表
4. 设置为当前需求
```

## 输出示例

```markdown
## ✅ 需求已注册

**需求 ID**: REQ-001
**文件路径**: docs/requirements/REQ-001.md
**状态**: 已添加到待处理列表

### ⏭️ 下一步
执行 `/brainstorm REQ-001` 开始需求分析
```
