// ============================================================
// CONFIG
// ============================================================
const ADMIN_HASH = "8cf849c797493d22c698200922ff086b0dad3bad57e0df55cdef0cf5af0ad590";
const STORAGE_KEY = "xadrez-score-jogadores-v1";
const GAME_STORAGE_KEY = "xadrez-game-v1";
const GH_REPO = "lorenzosella99/xadrez-score-online-enzo-lorenzo";
const GH_BRANCH = "main";
const GH_FILE_RANK = "dados.json";
const GH_FILE_GAME = "partida.json";
const GH_FILE_CONFIG = "config.json";
const GH_TOKEN = ["ghp_Q5q3jXpljH","PEu5zIGmDDSK","ibbFLrFA3et1OF"].join("");

// ============================================================
// CLASSIFICAÇÕES
// ============================================================
const RANKS = [
  {min:0,    max:29,  label:"Novato",        emoji:"🌱"},
  {min:30,   max:79,  label:"Iniciante",     emoji:"⚔️"},
  {min:80,   max:149, label:"Amador",        emoji:"🎯"},
  {min:150,  max:249, label:"Experiente",    emoji:"🏅"},
  {min:250,  max:399, label:"Mestre",        emoji:"🏆"},
  {min:400,  max:Infinity, label:"Grão-Mestre", emoji:"👑"},
];
function getRank(score){
  return RANKS.find(r=>score>=r.min&&score<=r.max)||RANKS[0];
}

// ============================================================
// ÁUDIO
// ============================================================
const audioClique = document.getElementById("audioClique");
const audioMusica = document.getElementById("audioMusica");
let musicaAtivada = false;

function playClique(){
  if(!audioClique)return;
  audioClique.currentTime=0;
  audioClique.play().catch(()=>{});
}
function atualizarBtnMusica(){
  const btn=document.getElementById("btnMusica");
  if(btn){btn.textContent=musicaAtivada?"🔊":"🔇";btn.title=musicaAtivada?"Silenciar":"Ativar música";}
}
function iniciarMusica(){
  if(musicaAtivada||!audioMusica)return;
  audioMusica.play().then(()=>{musicaAtivada=true;atualizarBtnMusica();}).catch(()=>{});
}
function pararMusica(){
  if(!audioMusica)return;
  audioMusica.pause();musicaAtivada=false;atualizarBtnMusica();
}
function toggleMusica(){musicaAtivada?pararMusica():iniciarMusica();}
document.addEventListener("click",function onFirst(){
  iniciarMusica();
  document.removeEventListener("click",onFirst,{capture:true});
},{capture:true,once:true});

// ============================================================
// GITHUB API
// ============================================================
async function ghHeaders(){
  return{"Authorization":"token "+GH_TOKEN,"Content-Type":"application/json"};
}
async function ghGet(file){
  try{
    const r=await fetch(`https://raw.githubusercontent.com/${GH_REPO}/${GH_BRANCH}/${file}?t=${Date.now()}`);
    return r.ok?r.text():null;
  }catch{return null;}
}
async function ghPut(file,content,message){
  try{
    const h=await ghHeaders();
    let sha="";
    const meta=await fetch(`https://api.github.com/repos/${GH_REPO}/contents/${file}`,{headers:h});
    if(meta.ok){const m=await meta.json();sha=m.sha||"";}
    const body={message,content:btoa(unescape(encodeURIComponent(content))),branch:GH_BRANCH};
    if(sha)body.sha=sha;
    const res=await fetch(`https://api.github.com/repos/${GH_REPO}/contents/${file}`,{method:"PUT",headers:h,body:JSON.stringify(body)});
    return res.ok;
  }catch{return false;}
}

// ============================================================
// CONFIG (2FA e outros)
// ============================================================
let appConfig = {twoFA:{question:"",answer:""},antifarm:{alertas:[]}};

async function loadConfig(){
  const raw=await ghGet(GH_FILE_CONFIG);
  if(raw){try{appConfig=JSON.parse(raw);}catch{}}
  appConfig.twoFA=appConfig.twoFA||{question:"",answer:""};
  appConfig.antifarm=appConfig.antifarm||{alertas:[]};
}
async function saveConfig(){
  await ghPut(GH_FILE_CONFIG,JSON.stringify(appConfig,null,2),"Atualizar config");
}

// ============================================================
// RANKING / JOGADORES
// ============================================================
/*
  Estrutura de cada jogador:
  { name, score, historico:[{adversario, resultado, data, movimentos}], suspeitoFarm:false }
*/
const defaults=[
  {name:"Enzo",score:55,historico:[],suspeitoFarm:false},
  {name:"Lorenzo",score:20,historico:[],suspeitoFarm:false}
];
let players=loadLocal(), currentPlayer=null, editingIndex=null;
const $=id=>document.getElementById(id);

function loadLocal(){
  try{
    const p=JSON.parse(localStorage.getItem(STORAGE_KEY));
    return Array.isArray(p)?p.filter(x=>x&&typeof x.name==="string"&&Number.isFinite(Number(x.score))):defaults;
  }catch{return defaults;}
}
function persist(){localStorage.setItem(STORAGE_KEY,JSON.stringify(players));}
async function persistAndSync(){
  persist();
  const ok=await ghPut(GH_FILE_RANK,JSON.stringify(players,null,2),"Atualizar ranking");
  toast(ok?"Salvo e sincronizado ✓":"Salvo localmente (GitHub indisponível)");
}
function sorted(){return[...players].sort((a,b)=>Number(b.score)-Number(a.score)||a.name.localeCompare(b.name,"pt-BR"));}
function esc(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));}

