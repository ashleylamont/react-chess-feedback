import React, {useState} from "react";
import './Board.css'
import {getCharacter, isEven} from "../Util";
import Tile from "./Tile";
import Game from '../backend/Game'
import {isInConditionToPromote} from "../backend/piecelogic/Pawn";

const Board = (props) => {
    const ranks = Array(8).fill().map((x,i) => 8-i)
    const files = Array(8).fill().map((x,i) => getCharacter(i))

    const initialTiles = ranks.map((rank, i) =>
        files.map((file, j) => ({
                    id: `${rank}${file}`,
                    color: isEven(i + j) ? 'white' : 'color',
                    highlight: false,
                    highlightPossibleMoves: null
                }
            )
        )
    )

    const [tileStates, setTileStates] = useState(initialTiles)
    const [highlightedCoord, setHighlightedCoord] = useState(null)
    const [chesspos, setChessPos] = useState(props.chesspos)
    const [game, setGame] = useState(new Game())
    const [highlightedPossibleMoves, setHighlightedPossibleMoves] = useState([])

    const controlTile = (coords) => {
        const newStates = [...tileStates]
        const hasHighlight = highlightedCoord !== null;
        const row = hasHighlight ? highlightedCoord.row : null
        const col = hasHighlight ?  highlightedCoord.col : null
        const row2 = coords.row
        const col2 = coords.col
        const hasPiece = chesspos.get(row2, col2) !== 'x';

        unhighlightPossibleMoves(newStates)
        if(hasPiece && hasHighlight){ //Tries to take a piece
            //Takes an enemy piece
            if(chesspos.getColor(row, col) !== chesspos.getColor(row2, col2)) tryPlay(newStates, row, col, row2, col2)
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
        const possibleMoves = game.getPossibleMoves(row, col)
        for(let i = 0; i < possibleMoves.length; i++){
            newStates[possibleMoves[i].row][possibleMoves[i].col] = {...newStates[possibleMoves[i].row][possibleMoves[i].col], highlightPossibleMoves: chesspos.getColor(row, col)}
        }
        setHighlightedPossibleMoves(possibleMoves)
    }

    const unhighlightPossibleMoves = (newStates) => {
        for(let i = 0; i < highlightedPossibleMoves.length; i++){
            newStates[highlightedPossibleMoves[i].row][highlightedPossibleMoves[i].col] = {...newStates[highlightedPossibleMoves[i].row][highlightedPossibleMoves[i].col], highlightPossibleMoves: null}
        }
    }

    const tryPlay = (newStates, row, col, newRow, newCol) => {
        newStates[row][col] = {...newStates[row][col], highlight: false}
        const promotion = askPawnPromotion(row, col, newRow, newCol)
        if(promotion === null) return
        let newPos = game.play(row, col, newRow, newCol)
        setHighlightedCoord(null)
        if(newPos === null) return;
        setChessPos(newPos)
    }

    const askPawnPromotion = (row, col, newRow, newCol, msg) => {
        if(!isInConditionToPromote(row, col, newRow, newCol, chesspos)) return
        if(msg === undefined) msg = ''
        const color = chesspos.getColor(row, col)
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
                                  piece={chesspos.get(row, col)}
                            />
                        )
                    )
                }
            </div>
        </div>
    )
}

export default Board