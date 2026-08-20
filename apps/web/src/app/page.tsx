export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-gradient-to-b from-[#0d1322] to-[#090d16]">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm">
        <div className="flex justify-between items-center bg-slate-900/80 border border-slate-800 rounded-xl p-4 backdrop-blur-md">
          <div className="flex items-center space-x-3">
            <span className="h-3 w-3 rounded-full bg-emerald-500 animate-pulse"></span>
            <h1 className="text-xl font-bold text-white tracking-wider">OCR Platform</h1>
          </div>
          <span className="text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1 rounded-full font-sans font-medium">
            Control Plane Active
          </span>
        </div>
      </div>

      <div className="my-16 text-center max-w-3xl">
        <h2 className="text-4xl font-extrabold text-white tracking-tight sm:text-5xl">
          AI-Powered <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-emerald-400">Stateless OCR Engine</span>
        </h2>
        <p className="mt-4 text-lg text-slate-400">
          Design custom OCR API specifications visually, connect your Gemini or OpenAI API keys, and run high-speed structured document extraction with zero data retention.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl w-full">
        <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl hover:border-slate-700 transition">
          <div className="text-emerald-400 font-bold mb-2">⚡ Data Plane Gateway</div>
          <p className="text-sm text-slate-400">High-throughput Rust Axum execution engine for direct customer API calls.</p>
        </div>
        <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl hover:border-slate-700 transition">
          <div className="text-blue-400 font-bold mb-2">🔒 Privacy-First</div>
          <p className="text-sm text-slate-400">RAM-only image processing. Zero storage on disk, S3, or database.</p>
        </div>
        <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl hover:border-slate-700 transition">
          <div className="text-indigo-400 font-bold mb-2">🤖 Vision AI Tools</div>
          <p className="text-sm text-slate-400">Dynamic Tool & Function Calling conversion for 100% structured JSON.</p>
        </div>
      </div>
    </main>
  );
}
