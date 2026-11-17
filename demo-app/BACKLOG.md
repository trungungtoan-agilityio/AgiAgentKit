# Backlog — Library loans demo

6 thẻ theo thứ tự. Mỗi thẻ làm xong trong vài phút. Lệnh kiểm chung (chạy từ thư mục `demo-app/`):

```
npm run typecheck && npx vitest run tests/
```

Các test hiện có phải luôn xanh. Thẻ nào thêm hành vi mới thì phải thêm test cho hành vi đó.

| Id | Size | Agent / model gợi ý | Tiêu đề |
|----|------|---------------------|---------|
| C1 | S | builder / sonnet | Phí trễ hạn lệch một ngày ở biên |
| C2 | S | builder / sonnet | Cho mượn sách đang được mượn |
| C3 | M | builder / sonnet + reviewer | Hàng đợi đặt trước (reservations) |
| C4 | M | builder / sonnet + reviewer | Giới hạn mượn của hội viên cấu hình được |
| C5 | M | builder / sonnet + reviewer | Tách date helpers ra `src/dates.ts` |
| C6 | L | debugger / opus | `listOverdue` đôi khi trả về loan đã trả (nguyên nhân chưa rõ) |

---

## C1 — Phí trễ hạn lệch một ngày ở biên

- **Size:** S — **Agent:** builder / sonnet
- **Triệu chứng:** Trả sách đúng bằng 1 ngày (24h tròn) sau hạn bị tính 2 ngày phí (50 cent) thay vì 1 ngày (25 cent). Tương tự với mọi số ngày tròn (2 ngày tròn tính 3, ...). Trả trễ lẻ giờ (ví dụ 2,5 ngày) vẫn đúng.
- **Quy tắc đúng:** mỗi ngày đã bắt đầu sau `dueAt` tính `FEE_PER_DAY_CENTS`; trả đúng hoặc trước `dueAt` miễn phí.
- **Done when:**
  - `npx vitest run tests/fees.test.ts` xanh.
  - Có test mới cho các biên: trễ đúng 1 ngày -> 25, đúng 2 ngày -> 50, 1 ngày + 1 phút -> 50.
  - Các test cũ trong `tests/` vẫn xanh; `npm run typecheck` sạch.
- **File có thể đụng:** `src/fees.ts`, `tests/fees.test.ts`

## C2 — Cho mượn sách đang được mượn

- **Size:** S — **Agent:** builder / sonnet
- **Triệu chứng:** `borrow` cho phép hội viên khác (hoặc cùng hội viên) mượn một cuốn sách chưa được trả. Mong muốn: ném `LibraryError` với code `ALREADY_ON_LOAN`.
- **Done when:**
  - `npx vitest run tests/library.test.ts` xanh.
  - Mượn sách đang mượn -> ném `LibraryError` code `ALREADY_ON_LOAN` (thêm code này vào `LibraryErrorCode`); loan cũ không đổi, không tạo loan mới.
  - Sau khi trả sách thì mượn lại được.
  - Có test cho cả hai trường hợp; test cũ vẫn xanh; typecheck sạch.
- **File có thể đụng:** `src/library.ts`, `src/types.ts`, `tests/library.test.ts`

## C3 — Hàng đợi đặt trước (reservations)

- **Size:** M — **Agent:** builder / sonnet, sau đó reviewer
- **Yêu cầu:** Thêm `reserve(bookId, memberId)`: đặt trước một cuốn sách đang được mượn. Khi sách được trả, tự động gán cho người đặt trước đầu hàng đợi (tạo loan mới cho người đó tại thời điểm trả).
- **Done when:**
  - `npx vitest run tests/library.test.ts` xanh.
  - `reserve` chỉ chấp nhận sách đang được mượn; sách đang rảnh -> `LibraryError` (code `NOT_ON_LOAN`); book/member không tồn tại -> `NOT_FOUND`; cùng hội viên đặt hai lần cùng sách -> `DUPLICATE`.
  - Hàng đợi theo thứ tự FIFO; `returnBook` trả loan đã đóng và tự tạo loan mới cho người đặt trước đầu hàng (bỏ qua và chuyển sang người kế tiếp nếu người đó đã chạm giới hạn mượn).
  - Có test cho: một người đặt, nhiều người đặt (thứ tự), người đặt chạm giới hạn, trả sách không có ai đặt (hành vi cũ không đổi).
  - Test cũ xanh; typecheck sạch.
