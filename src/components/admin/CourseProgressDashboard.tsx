'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { 
  Users, 
  TrendingUp, 
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Clock,
  BarChart3,
  Filter,
  Calendar,
  Download,
  Mail,
  Phone,
  Target,
  Activity,
  Award
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar
} from 'recharts';

interface CourseProgressDashboardProps {
  courseId: string;
}

interface CourseStats {
  overview: {
    totalStudents: number;
    activeStudents: number;
    completedStudents: number;
    completionRate: number;
    averageProgress: number;
    totalMaterials: number;
  };
  studentProgress: StudentProgress[];
  materialStats: MaterialStats[];
  recentActivity: RecentActivity[];
  completionTimeline: TimelineData[];
  atRiskStudents: AtRiskStudent[];
  topPerformers: StudentProgress[];
}

interface StudentProgress {
  userId: string;
  studentName: string;
  studentEmail: string;
  enrolledAt: string;
  overallCompletion: number;
  completedMaterials: number;
  totalMaterials: number;
  lastActivity: string | null;
}

interface MaterialStats {
  materialId: string;
  title: string;
  type: string;
  completedCount: number;
  averageProgress: number;
  completionRate: number;
}

interface RecentActivity {
  user_id: string;
  material_id: string;
  progress_percentage: number;
  updated_at: string;
  course_materials: {
    title: string;
    type: string;
  };
  user_profiles: {
    full_name: string;
  };
}

interface TimelineData {
  date: string;
  completions: number;
}

interface AtRiskStudent {
  userId: string;
  studentName: string;
  studentEmail: string;
  riskScore: number;
  riskFactors: string[];
  overallCompletion: number;
  lastActivity: string;
  interventionRecommendations: Intervention[];
}

interface Intervention {
  type: string;
  action: string;
  priority: string;
}

