import React, { useState } from 'react';
import { Table, Plus, Trash2, Shield, Activity, User, ArrowLeft } from 'lucide-react';
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

const EDUCATION_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const RESIDENTIAL_SHIFTS = ["7-3", "3-11", "11-7"];

function App() {
  const [currentView, setCurrentView] = useState('setup');
  const [clientName, setClientName] = useState('Test 8.0.2');
  const [setting, setSetting] = useState('Education');
  const [selectedBehaviorInput, setSelectedBehaviorInput] = useState('');
  const [targetBehaviors, setTargetBehaviors] = useState(['Self-Injury', 'Aggression']);
  const [behaviorDimensions, setBehaviorDimensions] = useState({
    'Self-Injury': ['Intensity', 'Duration'],
    'Aggression': ['Intensity', 'Duration']
  });
  const [selectedManeuvers, setSelectedManeuvers] = useState(new Set([
    'Touch/Touch with a Grasp', 'Front Deflection', 'One Person Escort', 'Two Person Take Down'
  ]));
  const [trackerData, setTrackerData] = useState({});

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

  if (currentView === 'tracker') {
    const columns = setting === "Education" ? EDUCATION_DAYS : RESIDENTIAL_SHIFTS;
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
          <button onClick={() => setCurrentView('setup')} className="btn-orange-outline">
            <ArrowLeft size={20} /> Back to Setup
          </button>
        </div>

        <div className="table-container">
          <table className="tracker-table">
            <thead>
              <tr>
                <th style={{ width: '250px' }}></th>
                {columns.map(col => <th key={col}>{col}</th>)}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Date:</strong></td>
                {columns.map(col => (
                  <td key={col}>
                    <input 
                      type="date" 
                      className="table-input" 
                      value={trackerData[`Date_${col}`] || ''} 
                      onChange={e => handleCellChange('Date', col, e.target.value)} 
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
                      <td colSpan={columns.length + 1} style={{ textAlign: 'center', fontWeight: 'bold' }}>{behavior}</td>
                    </tr>
                    {subRows.map(sub => (
                      <tr key={`${behavior}_${sub}`}>
                        <td style={{ paddingLeft: '20px', fontStyle: 'italic', backgroundColor: '#f8f8f8' }}>{sub}</td>
                        {columns.map(col => (
                          <td key={col} style={{ backgroundColor: '#fff' }}>
                            <input 
                              type="number" 
                              min="0"
                              className="table-input" 
                              style={{ textAlign: 'center' }}
                              value={trackerData[`${behavior}_${sub}_${col}`] || ''} 
                              onChange={e => handleCellChange(`${behavior}_${sub}`, col, e.target.value)} 
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
                      {columns.map(col => (
                        <td key={col} style={{ backgroundColor: '#fff' }}>
                          <input 
                            type="number" 
                            min="0"
                            className="table-input" 
                            style={{ textAlign: 'center' }}
                            value={trackerData[`SCIP_${m}_${col}`] || ''} 
                            onChange={e => handleCellChange(`SCIP_${m}`, col, e.target.value)} 
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </>
              )}

              <tr>
                <td><strong>Comments:</strong></td>
                {columns.map(col => (
                  <td key={col} style={{ backgroundColor: '#fff' }}>
                    <textarea 
                      className="table-input" 
                      style={{ minHeight: '80px', resize: 'vertical' }}
                      value={trackerData[`Comments_${col}`] || ''} 
                      onChange={e => handleCellChange('Comments', col, e.target.value)} 
                    />
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
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

            <div className="generate-area">
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
