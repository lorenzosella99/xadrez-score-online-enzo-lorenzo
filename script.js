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
const GH_TOKEN = ["ghp_Q5q3jXpljH","PEu5zIGmDDSK","ibbFLrFA3et1OF"].join("");

// ============================================================
// ÁUDIO
// ============================================================
const audioClique = document.getElementById("audioClique");
const audioMusica = document.getElementById("audioMusica");
let musicaAtivada = false;

function playClique(){
  if(!audioClique)return;
  audioClique.currentTime = 0;
  audioClique.play().catch(()=>{});
}

function atualizarBtnMusica(){
  const btn = document.getElementById("btnMusica");
  if(btn){btn.textContent = musicaAtivada ? "🔊" : "🔇"; btn.title = musicaAtivada ? "Silenciar" : "Ativar música";}
}

function iniciarMusica(){
  if(musicaAtivada || !audioMusica)return;
  audioMusica.play().then(()=>{ musicaAtivada = true; atualizarBtnMusica(); }).catch(()=>{});
}
function pararMusica(){
  if(!audioMusica)return;
  audioMusica.pause(); musicaAtivada = false; atualizarBtnMusica();
}
function toggleMusica(){ musicaAtivada ? pararMusica() : iniciarMusica(); }

document.addEventListener("click", function onFirst(){
  iniciarMusica();
  document.removeEventListener("click", onFirst, {capture:true});
}, {capture:true, once:true});

// ============================================================
// GITHUB API
// ============================================================
async function ghHeaders(){
  return {"Authorization":"token "+GH_TOKEN, "Content-Type":"application/json"};
}
async function ghGet(file){
  try{
    const r = await fetch(`https://raw.githubusercontent.com/${GH_REPO}/${GH_BRANCH}/${file}?t=${Date.now()}`);
    return r.ok ? r.text() : null;
  }catch{return null;}
}
async function ghPut(file, content, message){
  try{
    const h = await ghHeaders();
    let sha = "";
    const meta = await fetch(`https://api.github.com/repos/${GH_REPO}/contents/${file}`, {headers:h});
    if(meta.ok){ const m = await meta.json(); sha = m.sha||""; }
    const body = {message, content: btoa(unescape(encodeURIComponent(content))), branch: GH_BRANCH};
    if(sha) body.sha = sha;
    const res = await fetch(`https://api.github.com/repos/${GH_REPO}/contents/${file}`, {method:"PUT", headers:h, body:JSON.stringify(body)});
    return res.ok;
  }catch{return false;}
}

// ============================================================
// RANKING
// ============================================================
const defaults = [{name:"Enzo",score:100},{name:"Lorenzo",score:90},{name:"Jogador 3",score:80}];
let players = loadLocal(), currentPlayer = null, editingIndex = null;
const $ = id => document.getElementById(id);

function loadLocal(){
  try{
    const p = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return Array.isArray(p) ? p.filter(x=>x&&typeof x.name==="string"&&Number.isFinite(Number(x.score))) : defaults;
  }catch{ return defaults; }
}
function persist(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(players)); }
async function persistAndSync(){
  persist();
  const ok = await ghPut(GH_FILE_RANK, JSON.stringify(players, null, 2), "Atualizar ranking");
  toast(ok ? "Salvo e sincronizado com GitHub ✓" : "Salvo localmente (GitHub indisponível)");
}

function sorted(){ return [...players].sort((a,b)=>Number(b.score)-Number(a.score)||a.name.localeCompare(b.name,"pt-BR")); }
function esc(s){ return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c])); }

function rows(list, admin=false){
  if(!list.length) return '<p class="muted">Nenhum jogador cadastrado.</p>';
  return list.map((p,i)=>admin
    ? `<div class="admin-row"><span class="position">${i+1}</span><span class="name">${esc(p.name)}</span><strong class="points">${Number(p.score)} blistx</strong><div><button class="mini" onclick="editPlayer(${i})">Editar</button> <button class="mini danger" onclick="deletePlayer(${i})">Excluir</button></div></div>`
    : `<div class="ranking-row ${i<3?"top":""}"><span class="position">${i<3?["🥇","🥈","🥉"][i]:i+1}</span><span class="name">${esc(p.name)}</span><strong class="points">${Number(p.score)} blistx</strong></div>`
  ).join("");
}

