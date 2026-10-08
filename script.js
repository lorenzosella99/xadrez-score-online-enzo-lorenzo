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
const GH_TOKEN = "";

// ============================================================
// REGRAS PADRÃO & TUTORIAL
// ============================================================
const DEFAULT_REGRAS = `📋 REGRAS DO XADREZ SCORE

1. Cada partida vale blistx conforme configurado pelo admin.
2. Só é válida a partida registrada pelo sistema.
3. Farmar (jogar repetidamente contra o mesmo jogador para ganhar pontos) é proibido e monitorado automaticamente.
4. Em caso de abandono de partida, o adversário vence automaticamente.
5. Respeite o oponente. Condutas antidesportivas podem levar à desclassificação.
6. O admin pode editar pontuações a qualquer momento.
7. Dúvidas? Fale com o administrador.`;

const TUTORIAL_PECAS = [
  {
    nome:"Rei", glifo:"♔",
    desc:"O Rei é a peça mais importante. Se ele for capturado, o jogo acaba! O Rei pode se mover <strong>1 casa em qualquer direção</strong>: horizontal, vertical ou diagonal.",
    movimentos:[[1,0],[1,1],[0,1],[-1,1],[-1,0],[-1,-1],[0,-1],[1,-1]],
    extra:"Xeque-mate: quando o Rei está ameaçado e não há escape."
  },
  {
    nome:"Rainha", glifo:"♕",
    desc:"A Rainha é a peça mais poderosa. Ela se move <strong>qualquer número de casas</strong> em linha reta ou diagonal — combina o movimento da Torre e do Bispo!",
    movimentos:[[1,0],[2,0],[3,0],[-1,0],[-2,0],[0,1],[0,2],[0,3],[0,-1],[0,-2],[1,1],[2,2],[-1,-1],[-2,-2],[1,-1],[2,-2],[-1,1],[-2,2]],
    extra:"Com a Rainha no centro, você controla até 27 casas!"
  },
  {
    nome:"Torre", glifo:"♖",
    desc:"A Torre se move <strong>qualquer número de casas</strong> na horizontal ou vertical. É muito poderosa no final do jogo quando o tabuleiro está mais aberto.",
    movimentos:[[1,0],[2,0],[3,0],[-1,0],[-2,0],[-3,0],[0,1],[0,2],[0,3],[0,-1],[0,-2],[0,-3]],
    extra:"Roque: o Rei e a Torre podem fazer um movimento especial de troca de posição."
  },
  {
    nome:"Bispo", glifo:"♗",
    desc:"O Bispo se move <strong>qualquer número de casas na diagonal</strong>. Cada Bispo fica sempre nas casas da mesma cor durante toda a partida.",
    movimentos:[[1,1],[2,2],[3,3],[-1,-1],[-2,-2],[-3,-3],[1,-1],[2,-2],[3,-3],[-1,1],[-2,2],[-3,3]],
    extra:"Ter os dois Bispos no final do jogo é uma grande vantagem!"
  },
  {
    nome:"Cavalo", glifo:"♘",
    desc:"O Cavalo se move em <strong>formato de L</strong>: 2 casas em uma direção e 1 na perpendicular. É a única peça que pode <strong>pular por cima</strong> de outras peças!",
    movimentos:[[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]],
    extra:"O Cavalo é especialista em atacar peças que não conseguem atacá-lo de volta."
  },
  {
    nome:"Peão", glifo:"♙",
    desc:"O Peão anda <strong>1 casa para frente</strong> (ou 2 na primeira jogada). Ele captura na diagonal. Se chegar ao outro lado do tabuleiro, vira qualquer peça que quiser!",
    movimentos:[[-1,0],[-2,0]],
    capturas:[[-1,-1],[-1,1]],
    extra:"En passant: captura especial quando um peão avança 2 casas e fica ao lado do seu."
  }
];

let tutorialIdx=0;
function abrirTutorial(idx){tutorialIdx=idx;renderTutorialSlide();}

function renderTutorialSlide(){
  const p=TUTORIAL_PECAS[tutorialIdx];
  if(!p)return;
  // Atualiza info
  $("tutorialPecaNome").textContent=p.nome;
  $("tutorialPecaGlifo").textContent=p.glifo;
  $("tutorialPecaDesc").innerHTML=p.desc;
  $("tutorialPecaExtra").textContent=p.extra||"";
  $("tutorialCounter").textContent=`${tutorialIdx+1} / ${TUTORIAL_PECAS.length}`;
  $("tutorialPrev").disabled=tutorialIdx===0;
  $("tutorialNext").disabled=tutorialIdx===TUTORIAL_PECAS.length-1;
  // Mini tabuleiro 7x7 com a peça no centro (pos 3,3)
  renderTutorialBoard(p);
  // Botões de seleção de peça
  document.querySelectorAll(".tut-peca-btn").forEach((b,i)=>{
    b.classList.toggle("active",i===tutorialIdx);
  });
}