- **File có thể đụng:** `src/library.ts`, `src/types.ts`, `tests/library.test.ts` (hoặc `tests/reservations.test.ts`)

## C4 — Giới hạn mượn của hội viên cấu hình được

- **Size:** M — **Agent:** builder / sonnet, sau đó reviewer
- **Yêu cầu:** Hiện giới hạn 3 loan mở / hội viên là hằng số cứng. Cho phép cấu hình: `new Library({ maxLoansPerMember: 5 })`, mặc định vẫn là 3. Thêm override theo từng hội viên: `addMember(id, name, { maxLoans })`.
- **Done when:**
  - `npx vitest run tests/library.test.ts` xanh.
  - `new Library()` giữ nguyên hành vi (giới hạn 3); `new Library({ maxLoansPerMember: 1 })` chặn ở loan thứ 2.
  - Override theo hội viên thắng giá trị mặc định của thư viện.
  - Giá trị không hợp lệ (không nguyên, < 1) -> ném `Error` ngay khi khởi tạo / thêm hội viên.
  - Có test cho từng điểm trên; test cũ xanh; typecheck sạch.
- **File có thể đụng:** `src/library.ts`, `src/types.ts`, `tests/library.test.ts`

## C5 — Tách date helpers ra `src/dates.ts`

- **Size:** M — **Agent:** builder / sonnet, sau đó reviewer
- **Yêu cầu:** Refactor thuần, **không đổi hành vi**. Hiện hằng số mili-giây/ngày và phép cộng/trừ ngày nằm rải rác trong `src/library.ts` và `src/fees.ts`. Gom về `src/dates.ts` (ví dụ `MS_PER_DAY`, `addDays(date, n)`, `diffMs(a, b)`), các module khác import từ đó.
- **Done when:**
  - `npx vitest run tests/` xanh với **cùng** các test hiện có (không sửa assertion cũ).
  - Không còn định nghĩa `MS_PER_DAY` (hay phép nhân `24 * 60 * 60 * 1000`) ngoài `src/dates.ts`.
  - Có `tests/dates.test.ts` cho các helper mới; typecheck sạch.
  - Diff không thay đổi kết quả của `borrow`, `returnBook`, `listOverdue`, `lateFeeCents`.
- **File có thể đụng:** `src/dates.ts` (mới), `src/library.ts`, `src/fees.ts`, `tests/dates.test.ts` (mới)

## C6 — `listOverdue` đôi khi trả về loan đã trả (nguyên nhân chưa rõ)

- **Size:** L (nguyên nhân chưa rõ) — **Agent:** debugger / opus, sau đó builder nếu cần
- **Triệu chứng:** Có báo cáo từ vận hành: "Danh sách quá hạn thỉnh thoảng vẫn hiện một loan mà hội viên đã trả rồi". Không phải lần nào cũng gặp; các loan trả sớm thì danh sách đúng. Chưa có bước tái hiện chắc chắn.
- **Yêu cầu:** Tìm nguyên nhân gốc, viết một test tái hiện lỗi (đỏ trước khi sửa), sửa tận gốc (không vá triệu chứng bằng cách lọc thêm ở nơi đọc), giải thích ngắn gọn nguyên nhân.
- **Done when:**
  - Có test mới tái hiện được lỗi và test đó xanh sau khi sửa: `npx vitest run tests/library.test.ts`.
  - `npx vitest run tests/` xanh toàn bộ; `npm run typecheck` sạch.
  - Báo cáo nêu nguyên nhân gốc và vì sao triệu chứng chỉ xuất hiện "đôi khi".
- **File có thể đụng:** chưa biết — bắt đầu từ `src/library.ts`
