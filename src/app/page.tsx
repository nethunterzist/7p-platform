export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
      <div className="max-w-2xl w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-6">
          7p Platformuna Hoş Geldiniz!
        </h1>
        <p className="text-lg text-gray-600 mb-8">
          Kapsamlı eğitim platformunuz Next.js 15, TypeScript ve Tailwind CSS ile geliştirilmektedir.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-6">
          <a
            href="/login"
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition-colors"
          >
            Giriş Yap
          </a>
          <a
            href="/register"
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-3 px-6 rounded-lg transition-colors"
          >
            Hesap Oluştur
          </a>
        </div>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <a
            href="/dashboard"
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-4 rounded-lg transition-colors text-sm"
          >
            Kontrol Paneli
          </a>
          <div className="bg-gray-100 text-gray-700 font-medium py-2 px-4 rounded-lg text-sm">
            Platform Durumu: Geliştirme Aşamasında
          </div>
        </div>
      </div>
    </div>
  );
}
