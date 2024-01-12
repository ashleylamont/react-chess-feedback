import {isInBound} from "../BackendUtils";
import {iteratePiecePath} from "./PieceUtils";

export const getPossibleRookMoves = (row, col, chessPos, color) => {
    const res = [];

    const iterate = (dRow, dCol) => {
        return iteratePiecePath(row, col, color, chessPos, dRow, dCol, res)
    }

    iterate(1, 0);
    iterate(-1, 0);
    iterate(0, 1);
    iterate(0, -1);
    return res;
}