import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Mic, RefreshCw, Check, Edit3, Globe2, ChevronDown, ChevronRight, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// Core municipal services (extendable)
const SERVICES = [
  { key: 'garbage', label: 'Garbage collection', icon: '🗑️', color: 'bg-rose-50 hover:bg-rose-100' },
  { key: 'water', label: 'Water supply issues', icon: '💧', color: 'bg-sky-50 hover:bg-sky-100' },
  { key: 'streetlight', label: 'Streetlight repair', icon: '💡', color: 'bg-amber-50 hover:bg-amber-100' },
  { key: 'complaints', label: 'Complaints / Suggestions', icon: '💬', color: 'bg-emerald-50 hover:bg-emerald-100' },
];

// Hierarchical complaint categories
const COMPLAINT_CATEGORIES = [
  {
    name: 'Citizen Services',
    children: [
      { name: 'Certificates', children: ['Birth Certificate', 'Death Certificate', 'Marriage Certificate'] },
      { name: 'Public Services', children: ['Citizen Charter Timeline', 'Grievances', 'CRM Services'] },
    ],
  },
  {
    name: 'Payments & Taxes',
    children: [
      { name: 'Property & Utilities', children: ['Property Tax', 'Water Charges', 'Solid Waste Management'] },
      { name: 'Business & Miscellaneous', children: ['Business', 'Others', 'Bill Tracking'] },
    ],
  },
  {
    name: 'Licences & Approvals',
    children: [
      { name: 'Licences & Approvals', children: ['Restaurants Licenses', 'Tree Cutting Approvals'] },
    ],
  },
  {
    name: 'Departments (Surat Municipal Corporation)',
    children: [
      { name: 'Engineering', children: ['Bridge Cell','Street Light','Special Projects','Traffic Cell','BRTS Cell','CE Special Cell','Energy Efficiency Cell','Environment Cell','Town Planning','Town Development','Hydraulic (Water Supply)','Drainage','Road Development'] },
      { name: 'Health', children: ['Solid Waste Management','Health Department','Vector Borne Diseases Control','Birth & Death Registration','SMIMER Hospital','I.C.D.S.','PM-JAY'] },
      { name: 'Support', children: ['Accounts','Information Technology','Election & Census','Stores'] },
      { name: 'Air Quality Management', children: ['Air Quality Management Cell'] },
      { name: 'Revenue', children: ['Property Tax','Professional Tax','Octroi','Other Tax'] },
      { name: 'Social Welfare', children: ['Department of Affordable Housing','Urban Community Development'] },
      { name: 'Secretary', children: ['Secretary'] },
      { name: 'Fire & Emergency Services', children: ['Fire & Emergency Services'] },
      { name: 'Culture', children: ['Culture'] },
      { name: 'Watch & Ward', children: ['Watch & Ward'] },
    ],
  },
  {
    name: 'Public Services & Facilities',
    children: [
      { name: 'Education', children: ['Primary','Secondary (Suman High School)','Medical College - SMIMER','Library'] },
      { name: 'Amusement / Sports Facilities', children: ['Gardens','Aquarium','Swimming Pools','Nature Park','Surat Fort'] },
      { name: 'Performing Arts', children: ['Performing Art Centre'] },
      { name: 'City Civic Center', children: ['Introduction','List of Centers'] },
      { name: 'Auditoria & Stadiums', children: ['Indoor Stadium','Gandhi Smriti','Sardar Smriti','Rang Upvan','Sanjeevkumar','Swami Vivekanand'] },
      { name: 'Science & Knowledge', children: ['Science Centre'] },
      { name: 'Engineering Services', children: ['Water Supply','Drainage','Traffic','EV Charging Stations'] },
      { name: 'Development', children: ['Town Development'] },
    ],
  },
];

const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'hi', name: 'Hindi' },
  { code: 'bn', name: 'Bengali' },
  { code: 'te', name: 'Telugu' },
];

