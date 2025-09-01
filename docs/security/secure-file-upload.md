# Secure File Upload Implementation Guide

## Table of Contents
1. [Overview](#overview)
2. [Security Risks and Threats](#security-risks-and-threats)
3. [File Upload Security Framework](#file-upload-security-framework)
4. [Input Validation and Sanitization](#input-validation-and-sanitization)
5. [File Type and Content Validation](#file-type-and-content-validation)
6. [Storage Security](#storage-security)
7. [Access Control and Permissions](#access-control-and-permissions)
8. [Malware Scanning](#malware-scanning)
9. [Implementation Examples](#implementation-examples)
10. [Monitoring and Logging](#monitoring-and-logging)
11. [Configuration Guidelines](#configuration-guidelines)

## Overview

File upload functionality is a critical component of the 7P Education Platform, enabling users to upload course materials, assignments, and media content. However, file uploads represent one of the most significant security risks if not properly implemented. This guide provides comprehensive security measures to protect against various threats while maintaining usability.

### Key Security Objectives
- **Malware Prevention**: Block malicious file uploads and executable content
- **Data Integrity**: Ensure uploaded files are authentic and unmodified
- **Access Control**: Implement proper authorization and file access controls
- **Storage Security**: Secure file storage with encryption and isolation
- **Performance Protection**: Prevent resource exhaustion through size and rate limits
- **Compliance**: Meet educational data protection and privacy requirements

### Upload Categories in 7P Education
```
┌─────────────────────────────────────────────────┐
│                Course Materials                 │
│  • PDF documents, presentations, videos        │
│  • Size limit: 500MB per file                 │
│  • Types: PDF, DOCX, PPTX, MP4, etc.         │
└─────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────┐
│              Student Assignments               │
│  • Documents, code files, media               │
│  • Size limit: 100MB per file                │
│  • Types: PDF, DOCX, ZIP, images             │
└─────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────┐
│                User Profiles                   │
│  • Profile pictures, certificates             │
│  • Size limit: 10MB per file                 │
│  • Types: JPEG, PNG, PDF                     │
└─────────────────────────────────────────────────┘
```

## Security Risks and Threats

### 1. Malware Upload Attacks

#### Remote Code Execution (RCE)
```
Attack Vector:
1. Attacker uploads executable file disguised as document
2. Server processes file without proper validation
3. Malicious code executes on server
4. Full system compromise
```

**Common Payloads:**
- PHP web shells disguised as images
- JavaScript files with malicious code
- Binary executables with document extensions
- Macro-enabled office documents

#### Web Shell Deployment
```javascript
// Example of malicious PHP uploaded as image
<?php
// malicious.jpg.php
if (isset($_GET['cmd'])) {
    system($_GET['cmd']);
}
?>
```

### 2. Path Traversal Attacks

#### Directory Traversal
```
Malicious Filename Examples:
- ../../etc/passwd
- ..\\..\\windows\\system32\\config\\sam
- ../../../var/www/html/backdoor.php
```

#### Zip Bomb Attacks
```
Archive Structure:
compressed.zip (1KB) → expands to 4GB
├── file1.txt (1GB of zeros)
├── file2.txt (1GB of zeros) 
├── file3.txt (1GB of zeros)
└── file4.txt (1GB of zeros)
```

### 3. Content-Type Confusion

#### MIME Type Spoofing
```http
POST /upload HTTP/1.1
Content-Type: multipart/form-data

Content-Disposition: form-data; name="file"; filename="document.pdf"
Content-Type: image/jpeg

%PDF-1.4 (actual PDF content but declared as JPEG)
```

### 4. Client-Side Bypass Attacks

#### JavaScript Validation Bypass
```javascript
// Client-side validation (easily bypassed)
function validateFile(file) {
    const allowedTypes = ['image/jpeg', 'image/png'];
    return allowedTypes.includes(file.type);
}

// Attacker can modify file.type in browser before upload
```

## File Upload Security Framework

### Multi-Layer Defense Architecture

```
┌─────────────────────────────────────────────────┐
│ Layer 1: Client-Side Validation                │
│ • File type checking                           │
│ • Size validation                              │
│ • Basic format verification                    │
└─────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────┐
│ Layer 2: Server-Side Input Validation          │
│ • Filename sanitization                        │
│ • MIME type verification                       │
│ • File signature validation                    │
└─────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────┐
│ Layer 3: Content Analysis                      │
│ • Magic number verification                    │
│ • Content scanning                             │
│ • Malware detection                           │
└─────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────┐
│ Layer 4: Secure Storage                        │
│ • Isolated storage location                    │
│ • File encryption                              │
│ • Access control                               │
└─────────────────────────────────────────────────┘
```

### Core Security Principles

#### 1. Never Trust Client Input
```javascript
// WRONG - Trusting client-provided MIME type
if (req.file.mimetype === 'image/jpeg') {
    // Process as JPEG
}

// CORRECT - Server-side validation
const fileSignature = await getFileSignature(req.file.buffer);
if (isValidJPEG(fileSignature)) {
    // Process as JPEG
}
```

#### 2. Defense in Depth
```javascript
class SecureFileUpload {
    async processUpload(file) {
        // Layer 1: Basic validation
        this.validateBasicProperties(file);
        
        // Layer 2: Content validation
        await this.validateFileContent(file);
        
        // Layer 3: Malware scanning
        await this.scanForMalware(file);
        
        // Layer 4: Secure storage
        return await this.storeSecurely(file);
    }
}
```

#### 3. Principle of Least Privilege
```javascript
// File access with minimal permissions
const filePermissions = {
    owner: 'read,write',
    group: 'read',
    other: 'none',
    executable: false
};
```

## Input Validation and Sanitization

### Filename Sanitization

```javascript
class FilenameSanitizer {
    static sanitize(filename) {
        if (!filename || typeof filename !== 'string') {
            throw new Error('Invalid filename');
        }
        
        // Remove path traversal attempts
        let sanitized = filename.replace(/\.\./g, '');
        
        // Remove directory separators
        sanitized = sanitized.replace(/[\/\\]/g, '');
        
        // Remove null bytes and control characters
        sanitized = sanitized.replace(/[\x00-\x1f\x80-\x9f]/g, '');
        
        // Remove dangerous characters
        sanitized = sanitized.replace(/[<>:"|?*]/g, '');
        
        // Limit length
        if (sanitized.length > 255) {
            const ext = this.getFileExtension(sanitized);
            const nameWithoutExt = sanitized.substring(0, sanitized.lastIndexOf('.'));
            sanitized = nameWithoutExt.substring(0, 255 - ext.length - 1) + '.' + ext;
        }
        
        // Ensure filename is not empty
        if (!sanitized.trim()) {
            sanitized = `file_${Date.now()}`;
        }
        
        // Remove double extensions
        sanitized = this.removeDoubleExtensions(sanitized);
        
        return sanitized;
    }
    
    static removeDoubleExtensions(filename) {
        const dangerousDoubleExts = [
            '.php.txt', '.asp.txt', '.jsp.txt',
            '.php.jpg', '.asp.jpg', '.jsp.jpg',
            '.exe.jpg', '.scr.jpg', '.bat.jpg'
        ];
        
        for (const doubleExt of dangerousDoubleExts) {
            if (filename.toLowerCase().includes(doubleExt)) {
                // Remove the dangerous first extension
                filename = filename.replace(new RegExp(doubleExt.split('.')[1] + '\\.', 'gi'), '');
            }
        }
        
        return filename;
    }
    
    static getFileExtension(filename) {
        const lastDotIndex = filename.lastIndexOf('.');
        return lastDotIndex > 0 ? filename.substring(lastDotIndex + 1) : '';
    }
}

// Usage example
const originalFilename = "../../../etc/passwd.php.jpg";
const safeFilename = FilenameSanitizer.sanitize(originalFilename);
console.log(safeFilename); // "etcpasswd.jpg"
```

### File Size Validation

```javascript
class FileSizeValidator {
    constructor() {
        this.limits = {
            'image': 10 * 1024 * 1024,      // 10MB for images
            'document': 100 * 1024 * 1024,   // 100MB for documents
            'video': 500 * 1024 * 1024,      // 500MB for videos
            'archive': 200 * 1024 * 1024,    // 200MB for archives
            'default': 50 * 1024 * 1024      // 50MB default
        };
        
        this.totalUserLimit = 5 * 1024 * 1024 * 1024; // 5GB per user
    }
    
    validateSize(file, category = 'default') {
        const limit = this.limits[category] || this.limits.default;
        
        if (file.size > limit) {
            throw new Error(`File too large. Maximum size for ${category} is ${this.formatBytes(limit)}`);
        }
        
        if (file.size === 0) {
            throw new Error('Empty file not allowed');
        }
        
        return true;
    }
    
    async validateUserQuota(userId, fileSize) {
        const currentUsage = await this.getUserStorageUsage(userId);
        
        if (currentUsage + fileSize > this.totalUserLimit) {
            throw new Error(`Upload would exceed storage quota. Current usage: ${this.formatBytes(currentUsage)}`);
        }
        
        return true;
    }
    
    formatBytes(bytes) {
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        if (bytes === 0) return '0 Bytes';
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
    }
    
    async getUserStorageUsage(userId) {
        // Calculate total storage used by user
        const userFiles = await db.collection('files').find({ userId }).toArray();
        return userFiles.reduce((total, file) => total + file.size, 0);
    }
}
```

## File Type and Content Validation

### MIME Type and Extension Validation

```javascript
class FileTypeValidator {
    constructor() {
        this.allowedTypes = {
            'documents': {
                extensions: ['pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx', 'txt'],
                mimeTypes: [
                    'application/pdf',
                    'application/msword',
                    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                    'application/vnd.ms-powerpoint',
                    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
                    'application/vnd.ms-excel',
                    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                    'text/plain'
                ]
            },
            'images': {
                extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
                mimeTypes: [
                    'image/jpeg',
                    'image/png', 
                    'image/gif',
                    'image/webp'
                ]
            },
            'videos': {
                extensions: ['mp4', 'webm', 'ogg', 'avi', 'mov'],
                mimeTypes: [
                    'video/mp4',
                    'video/webm',
                    'video/ogg',
                    'video/avi',
                    'video/quicktime'
                ]
            },
            'archives': {
                extensions: ['zip', 'rar', '7z', 'tar', 'gz'],
                mimeTypes: [
                    'application/zip',
                    'application/x-rar-compressed',
                    'application/x-7z-compressed',
                    'application/x-tar',
                    'application/gzip'
                ]
            }
        };
        
        // Dangerous extensions that should never be allowed
        this.blockedExtensions = [
            'exe', 'bat', 'cmd', 'scr', 'pif', 'vbs', 'vbe', 'js', 'jse',
            'wsf', 'wsh', 'msc', 'msi', 'msp', 'com', 'jar', 'php', 'asp',
            'aspx', 'jsp', 'py', 'rb', 'pl', 'sh', 'ps1', 'vb'
        ];
    }
    
    validateType(file, allowedCategory) {
        const extension = this.getFileExtension(file.originalname);
        const mimeType = file.mimetype;
        
        // Check blocked extensions
        if (this.blockedExtensions.includes(extension.toLowerCase())) {
            throw new Error(`File type .${extension} is not allowed for security reasons`);
        }
        
        // Validate against allowed types
        const categoryConfig = this.allowedTypes[allowedCategory];
        if (!categoryConfig) {
            throw new Error(`Invalid file category: ${allowedCategory}`);
        }
        
        const extensionAllowed = categoryConfig.extensions.includes(extension.toLowerCase());
        const mimeTypeAllowed = categoryConfig.mimeTypes.includes(mimeType);
        
        if (!extensionAllowed) {
            throw new Error(`File extension .${extension} not allowed for ${allowedCategory}`);
        }
        
        if (!mimeTypeAllowed) {
            throw new Error(`MIME type ${mimeType} not allowed for ${allowedCategory}`);
        }
        
        return true;
    }
    
    getFileExtension(filename) {
        const lastDotIndex = filename.lastIndexOf('.');
        return lastDotIndex > 0 ? filename.substring(lastDotIndex + 1) : '';
    }
}
```

### Magic Number Verification

```javascript
class FileSignatureValidator {
    constructor() {
        // File signatures (magic numbers)
        this.signatures = {
            'pdf': [0x25, 0x50, 0x44, 0x46], // %PDF
            'jpeg': [0xFF, 0xD8, 0xFF],
            'png': [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A],
            'gif87a': [0x47, 0x49, 0x46, 0x38, 0x37, 0x61], // GIF87a
            'gif89a': [0x47, 0x49, 0x46, 0x38, 0x39, 0x61], // GIF89a
            'zip': [0x50, 0x4B, 0x03, 0x04], // Also used by DOCX, XLSX, PPTX
            'docx': [0x50, 0x4B, 0x03, 0x04], // ZIP format
            'mp4': [0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70], // ftyp
            'webm': [0x1A, 0x45, 0xDF, 0xA3]
        };
        
        // Secondary signatures for office documents
        this.officeSignatures = {
            'docx': 'word/',
            'xlsx': 'xl/',
            'pptx': 'ppt/'
        };
    }
    
    async validateSignature(file, expectedType) {
        const buffer = file.buffer || await this.readFileBuffer(file);
        const signature = this.signatures[expectedType.toLowerCase()];
        
        if (!signature) {
            throw new Error(`No signature defined for type: ${expectedType}`);
        }
        
        // Check primary signature
        const isValid = this.checkSignature(buffer, signature);
        
        if (!isValid && this.isOfficeDocument(expectedType)) {
            // For office documents, also check internal structure
            return await this.validateOfficeDocument(buffer, expectedType);
        }
        
        if (!isValid) {
            throw new Error(`File signature does not match expected type: ${expectedType}`);
        }
        
        return true;
    }
    
    checkSignature(buffer, signature) {
        if (buffer.length < signature.length) {
            return false;
        }
        
        for (let i = 0; i < signature.length; i++) {
            if (buffer[i] !== signature[i]) {
                return false;
            }
        }
        
        return true;
    }
    
    async validateOfficeDocument(buffer, expectedType) {
        try {
            // Office documents are ZIP files, check internal structure
            const zip = new AdmZip(buffer);
            const entries = zip.getEntries();
            
            const expectedPath = this.officeSignatures[expectedType.toLowerCase()];
            if (!expectedPath) return false;
            
            // Check if expected directory structure exists
            const hasExpectedStructure = entries.some(entry => 
                entry.entryName.includes(expectedPath)
            );
            
            if (!hasExpectedStructure) {
                throw new Error(`Invalid ${expectedType} structure`);
            }
            
            return true;
        } catch (error) {
            throw new Error(`Failed to validate ${expectedType}: ${error.message}`);
        }
    }
    
    isOfficeDocument(type) {
        return ['docx', 'xlsx', 'pptx'].includes(type.toLowerCase());
    }
    
    async readFileBuffer(file) {
        return new Promise((resolve, reject) => {
            const chunks = [];
            file.on('data', chunk => chunks.push(chunk));
            file.on('end', () => resolve(Buffer.concat(chunks)));
            file.on('error', reject);
        });
    }
}
```

### Content Scanning and Analysis

```javascript
class ContentScanner {
    constructor() {
        this.suspiciousPatterns = [
            // Script patterns
            /<script[^>]*>/i,
            /javascript:/i,
            /vbscript:/i,
            /data:.*base64/i,
            
            // PHP patterns
            /<\?php/i,
            /<\?\s/i,
            
            // ASP patterns
            /<%[^>]*%>/i,
            
            // Embedded executables
            /MZ....PE/,  // PE header
            /\x7fELF/,   // ELF header
            
            // Suspicious commands
            /exec\s*\(/i,
            /system\s*\(/i,
            /shell_exec/i,
            /passthru/i,
            /eval\s*\(/i
        ];
        
        this.maxScanSize = 10 * 1024 * 1024; // 10MB max scan size
    }
    
    async scanContent(file) {
        const buffer = file.buffer || await this.readFileBuffer(file);
        
        // Limit scan size for performance
        const scanBuffer = buffer.length > this.maxScanSize 
            ? buffer.slice(0, this.maxScanSize) 
            : buffer;
        
        const content = scanBuffer.toString('utf8', 0, Math.min(scanBuffer.length, 1024 * 1024));
        
        // Check for suspicious patterns
        for (const pattern of this.suspiciousPatterns) {
            if (pattern.test(content)) {
                throw new Error('Suspicious content detected in file');
            }
        }
        
        // Check for embedded files
        await this.checkEmbeddedFiles(buffer);
        
        // Entropy analysis for encrypted/packed content
        const entropy = this.calculateEntropy(scanBuffer);
        if (entropy > 7.5) { // High entropy might indicate packed/encrypted malware
            console.warn(`High entropy detected: ${entropy} for file ${file.originalname}`);
        }
        
        return true;
    }
    
    async checkEmbeddedFiles(buffer) {
        // Look for ZIP signatures within the file (potential ZIP bombs)
        const zipSignature = [0x50, 0x4B, 0x03, 0x04];
        let zipCount = 0;
        
        for (let i = 0; i <= buffer.length - zipSignature.length; i++) {
            let match = true;
            for (let j = 0; j < zipSignature.length; j++) {
                if (buffer[i + j] !== zipSignature[j]) {
                    match = false;
                    break;
                }
            }
            if (match) {
                zipCount++;
                if (zipCount > 10) { // Too many embedded ZIP files
                    throw new Error('Suspicious embedded archive structure detected');
                }
            }
        }
    }
    
    calculateEntropy(buffer) {
        const frequency = new Array(256).fill(0);
        
        for (let i = 0; i < buffer.length; i++) {
            frequency[buffer[i]]++;
        }
        
        let entropy = 0;
        for (let i = 0; i < 256; i++) {
            if (frequency[i] > 0) {
                const p = frequency[i] / buffer.length;
                entropy -= p * Math.log2(p);
            }
        }
        
        return entropy;
    }
}
```

## Storage Security

### Secure File Storage Implementation

```javascript
const crypto = require('crypto');
const path = require('path');
const fs = require('fs').promises;

class SecureFileStorage {
    constructor(options = {}) {
        this.baseStoragePath = options.storagePath || '/secure-uploads';
        this.encryptionKey = options.encryptionKey || process.env.FILE_ENCRYPTION_KEY;
        this.useEncryption = options.useEncryption !== false;
        this.quarantinePath = path.join(this.baseStoragePath, 'quarantine');
        
        this.ensureDirectories();
    }
    
    async ensureDirectories() {
        const directories = [
            this.baseStoragePath,
            this.quarantinePath,
            path.join(this.baseStoragePath, 'images'),
            path.join(this.baseStoragePath, 'documents'),
            path.join(this.baseStoragePath, 'videos'),
            path.join(this.baseStoragePath, 'archives')
        ];
        
        for (const dir of directories) {
            try {
                await fs.mkdir(dir, { recursive: true, mode: 0o750 });
            } catch (error) {
                if (error.code !== 'EEXIST') {
                    throw error;
                }
            }
        }
    }
    
    async storeFile(file, metadata) {
        // Generate unique filename
        const fileId = this.generateFileId();
        const fileExtension = this.getFileExtension(file.originalname);
        const category = metadata.category || 'documents';
        
        // Create storage path
        const relativePath = path.join(category, `${fileId}.${fileExtension}`);
        const fullPath = path.join(this.baseStoragePath, relativePath);
        
        let fileData = file.buffer;
        let encryptionInfo = null;
        
        // Encrypt file if encryption is enabled
        if (this.useEncryption) {
            const encrypted = await this.encryptFile(fileData);
            fileData = encrypted.data;
            encryptionInfo = {
                iv: encrypted.iv,
                algorithm: encrypted.algorithm
            };
        }
        
        // Write file to disk
        await fs.writeFile(fullPath, fileData, { mode: 0o640 });
        
        // Store metadata in database
        const fileRecord = {
            fileId,
            originalName: file.originalname,
            storagePath: relativePath,
            size: file.size,
            mimeType: file.mimetype,
            category,
            uploadedBy: metadata.userId,
            uploadedAt: new Date(),
            encryptionInfo,
            checksum: await this.calculateChecksum(file.buffer),
            status: 'active'
        };
        
        await this.saveFileMetadata(fileRecord);
        
        return {
            fileId,
            path: relativePath,
            size: file.size
        };
    }
    
    async encryptFile(data) {
        const algorithm = 'aes-256-gcm';
        const key = Buffer.from(this.encryptionKey, 'hex');
        const iv = crypto.randomBytes(16);
        
        const cipher = crypto.createCipher(algorithm, key);
        cipher.setAAD(Buffer.from('7p-education', 'utf8'));
        
        const encrypted = Buffer.concat([
            cipher.update(data),
            cipher.final()
        ]);
        
        const authTag = cipher.getAuthTag();
        
        return {
            data: Buffer.concat([iv, authTag, encrypted]),
            iv: iv.toString('hex'),
            algorithm
        };
    }
    
    async decryptFile(encryptedData, encryptionInfo) {
        const algorithm = encryptionInfo.algorithm;
        const key = Buffer.from(this.encryptionKey, 'hex');
        
        const iv = encryptedData.slice(0, 16);
        const authTag = encryptedData.slice(16, 32);
        const encrypted = encryptedData.slice(32);
        
        const decipher = crypto.createDecipher(algorithm, key);
        decipher.setAAD(Buffer.from('7p-education', 'utf8'));
        decipher.setAuthTag(authTag);
        
        const decrypted = Buffer.concat([
            decipher.update(encrypted),
            decipher.final()
        ]);
        
        return decrypted;
    }
    
    generateFileId() {
        return crypto.randomBytes(16).toString('hex');
    }
    
    async calculateChecksum(data) {
        return crypto.createHash('sha256').update(data).digest('hex');
    }
    
    getFileExtension(filename) {
        const lastDotIndex = filename.lastIndexOf('.');
        return lastDotIndex > 0 ? filename.substring(lastDotIndex + 1) : 'bin';
    }
    
    async quarantineFile(fileId, reason) {
        const fileRecord = await this.getFileMetadata(fileId);
        if (!fileRecord) {
            throw new Error('File not found');
        }
        
        const currentPath = path.join(this.baseStoragePath, fileRecord.storagePath);
        const quarantinePath = path.join(this.quarantinePath, `${fileId}_${Date.now()}`);
        
        // Move file to quarantine
        await fs.rename(currentPath, quarantinePath);
        
        // Update metadata
        await this.updateFileStatus(fileId, 'quarantined', {
            quarantineReason: reason,
            quarantinedAt: new Date(),
            quarantinePath
        });
        
        console.log(`File ${fileId} quarantined: ${reason}`);
    }
}
```

### Cloud Storage Integration

```javascript
class CloudStorageIntegration {
    constructor(provider = 'aws') {
        this.provider = provider;
        this.initializeProvider();
    }
    
    initializeProvider() {
        switch (this.provider) {
            case 'aws':
                this.storage = new AWSStorageProvider();
                break;
            case 'gcp':
                this.storage = new GCPStorageProvider();
                break;
            case 'azure':
                this.storage = new AzureStorageProvider();
                break;
            default:
                throw new Error(`Unsupported storage provider: ${this.provider}`);
        }
    }
    
    async uploadSecure(file, metadata) {
        // Generate secure path
        const securePath = this.generateSecurePath(metadata);
        
        // Configure security settings
        const uploadOptions = {
            bucket: process.env.SECURE_UPLOAD_BUCKET,
            key: securePath,
            contentType: file.mimetype,
            metadata: {
                uploadedBy: metadata.userId,
                originalName: file.originalname,
                scanStatus: 'pending'
            },
            serverSideEncryption: 'AES256',
            acl: 'private', // No public access
            storageClass: 'STANDARD_IA' // Cost-effective for infrequent access
        };
        
        try {
            const result = await this.storage.upload(file.buffer, uploadOptions);
            
            // Schedule virus scan
            await this.scheduleVirusScan(result.location, metadata);
            
            return result;
        } catch (error) {
            console.error('Upload failed:', error);
            throw new Error('Failed to upload file securely');
        }
    }
    
    generateSecurePath(metadata) {
        const userId = metadata.userId;
        const category = metadata.category;
        const timestamp = new Date().toISOString().slice(0, 7); // YYYY-MM
        const fileId = crypto.randomBytes(16).toString('hex');
        
        return `${category}/${userId}/${timestamp}/${fileId}`;
    }
    
    async scheduleVirusScan(fileLocation, metadata) {
        // Integration with cloud antivirus services
        const scanRequest = {
            fileLocation,
            metadata,
            callback: process.env.SCAN_CALLBACK_URL
        };
        
        // Send to scanning service (AWS Macie, ClamAV, etc.)
        await this.sendToScanningService(scanRequest);
    }
}
```

## Access Control and Permissions

### Role-Based File Access

```javascript
class FileAccessController {
    constructor() {
        this.permissions = {
            'student': {
                upload: ['assignments', 'profile'],
                download: ['own', 'course_materials'],
                delete: ['own_assignments'],
                maxFileSize: 100 * 1024 * 1024, // 100MB
                dailyUploadLimit: 50
            },
            'instructor': {
                upload: ['course_materials', 'assignments', 'profile'],
                download: ['own', 'course_materials', 'student_assignments'],
                delete: ['own', 'course_materials'],
                maxFileSize: 500 * 1024 * 1024, // 500MB
                dailyUploadLimit: 200
            },
            'admin': {
                upload: ['all'],
                download: ['all'],
                delete: ['all'],
                maxFileSize: 1024 * 1024 * 1024, // 1GB
                dailyUploadLimit: 1000
            }
        };
    }
    
    async checkUploadPermission(user, fileCategory, fileSize) {
        const userPermissions = this.permissions[user.role];
        if (!userPermissions) {
            throw new Error('Invalid user role');
        }
        
        // Check category permission
        if (!userPermissions.upload.includes(fileCategory) && 
            !userPermissions.upload.includes('all')) {
            throw new Error(`Upload not permitted for category: ${fileCategory}`);
        }
        
        // Check file size limit
        if (fileSize > userPermissions.maxFileSize) {
            throw new Error(`File too large. Maximum size: ${userPermissions.maxFileSize} bytes`);
        }
        
        // Check daily upload limit
        const todayUploads = await this.getTodayUploadCount(user.id);
        if (todayUploads >= userPermissions.dailyUploadLimit) {
            throw new Error('Daily upload limit exceeded');
        }
        
        return true;
    }
    
    async checkDownloadPermission(user, fileId) {
        const file = await this.getFileMetadata(fileId);
        if (!file) {
            throw new Error('File not found');
        }
        
        const userPermissions = this.permissions[user.role];
        
        // Admin can download everything
        if (userPermissions.download.includes('all')) {
            return true;
        }
        
        // Check if user owns the file
        if (file.uploadedBy === user.id && userPermissions.download.includes('own')) {
            return true;
        }
        
        // Check course materials access
        if (file.category === 'course_materials' && 
            userPermissions.download.includes('course_materials')) {
            return await this.checkCourseAccess(user.id, file.courseId);
        }
        
        // Check student assignments access (for instructors)
        if (file.category === 'assignments' && 
            userPermissions.download.includes('student_assignments')) {
            return await this.checkInstructorCourseAccess(user.id, file.courseId);
        }
        
        throw new Error('Download not permitted');
    }
    
    async getTodayUploadCount(userId) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const count = await db.collection('files').countDocuments({
            uploadedBy: userId,
            uploadedAt: { $gte: today }
        });
        
        return count;
    }
    
    async checkCourseAccess(userId, courseId) {
        const enrollment = await db.collection('enrollments').findOne({
            userId,
            courseId,
            status: 'active'
        });
        
        return !!enrollment;
    }
    
    async checkInstructorCourseAccess(userId, courseId) {
        const course = await db.collection('courses').findOne({
            _id: courseId,
            instructorId: userId
        });
        
        return !!course;
    }
}
```

## Malware Scanning

### Integrated Antivirus Solution

```javascript
const NodeClam = require('clamscan');

class MalwareScanner {
    constructor() {
        this.initializeScanner();
        this.quarantineResults = new Map();
    }
    
    async initializeScanner() {
        try {
            this.clamscan = await new NodeClam().init({
                removeInfected: false, // We'll handle this manually
                quarantineInfected: false,
                scanLog: '/var/log/clamscan.log',
                debugMode: process.env.NODE_ENV === 'development',
                fileList: null,
                scanRecursively: true,
                clamdscan: {
                    socket: '/var/run/clamd.scan/clamd.sock',
                    host: '127.0.0.1',
                    port: 3310,
                    timeout: 120000,
                    localFallback: true
                },
                preference: 'clamdscan'
            });
            
            console.log('ClamAV scanner initialized successfully');
        } catch (error) {
            console.error('Failed to initialize ClamAV:', error);
            // Fallback to basic pattern scanning
            this.useFallbackScanner = true;
        }
    }
    
    async scanFile(filePath, fileBuffer) {
        try {
            if (this.useFallbackScanner) {
                return await this.fallbackScan(fileBuffer);
            }
            
            // Use ClamAV for comprehensive scanning
            const scanResult = await this.clamscan.scanFile(filePath);
            
            if (scanResult.isInfected) {
                return {
                    infected: true,
                    virus: scanResult.viruses[0],
                    scanner: 'clamav'
                };
            }
            
            return { infected: false, scanner: 'clamav' };
        } catch (error) {
            console.error('Malware scan failed:', error);
            // Fail secure - treat as potentially infected
            return { 
                infected: true, 
                virus: 'SCAN_ERROR',
                error: error.message,
                scanner: 'error'
            };
        }
    }
    
    async fallbackScan(fileBuffer) {
        // Basic pattern-based scanning as fallback
        const malwarePatterns = [
            // EICAR test signature
            /X5O!P%@AP\[4\\PZX54\(P\^\)7CC\)7\}\$EICAR-STANDARD-ANTIVIRUS-TEST-FILE\!\$H\+H\*/,
            
            // Common malware strings
            /CreateObject.*WScript\.Shell/i,
            /Shell\.Application/i,
            /cmd\.exe.*\/c/i,
            /powershell.*-enc/i,
            /eval.*base64/i,
            
            // Suspicious executable patterns
            /TVqQAAMAAAAEAAAA/,  // PE header in base64
            /UEsDBAoA/,          // ZIP header in base64
            
            // Script injection patterns
            /<script.*src.*data:/i,
            /javascript:.*eval/i,
            /vbscript:.*execute/i
        ];
        
        const content = fileBuffer.toString('base64');
        const textContent = fileBuffer.toString('utf8');
        
        for (const pattern of malwarePatterns) {
            if (pattern.test(content) || pattern.test(textContent)) {
                return {
                    infected: true,
                    virus: 'PATTERN_MATCH',
                    scanner: 'fallback'
                };
            }
        }
        
        return { infected: false, scanner: 'fallback' };
    }
    
    async scanUpload(file, metadata) {
        const scanStartTime = Date.now();
        
        try {
            // Write file to temporary location for scanning
            const tempPath = `/tmp/scan_${crypto.randomBytes(8).toString('hex')}`;
            await fs.writeFile(tempPath, file.buffer);
            
            // Perform scan
            const scanResult = await this.scanFile(tempPath, file.buffer);
            
            // Cleanup temp file
            await fs.unlink(tempPath).catch(() => {}); // Ignore cleanup errors
            
            const scanDuration = Date.now() - scanStartTime;
            
            // Log scan result
            await this.logScanResult({
                fileId: metadata.fileId,
                fileName: file.originalname,
                scanResult,
                scanDuration,
                userId: metadata.userId
            });
            
            if (scanResult.infected) {
                // Quarantine infected file
                await this.quarantineInfectedFile(metadata.fileId, scanResult);
                throw new Error(`Malware detected: ${scanResult.virus}`);
            }
            
            return scanResult;
        } catch (error) {
            console.error('Scan failed:', error);
            throw error;
        }
    }
    
    async quarantineInfectedFile(fileId, scanResult) {
        // Move file to quarantine and update database
        await this.quarantineFile(fileId, `Malware detected: ${scanResult.virus}`);
        
        // Send security alert
        await this.sendSecurityAlert({
            type: 'malware_detected',
            fileId,
            virus: scanResult.virus,
            scanner: scanResult.scanner,
            timestamp: new Date()
        });
    }
    
    async logScanResult(scanData) {
        await db.collection('scan_logs').insertOne({
            ...scanData,
            timestamp: new Date()
        });
    }
    
    async sendSecurityAlert(alertData) {
        // Implementation depends on your alerting system
        console.log('SECURITY ALERT:', alertData);
        
        // Send to monitoring system, Slack, email, etc.
        await this.notificationService.sendAlert(alertData);
    }
}
```

## Implementation Examples

### Complete Upload Handler

```javascript
const multer = require('multer');
const express = require('express');

class SecureUploadHandler {
    constructor() {
        this.fileValidator = new FileTypeValidator();
        this.sizeValidator = new FileSizeValidator();
        this.contentScanner = new ContentScanner();
        this.malwareScanner = new MalwareScanner();
        this.fileStorage = new SecureFileStorage();
        this.accessController = new FileAccessController();
        
        this.setupMulter();
    }
    
    setupMulter() {
        this.upload = multer({
            storage: multer.memoryStorage(),
            limits: {
                fileSize: 500 * 1024 * 1024, // 500MB max
                files: 10, // Max 10 files per request
                fields: 20 // Max 20 form fields
            },
            fileFilter: (req, file, cb) => {
                // Basic filtering at multer level
                const extension = file.originalname.split('.').pop().toLowerCase();
                const blockedExtensions = ['exe', 'bat', 'cmd', 'scr', 'php', 'asp'];
                
                if (blockedExtensions.includes(extension)) {
                    cb(new Error('File type not allowed'), false);
                } else {
                    cb(null, true);
                }
            }
        });
    }
    
    createUploadMiddleware(category) {
        return [
            this.upload.single('file'),
            async (req, res, next) => {
                try {
                    await this.processUpload(req, res, category);
                } catch (error) {
                    next(error);
                }
            }
        ];
    }
    
    async processUpload(req, res, category) {
        const user = req.user;
        const file = req.file;
        
        if (!file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }
        
        try {
            // Step 1: Access control check
            await this.accessController.checkUploadPermission(
                user, category, file.size
            );
            
            // Step 2: Filename sanitization
            file.originalname = FilenameSanitizer.sanitize(file.originalname);
            
            // Step 3: File type validation
            this.fileValidator.validateType(file, category);
            
            // Step 4: Size validation
            this.sizeValidator.validateSize(file, category);
            await this.sizeValidator.validateUserQuota(user.id, file.size);
            
            // Step 5: Content validation
            await this.contentScanner.scanContent(file);
            
            // Step 6: File signature validation
            const fileExtension = this.fileValidator.getFileExtension(file.originalname);
            if (fileExtension) {
                await new FileSignatureValidator().validateSignature(file, fileExtension);
            }
            
            // Step 7: Malware scanning
            const scanResult = await this.malwareScanner.scanUpload(file, {
                userId: user.id,
                category,
                fileId: crypto.randomBytes(16).toString('hex')
            });
            
            // Step 8: Secure storage
            const storageResult = await this.fileStorage.storeFile(file, {
                userId: user.id,
                category,
                scanResult
            });
            
            // Step 9: Success response
            res.json({
                success: true,
                fileId: storageResult.fileId,
                originalName: file.originalname,
                size: file.size,
                uploadedAt: new Date().toISOString()
            });
            
        } catch (error) {
            console.error('Upload failed:', error);
            
            // Log security incident
            await this.logSecurityIncident({
                type: 'upload_rejected',
                userId: user.id,
                filename: file.originalname,
                reason: error.message,
                category
            });
            
            res.status(400).json({
                error: 'Upload failed',
                message: error.message
            });
        }
    }
    
    async logSecurityIncident(incident) {
        await db.collection('security_incidents').insertOne({
            ...incident,
            timestamp: new Date(),
            severity: 'medium'
        });
    }
}

// Usage in Express app
const app = express();
const uploadHandler = new SecureUploadHandler();

// Course materials upload (instructors only)
app.post('/api/upload/course-materials', 
    authenticateUser,
    requireRole(['instructor', 'admin']),
    uploadHandler.createUploadMiddleware('documents')
);

// Student assignment upload
app.post('/api/upload/assignment',
    authenticateUser,
    requireRole(['student', 'instructor', 'admin']),
    uploadHandler.createUploadMiddleware('assignments')
);

// Profile picture upload
app.post('/api/upload/profile',
    authenticateUser,
    uploadHandler.createUploadMiddleware('images')
);
```

## Monitoring and Logging

### File Upload Security Monitoring

```javascript
class FileUploadMonitor {
    constructor() {
        this.metrics = {
            totalUploads: 0,
            rejectedUploads: 0,
            malwareDetected: 0,
            suspiciousActivity: 0
        };
        
        this.alertThresholds = {
            rejectionRate: 0.5, // 50% rejection rate
            malwareRate: 0.01,  // 1% malware detection rate
            uploadSpike: 1000   // Uploads per minute
        };
        
        this.recentActivity = [];
        this.startMonitoring();
    }
    
    logUploadAttempt(user, file, result) {
        const logEntry = {
            timestamp: new Date(),
            userId: user.id,
            userRole: user.role,
            filename: file.originalname,
            fileSize: file.size,
            mimeType: file.mimetype,
            result: result.success ? 'success' : 'rejected',
            reason: result.reason || null,
            ipAddress: user.ipAddress,
            userAgent: user.userAgent
        };
        
        // Store in database
        this.storeLogEntry(logEntry);
        
        // Update metrics
        this.updateMetrics(logEntry);
        
        // Check for suspicious patterns
        this.checkSuspiciousActivity(logEntry);
    }
    
    updateMetrics(logEntry) {
        this.metrics.totalUploads++;
        
        if (logEntry.result === 'rejected') {
            this.metrics.rejectedUploads++;
        }
        
        if (logEntry.reason && logEntry.reason.includes('malware')) {
            this.metrics.malwareDetected++;
        }
        
        // Check alert thresholds
        this.checkAlertThresholds();
    }
    
    checkSuspiciousActivity(logEntry) {
        // Add to recent activity
        this.recentActivity.push(logEntry);
        
        // Keep only last hour of activity
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        this.recentActivity = this.recentActivity.filter(
            entry => entry.timestamp > oneHourAgo
        );
        
        // Check for patterns
        this.detectAnomalousPatterns(logEntry);
    }
    
    detectAnomalousPatterns(logEntry) {
        const userId = logEntry.userId;
        const ipAddress = logEntry.ipAddress;
        
        // Check rapid upload attempts from same user
        const userActivity = this.recentActivity.filter(
            entry => entry.userId === userId
        );
        
        if (userActivity.length > 50) { // 50 uploads in 1 hour
            this.sendAlert({
                type: 'rapid_upload_attempts',
                userId,
                count: userActivity.length,
                timeframe: '1 hour'
            });
        }
        
        // Check multiple rejection from same IP
        const ipActivity = this.recentActivity.filter(
            entry => entry.ipAddress === ipAddress && entry.result === 'rejected'
        );
        
        if (ipActivity.length > 20) { // 20 rejections from same IP
            this.sendAlert({
                type: 'multiple_rejections',
                ipAddress,
                count: ipActivity.length,
                timeframe: '1 hour'
            });
        }
        
        // Check for filename manipulation attempts
        if (this.detectFilenameManipulation(logEntry.filename)) {
            this.sendAlert({
                type: 'filename_manipulation',
                userId,
                filename: logEntry.filename
            });
        }
    }
    
    detectFilenameManipulation(filename) {
        const suspiciousPatterns = [
            /\.\./,           // Path traversal
            /[<>:"|?*]/,      // Invalid characters
            /\x00/,           // Null bytes
            /\.php\./i,       // Double extensions
            /\.asp\./i,
            /\.jsp\./i
        ];
        
        return suspiciousPatterns.some(pattern => pattern.test(filename));
    }
    
    checkAlertThresholds() {
        const rejectionRate = this.metrics.rejectedUploads / this.metrics.totalUploads;
        const malwareRate = this.metrics.malwareDetected / this.metrics.totalUploads;
        
        if (rejectionRate > this.alertThresholds.rejectionRate) {
            this.sendAlert({
                type: 'high_rejection_rate',
                rate: rejectionRate,
                threshold: this.alertThresholds.rejectionRate
            });
        }
        
        if (malwareRate > this.alertThresholds.malwareRate) {
            this.sendAlert({
                type: 'high_malware_rate',
                rate: malwareRate,
                threshold: this.alertThresholds.malwareRate
            });
        }
    }
    
    startMonitoring() {
        // Reset metrics every hour
        setInterval(() => {
            this.resetMetrics();
        }, 60 * 60 * 1000);
        
        // Generate reports every 24 hours
        setInterval(() => {
            this.generateDailyReport();
        }, 24 * 60 * 60 * 1000);
    }
    
    resetMetrics() {
        this.metrics = {
            totalUploads: 0,
            rejectedUploads: 0,
            malwareDetected: 0,
            suspiciousActivity: 0
        };
    }
    
    async generateDailyReport() {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        yesterday.setHours(0, 0, 0, 0);
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const dailyStats = await db.collection('upload_logs').aggregate([
            {
                $match: {
                    timestamp: { $gte: yesterday, $lt: today }
                }
            },
            {
                $group: {
                    _id: null,
                    totalUploads: { $sum: 1 },
                    successfulUploads: {
                        $sum: { $cond: [{ $eq: ['$result', 'success'] }, 1, 0] }
                    },
                    rejectedUploads: {
                        $sum: { $cond: [{ $eq: ['$result', 'rejected'] }, 1, 0] }
                    },
                    malwareDetected: {
                        $sum: { $cond: [{ $regex: ['$reason', /malware/i] }, 1, 0] }
                    },
                    avgFileSize: { $avg: '$fileSize' },
                    topFileTypes: { $push: '$mimeType' }
                }
            }
        ]).toArray();
        
        // Send daily report
        await this.sendDailyReport(dailyStats[0]);
    }
    
    async sendAlert(alert) {
        console.log('FILE UPLOAD SECURITY ALERT:', alert);
        
        // Send to security team
        await this.notificationService.sendSecurityAlert({
            ...alert,
            timestamp: new Date(),
            service: 'file-upload',
            severity: this.calculateAlertSeverity(alert)
        });
    }
    
    calculateAlertSeverity(alert) {
        switch (alert.type) {
            case 'high_malware_rate':
                return 'critical';
            case 'filename_manipulation':
                return 'high';
            case 'rapid_upload_attempts':
                return 'medium';
            default:
                return 'low';
        }
    }
}
```

## Configuration Guidelines

### Production Security Configuration

```javascript
// config/file-upload-security.js
module.exports = {
  // File size limits by category
  fileSizeLimits: {
    images: 10 * 1024 * 1024,        // 10MB
    documents: 100 * 1024 * 1024,     // 100MB
    videos: 500 * 1024 * 1024,        // 500MB
    archives: 200 * 1024 * 1024,      // 200MB
    default: 50 * 1024 * 1024         // 50MB
  },
  
  // User quotas by role
  userQuotas: {
    student: 5 * 1024 * 1024 * 1024,    // 5GB
    instructor: 20 * 1024 * 1024 * 1024, // 20GB
    admin: 100 * 1024 * 1024 * 1024     // 100GB
  },
  
  // Daily upload limits
  dailyLimits: {
    student: 50,
    instructor: 200,
    admin: 1000
  },
  
  // Security settings
  security: {
    enableMalwareScanning: true,
    enableContentScanning: true,
    enableEncryption: true,
    quarantineInfected: true,
    blockExecutables: true,
    enableFileSignatureValidation: true
  },
  
  // Storage configuration
  storage: {
    provider: 'aws', // 'aws', 'gcp', 'azure', 'local'
    bucket: process.env.SECURE_UPLOAD_BUCKET,
    encryptionKey: process.env.FILE_ENCRYPTION_KEY,
    region: process.env.AWS_REGION || 'us-east-1'
  },
  
  // Monitoring thresholds
  monitoring: {
    rejectionRateThreshold: 0.3,
    malwareRateThreshold: 0.01,
    uploadSpikeThreshold: 1000,
    enableRealTimeAlerts: true
  }
};
```

This comprehensive secure file upload implementation provides multiple layers of protection against various threats while maintaining usability for the 7P Education Platform. The system includes proper validation, malware scanning, secure storage, and comprehensive monitoring to ensure the safety of uploaded content.