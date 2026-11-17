# Library loans demo

Dự án mẫu nhỏ (Node 20+, TypeScript strict, Vitest) dùng để minh họa cách một leader session giao thẻ việc cho các lane session, và làm khối lượng công việc cố định cho benchmark. Không có web server, không có dữ liệu thật.

Miền nghiệp vụ: dịch vụ mượn sách trong bộ nhớ (`src/library.ts`): thêm sách / hội viên, mượn, trả, liệt kê loan quá hạn, tính phí trễ hạn (`src/fees.ts`).

## Cài đặt và chạy test

```
npm install
npm test                           # chạy toàn bộ test
npx vitest run tests/fees.test.ts  # chạy một file test
npm run typecheck                  # tsc --noEmit
```

## Backlog

`BACKLOG.md` có 6 thẻ (`C1`…`C6`) với kích cỡ, agent/model gợi ý, tiêu chí "done when" và file có thể đụng. Thẻ nhỏ đã biết cách sửa đi với model rẻ; thẻ có nguyên nhân chưa rõ đi với model mạnh. Test hiện có đều xanh; các thẻ mô tả phần còn thiếu.

Thư mục `.answers/` chỉ dành cho người chấm benchmark. Agent làm thẻ không được đọc.
