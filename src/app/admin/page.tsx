'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useFirebase } from '@/firebase';
import { 
  BarChart3, 
  Users, 
  Map as MapIcon, 
  ShieldAlert, 
  Search, 
  Trash2, 
  Eye, 
  CheckCircle, 
  Loader2,
  TrendingUp,
  Clock,
  ArrowLeft,
  Mail,
  Fingerprint,
  Calendar,
  Lock,
  ExternalLink,
  ChevronRight,
  MoreVertical,
  Copy,
  Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/Table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { collection, query, orderBy, limit, getDocs, doc, getDoc, setDoc, updateDoc, deleteDoc, where, getCountFromServer, collectionGroup, startAfter } from 'firebase/firestore';
import { formatDistanceToNow, format } from 'date-fns';
import { AdminStats, toDate } from '@/types/chat';

export default function AdminDashboard() {
  const { user, isAdmin, isUserLoading, firestore } = useFirebase();
  const router = useRouter();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  
  // User Management State
  const [users, setUsers] = useState<any[]>([]);
  const [isUsersLoading, setIsUsersLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [isUserDetailOpen, setIsUserDetailOpen] = useState(false);
  const [userSearchTerm, setUserSearchTerm] = useState('');

  // Redirect if not admin after loading
  useEffect(() => {
    if (!isUserLoading && !isAdmin) {
      router.push('/');
    }
  }, [isUserLoading, isAdmin, router]);

  useEffect(() => {
    if (isAdmin && firestore) {
      autoSyncStats();
      fetchUsers();
    }
  }, [isAdmin, firestore]);

  async function fetchUsers() {
    if (!firestore) return;
    setIsUsersLoading(true);
    try {
      const usersRef = collection(firestore, 'users');
      // Remove orderBy for now to ensure visibility even if lastLogin is missing
      const q = query(usersRef, limit(100));
      const snapshot = await getDocs(q);
      const fetchedUsers = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      // Sort client-side if needed, but for now just show them
      setUsers(fetchedUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setIsUsersLoading(false);
    }
  }

  const filteredUsers = users.filter(u => 
    u.displayName?.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
    u.email?.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
    u.id?.toLowerCase().includes(userSearchTerm.toLowerCase())
  );

  async function autoSyncStats() {
    if (!firestore) return;
    setIsSyncing(true);
    try {
      const now = new Date();
      const timestampId = now.toISOString();
      const dateStr = timestampId.split('T')[0];
      
      const statsRef = collection(firestore, 'adminStats');
      
      const [usersSnap, mapsSnap, chatsSnap] = await Promise.all([
        getCountFromServer(collection(firestore, 'users')),
        getCountFromServer(collection(firestore, 'publicMindmaps')),
        getCountFromServer(collectionGroup(firestore, 'chatSessions')),
      ]);

      const counts = {
        date: dateStr,
        timestamp: timestampId,
        totalUsers: usersSnap.data().count,
        totalMaps: mapsSnap.data().count,
        totalChats: chatsSnap.data().count,
        dailyActiveUsers: usersSnap.data().count,
      };

      await setDoc(doc(statsRef, timestampId), counts);
      setStats(counts as unknown as AdminStats);

      // Fetch all docs to safely sort and clean up (including older date-based ones)
      const allDocs = await getDocs(statsRef);
      const docsSorted = allDocs.docs.sort((a, b) => {
        const aTime = a.data().timestamp || a.data().date || a.id;
        const bTime = b.data().timestamp || b.data().date || b.id;
        return new Date(bTime).getTime() - new Date(aTime).getTime();
      });

      // Maintain only 5 most recent records
      if (docsSorted.length > 5) {
        const docsToDelete = docsSorted.slice(5);
        for (const d of docsToDelete) {
          await deleteDoc(d.ref);
        }
      }
    } catch (error) {
      console.error('Error auto-syncing stats:', error);
    } finally {
      setIsSyncing(false);
      setIsLoading(false);
    }
  }

  if (isUserLoading || (isAdmin && isLoading)) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-black">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-[#0f1115] text-white p-4 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-12">
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <Button 
              variant="ghost" 
              onClick={() => router.push('/')}
              className="mb-4 -ml-2 text-zinc-500 hover:text-white hover:bg-white/5 transition-all duration-300"
            >
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to App
            </Button>
            <h1 className="text-5xl font-black tracking-tighter uppercase italic flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl neo-convex flex items-center justify-center">
                <ShieldAlert className="text-primary h-6 w-6" />
              </div>
              MindScape <span className="text-zinc-600 not-italic">Admin</span>
            </h1>
            <p className="text-zinc-500 mt-2 font-medium tracking-wide uppercase text-[10px] letter-spacing-[0.2em]">Admin Control Center</p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="neo-concave p-1 rounded-2xl flex items-center px-4 w-full sm:w-64">
              <Search className="h-4 w-4 text-zinc-500 mr-2" />
              <input 
                value={userSearchTerm}
                onChange={(e) => setUserSearchTerm(e.target.value)}
                placeholder="Search Identity..." 
                className="bg-transparent border-none focus:ring-0 text-sm py-2 w-full placeholder:text-zinc-700"
              />
            </div>
            
            {isSyncing && (
              <div className="neo-concave rounded-2xl px-4 h-11 flex items-center text-emerald-400 font-bold text-[10px] tracking-widest uppercase gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-emerald-500" /> Auto-Syncing
              </div>
            )}
          </div>
        </header>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard 
            title="Total Users" 
            value={stats?.totalUsers || 0} 
            icon={Users} 
            trend="Registered Users" 
            color="text-blue-400"
          />
          <StatCard 
            title="Public Maps" 
            value={stats?.totalMaps || 0} 
            icon={MapIcon} 
            trend="Community Maps" 
            color="text-purple-400"
          />
          <StatCard 
            title="Total Chats" 
            value={stats?.totalChats || 0} 
            icon={BarChart3} 
            trend="Active Chats" 
            color="text-emerald-400"
          />
          <StatCard 
            title="System Status" 
            value="Optimal" 
            icon={TrendingUp} 
            trend="Latency: 42ms" 
            color="text-orange-400"
          />
        </div>

        {/* Main Content */}
        <Tabs defaultValue="users" className="w-full">
          <TabsList className="bg-transparent p-0 mb-8 flex gap-6 border-none">
            <TabsTrigger value="users" className="neo-button data-[state=active]:neo-concave data-[state=active]:text-primary rounded-xl px-8 py-3 uppercase font-black tracking-widest text-[11px] transition-all">
              User Directory
            </TabsTrigger>
            <TabsTrigger value="moderation" className="neo-button data-[state=active]:neo-concave data-[state=active]:text-primary rounded-xl px-8 py-3 uppercase font-black tracking-widest text-[11px] transition-all">
              Feed Moderation
            </TabsTrigger>
            <TabsTrigger value="logs" className="neo-button data-[state=active]:neo-concave data-[state=active]:text-primary rounded-xl px-8 py-3 uppercase font-black tracking-widest text-[11px] transition-all">
              Audit Logs
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="focus-visible:ring-0">
            <UserManagementTable 
              users={filteredUsers} 
              isLoading={isUsersLoading} 
              onSelectUser={(u: any) => {
                setSelectedUser(u);
                setIsUserDetailOpen(true);
              }}
            />
          </TabsContent>

          <TabsContent value="moderation" className="focus-visible:ring-0">
            <ModerationTable />
          </TabsContent>

          <TabsContent value="logs" className="focus-visible:ring-0">
             <Card className="neo-convex border-none text-zinc-500 p-24 text-center rounded-[40px]">
                <Clock className="w-16 h-16 mx-auto mb-6 opacity-20 text-primary" />
                <p className="font-bold tracking-tight uppercase text-xs letter-spacing-[0.2em]">Audit Stream Offline</p>
                <p className="text-[10px] text-zinc-600 mt-2">Next cycle integration: Terminal Logging & Auth Events</p>
             </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* User Detail Dialog */}
      <UserDetailDialog 
        user={selectedUser} 
        isOpen={isUserDetailOpen} 
        onClose={() => setIsUserDetailOpen(false)} 
      />
    </div>
  );
}

function StatCard({ title, value, icon: Icon, trend, color }: any) {
  return (
    <Card className="neo-convex border-none rounded-[32px] overflow-hidden hover:scale-[1.02] transition-all duration-500 group">
      <CardHeader className="flex flex-row items-center justify-between pb-2 px-6 pt-6">
        <CardTitle className="text-[10px] font-black uppercase text-zinc-500 tracking-[0.2em]">{title}</CardTitle>
        <div className={cn("p-3 rounded-2xl neo-concave group-hover:neo-convex transition-all duration-500", color)}>
          <Icon className="h-5 w-5" />
        </div>
      </CardHeader>
      <CardContent className="px-6 pb-6">
        <div className="text-4xl font-black tracking-tighter mb-2">{typeof value === 'number' ? value.toLocaleString() : value}</div>
        <p className="text-[10px] text-zinc-500 font-bold flex items-center gap-2 uppercase tracking-wider">
          <span className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
          {trend}
        </p>
      </CardContent>
    </Card>
  );
}

function UserManagementTable({ users, isLoading, onSelectUser }: any) {
  if (isLoading) return (
    <div className="flex flex-col items-center justify-center p-24 space-y-4">
      <Loader2 className="animate-spin text-primary h-12 w-12" />
      <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-600">Loading Users...</p>
    </div>
  );

  return (
    <Card className="neo-convex border-none rounded-[40px] overflow-hidden">
      <Table>
        <TableHeader className="bg-transparent">
          <TableRow className="border-white/[0.02] hover:bg-transparent">
            <TableHead className="text-[10px] font-black uppercase tracking-widest text-zinc-500 px-8 py-6">Identity</TableHead>
            <TableHead className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Contact</TableHead>
            <TableHead className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Nodes</TableHead>
            <TableHead className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Last Active</TableHead>
            <TableHead className="text-right text-[10px] font-black uppercase tracking-widest text-zinc-500 px-8">Audit</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((u: any) => (
            <TableRow key={u.id} className="border-white/[0.02] hover:bg-white/[0.02] transition-all cursor-pointer group" onClick={() => onSelectUser(u)}>
              <TableCell className="px-8 py-5">
                <div className="flex items-center gap-4">
                  <Avatar className="h-10 w-10 border-2 border-white/5 neo-convex">
                    <AvatarImage src={u.photoURL} />
                    <AvatarFallback className="bg-zinc-800 text-xs font-bold">{u.displayName?.substring(0, 2).toUpperCase() || '??'}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-bold text-sm tracking-tight text-white">
                      {u.displayName || u.email?.split('@')[0] || 'MindScape Explorer'}
                    </p>
                    <p className="text-[10px] text-zinc-600 font-mono truncate max-w-[120px]">{u.id}</p>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex flex-col">
                  <span className="text-xs font-medium text-zinc-300">{u.email || 'No Email'}</span>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="w-fit p-0 px-2 h-auto text-[8px] uppercase tracking-widest text-zinc-500 border-white/5">
                      {u.providerId === 'google.com' ? 'Google Auth' : 'Email/Pass'}
                    </Badge>
                    <Badge className="bg-emerald-500/10 text-emerald-500 border-none font-black text-[9px] tracking-widest uppercase">
                      {u.statistics?.totalMapsCreated > 0 ? 'Active' : 'New User'}
                    </Badge>
                  </div>
                </div>
              </TableCell>
              <TableCell className="px-8 font-bold text-zinc-400">
                <div className="flex items-center gap-2">
                  <MapIcon className="h-3 w-3 text-primary" />
                  {u.statistics?.totalMapsCreated || 0}
                </div>
              </TableCell>
              <TableCell className="px-8 font-mono text-[10px] text-zinc-500 uppercase">
                {u.statistics?.lastActiveDate ? formatDistanceToNow(toDate(u.statistics.lastActiveDate), { addSuffix: true }) : 'N/A'}
              </TableCell>
              <TableCell className="text-right px-8">
                <Button variant="ghost" size="icon" className="neo-button h-9 w-9 opacity-0 group-hover:opacity-100 transition-opacity">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}
function MapStatsDisplay({ m, user }: { m: any, user: any }) {
  const { firestore } = useFirebase();
  const [stats, setStats] = useState({
    nodeCount: m.nodeCount,
    categoriesCount: m.categoriesCount,
    aiPersona: m.aiPersona,
    sourcesCount: m.sourcesCount ?? (m.sources ? m.sources.length : (m.sourceFileContent ? 1 : 0)),
  });
  const [loading, setLoading] = useState(!m.nodeCount && m.id);

  useEffect(() => {
    async function fetchLegacyStats() {
      if (!m.id || m.nodeCount) {
        setLoading(false);
        return;
      }
      try {
        const contentRef = doc(firestore, 'users', user.id, 'mindmaps', m.id, 'content', 'tree');
        const snap = await getDoc(contentRef);
        if (snap.exists()) {
          const data = snap.data();
          let cNodes = 0;
          let cCats = 0;
          if (m.mode === 'compare' && data.compareData) {
            cNodes = 1 + (data.compareData.unityNexus?.length || 0) + (data.compareData.dimensions?.length || 0);
            cCats = data.compareData.dimensions?.length || 0;
          } else if (data.subTopics) {
            cNodes = 1;
            data.subTopics.forEach((st: any) => {
              cNodes++;
              if (st.categories) {
                cCats += st.categories.length;
                st.categories.forEach((cat: any) => {
                  cNodes++;
                  if (cat.subCategories) cNodes += cat.subCategories.length;
                });
              }
            });
          }
          setStats(prev => ({ ...prev, nodeCount: cNodes, categoriesCount: cCats }));
        }
      } catch (err) {
         console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchLegacyStats();
  }, [m.id, m.nodeCount, user.id, firestore, m.mode]);

  const depthDisplay = m.depth === 'low' ? 'Quick' : (m.depth === 'deep' ? 'Detailed' : 'Balanced');
  const personaDisplay = stats.aiPersona || user?.preferences?.defaultAIPersona || 'Default';

  return (
    <div className="p-6 border-t border-white/[0.03] bg-black/40">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-y-8 gap-x-6">
        {/* Structural Data */}
        <div>
          <p className="text-[8px] font-black uppercase tracking-widest text-zinc-500">Total Nodes</p>
          <p className="text-xs font-bold text-white mt-1">
            {loading ? <Loader2 className="h-3 w-3 animate-spin inline text-primary" /> : (stats.nodeCount || 0)}
          </p>
        </div>
        <div>
          <p className="text-[8px] font-black uppercase tracking-widest text-zinc-500">Categories</p>
          <p className="text-xs font-bold text-white mt-1">
            {loading ? <Loader2 className="h-3 w-3 animate-spin inline text-primary" /> : (stats.categoriesCount || 0)}
          </p>
        </div>
        <div>
          <p className="text-[8px] font-black uppercase tracking-widest text-zinc-500">Deep Dives</p>
          <p className="text-xs font-bold text-purple-400 mt-1">{m.nestedExpansions?.length || 0}</p>
        </div>

        {/* Generation Config */}
        <div>
          <p className="text-[8px] font-black uppercase tracking-widest text-zinc-500">AI Persona Used</p>
          <p className="text-xs font-bold text-violet-400 mt-1 uppercase tracking-widest">{personaDisplay}</p>
        </div>
        <div>
          <p className="text-[8px] font-black uppercase tracking-widest text-zinc-500">Cognitive Depth</p>
          <p className="text-xs font-bold text-emerald-400 mt-1 uppercase tracking-widest">{depthDisplay}</p>
        </div>

        {/* Content & Media */}
        <div>
          <p className="text-[8px] font-black uppercase tracking-widest text-zinc-500">Saved Images</p>
          <p className="text-xs font-bold text-pink-400 mt-1">{m.savedImages?.length || 0}</p>
        </div>
        <div>
          <p className="text-[8px] font-black uppercase tracking-widest text-zinc-500">Node Insights</p>
          <p className="text-xs font-bold text-amber-400 mt-1">{Object.keys(m.explanations || {}).length}</p>
        </div>

        {/* Engagement & Privacy */}
        <div>
          <p className="text-[8px] font-black uppercase tracking-widest text-zinc-500">Access</p>
          <p className="text-xs font-bold text-orange-400 mt-1 uppercase tracking-widest">{m.isPublic ? 'Public Share' : (m.isShared ? 'Link Shared' : 'Private')}</p>
        </div>
        <div>
          <p className="text-[8px] font-black uppercase tracking-widest text-zinc-500">Global Views</p>
          <p className="text-xs font-bold text-sky-400 mt-1">{m.views || 0}</p>
        </div>

        {/* Source Data */}
        <div className="col-span-2 lg:col-span-3">
          <p className="text-[8px] font-black uppercase tracking-widest text-zinc-500">Origin Source</p>
          <div className="mt-1 flex items-center gap-2 overflow-hidden">
            <Badge className="bg-white/5 text-blue-400 hover:bg-white/10 border-none text-[9px] font-black uppercase tracking-widest shrink-0">
              {m.sourceType ? m.sourceType : (m.sourceUrl ? 'Web Link' : (m.sourceFileContent ? 'Document' : 'Scratch'))}
            </Badge>
            {m.sourceUrl && <span className="text-[10px] text-zinc-500 font-mono truncate">{m.sourceUrl}</span>}
          </div>
        </div>
      </div>

    </div>
  );
}

function UserDetailDialog({ user, isOpen, onClose }: { user: any, isOpen: boolean, onClose: () => void }) {
  const { firestore } = useFirebase();
  const [chatCount, setChatCount] = useState<number | null>(null);
  const [userMaps, setUserMaps] = useState<any[]>([]);
  const [isLoadingMaps, setIsLoadingMaps] = useState(false);
  const [expandedMapId, setExpandedMapId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState(false);

  const handleCopyId = () => {
    navigator.clipboard.writeText(user.id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  useEffect(() => {
    if (isOpen && user && firestore) {
      const fetchData = async () => {
        setIsLoadingMaps(true);
        try {
          const chatsSnap = await getCountFromServer(collection(firestore, `users/${user.id}/chatSessions`));
          setChatCount(chatsSnap.data().count);

          const mapsRef = collection(firestore, `users/${user.id}/mindmaps`);
          const q = query(mapsRef, orderBy('updatedAt', 'desc'));
          const snapshot = await getDocs(q);
          setUserMaps(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        } catch (e) {
          console.error('Error fetching profile detail:', e);
        } finally {
          setIsLoadingMaps(false);
        }
      };
      fetchData();
    } else {
      setChatCount(null);
      setUserMaps([]);
    }
  }, [isOpen, user, firestore]);

  if (!user) return null;

  const stats = user.statistics || {};

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="neo-convex border-none bg-[#0a0c10] max-w-7xl w-[95vw] h-[90vh] rounded-[40px] p-0 overflow-hidden text-white flex flex-col scale-[0.98]">
        <div className="flex-1 flex overflow-hidden">
          {/* Left Sidebar: Identity & Technical */}
          <div className="w-80 border-r border-white/[0.03] p-10 bg-black/20 flex flex-col gap-8 overflow-y-auto custom-scrollbar">
            <div className="space-y-6">
              <Avatar className="h-32 w-32 border-4 border-white/5 neo-convex mx-auto">
                <AvatarImage src={user.photoURL} />
                <AvatarFallback className="text-3xl font-black bg-zinc-800 tracking-tighter">
                  {(user.displayName || user.email?.split('@')[0] || '??').substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="text-center">
                <DialogTitle className="text-2xl font-black tracking-tighter uppercase italic leading-tight text-white">
                  {user.displayName || user.email?.split('@')[0] || 'MindScape Explorer'}
                </DialogTitle>
                <DialogDescription className="text-zinc-500 font-mono text-[9px] uppercase tracking-widest mt-2">{user.id}</DialogDescription>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-2xl bg-white/[0.02] border border-white/[0.03]">
                <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500 italic">Tier</span>
                <Badge className="bg-primary/20 text-primary border-none text-[8px] font-black">PRO PILOT</Badge>
              </div>
              <div className="flex items-center justify-between p-3 rounded-2xl bg-white/[0.02] border border-white/[0.03]">
                <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500 italic">Provider</span>
                <Badge className="bg-zinc-800 text-zinc-400 border-none text-[8px] font-black uppercase italic">
                  {user.providerId || 'Email/Pass'}
                </Badge>
              </div>
            </div>

            <div className="space-y-4 border-t border-white/5 pt-8">
              <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600 mb-4 italic">Account Details</h4>
              <div className="space-y-3">
                <div className="flex flex-col gap-1">
                  <span className="text-[8px] font-black uppercase text-zinc-600 italic">Email Address</span>
                  <div className="flex items-center gap-2 text-[11px] font-bold text-zinc-400 truncate">
                    <Mail className="h-3 w-3 text-primary" /> {user.email}
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[8px] font-black uppercase text-zinc-600 italic">User ID</span>
                  <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-white/5 border border-white/5 group/uid relative">
                    <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-400 font-mono truncate">
                      <Fingerprint className="h-3 w-3 text-primary shrink-0" /> {user.id}
                    </div>
                    <Button 
                      onClick={handleCopyId}
                      variant="ghost" 
                      size="icon" 
                      className="h-6 w-6 rounded-lg hover:bg-white/10 text-zinc-500 hover:text-white transition-all"
                    >
                      {copiedId ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                    </Button>
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[8px] font-black uppercase text-zinc-600 italic">Joined Date</span>
                  <div className="flex items-center gap-2 text-[11px] font-bold text-zinc-400">
                    <Calendar className="h-3 w-3 text-primary" /> 
                    {(() => {
                      if (user.createdAt) return format(toDate(user.createdAt), 'dd/MM/yyyy');
                      
                      // Fallback to earliest activity date
                      if (user.activity && Object.keys(user.activity).length > 0) {
                        const sortedDates = Object.keys(user.activity).sort();
                        return format(new Date(sortedDates[0]), 'dd/MM/yyyy');
                      }
                      
                      // Final fallback to last active date
                      if (user.statistics?.lastActiveDate) {
                        return format(new Date(user.statistics.lastActiveDate), 'dd/MM/yyyy');
                      }
                      
                      return 'Recently';
                    })()}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-auto pt-8">
              <div className="p-4 rounded-3xl bg-emerald-500/5 border border-emerald-500/10 flex items-center gap-3">
                <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Identity Verified</span>
              </div>
            </div>
          </div>

          {/* Right Main Content */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="p-12 overflow-y-auto custom-scrollbar space-y-12">
              {/* Performance Bento Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="neo-convex p-6 rounded-[32px] border border-white/[0.03] group hover:border-primary/20 transition-all">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2.5 rounded-xl bg-orange-500/10 text-orange-500"><MapIcon className="h-5 w-5" /></div>
                    <span className="text-[10px] font-black uppercase tracking-[0.1em] text-zinc-600 italic">MindMaps</span>
                  </div>
                  <div className="text-4xl font-black italic tracking-tighter text-white">{stats.totalMapsCreated || 0}</div>
                  <p className="text-[9px] font-bold text-zinc-500 uppercase mt-2">Created</p>
                </div>

                <div className="neo-convex p-6 rounded-[32px] border border-white/[0.03] group hover:border-primary/20 transition-all">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-500"><TrendingUp className="h-5 w-5" /></div>
                    <span className="text-[10px] font-black uppercase tracking-[0.1em] text-zinc-600 italic">Total Nodes</span>
                  </div>
                  <div className="text-4xl font-black italic tracking-tighter text-white">{stats.totalNodes || 0}</div>
                  <p className="text-[9px] font-bold text-zinc-500 uppercase mt-2">Total Created</p>
                </div>

                <div className="neo-convex p-6 rounded-[32px] border border-white/[0.03] group hover:border-primary/20 transition-all">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-500"><Fingerprint className="h-5 w-5" /></div>
                    <span className="text-[10px] font-black uppercase tracking-[0.1em] text-zinc-600 italic">Images Generated</span>
                  </div>
                  <div className="text-4xl font-black italic tracking-tighter text-white">{stats.totalImagesGenerated || 0}</div>
                  <p className="text-[9px] font-bold text-zinc-500 uppercase mt-2">AI Images</p>
                </div>

                <div className="neo-convex p-6 rounded-[32px] border border-white/[0.03] group hover:border-primary/20 transition-all">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500"><Clock className="h-5 w-5" /></div>
                    <span className="text-[10px] font-black uppercase tracking-[0.1em] text-zinc-600 italic">Study Time</span>
                  </div>
                  <div className="text-4xl font-black italic tracking-tighter text-white">
                    {Math.floor((stats.totalStudyTimeMinutes || 0) / 60)}h {(stats.totalStudyTimeMinutes || 0) % 60}m
                  </div>
                  <p className="text-[9px] font-bold text-zinc-500 uppercase mt-2">Time Spent</p>
                </div>
              </div>

              {/* Mindmap Inventory */}
              <div>
                <div className="flex items-center justify-between mb-8">
                  <h4 className="text-xs font-black uppercase tracking-[0.25em] text-zinc-500 italic flex items-center gap-3">
                    <div className="h-px w-8 bg-zinc-800" />
                    User Mindmap List
                    <Badge className="bg-white/5 text-zinc-500 border-none px-2 rounded-lg">{userMaps.length}</Badge>
                  </h4>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 items-start">
                  {isLoadingMaps ? (
                    <div className="col-span-2 py-12 flex justify-center"><Loader2 className="animate-spin text-primary h-8 w-8" /></div>
                  ) : userMaps.length > 0 ? (
                    userMaps.map(m => (
                      <div key={m.id} className="neo-convex p-1 rounded-3xl group border border-white/0 hover:border-primary/10 transition-all flex flex-col">
                        <div className="bg-white/[0.02] rounded-[22px] p-5 flex items-center justify-between gap-4">
                          <div className="flex items-center gap-4 min-w-0">
                            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                              <MapIcon className="h-5 w-5 text-primary" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-black italic tracking-tight text-white group-hover:text-primary transition-colors" title={m.topic || m.title || 'Untitled Research'}>
                                {m.shortTitle || (m.topic && m.topic.length > 22 ? m.topic.substring(0, 22).trim() + '...' : m.topic) || (m.title && m.title.length > 22 ? m.title.substring(0, 22).trim() + '...' : m.title) || 'Untitled Research'}
                              </p>
                              <p className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest mt-1">
                                {m.updatedAt ? format(toDate(m.updatedAt), 'MMM dd, yyyy HH:mm') : (m.createdAt ? format(toDate(m.createdAt), 'MMM dd, yyyy') : 'Live Sync')}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  className="neo-button h-8 rounded-xl border-white/5 text-[9px] font-black uppercase tracking-widest text-zinc-400 hover:text-white"
                                >
                                  Stats
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="neo-convex border-none bg-[#0a0c10] max-w-2xl w-[95vw] rounded-[40px] p-0 overflow-hidden text-white">
                                <DialogHeader className="p-8 pb-0">
                                  <DialogTitle className="text-2xl font-black italic tracking-tighter text-white">
                                      Map Intelligence
                                  </DialogTitle>
                                  <DialogDescription className="text-zinc-500 font-bold uppercase tracking-widest text-[10px]">
                                      {m.topic || m.title || 'Target Trace'}
                                  </DialogDescription>
                                </DialogHeader>
                                <MapStatsDisplay m={m} user={user} />
                              </DialogContent>
                            </Dialog>

                            <Button 
                              size="icon" 
                              variant="ghost" 
                              className="h-8 w-8 rounded-xl neo-button text-primary hover:scale-110"
                              onClick={() => window.open(`/canvas?mapId=${m.id}&ownerId=${user.id}`, '_blank')}
                            >
                              <ExternalLink className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="col-span-2 py-12 text-center text-zinc-600 text-sm font-bold uppercase italic tracking-widest">
                      No mindmaps found for this user
                    </div>
                  )}
                </div>
              </div>

              {/* Technical Trace (Deep CRM UI) */}
              <div className="pt-8">
                <h4 className="text-[10px] font-black uppercase tracking-[0.25em] text-zinc-600 mb-6 italic">Deep Object Trace (CRM Level)</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Gamification Status */}
                  <div className="neo-convex p-6 rounded-[32px] border border-white/[0.03]">
                    <h5 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 mb-4 italic">Gamification Engine</h5>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] text-zinc-400 font-bold uppercase tracking-widest">Active Badge</span>
                        <Badge className="bg-amber-500/10 text-amber-500 border-none text-[8px] font-black uppercase tracking-tighter">
                          {user.activeBadgeId?.split(':')[0]?.replace('_', ' ') || 'None'}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] text-zinc-400 font-bold uppercase tracking-widest">Unlocked Achievements</span>
                        <span className="text-xs font-black text-white">{user.unlockedAchievements?.length || 0}</span>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {user.unlockedAchievements?.map((a: string) => (
                          <span key={a} className="text-[8px] font-bold text-zinc-400 bg-white/5 border border-white/5 px-2 py-1.5 rounded-xl uppercase tracking-widest hover:border-primary/30 transition-all">
                            {a.replace('_', ' ').replace('-', ' ')}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* API & Config */}
                  <div className="neo-convex p-6 rounded-[32px] border border-white/[0.03]">
                    <h5 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 mb-4 italic">System Configuration</h5>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] text-zinc-400 font-bold uppercase tracking-widest">Default Persona</span>
                        <span className="text-[9px] font-black text-zinc-300 uppercase tracking-widest bg-white/5 px-2 py-1 rounded-md">
                          {user.preferences?.defaultAIPersona || 'Standard'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] text-zinc-400 font-bold uppercase tracking-widest">Image Model</span>
                        <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">
                          {user.apiSettings?.pollinationsModel || 'FLUX'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] text-zinc-400 font-bold uppercase tracking-widest">API Key Status</span>
                        <span className="text-[9px] font-bold text-zinc-500 font-mono">
                          {user.apiSettings?.pollinationsApiKey ? `Configured` : 'None'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] text-zinc-400 font-bold uppercase tracking-widest">Historical Sync</span>
                        <CheckCircle className={user.hasSyncedHistorical ? 'h-3 w-3 text-emerald-500' : 'h-3 w-3 text-zinc-700'} />
                      </div>
                    </div>
                  </div>

                  {/* Activity Ledger */}
                  {user.activity && Object.keys(user.activity).length > 0 && (
                    <div className="md:col-span-2 neo-convex p-6 rounded-[32px] border border-white/[0.03]">
                      <div className="flex items-center justify-between mb-4">
                         <h5 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 italic">Timeline Ledger</h5>
                         <Badge className="bg-primary/10 text-primary border-none text-[8px] font-black uppercase tracking-widest">
                           {user.statistics?.currentStreak || 0} Day Streak
                         </Badge>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-48 overflow-y-auto custom-scrollbar pr-2">
                        {Object.entries(user.activity).sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime()).map(([date, data]: [string, any]) => (
                          <div key={date} className="flex items-center justify-between bg-white/[0.02] p-3 rounded-2xl border border-white/[0.02] hover:bg-white/[0.05] transition-colors">
                            <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-500">{format(new Date(date), 'MMM dd, yyyy')}</span>
                            <div className="flex gap-3">
                              {data.mapsCreated && (
                                <div className="flex items-center gap-1 text-[9px] font-black text-blue-400" title="Maps Created">
                                  <MapIcon className="h-2.5 w-2.5" />{data.mapsCreated}
                                </div>
                              )}
                              {data.imagesGenerated && (
                                <div className="flex items-center gap-1 text-[9px] font-black text-purple-400" title="Images Generated">
                                  <Fingerprint className="h-2.5 w-2.5" />{data.imagesGenerated}
                                </div>
                              )}
                              {data.studyTimeMinutes && (
                                <div className="flex items-center gap-1 text-[9px] font-black text-emerald-500" title="Study Time (min)">
                                  <Clock className="h-2.5 w-2.5" />{data.studyTimeMinutes}m
                                </div>
                              )}
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
      </DialogContent>
    </Dialog>
  );
}

function formatDuration(minutes: number) {
  if (!minutes) return '0m';
  const h = Math.floor(minutes / 60);
  const m = Math.floor(minutes % 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function ModerationTable() {
  const { firestore } = useFirebase();
  const [maps, setMaps] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (firestore) fetchPublicMaps();
  }, [firestore]);

  async function fetchPublicMaps() {
    if (!firestore) return;
    try {
      const mapsRef = collection(firestore, 'publicMindmaps');
      const q = query(mapsRef, orderBy('timestamp', 'desc'), limit(50));
      const snapshot = await getDocs(q);
      setMaps(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }

  if (isLoading) return <div className="flex justify-center p-24"><Loader2 className="animate-spin text-primary h-8 w-8" /></div>;

  return (
    <Card className="neo-convex border-none rounded-[40px] overflow-hidden">
      <CardHeader className="border-b border-white/[0.02] p-8">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl font-black tracking-tight uppercase italic">Feed Moderation</CardTitle>
            <CardDescription className="text-zinc-600 text-[10px] uppercase tracking-widest mt-1 font-bold">Public Maps Review</CardDescription>
          </div>
          <Button onClick={fetchPublicMaps} className="neo-button rounded-xl text-[10px] font-black uppercase tracking-widest px-6">
            Refresh Stream
          </Button>
        </div>
      </CardHeader>
      <Table>
        <TableHeader className="bg-transparent text-zinc-500">
          <TableRow className="border-white/[0.02] hover:bg-transparent">
            <TableHead className="text-[10px] font-black uppercase tracking-widest px-8">Map Title</TableHead>
            <TableHead className="text-[10px] font-black uppercase tracking-widest">Origin</TableHead>
            <TableHead className="text-[10px] font-black uppercase tracking-widest">Nodes</TableHead>
            <TableHead className="text-[10px] font-black uppercase tracking-widest">Date Shared</TableHead>
            <TableHead className="text-right text-[10px] font-black uppercase tracking-widest px-8">Control</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {maps.map((map) => (
            <TableRow key={map.id} className="border-white/[0.02] hover:bg-white/[0.02] transition-colors group">
              <TableCell className="font-bold tracking-tight text-white py-5 px-8">
                <span title={map.title || map.topic || 'Untitled'}>
                  {map.shortTitle || ((map.title || map.topic || 'Untitled').length > 30 ? (map.title || map.topic || 'Untitled').substring(0, 30).trim() + '...' : (map.title || map.topic || 'Untitled'))}
                </span>
                {map.isFeatured && <Badge className="ml-3 bg-primary/20 text-primary border-none text-[8px] px-2 py-0.5 rounded-full font-black uppercase tracking-tighter">Prime</Badge>}
              </TableCell>
              <TableCell className="text-zinc-500 text-[10px] font-mono">{map.originalAuthorId || map.userId}</TableCell>
              <TableCell>
                <Badge className="neo-concave border-none px-3 py-1 text-primary font-bold">{map.nodeCount || 0}</Badge>
              </TableCell>
              <TableCell className="text-zinc-600 text-xs font-medium">
                {map.timestamp ? formatDistanceToNow(toDate(map.timestamp), { addSuffix: true }) : 'Unknown Date'}
              </TableCell>
              <TableCell className="text-right space-x-3 px-8">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="neo-button h-9 w-9 text-zinc-600 hover:text-white"
                  onClick={() => window.open(`/map/${map.id}`, '_blank')}
                >
                  <Eye className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="neo-button h-9 w-9 text-emerald-500/60 hover:text-emerald-400">
                  <CheckCircle className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="neo-button h-9 w-9 text-destructive/60 hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}

// Utility for colors
function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
