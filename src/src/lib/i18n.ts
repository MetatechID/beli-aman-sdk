// All Bahasa-Indonesia copy strings used by the SDK live here.
// Keep verb-first ("Bayar Aman", not "Pembayaran Aman").

export const t = {
  cta: {
    beliAman: "Bayar Aman",
    continueWithGoogle: "Lanjutkan dengan Google",
    continueWithWhatsApp: "Lanjutkan dengan WhatsApp",
    continueWithEmail: "Lanjutkan dengan Email",
    sendCode: "Kirim Kode",
    verifyCode: "Verifikasi",
    useDifferentMethod: "Gunakan cara lain",
    resendCode: "Kirim ulang kode",
    continueToReview: "Lanjut ke Tinjauan",
    continueToPayment: "Lanjut → Bayar Aman",
    payNow: "Bayar Aman Sekarang",
    iHavePaid: "Saya sudah bayar",
    viewOrder: "Lihat Pesanan",
    close: "Tutup",
    backToShop: "Kembali ke Toko",
    confirmReceipt: "Sudah diterima, semua oke",
  },
  step: {
    signInTitle: "Masuk untuk Melindungi Pembelian Anda",
    signInBlurb:
      "Beli Aman menahan dana Anda di escrow sampai barang diterima.",
    signInPhonePlaceholder: "Nomor WhatsApp (08… atau +62…)",
    signInEmailPlaceholder: "Alamat email Anda",
    signInCodePlaceholder: "Kode 6 digit",
    signInCodeSentWa: "Kode telah dikirim via WhatsApp ke",
    signInCodeSentEmail: "Kode telah dikirim ke",
    cartReviewTitle: "Tinjau Pesanan",
    confirmTitle: "Konfirmasi Pembayaran",
    paymentTitle: "Pilih Metode Pembayaran",
    processingTitle: "Memproses Pembayaran...",
    doneTitle: "Dana Anda Aman",
    doneBlurb:
      "Pembayaran berhasil. Dana ditahan oleh Beli Aman sampai Anda mengonfirmasi barang diterima.",
  },
  field: {
    address: "Alamat Pengiriman",
    paymentMethod: "Metode Pembayaran",
    subtotal: "Subtotal",
    shipping: "Ongkir",
    total: "Total",
    fee: "Biaya Layanan",
    expiresIn: "Bayar dalam",
    vaNumber: "Nomor Virtual Account",
    copy: "Salin",
    copied: "Tersalin!",
    paymentCode: "Kode Pembayaran",
  },
  escrow: {
    explainerTitle: "Bagaimana Beli Aman Melindungi Anda",
    held: "Dana ditahan",
    heldBlurb: "Penjual tidak menerima pembayaran sampai barang sampai.",
    received: "Barang diterima",
    receivedBlurb: "Anda konfirmasi sudah terima atau otomatis setelah 3 hari.",
    released: "Penjual dibayar",
    releasedBlurb: "Dana baru diteruskan ke penjual setelah Anda terima.",
  },
  payment: {
    tabVA: "Virtual Account",
    tabEwallet: "E-Wallet",
    tabQris: "QRIS",
    tabCard: "Kartu Kredit",
    tabRetail: "Gerai Retail",
    vaInstruction:
      "Transfer ke nomor VA di bawah ini dalam 24 jam. Pembayaran otomatis terkonfirmasi.",
    qrisInstruction: "Scan dengan aplikasi pembayaran apa pun (GoPay/OVO/DANA/etc).",
    ewalletInstruction:
      "Buka aplikasi e-wallet Anda, lalu scan QR di bawah atau klik 'Buka di aplikasi'.",
    retailInstruction:
      "Tunjukkan kode pembayaran ini di kasir Alfamart atau Indomaret terdekat.",
    cardSecure: "Pembayaran kartu diamankan oleh Xendit (PCI-DSS compliant).",
  },
  error: {
    signInFailed: "Gagal masuk. Coba lagi.",
    networkFailed: "Koneksi terputus. Coba lagi dalam beberapa detik.",
    sessionExpired: "Sesi berakhir. Silakan masuk kembali.",
    invalidPhone: "Nomor WhatsApp tidak valid.",
    invalidEmail: "Alamat email tidak valid.",
    invalidCode: "Kode salah atau sudah kedaluwarsa.",
  },
} as const;

export function formatIDR(value: number): string {
  return "Rp " + value.toLocaleString("id-ID");
}
