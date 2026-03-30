import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Pill, 
  Plus, 
  Trash2, 
  AlertTriangle, 
  Info, 
  CheckCircle2, 
  AlertCircle,
  Loader2,
  Search,
  Stethoscope,
  ShieldAlert,
  Home,
  Database,
  FlaskConical,
  Bookmark,
  Settings,
  HelpCircle,
  LogOut,
  Bell,
  User,
  Heart,
  ChevronRight,
  Zap,
  Activity,
  ArrowLeft,
  Download,
  FileText
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { analyzeDrugs, searchDrugs } from './services/api';
import { analyzeInteractions } from './services/geminiService';
import { cn } from './lib/utils';
import { Severity, Interaction, InteractionResult as AnalysisResult, HistoryEntry } from './types';
import { 
  auth, 
  db, 
  googleProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged, 
  collection, 
  addDoc, 
  deleteDoc, 
  doc, 
  query, 
  orderBy, 
  where, 
  onSnapshot,
  getDocFromServer,
  User as FirebaseUser
} from './firebase';

// Error Handling Spec for Firestore Operations
enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Error Boundary Component
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean, error: any }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      let message = "Something went wrong.";
      try {
        const parsed = JSON.parse(this.state.error.message);
        if (parsed.error) message = `Error: ${parsed.error}`;
      } catch (e) {
        message = this.state.error.message || message;
      }
      return (
        <div className="min-h-screen bg-bg-dark flex items-center justify-center p-8">
          <div className="glass-card p-8 max-w-md text-center space-y-6">
            <AlertTriangle className="w-16 h-16 text-red-500 mx-auto" />
            <h2 className="text-2xl font-bold">Application Error</h2>
            <p className="text-gray-400">{message}</p>
            <button 
              onClick={() => window.location.reload()}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-500 transition-all"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <MainApp />
    </ErrorBoundary>
  );
}