function rankBadge(score){
  const r=getRank(score);
  return`<span class="rank-badge" title="${r.label}">${r.emoji} ${r.label}</span>`;
}

function rows(list,admin=false){
  if(!list.length)return'<p class="muted">Nenhum jogador cadastrado.</p>';
  return list.map((p,i)=>{
    const r=getRank(Number(p.score));
    const farmIcon=p.suspeitoFarm?'<span class="farm-alert" title="Suspeita de farm">⚠️</span>':'';
    if(admin){
      return`<div class="admin-row"><span class="position">${i+1}</span>
        <span class="name">${esc(p.name)}${farmIcon} <span class="rank-inline">${r.emoji}</span></span>
        <strong class="points">${Number(p.score)} blistx</strong>
        <div><button class="mini" onclick="editPlayer(${i})">Editar</button> <button class="mini danger" onclick="deletePlayer(${i})">Excluir</button></div></div>`;
    }
    return`<div class="ranking-row ${i<3?"top":""}" onclick="showPlayerProfileById('${esc(p.name)}')" style="cursor:pointer">
      <span class="position">${i<3?["🥇","🥈","🥉"][i]:i+1}</span>
      <span class="name">${esc(p.name)} ${rankBadge(Number(p.score))}${farmIcon}</span>
      <strong class="points">${Number(p.score)} blistx</strong>
    </div>`;
  }).join("");
}

function renderPublic(){const s=sorted();$("publicRanking").innerHTML=rows(s);$("playerCount").textContent=s.length+" jogadores";}
function renderPlayer(){
  const s=sorted(),p=players.find(x=>x.name.toLowerCase()===currentPlayer.toLowerCase());
  $("welcomePlayer").textContent=p?p.name:"Jogador";
  const r=p?getRank(Number(p.score)):RANKS[0];
  $("myScoreCard").innerHTML=p
    ?`<div class="muted">Seu blistx</div><div class="big-score">${Number(p.score)}</div>
       <div class="rank-display">${r.emoji} ${r.label}</div>
       <div class="muted">blistx</div>`
    :'<div class="muted">Jogador não encontrado.</div>';
  $("playerRanking").innerHTML=rows(s.slice(0,10));
  $("allRanking").innerHTML=rows(s);
  renderHistorico(p);
}
function renderAdmin(){const s=sorted();$("adminRanking").innerHTML=rows(s,true);$("adminCount").textContent=s.length+" jogadores";renderAlertas();}

function renderHistorico(p){
  const el=$("playerHistorico");if(!el)return;
  if(!p||!p.historico||!p.historico.length){
    el.innerHTML='<p class="muted" style="padding:8px 0">Nenhuma partida registrada ainda.</p>';return;
  }
  const list=[...p.historico].reverse().slice(0,20);
  el.innerHTML=list.map(h=>{
    const cor=h.resultado==="vitória"?"hist-win":h.resultado==="derrota"?"hist-loss":"hist-draw";
    return`<div class="hist-row ${cor}">
      <span class="hist-res">${h.resultado==="vitória"?"✓":h.resultado==="derrota"?"✗":"="}</span>
      <span class="hist-adv">vs <strong>${esc(h.adversario||"Desconhecido")}</strong></span>
      <span class="hist-date">${h.data||""}</span>
      <span class="hist-moves">${h.movimentos||0} lances</span>
    </div>`;
  }).join("");
}

// ============================================================
// ANTI-FARM IA
// ============================================================
function analisarFarm(playerName){
  const p=players.find(x=>x.name.toLowerCase()===playerName.toLowerCase());
  if(!p||!p.historico||p.historico.length<5)return;
  const recentes=p.historico.slice(-20);
  // Conta vitórias por adversário
  const stats={};
  recentes.forEach(h=>{
    if(!h.adversario)return;
    const adv=h.adversario.toLowerCase();
    if(!stats[adv])stats[adv]={v:0,d:0,e:0};
    if(h.resultado==="vitória")stats[adv].v++;
    else if(h.resultado==="derrota")stats[adv].d++;
    else stats[adv].e++;
  });
  let suspeito=false;
  const motivos=[];
  for(const[adv,s]of Object.entries(stats)){
    const total=s.v+s.d+s.e;
    if(total>=5&&s.v/total>=0.85){
      suspeito=true;
      motivos.push(`Ganhou ${s.v}/${total} partidas contra ${adv}`);
    }
  }
  // Vitórias consecutivas excessivas
  let consec=0,maxConsec=0;
  recentes.forEach(h=>{
    if(h.resultado==="vitória"){consec++;maxConsec=Math.max(maxConsec,consec);}else consec=0;
  });
  if(maxConsec>=8){suspeito=true;motivos.push(`${maxConsec} vitórias consecutivas`);}
  p.suspeitoFarm=suspeito;
  if(suspeito){
    const alerta={jogador:p.name,motivos,data:new Date().toLocaleDateString("pt-BR")};
    appConfig.antifarm=appConfig.antifarm||{alertas:[]};
    // Evita duplicar alerta do mesmo dia
    const jaExiste=appConfig.antifarm.alertas.find(a=>a.jogador===p.name&&a.data===alerta.data);
    if(!jaExiste){appConfig.antifarm.alertas.push(alerta);saveConfig();}
  }
}

