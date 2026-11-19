# AgiAgentKit

[English](README.md) · Tiếng Việt

Chạy nhiều session Claude Code cùng lúc mà không phải trông từng cái.

Tính năng chính của AgiAgentKit là **Session Superadvisor**: một session Claude Code làm **leader**, mở các session
**lane** trong `tmux`, mỗi lane nhận một thẻ backlog, chạy trong git worktree riêng và mở PR riêng. Bạn chỉ nói chuyện
với leader, từ terminal hoặc điện thoại, và chỉ duyệt merge, production và quyền.

Phía sau là một plugin Claude Code nhỏ:

- **5 agent ghim theo tầng model.** Model rẻ đọc, model vừa viết, model mạnh phán đoán.
- **6 hook.** Bốn hook chặn các kiểu đốt token phổ biến và các việc chỉ owner được làm; hai hook ghi số token.
- **Bảng điểm (scorecard)** cho biết session chính và từng subagent đã tiêu bao nhiêu.

## Bắt đầu nhanh

Cần Claude Code, `git`, `tmux` và `jq` trên macOS hoặc Linux. Hướng dẫn đầy đủ (tiếng Anh):
[docs/INSTALL.md](docs/INSTALL.md).

```bash
git clone https://github.com/trungungtoan-agilityio/AgiAgentKit.git
```

```bash
claude plugin marketplace add ./AgiAgentKit
```

```bash
claude plugin install agi-agent-kit@agi-agent-kit
```

```bash
AgiAgentKit/bin/superadvisor init /path/to/your-project
```

```bash
AgiAgentKit/bin/superadvisor up /path/to/your-project
```

Mở session leader (`tmux -L sa attach -t YOUR-PROJECT-LEAD`, hoặc Remote Control trong app Claude) và giao việc:
*"Đọc BACKLOG.md, phân cỡ từng thẻ, mở lane cho C1 và C3."*

## Cách hoạt động

| Vai | Làm | Không bao giờ làm |
|-----|-----|-------------------|
| **Bạn** | Quyết nghiệp vụ; duyệt merge, production, quyền | Giao việc tay cho từng lane |
| **Leader** | Phân cỡ backlog, viết brief, mở lane, gỡ kẹt, báo cáo ≤ 5 dòng | Tự viết khối code lớn |
| **Lane** | Một thẻ, một worktree, một PR | Merge, đẩy lên `main`/`master`/`dev`, sửa settings (hook `owner-guard` chặn) |
| **Brains** | Thư mục `brains/`: quyền, quyết định đã chốt, hộp việc của leader | Tự hành động |

| Agent | Model | Dùng cho |
|-------|-------|----------|
| `scout` | Haiku | Tra cứu chỉ đọc: tìm file, symbol, call site |
| `builder` | Sonnet | Sửa đã rõ nguyên nhân, 1–5 file |
| `tester` | Sonnet | Viết và sửa test |
| `debugger` | Opus | Chưa rõ nguyên nhân, hoặc builder fail hai lần |
| `reviewer` | Opus | Review chỉ đọc một lượt trước PR |

Ngưỡng hook, số đo và mọi lệnh CLI: [docs/reference.md](docs/reference.md). Thiết kế:
[docs/architecture.vi.md](docs/architecture.vi.md).

Slide buổi trình bày tại Agility IO: [PDF](docs/talk/Session-Superadvisor-AgilityIO.pdf) ·
[PowerPoint](docs/talk/Session-Superadvisor-AgilityIO.pptx).

## Tài liệu

- [Hướng dẫn cài đặt](docs/INSTALL.md) (tiếng Anh)
- [Kiến trúc](docs/architecture.vi.md)
- [Vòng đời một thẻ](docs/lifecycle.md) (tiếng Anh)
- [FAQ](docs/faq.md) (tiếng Anh)
- [Tham chiếu](docs/reference.md) (tiếng Anh)
- [Trang giải thích một trang](docs/explainer.html) (tiếng Anh, mở file bằng trình duyệt)
- [Benchmark](bench/README.vi.md)

## Chạy demo

`demo-app/` là một service "mượn sách thư viện" nhỏ với backlog 6 thẻ, từ sửa nhỏ tới một bug khó. Các lệnh dưới giả
định kit nằm ở `~/AgiAgentKit`.

```bash
cp -R ~/AgiAgentKit/demo-app ~/demo-library && cd ~/demo-library && git init -q && git add -A && git commit -qm init && npm install
```

```bash
~/AgiAgentKit/bin/superadvisor init ~/demo-library
```

```bash
~/AgiAgentKit/bin/superadvisor up ~/demo-library
```

Theo dõi bằng `superadvisor status`, bắt lane kẹt bằng `superadvisor patrol`, cuối ngày xem `superadvisor report`.
So sánh có và không có leader: [bench/README.vi.md](bench/README.vi.md).

## Lưu ý

- Thông điệp của skill và hook bằng tiếng Việt; lệnh và tên file bằng tiếng Anh.
- Hook để tiết kiệm token, không phải lớp bảo mật. Thiếu `jq` thì hook cho qua mọi thứ.
- Chi phí trong scorecard là ước tính theo bảng giá, không phải hoá đơn.
- Remote Control cần đăng nhập claude.ai.

## Phát triển

```bash
scripts/test-all.sh
```

`scripts/package.sh` đóng gói zip các file đã commit. Giấy phép: [MIT](LICENSE).
