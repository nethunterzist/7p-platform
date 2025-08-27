# 7P Education - Runtime Decisions

> Edge vs Node.js runtime kararları ve optimizasyon rehberi

## 🎯 Kritik Bilgiler

- **Edge Routes**: ~47 (basit işlemler, static content)
- **Node.js Routes**: 18 (auth, payments, database operations)  
- **Hybrid Strategy**: Runtime per endpoint, not global
- **Performance**: Edge ~100ms faster, Node.js more capable

## ⚡ Edge Runtime

### Kullanım Alanları
- **Static Pages**: Landing, course listings
- **Simple API**: Search, public data
- **Fast Responses**: Health checks, basic CRUD
- **Global Distribution**: Vercel Edge Network

### Edge-Uyumlu Routes

| Route | Tür | Amaç | Dosya |
|-------|-----|------|-------|
| `/api/courses` | API | Course listing | `src/app/api/courses/route.ts` |
| `/api/courses/search` | API | Course search | `src/app/api/courses/search/route.ts` |
| `/api/student/progress` | API | Progress tracking | `src/app/api/student/progress/route.ts` |
| `/api/health/simple` | API | Basic health | `src/app/api/health/simple/route.ts` |
| `/api/test-public` | API | Public testing | `src/app/api/test-public/route.ts` |

### Edge Runtime Sınırları
```typescript
// ❌ Edge'de ÇALIŞMAZ
import fs from 'fs';                    // File system
import bcrypt from 'bcryptjs';          // Native crypto
import { createClient } from '@supabase/supabase-js'; // Complex DB ops

// ✅ Edge'de ÇALIŞIR  
import { NextRequest, NextResponse } from 'next/server';
const data = await fetch('https://api.example.com');
const json = { message: 'Hello Edge' };
```

## 🖥️ Node.js Runtime

### Ne Zaman Kullanılır?
- **Authentication**: Complex auth operations
- **Payments**: Stripe integration  
- **Database**: Admin operations, complex queries
- **File Operations**: Upload, processing
- **Third-party Integrations**: External APIs with SDKs

### Node.js Runtime Routes

| Route Category | Example | Why Node.js | Kaynak |
|----------------|---------|-------------|--------|
| **Auth** | `/api/auth/login` | bcrypt, Supabase admin | `src/app/api/auth/*/route.ts` |
| **Payments** | `/api/payments/create-checkout-session` | Stripe SDK | `src/app/api/payments/*/route.ts` |
| **Health** | `/api/health` | System metrics, memory | `src/app/api/health/route.ts` |
| **Webhooks** | `/api/webhooks/stripe` | Crypto verification | `src/app/api/webhooks/stripe/route.ts` |
| **Diagnostics** | `/api/diag` | System introspection | `src/app/api/diag/route.ts` |

## 🔧 Runtime Declaration

### API Routes
```typescript
// Force Node.js runtime
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
// Complex operations available here
```

### Pages (App Router)
```typescript
// In page.tsx - runtime is inferred
export default function Page() {
  // Page components run on server + client
  // Server-side runs on Node.js
  return <div>Hello World</div>;
}
```

## 📊 Edge-Uyumsuz Kütüphaneler

### File System
```typescript
// ❌ Edge'de çalışmaz
import fs from 'fs';
import path from 'path';

// ✅ Alternatif: Vercel Blob Storage
import { put } from '@vercel/blob';
```

### Crypto & Hashing  
```typescript
// ❌ Edge'de çalışmaz
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

// ✅ Alternatif: Web Crypto API
const hash = await crypto.subtle.digest('SHA-256', data);
```

### Database Libraries
```typescript
// ❌ Complex operations
import { createClient } from '@supabase/supabase-js';
const { data } = await supabase.auth.admin.getUserById(id);

// ✅ Simple operations
const response = await fetch(`${supabaseUrl}/rest/v1/table`);
```

### Process & OS
```typescript
// ❌ Edge'de çalışmaz
import os from 'os';
process.memoryUsage();

// ✅ Edge'de kullanılabilir
performance.now();
Date.now();
```

## ⚙️ Runtime Strategy

### Decision Matrix

| İşlem Türü | Edge | Node.js | Seçim Kriteri |
|------------|------|---------|---------------|
| **Static Data** | ✅ | ❌ | Speed > complexity |
| **Auth Operations** | ❌ | ✅ | Security requirements |
| **Payment Processing** | ❌ | ✅ | SDK dependencies |
| **File Upload** | ❌ | ✅ | File system access |
| **Simple CRUD** | ✅ | ❌ | Fast response |
| **Complex Queries** | ❌ | ✅ | Database capabilities |