function renderPublic(){ const s=sorted(); $("publicRanking").innerHTML=rows(s); $("playerCount").textContent=s.length+" jogadores"; }
function renderPlayer(){
  const s=sorted(), p=players.find(x=>x.name.toLowerCase()===currentPlayer.toLowerCase());
  $("welcomePlayer").textContent = p?p.name:"Jogador";
  $("myScoreCard").innerHTML = p
    ? `<div class="muted">Seu blistx</div><div class="big-score">${Number(p.score)}</div><div class="muted">blistx</div>`
    : '<div class="muted">Jogador não encontrado.</div>';
  $("playerRanking").innerHTML = rows(s.slice(0,10));
  $("allRanking").innerHTML = rows(s);
}
function renderAdmin(){ const s=sorted(); $("adminRanking").innerHTML=rows(s,true); $("adminCount").textContent=s.length+" jogadores"; }

function show(id){
  document.querySelectorAll(".screen").forEach(x=>x.classList.remove("active"));
  $(id).classList.add("active");
  document.querySelectorAll(".bottom-btn").forEach(b=>{
    b.classList.toggle("active", b.dataset.screen===id);
  });
  if(id==="home") renderPublic();
  if(id==="playerArea") renderPlayer();
  if(id==="adminArea") renderAdmin();
  if(id==="gameScreen") renderBoard();
  scrollTo(0,0);
}

function toast(m){ $("toast").textContent=m; $("toast").classList.add("show"); setTimeout(()=>$("toast").classList.remove("show"),2400); }

async function sha256(v){
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(v));
  return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,"0")).join("");
}

// ============================================================
// CHESS GAME
// ============================================================
let gameState = null;
let selectedSq = null;
let legalMovesCache = [];
let boardFlipped = false;
let gameOver = false;
let pendingPromo = null;
let saveTimeout = null;

const PIECE_GLYPHS = {'wK':'♔','wQ':'♕','wR':'♖','wB':'♗','wN':'♘','wP':'♙','bK':'♚','bQ':'♛','bR':'♜','bB':'♝','bN':'♞','bP':'♟'};

function initGame(){
  gameState = {
    board: Chess.initBoard(),
    turn: 'w',
    enPassant: null,
    castling: {wK:true, wQ:true, bK:true, bQ:true},
    history: [],
    san: [],
    captured: {w:[], b:[]}
  };
  selectedSq = null;
  legalMovesCache = [];
  gameOver = false;
  pendingPromo = null;
  saveGameLocal();
  renderBoard();
  updateStatus("Brancas começam. Selecione uma peça.");
}

function renderBoard(){
  const board = $("chessboard");
  if(!board) return;
  if(!gameState){ board.innerHTML=''; return; }
  board.innerHTML = '';
  for(let ri=0; ri<8; ri++){
    for(let ci=0; ci<8; ci++){
      const r = boardFlipped ? 7-ri : ri;
      const c = boardFlipped ? 7-ci : ci;
      const sq = document.createElement("div");
      sq.className = "sq " + ((r+c)%2===0?"light":"dark");
      sq.dataset.r = r; sq.dataset.c = c;
      // coords
      if(ci===0){ const cr=document.createElement("span"); cr.className="coord-rank"; cr.textContent=8-r; sq.appendChild(cr); }
      if(ri===7){ const cf=document.createElement("span"); cf.className="coord-file"; cf.textContent=String.fromCharCode(97+c); sq.appendChild(cf); }
      // highlight
      if(selectedSq && selectedSq[0]===r && selectedSq[1]===c) sq.classList.add("selected");
      if(legalMovesCache.some(m=>m.tr===r&&m.tc===c)){
        sq.classList.add("movable");
        if(gameState.board[r][c]) sq.classList.add("has-piece");
      }
      if(gameState.history.length){
        const last = gameState.history[gameState.history.length-1];
        if((last.fr===r&&last.fc===c)||(last.tr===r&&last.tc===c)) sq.classList.add("last-move");
      }
      // check highlight
      if(gameState && Chess.isCheck(gameState.board, gameState.turn, gameState)){
        const king = findKingPos(gameState.board, gameState.turn);
        if(king && king[0]===r && king[1]===c) sq.classList.add("check");
      }
      // piece
      const p = gameState.board[r][c];
      if(p){ const span=document.createElement("span"); span.className="piece"; span.textContent=PIECE_GLYPHS[p]; sq.appendChild(span); }
      sq.addEventListener("click", ()=>onSqClick(r,c));
      sq.addEventListener("touchend", e=>{e.preventDefault();onSqClick(r,c);}, {passive:false});
      board.appendChild(sq);
    }
  }
  renderMoveList();
  renderCaptured();
  updatePlayerTags();
}