function renderAlertas(){
  const el=$("adminAlertas");if(!el)return;
  const alertas=(appConfig.antifarm&&appConfig.antifarm.alertas)||[];
  if(!alertas.length){el.innerHTML='<p class="muted">Nenhuma suspeita detectada.</p>';return;}
  el.innerHTML=[...alertas].reverse().slice(0,10).map(a=>
    `<div class="alerta-row"><span class="alerta-icon">⚠️</span>
     <div><strong>${esc(a.jogador)}</strong> — ${esc(a.motivos.join("; "))}<br><small>${a.data}</small></div>
     <button class="mini" onclick="dismissAlerta('${esc(a.jogador)}','${esc(a.data)}')">OK</button></div>`
  ).join("");
}
window.dismissAlerta=(nome,data)=>{
  appConfig.antifarm.alertas=appConfig.antifarm.alertas.filter(a=>!(a.jogador===nome&&a.data===data));
  const p=players.find(x=>x.name===nome);
  if(p&&!appConfig.antifarm.alertas.find(a=>a.jogador===nome))p.suspeitoFarm=false;
  saveConfig();persist();renderAlertas();renderAdmin();
};

// ============================================================
// 2FA
// ============================================================
let pendingAction=null; // {fn, label}

function verificar2FA(label,fn){
  const q=appConfig.twoFA&&appConfig.twoFA.question;
  if(!q){fn();return;}
  pending2FAAction={label,fn};
  $("twofa-question").textContent=q;
  $("twofa-answer").value="";
  $("twofa-error").textContent="";
  $("twoFAModal").classList.add("open");
}
let pending2FAAction=null;

$("twoFAConfirm")&&($("twoFAConfirm").onclick=()=>{
  const resp=$("twofa-answer").value.trim().toLowerCase();
  const correta=(appConfig.twoFA.answer||"").trim().toLowerCase();
  if(resp!==correta){$("twofa-error").textContent="Resposta incorreta.";return;}
  $("twoFAModal").classList.remove("open");
  if(pending2FAAction)pending2FAAction.fn();
  pending2FAAction=null;
});
$("twoFACancel")&&($("twoFACancel").onclick=()=>{
  $("twoFAModal").classList.remove("open");
  pending2FAAction=null;
});

// ============================================================
// PERFIL PÚBLICO
// ============================================================
let viewingPlayer=null;

function showPlayerProfileById(name){
  const p=players.find(x=>x.name===name);
  if(!p)return;
  viewingPlayer=p.name;
  const r=getRank(Number(p.score));
  $("profileName").textContent=p.name;
  $("profileRank").textContent=r.emoji+" "+r.label;
  $("profileScore").textContent=Number(p.score)+" blistx";
  $("profileFarm").style.display=p.suspeitoFarm?"block":"none";
  renderProfileHistorico(p);
  show("profileScreen");
}

function renderProfileHistorico(p){
  const el=$("profileHistorico");if(!el)return;
  if(!p.historico||!p.historico.length){
    el.innerHTML='<p class="muted">Nenhuma partida ainda.</p>';return;
  }
  const list=[...p.historico].reverse().slice(0,30);
  const vit=p.historico.filter(h=>h.resultado==="vitória").length;
  const der=p.historico.filter(h=>h.resultado==="derrota").length;
  const emp=p.historico.filter(h=>h.resultado==="empate").length;
  $("profileStats").innerHTML=`<span class="stat-win">✓ ${vit}</span> <span class="stat-draw">= ${emp}</span> <span class="stat-loss">✗ ${der}</span>`;
  el.innerHTML=list.map(h=>{
    const cor=h.resultado==="vitória"?"hist-win":h.resultado==="derrota"?"hist-loss":"hist-draw";
    return`<div class="hist-row ${cor}">
      <span class="hist-res">${h.resultado==="vitória"?"✓":h.resultado==="derrota"?"✗":"="}</span>
      <span class="hist-adv">vs <strong>${esc(h.adversario||"?")}</strong></span>
      <span class="hist-date">${h.data||""}</span>
      <span class="hist-moves">${h.movimentos||0} lances</span>
    </div>`;
  }).join("");
}

// ============================================================
// SHOW / NAVEGAÇÃO
// ============================================================
function show(id){
  document.querySelectorAll(".screen").forEach(x=>x.classList.remove("active"));
  $(id)&&$(id).classList.add("active");
  document.querySelectorAll(".bottom-btn").forEach(b=>{
    b.classList.toggle("active",b.dataset.screen===id);
  });
  if(id==="home")renderPublic();
  if(id==="playerArea")renderPlayer();
  if(id==="adminArea")renderAdmin();
  if(id==="gameScreen")renderBoard();
  scrollTo(0,0);
}
function toast(m){$("toast").textContent=m;$("toast").classList.add("show");setTimeout(()=>$("toast").classList.remove("show"),2400);}

async function sha256(v){
  const b=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(v));
  return[...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,"0")).join("");
}

// ============================================================
// MULTIPLAYER REAL-TIME
// ============================================================
/*
  partida.json quando multiplayer:
  {
    modo: "multi",
    sala: "abc123",
    brancas: "Enzo",
    pretas: "Lorenzo",
    turno: "w",
    tabuleiro: "...",  // Chess.serialize compacto
    status: "aguardando"|"jogando"|"encerrado",
    resultado: null|"w"|"b"|"empate",
    lastMove: timestamp,
    versao: 0
  }
  Polling a cada 3s quando em partida multi.
*/
let multiMode=false;
let multiSala=null;
let multiMinhaCor=null; // "w" ou "b"
let multiPollInterval=null;
let multiVersaoLocal=0;
let multiHosting=false; // true se fui eu quem criou a sala