function renderTutorialBoard(p){
  const el=$("tutorialBoard");if(!el)return;
  el.innerHTML="";
  const CENTER=3;
  for(let r=0;r<7;r++){
    for(let c=0;c<7;c++){
      const sq=document.createElement("div");
      sq.className="tut-sq "+((r+c)%2===0?"light":"dark");
      const dr=r-CENTER, dc=c-CENTER;
      const isCenter=dr===0&&dc===0;
      const isMove=p.movimentos&&p.movimentos.some(([mr,mc])=>mr===dr&&mc===dc);
      const isCapt=p.capturas&&p.capturas.some(([mr,mc])=>mr===dr&&mc===dc);
      if(isCenter){
        const sp=document.createElement("span");sp.className="tut-piece";sp.textContent=p.glifo;sq.appendChild(sp);
      } else if(isMove){
        sq.classList.add("tut-move");
        const dot=document.createElement("span");dot.className="tut-dot";sq.appendChild(dot);
      } else if(isCapt){
        sq.classList.add("tut-capture");
        const dot=document.createElement("span");dot.className="tut-dot-cap";dot.textContent="✕";sq.appendChild(dot);
      }
      el.appendChild(sq);
    }
  }
}

function getBlistxModo(modo){
  const modos=appConfig.blistx?.modos||{};
  return modos[modo]||{vitoria:5,empate:1,derrota:-2};
}
function atualizarBlistxInfo(modo){
  const m=modo||appConfig.blistx?.modoSelecionado||"casual";
  const b=getBlistxModo(m);
  const nome={casual:"Casual",amistosa:"Amistosa",profissional:"Profissional"}[m]||m;
  const html=`<span class="blistx-win">+${Number(b.vitoria)} vitória</span> <span class="blistx-draw">+${Number(b.empate)} empate</span> <span class="blistx-loss">${Number(b.derrota)} derrota</span> <small>• ${nome}</small>`;
  const home=$("blistxInfoHome"); if(home) home.innerHTML=html;
  const game=$("blistxInfoGame"); if(game) game.innerHTML=html;
}
function aplicarPontuacaoResultado(p,resultado,modo){
  if(!p)return;
  const b=getBlistxModo(modo||"casual");
  const ganho=resultado==="vitória"?Number(b.vitoria):resultado==="empate"?Number(b.empate):Number(b.derrota);
  p.score=Math.max(0,Number(p.score||0)+ganho);
  return ganho;
}

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
let appConfig = {
  twoFA:{question:"",answer:""},
  antifarm:{alertas:[]},
  regras:"",
  blistx:{
    vitoria:5, derrota:-2, empate:1,
    modoSelecionado:"casual",
    modos:{
      casual:{vitoria:5,empate:1,derrota:-2},
      amistosa:{vitoria:0,empate:0,derrota:0},
      profissional:{vitoria:15,empate:1,derrota:-8}
    }
  }
};

async function loadConfig(){
  const raw=await ghGet(GH_FILE_CONFIG);
  if(raw){try{appConfig=JSON.parse(raw);}catch{}}
  appConfig.twoFA=appConfig.twoFA||{question:"",answer:""};
  appConfig.antifarm=appConfig.antifarm||{alertas:[]};
  appConfig.regras=appConfig.regras||"";
  appConfig.blistx=appConfig.blistx||{vitoria:5,derrota:-2,empate:1};
  appConfig.blistx.modos=appConfig.blistx.modos||{
    casual:{vitoria:Number(appConfig.blistx.vitoria??5),empate:Number(appConfig.blistx.empate??1),derrota:Number(appConfig.blistx.derrota??-2)},
    amistosa:{vitoria:0,empate:0,derrota:0},
    profissional:{vitoria:15,empate:1,derrota:-8}
  };
  appConfig.blistx.modoSelecionado=appConfig.blistx.modoSelecionado||"casual";
  for(const modo of ["casual","amistosa","profissional"]){
    appConfig.blistx.modos[modo]=appConfig.blistx.modos[modo]||{vitoria:0,empate:0,derrota:0};
  }
}
async function saveConfig(){
  await ghPut(GH_FILE_CONFIG,JSON.stringify(appConfig,null,2),"Atualizar config");
}

