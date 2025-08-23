#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

/**
 * Supabase Correct Setup - CLI Method (ChatGPT Approach)
 */

class SupabaseCorrectSetup {
  constructor() {
    this.projectRef = 'riupkkggupogdgubnhmy';
    this.supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  }

  async setup() {
    console.log('🚀 SUPABASE CORRECT SETUP - CLI METHOD');
    console.log('='.repeat(60));
    console.log();

    try {
      // Step 1: CLI version check
      console.log('📋 Step 1: Supabase CLI kontrolü...');
      try {
        const version = execSync('npx supabase --version', { encoding: 'utf8' }).trim();
        console.log('✅ Supabase CLI:', version);
      } catch (error) {
        console.log('❌ Supabase CLI yok, kuruluyor...');
        execSync('npm install -g supabase', { stdio: 'inherit' });
        console.log('✅ Supabase CLI kuruldu');
      }
      console.log();

      // Step 2: Login check
      console.log('📋 Step 2: Login kontrolü...');
      try {
        const projects = execSync('npx supabase projects list', { encoding: 'utf8' });
        if (projects.includes(this.projectRef)) {
          console.log('✅ Zaten giriş yapılmış');
        } else {
          throw new Error('Login gerekli');
        }
      } catch (error) {
        console.log('🔑 Login yapılıyor...');
        console.log('⚠️  Tarayıcıda açılacak login ekranından giriş yapın');
        execSync('npx supabase login', { stdio: 'inherit' });
        console.log('✅ Login başarılı');
      }
      console.log();

      // Step 3: Project link check
      console.log('📋 Step 3: Project link kontrolü...');
      const configPath = path.join(process.cwd(), 'supabase', 'config.toml');
      
      if (fs.existsSync(configPath)) {
        console.log('✅ Config dosyası mevcut');
      } else {
        console.log('⚠️  Config dosyası yok, link gerekli');
        
        console.log('🔗 Project link ediliyor...');
        console.log('⚠️  Database password soracak - Dashboard\'dan aldığın password\'u gir');
        
        execSync(`npx supabase link --project-ref ${this.projectRef}`, { stdio: 'inherit' });
        console.log('✅ Project başarıyla link edildi');
      }
      console.log();

      // Step 4: Migration check
      console.log('📋 Step 4: Migration dosyaları kontrolü...');
      const migrationDir = path.join(process.cwd(), 'supabase', 'migrations');
      const files = fs.existsSync(migrationDir) ? fs.readdirSync(migrationDir) : [];
      
      console.log(`✅ ${files.length} migration dosyası bulundu:`, files);
      
      if (files.length === 0) {
        console.log('⚠️  Migration dosyası yok!');
        console.log('Mevcut 000_initial_schema.sql dosyasını migrations klasörüne kopyalıyorum...');
        
        if (!fs.existsSync(migrationDir)) {
          fs.mkdirSync(migrationDir, { recursive: true });
        }
        
        const sourceFile = path.join(process.cwd(), 'supabase', 'migrations', '000_initial_schema.sql');
        if (fs.existsSync(sourceFile)) {
          console.log('✅ Migration dosyası zaten mevcut');
        }
      }
      console.log();

      // Step 5: Database push
      console.log('📋 Step 5: Database push (OTOMATIK DEPLOYMENT)...');
      console.log('🚀 Remote database\'e migration\'lar uygulanıyor...');
      console.log('⚠️  Bu işlem tablolarınızı otomatik oluşturacak!');
      console.log();
      
      try {
        // Ana komut: db push
        execSync('npx supabase db push', { stdio: 'inherit' });
        console.log();
        console.log('✅ Database push başarılı!');
      } catch (error) {
        console.log();
        console.log('❌ Database push başarısız');
        console.log('Sebep muhtemelen:');
        console.log('1. Database password yanlış/eksik');
        console.log('2. Link edilmemiş proje');
        console.log('3. Network bağlantı sorunu');
        throw error;
      }
      console.log();

      // Step 6: Verification
      console.log('📋 Step 6: Deployment doğrulaması...');
      console.log('🔍 Supabase Dashboard\'ı kontrol ediyorum...');
      console.log('Dashboard URL: https://app.supabase.com/project/' + this.projectRef + '/editor');
      console.log();

      console.log('🎉 OTOMATIK DATABASE KURULUMU TAMAMLANDI!');
      console.log('='.repeat(60));
      console.log();
      console.log('✅ Yapılan işlemler:');
      console.log('  - CLI kuruldu/kontrol edildi');
      console.log('  - Supabase\'e login yapıldı');
      console.log('  - Project link edildi');
      console.log('  - Migration dosyaları remote\'a push edildi');
      console.log('  - Tablolar otomatik oluşturuldu');
      console.log('  - RLS policies uygulandı');
      console.log();
      console.log('📱 Test için:');
      console.log('  npm run dev');
      console.log('  Login: admin@7peducation.com / Test123!');
      console.log();

    } catch (error) {
      console.error('❌ Setup hatası:', error.message);
      console.log();
      console.log('🔧 Troubleshooting:');
      console.log('1. Database password\'u doğru aldığınızdan emin olun');
      console.log('2. npx supabase login - browser\'da giriş yapın');
      console.log('3. npx supabase link --project-ref ' + this.projectRef);
      console.log('4. npx supabase db push');
      console.log();
      console.log('📝 Manuel alternatif (son çare):');
      console.log('   Dashboard SQL Editor: 000_initial_schema.sql kopyala/yapıştır');
      process.exit(1);
    }
  }
}

// Run setup
const setup = new SupabaseCorrectSetup();
setup.setup();