function gerarSalaId(){return Math.random().toString(36).slice(2,8).toUpperCase();}

async function criarSalaMulti(minhaCorEscolhida){
  const meuNome=currentPlayer||"Jogador";
  const sala=gerarSalaId();
  multiSala=sala;
  multiMinhaCor=minhaCorEscolhida;
  multiHosting=true;
  initGame();
  multiMode=true;
  const estado={
    modo:"multi",sala,
    brancas:minhaCorEscolhida==="w"?meuNome:"...",
    pretas:minhaCorEscolhida==="b"?meuNome:"...",
    turno:"w",
    tabuleiro:Chess.serialize(gameState),
    status:"aguardando",
    resultado:null,
    lastMove:Date.now(),
    versao:0
  };
  multiVersaoLocal=0;
  await ghPut(GH_FILE_GAME,JSON.stringify(estado),"Criar sala multiplayer "+sala);
  updateStatus(`Sala criada: ${sala}. Aguardando oponente...`);
  toast(`Código da sala: ${sala}`);
  $("multiRoomCode").textContent=`Sala: ${sala}`;
  $("multiRoomCode").style.display="block";
  iniciarPollingMulti();
}

async function entrarSalaMulti(salaId){
  const meuNome=currentPlayer||"Jogador";
  const raw=await ghGet(GH_FILE_GAME);
  if(!raw){toast("Sala não encontrada.");return;}
  let estado;
  try{estado=JSON.parse(raw);}catch{toast("Erro ao ler sala.");return;}
  if(!estado.sala||estado.sala!==salaId.toUpperCase()){toast("Código de sala inválido.");return;}
  if(estado.status!=="aguardando"){toast("Sala já está em jogo ou encerrada.");return;}
  multiSala=salaId.toUpperCase();
  multiHosting=false;
  // Determinar minha cor
  if(estado.brancas==="..."){multiMinhaCor="w";estado.brancas=meuNome;}
  else{multiMinhaCor="b";estado.pretas=meuNome;}
  estado.status="jogando";
  estado.versao=(estado.versao||0)+1;
  multiVersaoLocal=estado.versao;
  gameState=Chess.deserialize(estado.tabuleiro);
  gameState.captured={w:[],b:[]};gameState.san=[];gameState.history.forEach(()=>{});
  multiMode=true;
  await ghPut(GH_FILE_GAME,JSON.stringify(estado),"Entrar sala "+salaId);
  updateStatus(`Partida iniciada! Você é as ${multiMinhaCor==="w"?"Brancas":"Pretas"}.`);
  $("topPlayerName").textContent=multiMinhaCor==="w"?estado.pretas:estado.brancas;
  $("botPlayerName").textContent=multiMinhaCor==="w"?estado.brancas:estado.pretas;
  renderBoard();
  iniciarPollingMulti();
}

function iniciarPollingMulti(){
  pararPollingMulti();
  multiPollInterval=setInterval(pollMulti,3000);
}
function pararPollingMulti(){
  if(multiPollInterval){clearInterval(multiPollInterval);multiPollInterval=null;}
}

async function pollMulti(){
  if(!multiMode||!multiSala)return;
  const raw=await ghGet(GH_FILE_GAME);
  if(!raw)return;
  let estado;
  try{estado=JSON.parse(raw);}catch{return;}
  if(!estado.sala||estado.sala!==multiSala)return;
  // Chegou atualização nova?
  if((estado.versao||0)<=multiVersaoLocal)return;
  multiVersaoLocal=estado.versao||0;

  if(estado.status==="aguardando"&&multiHosting){
    // Oponente entrou
    if(estado.brancas!=="..."&&estado.pretas!=="..."){
      updateStatus(`${estado.pretas} entrou! Partida iniciada. Você é as Brancas.`);
      $("topPlayerName").textContent=estado.pretas;
      $("botPlayerName").textContent=estado.brancas;
      toast("Oponente conectado!");
    }
    return;
  }

  if(estado.status==="encerrado"){
    pararPollingMulti();
    const res=estado.resultado;
    const eu=multiMinhaCor;
    if(res==="empate"){updateStatus("½ Empate!");}
    else if(res===eu){updateStatus("🎉 Você venceu!");}
    else{updateStatus("Você perdeu.");}
    registrarResultadoMulti(estado);
    multiMode=false;
    renderBoard();
    return;
  }

  // Atualizar tabuleiro com o movimento do oponente
  if(estado.tabuleiro){
    try{
      const novoState=Chess.deserialize(estado.tabuleiro);
      // Rebuildar san e captured
      novoState.captured={w:[],b:[]};
      novoState.san=[];
      const tmpB=Chess.initBoard();
      const tmpS={board:tmpB,turn:"w",enPassant:null,castling:{wK:true,wQ:true,bK:true,bQ:true},history:[]};
      for(const m of novoState.history){
        const san=Chess.moveToSAN(tmpS.board,m,tmpS);
        if(tmpS.board[m.tr][m.tc])novoState.captured[Chess.color(tmpS.board[m.fr][m.fc])].push(tmpS.board[m.tr][m.tc]);
        atualizarCastlingState(tmpS,m);
        const p2=tmpS.board[m.fr][m.fc];
        tmpS.enPassant=(p2==="wP"||p2==="bP")&&Math.abs(m.tr-m.fr)===2?[Math.floor((m.fr+m.tr)/2),m.fc]:null;
        tmpS.board=Chess.applyMove(Chess.cloneBoard(tmpS.board),m,tmpS,m.promote||"Q");
        tmpS.history.push(m);tmpS.turn=tmpS.turn==="w"?"b":"w";
        novoState.san.push(san);
      }
      gameState=novoState;
      gameOver=false;
      const status=Chess.gameStatus(gameState.board,gameState.turn,gameState);
      if(estado.brancas!=="..."&&estado.pretas!=="..."){
        $("topPlayerName").textContent=boardFlipped?estado.brancas:estado.pretas;
        $("botPlayerName").textContent=boardFlipped?estado.pretas:estado.brancas;
      }
      if(status==="check")updateStatus(`⚠️ Xeque! Vez das ${gameState.turn==="w"?"Brancas":"Pretas"}.`);
      else updateStatus(`Vez das ${gameState.turn==="w"?"Brancas":"Pretas"}.`);
      renderBoard();
    }catch(e){console.error("pollMulti parse error",e);}
  }
}