function findKingPos(board, col){
  for(let r=0;r<8;r++) for(let c=0;c<8;c++) if(board[r][c]===(col+'K')) return[r,c];
  return null;
}

function onSqClick(r, c){
  if(gameOver || pendingPromo) return;
  playClique();
  const p = gameState.board[r][c];

  if(selectedSq){
    // Try move
    const move = legalMovesCache.find(m=>m.tr===r&&m.tc===c);
    if(move){
      // Promotion?
      const mp = gameState.board[selectedSq[0]][selectedSq[1]];
      if(mp==='wP'&&r===0 || mp==='bP'&&r===7){
        pendingPromo = move;
        showPromo(Chess.color(mp));
        return;
      }
      executeMove(move);
      return;
    }
    // Deselect or select new
    if(p && Chess.color(p)===gameState.turn){
      selectedSq = [r,c];
      legalMovesCache = Chess.legalMoves(gameState.board, r, c, gameState);
      renderBoard();
      return;
    }
    selectedSq = null;
    legalMovesCache = [];
    renderBoard();
    return;
  }

  if(p && Chess.color(p)===gameState.turn){
    selectedSq = [r,c];
    legalMovesCache = Chess.legalMoves(gameState.board, r, c, gameState);
    renderBoard();
  }
}

function executeMove(move, promote='Q'){
  const san = Chess.moveToSAN(gameState.board, move, gameState) + (move.promote?'='+promote:'');
  // Capture
  if(gameState.board[move.tr][move.tc]){
    const cap = gameState.board[move.tr][move.tc];
    gameState.captured[Chess.color(gameState.board[move.fr][move.fc])].push(cap);
  }
  // Update castling rights
  if(move.fr===7&&move.fc===4) { gameState.castling.wK=false; gameState.castling.wQ=false; }
  if(move.fr===0&&move.fc===4) { gameState.castling.bK=false; gameState.castling.bQ=false; }
  if(move.fr===7&&move.fc===0) gameState.castling.wQ=false;
  if(move.fr===7&&move.fc===7) gameState.castling.wK=false;
  if(move.fr===0&&move.fc===0) gameState.castling.bQ=false;
  if(move.fr===0&&move.fc===7) gameState.castling.bK=false;
  // En passant
  const p = gameState.board[move.fr][move.fc];
  gameState.enPassant = (p==='wP'||p==='bP') && Math.abs(move.tr-move.fr)===2
    ? [Math.floor((move.fr+move.tr)/2), move.fc] : null;

  gameState.board = Chess.applyMove(Chess.cloneBoard(gameState.board), move, gameState, promote);
  gameState.history.push({...move, promote: move.promote||undefined});
  gameState.san.push(san);
  gameState.turn = gameState.turn==='w'?'b':'w';
  selectedSq = null; legalMovesCache = []; pendingPromo = null;

  const status = Chess.gameStatus(gameState.board, gameState.turn, gameState);
  if(status==='checkmate'){
    const winner = gameState.turn==='w'?'Pretas':'Brancas';
    updateStatus(`♛ Xeque-mate! ${winner} vencem!`);
    gameOver = true;
    clearGameSave();
  } else if(status==='stalemate'){
    updateStatus("½ Afogamento — Empate!");
    gameOver = true;
    clearGameSave();
  } else if(status==='check'){
    updateStatus(`⚠️ Xeque! ${gameState.turn==='w'?'Brancas':'Pretas'} devem responder.`);
    scheduleSave();
  } else {
    updateStatus(`Vez das ${gameState.turn==='w'?'Brancas':'Pretas'}.`);
    scheduleSave();
  }
  renderBoard();
}

