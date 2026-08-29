import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  Crown,
  Train,
  Car,
  Bus,
  Navigation,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Clock,
  MapPin,
  Users,
  MessageSquare,
  DollarSign,
  Leaf,
  ChevronRight,
  Lock,
  PhoneCall,
  Search,
  ExternalLink,
  Award,
  Zap,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';

// Multi-Modal Transit Scenarios Data
const TRANSIT_MODES = [
  {
    id: 'metro',
    title: 'Metro Commutes',
    icon: '🚇',
    routeTitle: 'Ghaziabad ➔ Connaught Place / Delhi',
    slogan: 'I’m taking the Red Line Metro from Ghaziabad to Connaught Place / Delhi at 5 PM — let’s go together!',
    color: 'from-sky-500/20 to-blue-600/10 border-sky-500/30 text-sky-400',
    accentBadge: 'bg-sky-500/10 text-sky-300 border-sky-500/30',
    distance: '24 km',
    duration: '45 mins',
    costNote: '₹40 Metro Token',
    co2Saved: '1.4 kg CO₂',
    departure: 'Today, 05:00 PM',
    origin: 'Shaheed Sthal (New Bus Adda) Metro',
    destination: 'Rajiv Chowk / New Delhi',
    stops: ['Hindon River Metro', 'Dilshad Garden', 'Kashmere Gate Interchange'],
    host: {
      name: 'Priyanshu Verma',
      badge: 'blue',
      branch: 'CSE, 3rd Year',
      trustScore: 96,
      avatar: 'PV',
    },
    companions: [
      { name: 'Ananya Sharma', badge: 'blue', role: 'Companion' },
      { name: 'Rohan Gupta', badge: 'blue', role: 'Companion' },
    ],
  },
  {
    id: 'train',
    title: 'Inter-City Trains',
    icon: '🚆',
    routeTitle: 'New Delhi / Ghaziabad ➔ Kanpur Central',
    slogan: 'I’m going home from Delhi to Kanpur on the Friday evening express train — let’s book together, share the auto to the station, and travel safely!',
    color: 'from-indigo-500/20 to-purple-600/10 border-indigo-500/30 text-indigo-400',
    accentBadge: 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30',
    distance: '435 km',
    duration: '4 hrs 45 mins',
    costNote: 'Vande Bharat / Express',
    co2Saved: '18.5 kg CO₂',
    departure: 'Friday, 06:20 PM',
    origin: 'New Delhi Railway Station (NDLS)',
    destination: 'Kanpur Central (CNB)',
    stops: ['Ghaziabad Jn.', 'Aligarh Jn.', 'Etawah Jn.'],
    host: {
      name: 'Lokesh Mishra',
      badge: 'blue',
      branch: 'IT, 4th Year',
      trustScore: 99,
      avatar: 'LM',
    },
    companions: [
      { name: 'Aarav Kumar', badge: 'blue', role: 'Companion' },
      { name: 'Utkarsh Singh', badge: 'blue', role: 'Companion' },
    ],
  },
  {
    id: 'cab',
    title: 'Cab & Auto Sharing',
    icon: '🚖',
    routeTitle: 'KIET Campus ➔ Anand Vihar ISBT / Railway Terminal',
    slogan: 'Heading to Anand Vihar ISBT or IGI Airport — let’s split an auto/cab from campus!',
    color: 'from-amber-500/20 to-orange-600/10 border-amber-500/30 text-amber-400',
    accentBadge: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
    distance: '28.4 km',
    duration: '38 mins',
    costNote: '₹88 / person (₹350 total)',
    co2Saved: '3.2 kg CO₂',
    departure: 'Tomorrow, 08:30 AM',
    origin: 'KIET Campus Main Gate 1',
    destination: 'Anand Vihar ISBT / Railway Terminal',
    stops: ['Muradnagar Canal', 'Mohan Nagar Flyover', 'Vaishali Metro'],
    host: {
      name: 'Siddharth Saxena',
      badge: 'blue',
      branch: 'ECE, 2nd Year',
      trustScore: 94,
      avatar: 'SS',
    },
    companions: [
      { name: 'Divyansh Tyagi', badge: 'blue', role: 'Companion' },
      { name: 'Kavita Roy', badge: 'blue', role: 'Companion' },
    ],
  },
  {
    id: 'bus',
    title: 'Bus & State Transit',
    icon: '🚌',
    routeTitle: 'Ghaziabad ISBT ➔ Meerut / Agra',
    slogan: 'Taking the express bus to Meerut / Agra for the weekend — travel together with fellow classmates!',
    color: 'from-emerald-500/20 to-teal-600/10 border-emerald-500/30 text-emerald-400',
    accentBadge: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
    distance: '55 km',
    duration: '1 hr 15 mins',
    costNote: '₹75 State Express',
    co2Saved: '2.8 kg CO₂',
    departure: 'Saturday, 09:00 AM',
    origin: 'Old Bus Stand, Ghaziabad',
    destination: 'Bhainsali Bus Stand, Meerut',
    stops: ['Modinagar Bus Stop', 'Partapur Flyover'],
    host: {
      name: 'Amitabh Sharma',
      badge: 'blue',
      branch: 'ME, 3rd Year',
      trustScore: 91,
      avatar: 'AS',
    },
    companions: [{ name: 'Deepak Joshi', badge: 'blue', role: 'Companion' }],
  },
];