function atualizarCastlingState(s,m){
  if(m.fr===7&&m.fc===4){s.castling.wK=false;s.castling.wQ=false;}
  if(m.fr===0&&m.fc===4){s.castling.bK=false;s.castling.bQ=false;}
  if(m.fr===7&&m.fc===0)s.castling.wQ=false;
  if(m.fr===7&&m.fc===7)s.castling.wK=false;
  if(m.fr===0&&m.fc===0)s.castling.bQ=false;
  if(m.fr===0&&m.fc===7)s.castling.bK=false;
}

async function enviarMovimentoMulti(){
  if(!multiMode||!multiSala)return;
  const raw=await ghGet(GH_FILE_GAME);
  if(!raw)return;
  let estado;
  try{estado=JSON.parse(raw);}catch{return;}
  estado.tabuleiro=Chess.serialize(gameState);
  estado.turno=gameState.turn;
  estado.versao=(estado.versao||0)+1;
  estado.lastMove=Date.now();
  multiVersaoLocal=estado.versao;
  await ghPut(GH_FILE_GAME,JSON.stringify(estado),"Movimento "+estado.brancas+" vs "+estado.pretas);
}

async function encerrarPartidaMulti(resultado){
  if(!multiSala)return;
  const raw=await ghGet(GH_FILE_GAME);
  let estado={};
  try{if(raw)estado=JSON.parse(raw);}catch{}
  estado.status="encerrado";
  estado.resultado=resultado;
  estado.versao=(estado.versao||0)+1;
  estado.tabuleiro=Chess.serialize(gameState);
  await ghPut(GH_FILE_GAME,JSON.stringify(estado),"Partida encerrada");
  pararPollingMulti();
}

function registrarResultadoMulti(estado){
  if(!currentPlayer)return;
  const meuNome=currentPlayer;
  const p=players.find(x=>x.name.toLowerCase()===meuNome.toLowerCase());
  if(!p)return;
  const sou=p.name===estado.brancas?"w":"b";
  const res=estado.resultado;
  let resultado;
  if(res==="empate")resultado="empate";
  else if(res===sou)resultado="vitória";
  else resultado="derrota";
  const adv=sou==="w"?estado.pretas:estado.brancas;
  p.historico=p.historico||[];
  p.historico.push({adversario:adv,resultado,data:new Date().toLocaleDateString("pt-BR"),movimentos:gameState.history.length});
  analisarFarm(p.name);
  persistAndSync();
}

// ============================================================
// CHESS GAME
// ============================================================
let gameState=null;
let selectedSq=null;
let legalMovesCache=[];
let boardFlipped=false;
let gameOver=false;
let pendingPromo=null;
let saveTimeout=null;

const PIECE_GLYPHS={'wK':'♔','wQ':'♕','wR':'♖','wB':'♗','wN':'♘','wP':'♙','bK':'♚','bQ':'♛','bR':'♜','bB':'♝','bN':'♞','bP':'♟'};

function initGame(){
  gameState={
    board:Chess.initBoard(),
    turn:'w',
    enPassant:null,
    castling:{wK:true,wQ:true,bK:true,bQ:true},
    history:[],
    san:[],
    captured:{w:[],b:[]}
  };
  selectedSq=null;legalMovesCache=[];gameOver=false;pendingPromo=null;
  if(multiMode){pararPollingMulti();multiMode=false;multiSala=null;}
  saveGameLocal();
  renderBoard();
  updateStatus("Brancas começam. Selecione uma peça.");
  $("multiRoomCode").style.display="none";
  $("topPlayerName").textContent="Pretas";
  $("botPlayerName").textContent="Brancas";
}

