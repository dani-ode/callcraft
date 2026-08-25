Menangani skenario kegagalan (*unhappy paths*) adalah ciri utama dari sistem berskala *enterprise*. Jika API Anda menjadi pusat (otak) dari semua otomatisasi, maka ia **tidak boleh** sekadar mati atau *crash* (*HTTP 500 Internal Server Error*) tanpa alasan jelas saat menerima data yang salah.

API Anda harus memberikan respons error yang **terstruktur, informatif, dan dapat ditindaklanjuti (actionable)** oleh sistem pemanggil (seperti n8n atau *frontend*).

Karena kita sudah menggunakan **Envelope Pattern**, kita akan mempertahankan konsistensi struktur. Jika terjadi error, blok `data` diganti dengan blok `error`, namun blok `meta` tetap dipertahankan agar sistem pemanggil (n8n) tetap bisa melacak `request_id`-nya.

Berikut adalah strategi penanganan error (*Error Handling*) yang komprehensif:

---

### 1. Format JSON Saat Terjadi Error

```json
{
  "meta": {
    "requestId": "req_882391009_xyz",
    "timestamp": "2026-08-23T20:07:15Z",
    "status": "failed",
    "apiVersion": "v2.1"
  },
  "error": {
    "code": "INVALID_IMAGE_FORMAT",
    "message": "Gambar tidak dapat diproses. Pastikan formatnya adalah JPG atau PNG, dan resolusi tidak melebihi 4K.",
    "details": [
      {
        "field": "image.data",
        "issue": "String Base64 corrupt atau bukan format gambar yang dikenali."
      }
    ],
    "actionableStep": "Silakan kompres gambar atau periksa kembali proses encoding Base64 di sisi client."
  },
  "executionTrace": {
    "totalDurationMs": 120,
    "steps": [],
    "warnings": []
  }
}

```

### 2. Kategori Error dan Cara API Meresponsnya

Dalam API Tool Calling AI, error biasanya terbagi menjadi 3 level. Anda wajib memetakan HTTP Status Code yang tepat agar sistem seperti n8n bisa otomatis tahu apa yang harus dilakukan (misal: *retry* atau batalkan).

#### A. Level Client (Kesalahan Input) - HTTP 400 / 422

Terjadi sebelum data masuk ke AI. FastAPI (menggunakan Pydantic) sangat hebat dalam menangkap ini secara otomatis.

* **Kasus:** *Payload* JSON kurang (misal tidak ada `prompt`), gambar rusak (Base64 salah), atau tipe data salah (diminta angka malah dikirim teks).
* **Respons:** API langsung menolak dalam milidetik.
* **Error Code:** `VALIDATION_ERROR`, `UNSUPPORTED_MEDIA_TYPE`.
* **Tindakan di n8n:** Jangan *auto-retry*, karena dikirim 100x pun akan tetap gagal. Client harus memperbaiki datanya.

#### B. Level AI & Model (Kegagalan Kognitif / Safety) - HTTP 422 / 403

Data masuk ke AI, tapi AI menolak atau gagal memprosesnya.

* **Kasus 1 (Safety Trigger):** Gambar mengandung unsur yang melanggar kebijakan AI (misal: kekerasan atau data pribadi sensitif).
* **Error Code:** `AI_SAFETY_BLOCK`.


* **Kasus 2 (Vision Failure):** Gambar valid secara file, tapi terlalu blur atau teks tidak terbaca oleh model Vision.
* **Error Code:** `VISION_EXTRACTION_FAILED`.


* **Kasus 3 (Hallucination):** AI berhalusinasi dan memberikan parameter *tool* yang salah format (misal, AI mengirim nama kolom database yang tidak ada).
* **Error Code:** `AI_HALLUCINATION_DETECTED`. *(Catatan: Di sini sistem Anda harus melakukan auto-retry internal 1-2 kali sebelum mengirim error ini ke client).*



#### C. Level Eksekusi Tool & Infrastruktur - HTTP 500 / 502 / 504

AI mengerti tugasnya, memberikan instruksi yang benar, tapi eksekusi di server gagal.

* **Kasus 1:** AI meminta eksekusi tool `query_milvus_db`, tapi server Milvus sedang *down*.
* **Error Code:** `TOOL_EXECUTION_FAILED`.
* **Detail:** Menyertakan log error dari Milvus.


* **Kasus 2:** API Provider (OpenAI/Gemini) sedang gangguan (*Rate Limit* atau *Timeout*).
* **Error Code:** `UPSTREAM_AI_TIMEOUT` (HTTP 504) atau `RATE_LIMIT_EXCEEDED` (HTTP 429).
* **Tindakan di n8n:** n8n bisa melakukan *Exponential Backoff* (menunggu 5 detik, coba lagi, lalu tunggu 10 detik, coba lagi).



---

### 3. Implementasi "Graceful Degradation" (Kegagalan Parsial)

Dalam skenario kompleks (ingat contoh memanggil 3 *tools* di obrolan sebelumnya), bagaimana jika 2 *tools* sukses, tapi 1 *tool* gagal?

Sebagai API kelas *enterprise*, Anda jangan langsung membuang hasil yang sudah sukses. Anda menggunakan status **`partialSuccess`**.

```json
{
  "meta": {
    "requestId": "req_882391010_pqr",
    "status": "partialSuccess"
  },
  "data": {
    "primaryResult": {
      "estimasiBiaya": 450000000 
    },
    "humanReadableMessage": "Analisis denah dan estimasi biaya berhasil, namun sistem gagal menjadwalkannya di kalender."
  },
  "error": {
    "code": "PARTIAL_TOOL_FAILURE",
    "message": "Gagal mengeksekusi tool 'create_calendar_event'.",
    "details": [{"issue": "Google Calendar API sedang down (HTTP 503)."}]
  },
  "executionTrace": {
    "steps": [
      {"toolName": "vision_analysis", "status": "success"},
      {"toolName": "query_milvus_db", "status": "success"},
      {"toolName": "create_calendar_event", "status": "failed"} 
    ]
  }
}

```

### Kesimpulan untuk Arsitek API

Dengan menyertakan `error.code` yang distandarisasi (huruf kapital, tanpa spasi), *engineer* yang menggunakan n8n di perusahaan Anda bisa membuat *Switch Node* (IF-Condition).
Misalnya:

* *Jika error code == `AI_SAFETY_BLOCK`, kirim notifikasi ke Telegram admin.*
* *Jika error code == `RATE_LIMIT_EXCEEDED`, tunggu 10 detik dan coba lagi.*
* *Jika `status` == `partial_success`, teruskan data yang berhasil diselamatkan ke database.*

Ini membuat ekosistem otomatisasi perusahaan Anda menjadi luar biasa stabil (*resilient*).