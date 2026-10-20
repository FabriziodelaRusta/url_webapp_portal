import React, { useState, useEffect, useMemo } from 'react';
import {
  Settings,
  ChevronRight,
  ChevronLeft,
  Plus,
  Trash2,
  Edit2,
  ExternalLink,
  Bike,
  Route,
  Mountain,
  Compass,
  Map as MapIcon,
  Tent,
  CloudSun,
  Wrench,
  Navigation2,
  Activity,
  Layers,
  FileCode,
  RotateCcw,
  Upload,
  Check,
  X,
  Eye,
  EyeOff,
  FolderOpen,
  Lock,
  Unlock,
  KeyRound,
  ShieldCheck,
  ShieldAlert,
  LogOut,
  Cloud,
  Database,
  RefreshCw,
  Copy,
  CheckCircle2,
  AlertCircle,
  FileText,
  Globe,
  Info,
  HelpCircle,
  Server,
  Download
} from 'lucide-react';

import { User } from 'firebase/auth';
import {
  FirebaseClientConfig,
  getSavedFirebaseConfig,
  saveFirebaseConfigToLocal,
  clearSavedFirebaseConfig,
  initFirebaseService,
  loginAdminEmail,
  logoutAdminEmail,
  subscribeAdminAuthState,
  savePageConfigToFirebase,
  loadPageConfigFromFirebase,
  subscribePageConfigFromFirebase,
  generateFirestoreRules
} from './firebase';

const GITHUB_SAMPLE_ICONS = [
  { path: 'icons/gravel-bike.svg', label: 'Vélo Gravel (public/icons/)' },
  { path: 'icons/topo-map.svg', label: 'Carte Topo (public/icons/)' },
  { path: 'icons/compass.svg', label: 'Boussole (public/icons/)' }
];

interface GridIconItem {
  id: string;
  row: number; // 1-indexed
  col: number; // 1-indexed
  iconPath: string; // File path, URL, data URL, or Lucide icon name
  targetUrl: string; // Redirect URL (e.g. routes.html)
  label: string; // Text displayed beneath the icon
  openInNewTab?: boolean;
}

interface LogoConfig {
  showLogo: boolean;
  logoPath: string;
  targetUrl: string;
  position: 'top-left' | 'top-center' | 'top-right';
  size: number;
  bgType: 'transparent' | 'box';
  bgColor: string;
  bgOpacity: number;
  borderRadius: number;
}

interface SecurityConfig {
  requirePassword: boolean;
  passwordHash: string; // SHA-256 hash (never plain text!)
  stealthMode: boolean; // Hide right handle unless ?admin=1 or shortcut Ctrl+Alt+P or triple-click version
}

interface PageConfig {
  // Title Settings
  showTitle: boolean;
  titleText: string;
  titleFont: string;
  titleFontSize: number;
  titleColor: string;
  titleBgType: 'transparent' | 'box' | 'banner';
  titleBgColor: string;
  titleBgOpacity: number;
  titleAlign: 'left' | 'center' | 'right';

  // Logo Settings
  logo: LogoConfig;

  // Grid Settings
  gridRows: number;
  gridCols: number;
  gridGap: number;

  // Icon Styling
  iconSize: number;
  iconBgColor: string;
  iconBorderColor: string;
  labelColor: string;
  labelFontSize: number;

  // Version Footer
  showVersion: boolean;
  versionText: string;
  versionColor: string;

  // Security Settings
  security: SecurityConfig;

  // Active Icons
  icons: GridIconItem[];
}

// Cryptographic hash utility (SHA-256 with salt)
// Ensures the plain password is NEVER stored or readable in localStorage or JavaScript
async function hashPassword(plain: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain + '_mez_salt_topography_2026');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// Default initial hash for 'admin' (calculated via sha256("admin_mez_salt_topography_2026"))
const DEFAULT_SALTED_ADMIN_HASH = '07d5fb0d1a42efd8ebad57335728a3f858276f5b9d31d927a7b8e3ad59635741';

const DEFAULT_CONFIG: PageConfig = {
  showTitle: true,
  titleText: 'Outils & utilitaires',
  titleFont: 'Plus Jakarta Sans',
  titleFontSize: 32,
  titleColor: '#1e293b',
  titleBgType: 'box',
  titleBgColor: '#ffffff',
  titleBgOpacity: 85,
  titleAlign: 'center',

  logo: {
    showLogo: true,
    logoPath: 'Bike',
    targetUrl: 'index.html',
    position: 'top-left',
    size: 46,
    bgType: 'box',
    bgColor: '#ffffff',
    bgOpacity: 90,
    borderRadius: 14
  },

  gridRows: 3,
  gridCols: 3,
  gridGap: 36,

  iconSize: 52,
  iconBgColor: '#ffffff',
  iconBorderColor: '#e2d9cd',
  labelColor: '#334155',
  labelFontSize: 13,

  showVersion: true,
  versionText: 'v 1.4 FabriziodelaRusta',
  versionColor: '#786c5e',

  security: {
    requirePassword: true,
    passwordHash: '', // Initialized at runtime if empty
    stealthMode: false
  },

  icons: [
    {
      id: 'icon-1',
      row: 1,
      col: 1,
      iconPath: 'Route',
      targetUrl: 'routes.html',
      label: 'Catalogue des Parcours',
      openInNewTab: false
    },
    {
      id: 'icon-2',
      row: 1,
      col: 2,
      iconPath: 'MapIcon',
      targetUrl: 'gpx-viewer.html',
      label: 'Visionneur & Analyse GPX',
      openInNewTab: false
    },
    {
      id: 'icon-3',
      row: 1,
      col: 3,
      iconPath: 'Mountain',
      targetUrl: 'elevation.html',
      label: 'Profils Altimétriques',
      openInNewTab: false
    },
    {
      id: 'icon-4',
      row: 2,
      col: 1,
      iconPath: 'Tent',
      targetUrl: 'bikepacking.html',
      label: 'Guide Bikepacking',
      openInNewTab: false
    },
    {
      id: 'icon-5',
      row: 2,
      col: 2,
      iconPath: 'CloudSun',
      targetUrl: 'meteo-topo.html',
      label: 'Météo des Crêtes',
      openInNewTab: false
    },
    {
      id: 'icon-6',
      row: 2,
      col: 3,
      iconPath: 'Wrench',
      targetUrl: 'elevation.html#tubeless',
      label: 'Réglages & Pression',
      openInNewTab: false
    },
    {
      id: 'icon-7',
      row: 3,
      col: 1,
      iconPath: 'Compass',
      targetUrl: 'routes.html#boussole',
      label: 'Orientation & Boussole',
      openInNewTab: false
    },
    {
      id: 'icon-1792489288375',
      row: 3,
      col: 2,
      iconPath: 'Bike',
      targetUrl: 'https://fabriziodelarusta.github.io/LiveTrack/',
      label: 'Nouvelle page',
      openInNewTab: false
    }
  ]
};

const AVAILABLE_FONTS = [
  { name: 'Plus Jakarta Sans', label: 'Plus Jakarta Sans (Moderne)' },
  { name: 'Outfit', label: 'Outfit (Géométrique)' },
  { name: 'Oswald', label: 'Oswald (Athlétique / Condensée)' },
  { name: 'Playfair Display', label: 'Playfair Display (Élégante / Sérif)' },
  { name: 'Fraunces', label: 'Fraunces (Caractère & Nature)' },
  { name: 'JetBrains Mono', label: 'JetBrains Mono (Topographique / Tabulaire)' }
];

const PRESET_ICONS = [
  'Bike',
  'Route',
  'Mountain',
  'Compass',
  'MapIcon',
  'Tent',
  'CloudSun',
  'Wrench',
  'Navigation2',
  'Activity',
  'Layers',
  'FileCode'
];