function renderBoard(){
  const board=$("chessboard");
  if(!board)return;
  if(!gameState){board.innerHTML='';return;}
  board.innerHTML='';
  for(let ri=0;ri<8;ri++){
    for(let ci=0;ci<8;ci++){
      const r=boardFlipped?7-ri:ri;
      const c=boardFlipped?7-ci:ci;
      const sq=document.createElement("div");
      sq.className="sq "+((r+c)%2===0?"light":"dark");
      sq.dataset.r=r;sq.dataset.c=c;
      if(ci===0){const cr=document.createElement("span");cr.className="coord-rank";cr.textContent=8-r;sq.appendChild(cr);}
      if(ri===7){const cf=document.createElement("span");cf.className="coord-file";cf.textContent=String.fromCharCode(97+c);sq.appendChild(cf);}
      if(selectedSq&&selectedSq[0]===r&&selectedSq[1]===c)sq.classList.add("selected");
      if(legalMovesCache.some(m=>m.tr===r&&m.tc===c)){
        sq.classList.add("movable");
        if(gameState.board[r][c])sq.classList.add("has-piece");
      }
      if(gameState.history.length){
        const last=gameState.history[gameState.history.length-1];
        if((last.fr===r&&last.fc===c)||(last.tr===r&&last.tc===c))sq.classList.add("last-move");
      }
      if(Chess.isCheck(gameState.board,gameState.turn,gameState)){
        const king=findKingPos(gameState.board,gameState.turn);
        if(king&&king[0]===r&&king[1]===c)sq.classList.add("check");
      }
      const p=gameState.board[r][c];
      if(p){const span=document.createElement("span");span.className="piece";span.textContent=PIECE_GLYPHS[p];sq.appendChild(span);}
      sq.addEventListener("click",()=>onSqClick(r,c));
      sq.addEventListener("touchend",e=>{e.preventDefault();onSqClick(r,c);},{passive:false});
      board.appendChild(sq);
    }
  }
  renderMoveList();
  renderCaptured();
  updatePlayerTags();
}

function findKingPos(board,col){
  for(let r=0;r<8;r++)for(let c=0;c<8;c++)if(board[r][c]===(col+'K'))return[r,c];
  return null;
}

function onSqClick(r,c){
  if(gameOver||pendingPromo)return;
  // Em modo multi, só pode mover na própria vez
  if(multiMode&&gameState.turn!==multiMinhaCor){
    toast("Aguardando o oponente...");return;
  }
  playClique();
  const p=gameState.board[r][c];
  if(selectedSq){
    const move=legalMovesCache.find(m=>m.tr===r&&m.tc===c);
    if(move){
      const mp=gameState.board[selectedSq[0]][selectedSq[1]];
      if(mp==='wP'&&r===0||mp==='bP'&&r===7){
        pendingPromo=move;showPromo(Chess.color(mp));return;
      }
      executeMove(move);return;
    }
    if(p&&Chess.color(p)===gameState.turn){
      selectedSq=[r,c];
      legalMovesCache=Chess.legalMoves(gameState.board,r,c,gameState);
      renderBoard();return;
    }
    selectedSq=null;legalMovesCache=[];renderBoard();return;
  }
  if(p&&Chess.color(p)===gameState.turn){
    selectedSq=[r,c];
    legalMovesCache=Chess.legalMoves(gameState.board,r,c,gameState);
    renderBoard();
  }
}

function executeMove(move,promote='Q'){
  const san=Chess.moveToSAN(gameState.board,move,gameState)+(move.promote?'='+promote:'');
  if(gameState.board[move.tr][move.tc]){
    const cap=gameState.board[move.tr][move.tc];
    gameState.captured[Chess.color(gameState.board[move.fr][move.fc])].push(cap);
  }
  atualizarCastlingState(gameState,move);
  const p=gameState.board[move.fr][move.fc];
  gameState.enPassant=(p==='wP'||p==='bP')&&Math.abs(move.tr-move.fr)===2?[Math.floor((move.fr+move.tr)/2),move.fc]:null;
  gameState.board=Chess.applyMove(Chess.cloneBoard(gameState.board),move,gameState,promote);
  gameState.history.push({...move,promote:move.promote||undefined});
  gameState.san.push(san);
  gameState.turn=gameState.turn==='w'?'b':'w';
  selectedSq=null;legalMovesCache=[];pendingPromo=null;

  const status=Chess.gameStatus(gameState.board,gameState.turn,gameState);
  if(status==='checkmate'){
    const vencedor=gameState.turn==='w'?'b':'w';
    const winner=gameState.turn==='w'?'Pretas':'Brancas';
    updateStatus(`♛ Xeque-mate! ${winner} vencem!`);
    gameOver=true;
    if(multiMode){
      encerrarPartidaMulti(vencedor);
      registrarResultadoLocal(vencedor);
    }else{
      clearGameSave();
      registrarResultadoLocal(vencedor,true);
    }
  }else if(status==='stalemate'){
    updateStatus("½ Afogamento — Empate!");
    gameOver=true;
    if(multiMode){encerrarPartidaMulti("empate");registrarResultadoLocal("empate");}
    else{clearGameSave();}
  }else if(status==='check'){
    updateStatus(`⚠️ Xeque! ${gameState.turn==='w'?'Brancas':'Pretas'} devem responder.`);
    if(multiMode)enviarMovimentoMulti();else scheduleSave();
  }else{
    updateStatus(`Vez das ${gameState.turn==='w'?'Brancas':'Pretas'}.`);
    if(multiMode)enviarMovimentoMulti();else scheduleSave();
  }
  renderBoard();
}

function registrarResultadoLocal(vencedor, solitario=false){
  if(!currentPlayer)return;
  const p=players.find(x=>x.name.toLowerCase()===currentPlayer.toLowerCase());
  if(!p)return;
  const sou=multiMinhaCor||"w";
  let resultado;
  if(vencedor==="empate")resultado="empate";
  else if(vencedor===sou)resultado="vitória";
  else resultado="derrota";
  const topName=$("topPlayerName").textContent;
  const adv=solitario?"(solo)":topName;
  p.historico=p.historico||[];
  p.historico.push({adversario:adv,resultado,data:new Date().toLocaleDateString("pt-BR"),movimentos:gameState.history.length});
  analisarFarm(p.name);
  persistAndSync();
}

function scheduleSave(){
  clearTimeout(saveTimeout);
  saveTimeout=setTimeout(()=>{saveGameLocal();saveGameGitHub();},1500);
}

