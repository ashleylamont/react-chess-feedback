import {isInBound} from "../BackendUtils";

export const getPossiblePawnMoves = (row, col, chessPos, color, futureEnPassent) => {
    const res = [];
    const d = color ? -1 : 1
    if(!isInBound(row + d, col)) return res;
    const initialRank = color ? 6 : 1

    if (chessPos.get(row + d, col) === 'x') { //Avails square directly in front of pawn
        res.push({
            row: row + d,
            col: col
        })
        if (row === initialRank && chessPos.get(row + 2 * d, col) === 'x') {//Avails 2nd square directly in front of pawn
            let temp = createFutureEnPassent(row, col, chessPos, color)
            res.push(temp.length !== 0 ? {
                        row: row + 2 * d,
                        col: col,
                        move: {
                            type: 'normal',
                            futureEnPassent: temp
                        }
                    }
                    :
                    {
                        row: row + 2 * d,
                        col: col,
                    }
            )
        }
    }

    const checkForTake = (newRow, newCol) => {
        if (!isInBound(newRow, newCol)) return;
        if (chessPos.getColor(newRow, newCol) === !color) {
            res.push({row: newRow, col: newCol})
        }
    }
    checkForTake(row + d, col + 1)
    checkForTake(row + d, col - 1)

    if(futureEnPassent.length !== 0) {
        const checkEnPassent = (lr) => {
            let canEnPassent = false;
            for (let i = 0; i < futureEnPassent.length; i++) {
                if (futureEnPassent[i].col === col + lr && futureEnPassent[i].row === row) {
                    canEnPassent = true;
                    break;
                }
            }
            if (canEnPassent) {
                res.push({
                    row: row + d,
                    col: col + lr,
                    move: {
                        type: 'enpassent'
                    }
                })
            }
        }

        checkEnPassent(-1)
        checkEnPassent(1)
    }

    return res;
}

//Searches for any enemy pieces that should have the option to play en passent
function createFutureEnPassent(row, col, chessPos, color) {
    const d = color ? -1 : 1
    const res = []
    const newRow = row + 2 * d
    if (isInBound(newRow, col + 1)) if (chessPos.getColor(newRow, col + 1) === !color) {
        res.push({
            row: newRow,
            col: col
        });
    }
    if (isInBound(newRow, col - 1)) if (chessPos.getColor(newRow, col - 1) === !color) {
        res.push({
            row: newRow,
            col: col
        });
    }
    return res;
}