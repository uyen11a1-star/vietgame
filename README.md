# VietGame v0.3 — Semantic Analyzer

Bản này tích hợp Lexer + Parser + Semantic Analyzer.

## Chạy trên Termux

Yêu cầu Node.js 18 trở lên.

```bash
npm test
node src/check-cli.js examples/hello.vg
node src/check-cli.js examples/semantic-errors.vg
```

## Cài vào HOME Termux

Sau khi tải ZIP về thư mục Downloads:

```bash
termux-setup-storage
cp ~/storage/downloads/VietGame-Semantic-v0.1.zip ~/
cd ~
pkg install unzip -y
unzip -o ~/VietGame-Semantic-v0.1.zip -d ~/
cd ~/VietGame-v0.1
npm test
```

Thư mục đích là `~/VietGame-v0.1`, kế thừa dự án Parser trước đó.

## Semantic Analyzer kiểm tra

- Biến đã khai báo hay chưa
- Trùng tên trong cùng phạm vi
- Suy luận kiểu cơ bản
- Gán giá trị có phù hợp kiểu không
- Điều kiện cần kiểu logic
- Toán tử số học và logic
- Hàm có tồn tại và đúng số lượng tham số không
- Kiểu đối số so với kiểu tham số
- `traVe` chỉ xuất hiện trong hàm và phù hợp kiểu trả về

## Lưu ý

Đây là bản nền tảng. Chưa hỗ trợ đầy đủ hệ thống class, module, generic, kiểu phần tử mảng, flow analysis và mọi API game.
