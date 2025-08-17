/**
 * Sample Data Extractor for 7P Education Database
 * Extracts actual sample data from live database
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
import dotenv from 'dotenv';
dotenv.config({ path: path.join(__dirname, '../.env.local') });

class SampleDataExtractor {
    constructor() {
        this.supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        this.supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        
        if (this.supabaseUrl && this.supabaseKey) {
            this.client = createClient(this.supabaseUrl, this.supabaseKey);
        }

        this.tablesWithData = [
            'course_categories',
            'instructors', 
            'courses',
            'course_modules',
            'course_lessons'
        ];
    }

    async extractSampleData() {
        console.log('📊 Extracting sample data from database...\n');
        
        const sampleData = {};

        for (const tableName of this.tablesWithData) {
            try {
                console.log(`🔍 Extracting data from ${tableName}...`);
                
                const { data, error } = await this.client
                    .from(tableName)
                    .select('*')
                    .limit(10);

                if (!error && data && data.length > 0) {
                    sampleData[tableName] = data;
                    console.log(`  ✅ Found ${data.length} records`);
                } else {
                    console.log(`  ⚠️ No data found or access restricted`);
                    sampleData[tableName] = [];
                }
            } catch (e) {
                console.log(`  ❌ Error accessing ${tableName}: ${e.message}`);
                sampleData[tableName] = [];
            }
        }

        return sampleData;
    }

    generateSampleDataReport(sampleData) {
        let report = `# 7P Education - Live Database Sample Data

**Extracted on:** ${new Date().toISOString()}
**Database:** ${this.supabaseUrl}

---

`;

        for (const [tableName, data] of Object.entries(sampleData)) {
            report += `## ${tableName}

**Records:** ${data.length}

`;
            
            if (data.length > 0) {
                // Show table structure
                const firstRecord = data[0];
                const columns = Object.keys(firstRecord);
                
                report += `**Columns:** ${columns.join(', ')}

### Sample Records

\`\`\`json
${JSON.stringify(data, null, 2)}
\`\`\`

`;
            } else {
                report += `*No data available*

`;
            }

            report += `---

`;
        }

        const reportPath = path.join(__dirname, '../LIVE_DATABASE_SAMPLE_DATA.md');
        fs.writeFileSync(reportPath, report);
        console.log(`\n📄 Sample data report saved: ${reportPath}`);
        
        return reportPath;
    }

    async run() {
        console.log('🚀 7P Education Sample Data Extraction\n');

        try {
            const sampleData = await this.extractSampleData();
            const reportPath = this.generateSampleDataReport(sampleData);
            
            console.log('\n📊 Extraction Summary:');
            for (const [tableName, data] of Object.entries(sampleData)) {
                console.log(`  ${tableName}: ${data.length} records`);
            }
            
            return sampleData;

        } catch (error) {
            console.error('❌ Sample data extraction failed:', error.message);
            throw error;
        }
    }
}

// Run extraction if script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    const extractor = new SampleDataExtractor();
    extractor.run().catch(console.error);
}

export default SampleDataExtractor;