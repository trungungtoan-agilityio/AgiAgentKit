# Tài liệu buổi nói chuyện

Các trang bổ sung cho buổi nói chuyện Superadvisor (`Session-Superadvisor-AgilityIO.pdf` / `.pptx`). Mở file HTML bằng
trình duyệt; trang không gửi request mạng nào.

Nguồn sinh hai file deck (`.pptx` / `.pdf`) nằm trong [`src/`](src/) — xem [`src/README.md`](src/README.md) để build lại.

| Trang | Spec | Nội dung |
|-------|------|----------|
| [handout.html](handout.html) | `handout.yaml` | Tài liệu đi kèm (tiếng Anh): vấn đề, sơ đồ leader/lanes/brains, vòng đời một thẻ, trạng thái lane, lịch cron, biểu đồ benchmark |
| [qa.html](qa.html) | `qa.yaml` | Hỏi đáp cho đội áp dụng kit: câu trả lời từ FAQ, luồng và checklist cài đặt, cây quyết định khi lane kẹt, giới hạn đã biết |
| [cheatsheet.html](cheatsheet.html) | `cheatsheet.yaml` | Bản đồ lệnh `superadvisor`, lịch cron, biến môi trường, hook, đường dẫn brains |

Dữ kiện lấy từ slide, `docs/lifecycle.md`, `docs/faq.md`, `docs/reference.md`, `docs/INSTALL.md` và
`bench/results.md`. Sửa file YAML, không sửa HTML.

## Tạo lại trang

Các trang được biên dịch bằng skill `ak-render` (`plugin/skills/ak-render/`), pin vào `@bestagentkits/render` 0.3.0.
Chạy từ thư mục gốc của repo:

```bash
npx -y @bestagentkits/render@0.3.0 validate docs/talk/handout.yaml --json
```

```bash
npx -y @bestagentkits/render docs/talk/handout.yaml --out docs/talk/handout.html
```

Làm tương tự với `qa.yaml` và `cheatsheet.yaml`. Giữ theme `paper-ink` hoặc `swiss-clean`: font nhúng của vài theme
khác chứa chuỗi bị bộ quét từ cấm bắt nhầm.

## Hình isometric

`img/architecture.svg` (handout) và `img/stuck-lane.svg` (hỏi đáp) là SVG tĩnh, cùng phép chiếu và bảng màu với
`docs/atlas.html`, tự đổi màu theo chế độ sáng/tối của hệ thống. Script tạo hình không cần thư viện nào:

```bash
node docs/talk/img/src/iso-diagrams.mjs
```

Chạy xong thì compile lại trang dùng hình đó.
