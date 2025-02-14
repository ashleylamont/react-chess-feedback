import {ChessPosition} from "./ChessPosition";
import {getPossibleKnightMoves} from "./piecelogic/Knight";
import {checkPieceColor} from "./BackendUtils";
import {getPossiblePawnMoves} from "./piecelogic/Pawn";
import {getPossibleRookMoves} from "./piecelogic/Rook";
import {getPossibleBishopMoves} from "./piecelogic/Bishop";
import {getPossibleQueenMoves} from "./piecelogic/Queen";
import {getPossibleKingMoves} from "./piecelogic/King";
import TFRPositionLog from "./TFRPositionLog";

class Game{

    chessPos = ChessPosition.getDefaultPosition()
    turn = true;
    futureEnPassent = [];
    isInCheck;
    hasStarted = false;

    hasMoved = {
        K: false,
        k: false,
        Rl: false,
        rl: false,
        rr: false,
        Rr: false
    }

    gameResult = null;
    hasGameEnded = false;
    movesWithoutProgress = 0;
    currentMoveHasProgress = false;
    positionLog
    insufficientMatingMaterial = false;

    constructor(){
        this.updateIsInCheck()
        this.positionLog = new TFRPositionLog(this)
    }
    play(row, col, newRow, newCol, promotion){
        const move = this.getMove(row, col, newRow, newCol)
        if(move === null) return null;
        //Make moves
        if(!this.hasStarted) this.hasStarted = true;
        this.futureEnPassent = []; //Reset en passent possibility
        if(move.futureEnPassent !== undefined) this.futureEnPassent = move.futureEnPassent
        if(promotion !== undefined && promotion !== null) move.promote(promotion)
        this.currentMoveHasProgress = this.getCurrentMoveProgress(row, col, newRow, newCol)
        const hasTakenPiece = this.chessPos.get(newRow, newCol) !== 'x'
        this.chessPos = move.chessPos;
        // this is great, love these clearly named high-level methods
        this.updateHasMoved(move)
        this.switchTurn()
        this.updateIsInCheck()
        this.scanCheckmateAndStalemate();
        this.insufficientMatingMaterial = this.hasInsufficientMatingMaterial();
        this.positionLog.log(row, col, newRow, newCol, hasTakenPiece)
        if(this.turn === true && !this.hasGameEnded) {
            this.handleFiftyMovesRule()
            this.currentMoveHasProgress = false;
        }
        return this.chessPos;
    }

    hasInsufficientMatingMaterial(){
        let blackNum = 0;
        let whiteNum = 0;
        let whiteBishopFlags = [false, false] //black square, white square
        let blackBishopFlags = [false, false]
        for(let row = 0; row < 8; row++){
            for(let col = 0; col < 8; col++){
                switch (this.chessPos.get(row, col).toLowerCase()){ //Immediately returns false if rook/queen/pawn spotted
                    case "r": return false;
                    case "q": return false;
                    case "p": return false;
                    default: break;
                }
                if(this.chessPos.get(row, col).toLowerCase() !== 'k') {
                    if (this.chessPos.getColor(row, col) === true) {
                        if (this.chessPos.get(row, col) !== 'B') whiteNum++;
                        else {
                            if (this.chessPos.getSquareColor(row, col) && !whiteBishopFlags[1]) {
                                whiteNum++;
                                whiteBishopFlags[1] = true;
                            }
                            if (!this.chessPos.getSquareColor(row, col) && !whiteBishopFlags[0]) {
                                whiteNum++;
                                whiteBishopFlags[0] = true;
                            }
                        }
                    }
                    if (this.chessPos.getColor(row, col) === false) {
                        if (this.chessPos.get(row, col) !== 'b') whiteNum++;
                        else {
                            if (this.chessPos.getSquareColor(row, col) && !blackBishopFlags[1]) {
                                blackNum++;
                                blackBishopFlags[1] = true;
                            }
                            if (!this.chessPos.getSquareColor(row, col) && !blackBishopFlags[0]) {
                                blackNum++;
                                blackBishopFlags[0] = true;
                            }
                        }
                    }
                }
            }
        }
        console.log(whiteNum + " " + blackNum)
        return whiteNum + blackNum < 2;
    }