### Performance Comparison

| Metric | Edge Runtime | Node.js Runtime |
|--------|-------------|----------------|
| **Cold Start** | ~50ms | ~200ms |
| **Memory** | 128MB limit | 1GB limit |
| **Execution Time** | 30s limit | 60s limit |
| **Geographic** | Global CDN | Regional |

## 🔄 Migration Guidelines

### Edge → Node.js Migration
```typescript
// BEFORE (Edge, fails with complex ops)
export default async function handler(req: NextRequest) {
  const hashedPassword = await bcrypt.hash(password, 10); // ❌ Fails
  return NextResponse.json({ success: false });
}

// AFTER (Node.js, works)  
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const hashedPassword = await bcrypt.hash(password, 10); // ✅ Works
  return NextResponse.json({ success: true });
}
```

### Node.js → Edge Migration
```typescript
// BEFORE (Node.js, over-engineered)
export const runtime = 'nodejs';
import fs from 'fs';

export async function GET() {
  const config = fs.readFileSync('./config.json'); // Unnecessary
  return NextResponse.json({ data: 'simple' });
}

// AFTER (Edge, faster)
export async function GET() {
  // No runtime declaration needed for Edge
  const config = { simple: 'data' }; // Static config
  return NextResponse.json({ data: 'simple' });
}
```

## 🚨 Common Runtime Issues

### Issue 1: "Module not found" in Edge
```bash
Error: Module "fs" is not available in Edge Runtime
```
**Solution**: Add `export const runtime = 'nodejs';`

### Issue 2: "Function too complex for Edge"  
```bash
Error: Dynamic code evaluation not allowed
```
**Solution**: Simplify logic or use Node.js runtime

### Issue 3: "Supabase admin functions failing"
```typescript
// ❌ Edge'de çalışmaz
const { data } = await supabase.auth.admin.getUserById(id);

// ✅ Node.js'de çalışır
export const runtime = 'nodejs';
const { data } = await supabase.auth.admin.getUserById(id);
```

## 🔧 Configuration Patterns

### Conditional Runtime
```typescript
// Based on environment
export const runtime = process.env.NODE_ENV === 'production' ? 'edge' : 'nodejs';
```

### Mixed Approach (Recommended)
```typescript
// Simple operations: Edge (no declaration needed)
// Complex operations: Explicit Node.js
export const runtime = 'nodejs'; // When needed only
```

## 📈 Performance Optimization

### Edge Runtime Best Practices
```typescript
// ✅ Optimize for Edge
export async function GET(request: NextRequest) {
  // Use fetch instead of libraries
  const response = await fetch(`${process.env.API_URL}/data`);
  const data = await response.json();
  
  // Simple transformations
  const filtered = data.filter(item => item.active);
  
  return NextResponse.json(filtered);
}
```

### Node.js Runtime Best Practices
```typescript
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  // Complex operations ok here
  const supabase = createClient(url, key);
  const hashedPassword = await bcrypt.hash(password, 10);
  
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password: hashedPassword
  });
  
  return NextResponse.json({ success: !error });
}
```

## 🔍 Debugging Runtime Issues

### Check Current Runtime
```typescript
export async function GET() {
  const runtime = typeof process !== 'undefined' ? 'nodejs' : 'edge';
  return NextResponse.json({ runtime });
}
```

### Environment Detection
```typescript
const isEdge = !process.versions?.node;
const isNode = !!process.versions?.node;
```

## 🎯 Future Considerations

### Planned Changes
- **File Operations**: Move to Vercel Blob Storage (Edge-compatible)
- **Auth**: Simplify for Edge where possible  
- **Caching**: Edge-compatible Redis alternative
- **Real-time**: WebSockets via Node.js runtime

### Migration Strategy
1. **Identify**: Complex operations requiring Node.js
2. **Isolate**: Move complex logic to dedicated endpoints
3. **Optimize**: Use Edge for simple operations
4. **Monitor**: Performance impact measurement

---

**Related Docs**: [CODEMAP.md](./CODEMAP.md) | [ROUTEMAP.md](./ROUTEMAP.md) | [PERFORMANCE.md](./MONITORING.md)  
*Last updated: 2025-01-27*