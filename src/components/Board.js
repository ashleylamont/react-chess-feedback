import React, {useState} from "react";
import '../css/Board.css'
import {getCharacter, isEven} from "../Util";
import Tile from "./Tile";
import Game from '../backend/Game' // Unused import
import {isInConditionToPromote} from "../backend/piecelogic/Pawn";

import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import {def} from "./ToastOptions";
import EngineCzechka from "../backend/engine/EngineCzechka";
import tile from "./Tile"; // Unused import

/* Overall thoughts for this file:
- You have a lot of useState hooks that probably don't need to be a useState.
- I'd strongly advocate for pulling the logic out of the Board component and into a hook or store, for things like highlighting tiles, or calculating check squares.
-- https://react.dev/learn/reusing-logic-with-custom-hooks
-- Really, a lot of this should be separated out into a hook that contains all of the code for this in a more structured format, and then just exposes the bits needed to render the UI, and some functions to control the game.
-- Stores are often useful for this kind of thing, but I think a hook would be better here since you don't really need to share the state with other components, and just want to encapsulate the logic.
 */

const Board = (props) => {
    const ranks = Array(8).fill().map((x,i) => 8-i)
    const files = Array(8).fill().map((x,i) => getCharacter(i))

    const initialTiles = ranks.map((rank, i) =>
        files.map((file, j) => ({
                    id: `${rank}${file}`,
                    color: isEven(i + j) ? 'white' : 'color',
                    highlight: false,
                    highlightPossibleMoves: null,
                }
            )
        )
    )

    const [tileStates, setTileStates] = useState(initialTiles)
    const [highlightedCoord, setHighlightedCoord] = useState(null)
    const [chessPos, setChessPos] = useState(props.chesspos)
    const [game, setGame] = useState(props.game) // Why is this a state variable? You never update it, just use the prop value directly, use useRef, or useMemo
    const [highlightedPossibleMoves, setHighlightedPossibleMoves] = useState([])
    const [engineBlack, setEngineBlack] = useState(new EngineCzechka(game, false)) // Same thing here, if you just want a value that doesn't recreate itself, use useMemo or useRef
    const [engineWhite, setEngineWhite] = useState(new EngineCzechka(game, true)) // Same thing here, if you just want a value that doesn't recreate itself, use useMemo or useRef

    const getCheckSquare = () => {
        if(!game.isInCheck) return {row: null, col: null};
        return game.chessPos.getKingPosition(game.turn)
    }

    const [checkSquare, setCheckSquare] = useState(getCheckSquare()) // this would be a great place to use useMemo

    const controlTile = (coords) => {
        // This is a really dense function and it would be good to break it up into smaller functions
        // If you're not in the habit of writing smaller functions, find a cognitive complexity plugin for your IDE and set it to 10 or 15, and then try to get all of your functions below that threshold where possible
        const newStates = [...tileStates]
        const hasHighlight = highlightedCoord !== null;
        const row = hasHighlight ? highlightedCoord.row : null
        const col = hasHighlight ?  highlightedCoord.col : null
        const row2 = coords.row
        const col2 = coords.col
        const hasPiece = chessPos.get(row2, col2) !== 'x';

        unhighlightPossibleMoves(newStates)
        if(hasPiece && hasHighlight){ //Tries to take a piece
            //Takes an enemy piece
            if(chessPos.getColor(row, col) !== chessPos.getColor(row2, col2)) tryPlay(newStates, row, col, row2, col2)
            else { //Moves from piece to select another same colour piece
                newStates[row2][col2] = {...newStates[row2][col2], highlight: true}
                const isSamePiece = row2 === row && col2 === col;
                if(!isSamePiece) highlightPossibleMoves(newStates, row2, col2)
                setHighlightedCoord(isSamePiece ? null : coords)
            }
            newStates[row][col] =  {...newStates[row][col], highlight: false}
        }else if (hasPiece && !hasHighlight){ //Selects a piece.
            newStates[row2][col2] = {...newStates[row2][col2], highlight: true}
            highlightPossibleMoves(newStates, row2, col2)
            setHighlightedCoord(coords)
        }else if (!hasPiece && hasHighlight){ //Moves a piece
            tryPlay(newStates, row, col, row2, col2)
        }else setHighlightedCoord(null) //Attempt to select an empty square
        setTileStates(newStates)
    }

    const highlightPossibleMoves = (newStates, row, col) => {
        if(game.chessPos.getColor(row, col) !== game.turn) return;
        const possibleMoves = game.getPossibleMoves(row, col)
        for(let i = 0; i < possibleMoves.length; i++){
            newStates[possibleMoves[i].row][possibleMoves[i].col] = {...newStates[possibleMoves[i].row][possibleMoves[i].col], highlightPossibleMoves: chessPos.getColor(row, col)}
        }
        setHighlightedPossibleMoves(possibleMoves)
    }

    const unhighlightPossibleMoves = (newStates) => {
        for(let i = 0; i < highlightedPossibleMoves.length; i++){
            newStates[highlightedPossibleMoves[i].row][highlightedPossibleMoves[i].col] = {...newStates[highlightedPossibleMoves[i].row][highlightedPossibleMoves[i].col], highlightPossibleMoves: null}
        }
    }

    const tryPlay = (newStates, row, col, newRow, newCol, useEngine) => {
        newStates[row][col] = {...newStates[row][col], highlight: false}
        const promotion = askPawnPromotion(row, col, newRow, newCol, undefined, useEngine)
        setHighlightedCoord(null)
        if(promotion === null) return
        let newPos = game.play(row, col, newRow, newCol, promotion)
        if(newPos === null) return;
        setCheckSquare(getCheckSquare())
        setChessPos(newPos)
        scanForCheckmateAndStalemate()
        scanForDraw()
        if(getEngine(game.turn) !== null){
            const engine = getEngine(game.turn);
            const playdata = engine.nextMove();
            if(playdata === null) return;
            setTimeout(() => {
                tryPlay([...newStates], playdata.row, playdata.col, playdata.move.row, playdata.move.col, engine)
            }, 200)
        }
    }

    const getEngine = (side) => {
        return side ? engineWhite : engineBlack;
    }

    const scanForDraw = () => {
        if(game.movesWithoutProgress === 50 && game.turn === true) {
            toast.info("50 moves have been made without progress. Any player may now click \"draw\" to instantly claim a draw.", def)
        }
        if(game.movesWithoutProgress >= 75){
            toast.info("75 moves have been made without progress. The game automatically ends in a draw!")
            game.draw("75moves")
        }
        if(game.positionLog.claimThreefoldRepetition){
            toast.info("Threefold repetition triggered! The game ends in a draw!")
            game.draw("threefold")
        }
        if(game.insufficientMatingMaterial){
            toast.info("There is insufficient mating material! The game ends in a draw!")
            game.draw("insufficient")
        }
    }

    const scanForCheckmateAndStalemate = () => {
        const r = game.getGameResultScenario();
        if(r === 'checkmate') toast.info("Checkmate! " + (game.turn ? 'black' : 'white') + " has won the game.", def);
        if(r === 'stalemate') toast.info("Stalemate! " + (game.turn ? 'white' : 'black') + " has no moves left. The game ends in a draw!", def);
    }

    const askPawnPromotion = (row, col, newRow, newCol, msg, useEngine) => {
        if(!isInConditionToPromote(row, col, newRow, newCol, game.chessPos)) return
        if(useEngine !== undefined) return useEngine.getPawnPromotion();
        if(msg === undefined) msg = ''
        const color = chessPos.getColor(row, col)
        const checkChoice = (choice) => {
            choice = choice.toLowerCase();
            if(choice === 'queen' || choice === 'q') return color ? 'Q' : 'q';
            if(choice === 'knight' || choice === 'n' || choice === 'k') return color ? 'N' : 'n';
            if(choice === 'bishop' || choice === 'b') return color ? 'B' : 'b';
            if(choice === 'rook' || choice === 'r') return color ? 'R' : 'r';
            return null;
        }

        const choice = prompt((msg + ' As ' + (color ? 'white' : 'black') + ', choose a piece your pawn promotes to.'))
        if(choice === null) return null
        const check = checkChoice(choice);
        if(check === null) return askPawnPromotion(row, col, newRow, newCol, 'Invalid choice! ')
        else return check;
    }

    const isInCheck = (row, col) => {
        if (checkSquare.row === null || checkSquare.col === null) return false;
        else return checkSquare.row === row && checkSquare.col === col
    }

    if(!game.hasStarted && engineWhite !== null){
        const playdata = engineWhite.nextMove();
        tryPlay([...tileStates], playdata.row, playdata.col, playdata.move.row, playdata.move.col, engineWhite)
    }

    return(
        <div className='board'>
            <div className='tiles'>
                {
                    ranks.map((rank, row) =>
                        files.map((file, col) =>
                            <Tile color={tileStates[row][col].color}
                                  key={tileStates[row][col].id}
                                  id={tileStates[row][col].id}
                                  coords={{
                                      row: row,
                                      col: col
                                  }}
                                  highlight={tileStates[row][col].highlight}
                                  highlightPossibleMoves={tileStates[row][col].highlightPossibleMoves}
                                  highlightTile={controlTile}
                                  check={isInCheck(row, col)}
                                  piece={chessPos.get(row, col)}
                            />
                        )
                    )
                }
            </div>
            <ToastContainer pauseOnHover={false}/>
        </div>
    )
}

export default Board