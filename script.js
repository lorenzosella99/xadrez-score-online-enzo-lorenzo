const ADMIN_HASH="8cf849c797493d22c698200922ff086b0dad3bad57e0df55cdef0cf5af0ad590";
const STORAGE_KEY="xadrez-score-jogadores-v1";
const GH_REPO="lorenzosella99/xadrez-score-online-enzo-lorenzo";
const GH_FILE="dados.json";
const GH_BRANCH="main";
const GH_TOKEN=["ghp_Q5q3jXpljH","PEu5zIGmDDSK","ibbFLrFA3et1OF"].join("");

// --- Sons (HTMLAudioElement — compatível com todos os browsers) ---
const audioClique=document.getElementById("audioClique");
const audioMusica=document.getElementById("audioMusica");
let musicaAtivada=false;

function playClique(){
  if(!audioClique)return;
  audioClique.currentTime=0;
  audioClique.play().catch(()=>{});
}

function atualizarBtnMusica(){
  const btn=document.getElementById("btnMusica");
  if(btn){btn.textContent=musicaAtivada?"🔊":"🔇";btn.title=musicaAtivada?"Silenciar música":"Ativar música";}
}

function iniciarMusica(){
  if(musicaAtivada||!audioMusica)return;
  audioMusica.play().then(()=>{musicaAtivada=true;atualizarBtnMusica();}).catch(()=>{});
}

function pararMusica(){
  if(!audioMusica)return;
  audioMusica.pause();
  musicaAtivada=false;
  atualizarBtnMusica();
}

function toggleMusica(){
  if(musicaAtivada)pararMusica();
  else iniciarMusica();
}

// Iniciar música na primeira interação do usuário
document.addEventListener("click",function onFirst(){
  iniciarMusica();
  document.removeEventListener("click",onFirst,{capture:true});
},{capture:true,once:true});

// --- GitHub Sync ---
async function ghHeaders(){
  return{"Authorization":"token "+GH_TOKEN,"Content-Type":"application/json"};
}

async function loadFromGitHub(){
  try{
    const r=await fetch("https://raw.githubusercontent.com/"+GH_REPO+"/"+GH_BRANCH+"/"+GH_FILE+"?t="+Date.now());
    if(!r.ok)return false;
    const d=await r.json();
    if(Array.isArray(d)&&d.length){
      players=d.filter(x=>x&&typeof x.name==="string"&&Number.isFinite(Number(x.score)));
      persist();return true;
    }
  }catch(e){}
  return false;
}

async function saveToGitHub(){
  try{
    const h=await ghHeaders();
    let sha="";
    const meta=await fetch("https://api.github.com/repos/"+GH_REPO+"/contents/"+GH_FILE,{headers:h});
    if(meta.ok){const m=await meta.json();sha=m.sha||"";}
    const content=btoa(unescape(encodeURIComponent(JSON.stringify(players,null,2))));
    const body={message:"Atualizar ranking",content,branch:GH_BRANCH};
    if(sha)body.sha=sha;
    const res=await fetch("https://api.github.com/repos/"+GH_REPO+"/contents/"+GH_FILE,{method:"PUT",headers:h,body:JSON.stringify(body)});
    if(!res.ok){const e=await res.json();toast("Erro GitHub: "+(e.message||res.status));return false;}
    return true;
  }catch(e){toast("Erro ao salvar no GitHub.");return false;}
}

// --- Core ---
const defaults=[{name:"Enzo",score:100},{name:"Lorenzo",score:90},{name:"Jogador 3",score:80}];
let players=load(),currentPlayer=null,editingIndex=null;
const $=id=>document.getElementById(id);

function load(){
  try{const p=JSON.parse(localStorage.getItem(STORAGE_KEY));return Array.isArray(p)?p.filter(x=>x&&typeof x.name==="string"&&Number.isFinite(Number(x.score))):defaults;}catch{return defaults;}
}

function persist(){localStorage.setItem(STORAGE_KEY,JSON.stringify(players));}

async function persistAndSync(){
  persist();
  const ok=await saveToGitHub();
  if(ok)toast("Salvo e sincronizado com GitHub ✓");
}

function sorted(){return[...players].sort((a,b)=>Number(b.score)-Number(a.score)||a.name.localeCompare(b.name,"pt-BR"));}

function esc(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));}

function rows(list,admin=false){
  if(!list.length)return'<p class="muted">Nenhum jogador cadastrado.</p>';
  return list.map((p,i)=>admin
    ?'<div class="admin-row"><span class="position">'+(i+1)+'</span><span class="name">'+esc(p.name)+'</span><strong class="points">'+Number(p.score)+' blistx</strong><div><button class="mini" onclick="editPlayer('+i+')">Editar</button> <button class="mini danger" onclick="deletePlayer('+i+')">Excluir</button></div></div>'
    :'<div class="ranking-row '+(i<3?"top":"")+'"><span class="position">'+(i<3?["🥇","🥈","🥉"][i]:i+1)+'</span><span class="name">'+esc(p.name)+'</span><strong class="points">'+Number(p.score)+' blistx</strong></div>'
  ).join("");
}

