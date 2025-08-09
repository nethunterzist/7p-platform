"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { DashboardSection, DashboardCard } from '@/components/layout/DashboardContent';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  User as UserIcon, 
  Mail, 
  MapPin, 
  Calendar, 
  Award, 
  BookOpen, 
  Clock,
  Target, 
  TrendingUp, 
  Users, 
  Shield, 
  Star,
  Trophy, 
  Zap, 
  Brain, 
  Code, 
  Palette, 
  Briefcase,
  Heart,
  Share2,
  Download,
  Settings,
  Edit3,
  Camera,
  Verified,
  GraduationCap,
  BarChart3,
  Network,
  MessageCircle,
  Bookmark,
  Eye,
  Lock,
  Globe,
  Linkedin
} from 'lucide-react';

interface Profile {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null; // Avatar URL'si
  website: string | null;
  updated_at: string | null;
  bio?: string;
  location?: string;
  job_title?: string;
  company?: string;
  linkedin_url?: string;
  github_url?: string;
  total_learning_hours?: number;
  courses_completed?: number;
  current_streak?: number;
  longest_streak?: number;
  learning_level?: string;
  total_xp?: number;
  rank?: string;
}

interface Skill {
  id: string;
  name: string;
  category: 'technical' | 'soft' | 'business';
  proficiency: number;
  endorsed_count: number;
  courses_completed: number;
  last_practiced?: string;
}


