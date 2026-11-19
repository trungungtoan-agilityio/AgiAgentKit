# Kiến trúc AgiAgentKit

[English](architecture.md) · Tiếng Việt

Hai phần tách bạch: **CLI `bin/superadvisor`** (điều phối tmux + worktree, không phụ thuộc plugin) và **plugin
`plugin/`** (agent, hook, script đo, skill `lead`). `template/` là phần chép vào project bằng
`superadvisor init`: rules, `brains/` và khối `CLAUDE.md`.

## Sơ đồ thành phần

```mermaid
flowchart LR
  Owner([Owner<br/>điện thoại / terminal]) -- Remote Control --> Leader[Leader<br/>session PROJ-LEAD]
  Leader -- lane open --> L1[Lane 1<br/>worktree lane/c1]
  Leader -- lane open --> L2[Lane 2<br/>worktree lane/c3]
  Brains[(brains/<br/>lead.md · decisions.md<br/>directives/ · inbox/)] --> Leader
  Leader -. status / patrol .-> L1
  Leader -. status / patrol .-> L2
  L1 --> PR1[PR]
  L2 --> PR2[PR]
  PR1 --> Leader
  PR2 --> Leader
  Hooks{{Hooks<br/>turn-guard · test-budget<br/>agent-routing · owner-guard}} -.-> L1
  Hooks -.-> L2
  Hooks -.-> Leader
  L1 --> Events[(.claude/metrics/<br/>events.jsonl)]
  L2 --> Events
  Leader --> Events
  Events --> Stats[kit-stats.sh<br/>token-watch.sh<br/>superadvisor report]
```

| Thành phần | Ở đâu | Vai trò |
|------------|-------|---------|
| Leader | tmux socket `sa`, session `<PROJ>-LEAD` | Điều phối; đọc `brains/`, dùng skill `lead` |
| Lane | session `<PROJ>-<TÊN>`, worktree `lane/<tên>`, env `KIT_LANE=1` | Làm đúng một brief, mở một PR |
| Brains | `brains/` (git) và `brains/.local/` (không vào git) | Quyền, quyết định, chỉ thị, brief, nhật ký patrol |
| Hooks | `plugin/hooks/` | Chặn lãng phí token, giữ lane khỏi việc của owner, ghi số đo |
| Metrics | `.claude/metrics/events.jsonl` ở checkout chính | Nguồn dữ liệu cho `kit-stats.sh`, `token-watch.sh`, `report` |

## Tuần tự một thẻ việc

```mermaid
sequenceDiagram
  autonumber
  actor Owner
  participant Leader
  participant Lane as Lane (tmux + worktree)
  participant Hooks
  participant Events as events.jsonl
  Owner->>Leader: "Làm thẻ C1 và C3" (Remote Control)
  Leader->>Leader: đọc brains/, phân loại S/M/L, viết brief
  Leader->>Lane: superadvisor lane open c3 --brief file
  Note over Lane: tạo worktree lane/c3 và session KIT_LANE=1
  loop trong lúc làm việc
    Lane->>Hooks: mỗi lệnh gọi công cụ (PreToolUse)
    Hooks-->>Lane: cho qua / nhắc / deny (turn-guard, test-budget, owner-guard)
  end
  Lane->>Lane: builder viết code, tester viết test, mở PR
  Hooks->>Events: SubagentStop và Stop ghi token, thời lượng
  Leader->>Lane: superadvisor patrol (định kỳ)
  Lane-->>Leader: nếu chờ quyền > 5 phút hoặc không đổi > 20 phút: KẸT
  Leader->>Lane: đóng lane, viết lại brief hẹp hơn, mở lại
  Leader->>Owner: PR sẵn sàng, cần duyệt (tối đa 5 dòng)
  Owner->>Leader: "M <số PR>"
  Leader->>Leader: merge trong luật brains/lead.md, đúng HEAD, test xanh
  Leader->>Lane: lane close c3 --rm-worktree
  Leader->>Owner: superadvisor report (lane, cờ kẹt, commit, chi phí)
```

Ghi chú cho từng bước:

- **`lane open`** kiểm tên (a-z, 0-9, gạch ngang), chép brief vào `brains/.local/briefs/`, tạo worktree và nhánh
  `lane/<tên>` (dùng lại nếu đã có), rồi mở session tmux với `KIT_LANE=1`, `KIT_LANE_NAME`, `KIT_LANE_BRIEF`. Model
  mặc định là sonnet; `--model` để đổi. `--dry-run` in lệnh mà không chạy.
- **Hook** chạy trong chính session của lane. `owner-guard` chỉ hoạt động khi `KIT_LANE=1` và luôn **deny** (không có
  ai để hỏi); các hook còn lại **deny** ở auto mode và **ask** ở chế độ khác.
- **Số đo** ghi về checkout chính (không phải worktree) nên còn nguyên sau khi worktree bị xoá. Hook đo không bao giờ
  chặn: lỗi thì thoát im lặng.
- **`patrol`** đọc trạng thái tmux (BUSY / IDLE / WAITING / DEAD), so với ngưỡng `patrol.waiting_min` và
  `patrol.stuck_min` trong `brains/config.json`, ghi `brains/.local/patrol.log`. `superadvisor cron` in mẫu để chạy
  định kỳ.
- **Merge** mặc định chỉ khi owner nói rõ; điều kiện tối thiểu là test xanh trên đúng HEAD và không còn High/Critical
  sau tối đa 2 vòng review. Phát hành, deploy, đổi quyền không nằm trong quyền của leader.

## Quyết định thiết kế

- **Hook chỉ để tiết kiệm, không phải bảo mật.** Thiếu `jq` thì cho qua; mục tiêu là chặn thói quen đốt token, không
  chặn kẻ xấu.
- **Phân tầng model theo loại việc**, ghim trong frontmatter agent; `agent-routing` chặn việc đè model.
- **Leader mỏng.** Nó không tự code nặng và không đọc file lớn; việc đó giao lane hoặc `scout`, để ngữ cảnh của
  leader (khoản đắt nhất, vì sống lâu) nhỏ và rẻ.
- **Một thẻ = một worktree = một PR**, nên lane song song không giẫm file của nhau và mỗi PR review được độc lập.
- **Dữ liệu chạy máy ngoài git**: `.claude/metrics/` và `brains/.local/` nằm trong `.gitignore`.
