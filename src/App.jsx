import React, { useState, useEffect, useCallback } from 'react';
import { Table, Plus, Minus, Trash2, Shield, Activity, User, ArrowLeft, Download, AlertTriangle, CheckCircle, Eraser, RotateCcw, Cloud, CloudUpload, CloudDownload, Save, UserPlus, Calendar, LogOut } from 'lucide-react';
import * as XLSX from 'xlsx';
import tcfdLogo from './assets/tcfd.jpg';
import { auth, db } from './firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut, sendEmailVerification } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';

const AVAILABLE_BEHAVIORS = [
  "Aggression", "Self-Injury", "Elopement", "Pica", "Disruptive Behaviors",
  "Mouthing", "Impulsivity", "Agitation", "Refusal Behavior", "Off-Task Behavior",
  "Property Destruction", "Ritualistic Behavior", "Unsanitary Behavior",
  "Sensory Stimulation", "Stereotypy/Repetitive Behavior", "Inappropriate Social Behavior",
  "Inappropriate Touch", "Sexually Inappropriate Behavior", "Disrobing", "Food Stealing"
];

const AVAILABLE_DIMENSIONS = {
  "Intensity": ["Level 1", "Level 2", "Level 3"],
  "Duration": ["<1 min", "1-5 min", "5+ min"],
  "Frequency": ["Frequency"],
  "Attempts": ["Attempts"],
  "Successes": ["Successes"]
};

const SCIPR_CATEGORIES = {
  "Core Techniques": [
    "Touch/Touch with a Grasp", "Back Hair Pull Stabilization / Release", "Front Deflection",
    "Back Hair Pull Stabilization / Release with Assistance", "Bite Release", "Blocking Punches",
    "One Arm Release", "Approach Prevention", "Two Arm Release", "Front Arm Catch",
    "Front Choke Windmill Release", "Front Kick Avoidance/Deflection", "Back Choke Release",
    "Protection from Thrown Objects", "Front Hair Pull Stabilization / Release"
  ],
  "Specialized Techniques": [
    "One Person Escort", "Standing Wrap", "One Person Escort – Seated Variation",
    "Bite Prevention Front Hold", "Two Person Escort", "Front Choke Release",
    "Two Person Escort – Seated Variation", "One Person Wrap / Removal",
    "Arm Control by One Person or With Assistance", "Two Person Removal"
  ],
  "Restrictive Techniques": [
    "Two Person Take Down", "Two or Three Person Supine Control"
  ]
};

const SHIFTS = ["7am-3pm (Education)", "3pm-11pm", "11pm-7am"];

const getLocalISODate = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const RockerInput = ({ value, onChange }) => {
  const val = value !== '' && value !== undefined && value !== 'NO DATA' ? parseInt(value, 10) : 0;
  return (
    <div className="rocker-input">
      <button className="rocker-btn" onClick={() => onChange(Math.max(0, val - 1))}>
        <Minus size={14} />
      </button>
      <input
        type={value === 'NO DATA' ? "text" : "number"}
        min="0"
        className="table-input rocker-field"
        value={value === 0 ? '0' : value || ''}
        onChange={e => onChange(e.target.value)}
        style={value === 'NO DATA' ? { color: '#ef4444', fontWeight: 'bold', fontSize: '0.75rem', width: '80px', textAlign: 'center' } : {}}
      />
      <button className="rocker-btn" onClick={() => onChange(val + 1)}>
        <Plus size={14} />
      </button>
    </div>
  );
};

