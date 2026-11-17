# Ngân sách token

Token là chi phí thật. Mục tiêu: cùng kết quả, ít ngữ cảnh hơn.

- **Giới hạn lượt:** một thẻ nên xong trong khoảng 30-40 lượt công cụ. Quá ngưỡng mà chưa tiến triển: dừng, báo
  leader, để leader viết lại brief hẹp hơn thay vì cố tiếp.
- **Test mục tiêu:** chỉ chạy test của file/module vừa sửa (`<lệnh test mục tiêu>` trong CLAUDE.md). Chạy test đầy
  đủ một lần trước khi mở PR, không chạy lại khi HEAD không đổi.
- **Một vòng review:** mặc định một vòng; vòng hai chỉ kiểm điểm High/Critical đã sửa. Không review lại cả PR.
- **Một lane mỗi thẻ:** thẻ mới = session mới (ngữ cảnh sạch). Không dồn nhiều thẻ vào một session dài.
- **Compaction ở 200k:** lane chạy với `CLAUDE_CODE_AUTO_COMPACT_WINDOW=200000`. Sau khi nén, đọc lại brief
  (`KIT_LANE_BRIEF`) trước khi làm tiếp.
- **Đọc ít, đọc đúng:** file > 400 dòng thì giao `scout` (haiku) tóm tắt; dùng grep/đọc theo dòng thay vì đọc cả file.
- **Model đúng cỡ:** haiku cho đọc/tìm, sonnet cho viết code và test, opus chỉ cho review và debug khó.
- **Đo, đừng đoán:** chạy `plugin/scripts/kit-stats.sh` (hoặc `superadvisor report`) để xem chi phí session chính
  và theo từng model. Nếu session chính đắt hơn các lane, leader đang làm việc của lane: giao bớt đi.
