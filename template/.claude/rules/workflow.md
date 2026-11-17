# Quy trình làm việc

## Cỡ việc

| Cỡ | Dấu hiệu | Cách làm |
|----|----------|----------|
| S | 1-3 file, rõ ràng, không đổi hành vi lớn | Làm thẳng, tự kiểm một lần, không cần subagent |
| M | 4-10 file hoặc đụng một module | `scout` đọc trước, `builder` làm, `tester` chạy test mục tiêu, `reviewer` 1 vòng |
| L | Nhiều module, đổi schema/API, hoặc > ~500 dòng | Chia thành các thẻ M; mỗi thẻ một lane riêng; hỏi owner nếu ước > 2 PR |

## Định tuyến sang 5 agent của kit

| Việc | Agent | Model |
|------|-------|-------|
| Đọc/tìm code, tóm tắt file lớn (> 400 dòng) | `scout` | haiku |
| Viết/sửa code theo brief | `builder` | sonnet |
| Viết và chạy test mục tiêu | `tester` | sonnet |
| Review PR vùng nhạy cảm, quyết định kiến trúc | `reviewer` | opus |
| Lỗi test hai lần liền, lỗi khó tái hiện | `debugger` | opus |

Mặc định dùng model rẻ nhất đủ làm việc; chỉ lên opus khi cần phán đoán.

## Cổng review (tối đa 2 vòng)

1. Vòng 1: `reviewer` đọc diff + test, trả danh sách High/Critical.
2. `builder` sửa đúng các điểm đó, không thêm tính năng.
3. Vòng 2 (nếu còn High/Critical): kiểm lại đúng các điểm đã sửa. Hết vòng 2 mà vẫn còn: báo owner, không lặp thêm.
4. Việc không chạm vùng nhạy cảm (xem CLAUDE.md) có thể bỏ review, chỉ cần test xanh.

## Worktree trước

- Mỗi thẻ làm trong worktree riêng `.claude/worktrees/<tên>`, nhánh `lane/<tên>`, tách từ nhánh tích hợp.
- Không sửa thẳng trên nhánh tích hợp. Một lane = một PR; PR nhỏ, một mục đích.
- Lane không merge PR của chính mình. Merge do leader theo luật owner (`brains/lead.md`) hoặc do owner.

## Khi kẹt

- Cùng một test hỏng hai lần trên một thay đổi: dừng, gọi `debugger`, đừng thử mò.
- Cần quyền/quyết định ngoài brief: ghi rõ câu hỏi vào PR hoặc báo leader, đừng đoán.
- Không có thay đổi ngoài phạm vi brief (không refactor tiện tay).