function App() {
  const [currentView, setCurrentView] = useState(null);
  const [residences, setResidences] = useState([]);
  const [activeResidence, setActiveResidence] = useState('');
  const [draftResidence, setDraftResidence] = useState('');
  
  // clients is now an array of objects: { id, name, behaviors, dimensions, maneuvers }
  const [clients, setClients] = useState([]);

  // Draft state for configuring a single resident
  const [draftName, setDraftName] = useState('');
  const [draftBehaviors, setDraftBehaviors] = useState([]);
  const [draftDimensions, setDraftDimensions] = useState({});
  const [draftManeuvers, setDraftManeuvers] = useState(new Set());
  const [selectedBehaviorInput, setSelectedBehaviorInput] = useState('');

  // Longitudinal data
  const [historyData, setHistoryData] = useState([]);

  // Active entry state (Tracker)
  const [activeClientId, setActiveClientId] = useState('');
  const [activeDate, setActiveDate] = useState(() => getLocalISODate(new Date()));
  const [activeShift, setActiveShift] = useState(SHIFTS[0]);
  const [currentEntryData, setCurrentEntryData] = useState({});

  // Review Page State
  const [reviewMonth, setReviewMonth] = useState(new Date());

  const [exportModal, setExportModal] = useState(null);

  // Firebase Auth & Data State
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [registerName, setRegisterName] = useState('');
  const [registerDepartment, setRegisterDepartment] = useState('');
  const [authError, setAuthError] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [firebaseDataLoaded, setFirebaseDataLoaded] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthLoading(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!user) {
      setFirebaseDataLoaded(false);
      return;
    }
    const docRef = doc(db, 'organization', 'main');
    const unsub = onSnapshot(docRef, (snap) => {
      if (snap.metadata.hasPendingWrites) return; // ignore local updates echoing back
      if (snap.exists()) {
        const data = snap.data();
        if (data.clients) setClients(data.clients);
        if (data.residences) setResidences(data.residences);
        if (!data.residences && data.residenceName) setResidences([data.residenceName]);
        if (data.historyData) setHistoryData(data.historyData);

        if (!firebaseDataLoaded) {
          if (data.clients && data.clients.length > 0) {
            setCurrentView('tracker');
            // Ensure an active client is set
            setActiveClientId(prev => prev || data.clients[0].id);
            if (data.residences && data.residences.length > 0) setActiveResidence(prev => prev || data.residences[0]);
            else if (data.residenceName) setActiveResidence(prev => prev || data.residenceName);
          } else {
            setCurrentView('setup');
          }
        }
      } else {
        if (!firebaseDataLoaded) setCurrentView('setup');
      }
      setFirebaseDataLoaded(true);
    });
    return () => unsub();
  }, [user]);

  useEffect(() => {
    if (!user || !firebaseDataLoaded) return;
    const docRef = doc(db, 'organization', 'main');
    setDoc(docRef, { clients, residences, historyData }, { merge: true });
  }, [clients, residences, historyData, user, firebaseDataLoaded]);

  // Load entry data when client, date, or shift changes
  useEffect(() => {
    if (activeClientId && activeDate && activeShift) {
      const existingRecord = historyData.find(
        r => r.clientId === activeClientId && r.date === activeDate && r.shift === activeShift
      );
      if (existingRecord) {
        setCurrentEntryData(existingRecord.data);
      } else {
        setCurrentEntryData({});
      }
    }
  }, [activeClientId, activeDate, activeShift, historyData]);

  // Handle active residence change
  useEffect(() => {
    if (activeResidence) {
      const validClients = clients.filter(c => !c.residence || c.residence === activeResidence);
      if (!validClients.some(c => c.id === activeClientId)) {
        setActiveClientId(validClients[0]?.id || '');
      }
    }
  }, [activeResidence, clients, activeClientId]);




  const saveDraftResident = () => {
    if (!activeResidence) {
      alert("Please add and select a Residence first.");
      return;
    }
    if (!draftName.trim()) {
      alert("Please enter a Resident Name before adding.");
      return;
    }
    
    if (clients.some(c => c.id.toLowerCase() === draftName.trim().toLowerCase())) {
      alert("A resident with this name already exists.");
      return;
    }

    const newClient = {
      id: `${activeResidence}_${draftName.trim()}`,
      name: draftName.trim(),
      residence: activeResidence,
      behaviors: draftBehaviors,
      dimensions: draftDimensions,
      maneuvers: Array.from(draftManeuvers)
    };

    setClients([...clients, newClient]);
    if (!activeClientId) setActiveClientId(newClient.id);

    // Clear draft form for next resident
    setDraftName('');
    setDraftBehaviors([]);
    setDraftDimensions({});
    setDraftManeuvers(new Set());
    setSelectedBehaviorInput('');
    
    alert(`Resident profile for ${newClient.name} has been added!`);
  };

  const removeClient = (id) => {
    if (confirm(`Are you sure you want to remove this resident? This won't delete historical data, but removes them from the list.`)) {
      const remaining = clients.filter(c => c.id !== id);
      setClients(remaining);
      if (activeClientId === id) setActiveClientId(remaining[0]?.id || '');
    }
  };

  const addBehavior = () => {
    if (selectedBehaviorInput && !draftBehaviors.includes(selectedBehaviorInput)) {
      setDraftBehaviors([...draftBehaviors, selectedBehaviorInput]);
      setDraftDimensions({
        ...draftDimensions,
        [selectedBehaviorInput]: []
      });
      setSelectedBehaviorInput('');
    }
  };

  const removeBehavior = (behavior) => {
    setDraftBehaviors(draftBehaviors.filter(b => b !== behavior));
    const newDims = { ...draftDimensions };
    delete newDims[behavior];
    setDraftDimensions(newDims);
  };

  const toggleDimension = (behavior, dimension) => {
    const dims = draftDimensions[behavior] || [];
    let newDims;
    if (dims.includes(dimension)) {
      newDims = dims.filter(d => d !== dimension);
    } else {
      newDims = [...dims, dimension];
    }
    setDraftDimensions({
      ...draftDimensions,
      [behavior]: newDims
    });
  };

  const toggleManeuver = (maneuver) => {
    const newManeuvers = new Set(draftManeuvers);
    if (newManeuvers.has(maneuver)) {
      newManeuvers.delete(maneuver);
    } else {
      newManeuvers.add(maneuver);
    }
    setDraftManeuvers(newManeuvers);
  };

  const openTracker = () => {
    if (clients.length === 0 && !draftName.trim()) {
      alert("Please configure and add at least one resident.");
      return;
    }
    // If they filled out the draft but forgot to click Add, implicitly add it
    if (draftName.trim()) {
      saveDraftResident();
    }
    setCurrentView('tracker');
  };

  // Tracker Logic Helpers
  const filteredClients = clients.filter(c => !c.residence || c.residence === activeResidence);
  const activeClientObj = clients.find(c => c.id === activeClientId);
  const activeBehaviors = activeClientObj?.behaviors || [];
  const activeDimensions = activeClientObj?.dimensions || {};
  const activeManeuvers = new Set(activeClientObj?.maneuvers || []);

  const handleCellChange = (key, value) => {
    setCurrentEntryData(prev => {
      const nextData = { ...prev, [key]: value };
      
      if (activeClientId && activeDate && activeShift) {
        setHistoryData(prevHistory => {
          const newHistory = [...prevHistory];
          const index = newHistory.findIndex(
            r => r.clientId === activeClientId && r.date === activeDate && r.shift === activeShift
          );
          
          const isEmpty = Object.keys(nextData).length === 0 || 
                          Object.values(nextData).every(v => v === '' || v === undefined);
          
          if (isEmpty) {
            if (index !== -1) newHistory.splice(index, 1);
          } else {
            const record = {
              id: `${activeClientId}_${activeDate}_${activeShift}`,
              clientId: activeClientId,
              date: activeDate,
              shift: activeShift,
              data: nextData
            };
            if (index !== -1) {
              newHistory[index] = record;
            } else {
              newHistory.push(record);
            }
          }
          return newHistory;
        });
      }
      
      return nextData;
    });
  };


  const markNoBehavior = (behavior) => {
    const dims = activeDimensions[behavior] || [];
    const subRows = dims.flatMap(dim => AVAILABLE_DIMENSIONS[dim] || []);
    
    setCurrentEntryData(prev => {
      const nextData = { ...prev };
      subRows.forEach(sub => {
        nextData[`${behavior}_${sub}`] = 0;
      });
      
      if (activeClientId && activeDate && activeShift) {
        setHistoryData(prevHistory => {
          const newHistory = [...prevHistory];
          const index = newHistory.findIndex(
            r => r.clientId === activeClientId && r.date === activeDate && r.shift === activeShift
          );
          
          const record = {
            id: `${activeClientId}_${activeDate}_${activeShift}`,
            clientId: activeClientId,
            date: activeDate,
            shift: activeShift,
            data: nextData
          };
          if (index !== -1) newHistory[index] = record;
          else newHistory.push(record);
          
          return newHistory;
        });
      }
      return nextData;
    });
  };

  const markNoData = (behavior) => {
    const dims = activeDimensions[behavior] || [];
    const subRows = dims.flatMap(dim => AVAILABLE_DIMENSIONS[dim] || []);
    
    setCurrentEntryData(prev => {
      const nextData = { ...prev };
      subRows.forEach(sub => {
        nextData[`${behavior}_${sub}`] = 'NO DATA';
      });
      
      if (activeClientId && activeDate && activeShift) {
        setHistoryData(prevHistory => {
          const newHistory = [...prevHistory];
          const index = newHistory.findIndex(
            r => r.clientId === activeClientId && r.date === activeDate && r.shift === activeShift
          );
          
          const record = {
            id: `${activeClientId}_${activeDate}_${activeShift}`,
            clientId: activeClientId,
            date: activeDate,
            shift: activeShift,
            data: nextData
          };
          if (index !== -1) newHistory[index] = record;
          else newHistory.push(record);
          
          return newHistory;
        });
      }
      return nextData;
    });
  };

  const getIntensitySum = (behavior, dataObj) => {
    let sum = 0;
    AVAILABLE_DIMENSIONS["Intensity"].forEach(level => {
      const val = parseInt(dataObj[`${behavior}_${level}`], 10);
      if (!isNaN(val)) sum += val;
    });
    return sum;
  };

  const getDurationSum = (behavior, dataObj) => {
    let sum = 0;
    AVAILABLE_DIMENSIONS["Duration"].forEach(dur => {
      const val = parseInt(dataObj[`${behavior}_${dur}`], 10);
      if (!isNaN(val)) sum += val;
    });
    return sum;
  };

  const getBehaviorTotal = (behavior, dataObj, dims) => {
    if (dims.includes("Intensity")) return getIntensitySum(behavior, dataObj);
    if (dims.includes("Frequency")) {
      return parseInt(dataObj[`${behavior}_Frequency`], 10) || 0;
    }
    let sum = 0;
    const subRows = dims.flatMap(dim => AVAILABLE_DIMENSIONS[dim] || []);
    subRows.forEach(sub => {
      const val = parseInt(dataObj[`${behavior}_${sub}`], 10);
      if (!isNaN(val)) sum += val;
    });
    return sum;
  };

  const validateRecord = (record, clientObj) => {
    const errors = [];
    const { data, date, shift } = record;
    const behaviors = clientObj?.behaviors || [];
    const dimensions = clientObj?.dimensions || {};
    
    behaviors.forEach(behavior => {
      const dims = dimensions[behavior] || [];
      const subRows = dims.flatMap(dim => AVAILABLE_DIMENSIONS[dim] || []);
      
      // Check if behavior has any data entered (including 0)
      const hasData = subRows.some(sub => data[`${behavior}_${sub}`] !== undefined && data[`${behavior}_${sub}`] !== '');
      if (!hasData) {
        errors.push(`${date} (${shift}): ${behavior} — Missing data. Please enter values or click 'No Behavior'.`);
      }

      if (dims.includes('Intensity') && dims.includes('Duration')) {
        const iSum = getIntensitySum(behavior, data);
        const dSum = getDurationSum(behavior, data);
        if ((iSum > 0 || dSum > 0) && iSum !== dSum) {
          errors.push(`${date} (${shift}): ${behavior} — Intensity total (${iSum}) does not match Duration total (${dSum}).`);
        }
      }
    });
    return errors;
  };

  const handleExport = () => {
    if (!activeClientObj) return;

    const clientRecords = historyData.filter(r => r.clientId === activeClientObj.id);
    
    if (clientRecords.length === 0) {
      alert("No data available to export for this client.");
      return;
    }

    // Determine setup date (fallback to earliest record)
    let setupDateStr = activeClientObj.setupDate;
    if (!setupDateStr) {
      setupDateStr = clientRecords.map(r => r.date).sort()[0];
    }
    
    const todayStr = getLocalISODate(new Date());
    const now = new Date();
    const currentHour = now.getHours();
    
    const isPastOrCurrentShift = (dateStr, shift) => {
      if (dateStr < todayStr) return true;
      if (dateStr > todayStr) return false;
      // it is today
      if (shift === "7am-3pm (Education)") return currentHour >= 7;
      if (shift === "3pm-11pm") return currentHour >= 15;
      if (shift === "11pm-7am") return currentHour >= 23;
      return true;
    };

    const requiredShifts = [];
    const [sY, sM, sD] = setupDateStr.split('-').map(Number);
    const [eY, eM, eD] = todayStr.split('-').map(Number);
    let currentD = new Date(sY, sM - 1, sD);
    const endD = new Date(eY, eM - 1, eD);
    
    while (currentD <= endD) {
      const dStr = getLocalISODate(currentD);
      SHIFTS.forEach(shift => {
        if (isPastOrCurrentShift(dStr, shift)) {
          requiredShifts.push({ date: dStr, shift });
        }
      });
      currentD.setDate(currentD.getDate() + 1);
    }

    const allErrors = [];
    
    requiredShifts.forEach(req => {
      const record = clientRecords.find(r => r.date === req.date && r.shift === req.shift);
      if (!record) {
        allErrors.push(`Missing completely: ${req.date} (${req.shift}). Please complete it or click 'No Behavior'.`);
      } else {
        const errs = validateRecord(record, activeClientObj);
        allErrors.push(...errs);
      }
    });

    if (allErrors.length > 0) {
      const displayErrors = allErrors.length > 20 ? [...allErrors.slice(0, 20), `...and ${allErrors.length - 20} more errors.`] : allErrors;
      setExportModal({ errors: displayErrors });
      return;
    }

    clientRecords.sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return SHIFTS.indexOf(a.shift) - SHIFTS.indexOf(b.shift);
    });

    const columns = clientRecords.map(r => `${r.date}\n${r.shift}`);

    const rows = [];
    rows.push([`BEHAVIOR DATA SHEET — ${activeClientObj.name}`, ...Array(columns.length).fill('')]);
    if (activeResidence) {
      rows.push([`Residence: ${activeResidence}`, ...Array(columns.length).fill('')]);
    }
    rows.push([]);
    rows.push(['Date & Shift', ...columns]);

    activeBehaviors.forEach(behavior => {
      const dims = activeDimensions[behavior] || [];
      const subRows = dims.flatMap(dim => AVAILABLE_DIMENSIONS[dim] || []);
      rows.push([behavior, ...Array(columns.length).fill('')]);
      subRows.forEach(sub => {
        rows.push([`  ${sub}`, ...clientRecords.map(r => {
          const val = r.data[`${behavior}_${sub}`];
          if (val === 'NO DATA') return 'NO DATA';
          const parsed = parseInt(val, 10);
          return isNaN(parsed) ? '' : parsed;
        })]);
      });
    });

    if (activeManeuvers.size > 0) {
      rows.push([]);
      rows.push(['SCIP-R Maneuvers', ...Array(columns.length).fill('')]);
      Array.from(activeManeuvers).forEach(m => {
        rows.push([`  ${m}`, ...clientRecords.map(r => {
          const val = r.data[`SCIP_${m}`];
          if (val === 'NO DATA') return 'NO DATA';
          const parsed = parseInt(val, 10);
          return isNaN(parsed) ? '' : parsed;
        })]);
      });
    }

    rows.push([]);
    rows.push(['Comments', ...clientRecords.map(r => r.data['Comments'] || '')]);

    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [{ wch: 35 }, ...columns.map(() => ({ wch: 22 }))];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Behavior Data');
    const filename = `BehaviorData_${activeClientObj.name.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, filename);
    setExportModal('success');
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setAuthError('');

    // --- SECURITY RESTRICTION ---
    // Change this to whatever domain or prefix you want to restrict to.
    const allowedDomain = "@tcfd.org"; // e.g. "@tcfd.org"
    
    if (!loginEmail.toLowerCase().endsWith(allowedDomain)) {
      setAuthError(`Access restricted: Only staff with a ${allowedDomain} email address may access this system.`);
      return;
    }

    try {
      if (isRegistering) {
        if (!registerName.trim() || !registerDepartment.trim()) {
          setAuthError("Please provide your full name and department.");
          return;
        }
        const userCredential = await createUserWithEmailAndPassword(auth, loginEmail, loginPassword);
        
        // Update user profile
        await updateProfile(userCredential.user, {
          displayName: registerName.trim()
        });
        
        // Store user details in Firestore
        await setDoc(doc(db, 'users', userCredential.user.uid), {
          name: registerName.trim(),
          department: registerDepartment.trim(),
          email: loginEmail,
          createdAt: new Date().toISOString()
        });
        
      } else {
        await signInWithEmailAndPassword(auth, loginEmail, loginPassword);
      }
    } catch (err) {
      setAuthError(err.message);
    }
  };

  if (authLoading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#f1f5f9', color: '#64748b', fontSize: '1.2rem', fontFamily: 'Inter, sans-serif' }}>Loading secure environment...</div>;
  }

  if (!user) {
    return (
      <div className="layout" style={{ justifyContent: 'center', alignItems: 'center', backgroundColor: '#f1f5f9' }}>
        <div className="white-card" style={{ maxWidth: '400px', width: '100%', padding: '3rem 2rem' }}>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <img src={tcfdLogo} alt="TCFD Logo" style={{ height: '60px', marginBottom: '1rem' }} />
            <h2 style={{ color: '#0f172a' }}>Behavior Data Tracker</h2>
            <p style={{ color: '#64748b', fontSize: '0.9rem', marginTop: '0.5rem' }}>Please log in to sync your clinical data securely.</p>
          </div>
          
          <form onSubmit={handleAuth}>
            {isRegistering && (
              <>
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input type="text" required className="form-control" placeholder="e.g. Jane Doe" value={registerName} onChange={e => setRegisterName(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Department / Role</label>
                  <input type="text" required className="form-control" placeholder="e.g. Clinical Staff" value={registerDepartment} onChange={e => setRegisterDepartment(e.target.value)} />
                </div>
              </>
            )}
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input type="email" required className="form-control" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} />
            </div>
            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label className="form-label">Password</label>
              <input type="password" required className="form-control" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} />
            </div>
            {authError && <div style={{ color: '#ef4444', marginBottom: '1rem', fontSize: '0.85rem', textAlign: 'center' }}>{authError}</div>}
            
            <button type="submit" className="btn-orange" style={{ width: '100%', justifyContent: 'center' }}>
              {isRegistering ? 'Create Account' : 'Secure Login'}
            </button>
            
            <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.85rem' }}>
              <button type="button" onClick={() => setIsRegistering(!isRegistering)} style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', textDecoration: 'underline' }}>
                {isRegistering ? 'Already have an account? Log in' : 'Need an account? Register'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }



  if (!firebaseDataLoaded || !currentView) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#f1f5f9', color: '#64748b', fontSize: '1.2rem', fontFamily: 'Inter, sans-serif' }}>Loading clinical data...</div>;
  }

  if (currentView === 'review') {
    const year = reviewMonth.getFullYear();
    const month = reviewMonth.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();

    const days = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(new Date(year, month, i));

    const monthNames = ["January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];

    return (
      <div className="tracker-view">
        <div className="tracker-header">
          <div className="tracker-brand">
            <img src={tcfdLogo} alt="TCFD Logo" className="nav-logo" />
            <h2>REVIEW DATA</h2>
          </div>
          
          <div className="tracker-info">
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: '0.8rem' }}>Client</label>
              <select 
                className="form-control" 
                value={activeClientId} 
                onChange={e => setActiveClientId(e.target.value)}
                style={{ minWidth: '160px' }}
              >
                {filteredClients.length === 0 ? <option value="">No residents found</option> : null}
                {filteredClients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginLeft: '2rem' }}>
              <button className="btn-orange-outline" onClick={() => setReviewMonth(new Date(year, month - 1, 1))}>&lt; Prev</button>
              <h3 style={{ margin: 0, minWidth: '160px', textAlign: 'center' }}>{monthNames[month]} {year}</h3>
              <button className="btn-orange-outline" onClick={() => setReviewMonth(new Date(year, month + 1, 1))}>Next &gt;</button>
            </div>
          </div>

          <div className="tracker-controls">
            <button onClick={() => setCurrentView('tracker')} className="btn-orange">
              <Table size={20} /> Data Entry
            </button>
            <button onClick={() => setCurrentView('setup')} className="btn-orange-outline">
              <ArrowLeft size={20} /> Back to Setup
            </button>
          </div>
        </div>

        <div className="table-container" style={{ padding: '2rem', backgroundColor: '#f8f9fa' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.5rem' }}>
            {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(d => (
              <div key={d} style={{ fontWeight: 'bold', textAlign: 'center', padding: '0.5rem', backgroundColor: '#e2e8f0', borderRadius: '4px', color: '#334155' }}>
                {d}
              </div>
            ))}
            {days.map((d, i) => {
              if (!d) return <div key={`empty-${i}`} style={{ minHeight: '120px', backgroundColor: '#f1f5f9', borderRadius: '4px' }} />;
              
              const dateStr = getLocalISODate(d);
              const dayRecords = historyData.filter(r => r.clientId === activeClientId && r.date === dateStr);
              
              return (
                <div key={dateStr} style={{ minHeight: '120px', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '0.5rem', backgroundColor: '#fff', display: 'flex', flexDirection: 'column', cursor: 'pointer' }}
                     onClick={() => {
                        setActiveDate(dateStr);
                        setCurrentView('tracker');
                     }}>
                  <div style={{ fontWeight: 'bold', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.25rem', marginBottom: '0.5rem', color: '#475569' }}>
                    {d.getDate()}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', flex: 1 }}>
                    {dayRecords.map(r => {
                      const totals = activeBehaviors.map(b => {
                        const dims = activeClientObj?.dimensions[b] || [];
                        const total = getBehaviorTotal(b, r.data, dims);
                        return total > 0 ? `${b}: ${total}` : null;
                      }).filter(Boolean);

                      return (
                        <div key={r.id} style={{ backgroundColor: '#fff7ed', border: '1px solid #fdba74', borderRadius: '4px', overflow: 'hidden', marginBottom: '4px' }}>
                          <div style={{ fontSize: '0.7rem', backgroundColor: '#fed7aa', color: '#9a3412', padding: '2px 4px', fontWeight: 'bold' }}>
                            {r.shift}
                          </div>
                          {totals.length > 0 ? (
                            <div style={{ padding: '2px 4px', fontSize: '0.65rem', color: '#475569' }}>
                              {totals.map(t => <div key={t}>{t}</div>)}
                            </div>
                          ) : (
                            <div style={{ padding: '2px 4px', fontSize: '0.65rem', color: '#94a3b8', fontStyle: 'italic' }}>
                              No Behaviors
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {dayRecords.length === 0 && (
                      <div style={{ color: '#cbd5e1', fontSize: '0.75rem', fontStyle: 'italic', marginTop: 'auto' }}>No entries</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  if (currentView === 'tracker') {
    return (
      <div className="tracker-view">
        <div style={{ marginBottom: '2rem' }}>
          {/* Top Row: Brand & Controls */}
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '2px solid var(--primary)' }}>
            <div className="tracker-brand">
              <img src={tcfdLogo} alt="TCFD Logo" className="nav-logo" />
              <h2>BEHAVIOR DATA SHEET</h2>
            </div>
            <div className="tracker-controls">
              <button onClick={() => setCurrentView('review')} className="btn-orange-outline">
                <Calendar size={20} /> Review Data
              </button>
              <button className="btn-orange-outline" onClick={handleExport}>
                <Download size={18} /> Export Full History
              </button>
              <button onClick={() => setCurrentView('setup')} className="btn-orange-outline">
                <ArrowLeft size={20} /> Back to Setup
              </button>
              <button onClick={() => signOut(auth)} className="btn-orange-outline" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#ef4444', borderColor: '#ef4444' }}>
                <LogOut size={16} /> Sign Out
              </button>
            </div>
          </div>
          
          {/* Bottom Row: Pickers & Info */}
          <div className="tracker-filters">
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: '0.8rem', color: '#64748b' }}>Residence</label>
              <select 
                className="form-control" 
                value={activeResidence} 
                onChange={e => setActiveResidence(e.target.value)}
              >
                {residences.length === 0 ? <option value="">Not Set</option> : null}
                {residences.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: '0.8rem', color: '#64748b' }}>Client</label>
              <select 
                className="form-control" 
                value={activeClientId} 
                onChange={e => setActiveClientId(e.target.value)}
              >
                {filteredClients.length === 0 ? <option value="">No residents found</option> : null}
                {filteredClients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: '0.8rem', color: '#64748b' }}>Date</label>
              <input 
                type="date" 
                className="form-control" 
                value={activeDate}
                onChange={e => setActiveDate(e.target.value)}
              />
            </div>
            
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: '0.8rem', color: '#64748b' }}>Shift</label>
              <select 
                className="form-control" 
                value={activeShift}
                onChange={e => setActiveShift(e.target.value)}
              >
                {SHIFTS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div className="table-container">
          <table className="tracker-table" style={{ width: '100%', maxWidth: '800px', margin: '0 auto' }}>
            <thead>
              <tr>
                <th style={{ width: '400px' }}>Behavior / Dimension</th>
                <th>Entry Value</th>
              </tr>
            </thead>
            <tbody>
              {activeBehaviors.map(behavior => {
                let bgColor = '#e8e8e8'; 
                if (behavior === "Aggression") bgColor = '#ffe6e6';
                if (behavior === "Self-Injury") bgColor = '#e6f3ff';

                const dims = activeDimensions[behavior] || [];
                const subRows = dims.flatMap(dim => AVAILABLE_DIMENSIONS[dim] || []);

                const hasBoth = dims.includes("Intensity") && dims.includes("Duration");
                
                let warningText = '';
                if (hasBoth) {
                  const iSum = getIntensitySum(behavior, currentEntryData);
                  const dSum = getDurationSum(behavior, currentEntryData);
                  if (iSum !== dSum && (iSum > 0 || dSum > 0)) {
                    warningText = `Mismatch (Int: ${iSum}, Dur: ${dSum})`;
                  }
                }

                return (
                  <React.Fragment key={behavior}>
                    <tr style={{ backgroundColor: bgColor }}>
                      <td style={{ fontWeight: 'bold', paddingLeft: '10px', verticalAlign: 'middle' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <span>{behavior}</span>
                          {warningText && <span style={{ color: '#ef4444', fontSize: '0.75rem' }}>{warningText}</span>}
                        </div>
                      </td>
                      <td style={{ textAlign: 'center', padding: '0.5rem' }}>
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                          <button 
                            className="btn-orange-outline" 
                            style={{ padding: '0.5rem 1rem', fontSize: '0.8rem', fontWeight: 'bold', backgroundColor: '#fff', textTransform: 'uppercase' }}
                            onClick={() => markNoBehavior(behavior)}
                          >
                            No Behavior
                          </button>
                          <button 
                            style={{ padding: '0.5rem 1rem', fontSize: '0.8rem', fontWeight: 'bold', backgroundColor: '#fee2e2', color: '#ef4444', border: '1px solid #fca5a5', borderRadius: '8px', cursor: 'pointer', textTransform: 'uppercase' }}
                            onClick={() => markNoData(behavior)}
                          >
                            No Data
                          </button>
                        </div>
                      </td>
                    </tr>
                    {subRows.map(sub => (
                      <tr key={`${behavior}_${sub}`}>
                        <td style={{ paddingLeft: '30px', fontStyle: 'italic', backgroundColor: '#f8f8f8' }}>{sub}</td>
                        <td style={{ backgroundColor: '#fff', padding: '0.5rem', display: 'flex', justifyContent: 'center' }}>
                          <RockerInput
                            value={currentEntryData[`${behavior}_${sub}`] !== undefined ? currentEntryData[`${behavior}_${sub}`] : ''}
                            onChange={val => handleCellChange(`${behavior}_${sub}`, val)}
                          />
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
                );
              })}

              {activeManeuvers.size > 0 && (
                <>
                  <tr style={{ backgroundColor: '#fff9c4' }}>
                    <td colSpan={2} style={{ textAlign: 'center', fontWeight: 'bold' }}>SCIP-R Maneuvers</td>
                  </tr>
                  {Array.from(activeManeuvers).map(m => (
                    <tr key={m}>
                      <td style={{ paddingLeft: '30px', fontStyle: 'italic', backgroundColor: '#fffadc' }}>{m}</td>
                      <td style={{ backgroundColor: '#fff', padding: '0.5rem', display: 'flex', justifyContent: 'center' }}>
                        <RockerInput
                          value={currentEntryData[`SCIP_${m}`] !== undefined ? currentEntryData[`SCIP_${m}`] : ''}
                          onChange={val => handleCellChange(`SCIP_${m}`, val)}
                        />
                      </td>
                    </tr>
                  ))}
                </>
              )}

              <tr>
                <td style={{ fontWeight: 'bold', paddingLeft: '10px', backgroundColor: '#e8e8e8' }}>Comments</td>
                <td style={{ backgroundColor: '#fff', padding: '0.5rem' }}>
                  <textarea
                    className="table-input"
                    style={{ minHeight: '100px', resize: 'vertical', width: '100%' }}
                    value={currentEntryData['Comments'] || ''}
                    onChange={e => handleCellChange('Comments', e.target.value)}
                    placeholder="Add shift notes here..."
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {exportModal && (
          <div className="modal-overlay" onClick={() => setExportModal(null)}>
            <div className="modal-box" onClick={e => e.stopPropagation()}>
              {exportModal === 'success' ? (
                <>
                  <div className="modal-icon success"><CheckCircle size={36} /></div>
                  <h3 className="modal-title">Export Successful</h3>
                  <p className="modal-body">Historical spreadsheet downloaded.</p>
                  <button className="btn-orange" onClick={() => setExportModal(null)}>Done</button>
                </>
              ) : (
                <>
                  <div className="modal-icon error"><AlertTriangle size={36} /></div>
                  <h3 className="modal-title">Cannot Export — Validation Failed</h3>
                  <p className="modal-body">Please fix the following issues in the historical data:</p>
                  <ul className="modal-errors" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                    {exportModal.errors.map((e, i) => <li key={i}>{e}</li>)}
                  </ul>
                  <button className="btn-orange-outline" onClick={() => setExportModal(null)}>Close</button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="layout">
      <main className="main-content">
        <header className="top-nav">
          <div className="nav-brand">
            <img src={tcfdLogo} alt="TCFD Logo" className="nav-logo" />
            <span className="brand-text">Behavior Data Sheet Configuration</span>
          </div>
        </header>

        <div className="content-wrapper">
          <div className="white-card">
            


            <div className="section" style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '2rem', marginBottom: '2rem' }}>
              <h3 style={{ marginBottom: '1rem', color: '#0f172a' }}>Configured Residences</h3>
              
              {residences.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
                  {residences.map(r => (
                    <div key={r} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#f1f5f9', padding: '0.5rem 1rem', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                      <span style={{ fontWeight: '600' }}>{r}</span>
                      <button onClick={() => {
                        const newRes = residences.filter(x => x !== r);
                        setResidences(newRes);
                        if (activeResidence === r) setActiveResidence(newRes[0] || '');
                      }} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0 0.25rem' }}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', maxWidth: '500px' }}>
                <div className="form-group" style={{ marginBottom: 0, flex: 1 }}>
                  <label className="form-label" style={{ fontSize: '0.9rem' }}>Add Residence</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Oak Street House"
                    value={draftResidence}
                    onChange={e => setDraftResidence(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (draftResidence.trim() && !residences.includes(draftResidence.trim())) {
                          setResidences([...residences, draftResidence.trim()]);
                          setActiveResidence(draftResidence.trim());
                          setDraftResidence('');
                        }
                      }
                    }}
                  />
                </div>
                <button 
                  className="btn-orange" 
                  onClick={() => {
                    if (draftResidence.trim() && !residences.includes(draftResidence.trim())) {
                      setResidences([...residences, draftResidence.trim()]);
                      setActiveResidence(draftResidence.trim());
                      setDraftResidence('');
                    }
                  }}
                >
                  <Plus size={20} /> Add
                </button>
              </div>
            </div>

            <div className="section" style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '2rem', marginBottom: '2rem' }}>
              <div className="form-group" style={{ maxWidth: '400px', marginBottom: '1.5rem' }}>
                <label className="form-label" style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>Active Residence (Configuring For)</label>
                <select 
                  className="form-control" 
                  value={activeResidence} 
                  onChange={e => setActiveResidence(e.target.value)}
                  style={{ border: '2px solid var(--primary)' }}
                >
                  {residences.length === 0 ? <option value="">Please add a residence above</option> : null}
                  {residences.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>

              {filteredClients.length > 0 && (
                <div>
                  <h3 style={{ marginBottom: '1rem', color: '#0f172a' }}><User size={20} style={{ verticalAlign: 'middle', marginRight: '0.5rem' }}/> Configured Residents in {activeResidence || 'Location'}</h3>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {filteredClients.map(c => (
                      <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#f1f5f9', padding: '0.75rem 1rem', borderRadius: '20px', border: '1px solid #cbd5e1' }}>
                        <span style={{ fontWeight: '600' }}>{c.name}</span>
                        <span style={{ fontSize: '0.8rem', color: '#64748b' }}>({c.behaviors.length} behaviors)</span>
                        <button onClick={() => removeClient(c.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', display: 'flex', marginLeft: '0.5rem' }}>
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="section" style={{ border: '2px dashed #cbd5e1', padding: '2rem', borderRadius: '12px', backgroundColor: '#fafafa' }}>
              <h2 className="section-title" style={{ marginBottom: '1.5rem', color: '#334155' }}><UserPlus size={24} /> Configure New Resident</h2>
              
              <div className="form-group">
                <label className="form-label">Resident Name</label>
                <input
                  id="add-resident-input"
                  type="text"
                  className="form-control"
                  placeholder="e.g. John Doe"
                  value={draftName}
                  onChange={e => setDraftName(e.target.value)}
                  style={{ maxWidth: '400px' }}
                />
              </div>

              <div style={{ marginTop: '2rem' }}>
                <h3 className="section-title" style={{ fontSize: '1.1rem' }}><Activity size={20} /> Target Behaviors for {draftName || 'Resident'}</h3>
                <div className="input-group" style={{ alignItems: 'flex-end', maxWidth: '500px' }}>
                  <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                    <select
                      className="form-control"
                      value={selectedBehaviorInput}
                      onChange={e => setSelectedBehaviorInput(e.target.value)}
                    >
                      <option value="">Select a behavior to add</option>
                      {AVAILABLE_BEHAVIORS.map(b => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </select>
                  </div>
                  <button className="btn-orange-outline" onClick={addBehavior}>
                    <Plus size={20} /> Add Behavior
                  </button>
                </div>

                {draftBehaviors.length > 0 && (
                  <div className="behavior-list" style={{ marginTop: '1rem' }}>
                    {draftBehaviors.map(behavior => (
                      <div key={behavior} className="behavior-item">
                        <div className="behavior-header">
                          <span className="behavior-name">{behavior}</span>
                          <button className="btn-danger" onClick={() => removeBehavior(behavior)}>
                            <Trash2 size={16} /> Remove
                          </button>
                        </div>
                        <div>
                          <label className="form-label" style={{ fontSize: '0.9rem' }}>Dimensions to track:</label>
                          <div className="dimensions-grid">
                            {Object.keys(AVAILABLE_DIMENSIONS).map(dim => (
                              <label key={dim} className="checkbox-label">
                                <input
                                  type="checkbox"
                                  className="checkbox-input"
                                  checked={(draftDimensions[behavior] || []).includes(dim)}
                                  onChange={() => toggleDimension(behavior, dim)}
                                />
                                {dim}
                              </label>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ marginTop: '2.5rem' }}>
                <h3 className="section-title" style={{ fontSize: '1.1rem' }}><Shield size={20} /> SCIP-R Maneuvers for {draftName || 'Resident'}</h3>
                {Object.entries(SCIPR_CATEGORIES).map(([category, maneuvers]) => (
                  <div key={category}>
                    <div className="category-title">{category}</div>
                    <div className="maneuvers-grid">
                      {maneuvers.map(maneuver => (
                        <label key={maneuver} className="checkbox-label">
                          <input
                            type="checkbox"
                            className="checkbox-input"
                            checked={draftManeuvers.has(maneuver)}
                            onChange={() => toggleManeuver(maneuver)}
                          />
                          {maneuver}
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="generate-area" style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '3rem' }}>
              <button className="btn-orange-outline large" onClick={saveDraftResident}>
                <UserPlus size={24} /> Add Resident
              </button>

              <button className="btn-orange large" onClick={openTracker}>
                <CheckCircle size={24} /> Complete Configuration
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
