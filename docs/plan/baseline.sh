#!/usr/bin/env bash
# 回归基线脚本 —— 每个闸门（gates.md 的 G<n>）通过前都要跑一次。
#
#   bash docs/plan/baseline.sh              # 跑全仓 typecheck + lint，与基线做归一化 diff
#   bash docs/plan/baseline.sh --accept     # 跑完后把当前「错误清单」晋升为新基线
#
# 为什么不是「干净即通过」：基线本身就有既存失败（见 docs/plan/baseline.md）。
# 于是判据是「**相对基线无新增错误**」，靠的是错误清单的 diff，而不是 exit code。
#
# 前提：docs/plan/README.md 的 M0 已落地（turbo.json 的任务名与包脚本名对齐、
# 去掉 ^ 依赖边、根 check-types 指向 typecheck）。没落地时本脚本会直接提示。

set -uo pipefail
cd "$(dirname "$0")/../.." || exit 1

BASE_DIR="docs/plan/baseline"
RAW_DIR=".baseline-raw"
ACCEPT=0
FAILED=0
[ "${1:-}" = "--accept" ] && ACCEPT=1

# TypeScript 打印对象字面量类型的**成员顺序不稳定**（实测 server:typecheck 的
# edge-semantic.ts(31,80) TS2345 两次运行给出不同顺序）。成员顺序无语义，却会让
# diff 出现「假新增」—— 这里把每个 {...} 内的 "a: T; b: U" 按字典序排序。
canon_type_literals() {
  awk '
    function trim(s) { gsub(/^[ \t]+/, "", s); gsub(/[ \t]+$/, "", s); return s }
    function sortblk(s,   n, i, j, t, parts, out, tail) {
      tail = ""
      # TS 常写成 "{ a: T; b: U; }"：先把结尾的 ";" 摘掉，否则空元素会被排到最前
      if (s ~ /;[ \t]*$/) { tail = ";"; sub(/;[ \t]*$/, "", s) }
      n = split(s, parts, ";")
      if (n <= 1) return trim(s) tail
      for (i = 1; i <= n; i++) parts[i] = trim(parts[i])
      for (i = 1; i <= n; i++)
        for (j = i + 1; j <= n; j++)
          if (parts[j] < parts[i]) { t = parts[i]; parts[i] = parts[j]; parts[j] = t }
      out = parts[1]
      for (i = 2; i <= n; i++) out = out "; " parts[i]
      return out tail
    }
    {
      out = ""; rest = $0
      while (match(rest, /\{[^{}]*\}/)) {
        out = out substr(rest, 1, RSTART - 1) "{" sortblk(substr(rest, RSTART + 1, RLENGTH - 2)) "}"
        rest = substr(rest, RSTART + RLENGTH)
      }
      print out rest
    }'
}

# 只保留「可比较的错误清单」：TS 错误 + eslint 汇总/致命错误。
# 丢掉时间、缓存命中等每次都会变的行，最后排序 —— 这样 diff 才只反映真实变化。
#
# 归一化三类假差异（前两类见 baseline.md §1.1，第三类是 M1 实测补充）：
#   ① pnpm 的 `exit code N` 数字；② TS 对象字面量成员顺序；
#   ③ 行/列号 —— 里程碑**编辑一个本身带基线错误的文件**时，行号必然漂移
#      （M1 实测：`backend/domain/src/models/node/entities.ts` 与
#      `value-objects.ts` 的 TS2307/TS7006 只是从 (931,8) 挪到 (1019,8)）。
#      抹掉 `(line,col)` 后，判据变成「**file + error code + message + 出现次数**」
#      的集合比较：新错误（新文件 / 新文案 / 同文案多一条）依然会被 diff 抓到。
normalize() {
  grep -aE "error TS|✖ +[0-9]+ problem|ESLint couldn't find|Invalid project directory|Command failed with exit code" "$1" |
    sed -E \
      -e 's/^([A-Za-z@/._-]+)(:|#)(typecheck|lint)(: typecheck)?: /\1: /' \
      -e 's/[0-9]+\.[0-9]+m?s/…/g' \
      -e 's/exit code [0-9]+/exit code N/' \
      -e 's/\([0-9]+,[0-9]+\)/(L,C)/g' |
    canon_type_literals |
    sort | uniq -c | sed -E 's/^ *([0-9]+) /\1× /'
}

run_and_report() {
  local name="$1" cmd="$2"
  local raw="$RAW_DIR/$name.txt" now="$RAW_DIR/$name.errors.txt" ref="$BASE_DIR/$name-errors.txt"
  mkdir -p "$RAW_DIR" "$BASE_DIR"
  echo "── $name: $cmd"
  # shellcheck disable=SC2086
  eval "$cmd" >"$raw" 2>&1
  local code=$?
  if grep -q "Cyclic dependency detected" "$raw"; then
    echo "   ✗ turbo 仍在报循环依赖 —— M0 的 turbo.json 修复没生效，先做 M0。" >&2
    return 2
  fi
  normalize "$raw" >"$now"
  if [ "$ACCEPT" = 1 ] || [ ! -f "$ref" ]; then
    cp "$now" "$ref"
    echo "   → 基线已写入 $ref（$(wc -l <"$ref") 条）"
    return 0
  fi
  echo "   原始输出：$raw（$(wc -l <"$raw") 行）  exit=$code"
  if diff -u "$ref" "$now" >"$RAW_DIR/$name.diff"; then
    echo "   ✓ 与基线一致（0 新增，0 消失）"
  else
    echo "   ✗ 与基线有差异（新增 + / 消失 −）："
    grep -E '^[+-][^+-]' "$RAW_DIR/$name.diff" | sed 's/^/     /'
    echo "     完整 diff：$RAW_DIR/$name.diff"
  fi
}

run_and_report typecheck "pnpm check-types"
run_and_report lint "pnpm lint"

echo
echo "提醒：error 变少是好事（说明顺手修好了既存问题）——变少也请 --accept 更新基线，免得下次看花眼。"