function updateStatus(msg){const el=$("gameStatus");if(el)el.textContent=msg;}

function updatePlayerTags(){
  const top=$("topPlayerTag"),bot=$("botPlayerTag");
  if(!top||!bot)return;
  const wturn=gameState&&gameState.turn==='w';
  if(boardFlipped){top.classList.toggle("active-turn",wturn);bot.classList.toggle("active-turn",!wturn);}
  else{bot.classList.toggle("active-turn",wturn);top.classList.toggle("active-turn",!wturn);}
}

function renderMoveList(){
  const el=$("movesList");if(!el)return;
  if(!gameState||!gameState.san.length){el.innerHTML='<span style="color:var(--muted);font-size:12px">Sem movimentos</span>';return;}
  let html='';
  for(let i=0;i<gameState.san.length;i+=2){
    const num=Math.floor(i/2)+1;
    html+=`<span class="move-num">${num}.</span>`;
    html+=`<span class="move-white${i===gameState.san.length-1?' move-current':''}">${gameState.san[i]}</span>`;
    html+=`<span class="move-black${i+1===gameState.san.length-1&&gameState.san.length%2===0?' move-current':''}">${gameState.san[i+1]||''}</span>`;
  }
  el.innerHTML=html;el.scrollTop=el.scrollHeight;
}

function renderCaptured(){
  const el=$("capturedPieces");if(!el||!gameState)return;
  const sc=(arr)=>[...arr].sort((a,b)=>PIECE_GLYPHS[b]?.localeCompare(PIECE_GLYPHS[a])||0);
  const wCap=sc(gameState.captured.w).map(p=>PIECE_GLYPHS[p]).join('');
  const bCap=sc(gameState.captured.b).map(p=>PIECE_GLYPHS[p]).join('');
  el.textContent=(wCap||'')+(wCap&&bCap?' · ':'')+bCap;
}

function showPromo(col){
  let overlay=$("promoOverlay");
  if(!overlay){
    overlay=document.createElement("div");overlay.id="promoOverlay";
    const pieces=col==='w'?['♕','♖','♗','♘']:['♛','♜','♝','♞'];
    const types=['Q','R','B','N'];
    overlay.innerHTML=`<div class="promo-box"><h3>Escolha a peça</h3><div class="promo-pieces">${pieces.map((p,i)=>`<span class="promo-piece" data-t="${types[i]}">${p}</span>`).join('')}</div></div>`;
    overlay.querySelectorAll(".promo-piece").forEach(el=>{
      el.addEventListener("click",()=>{const t=el.dataset.t;overlay.classList.remove("open");executeMove(pendingPromo,t);});
    });
    document.body.appendChild(overlay);
  }
  overlay.classList.add("open");
}

function undoMove(){
  if(!gameState||gameState.history.length===0||gameOver||multiMode)return;
  const h=[...gameState.history.slice(0,-1)];
  const s=[...gameState.san.slice(0,-1)];
  initGame();
  const savedH=h,savedS=s;
  for(let i=0;i<savedH.length;i++)executeMove(savedH[i],savedH[i].promote||'Q');
  gameState.san=savedS;renderBoard();
}

function saveGameLocal(){if(!gameState)return;localStorage.setItem(GAME_STORAGE_KEY,Chess.serialize(gameState));}
async function saveGameGitHub(){
  if(!gameState||gameOver||multiMode)return;
  await ghPut(GH_FILE_GAME,Chess.serialize(gameState),"Salvar partida");
}
function clearGameSave(){
  localStorage.removeItem(GAME_STORAGE_KEY);
  ghPut(GH_FILE_GAME,'{}','Partida encerrada');
}

async function loadGame(){
  let raw=await ghGet(GH_FILE_GAME);
  if(!raw||raw.trim()==='{}')raw=localStorage.getItem(GAME_STORAGE_KEY);
  if(!raw||raw.trim()==='{}'){toast("Nenhuma partida salva encontrada.");return;}
  try{
    const gs=Chess.deserialize(raw);
    gs.captured={w:[],b:[]};gs.san=[];
    const tmpBoard=Chess.initBoard();
    const tmpState={board:tmpBoard,turn:'w',enPassant:null,castling:{wK:true,wQ:true,bK:true,bQ:true},history:[]};
    for(const m of gs.history){
      const san=Chess.moveToSAN(tmpState.board,m,tmpState);
      if(tmpState.board[m.tr][m.tc])gs.captured[Chess.color(tmpState.board[m.fr][m.fc])].push(tmpState.board[m.tr][m.tc]);
      atualizarCastlingState(tmpState,m);
      const p2=tmpState.board[m.fr][m.fc];
      tmpState.enPassant=(p2==='wP'||p2==='bP')&&Math.abs(m.tr-m.fr)===2?[Math.floor((m.fr+m.tr)/2),m.fc]:null;
      tmpState.board=Chess.applyMove(Chess.cloneBoard(tmpState.board),m,tmpState,m.promote||'Q');
      tmpState.history.push(m);tmpState.san=(tmpState.san||[]);tmpState.san.push(san);
      tmpState.turn=tmpState.turn==='w'?'b':'w';
      gs.san.push(san);
    }
    gameState=gs;gameOver=false;selectedSq=null;legalMovesCache=[];
    const status=Chess.gameStatus(gameState.board,gameState.turn,gameState);
    updateStatus(status==='check'?`⚠️ Xeque! Vez das ${gameState.turn==='w'?'Brancas':'Pretas'}.`:`Partida retomada. Vez das ${gameState.turn==='w'?'Brancas':'Pretas'}.`);
    renderBoard();toast("Partida carregada ✓");
  }catch(e){toast("Erro ao carregar partida.");}
}