export default function App() {
  const [config, setConfig] = useState<PageConfig>(() => {
    try {
      const saved = localStorage.getItem('mez_page_config_v4');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Clean any legacy plain text passwords
        if (parsed.security && (parsed.security as any).adminPassword) {
          delete (parsed.security as any).adminPassword;
        }
        let effectiveVersion = parsed.versionText;
        if (!effectiveVersion || effectiveVersion.startsWith('v 1.2') || effectiveVersion.startsWith('v 1.3')) {
          effectiveVersion = DEFAULT_CONFIG.versionText;
        }
        return {
          ...DEFAULT_CONFIG,
          ...parsed,
          versionText: effectiveVersion,
          logo: { ...DEFAULT_CONFIG.logo, ...(parsed.logo || {}) },
          security: { ...DEFAULT_CONFIG.security, ...(parsed.security || {}) }
        };
      }
    } catch {
      // fallback
    }
    return DEFAULT_CONFIG;
  });

  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'grid' | 'icons' | 'title' | 'logo' | 'firebase' | 'security' | 'version'>('grid');

  // Firebase Integration State
  const [firebaseCfg, setFirebaseCfg] = useState<FirebaseClientConfig>(() => {
    return (
      getSavedFirebaseConfig() || {
        apiKey: '',
        authDomain: '',
        projectId: '',
        databaseId: '(default)',
        appId: ''
      }
    );
  });
  const [isFirebaseConnected, setIsFirebaseConnected] = useState<boolean>(false);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [authEmailInput, setAuthEmailInput] = useState('mezitineraires@gmail.com');
  const [authPassInput, setAuthPassInput] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<{ type: 'success' | 'error' | 'loading'; message: string } | null>(null);
  const [realtimeSync, setRealtimeSync] = useState<boolean>(true);
  const [copiedRules, setCopiedRules] = useState(false);
  const [selectedGuideTab, setSelectedGuideTab] = useState<'auth' | 'existing_db' | 'rules' | 'github_icons'>('auth');

  // Attempt to initialize Firebase on mount if saved configuration exists
  useEffect(() => {
    const saved = getSavedFirebaseConfig();
    if (saved && saved.apiKey && saved.projectId) {
      initFirebaseService(saved).then((res) => {
        if (res) {
          setIsFirebaseConnected(true);
          // Auto load remote config if available
          loadPageConfigFromFirebase().then((remoteData) => {
            if (remoteData && remoteData.icons) {
              setConfig((prev) => ({
                ...prev,
                ...remoteData,
                logo: { ...prev.logo, ...(remoteData.logo || {}) },
                security: { ...prev.security, ...(remoteData.security || {}) }
              }));
            }
          });
        }
      });
    }
  }, []);

  // Listen to Firebase Auth state
  useEffect(() => {
    const unsub = subscribeAdminAuthState((user) => {
      setFirebaseUser(user);
      if (user) {
        setIsAdminAuthenticated(true);
        try {
          sessionStorage.setItem('mez_admin_auth', 'true');
        } catch {}
      }
    });
    return () => unsub();
  }, [isFirebaseConnected]);

  // Real-time synchronization from Firestore
  useEffect(() => {
    if (!isFirebaseConnected || !realtimeSync) return;

    const unsub = subscribePageConfigFromFirebase(
      (remoteData) => {
        if (remoteData && remoteData.icons) {
          setConfig((prev) => ({
            ...prev,
            ...remoteData,
            logo: { ...prev.logo, ...(remoteData.logo || {}) },
            security: { ...prev.security, ...(remoteData.security || {}) }
          }));
        }
      },
      (err) => {
        console.warn('Realtime listener error:', err);
      }
    );

    return () => unsub();
  }, [isFirebaseConnected, realtimeSync]);

  const handleConnectFirebase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseCfg.apiKey.trim() || !firebaseCfg.projectId.trim()) {
      setSyncStatus({ type: 'error', message: "Veuillez renseigner au minimum la Clé API et l'ID de projet Firebase." });
      return;
    }
    setSyncStatus({ type: 'loading', message: "Connexion au service Firebase..." });
    try {
      saveFirebaseConfigToLocal(firebaseCfg);
      const res = await initFirebaseService(firebaseCfg);
      if (res) {
        setIsFirebaseConnected(true);
        setSyncStatus({ type: 'success', message: "Firebase connecté avec succès !" });
        const remoteData = await loadPageConfigFromFirebase();
        if (remoteData && remoteData.icons) {
          setConfig((prev) => ({
            ...prev,
            ...remoteData,
            logo: { ...prev.logo, ...(remoteData.logo || {}) },
            security: { ...prev.security, ...(remoteData.security || {}) }
          }));
        }
      } else {
        setIsFirebaseConnected(false);
        setSyncStatus({ type: 'error', message: "Échec de l'initialisation Firebase. Vérifiez vos identifiants." });
      }
    } catch (err: any) {
      setIsFirebaseConnected(false);
      setSyncStatus({ type: 'error', message: err?.message || "Erreur de connexion Firebase." });
    }
  };

  const handleAdminEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthLoading(true);
    try {
      const user = await loginAdminEmail(authEmailInput, authPassInput);
      setFirebaseUser(user);
      setIsAdminAuthenticated(true);
      try {
        sessionStorage.setItem('mez_admin_auth', 'true');
      } catch {}
      setAuthLoading(false);
      setAuthPassInput('');
      setSyncStatus({ type: 'success', message: `Connecté en tant que ${user.email} avec privilèges d'écriture !` });
    } catch (err: any) {
      setAuthLoading(false);
      setAuthError(err?.message || "Identifiants invalides ou service non configuré.");
    }
  };

  const handleAdminEmailLogout = async () => {
    try {
      await logoutAdminEmail();
      setFirebaseUser(null);
      setSyncStatus({ type: 'success', message: "Session Firebase déconnectée." });
    } catch (err: any) {
      setSyncStatus({ type: 'error', message: err?.message || "Erreur déconnexion." });
    }
  };

  const handleSaveToFirebase = async () => {
    if (!isFirebaseConnected) {
      setSyncStatus({ type: 'error', message: "Veuillez d'abord initialiser la connexion Firebase ci-dessous." });
      return;
    }
    if (!firebaseUser) {
      setSyncStatus({ type: 'error', message: "Écriture refusée : vous devez vous connecter avec votre compte administrateur Firebase." });
      return;
    }
    setSyncStatus({ type: 'loading', message: "Enregistrement de la configuration sur Firestore..." });
    try {
      await savePageConfigToFirebase(config);
      setSyncStatus({ type: 'success', message: "Configuration enregistrée sur Firestore ! Visible immédiatement par tous les visiteurs." });
    } catch (err: any) {
      setSyncStatus({ type: 'error', message: `Erreur d'écriture Firestore: ${err?.message || 'Permissions insuffisantes'}` });
    }
  };

  const handleLoadFromFirebase = async () => {
    if (!isFirebaseConnected) {
      setSyncStatus({ type: 'error', message: "Veuillez connecter Firebase pour charger." });
      return;
    }
    setSyncStatus({ type: 'loading', message: "Lecture depuis Firestore..." });
    try {
      const remoteData = await loadPageConfigFromFirebase();
      if (remoteData && remoteData.icons) {
        setConfig((prev) => ({
          ...prev,
          ...remoteData,
          logo: { ...prev.logo, ...(remoteData.logo || {}) },
          security: { ...prev.security, ...(remoteData.security || {}) }
        }));
        setSyncStatus({ type: 'success', message: "Configuration chargée depuis Firestore !" });
      } else {
        setSyncStatus({ type: 'error', message: "Aucune configuration trouvée dans Firestore (/portal_config/settings)." });
      }
    } catch (err: any) {
      setSyncStatus({ type: 'error', message: `Erreur de lecture Firestore: ${err?.message}` });
    }
  };

  // Security & Authentication State
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem('mez_admin_auth') === 'true';
    } catch {
      return false;
    }
  });

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState(false);
  const [showPasswordText, setShowPasswordText] = useState(false);

  // Password change form inside the Security tab
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [passwordChangeStatus, setPasswordChangeStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Stealth mode detection: Check for ?admin=1 or ?edit=1 in URL
  const [urlHasAdminParam, setUrlHasAdminParam] = useState(false);
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get('admin') === '1' || params.get('admin') === 'true' || params.get('edit') === '1') {
        setUrlHasAdminParam(true);
      }
    } catch {
      // ignore
    }
  }, []);

  // Keyboard shortcut: Ctrl + Alt + P to open settings or trigger unlock
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.altKey && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        triggerOpenPanel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAdminAuthenticated, config.security]);

  // Triple click on version footer to unlock stealth mode
  const [versionClickCount, setVersionClickCount] = useState(0);
  const handleVersionClick = () => {
    setVersionClickCount(prev => {
      const next = prev + 1;
      if (next >= 3) {
        triggerOpenPanel();
        return 0;
      }
      return next;
    });
  };

  // Currently editing icon state
  const [editingIcon, setEditingIcon] = useState<GridIconItem | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [selectedOverflowUrl, setSelectedOverflowUrl] = useState<string>('');

  // Save to localStorage whenever config changes (clean without plaintext password)
  useEffect(() => {
    try {
      localStorage.setItem('mez_page_config_v4', JSON.stringify(config));
    } catch (e) {
      console.error(e);
    }
  }, [config]);

  // Handle panel opening with security check
  const triggerOpenPanel = () => {
    if (config.security.requirePassword && !isAdminAuthenticated) {
      setPasswordInput('');
      setPasswordError(false);
      setShowPasswordModal(true);
    } else {
      setIsPanelOpen(true);
    }
  };

  // Secure Password verification using SHA-256
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const inputHash = await hashPassword(passwordInput);

    // Compare with saved hash, or default admin hash if none was saved yet
    const targetHash = config.security.passwordHash || (await hashPassword('admin'));

    if (inputHash === targetHash) {
      setIsAdminAuthenticated(true);
      try {
        sessionStorage.setItem('mez_admin_auth', 'true');
      } catch {}
      setShowPasswordModal(false);
      setIsPanelOpen(true);
      setPasswordError(false);
      setPasswordInput('');
    } else {
      setPasswordError(true);
    }
  };

  // Change password handler (hashes new password before saving)
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordChangeStatus(null);

    if (newPass.length < 4) {
      setPasswordChangeStatus({ type: 'error', message: 'Le nouveau mot de passe doit comporter au moins 4 caractères.' });
      return;
    }

    if (newPass !== confirmPass) {
      setPasswordChangeStatus({ type: 'error', message: 'La confirmation ne correspond pas au nouveau mot de passe.' });
      return;
    }

    // Verify current password first if a hash exists
    const currentHash = await hashPassword(currentPass);
    const targetHash = config.security.passwordHash || (await hashPassword('admin'));

    if (currentHash !== targetHash) {
      setPasswordChangeStatus({ type: 'error', message: 'L’ancien mot de passe est incorrect.' });
      return;
    }

    // Hash the new password and store ONLY the hash
    const newHash = await hashPassword(newPass);
    setConfig(prev => ({
      ...prev,
      security: {
        ...prev.security,
        passwordHash: newHash
      }
    }));

    setCurrentPass('');
    setNewPass('');
    setConfirmPass('');
    setPasswordChangeStatus({ type: 'success', message: 'Mot de passe mis à jour avec succès (haché en SHA-256) !' });
  };

  const handleLogout = () => {
    setIsAdminAuthenticated(false);
    try {
      sessionStorage.removeItem('mez_admin_auth');
    } catch {}
    setIsPanelOpen(false);
  };

  // Sorted icons: strictly sorted by ROW first, then by COLUMN
  // If two icons share the same row and col, prioritize the newer one (custom user icon)
  const sortedIcons = useMemo(() => {
    return [...config.icons].sort((a, b) => {
      if (a.row !== b.row) return a.row - b.row;
      if (a.col !== b.col) return a.col - b.col;
      // Newer created icon takes precedence on collision
      return (b.id || '').localeCompare(a.id || '');
    });
  }, [config.icons]);

  // Separate icons into in-grid cells and overflow items with conflict handling & auto-relocation
  const { inGridIcons, overflowIcons, gridCells, positionConflicts, effectiveGridRows } = useMemo(() => {
    const occupied = new Map<string, GridIconItem>();
    const inGridList: GridIconItem[] = [];
    const overflows: GridIconItem[] = [];
    const conflictsMap = new Map<string, GridIconItem[]>();

    // 1. Group icons by position key to detect conflicts
    for (const item of sortedIcons) {
      const key = `${item.row}-${item.col}`;
      const group = conflictsMap.get(key) || [];
      group.push(item);
      conflictsMap.set(key, group);
    }

    const detectedConflicts: { key: string; row: number; col: number; items: GridIconItem[] }[] = [];
    conflictsMap.forEach((items, key) => {
      if (items.length > 1) {
        const [r, c] = key.split('-').map(Number);
        detectedConflicts.push({ key, row: r, col: c, items });
      }
    });

    // Automatically calculate required rows so that NO icon is hidden
    const maxExplicitRow = Math.max(config.gridRows, ...sortedIcons.map(i => i.row || 1));
    const requiredRowsForCount = Math.ceil(sortedIcons.length / config.gridCols);
    let calculatedRows = Math.max(config.gridRows, maxExplicitRow, requiredRowsForCount, 1);

    // 2. Assign to grid cells with auto-relocation for conflicting duplicate coordinates:
    // When multiple icons share the same (row, col) (e.g. icon-1 and icon-1792489288375 both at 1,1):
    // The second icon is automatically allocated to the next empty cell so that ALL icons
    // are 100% visible on the screen!
    for (const item of sortedIcons) {
      let r = item.row;
      let c = item.col;
      let key = `${r}-${c}`;

      if (occupied.has(key)) {
        // Find next free cell in grid
        let placed = false;
        for (let searchR = 1; searchR <= calculatedRows && !placed; searchR++) {
          for (let searchC = 1; searchC <= config.gridCols && !placed; searchC++) {
            const candidateKey = `${searchR}-${searchC}`;
            if (!occupied.has(candidateKey)) {
              r = searchR;
              c = searchC;
              key = candidateKey;
              placed = true;
            }
          }
        }
        if (!placed) {
          calculatedRows += 1;
          r = calculatedRows;
          c = 1;
          key = `${r}-${c}`;
        }
      }

      const assignedItem: GridIconItem = { ...item, row: r, col: c };
      occupied.set(key, assignedItem);
      inGridList.push(assignedItem);
    }

    // 3. Build the grid matrix
    const cells: { row: number; col: number; item?: GridIconItem }[] = [];
    for (let r = 1; r <= calculatedRows; r++) {
      for (let c = 1; c <= config.gridCols; c++) {
        const item = occupied.get(`${r}-${c}`);
        cells.push({ row: r, col: c, item });
      }
    }

    return {
      inGridIcons: inGridList,
      overflowIcons: overflows,
      gridCells: cells,
      positionConflicts: detectedConflicts,
      effectiveGridRows: calculatedRows
    };
  }, [sortedIcons, config.gridRows, config.gridCols]);

  // Handle cell click from preview to quickly assign/edit icon
  const handleCellClick = (row: number, col: number) => {
    if (config.security.requirePassword && !isAdminAuthenticated) {
      triggerOpenPanel();
      return;
    }
    const existing = config.icons.find(i => i.row === row && i.col === col);
    if (existing) {
      setEditingIcon(existing);
      setIsAddingNew(false);
    } else {
      setEditingIcon({
        id: 'icon-' + Date.now(),
        row,
        col,
        iconPath: 'Bike',
        targetUrl: 'routes.html',
        label: `Application (${row}, ${col})`,
        openInNewTab: false
      });
      setIsAddingNew(true);
    }
    setActiveTab('icons');
    setIsPanelOpen(true);
  };

  const saveIconItem = (icon: GridIconItem) => {
    setConfig(prev => {
      const filtered = prev.icons.filter(
        i => i.id !== icon.id && !(i.row === icon.row && i.col === icon.col)
      );
      return {
        ...prev,
        icons: [...filtered, icon]
      };
    });
    setEditingIcon(null);
    setIsAddingNew(false);
  };

  // Reassign an icon to the next free cell in the grid
  const resolveConflict = (conflictIconId: string) => {
    let targetRow = 1;
    let targetCol = 1;
    let found = false;

    for (let r = 1; r <= config.gridRows; r++) {
      for (let c = 1; c <= config.gridCols; c++) {
        const isOccupied = config.icons.some(i => i.id !== conflictIconId && i.row === r && i.col === c);
        if (!isOccupied) {
          targetRow = r;
          targetCol = c;
          found = true;
          break;
        }
      }
      if (found) break;
    }

    if (!found) {
      targetRow = config.gridRows + 1;
      targetCol = 1;
    }

    setConfig(prev => ({
      ...prev,
      icons: prev.icons.map(i => i.id === conflictIconId ? { ...i, row: targetRow, col: targetCol } : i)
    }));
  };

  const deleteIconItem = (id: string) => {
    setConfig(prev => ({
      ...prev,
      icons: prev.icons.filter(i => i.id !== id)
    }));
    if (editingIcon?.id === id) {
      setEditingIcon(null);
      setIsAddingNew(false);
    }
  };

  const handleResetToDefault = () => {
    if (confirm('Voulez-vous réinitialiser tous les réglages par défaut ?')) {
      setConfig(DEFAULT_CONFIG);
      setEditingIcon(null);
      setIsAddingNew(false);
    }
  };

  // Helper to detect if an icon path is an external HTTP/HTTPS URL (including typo tolerance 'hhtp')
  const isHttpUrlIcon = (path: string): boolean => {
    if (!path) return false;
    const p = path.trim().toLowerCase();
    return (
      p.startsWith('http://') ||
      p.startsWith('https://') ||
      p.startsWith('hhtp://') ||
      p.startsWith('hhtps://')
    );
  };

  // Helper to render an icon given its path or preset name
  // For icons starting with http/https, they take 100% of the reserved space with no reduction
  const renderIconGraphic = (path: string, size = 48, fullSize = false) => {
    const isHttp = isHttpUrlIcon(path);
    const isImageFile =
      isHttp ||
      path.startsWith('data:') ||
      path.startsWith('/') ||
      path.endsWith('.png') ||
      path.endsWith('.svg') ||
      path.endsWith('.jpg') ||
      path.endsWith('.jpeg') ||
      path.endsWith('.webp') ||
      path.endsWith('.ico');

    if (isImageFile) {
      const takeFull = fullSize || isHttp;
      return (
        <img
          src={path}
          alt="Icône"
          style={{
            width: takeFull ? `${size}px` : `${size * 0.65}px`,
            height: takeFull ? `${size}px` : `${size * 0.65}px`,
            maxWidth: '100%',
            maxHeight: '100%'
          }}
          className={`${takeFull ? 'w-full h-full object-contain' : 'object-contain'} select-none`}
          onError={(e) => {
            (e.target as HTMLElement).style.display = 'none';
          }}
        />
      );
    }

    const props = {
      style: { width: `${size * 0.55}px`, height: `${size * 0.55}px` },
      className: 'text-[#d45928]'
    };

    switch (path) {
      case 'Route': return <Route {...props} />;
      case 'Mountain': return <Mountain {...props} />;
      case 'Compass': return <Compass {...props} />;
      case 'MapIcon': return <MapIcon {...props} />;
      case 'Tent': return <Tent {...props} />;
      case 'CloudSun': return <CloudSun {...props} />;
      case 'Wrench': return <Wrench {...props} />;
      case 'Navigation2': return <Navigation2 {...props} />;
      case 'Activity': return <Activity {...props} />;
      case 'Layers': return <Layers {...props} />;
      case 'FileCode': return <FileCode {...props} />;
      case 'Bike':
      default:
        return <Bike {...props} />;
    }
  };

  // Render the logo component
  const renderLogoElement = () => {
    if (!config.logo.showLogo || !config.logo.logoPath) return null;

    const logoStyle: React.CSSProperties = {
      width: `${config.logo.size}px`,
      height: `${config.logo.size}px`,
      backgroundColor:
        config.logo.bgType === 'box'
          ? `${config.logo.bgColor}${Math.round((config.logo.bgOpacity / 100) * 255).toString(16).padStart(2, '0')}`
          : 'transparent',
      borderRadius: `${config.logo.borderRadius}px`,
      border: config.logo.bgType === 'box' ? '1px solid rgba(226, 217, 205, 0.9)' : 'none'
    };

    return (
      <a
        href={config.logo.targetUrl || 'index.html'}
        className="pointer-events-auto flex items-center justify-center transition-all duration-200 hover:scale-105 hover:shadow-md focus:outline-none"
        style={logoStyle}
        title="Logo du site — Retour à l'accueil"
      >
        {renderIconGraphic(config.logo.logoPath, config.logo.size)}
      </a>
    );
  };

  const isHandleVisible = !config.security.stealthMode || urlHasAdminParam || isAdminAuthenticated || isPanelOpen;

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#f7f5ee] select-none">
      {/* ======================================================== */}
      {/* 1. ARRIÈRE-PLAN : COURBES DE NIVEAUX & TRACE GPX GRAVEL  */}
      {/* ======================================================== */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden" aria-hidden="true">
        <svg
          className="w-full h-full object-cover"
          viewBox="0 0 1920 1080"
          preserveAspectRatio="xMidYMid slice"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <pattern id="lightTopoGrid" width="120" height="120" patternUnits="userSpaceOnUse">
              <line x1="56" y1="60" x2="64" y2="60" stroke="#d5ccbd" strokeWidth="0.8" />
              <line x1="60" y1="56" x2="60" y2="64" stroke="#d5ccbd" strokeWidth="0.8" />
            </pattern>

            <linearGradient id="gravelGpxGrad" x1="0" y1="1" x2="1" y2="0">
              <stop offset="0%" stopColor="#cf4c1b" />
              <stop offset="45%" stopColor="#e06828" />
              <stop offset="80%" stopColor="#d9541e" />
              <stop offset="100%" stopColor="#b83811" />
            </linearGradient>

            <filter id="trackShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="2.5" floodColor="#9c7a5f" floodOpacity="0.25" />
            </filter>
          </defs>

          <rect width="100%" height="100%" fill="url(#lightTopoGrid)" />

          <g opacity="0.6" fontFamily="JetBrains Mono, monospace" fontSize="9" fill="#9e9180">
            <text x="30" y="40">45°18'30"N</text>
            <text x="30" y="280">45°15'00"N</text>
            <text x="30" y="540">45°11'30"N</text>
            <text x="30" y="800">45°08'00"N</text>
            <text x="30" y="1050">45°04'30"N</text>

            <text x="240" y="1060">5°42'00"E</text>
            <text x="640" y="1060">5°46'30"E</text>
            <text x="1040" y="1060">5°51'00"E</text>
            <text x="1440" y="1060">5°55'30"E</text>
            <text x="1820" y="1060">6°00'00"E</text>
          </g>

          {/* Courbes de niveaux */}
          <g stroke="#d8cebf" strokeWidth="0.75" opacity="0.85">
            <path d="M-50 140 C 220 90, 480 230, 840 160 C 1180 90, 1480 220, 1980 130" />
            <path d="M-50 180 C 240 130, 500 270, 870 200 C 1210 130, 1510 260, 1980 170" />
            <path d="M-50 220 C 260 170, 520 310, 900 240 C 1240 170, 1540 300, 1980 210" />
            <path d="M-50 260 C 280 210, 540 350, 930 280 C 1270 210, 1570 340, 1980 250" />
          </g>

          <path
            d="M-50 300 C 300 250, 560 390, 960 320 C 1300 250, 1600 380, 1980 290"
            stroke="#948472"
            strokeWidth="1.5"
          />
          <text x="360" y="293" fill="#887866" fontSize="9" fontFamily="JetBrains Mono, monospace" fontWeight="600">250 m</text>
          <text x="1420" y="322" fill="#887866" fontSize="9" fontFamily="JetBrains Mono, monospace" fontWeight="600">250 m</text>

          <g stroke="#d8cebf" strokeWidth="0.75" opacity="0.85">
            <path d="M-50 340 C 320 290, 580 430, 990 360 C 1330 290, 1630 420, 1980 330" />
            <path d="M-50 380 C 340 330, 600 470, 1020 400 C 1360 330, 1660 460, 1980 370" />
            <path d="M-50 420 C 360 370, 620 510, 1050 440 C 1390 370, 1690 500, 1980 410" />
            <path d="M-50 460 C 380 410, 640 550, 1080 480 C 1420 410, 1720 540, 1980 450" />
          </g>

          <path
            d="M-50 500 C 400 450, 660 590, 1110 520 C 1450 450, 1750 580, 1980 490"
            stroke="#948472"
            strokeWidth="1.5"
          />
          <text x="510" y="515" fill="#887866" fontSize="9" fontFamily="JetBrains Mono, monospace" fontWeight="600">350 m</text>
          <text x="1280" y="495" fill="#887866" fontSize="9" fontFamily="JetBrains Mono, monospace" fontWeight="600">350 m</text>

          {/* Sommet Ouest */}
          <g stroke="#d8cebf" strokeWidth="0.75" opacity="0.85">
            <path d="M 220 620 C 300 550, 500 570, 580 660 C 630 730, 570 820, 460 830 C 340 840, 220 760, 200 680 C 190 640, 205 630, 220 620 Z" />
            <path d="M 260 635 C 330 580, 480 590, 540 670 C 580 720, 530 790, 440 800 C 350 810, 250 740, 240 680 Z" />
            <path d="M 290 650 C 350 610, 450 620, 490 680 C 520 720, 480 770, 420 770 C 360 770, 300 720, 290 675 Z" />
          </g>
          <path
            d="M 330 665 C 370 630, 430 635, 460 685 C 480 720, 450 750, 400 750 C 350 750, 320 710, 330 665 Z"
            stroke="#948472"
            strokeWidth="1.5"
          />
          <text x="365" y="650" fill="#887866" fontSize="8.5" fontFamily="JetBrains Mono, monospace" fontWeight="600">450 m</text>
          <text x="382" y="700" fill="#786856" fontSize="9" fontFamily="JetBrains Mono, monospace" fontWeight="bold">▲ 482 m</text>

          {/* Pentes centrales */}
          <g stroke="#d8cebf" strokeWidth="0.75" opacity="0.85">
            <path d="M-50 560 C 260 510, 600 680, 1020 590 C 1370 510, 1680 660, 1980 570" />
            <path d="M-50 620 C 240 570, 580 740, 1000 650 C 1350 570, 1660 720, 1980 630" />
            <path d="M-50 680 C 220 630, 560 800, 980 710 C 1330 630, 1640 780, 1980 690" />
          </g>

          <path
            d="M-50 800 C 180 750, 520 920, 940 830 C 1290 750, 1600 900, 1980 810"
            stroke="#948472"
            strokeWidth="1.5"
          />
          <text x="210" y="780" fill="#887866" fontSize="9" fontFamily="JetBrains Mono, monospace" fontWeight="600">500 m</text>
          <text x="1450" y="825" fill="#887866" fontSize="9" fontFamily="JetBrains Mono, monospace" fontWeight="600">500 m</text>

          {/* Massif Est */}
          <g stroke="#d8cebf" strokeWidth="0.75" opacity="0.85">
            <path d="M 1080 320 C 1220 220, 1500 240, 1640 370 C 1740 470, 1660 620, 1480 650 C 1310 670, 1140 580, 1070 480 C 1040 420, 1050 350, 1080 320 Z" />
            <path d="M 1140 340 C 1260 250, 1470 270, 1580 380 C 1660 460, 1600 580, 1440 600 C 1300 620, 1180 540, 1130 460 Z" />
          </g>
          <path
            d="M 1240 390 C 1320 330, 1420 340, 1480 410 C 1520 460, 1480 510, 1380 520 C 1280 530, 1230 480, 1220 430 Z"
            stroke="#948472"
            strokeWidth="1.5"
          />
          <text x="1330" y="348" fill="#887866" fontSize="9" fontFamily="JetBrains Mono, monospace" fontWeight="600">600 m</text>
          <text x="1340" y="455" fill="#786856" fontSize="9" fontFamily="JetBrains Mono, monospace" fontWeight="bold">▲ 742 m</text>

          {/* Tracé GPX */}
          <g filter="url(#trackShadow)">
            <path
              d="M 120 920 Q 280 890 390 780 T 540 610 T 720 540 T 910 610 T 1120 580 T 1320 490 T 1530 380 T 1760 260"
              stroke="#f5d6c6"
              strokeWidth="9"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M 120 920 Q 280 890 390 780 T 540 610 T 720 540 T 910 610 T 1120 580 T 1320 490 T 1530 380 T 1760 260"
              stroke="url(#gravelGpxGrad)"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M 120 920 Q 280 890 390 780 T 540 610 T 720 540 T 910 610 T 1120 580 T 1320 490 T 1530 380 T 1760 260"
              stroke="#ffffff"
              strokeWidth="1.4"
              strokeDasharray="6 8"
              strokeLinecap="round"
              className="animate-dash-flow"
            />

            <g transform="translate(120, 920)">
              <circle cx="0" cy="0" r="7" fill="#15803d" stroke="#ffffff" strokeWidth="2.5" />
              <circle cx="0" cy="0" r="3" fill="#ffffff" />
              <text x="-15" y="24" fill="#15803d" fontSize="10" fontFamily="JetBrains Mono, monospace" fontWeight="bold">DÉPART</text>
            </g>

            <g transform="translate(1120, 580)">
              <circle cx="0" cy="0" r="6" fill="#cf4c1b" stroke="#ffffff" strokeWidth="2" />
              <circle cx="0" cy="0" r="2.5" fill="#ffffff" />
              <text x="-35" y="-12" fill="#b91c1c" fontSize="10" fontFamily="JetBrains Mono, monospace" fontWeight="bold">COL 580m</text>
            </g>

            <g transform="translate(1760, 260)">
              <circle cx="0" cy="0" r="7" fill="#b91c1c" stroke="#ffffff" strokeWidth="2.5" />
              <circle cx="0" cy="0" r="3" fill="#ffffff" />
              <text x="-60" y="-12" fill="#b91c1c" fontSize="10" fontFamily="JetBrains Mono, monospace" fontWeight="bold">ARRIVÉE</text>
            </g>
          </g>

          <g transform="translate(1820, 90)" opacity="0.5">
            <circle cx="0" cy="0" r="24" stroke="#cfc5b6" strokeWidth="0.8" strokeDasharray="3 3" />
            <line x1="0" y1="-30" x2="0" y2="30" stroke="#b0a290" strokeWidth="0.8" />
            <line x1="-30" y1="0" x2="30" y2="0" stroke="#b0a290" strokeWidth="0.8" />
            <polygon points="0,-28 -3.5,-7 0,-10 3.5,-7" fill="#cf4c1b" />
            <text x="-3" y="-34" fill="#cf4c1b" fontSize="8" fontFamily="JetBrains Mono, monospace" fontWeight="bold">N</text>
          </g>
        </svg>
      </div>

      {/* ======================================================== */}
      {/* 2. LOGO POSITIONNÉ (SI TOP-LEFT OU TOP-RIGHT)            */}
      {/* ======================================================== */}
      {config.logo.showLogo && config.logo.position === 'top-left' && (
        <div className="fixed top-6 left-6 md:top-8 md:left-10 z-30 pointer-events-auto">
          {renderLogoElement()}
        </div>
      )}

      {config.logo.showLogo && config.logo.position === 'top-right' && (
        <div className="fixed top-6 right-16 md:top-8 md:right-20 z-30 pointer-events-auto">
          {renderLogoElement()}
        </div>
      )}

      {/* ======================================================== */}
      {/* 3. ZONE PRINCIPALE : TITRE, GRILLE & LISTE DÉROULANTE    */}
      {/* ======================================================== */}
      <div className="relative z-10 w-full h-full flex flex-col justify-between p-6 md:p-10 pointer-events-none">
        {/* TITRE CONFIGURABLE */}
        {config.showTitle && config.titleText.trim() !== '' && (
          <header className={`w-full flex flex-col ${config.titleAlign === 'center' ? 'items-center' : config.titleAlign === 'right' ? 'items-end' : 'items-start'} pt-2`}>
            {config.logo.showLogo && config.logo.position === 'top-center' && (
              <div className="mb-2 pointer-events-auto">
                {renderLogoElement()}
              </div>
            )}

            <div
              className={`pointer-events-auto transition-all duration-200 ${
                config.titleBgType === 'box'
                  ? 'px-8 py-4 rounded-2xl border border-neutral-300/80 shadow-sm backdrop-blur-md'
                  : config.titleBgType === 'banner'
                  ? 'w-full py-4 px-6 border-b border-neutral-300/70 text-center'
                  : 'p-0'
              }`}
              style={{
                backgroundColor:
                  config.titleBgType !== 'transparent'
                    ? `${config.titleBgColor}${Math.round((config.titleBgOpacity / 100) * 255).toString(16).padStart(2, '0')}`
                    : 'transparent'
              }}
            >
              <h1
                style={{
                  fontFamily: config.titleFont,
                  fontSize: `${config.titleFontSize}px`,
                  color: config.titleColor
                }}
                className="font-extrabold tracking-tight leading-tight select-text"
              >
                {config.titleText}
              </h1>
            </div>
          </header>
        )}

        {/* GRILLE D'ICÔNES AU CENTRE + LISTE DÉROULANTE SOUS LA GRILLE */}
        <div className="flex-1 flex flex-col items-center justify-center p-2 min-h-0">
          <div
            className="grid transition-all duration-300"
            style={{
              gridTemplateRows: `repeat(${effectiveGridRows}, minmax(0, 1fr))`,
              gridTemplateColumns: `repeat(${config.gridCols}, minmax(0, 1fr))`,
              gap: `${config.gridGap}px`,
              maxWidth: `${Math.min(config.gridCols * 190, 1200)}px`
            }}
          >
            {gridCells.map(({ row, col, item }) => (
              <div
                key={`cell-${row}-${col}`}
                className="flex items-center justify-center"
              >
                {item ? (
                  <a
                    href={item.targetUrl}
                    target={item.openInNewTab ? '_blank' : '_self'}
                    rel={item.openInNewTab ? 'noopener noreferrer' : undefined}
                    className="pointer-events-auto group flex flex-col items-center justify-center text-center p-3 rounded-2xl transition-all duration-200 hover:-translate-y-1.5 focus:outline-none"
                    style={{ minWidth: '120px' }}
                  >
                    {(() => {
                      const isHttp = isHttpUrlIcon(item.iconPath);
                      return (
                        <div
                          className={`flex items-center justify-center transition-all duration-200 group-hover:scale-105 ${
                            isHttp
                              ? 'p-0 bg-transparent border-0 shadow-none'
                              : 'rounded-2xl shadow-sm group-hover:shadow-md'
                          }`}
                          style={{
                            width: `${config.iconSize}px`,
                            height: `${config.iconSize}px`,
                            backgroundColor: isHttp ? 'transparent' : config.iconBgColor,
                            border: isHttp ? 'none' : `1.5px solid ${config.iconBorderColor}`,
                            boxShadow: isHttp ? 'none' : undefined
                          }}
                        >
                          {renderIconGraphic(item.iconPath, config.iconSize, isHttp)}
                        </div>
                      );
                    })()}

                    {item.label && (
                      <span
                        className="mt-2.5 font-semibold leading-tight line-clamp-2 max-w-[140px] transition-colors group-hover:text-[#cf4c1b]"
                        style={{
                          color: config.labelColor,
                          fontSize: `${config.labelFontSize}px`,
                          textShadow: '0 1px 2px rgba(255, 255, 255, 0.8)'
                        }}
                      >
                        {item.label}
                      </span>
                    )}
                  </a>
                ) : (
                  <button
                    onClick={() => handleCellClick(row, col)}
                    className={`pointer-events-auto w-24 h-24 rounded-2xl border-2 border-dashed border-neutral-300/60 hover:border-[#cf4c1b] flex flex-col items-center justify-center gap-1 transition-all ${
                      isPanelOpen ? 'opacity-80 hover:bg-white/60 cursor-pointer' : 'opacity-0 hover:opacity-40'
                    }`}
                    title={`Ajouter une icône à la ligne ${row}, colonne ${col}`}
                  >
                    <Plus className="w-5 h-5 text-neutral-400" />
                    <span className="text-[10px] font-mono text-neutral-400">({row}, {col})</span>
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* LISTE DÉROULANTE EN DESSOUS DES ICÔNES SI PLUS D'ICÔNES QUE DANS LA GRILLE */}
          {overflowIcons.length > 0 && (
            <div className="mt-8 pointer-events-auto flex flex-col sm:flex-row items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-white/85 border border-[#e2d9cd] shadow-md backdrop-blur-md">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-neutral-700">
                <FolderOpen className="w-4 h-4 text-[#cf4c1b]" />
                <span>Autres applications ({overflowIcons.length}) :</span>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={selectedOverflowUrl}
                  onChange={(e) => {
                    setSelectedOverflowUrl(e.target.value);
                    if (e.target.value) {
                      const item = overflowIcons.find(i => i.targetUrl === e.target.value);
                      if (item?.openInNewTab) {
                        window.open(e.target.value, '_blank');
                      } else {
                        window.location.href = e.target.value;
                      }
                    }
                  }}
                  className="px-3 py-1.5 bg-[#fbfaf8] border border-neutral-300 rounded-xl text-xs font-medium text-neutral-800 shadow-2xs focus:outline-none focus:ring-1 focus:ring-[#cf4c1b] cursor-pointer"
                >
                  <option value="">Sélectionner une application hors grille...</option>
                  {overflowIcons.map((item) => (
                    <option key={item.id} value={item.targetUrl}>
                      {item.label} (L{item.row}, C{item.col} → {item.targetUrl})
                    </option>
                  ))}
                </select>

                {selectedOverflowUrl && (
                  <a
                    href={selectedOverflowUrl}
                    className="p-1.5 bg-[#cf4c1b] hover:bg-[#b83811] text-white rounded-lg transition-colors flex items-center justify-center"
                    title="Ouvrir la page sélectionnée"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 4. NUMÉRO DE VERSION EN BAS AU CENTRE */}
        {config.showVersion && config.versionText && (
          <footer className="w-full flex justify-center pb-2">
            <button
              onClick={handleVersionClick}
              className="pointer-events-auto px-4 py-1.5 rounded-full bg-[#f7f5ee]/85 hover:bg-white border border-neutral-300/60 backdrop-blur-sm text-xs font-mono font-medium shadow-2xs transition-colors cursor-pointer"
              title="Version de l'application"
            >
              <span style={{ color: config.versionColor }}>
                {config.versionText}
              </span>
            </button>
          </footer>
        )}
      </div>

      {/* ======================================================== */}
      {/* 5. POIGNÉE DU PANNEAU LATÉRAL À DROITE (HANDLE TAB)     */}
      {/* ======================================================== */}
      {isHandleVisible && (
        <div
          className="fixed top-1/2 -translate-y-1/2 z-50 transition-all duration-300 ease-out"
          style={{
            right: isPanelOpen ? '420px' : '0px'
          }}
        >
          <button
            onClick={() => {
              if (isPanelOpen) {
                setIsPanelOpen(false);
              } else {
                triggerOpenPanel();
              }
            }}
            className="bg-white hover:bg-[#fff9f5] text-[#cf4c1b] border-y border-l border-[#e2d9cd] shadow-md hover:shadow-lg rounded-l-xl px-2.5 py-4 flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-[#cf4c1b]/30"
            title={
              isPanelOpen
                ? 'Fermer le panneau'
                : config.security.requirePassword && !isAdminAuthenticated
                ? 'Paramètres (Protégé par mot de passe)'
                : 'Ouvrir les paramètres'
            }
          >
            {isPanelOpen ? (
              <ChevronRight className="w-5 h-5 text-neutral-700 hover:text-neutral-900" />
            ) : (
              <>
                {config.security.requirePassword && !isAdminAuthenticated ? (
                  <Lock className="w-4 h-4 text-[#cf4c1b] mb-0.5" />
                ) : (
                  <ChevronLeft className="w-5 h-5 text-[#cf4c1b] animate-pulse" />
                )}
                <Settings className="w-4 h-4 text-neutral-600 mt-1" />
                <span
                  className="text-[11px] font-bold text-neutral-600 tracking-wider mt-2"
                  style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
                >
                  PARAMÈTRES
                </span>
              </>
            )}
          </button>
        </div>
      )}

      {/* ======================================================== */}
      {/* 6. MODAL DE DÉVERROUILLAGE SÉCURISÉ                     */}
      {/* ======================================================== */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 bg-neutral-950/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white border border-[#e2d9cd] shadow-2xl p-6 relative">
            <button
              onClick={() => {
                setShowPasswordModal(false);
                setPasswordError(false);
                setPasswordInput('');
              }}
              className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-700 p-1 rounded-lg"
              title="Fermer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-xl bg-[#cf4c1b]/10 text-[#cf4c1b]">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-neutral-900">Accès Administrateur</h3>
                <p className="text-[11px] text-neutral-500">Veuillez entrer le mot de passe pour continuer</p>
              </div>
            </div>

            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                  Mot de passe
                </label>
                <div className="relative">
                  <input
                    type={showPasswordText ? 'text' : 'password'}
                    value={passwordInput}
                    onChange={(e) => {
                      setPasswordInput(e.target.value);
                      setPasswordError(false);
                    }}
                    placeholder="Entrez votre mot de passe..."
                    autoFocus
                    required
                    className={`w-full pl-3 pr-10 py-2 bg-neutral-50 border rounded-xl text-xs text-neutral-900 focus:outline-none transition-colors ${
                      passwordError
                        ? 'border-red-400 focus:ring-1 focus:ring-red-400'
                        : 'border-neutral-300 focus:ring-1 focus:ring-[#cf4c1b]'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswordText(!showPasswordText)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                  >
                    {showPasswordText ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {passwordError && (
                  <p className="text-[11px] text-red-600 font-medium mt-1.5 flex items-center gap-1">
                    <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                    <span>Mot de passe incorrect.</span>
                  </p>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="px-3 py-1.5 text-xs text-neutral-600 hover:text-neutral-900"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#cf4c1b] hover:bg-[#b83811] text-white text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5 shadow-sm"
                >
                  <Unlock className="w-3.5 h-3.5" />
                  <span>Déverrouiller</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 7. PANNEAU DE PARAMÉTRISATION LATÉRAL À DROITE           */}
      {/* ======================================================== */}
      <aside
        className={`fixed top-0 right-0 h-full w-[420px] max-w-[90vw] bg-white/95 backdrop-blur-xl border-l border-[#e2d9cd] shadow-2xl z-40 transition-transform duration-300 ease-out flex flex-col ${
          isPanelOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* En-tête du panneau */}
        <div className="p-5 border-b border-neutral-200 flex items-center justify-between bg-neutral-50/80">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-[#cf4c1b]/10 text-[#cf4c1b] rounded-lg">
              <Settings className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-neutral-900">Paramètres de la page</h2>
              <div className="flex items-center gap-1.5 text-[10px] text-emerald-700 font-medium">
                <ShieldCheck className="w-3 h-3" />
                <span>Session Administrateur active</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={handleLogout}
              className="p-1.5 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-200/60 rounded-lg transition-colors"
              title="Verrouiller la session admin"
            >
              <LogOut className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsPanelOpen(false)}
              className="p-1.5 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-200/60 rounded-lg transition-colors"
              title="Fermer le panneau"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Onglets de navigation */}
        <div className="flex border-b border-neutral-200 bg-neutral-100/70 p-1 gap-1 text-xs font-semibold overflow-x-auto">
          <button
            onClick={() => { setActiveTab('grid'); setEditingIcon(null); }}
            className={`py-1.5 px-2.5 rounded-md transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'grid' ? 'bg-white text-[#cf4c1b] shadow-2xs font-bold' : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            Grille
          </button>
          <button
            onClick={() => { setActiveTab('icons'); }}
            className={`py-1.5 px-2.5 rounded-md transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'icons' ? 'bg-white text-[#cf4c1b] shadow-2xs font-bold' : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            Icônes ({config.icons.length})
          </button>
          <button
            onClick={() => { setActiveTab('title'); setEditingIcon(null); }}
            className={`py-1.5 px-2.5 rounded-md transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'title' ? 'bg-white text-[#cf4c1b] shadow-2xs font-bold' : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            Titre
          </button>
          <button
            onClick={() => { setActiveTab('logo'); setEditingIcon(null); }}
            className={`py-1.5 px-2.5 rounded-md transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'logo' ? 'bg-white text-[#cf4c1b] shadow-2xs font-bold' : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            Logo
          </button>
          <button
            onClick={() => { setActiveTab('firebase'); setEditingIcon(null); }}
            className={`py-1.5 px-2.5 rounded-md transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
              activeTab === 'firebase' ? 'bg-white text-[#cf4c1b] shadow-2xs font-bold' : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            <Cloud className="w-3.5 h-3.5" />
            <span>Firebase ☁️</span>
            {isFirebaseConnected && (
              <span className={`w-1.5 h-1.5 rounded-full ${firebaseUser ? 'bg-emerald-500' : 'bg-amber-500'}`} />
            )}
          </button>
          <button
            onClick={() => { setActiveTab('security'); setEditingIcon(null); }}
            className={`py-1.5 px-2.5 rounded-md transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'security' ? 'bg-white text-[#cf4c1b] shadow-2xs font-bold' : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            Sécurité 🔒
          </button>
          <button
            onClick={() => { setActiveTab('version'); setEditingIcon(null); }}
            className={`py-1.5 px-2.5 rounded-md transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'version' ? 'bg-white text-[#cf4c1b] shadow-2xs font-bold' : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            Version
          </button>
        </div>

        {/* Corps déroulant du panneau */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6 text-xs text-neutral-700">
          {/* ---------------------------------------------------- */}
          {/* ONGLET FIREBASE : CLOUD FIRESTORE & AUTH & GITHUB    */}
          {/* ---------------------------------------------------- */}
          {activeTab === 'firebase' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between pb-2 border-b border-neutral-200">
                <div>
                  <h3 className="font-bold text-neutral-900 text-sm flex items-center gap-2">
                    <Cloud className="w-4 h-4 text-[#cf4c1b]" />
                    <span>Synchronisation Firebase Cloud</span>
                  </h3>
                  <p className="text-neutral-500 text-[11px]">
                    Base Firestore, compte administrateur & fichiers GitHub
                  </p>
                </div>
                <div className="p-1 rounded bg-[#cf4c1b]/10 text-[#cf4c1b]">
                  <Database className="w-4 h-4" />
                </div>
              </div>

              {/* Toast / Message de statut */}
              {syncStatus && (
                <div
                  className={`p-3 rounded-xl border flex items-start justify-between gap-2 text-[11px] animate-fadeIn ${
                    syncStatus.type === 'success'
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                      : syncStatus.type === 'error'
                      ? 'bg-red-50 border-red-200 text-red-900'
                      : 'bg-blue-50 border-blue-200 text-blue-900'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {syncStatus.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />}
                    {syncStatus.type === 'error' && <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />}
                    {syncStatus.type === 'loading' && <RefreshCw className="w-4 h-4 text-blue-600 animate-spin shrink-0 mt-0.5" />}
                    <span className="font-medium leading-relaxed">{syncStatus.message}</span>
                  </div>
                  <button
                    onClick={() => setSyncStatus(null)}
                    className="text-neutral-400 hover:text-neutral-700 shrink-0"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* État de la connexion Firebase & Droits */}
              <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 space-y-2.5">
                <div className="text-[11px] font-bold text-neutral-800 uppercase tracking-wider">
                  Statut de l'environnement Cloud
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="p-2.5 rounded-lg bg-white border border-neutral-200">
                    <div className="text-neutral-500 text-[10px] mb-1">Base Firestore</div>
                    {isFirebaseConnected ? (
                      <div className="flex items-center gap-1.5 text-emerald-700 font-bold">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="truncate">Connecté ({firebaseCfg.projectId})</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-neutral-500 font-medium">
                        <span className="w-2 h-2 rounded-full bg-neutral-400" />
                        <span>Non configuré (Local)</span>
                      </div>
                    )}
                  </div>

                  <div className="p-2.5 rounded-lg bg-white border border-neutral-200">
                    <div className="text-neutral-500 text-[10px] mb-1">Droits d'écriture</div>
                    {firebaseUser ? (
                      <div className="flex items-center gap-1.5 text-emerald-700 font-bold">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span className="truncate">Admin ({firebaseUser.email?.split('@')[0]})</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-amber-700 font-medium">
                        <Eye className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span>Lecture seule</span>
                      </div>
                    )}
                  </div>
                </div>

                {isFirebaseConnected && firebaseCfg.databaseId && firebaseCfg.databaseId !== '(default)' && (
                  <div className="text-[10px] text-neutral-600 font-mono bg-white px-2 py-1 rounded border border-neutral-200">
                    Base ciblée : <strong>{firebaseCfg.databaseId}</strong> (Base nommée)
                  </div>
                )}
              </div>

              {/* Actions de Synchronisation Firestore */}
              <div className="p-4 rounded-xl bg-white border border-neutral-200 shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-neutral-900 text-xs flex items-center gap-1.5">
                    <RefreshCw className="w-3.5 h-3.5 text-[#cf4c1b]" />
                    <span>Synchronisation des Données</span>
                  </h4>
                  <label className="flex items-center gap-1.5 text-[11px] text-neutral-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={realtimeSync}
                      onChange={(e) => setRealtimeSync(e.target.checked)}
                      className="rounded accent-[#cf4c1b]"
                    />
                    <span>Temps réel</span>
                  </label>
                </div>

                <p className="text-[11px] text-neutral-500 leading-relaxed">
                  Enregistrez vos modifications dans Firestore pour que tous les visiteurs de votre site GitHub Pages les voient instantanément.
                </p>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleSaveToFirebase}
                    disabled={!isFirebaseConnected}
                    className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-2xs ${
                      !isFirebaseConnected
                        ? 'bg-neutral-100 text-neutral-400 cursor-not-allowed'
                        : !firebaseUser
                        ? 'bg-amber-100 text-amber-900 hover:bg-amber-200'
                        : 'bg-[#cf4c1b] hover:bg-[#b83811] text-white'
                    }`}
                    title={!firebaseUser ? 'Connexion admin requise pour écrire dans Firestore' : 'Sauvegarder'}
                  >
                    <Cloud className="w-3.5 h-3.5" />
                    <span>Sauvegarder Cloud</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleLoadFromFirebase}
                    disabled={!isFirebaseConnected}
                    className={`py-2 px-3 rounded-lg text-xs font-medium border flex items-center justify-center gap-1.5 transition-colors ${
                      !isFirebaseConnected
                        ? 'border-neutral-200 text-neutral-400 cursor-not-allowed'
                        : 'border-neutral-300 text-neutral-700 hover:bg-neutral-50'
                    }`}
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Recharger Cloud</span>
                  </button>
                </div>
              </div>

              {/* 1. Authentification Administrateur (Email & Mot de passe) */}
              <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-neutral-900 text-xs flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-[#cf4c1b]" />
                    <span>Connexion Admin Firebase (Email & Mot de passe)</span>
                  </h4>
                  {firebaseUser && (
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                      Connecté
                    </span>
                  )}
                </div>

                <p className="text-[11px] text-neutral-500 leading-relaxed">
                  Conformément aux règles Firestore, <strong>seul l'administrateur connecté par email aura le droit d'écrire</strong>. Les visiteurs anonymes liront la base en lecture seule sans pouvoir la modifier.
                </p>

                {firebaseUser ? (
                  <div className="p-3 bg-white rounded-lg border border-emerald-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500" />
                        <span className="font-semibold text-neutral-900 text-[11px]">
                          {firebaseUser.email}
                        </span>
                      </div>
                      <button
                        onClick={handleAdminEmailLogout}
                        className="text-[10px] text-red-600 hover:text-red-700 font-semibold"
                      >
                        Se déconnecter
                      </button>
                    </div>
                    <div className="text-[10px] text-emerald-800">
                      ✓ Authentification vérifiée par Firebase Auth. Vos sauvegardes seront acceptées par Firestore.
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleAdminEmailLogin} className="space-y-2.5">
                    <div>
                      <label className="block text-[10px] font-semibold text-neutral-700 mb-1">
                        Adresse e-mail administrateur
                      </label>
                      <input
                        type="email"
                        value={authEmailInput}
                        onChange={(e) => setAuthEmailInput(e.target.value)}
                        placeholder="mezitineraires@gmail.com"
                        required
                        className="w-full px-3 py-1.5 bg-white border border-neutral-300 rounded-lg text-neutral-900 text-xs focus:ring-1 focus:ring-[#cf4c1b] focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-semibold text-neutral-700 mb-1">
                        Mot de passe administrateur Firebase
                      </label>
                      <input
                        type="password"
                        value={authPassInput}
                        onChange={(e) => setAuthPassInput(e.target.value)}
                        placeholder="Mot de passe créé dans Firebase Auth..."
                        required
                        className="w-full px-3 py-1.5 bg-white border border-neutral-300 rounded-lg text-neutral-900 text-xs focus:ring-1 focus:ring-[#cf4c1b] focus:outline-none"
                      />
                    </div>

                    {authError && (
                      <div className="p-2 rounded-lg bg-red-50 border border-red-200 text-red-700 text-[10px]">
                        {authError}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={authLoading || !isFirebaseConnected}
                      className={`w-full py-2 px-3 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors ${
                        !isFirebaseConnected
                          ? 'bg-neutral-200 text-neutral-400 cursor-not-allowed'
                          : 'bg-neutral-900 hover:bg-black text-white'
                      }`}
                    >
                      {authLoading ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Lock className="w-3.5 h-3.5" />
                      )}
                      <span>Se connecter en tant qu'administrateur</span>
                    </button>
                  </form>
                )}
              </div>

              {/* 2. Configuration des Identifiants Firebase */}
              <form onSubmit={handleConnectFirebase} className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-neutral-900 text-xs flex items-center gap-1.5">
                    <Server className="w-3.5 h-3.5 text-[#cf4c1b]" />
                    <span>Configuration du projet Firebase</span>
                  </h4>
                  {isFirebaseConnected && (
                    <span className="text-[10px] text-emerald-700 font-medium">Actif</span>
                  )}
                </div>

                <p className="text-[11px] text-neutral-500">
                  Collez ci-dessous les paramètres de votre application Web Firebase (console.firebase.google.com).
                </p>

                <div className="space-y-2">
                  <div>
                    <label className="block text-[10px] font-semibold text-neutral-700 mb-0.5">
                      Clé API (apiKey)
                    </label>
                    <input
                      type="text"
                      value={firebaseCfg.apiKey}
                      onChange={(e) => setFirebaseCfg({ ...firebaseCfg, apiKey: e.target.value })}
                      placeholder="AIzaSy..."
                      required
                      className="w-full px-2.5 py-1.5 bg-white border border-neutral-300 rounded-lg text-neutral-900 font-mono text-[11px] focus:ring-1 focus:ring-[#cf4c1b] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-neutral-700 mb-0.5">
                      ID du Projet (projectId)
                    </label>
                    <input
                      type="text"
                      value={firebaseCfg.projectId}
                      onChange={(e) => setFirebaseCfg({ ...firebaseCfg, projectId: e.target.value })}
                      placeholder="mon-projet-gravel"
                      required
                      className="w-full px-2.5 py-1.5 bg-white border border-neutral-300 rounded-lg text-neutral-900 font-mono text-[11px] focus:ring-1 focus:ring-[#cf4c1b] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-neutral-700 mb-0.5">
                      Nom de la Base Firestore (databaseId)
                    </label>
                    <input
                      type="text"
                      value={firebaseCfg.databaseId || '(default)'}
                      onChange={(e) => setFirebaseCfg({ ...firebaseCfg, databaseId: e.target.value })}
                      placeholder="(default) ou nom de votre 2e base..."
                      className="w-full px-2.5 py-1.5 bg-white border border-neutral-300 rounded-lg text-neutral-900 font-mono text-[11px] focus:ring-1 focus:ring-[#cf4c1b] focus:outline-none"
                    />
                    <span className="text-[10px] text-neutral-500">
                      💡 Laissez <code>(default)</code> ou indiquez le nom de votre 2e base si vous en avez déjà une.
                    </span>
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-neutral-700 mb-0.5">
                      Domaine Auth (authDomain)
                    </label>
                    <input
                      type="text"
                      value={firebaseCfg.authDomain}
                      onChange={(e) => setFirebaseCfg({ ...firebaseCfg, authDomain: e.target.value })}
                      placeholder="mon-projet.firebaseapp.com"
                      className="w-full px-2.5 py-1.5 bg-white border border-neutral-300 rounded-lg text-neutral-900 font-mono text-[11px] focus:ring-1 focus:ring-[#cf4c1b] focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="submit"
                    className="flex-1 py-1.5 px-3 bg-[#cf4c1b] hover:bg-[#b83811] text-white text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-2xs"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Enregistrer & Connecter</span>
                  </button>
                  {isFirebaseConnected && (
                    <button
                      type="button"
                      onClick={() => {
                        clearSavedFirebaseConfig();
                        setIsFirebaseConnected(false);
                        setFirebaseUser(null);
                        setFirebaseCfg({
                          apiKey: '',
                          authDomain: '',
                          projectId: '',
                          databaseId: '(default)',
                          appId: ''
                        });
                        setSyncStatus({ type: 'success', message: 'Configuration Firebase effacée du navigateur.' });
                      }}
                      className="py-1.5 px-3 border border-neutral-300 hover:bg-neutral-100 text-neutral-600 text-xs rounded-lg transition-colors"
                      title="Effacer"
                    >
                      Effacer
                    </button>
                  )}
                </div>
              </form>

              {/* Rendre visible à tous les visiteurs (GitHub Pages) */}
              <div className="p-4 rounded-xl bg-blue-50/80 border border-blue-250 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-blue-950 text-xs flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-blue-700" />
                    <span>Visibilité pour TOUS les visiteurs (GitHub Pages)</span>
                  </h4>
                  {firebaseCfg.apiKey && firebaseCfg.projectId && (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          const jsonStr = JSON.stringify({
                            apiKey: firebaseCfg.apiKey.trim(),
                            authDomain: firebaseCfg.authDomain?.trim() || `${firebaseCfg.projectId.trim()}.firebaseapp.com`,
                            projectId: firebaseCfg.projectId.trim(),
                            databaseId: firebaseCfg.databaseId?.trim() || '(default)',
                            appId: firebaseCfg.appId?.trim() || ''
                          }, null, 2);
                          navigator.clipboard.writeText(jsonStr);
                          setSyncStatus({ type: 'success', message: 'Configuration copiée ! Collez-la dans src/firebase-config.json' });
                        }}
                        className="py-1 px-2.5 rounded bg-white hover:bg-blue-100 border border-blue-300 text-blue-900 text-[10px] font-semibold flex items-center gap-1 shadow-2xs cursor-pointer"
                        title="Copier le code JSON"
                      >
                        <Copy className="w-3 h-3 text-blue-700" />
                        <span>Copier JSON</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          const jsonStr = JSON.stringify({
                            apiKey: firebaseCfg.apiKey.trim(),
                            authDomain: firebaseCfg.authDomain?.trim() || `${firebaseCfg.projectId.trim()}.firebaseapp.com`,
                            projectId: firebaseCfg.projectId.trim(),
                            databaseId: firebaseCfg.databaseId?.trim() || '(default)',
                            appId: firebaseCfg.appId?.trim() || ''
                          }, null, 2);
                          const blob = new Blob([jsonStr], { type: 'application/json' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = 'firebase-config.json';
                          a.click();
                          URL.revokeObjectURL(url);
                          setSyncStatus({ type: 'success', message: 'Fichier firebase-config.json téléchargé ! Placez-le dans src/ et publiez sur GitHub.' });
                        }}
                        className="py-1 px-2.5 rounded bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-semibold flex items-center gap-1 shadow-2xs cursor-pointer"
                        title="Télécharger directement le fichier prêt pour GitHub"
                      >
                        <Download className="w-3 h-3" />
                        <span>Télécharger .json</span>
                      </button>
                    </div>
                  )}
                </div>

                <div className="text-[11px] text-blue-900 leading-relaxed space-y-1.5">
                  <p>
                    <strong>💡 Pourquoi vos visiteurs ne voyaient pas encore la nouvelle icône ?</strong>
                  </p>
                  <p className="text-[10px] text-blue-800">
                    1. <strong>Vos clés Firebase</strong> étaient jusqu'ici enregistrées uniquement dans le <code>localStorage</code> de votre propre navigateur. Les visiteurs qui ouvrent <code>https://fabriziodelarusta.github.io/</code> ont un navigateur vierge et ne savaient pas à quelle base se connecter.
                  </p>
                  <p className="text-[10px] text-blue-800">
                    2. <strong>La solution permanente</strong> : nous avons créé le fichier <code>src/firebase-config.json</code> dans le projet. Une fois vos clés renseignées dans ce fichier et poussées sur GitHub (<code>git push</code>), l'application se connectera automatiquement à Firestore pour <strong>100% de vos visiteurs</strong> !
                  </p>
                </div>
              </div>

              {/* 3. Fichiers Icônes sur GitHub (Lecture Seule) */}
              <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-neutral-900 text-xs flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-[#cf4c1b]" />
                    <span>Fichiers Icônes sur GitHub (Lecture Seule)</span>
                  </h4>
                  <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                    Protégé
                  </span>
                </div>

                <p className="text-[11px] text-neutral-600 leading-relaxed">
                  Sur <strong>GitHub Pages</strong>, les fichiers committés dans le dépôt Git (ex: dans le dossier <code>public/icons/</code>) sont hébergés statiquement sur CDN : ils sont <strong>strictement en lecture seule pour tous les visiteurs</strong>.
                </p>

                <div className="p-3 bg-white rounded-lg border border-neutral-200 space-y-2">
                  <div className="font-semibold text-neutral-800 text-[11px]">
                    Comment ajouter vos icônes dans GitHub :
                  </div>
                  <ol className="list-decimal list-inside space-y-1 text-[11px] text-neutral-600">
                    <li>Déposez vos fichiers <code>.svg</code> ou <code>.png</code> dans le dossier <code>public/icons/</code> de votre projet.</li>
                    <li>Effectuez votre commit et push vers GitHub (<code>git push</code>).</li>
                    <li>Dans l'onglet <strong>Icônes</strong>, indiquez simplement le chemin : <code>icons/mon-fichier.svg</code>.</li>
                  </ol>
                </div>

                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold text-neutral-700">Icônes déjà prêtes dans votre projet :</span>
                  <div className="grid grid-cols-3 gap-1.5">
                    {GITHUB_SAMPLE_ICONS.map((item) => (
                      <div
                        key={item.path}
                        className="p-2 bg-white rounded-lg border border-neutral-200 flex flex-col items-center text-center gap-1 hover:border-[#cf4c1b] transition-colors"
                      >
                        <img src={item.path} alt="" className="w-5 h-5 object-contain" />
                        <span className="font-mono text-[9px] text-neutral-700 truncate w-full">{item.path}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* 4. Règles de Sécurité Firestore (firestore.rules) */}
              <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-neutral-900 text-xs flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#cf4c1b]" />
                    <span>Règles de sécurité Firestore (firestore.rules)</span>
                  </h4>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(generateFirestoreRules(firebaseUser?.email || authEmailInput || 'mezitineraires@gmail.com'));
                      setCopiedRules(true);
                      setTimeout(() => setCopiedRules(false), 2000);
                    }}
                    className="py-1 px-2.5 rounded bg-white hover:bg-neutral-100 border border-neutral-300 text-neutral-700 text-[10px] font-semibold flex items-center gap-1 shadow-2xs"
                  >
                    {copiedRules ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedRules ? 'Copié !' : 'Copier'}</span>
                  </button>
                </div>

                <p className="text-[11px] text-neutral-500">
                  Collez ce bloc dans <strong>Firestore Database &gt; Règles</strong> pour garantir : lecture publique pour tous, écriture réservée à votre email.
                </p>

                <pre className="p-3 bg-neutral-900 text-neutral-100 rounded-lg text-[10px] font-mono overflow-x-auto leading-relaxed border border-neutral-800">
{generateFirestoreRules(firebaseUser?.email || authEmailInput || 'mezitineraires@gmail.com')}
                </pre>
              </div>

              {/* 5. Guide interactif pas à pas */}
              <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 space-y-3">
                <h4 className="font-bold text-neutral-900 text-xs flex items-center gap-1.5">
                  <HelpCircle className="w-3.5 h-3.5 text-[#cf4c1b]" />
                  <span>Guide pas à pas</span>
                </h4>

                <div className="flex gap-1 border-b border-neutral-200 pb-1 overflow-x-auto">
                  <button
                    type="button"
                    onClick={() => setSelectedGuideTab('existing_db')}
                    className={`py-1 px-2 rounded text-[10px] font-semibold whitespace-nowrap ${
                      selectedGuideTab === 'existing_db' ? 'bg-[#cf4c1b] text-white' : 'text-neutral-600 hover:bg-neutral-200'
                    }`}
                  >
                    Base existante
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedGuideTab('auth')}
                    className={`py-1 px-2 rounded text-[10px] font-semibold whitespace-nowrap ${
                      selectedGuideTab === 'auth' ? 'bg-[#cf4c1b] text-white' : 'text-neutral-600 hover:bg-neutral-200'
                    }`}
                  >
                    Email & Password
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedGuideTab('rules')}
                    className={`py-1 px-2 rounded text-[10px] font-semibold whitespace-nowrap ${
                      selectedGuideTab === 'rules' ? 'bg-[#cf4c1b] text-white' : 'text-neutral-600 hover:bg-neutral-200'
                    }`}
                  >
                    Règles Firestore
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedGuideTab('github_icons')}
                    className={`py-1 px-2 rounded text-[10px] font-semibold whitespace-nowrap ${
                      selectedGuideTab === 'github_icons' ? 'bg-[#cf4c1b] text-white' : 'text-neutral-600 hover:bg-neutral-200'
                    }`}
                  >
                    Fichiers GitHub
                  </button>
                </div>

                <div className="text-[11px] text-neutral-700 leading-relaxed space-y-2">
                  {selectedGuideTab === 'existing_db' && (
                    <div className="space-y-2">
                      <div className="font-bold text-neutral-900">
                        Comment faire si vous avez DÉJÀ une base dans Firebase ?
                      </div>
                      <p>
                        Vous avez deux solutions très simples et 100% compatibles :
                      </p>
                      <div className="p-2.5 rounded-lg bg-white border border-neutral-200 space-y-1">
                        <strong className="text-emerald-800">Option 1 (Recommandée) : Nouveau projet Firebase dédié</strong>
                        <p className="text-neutral-600 text-[10px]">
                          Dans Firebase Console, cliquez sur <em>« Ajouter un projet »</em> (ex: <code>mez-itineraires-gravel</code>). C'est entièrement gratuit, et cela permet d'isoler parfaitement les utilisateurs et les règles sans aucun impact sur votre autre projet.
                        </p>
                      </div>
                      <div className="p-2.5 rounded-lg bg-white border border-neutral-200 space-y-1">
                        <strong className="text-blue-800">Option 2 : Base nommée (Named Database)</strong>
                        <p className="text-neutral-600 text-[10px]">
                          Dans votre projet existant, allez sur <em>Firestore Database</em> &gt; cliquez sur le sélecteur de base en haut &gt; <em>« Créer une base de données »</em> &gt; nommez-la par exemple <code>gravel-db</code>. Renseignez ensuite <code>gravel-db</code> dans le champ <em>Nom de la Base (databaseId)</em> ci-dessus !
                        </p>
                      </div>
                    </div>
                  )}

                  {selectedGuideTab === 'auth' && (
                    <div className="space-y-1.5">
                      <div className="font-bold text-neutral-900">Activer Email & Password dans Firebase :</div>
                      <ol className="list-decimal list-inside space-y-1 text-neutral-600">
                        <li>Rendez-vous dans la console Firebase &gt; <strong>Authentication</strong>.</li>
                        <li>Onglet <strong>Sign-in method</strong> &gt; Cliquez sur <strong>Adresse e-mail/mot de passe</strong> &gt; Activez le premier commutateur &gt; Enregistrer.</li>
                        <li>Onglet <strong>Users</strong> &gt; Cliquez sur <strong>Ajouter un utilisateur</strong>.</li>
                        <li>Entrez votre e-mail (ex: <code>mezitineraires@gmail.com</code>) et définissez votre mot de passe secret.</li>
                        <li>Vous pouvez désormais vous connecter dans le formulaire ci-dessus pour obtenir les droits d'écriture !</li>
                      </ol>
                    </div>
                  )}

                  {selectedGuideTab === 'rules' && (
                    <div className="space-y-1.5">
                      <div className="font-bold text-neutral-900">Appliquer les règles de sécurité :</div>
                      <p className="text-neutral-600">
                        Allez dans Firestore Database &gt; onglet <strong>Règles</strong> &gt; remplacez tout par le code fourni dans l'encadré ci-dessus &gt; cliquez sur <strong>Publier</strong>.
                      </p>
                      <p className="text-[10px] text-emerald-800 font-medium">
                        ✓ Vos données sont protégées : personne d'autre que votre compte ne peut modifier ou supprimer la configuration du portail.
                      </p>
                    </div>
                  )}

                  {selectedGuideTab === 'github_icons' && (
                    <div className="space-y-1.5">
                      <div className="font-bold text-neutral-900">Fichiers GitHub en lecture seule :</div>
                      <p className="text-neutral-600">
                        GitHub Pages sert vos fichiers de manière statique. Les utilisateurs n'ont aucun droit d'écriture sur votre repository Git, ce qui garantit que vos icônes et logos hébergés dans <code>public/icons/</code> ne peuvent jamais être altérés.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ---------------------------------------------------- */}
          {/* ONGLET SÉCURITÉ : HACHAGE SHA-256 SANS MOT DE PASSE  */}
          {/* ---------------------------------------------------- */}
          {activeTab === 'security' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between pb-2 border-b border-neutral-200">
                <div>
                  <h3 className="font-bold text-neutral-900 text-sm">Sécurité & Confidentialité</h3>
                  <p className="text-neutral-500 text-[11px]">Protection cryptographique SHA-256 avec sel</p>
                </div>
                <div className="p-1 rounded bg-[#cf4c1b]/10 text-[#cf4c1b]">
                  <ShieldCheck className="w-4 h-4" />
                </div>
              </div>

              {/* Explication de non-visibilité */}
              <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200 text-emerald-900 text-[11px] space-y-1">
                <div className="flex items-center gap-1.5 font-bold">
                  <KeyRound className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Votre mot de passe n'est PAS visible en clair :</span>
                </div>
                <p className="leading-relaxed">
                  Le système utilise l'API de cryptographie standard du navigateur (<strong>SHA-256</strong>). Seule une empreinte numérique irréversible est enregistrée. Même si un visiteur inspecte le code source ou la mémoire du navigateur, il ne peut pas voir votre mot de passe.
                </p>
              </div>

              {/* 1. Activer / Désactiver la protection */}
              <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="font-semibold text-neutral-900 block text-xs">
                      Protection par mot de passe
                    </label>
                    <p className="text-[11px] text-neutral-500">
                      Demande un mot de passe avant d'ouvrir le panneau
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={config.security.requirePassword}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        security: { ...config.security, requirePassword: e.target.checked }
                      })
                    }
                    className="w-4 h-4 rounded accent-[#cf4c1b] cursor-pointer"
                  />
                </div>
              </div>

              {/* 2. Formulaire pour Changer le mot de passe */}
              <form onSubmit={handleChangePassword} className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 space-y-3">
                <h4 className="font-bold text-neutral-900 text-xs flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-[#cf4c1b]" />
                  <span>Changer le mot de passe</span>
                </h4>

                <div>
                  <label className="block text-[11px] font-semibold text-neutral-700 mb-1">
                    Mot de passe actuel
                  </label>
                  <input
                    type="password"
                    value={currentPass}
                    onChange={(e) => setCurrentPass(e.target.value)}
                    placeholder="Entrez votre mot de passe actuel..."
                    required
                    className="w-full px-3 py-1.5 bg-white border border-neutral-300 rounded-lg text-neutral-900 text-xs focus:ring-1 focus:ring-[#cf4c1b] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-neutral-700 mb-1">
                    Nouveau mot de passe
                  </label>
                  <input
                    type="password"
                    value={newPass}
                    onChange={(e) => setNewPass(e.target.value)}
                    placeholder="Au moins 4 caractères..."
                    required
                    className="w-full px-3 py-1.5 bg-white border border-neutral-300 rounded-lg text-neutral-900 text-xs focus:ring-1 focus:ring-[#cf4c1b] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-neutral-700 mb-1">
                    Confirmer le nouveau mot de passe
                  </label>
                  <input
                    type="password"
                    value={confirmPass}
                    onChange={(e) => setConfirmPass(e.target.value)}
                    placeholder="Répétez le nouveau mot de passe..."
                    required
                    className="w-full px-3 py-1.5 bg-white border border-neutral-300 rounded-lg text-neutral-900 text-xs focus:ring-1 focus:ring-[#cf4c1b] focus:outline-none"
                  />
                </div>

                {passwordChangeStatus && (
                  <div className={`p-2 rounded-lg text-[11px] font-medium ${
                    passwordChangeStatus.type === 'success'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {passwordChangeStatus.message}
                  </div>
                )}

                <div className="pt-1">
                  <button
                    type="submit"
                    className="w-full py-2 px-3 rounded-lg bg-[#cf4c1b] hover:bg-[#b83811] text-white font-semibold text-xs transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Sauvegarder le nouveau mot de passe</span>
                  </button>
                </div>
              </form>

              {/* 3. Mode Furtif */}
              <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="font-semibold text-neutral-900 block text-xs">
                      Mode Furtif (Discrétion totale)
                    </label>
                    <p className="text-[11px] text-neutral-500">
                      Masque la poignée latérale aux yeux du public
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={config.security.stealthMode}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        security: { ...config.security, stealthMode: e.target.checked }
                      })
                    }
                    className="w-4 h-4 rounded accent-[#cf4c1b] cursor-pointer"
                  />
                </div>

                {config.security.stealthMode && (
                  <div className="pt-2 border-t border-neutral-200 text-[11px] text-neutral-600 space-y-1.5">
                    <p className="font-semibold text-neutral-800">Comment ouvrir en Mode Furtif :</p>
                    <div className="flex items-start gap-2">
                      <span className="font-bold text-[#cf4c1b]">1.</span>
                      <span>Ajoutez <code className="bg-neutral-200 px-1 py-0.5 rounded text-neutral-900 font-mono">?admin=1</code> à l'URL.</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="font-bold text-[#cf4c1b]">2.</span>
                      <span>Ou pressez les touches <kbd className="bg-neutral-200 px-1 py-0.5 rounded text-neutral-900 font-mono">Ctrl + Alt + P</kbd>.</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="font-bold text-[#cf4c1b]">3.</span>
                      <span>Ou effectuez un <strong>triple-clic</strong> sur le texte de version en bas.</span>
                    </div>
                  </div>
                )}
              </div>

              {/* 4. Bouton Verrouiller */}
              <div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full py-2.5 px-4 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-800 font-semibold text-xs transition-colors flex items-center justify-center gap-2 border border-neutral-300"
                >
                  <Lock className="w-3.5 h-3.5 text-[#cf4c1b]" />
                  <span>Verrouiller la session maintenant</span>
                </button>
              </div>
            </div>
          )}

          {/* ---------------------------------------------------- */}
          {/* ONGLET 1 : GRILLE D'ICÔNES (LIGNES & COLONNES)       */}
          {/* ---------------------------------------------------- */}
          {activeTab === 'grid' && (
            <div className="space-y-5">
              <div>
                <h3 className="font-bold text-neutral-900 text-sm mb-1">Configuration de la Grille</h3>
                <p className="text-neutral-500 text-[11px]">Définissez le nombre de lignes et de colonnes de la page.</p>
              </div>

              <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-neutral-50 border border-neutral-200">
                <div>
                  <label className="block font-semibold text-neutral-800 mb-1.5">
                    Nombre de lignes ({config.gridRows})
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="6"
                    value={config.gridRows}
                    onChange={(e) => setConfig({ ...config, gridRows: Number(e.target.value) })}
                    className="w-full accent-[#cf4c1b]"
                  />
                  <div className="flex justify-between text-[10px] text-neutral-400 mt-1 font-mono">
                    <span>1</span>
                    <span>3</span>
                    <span>6</span>
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-neutral-800 mb-1.5">
                    Nombre de colonnes ({config.gridCols})
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="8"
                    value={config.gridCols}
                    onChange={(e) => setConfig({ ...config, gridCols: Number(e.target.value) })}
                    className="w-full accent-[#cf4c1b]"
                  />
                  <div className="flex justify-between text-[10px] text-neutral-400 mt-1 font-mono">
                    <span>1</span>
                    <span>4</span>
                    <span>8</span>
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200 text-[11px] space-y-1">
                <div className="flex justify-between font-semibold">
                  <span className="text-neutral-600">Capacité totale de la grille :</span>
                  <span className="text-neutral-900 font-mono">{config.gridRows * config.gridCols} cases ({config.gridRows} × {config.gridCols})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-emerald-700">Icônes dans la grille :</span>
                  <span className="text-emerald-700 font-mono font-bold">{inGridIcons.length}</span>
                </div>
                {overflowIcons.length > 0 && (
                  <div className="flex justify-between">
                    <span className="text-[#cf4c1b]">Icônes hors grille (liste déroulante) :</span>
                    <span className="text-[#cf4c1b] font-mono font-bold">{overflowIcons.length}</span>
                  </div>
                )}

                {positionConflicts.length > 0 && (
                  <div className="mt-2 p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-[11px] space-y-1.5">
                    <div className="font-bold flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span>{positionConflicts.length} doublon(s) de coordonnées détecté(s)</span>
                    </div>
                    <p className="text-[10px] text-amber-800 leading-snug">
                      Des icônes partagent la même case (ex: L1, C1). Elles sont automatiquement décalées sur des cases libres pour être 100% visibles.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setConfig(prev => ({
                          ...prev,
                          gridRows: Math.max(prev.gridRows, effectiveGridRows),
                          icons: inGridIcons
                        }));
                        setSyncStatus({ type: 'success', message: 'Positions nettoyées et réassignées sans doublon ! Cliquez sur "Sauvegarder Cloud" pour mettre à jour Firestore.' });
                      }}
                      className="w-full py-1 px-2 bg-amber-600 hover:bg-amber-700 text-white rounded font-semibold text-[10px] transition-colors cursor-pointer"
                    >
                      Fixer les positions corrigées & agrandir la grille
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block font-semibold text-neutral-800 mb-1">
                    Espacement entre les icônes ({config.gridGap} px)
                  </label>
                  <input
                    type="range"
                    min="16"
                    max="72"
                    step="4"
                    value={config.gridGap}
                    onChange={(e) => setConfig({ ...config, gridGap: Number(e.target.value) })}
                    className="w-full accent-[#cf4c1b]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-neutral-800 mb-1">
                    Taille des icônes ({config.iconSize} px)
                  </label>
                  <input
                    type="range"
                    min="36"
                    max="80"
                    step="2"
                    value={config.iconSize}
                    onChange={(e) => setConfig({ ...config, iconSize: Number(e.target.value) })}
                    className="w-full accent-[#cf4c1b]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="block font-medium text-neutral-700 mb-1">Fond de l'icône</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={config.iconBgColor}
                        onChange={(e) => setConfig({ ...config, iconBgColor: e.target.value })}
                        className="w-8 h-8 rounded border border-neutral-300 cursor-pointer"
                      />
                      <span className="font-mono text-[11px] text-neutral-600">{config.iconBgColor}</span>
                    </div>
                  </div>

                  <div>
                    <label className="block font-medium text-neutral-700 mb-1">Bordure</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={config.iconBorderColor}
                        onChange={(e) => setConfig({ ...config, iconBorderColor: e.target.value })}
                        className="w-8 h-8 rounded border border-neutral-300 cursor-pointer"
                      />
                      <span className="font-mono text-[11px] text-neutral-600">{config.iconBorderColor}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ---------------------------------------------------- */}
          {/* ONGLET 2 : GESTION DES ICÔNES                        */}
          {/* ---------------------------------------------------- */}
          {activeTab === 'icons' && (
            <div className="space-y-4">
              {!editingIcon ? (
                <>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-neutral-900 text-sm">Liste des icônes</h3>
                      <p className="text-neutral-500 text-[11px]">Triées par Ligne puis Colonne</p>
                    </div>
                    <button
                      onClick={() => {
                        setIsAddingNew(true);
                        setEditingIcon({
                          id: 'icon-' + Date.now(),
                          row: 1,
                          col: 1,
                          iconPath: 'Bike',
                          targetUrl: 'routes.html',
                          label: 'Nouvelle page',
                          openInNewTab: false
                        });
                      }}
                      className="py-1.5 px-3 rounded-lg bg-[#cf4c1b] text-white font-semibold text-xs hover:bg-[#b83811] transition-colors flex items-center gap-1.5 shadow-2xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Ajouter</span>
                    </button>
                  </div>

                  {/* Alerte si conflit de position (plusieurs icônes sur la même case) */}
                  {positionConflicts.length > 0 && (
                    <div className="p-3 rounded-xl bg-amber-50 border border-amber-300 text-amber-950 text-xs space-y-2">
                      <div className="flex items-center gap-2 font-bold text-[11px] text-amber-900">
                        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>Même case partagée par plusieurs icônes ({positionConflicts.length})</span>
                      </div>
                      <p className="text-[10px] text-amber-800 leading-relaxed">
                        Plusieurs icônes ont le même numéro de Ligne et Colonne. L'icône la plus récente est affichée dans la grille, et la seconde est automatiquement basculée dans la <strong>liste déroulante</strong> sous la grille :
                      </p>
                      {positionConflicts.map(c => (
                        <div key={c.key} className="p-2.5 bg-white rounded-lg border border-amber-200 text-[10px] space-y-1.5 shadow-2xs">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-[#cf4c1b]">Case Ligne {c.row} · Colonne {c.col} :</span>
                            <span className="text-[9px] text-neutral-500 font-mono">({c.items.length} icônes)</span>
                          </div>
                          <div className="space-y-1">
                            {c.items.map((it, idx) => (
                              <div key={it.id} className="flex items-center justify-between gap-1 pl-1">
                                <span className="truncate max-w-[200px]">
                                  <strong>{it.label || 'Sans nom'}</strong>
                                  <span className="text-neutral-500 text-[9px] ml-1">
                                    {idx === 0 ? '✓ (Grille)' : '↳ (Déroulante)'}
                                  </span>
                                </span>
                                {idx > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => resolveConflict(it.id)}
                                    className="px-2 py-0.5 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded font-semibold text-[9px] transition-colors"
                                    title="Déplacer vers la prochaine case libre"
                                  >
                                    Case libre
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="space-y-2">
                    <div className="text-[11px] font-bold text-neutral-800 uppercase tracking-wider flex items-center justify-between">
                      <span>Dans la grille ({inGridIcons.length})</span>
                      <span className="font-mono text-[10px] text-neutral-500">Max L{config.gridRows} × C{config.gridCols}</span>
                    </div>

                    {inGridIcons.map((item) => (
                      <div
                        key={item.id}
                        className="p-3 rounded-xl border border-neutral-200 bg-neutral-50/80 hover:bg-white hover:border-neutral-300 transition-all flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${isHttpUrlIcon(item.iconPath) ? 'bg-transparent border-0' : 'bg-white border border-neutral-200'}`}>
                            {renderIconGraphic(item.iconPath, 34, isHttpUrlIcon(item.iconPath))}
                          </div>
                          <div className="min-w-0">
                            <h4 className="font-semibold text-neutral-900 truncate text-xs">{item.label || 'Sans libellé'}</h4>
                            <div className="flex items-center gap-2 text-[10px] text-neutral-500 font-mono">
                              <span className="text-[#cf4c1b] font-bold">Ligne {item.row} · Col {item.col}</span>
                              <span>→</span>
                              <span className="truncate max-w-[110px]">{item.targetUrl}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => {
                              setEditingIcon(item);
                              setIsAddingNew(false);
                            }}
                            className="p-1.5 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-200 rounded-md transition-colors"
                            title="Modifier"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => deleteIconItem(item.id)}
                            className="p-1.5 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                            title="Supprimer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {overflowIcons.length > 0 && (
                    <div className="space-y-2 pt-2 border-t border-neutral-200">
                      <div className="text-[11px] font-bold text-[#cf4c1b] uppercase tracking-wider flex items-center justify-between">
                        <span>Hors grille · Liste déroulante ({overflowIcons.length})</span>
                        <span className="font-mono text-[10px] text-neutral-500">Affichées sous la grille</span>
                      </div>

                      {overflowIcons.map((item) => (
                        <div
                          key={item.id}
                          className="p-3 rounded-xl border border-amber-200/80 bg-amber-50/50 hover:bg-white hover:border-amber-300 transition-all flex items-center justify-between gap-3"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${isHttpUrlIcon(item.iconPath) ? 'bg-transparent border-0' : 'bg-white border border-amber-200'}`}>
                              {renderIconGraphic(item.iconPath, 34, isHttpUrlIcon(item.iconPath))}
                            </div>
                            <div className="min-w-0">
                              <h4 className="font-semibold text-neutral-900 truncate text-xs">{item.label || 'Sans libellé'}</h4>
                              <div className="flex items-center gap-2 text-[10px] text-amber-800 font-mono">
                                <span className="font-bold">Ligne {item.row} · Col {item.col}</span>
                                <span>→</span>
                                <span className="truncate max-w-[110px]">{item.targetUrl}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => {
                                setEditingIcon(item);
                                setIsAddingNew(false);
                              }}
                              className="p-1.5 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-200 rounded-md transition-colors"
                              title="Modifier"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => deleteIconItem(item.id)}
                              className="p-1.5 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                              title="Supprimer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    saveIconItem(editingIcon);
                  }}
                  className="space-y-4 p-4 rounded-xl bg-neutral-50 border border-neutral-200"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-neutral-200">
                    <h3 className="font-bold text-neutral-900 text-xs">
                      {isAddingNew ? 'Ajouter une icône' : 'Modifier l’icône'}
                    </h3>
                    <button
                      type="button"
                      onClick={() => setEditingIcon(null)}
                      className="text-neutral-400 hover:text-neutral-700"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-neutral-800 text-[11px] mb-1">
                        N° de ligne
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="20"
                        value={editingIcon.row}
                        onChange={(e) =>
                          setEditingIcon({ ...editingIcon, row: Math.max(1, Number(e.target.value)) })
                        }
                        className="w-full px-3 py-1.5 bg-white border border-neutral-300 rounded-lg text-neutral-900 font-mono text-xs focus:ring-1 focus:ring-[#cf4c1b] focus:outline-none"
                        required
                      />
                      <span className="text-[10px] text-neutral-500 mt-0.5 block">
                        Grille actuelle : max {config.gridRows}
                      </span>
                    </div>
                    <div>
                      <label className="block font-semibold text-neutral-800 text-[11px] mb-1">
                        N° de colonne
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="20"
                        value={editingIcon.col}
                        onChange={(e) =>
                          setEditingIcon({ ...editingIcon, col: Math.max(1, Number(e.target.value)) })
                        }
                        className="w-full px-3 py-1.5 bg-white border border-neutral-300 rounded-lg text-neutral-900 font-mono text-xs focus:ring-1 focus:ring-[#cf4c1b] focus:outline-none"
                        required
                      />
                      <span className="text-[10px] text-neutral-500 mt-0.5 block">
                        Grille actuelle : max {config.gridCols}
                      </span>
                    </div>
                  </div>

                  {(editingIcon.row > config.gridRows || editingIcon.col > config.gridCols) && (
                    <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-[11px] text-amber-800">
                      ℹ️ Cette icône dépasse les dimensions actuelles de la grille ({config.gridRows}×{config.gridCols}). Elle apparaîtra automatiquement dans la <strong>liste déroulante en dessous des icônes</strong>.
                    </div>
                  )}

                  <div>
                    <label className="block font-semibold text-neutral-800 text-[11px] mb-1">
                      Texte en dessous de l'icône
                    </label>
                    <input
                      type="text"
                      value={editingIcon.label}
                      onChange={(e) => setEditingIcon({ ...editingIcon, label: e.target.value })}
                      placeholder="Ex: Parcours Gravel, Visionneur GPX..."
                      className="w-full px-3 py-1.5 bg-white border border-neutral-300 rounded-lg text-neutral-900 text-xs focus:ring-1 focus:ring-[#cf4c1b] focus:outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-neutral-800 text-[11px] mb-1">
                      URL associée à l'icône (redirection)
                    </label>
                    <input
                      type="text"
                      value={editingIcon.targetUrl}
                      onChange={(e) => setEditingIcon({ ...editingIcon, targetUrl: e.target.value })}
                      placeholder="Ex: routes.html, gpx-viewer.html, https://..."
                      className="w-full px-3 py-1.5 bg-white border border-neutral-300 rounded-lg text-neutral-900 font-mono text-xs focus:ring-1 focus:ring-[#cf4c1b] focus:outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-neutral-800 text-[11px] mb-1">
                      Localisation de l'icône (chemin ou nom)
                    </label>
                    <input
                      type="text"
                      value={editingIcon.iconPath}
                      onChange={(e) => setEditingIcon({ ...editingIcon, iconPath: e.target.value })}
                      placeholder="Ex: https://.../mon-icone.png, icons/velo.svg, ou Bike"
                      className="w-full px-3 py-1.5 bg-white border border-neutral-300 rounded-lg text-neutral-900 font-mono text-xs focus:ring-1 focus:ring-[#cf4c1b] focus:outline-none"
                      required
                    />

                    {/* Aperçu en temps réel */}
                    {editingIcon.iconPath && (
                      <div className="mt-2 flex items-center gap-2.5 p-2 rounded-lg bg-white border border-neutral-200">
                        <span className="text-[10px] text-neutral-500 font-medium">Aperçu :</span>
                        <div
                          className={`flex items-center justify-center ${
                            isHttpUrlIcon(editingIcon.iconPath)
                              ? 'p-0 bg-transparent'
                              : 'w-10 h-10 rounded-xl bg-neutral-50 border border-neutral-300'
                          }`}
                          style={{
                            width: isHttpUrlIcon(editingIcon.iconPath) ? '40px' : undefined,
                            height: isHttpUrlIcon(editingIcon.iconPath) ? '40px' : undefined
                          }}
                        >
                          {renderIconGraphic(editingIcon.iconPath, 40, isHttpUrlIcon(editingIcon.iconPath))}
                        </div>
                        {isHttpUrlIcon(editingIcon.iconPath) ? (
                          <span className="text-[10px] text-emerald-700 font-semibold">
                            ✓ URL externe (http) : affichage direct sans carré (prend toute la place réservée)
                          </span>
                        ) : (
                          <span className="text-[10px] text-neutral-500">
                            Icône standard avec boîte
                          </span>
                        )}
                      </div>
                    )}

                    <div className="grid grid-cols-6 gap-1.5 mt-2 p-2 bg-white rounded-lg border border-neutral-200">
                      {PRESET_ICONS.map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setEditingIcon({ ...editingIcon, iconPath: preset })}
                          className={`p-1.5 rounded flex items-center justify-center transition-colors ${
                            editingIcon.iconPath === preset
                              ? 'bg-[#cf4c1b]/15 text-[#cf4c1b] border border-[#cf4c1b]/50'
                              : 'hover:bg-neutral-100 text-neutral-600'
                          }`}
                          title={preset}
                        >
                          {renderIconGraphic(preset, 24)}
                        </button>
                      ))}
                    </div>

                    {/* Raccourcis Icônes GitHub stockées dans le projet */}
                    <div className="mt-2 p-2 bg-neutral-50 rounded-lg border border-neutral-200 space-y-1.5">
                      <div className="flex items-center justify-between text-[10px] text-neutral-600 font-semibold">
                        <span className="flex items-center gap-1">
                          <Globe className="w-3 h-3 text-[#cf4c1b]" />
                          <span>Fichiers GitHub (public/icons/) :</span>
                        </span>
                        <span className="text-[9px] text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded font-medium">Lecture seule</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {GITHUB_SAMPLE_ICONS.map((gh) => (
                          <button
                            key={gh.path}
                            type="button"
                            onClick={() => setEditingIcon({ ...editingIcon, iconPath: gh.path })}
                            className={`px-2 py-1 text-[10px] rounded border transition-colors flex items-center gap-1.5 ${
                              editingIcon.iconPath === gh.path
                                ? 'bg-[#cf4c1b]/15 text-[#cf4c1b] border-[#cf4c1b]'
                                : 'bg-white hover:bg-neutral-100 text-neutral-700 border-neutral-200'
                            }`}
                          >
                            <img src={gh.path} alt="" className="w-3.5 h-3.5 object-contain" />
                            <span>{gh.path}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="mt-2">
                      <label className="inline-flex items-center gap-1.5 text-[11px] text-[#cf4c1b] hover:text-[#b83811] cursor-pointer">
                        <Upload className="w-3.5 h-3.5" />
                        <span>Importer une image locale (SVG / PNG)</span>
                        <input
                          type="file"
                          accept="image/*,.svg"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onload = (event) => {
                                if (event.target?.result) {
                                  setEditingIcon({
                                    ...editingIcon,
                                    iconPath: event.target.result as string
                                  });
                                }
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                      </label>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="checkbox"
                      id="newTabCheck"
                      checked={editingIcon.openInNewTab || false}
                      onChange={(e) =>
                        setEditingIcon({ ...editingIcon, openInNewTab: e.target.checked })
                      }
                      className="rounded accent-[#cf4c1b]"
                    />
                    <label htmlFor="newTabCheck" className="text-[11px] text-neutral-700 cursor-pointer">
                      Ouvrir la page dans un nouvel onglet
                    </label>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-200">
                    <button
                      type="button"
                      onClick={() => setEditingIcon(null)}
                      className="px-3 py-1.5 text-xs text-neutral-600 hover:text-neutral-900"
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 text-xs font-semibold bg-[#cf4c1b] hover:bg-[#b83811] text-white rounded-lg transition-colors flex items-center gap-1"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Enregistrer l'icône</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* ---------------------------------------------------- */}
          {/* ONGLET 3 : TITRE DE LA PAGE                          */}
          {/* ---------------------------------------------------- */}
          {activeTab === 'title' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-neutral-200">
                <div>
                  <h3 className="font-bold text-neutral-900 text-sm">Titre de la page</h3>
                  <p className="text-neutral-500 text-[11px]">Texte, police et fond</p>
                </div>
                <button
                  onClick={() => setConfig({ ...config, showTitle: !config.showTitle })}
                  className={`p-1.5 rounded-lg border transition-colors ${
                    config.showTitle
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                      : 'bg-neutral-100 border-neutral-200 text-neutral-400'
                  }`}
                  title={config.showTitle ? 'Désactiver le titre' : 'Activer le titre'}
                >
                  {config.showTitle ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>
              </div>

              <div>
                <label className="block font-semibold text-neutral-800 mb-1">
                  Texte du titre
                </label>
                <input
                  type="text"
                  value={config.titleText}
                  onChange={(e) => setConfig({ ...config, titleText: e.target.value })}
                  placeholder="Ex: Mez Itinéraires — Portail Gravel"
                  className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-lg text-neutral-900 text-xs focus:ring-1 focus:ring-[#cf4c1b] focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-neutral-800 mb-1">
                  Police de caractères
                </label>
                <select
                  value={config.titleFont}
                  onChange={(e) => setConfig({ ...config, titleFont: e.target.value })}
                  className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-lg text-neutral-900 text-xs focus:ring-1 focus:ring-[#cf4c1b] focus:outline-none"
                >
                  {AVAILABLE_FONTS.map((font) => (
                    <option key={font.name} value={font.name}>
                      {font.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-neutral-800 mb-1">
                    Taille ({config.titleFontSize} px)
                  </label>
                  <input
                    type="range"
                    min="18"
                    max="60"
                    step="2"
                    value={config.titleFontSize}
                    onChange={(e) => setConfig({ ...config, titleFontSize: Number(e.target.value) })}
                    className="w-full accent-[#cf4c1b]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-neutral-800 mb-1">Couleur</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={config.titleColor}
                      onChange={(e) => setConfig({ ...config, titleColor: e.target.value })}
                      className="w-8 h-8 rounded border border-neutral-300 cursor-pointer"
                    />
                    <span className="font-mono text-[11px] text-neutral-600">{config.titleColor}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3 pt-2 border-t border-neutral-200">
                <label className="block font-semibold text-neutral-800">
                  Style du fond du titre
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setConfig({ ...config, titleBgType: 'transparent' })}
                    className={`py-1.5 px-2 text-[11px] font-semibold rounded-lg border transition-colors ${
                      config.titleBgType === 'transparent'
                        ? 'border-[#cf4c1b] bg-[#cf4c1b]/10 text-[#cf4c1b]'
                        : 'border-neutral-200 hover:bg-neutral-50 text-neutral-600'
                    }`}
                  >
                    Transparent
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfig({ ...config, titleBgType: 'box' })}
                    className={`py-1.5 px-2 text-[11px] font-semibold rounded-lg border transition-colors ${
                      config.titleBgType === 'box'
                        ? 'border-[#cf4c1b] bg-[#cf4c1b]/10 text-[#cf4c1b]'
                        : 'border-neutral-200 hover:bg-neutral-50 text-neutral-600'
                    }`}
                  >
                    Boîte / Cadre
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfig({ ...config, titleBgType: 'banner' })}
                    className={`py-1.5 px-2 text-[11px] font-semibold rounded-lg border transition-colors ${
                      config.titleBgType === 'banner'
                        ? 'border-[#cf4c1b] bg-[#cf4c1b]/10 text-[#cf4c1b]'
                        : 'border-neutral-200 hover:bg-neutral-50 text-neutral-600'
                    }`}
                  >
                    Bandeau
                  </button>
                </div>

                {config.titleBgType !== 'transparent' && (
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div>
                      <label className="block font-medium text-neutral-700 mb-1">Couleur fond</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={config.titleBgColor}
                          onChange={(e) => setConfig({ ...config, titleBgColor: e.target.value })}
                          className="w-8 h-8 rounded border border-neutral-300 cursor-pointer"
                        />
                        <span className="font-mono text-[11px] text-neutral-600">{config.titleBgColor}</span>
                      </div>
                    </div>

                    <div>
                      <label className="block font-medium text-neutral-700 mb-1">
                        Opacité ({config.titleBgOpacity}%)
                      </label>
                      <input
                        type="range"
                        min="10"
                        max="100"
                        value={config.titleBgOpacity}
                        onChange={(e) => setConfig({ ...config, titleBgOpacity: Number(e.target.value) })}
                        className="w-full accent-[#cf4c1b]"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ---------------------------------------------------- */}
          {/* ONGLET 4 : LOGO DE LA PAGE                           */}
          {/* ---------------------------------------------------- */}
          {activeTab === 'logo' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-neutral-200">
                <div>
                  <h3 className="font-bold text-neutral-900 text-sm">Logo de la page</h3>
                  <p className="text-neutral-500 text-[11px]">Position, redirection et fond</p>
                </div>
                <button
                  onClick={() =>
                    setConfig({
                      ...config,
                      logo: { ...config.logo, showLogo: !config.logo.showLogo }
                    })
                  }
                  className={`p-1.5 rounded-lg border transition-colors ${
                    config.logo.showLogo
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                      : 'bg-neutral-100 border-neutral-200 text-neutral-400'
                  }`}
                  title={config.logo.showLogo ? 'Désactiver le logo' : 'Activer le logo'}
                >
                  {config.logo.showLogo ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>
              </div>

              <div>
                <label className="block font-semibold text-neutral-800 mb-1">
                  Localisation du logo (chemin ou image)
                </label>
                <input
                  type="text"
                  value={config.logo.logoPath}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      logo: { ...config.logo, logoPath: e.target.value }
                    })
                  }
                  placeholder="Ex: logo.svg, /images/logo.png, ou Bike"
                  className="w-full px-3 py-1.5 bg-neutral-50 border border-neutral-300 rounded-lg text-neutral-900 font-mono text-xs focus:ring-1 focus:ring-[#cf4c1b] focus:outline-none"
                />

                <div className="grid grid-cols-6 gap-1.5 mt-2 p-2 bg-neutral-50 rounded-lg border border-neutral-200">
                  {['Bike', 'Route', 'Mountain', 'Compass', 'Layers', 'Activity'].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() =>
                        setConfig({
                          ...config,
                          logo: { ...config.logo, logoPath: preset }
                        })
                      }
                      className={`p-1.5 rounded flex items-center justify-center transition-colors ${
                        config.logo.logoPath === preset
                          ? 'bg-[#cf4c1b]/15 text-[#cf4c1b] border border-[#cf4c1b]/50'
                          : 'hover:bg-neutral-200/50 text-neutral-600'
                      }`}
                      title={preset}
                    >
                      {renderIconGraphic(preset, 24)}
                    </button>
                  ))}
                </div>

                <div className="mt-2">
                  <label className="inline-flex items-center gap-1.5 text-[11px] text-[#cf4c1b] hover:text-[#b83811] cursor-pointer">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Importer un logo personnalisé (SVG/PNG)</span>
                    <input
                      type="file"
                      accept="image/*,.svg"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (event) => {
                            if (event.target?.result) {
                              setConfig({
                                ...config,
                                logo: {
                                  ...config.logo,
                                  logoPath: event.target.result as string
                                }
                              });
                            }
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </label>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-neutral-800 mb-1">
                  Position du logo
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setConfig({
                        ...config,
                        logo: { ...config.logo, position: 'top-left' }
                      })
                    }
                    className={`py-1.5 px-2 text-[11px] font-semibold rounded-lg border transition-colors ${
                      config.logo.position === 'top-left'
                        ? 'border-[#cf4c1b] bg-[#cf4c1b]/10 text-[#cf4c1b]'
                        : 'border-neutral-200 hover:bg-neutral-50 text-neutral-600'
                    }`}
                  >
                    Haut Gauche
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setConfig({
                        ...config,
                        logo: { ...config.logo, position: 'top-center' }
                      })
                    }
                    className={`py-1.5 px-2 text-[11px] font-semibold rounded-lg border transition-colors ${
                      config.logo.position === 'top-center'
                        ? 'border-[#cf4c1b] bg-[#cf4c1b]/10 text-[#cf4c1b]'
                        : 'border-neutral-200 hover:bg-neutral-50 text-neutral-600'
                    }`}
                  >
                    Haut Centre
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setConfig({
                        ...config,
                        logo: { ...config.logo, position: 'top-right' }
                      })
                    }
                    className={`py-1.5 px-2 text-[11px] font-semibold rounded-lg border transition-colors ${
                      config.logo.position === 'top-right'
                        ? 'border-[#cf4c1b] bg-[#cf4c1b]/10 text-[#cf4c1b]'
                        : 'border-neutral-200 hover:bg-neutral-50 text-neutral-600'
                    }`}
                  >
                    Haut Droite
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-neutral-800 mb-1">
                  URL de redirection du logo
                </label>
                <input
                  type="text"
                  value={config.logo.targetUrl}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      logo: { ...config.logo, targetUrl: e.target.value }
                    })
                  }
                  placeholder="Ex: index.html ou https://..."
                  className="w-full px-3 py-1.5 bg-neutral-50 border border-neutral-300 rounded-lg text-neutral-900 font-mono text-xs focus:ring-1 focus:ring-[#cf4c1b] focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-neutral-800 mb-1">
                  Taille du logo ({config.logo.size} px)
                </label>
                <input
                  type="range"
                  min="28"
                  max="90"
                  step="2"
                  value={config.logo.size}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      logo: { ...config.logo, size: Number(e.target.value) }
                    })
                  }
                  className="w-full accent-[#cf4c1b]"
                />
              </div>

              <div className="space-y-3 pt-2 border-t border-neutral-200">
                <label className="block font-semibold text-neutral-800">
                  Fond du logo
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setConfig({
                        ...config,
                        logo: { ...config.logo, bgType: 'transparent' }
                      })
                    }
                    className={`py-1.5 px-2 text-[11px] font-semibold rounded-lg border transition-colors ${
                      config.logo.bgType === 'transparent'
                        ? 'border-[#cf4c1b] bg-[#cf4c1b]/10 text-[#cf4c1b]'
                        : 'border-neutral-200 hover:bg-neutral-50 text-neutral-600'
                    }`}
                  >
                    Transparent
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setConfig({
                        ...config,
                        logo: { ...config.logo, bgType: 'box' }
                      })
                    }
                    className={`py-1.5 px-2 text-[11px] font-semibold rounded-lg border transition-colors ${
                      config.logo.bgType === 'box'
                        ? 'border-[#cf4c1b] bg-[#cf4c1b]/10 text-[#cf4c1b]'
                        : 'border-neutral-200 hover:bg-neutral-50 text-neutral-600'
                    }`}
                  >
                    Boîte arrondie
                  </button>
                </div>

                {config.logo.bgType === 'box' && (
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div>
                      <label className="block font-medium text-neutral-700 mb-1">Couleur fond</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={config.logo.bgColor}
                          onChange={(e) =>
                            setConfig({
                              ...config,
                              logo: { ...config.logo, bgColor: e.target.value }
                            })
                          }
                          className="w-8 h-8 rounded border border-neutral-300 cursor-pointer"
                        />
                        <span className="font-mono text-[11px] text-neutral-600">{config.logo.bgColor}</span>
                      </div>
                    </div>

                    <div>
                      <label className="block font-medium text-neutral-700 mb-1">
                        Opacité ({config.logo.bgOpacity}%)
                      </label>
                      <input
                        type="range"
                        min="10"
                        max="100"
                        value={config.logo.bgOpacity}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            logo: { ...config.logo, bgOpacity: Number(e.target.value) }
                          })
                        }
                        className="w-full accent-[#cf4c1b]"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ---------------------------------------------------- */}
          {/* ONGLET 5 : VERSION & BAS DE PAGE                    */}
          {/* ---------------------------------------------------- */}
          {activeTab === 'version' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-neutral-200">
                <div>
                  <h3 className="font-bold text-neutral-900 text-sm">Version en bas de page</h3>
                  <p className="text-neutral-500 text-[11px]">Format : v 1.x FabriziodelaRusta</p>
                </div>
                <button
                  onClick={() => setConfig({ ...config, showVersion: !config.showVersion })}
                  className={`p-1.5 rounded-lg border transition-colors ${
                    config.showVersion
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                      : 'bg-neutral-100 border-neutral-200 text-neutral-400'
                  }`}
                  title={config.showVersion ? 'Désactiver la version' : 'Activer la version'}
                >
                  {config.showVersion ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>
              </div>

              <div>
                <label className="block font-semibold text-neutral-800 mb-1">
                  Texte du numéro de version
                </label>
                <input
                  type="text"
                  value={config.versionText}
                  onChange={(e) => setConfig({ ...config, versionText: e.target.value })}
                  placeholder="v 1.2 FabriziodelaRusta"
                  className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-lg text-neutral-900 font-mono text-xs focus:ring-1 focus:ring-[#cf4c1b] focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-neutral-800 mb-1">Couleur</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={config.versionColor}
                    onChange={(e) => setConfig({ ...config, versionColor: e.target.value })}
                    className="w-8 h-8 rounded border border-neutral-300 cursor-pointer"
                  />
                  <span className="font-mono text-[11px] text-neutral-600">{config.versionColor}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Pied du panneau : Réinitialisation & sauvegarde */}
        <div className="p-4 border-t border-neutral-200 bg-neutral-50/90 flex items-center justify-between text-xs">
          <button
            onClick={handleResetToDefault}
            className="text-neutral-500 hover:text-red-600 flex items-center gap-1.5 transition-colors"
            title="Revenir à la configuration initiale"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Réinitialiser</span>
          </button>

          <button
            onClick={() => setIsPanelOpen(false)}
            className="py-1.5 px-4 rounded-lg bg-neutral-800 hover:bg-neutral-900 text-white font-medium transition-colors"
          >
            Fermer le panneau
          </button>
        </div>
      </aside>
    </div>
  );
}
