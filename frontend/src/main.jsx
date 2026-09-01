import React, {useEffect,useState} from "react";
import {createRoot} from "react-dom/client";
import {MapContainer,TileLayer,Marker,Popup} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./style.css";
import IssueMap from "./components/IssueMap";
import { auth } from "./firebase";
import { RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";

const API = "https://sih-civic-ai-backend.onrender.com/api";
const markerIcon = new L.Icon({iconUrl:"https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",iconRetinaUrl:"https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",shadowUrl:"https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",iconSize:[25,41],iconAnchor:[12,41]});

function App(){
 const [user,setUser]=useState(JSON.parse(localStorage.getItem("cc_user")||"null"));
 const [mode,setMode]=useState("citizen");
 const [phone,setPhone]=useState(""); const [code,setCode]=useState(""); const [otpSent,setOtpSent]=useState(false);
 const [reports,setReports]=useState([]); const [publicReports,setPublicReports]=useState([]);
 const [tab,setTab]=useState("report"); const [message,setMessage]=useState("");
 const [notifications,setNotifications]=useState([]);
 const [authLoading,setAuthLoading]=useState(false);

 async function authRequest(){
   const cleanPhone=phone.trim();
   if(!cleanPhone){setMessage("Please enter a mobile number.");return;}
   setAuthLoading(true); setMessage("");
   try{
     const r=await fetch(API+"/auth/request-otp",{
       method:"POST",
       headers:{"Content-Type":"application/json"},
       body:JSON.stringify({phone:cleanPhone,role:mode})
     });
     const d=await r.json().catch(()=>({}));
     if(!r.ok){setMessage(d.detail||`Server error (${r.status})`);setOtpSent(false);return;}
     setOtpSent(true);
     setMessage("OTP sent by SMS");
   }catch(e){
     setMessage("Cannot connect to backend. Make sure FastAPI is running on https://sih-civic-ai-backend.onrender.com.");
     setOtpSent(false);
   }finally{setAuthLoading(false);}
 }
 async function authVerify(){
   const cleanPhone=phone.trim();
   const cleanCode=code.trim();
   if(!cleanCode){setMessage("Please enter the OTP.");return;}
   setAuthLoading(true);
   try{
     const r=await fetch(API+"/auth/verify",{
       method:"POST",
       headers:{"Content-Type":"application/json"},
       body:JSON.stringify({phone:cleanPhone,code:cleanCode,name:"Civic User"})
     });
     const d=await r.json().catch(()=>({}));
     if(!r.ok){setMessage(d.detail||`Verification failed (${r.status})`);return;}
     const u=d.user;
     localStorage.setItem("cc_user",JSON.stringify(u));setUser(u);setMessage("Signed in");
   }catch(e){
     setMessage("Cannot connect to backend. Make sure FastAPI is running on https://sih-civic-ai-backend.onrender.com.");
   }finally{setAuthLoading(false);}
 }
 async function load(){if(!user)return;let a=await fetch(API+(user.role==="citizen"?`/reports/mine?citizen_id=${user.id}`:`/reports/authority?role=${encodeURIComponent(user.role)}&department=${encodeURIComponent(user.department||"")}`));setReports(await a.json());let p=await fetch(API+"/reports/public");setPublicReports(await p.json());if(user.role==="citizen"){let n=await fetch(API+`/notifications?user_id=${user.id}`);setNotifications(await n.json());}}
 useEffect(()=>{load()},[user,tab]);

 if(!user) return <Auth mode={mode} setMode={setMode} phone={phone} setPhone={setPhone} code={code} setCode={setCode} otpSent={otpSent} request={authRequest} verify={authVerify} message={message} loading={authLoading}/>;
 return <div className="app"><header><div><b>🏙️ CivicConnect AI</b><span className="live">● 24/7 Civic Service</span></div><div>{user.name} · {user.role}<button onClick={()=>{localStorage.clear();setUser(null)}}>Logout</button></div></header>
   <nav>{user.role==="citizen"?<><button onClick={()=>setTab("report")}>Report Issue</button><button onClick={()=>setTab("mine")}>My Reports</button><button onClick={()=>setTab("map")}>Nearby Map</button><button onClick={()=>setTab("notifications")}>🔔 Updates {notifications.length?`(${notifications.length})`:""}</button></>:<><button onClick={()=>setTab("queue")}>Authority Queue</button><button onClick={()=>setTab("map")}>Public Map</button></>}</nav>
   {tab === "report" && user.role === "Citizen" && (
  <div className="card ai-card">
    <div className="ai-header">
      <div>
        <div className="ai-title">🤖 AI-Assisted Complaint Analysis</div>
        <div className="ai-subtitle">
          CivicConnect AI automatically analyzes your complaint to improve
          prioritization and routing.
        </div>
      </div>
      <span className="ai-status">● AI READY</span>
    </div>

    <div className="ai-grid">
      <div className="ai-feature">
        <span>🧠</span>
        <div>
          <b>Issue Classification</b>
          <small>Identifies the type of civic problem</small>
        </div>
      </div>

      <div className="ai-feature">
        <span>🚨</span>
        <div>
          <b>Priority Detection</b>
          <small>Helps identify urgent complaints</small>
        </div>
      </div>

      <div className="ai-feature">
        <span>🏢</span>
        <div>
          <b>Authority Routing</b>
          <small>Helps route complaints to the right department</small>
        </div>
      </div>

      <div className="ai-feature">
        <span>📍</span>
        <div>
          <b>Location Intelligence</b>
          <small>Uses complaint location for better response</small>
        </div>
      </div>
    </div>
  </div>
)}
   {tab==="report"&&user.role==="citizen"&&<ReportForm user={user} onDone={()=>{setTab("mine");load()}}/>}
   {tab==="mine"&&<Reports reports={reports} citizen/>}
   {tab==="queue"&&<AuthorityQueue reports={reports} user={user} reload={load}/>}
   {tab==="map"&&<MapView reports={publicReports}/>}
   {tab==="notifications"&&<Notifications items={notifications}/>}
 </div>
}

function Auth(p){return <div className="auth"><div className="card authcard"><h1>🏙️ CivicConnect AI</h1><p>Report civic problems. Track resolution. Keep your city accountable.</p><div className="switch"><button className={p.mode==="citizen"?"sel":""} onClick={()=>{p.setMode("citizen");p.setCode("");p.setPhone("");}}>Citizen</button><button className={p.mode==="authority"?"sel":""} onClick={()=>{p.setMode("authority");p.setCode("");p.setPhone("");}}>Authority</button></div><input placeholder="Mobile number (+91...)" value={p.phone} onChange={e=>p.setPhone(e.target.value)} disabled={p.loading}/>{p.otpSent&&<input placeholder="OTP" inputMode="numeric" maxLength="6" value={p.code} onChange={e=>p.setCode(e.target.value)} disabled={p.loading}/>} {!p.otpSent?<button className="primary" onClick={p.request} disabled={p.loading}>{p.loading?"Sending...":"Send OTP"}</button>:<button className="primary" onClick={p.verify} disabled={p.loading}>{p.loading?"Verifying...":"Verify & Continue"}</button>}<small>{p.message}</small><p className="devnote">Use real SMS delivery in production. Configure Twilio or your preferred OTP provider.</p>{p.mode==="authority"&&<p className="hint"></p>}</div></div>}

function ReportForm({user,onDone}){const [f,setF]=useState({title:"",description:"",category:"Auto",latitude:"",longitude:"",media:null});const [msg,setMsg]=useState("");
 function locate(){navigator.geolocation.getCurrentPosition(x=>setF({...f,latitude:x.coords.latitude,longitude:x.coords.longitude}),()=>setMsg("Location permission denied."))}
 async function submit(e){e.preventDefault();let media_url="";if(f.media){let fd=new FormData();fd.append("file",f.media);let u=await fetch(API+"/upload",{method:"POST",body:fd});media_url=(await u.json()).url}let r=await fetch(API+`/reports?citizen_id=${user.id}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...f,media:undefined,media_url})});let d=await r.json();setMsg(r.ok?`Submitted #${d.report.id}. AI: ${d.ai.category}, ${d.ai.priority}. ${d.duplicate.report_id?`Possible duplicate of #${d.duplicate.report_id}.`:""}`:d.detail||"Submission failed");if(r.ok)setTimeout(onDone,1200)}
 return <form className="card form" onSubmit={submit}><h2>Report a Civic Issue</h2><label>Title<input required value={f.title} onChange={e=>setF({...f,title:e.target.value})}/></label><label>Description<textarea required rows="5" value={f.description} onChange={e=>setF({...f,description:e.target.value})}/></label><label>Category<select value={f.category} onChange={e=>setF({...f,category:e.target.value})}><option>Auto</option><option>Road & Potholes</option><option>Streetlight</option><option>Garbage & Sanitation</option><option>Water Supply</option><option>Public Safety</option><option>Parks & Public Spaces</option></select></label><div className="grid2"><label>Photo / Video<input type="file" accept="image/*,video/*" onChange={e=>setF({...f,media:e.target.files[0]})}/></label><div><button type="button" onClick={locate}>📍 Use my current location</button><p className="coords">{f.latitude?`${f.latitude.toFixed?.(5)||f.latitude}, ${f.longitude.toFixed?.(5)||f.longitude}`:"Location not captured yet"}</p></div></div><button className="primary">Submit Report</button><p>{msg}</p></form>}

function Notifications({items}){return <section><h2>Notifications</h2>{items.length===0?<div className="empty">No updates yet.</div>:items.map((n,i)=><div className="card" key={i}><b>Report #{n.report_id} · {n.status}</b><p>{n.message}</p><small>{new Date(n.created_at).toLocaleString()}</small></div>)}</section>}
function Reports({reports}){return <section><h2>Report History</h2>{reports.length===0?<div className="empty">No reports yet.</div>:reports.map(r=><div className="card report" key={r.id}><div className="row"><h3>#{r.id} · {r.title}</h3><span className={`badge ${r.priority.toLowerCase()}`}>{r.priority}</span></div><p>{r.description}</p><div className="meta">{r.category} · {r.authority} · {r.status}</div><Timeline id={r.id}/></div>)}</section>}
function Timeline({id}){const [t,setT]=useState([]);useEffect(()=>{fetch(API+`/reports/${id}/timeline`).then(r=>r.json()).then(setT)},[id]);return <div className="timeline">{t.map((x,i)=><div key={i}><b>{x.status}</b><small>{new Date(x.created_at).toLocaleString()}</small>{x.note&&<span>{x.note}</span>}</div>)}</div>}
function AuthorityQueue({reports,user,reload}){return <section><h2>Authority Queue</h2>{reports.length===0?<div className="empty">Queue is clear.</div>:reports.map(r=><div className="card report" key={r.id}><div className="row"><h3>#{r.id} · {r.title}</h3><span className={`badge ${r.priority.toLowerCase()}`}>{r.priority}</span></div><p>{r.description}</p><div className="meta">{r.category} · suggested authority: {r.authority}</div><div className="actions"><select defaultValue={r.status} onChange={async e=>{await fetch(API+`/reports/${r.id}?actor_id=${user.id}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({status:e.target.value})});reload()}}><option>Received</option><option>Assigned</option><option>In Progress</option><option>Resolved</option></select><input placeholder="Resolution / update note" id={`n${r.id}`}/><button onClick={async()=>{let n=document.getElementById(`n${r.id}`).value;await fetch(API+`/reports/${r.id}?actor_id=${user.id}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({resolution_notes:n,status:"In Progress"})});reload()}}>Update</button></div></div>)}</section>}
function MapView({reports}){let points=reports.filter(r=>r.latitude&&r.longitude);let center=points.length?[points[0].latitude,points[0].longitude]:[17.385,78.4867];return <section><h2>Nearby Civic Issues</h2><div className="card map"><MapContainer center={center} zoom={12} style={{height:"560px",width:"100%"}}><TileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"/>{points.map(r=><Marker key={r.id} position={[r.latitude,r.longitude]} icon={markerIcon}><Popup><b>#{r.id} {r.title}</b><br/>{r.category}<br/>Priority: {r.priority}<br/>Status: {r.status}</Popup></Marker>)}</MapContainer></div></section>}
createRoot(document.getElementById("root")).render(<App/>);
