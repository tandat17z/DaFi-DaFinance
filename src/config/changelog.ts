import type { ChangelogEntry } from '@tada/kit/brand'

/** Newest first. The first entry is the version shown in the header: add a new one on every release. */
export const changelog: ChangelogEntry[] = [
  {
    version: '1.0.0',
    date: '2026-10-03',
    changes: [
      { kind: 'added', text: { en: 'Income and spending by category, with a quick add form, a searchable list grouped by day and CSV export', vi: 'Thu chi theo danh mục, form nhập nhanh, danh sách tìm kiếm theo ngày và xuất CSV' } },
      { kind: 'added', text: { en: 'Monthly view and statistics: savings rate, spending by weekday / week / month, heat-map calendar, category donut', vi: 'Xem theo tháng và thống kê: tỉ lệ tiết kiệm, chi theo thứ / tuần / tháng, lịch nhiệt, biểu đồ quạt theo danh mục' } },
      { kind: 'added', text: { en: 'Savings and investments, with total assets and profit', vi: 'Tiết kiệm và đầu tư, kèm tổng tài sản và lãi / lỗ' } },
      { kind: 'added', text: { en: 'Works without an account: data stays in this browser; signed-in users can ask for server storage to use it on every device', vi: 'Dùng được không cần tài khoản: dữ liệu lưu trên trình duyệt; người đăng nhập có thể xin lưu trên server để dùng trên mọi thiết bị' } },
      { kind: 'added', text: { en: 'iPhone Shortcut: log a payment from a bank receipt screen with on-device OCR', vi: 'Phím tắt iPhone: ghi khoản chi từ màn hình biên lai, OCR ngay trên máy' } },
      { kind: 'added', text: { en: 'Vietnamese and English, dark theme, phone and desktop layouts', vi: 'Tiếng Việt và tiếng Anh, giao diện tối, dùng tốt trên điện thoại và máy tính' } },
    ],
  },
]