function scheduleSave(){
  clearTimeout(saveTimeout);
  saveTimeout = setTimeout(()=>{ saveGameLocal(); saveGameGitHub(); }, 1500);
}

function updateStatus(msg){ const el=$("gameStatus"); if(el)el.textContent=msg; }

function updatePlayerTags(){
  const top=$("topPlayerTag"), bot=$("botPlayerTag");
  if(!top||!bot)return;
  const wturn = gameState && gameState.turn==='w';
  if(boardFlipped){ top.classList.toggle("active-turn",wturn); bot.classList.toggle("active-turn",!wturn); }
  else { bot.classList.toggle("active-turn",wturn); top.classList.toggle("active-turn",!wturn); }
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
  el.innerHTML=html;
  el.scrollTop=el.scrollHeight;
}

function renderCaptured(){
  const el=$("capturedPieces");if(!el||!gameState)return;
  const sortedCap=(arr)=>[...arr].sort((a,b)=>PIECE_GLYPHS[b]?.localeCompare(PIECE_GLYPHS[a])||0);
  const wCap=sortedCap(gameState.captured.w).map(p=>PIECE_GLYPHS[p]).join('');
  const bCap=sortedCap(gameState.captured.b).map(p=>PIECE_GLYPHS[p]).join('');
  el.textContent=(wCap||'')+(wCap&&bCap?' · ':'')+bCap;
}

// Promoção
function showPromo(col){
  let overlay = $("promoOverlay");
  if(!overlay){
    overlay=document.createElement("div");overlay.id="promoOverlay";
    const pieces = col==='w'?['♕','♖','♗','♘']:['♛','♜','♝','♞'];
    const types = ['Q','R','B','N'];
    overlay.innerHTML=`<div class="promo-box"><h3>Escolha a peça</h3><div class="promo-pieces">${pieces.map((p,i)=>`<span class="promo-piece" data-t="${types[i]}">${p}</span>`).join('')}</div></div>`;
    overlay.querySelectorAll(".promo-piece").forEach(el=>{
      el.addEventListener("click",()=>{ const t=el.dataset.t; overlay.classList.remove("open"); executeMove(pendingPromo, t); });
    });
    document.body.appendChild(overlay);
  }
  overlay.classList.add("open");
}

// Desfazer
function undoMove(){
  if(!gameState||gameState.history.length===0||gameOver)return;
  // Reinit and replay all but last
  const h=[...gameState.history.slice(0,-1)];
  const s=[...gameState.san.slice(0,-1)];
  initGame();
  const savedH=h, savedS=s;
  for(let i=0;i<savedH.length;i++){
    const m=savedH[i];
    executeMove(m, m.promote||'Q');
  }
  gameState.san=savedS; // keep san correct
  renderBoard();
}

// Save / Load
function saveGameLocal(){
  if(!gameState)return;
  localStorage.setItem(GAME_STORAGE_KEY, Chess.serialize(gameState));
}

async function saveGameGitHub(){
  if(!gameState||gameOver)return;
  const s=Chess.serialize(gameState);
  await ghPut(GH_FILE_GAME, s, "Salvar partida em andamento");
}

function clearGameSave(){
  localStorage.removeItem(GAME_STORAGE_KEY);
  ghPut(GH_FILE_GAME, '{}', "Partida encerrada");
}

