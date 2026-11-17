#!/usr/bin/env bash
# bench/report.sh <out-dir> - aggregate <out-dir>/results.jsonl into Markdown (stdout):
# a table per mode x card, a summary per mode, tokens by model, and what is measured vs estimated.
set -uo pipefail
[ $# -eq 1 ] || { echo "Dùng: bench/report.sh <out-dir>" >&2; exit 2; }
F="$1/results.jsonl"
[ -s "$F" ] || { echo "LỖI: không có kết quả tại $F" >&2; exit 1; }
command -v jq >/dev/null 2>&1 || { echo "LỖI: thiếu jq" >&2; exit 1; }

jq -rs '
def vals(f): [.[] | f | select(. != null)];
def mean: if length == 0 then null else add / length end;
def sd: if length < 2 then 0 else (mean as $m | ([.[] | (. - $m) | . * .] | add / (length - 1)) | sqrt) end;
def rnd($n): if . == null then null else (pow(10; $n) as $p | (. * $p | round) / $p) end;
def pm($n): if length == 0 then "n/a" else "\(mean | rnd($n)) ± \(sd | rnd($n))" end;
def mn($n): if length == 0 then "n/a" else "\(mean | rnd($n))" end;
def tot: if .tokens_in == null then null else (.tokens_in + (.tokens_out // 0) + (.cache_read // 0) + (.cache_write // 0)) end;
def k: . / 1000;
def passes: map(select(.pass)) | length;
def pct($p; $n): ($p * 100 / $n | round);

def row: . as $g | ($g | length) as $n | ($g | passes) as $p
  | "| \($g[0].mode) | \($g[0].card) | \($n) | \($p)/\($n) (\(pct($p; $n))%) | \($g | vals(.cost_usd) | pm(3))"
    + " | \($g | vals(.tokens_out) | map(k) | pm(1)) | \($g | vals(tot) | map(k) | pm(1))"
    + " | \($g | vals(.duration_s) | pm(0)) | \($g | vals(.turns) | pm(1)) |";

def cost_total: (vals(.cost_usd)) as $c | if ($c | length) == 0 then null else ($c | add) end;
def cost_run: vals(.cost_usd) | mean;
def cost_pass: (passes) as $p | (cost_total) as $t | if $p == 0 or $t == null then null else $t / $p end;

def summary: . as $g | ($g | length) as $n | ($g | passes) as $p
  | "- **\($g[0].mode)**: \($n) run, thành công \($p)/\($n) (\(pct($p; $n))%); "
    + "chi phí \($g | cost_run | rnd(3) // "n/a") USD/run, tổng \($g | cost_total | rnd(2) // "n/a") USD, "
    + "mỗi run thành công \($g | cost_pass | rnd(3) // "n/a") USD; "
    + "thời gian TB \($g | vals(.duration_s) | mn(0)) s; lượt TB \($g | vals(.turns) | mn(1)); "
    + "run lỗi/timeout \($g | map(select(.status != "ok")) | length)"
    + (if $g[0].mode == "superadvisor" then
        "; số lần gọi agent của kit TB \($g | vals(.delegations) | mn(1)); chi phí ƯỚC TÍNH theo bảng giá kit-stats \($g | vals(.kit_est_cost_usd) | mn(3)) USD/run"
       else "" end);

def bymodel: . as $g | ($g | length) as $n
  | [$g[] | (.tokens_by_model // {}) | to_entries[]] | group_by(.key) | sort_by(.[0].key)
  | map("| \($g[0].mode) | \(.[0].key) | \((map(.value.in) | add) / $n | round) | \((map(.value.out) | add) / $n | round)"
        + " | \((map(.value.cache_read) | add) / $n | round) | \((map(.value.cache_write) | add) / $n | round)"
        + " | \(([.[].value.cost_usd | select(. != null)] | if length == 0 then null else add / $n end) | rnd(3) // "n/a") |");

(group_by(.mode) | map({key: .[0].mode, value: .}) | from_entries) as $m
| ($m.baseline // []) as $b | ($m.superadvisor // []) as $l
| (if ($b | length) > 0 and ($l | length) > 0 then
    ["", "**So sánh superadvisor / baseline**: "
      + "chi phí mỗi run \(if ($b | cost_run) and ($l | cost_run) and ($b | cost_run) > 0 then "\(($l | cost_run) / ($b | cost_run) * 100 | round)%" else "n/a" end); "
      + "chi phí mỗi run thành công \(if ($b | cost_pass) and ($l | cost_pass) then "\(($l | cost_pass) / ($b | cost_pass) * 100 | round)%" else "n/a" end); "
      + "tỷ lệ thành công superadvisor \(pct($l | passes; $l | length))% so với baseline \(pct($b | passes; $b | length))%."]
  else [] end) as $cmp
| ([
    "# Kết quả benchmark: baseline vs superadvisor", "",
    "Nguồn: `results.jsonl` (\(length) run). Dạng `a ± b` = trung bình ± độ lệch chuẩn mẫu giữa các run (một run thì ± 0).", "",
    "## Theo mode x thẻ", "",
    "| Mode | Thẻ | Run | Thành công | Chi phí USD | Token out (nghìn) | Tổng token (nghìn) | Thời gian (s) | Lượt |",
    "|------|-----|----:|-----------:|------------:|------------------:|-------------------:|--------------:|-----:|"
  ] + (group_by([.mode, .card]) | map(row))
  + ["", "## Tổng hợp theo mode", ""] + ([$b, $l] | map(select(length > 0) | summary)) + $cmp
  + ["", "## Token theo model (trung bình mỗi run, số đo từ Claude Code)", "",
     "| Mode | Model | In | Out | Cache read | Cache write | Chi phí USD |",
     "|------|-------|---:|----:|-----------:|------------:|------------:|"]
  + ([$b, $l] | map(select(length > 0) | bymodel) | add // [])
  + ["", "## Số đo vs ước tính", "",
     "- **Đo được** (từ JSON/telemetry của Claude Code và Vitest): thành công (test chấp nhận + toàn bộ tests/ xanh), `total_cost_usd`, token (`modelUsage`, nếu thiếu thì `usage`), số lượt, thời gian.",
     "- **Ước tính**: chi phí theo bảng giá mặc định của `plugin/scripts/kit-stats.sh` (cột kit-stats, chỉ mode superadvisor; ghi đè bằng `.claude/metrics/pricing.json`). Không dùng để so với `total_cost_usd`.",
     "- **Không đo được ở chế độ headless**: số lần người dùng phải can thiệp (usability). Xem bench/README.md."]
  ) | .[]
' "$F"
