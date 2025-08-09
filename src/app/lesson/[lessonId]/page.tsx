"use client";

import React, { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Download,
  Heart,
  MessageSquare,
  MoreHorizontal,
  Pause,
  Play,
  Settings,
  Share2,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  RotateCcw,
  RotateCw,
  FileText,
  Search,
  Plus,
  Edit3,
  Save,
  Star,
  Clock,
  Users,
  CheckCircle,
  Lock,
  PlayCircle,
  Target,
  Code,
  Award,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  ChevronLeft,
  Bookmark,
  StickyNote,
  Headphones,
  Captions,
  Monitor,
  Smartphone,
  Menu,
  X,
  ThumbsUp,
  ThumbsDown,
  Flag,
  ExternalLink,
  PenTool,
  Type,
  Bold,
  Italic,
  Link,
  List,
  AlignLeft,
  Quote,
  Highlighter,
  Calendar
} from 'lucide-react';

interface Lesson {
  id: string;
  title: string;
  description: string;
  duration: string;
  video_url?: string;
  order_index: number;
  module_id: string;
  module_title: string;
  is_preview: boolean;
  completed: boolean;
  locked: boolean;
  type: 'video' | 'article' | 'quiz' | 'exercise';
  transcript?: string;
  resources?: Resource[];
  course_id: string;
  course_title: string;
}

interface Resource {
  id: string;
  title: string;
  type: 'pdf' | 'zip' | 'link' | 'code';
  url: string;
  size?: string;
}

interface Note {
  id: string;
  content: string;
  timestamp: number;
  created_at: string;
  lesson_id: string;
  is_bookmark: boolean;
  tags: string[];
}

interface Discussion {
  id: string;
  user_name: string;
  user_avatar?: string;
  content: string;
  timestamp: number;
  created_at: string;
  replies: Discussion[];
  likes: number;
  dislikes: number;
  is_instructor: boolean;
  is_verified: boolean;
}

interface CourseModule {
  id: string;
  title: string;
  lessons: Lesson[];
  current_lesson_index: number;
}

