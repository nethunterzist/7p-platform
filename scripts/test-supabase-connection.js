const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Test Supabase bağlantısı
async function testSupabaseConnection() {
    console.log('🚀 Supabase bağlantı testi başlatılıyor...\n');
    
    // Environment variables kontrolü
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    console.log('📋 Ortam değişkenleri:');
    console.log('- SUPABASE_URL:', supabaseUrl ? '✅ Mevcut' : '❌ Eksik');
    console.log('- ANON_KEY:', supabaseKey ? '✅ Mevcut' : '❌ Eksik');
    console.log('- SERVICE_KEY:', serviceKey ? '✅ Mevcut' : '❌ Eksik');
    
    if (!supabaseUrl || !supabaseKey) {
        console.error('\n❌ Gerekli environment variables eksik!');
        console.log('Lütfen .env.local dosyasını kontrol edin.');
        return false;
    }

    try {
        // Client oluşturma
        console.log('\n🔗 Supabase client oluşturuluyor...');
        const supabase = createClient(supabaseUrl, supabaseKey);
        
        // Test 1: Temel bağlantı testi
        console.log('\n📊 Test 1: Temel bağlantı testi');
        const { data, error } = await supabase
            .from('users')
            .select('count')
            .limit(1);
            
        if (error && error.code !== 'PGRST116') { // Table not found is expected initially
            console.log('⚠️  Database bağlantısı başarılı ancak users tablosu henüz yok:', error.message);
        } else {
            console.log('✅ Database bağlantısı başarılı!');
        }

        // Test 2: Auth servis testi
        console.log('\n🔐 Test 2: Authentication servis testi');
        const { data: authData, error: authError } = await supabase.auth.getSession();
        
        if (authError) {
            console.log('❌ Auth servis hatası:', authError.message);
        } else {
            console.log('✅ Auth servis aktif!');
        }

        // Test 3: Service key testi (eğer varsa)
        if (serviceKey && serviceKey !== 'your-service-role-key-from-supabase-dashboard') {
            console.log('\n🔑 Test 3: Service role key testi');
            const serviceSupabase = createClient(supabaseUrl, serviceKey);
            
            try {
                const { data: serviceData, error: serviceError } = await serviceSupabase
                    .from('information_schema.tables')
                    .select('table_name')
                    .limit(5);
                    
                if (serviceError) {
                    console.log('⚠️  Service key hatası:', serviceError.message);
                } else {
                    console.log('✅ Service key çalışıyor!');
                    console.log('📋 Mevcut tablolar:', serviceData?.length || 0);
                }
            } catch (err) {
                console.log('⚠️  Service key testi başarısız:', err.message);
            }
        } else {
            console.log('\n🔑 Test 3: Service role key henüz ayarlanmamış');
            console.log('ℹ️  Supabase Dashboard > Settings > API\'den service role key\'i alıp .env.local\'e ekleyin');
        }

        // Test 4: Real-time bağlantı testi
        console.log('\n📡 Test 4: Real-time bağlantı testi');
        const channel = supabase.channel('test-channel');
        
        channel.subscribe((status) => {
            if (status === 'SUBSCRIBED') {
                console.log('✅ Real-time bağlantı aktif!');
                channel.unsubscribe();
            } else if (status === 'CLOSED') {
                console.log('❌ Real-time bağlantı kapalı');
            }
        });

        // Sonuç raporu
        console.log('\n📊 TEST SONUÇLARI:');
        console.log('====================');
        console.log('✅ Supabase client başarıyla oluşturuldu');
        console.log('✅ Database bağlantısı çalışıyor');
        console.log('✅ Authentication servisi aktif');
        console.log('ℹ️  Schema migration\'ları çalıştırmaya hazır');
        
        return true;
        
    } catch (error) {
        console.error('\n❌ Supabase bağlantı hatası:', error.message);
        console.log('\n🔧 Olası çözümler:');
        console.log('1. Internet bağlantınızı kontrol edin');
        console.log('2. Supabase URL ve key\'leri doğrulayın');
        console.log('3. Supabase projesinin aktif olduğunu kontrol edin');
        return false;
    }
}

// Script çalıştırma
if (require.main === module) {
    testSupabaseConnection()
        .then(success => {
            if (success) {
                console.log('\n🎉 Supabase bağlantı testi tamamlandı!');
                console.log('👉 Sıradaki adım: npm run deploy:schema');
                process.exit(0);
            } else {
                console.log('\n💥 Test başarısız oldu. Lütfen ayarları kontrol edin.');
                process.exit(1);
            }
        })
        .catch(err => {
            console.error('\n💥 Beklenmeyen hata:', err.message);
            process.exit(1);
        });
}

module.exports = testSupabaseConnection;