const UsersHome = () => {
  const [screen, setScreen] = useState('home'); // home | voice | complaintCategories
  const [language, setLanguage] = useState('en');
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [manualEdit, setManualEdit] = useState(false);
  const [serviceSelected, setServiceSelected] = useState(null);
  const [complaintPath, setComplaintPath] = useState([]); // selected hierarchy
  const [expanded, setExpanded] = useState({});
  const [complaintMode, setComplaintMode] = useState(false);
  const [showVoicePrep, setShowVoicePrep] = useState(false); // modal visibility
  // Audio recording (temporary until reload – only kept in memory & navigation state)
  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null); // object URL or base64 for playback
  const [audioDuration, setAudioDuration] = useState(0);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioBase64Ref = useRef(null); // base64 string (data URL) kept only in memory
  const recognitionRef = useRef(null);
  const navigate = useNavigate();

  // Initialize Web Speech API if available
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.lang = language;
      recognition.interimResults = true;
      recognition.continuous = true;
      recognition.onresult = (e) => {
        let final = '';
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const res = e.results[i];
            final += res[0].transcript;
        }
        setTranscript(final.trim());
      };
      recognition.onend = () => setIsListening(false);
      recognitionRef.current = recognition;
    }
  }, [language]);

  const startListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.lang = language;
        recognitionRef.current.start();
        setIsListening(true);
      } catch (e) {
        // likely already started
      }
    } else {
      // Fallback: simulate transcript
      setIsListening(true);
      setTimeout(() => setTranscript('Streetlight not working in my area'), 1500);
    }
  }, [language]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
  }, [isListening]);

  const toggleVoice = () => {
    if (isListening) stopListening(); else startListening();
  };

  const goToVoiceScreen = () => {
    setScreen('voice');
    setTranscript('');
    setManualEdit(false);
    startListening();
    // Auto-start audio recording (optional) could be triggered here in future
  };

  const startComplaint = () => {
    setComplaintMode(true);
    goToVoiceScreen();
  };

  const confirmReport = () => {
    stopListening();
  // Navigate to report page carrying state (service + transcript + optional audio)
  navigate('/report', { state: { transcript, service: serviceSelected, audio: audioBase64Ref.current, audioDuration } });
  };

  const retry = () => {
    setTranscript('');
    setManualEdit(false);
    startListening();
  };

  // --- Audio Recording Logic (MediaRecorder) ---
  const startRecordingAudio = async () => {
    if (isRecording) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      audioChunksRef.current = [];
      mr.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      mr.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        setAudioUrl((prev) => { if (prev) URL.revokeObjectURL(prev); return url; });
        // derive duration (async via audio element)
        const tempAudio = new Audio(url);
        tempAudio.addEventListener('loadedmetadata', () => {
          setAudioDuration(tempAudio.duration || 0);
        });
        // convert to base64 (kept only in memory – lost after reload)
        const reader = new FileReader();
        reader.onloadend = () => { audioBase64Ref.current = reader.result; };
        reader.readAsDataURL(blob);
      };
      mr.start();
      mediaRecorderRef.current = mr;
      setIsRecording(true);
    } catch (err) {
      console.error('Audio permission/record error', err);
    }
  };

  const stopRecordingAudio = () => {
    if (!isRecording || !mediaRecorderRef.current) return;
    try { mediaRecorderRef.current.stop(); } catch (_) { /* noop */ }
    mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
    setIsRecording(false);
  };

  const resetAudio = () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    audioBase64Ref.current = null;
    setAudioDuration(0);
  };

  const ServiceCard = ({ s }) => (
    <button
      onClick={() => {
        setServiceSelected(s.key);
        if (s.key === 'complaints') setScreen('complaintCategories');
      }}
      className={`flex flex-col items-start gap-2 p-4 rounded-xl border transition shadow-sm ${s.color} ${serviceSelected === s.key ? 'ring-2 ring-blue-400' : 'border-transparent'}`}
    >
      <span className="text-2xl" role="img" aria-label={s.label}>{s.icon}</span>
      <span className="text-sm font-medium text-left leading-tight">{s.label}</span>
    </button>
  );

  const toggleExpand = (key) => setExpanded(e => ({ ...e, [key]: !e[key] }));
  const selectComplaint = (level, name) => {
    const newPath = [...complaintPath.slice(0, level), name];
    setComplaintPath(newPath);
  };

  return (
    <div className="w-full mx-auto max-w-5xl">
      {screen === 'home' && (
        <div className="space-y-8">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold">Home</h1>
            <div className="flex items-center gap-2">
              <Globe2 className="w-4 h-4 text-gray-500" />
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="text-sm border rounded-md px-2 py-1 bg-white"
              >
                {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.name}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {SERVICES.map(s => <ServiceCard key={s.key} s={s} />)}
          </div>

            <div className="flex flex-col items-center gap-6 pt-8 pb-16">
              <button
                onClick={() => setShowVoicePrep(true)}
                className="relative w-40 h-40 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center shadow-inner hover:from-blue-200 hover:to-blue-300 transition focus:outline-none focus:ring-4 focus:ring-blue-300"
                aria-haspopup="dialog"
                aria-controls="voice-prep-modal"
              >
                <Mic className="w-16 h-16 text-blue-700" />
              </button>
              <p className="text-gray-600 font-medium">Tap to Speak</p>
            </div>
        </div>
      )}

      {screen === 'complaintCategories' && (
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <button onClick={() => setScreen('home')} className="p-2 rounded-md hover:bg-gray-100"><ArrowLeft className="w-5 h-5" /></button>
            <h2 className="text-xl font-semibold">Select Complaint Category</h2>
          </div>
          <p className="text-sm text-gray-500">Choose a category and optional sub category to classify your complaint.</p>
          <div className="space-y-3">
            {COMPLAINT_CATEGORIES.map((cat, i) => {
              const topKey = `top-${i}`;
              return (
                <div key={topKey} className="bg-white border rounded-lg overflow-hidden">
                  <button onClick={() => toggleExpand(topKey)} className="w-full flex items-center justify-between px-4 py-3 text-left font-medium">
                    <span>{cat.name}</span>
                    {expanded[topKey] ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </button>
                  {expanded[topKey] && (
                    <div className="border-t divide-y">
                      {cat.children.map((sub, si) => {
                        const subKey = `${topKey}-${si}`;
                        const isSelected = complaintPath[0] === sub.name;
                        return (
                          <div key={subKey} className="p-3">
                            <div className="flex items-center justify-between">
                              <button
                                onClick={() => selectComplaint(0, sub.name)}
                                className={`text-sm font-semibold mb-2 ${isSelected ? 'text-blue-600' : 'text-gray-700'}`}
                              >{sub.name}</button>
                              {sub.children && (
                                <button onClick={() => toggleExpand(subKey)} className="p-1 rounded hover:bg-gray-100">
                                  {expanded[subKey] ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                </button>
                              )}
                            </div>
                            {sub.children && expanded[subKey] && (
                              <div className="flex flex-wrap gap-2">
                                {sub.children.map((leaf, li) => {
                                  const selected = complaintPath[0] === sub.name && complaintPath[1] === leaf;
                                  return (
                                    <button
                                      key={li}
                                      onClick={() => { selectComplaint(0, sub.name); selectComplaint(1, leaf); }}
                                      className={`px-3 py-1 rounded-full text-xs border ${selected ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-50 hover:bg-gray-100'}`}
                                    >{leaf}</button>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div className="bg-white border rounded-lg p-4 space-y-2">
            <p className="text-xs uppercase tracking-wide font-semibold text-gray-500">Selected Path</p>
            <p className="text-sm font-medium text-gray-700 min-h-5">{complaintPath.length ? complaintPath.join(' > ') : 'None'}</p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setScreen('home')} className="px-4 py-2 rounded-md bg-gray-100 hover:bg-gray-200 text-sm font-medium">Back</button>
            <button onClick={startComplaint} disabled={!complaintPath.length} className="px-4 py-2 rounded-md bg-blue-600 text-white text-sm font-medium disabled:opacity-40">Start Complaint</button>
          </div>
        </div>
      )}

      {screen === 'voice' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button onClick={() => { if (complaintMode) { setScreen('complaintCategories'); stopListening(); } else { setScreen('home'); stopListening(); } }} className="p-2 rounded-md hover:bg-gray-100"><ArrowLeft className="w-5 h-5" /></button>
              <h2 className="text-xl font-semibold">Voice Input</h2>
            </div>
            <div className="flex items-center gap-2">
              <Globe2 className="w-4 h-4 text-gray-500" />
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="text-sm border rounded-md px-2 py-1 bg-white"
              >
                {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.name}</option>)}
              </select>
            </div>
          </div>

          {/* Waveform */}
          <div className="h-24 flex items-end justify-center gap-1 bg-white rounded-xl p-4 border overflow-hidden">
            {[...Array(40)].map((_, i) => (
              <span
                key={i}
                className={`w-1 rounded-full bg-blue-400 inline-block ${isListening ? 'animate-pulse' : ''}`}
                style={{
                  height: `${Math.random() * (isListening ? 80 : 30) + 10}px`,
                  animationDelay: `${i * 40}ms`,
                }}
              />
            ))}
          </div>

          {/* Mic Control */}
          <div className="flex justify-center">
            <button
              onClick={toggleVoice}
              className={`w-28 h-28 rounded-full flex items-center justify-center shadow-md transition ${isListening ? 'bg-red-100 hover:bg-red-200' : 'bg-blue-100 hover:bg-blue-200'}`}
            >
              <Mic className={`w-12 h-12 ${isListening ? 'text-red-600' : 'text-blue-700'}`} />
            </button>
          </div>

          {/* Audio Recorder (temporary, in-memory) */}
          <div className="bg-white p-4 rounded-xl border space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-500">Optional Voice Attachment</p>
              {audioUrl && (
                <span className="text-xs text-gray-400">{audioDuration ? audioDuration.toFixed(1) + 's' : ''}</span>
              )}
            </div>
            <div className="flex flex-wrap gap-3 items-center">
              {!isRecording && (
                <button onClick={startRecordingAudio} className="px-3 py-2 text-sm rounded-md bg-emerald-600 text-white font-medium hover:bg-emerald-700">Record Audio</button>
              )}
              {isRecording && (
                <button onClick={stopRecordingAudio} className="px-3 py-2 text-sm rounded-md bg-red-600 text-white font-medium animate-pulse">Stop Recording</button>
              )}
              {audioUrl && !isRecording && (
                <>
                  <audio controls src={audioUrl} className="h-10" />
                  <button onClick={resetAudio} className="text-xs px-2 py-1 rounded bg-gray-100 hover:bg-gray-200 text-gray-700">Remove</button>
                </>
              )}
              {!audioUrl && !isRecording && (
                <p className="text-xs text-gray-500">No audio recorded yet.</p>
              )}
              <p className="w-full text-[11px] text-gray-400">Audio kept only in memory until you submit or reload the page.</p>
            </div>
          </div>

          {/* Transcript / Manual Edit */}
          <div className="bg-white p-4 rounded-xl border space-y-3">
            <p className="text-sm font-medium text-gray-500">Detected Text</p>
            {!manualEdit && (
              <p className="text-lg font-semibold text-gray-800 min-h-8">
                {transcript || 'Listening...'}
              </p>
            )}
            {manualEdit && (
              <textarea
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                rows={3}
                className="w-full border rounded-md p-2 text-sm"
              />
            )}
            <div className="flex gap-3 flex-wrap pt-2">
              <button
                onClick={confirmReport}
                disabled={!transcript}
                className="inline-flex items-center gap-1 bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-md disabled:opacity-40"
              >
                <Check className="w-4 h-4" /> Confirm
              </button>
              <button
                onClick={retry}
                className="inline-flex items-center gap-1 bg-gray-100 text-gray-800 text-sm font-medium px-4 py-2 rounded-md hover:bg-gray-200"
              >
                <RefreshCw className="w-4 h-4" /> Retry
              </button>
              <button
                onClick={() => setManualEdit(v => !v)}
                className="inline-flex items-center gap-1 bg-white border text-gray-700 text-sm font-medium px-4 py-2 rounded-md hover:bg-gray-50"
              >
                <Edit3 className="w-4 h-4" /> {manualEdit ? 'Done' : 'Edit manually'}
              </button>
              <button
                onClick={() => { stopListening(); setScreen('home'); setComplaintMode(false); setComplaintPath([]); }}
                className="ml-auto text-sm text-gray-500 hover:text-gray-700"
              >Cancel</button>
            </div>
          </div>

          {/* Selected service indicator & tip */}
          <div className="text-xs text-gray-500 flex flex-wrap items-center gap-2">
            {serviceSelected ? (
              <span>Reporting category: <span className="font-medium text-gray-700">{SERVICES.find(s=>s.key===serviceSelected)?.label}</span></span>
            ) : <span>No category chosen. (Optional) select one on home.</span>}
            {complaintMode && complaintPath.length > 0 && (
              <span className="w-full">Complaint Path: <span className="font-medium text-gray-700">{complaintPath.join(' > ')}</span></span>
            )}
          </div>
          {complaintMode && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
              <p className="text-sm font-semibold text-blue-800">Need immediate help?</p>
              <p className="text-sm text-blue-700">Call our helpline: <a href="tel:1800123456" className="font-bold underline">1800-123-456</a></p>
              <p className="text-xs text-blue-600">Provide your selected category path for faster assistance.</p>
            </div>
          )}
        </div>
      )}
      {/* Voice Preparation Modal */}
      {showVoicePrep && (
        <div
          id="voice-prep-modal"
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowVoicePrep(false)} />
          <div className="relative bg-white w-full max-w-md rounded-xl shadow-lg border p-6 space-y-5 animate-fadeIn">
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2"><Mic className="w-5 h-5 text-blue-600" /> Start Voice Report</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                We'll capture your spoken description and (optionally) a short audio clip to attach to your report. Make sure you're in a quiet environment. You can edit the detected text or remove the audio before submitting.
              </p>
              <ul className="text-xs text-gray-500 list-disc pl-5 space-y-1">
                <li>Grant microphone permission when prompted.</li>
                <li>Recording stays only until you submit or reload.</li>
                <li>Don’t share sensitive personal data aloud.</li>
              </ul>
            </div>
            <div className="flex flex-wrap gap-3 justify-end pt-2">
              <button
                onClick={() => setShowVoicePrep(false)}
                className="px-4 py-2 text-sm font-medium rounded-md bg-gray-100 hover:bg-gray-200 text-gray-700"
              >Cancel</button>
              <button
                onClick={() => { setShowVoicePrep(false); goToVoiceScreen(); }}
                className="px-4 py-2 text-sm font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700"
              >Proceed</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersHome;