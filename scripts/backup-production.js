#!/usr/bin/env node

// ============================================
// 🔄 PRODUCTION DATABASE BACKUP STRATEGY
// ============================================

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

// ============================================
// CONFIGURATION
// ============================================
const config = {
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    dbUrl: process.env.SUPABASE_DB_URL
  },
  backup: {
    enabled: process.env.BACKUP_ENABLED === 'true',
    schedule: process.env.BACKUP_SCHEDULE || '0 2 * * *', // Daily at 2 AM
    retentionDays: parseInt(process.env.BACKUP_RETENTION_DAYS) || 30,
    compressionLevel: 9,
    encryption: true
  },
  storage: {
    provider: process.env.BACKUP_STORAGE_PROVIDER || 'local',
    local: {
      basePath: process.env.BACKUP_LOCAL_PATH || './backups'
    },
    s3: {
      bucket: process.env.BACKUP_S3_BUCKET,
      region: process.env.BACKUP_S3_REGION || 'us-east-1',
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
  },
  notification: {
    enabled: process.env.BACKUP_NOTIFICATIONS === 'true',
    webhook: process.env.BACKUP_WEBHOOK_URL,
    email: process.env.BACKUP_NOTIFICATION_EMAIL
  }
};

// ============================================
// BACKUP UTILITIES
// ============================================
class ProductionBackupManager {
  constructor() {
    this.supabase = createClient(config.supabase.url, config.supabase.serviceKey);
    this.backupTimestamp = new Date().toISOString().replace(/[:.]/g, '-');
    this.backupId = `backup-${this.backupTimestamp}`;
  }

  // ============================================
  // FULL DATABASE BACKUP
  // ============================================
  async createFullBackup() {
    console.log(`🚀 Starting full database backup: ${this.backupId}`);
    
    const startTime = Date.now();
    const backupManifest = {
      id: this.backupId,
      timestamp: this.backupTimestamp,
      type: 'full_backup',
      startTime: new Date().toISOString(),
      status: 'in_progress',
      tables: [],
      files: [],
      size: 0,
      compressed: config.backup.compressionLevel > 0,
      encrypted: config.backup.encryption
    };

    try {
      // 1. Create backup directory
      const backupDir = await this.createBackupDirectory();
      
      // 2. Backup schema
      await this.backupSchema(backupDir, backupManifest);
      
      // 3. Backup data
      await this.backupData(backupDir, backupManifest);
      
      // 4. Backup metadata
      await this.backupMetadata(backupDir, backupManifest);
      
      // 5. Create compressed archive
      const archivePath = await this.createCompressedArchive(backupDir);
      
      // 6. Upload to storage
      if (config.storage.provider !== 'local') {
        await this.uploadToStorage(archivePath, backupManifest);
      }
      
      // 7. Update manifest
      backupManifest.status = 'completed';
      backupManifest.endTime = new Date().toISOString();
      backupManifest.duration = Date.now() - startTime;
      backupManifest.archivePath = archivePath;
      
      // 8. Save manifest
      await this.saveBackupManifest(backupManifest);
      
      // 9. Cleanup old backups
      await this.cleanupOldBackups();
      
      // 10. Send notification
      await this.sendBackupNotification('success', backupManifest);
      
      console.log(`✅ Backup completed successfully: ${this.backupId}`);
      console.log(`📊 Duration: ${Math.round(backupManifest.duration / 1000)}s`);
      console.log(`💾 Size: ${this.formatBytes(backupManifest.size)}`);
      
      return backupManifest;
      
    } catch (error) {
      console.error(`❌ Backup failed: ${error.message}`);
      
      backupManifest.status = 'failed';
      backupManifest.error = error.message;
      backupManifest.endTime = new Date().toISOString();
      
      await this.sendBackupNotification('error', backupManifest, error);
      throw error;
    }
  }

  // ============================================
  // SCHEMA BACKUP
  // ============================================
  async backupSchema(backupDir, manifest) {
    console.log('📋 Backing up database schema...');
    
    try {
      // Use pg_dump to get schema only
      const schemaFile = path.join(backupDir, 'schema.sql');
      const dumpCommand = `pg_dump "${config.supabase.dbUrl}" --schema-only --no-owner --no-privileges --clean --if-exists --file="${schemaFile}"`;
      
      const { stdout, stderr } = await execAsync(dumpCommand);
      
      if (stderr) {
        console.warn('Schema backup warnings:', stderr);
      }
      
      // Verify schema file was created
      const stats = await fs.stat(schemaFile);
      
      manifest.files.push({
        name: 'schema.sql',
        type: 'schema',
        size: stats.size,
        created: new Date().toISOString()
      });
      
      manifest.size += stats.size;
      
      console.log('✅ Schema backup completed');
      
    } catch (error) {
      console.error('❌ Schema backup failed:', error);
      throw new Error(`Schema backup failed: ${error.message}`);
    }
  }

  // ============================================
  // DATA BACKUP
  // ============================================
  async backupData(backupDir, manifest) {
    console.log('📊 Backing up table data...');
    
    const tables = [
      'users', 'courses', 'course_modules', 'lessons',
      'course_enrollments', 'lesson_progress', 'payments',
      'course_reviews', 'review_helpfulness'
    ];

    for (const tableName of tables) {
      try {
        console.log(`  📋 Backing up table: ${tableName}`);
        
        // Get table data
        const { data, error, count } = await this.supabase
          .from(tableName)
          .select('*', { count: 'exact' });

        if (error) {
          throw new Error(`Failed to fetch ${tableName}: ${error.message}`);
        }

        // Save to JSON file
        const tableFile = path.join(backupDir, `${tableName}.json`);
        await fs.writeFile(
          tableFile, 
          JSON.stringify(data, null, 2),
          'utf8'
        );

        // Get file stats
        const stats = await fs.stat(tableFile);

        manifest.tables.push({
          name: tableName,
          records: count || data.length,
          size: stats.size,
          file: `${tableName}.json`
        });

        manifest.size += stats.size;
        
        console.log(`    ✅ ${tableName}: ${count || data.length} records`);
        
      } catch (error) {
        console.error(`❌ Failed to backup table ${tableName}:`, error);
        throw error;
      }
    }
    
    console.log('✅ Data backup completed');
  }

  // ============================================
  // METADATA BACKUP
  // ============================================
  async backupMetadata(backupDir, manifest) {
    console.log('🔍 Backing up metadata...');
    
    try {
      // Database information
      const { data: dbInfo } = await this.supabase.rpc('get_database_info');
      
      // Table statistics
      const { data: tableStats } = await this.supabase.rpc('get_table_statistics');
      
      // Index information
      const { data: indexInfo } = await this.supabase.rpc('get_index_information');
      
      const metadata = {
        backupId: this.backupId,
        timestamp: this.backupTimestamp,
        database: dbInfo,
        tables: tableStats,
        indexes: indexInfo,
        supabaseProject: {
          url: config.supabase.url,
          region: process.env.SUPABASE_REGION || 'unknown'
        },
        environment: {
          nodeVersion: process.version,
          platform: process.platform,
          arch: process.arch
        }
      };
      
      const metadataFile = path.join(backupDir, 'metadata.json');
      await fs.writeFile(
        metadataFile,
        JSON.stringify(metadata, null, 2),
        'utf8'
      );
      
      const stats = await fs.stat(metadataFile);
      manifest.size += stats.size;
      
      console.log('✅ Metadata backup completed');
      
    } catch (error) {
      console.warn('⚠️ Metadata backup failed (non-critical):', error.message);
      // Don't throw error for metadata backup failure
    }
  }

  // ============================================
  // BACKUP UTILITIES
  // ============================================
  async createBackupDirectory() {
    const baseDir = config.storage.provider === 'local' 
      ? config.storage.local.basePath 
      : './temp-backups';
      
    const backupDir = path.join(baseDir, this.backupId);
    
    await fs.mkdir(backupDir, { recursive: true });
    console.log(`📁 Created backup directory: ${backupDir}`);
    
    return backupDir;
  }

  async createCompressedArchive(backupDir) {
    if (config.backup.compressionLevel === 0) {
      return backupDir; // No compression
    }

    console.log('🗜️ Creating compressed archive...');
    
    const archiveName = `${this.backupId}.tar.gz`;
    const archivePath = path.join(path.dirname(backupDir), archiveName);
    
    const tarCommand = `tar -czf "${archivePath}" -C "${path.dirname(backupDir)}" "${path.basename(backupDir)}"`;
    
    await execAsync(tarCommand);
    
    const stats = await fs.stat(archivePath);
    console.log(`✅ Archive created: ${this.formatBytes(stats.size)}`);
    
    return archivePath;
  }

  async uploadToStorage(archivePath, manifest) {
    if (config.storage.provider === 's3') {
      await this.uploadToS3(archivePath, manifest);
    }
    // Add other storage providers as needed
  }

  async uploadToS3(archivePath, manifest) {
    console.log('☁️ Uploading to S3...');
    
    try {
      const AWS = require('aws-sdk');
      const s3 = new AWS.S3({
        accessKeyId: config.storage.s3.accessKeyId,
        secretAccessKey: config.storage.s3.secretAccessKey,
        region: config.storage.s3.region
      });

      const fileContent = await fs.readFile(archivePath);
      const key = `7p-education/backups/${this.backupId}/${path.basename(archivePath)}`;

      const params = {
        Bucket: config.storage.s3.bucket,
        Key: key,
        Body: fileContent,
        ServerSideEncryption: config.backup.encryption ? 'AES256' : undefined,
        StorageClass: 'STANDARD_IA', // Infrequent Access for backups
        Metadata: {
          'backup-id': this.backupId,
          'created': this.backupTimestamp,
          'type': 'database-backup'
        }
      };

      const result = await s3.upload(params).promise();
      
      manifest.s3Location = result.Location;
      console.log(`✅ Uploaded to S3: ${result.Location}`);
      
    } catch (error) {
      console.error('❌ S3 upload failed:', error);
      throw error;
    }
  }

