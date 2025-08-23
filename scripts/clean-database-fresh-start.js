#!/usr/bin/env node

/**
 * 🧹 Supabase Database Clean Slate Script
 * 
 * Bu script tüm tabloları temizler ve sıfırdan backend geliştirme için 
 * temiz bir başlangıç sağlar.
 * 
 * Kullanım:
 * npm run db:clean
 * 
 * Güvenlik:
 * - Service Role Key gerektirir (.env.local)
 * - Confirmation flag'i ile double-check
 * - Backup önerisi içerir
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Renk kodları
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  reset: '\x1b[0m',
  bright: '\x1b[1m'
};

async function cleanDatabase() {
  console.log(`${colors.cyan}${colors.bright}🧹 Supabase Database Cleanup - Fresh Start${colors.reset}\n`);
  
  // Environment variables kontrolü
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error(`${colors.red}❌ Environment variables eksik!${colors.reset}`);
    console.error(`${colors.yellow}Gerekli değişkenler:${colors.reset}`);
    console.error(`- SUPABASE_URL`);
    console.error(`- SUPABASE_SERVICE_ROLE_KEY`);
    console.error(`\n${colors.blue}💡 .env.local dosyasını kontrol edin.${colors.reset}`);
    process.exit(1);
  }

  // Supabase client (Service Role Key ile - tüm tabloları drop edebilir)
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    console.log(`${colors.yellow}⚠️  UYARI: Bu işlem TÜM TABLOLARI SİLECEKTİR!${colors.reset}`);
    console.log(`${colors.blue}📦 Database URL: ${supabaseUrl}${colors.reset}`);
    
    // Confirmation check
    const confirmFlag = process.argv.includes('--confirm');
    if (!confirmFlag) {
      console.log(`\n${colors.red}🛑 Güvenlik nedeniyle confirmation flag'i gereklidir.${colors.reset}`);
      console.log(`${colors.green}Çalıştırmak için:${colors.reset}`);
      console.log(`${colors.white}npm run db:clean:confirm${colors.reset}\n`);
      process.exit(1);
    }

    console.log(`\n${colors.green}✅ Confirmation flag bulundu. İşlem başlıyor...${colors.reset}\n`);

    // Mevcut tabloları listele
    console.log(`${colors.cyan}📋 Mevcut tabloları tespit ediliyor...${colors.reset}`);
    
    const { data: tables, error: listError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .neq('table_name', 'schema_migrations'); // Supabase internal tablosu koru

    if (listError) {
      console.error(`${colors.red}❌ Tablolar listelenemedi:${colors.reset}`, listError.message);
      process.exit(1);
    }

    if (!tables || tables.length === 0) {
      console.log(`${colors.green}✅ Database zaten temiz! Hiç tablo yok.${colors.reset}`);
      process.exit(0);
    }

    console.log(`${colors.blue}Bulunan tablolar (${tables.length} adet):${colors.reset}`);
    tables.forEach(table => {
      console.log(`${colors.white}- ${table.table_name}${colors.reset}`);
    });

    // Tabloları sil
    console.log(`\n${colors.yellow}🗑️  Tablolar siliniyor...${colors.reset}`);
    
    for (const table of tables) {
      const tableName = table.table_name;
      
      try {
        // RLS policy'leri kaldır
        const { error: rpcError } = await supabase.rpc('exec_sql', {
          sql: `DROP TABLE IF EXISTS public."${tableName}" CASCADE;`
        });

        if (rpcError) {
          // RPC çalışmazsa direct SQL dene
          const { error: directError } = await supabase
            .from(tableName)
            .delete()
            .neq('id', -1); // Tüm row'ları sil

          if (directError) {
            console.log(`${colors.yellow}⚠️  ${tableName} silinirken sorun: ${directError.message}${colors.reset}`);
          } else {
            console.log(`${colors.green}✅ ${tableName} içeriği temizlendi${colors.reset}`);
          }
        } else {
          console.log(`${colors.green}✅ ${tableName} completely dropped${colors.reset}`);
        }
      } catch (err) {
        console.log(`${colors.yellow}⚠️  ${tableName} ile ilgili bir sorun oldu: ${err.message}${colors.reset}`);
      }
    }

    // Storage bucket'ları temizle (eğer varsa)
    console.log(`\n${colors.cyan}🗂️  Storage bucket'ları kontrol ediliyor...${colors.reset}`);
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    
    if (!bucketsError && buckets && buckets.length > 0) {
      console.log(`${colors.blue}Bulunan bucket'lar (${buckets.length} adet):${colors.reset}`);
      
      for (const bucket of buckets) {
        console.log(`${colors.white}- ${bucket.name}${colors.reset}`);
        
        // Bucket içindeki dosyaları sil
        const { data: files } = await supabase.storage.from(bucket.name).list();
        if (files && files.length > 0) {
          const filePaths = files.map(file => file.name);
          await supabase.storage.from(bucket.name).remove(filePaths);
          console.log(`${colors.green}  ✅ ${files.length} dosya silindi${colors.reset}`);
        }
      }
    } else {
      console.log(`${colors.green}ℹ️  Storage bucket bulunamadı veya zaten temiz.${colors.reset}`);
    }

    // Son kontrol
    console.log(`\n${colors.cyan}🔍 Final kontrol yapılıyor...${colors.reset}`);
    const { data: remainingTables } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .neq('table_name', 'schema_migrations');

    if (!remainingTables || remainingTables.length === 0) {
      console.log(`${colors.green}${colors.bright}🎉 DATABASE BAŞARIYLA TEMİZLENDİ!${colors.reset}`);
      console.log(`${colors.green}✅ Tüm tablolar silindi${colors.reset}`);
      console.log(`${colors.green}✅ Storage temizlendi${colors.reset}`);
      console.log(`${colors.blue}📝 Artık sıfırdan backend geliştirmeye başlayabilirsiniz!${colors.reset}\n`);
      
      console.log(`${colors.cyan}Sonraki adımlar:${colors.reset}`);
      console.log(`${colors.white}1. npm run db:setup    # Yeni şema hazırlığı${colors.reset}`);
      console.log(`${colors.white}2. npm run db:migrate  # Yeni tabloları deploy et${colors.reset}`);
      console.log(`${colors.white}3. npm run db:verify   # Kurulumu doğrula${colors.reset}\n`);
    } else {
      console.log(`${colors.yellow}⚠️  Bazı tablolar hala mevcut (${remainingTables.length} adet)${colors.reset}`);
      remainingTables.forEach(table => {
        console.log(`${colors.white}- ${table.table_name}${colors.reset}`);
      });
    }

  } catch (error) {
    console.error(`${colors.red}❌ Database cleanup sırasında hata:${colors.reset}`, error.message);
    console.error(`${colors.yellow}💡 Detaylar:${colors.reset}`, error);
    process.exit(1);
  }
}

// Backup uyarısı
console.log(`${colors.yellow}${colors.bright}⚠️  ÖNEMLİ BACKUP UYARISI!${colors.reset}`);
console.log(`${colors.white}Bu script tüm verileri kalıcı olarak silecektir.${colors.reset}`);
console.log(`${colors.blue}Önemli verileriniz varsa önce backup alın!${colors.reset}\n`);

// Script'i çalıştır
cleanDatabase().catch(console.error);