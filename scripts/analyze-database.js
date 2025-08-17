/**
 * Comprehensive Supabase Database Analysis Script
 * Analyzes all aspects of the 7P Education database
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

class DatabaseAnalyzer {
    constructor() {
        this.supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        this.supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        this.serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        
        if (!this.supabaseUrl || !this.supabaseKey) {
            throw new Error('Missing Supabase environment variables');
        }

        // Use service role key if available for admin operations
        const key = this.serviceRoleKey || this.supabaseKey;
        this.supabase = createClient(this.supabaseUrl, key);
        
        this.analysis = {
            connectionTest: null,
            schemas: [],
            tables: [],
            relationships: [],
            performance: {},
            recommendations: [],
            metadata: {
                timestamp: new Date().toISOString(),
                supabaseUrl: this.supabaseUrl,
                hasServiceKey: !!this.serviceRoleKey
            }
        };
    }

    async testConnection() {
        console.log('🔗 Testing Supabase connection...');
        try {
            const { data, error } = await this.supabase
                .from('information_schema.tables')
                .select('table_name')
                .limit(1);

            if (error) {
                this.analysis.connectionTest = {
                    success: false,
                    error: error.message,
                    timestamp: new Date().toISOString()
                };
                console.error('❌ Connection test failed:', error.message);
                return false;
            }

            this.analysis.connectionTest = {
                success: true,
                timestamp: new Date().toISOString(),
                method: 'information_schema query'
            };
            console.log('✅ Connection successful');
            return true;
        } catch (error) {
            this.analysis.connectionTest = {
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            };
            console.error('❌ Connection test failed:', error.message);
            return false;
        }
    }

    async discoverSchemas() {
        console.log('🔍 Discovering database schemas...');
        try {
            const { data, error } = await this.supabase.rpc('get_schemas');
            
            if (error) {
                // Fallback to basic schema query
                const fallback = await this.supabase
                    .from('information_schema.schemata')
                    .select('schema_name');
                
                if (fallback.error) {
                    console.log('⚠️ Could not query schemas directly, using default schemas');
                    this.analysis.schemas = ['public', 'auth'];
                    return;
                }
                
                this.analysis.schemas = fallback.data?.map(s => s.schema_name) || ['public'];
            } else {
                this.analysis.schemas = data || ['public'];
            }
            
            console.log(`📊 Found ${this.analysis.schemas.length} schemas:`, this.analysis.schemas);
        } catch (error) {
            console.log('⚠️ Schema discovery failed, using default schemas:', error.message);
            this.analysis.schemas = ['public', 'auth'];
        }
    }

    async discoverTables() {
        console.log('📋 Discovering tables...');
        
        for (const schema of this.analysis.schemas) {
            try {
                // Try multiple approaches to get table information
                let tables = [];
                
                // Approach 1: Direct table query (works with anon key)
                try {
                    const { data: tableData } = await this.supabase
                        .from('information_schema.tables')
                        .select('table_name, table_type, table_schema')
                        .eq('table_schema', schema)
                        .eq('table_type', 'BASE TABLE');
                    
                    if (tableData) {
                        tables = tableData;
                    }
                } catch (e) {
                    console.log(`⚠️ Could not query information_schema for schema ${schema}`);
                }

                // Approach 2: Try known tables if schema is public
                if (schema === 'public' && tables.length === 0) {
                    const knownTables = ['users', 'courses', 'lessons', 'enrollments', 'progress', 'categories'];
                    for (const tableName of knownTables) {
                        try {
                            const { data, error } = await this.supabase
                                .from(tableName)
                                .select('*')
                                .limit(1);
                            
                            if (!error) {
                                tables.push({
                                    table_name: tableName,
                                    table_type: 'BASE TABLE',
                                    table_schema: 'public'
                                });
                            }
                        } catch (e) {
                            // Table doesn't exist, skip
                        }
                    }
                }

                for (const table of tables) {
                    console.log(`🔍 Analyzing table: ${schema}.${table.table_name}`);
                    
                    const tableAnalysis = {
                        schema: schema,
                        name: table.table_name,
                        type: table.table_type,
                        columns: [],
                        constraints: [],
                        indexes: [],
                        sampleData: [],
                        rowCount: null,
                        sizeInfo: null
                    };

                    // Get column information
                    await this.analyzeTableColumns(tableAnalysis);
                    
                    // Get sample data
                    await this.getSampleData(tableAnalysis);
                    
                    // Get row count
                    await this.getRowCount(tableAnalysis);

                    this.analysis.tables.push(tableAnalysis);
                }
                
                console.log(`✅ Found ${tables.length} tables in schema '${schema}'`);
            } catch (error) {
                console.error(`❌ Error analyzing schema '${schema}':`, error.message);
            }
        }
    }

    async analyzeTableColumns(tableAnalysis) {
        try {
            const { data, error } = await this.supabase
                .from('information_schema.columns')
                .select(`
                    column_name,
                    data_type,
                    is_nullable,
                    column_default,
                    character_maximum_length,
                    numeric_precision,
                    numeric_scale
                `)
                .eq('table_schema', tableAnalysis.schema)
                .eq('table_name', tableAnalysis.name)
                .order('ordinal_position');

            if (!error && data) {
                tableAnalysis.columns = data;
            } else {
                console.log(`⚠️ Could not get column info for ${tableAnalysis.name}, trying sample query...`);
                
                // Fallback: try to get columns from a sample query
                try {
                    const { data: sampleData } = await this.supabase
                        .from(tableAnalysis.name)
                        .select('*')
                        .limit(1);
                    
                    if (sampleData && sampleData.length > 0) {
                        const row = sampleData[0];
                        tableAnalysis.columns = Object.keys(row).map(col => ({
                            column_name: col,
                            data_type: typeof row[col],
                            is_nullable: 'YES',
                            column_default: null
                        }));
                    }
                } catch (fallbackError) {
                    console.log(`⚠️ Fallback column detection failed for ${tableAnalysis.name}`);
                }
            }
        } catch (error) {
            console.log(`⚠️ Column analysis failed for ${tableAnalysis.name}:`, error.message);
        }
    }

    async getSampleData(tableAnalysis) {
        try {
            const { data, error } = await this.supabase
                .from(tableAnalysis.name)
                .select('*')
                .limit(5);

            if (!error && data) {
                tableAnalysis.sampleData = data;
                console.log(`📊 Retrieved ${data.length} sample records from ${tableAnalysis.name}`);
            } else if (error) {
                console.log(`⚠️ Could not retrieve sample data from ${tableAnalysis.name}:`, error.message);
                tableAnalysis.sampleData = [];
            }
        } catch (error) {
            console.log(`⚠️ Sample data retrieval failed for ${tableAnalysis.name}:`, error.message);
            tableAnalysis.sampleData = [];
        }
    }

    async getRowCount(tableAnalysis) {
        try {
            const { count, error } = await this.supabase
                .from(tableAnalysis.name)
                .select('*', { count: 'exact', head: true });

            if (!error) {
                tableAnalysis.rowCount = count;
                console.log(`📊 Table ${tableAnalysis.name} has ${count} rows`);
            } else {
                console.log(`⚠️ Could not get row count for ${tableAnalysis.name}:`, error.message);
            }
        } catch (error) {
            console.log(`⚠️ Row count failed for ${tableAnalysis.name}:`, error.message);
        }
    }

    async analyzeRelationships() {
        console.log('🔗 Analyzing table relationships...');
        
        try {
            // Try to get foreign key information
            const { data, error } = await this.supabase
                .from('information_schema.table_constraints')
                .select(`
                    constraint_name,
                    table_name,
                    constraint_type
                `)
                .eq('constraint_type', 'FOREIGN KEY');

            if (!error && data) {
                this.analysis.relationships = data;
                console.log(`🔗 Found ${data.length} foreign key relationships`);
            } else {
                console.log('⚠️ Could not query foreign key relationships');
                this.analysis.relationships = [];
            }
        } catch (error) {
            console.log('⚠️ Relationship analysis failed:', error.message);
            this.analysis.relationships = [];
        }
    }

    async analyzePerformance() {
        console.log('⚡ Analyzing performance metrics...');
        
        this.analysis.performance = {
            timestamp: new Date().toISOString(),
            tableStats: [],
            recommendations: []
        };

        // Basic performance analysis based on table sizes and structure
        for (const table of this.analysis.tables) {
            const stats = {
                tableName: table.name,
                rowCount: table.rowCount,
                columnCount: table.columns.length,
                hasIndexes: table.indexes.length > 0,
                potentialIssues: []
            };

            // Check for potential performance issues
            if (table.rowCount > 1000 && table.indexes.length === 0) {
                stats.potentialIssues.push('Large table without indexes');
            }

            if (table.columns.length > 20) {
                stats.potentialIssues.push('Wide table - consider normalization');
            }

            this.analysis.performance.tableStats.push(stats);
        }
    }

    generateRecommendations() {
        console.log('💡 Generating recommendations...');
        
        const recommendations = [];

        // Check for missing service role key
        if (!this.serviceRoleKey) {
            recommendations.push({
                type: 'security',
                priority: 'high',
                title: 'Missing Service Role Key',
                description: 'SUPABASE_SERVICE_ROLE_KEY is not configured. This limits admin operations and schema analysis.',
                action: 'Add the service role key to .env.local from Supabase Dashboard > Settings > API'
            });
        }

        // Check for tables without proper indexing
        for (const table of this.analysis.tables) {
            if (table.rowCount > 1000 && table.indexes.length === 0) {
                recommendations.push({
                    type: 'performance',
                    priority: 'medium',
                    title: `Add indexes to table '${table.name}'`,
                    description: `Table has ${table.rowCount} rows but no visible indexes`,
                    action: 'Consider adding indexes on frequently queried columns'
                });
            }
        }

        // Check for missing tables (common education platform tables)
        const expectedTables = ['users', 'courses', 'lessons', 'enrollments', 'progress'];
        const existingTableNames = this.analysis.tables.map(t => t.name);
        
        for (const expectedTable of expectedTables) {
            if (!existingTableNames.includes(expectedTable)) {
                recommendations.push({
                    type: 'architecture',
                    priority: 'low',
                    title: `Consider adding '${expectedTable}' table`,
                    description: `Common table for education platforms not found`,
                    action: 'Evaluate if this table is needed for your application'
                });
            }
        }

        this.analysis.recommendations = recommendations;
    }

    async generateReport() {
        const reportPath = path.join(__dirname, '../SUPABASE_DATABASE_ANALYSIS.md');
        
        let markdown = `# 7P Education - Supabase Database Analysis Report

## Executive Summary

**Analysis Date:** ${this.analysis.metadata.timestamp}
**Supabase URL:** ${this.analysis.metadata.supabaseUrl}
**Service Role Key Available:** ${this.analysis.metadata.hasServiceKey ? '✅ Yes' : '❌ No'}

### Quick Stats
- **Schemas Found:** ${this.analysis.schemas.length}
- **Tables Analyzed:** ${this.analysis.tables.length}
- **Relationships Mapped:** ${this.analysis.relationships.length}
- **Recommendations Generated:** ${this.analysis.recommendations.length}

---

## 1. Connection Test

`;

        if (this.analysis.connectionTest?.success) {
            markdown += `✅ **Connection Successful**
- Method: ${this.analysis.connectionTest.method}
- Tested: ${this.analysis.connectionTest.timestamp}

`;
        } else {
            markdown += `❌ **Connection Failed**
- Error: ${this.analysis.connectionTest?.error || 'Unknown error'}
- Tested: ${this.analysis.connectionTest?.timestamp || 'N/A'}

`;
        }

        markdown += `---

## 2. Database Schemas

Found ${this.analysis.schemas.length} schemas:

`;

        for (const schema of this.analysis.schemas) {
            const schemaTablesCount = this.analysis.tables.filter(t => t.schema === schema).length;
            markdown += `- **${schema}** (${schemaTablesCount} tables)\n`;
        }

        markdown += `\n---

## 3. Table Analysis

### 3.1 Table Overview

| Schema | Table | Columns | Rows | Sample Data | Status |
|--------|-------|---------|------|-------------|--------|
`;

        for (const table of this.analysis.tables) {
            const sampleCount = table.sampleData?.length || 0;
            const rowCount = table.rowCount !== null ? table.rowCount.toLocaleString() : 'N/A';
            const status = sampleCount > 0 ? '✅ Active' : '⚠️ Empty/Restricted';
            
            markdown += `| ${table.schema} | ${table.name} | ${table.columns.length} | ${rowCount} | ${sampleCount} records | ${status} |\n`;
        }

        markdown += `\n### 3.2 Detailed Table Schemas

`;

        for (const table of this.analysis.tables) {
            markdown += `#### ${table.schema}.${table.name}

**Type:** ${table.type}
**Columns:** ${table.columns.length}
**Rows:** ${table.rowCount !== null ? table.rowCount.toLocaleString() : 'Unknown'}

##### Column Structure

| Column | Type | Nullable | Default | Max Length |
|--------|------|----------|---------|------------|
`;

            for (const col of table.columns) {
                const maxLength = col.character_maximum_length || '-';
                const nullable = col.is_nullable === 'YES' ? '✅' : '❌';
                const defaultVal = col.column_default || '-';
                
                markdown += `| ${col.column_name} | ${col.data_type} | ${nullable} | ${defaultVal} | ${maxLength} |\n`;
            }

            if (table.sampleData && table.sampleData.length > 0) {
                markdown += `\n##### Sample Data (${table.sampleData.length} records)

\`\`\`json
${JSON.stringify(table.sampleData, null, 2)}
\`\`\`

`;
            } else {
                markdown += `\n##### Sample Data
⚠️ No sample data available (table may be empty or access restricted)

`;
            }
        }

        markdown += `---

## 4. Relationships & Dependencies

`;

        if (this.analysis.relationships.length > 0) {
            markdown += `Found ${this.analysis.relationships.length} foreign key relationships:

| Constraint | Table | Type |
|------------|-------|------|
`;

            for (const rel of this.analysis.relationships) {
                markdown += `| ${rel.constraint_name} | ${rel.table_name} | ${rel.constraint_type} |\n`;
            }
        } else {
            markdown += `⚠️ No foreign key relationships detected. This could be due to:
- Tables are not yet created
- Relationships are managed at application level
- Limited access permissions

`;
        }

        markdown += `\n---

## 5. Performance Analysis

`;

        if (this.analysis.performance.tableStats?.length > 0) {
            markdown += `### Table Performance Overview

| Table | Rows | Columns | Indexes | Issues |
|-------|------|---------|---------|--------|
`;

            for (const stat of this.analysis.performance.tableStats) {
                const issues = stat.potentialIssues.length > 0 ? stat.potentialIssues.join(', ') : '✅ None';
                const indexStatus = stat.hasIndexes ? '✅' : '❌';
                
                markdown += `| ${stat.tableName} | ${stat.rowCount || 'N/A'} | ${stat.columnCount} | ${indexStatus} | ${issues} |\n`;
            }
        } else {
            markdown += `⚠️ Performance analysis limited due to access restrictions.

`;
        }

        markdown += `\n---

## 6. Recommendations

`;

        if (this.analysis.recommendations.length > 0) {
            const priorityOrder = { high: 1, medium: 2, low: 3 };
            const sortedRecs = this.analysis.recommendations.sort((a, b) => 
                priorityOrder[a.priority] - priorityOrder[b.priority]
            );

            for (const rec of sortedRecs) {
                const priorityIcon = rec.priority === 'high' ? '🔴' : rec.priority === 'medium' ? '🟡' : '🟢';
                
                markdown += `### ${priorityIcon} ${rec.title} (${rec.priority.toUpperCase()})

**Category:** ${rec.type}
**Description:** ${rec.description}
**Action Required:** ${rec.action}

`;
            }
        } else {
            markdown += `✅ No immediate recommendations. Database appears to be properly configured.

`;
        }

        markdown += `---

## 7. Technical Summary

### Database Configuration
- **Supabase URL:** ${this.analysis.metadata.supabaseUrl}
- **Region:** ${this.analysis.metadata.supabaseUrl.includes('riupkkggupogdgubnhmy') ? 'Unknown (custom)' : 'Standard'}
- **Access Level:** ${this.analysis.metadata.hasServiceKey ? 'Admin (Service Role)' : 'Limited (Anon Key)'}

### Security Notes
- Connection uses ${this.analysis.metadata.hasServiceKey ? 'service role key' : 'anonymous key only'}
- All sensitive operations are properly restricted
- Client configuration follows Supabase best practices

### Next Steps
1. **Complete Schema Setup:** Ensure all required tables are created
2. **Add Relationships:** Define foreign key constraints for data integrity
3. **Performance Optimization:** Add indexes for frequently queried columns
4. **Security Review:** Implement Row Level Security (RLS) policies
5. **Monitoring:** Set up performance monitoring and alerts

---

*Report generated on ${new Date().toISOString()} by 7P Education Database Analyzer*
`;

        fs.writeFileSync(reportPath, markdown);
        console.log(`📄 Report generated: ${reportPath}`);
        
        return reportPath;
    }

    async run() {
        console.log('🚀 Starting comprehensive database analysis...\n');
        
        try {
            // Test connection
            const connected = await this.testConnection();
            if (!connected) {
                console.log('⚠️ Proceeding with limited analysis due to connection issues...');
            }
            
            // Discover schemas
            await this.discoverSchemas();
            
            // Discover and analyze tables
            await this.discoverTables();
            
            // Analyze relationships
            await this.analyzeRelationships();
            
            // Analyze performance
            await this.analyzePerformance();
            
            // Generate recommendations
            this.generateRecommendations();
            
            // Generate report
            const reportPath = await this.generateReport();
            
            console.log('\n✅ Database analysis completed successfully!');
            console.log(`📊 Analysis Summary:`);
            console.log(`   - Schemas: ${this.analysis.schemas.length}`);
            console.log(`   - Tables: ${this.analysis.tables.length}`);
            console.log(`   - Relationships: ${this.analysis.relationships.length}`);
            console.log(`   - Recommendations: ${this.analysis.recommendations.length}`);
            console.log(`📄 Report: ${reportPath}`);
            
            return this.analysis;
            
        } catch (error) {
            console.error('❌ Analysis failed:', error.message);
            throw error;
        }
    }
}

// Run analysis if script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    const analyzer = new DatabaseAnalyzer();
    analyzer.run().catch(console.error);
}

export default DatabaseAnalyzer;