export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | ''>('');
  const [activeTab, setActiveTab] = useState('overview');
  const [isEditMode, setIsEditMode] = useState(false);
  
  // Form states
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [website, setWebsite] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [bio, setBio] = useState('');
  const [location, setLocation] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [company, setCompany] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [githubUrl, setGithubUrl] = useState('');
  
  const router = useRouter();

  useEffect(() => {
    const checkUser = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (error || !user) {
          router.push('/login');
          return;
        }
        
        setUser(user);
        await Promise.all([
          getProfile(user.id),
          getSkills(user.id)
        ]);
      } catch (error) {
        console.error('Error checking user:', error);
        router.push('/login');
      }
    };

    checkUser();
  }, [router]);

  const getProfile = async (userId: string) => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        // Create default profile with enhanced mock data
        const mockProfile: Profile = {
          id: userId,
          username: null,
          full_name: null,
          avatar_url: null,
          website: null,
          updated_at: null,
          bio: 'Passionate learner dedicated to continuous growth and professional development.',
          location: 'San Francisco, CA',
          job_title: 'Senior Software Engineer',
          company: 'Tech Solutions Inc.',
          linkedin_url: '',
          github_url: '',
          total_learning_hours: 247,
          courses_completed: 12,
          current_streak: 15,
          longest_streak: 45,
          learning_level: 'Advanced Learner',
          total_xp: 2840,
          rank: 'Expert'
        };
        setProfile(mockProfile);
      } else if (data) {
        setProfile({
          ...data,
          bio: data.bio || 'Passionate learner dedicated to continuous growth and professional development.',
          location: data.location || 'San Francisco, CA',
          job_title: data.job_title || 'Senior Software Engineer',
          company: data.company || 'Tech Solutions Inc.',
          total_learning_hours: data.total_learning_hours || 247,
          courses_completed: data.courses_completed || 12,
          current_streak: data.current_streak || 15,
          longest_streak: data.longest_streak || 45,
          learning_level: data.learning_level || 'Advanced Learner',
          total_xp: data.total_xp || 2840,
          rank: data.rank || 'Expert'
        });
      }
      
      // Set form values
      if (profile) {
        setFullName(profile.full_name || '');
        setUsername(profile.username || '');
        setWebsite(profile.website || '');
        setAvatarUrl(profile.avatar_url || '');
        setBio(profile.bio || '');
        setLocation(profile.location || '');
        setJobTitle(profile.job_title || '');
        setCompany(profile.company || '');
        setLinkedinUrl(profile.linkedin_url || '');
        setGithubUrl(profile.github_url || '');
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      setMessage('Error loading profile data');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const getSkills = async (userId: string) => {
    // Mock skills data
    const mockSkills: Skill[] = [
      { id: '1', name: 'React', category: 'technical', proficiency: 90, endorsed_count: 15, courses_completed: 4, last_practiced: '2024-01-15' },
      { id: '2', name: 'TypeScript', category: 'technical', proficiency: 85, endorsed_count: 12, courses_completed: 3, last_practiced: '2024-01-14' },
      { id: '3', name: 'Node.js', category: 'technical', proficiency: 80, endorsed_count: 10, courses_completed: 3, last_practiced: '2024-01-13' },
      { id: '4', name: 'UI/UX Design', category: 'technical', proficiency: 75, endorsed_count: 8, courses_completed: 2, last_practiced: '2024-01-12' },
      { id: '5', name: 'Leadership', category: 'soft', proficiency: 70, endorsed_count: 6, courses_completed: 2, last_practiced: '2024-01-10' },
      { id: '6', name: 'Project Management', category: 'business', proficiency: 65, endorsed_count: 5, courses_completed: 1, last_practiced: '2024-01-08' },
      { id: '7', name: 'Communication', category: 'soft', proficiency: 88, endorsed_count: 14, courses_completed: 3, last_practiced: '2024-01-16' },
      { id: '8', name: 'Data Analysis', category: 'technical', proficiency: 72, endorsed_count: 7, courses_completed: 2, last_practiced: '2024-01-11' }
    ];
    setSkills(mockSkills);
  };


  const updateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) return;
    
    try {
      setUpdating(true);
      setMessage('');

      const updates = {
        id: user.id,
        full_name: fullName,
        username: username,
        website: website,
        avatar_url: avatarUrl,
        bio: bio,
        location: location,
        job_title: jobTitle,
        company: company,
        linkedin_url: linkedinUrl,
        github_url: githubUrl,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('profiles')
        .upsert(updates);

      if (error) {
        throw error;
      }

      setMessage('Profile updated successfully!');
      setMessageType('success');
      setIsEditMode(false);
      await getProfile(user.id);
    } catch (error: any) {
      console.error('Error updating profile:', error);
      setMessage(error.message || 'Error updating profile');
      setMessageType('error');
    } finally {
      setUpdating(false);
    }
  };


  const getSkillCategoryColor = (category: string) => {
    switch (category) {
      case 'technical': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'soft': return 'bg-green-100 text-green-800 border-green-200';
      case 'business': return 'bg-purple-100 text-purple-800 border-purple-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      router.push('/login');
    } catch (error) {
      console.error('Error logging out:', error);
      setMessage('Error logging out');
      setMessageType('error');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-corporate-50 to-corporate-100">
        <div className="flex items-center justify-center min-h-screen">
          <div className="flex flex-col items-center space-y-4">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-corporate-200 rounded-full animate-spin"></div>
              <div className="absolute top-0 left-0 w-16 h-16 border-4 border-corporate-primary rounded-full animate-spin border-t-transparent"></div>
            </div>
            <div className="text-center">
              <h3 className="text-lg font-semibold text-corporate-deep">Loading Profile</h3>
              <p className="text-corporate-600">Preparing your learning profile...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <DashboardLayout
      title={profile ? `${profile.full_name || 'Learning Profile'}` : 'Learning Profile'}
      subtitle="Your professional learning journey and progress"
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Profile' }
      ]}
      actions={
        <div className="flex items-center space-x-3">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setIsEditMode(!isEditMode)}
          >
            <Edit3 className="h-4 w-4 mr-2" />
            {isEditMode ? 'Cancel' : 'Edit Profile'}
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleLogout}
          >
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
        </div>
      }
    >
      {/* Profile Hero Section */}
      <DashboardCard className="mb-8 bg-gradient-to-r from-corporate-deep via-corporate-primary to-corporate-accent border-0 text-white overflow-hidden relative">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="relative">
          <div className="flex flex-col md:flex-row items-start md:items-center space-y-6 md:space-y-0 md:space-x-8">
            {/* Avatar Section */}
            <div className="relative">
              <div className="w-24 h-24 md:w-32 md:h-32 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm border-4 border-white/20">
                {profile?.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt="Profile"
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <UserIcon className="h-12 w-12 md:h-16 md:w-16 text-white/80" />
                )}
              </div>
              {isEditMode && (
                <button className="absolute bottom-0 right-0 w-8 h-8 bg-corporate-primary hover:bg-corporate-deep rounded-full flex items-center justify-center transition-colors">
                  <Camera className="h-4 w-4 text-white" />
                </button>
              )}
              {profile?.rank && (
                <div className="absolute -top-2 -right-2">
                  <Badge className="bg-yellow-500 text-white font-semibold px-2 py-1 text-xs">
                    {profile.rank}
                  </Badge>
                </div>
              )}
            </div>

            {/* Profile Info */}
            <div className="flex-1">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex items-center space-x-3 mb-2">
                    <h1 className="text-2xl md:text-3xl font-bold">
                      {profile?.full_name || 'Anonymous Learner'}
                    </h1>
                    {profile?.rank === 'Expert' && (
                      <Verified className="h-6 w-6 text-blue-300" title="Verified Expert" />
                    )}
                  </div>
                  <div className="space-y-1 text-white/90">
                    {profile?.job_title && (
                      <p className="text-lg font-medium">{profile.job_title}</p>
                    )}
                    {profile?.company && (
                      <p className="text-sm">{profile.company}</p>
                    )}
                    {profile?.location && (
                      <div className="flex items-center text-sm">
                        <MapPin className="h-4 w-4 mr-1" />
                        {profile.location}
                      </div>
                    )}
                    {user?.email && (
                      <div className="flex items-center text-sm">
                        <Mail className="h-4 w-4 mr-1" />
                        {user.email}
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Level & XP */}
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 mt-4 sm:mt-0">
                  <div className="text-center">
                    <div className="text-2xl font-bold mb-1">
                      {profile?.learning_level || 'Beginner'}
                    </div>
                    <div className="text-sm text-white/80 mb-2">
                      {profile?.total_xp || 0} XP
                    </div>
                    <div className="w-full bg-white/20 rounded-full h-2">
                      <div 
                        className="bg-white h-2 rounded-full transition-all duration-300"
                        style={{ width: `${((profile?.total_xp || 0) % 1000) / 10}%` }}
                      />
                    </div>
                    <div className="text-xs text-white/70 mt-1">
                      {1000 - ((profile?.total_xp || 0) % 1000)} XP to next level
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Bio */}
              {profile?.bio && (
                <p className="mt-4 text-white/90 leading-relaxed">
                  {profile.bio}
                </p>
              )}

              {/* Quick Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 text-center">
                  <div className="text-xl font-bold">{profile?.courses_completed || 0}</div>
                  <div className="text-xs text-white/80">Courses</div>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 text-center">
                  <div className="text-xl font-bold">{profile?.current_streak || 0}</div>
                  <div className="text-xs text-white/80">Day Streak</div>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 text-center">
                  <div className="text-xl font-bold">{profile?.total_learning_hours || 0}h</div>
                  <div className="text-xs text-white/80">Learning Time</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DashboardCard>

      {/* Message Display */}
      {message && (
        <DashboardCard className={`mb-6 border-l-4 ${
          messageType === 'success' 
            ? 'border-l-green-500 bg-green-50'
            : 'border-l-red-500 bg-red-50'
        }`}>
          <div className="flex items-center space-x-3">
            <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
              messageType === 'success' ? 'bg-green-100' : 'bg-red-100'
            }`}>
              <span className={`text-xs ${
                messageType === 'success' ? 'text-green-600' : 'text-red-600'
              }`}>!</span>
            </div>
            <p className={messageType === 'success' ? 'text-green-800' : 'text-red-800'}>
              {message}
            </p>
          </div>
        </DashboardCard>
      )}

      {/* Tabbed Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 lg:grid-cols-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="skills">Skills</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Skills Overview */}
            <div className="lg:col-span-2">
              <DashboardSection title="Top Skills" subtitle="Your strongest competencies">
                <DashboardCard>
                  <div className="space-y-4">
                    {skills.slice(0, 6).map((skill) => (
                      <div key={skill.id} className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium text-gray-900">{skill.name}</span>
                            <span className="text-sm text-gray-600">{skill.proficiency}%</span>
                          </div>
                          <div className="flex items-center space-x-2 mb-2">
                            <div className="flex-1 bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-corporate-primary h-2 rounded-full transition-all duration-300"
                                style={{ width: `${skill.proficiency}%` }}
                              />
                            </div>
                            <Badge className={`text-xs ${getSkillCategoryColor(skill.category)}`}>
                              {skill.category}
                            </Badge>
                          </div>
                          <div className="flex items-center text-xs text-gray-500">
                            <Users className="h-3 w-3 mr-1" />
                            <span>{skill.endorsed_count} endorsements</span>
                            <span className="mx-2">·</span>
                            <BookOpen className="h-3 w-3 mr-1" />
                            <span>{skill.courses_completed} courses</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="pt-4 border-t border-gray-100">
                    <Button variant="outline" className="w-full" onClick={() => setActiveTab('skills')}>
                      View All Skills
                      <TrendingUp className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                </DashboardCard>
              </DashboardSection>
            </div>

          </div>
        </TabsContent>

        {/* Skills Tab */}
        <TabsContent value="skills" className="space-y-6">
          <DashboardSection title="All Skills" subtitle="Complete skill development overview">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {['technical', 'soft', 'business'].map((category) => (
                <DashboardCard key={category}>
                  <div className="mb-4">
                    <h3 className="font-semibold text-lg capitalize mb-2">{category} Skills</h3>
                    <p className="text-sm text-gray-600">
                      {category === 'technical' && 'Programming and technical competencies'}
                      {category === 'soft' && 'Interpersonal and communication skills'}
                      {category === 'business' && 'Management and strategic skills'}
                    </p>
                  </div>
                  <div className="space-y-4">
                    {skills.filter(skill => skill.category === category).map((skill) => (
                      <div key={skill.id}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-gray-900">{skill.name}</span>
                          <span className="text-sm text-gray-600">{skill.proficiency}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                          <div 
                            className="bg-corporate-primary h-2 rounded-full transition-all duration-300"
                            style={{ width: `${skill.proficiency}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span>{skill.endorsed_count} endorsements</span>
                          <span>{skill.courses_completed} courses completed</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </DashboardCard>
              ))}
            </div>
          </DashboardSection>
        </TabsContent>


        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <DashboardSection title="Learning Analytics" subtitle="Detailed performance insights">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <DashboardCard className="text-center">
                <Clock className="h-8 w-8 text-corporate-primary mx-auto mb-3" />
                <div className="text-2xl font-bold text-gray-900 mb-1">{profile?.total_learning_hours || 0}h</div>
                <div className="text-sm text-gray-600">Total Learning Time</div>
              </DashboardCard>
              <DashboardCard className="text-center">
                <BookOpen className="h-8 w-8 text-green-500 mx-auto mb-3" />
                <div className="text-2xl font-bold text-gray-900 mb-1">{profile?.courses_completed || 0}</div>
                <div className="text-sm text-gray-600">Courses Completed</div>
              </DashboardCard>
              <DashboardCard className="text-center">
                <Zap className="h-8 w-8 text-purple-500 mx-auto mb-3" />
                <div className="text-2xl font-bold text-gray-900 mb-1">{profile?.current_streak || 0}</div>
                <div className="text-sm text-gray-600">Current Streak</div>
              </DashboardCard>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <DashboardCard>
                <h3 className="font-semibold text-lg mb-4">Learning Progress</h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium">Course Completion Rate</span>
                      <span className="text-sm text-gray-600">85%</span>
                    </div>
                    <Progress value={85} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium">Skill Development</span>
                      <span className="text-sm text-gray-600">72%</span>
                    </div>
                    <Progress value={72} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium">Learning Consistency</span>
                      <span className="text-sm text-gray-600">90%</span>
                    </div>
                    <Progress value={90} className="h-2" />
                  </div>
                </div>
              </DashboardCard>
              
              <DashboardCard>
                <h3 className="font-semibold text-lg mb-4">Recent Activity</h3>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3 p-2 bg-gray-50 rounded-lg">
                    <BookOpen className="h-4 w-4 text-corporate-primary" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">Completed Advanced React</p>
                      <p className="text-xs text-gray-500">2 days ago</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3 p-2 bg-gray-50 rounded-lg">
                    <Trophy className="h-4 w-4 text-yellow-500" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">Earned Speed Demon badge</p>
                      <p className="text-xs text-gray-500">5 days ago</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3 p-2 bg-gray-50 rounded-lg">
                    <Star className="h-4 w-4 text-blue-500" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">Received skill endorsement</p>
                      <p className="text-xs text-gray-500">1 week ago</p>
                    </div>
                  </div>
                </div>
              </DashboardCard>
            </div>
          </DashboardSection>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-6">
          {isEditMode ? (
            <DashboardSection title="Edit Profile" subtitle="Update your professional information">
              <DashboardCard>
                <form onSubmit={updateProfile} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Full Name
                      </label>
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-corporate-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Username
                      </label>
                      <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-corporate-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Job Title
                      </label>
                      <input
                        type="text"
                        value={jobTitle}
                        onChange={(e) => setJobTitle(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-corporate-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Company
                      </label>
                      <input
                        type="text"
                        value={company}
                        onChange={(e) => setCompany(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-corporate-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Location
                      </label>
                      <input
                        type="text"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-corporate-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Website
                      </label>
                      <input
                        type="url"
                        value={website}
                        onChange={(e) => setWebsite(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-corporate-primary"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Bio
                    </label>
                    <textarea
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-corporate-primary"
                      placeholder="Tell us about yourself and your learning goals..."
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        LinkedIn Profile
                      </label>
                      <input
                        type="url"
                        value={linkedinUrl}
                        onChange={(e) => setLinkedinUrl(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-corporate-primary"
                        placeholder="https://linkedin.com/in/yourprofile"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        GitHub Profile
                      </label>
                      <input
                        type="url"
                        value={githubUrl}
                        onChange={(e) => setGithubUrl(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-corporate-primary"
                        placeholder="https://github.com/yourusername"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Avatar URL
                    </label>
                    <input
                      type="url"
                      value={avatarUrl}
                      onChange={(e) => setAvatarUrl(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-corporate-primary"
                      placeholder="https://example.com/avatar.jpg"
                    />
                  </div>
                  
                  <div className="flex space-x-4">
                    <Button
                      type="submit"
                      disabled={updating}
                      className="flex-1 bg-corporate-primary hover:bg-corporate-deep"
                    >
                      {updating ? 'Updating...' : 'Save Changes'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsEditMode(false)}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </DashboardCard>
            </DashboardSection>
          ) : (
            <DashboardSection title="Account Settings" subtitle="Manage your account preferences">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <DashboardCard>
                  <h3 className="font-semibold text-lg mb-4">Privacy Settings</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Public Profile</p>
                        <p className="text-sm text-gray-600">Allow others to view your profile</p>
                      </div>
                      <input type="checkbox" defaultChecked className="h-4 w-4" />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Show Learning Progress</p>
                        <p className="text-sm text-gray-600">Display your course progress publicly</p>
                      </div>
                      <input type="checkbox" defaultChecked className="h-4 w-4" />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Show Progress</p>
                        <p className="text-sm text-gray-600">Display your learning progress</p>
                      </div>
                      <input type="checkbox" defaultChecked className="h-4 w-4" />
                    </div>
                  </div>
                </DashboardCard>
                
                <DashboardCard>
                  <h3 className="font-semibold text-lg mb-4">Account Actions</h3>
                  <div className="space-y-3">
                    <Button variant="outline" className="w-full justify-start">
                      <Download className="h-4 w-4 mr-2" />
                      Export Learning Data
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <Share2 className="h-4 w-4 mr-2" />
                      Share Profile
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <Linkedin className="h-4 w-4 mr-2" />
                      Connect LinkedIn
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full justify-start text-red-600 hover:text-red-700"
                      onClick={handleLogout}
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      Logout
                    </Button>
                  </div>
                </DashboardCard>
              </div>
            </DashboardSection>
          )}
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
}