function MainApp() {
  const [drugs, setDrugs] = useState<string[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<'dashboard' | 'results' | 'lookup' | 'labs' | 'history'>('dashboard');
  const [activeTab, setActiveTab] = useState('Home');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!isAuthReady || !user) {
      setHistory([]);
      return;
    }

    const q = query(
      collection(db, 'history'),
      where('uid', '==', user.uid),
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const entries: HistoryEntry[] = [];
      snapshot.forEach((doc) => {
        entries.push({ id: doc.id, ...doc.data() } as HistoryEntry);
      });
      setHistory(entries);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'history');
    });

    return () => unsubscribe();
  }, [isAuthReady, user]);

  // Test connection to Firestore
  useEffect(() => {
    async function testConnection() {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if(error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration. ");
        }
      }
    }
    testConnection();
  }, []);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      console.error("Login Error:", err);
      setError("Failed to sign in. Please try again.");
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setView('dashboard');
      setActiveTab('Home');
    } catch (err) {
      console.error("Logout Error:", err);
    }
  };

  const saveToHistory = async (drugs: string[], result: AnalysisResult) => {
    if (!user) return;
    
    const path = 'history';
    try {
      await addDoc(collection(db, path), {
        uid: user.uid,
        timestamp: Date.now(),
        drugs,
        result
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  };

  const deleteHistoryEntry = async (id: string) => {
    const path = `history/${id}`;
    try {
      await deleteDoc(doc(db, 'history', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  };

  const clearAllHistory = async () => {
    // For simplicity, we'll delete them one by one or just inform the user
    // Firestore doesn't have a "delete collection" on client side easily
    for (const entry of history) {
      await deleteHistoryEntry(entry.id);
    }
  };

  const exportHistoryToCSV = () => {
    if (history.length === 0) return;

    const headers = ['Date', 'Drugs', 'Severity', 'Description'];
    const rows = history.map(entry => [
      `"${new Date(entry.timestamp).toLocaleString()}"`,
      `"${entry.drugs.join('; ')}"`,
      `"${entry.result.severity}"`,
      `"${entry.result.description.replace(/"/g, '""')}"`
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `drug_interaction_history_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportReportToPDF = () => {
    if (!result) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Title
    doc.setFontSize(22);
    doc.setTextColor(30, 58, 138); // Blue-900
    doc.text('Clinical Drug Interaction Report', 14, 22);

    // Date
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 30);

    // Drugs Analyzed
    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.text('Medications Analyzed:', 14, 45);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(drugs.join(', '), 14, 53);
    doc.setFont('helvetica', 'normal');

    // Severity
    doc.setFontSize(14);
    doc.text('Overall Severity:', 14, 65);
    const severityColor = result.severity.toLowerCase().includes('high') ? [239, 68, 68] : 
                         result.severity.toLowerCase().includes('medium') ? [249, 115, 22] : [34, 197, 94];
    doc.setTextColor(severityColor[0], severityColor[1], severityColor[2]);
    doc.setFont('helvetica', 'bold');
    doc.text(`${result.severity.toUpperCase()} RISK`, 14, 73);
    doc.setFont('helvetica', 'normal');

    // Description
    doc.setTextColor(0);
    doc.setFontSize(14);
    doc.text('Clinical Summary:', 14, 85);
    doc.setFontSize(11);
    const splitDescription = doc.splitTextToSize(result.description, pageWidth - 28);
    doc.text(splitDescription, 14, 93);

    let currentY = 93 + (splitDescription.length * 5) + 10;

    // Interaction Table
    if (result.interactions.length > 0) {
      doc.setFontSize(14);
      doc.text('Interaction Details:', 14, currentY);
      currentY += 5;

      autoTable(doc, {
        startY: currentY,
        head: [['Drug A', 'Drug B', 'Severity', 'Description']],
        body: result.interactions.map(i => [i.drugA, i.drugB, i.severity, i.description]),
        theme: 'striped',
        headStyles: { fillColor: [37, 99, 235] },
        margin: { top: 10 },
      });
      
      currentY = (doc as any).lastAutoTable.finalY + 15;
    }

    // Patient Contraindications
    if (result.patientContraindications) {
      if (currentY > 240) { doc.addPage(); currentY = 20; }
      doc.setFontSize(14);
      doc.setTextColor(0);
      doc.text('Patient Population Considerations:', 14, currentY);
      currentY += 5;

      const contraData = [
        ['Elderly', result.patientContraindications.elderly.join(', ') || 'None identified'],
        ['Pregnant', result.patientContraindications.pregnant.join(', ') || 'None identified'],
        ['Renally Impaired', result.patientContraindications.renallyImpaired.join(', ') || 'None identified']
      ];

      autoTable(doc, {
        startY: currentY,
        head: [['Population', 'Contraindications / Risks']],
        body: contraData,
        theme: 'grid',
        headStyles: { fillColor: [107, 70, 193] }, // Purple
      });
    }

    doc.save(`drug_report_${drugs.join('_')}.pdf`);
  };

  useEffect(() => {
    const fetchSuggestions = async () => {
      if (input.trim().length > 1) {
        try {
          const data = await searchDrugs(input);
          setSuggestions(data);
          setShowSuggestions(true);
        } catch (err) {
          console.error("Search error:", err);
        }
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    };

    const timer = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(timer);
  }, [input]);

  const addDrug = (name?: string) => {
    const drugName = (name || input).trim();
    if (drugName && !drugs.includes(drugName)) {
      setDrugs([...drugs, drugName]);
      setInput('');
      setSuggestions([]);
      setShowSuggestions(false);
      setError(null);
    }
  };

  const removeDrug = (name: string) => {
    setDrugs(drugs.filter(d => d !== name));
  };

  const handleAnalyze = async () => {
    if (drugs.length < 2) {
      setError("Please add at least two medications to analyze potential interactions.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      // 1. Get rule-based interactions from backend
      const backendData = await analyzeDrugs(drugs);
      
      // 2. Get AI-powered analysis from Gemini
      const aiData = await analyzeInteractions(drugs);
      
      const analysisResult: AnalysisResult = {
        severity: aiData.severity,
        description: aiData.description,
        interactions: [
          ...backendData.interactions,
          ...aiData.interactions.filter(aiInter => 
            !backendData.interactions.some((beInter: any) => 
              (beInter.drugA === aiInter.drugA && beInter.drugB === aiInter.drugB) ||
              (beInter.drugA === aiInter.drugB && beInter.drugB === aiInter.drugA)
            )
          )
        ],
        sideEffects: aiData.sideEffects,
        alerts: aiData.alerts,
        alternatives: aiData.alternatives,
        problems: aiData.problems
      };

      setResult(analysisResult);
      saveToHistory(drugs, analysisResult);
      setView('results');
    } catch (err) {
      console.error("Analysis Error:", err);
      setError("An error occurred during analysis. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-bg-dark text-gray-100 font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-sidebar-dark border-r border-gray-800 flex flex-col fixed h-full z-20">
        <div className="p-6 flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-lg">
            <Stethoscope className="w-6 h-6 text-white" />
          </div>
          <span className="font-bold text-xl tracking-tight">Glacier Rx</span>
        </div>

        <div className="px-4 py-2">
          <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/10 mb-6">
            <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center">
              <Zap className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <div className="text-sm font-bold">Clinical AI</div>
              <div className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">Clinical Assistant</div>
            </div>
          </div>

          <nav className="space-y-1">
            <div 
              className={cn("sidebar-item", activeTab === 'Home' && "active")}
              onClick={() => { setActiveTab('Home'); setView('dashboard'); }}
            >
              <Home className="w-5 h-5" />
              <span className="font-medium">Home</span>
            </div>
            <div 
              className={cn("sidebar-item", activeTab === 'Drug Lookup' && "active")}
              onClick={() => { setActiveTab('Drug Lookup'); setView('lookup'); }}
            >
              <Database className="w-5 h-5" />
              <span className="font-medium">Drug Lookup</span>
            </div>
            <div 
              className={cn("sidebar-item", activeTab === 'Lab Results' && "active")}
              onClick={() => { setActiveTab('Lab Results'); setView('labs'); }}
            >
              <FlaskConical className="w-5 h-5" />
              <span className="font-medium">Lab Results</span>
            </div>
            <div 
              className={cn("sidebar-item", activeTab === 'History' && "active")}
              onClick={() => { setActiveTab('History'); setView('history'); }}
            >
              <Activity className="w-5 h-5" />
              <span className="font-medium">History</span>
            </div>
            <div className="sidebar-item">
              <Bookmark className="w-5 h-5" />
              <span className="font-medium">Saved Regimens</span>
            </div>
            <div className="sidebar-item">
              <Settings className="w-5 h-5" />
              <span className="font-medium">Settings</span>
            </div>
          </nav>

          <button 
            onClick={() => { setDrugs([]); setResult(null); setView('dashboard'); setActiveTab('Home'); }}
            className="w-full mt-8 py-3 bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            New Analysis
          </button>
        </div>

        <div className="mt-auto p-4 space-y-1">
          <div className="sidebar-item">
            <HelpCircle className="w-5 h-5" />
            <span className="font-medium">Support</span>
          </div>
          <div className="sidebar-item" onClick={user ? handleLogout : handleLogin}>
            {user ? <LogOut className="w-5 h-5" /> : <User className="w-5 h-5" />}
            <span className="font-medium">{user ? 'Logout' : 'Login'}</span>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-64 min-h-screen">
        {/* Top Bar */}
        <header className="h-20 border-b border-gray-800 flex items-center justify-between px-8 bg-bg-dark/80 backdrop-blur-md sticky top-0 z-100">
          <div className="flex items-center gap-4">
            <div className="text-sm font-bold text-blue-400 border-b-2 border-blue-400 pb-1 px-2">Dashboard</div>
            <div className="text-sm font-bold text-gray-500 hover:text-gray-300 transition-colors px-2">Interactions</div>
            <div className="text-sm font-bold text-gray-500 hover:text-gray-300 transition-colors px-2">Guidelines</div>
            <div 
              className={cn("text-sm font-bold transition-colors px-2 cursor-pointer", view === 'history' ? "text-blue-400 border-b-2 border-blue-400 pb-1" : "text-gray-500 hover:text-gray-300")}
              onClick={() => { setView('history'); setActiveTab('History'); }}
            >
              History
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input 
                type="text" 
                placeholder="Global search..." 
                className="bg-gray-900 border border-gray-800 rounded-full py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 w-64"
              />
            </div>
            <button className="text-gray-500 hover:text-white transition-colors relative">
              <Bell className="w-5 h-5" />
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full border-2 border-bg-dark"></span>
            </button>
            <div className="w-8 h-8 bg-gray-800 rounded-full flex items-center justify-center border border-gray-700 overflow-hidden">
              {user?.photoURL ? (
                <img src={user.photoURL} alt="User" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <User className="w-5 h-5 text-gray-400" />
              )}
            </div>
          </div>
        </header>

        <div className="p-8 max-w-7xl mx-auto">
          <AnimatePresence mode="wait">
            {view === 'dashboard' && (
              <motion.div
                key="dashboard"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-10"
              >
                {/* Hero Section */}
                <div className="space-y-4">
                  <h2 className="text-4xl font-bold tracking-tight">Precision Interaction Analysis</h2>
                  <p className="text-gray-400 max-w-2xl leading-relaxed">
                    Enter multiple medications or upload a patient regimen to detect contraindications, synergy, and adverse effects using real-time clinical data.
                  </p>
                </div>

                {/* Input Card */}
                <div className="glass-card p-8 bg-linear-to-br from-card-dark to-sidebar-dark relative">
                  <div className="text-[10px] font-bold text-blue-400 uppercase tracking-[0.2em] mb-4">Medication Input</div>
                  <div className="flex gap-4 relative">
                    <div className="relative flex-1">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
                        <Pill className="w-5 h-5" />
                      </div>
                      <input 
                        type="text" 
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && addDrug()}
                        onFocus={() => input.trim().length > 1 && setShowSuggestions(true)}
                        placeholder="e.g. Warfarin, Lisinopril, St. John's Wort..."
                        className="w-full bg-black/20 border border-white/10 rounded-xl py-4 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                      />
                      
                      {/* Suggestions Dropdown */}
                      <AnimatePresence>
                        {showSuggestions && suggestions.length > 0 && (
                          <motion.div 
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="absolute left-0 right-0 top-full mt-2 bg-border-dark border border-gray-700 rounded-xl shadow-2xl z-50 overflow-hidden"
                          >
                            {suggestions.map((suggestion, i) => (
                              <div 
                                key={i}
                                onClick={() => addDrug(suggestion)}
                                className="px-4 py-3 hover:bg-blue-600/20 cursor-pointer transition-colors flex items-center gap-3 border-b border-gray-800 last:border-0"
                              >
                                <Search className="w-4 h-4 text-gray-500" />
                                <span className="text-sm font-medium">{suggestion}</span>
                              </div>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                    <button 
                      onClick={handleAnalyze}
                      disabled={loading || drugs.length < 2}
                      className={cn(
                        "glow-button px-8 rounded-xl font-bold flex items-center gap-2 transition-all",
                        loading || drugs.length < 2 
                          ? "bg-gray-800 text-gray-500 cursor-not-allowed" 
                          : "bg-blue-500 text-white hover:bg-blue-400"
                      )}
                    >
                      {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Activity className="w-5 h-5" />}
                      Run Analysis
                    </button>
                  </div>

                  <div className="mt-6 flex flex-wrap items-center gap-3">
                    {drugs.map((drug) => (
                      <div key={drug} className="flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-500/30 rounded-lg text-sm font-medium text-blue-400 group">
                        {drug}
                        <button onClick={() => setDrugs(drugs.filter(d => d !== drug))} className="hover:text-red-400 transition-colors">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                    {drugs.length > 0 && (
                      <button 
                        onClick={() => setDrugs([])}
                        className="text-xs font-bold text-gray-500 hover:text-red-400 transition-colors uppercase tracking-wider ml-2"
                      >
                        Clear All
                      </button>
                    )}
                    <label className="text-xs text-gray-500 hover:text-gray-300 flex items-center gap-1 transition-colors ml-auto cursor-pointer">
                      <Plus className="w-3 h-3" />
                      Upload Regimen
                      <input type="file" className="hidden" />
                    </label>
                  </div>
                </div>

                {/* Grid Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                  {/* Recent Searches */}
                  <div className="lg:col-span-8 space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Activity className="w-5 h-5 text-blue-400" />
                        <h3 className="text-xl font-bold">Recent Searches</h3>
                      </div>
                      <button 
                        onClick={() => { setView('history'); setActiveTab('History'); }}
                        className="text-sm text-blue-400 hover:text-blue-300 font-medium"
                      >
                        View all
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {history.slice(0, 3).map((item, i) => (
                        <div 
                          key={item.id} 
                          className="glass-card p-6 hover:bg-white/5 transition-all cursor-pointer group" 
                          onClick={() => { setDrugs(item.drugs); setResult(item.result); setView('results'); }}
                        >
                          <div className="flex justify-between items-start mb-4">
                            <div className="w-10 h-10 bg-white/5 rounded-lg flex items-center justify-center">
                              <Pill className="w-5 h-5 text-gray-400" />
                            </div>
                            <span className="text-[10px] text-gray-500 font-medium">{new Date(item.timestamp).toLocaleDateString()}</span>
                          </div>
                          <h4 className="font-bold text-lg mb-1">{item.drugs.join(' + ')}</h4>
                          <p className="text-xs text-gray-500 mb-4 line-clamp-1">{item.result.description}</p>
                          <div className="flex items-center gap-2">
                            <div className={cn(
                              "status-dot", 
                              item.result.severity.toLowerCase().includes('high') ? "bg-red-500" :
                              item.result.severity.toLowerCase().includes('medium') ? "bg-orange-500" : "bg-green-500"
                            )}></div>
                            <span className={cn(
                              "text-[10px] font-black tracking-widest uppercase",
                              item.result.severity.toLowerCase().includes('high') ? "text-red-500" :
                              item.result.severity.toLowerCase().includes('medium') ? "text-orange-500" : "text-green-500"
                            )}>
                              {item.result.severity} RISK
                            </span>
                          </div>
                        </div>
                      ))}
                      
                      {history.length === 0 && (
                        <div className="glass-card p-6 border-dashed flex flex-col items-center justify-center text-gray-500 hover:text-gray-300 hover:bg-white/5 transition-all cursor-pointer" onClick={() => { setView('dashboard'); setInput(''); }}>
                          <div className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center mb-2">
                            <Plus className="w-5 h-5" />
                          </div>
                          <span className="text-xs font-bold">New Interaction Check</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Active Alerts */}
                  <div className="lg:col-span-4 space-y-6">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-red-500" />
                      <h3 className="text-xl font-bold">Active Alerts</h3>
                    </div>

                    <div className="glass-card p-6 space-y-4">
                      {[
                        { icon: ShieldAlert, color: "text-red-500", bg: "bg-red-500/10", title: "Critical: CYP3A4 Inhibition", desc: "Observed in Case #8829 regimen update." },
                        { icon: Bell, color: "text-yellow-500", bg: "bg-yellow-500/10", title: "Updated: FDA Black Box", desc: "New warnings for Fluoroquinolones." },
                        { icon: Info, color: "text-blue-500", bg: "bg-blue-500/10", title: "Guideline Update", desc: "ACC/AHA Hypertension 2024 V2." },
                      ].map((alert, i) => (
                        <div key={i} className="flex gap-4 p-4 rounded-xl bg-white/5 border border-white/5">
                          <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center shrink-0", alert.bg)}>
                            <alert.icon className={cn("w-5 h-5", alert.color)} />
                          </div>
                          <div>
                            <div className="text-sm font-bold mb-1">{alert.title}</div>
                            <div className="text-[11px] text-gray-500 leading-relaxed">{alert.desc}</div>
                          </div>
                        </div>
                      ))}
                      <button className="w-full py-2 text-xs text-gray-500 hover:text-gray-300 transition-colors">Clear all resolved alerts</button>
                    </div>

                    {/* System Capacity Widget */}
                    <div className="glass-card p-6">
                      <div className="flex justify-between items-center mb-4">
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">System Capacity</span>
                        <span className="text-sm font-bold text-blue-400">99.9%</span>
                      </div>
                      <div className="flex items-end gap-1.5 h-16 mb-4">
                        {[40, 60, 80, 50, 70, 90, 65, 55].map((h, i) => (
                          <div 
                            key={i} 
                            className={cn(
                              "flex-1 rounded-t-sm transition-all duration-500",
                              i === 5 ? "bg-blue-400 shadow-[0_0_15px_rgba(96,165,250,0.5)]" : "bg-blue-900/40"
                            )} 
                            style={{ height: `${h}%` }}
                          />
                        ))}
                      </div>
                      <div className="text-[10px] text-gray-500 text-center">Processing 1.4M molecular simulations/sec</div>
                    </div>
                  </div>
                </div>

                {/* Advanced Insights */}
                <div className="space-y-6">
                  <div className="flex items-center gap-2">
                    <Zap className="w-5 h-5 text-purple-400" />
                    <h3 className="text-xl font-bold">Advanced Insights</h3>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    <div className="lg:col-span-4 glass-card overflow-hidden relative group">
                      <img 
                        src="https://picsum.photos/seed/pills/800/600" 
                        alt="Pharmacogenomics" 
                        className="w-full h-full object-cover opacity-30 group-hover:scale-110 transition-transform duration-700"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-linear-to-t from-bg-dark via-transparent to-transparent p-8 flex flex-col justify-end">
                        <h4 className="text-2xl font-bold mb-2">Pharmacogenomics</h4>
                        <p className="text-sm text-gray-400">Genetic variance impact on dosage.</p>
                      </div>
                    </div>

                    <div className="lg:col-span-8 glass-card p-8 flex flex-col md:flex-row items-center gap-10">
                      <div className="relative w-40 h-40 shrink-0">
                        <svg className="w-full h-full" viewBox="0 0 100 100">
                          <circle cx="50" cy="50" r="45" fill="none" stroke="#1F2937" strokeWidth="8" />
                          <circle 
                            cx="50" cy="50" r="45" fill="none" stroke="#14B8A6" strokeWidth="8" 
                            strokeDasharray="282.7" strokeDashoffset={282.7 * (1 - 0.82)}
                            strokeLinecap="round"
                            className="transition-all duration-1000"
                          />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span className="text-4xl font-black">82%</span>
                          <div className="w-2 h-2 bg-teal-500 rounded-full mt-1"></div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="inline-block px-3 py-1 bg-purple-500/10 border border-purple-500/30 rounded-full text-[10px] font-bold text-purple-400 uppercase tracking-widest">
                          Knowledge Base Update
                        </div>
                        <h4 className="text-3xl font-bold">Artificial Intelligence V4.2 Core Deployment</h4>
                        <p className="text-gray-400 leading-relaxed">
                          We've integrated the latest clinical trial data from the NEJM regarding SGLT2 inhibitors and their impact on renal interaction profiles. Accuracy for multi-drug regimen prediction has improved by 14%.
                        </p>
                        <button className="text-blue-400 hover:text-blue-300 font-bold flex items-center gap-2 transition-colors">
                          Read full release notes <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {view === 'lookup' && (
              <motion.div
                key="lookup"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                <div className="space-y-4">
                  <h2 className="text-4xl font-bold tracking-tight">Clinical Drug Database</h2>
                  <p className="text-gray-400 max-w-2xl leading-relaxed">
                    Search our comprehensive database of over 150,000 medications, including generics, brand names, and herbal supplements.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {['Cardiology', 'Endocrinology', 'Neurology', 'Oncology', 'Pediatrics', 'Psychiatry'].map((cat) => (
                    <div key={cat} className="glass-card p-6 hover:bg-white/5 transition-all cursor-pointer">
                      <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center mb-4">
                        <Database className="w-6 h-6 text-blue-400" />
                      </div>
                      <h4 className="font-bold text-lg mb-1">{cat}</h4>
                      <p className="text-xs text-gray-500">Browse specialized medications and protocols.</p>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {view === 'labs' && (
              <motion.div
                key="labs"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                <div className="space-y-4">
                  <h2 className="text-4xl font-bold tracking-tight">Lab Result Integration</h2>
                  <p className="text-gray-400 max-w-2xl leading-relaxed">
                    Import patient lab data (Creatinine, Liver Enzymes, INR) to adjust interaction risk based on physiological status.
                  </p>
                </div>

                <div className="glass-card p-12 flex flex-col items-center justify-center text-center border-dashed">
                  <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4">
                    <FlaskConical className="w-8 h-8 text-gray-500" />
                  </div>
                  <h4 className="text-xl font-bold mb-2">No Lab Data Connected</h4>
                  <p className="text-sm text-gray-500 max-w-md mb-6">Connect to an EHR system or upload a PDF report to enable physiological risk adjustment.</p>
                  <button className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-500 transition-all">
                    Connect EHR
                  </button>
                </div>
              </motion.div>
            )}

            {view === 'history' && (
              <motion.div
                key="history"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <h2 className="text-4xl font-bold tracking-tight">Analysis History</h2>
                    <p className="text-gray-400 max-w-2xl leading-relaxed">
                      Review your previous drug interaction analyses and clinical reports.
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {history.length > 0 && (
                      <>
                        <button 
                          onClick={exportHistoryToCSV}
                          className="px-4 py-2 bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded-xl font-bold text-xs transition-all flex items-center gap-2"
                        >
                          <Download className="w-4 h-4" /> Export CSV
                        </button>
                        <button 
                          onClick={clearAllHistory}
                          className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-xl font-bold text-xs transition-all"
                        >
                          Clear All
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {history.length > 0 ? (
                  <div className="grid grid-cols-1 gap-4">
                    {history.map((entry) => (
                      <div 
                        key={entry.id} 
                        className="glass-card p-6 hover:bg-white/5 transition-all group flex flex-col md:flex-row md:items-center justify-between gap-6"
                      >
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "w-2 h-2 rounded-full",
                              entry.result.severity.toLowerCase().includes('high') ? "bg-red-500" :
                              entry.result.severity.toLowerCase().includes('medium') ? "bg-orange-500" : "bg-green-500"
                            )}></div>
                            <h4 className="font-bold text-lg">{entry.drugs.join(' + ')}</h4>
                            <span className="text-xs text-gray-500">{new Date(entry.timestamp).toLocaleString()}</span>
                          </div>
                          <p className="text-sm text-gray-400 line-clamp-1">{entry.result.description}</p>
                          <div className="flex gap-2">
                            {entry.drugs.map((d: string) => (
                              <span key={d} className="px-2 py-0.5 bg-blue-500/10 border border-blue-500/20 rounded text-[10px] text-blue-400">{d}</span>
                            ))}
                          </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <button 
                            onClick={() => { setResult(entry.result); setDrugs(entry.drugs); setView('results'); }}
                            className="px-4 py-2 bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded-xl font-bold text-xs transition-all flex items-center gap-2"
                          >
                            View Report
                          </button>
                          <button 
                            onClick={() => deleteHistoryEntry(entry.id)}
                            className="p-2 text-gray-500 hover:text-red-400 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="glass-card p-12 flex flex-col items-center justify-center text-center border-dashed">
                    <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4">
                      <Activity className="w-8 h-8 text-gray-500" />
                    </div>
                    <h4 className="text-xl font-bold mb-2">No History Found</h4>
                    <p className="text-sm text-gray-500 max-w-md mb-6">You haven't performed any drug interaction analyses yet. Start a new analysis to see it here.</p>
                    <button 
                      onClick={() => { setView('dashboard'); setActiveTab('Home'); }}
                      className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-500 transition-all"
                    >
                      Start Analysis
                    </button>
                  </div>
                )}
              </motion.div>
            )}

            {view === 'results' && result && (
              <motion.div
                key="results"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8 pb-20"
              >
                {/* Header Actions */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <button 
                    onClick={() => setView('dashboard')}
                    className="flex items-center gap-2 text-gray-400 hover:text-blue-400 font-bold transition-colors w-fit"
                  >
                    <ArrowLeft className="w-5 h-5" /> Back to Dashboard
                  </button>
                  <div className="flex items-center gap-3">
                    <button className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm font-bold transition-all flex items-center gap-2">
                      <Bookmark className="w-4 h-4" /> Save Report
                    </button>
                    <button 
                      onClick={exportReportToPDF}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-bold transition-all flex items-center gap-2 shadow-lg shadow-blue-500/20"
                    >
                      <FileText className="w-4 h-4" /> Export PDF
                    </button>
                  </div>
                </div>

                {/* Summary Hero */}
                <div className={cn(
                  "relative overflow-hidden p-8 md:p-12 rounded-4xl border-2 flex flex-col md:flex-row items-center gap-10 shadow-2xl",
                  result.severity.toLowerCase().includes('high') ? "bg-red-500/10 border-red-500/30 text-red-500" :
                  result.severity.toLowerCase().includes('medium') ? "bg-orange-500/10 border-orange-500/30 text-orange-500" :
                  "bg-green-500/10 border-green-500/30 text-green-500"
                )}>
                  {/* Background Decoration */}
                  <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/4 w-96 h-96 bg-current opacity-[0.03] rounded-full blur-3xl pointer-events-none"></div>
                  
                  <div className="relative z-10 p-8 bg-white/10 rounded-3xl backdrop-blur-sm border border-white/10 shrink-0">
                    <ShieldAlert className="w-16 h-16" />
                  </div>
                  
                  <div className="relative z-10 text-center md:text-left space-y-4">
                    <div className="inline-block px-4 py-1.5 bg-current/10 rounded-full text-xs font-black uppercase tracking-[0.2em]">
                      Clinical Analysis Result
                    </div>
                    <h3 className="text-4xl md:text-5xl font-black tracking-tight uppercase leading-none">
                      {result.severity} Risk Detected
                    </h3>
                    <p className="text-xl font-medium opacity-90 max-w-3xl leading-relaxed">
                      {result.description}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                  {/* Left Column: Interactions & Details */}
                  <div className="lg:col-span-8 space-y-8">
                    {/* Interaction Pairs */}
                    <section className="space-y-6">
                      <div className="flex items-center justify-between">
                        <h3 className="text-2xl font-bold flex items-center gap-3">
                          <div className="w-2 h-8 bg-blue-500 rounded-full"></div>
                          Interaction Pairs
                          <span className="text-sm font-medium text-gray-500 ml-2">({result.interactions.length} found)</span>
                        </h3>
                      </div>

                      {result.interactions.length > 0 ? (
                        <div className="space-y-4">
                          {result.interactions.map((inter, i) => (
                            <motion.div
                              key={i}
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: i * 0.1 }}
                              className="glass-card p-6 border-l-4 border-current hover:bg-white/5 transition-all group"
                              style={{ borderLeftColor: 
                                inter.severity.toLowerCase().includes('high') ? '#EF4444' : 
                                inter.severity.toLowerCase().includes('medium') ? '#F97316' : '#22C55E' 
                              }}
                            >
                              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                                <div className="flex items-center gap-3">
                                  <div className="px-4 py-2 bg-white/5 rounded-xl border border-white/10 font-bold text-gray-200">
                                    {inter.drugA}
                                  </div>
                                  <div className="w-8 h-0.5 bg-gray-800"></div>
                                  <div className="px-4 py-2 bg-white/5 rounded-xl border border-white/10 font-bold text-gray-200">
                                    {inter.drugB}
                                  </div>
                                </div>
                                <div className={cn(
                                  "px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border self-start md:self-auto",
                                  inter.severity.toLowerCase().includes('high') ? "bg-red-500/10 border-red-500/30 text-red-500" :
                                  inter.severity.toLowerCase().includes('medium') ? "bg-orange-500/10 border-orange-500/30 text-orange-500" :
                                  "bg-green-500/10 border-green-500/30 text-green-500"
                                )}>
                                  {inter.severity} Severity
                                </div>
                              </div>
                              <p className="text-gray-400 leading-relaxed mb-4">
                                {inter.description}
                              </p>
                              {inter.recommendation && (
                                <div className="p-4 bg-blue-500/5 rounded-xl border border-blue-500/10 flex gap-4">
                                  <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center shrink-0">
                                    <Info className="w-5 h-5 text-blue-400" />
                                  </div>
                                  <div>
                                    <div className="text-[10px] font-bold text-blue-400 uppercase tracking-wider mb-1">Clinical Recommendation</div>
                                    <p className="text-sm text-blue-200/80 leading-relaxed">{inter.recommendation}</p>
                                  </div>
                                </div>
                              )}
                            </motion.div>
                          ))}
                        </div>
                      ) : (
                        <div className="glass-card p-12 text-center space-y-4">
                          <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto">
                            <CheckCircle2 className="w-8 h-8 text-green-500" />
                          </div>
                          <h4 className="text-xl font-bold">No Direct Interactions Found</h4>
                          <p className="text-gray-500 max-w-md mx-auto">Our database doesn't show any major direct interactions between these medications, but always consult with a professional.</p>
                        </div>
                      )}
                    </section>

                    {/* Patient Population Contraindications */}
                    {result.patientContraindications && (
                      <section className="space-y-6">
                        <h3 className="text-2xl font-bold flex items-center gap-3">
                          <div className="w-2 h-8 bg-purple-500 rounded-full"></div>
                          Patient Population Contraindications
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          {[
                            { title: "Elderly", icon: User, color: "text-blue-400", data: result.patientContraindications.elderly },
                            { title: "Pregnant", icon: Heart, color: "text-pink-400", data: result.patientContraindications.pregnant },
                            { title: "Renally Impaired", icon: Activity, color: "text-orange-400", data: result.patientContraindications.renallyImpaired }
                          ].map((pop, i) => (
                            <div key={i} className="glass-card p-6 space-y-4">
                              <div className="flex items-center gap-3">
                                <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center bg-white/5", pop.color)}>
                                  <pop.icon className="w-5 h-5" />
                                </div>
                                <h4 className="font-bold">{pop.title}</h4>
                              </div>
                              <ul className="space-y-2">
                                {pop.data.length > 0 ? pop.data.map((item, idx) => (
                                  <li key={idx} className="text-xs text-gray-400 flex gap-2">
                                    <span className="text-blue-500 shrink-0">•</span>
                                    {item}
                                  </li>
                                )) : (
                                  <li className="text-xs text-gray-500 italic">No specific contraindications identified.</li>
                                )}
                              </ul>
                            </div>
                          ))}
                        </div>
                      </section>
                    )}

                    {/* Side Effects & Problems */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <section className="glass-card p-8 space-y-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-orange-500/20 rounded-xl flex items-center justify-center">
                            <AlertCircle className="w-6 h-6 text-orange-500" />
                          </div>
                          <h3 className="text-xl font-bold">Side Effects</h3>
                        </div>
                        <div className="space-y-3">
                          {result.sideEffects.map((effect, i) => (
                            <div key={i} className="flex items-start gap-3 p-3 bg-white/5 rounded-xl border border-white/5">
                              <div className="w-1.5 h-1.5 bg-orange-500 rounded-full mt-2 shrink-0" />
                              <span className="text-sm text-gray-300 leading-relaxed">{effect}</span>
                            </div>
                          ))}
                        </div>
                      </section>

                      <section className="glass-card p-8 space-y-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-purple-500/20 rounded-xl flex items-center justify-center">
                            <ShieldAlert className="w-6 h-6 text-purple-500" />
                          </div>
                          <h3 className="text-xl font-bold">Potential Risks</h3>
                        </div>
                        <div className="space-y-3">
                          {(result.problems || []).map((prob, i) => (
                            <div key={i} className="flex items-start gap-3 p-3 bg-white/5 rounded-xl border border-white/5">
                              <div className="w-1.5 h-1.5 bg-purple-500 rounded-full mt-2 shrink-0" />
                              <span className="text-sm text-gray-300 leading-relaxed">{prob}</span>
                            </div>
                          ))}
                        </div>
                      </section>
                    </div>
                  </div>

                  {/* Right Column: Alerts & Alternatives */}
                  <div className="lg:col-span-4 space-y-8">
                    {/* Critical Warnings */}
                    {result.alerts.length > 0 && (
                      <section className="relative overflow-hidden bg-red-500/10 p-8 rounded-4xl border-2 border-red-500/30 space-y-6">
                        <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/4 w-64 h-64 bg-red-500 opacity-[0.05] rounded-full blur-3xl pointer-events-none"></div>
                        
                        <div className="flex items-center gap-3 relative z-10">
                          <div className="w-10 h-10 bg-red-500 rounded-xl flex items-center justify-center shadow-lg shadow-red-500/20">
                            <AlertTriangle className="w-6 h-6 text-white" />
                          </div>
                          <h3 className="text-xl font-bold text-red-400">Critical Warnings</h3>
                        </div>
                        
                        <div className="space-y-4 relative z-10">
                          {result.alerts.map((alert, i) => (
                            <div key={i} className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl">
                              <p className="text-sm text-red-200 font-medium leading-relaxed">
                                {alert}
                              </p>
                            </div>
                          ))}
                        </div>
                      </section>
                    )}

                    {/* Safer Alternatives */}
                    <section className="bg-blue-600 p-8 rounded-4xl text-white shadow-2xl shadow-blue-500/20 space-y-6 relative overflow-hidden">
                      <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/4 w-64 h-64 bg-white opacity-[0.1] rounded-full blur-3xl pointer-events-none"></div>
                      
                      <div className="flex items-center gap-3 relative z-10">
                        <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                          <CheckCircle2 className="w-6 h-6 text-white" />
                        </div>
                        <h3 className="text-xl font-bold">Safer Alternatives</h3>
                      </div>
                      
                      <p className="text-sm text-blue-100/80 leading-relaxed relative z-10">
                        Consider discussing these alternatives with your physician if current risks are unacceptable.
                      </p>

                      <div className="flex flex-wrap gap-2 relative z-10">
                        {result.alternatives.map((alt, i) => (
                          <span key={i} className="px-4 py-2 bg-white/20 hover:bg-white/30 border border-white/30 rounded-xl text-xs font-black uppercase tracking-wider transition-colors cursor-default">
                            {alt}
                          </span>
                        ))}
                      </div>
                    </section>

                    {/* Disclaimer */}
                    <div className="p-6 bg-gray-900/50 rounded-2xl border border-gray-800 text-center">
                      <Info className="w-5 h-5 text-gray-500 mx-auto mb-3" />
                      <p className="text-[10px] text-gray-500 leading-relaxed uppercase tracking-widest font-bold">
                        Medical Disclaimer: This analysis is for informational purposes only and does not constitute medical advice. Always consult with a licensed healthcare professional.
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
