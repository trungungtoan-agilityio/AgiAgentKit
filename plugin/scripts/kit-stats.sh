#!/bin/bash
# Aggregate .claude/metrics/events.jsonl into a scorecard (scorecard.json + scorecard.md, Markdown printed).
#   - Per model         : runs, durations, token cost (subagent AND main-session rows)
#   - Main session      : stops, tokens, est. cost, ctx_max p50 / p90 / count > 150k (kind "main" rows)
#   - Per (agent, tier) : fit score = 1 - escalation rate. Grouped by the tier the agent ran at, so
#                         history from before a re-tier never pollutes the current tier.
# Escalation signals (a run counts ONCE per agent+tier even when several signals hit it):
#   builder -> debugger  a builder run followed by a debugger run in the same session, before the next builder run.
#   turns                a builder/tester run whose `turns` >= the turn-guard deny cap (precedence: process env
#                        TURN_GUARD_DENY, then env.TURN_GUARD_DENY in .claude/settings.local.json, then
#                        .claude/settings.json, then the default in hooks/turn-guard.sh). `turns` counts
#                        assistant messages, turn-guard counts tool calls: a hint, not a verdict.
#   failed verify        (optional) a "verify" event with pass:false after a builder/tester run in the same session.
# Usage: kit-stats.sh
set -e
. "$(dirname "$0")/kit-metrics-lib.sh"
ROOT="${CLAUDE_PROJECT_DIR:-$(pwd)}"
MDIR="$(kit_metrics_dir)"
EVENTS="$MDIR/events.jsonl"

DENY=""
case "${TURN_GUARD_DENY:-}" in ''|*[!0-9]*) ;; *) DENY="$TURN_GUARD_DENY" ;; esac
for sf in "$ROOT/.claude/settings.local.json" "$ROOT/.claude/settings.json"; do
  [ -z "$DENY" ] || break
  [ -f "$sf" ] || continue
  sv=$(jq -r '.env.TURN_GUARD_DENY // empty' "$sf" 2>/dev/null) || sv=""
  case "$sv" in ''|*[!0-9]*) ;; *) DENY="$sv" ;; esac
done
if [ -z "$DENY" ] && [ -f "$(dirname "$0")/../hooks/turn-guard.sh" ]; then
  DENY=$(sed -n 's/.*TURN_GUARD_DENY:-}" *\([0-9][0-9]*\).*/\1/p' "$(dirname "$0")/../hooks/turn-guard.sh" | head -1)
fi
case "$DENY" in ''|*[!0-9]*) DENY_JSON=null ;; *) DENY_JSON="$DENY" ;; esac

if [ ! -s "$EVENTS" ]; then
  echo "No metrics yet at $EVENTS - run a few tasks with the kit agents first." >&2
  exit 0
fi

# Token prices (USD per 1M tokens); override with .claude/metrics/pricing.json (same shape).
# cache_read / cache_write default to 0.1x / 1.25x of "in" when omitted.
PRICING="$MDIR/pricing.json"
DEFAULT_PRICING='{
  "haiku":  {"in": 1, "out": 5,  "cache_read": 0.1, "cache_write": 1.25},
  "sonnet": {"in": 2, "out": 10, "cache_read": 0.2, "cache_write": 2.5},
  "opus":   {"in": 4, "out": 20, "cache_read": 0.2, "cache_write": 5}
}'
RATES=$([ -f "$PRICING" ] && cat "$PRICING" || echo "$DEFAULT_PRICING")