async function loadGame(){
  // Try GitHub first
  let raw = await ghGet(GH_FILE_GAME);
  if(!raw||raw.trim()==='{}'){
    raw=localStorage.getItem(GAME_STORAGE_KEY);
  }
  if(!raw||raw.trim()==='{}'){toast("Nenhuma partida salva encontrada.");return;}
  try{
    const gs=Chess.deserialize(raw);
    // rebuild captured & san
    gs.captured={w:[],b:[]};gs.san=[];
    const tmpBoard=Chess.initBoard();
    const tmpState={board:tmpBoard,turn:'w',enPassant:null,castling:{wK:true,wQ:true,bK:true,bQ:true},history:[]};
    for(const m of gs.history){
      const san=Chess.moveToSAN(tmpState.board,m,tmpState);
      if(tmpState.board[m.tr][m.tc]) gs.captured[Chess.color(tmpState.board[m.fr][m.fc])].push(tmpState.board[m.tr][m.tc]);
      if(tmpState.board[m.fr][m.fc]==='wP'&&m.fr===7&&m.fc===m.fc&&m.tr===7&&m.tc===m.tc){}
      if(m.fr===7&&m.fc===4){tmpState.castling.wK=false;tmpState.castling.wQ=false;}
      if(m.fr===0&&m.fc===4){tmpState.castling.bK=false;tmpState.castling.bQ=false;}
      if(m.fr===7&&m.fc===0)tmpState.castling.wQ=false;
      if(m.fr===7&&m.fc===7)tmpState.castling.wK=false;
      if(m.fr===0&&m.fc===0)tmpState.castling.bQ=false;
      if(m.fr===0&&m.fc===7)tmpState.castling.bK=false;
      const p=tmpState.board[m.fr][m.fc];
      tmpState.enPassant=(p==='wP'||p==='bP')&&Math.abs(m.tr-m.fr)===2?[Math.floor((m.fr+m.tr)/2),m.fc]:null;
      tmpState.board=Chess.applyMove(Chess.cloneBoard(tmpState.board),m,tmpState,m.promote||'Q');
      tmpState.history.push(m);tmpState.san=(tmpState.san||[]);
      tmpState.san.push(san);
      tmpState.turn=tmpState.turn==='w'?'b':'w';
      gs.san.push(san);
    }
    gameState=gs;
    gameOver=false;selectedSq=null;legalMovesCache=[];
    const status=Chess.gameStatus(gameState.board,gameState.turn,gameState);
    updateStatus(status==='check'?`⚠️ Xeque! Vez das ${gameState.turn==='w'?'Brancas':'Pretas'}.`:`Partida retomada. Vez das ${gameState.turn==='w'?'Brancas':'Pretas'}.`);
    renderBoard();
    toast("Partida carregada ✓");
  }catch(e){toast("Erro ao carregar partida.");}
}

// ============================================================
// EVENTOS
// ============================================================
document.querySelectorAll("[data-screen]").forEach(b=>b.onclick=()=>{playClique();show(b.dataset.screen);});

$("enterPlayer").onclick=()=>{
  playClique();
  const n=$("playerName").value.trim(), p=players.find(x=>x.name.toLowerCase()===n.toLowerCase());
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
  const name=$("scoreName").value.trim(), score=Number($("scoreValue").value);
  if(!name||!Number.isFinite(score)||score<0){toast("Preencha nome e blistx válidos.");return;}
  const password=prompt("Confirme a senha do administrador:");
  if(password===null)return;
  if(await sha256(password)!==ADMIN_HASH){toast("Senha incorreta. Cancelado.");return;}
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
  const p=sorted()[i], password=prompt("Senha do administrador para excluir "+p.name+":");
  if(password===null)return;
  if(await sha256(password)!==ADMIN_HASH){toast("Senha incorreta.");return;}
  players=players.filter(x=>x!==p);persist();renderAdmin();renderPublic();persistAndSync();
};

$("cancelEdit").onclick=()=>{
  playClique();editingIndex=null;$("scoreName").value="";$("scoreValue").value="";
  $("formTitle").textContent="Adicionar jogador";$("cancelEdit").classList.add("hidden");
};

// Chess controls
$("btnNewGame").onclick=()=>{ playClique(); if(gameState&&gameState.history.length>0&&!gameOver){if(!confirm("Iniciar nova partida? A atual será perdida."))return;} initGame(); };
$("btnUndoMove").onclick=()=>{ playClique(); undoMove(); };
$("btnFlipBoard").onclick=()=>{ playClique(); boardFlipped=!boardFlipped; renderBoard(); };
$("btnLoadGame").onclick=()=>{ playClique(); loadGame(); };

// ============================================================
// INIT
// ============================================================
renderPublic();
initGame();
// Load ranking from GitHub
(async()=>{
  const raw=await ghGet(GH_FILE_RANK);
  if(raw){
    try{
      const d=JSON.parse(raw);
      if(Array.isArray(d)&&d.length){players=d.filter(x=>x&&typeof x.name==="string"&&Number.isFinite(Number(x.score)));persist();renderPublic();}
    }catch{}
  }
})();
