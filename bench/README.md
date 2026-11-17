# Benchmark: baseline và superadvisor

So sánh hai cách làm cùng 6 thẻ của `demo-app/BACKLOG.md` và in bảng cho buổi talk.

| Mode | Cách chạy |
|------|-----------|
| `baseline` | Một session headless, không plugin, không rules, model `claude-opus-5-5`. Prompt = nội dung thẻ. |
| `superadvisor` | Project đã `superadvisor init`, nạp `--plugin-dir plugin/`, session chính `claude-sonnet-5-5` làm leader: tự xác định cỡ thẻ, giao việc cho `builder`/`tester`/`debugger`, chạy một lượt `reviewer` với thẻ M/L (theo `.claude/rules/workflow.md`). Cùng nội dung thẻ. |

## Cảnh báo chi phí

Mỗi lượt chạy là một session Claude Code thật và tốn token thật (thẻ L chạy opus có thể tốn vài USD). Chạy thử trước
với `--dry-run` (không gọi `claude`, không ghi gì), rồi bắt đầu từ một thẻ, một lượt. `all --runs 3` cho hai mode là
36 session.

## Chạy

```
bench/run.sh <baseline|superadvisor> <C1..C6|all> [--runs N] [--out <dir>] [--dry-run]
bench/report.sh <out-dir>          # in bảng Markdown từ <out-dir>/results.jsonl
```

Ví dụ: `bench/run.sh baseline C1 --dry-run`, rồi `bench/run.sh superadvisor all --runs 3 --out bench/out/talk` và
`bench/run.sh baseline all --runs 3 --out bench/out/talk` (cùng `--out` để report so sánh được hai mode).
Cần bash 3.2+, `jq`, `git`, `node`/`npm`, `perl`, `claude` đã đăng nhập. Kiểm công cụ: `bash tests/bench/dry-run.sh`.

Biến môi trường: `BENCH_TIMEOUT` (giây, mặc định 900), `BENCH_BASELINE_MODEL`, `BENCH_SUPERADVISOR_MODEL`,
`BENCH_SETTING_SOURCES` (mặc định `project,local`: không nạp cài đặt/CLAUDE.md/plugin cấp user để hai mode công bằng;
đặt rỗng để dùng mặc định của Claude Code), `BENCH_KEEP=1` (giữ thư mục tạm), `CLAUDE_BIN`.

Mỗi lượt: chép `demo-app/` (không `node_modules`, `.answers/`, `BACKLOG.md`) vào repo git tạm, `npm ci`, commit; với
`superadvisor` thêm `bin/superadvisor init` và commit; chạy `claude -p ... --output-format json --permission-mode acceptEdits
--allowedTools <danh sách>`; sau khi agent xong mới chép `bench/acceptance/<thẻ>.test.ts` vào `tests/` rồi
`npx vitest run tests/`. Chỉ ghi vào thư mục tạm và `<out>` (mặc định `bench/out/<timestamp>/`, đã gitignore).
`<out>/raw/<mode>-<thẻ>-<n>/` giữ JSON gốc, log, `changes.patch` (diff agent tạo ra) để xem lại.

## Đo cái gì

- **Độ chính xác**: tất cả test chấp nhận của thẻ xanh VÀ toàn bộ `tests/` còn lại xanh. Test chấp nhận ẩn với agent.
  Với C6 test chỉ kiểm hành vi; "sửa tận gốc, không vá triệu chứng" và lời giải thích nguyên nhân phải chấm tay theo
  `demo-app/.answers/C6.md` bằng `changes.patch` và báo cáo cuối của agent (chưa có trong `results.jsonl`).
- **Tối ưu**: `total_cost_usd`, token (`modelUsage` theo từng model; thiếu thì `usage`), số lượt, thời gian. Với `superadvisor`,
  `kit_stats` (từ hook + `plugin/scripts/kit-stats.sh`) tách token session chính và subagent theo model, kèm số lần gọi
  agent của kit (`delegations`, 0 nghĩa là leader không giao việc).
- **Tính dùng được**: số lần cần người giúp. Chế độ headless KHÔNG đo được (không có người trong vòng lặp). Cột gần nhất
  là `status` (timeout/lỗi) và `delegations`. Để đo thật, chạy demo leader trực tiếp và đếm số prompt người gõ.

Đo được (Claude Code JSON, Vitest): thành công, chi phí, token, lượt, thời gian. Ước tính: `kit_est_cost_usd` theo bảng
giá mặc định trong `kit-stats.sh` (ghi đè bằng `.claude/metrics/pricing.json`); đừng so trực tiếp với `total_cost_usd`.

## Giả định

- Tên API khi BACKLOG để ngỏ (test chỉ dùng những tên sau; đổi tên sẽ làm test đỏ):
  - C1: `lateFeeCents(dueAt, returnedAt)`, `FEE_PER_DAY_CENTS` (25) trong `src/fees.ts`.
  - C2: mã lỗi `ALREADY_ON_LOAN`; đọc loan qua `listLoans(memberId)`.
  - C3: `reserve(bookId, memberId)`; loan mới của người đặt đọc qua `listLoans(memberId)` (`borrowedAt` = thời điểm
    trả, hạn 14 ngày); thứ tự FIFO được kiểm qua các lần trả liên tiếp. Không kiểm hành vi của người bị bỏ qua sau đó.
  - C4: `new Library({ maxLoansPerMember })`, `addMember(id, name, { maxLoans })`, vượt giới hạn vẫn là `LIMIT_REACHED`,
    giá trị không hợp lệ ném `Error` (không cần là `LibraryError`).
  - C5: `src/dates.ts` export `MS_PER_DAY`, `addDays(date, n)`, `diffMs(a, b)` (dấu của `diffMs` không kiểm); phải có
    `tests/dates.test.ts`; `library.ts`/`fees.ts` import từ `./dates`. Test hành vi tương thích lỗi cũ (trả trễ đúng 1
    ngày vẫn là 50 cent) vì đây là refactor thuần.
  - C6: loan trả trễ không còn trong `listOverdue`; kèm các test không-hồi-quy.
- Mỗi thẻ chạy độc lập trên bản `demo-app` gốc (không cộng dồn các thẻ).
- Cờ `--setting-sources`, `--plugin-dir`, `--allowedTools` và tên model theo bản Claude Code hiện hành; nếu bản của bạn
  khác, sửa đầu `bench/run.sh`. Danh sách công cụ cho phép giới hạn Bash ở `npm/npx/git/node` và vài lệnh đọc.
- Số run ít (1-3) thì `± độ lệch` chỉ mang tính tham khảo; nói rõ N khi trình bày.