// 4-Tier Verification Badges Data
const VERIFICATION_BADGES = [
  {
    tier: 'unverified',
    title: 'Unverified Student',
    tick: '🔴 Red Tick',
    badgeColor: 'border-rose-500/50 bg-rose-500/10 text-rose-300 shadow-rose-500/20',
    icon: ShieldAlert,
    statusText: 'Account Created, Email Pending',
    description: 'New registrant who has not yet verified their institutional email or student credentials.',
    permissions: [
      '❌ Cannot post trips',
      '❌ Cannot send join requests',
      '🔍 Read-only view of public campus schedules',
    ],
    howToEarn: 'Confirm the 6-digit OTP sent to your registered college email (@kiet.edu).',
  },
  {
    tier: 'id_pending',
    title: 'Student ID Under Review',
    tick: '🟡 Yellow Tick',
    badgeColor: 'border-amber-500/50 bg-amber-500/10 text-amber-300 shadow-amber-500/20',
    icon: AlertTriangle,
    statusText: 'Email Verified, ID Card Under Review',
    description: 'Institutional email confirmed. Physical Student ID card photo is uploaded and currently under moderation.',
    permissions: [
      '✅ Can browse and search all campus trips',
      '⚠️ Limited trip creation with verification warning',
      '⏳ Upgrades automatically to Blue Tick upon moderator approval',
    ],
    howToEarn: 'Upload a clear front-facing photo of your college ID card in the Verification Hub.',
  },
  {
    tier: 'verified',
    title: 'Verified College Student',
    tick: '🔵 Blue Tick',
    badgeColor: 'border-sky-500/50 bg-sky-500/10 text-sky-300 shadow-sky-500/20',
    icon: ShieldCheck,
    statusText: '100% Institutional Campus Verified',
    description: 'Fully verified student with confirmed institutional email (@kiet.edu) and approved College Student ID card.',
    permissions: [
      '✅ Schedule trips across Metro, Train, Bus & Cab',
      '✅ Accept & screen companion join requests',
      '✅ In-app direct & group messaging with classmates',
      '✅ Build Trust Score & earn peer reviews',
    ],
    howToEarn: 'Admin approval of uploaded Student ID Card with matching college enrollment roll number.',
  },
  {
    tier: 'admin',
    title: 'Campus Admin & Safety Team',
    tick: '👑 Golden Tick',
    badgeColor: 'border-yellow-400/60 bg-yellow-400/10 text-yellow-300 shadow-yellow-400/20',
    icon: Crown,
    statusText: 'Campus Authority & Safety Dispatch',
    description: 'Authorized college administration, campus security, and safety moderation commanders.',
    permissions: [
      '🛡️ Real-time live journey oversight & audit logs',
      '🚨 Instant emergency SOS dispatch receiver',
      '⚖️ Review ID submissions & user report resolution',
      '📊 Campus travel corridor demand analytics',
    ],
    howToEarn: 'Designated campus administration and verified faculty safety leads.',
  },
];

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();

  const [activeTransitMode, setActiveTransitMode] = useState<string>('metro');
  const [selectedBadge, setSelectedBadge] = useState<string>('verified');

  // Calculator State
  const [calcDistance, setCalcDistance] = useState<number>(30);
  const [calcCompanions, setCalcCompanions] = useState<number>(3);

  const monthlySavings = Math.round((calcDistance * 12 * 22 * (calcCompanions - 1)) / calcCompanions);
  const monthlyCo2Saved = ((calcDistance * 0.12 * 22 * (calcCompanions - 1)) / calcCompanions).toFixed(1);

  const currentModeData = TRANSIT_MODES.find((m) => m.id === activeTransitMode) || TRANSIT_MODES[0];
  const activeBadgeData = VERIFICATION_BADGES.find((b) => b.tier === selectedBadge) || VERIFICATION_BADGES[2];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-indigo-500 selection:text-white font-sans">
      {/* 🌟 1. Top Glassmorphic Navigation Bar */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-slate-950/80 border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-sky-500 to-emerald-400 p-0.5 shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform">
                <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                  <Navigation className="w-5 h-5 text-sky-400 -rotate-45" />
                </div>
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-black tracking-tight text-white flex items-center gap-1.5">
                  RouteMate
                  <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    Campus
                  </span>
                </span>
                <span className="text-[10px] text-slate-400 font-medium">Safe Travel Companion Network</span>
              </div>
            </Link>
          </div>

          {/* Center Links */}
          <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-slate-300">
            <a href="#modes" className="hover:text-sky-400 transition-colors">
              🚇 Travel Modes
            </a>
            <a href="#badges" className="hover:text-emerald-400 transition-colors">
              🎖️ 4-Tier Badges
            </a>
            <a href="#safety-proof" className="hover:text-rose-400 transition-colors">
              🛡️ Digital Safety Proof
            </a>
            <a href="#features" className="hover:text-indigo-400 transition-colors">
              ⚡ Platform Features
            </a>
            <a href="#calculator" className="hover:text-amber-400 transition-colors">
              💰 Savings Calculator
            </a>
          </nav>

          {/* Right Actions */}
          <div className="flex items-center gap-2.5">
            {isAuthenticated ? (
              <Button
                variant="primary"
                size="sm"
                onClick={() => navigate('/dashboard')}
                rightIcon={<ArrowRight className="w-4 h-4" />}
                className="shadow-lg shadow-indigo-600/30"
              >
                Go to Dashboard
              </Button>
            ) : (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/login')}
                  className="text-slate-300 hover:text-white"
                >
                  Student Sign In
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => navigate('/register')}
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                  className="shadow-lg shadow-indigo-600/30"
                >
                  Join with College Email
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* 🚀 2. Hero Section: The Safety Promise */}
      <section className="relative pt-12 pb-20 overflow-hidden">
        {/* Ambient Glow Orbs */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[350px] bg-gradient-to-tr from-indigo-600/20 via-sky-500/20 to-emerald-500/10 blur-[130px] pointer-events-none rounded-full" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-4xl mx-auto space-y-5">
            {/* Status Pill */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/90 border border-slate-700/80 shadow-lg text-xs font-semibold text-slate-300 backdrop-blur-md animate-in fade-in duration-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Official Campus Peer Network</span>
              <span className="text-slate-600">•</span>
              <span className="text-indigo-400 font-medium">KIET & Delhi-NCR Verified</span>
            </div>

            {/* Main Punchy Slogan Heading */}
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white leading-tight sm:leading-none">
              Never Journey Alone. <br />
              <span className="bg-gradient-to-r from-sky-400 via-indigo-300 to-emerald-400 bg-clip-text text-transparent">
                Find Trusted College Mates
              </span>{' '}
              for Every Metro, Train, Bus & Cab Ride.
            </h1>

            {/* Core Subtitle */}
            <p className="text-base sm:text-lg text-slate-300 max-w-3xl mx-auto leading-relaxed">
              Traveling from <strong className="text-sky-300 font-bold">Ghaziabad to Delhi via Metro</strong>? Heading home to{' '}
              <strong className="text-indigo-300 font-bold">Kanpur by Train for the weekend</strong>? Post your journey on RouteMate, find
              verified classmates traveling the same route, and travel together safely with{' '}
              <strong className="text-emerald-300 font-bold">permanent digital safety proof</strong>.
            </p>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <Button
                variant="primary"
                size="lg"
                onClick={() => navigate('/register')}
                rightIcon={<ArrowRight className="w-5 h-5" />}
                className="text-sm font-bold shadow-xl shadow-indigo-600/30 px-6 py-3"
              >
                Create Verified Student Account
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={() => navigate('/trips')}
                leftIcon={<Search className="w-4 h-4 text-sky-400" />}
                className="text-sm font-semibold border-slate-700 bg-slate-900/60 hover:bg-slate-800 text-slate-200"
              >
                Explore Active Campus Trips
              </Button>
            </div>

            {/* Quick Trust Highlights */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-6 text-xs text-slate-400 font-medium max-w-3xl mx-auto">
              <div className="flex items-center justify-center gap-1.5 p-2 rounded-xl bg-slate-900/60 border border-slate-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Strict @kiet.edu IDs</span>
              </div>
              <div className="flex items-center justify-center gap-1.5 p-2 rounded-xl bg-slate-900/60 border border-slate-800">
                <ShieldCheck className="w-4 h-4 text-sky-400 shrink-0" />
                <span>Blue Tick Verified ID</span>
              </div>
              <div className="flex items-center justify-center gap-1.5 p-2 rounded-xl bg-slate-900/60 border border-slate-800">
                <Lock className="w-4 h-4 text-indigo-400 shrink-0" />
                <span>Recorded Safety Logs</span>
              </div>
              <div className="flex items-center justify-center gap-1.5 p-2 rounded-xl bg-slate-900/60 border border-slate-800">
                <PhoneCall className="w-4 h-4 text-rose-400 shrink-0" />
                <span>1-Tap Emergency SOS</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 🚇 3. Multi-Modal Transit Explorer: All Ways College Students Travel */}
      <section id="modes" className="py-16 bg-slate-900/50 border-y border-slate-800/80 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-10 space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-sky-400">
              Not Just Carpools — Multi-Modal Companionship
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-white">
              Every Commute You Take from Campus, Covered.
            </h2>
            <p className="text-sm text-slate-400">
              Whether you are taking public transit, an inter-city express train, or sharing a cab — connect with verified batchmates before you leave.
            </p>
          </div>

          {/* Interactive Mode Selector Tabs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-8 max-w-4xl mx-auto">
            {TRANSIT_MODES.map((mode) => (
              <button
                key={mode.id}
                onClick={() => setActiveTransitMode(mode.id)}
                className={`p-3.5 rounded-2xl border text-left transition-all flex flex-col gap-1 active:scale-95 ${
                  activeTransitMode === mode.id
                    ? 'bg-slate-800 border-indigo-500 shadow-xl shadow-indigo-500/10 ring-1 ring-indigo-500/50'
                    : 'bg-slate-900/80 border-slate-800 hover:bg-slate-800/60 text-slate-400'
                }`}
              >
                <div className="text-2xl mb-1">{mode.icon}</div>
                <span className={`text-xs font-bold ${activeTransitMode === mode.id ? 'text-white' : 'text-slate-300'}`}>
                  {mode.title}
                </span>
                <span className="text-[10px] text-slate-500 truncate">{mode.routeTitle}</span>
              </button>
            ))}
          </div>

          {/* Dynamic Scenario Live Preview Card */}
          <div className={`p-6 sm:p-8 rounded-3xl border bg-gradient-to-br ${currentModeData.color} max-w-4xl mx-auto shadow-2xl backdrop-blur-xl animate-in fade-in duration-300`}>
            {/* Top Quote Callout */}
            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 mb-6 flex items-start gap-3">
              <div className="text-2xl shrink-0">{currentModeData.icon}</div>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                  Real Student Journey Scenario
                </span>
                <p className="text-sm font-semibold text-slate-100 italic">
                  "{currentModeData.slogan}"
                </p>
              </div>
            </div>

            {/* Route & Companions Breakdown Grid */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
              {/* Left Column: Route Milestones (7 cols) */}
              <div className="md:col-span-7 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div>
                    <span className="text-xs font-bold text-slate-200 block">{currentModeData.routeTitle}</span>
                    <span className="text-[11px] text-slate-400">{currentModeData.departure}</span>
                  </div>
                  <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${currentModeData.accentBadge}`}>
                    {currentModeData.costNote}
                  </span>
                </div>

                {/* Milestone Stepper */}
                <div className="space-y-3 relative pl-6 border-l-2 border-slate-800 ml-2">
                  {/* Origin */}
                  <div className="relative">
                    <div className="absolute -left-[31px] top-0.5 w-4 h-4 rounded-full bg-emerald-500 border-2 border-slate-950" />
                    <span className="text-[10px] uppercase font-bold text-emerald-400 block">Origin Departure</span>
                    <span className="text-xs font-semibold text-slate-200">{currentModeData.origin}</span>
                  </div>

                  {/* Intermediate Pickup Gates */}
                  <div className="relative">
                    <div className="absolute -left-[29px] top-0.5 w-3 h-3 rounded-full bg-sky-400 border border-slate-950" />
                    <span className="text-[10px] uppercase font-bold text-sky-400 block">Intermediate Pickup Stops</span>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {currentModeData.stops.map((stop, i) => (
                        <span key={i} className="text-[10px] px-2 py-0.5 rounded bg-slate-900/90 text-slate-300 border border-slate-800">
                          📍 {stop}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Destination */}
                  <div className="relative">
                    <div className="absolute -left-[31px] top-0.5 w-4 h-4 rounded-full bg-rose-500 border-2 border-slate-950" />
                    <span className="text-[10px] uppercase font-bold text-rose-400 block">Final Destination</span>
                    <span className="text-xs font-semibold text-slate-200">{currentModeData.destination}</span>
                  </div>
                </div>

                {/* Route Metrics Pill */}
                <div className="flex items-center gap-4 pt-2 text-xs text-slate-400 font-medium">
                  <span>🛣️ <strong>{currentModeData.distance}</strong></span>
                  <span>⏱️ <strong>{currentModeData.duration}</strong></span>
                  <span>🌱 <strong className="text-emerald-400">{currentModeData.co2Saved}</strong> saved</span>
                </div>
              </div>

              {/* Right Column: Verified Companions & Safety Log (5 cols) */}
              <div className="md:col-span-5 p-4 rounded-2xl bg-slate-950/90 border border-slate-800 space-y-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Verified Trip Companions
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    3 Seats Locked
                  </span>
                </div>

                {/* Host Profile */}
                <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white font-bold text-xs flex items-center justify-center">
                      {currentModeData.host.avatar}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-white">{currentModeData.host.name}</span>
                        <span title="Blue Tick Verified"><ShieldCheck className="w-3.5 h-3.5 text-sky-400" /></span>
                      </div>
                      <span className="text-[10px] text-slate-400">{currentModeData.host.branch}</span>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-400">Host (★ {currentModeData.host.trustScore}%)</span>
                </div>

                {/* Accepted Classmates */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-semibold text-slate-400 block">Accepted Traveling Peers:</span>
                  {currentModeData.companions.map((comp, idx) => (
                    <div key={idx} className="px-2.5 py-1.5 rounded-lg bg-slate-900/60 border border-slate-800/80 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <ShieldCheck className="w-3 h-3 text-sky-400" />
                        <span className="font-medium text-slate-200">{comp.name}</span>
                      </div>
                      <span className="text-[10px] text-sky-300">{comp.role}</span>
                    </div>
                  ))}
                </div>

                <div className="pt-2 border-t border-slate-800/80 flex items-center gap-1.5 text-[11px] text-emerald-400 font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Logged in Campus Audit Trail</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 🎖️ 4. The 4-Tier Verification & Trust Badge Chamber */}
      <section id="badges" className="py-20 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12 space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
              Zero Strangers • 100% Institutional Verification
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-white">
              The 4-Tier Campus Trust Badge System
            </h2>
            <p className="text-sm text-slate-400">
              Every single user on RouteMate carries an authentic, verified trust badge so you know exactly who you are riding with.
            </p>
          </div>

          {/* 4 Interactive Badge Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {VERIFICATION_BADGES.map((badge) => {
              const IconComponent = badge.icon;
              const isSelected = selectedBadge === badge.tier;
              return (
                <div
                  key={badge.tier}
                  onClick={() => setSelectedBadge(badge.tier)}
                  className={`p-5 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between ${
                    isSelected
                      ? `${badge.badgeColor} ring-2 ring-indigo-500/50 scale-[1.02] shadow-2xl`
                      : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 text-slate-300'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="p-2 rounded-xl bg-slate-950/80 border border-slate-800">
                        <IconComponent className="w-5 h-5" />
                      </div>
                      <span className="text-xs font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-950/90 border border-slate-800">
                        {badge.tick}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-white mb-1">{badge.title}</h3>
                    <span className="text-[11px] font-semibold text-slate-400 block mb-2">{badge.statusText}</span>
                    <p className="text-xs text-slate-300 leading-relaxed mb-4">{badge.description}</p>
                  </div>

                  <div className="pt-3 border-t border-slate-800/80 space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Permissions:</span>
                    {badge.permissions.map((perm, i) => (
                      <span key={i} className="text-[11px] text-slate-300 block">{perm}</span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Selected Badge Deep-Dive Detail Card */}
          <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 max-w-3xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 text-sky-400">
                <Award className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs font-bold text-white block">
                  How to earn the {activeBadgeData.title} ({activeBadgeData.tick})
                </span>
                <span className="text-xs text-slate-400">{activeBadgeData.howToEarn}</span>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/register')}
              rightIcon={<ChevronRight className="w-4 h-4" />}
              className="shrink-0 border-slate-700 bg-slate-800"
            >
              Get Verified
            </Button>
          </div>
        </div>
      </section>

      {/* 🛡️ 5. The "Digital Safety Proof & Travel Audit Trail" Chamber */}
      <section id="safety-proof" className="py-16 bg-slate-900/50 border-y border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12 space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-400">
              Total Accountability • Peace of Mind for Parents & Students
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-white">
              Permanent Digital Safety Proof for Every Trip
            </h2>
            <p className="text-sm text-slate-400">
              Why RouteMate is fundamentally safer than hailing random cabs or taking trains alone.
            </p>
          </div>

          {/* 4-Pillar Safety Diagram Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="p-6 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-bold">
                01
              </div>
              <h3 className="text-base font-bold text-white">Identity Locked</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Only students with confirmed institutional emails (@kiet.edu) and approved college ID cards can join or schedule rides.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-sky-500/10 text-sky-400 flex items-center justify-center font-bold">
                02
              </div>
              <h3 className="text-base font-bold text-white">Recorded Companion Log</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Every companion's name, roll number, department, vehicle type, and scheduled departure timestamp is permanently logged in the database.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold">
                03
              </div>
              <h3 className="text-base font-bold text-white">Indisputable Proof</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                If anything unexpected happens during travel, you and your family have permanent proof of exactly who you traveled with.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center font-bold">
                04
              </div>
              <h3 className="text-base font-bold text-white">1-Tap Emergency SOS</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Instant emergency trigger dispatches your live GPS coordinates and companion list via SMS directly to your emergency contacts.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ⚡ 6. Complete Platform Feature Matrix */}
      <section id="features" className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14 space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
              Production-Grade Mobility Tech
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-white">
              Every Feature Engineered for College Mobility
            </h2>
            <p className="text-sm text-slate-400">
              From high-contrast dual-engine maps to encrypted in-app coordination.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Feature 1: Dual-Engine Route Radar */}
            <div className="p-6 rounded-3xl bg-slate-900/70 border border-slate-800 space-y-4">
              <div className="p-3 rounded-2xl bg-sky-500/10 text-sky-400 w-fit">
                <Navigation className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Dual-Engine Route Radar</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Toggle seamlessly between Google Maps and OpenStreetMap with Dark & Satellite views. Add intermediate metro/highway pickup gates with 3D glossy pushpin markers.
              </p>
              <div className="flex flex-wrap gap-1.5 pt-2">
                <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-sky-300 font-medium">Google Maps API</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-emerald-300 font-medium">OSRM Highway Routing</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-indigo-300 font-medium">3D Pushpins</span>
              </div>
            </div>

            {/* Feature 2: 6-Factor AI Smart Match */}
            <div className="p-6 rounded-3xl bg-slate-900/70 border border-slate-800 space-y-4">
              <div className="p-3 rounded-2xl bg-indigo-500/10 text-indigo-400 w-fit">
                <Sparkles className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">6-Factor AI Smart Match</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Matches travel companions based on route overlap %, departure time tolerance, gender safety preferences, and conversational style (Quiet vs Chatty).
              </p>
              <div className="flex flex-wrap gap-1.5 pt-2">
                <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-indigo-300 font-medium">98% Match Affinity</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-purple-300 font-medium">Girls-Only Filter</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-sky-300 font-medium">Vibe Sync</span>
              </div>
            </div>

            {/* Feature 3: In-App Messaging & Groups */}
            <div className="p-6 rounded-3xl bg-slate-900/70 border border-slate-800 space-y-4">
              <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-400 w-fit">
                <MessageSquare className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Private In-App Coordination</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Direct messaging and auto-generated trip group chats for live coordination without exposing private personal phone numbers.
              </p>
              <div className="flex flex-wrap gap-1.5 pt-2">
                <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-emerald-300 font-medium">Socket.IO WebSockets</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-sky-300 font-medium">Auto Group Chats</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-amber-300 font-medium">Privacy Preserved</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 💰 7. Interactive Fair Fare & Carbon Savings Calculator */}
      <section id="calculator" className="py-16 bg-slate-900/50 border-y border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-10 space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
              Fair Fare Cost Splitting & Eco Savings
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-white">
              Estimate Your Monthly Travel Savings
            </h2>
            <p className="text-sm text-slate-400">
              See how much money you save on daily cab or auto commutes by traveling together.
            </p>
          </div>

          <div className="max-w-3xl mx-auto p-6 sm:p-8 rounded-3xl bg-slate-950 border border-slate-800 shadow-2xl">
            <div className="space-y-6">
              {/* Distance Slider */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-slate-300">One-Way Commute Distance:</span>
                  <span className="text-sky-400 text-sm font-black">{calcDistance} km</span>
                </div>
                <input
                  type="range"
                  min={5}
                  max={80}
                  step={5}
                  value={calcDistance}
                  onChange={(e) => setCalcDistance(Number(e.target.value))}
                  className="w-full accent-sky-500 cursor-pointer h-2 bg-slate-800 rounded-lg"
                />
              </div>

              {/* Companions Count Slider */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-slate-300">Total Travel Companions:</span>
                  <span className="text-indigo-400 text-sm font-black">{calcCompanions} Students</span>
                </div>
                <input
                  type="range"
                  min={2}
                  max={5}
                  step={1}
                  value={calcCompanions}
                  onChange={(e) => setCalcCompanions(Number(e.target.value))}
                  className="w-full accent-indigo-500 cursor-pointer h-2 bg-slate-800 rounded-lg"
                />
              </div>

              {/* Output Result Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-800">
                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-center space-y-1">
                  <span className="text-xs text-emerald-300 font-semibold uppercase tracking-wider block">
                    Estimated Monthly Money Saved
                  </span>
                  <div className="text-3xl font-black text-emerald-400">
                    ₹{monthlySavings.toLocaleString()}
                  </div>
                  <span className="text-[10px] text-slate-400">Based on regular shared commutes</span>
                </div>

                <div className="p-4 rounded-2xl bg-sky-500/10 border border-sky-500/30 text-center space-y-1">
                  <span className="text-xs text-sky-300 font-semibold uppercase tracking-wider block">
                    Estimated CO₂ Reduced
                  </span>
                  <div className="text-3xl font-black text-sky-400">
                    ~{monthlyCo2Saved} kg
                  </div>
                  <span className="text-[10px] text-slate-400">Carbon emissions avoided by pooling</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 📊 8. Live Campus Impact Numbers */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 text-center">
            <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-1">
              <span className="text-3xl sm:text-4xl font-black text-sky-400">500+</span>
              <span className="text-xs text-slate-400 block font-medium">Campus Commutes Coordinated</span>
            </div>
            <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-1">
              <span className="text-3xl sm:text-4xl font-black text-emerald-400">₹1,50,000+</span>
              <span className="text-xs text-slate-400 block font-medium">Student Travel Expenses Saved</span>
            </div>
            <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-1">
              <span className="text-3xl sm:text-4xl font-black text-indigo-400">4.2 Tons</span>
              <span className="text-xs text-slate-400 block font-medium">CO₂ Carbon Footprint Prevented</span>
            </div>
            <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-1">
              <span className="text-3xl sm:text-4xl font-black text-amber-400">100%</span>
              <span className="text-xs text-slate-400 block font-medium">Institutional Verified Students</span>
            </div>
          </div>
        </div>
      </section>

      {/* 🚀 9. Bottom CTA Section */}
      <section className="py-20 relative overflow-hidden">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <div className="p-10 sm:p-14 rounded-3xl bg-gradient-to-tr from-indigo-950 via-slate-900 to-slate-950 border border-indigo-500/40 shadow-2xl shadow-indigo-600/20 space-y-6">
            <div className="inline-flex p-3 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
              <Navigation className="w-8 h-8 -rotate-45" />
            </div>

            <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
              Ready to Upgrade Your Daily Campus Commute?
            </h2>
            <p className="text-sm sm:text-base text-slate-300 max-w-2xl mx-auto">
              Join your fellow students at KIET and Delhi-NCR. Travel safe, travel verified, and never journey alone again.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <Button
                variant="primary"
                size="lg"
                onClick={() => navigate('/register')}
                rightIcon={<ArrowRight className="w-5 h-5" />}
                className="text-sm font-bold shadow-xl shadow-indigo-600/30 px-8 py-3.5"
              >
                Join RouteMate Free
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={() => navigate('/login')}
                className="text-sm font-semibold border-slate-700 bg-slate-900 text-slate-200"
              >
                Sign In to Account
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* 📜 10. Footer */}
      <footer className="border-t border-slate-800/80 py-10 bg-slate-950 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-300">RouteMate</span>
            <span>•</span>
            <span>Intelligent Campus Mobility & Travel Companion Network</span>
          </div>

          <div className="flex items-center gap-6">
            <Link to="/login" className="hover:text-slate-300 transition-colors">
              Student Login
            </Link>
            <Link to="/register" className="hover:text-slate-300 transition-colors">
              Register
            </Link>
            <Link to="/safety" className="hover:text-slate-300 transition-colors">
              Safety Protocol
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
};