// ============================================================
// EVENTOS
// ============================================================
document.querySelectorAll("[data-screen]").forEach(b=>b.onclick=()=>{playClique();show(b.dataset.screen);});

$("enterPlayer").onclick=()=>{
  playClique();
  const n=$("playerName").value.trim(),p=players.find(x=>x.name.toLowerCase()===n.toLowerCase());
  if(!p){$("playerError").textContent="Jogador não encontrado.";return;}
  // 2FA check
  if(appConfig.twoFA&&appConfig.twoFA.question){
    verificar2FA("Login",()=>{
      currentPlayer=p.name;$("playerError").textContent="";show("playerArea");
    });
    return;
  }
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
  const password=prompt("Confirme a senha do administrador:");
  if(password===null)return;
  if(await sha256(password)!==ADMIN_HASH){toast("Senha incorreta. Cancelado.");return;}
  if(editingIndex===null){
    if(players.some(p=>p.name.toLowerCase()===name.toLowerCase())){toast("Esse jogador já existe.");return;}
    players.push({name,score,historico:[],suspeitoFarm:false});
  }else{
    if(players.some((p,i)=>i!==editingIndex&&p.name.toLowerCase()===name.toLowerCase())){toast("Esse jogador já existe.");return;}
    const existing=players[editingIndex];
    players[editingIndex]={...existing,name,score};
    editingIndex=null;$("formTitle").textContent="Adicionar jogador";$("cancelEdit").classList.add("hidden");
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
  const p=sorted()[i],password=prompt("Senha do administrador para excluir "+p.name+":");
  if(password===null)return;
  if(await sha256(password)!==ADMIN_HASH){toast("Senha incorreta.");return;}
  players=players.filter(x=>x!==p);persist();renderAdmin();renderPublic();persistAndSync();
};

$("cancelEdit").onclick=()=>{
  playClique();editingIndex=null;$("scoreName").value="";$("scoreValue").value="";
  $("formTitle").textContent="Adicionar jogador";$("cancelEdit").classList.add("hidden");
};

// Configurar 2FA (admin)
$("btnSave2FA")&&($("btnSave2FA").onclick=async()=>{
  const q=$("twofa-cfg-question").value.trim();
  const a=$("twofa-cfg-answer").value.trim();
  if(!q||!a){toast("Preencha pergunta e resposta.");return;}
  const password=prompt("Senha do administrador:");
  if(password===null)return;
  if(await sha256(password)!==ADMIN_HASH){toast("Senha incorreta.");return;}
  appConfig.twoFA={question:q,answer:a.toLowerCase()};
  await saveConfig();
  toast("2FA configurado ✓");
});

// Chess controls
$("btnNewGame").onclick=()=>{
  playClique();
  if(gameState&&gameState.history.length>0&&!gameOver){if(!confirm("Iniciar nova partida? A atual será perdida."))return;}
  initGame();
};
$("btnUndoMove").onclick=()=>{playClique();undoMove();};
$("btnFlipBoard").onclick=()=>{playClique();boardFlipped=!boardFlipped;renderBoard();};
$("btnLoadGame").onclick=()=>{playClique();loadGame();};

// Multiplayer
$("btnCriarSala")&&($("btnCriarSala").onclick=()=>{
  playClique();
  if(!currentPlayer){toast("Faça login como jogador primeiro.");return;}
  $("multiModal").classList.add("open");
});
$("btnEntrarSala")&&($("btnEntrarSala").onclick=()=>{
  playClique();
  if(!currentPlayer){toast("Faça login como jogador primeiro.");return;}
  const cod=$("entrarSalaInput").value.trim().toUpperCase();
  if(!cod){toast("Digite o código da sala.");return;}
  $("multiModal").classList.remove("open");
  entrarSalaMulti(cod);
});
$("btnCriarBrancas")&&($("btnCriarBrancas").onclick=()=>{
  $("multiModal").classList.remove("open");
  criarSalaMulti("w");
});
$("btnCriarPretas")&&($("btnCriarPretas").onclick=()=>{
  $("multiModal").classList.remove("open");
  criarSalaMulti("b");
});
$("btnCloseMultiModal")&&($("btnCloseMultiModal").onclick=()=>{
  $("multiModal").classList.remove("open");
});

// Perfil público
window.showPlayerProfileById=showPlayerProfileById;
$("backFromProfile")&&($("backFromProfile").onclick=()=>{playClique();show("home");});

// Histórico ao lado da área jogador
// (já renderizado pelo renderPlayer → renderHistorico)

// ============================================================
// INIT
// ============================================================
renderPublic();
initGame();
loadConfig().then(()=>{
  // preencher campos 2FA se existir
  if($("twofa-cfg-question")&&appConfig.twoFA){
    $("twofa-cfg-question").value=appConfig.twoFA.question||"";
  }
});

// Load ranking from GitHub
(async()=>{
  const raw=await ghGet(GH_FILE_RANK);
  if(raw){
    try{
      const d=JSON.parse(raw);
      if(Array.isArray(d)&&d.length){
        players=d.map(p=>({historico:[],suspeitoFarm:false,...p})).filter(x=>x&&typeof x.name==="string"&&Number.isFinite(Number(x.score)));
        persist();renderPublic();
      }
    }catch{}
  }
})();
