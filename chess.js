// ============================================================
// CHESS ENGINE — leve, sem dependências externas
// ============================================================
const Chess = (() => {
  const PIECES = {
    wK:'♔',wQ:'♕',wR:'♖',wB:'♗',wN:'♘',wP:'♙',
    bK:'♚',bQ:'♛',bR:'♜',bB:'♝',bN:'♞',bP:'♟'
  };
  const PIECE_VAL = {K:0,Q:9,R:5,B:3,N:3,P:1};

  function initBoard(){
    const b = Array(8).fill(null).map(()=>Array(8).fill(null));
    const order = ['R','N','B','Q','K','B','N','R'];
    for(let c=0;c<8;c++){b[0][c]='b'+order[c];b[7][c]='w'+order[c];b[1][c]='bP';b[6][c]='wP';}
    return b;
  }

  function cloneBoard(b){return b.map(r=>[...r]);}

  function color(p){return p?p[0]:null;}

  function inBounds(r,c){return r>=0&&r<8&&c>=0&&c<8;}

  function isUnderAttack(board,r,c,byColor){
    for(let rr=0;rr<8;rr++)for(let cc=0;cc<8;cc++){
      const p=board[rr][cc];
      if(!p||color(p)!==byColor)continue;
      const moves=rawMoves(board,rr,cc,{enPassant:null,castling:{wK:false,wQ:false,bK:false,bQ:false}});
      if(moves.some(m=>m.tr===r&&m.tc===c))return true;
    }
    return false;
  }

  function findKing(board,col){
    for(let r=0;r<8;r++)for(let c=0;c<8;c++)if(board[r][c]===(col+'K'))return[r,c];
    return null;
  }

  function rawMoves(board,r,c,state){
    const p=board[r][c];if(!p)return[];
    const col=color(p);const type=p[1];const opp=col==='w'?'b':'w';
    const moves=[];

    function push(tr,tc,extra={}){
      if(inBounds(tr,tc)&&color(board[tr][tc])!==col)moves.push({fr:r,fc:c,tr,tc,...extra});
    }
    function slide(dr,dc){
      let nr=r+dr,nc=c+dc;
      while(inBounds(nr,nc)){
        if(board[nr][nc]){if(color(board[nr][nc])===opp)push(nr,nc);break;}
        push(nr,nc);nr+=dr;nc+=dc;
      }
    }

    if(type==='R'){[[1,0],[-1,0],[0,1],[0,-1]].forEach(([dr,dc])=>slide(dr,dc));}
    if(type==='B'){[[1,1],[1,-1],[-1,1],[-1,-1]].forEach(([dr,dc])=>slide(dr,dc));}
    if(type==='Q'){[[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]].forEach(([dr,dc])=>slide(dr,dc));}
    if(type==='N'){[[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]].forEach(([dr,dc])=>push(r+dr,c+dc));}
    if(type==='K'){
      [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]].forEach(([dr,dc])=>push(r+dr,c+dc));
      // Castling
      if(col==='w'&&r===7&&c===4){
        if(state.castling.wK&&!board[7][5]&&!board[7][6]&&!isUnderAttack(board,7,4,opp)&&!isUnderAttack(board,7,5,opp)&&!isUnderAttack(board,7,6,opp))
          moves.push({fr:7,fc:4,tr:7,tc:6,castling:'wK'});
        if(state.castling.wQ&&!board[7][3]&&!board[7][2]&&!board[7][1]&&!isUnderAttack(board,7,4,opp)&&!isUnderAttack(board,7,3,opp)&&!isUnderAttack(board,7,2,opp))
          moves.push({fr:7,fc:4,tr:7,tc:2,castling:'wQ'});
      }
      if(col==='b'&&r===0&&c===4){
        if(state.castling.bK&&!board[0][5]&&!board[0][6]&&!isUnderAttack(board,0,4,opp)&&!isUnderAttack(board,0,5,opp)&&!isUnderAttack(board,0,6,opp))
          moves.push({fr:0,fc:4,tr:0,tc:6,castling:'bK'});
        if(state.castling.bQ&&!board[0][3]&&!board[0][2]&&!board[0][1]&&!isUnderAttack(board,0,4,opp)&&!isUnderAttack(board,0,3,opp)&&!isUnderAttack(board,0,2,opp))
          moves.push({fr:0,fc:4,tr:0,tc:2,castling:'bQ'});
      }
    }
    if(type==='P'){
      const dir=col==='w'?-1:1;const startRow=col==='w'?6:1;
      if(inBounds(r+dir,c)&&!board[r+dir][c])push(r+dir,c);
      if(r===startRow&&!board[r+dir][c]&&!board[r+2*dir][c])push(r+2*dir,c,{double:true});
      [-1,1].forEach(dc=>{
        if(inBounds(r+dir,c+dc)){
          if(board[r+dir][c+dc]&&color(board[r+dir][c+dc])===opp)push(r+dir,c+dc);
          if(state.enPassant&&state.enPassant[0]===r+dir&&state.enPassant[1]===c+dc)
            moves.push({fr:r,fc:c,tr:r+dir,tc:c+dc,enPassant:true});
        }
      });
    }
    return moves;
  }

  function legalMoves(board,r,c,state){
    return rawMoves(board,r,c,state).filter(m=>{
      const nb=applyMove(cloneBoard(board),m,state);
      const king=findKing(nb,color(board[r][c]));
      return king&&!isUnderAttack(nb,...king,color(board[r][c])==='w'?'b':'w');
    });
  }

  function applyMove(board,move,state,promote='Q'){
    const {fr,fc,tr,tc}=move;
    const p=board[fr][fc];const col=color(p);
    board[tr][tc]=p;board[fr][fc]=null;
    if(move.castling==='wK'){board[7][5]='wR';board[7][7]=null;}
    if(move.castling==='wQ'){board[7][3]='wR';board[7][0]=null;}
    if(move.castling==='bK'){board[0][5]='bR';board[0][7]=null;}
    if(move.castling==='bQ'){board[0][3]='bR';board[0][0]=null;}
    if(move.enPassant){board[fr][tc]=null;}
    if(p==='wP'&&tr===0)board[tr][tc]='w'+promote;
    if(p==='bP'&&tr===7)board[tr][tc]='b'+promote;
    return board;
  }

  function allLegalMoves(board,col,state){
    const moves=[];
    for(let r=0;r<8;r++)for(let c=0;c<8;c++)
      if(board[r][c]&&color(board[r][c])===col)
        legalMoves(board,r,c,state).forEach(m=>moves.push(m));
    return moves;
  }

  function isCheck(board,col,state){
    const king=findKing(board,col);
    return king&&isUnderAttack(board,...king,col==='w'?'b':'w');
  }

  function gameStatus(board,col,state){
    const moves=allLegalMoves(board,col,state);
    if(!moves.length)return isCheck(board,col,state)?'checkmate':'stalemate';
    if(isCheck(board,col,state))return'check';
    return'playing';
  }

  function toAlgebraic(r,c){return String.fromCharCode(97+c)+(8-r);}

  function moveToSAN(board,move,state){
    const p=board[move.fr][move.fc];const type=p[1];
    const cap=board[move.tr][move.tc]||move.enPassant;
    let s='';
    if(move.castling==='wK'||move.castling==='bK')return'O-O';
    if(move.castling==='wQ'||move.castling==='bQ')return'O-O-O';
    if(type!=='P')s+=type;
    if(cap)s+='x';
    s+=toAlgebraic(move.tr,move.tc);
    if(move.promote)s+='='+move.promote;
    return s;
  }

  // Compact state serialization for GitHub save (minimal bytes)
  function serialize(state){
    // board: 64 chars, each piece or '.'
    const pieceMap={'wK':'K','wQ':'Q','wR':'R','wB':'B','wN':'N','wP':'P',
                    'bK':'k','bQ':'q','bR':'r','bB':'b','bN':'n','bP':'p'};
    let b='';
    for(let r=0;r<8;r++)for(let c=0;c<8;c++)b+=state.board[r][c]?pieceMap[state.board[r][c]]:'.';
    const ep=state.enPassant?toAlgebraic(...state.enPassant):'-';
    const ca=(state.castling.wK?'K':'')+(state.castling.wQ?'Q':'')+(state.castling.bK?'k':'')+(state.castling.bQ?'q':'');
    const hist=state.history.map(m=>toAlgebraic(m.fr,m.fc)+toAlgebraic(m.tr,m.tc)+(m.promote||'')).join(',');
    return JSON.stringify({b,t:state.turn,ep,ca:ca||'-',h:hist||''});
  }

  function deserialize(s){
    const d=JSON.parse(s);
    const rmap={'K':'wK','Q':'wQ','R':'wR','B':'wB','N':'wN','P':'wP',
                'k':'bK','q':'bQ','r':'bR','b':'bB','n':'bN','p':'bP'};
    const board=Array(8).fill(null).map(()=>Array(8).fill(null));
    for(let i=0;i<64;i++){const ch=d.b[i];if(ch!=='.')board[Math.floor(i/8)][i%8]=rmap[ch];}
    const ep=d.ep==='-'?null:[8-parseInt(d.ep[1]),d.ep.charCodeAt(0)-97];
    const ca=d.ca;
    const castling={wK:ca.includes('K'),wQ:ca.includes('Q'),bK:ca.includes('k'),bQ:ca.includes('q')};
    const history=d.h?d.h.split(',').filter(Boolean).map(s=>{
      const fr=8-parseInt(s[1]);const fc=s.charCodeAt(0)-97;
      const tr=8-parseInt(s[3]);const tc=s.charCodeAt(2)-97;
      return{fr,fc,tr,tc,promote:s[4]||undefined};
    }):[];
    return{board,turn:d.t,enPassant:ep,castling,history};
  }

  return{PIECES,initBoard,cloneBoard,color,legalMoves,allLegalMoves,applyMove,gameStatus,isCheck,moveToSAN,toAlgebraic,serialize,deserialize};
})();
