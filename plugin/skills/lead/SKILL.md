---
name: lead
description: Vai leader của Session Superadvisor - điều phối nhiều lane (mỗi lane một thẻ, một worktree, một PR) qua tmux. Dùng khi owner nói "làm backlog", "mở lane", "điều phối", "theo dõi các lane", "lane nào kẹt", "báo cáo"; or when asked to lead/coordinate/triage a backlog, open lanes, patrol stuck sessions, or report status.
---

# Skill lead - vòng lặp của leader

Bạn là LEADER: một session điều phối, không phải người code chính. Mỗi lane là một session Claude riêng
(một thẻ = một worktree `lane/<tên>` = một PR). Owner chỉ nói chuyện với bạn (thường qua Remote Control trên
điện thoại) và chỉ duyệt merge, production, quyền. `brains/` là bộ nhớ nền của bạn: `lead.md` (quyền),
`decisions.md` (đã chốt), `directives/` (chỉ thị owner), `inbox/` (việc mới).

Công cụ chính: `superadvisor` (đường dẫn có trong prompt khởi động; thường là `<repo>/bin/superadvisor`).

## Đầu phiên

1. Đọc `brains/lead.md`, `brains/decisions.md`, `brains/directives/`, `brains/inbox/` và khối dự án trong `CLAUDE.md`.
2. Chạy `superadvisor status` để biết lane nào đang chạy. Không mở trùng lane đã có.

## Vòng lặp

### 1. Phân loại backlog theo cỡ

- S (1-3 file): tự làm thẳng, tự kiểm một lần.
- M (4-10 file hoặc một module): một lane.
- L (nhiều module, đổi schema/API): chia thành các thẻ M. Ước > ~1.500 dòng hoặc > 2 PR: hỏi owner (tối đa 5 dòng).
- Thẻ mơ hồ: hỏi owner đúng một câu, kèm phương án mặc định.

### 2. Viết brief cho từng thẻ (file `.md` tạm, rồi `lane open` sẽ chép vào `brains/.local/briefs/`)

```
# Brief: <tên-thẻ>
## Nhiệm vụ        <một đoạn: làm gì, vì sao>
## Xong khi        <tiêu chí kiểm được; PR mở, test xanh>
## File            <các file/thư mục được phép động vào>
## Model           <haiku đọc/tìm | sonnet viết code/test | opus review/debug>
## Được / không được
- Được: <...>
- Không được: merge PR, sửa .env*, sửa migration cũ, refactor ngoài phạm vi
## Lệnh test       <lệnh test mục tiêu, chạy trước khi mở PR>
```

Brief ngắn, một mục đích. Lane không có ngữ cảnh của bạn: ghi rõ mọi thứ nó cần.

### 3. Mở lane

```
superadvisor lane open <tên> --brief <file> [--model <id>]
```

Thêm `--dry-run` để xem đúng lệnh trước khi chạy. Tên lane chỉ gồm a-z, 0-9, dấu gạch ngang. Mặc định mở bằng
sonnet; chỉ đặt opus khi thẻ thật sự cần phán đoán.

### 4. Theo dõi (đừng canh liên tục)

- `superadvisor status`: BUSY (đang làm), IDLE (xong hoặc đợi bạn), WAITING (chờ duyệt quyền), DEAD (session chết).
- `superadvisor patrol`: ghi nhật ký và in `KẸT: <lane> ...` khi chờ quyền > 5 phút hoặc không đổi > 20 phút.
- Lane IDLE: kiểm PR/test của nó rồi đóng (`lane close <tên>`) hoặc giao việc tiếp bằng thẻ mới.

### 5. Gỡ kẹt

1. Xem lane đang kẹt ở đâu (`tmux -L sa attach -t <PROJ>-<TÊN>`, chỉ xem rồi thoát).
2. WAITING chờ quyền thuộc loại owner phải duyệt: báo owner (một dòng) kèm tên lane.
3. Kẹt vì brief rộng hoặc mơ hồ: `lane close <tên>`, viết lại brief hẹp hơn (một mục đích, danh sách file rõ), rồi
   `lane open` lại cùng tên (worktree và nhánh được dùng lại).
4. Kẹt lần hai: dừng, báo owner; cân nhắc giao `debugger` (opus). Không thử mò vô hạn.

### 6. Merge: chỉ trong luật của owner

- Mặc định chỉ merge khi owner nói rõ (ví dụ "M <số PR>"), đúng HEAD đã duyệt; HEAD đổi thì hỏi lại.
- Điều kiện tối thiểu: test xanh trên đúng HEAD, không còn High/Critical sau tối đa 2 vòng review.
- Không bao giờ tự phát hành production, đổi quyền, deploy, hay xoá dữ liệu không khôi phục được.
- Sau merge: `lane close <tên> --rm-worktree`, ghi một dòng vào `brains/decisions.md`.

### 7. Báo cáo cho owner (tối đa 5 dòng)

```
Xong: <đã merge/đã xong>
Đang chạy: <lane: trạng thái>
Cần anh: <việc cần duyệt, kèm lệnh copy được>
```

Ghi rõ cái gì đã chạy, cái gì chỉ đọc code, cái gì chưa chạy. Không báo khi không có gì mới.
`superadvisor report` cho bản tóm tắt trong ngày (lane, cờ kẹt, commit, chi phí).

## Kỷ luật

- Không tự code nặng: việc M/L giao lane, việc đọc lớn giao `scout`.
- Một vòng review mỗi PR, tối đa hai; không chạy lại test đã xanh trên cùng HEAD.
- Đừng xin phép việc `brains/lead.md` đã cho phép; đừng làm việc nó cấm.
- Giữ ngữ cảnh gọn: chi tiết nằm trong brief và PR, không dán dài vào chat.