export default function CourseProgressDashboard({ courseId }: CourseProgressDashboardProps) {
  const [stats, setStats] = useState<CourseStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedView, setSelectedView] = useState<'overview' | 'students' | 'materials' | 'risks'>('overview');
  const [refreshing, setRefreshing] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    loadCourseStats();
    
    // Setup real-time updates
    const subscription = setupRealtimeUpdates();
    
    // Refresh every 5 minutes
    const interval = setInterval(refreshStats, 5 * 60 * 1000);
    
    return () => {
      subscription?.unsubscribe();
      clearInterval(interval);
    };
  }, [courseId]);

  const loadCourseStats = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/progress/course-stats?courseId=${courseId}`);
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setStats(data.data);
        }
      }
    } catch (error) {
      console.error('Error loading course stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshStats = async () => {
    setRefreshing(true);
    await loadCourseStats();
    setRefreshing(false);
  };

  const setupRealtimeUpdates = () => {
    // Subscribe to progress updates for this course
    return supabase
      .channel(`course_progress_${courseId}`)
      .on('postgres_changes', 
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'user_material_progress',
          filter: `course_id=eq.${courseId}`
        }, 
        () => {
          // Refresh stats when progress updates
          refreshStats();
        }
      )
      .subscribe();
  };

  const handleInterventionAction = async (studentId: string, intervention: Intervention) => {
    try {
      // Send intervention notification or email
      const response = await fetch('/api/admin/interventions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId,
          courseId,
          intervention
        })
      });

      if (response.ok) {
        // Show success message
        console.log('Intervention sent successfully');
      }
    } catch (error) {
      console.error('Error sending intervention:', error);
    }
  };

  const exportProgressData = () => {
    if (!stats) return;

    const csvData = [
      ['Student Name', 'Email', 'Overall Completion', 'Completed Materials', 'Last Activity', 'Risk Score'],
      ...stats.studentProgress.map(student => [
        student.studentName,
        student.studentEmail,
        `${student.overallCompletion}%`,
        `${student.completedMaterials}/${student.totalMaterials}`,
        student.lastActivity || 'Never',
        stats.atRiskStudents.find(r => r.userId === student.userId)?.riskScore || 0
      ])
    ];

    const csvContent = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `course-progress-${courseId}-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="h-32 bg-gray-200 rounded"></CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Failed to load course statistics</p>
        <Button onClick={loadCourseStats} className="mt-2">
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Course Progress Dashboard</h1>
          <p className="text-gray-600">Real-time student progress monitoring</p>
        </div>
        
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={refreshStats}
            disabled={refreshing}
            className="flex items-center gap-2"
          >
            <Activity className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
          
          <Button 
            variant="outline"
            onClick={exportProgressData}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex gap-2 border-b">
        {[
          { id: 'overview', label: 'Overview', icon: BarChart3 },
          { id: 'students', label: 'Students', icon: Users },
          { id: 'materials', label: 'Materials', icon: Target },
          { id: 'risks', label: 'At Risk', icon: AlertTriangle }
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setSelectedView(id as any)}
            className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors ${
              selectedView === id 
                ? 'border-blue-500 text-blue-600' 
                : 'border-transparent hover:text-gray-600'
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {selectedView === 'overview' && (
        <div className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Students</p>
                    <p className="text-2xl font-bold">{stats.overview.totalStudents}</p>
                  </div>
                  <Users className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Active Students</p>
                    <p className="text-2xl font-bold text-green-600">{stats.overview.activeStudents}</p>
                  </div>
                  <Activity className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Completion Rate</p>
                    <p className="text-2xl font-bold text-purple-600">{stats.overview.completionRate}%</p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-purple-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">At Risk</p>
                    <p className="text-2xl font-bold text-red-600">{stats.atRiskStudents.length}</p>
                  </div>
                  <AlertTriangle className="h-8 w-8 text-red-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Completion Timeline */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Completion Timeline (30 days)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={stats.completionTimeline}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 12 }}
                      tickFormatter={(value) => new Date(value).getDate().toString()}
                    />
                    <YAxis />
                    <Tooltip 
                      labelFormatter={(value) => formatDate(value)}
                      formatter={(value) => [`${value} completions`, 'Materials']}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="completions" 
                      stroke="#3b82f6" 
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Top Performers */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5" />
                  Top Performers
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {stats.topPerformers.slice(0, 5).map((student, index) => (
                    <div key={student.userId} className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full bg-yellow-100 flex items-center justify-center text-xs font-bold text-yellow-600">
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{student.studentName}</p>
                        <p className="text-sm text-gray-600">
                          {student.completedMaterials}/{student.totalMaterials} materials
                        </p>
                      </div>
                      <Badge variant={student.overallCompletion >= 100 ? "default" : "secondary"}>
                        {student.overallCompletion}%
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {stats.recentActivity.slice(0, 10).map((activity, index) => (
                  <div key={index} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <div className="flex-1">
                      <p className="text-sm">
                        <span className="font-medium">{activity.user_profiles.full_name}</span>
                        {' '}completed{' '}
                        <span className="font-medium">{activity.course_materials.title}</span>
                        {' '}({activity.progress_percentage}%)
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatDateTime(activity.updated_at)}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {activity.course_materials.type}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Students Tab */}
      {selectedView === 'students' && (
        <Card>
          <CardHeader>
            <CardTitle>Student Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.studentProgress.map((student) => (
                <div key={student.userId} className="flex items-center gap-4 p-4 border rounded-lg">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium truncate">{student.studentName}</h4>
                      <Badge variant={student.overallCompletion >= 80 ? "default" : "secondary"}>
                        {student.overallCompletion}%
                      </Badge>
                    </div>
                    
                    <Progress value={student.overallCompletion} className="mb-2" />
                    
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>{student.completedMaterials}/{student.totalMaterials} materials</span>
                      <span>
                        Last active: {student.lastActivity ? formatDateTime(student.lastActivity) : 'Never'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Materials Tab */}
      {selectedView === 'materials' && (
        <Card>
          <CardHeader>
            <CardTitle>Material Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.materialStats.map((material) => (
                <div key={material.materialId} className="flex items-center gap-4 p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">{material.title}</h4>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{material.type}</Badge>
                        <Badge variant={material.completionRate >= 70 ? "default" : "secondary"}>
                          {material.completionRate}% completed
                        </Badge>
                      </div>
                    </div>
                    
                    <Progress value={material.averageProgress} className="mb-2" />
                    
                    <p className="text-sm text-gray-600">
                      {material.completedCount} students completed • Average: {material.averageProgress}%
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* At Risk Tab */}
      {selectedView === 'risks' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              At Risk Students ({stats.atRiskStudents.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.atRiskStudents.map((student) => (
                <div key={student.userId} className="border rounded-lg p-4 bg-red-50 border-red-200">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="font-medium text-red-800">{student.studentName}</h4>
                      <p className="text-sm text-red-600">{student.studentEmail}</p>
                    </div>
                    <div className="text-right">
                      <Badge variant="destructive">
                        Risk Score: {student.riskScore}%
                      </Badge>
                      <p className="text-sm text-red-600 mt-1">
                        Progress: {student.overallCompletion}%
                      </p>
                    </div>
                  </div>
                  
                  <div className="mb-3">
                    <h5 className="font-medium text-sm mb-2">Risk Factors:</h5>
                    <div className="flex flex-wrap gap-1">
                      {student.riskFactors.map((factor, index) => (
                        <Badge key={index} variant="outline" className="text-xs border-red-300">
                          {factor}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  
                  <div className="mb-3">
                    <h5 className="font-medium text-sm mb-2">Recommended Interventions:</h5>
                    <div className="space-y-2">
                      {student.interventionRecommendations.map((intervention, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-white rounded border">
                          <div className="flex-1">
                            <p className="text-sm font-medium">{intervention.action}</p>
                            <p className="text-xs text-gray-600">Type: {intervention.type}</p>
                          </div>
                          <div className="flex gap-2">
                            <Badge variant={intervention.priority === 'high' ? 'destructive' : 'secondary'}>
                              {intervention.priority}
                            </Badge>
                            <Button
                              size="sm"
                              onClick={() => handleInterventionAction(student.userId, intervention)}
                              className="text-xs"
                            >
                              {intervention.type === 'urgent' ? 'Call' : 'Send'}
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <p className="text-xs text-gray-600">
                    Last activity: {formatDateTime(student.lastActivity)}
                  </p>
                </div>
              ))}
              
              {stats.atRiskStudents.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-500" />
                  <p className="font-medium">No students at risk!</p>
                  <p className="text-sm">All students are progressing well.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}