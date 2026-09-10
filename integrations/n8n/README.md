# Callcraft Integration for n8n

Panduan integrasi resmi **Callcraft** dengan **n8n**. Mengizinkan n8n mengambil daftar project pengguna, daftar Call Spec berdasarkan project yang dipilih, dan mengeksekusi ekstraksi dokumen AI berstruktur tinggi langsung dari kanvas n8n.

---

## Opsi 1: Menggunakan Custom Community Node (`n8n-nodes-callcraft`)

### 1. Instalasi Node di n8n

#### Untuk Local / Self-Hosted n8n:
1. Masuk ke direktori node:
   ```bash
   cd integrations/n8n/n8n-nodes-callcraft
   bun install # atau npm install
   bun run build # atau npm run build
   ```
2. Hubungkan ke instalasi n8n lokal Anda:
   ```bash
   npm link
   cd ~/.n8n/custom
   npm link n8n-nodes-callcraft
   ```
   *Atau salin folder `dist` dan `package.json` langsung ke folder `~/.n8n/custom/node_modules/n8n-nodes-callcraft`.*
3. Restart n8n server Anda.

---

### 2. Konfigurasi Kredensial di n8n
1. Di n8n, buat kredensial baru: **Callcraft API**.
2. Isi kolom kredensial dari dashboard Callcraft Anda:
   - **Base URL**: `http://localhost:8081` (atau domain API publik Callcraft Anda)
   - **User ID**: `usr_...` (dapat dilihat di dashboard pojok kanan atas atau profile pengguna)
   - **Public Key**: `pk_live_...` (dari menu **API Keys**)
   - **Secret Key**: `call_sk_live_...` (diberikan sekali saat pembuatan API Key)
3. Klik **Save** — n8n akan menguji koneksi secara instan (`GET /v1/projects`).

---

### 3. Menggunakan Node Callcraft di Workflow
1. Tambahkan node **Callcraft** ke workflow Anda.
2. Pilih Resource: **Call Spec**.
3. Pilih Operation: **Execute Spec**.
4. **Project Name or ID**: Pilih project dari dropdown dinamis (otomatis memanggil `GET /v1/projects`).
5. **Spec Name or ID**: Pilih spec dari dropdown dinamis yang otomatis terfilter sesuai project yang dipilih (otomatis memanggil `GET /v1/specs?projectId=...`).
6. Pilih **Input Source**:
   - `Binary File`: membaca file gambar/PDF dari node sebelumnya (misal Telegram, Webhook, Google Drive, Email Read).
   - `Image / Document URL or Base64`: masukkan link dokumen publik atau data base64.
   - `Text Only`: tanpa dokumen.
7. Jalankan workflow — data hasil ekstraksi terstruktur dari Callcraft langsung tersedia di output item berikutnya!

---

## Opsi 2: Menggunakan File Workflow Standar (`Callcraft_Sample_Workflow.json`)

Jika Anda ingin langsung mencoba tanpa instalasi custom node:
1. Buka n8n Dashboard.
2. Di canvas workflow, klik menu titik tiga di kanan atas -> **Import from File...**
3. Pilih file [`Callcraft_Sample_Workflow.json`](./Callcraft_Sample_Workflow.json).
4. Klik node **Set Callcraft Credentials & Config**, lalu ganti `user_id`, `public_key`, dan `secret_key` dengan kredensial akun Anda.
5. Jalankan workflow untuk melihat tahapan:
   - **Step 1**: Mendapatkan daftar project (`GET /v1/projects`).
   - **Step 2**: Mendapatkan daftar spec untuk project terpilih (`GET /v1/specs?projectId=...`).
   - **Step 3**: Mengeksekusi spec (`POST /v1/call`).
