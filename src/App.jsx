import React, { useState } from 'react';
import { Table, Plus, Minus, Trash2, Shield, Activity, User, ArrowLeft, Download, AlertTriangle, CheckCircle, Eraser, RotateCcw } from 'lucide-react';
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

const EDUCATION_PERIODS = {
  daily: [""],
  weekly: ["Day 1", "Day 2", "Day 3", "Day 4", "Day 5", "Day 6", "Day 7"]
};
const RESIDENTIAL_SHIFTS = ["7-3", "3-11", "11-7"];

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
        value={value}
        onChange={e => onChange(e.target.value)}
      />
      <button className="rocker-btn" onClick={() => onChange(val + 1)}>
        <Plus size={14} />
      </button>
    </div>
  );
};

function App() {
  const [currentView, setCurrentView] = useState('setup');
  const [clientName, setClientName] = useState('');
  const [setting, setSetting] = useState('');
  const [educationPeriod, setEducationPeriod] = useState('daily');
  const [selectedBehaviorInput, setSelectedBehaviorInput] = useState('');
  const [targetBehaviors, setTargetBehaviors] = useState([]);
  const [behaviorDimensions, setBehaviorDimensions] = useState({});
  const [selectedManeuvers, setSelectedManeuvers] = useState(new Set());
  const [exportModal, setExportModal] = useState(null); // null | { errors: [] } | 'success'
  const [trackerData, setTrackerData] = useState({});

  const clearTrackerData = () => {
    if (confirm("Are you sure you want to clear all entered data? This cannot be undone.")) {
      setTrackerData({});
    }
  };

  const resetSetup = () => {
    if (confirm("Are you sure you want to reset the configuration? This will clear all selected behaviors and settings.")) {
      setClientName('');
      setSetting('');
      setTargetBehaviors([]);
      setBehaviorDimensions({});
      setSelectedManeuvers(new Set());
      setTrackerData({});
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
    if (!clientName || !setting) {
      alert("Please fill in the Client Name and Setting.");
      return;
    }
    setCurrentView('tracker');
  };

  const handleCellChange = (rowKey, col, value) => {
    setTrackerData(prev => ({
      ...prev,
      [`${rowKey}_${col}`]: value
    }));
  };

  const getIntensitySum = (behavior, col) => {
    let sum = 0;
    AVAILABLE_DIMENSIONS["Intensity"].forEach(level => {
      const val = parseInt(trackerData[`${behavior}_${level}_${col}`], 10);
      if (!isNaN(val)) sum += val;
    });
    return sum;
  };

  const getDurationSum = (behavior, col) => {
    let sum = 0;
    AVAILABLE_DIMENSIONS["Duration"].forEach(dur => {
      const val = parseInt(trackerData[`${behavior}_${dur}_${col}`], 10);
      if (!isNaN(val)) sum += val;
    });
    return sum;
  };

  if (currentView === 'tracker') {
    const columns = setting === "Education" ? EDUCATION_PERIODS[educationPeriod] : RESIDENTIAL_SHIFTS;

    const formatDateParts = (dateStr) => {
      if (!dateStr) return null;
      const [y, mo, d] = dateStr.split('-').map(Number);
      const dt = new Date(y, mo - 1, d);
      return {
        weekday: dt.toLocaleDateString('en-US', { weekday: 'long' }),
        longDate: dt.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
      };
    };

    // ── Validation ────────────────────────────────────────────────
    const validateData = () => {
      const errors = [];

      // 1. Must have at least one numeric entry > 0
      const hasAnyData = Object.entries(trackerData).some(([k, v]) => {
        if (k.startsWith('Date_') || k.startsWith('Comments_')) return false;
        const n = parseInt(v, 10);
        return !isNaN(n) && n > 0;
      });
      if (!hasAnyData) {
        errors.push('No behavior data has been entered.');
        return errors;
      }

      // 2. Intensity / Duration totals must match per column per behavior
      targetBehaviors.forEach(behavior => {
        const dims = behaviorDimensions[behavior] || [];
        if (!dims.includes('Intensity') || !dims.includes('Duration')) return;
        columns.forEach((col, i) => {
          const iSum = getIntensitySum(behavior, i);
          const dSum = getDurationSum(behavior, i);
          if ((iSum > 0 || dSum > 0) && iSum !== dSum) {
            const colLabel = formatDateParts(trackerData[`Date_${i}`])?.longDate || col || `Column ${i + 1}`;
            errors.push(`${behavior} — ${colLabel}: Intensity total (${iSum}) does not match Duration total (${dSum}).`);
          }
        });
      });

      return errors;
    };

    // ── XLSX Export ───────────────────────────────────────────────
    const handleExport = () => {
      const errors = validateData();
      if (errors.length > 0) {
        setExportModal({ errors });
        return;
      }
      exportXLSX();
    };

    const exportXLSX = () => {
      const colHeaders = columns.map((col, i) => {
        const parts = formatDateParts(trackerData[`Date_${i}`]);
        if (parts) return `${parts.weekday}\n${parts.longDate}`;
        return col || 'Date';
      });

      const rows = [];
      rows.push([`BEHAVIOR DATA SHEET — ${clientName}`, ...Array(columns.length).fill('')]);
      rows.push([`Setting: ${setting}${setting === 'Education' ? ` (${educationPeriod})` : ''}`, ...Array(columns.length).fill('')]);
      rows.push([]);
      rows.push(['', ...colHeaders]);
      rows.push(['Date', ...columns.map((_, i) => trackerData[`Date_${i}`] || '')]);

      targetBehaviors.forEach(behavior => {
        const dims = behaviorDimensions[behavior] || [];
        const subRows = dims.flatMap(dim => AVAILABLE_DIMENSIONS[dim] || []);
        rows.push([behavior, ...Array(columns.length).fill('')]);
        subRows.forEach(sub => {
          rows.push([`  ${sub}`, ...columns.map((_, i) => {
            const v = parseInt(trackerData[`${behavior}_${sub}_${i}`], 10);
            return isNaN(v) ? '' : v;
          })]);
        });
      });

      if (selectedManeuvers.size > 0) {
        rows.push([]);
        rows.push(['SCIP-R Maneuvers', ...Array(columns.length).fill('')]);
        Array.from(selectedManeuvers).forEach(m => {
          rows.push([`  ${m}`, ...columns.map((_, i) => {
            const v = parseInt(trackerData[`SCIP_${m}_${i}`], 10);
            return isNaN(v) ? '' : v;
          })]);
        });
      }

      rows.push([]);
      rows.push(['Comments', ...columns.map((_, i) => trackerData[`Comments_${i}`] || '')]);

      const ws = XLSX.utils.aoa_to_sheet(rows);
      ws['!cols'] = [{ wch: 35 }, ...columns.map(() => ({ wch: 22 }))];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Behavior Data');
      const filename = `BehaviorData_${clientName.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.xlsx`;
      XLSX.writeFile(wb, filename);
      setExportModal('success');
    };

    return (
      <div className="tracker-view">
        <div className="tracker-header">
          <div className="tracker-brand">
            <img src={tcfdLogo} alt="TCFD Logo" className="nav-logo" />
            <h2>BEHAVIOR DATA SHEET</h2>
          </div>
          <div className="tracker-info">
            <span>Client: {clientName}</span>
            <span>Setting: {setting}</span>
          </div>
          <div className="tracker-controls">
            {setting === 'Education' && (
              <div className="period-toggle">
                {['daily', 'weekly'].map(p => (
                  <button
                    key={p}
                    className={`period-btn${educationPeriod === p ? ' active' : ''}`}
                    onClick={() => setEducationPeriod(p)}
                  >
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </button>
                ))}
              </div>
            )}
            <button className="btn-danger" onClick={clearTrackerData} style={{ padding: '0.75rem 1.5rem', fontWeight: '600' }}>
              <Eraser size={18} /> Clear Data
            </button>
            <button className="btn-orange" onClick={handleExport}>
              <Download size={18} /> Export to Excel
            </button>
            <button onClick={() => setCurrentView('setup')} className="btn-orange-outline">
              <ArrowLeft size={20} /> Back to Setup
            </button>
          </div>
        </div>

        <div className="table-container">
          <table className="tracker-table">
            <thead>
              <tr>
                <th style={{ width: '250px' }}></th>
                {columns.map((col, i) => {
                  const parts = formatDateParts(trackerData[`Date_${i}`]);
                  return (
                    <th key={i}>
                      {parts ? (
                        <>
                          <div style={{ fontWeight: 700 }}>{parts.weekday}</div>
                          <div style={{ fontWeight: 400, fontSize: '0.85rem' }}>{parts.longDate}</div>
                        </>
                      ) : (
                        <div>{col || 'Date'}</div>
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Date:</strong></td>
                {columns.map((col, i) => (
                  <td key={i} style={{ padding: '0.25rem' }}>
                    <input
                      type="date"
                      className="table-input"
                      value={trackerData[`Date_${i}`] || ''}
                      onChange={e => handleCellChange('Date', i, e.target.value)}
                    />
                  </td>
                ))}
              </tr>

              {targetBehaviors.map(behavior => {
                let bgColor = '#e8e8e8'; // default gray
                if (behavior === "Aggression") bgColor = '#ffe6e6';
                if (behavior === "Self-Injury") bgColor = '#e6f3ff';

                const dims = behaviorDimensions[behavior] || [];
                const subRows = dims.flatMap(dim => AVAILABLE_DIMENSIONS[dim] || []);

                return (
                  <React.Fragment key={behavior}>
                    <tr style={{ backgroundColor: bgColor }}>
                      <td style={{ fontWeight: 'bold', paddingLeft: '10px' }}>{behavior}</td>
                      {columns.map((col, i) => {
                        const hasBoth = dims.includes("Intensity") && dims.includes("Duration");
                        let warningText = '';
                        if (hasBoth) {
                          const iSum = getIntensitySum(behavior, i);
                          const dSum = getDurationSum(behavior, i);
                          if (iSum !== dSum && (iSum > 0 || dSum > 0)) {
                            warningText = `Mismatch (Int: ${iSum}, Dur: ${dSum})`;
                          }
                        }
                        return (
                          <td key={i} style={{ textAlign: 'center', color: '#ef4444', fontWeight: 'bold', fontSize: '0.8rem' }}>
                            {warningText}
                          </td>
                        );
                      })}
                    </tr>
                    {subRows.map(sub => (
                      <tr key={`${behavior}_${sub}`}>
                        <td style={{ paddingLeft: '20px', fontStyle: 'italic', backgroundColor: '#f8f8f8' }}>{sub}</td>
                        {columns.map((col, i) => (
                          <td key={i} style={{ backgroundColor: '#fff', padding: '0.25rem' }}>
                            <RockerInput
                              value={trackerData[`${behavior}_${sub}_${i}`] || ''}
                              onChange={val => handleCellChange(`${behavior}_${sub}`, i, val)}
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </React.Fragment>
                );
              })}

              {selectedManeuvers.size > 0 && (
                <>
                  <tr style={{ backgroundColor: '#fff9c4' }}>
                    <td colSpan={columns.length + 1} style={{ textAlign: 'center', fontWeight: 'bold' }}>SCIP-R Maneuvers</td>
                  </tr>
                  {Array.from(selectedManeuvers).map(m => (
                    <tr key={m}>
                      <td style={{ paddingLeft: '20px', fontStyle: 'italic', backgroundColor: '#fffadc' }}>{m}</td>
                      {columns.map((col, i) => (
                        <td key={i} style={{ backgroundColor: '#fff', padding: '0.25rem' }}>
                          <RockerInput
                            value={trackerData[`SCIP_${m}_${i}`] || ''}
                            onChange={val => handleCellChange(`SCIP_${m}`, i, val)}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </>
              )}

              <tr>
                <td><strong>Comments:</strong></td>
                {columns.map((col, i) => (
                  <td key={i} style={{ backgroundColor: '#fff' }}>
                    <textarea
                      className="table-input"
                      style={{ minHeight: '80px', resize: 'vertical' }}
                      value={trackerData[`Comments_${i}`] || ''}
                      onChange={e => handleCellChange('Comments', i, e.target.value)}
                    />
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>

      {/* Export Modal */}
      {exportModal && (
        <div className="modal-overlay" onClick={() => setExportModal(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            {exportModal === 'success' ? (
              <>
                <div className="modal-icon success"><CheckCircle size={36} /></div>
                <h3 className="modal-title">Export Successful</h3>
                <p className="modal-body">Your spreadsheet has been downloaded.</p>
                <button className="btn-orange" onClick={() => setExportModal(null)}>Done</button>
              </>
            ) : (
              <>
                <div className="modal-icon error"><AlertTriangle size={36} /></div>
                <h3 className="modal-title">Cannot Export — Validation Failed</h3>
                <p className="modal-body">Please fix the following issues before exporting:</p>
                <ul className="modal-errors">
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
          <a href="#" className="nav-link">About</a>
        </header>

        <div className="content-wrapper">
          <div className="white-card">
            <div className="section">
              <h2 className="section-title"><User size={24} /> Client Information</h2>
              <div className="input-group">
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Client Name</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. John Doe"
                    value={clientName}
                    onChange={e => setClientName(e.target.value)}
                  />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Setting</label>
                  <select
                    className="form-control"
                    value={setting}
                    onChange={e => setSetting(e.target.value)}
                  >
                    <option value="">Select Setting</option>
                    <option value="Education">Education</option>
                    <option value="Residential">Residential</option>
                  </select>
                </div>
              </div>
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
