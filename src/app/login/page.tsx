// MINIMAL LOGIN PAGE FOR DEBUG - NO SUPABASE

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md">
        <h1 className="text-2xl font-bold text-center mb-8">7P Education Giriş - DEBUG</h1>
        
        <div className="mb-4 p-4 bg-green-50 rounded-lg text-sm">
          <p className="font-semibold mb-2">✅ LOGIN PAGE LOADS!</p>
          <p>Middleware completely disabled</p>
          <p>No Supabase imports</p>
          <p>Pure React component</p>
        </div>
        
        <form className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Email</label>
            <input
              type="email"
              className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="test@test.com"
              disabled
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Şifre</label>
            <input
              type="password"
              className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="123456"
              disabled
            />
          </div>
          
          <button
            type="button"
            disabled
            className="w-full bg-gray-400 text-white py-3 px-4 rounded-lg font-medium cursor-not-allowed"
          >
            DEBUG MODE - NO FUNCTIONALITY
          </button>
        </form>
        
        <div className="text-center mt-4">
          <p className="text-sm text-gray-600">
            If you see this, middleware issue is NOT in page component
          </p>
        </div>
      </div>
    </div>
  );
}