import React, { useState, useEffect, useCallback } from 'react';
import { Table, Plus, Minus, Trash2, Shield, Activity, User, ArrowLeft, Download, AlertTriangle, CheckCircle, Eraser, RotateCcw, Cloud, CloudUpload, CloudDownload, Save } from 'lucide-react';
import * as XLSX from 'xlsx';
import tcfdLogo from './assets/tcfd.jpg';

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

const RockerInput = ({ value, onChange }) => {
  const val = value ? parseInt(value, 10) : 0;
  return (
    <div className="rocker-input">
      <button className="rocker-btn" onClick={() => onChange(Math.max(0, val - 1))}>
        <Minus size={14} />
      </button>
      <input
        type="number"
        min="0"
        className="table-input rocker-field"
        value={value === 0 ? '' : value}
        onChange={e => onChange(e.target.value)}
      />
      <button className="rocker-btn" onClick={() => onChange(val + 1)}>
        <Plus size={14} />
      </button>
    </div>
  );
};

function App() {
  const loadState = (key, defaultValue) => {
    try {
      const saved = localStorage.getItem(`behaviorTracker_${key}`);
      if (saved !== null) {
        if (key === 'selectedManeuvers') {
          return new Set(JSON.parse(saved));
        }
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn("Failed to load from local storage", e);
    }
    return defaultValue;
  };

  const [currentView, setCurrentView] = useState(() => loadState('currentView', 'setup'));
  const [clients, setClients] = useState(() => loadState('clients', []));
  const [newClientInput, setNewClientInput] = useState('');
  
  const [targetBehaviors, setTargetBehaviors] = useState(() => loadState('targetBehaviors', []));
  const [behaviorDimensions, setBehaviorDimensions] = useState(() => loadState('behaviorDimensions', {}));
  const [selectedManeuvers, setSelectedManeuvers] = useState(() => loadState('selectedManeuvers', new Set()));
  const [selectedBehaviorInput, setSelectedBehaviorInput] = useState('');

  // Longitudinal data: Array of { id, clientId, date, shift, data: { ... } }
  const [historyData, setHistoryData] = useState(() => loadState('historyData', []));

  // Active entry state
  const [activeClientId, setActiveClientId] = useState(() => loadState('activeClientId', ''));
  const [activeDate, setActiveDate] = useState(() => {
    const today = new Date();
    return today.toISOString().slice(0, 10);
  });
  const [activeShift, setActiveShift] = useState(SHIFTS[0]);
  const [currentEntryData, setCurrentEntryData] = useState({});

  // Cloud Sync State
  const [githubToken, setGithubToken] = useState(() => loadState('githubToken', ''));
  const [gistId, setGistId] = useState(() => loadState('gistId', ''));
  const [syncStatus, setSyncStatus] = useState('');

  const [exportModal, setExportModal] = useState(null);

  useEffect(() => {
    localStorage.setItem('behaviorTracker_currentView', JSON.stringify(currentView));
    localStorage.setItem('behaviorTracker_clients', JSON.stringify(clients));
    localStorage.setItem('behaviorTracker_targetBehaviors', JSON.stringify(targetBehaviors));
    localStorage.setItem('behaviorTracker_behaviorDimensions', JSON.stringify(behaviorDimensions));
    localStorage.setItem('behaviorTracker_selectedManeuvers', JSON.stringify(Array.from(selectedManeuvers)));
    localStorage.setItem('behaviorTracker_historyData', JSON.stringify(historyData));
    localStorage.setItem('behaviorTracker_activeClientId', JSON.stringify(activeClientId));
    localStorage.setItem('behaviorTracker_githubToken', JSON.stringify(githubToken));
    localStorage.setItem('behaviorTracker_gistId', JSON.stringify(gistId));
  }, [currentView, clients, targetBehaviors, behaviorDimensions, selectedManeuvers, historyData, activeClientId, githubToken, gistId]);

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

  const saveCurrentEntry = () => {
    if (!activeClientId) return;
    
    // Check if empty
    const isEmpty = Object.keys(currentEntryData).length === 0 || 
                    Object.values(currentEntryData).every(v => v === '' || v === 0);
    
    const newHistory = [...historyData];
    const index = newHistory.findIndex(
      r => r.clientId === activeClientId && r.date === activeDate && r.shift === activeShift
    );

    if (isEmpty) {
      if (index !== -1) newHistory.splice(index, 1);
    } else {
      const record = {
        id: `${activeClientId}_${activeDate}_${activeShift}`,
        clientId: activeClientId,
        date: activeDate,
        shift: activeShift,
        data: currentEntryData
      };
      if (index !== -1) {
        newHistory[index] = record;
      } else {
        newHistory.push(record);
      }
    }
    
    setHistoryData(newHistory);
    alert('Entry saved successfully!');
  };

  // Sync Functions
  const syncToCloud = async () => {
    if (!githubToken || !gistId) {
      alert("Please provide GitHub Token and Gist ID for syncing.");
      return;
    }
    setSyncStatus('Saving...');
    try {
      const payload = {
        clients, targetBehaviors, behaviorDimensions, 
        selectedManeuvers: Array.from(selectedManeuvers),
        historyData
      };
      
      const res = await fetch(`https://api.github.com/gists/${gistId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `token ${githubToken}`,
          'Accept': 'application/vnd.github.v3+json'
        },
        body: JSON.stringify({
          files: {
            'behavior_data.json': {
              content: JSON.stringify(payload, null, 2)
            }
          }
        })
      });
      
      if (!res.ok) throw new Error("Failed to save to Gist");
      setSyncStatus('Saved successfully');
      setTimeout(() => setSyncStatus(''), 3000);
    } catch (err) {
      console.error(err);
      setSyncStatus('Error saving');
    }
  };

  const loadFromCloud = async () => {
    if (!githubToken || !gistId) {
      alert("Please provide GitHub Token and Gist ID for syncing.");
      return;
    }
    setSyncStatus('Loading...');
    try {
      const res = await fetch(`https://api.github.com/gists/${gistId}`, {
        headers: {
          'Authorization': `token ${githubToken}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });
      if (!res.ok) throw new Error("Failed to load from Gist");
      const data = await res.json();
      const content = data.files['behavior_data.json']?.content;
      if (content) {
        const parsed = JSON.parse(content);
        if (parsed.clients) setClients(parsed.clients);
        if (parsed.targetBehaviors) setTargetBehaviors(parsed.targetBehaviors);
        if (parsed.behaviorDimensions) setBehaviorDimensions(parsed.behaviorDimensions);
        if (parsed.selectedManeuvers) setSelectedManeuvers(new Set(parsed.selectedManeuvers));
        if (parsed.historyData) setHistoryData(parsed.historyData);
        setSyncStatus('Loaded successfully');
        setTimeout(() => setSyncStatus(''), 3000);
      } else {
        throw new Error("File not found in Gist");
      }
    } catch (err) {
      console.error(err);
      setSyncStatus('Error loading');
    }
  };

  const addClient = () => {
    if (newClientInput.trim() && !clients.includes(newClientInput.trim())) {
      setClients([...clients, newClientInput.trim()]);
      if (!activeClientId) setActiveClientId(newClientInput.trim());
      setNewClientInput('');
    }
  };

  const removeClient = (c) => {
    if (confirm(`Are you sure you want to remove ${c}? This won't delete historical data, but removes them from the list.`)) {
      setClients(clients.filter(client => client !== c));
      if (activeClientId === c) setActiveClientId(clients[0] || '');
    }
  };

  const resetSetup = () => {
    if (confirm("Are you sure you want to reset the configuration? This will clear all settings and locally saved data.")) {
      setClients([]);
      setTargetBehaviors([]);
      setBehaviorDimensions({});
      setSelectedManeuvers(new Set());
      setHistoryData([]);
      setActiveClientId('');
    }
  };

  const addBehavior = () => {
    if (selectedBehaviorInput && !targetBehaviors.includes(selectedBehaviorInput)) {
      setTargetBehaviors([...targetBehaviors, selectedBehaviorInput]);
      setBehaviorDimensions({
        ...behaviorDimensions,
        [selectedBehaviorInput]: []
      });
      setSelectedBehaviorInput('');
    }
  };

  const removeBehavior = (behavior) => {
    setTargetBehaviors(targetBehaviors.filter(b => b !== behavior));
    const newDims = { ...behaviorDimensions };
    delete newDims[behavior];
    setBehaviorDimensions(newDims);
  };

  const toggleDimension = (behavior, dimension) => {
    const dims = behaviorDimensions[behavior] || [];
    let newDims;
    if (dims.includes(dimension)) {
      newDims = dims.filter(d => d !== dimension);
    } else {
      newDims = [...dims, dimension];
    }
    setBehaviorDimensions({
      ...behaviorDimensions,
      [behavior]: newDims
    });
  };

  const toggleManeuver = (maneuver) => {
    const newManeuvers = new Set(selectedManeuvers);
    if (newManeuvers.has(maneuver)) {
      newManeuvers.delete(maneuver);
    } else {
      newManeuvers.add(maneuver);
    }
    setSelectedManeuvers(newManeuvers);
  };

  const openTracker = () => {
    if (clients.length === 0) {
      alert("Please add at least one client.");
      return;
    }
    if (!activeClientId) setActiveClientId(clients[0]);
    setCurrentView('tracker');
  };

  const handleCellChange = (key, value) => {
    setCurrentEntryData(prev => ({
      ...prev,
      [key]: value
    }));
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

  const validateRecord = (record) => {
    const errors = [];
    const { data, date, shift } = record;
    targetBehaviors.forEach(behavior => {
      const dims = behaviorDimensions[behavior] || [];
      if (!dims.includes('Intensity') || !dims.includes('Duration')) return;
      const iSum = getIntensitySum(behavior, data);
      const dSum = getDurationSum(behavior, data);
      if ((iSum > 0 || dSum > 0) && iSum !== dSum) {
        errors.push(`${date} (${shift}): ${behavior} — Intensity total (${iSum}) does not match Duration total (${dSum}).`);
      }
    });
    return errors;
  };

  const handleExport = () => {
    if (!activeClientId) return;

    // First validate all records for this client
    const clientRecords = historyData.filter(r => r.clientId === activeClientId);
    clientRecords.sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return SHIFTS.indexOf(a.shift) - SHIFTS.indexOf(b.shift);
    });

    if (clientRecords.length === 0) {
      alert("No data available to export for this client.");
      return;
    }

    const allErrors = [];
    clientRecords.forEach(r => {
      const errs = validateRecord(r);
      allErrors.push(...errs);
    });

    if (allErrors.length > 0) {
      setExportModal({ errors: allErrors });
      return;
    }

    // Prepare columns: Date + Shift combinations
    const columns = clientRecords.map(r => `${r.date}\n${r.shift}`);

    const rows = [];
    rows.push([`BEHAVIOR DATA SHEET — ${activeClientId}`, ...Array(columns.length).fill('')]);
    rows.push([]);
    rows.push(['Date & Shift', ...columns]);

    targetBehaviors.forEach(behavior => {
      const dims = behaviorDimensions[behavior] || [];
      const subRows = dims.flatMap(dim => AVAILABLE_DIMENSIONS[dim] || []);
      rows.push([behavior, ...Array(columns.length).fill('')]);
      subRows.forEach(sub => {
        rows.push([`  ${sub}`, ...clientRecords.map(r => {
          const v = parseInt(r.data[`${behavior}_${sub}`], 10);
          return isNaN(v) ? '' : v;
        })]);
      });
    });

    if (selectedManeuvers.size > 0) {
      rows.push([]);
      rows.push(['SCIP-R Maneuvers', ...Array(columns.length).fill('')]);
      Array.from(selectedManeuvers).forEach(m => {
        rows.push([`  ${m}`, ...clientRecords.map(r => {
          const v = parseInt(r.data[`SCIP_${m}`], 10);
          return isNaN(v) ? '' : v;
        })]);
      });
    }

    rows.push([]);
    rows.push(['Comments', ...clientRecords.map(r => r.data['Comments'] || '')]);

    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [{ wch: 35 }, ...columns.map(() => ({ wch: 22 }))];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Behavior Data');
    const filename = `BehaviorData_${activeClientId.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, filename);
    setExportModal('success');
  };

  if (currentView === 'tracker') {
    return (
      <div className="tracker-view">
        <div className="tracker-header">
          <div className="tracker-brand">
            <img src={tcfdLogo} alt="TCFD Logo" className="nav-logo" />
            <h2>BEHAVIOR DATA SHEET</h2>
          </div>
          
          <div className="tracker-info" style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: '0.8rem' }}>Client</label>
              <select 
                className="form-control" 
                value={activeClientId} 
                onChange={e => setActiveClientId(e.target.value)}
              >
                {clients.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: '0.8rem' }}>Date</label>
              <input 
                type="date" 
                className="form-control" 
                value={activeDate}
                onChange={e => setActiveDate(e.target.value)}
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: '0.8rem' }}>Shift</label>
              <select 
                className="form-control" 
                value={activeShift}
                onChange={e => setActiveShift(e.target.value)}
              >
                {SHIFTS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div className="tracker-controls">
            <button className="btn-orange" onClick={saveCurrentEntry} style={{ padding: '0.75rem 1.5rem', fontWeight: '600' }}>
              <Save size={18} /> Save Entry
            </button>
            <button className="btn-orange-outline" onClick={handleExport}>
              <Download size={18} /> Export Full History
            </button>
            <button onClick={() => setCurrentView('setup')} className="btn-orange-outline">
              <ArrowLeft size={20} /> Back to Setup
            </button>
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
              {targetBehaviors.map(behavior => {
                let bgColor = '#e8e8e8'; 
                if (behavior === "Aggression") bgColor = '#ffe6e6';
                if (behavior === "Self-Injury") bgColor = '#e6f3ff';

                const dims = behaviorDimensions[behavior] || [];
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
                      <td style={{ fontWeight: 'bold', paddingLeft: '10px' }}>{behavior}</td>
                      <td style={{ textAlign: 'center', color: '#ef4444', fontWeight: 'bold', fontSize: '0.8rem' }}>
                        {warningText}
                      </td>
                    </tr>
                    {subRows.map(sub => (
                      <tr key={`${behavior}_${sub}`}>
                        <td style={{ paddingLeft: '30px', fontStyle: 'italic', backgroundColor: '#f8f8f8' }}>{sub}</td>
                        <td style={{ backgroundColor: '#fff', padding: '0.5rem', display: 'flex', justifyContent: 'center' }}>
                          <RockerInput
                            value={currentEntryData[`${behavior}_${sub}`] || ''}
                            onChange={val => handleCellChange(`${behavior}_${sub}`, val)}
                          />
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
                );
              })}

              {selectedManeuvers.size > 0 && (
                <>
                  <tr style={{ backgroundColor: '#fff9c4' }}>
                    <td colSpan={2} style={{ textAlign: 'center', fontWeight: 'bold' }}>SCIP-R Maneuvers</td>
                  </tr>
                  {Array.from(selectedManeuvers).map(m => (
                    <tr key={m}>
                      <td style={{ paddingLeft: '30px', fontStyle: 'italic', backgroundColor: '#fffadc' }}>{m}</td>
                      <td style={{ backgroundColor: '#fff', padding: '0.5rem', display: 'flex', justifyContent: 'center' }}>
                        <RockerInput
                          value={currentEntryData[`SCIP_${m}`] || ''}
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
            
            {/* Sync Status Bar */}
            <div className="sync-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', backgroundColor: '#f8f9fa', borderRadius: '8px', marginBottom: '2rem' }}>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <Cloud size={24} color="#f97316" />
                <span style={{ fontWeight: 'bold' }}>Cloud Sync</span>
                {syncStatus && <span style={{ color: '#666', fontStyle: 'italic' }}>{syncStatus}</span>}
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input 
                  type="password" 
                  placeholder="GitHub Token" 
                  className="form-control" 
                  value={githubToken} 
                  onChange={e => setGithubToken(e.target.value)} 
                  style={{ width: '150px' }}
                />
                <input 
                  type="text" 
                  placeholder="Gist ID" 
                  className="form-control" 
                  value={gistId} 
                  onChange={e => setGistId(e.target.value)} 
                  style={{ width: '150px' }}
                />
                <button className="btn-orange-outline" onClick={loadFromCloud} title="Load Data">
                  <CloudDownload size={18} /> Load
                </button>
                <button className="btn-orange" onClick={syncToCloud} title="Save Data">
                  <CloudUpload size={18} /> Save
                </button>
              </div>
            </div>

            <div className="section">
              <h2 className="section-title"><User size={24} /> Client Residences</h2>
              <div className="input-group" style={{ alignItems: 'flex-end' }}>
                <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                  <label className="form-label">Add Individual Client</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. John Doe"
                    value={newClientInput}
                    onChange={e => setNewClientInput(e.target.value)}
                    onKeyPress={e => e.key === 'Enter' && addClient()}
                  />
                </div>
                <button className="btn-orange-outline" onClick={addClient}>
                  <Plus size={20} /> Add Client
                </button>
              </div>
              
              {clients.length > 0 && (
                <div style={{ marginTop: '1rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {clients.map(c => (
                    <div key={c} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#f1f5f9', padding: '0.5rem 1rem', borderRadius: '20px' }}>
                      <span style={{ fontWeight: '500' }}>{c}</span>
                      <button onClick={() => removeClient(c)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', display: 'flex' }}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="section">
              <h2 className="section-title"><Activity size={24} /> Target Behaviors</h2>
              <div className="input-group" style={{ alignItems: 'flex-end' }}>
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

              {targetBehaviors.length > 0 && (
                <div className="behavior-list">
                  {targetBehaviors.map(behavior => (
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
                                checked={(behaviorDimensions[behavior] || []).includes(dim)}
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

            <div className="section">
              <h2 className="section-title"><Shield size={24} /> SCIP-R Maneuvers</h2>
              {Object.entries(SCIPR_CATEGORIES).map(([category, maneuvers]) => (
                <div key={category}>
                  <div className="category-title">{category}</div>
                  <div className="maneuvers-grid">
                    {maneuvers.map(maneuver => (
                      <label key={maneuver} className="checkbox-label">
                        <input
                          type="checkbox"
                          className="checkbox-input"
                          checked={selectedManeuvers.has(maneuver)}
                          onChange={() => toggleManeuver(maneuver)}
                        />
                        {maneuver}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="generate-area" style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button className="btn-orange-outline large" onClick={resetSetup}>
                <RotateCcw size={24} /> Reset Configuration
              </button>
              <button className="btn-orange large" onClick={openTracker}>
                <Table size={24} /> Open Data Tracker
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