  async saveBackupManifest(manifest) {
    const manifestDir = config.storage.provider === 'local' 
      ? config.storage.local.basePath 
      : './temp-backups';
      
    const manifestFile = path.join(manifestDir, `${this.backupId}-manifest.json`);
    
    await fs.writeFile(
      manifestFile,
      JSON.stringify(manifest, null, 2),
      'utf8'
    );
    
    console.log(`📋 Backup manifest saved: ${manifestFile}`);
  }

  async cleanupOldBackups() {
    console.log('🧹 Cleaning up old backups...');
    
    const retentionTime = Date.now() - (config.backup.retentionDays * 24 * 60 * 60 * 1000);
    
    try {
      const backupDir = config.storage.provider === 'local' 
        ? config.storage.local.basePath 
        : './temp-backups';
      
      const files = await fs.readdir(backupDir);
      let deletedCount = 0;
      
      for (const file of files) {
        const filePath = path.join(backupDir, file);
        const stats = await fs.stat(filePath);
        
        if (stats.mtime.getTime() < retentionTime) {
          if (stats.isDirectory()) {
            await fs.rmdir(filePath, { recursive: true });
          } else {
            await fs.unlink(filePath);
          }
          deletedCount++;
          console.log(`  🗑️ Deleted old backup: ${file}`);
        }
      }
      
      console.log(`✅ Cleanup completed: ${deletedCount} old backups deleted`);
      
    } catch (error) {
      console.warn('⚠️ Cleanup warning:', error.message);
      // Don't fail backup for cleanup errors
    }
  }

  async sendBackupNotification(status, manifest, error = null) {
    if (!config.notification.enabled) {
      return;
    }

    const notification = {
      status,
      backupId: this.backupId,
      timestamp: this.backupTimestamp,
      duration: manifest.duration,
      size: manifest.size,
      tables: manifest.tables?.length || 0,
      error: error?.message
    };

    try {
      if (config.notification.webhook) {
        const response = await fetch(config.notification.webhook, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: status === 'success' 
              ? `✅ Database backup completed: ${this.backupId}`
              : `❌ Database backup failed: ${this.backupId}`,
            ...notification
          })
        });
        
        if (!response.ok) {
          throw new Error(`Webhook failed: ${response.status}`);
        }
      }

      console.log(`📧 Notification sent: ${status}`);
      
    } catch (error) {
      console.warn('⚠️ Notification failed:', error.message);
    }
  }

  // ============================================
  // UTILITY METHODS
  // ============================================
  formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }
}

// ============================================
// BACKUP SCHEDULING
// ============================================
function scheduleBackups() {
  if (!config.backup.enabled) {
    console.log('⏸️ Backups are disabled');
    return;
  }

  const cron = require('node-cron');
  
  cron.schedule(config.backup.schedule, async () => {
    console.log(`🕐 Scheduled backup starting at ${new Date().toISOString()}`);
    
    try {
      const backupManager = new ProductionBackupManager();
      await backupManager.createFullBackup();
    } catch (error) {
      console.error('❌ Scheduled backup failed:', error);
    }
  }, {
    scheduled: true,
    timezone: process.env.TZ || 'UTC'
  });

  console.log(`⏰ Backup scheduled: ${config.backup.schedule}`);
}

// ============================================
// RESTORE FUNCTIONALITY
// ============================================
async function restoreFromBackup(backupId) {
  console.log(`🔄 Restoring from backup: ${backupId}`);
  
  // Implementation for backup restoration
  // This is a critical operation and should be implemented carefully
  // For now, we'll just log the process
  
  console.warn('⚠️ Restore functionality not yet implemented');
  console.log('📋 Restore process should include:');
  console.log('  1. Download backup archive');
  console.log('  2. Verify backup integrity');
  console.log('  3. Stop application (maintenance mode)');
  console.log('  4. Create current database backup');
  console.log('  5. Restore schema');
  console.log('  6. Restore data');
  console.log('  7. Verify restoration');
  console.log('  8. Resume application');
}

// ============================================
// CLI INTERFACE
// ============================================
async function main() {
  const command = process.argv[2];
  
  switch (command) {
    case 'backup':
      const backupManager = new ProductionBackupManager();
      await backupManager.createFullBackup();
      break;
      
    case 'restore':
      const backupId = process.argv[3];
      if (!backupId) {
        console.error('❌ Please provide backup ID');
        process.exit(1);
      }
      await restoreFromBackup(backupId);
      break;
      
    case 'schedule':
      scheduleBackups();
      // Keep process running
      process.stdin.resume();
      break;
      
    case 'list':
      // List available backups
      console.log('📋 Listing available backups...');
      // Implementation needed
      break;
      
    default:
      console.log('📚 Usage:');
      console.log('  npm run backup:create     - Create backup now');
      console.log('  npm run backup:restore <id> - Restore from backup');
      console.log('  npm run backup:schedule   - Start scheduled backups');
      console.log('  npm run backup:list       - List available backups');
  }
}

// ============================================
// EXPORT & EXECUTION
// ============================================
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Backup script failed:', error);
    process.exit(1);
  });
}

module.exports = {
  ProductionBackupManager,
  scheduleBackups,
  restoreFromBackup,
  config
};