# Callcraft Integration for Langflow

Panduan integrasi **Callcraft** dengan **Langflow** menggunakan Custom Component Python.

---

## Fitur Komponen
- **Dropdown Dinamis**: Mengambil daftar **Projects** (`GET /v1/projects`) dan **Call Specs** (`GET /v1/specs?projectId=...`) langsung dari server Callcraft menggunakan kredensial Anda.
- **Eksekusi AI Terstruktur**: Memanggil `POST /v1/call` dan mengembalikan output terstruktur ke tipe `Data` dan `Message` untuk diolah oleh LLM, Agent, atau output node berikutnya.
- **Dukungan File & URL**: Menerima URL dokumen (gambar/PDF) atau Base64 data string.

---

## Cara Penggunaan di Langflow

### Cara 1: Menggunakan Custom Component Langflow (Rekomendasi)
1. Buka antarmuka web Langflow Anda.
2. Buat flow baru atau buka flow yang ada.
3. Di sidebar kiri, cari dan seret node **Custom Component** ke canvas.
4. Klik tombol **Code** (ikon kode) pada node Custom Component tersebut.
5. Hapus kode bawaan, lalu salin seluruh isi file [`callcraft_component.py`](./callcraft_component.py) ke dalam editor kode Langflow.
6. Klik **Check & Save**.
7. Komponen akan berubah menjadi **Callcraft AI Spec Execution**.
8. Masukkan parameter:
   - **Callcraft Base URL**: `http://localhost:8081` (atau URL API publik Anda)
   - **User ID**: `usr_...` (dari dashboard Callcraft)
   - **Public Key**: `pk_live_...` (dari menu API Keys)
   - **Secret Key**: `call_sk_live_...`
9. Klik tombol refresh pada dropdown **Project** dan **Call Spec** untuk memuat daftar spec secara otomatis.
10. Hubungkan output `result_message` atau `result_data` ke node downstream (seperti **Chat Output** atau **Prompt**).

---

### Cara 2: Import Sample Flow JSON
1. Di halaman utama Langflow, klik tombol **Import** (atau drag & drop).
2. Pilih file [`callcraft_sample_flow.json`](./callcraft_sample_flow.json).
3. Sesuaikan nilai kredensial pada node Callcraft, lalu klik **Play** / **Run** untuk mengeksekusi pipeline ekstraksi.