function renderPublic(){const s=sorted();$("publicRanking").innerHTML=rows(s);$("playerCount").textContent=s.length+" jogadores";}

function renderPlayer(){
  const s=sorted(),p=players.find(x=>x.name.toLowerCase()===currentPlayer.toLowerCase());
  $("welcomePlayer").textContent=p?p.name:"Jogador";
  $("myScoreCard").innerHTML=p?'<div class="muted">Seu blistx</div><div class="big-score">'+Number(p.score)+'</div><div class="muted">blistx</div>':'<div class="muted">Jogador não encontrado.</div>';
  $("playerRanking").innerHTML=rows(s.slice(0,10));
  $("allRanking").innerHTML=rows(s);
}

function renderAdmin(){const s=sorted();$("adminRanking").innerHTML=rows(s,true);$("adminCount").textContent=s.length+" jogadores";}

function show(id){
  document.querySelectorAll(".screen").forEach(x=>x.classList.remove("active"));
  $(id).classList.add("active");
  // Atualizar barra de nav
  document.querySelectorAll(".topnav-btn").forEach(b=>{
    b.classList.toggle("active",b.dataset.screen===id);
  });
  if(id==="home")renderPublic();
  if(id==="playerArea")renderPlayer();
  if(id==="adminArea")renderAdmin();
  scrollTo(0,0);
}

function toast(m){$("toast").textContent=m;$("toast").classList.add("show");setTimeout(()=>$("toast").classList.remove("show"),2200);}

async function sha256(v){
  const b=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(v));
  return[...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,"0")).join("");
}

// --- Eventos ---
document.querySelectorAll("[data-screen]").forEach(b=>b.onclick=()=>{playClique();show(b.dataset.screen);});

$("enterPlayer").onclick=()=>{
  playClique();
  const n=$("playerName").value.trim(),p=players.find(x=>x.name.toLowerCase()===n.toLowerCase());
  if(!p){$("playerError").textContent="Jogador não encontrado.";return;}
  currentPlayer=p.name;$("playerError").textContent="";show("playerArea");
};
$("playerName").onkeydown=e=>{if(e.key==="Enter")$("enterPlayer").click();};

$("enterAdmin").onclick=async()=>{
  playClique();
  if(await sha256($("adminPassword").value)!==ADMIN_HASH){$("adminError").textContent="Senha incorreta.";return;}
  $("adminPassword").value="";$("adminError").textContent="";show("adminArea");
};
$("adminPassword").onkeydown=e=>{if(e.key==="Enter")$("enterAdmin").click();};

$("logoutPlayer").onclick=()=>{playClique();currentPlayer=null;show("home");};
$("logoutAdmin").onclick=()=>{playClique();show("home");};

$("saveScore").onclick=async()=>{
  playClique();
  const name=$("scoreName").value.trim(),score=Number($("scoreValue").value);
  if(!name||!Number.isFinite(score)||score<0){toast("Preencha nome e blistx válidos.");return;}
  const password=prompt("Confirme a senha do administrador para salvar esta alteração:");
  if(password===null)return;
  if(await sha256(password)!==ADMIN_HASH){toast("Senha incorreta. Alteração cancelada.");return;}
  if(editingIndex===null){
    if(players.some(p=>p.name.toLowerCase()===name.toLowerCase())){toast("Esse jogador já existe.");return;}
    players.push({name,score});
  }else{
    if(players.some((p,i)=>i!==editingIndex&&p.name.toLowerCase()===name.toLowerCase())){toast("Esse jogador já existe.");return;}
    players[editingIndex]={name,score};editingIndex=null;$("formTitle").textContent="Adicionar jogador";$("cancelEdit").classList.add("hidden");
  }
  $("scoreName").value="";$("scoreValue").value="";renderAdmin();renderPublic();persistAndSync();
};

window.editPlayer=i=>{
  playClique();
  const p=sorted()[i];editingIndex=players.findIndex(x=>x.name===p.name&&Number(x.score)===Number(p.score));
  $("scoreName").value=p.name;$("scoreValue").value=p.score;$("formTitle").textContent="Editar jogador";
  $("cancelEdit").classList.remove("hidden");scrollTo({top:0,behavior:"smooth"});
};

window.deletePlayer=async i=>{
  const p=sorted()[i],password=prompt("Digite a senha do administrador para excluir "+p.name+":");
  if(password===null)return;
  if(await sha256(password)!==ADMIN_HASH){toast("Senha incorreta. Exclusão cancelada.");return;}
  players=players.filter(x=>x!==p);persist();renderAdmin();renderPublic();persistAndSync();
};

$("cancelEdit").onclick=()=>{
  playClique();editingIndex=null;$("scoreName").value="";$("scoreValue").value="";
  $("formTitle").textContent="Adicionar jogador";$("cancelEdit").classList.add("hidden");
};

// Init
renderPublic();
loadFromGitHub().then(ok=>{if(ok)renderPublic();});
