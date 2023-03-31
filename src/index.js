/* 
 * TODO:
 *  - raycasting
 *  - animations/tweening
 *  - undo stack
 */

import Two from 'two.js';
import TWEEN from "tween.js";
import $ from "jquery";

const TILE_SIZE = 80;
const TILES_PER_ROW = 8;

const PIECE_SCALE = 0.75;

const MULS_PER_TEAM = 8;

var team_a = newTeam();
var team_b = newTeam();

var two = new Two({
  type: Two.Types.svg,
  fullscreen: true
}).appendTo(document.body);

putBoard()

putPiece(team_a, 4, 0);
putPiece(team_a, 5, 1);
putPiece(team_a, 6, 2);
putPiece(team_a, 7, 3);

putPiece(team_b, 0, 4);
putPiece(team_b, 1, 5);
putPiece(team_b, 2, 6);
putPiece(team_b, 3, 7);

two.bind('update', () => {
    TWEEN.update();
}).play();

$("body").click((e) => {
    let tx = Math.floor(e.pageX / TILE_SIZE);
    let ty = Math.floor(e.pageY / TILE_SIZE);

    if (!isInside(tx, ty))
    {
        return;
    }

    movePiece(two, team_a, tx, ty);
    movePiece(two, team_b, tx, ty);

    console.log(team_a, team_b);
});

function newTeam()
{
    return {
        pieces : [],
        piece_selected : null,
        ltx : 0,
        lty : 0,
        muls_remaining : MULS_PER_TEAM,
    };
}

function putBoard()
{
    let lines = [];

    for (let x = 0; x < TILES_PER_ROW; x++)
    {
        lines.push(new Two.Line(TILE_SIZE*x, 0, TILE_SIZE*x, TILE_SIZE*TILES_PER_ROW));
    }

    for (let y = 0; y < TILES_PER_ROW; y++)
    {
        lines.push(new Two.Line(0, TILE_SIZE*y, TILE_SIZE*TILES_PER_ROW, TILE_SIZE*y));
    }

    let board = new Two.Group(lines);
    two.add(board);
    return board;
}

function putPiece(team, tx, ty)
{
    tx = Math.floor(tx);
    ty = Math.floor(ty);

    let piece = null;

    if (team == team_a)
    {
        piece = new Two.Circle(
            tx*TILE_SIZE + TILE_SIZE/2,
            ty*TILE_SIZE + TILE_SIZE/2,
            PIECE_SCALE*TILE_SIZE/2);
        piece.fill = 'rgba(191, 0, 168, 0.33)';
        piece.stroke = 'rgb(191, 0, 168)';
    }
    else if (team == team_b)
    {
        piece = new Two.Star(
            tx*TILE_SIZE + TILE_SIZE/2,
            ty*TILE_SIZE + TILE_SIZE/2,
            PIECE_SCALE*TILE_SIZE,
            PIECE_SCALE*TILE_SIZE,
            3);
        piece.fill = 'rgba(0, 191, 168, 0.33)';
        piece.stroke = 'rgb(0, 191, 168)';
    }

    piece.linewidth = 5;

    two.add(piece);
    team.pieces.push(piece);
}

function movePiece(two, team, tx, ty)
{
    let piece_clicked = getPiece(team, tx, ty);
    if (team.piece_selected && !piece_clicked && isValidMove(team, tx, ty))
    {
        setPiecePos(team.piece_selected, tx, ty);
        removeEnemyPiece(two, team, tx, ty);

        team.piece_selected = null;
    }
    else if (team.piece_selected && team.piece_selected == piece_clicked)
    {
        let ttx = team == team_a ? tx - 1 : tx + 1;
        let tty = team == team_a ? ty + 1 : ty - 1;

        if (isInside(ttx, tty) && team.muls_remaining > 0 && !getPiece(team, ttx, tty))
        {
            team.muls_remaining--;
            putPiece(team, ttx, tty);
            removeEnemyPiece(two, team, ttx, tty);
        }
        
        team.piece_selected = null;
    }
    else if (piece_clicked)
    {
        team.piece_selected = piece_clicked;
        team.ltx = tx;
        team.lty = ty;
    }
}

function removeEnemyPiece(two, team, tx, ty)
{
    let enemy_team = team == team_a ? team_b : team_a;
    let enemy_piece = getPiece(enemy_team, tx, ty);

    if (enemy_piece)
    {
        two.remove(enemy_piece);
        enemy_team.pieces.splice(enemy_team.pieces.indexOf(enemy_piece), 1);
        enemy_team.piece_selected = null;
    }
}

function getPiece(team, tx, ty)
{
    tx = Math.floor(tx);
    ty = Math.floor(ty);

    for (let i in team.pieces)
    {
        let piece = team.pieces[i];
        let pos = getPiecePos(piece)
        if (tx == pos[0] && ty == pos[1])
        {
            return piece;
        }
    }

    return null;
}

function setPiecePos(piece, tx, ty)
{    
    /* TODO tweening */
    tx = Math.floor(tx);
    ty = Math.floor(ty);

    piece.position.x = tx * TILE_SIZE + TILE_SIZE/2;
    piece.position.y = ty * TILE_SIZE + TILE_SIZE/2;
}

function getPiecePos(piece)
{
    let px = Math.floor(piece.position.x / TILE_SIZE);
    let py = Math.floor(piece.position.y / TILE_SIZE);

    return [ px, py ];
}

function isValidMove(team, tx, ty)
{
    /* TODO simple raycast to check if a piece is in the way */
    return (tx == team.ltx || ty == team.lty);
}

function isInside(tx, ty)
{
    return (tx < TILES_PER_ROW && ty < TILES_PER_ROW && tx >= 0 && ty >= 0);
}
