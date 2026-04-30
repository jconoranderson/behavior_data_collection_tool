import React, { useState } from 'react';
import { FileDown, Plus, Trash2, Shield, Activity, User, Home } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
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
  const [clientName, setClientName] = useState('');
  const [setting, setSetting] = useState('');
  const [selectedBehaviorInput, setSelectedBehaviorInput] = useState('');
  const [targetBehaviors, setTargetBehaviors] = useState([]);
  const [behaviorDimensions, setBehaviorDimensions] = useState({});
  const [selectedManeuvers, setSelectedManeuvers] = useState(new Set());

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

  const generatePDF = () => {
    if (!clientName || !setting) {
      alert("Please fill in the Client Name and Setting.");
      return;
    }

    const doc = new jsPDF('p', 'pt', 'letter');
    const margin = 40;

    // Header
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("BEHAVIOR DATA SHEET", doc.internal.pageSize.width / 2, margin, { align: "center" });

    // Details
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text(`Client: ${clientName}`, margin, margin + 30);
    doc.text(`Setting: ${setting}`, doc.internal.pageSize.width / 2, margin + 30);

    // Table Generation
    const columns = setting === "Education" ? EDUCATION_DAYS : RESIDENTIAL_SHIFTS;
    
    let head = [["", ...columns]];
    let body = [];

    // Date row
    body.push(["Date:", ...columns.map(() => "")]);

    // Behaviors rows
    targetBehaviors.forEach(behavior => {
      // Main behavior row
      let bgColor = [232, 232, 232]; // Default gray
      if (behavior === "Aggression") bgColor = [255, 230, 230];
      if (behavior === "Self-Injury") bgColor = [230, 243, 255];

      body.push({
        content: behavior,
        colSpan: columns.length + 1,
        styles: { fillColor: bgColor, fontStyle: 'bold', halign: 'center', textColor: [0,0,0] }
      });

      // Dimensions rows
      const dims = behaviorDimensions[behavior] || [];
      dims.forEach(dim => {
        const subDims = AVAILABLE_DIMENSIONS[dim] || [];
        subDims.forEach(sub => {
          body.push([{ content: sub, styles: { fontStyle: 'italic', fillColor: [248, 248, 248], textColor: [80,80,80] } }, ...columns.map(() => "")]);
        });
      });
    });

    // SCIP-R rows
    if (selectedManeuvers.size > 0) {
      body.push({
        content: "SCIP-R Maneuvers",
        colSpan: columns.length + 1,
        styles: { fillColor: [255, 249, 196], fontStyle: 'bold', halign: 'center', textColor: [0,0,0] }
      });

      Object.entries(SCIPR_CATEGORIES).forEach(([category, maneuvers]) => {
        const activeManeuvers = maneuvers.filter(m => selectedManeuvers.has(m));
        activeManeuvers.forEach(m => {
          body.push([{ content: m, styles: { fontStyle: 'italic', fillColor: [255, 250, 220], textColor: [60,60,60] } }, ...columns.map(() => "")]);
        });
      });
    }

    // Comments
    body.push([{ content: "Comments:", styles: { fontStyle: 'bold' } }, ...columns.map(() => ({ content: "", styles: { minCellHeight: 60 } }))]);

    autoTable(doc, {
      startY: margin + 50,
      head: head,
      body: body,
      theme: 'grid',
      headStyles: { fillColor: [200, 200, 200], textColor: [0, 0, 0], halign: 'center' },
      styles: { fontSize: 9, cellPadding: 4, lineColor: [150, 150, 150], lineWidth: 0.5 },
      columnStyles: { 0: { cellWidth: 120 } },
      margin: { left: margin, right: margin }
    });

    const settingAbbrev = setting === "Education" ? "Ed" : "Res";
    const safeName = clientName.replace(/ /g, '_');
    const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '.');
    doc.save(`${dateStr}_${safeName}_${settingAbbrev}.pdf`);
  };

  return (
    <div className="layout">
      <main className="main-content">
        <header className="top-nav">
          <div className="nav-brand">
            <img src={tcfdLogo} alt="TCFD Logo" className="nav-logo" />
            <span className="brand-text">Behavior Data Sheet Generator</span>
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
                <button className="btn-orange large" onClick={generatePDF}>
                  <FileDown size={24} /> Generate Data Sheet PDF
                </button>
              </div>
            </div>
        </div>
      </main>
    </div>
  );
}

export default App;
