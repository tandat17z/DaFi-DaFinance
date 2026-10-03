import type { ChangelogEntry } from '@tada/kit/brand'

/** Newest first. The first entry is the version shown in the header: add a new one on every release. */
export const changelog: ChangelogEntry[] = [
  {
    version: '1.1.0',
    date: '2026-10-03',
    changes: [
      { kind: 'added', text: { en: 'Settings: light theme, your own categories with icons, a monthly budget per category with an over-budget alert', vi: 'Cài đặt: giao diện sáng, danh mục riêng kèm biểu tượng, ngân sách tháng cho từng danh mục và cảnh báo khi vượt' } },
      { kind: 'added', text: { en: 'Quick math in the amount field, with calculator keys', vi: 'Tính nhanh ngay trong ô số tiền, có bàn phím máy tính' } },
      { kind: 'added', text: { en: 'Install as an app on Android and desktop', vi: 'Cài làm ứng dụng trên Android và máy tính' } },
      { kind: 'added', text: { en: 'Settings are kept on the server when your data is, so every device shares them', vi: 'Cài đặt được lưu trên server cùng dữ liệu, mọi thiết bị dùng chung' } },
      { kind: 'added', text: { en: 'Link another sign-in email to your account and see the same data', vi: 'Liên kết email đăng nhập khác với tài khoản của bạn để xem cùng dữ liệu' } },
      { kind: 'changed', text: { en: 'People already approved keep using the app when it is private; others see nothing', vi: 'Người đã được duyệt vẫn dùng được khi app để riêng tư; người khác không thấy gì' } },
    ],
  },
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