    handleFiftyMovesRule(){
        if(this.currentMoveHasProgress) this.movesWithoutProgress = 0;
        else this.movesWithoutProgress++;
    }

    getCurrentMoveProgress(row, col, row2, col2){
        if(this.chessPos.get(row, col).toLowerCase() === 'p') return true;
        if(this.chessPos.get(row2, col2) !== 'x') return true;
        return this.currentMoveHasProgress;
    }

    scanCheckmateAndStalemate(){
        for(let row = 0; row < 8; row++){
            for(let col = 0; col < 8; col++){
                if(this.chessPos.getColor(row, col) === this.turn && this.getPossibleMoves(row, col).length > 0) return;
            }
        }
        // if(this.isInCheck) this.checkMate = true;
        // else this.staleMate = true;
        if(this.isInCheck) {
            this.gameResult = {
                winner: !this.turn,
                scenario: 'checkmate'
            }
        }else{
            this.gameResult = {
                winner: !this.turn,
                scenario: 'stalemate'
            }
        }
        this.hasGameEnded = true;
    }

    updateIsInCheck(){
        this.isInCheck = this.chessPos.isKingInDanger(this.turn);
    }

    updateHasMoved(){
        // if(move.hasMoved !== null) this.hasMoved[move.hasMoved] = true;
        // hasMoved is not a very clear name
        if(this.chessPos.get(0, 0) !== 'r') this.hasMoved.rl = true;
        if(this.chessPos.get(0, 7) !== 'r') this.hasMoved.rr = true;
        if(this.chessPos.get(7, 0) !== 'R') this.hasMoved.Rl = true;
        if(this.chessPos.get(7, 7) !== 'R') this.hasMoved.RR = true;
        if(this.chessPos.get(0, 4) !== 'k') this.hasMoved.k = true;
        if(this.chessPos.get(7, 4) !== 'K') this.hasMoved.K = true;
    }

    switchTurn(){
        this.turn = !this.turn;
    }

    getMove(row, col, row2, col2){
        if(!(Math.max(row2, col2) < 8)) return null; //Makes sure the values stay in bound
        if(this.chessPos.getColor(row, col) !== this.turn) return null; //Checks for the right turn
        return this.isPossibleMove(row, col, row2, col2)
    }

    isPossibleMove(row, col, row2, col2){
        const possibleMoves = this.getPossibleMoves(row, col)
        for(let i = 0; i < possibleMoves.length; i++){
            if(possibleMoves[i].row === row2 && possibleMoves[i].col === col2) return possibleMoves[i];
        }
        return null;
    }

    getPossibleMoves(row, col){
        if(this.hasGameEnded) return [];
        const piece = this.chessPos.get(row, col);
        switch(piece.toLowerCase()){
            case 'n': return getPossibleKnightMoves(row, col, this.chessPos, checkPieceColor(piece))
            case 'p': return getPossiblePawnMoves(row, col, this.chessPos, checkPieceColor(piece), this.futureEnPassent)
            case 'r': return getPossibleRookMoves(row, col, this.chessPos, checkPieceColor(piece))
            case 'b': return getPossibleBishopMoves(row, col, this.chessPos, checkPieceColor(piece))
            case 'q': return getPossibleQueenMoves(row, col, this.chessPos, checkPieceColor(piece))
            case 'k': return getPossibleKingMoves(row, col, this.chessPos, checkPieceColor(piece), this)
            default: return [];
        }
    }

    resign(losingSide){
        this.gameResult = {
            winner: !losingSide,
            scenario: 'resignation'
        }
        this.hasGameEnded = true;
    }

    draw(reason){
        this.gameResult = {
            winner: null,
            scenario: reason
        }
        this.hasGameEnded = true;
    }

    getGameResultScenario(){
        if(this.gameResult === null) return null;
        return this.gameResult.scenario;
    }
}

export default Game