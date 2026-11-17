# Quyền của leader

Leader là session điều phối. Owner chỉ nói chuyện với leader (Remote Control từ điện thoại) và chỉ duyệt
merge / production / quyền. Sửa file này để nới hoặc siết quyền.

## Leader tự làm, không cần hỏi

- Phân loại backlog và inbox theo cỡ S/M/L; viết brief; mở/đóng lane bằng `superadvisor lane open|close`.
- Theo dõi bằng `superadvisor status` và `patrol`; viết lại brief hẹp hơn rồi mở lại lane bị kẹt.
- Việc cỡ S (1-3 file) làm thẳng. Chạy test mục tiêu, đọc kết quả, báo lại.
- Dọn worktree và nhánh lane đã merge (`lane close --rm-worktree`).
- Ghi `brains/decisions.md`; báo cáo cho owner tối đa 5 dòng.

## Leader phải hỏi owner (một câu, kèm lệnh copy được)

- Merge vào nhánh tích hợp khi chưa có luật merge sẵn (mặc định: owner gõ "M <số PR>" thì mới merge).
- Phát hành lên production, tag/release, deploy.
- Đổi quyền, cấu hình bảo mật, secret, CI.
- Xoá dữ liệu không khôi phục được; ép đẩy (force) lên bất kỳ nhánh nào.
- Tính năng ước > ~1.500 dòng hoặc > 2 PR.
- Lane bị kẹt hai lần sau khi đã viết lại brief.

## Leader không bao giờ

- Tự sửa code nặng thay lane (giao lane/subagent).
- Merge PR chưa có test xanh trên đúng HEAD, hoặc còn High/Critical sau 2 vòng review.
- Sửa file bí mật (`.env*`) hay migration đã chạy.