// ============================================================
// AUTENTICAÇÃO POR JOGADOR
// ============================================================
function normalizarJogador(p){
  p.historico=p.historico||[];
  p.suspeitoFarm=!!p.suspeitoFarm;
  p.auth=p.auth||{};
  p.auth.twoFA=p.auth.twoFA||{enabled:false,type:"password",question:"",secretHash:""};
  return p;
}
function normalizarTodosJogadores(){players=players.map(normalizarJogador);}
function renderTwoFAPlayers(){
  const el=$("twofa-cfg-player");
  if(!el)return;
  const atual=el.value;
  el.innerHTML='<option value="">Selecione o jogador</option>'+sorted().map(p=>'<option value="'+esc(p.name)+'">'+esc(p.name)+'</option>').join("");
  if(players.some(p=>p.name===atual))el.value=atual;
}
function carregarTwoFAJogador(){
  const name=$("twofa-cfg-player")?.value;
  const p=players.find(x=>x.name===name);
  const cfg=p?.auth?.twoFA||{enabled:false,type:"password",question:"",secretHash:""};
  if($("twofa-cfg-enabled"))$("twofa-cfg-enabled").checked=!!cfg.enabled;
  if($("twofa-cfg-type"))$("twofa-cfg-type").value=cfg.type||"password";
  if($("twofa-cfg-question"))$("twofa-cfg-question").value=cfg.question||"";
  if($("twofa-cfg-answer"))$("twofa-cfg-answer").value="";
  atualizarCamposTwoFA();
}
function atualizarCamposTwoFA(){
  const type=$("twofa-cfg-type")?.value||"password";
  const q=$("twofa-question-fields");
  if(q)q.style.display=type==="question"?"grid":"block";
  if($("twofa-cfg-question"))$("twofa-cfg-question").disabled=type!=="question";
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
        <div><button class="mini hist-btn" onclick="verHistoricoAdmin(${i})" title="Ver histórico">📜</button> <button class="mini" onclick="editPlayer(${i})">Editar</button> <button class="mini danger" onclick="deletePlayer(${i})">Excluir</button></div></div>`;
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
    const cor=h.resultado==="vitória"?"hist-win":h.resultado==="derrota"?"hist-loss":h.resultado==="em andamento"?"hist-pending":"hist-draw";
    return`<div class="hist-row ${cor}">
      <span class="hist-res">${h.resultado==="vitória"?"✓":h.resultado==="derrota"?"✗":h.resultado==="em andamento"?"⏳":"="}</span>
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
// 2FA POR JOGADOR
// ============================================================
let pending2FAAction=null;
let pending2FAConfig=null;

async function verificar2FA(label,fn,cfg){
  if(!cfg?.enabled||!cfg?.secretHash){fn();return;}
  pending2FAAction={label,fn};
  pending2FAConfig=cfg;
  const isQuestion=cfg.type==="question";
  $("twofa-question").textContent=isQuestion?(cfg.question||"Responda à pergunta secreta:"):"Digite a senha da segunda etapa:";
  $("twofa-answer").value="";
  $("twofa-answer").type=isQuestion?"text":"password";
  $("twofa-answer").placeholder=isQuestion?"Sua resposta":"Senha de 2 fatores";
  $("twofa-error").textContent="";
  $("twoFAModal").classList.add("open");
  setTimeout(()=>$("twofa-answer").focus(),50);
}
$("twoFAConfirm")&&($("twoFAConfirm").onclick=async()=>{
  const resp=$("twofa-answer").value.trim();
  const correta=await sha256(resp);
  if(!pending2FAConfig||correta!==pending2FAConfig.secretHash){
    $("twofa-error").textContent="Senha ou resposta incorreta.";return;
  }
  $("twoFAModal").classList.remove("open");
  if(pending2FAAction)pending2FAAction.fn();
  pending2FAAction=null;pending2FAConfig=null;
});
$("twoFACancel")&&($("twoFACancel").onclick=()=>{
  $("twoFAModal").classList.remove("open");
  pending2FAAction=null;pending2FAConfig=null;
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
let multiMinhaCor=null;
let multiChannel=null;
let multiHosting=false;
let multiVersaoLocal=0;

const XADREZ_SUPABASE_URL=window.XADREZ_SUPABASE_URL||"";
const XADREZ_SUPABASE_KEY=window.XADREZ_SUPABASE_KEY||"";
const supabaseClient=(window.supabase&&XADREZ_SUPABASE_URL&&XADREZ_SUPABASE_KEY)
  ? window.supabase.createClient(XADREZ_SUPABASE_URL,XADREZ_SUPABASE_KEY)
  : null;

function gerarSalaId(){return Math.random().toString(36).slice(2,8).toUpperCase();}

function garantirSupabase(){
  if(!supabaseClient){
    toast("Multiplayer online não está configurado no servidor.");
    updateStatus("Servidor online não configurado.");
    return false;
  }
  return true;
}

function pararPollingMulti(){
  if(multiChannel&&supabaseClient){
    try{supabaseClient.removeChannel(multiChannel);}catch{}
  }
  multiChannel=null;
}

async function lerSalaOnline(codigo){
  if(!garantirSupabase())return null;
  const {data,error}=await supabaseClient.from("xadrez_salas").select("*").eq("sala",String(codigo).toUpperCase()).maybeSingle();
  if(error){console.error("Supabase leitura:",error);toast("Erro ao consultar a sala.");return null;}
  return data;
}

async function salvarSalaOnline(estado){
  if(!garantirSupabase())return false;
  const {error}=await supabaseClient.from("xadrez_salas").upsert({
    sala:String(estado.sala).toUpperCase(),
    estado,
    atualizada_em:new Date().toISOString()
  },{onConflict:"sala"});
  if(error){console.error("Supabase gravação:",error);toast("Erro ao sincronizar a partida.");return false;}
  return true;
}

function assinarSalaMulti(codigo){
  pararPollingMulti();
  if(!supabaseClient)return;
  multiChannel=supabaseClient
    .channel("xadrez-sala-"+String(codigo).toUpperCase())
    .on("postgres_changes",{
      event:"*",
      schema:"public",
      table:"xadrez_salas",
      filter:"sala=eq."+String(codigo).toUpperCase()
    },payload=>{
      const estado=payload.new?.estado||null;
      if(estado)processarEstadoMulti(estado);
    })
    .subscribe(status=>{
      if(status==="CHANNEL_ERROR")console.error("Supabase Realtime: CHANNEL_ERROR");
    });
}

function processarEstadoMulti(estado){
  if(!estado||estado.sala!==multiSala)return;
  if((estado.versao||0)<=multiVersaoLocal)return;
  multiVersaoLocal=estado.versao||0;

  // Host detecta quando o oponente entrou (status mudou para "jogando")
  if(multiHosting&&estado.status==="jogando"&&
     estado.brancas&&estado.brancas!=="..."&&estado.pretas&&estado.pretas!=="..."){
    const adversario=multiMinhaCor==="w"?estado.pretas:estado.brancas;
    const euSou=multiMinhaCor==="w"?"Brancas":"Pretas";
    // Garante que o jogo está em modo multi e não encerrado
    multiMode=true;
    gameOver=false;
    // Atualiza nomes dos jogadores no tabuleiro
    if(boardFlipped){
      $("topPlayerName").textContent=multiMinhaCor==="w"?estado.brancas:estado.pretas;
      $("botPlayerName").textContent=multiMinhaCor==="w"?estado.pretas:estado.brancas;
    } else {
      $("topPlayerName").textContent=multiMinhaCor==="w"?estado.pretas:estado.brancas;
      $("botPlayerName").textContent=multiMinhaCor==="w"?estado.brancas:estado.pretas;
    }
    const turno=gameState?.turn==="w"?"Brancas":"Pretas";
    updateStatus(`${adversario} entrou! Você é as ${euSou}. Vez das ${turno}.`);
    toast(`${adversario} conectado! Jogo começando...`);
    registrarPartidaPendenteMulti(estado);
    renderBoard();
    return; // Host não precisa re-aplicar movimentos — tabuleiro já está no estado correto
  }

  // Ainda aguardando oponente
  if(estado.status==="aguardando")return;

  if(estado.status==="encerrado"){
    const res=estado.resultado;
    const eu=multiMinhaCor;
    if(res==="empate")updateStatus("½ Empate!");
    else if(res===eu)updateStatus("🎉 Você venceu!");
    else updateStatus("Você perdeu.");
    registrarResultadoMulti(estado);
    pararPollingMulti();
    multiMode=false;
    renderBoard();
    return;
  }

  if(!estado.tabuleiro)return;
  try{
    const novoState=Chess.deserialize(estado.tabuleiro);
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
      tmpS.history.push(m);
      tmpS.turn=tmpS.turn==="w"?"b":"w";
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
  }catch(e){console.error("Supabase estado:",e);}
}

async function criarSalaMulti(minhaCorEscolhida,modoEscolhido){
  if(!garantirSupabase())return;
  gameMode="local";
  if($("gameModeSelect"))$("gameModeSelect").value="local";
  atualizarModoJogoUI();
  const meuNome=currentPlayer||"Jogador";
  const sala=gerarSalaId();
  const modo=modoEscolhido||"casual";
  multiMinhaCor=minhaCorEscolhida;
  multiHosting=true;
  // initGame() reseta multiSala e multiMode — setamos DEPOIS
  initGame();
  multiMode=true;
  multiSala=sala; // deve ser setado APÓS initGame() para não ser resetado
  const estado={
    modo:"multi",tipoJogo:modo,sala,
    brancas:minhaCorEscolhida==="w"?meuNome:"...",
    pretas:minhaCorEscolhida==="b"?meuNome:"...",
    turno:"w",
    tabuleiro:Chess.serialize(gameState),
    status:"aguardando",
    resultado:null,
    lastMove:Date.now(),
    versao:1
  };
  multiVersaoLocal=1;
  const ok=await salvarSalaOnline(estado);
  if(!ok)return;
  assinarSalaMulti(sala);
  updateStatus(`Sala criada: ${sala}. Aguardando oponente pela internet...`);
  toast(`Código da sala: ${sala}`);
  $("multiRoomCode").textContent=`Sala: ${sala}`;
  $("multiRoomCode").style.display="block";
}

async function entrarSalaMulti(salaId){
  if(!garantirSupabase())return;
  gameMode="local";
  if($("gameModeSelect"))$("gameModeSelect").value="local";
  atualizarModoJogoUI();
  const meuNome=currentPlayer||"Jogador";
  const codigo=String(salaId||"").trim().toUpperCase();
  if(!/^[A-Z0-9]{6}$/.test(codigo)){toast("Código de sala inválido.");return;}
  const estado=await lerSalaOnline(codigo);
  if(!estado||!estado.estado){toast("Sala não encontrada. Verifique o código.");return;}
  const s=estado.estado;
  if(s.sala!==codigo){toast("Código de sala inválido.");return;}
  if(s.status!=="aguardando"){toast("Sala já está em jogo ou encerrada.");return;}
  multiSala=codigo;
  multiHosting=false;
  if(s.brancas==="..."){multiMinhaCor="w";s.brancas=meuNome;}
  else if(s.pretas==="..."){multiMinhaCor="b";s.pretas=meuNome;}
  else{toast("A sala já tem dois jogadores.");return;}
  s.status="jogando";
  s.versao=(s.versao||0)+1;
  multiVersaoLocal=s.versao;
  gameState=Chess.deserialize(s.tabuleiro);
  gameState.captured={w:[],b:[]};
  gameState.san=[];
  gameOver=false;
  multiMode=true;
  if(!(await salvarSalaOnline(s)))return;
  assinarSalaMulti(codigo);
  registrarPartidaPendenteMulti(s);
  const turno=gameState.turn==="w"?"Brancas":"Pretas";
  updateStatus(`Partida iniciada! Você é as ${multiMinhaCor==="w"?"Brancas":"Pretas"}. Vez das ${turno}.`);
  $("topPlayerName").textContent=multiMinhaCor==="w"?s.pretas:s.brancas;
  $("botPlayerName").textContent=multiMinhaCor==="w"?s.brancas:s.pretas;
  $("multiRoomCode").textContent=`Sala: ${codigo}`;
  $("multiRoomCode").style.display="block";
  renderBoard();
}

async function enviarMovimentoMulti(){
  if(!multiMode||!multiSala||!garantirSupabase())return;
  const row=await lerSalaOnline(multiSala);
  const estado=row?.estado;
  if(!estado)return;
  if(estado.status==="encerrado")return;
  estado.tabuleiro=Chess.serialize(gameState);
  estado.turno=gameState.turn;
  estado.versao=(estado.versao||0)+1;
  estado.lastMove=Date.now();
  multiVersaoLocal=estado.versao;
  await salvarSalaOnline(estado);
}

async function encerrarPartidaMulti(resultado){
  if(!multiSala||!garantirSupabase())return;
  const row=await lerSalaOnline(multiSala);
  const estado=row?.estado||{};
  estado.status="encerrado";
  estado.resultado=resultado;
  estado.versao=(estado.versao||0)+1;
  estado.tabuleiro=Chess.serialize(gameState);
  estado.lastMove=Date.now();
  await salvarSalaOnline(estado);
  pararPollingMulti();
}

function registrarPartidaPendenteMulti(estado){
  if(!currentPlayer||!estado)return;
  const meuNome=currentPlayer;
  const p=players.find(x=>x.name.toLowerCase()===meuNome.toLowerCase());
  if(!p)return;
  p.historico=p.historico||[];
  const id=estado.sala||multiSala;
  const existente=p.historico.find(h=>h.partidaId===id);
  const sou=p.name===estado.brancas?"w":"b";
  const adv=sou==="w"?estado.pretas:estado.brancas;
  const entrada={
    partidaId:id,
    adversario:adv&&adv!=="..."?adv:"Aguardando oponente",
    resultado:"em andamento",
    modo:estado.tipoJogo||"casual",
    data:new Date().toLocaleDateString("pt-BR"),
    movimentos:0
  };
  if(existente){
    Object.assign(existente,entrada);
  }else{
    p.historico.push(entrada);
  }
  persist();
  renderPlayer();
}

function registrarResultadoMulti(estado){
  if(!currentPlayer||!estado)return;
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

  // Atualiza a partida "em andamento" em vez de criar uma segunda entrada.
  const id=estado.sala||multiSala;
  const existente=p.historico.find(h=>h.partidaId===id);
  const movimentos=Array.isArray(gameState?.history)?gameState.history.length:0;
  if(existente){
    existente.adversario=adv||existente.adversario||"Desconhecido";
    existente.resultado=resultado;
    existente.modo=estado.tipoJogo||existente.modo||"casual";
    existente.movimentos=movimentos;
  }else{
    p.historico.push({
      partidaId:id,
      adversario:adv||"Desconhecido",
      resultado,
      modo:estado.tipoJogo||"casual",
      data:new Date().toLocaleDateString("pt-BR"),
      movimentos
    });
  }
  aplicarPontuacaoResultado(p,resultado,estado.tipoJogo||"casual");
  analisarFarm(p.name);
  persistAndSync();
}

// ============================================================
// CHESS GAME
// ============================================================
let gameState=null;
let gameMode="local";
let botLevel=1;
let botThinking=false;
let botTimer=null;
let multiLocalRoom=false;
const MULTI_LOCAL_KEY="xadrez-salas-multiplayer-v1";
let selectedSq=null;
let legalMovesCache=[];
let boardFlipped=false;
let gameOver=false;
let pendingPromo=null;
let saveTimeout=null;
// Eventos do tabuleiro usam pointerup para mouse e toque.

const PIECE_GLYPHS={'wK':'♔','wQ':'♕','wR':'♖','wB':'♗','wN':'♘','wP':'♙','bK':'♚','bQ':'♛','bR':'♜','bB':'♝','bN':'♞','bP':'♟'};

// ============================================================
// BOT — 10 NÍVEIS
// ============================================================
const BOT_LEVELS={
  1:{depth:0,random:1.00,nodes:150},
  2:{depth:0,random:.35,nodes:250},
  3:{depth:1,random:.20,nodes:500},
  4:{depth:1,random:.08,nodes:800},
  5:{depth:2,random:.12,nodes:1800},
  6:{depth:2,random:.04,nodes:3000},
  7:{depth:3,random:.08,nodes:2500},
  8:{depth:3,random:.025,nodes:3500},
  9:{depth:4,random:.04,nodes:4500},
  10:{depth:4,random:0,nodes:6000}
};
const BOT_VALUE={P:100,N:320,B:330,R:500,Q:900,K:20000};

function cloneChessState(st){
  return {
    board:Chess.cloneBoard(st.board),
    turn:st.turn,
    enPassant:st.enPassant?[...st.enPassant]:null,
    castling:{...st.castling},
    history:st.history.map(m=>({...m})),
    san:st.san?[...st.san]:[],
    captured:{w:[...(st.captured?.w||[])],b:[...(st.captured?.b||[])]}
  };
}
function applyBotMoveState(st,move){
  const ns=cloneChessState(st);
  const p=ns.board[move.fr][move.fc];
  if(ns.board[move.tr][move.tc])ns.captured[Chess.color(p)].push(ns.board[move.tr][move.tc]);
  atualizarCastlingState(ns,move);
  ns.enPassant=(p==="wP"||p==="bP")&&Math.abs(move.tr-move.fr)===2
    ?[Math.floor((move.fr+move.tr)/2),move.fc]:null;
  ns.board=Chess.applyMove(Chess.cloneBoard(ns.board),move,ns,move.promote||"Q");
  ns.history.push({...move,promote:move.promote||undefined});
  ns.turn=ns.turn==="w"?"b":"w";
  return ns;
}
function botAllMoves(st,col){
  return Chess.allLegalMoves(st.board,col,st);
}
function botEvaluate(st,botCol){
  const status=Chess.gameStatus(st.board,st.turn,st);
  if(status==="checkmate")return st.turn===botCol?-999999:999999;
  if(status==="stalemate")return 0;
  let score=0;
  for(let r=0;r<8;r++)for(let c=0;c<8;c++){
    const p=st.board[r][c];if(!p)continue;
    const v=BOT_VALUE[p[1]]||0;
    score+=(Chess.color(p)===botCol?v:-v);
    // Small positional bonus: center control and pawn advancement.
    if(p[1]!=="K"){
      const center=3.5-Math.max(Math.abs(3.5-r),Math.abs(3.5-c));
      score+=(Chess.color(p)===botCol?center:-center)*2;
    }
  }
  return score;
}
function botMoveOrder(moves,st){
  return moves.sort((a,b)=>{
    const ca=st.board[a.tr][a.tc], cb=st.board[b.tr][b.tc];
    return (ca?(BOT_VALUE[ca[1]]||0):0)-(cb?(BOT_VALUE[cb[1]]||0):0);
  }).reverse();
}
function botSearch(st,depth,alpha,beta,botCol,limits){
  limits.nodes++;
  if(limits.nodes>=limits.maxNodes)return{score:botEvaluate(st,botCol),move:null};
  const status=Chess.gameStatus(st.board,st.turn,st);
  if(depth<=0||status==="checkmate"||status==="stalemate")
    return{score:botEvaluate(st,botCol),move:null};
  let moves=botAllMoves(st,st.turn);
  botMoveOrder(moves,st);
  const maximizing=st.turn===botCol;
  let bestScore=maximizing?-Infinity:Infinity,bestMove=null;
  for(const move of moves){
    const ns=applyBotMoveState(st,move);
    const res=botSearch(ns,depth-1,alpha,beta,botCol,limits);
    if(maximizing){
      if(res.score>bestScore){bestScore=res.score;bestMove=move;}
      alpha=Math.max(alpha,bestScore);
    }else{
      if(res.score<bestScore){bestScore=res.score;bestMove=move;}
      beta=Math.min(beta,bestScore);
    }
    if(beta<=alpha)break;
    if(limits.nodes>=limits.maxNodes)break;
  }
  return{score:bestScore,move:bestMove};
}
function escolherMovimentoBot(){
  if(!gameState||gameOver||gameState.turn!=="b")return null;
  const cfg=BOT_LEVELS[Math.max(1,Math.min(10,botLevel))]||BOT_LEVELS[1];
  let moves=botAllMoves(gameState,"b");
  if(!moves.length)return null;
  botMoveOrder(moves,gameState);
  if(cfg.depth===0){
    const scored=moves.map(m=>{
      const ns=applyBotMoveState(gameState,m);
      return{m,score:botEvaluate(ns,"b")};
    }).sort((a,b)=>b.score-a.score);
    const pool=Math.max(1,Math.ceil(scored.length*(cfg.random||0.05)));
    return scored[Math.floor(Math.random()*pool)].m;
  }
  const candidates=[];
  for(const m of moves.slice(0,Math.min(moves.length,36))){
    const ns=applyBotMoveState(gameState,m);
    const limits={nodes:0,maxNodes:cfg.nodes};
    const res=botSearch(ns,cfg.depth-1,-Infinity,Infinity,"b",limits);
    candidates.push({m,score:res.score});
  }
  candidates.sort((a,b)=>b.score-a.score);
  const jitter=cfg.random;
  if(jitter>0&&Math.random()<jitter){
    return candidates[Math.floor(Math.random()*Math.min(3,candidates.length))].m;
  }
  return candidates[0]?.m||moves[0];
}
function agendarJogadaBot(){
  clearTimeout(botTimer);
  if(gameMode!=="bot"||multiMode||gameOver||gameState?.turn!=="b")return;
  botThinking=true;
  updateStatus(`🤖 Bot nível ${botLevel} está pensando...`);
  botTimer=setTimeout(()=>{
    botThinking=false;
    if(gameMode!=="bot"||multiMode||gameOver||!gameState||gameState.turn!=="b")return;
    const move=escolherMovimentoBot();
    if(move)executeMove(move,move.tr===7?"Q":"Q");
  },Math.max(300,Math.min(1800,250+botLevel*100)));
}

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
  clearTimeout(botTimer);
  botThinking=false;
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
      // O próprio quadrado recebe o toque/clique. O evento é direto e não
      // depende do elemento <span> da peça, que é recriado a cada render.
      sq.addEventListener("click",e=>{
        e.preventDefault();
        e.stopPropagation();
        onSqClick(r,c);
      });
      sq.addEventListener("pointerdown",e=>{
        if(e.pointerType==="mouse" && e.button!==0)return;
        e.preventDefault();
        e.stopPropagation();
      },{passive:false});
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
  if(gameOver||pendingPromo||botThinking)return;
  if(gameMode==="bot"&&gameState.turn!=="w"){toast("Aguarde o Bot...");return;}
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
    // Mostra visualmente que a peça foi selecionada e quantos movimentos
    // legais foram encontrados. Isso também ajuda a evitar "clique morto".
    updateStatus(`Peça selecionada: ${Chess.toAlgebraic(r,c)} • ${legalMovesCache.length} movimento(s)`);
    renderBoard();
  }
}

function atualizarCastlingState(state,move){
  if(!state?.castling)return;
  const p=state.board?.[move.fr]?.[move.fc];
  const captured=state.board?.[move.tr]?.[move.tc];

  // Mover o rei elimina os dois direitos de roque.
  if(p==="wK"){state.castling.wK=false;state.castling.wQ=false;}
  if(p==="bK"){state.castling.bK=false;state.castling.bQ=false;}

  // Mover uma torre elimina o roque daquele lado.
  if(p==="wR"&&move.fr===7&&move.fc===0)state.castling.wQ=false;
  if(p==="wR"&&move.fr===7&&move.fc===7)state.castling.wK=false;
  if(p==="bR"&&move.fr===0&&move.fc===0)state.castling.bQ=false;
  if(p==="bR"&&move.fr===0&&move.fc===7)state.castling.bK=false;

  // Capturar uma torre também elimina o direito de roque correspondente.
  if(captured==="wR"&&move.tr===7&&move.tc===0)state.castling.wQ=false;
  if(captured==="wR"&&move.tr===7&&move.tc===7)state.castling.wK=false;
  if(captured==="bR"&&move.tr===0&&move.tc===0)state.castling.bQ=false;
  if(captured==="bR"&&move.tr===0&&move.tc===7)state.castling.bK=false;
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
      registrarResultadoMulti({
        sala:multiSala,
        resultado:vencedor,
        brancas:multiMinhaCor==="w"?currentPlayer:$("topPlayerName").textContent,
        pretas:multiMinhaCor==="b"?currentPlayer:$("topPlayerName").textContent,
        tipoJogo:"casual"
      });
    }else{
      clearGameSave();
      registrarResultadoLocal(vencedor,true);
    }
  }else if(status==='stalemate'){
    updateStatus("½ Afogamento — Empate!");
    gameOver=true;
    if(multiMode){
      encerrarPartidaMulti("empate");
      registrarResultadoMulti({
        sala:multiSala,
        resultado:"empate",
        brancas:multiMinhaCor==="w"?currentPlayer:$("topPlayerName").textContent,
        pretas:multiMinhaCor==="b"?currentPlayer:$("topPlayerName").textContent,
        tipoJogo:"casual"
      });
    }else{clearGameSave();}
  }else if(status==='check'){
    updateStatus(`⚠️ Xeque! ${gameState.turn==='w'?'Brancas':'Pretas'} devem responder.`);
    if(multiMode)enviarMovimentoMulti();else scheduleSave();
  }else{
    updateStatus(`Vez das ${gameState.turn==='w'?'Brancas':'Pretas'}.`);
    if(multiMode)enviarMovimentoMulti();else scheduleSave();
    if(gameMode==="bot"&&gameState.turn==="b")agendarJogadaBot();
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
  p.historico.push({adversario:adv,resultado,modo:gameMode==="bot"?"casual":"casual",data:new Date().toLocaleDateString("pt-BR"),movimentos:gameState.history.length});
  aplicarPontuacaoResultado(p,resultado,"casual");
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
  const cfg=p.auth?.twoFA;
  if(cfg?.enabled&&cfg.secretHash){
    verificar2FA("Login",()=>{
      currentPlayer=p.name;$("playerError").textContent="";show("playerArea");
    },cfg);
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
    players.push({name,score,historico:[],suspeitoFarm:false,auth:{twoFA:{enabled:false,type:"password",question:"",secretHash:""}}});
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

// Ver histórico no admin
window.verHistoricoAdmin=i=>{
  playClique();
  const p=sorted()[i];
  showPlayerProfileById(p.name);
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
$("twofa-cfg-player")&&($("twofa-cfg-player").onchange=carregarTwoFAJogador);
$("twofa-cfg-type")&&($("twofa-cfg-type").onchange=atualizarCamposTwoFA);
$("btnSave2FA")&&($("btnSave2FA").onclick=async()=>{
  const name=$("twofa-cfg-player").value;
  const p=players.find(x=>x.name===name);
  if(!p){toast("Selecione um jogador.");return;}
  const enabled=$("twofa-cfg-enabled").checked;
  const type=$("twofa-cfg-type").value;
  const q=$("twofa-cfg-question").value.trim();
  const a=$("twofa-cfg-answer").value;
  if(enabled&&!a&&!p.auth?.twoFA?.secretHash){toast("Digite a senha/resposta da segunda etapa.");return;}
  if(enabled&&type==="question"&&!q){toast("Digite a pergunta secreta.");return;}
  const password=prompt("Senha do administrador:");
  if(password===null)return;
  if(await sha256(password)!==ADMIN_HASH){toast("Senha incorreta.");return;}
  p.auth=p.auth||{};
  p.auth.twoFA={
    enabled,
    type,
    question:type==="question"?q:"",
    secretHash:a?await sha256(a):((p.auth.twoFA||{}).secretHash||"")
  };
  persist();await persistAndSync();carregarTwoFAJogador();
  toast(enabled?"2FA ativado para "+p.name+" ✓":"2FA desativado para "+p.name+" ✓");
});

// Configurar Regras (admin)
$("btnSaveRegras")&&($("btnSaveRegras").onclick=async()=>{
  const txt=$("adminRegrasText").value.trim();
  const password=prompt("Senha do administrador:");
  if(password===null)return;
  if(await sha256(password)!==ADMIN_HASH){toast("Senha incorreta.");return;}
  appConfig.regras=txt;
  await saveConfig();
  toast("Regras salvas ✓");
});

// Configurar blistx por resultado
$("blistxModo")&&($("blistxModo").onchange=()=>{
  const modo=$("blistxModo").value;
  const b=getBlistxModo(modo);
  $("blistxVitoria").value=b.vitoria;
  $("blistxEmpate").value=b.empate;
  $("blistxDerrota").value=b.derrota;
  atualizarBlistxInfo(modo);
});
$("btnSaveBlistx")&&($("btnSaveBlistx").onclick=async()=>{
  const modo=$("blistxModo").value;
  const v=Number($("blistxVitoria").value);
  const d=Number($("blistxDerrota").value);
  const e=Number($("blistxEmpate").value);
  if(!Number.isFinite(v)||!Number.isFinite(d)||!Number.isFinite(e)){toast("Valores de pontuação inválidos.");return;}
  const password=prompt("Senha do administrador:");
  if(password===null)return;
  if(await sha256(password)!==ADMIN_HASH){toast("Senha incorreta.");return;}
  appConfig.blistx.modos=appConfig.blistx.modos||{};
  appConfig.blistx.modos[modo]={vitoria:v,derrota:d,empate:e};
  appConfig.blistx.modoSelecionado=modo;
  appConfig.blistx.vitoria=v;appConfig.blistx.derrota=d;appConfig.blistx.empate=e;
  await saveConfig();
  atualizarBlistxInfo(modo);
  toast("Pontuação do modo "+modo+" salva ✓");
});

// Modal Regras
$("btnAbrirRegras")&&($("btnAbrirRegras").onclick=()=>{
  playClique();
  const txt=appConfig.regras||(DEFAULT_REGRAS);
  $("regrasConteudo").innerHTML=txt.replace(/\n/g,"<br>");
  $("regrasModal").classList.add("open");
});
$("btnFecharRegras")&&($("btnFecharRegras").onclick=()=>{$("regrasModal").classList.remove("open");});

// Modal Tutorial
$("btnAbrirTutorial")&&($("btnAbrirTutorial").onclick=()=>{
  playClique();
  abrirTutorial(0);
  $("tutorialModal").classList.add("open");
});
$("btnFecharTutorial")&&($("btnFecharTutorial").onclick=()=>{$("tutorialModal").classList.remove("open");});
$("tutorialPrev")&&($("tutorialPrev").onclick=()=>{
  if(tutorialIdx>0){tutorialIdx--;renderTutorialSlide();}
});
$("tutorialNext")&&($("tutorialNext").onclick=()=>{
  if(tutorialIdx<TUTORIAL_PECAS.length-1){tutorialIdx++;renderTutorialSlide();}
});

// Seleção do modo de jogo e nível do bot
function atualizarModoJogoUI(){
  const modo=$("gameModeSelect")?.value||"local";
  gameMode=modo;
  const wrap=$("botLevelWrap");
  if(wrap)wrap.style.display=modo==="bot"?"block":"none";
  const btnMulti=$("btnCriarSala");
  if(btnMulti)btnMulti.style.display=modo==="bot"?"none":"inline-flex";
}
$("gameModeSelect")&&($("gameModeSelect").onchange=()=>{
  playClique();
  gameMode=$("gameModeSelect").value;
  botLevel=Number($("botLevelSelect")?.value||1);
  atualizarModoJogoUI();
  initGame();
});
$("botLevelSelect")&&($("botLevelSelect").onchange=()=>{
  botLevel=Math.max(1,Math.min(10,Number($("botLevelSelect").value)||1));
});
atualizarModoJogoUI();

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
  criarSalaMulti("w",$("multiModeSelect")?.value||"casual");
});
$("btnCriarPretas")&&($("btnCriarPretas").onclick=()=>{
  $("multiModal").classList.remove("open");
  criarSalaMulti("b",$("multiModeSelect")?.value||"casual");
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
try{
  const bc=new BroadcastChannel("xadrez-score-multiplayer");
  bc.onmessage=e=>{
    const st=e.data;
    if(!st||!multiLocalRoom||!multiSala||st.sala!==multiSala)return;
    salvarSalaLocal(st);
    pollMulti();
  };
}catch{}

loadConfig().then(()=>{
  normalizarTodosJogadores();
  renderTwoFAPlayers();
  carregarTwoFAJogador();
  if($("adminRegrasText"))$("adminRegrasText").value=appConfig.regras||"";
  if($("blistxModo"))$("blistxModo").value=appConfig.blistx?.modoSelecionado||"casual";
  const bm=getBlistxModo($("blistxModo")?.value||"casual");
  if($("blistxVitoria"))$("blistxVitoria").value=bm.vitoria;
  if($("blistxDerrota"))$("blistxDerrota").value=bm.derrota;
  if($("blistxEmpate"))$("blistxEmpate").value=bm.empate;
  atualizarBlistxInfo();
});
// Tutorial: inicializar botões de peça
document.querySelectorAll(".tut-peca-btn").forEach((b,i)=>{
  b.onclick=()=>{tutorialIdx=i;renderTutorialSlide();};
});

// Load ranking from GitHub
(async()=>{
  const raw=await ghGet(GH_FILE_RANK);
  if(raw){
    try{
      const d=JSON.parse(raw);
      if(Array.isArray(d)&&d.length){
        players=d.map(p=>normalizarJogador({historico:[],suspeitoFarm:false,...p})).filter(x=>x&&typeof x.name==="string"&&Number.isFinite(Number(x.score)));
        persist();renderPublic();renderAdmin();renderTwoFAPlayers();
      }
    }catch{}
  }
})();