export default function LessonPage() {
  const params = useParams();
  const router = useRouter();
  const lessonId = params.lessonId as string;
  const videoRef = useRef<HTMLVideoElement>(null);
  const notesRef = useRef<HTMLTextAreaElement>(null);
  
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [courseModules, setCourseModules] = useState<CourseModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Video player state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showControls, setShowControls] = useState(true);
  const [showTranscript, setShowTranscript] = useState(false);
  const [showCaptions, setShowCaptions] = useState(false);
  const [videoQuality, setVideoQuality] = useState('auto');
  
  // UI state
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<'curriculum' | 'notes' | 'discussions' | 'resources'>('curriculum');
  const [showNoteEditor, setShowNoteEditor] = useState(false);
  const [noteContent, setNoteContent] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  
  // Data state
  const [notes, setNotes] = useState<Note[]>([]);
  const [discussions, setDiscussions] = useState<Discussion[]>([]);
  const [progress, setProgress] = useState({
    currentLesson: 0,
    totalLessons: 0,
    moduleProgress: 0
  });

  useEffect(() => {
    if (lessonId) {
      fetchLessonData();
    }
  }, [lessonId]);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement) return;
      
      switch (e.key) {
        case ' ':
          e.preventDefault();
          togglePlay();
          break;
        case 'ArrowLeft':
          seekBackward();
          break;
        case 'ArrowRight':
          seekForward();
          break;
        case 'ArrowUp':
          e.preventDefault();
          adjustVolume(0.1);
          break;
        case 'ArrowDown':
          e.preventDefault();
          adjustVolume(-0.1);
          break;
        case 'f':
          toggleFullscreen();
          break;
        case 'm':
          toggleMute();
          break;
        case 'n':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            addNoteAtCurrentTime();
          }
          break;
        case 'b':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            addBookmarkAtCurrentTime();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [currentTime]);

  const fetchLessonData = async () => {
    try {
      setLoading(true);
      setError('');

      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        setError('Please login to view lessons');
        return;
      }

      // Mock lesson data - in real app, fetch from database
      const mockLesson: Lesson = {
        id: lessonId,
        title: 'React Hooks Deep Dive',
        description: 'Master useState, useEffect, and custom hooks with practical examples and best practices.',
        duration: '25:30',
        order_index: 1,
        module_id: '3',
        module_title: 'Advanced React Patterns',
        is_preview: false,
        completed: false,
        locked: false,
        type: 'video',
        course_id: 'course-1',
        course_title: 'Complete React Development Course',
        video_url: 'https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4',
        transcript: `Welcome to this comprehensive lesson on React Hooks. In this video, we'll explore the most important hooks in React, including useState and useEffect.

First, let's talk about useState. This hook allows you to add state to functional components. Before hooks, you could only use state in class components.

Here's a basic example of useState in action:

const [count, setCount] = useState(0);

This creates a state variable called count with an initial value of 0, and a setter function called setCount.

Next, let's discuss useEffect. This hook lets you perform side effects in functional components. It serves the same purpose as componentDidMount, componentDidUpdate, and componentWillUnmount combined in React class components.

useEffect(() => {
  document.title = \`You clicked \${count} times\`;
});

This effect runs after every render and updates the document title.

Now let's explore custom hooks. Custom hooks are a mechanism to reuse stateful logic between React components. They're JavaScript functions whose names start with "use" and that may call other hooks.

function useCounter(initialValue = 0) {
  const [count, setCount] = useState(initialValue);
  
  const increment = () => setCount(count + 1);
  const decrement = () => setCount(count - 1);
  const reset = () => setCount(initialValue);
  
  return { count, increment, decrement, reset };
}

This custom hook encapsulates counter logic that can be reused across multiple components.

Best practices for using hooks:
1. Only call hooks at the top level of your React function
2. Only call hooks from React functions
3. Use the ESLint plugin for hooks to enforce these rules
4. Extract complex logic into custom hooks for reusability

By the end of this lesson, you'll have a solid understanding of how to use these hooks effectively in your React applications.`,
        resources: [
          {
            id: '1',
            title: 'React Hooks Cheat Sheet',
            type: 'pdf',
            url: '/resources/react-hooks-cheat-sheet.pdf',
            size: '2.3 MB'
          },
          {
            id: '2',
            title: 'Code Examples Repository',
            type: 'zip',
            url: '/resources/hooks-examples.zip',
            size: '1.8 MB'
          },
          {
            id: '3',
            title: 'Official React Hooks Documentation',
            type: 'link',
            url: 'https://reactjs.org/docs/hooks-intro.html'
          },
          {
            id: '4',
            title: 'Interactive Code Playground',
            type: 'code',
            url: 'https://codesandbox.io/react-hooks-examples'
          }
        ]
      };

      setLesson(mockLesson);

      // Mock course structure
      const mockModules: CourseModule[] = [
        {
          id: '1',
          title: 'Getting Started',
          current_lesson_index: 0,
          lessons: [
            { ...mockLesson, id: '1-1', title: 'Course Introduction', completed: true, locked: false },
            { ...mockLesson, id: '1-2', title: 'Development Setup', completed: true, locked: false },
            { ...mockLesson, id: '1-3', title: 'Project Structure', completed: false, locked: false }
          ]
        },
        {
          id: '2',
          title: 'React Fundamentals',
          current_lesson_index: 1,
          lessons: [
            { ...mockLesson, id: '2-1', title: 'Components and JSX', completed: true, locked: false },
            { ...mockLesson, id: '2-2', title: 'Props and State', completed: false, locked: false },
            { ...mockLesson, id: '2-3', title: 'Event Handling', completed: false, locked: false }
          ]
        },
        {
          id: '3',
          title: 'Advanced React Patterns',
          current_lesson_index: 0,
          lessons: [
            { ...mockLesson, id: lessonId, title: 'React Hooks Deep Dive', completed: false, locked: false },
            { ...mockLesson, id: '3-2', title: 'Context API', completed: false, locked: false },
            { ...mockLesson, id: '3-3', title: 'Performance Optimization', completed: false, locked: false }
          ]
        }
      ];

      setCourseModules(mockModules);

      // Calculate progress
      const totalLessons = mockModules.reduce((acc, module) => acc + module.lessons.length, 0);
      const completedLessons = mockModules.reduce((acc, module) => 
        acc + module.lessons.filter(lesson => lesson.completed).length, 0
      );
      const currentModule = mockModules.find(module => 
        module.lessons.some(lesson => lesson.id === lessonId)
      );
      const currentLessonIndex = currentModule?.lessons.findIndex(lesson => lesson.id === lessonId) || 0;
      const moduleProgress = currentModule ? Math.round(((currentLessonIndex + 1) / currentModule.lessons.length) * 100) : 0;

      setProgress({
        currentLesson: completedLessons + 1,
        totalLessons,
        moduleProgress
      });

      // Mock notes
      const mockNotes: Note[] = [
        {
          id: '1',
          content: 'useState creates state in functional components',
          timestamp: 120,
          created_at: new Date().toISOString(),
          lesson_id: lessonId,
          is_bookmark: false,
          tags: ['useState', 'hooks']
        },
        {
          id: '2',
          content: 'useEffect replaces lifecycle methods',
          timestamp: 280,
          created_at: new Date().toISOString(),
          lesson_id: lessonId,
          is_bookmark: true,
          tags: ['useEffect', 'lifecycle']
        },
        {
          id: '3',
          content: 'Custom hooks enable logic reuse between components',
          timestamp: 450,
          created_at: new Date().toISOString(),
          lesson_id: lessonId,
          is_bookmark: false,
          tags: ['custom-hooks', 'reusability']
        }
      ];

      setNotes(mockNotes);

      // Mock discussions
      const mockDiscussions: Discussion[] = [
        {
          id: '1',
          user_name: 'Sarah Johnson',
          user_avatar: '',
          content: 'Great explanation of useState! I finally understand the difference between functional and class components.',
          timestamp: 150,
          created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          replies: [
            {
              id: '1-1',
              user_name: 'Dr. Sarah Chen',
              content: 'Thanks Sarah! That\'s exactly the goal of this lesson. Feel free to ask if you have more questions.',
              timestamp: 0,
              created_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
              replies: [],
              likes: 5,
              dislikes: 0,
              is_instructor: true,
              is_verified: true
            }
          ],
          likes: 12,
          dislikes: 0,
          is_instructor: false,
          is_verified: false
        },
        {
          id: '2',
          user_name: 'Mike Rodriguez',
          content: 'Could you provide more examples of custom hooks? I\'m still confused about when to create them.',
          timestamp: 480,
          created_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
          replies: [],
          likes: 8,
          dislikes: 0,
          is_instructor: false,
          is_verified: false
        }
      ];

      setDiscussions(mockDiscussions);

    } catch (err: any) {
      console.error('Lesson data error:', err);
      setError('Error loading lesson data');
    } finally {
      setLoading(false);
    }
  };

  // Video player controls
  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const seekBackward = () => {
    if (videoRef.current) {
      videoRef.current.currentTime -= 10;
    }
  };

  const seekForward = () => {
    if (videoRef.current) {
      videoRef.current.currentTime += 10;
    }
  };

  const adjustVolume = (delta: number) => {
    const newVolume = Math.max(0, Math.min(1, volume + delta));
    setVolume(newVolume);
    if (videoRef.current) {
      videoRef.current.volume = newVolume;
    }
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      videoRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const jumpToTime = (seconds: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = seconds;
      setCurrentTime(seconds);
    }
  };

  // Note-taking functions
  const addNoteAtCurrentTime = () => {
    setShowNoteEditor(true);
    setNoteContent('');
  };

  const addBookmarkAtCurrentTime = () => {
    const newNote: Note = {
      id: Date.now().toString(),
      content: `Bookmark at ${formatTime(currentTime)}`,
      timestamp: currentTime,
      created_at: new Date().toISOString(),
      lesson_id: lessonId,
      is_bookmark: true,
      tags: ['bookmark']
    };
    setNotes([...notes, newNote]);
  };

  const saveNote = () => {
    if (noteContent.trim()) {
      const newNote: Note = {
        id: Date.now().toString(),
        content: noteContent.trim(),
        timestamp: currentTime,
        created_at: new Date().toISOString(),
        lesson_id: lessonId,
        is_bookmark: false,
        tags: []
      };
      setNotes([...notes, newNote]);
      setNoteContent('');
      setShowNoteEditor(false);
    }
  };

  const deleteNote = (noteId: string) => {
    setNotes(notes.filter(note => note.id !== noteId));
  };

  const filteredNotes = notes.filter(note => 
    note.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
    note.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const nextLesson = () => {
    const currentModule = courseModules.find(module => 
      module.lessons.some(lesson => lesson.id === lessonId)
    );
    if (currentModule) {
      const currentIndex = currentModule.lessons.findIndex(lesson => lesson.id === lessonId);
      if (currentIndex < currentModule.lessons.length - 1) {
        const nextLesson = currentModule.lessons[currentIndex + 1];
        router.push(`/lesson/${nextLesson.id}`);
      } else {
        // Find next module
        const moduleIndex = courseModules.findIndex(module => module.id === currentModule.id);
        if (moduleIndex < courseModules.length - 1) {
          const nextModule = courseModules[moduleIndex + 1];
          if (nextModule.lessons.length > 0) {
            router.push(`/lesson/${nextModule.lessons[0].id}`);
          }
        }
      }
    }
  };

  const previousLesson = () => {
    const currentModule = courseModules.find(module => 
      module.lessons.some(lesson => lesson.id === lessonId)
    );
    if (currentModule) {
      const currentIndex = currentModule.lessons.findIndex(lesson => lesson.id === lessonId);
      if (currentIndex > 0) {
        const prevLesson = currentModule.lessons[currentIndex - 1];
        router.push(`/lesson/${prevLesson.id}`);
      } else {
        // Find previous module
        const moduleIndex = courseModules.findIndex(module => module.id === currentModule.id);
        if (moduleIndex > 0) {
          const prevModule = courseModules[moduleIndex - 1];
          if (prevModule.lessons.length > 0) {
            const lastLesson = prevModule.lessons[prevModule.lessons.length - 1];
            router.push(`/lesson/${lastLesson.id}`);
          }
        }
      }
    }
  };

  const getLessonIcon = (type: string, completed: boolean, locked: boolean) => {
    if (locked) return <Lock className="h-4 w-4 text-gray-400" />;
    if (completed) return <CheckCircle className="h-4 w-4 text-success-500" />;
    
    switch (type) {
      case 'video':
        return <PlayCircle className="h-4 w-4 text-corporate-primary" />;
      case 'article':
        return <FileText className="h-4 w-4 text-blue-500" />;
      case 'quiz':
        return <Target className="h-4 w-4 text-purple-500" />;
      case 'exercise':
        return <Code className="h-4 w-4 text-orange-500" />;
      default:
        return <PlayCircle className="h-4 w-4 text-corporate-primary" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4 text-white">
          <div className="relative">
            <div className="w-12 h-12 border-4 border-gray-600 rounded-full animate-spin"></div>
            <div className="absolute top-0 left-0 w-12 h-12 border-4 border-corporate-primary rounded-full animate-spin border-t-transparent"></div>
          </div>
          <p className="text-gray-300">Loading lesson...</p>
        </div>
      </div>
    );
  }

  if (error || !lesson) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center p-8">
          <div className="w-16 h-16 bg-error-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <BookOpen className="h-8 w-8 text-error-600" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Lesson Not Found</h3>
          <p className="text-gray-600 mb-6">{error || 'The lesson you\'re looking for doesn\'t exist.'}</p>
          <Button onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex flex-col">
      {/* Header */}
      <div className="bg-black border-b border-gray-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="text-white hover:bg-gray-800"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Course
          </Button>
          <div className="text-white">
            <h1 className="font-semibold text-lg truncate max-w-96">{lesson.title}</h1>
            <p className="text-sm text-gray-400 truncate max-w-96">{lesson.course_title}</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-white hover:bg-gray-800 lg:hidden"
          >
            <Menu className="h-4 w-4" />
          </Button>
          <div className="hidden sm:flex items-center space-x-2 text-white text-sm">
            <span>Lesson {progress.currentLesson} of {progress.totalLessons}</span>
            <div className="w-24 bg-gray-700 rounded-full h-2">
              <div 
                className="bg-corporate-primary h-2 rounded-full transition-all duration-300"
                style={{ width: `${(progress.currentLesson / progress.totalLessons) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex">
        {/* Main Content */}
        <div className={`flex-1 flex flex-col ${sidebarOpen ? 'lg:mr-96' : ''} transition-all duration-300`}>
          {/* Video Player */}
          <div className="relative bg-black aspect-video">
            <video
              ref={videoRef}
              className="w-full h-full"
              onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
              onDurationChange={(e) => setDuration(e.currentTarget.duration)}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              poster="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTI4MCIgaGVpZ2h0PSI3MjAiIHZpZXdCb3g9IjAgMCAxMjgwIDcyMCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjEyODAiIGhlaWdodD0iNzIwIiBmaWxsPSIjMTExODI3Ii8+CjxjaXJjbGUgY3g9IjY0MCIgY3k9IjM2MCIgcj0iNDAiIGZpbGw9IiM2MzY2RjEiLz4KPHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeD0iNjI0IiB5PSIzNDQiPgo8cGF0aCBkPSJNOCAyLjc0OEM4IDEuNzc5IDkuMDY3IDEuMTQzIDkuODk3IDEuNjEyTDE5LjM0NSA3Ljc4NEMyMC4xNzUgOC4yNTMgMjAuMTc1IDkuNzQ3IDE5LjM0NSAxMC4yMTZMOS44OTcgMTYuMzg4QzkuMDY3IDE2Ljg1NyA4IDE2LjIyMSA4IDE1LjI1MlYyLjc0OFoiIGZpbGw9IndoaXRlIi8+Cjwvc3ZnPgo8L3N2Zz4K"
            >
              {lesson.video_url && <source src={lesson.video_url} type="video/mp4" />}
            </video>

            {/* Video Controls Overlay */}
            <div className={`absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
              {/* Play/Pause Button */}
              <div className="absolute inset-0 flex items-center justify-center">
                <Button
                  size="lg"
                  variant="ghost"
                  onClick={togglePlay}
                  className="w-16 h-16 rounded-full bg-black/30 hover:bg-black/50 text-white border-2 border-white/20"
                >
                  {isPlaying ? <Pause className="h-8 w-8" /> : <Play className="h-8 w-8 ml-1" />}
                </Button>
              </div>

              {/* Top Controls */}
              <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Badge className="bg-black/50 text-white border-white/20">
                    Live Lesson
                  </Badge>
                  <Badge className="bg-corporate-primary text-white">
                    {lesson.duration}
                  </Badge>
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-white hover:bg-white/20"
                    onClick={() => setShowCaptions(!showCaptions)}
                  >
                    <Captions className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-white hover:bg-white/20"
                    onClick={() => setShowTranscript(!showTranscript)}
                  >
                    <FileText className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-white hover:bg-white/20"
                  >
                    <Settings className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Bottom Controls */}
              <div className="absolute bottom-0 left-0 right-0 p-4">
                {/* Progress Bar */}
                <div className="mb-3">
                  <div className="relative">
                    <div className="w-full bg-white/20 rounded-full h-1">
                      <div 
                        className="bg-corporate-primary h-1 rounded-full transition-all duration-100"
                        style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
                      />
                    </div>
                    {notes.map((note) => (
                      <button
                        key={note.id}
                        className="absolute top-0 w-2 h-1 bg-yellow-400 rounded-full transform -translate-y-0.5 hover:scale-150 transition-transform"
                        style={{ left: `${duration > 0 ? (note.timestamp / duration) * 100 : 0}%` }}
                        onClick={() => jumpToTime(note.timestamp)}
                        title={note.content}
                      />
                    ))}
                  </div>
                </div>

                {/* Control Buttons */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={previousLesson}
                      className="text-white hover:bg-white/20"
                    >
                      <SkipBack className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={seekBackward}
                      className="text-white hover:bg-white/20"
                    >
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={togglePlay}
                      className="text-white hover:bg-white/20"
                    >
                      {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={seekForward}
                      className="text-white hover:bg-white/20"
                    >
                      <RotateCw className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={nextLesson}
                      className="text-white hover:bg-white/20"
                    >
                      <SkipForward className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="flex items-center space-x-3">
                    <div className="text-white text-sm">
                      {formatTime(currentTime)} / {formatTime(duration)}
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={toggleMute}
                        className="text-white hover:bg-white/20"
                      >
                        {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                      </Button>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={volume}
                        onChange={(e) => {
                          const newVolume = parseFloat(e.target.value);
                          setVolume(newVolume);
                          if (videoRef.current) {
                            videoRef.current.volume = newVolume;
                          }
                        }}
                        className="w-16 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer slider"
                      />
                    </div>

                    <select
                      value={playbackRate}
                      onChange={(e) => {
                        const rate = parseFloat(e.target.value);
                        setPlaybackRate(rate);
                        if (videoRef.current) {
                          videoRef.current.playbackRate = rate;
                        }
                      }}
                      className="bg-transparent text-white text-sm border border-white/20 rounded px-2 py-1"
                    >
                      <option value="0.5" className="bg-black">0.5x</option>
                      <option value="0.75" className="bg-black">0.75x</option>
                      <option value="1" className="bg-black">1x</option>
                      <option value="1.25" className="bg-black">1.25x</option>
                      <option value="1.5" className="bg-black">1.5x</option>
                      <option value="2" className="bg-black">2x</option>
                    </select>

                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={toggleFullscreen}
                      className="text-white hover:bg-white/20"
                    >
                      {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Lesson Content Area */}
          <div className="flex-1 bg-gray-50 p-6">
            {/* Lesson Header */}
            <div className="mb-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">{lesson.title}</h2>
                  <p className="text-gray-600 mb-4">{lesson.description}</p>
                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                    <span className="flex items-center">
                      <Clock className="h-4 w-4 mr-1" />
                      {lesson.duration}
                    </span>
                    <span className="flex items-center">
                      <Users className="h-4 w-4 mr-1" />
                      Module: {lesson.module_title}
                    </span>
                  </div>
                </div>
                <div className="flex items-center space-x-2 ml-4">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={addNoteAtCurrentTime}
                  >
                    <StickyNote className="h-4 w-4 mr-2" />
                    Add Note
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={addBookmarkAtCurrentTime}
                  >
                    <Bookmark className="h-4 w-4 mr-2" />
                    Bookmark
                  </Button>
                  <Button size="sm" variant="outline">
                    <Share2 className="h-4 w-4 mr-2" />
                    Share
                  </Button>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Module Progress</span>
                  <span className="text-sm text-gray-600">{progress.moduleProgress}%</span>
                </div>
                <Progress value={progress.moduleProgress} className="h-2" />
              </div>
            </div>

            {/* Transcript */}
            {showTranscript && lesson.transcript && (
              <div className="mb-6 bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Transcript</h3>
                <div className="prose max-w-none text-gray-700 whitespace-pre-line">
                  {lesson.transcript}
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="flex items-center justify-between py-6 border-t border-gray-200">
              <Button
                variant="outline"
                onClick={previousLesson}
                className="flex items-center space-x-2"
              >
                <ChevronLeft className="h-4 w-4" />
                <span>Previous Lesson</span>
              </Button>
              
              <Button
                onClick={() => {
                  // Mark lesson as completed
                  nextLesson();
                }}
                className="bg-corporate-primary hover:bg-corporate-deep"
              >
                <span>Complete & Continue</span>
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className={`fixed lg:relative top-0 right-0 w-96 h-full bg-white border-l border-gray-200 transform transition-transform duration-300 z-50 ${
          sidebarOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0 lg:w-0 lg:overflow-hidden'
        }`}>
          <div className="flex flex-col h-full">
            {/* Sidebar Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <div className="flex items-center space-x-1">
                {['curriculum', 'notes', 'discussions', 'resources'].map((tab) => (
                  <Button
                    key={tab}
                    size="sm"
                    variant={activeTab === tab ? "default" : "ghost"}
                    onClick={() => setActiveTab(tab as any)}
                    className="capitalize"
                  >
                    {tab === 'curriculum' && <BookOpen className="h-4 w-4 mr-1" />}
                    {tab === 'notes' && <StickyNote className="h-4 w-4 mr-1" />}
                    {tab === 'discussions' && <MessageSquare className="h-4 w-4 mr-1" />}
                    {tab === 'resources' && <Download className="h-4 w-4 mr-1" />}
                    {tab}
                  </Button>
                ))}
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setSidebarOpen(false)}
                className="lg:hidden"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Sidebar Content */}
            <div className="flex-1 overflow-hidden">
              {/* Curriculum Tab */}
              {activeTab === 'curriculum' && (
                <div className="h-full overflow-y-auto p-4">
                  <div className="space-y-4">
                    {courseModules.map((module) => (
                      <div key={module.id} className="border border-gray-200 rounded-lg">
                        <div className="p-3 bg-gray-50 border-b border-gray-200">
                          <h4 className="font-semibold text-gray-900">{module.title}</h4>
                          <div className="flex items-center space-x-2 mt-1">
                            <div className="w-16 bg-gray-200 rounded-full h-1">
                              <div 
                                className="bg-corporate-primary h-1 rounded-full"
                                style={{ width: `${(module.current_lesson_index / module.lessons.length) * 100}%` }}
                              />
                            </div>
                            <span className="text-xs text-gray-600">
                              {module.current_lesson_index}/{module.lessons.length}
                            </span>
                          </div>
                        </div>
                        <div className="divide-y divide-gray-100">
                          {module.lessons.map((moduleLesson) => (
                            <button
                              key={moduleLesson.id}
                              className={`w-full p-3 text-left hover:bg-gray-50 transition-colors ${
                                moduleLesson.id === lessonId ? 'bg-corporate-50 border-r-2 border-corporate-primary' : ''
                              }`}
                              onClick={() => router.push(`/lesson/${moduleLesson.id}`)}
                            >
                              <div className="flex items-center space-x-3">
                                {getLessonIcon(moduleLesson.type, moduleLesson.completed, moduleLesson.locked)}
                                <div className="flex-1 min-w-0">
                                  <p className={`text-sm font-medium ${
                                    moduleLesson.id === lessonId ? 'text-corporate-primary' : 'text-gray-900'
                                  } truncate`}>
                                    {moduleLesson.title}
                                  </p>
                                  <p className="text-xs text-gray-500">{moduleLesson.duration}</p>
                                </div>
                                {moduleLesson.completed && (
                                  <CheckCircle className="h-4 w-4 text-success-500" />
                                )}
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Notes Tab */}
              {activeTab === 'notes' && (
                <div className="h-full flex flex-col">
                  <div className="p-4 border-b border-gray-200">
                    <div className="flex items-center space-x-2 mb-3">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 text-gray-400 transform -translate-y-1/2" />
                        <input
                          type="text"
                          placeholder="Search notes..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-corporate-primary"
                        />
                      </div>
                      <Button
                        size="sm"
                        onClick={addNoteAtCurrentTime}
                        className="bg-corporate-primary hover:bg-corporate-deep"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4">
                    <div className="space-y-3">
                      {filteredNotes.map((note) => (
                        <div
                          key={note.id}
                          className="bg-gray-50 rounded-lg p-3 border border-gray-200 hover:border-corporate-200 transition-colors"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center space-x-2">
                              {note.is_bookmark ? (
                                <Bookmark className="h-4 w-4 text-yellow-500" />
                              ) : (
                                <StickyNote className="h-4 w-4 text-blue-500" />
                              )}
                              <button
                                onClick={() => jumpToTime(note.timestamp)}
                                className="text-xs text-corporate-primary hover:text-corporate-deep font-medium"
                              >
                                {formatTime(note.timestamp)}
                              </button>
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => deleteNote(note.id)}
                              className="h-6 w-6 p-0 text-gray-400 hover:text-red-500"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                          <p className="text-sm text-gray-700 mb-2">{note.content}</p>
                          {note.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {note.tags.map((tag) => (
                                <Badge key={tag} variant="outline" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Note Editor */}
                  {showNoteEditor && (
                    <div className="border-t border-gray-200 p-4 bg-white">
                      <div className="mb-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-700">
                            Add note at {formatTime(currentTime)}
                          </span>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setShowNoteEditor(false)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                        <textarea
                          ref={notesRef}
                          value={noteContent}
                          onChange={(e) => setNoteContent(e.target.value)}
                          placeholder="Write your note here..."
                          className="w-full h-20 p-3 border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-corporate-primary"
                          autoFocus
                        />
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          size="sm"
                          onClick={saveNote}
                          disabled={!noteContent.trim()}
                          className="bg-corporate-primary hover:bg-corporate-deep"
                        >
                          <Save className="h-4 w-4 mr-2" />
                          Save Note
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setShowNoteEditor(false)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Discussions Tab */}
              {activeTab === 'discussions' && (
                <div className="h-full flex flex-col">
                  <div className="p-4 border-b border-gray-200">
                    <h3 className="font-semibold text-gray-900 mb-2">Q&A</h3>
                    <p className="text-sm text-gray-600">Ask questions and engage with other students</p>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4">
                    <div className="space-y-4">
                      {discussions.map((discussion) => (
                        <div key={discussion.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                          <div className="flex items-start space-x-3">
                            <div className="w-8 h-8 bg-gradient-to-br from-corporate-300 to-corporate-400 rounded-full flex items-center justify-center flex-shrink-0">
                              <span className="text-xs text-white font-medium">
                                {discussion.user_name.charAt(0)}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center space-x-2 mb-1">
                                <span className="text-sm font-medium text-gray-900">
                                  {discussion.user_name}
                                </span>
                                {discussion.is_instructor && (
                                  <Badge className="bg-corporate-primary text-white text-xs">
                                    Instructor
                                  </Badge>
                                )}
                                {discussion.is_verified && (
                                  <Badge variant="outline" className="text-xs">
                                    Verified
                                  </Badge>
                                )}
                                <button
                                  onClick={() => jumpToTime(discussion.timestamp)}
                                  className="text-xs text-corporate-primary hover:text-corporate-deep"
                                >
                                  {formatTime(discussion.timestamp)}
                                </button>
                              </div>
                              <p className="text-sm text-gray-700 mb-3">{discussion.content}</p>
                              <div className="flex items-center space-x-4 text-xs text-gray-500">
                                <button className="flex items-center space-x-1 hover:text-green-600">
                                  <ThumbsUp className="h-3 w-3" />
                                  <span>{discussion.likes}</span>
                                </button>
                                <button className="flex items-center space-x-1 hover:text-red-600">
                                  <ThumbsDown className="h-3 w-3" />
                                  <span>{discussion.dislikes}</span>
                                </button>
                                <button className="hover:text-gray-700">Reply</button>
                                <button className="hover:text-gray-700">
                                  <Flag className="h-3 w-3" />
                                </button>
                              </div>
                              
                              {/* Replies */}
                              {discussion.replies.length > 0 && (
                                <div className="mt-3 space-y-2 border-l-2 border-gray-200 pl-3">
                                  {discussion.replies.map((reply) => (
                                    <div key={reply.id} className="bg-white rounded p-2">
                                      <div className="flex items-center space-x-2 mb-1">
                                        <span className="text-xs font-medium text-gray-900">
                                          {reply.user_name}
                                        </span>
                                        {reply.is_instructor && (
                                          <Badge className="bg-corporate-primary text-white text-xs">
                                            Instructor
                                          </Badge>
                                        )}
                                      </div>
                                      <p className="text-xs text-gray-700">{reply.content}</p>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="border-t border-gray-200 p-4 bg-white">
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        placeholder="Ask a question..."
                        className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-corporate-primary"
                      />
                      <Button size="sm" className="bg-corporate-primary hover:bg-corporate-deep">
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Ask
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Resources Tab */}
              {activeTab === 'resources' && (
                <div className="h-full overflow-y-auto p-4">
                  <div className="space-y-3">
                    {lesson.resources?.map((resource) => (
                      <div
                        key={resource.id}
                        className="bg-gray-50 rounded-lg p-4 border border-gray-200 hover:border-corporate-200 transition-colors"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-corporate-100 rounded-lg flex items-center justify-center">
                            {resource.type === 'pdf' && <FileText className="h-5 w-5 text-red-500" />}
                            {resource.type === 'zip' && <Download className="h-5 w-5 text-purple-500" />}
                            {resource.type === 'link' && <ExternalLink className="h-5 w-5 text-blue-500" />}
                            {resource.type === 'code' && <Code className="h-5 w-5 text-green-500" />}
                          </div>
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900">{resource.title}</h4>
                            {resource.size && (
                              <p className="text-sm text-gray-500">{resource.size}</p>
                            )}
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            asChild
                          >
                            <a href={resource.url} target="_blank" rel="noopener noreferrer">
                              {resource.type === 'link' ? 'Open' : 'Download'}
                            </a>
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
