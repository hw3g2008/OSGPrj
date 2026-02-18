#!/usr/bin/env bash
# ============================================================
# Skill 产物门控脚本 (Artifact Gate Control)
# 用法: bash bin/check-skill-artifacts.sh <skill> <module> <prd_dir>
#   skill   : prototype-extraction | brainstorming
#   module  : 模块名 (如 permission, career)
#   prd_dir : PRD 目录的相对路径 (如 osg-spec-docs/docs/01-product/prd/permission)
# 退出码: 0=全部通过, 1=有检查项失败
# ============================================================

set -euo pipefail

# ---------- 参数校验 ----------
if [ $# -lt 3 ]; then
  echo "[ERROR] 用法: bash bin/check-skill-artifacts.sh <skill> <module> <prd_dir>"
  echo "  skill   : prototype-extraction | brainstorming"
  echo "  module  : 模块名"
  echo "  prd_dir : PRD 目录相对路径"
  exit 1
fi

SKILL="$1"
MODULE="$2"
PRD_DIR="$3"
SRS_DIR="osg-spec-docs/docs/02-requirements/srs"

FAIL_COUNT=0
FAIL_LIST=""

# ---------- 辅助函数 ----------

# 检查文件是否存在
check_file() {
  local file="$1"
  local label="$2"
  if [ -f "$file" ]; then
    echo "[PASS] $label — $file 存在"
  else
    echo "[FAIL] $label — $file 不存在"
    FAIL_COUNT=$((FAIL_COUNT + 1))
    FAIL_LIST="$FAIL_LIST\n  - $label: $file 不存在"
  fi
}

# 检查文件存在且行数 >= 阈值
check_min_lines() {
  local file="$1"
  local min="$2"
  local label="$3"
  if [ ! -f "$file" ]; then
    echo "[FAIL] $label — $file 不存在"
    FAIL_COUNT=$((FAIL_COUNT + 1))
    FAIL_LIST="$FAIL_LIST\n  - $label: $file 不存在"
    return
  fi
  local lines
  lines=$(wc -l < "$file" | tr -d ' ')
  if [ "$lines" -ge "$min" ]; then
    echo "[PASS] $label — $file 共 ${lines} 行 (>= ${min})"
  else
    echo "[FAIL] $label — $file 仅 ${lines} 行 (需 >= ${min})"
    FAIL_COUNT=$((FAIL_COUNT + 1))
    FAIL_LIST="$FAIL_LIST\n  - $label: $file 仅 ${lines} 行 (需 >= ${min})"
  fi
}

# 统计匹配 glob 的文件数量
count_files() {
  local dir="$1"
  local pattern="$2"
  local min="$3"
  local label="$4"
  local count=0
  for f in "$dir"/$pattern; do
    [ -f "$f" ] && count=$((count + 1))
  done
  if [ "$count" -ge "$min" ]; then
    echo "[PASS] $label — 找到 ${count} 个匹配文件 (>= ${min})"
  else
    echo "[FAIL] $label — 仅找到 ${count} 个匹配文件 (需 >= ${min})"
    FAIL_COUNT=$((FAIL_COUNT + 1))
    FAIL_LIST="$FAIL_LIST\n  - $label: 仅 ${count} 个匹配 $pattern (需 >= ${min})"
  fi
}

# ---------- 目录校验 ----------
if [ ! -d "$PRD_DIR" ]; then
  echo "[ERROR] PRD 目录不存在: $PRD_DIR"
  exit 1
fi

# ---------- 门控检查 ----------
echo "========================================"
echo "Skill 产物门控: $SKILL"
echo "模块: $MODULE"
echo "PRD 目录: $PRD_DIR"
echo "========================================"
echo ""

case "$SKILL" in

  prototype-extraction)
    # PE-1: MATRIX.md 存在且>=5行
    check_min_lines "$PRD_DIR/MATRIX.md" 5 "PE-1 MATRIX.md"

    # PE-2: DESIGN-SYSTEM.md 存在且>=20行
    check_min_lines "$PRD_DIR/DESIGN-SYSTEM.md" 20 "PE-2 DESIGN-SYSTEM.md"

    # PE-3: SIDEBAR-NAV.md 存在且>=10行
    check_min_lines "$PRD_DIR/SIDEBAR-NAV.md" 10 "PE-3 SIDEBAR-NAV.md"

    # PE-4: DECISIONS.md 存在
    check_file "$PRD_DIR/DECISIONS.md" "PE-4 DECISIONS.md"

    # PE-5: 至少 1 个 0*.md 页面 PRD
    count_files "$PRD_DIR" "0*.md" 1 "PE-5 页面PRD(0*.md)"
    ;;

  brainstorming)
    # BS-1: MATRIX.md 存在
    check_file "$PRD_DIR/MATRIX.md" "BS-1 MATRIX.md"

    # BS-2: DESIGN-SYSTEM.md 存在
    check_file "$PRD_DIR/DESIGN-SYSTEM.md" "BS-2 DESIGN-SYSTEM.md"

    # BS-3: SIDEBAR-NAV.md 存在
    check_file "$PRD_DIR/SIDEBAR-NAV.md" "BS-3 SIDEBAR-NAV.md"

    # BS-4: SRS {module}.md 存在且>=100行
    check_min_lines "$SRS_DIR/${MODULE}.md" 100 "BS-4 SRS ${MODULE}.md"
    ;;

  *)
    echo "[ERROR] 未知 skill: $SKILL"
    echo "  支持: prototype-extraction | brainstorming"
    exit 1
    ;;
esac

# ---------- 结果汇总 ----------
echo ""
echo "========================================"
if [ "$FAIL_COUNT" -eq 0 ]; then
  echo "结果: ALL PASS ($SKILL)"
  echo "========================================"
  exit 0
else
  echo "结果: FAILED — ${FAIL_COUNT} 项未通过 ($SKILL)"
  echo -e "缺失清单:$FAIL_LIST"
  echo "========================================"
  exit 1
fi