# Pinned model per kit agent (agents/ next to this script, overridden by the project's .claude/agents).
# Only these agents get a fit row; any other subagent (Explore...) still counts toward per-model cost.
PINS='{}'
for d in "$(dirname "$0")/../agents" "$ROOT/.claude/agents"; do
  for f in "$d"/*.md; do
    [ -f "$f" ] || continue
    m=$(kit_agent_model "$f"); [ -n "$m" ] || continue
    PINS=$(jq -c --arg a "$(basename "$f" .md)" --arg m "$m" '. + {($a): $m}' <<<"$PINS")
  done
done

JSON=$(jq -c -s --argjson rates "$RATES" --argjson pins "$PINS" --argjson deny "$DENY_JSON" '
  def pct(p): if length==0 then null else (sort as $s | $s[ ((length-1)*p) | floor ]) end;
  def tier: if test("haiku") then "haiku" elif test("sonnet") then "sonnet" elif test("opus") then "opus" else "other" end;
  def kit_agent: ($pins | length) == 0 or $pins[.] != null;
  # USD for token counts at a tier ("other" has no rates: costs 0).
  def usd($t; $ti; $to; $cr; $cw):
    (($rates[$t].in // 0) * $ti / 1000000)
    + (($rates[$t].out // 0) * $to / 1000000)
    + (($rates[$t].cache_read  // (($rates[$t].in // 0) * 0.1))  * $cr / 1000000)
    + (($rates[$t].cache_write // (($rates[$t].in // 0) * 1.25)) * $cw / 1000000);
  def work_run: .kind=="subagent" and (.agent // null) != null and (.agent | IN("builder","tester"));

  # Chronological (sort_by is stable); _i gives each event one identity across the signals below.
  (sort_by(.ts) | to_entries | map(.value + {_i: .key})) as $ev
  | ([ $ev[] | select(.kind=="subagent" and (.agent // null) != null) ]) as $tagged
  # Runs of kit agents, models normalized to a tier (pinned ids and aliases share a bucket).
  | ([ $tagged[] | select(.agent | kit_agent) | .model = ((.model // "unknown") | tier) ]) as $routes

  # Signal builder -> debugger: a debugger run after a builder run, before the next builder run.
  | ([ $tagged | group_by(.session)[]
       | . as $runs
       | [ $runs[] | select(.agent=="builder") ] as $bs
       | range(0; $bs | length) as $i
       | $bs[$i] as $run
       | (if $i + 1 < ($bs | length) then $bs[$i + 1].ts else "9999" end) as $next
       | select(any($runs[]; .agent=="debugger" and .ts > $run.ts and .ts <= $next))
       | {signal: "debugger", from: "builder", model: ($run.model | tier), rk: $run._i}
     ]) as $esc_dbg
  # Signal turns: a builder/tester run that reached the turn-guard deny cap.
  | ([ $ev[] | select(work_run and $deny != null and (.turns // 0) >= $deny)
       | {signal: "turns", from: .agent, model: (.model | tier), rk: ._i}
     ]) as $esc_turns
  # Signal failed verify: the next verify after a builder/tester run failed; charged to the
  # latest such run before it (a verify closes the window).
  | ([ [ $ev[] | select(.kind=="verify" or work_run) ]
       | group_by(.session)[]
       | foreach .[] as $e ({run: null, out: null};
           if $e.kind=="verify"
           then {run: null, out: (if .run != null and $e.pass == false then .run else null end)}
           else {run: $e, out: null} end;
           .out | select(. != null))
       | {signal: "verify-fail", from: .agent, model: (.model | tier), rk: ._i}
     ]) as $esc_vf
  | ($esc_dbg + $esc_turns + $esc_vf) as $esc
  # One run hit by several signals is still ONE escalated run (fit stays in 0..1).
  | def esc_runs($a; $m): ([ $esc[] | select(.from==$a and .model==$m) | .rk ] | unique | length);

  {
    generated_at: (now|todateiso8601),

    # Subagent AND main-session rows: tokens and cost cover both; runs and durations are subagent-only.
    models: (
      [ $ev[] | select(.kind=="subagent" or .kind=="main") ] | group_by(.model) | map(
        (.[0].model) as $m
        | ($m | tier) as $t
        | (map(.tok_in // 0)      | add) as $ti
        | (map(.tok_out // 0)     | add) as $to
        | (map(.cache_read // 0)  | add) as $cr
        | (map(.cache_write // 0) | add) as $cw
        | (map(select(.kind=="subagent") | .duration_ms | numbers)) as $durs
        | {
            model: $m,
            records: (map(select(.kind=="subagent")) | length),
            main_records: (map(select(.kind=="main")) | length),
            tok_in: $ti, tok_out: $to, cache_read: $cr, cache_write: $cw,
            dur_p50_ms: ($durs | pct(0.50)),
            dur_p95_ms: ($durs | pct(0.95)),
            est_cost_usd: ((usd($t; $ti; $to; $cr; $cw) * 100 | round) / 100)
          }
      )
    ),

    # Main session: one row per Stop and model (hooks/metrics-main.sh); never part of fit.
    main: (
      [ $ev[] | select(.kind=="main") ] as $m
      | ([ $m[] | .ctx_max | numbers ]) as $ctx
      | {
          runs: ($m | length),
          turns: ($m | map(.turns // 0) | add // 0),
          total_tokens: ($m | map((.tok_in // 0) + (.tok_out // 0) + (.cache_read // 0) + (.cache_write // 0)) | add // 0),
          est_cost_usd: (([ $m[] | usd((.model // "") | tier; .tok_in // 0; .tok_out // 0; .cache_read // 0; .cache_write // 0) ] | add // 0) * 100 | round / 100),
          ctx_max_p50: ($ctx | pct(0.50)),
          ctx_max_p90: ($ctx | pct(0.90)),
          ctx_over_150k: ($ctx | map(select(. > 150000)) | length)
        }
    ),

    agents: (
      $routes | group_by([.agent, .model]) | map(
        (.[0].agent) as $a
        | (.[0].model) as $m
        | length as $runs
        | esc_runs($a; $m) as $e
        | {
            agent: $a, model: $m,
            pinned: (($pins[$a] // "") | tier),
            runs: $runs,
            escalations: $e,
            escalation_rate: (if $runs==0 then 0 else (($e/$runs)*100|round)/100 end),
            fit_score: (if $runs==0 then null else (((1 - $e/$runs)*100|round)/100) end)
          }
      )
    ),

    global: {
      escalated_runs: ($esc | map(.rk) | unique | length),
      turn_deny_threshold: $deny,
      signals: {
        builder_to_debugger: ($esc_dbg|length),
        turns: ($esc_turns|length),
        verify_fail: ($esc_vf|length)
      }
    }
  }
' "$EVENTS")

echo "$JSON" > "$MDIR/scorecard.json"

# Subagent runs exist but none belongs to a kit agent: Claude Code is too old to pass agent_type,
# or no kit agent has run yet.
ROUTE_WARN=""
if [ "$(echo "$JSON" | jq '[.models[] | select(.records > 0)] | length')" -gt 0 ] && [ "$(echo "$JSON" | jq '.agents | length')" -eq 0 ]; then
  ROUTE_WARN="> **No kit-agent runs found.** Speed and cost are measured, but no subagent record names a kit agent: update Claude Code (the SubagentStop hook needs \`agent_type\`) or delegate through scout / builder / tester / reviewer / debugger."
  echo "warning: subagent events exist but none is tagged with a kit agent" >&2
fi

# Runs on a tier other than the agent's pinned one: a caller passed "model" (overriding the pin),
# or the history predates a re-tier. Those runs are not evidence about the pinned tier.
OFF_PIN=$(echo "$JSON" | jq -r '.agents[]
  | select((.pinned | IN("haiku","sonnet","opus")) and (.model | IN("haiku","sonnet","opus")) and .model != .pinned)
  | "- `\(.agent)` ran \(.runs)x on **\(.model)** but is pinned to **\(.pinned)**."')

{
  echo "# AgiAgentKit scorecard"
  echo
  echo "_Generated: $(echo "$JSON" | jq -r '.generated_at')_ - _Events: \`$EVENTS\`_"
  echo
  echo "## Models - speed & cost"
  echo
  echo "| Model | Runs | Main stops | p50 dur (s) | p95 dur (s) | Tok in | Tok out | Cache read | Cache write | Est. cost (USD) |"
  echo "|-------|-----:|-----------:|------------:|------------:|-------:|--------:|-----------:|------------:|----------------:|"
  echo "$JSON" | jq -r '.models[] | "| \(.model) | \(.records) | \(.main_records) | \(if .dur_p50_ms == null then "n/a" else (.dur_p50_ms/1000*10|round)/10 end) | \(if .dur_p95_ms == null then "n/a" else (.dur_p95_ms/1000*10|round)/10 end) | \(.tok_in) | \(.tok_out) | \(.cache_read) | \(.cache_write) | \(.est_cost_usd) |"'
  echo "_Runs = subagent runs; Main stops = main-session rows. Tokens and cost include both._"
  echo
  echo "## Main session"
  echo
  if [ "$(echo "$JSON" | jq '.main.runs')" -eq 0 ]; then
    echo "_No main-session rows yet: the \`metrics-main.sh\` Stop hook writes them._"
  else
    echo "| Stops | Turns | Total tokens | Est. cost (USD) | ctx_max p50 | ctx_max p90 | ctx_max > 150k |"
    echo "|------:|------:|-------------:|----------------:|------------:|------------:|---------------:|"
    echo "$JSON" | jq -r '.main | "| \(.runs) | \(.turns) | \(.total_tokens) | \(.est_cost_usd) | \(.ctx_max_p50 // "n/a") | \(.ctx_max_p90 // "n/a") | \(.ctx_over_150k) |"'
    echo
    echo "_ctx_max = the largest context (input + cache read + cache write) of a turn in that Stop. Target: main-session context under 150k._"
  fi
  echo
  echo "## Agents - fit score per tier (1.0 = never escalated)"
  echo
  echo "| Agent | Tier | Pinned | Runs | Escalations | Escalation rate | Fit score |"
  echo "|-------|------|--------|-----:|------------:|----------------:|----------:|"
  echo "$JSON" | jq -r '.agents[] | "| \(.agent) | \(.model) | \(if .pinned == "other" then "-" else .pinned end) | \(.runs) | \(.escalations) | \(.escalation_rate) | \(.fit_score // "n/a") |"'
  echo
  echo "$JSON" | jq -r '.global | "_Escalation signals - builder -> debugger: \(.signals.builder_to_debugger) - turns >= \(.turn_deny_threshold // "n/a (turn-guard cap not found)"): \(.signals.turns) - failed verify (optional): \(.signals.verify_fail). Escalated runs (a run hit by several signals counts once): \(.escalated_runs)._"'
  echo
  if [ -n "$OFF_PIN" ]; then
    echo "**Off-pin runs** - the Agent call passed a \`model\` that overrides the frontmatter pin (or the runs predate a re-tier):"
    echo
    echo "$OFF_PIN"
    echo
  fi
  [ -z "$ROUTE_WARN" ] || { echo "$ROUTE_WARN"; echo; }
  echo "> Costs use list prices by tier; override in \`.claude/metrics/pricing.json\`."
} > "$MDIR/scorecard.md"

cat "$MDIR/scorecard.md"
