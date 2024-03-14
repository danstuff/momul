import Two from 'two.js';
import TWEEN from "tween.js";

import * as ai from "./momul.ai.js";

const config =
{
    board_size : 640,
    tiles_per_row: 9,

    reserve_pieces : 4,

    ghost :
    {
        size : 0.25,
        color : 'rgba(0, 0, 0, 0.5)',
    },

    goal :
    {
        size : 0.9,
        color : 'rgba(0, 0, 0, 0.5)',
    },

    piece :
    {   
        size : 0.75,
        stroke : 5,
        selected_size : 0.85,
        selected_stroke : 10,
    },
};

var team_a =
{
    fill_color : 'rgb(0, 191, 168)',
    stroke_color : 'rgba(0, 191, 168, 0.33)',

    shape : (x, y) => 
    {
        return new Two.Star(x, y, 1, 1, 3);
    },
    shape_target : (r) => 
    {
        return { innerRadius: r*2, outerRadius: r*2 };
    },

    goal_x : 0,
    goal_y : config.tiles_per_row - 1,
};

var team_b = 
{
    fill_color : 'rgb(191, 0, 168)',
    stroke_color : 'rgba(191, 0, 168, 0.33)',

    shape : (x, y) => 
    {
        return new Two.Circle(x, y, 1);
    },
    shape_target : (r) => 
    {
        return { radius: r };
    },

    goal_x : config.tiles_per_row - 1,
    goal_y : 0,
};

var ai_lock = false;
var winner_lock = false;

var two;

function startup($root) 
{
    config.tile_size = Math.floor(config.board_size / config.tiles_per_row);
    ai.startup(config);

    two = new Two(
    {
        type: Two.Types.svg,
        fullscreen: false,
        width: 640,
        height: 640,
    }).appendTo($root[0]);

    setupTeam(team_a);
    setupTeam(team_b);

    putBoard();

    putPiece(team_a, 0, 5);
    putPiece(team_a, 1, 6);
    putPiece(team_a, 2, 7);
    putPiece(team_a, 3, 8);

    putPiece(team_b, 5, 0);
    putPiece(team_b, 6, 1);
    putPiece(team_b, 7, 2);
    putPiece(team_b, 8, 3);

    two.bind('update', () => 
    {
        TWEEN.update();
    }).play();

    $root.on("click", (e) => 
    {
        let cx = e.pageX - $root.offset().left
        let cy = e.pageY - $root.offset().top

        let tx = Math.floor(cx / config.tile_size);
        let ty = Math.floor(cy / config.tile_size);

        if (!isInside(tx, ty) || ai_lock || winner_lock)
        {
            return;
        }
        
        if (movePiece(team_a, tx, ty)) 
        {
            if (tx == team_b.goal_x && 
                ty == team_b.goal_y)
            {
                endGame("You win!");
            }
            else
            {
                ai_lock = true;

                let best_move;
                setTimeout(() =>
                {
                    best_move = ai.findBestMove(team_b);
                }, 250);
                setTimeout(() =>
                {
                    movePiece(team_b, best_move[0], best_move[1]);
                }, 500);
                setTimeout(() =>
                {
                    movePiece(team_b, best_move[2], best_move[3]);
                    if (best_move[2] == team_a.goal_x &&
                        best_move[3] == team_a.goal_y)
                    { 
                        endGame("Computer wins!");
                    }
                    ai_lock = false;
                }, 1000);
            }
        }
        updateGhosts(team_a);

        if (winner_lock)
        {
        }
    });
}

function setupTeam(team)
{
    team.pieces = [];
    team.piece_selected = null;
    team.ghosts = [];
    team.reserve_pieces = config.reserve_pieces;
    team.enemy = (team == team_a) ? team_b : team_a;
}

function putBoard()
{
    let lines = [];

    for (let x = 0; x <= config.board_size; x += config.tile_size)
    {
        lines.push(new Two.Line(x, 0, x, config.board_size))
    }

    for (let y = 0; y <= config.board_size; y += config.tile_size)
    {
        lines.push(new Two.Line(0, y, config.board_size, y));
    }

    let board = new Two.Group(lines);
    two.add(board);

    putPiece(team_a, team_a.goal_x, team_a.goal_y, "goal");
    putPiece(team_b, team_b.goal_x, team_b.goal_y, "goal");
}

function putPiece(team, tx, ty, variation, override_shape, override_shape_target)
{
    let piece_x = tx*config.tile_size + config.tile_size/2;
    let piece_y = ty*config.tile_size + config.tile_size/2;
    let tile_radius = config.tile_size/2;

    let piece = override_shape ? 
        override_shape(piece_x, piece_y) : team.shape(piece_x, piece_y);

    if (variation)
    {
        piece.fill = config[variation].color;
        piece.stroke = '';
    }
    else
    {
        piece.fill = team.fill_color;
        piece.stroke = team.stroke_color;
        piece.linewidth = 5;
        variation = "piece";
    }

    let target_radius = tile_radius*config[variation].size;
    let target = override_shape_target ? 
        override_shape_target(target_radius) : team.shape_target(target_radius);

    const tween = new TWEEN.Tween(piece)
        .to(target, 250)
        .easing(TWEEN.Easing.Cubic.Out)
        .start();

    two.add(piece);

    let variation_list = variation + "s";
    if (team[variation_list])
    {
        team[variation_list].push(piece);
    }
}

function movePiece(team, tx, ty)
{
    if (team.piece_selected)
    {
        if (ai.isValidMove(team, team.piece_selected, tx, ty))
        {
            setPiecePos(team.piece_selected, tx, ty);
            removeEnemyPiece(team, tx, ty);

            setPieceSelected(team, null);
            return true;
        }
        else if (ai.isValidMul(team, team.piece_selected, tx, ty))
        {
            team.reserve_pieces--;

            putPiece(team, tx, ty);
            removeEnemyPiece(team, tx, ty);

            setPieceSelected(team, null);
            return true;
        }
    }

    let piece_clicked = ai.getPiece(team, tx, ty);
    if (piece_clicked)
    {
        setPieceSelected(team, piece_clicked);
    }
    return false;
}

function updateGhosts(team)
{
    for (let i in team.ghosts)
    {
        two.remove(team.ghosts[i]);
    }
    team.ghosts = [];

    if (team.piece_selected)
    {
        ai.forEachTile((x, y) =>
        {
            if (ai.isValidMove(team, team.piece_selected, x, y))
            {
                putPiece(team, x, y, "ghost");
            }
            else if (ai.isValidMul(team, team.piece_selected, x, y))
            {
                putPlusGhost(team, x, y);
            }
        });
    }
}

function putPlusGhost(team, x, y)
{
    function plus_shape(x, y)
    {
        let t = 0.25;
        let vertices = 
        [
            new Two.Anchor( -1, -t ),
            new Two.Anchor( -1,  t ),
            new Two.Anchor( -t,  t ),
            new Two.Anchor( -t,  1 ),
            new Two.Anchor(  t,  1 ),
            new Two.Anchor(  t,  t ),
            new Two.Anchor(  1,  t ),
            new Two.Anchor(  1, -t ),
            new Two.Anchor(  t, -t ),
            new Two.Anchor(  t, -1 ),
            new Two.Anchor( -t, -1 ),
            new Two.Anchor( -t, -t ),
        ];
        let path = new Two.Path(vertices, true);
        path.position.x = x;
        path.position.y = y;
        return path;
    }
    
    function plus_shape_target(radius)
    {
        return { scale: radius };
    }

    putPiece(team, x, y, "ghost", plus_shape, plus_shape_target);
}

function removeEnemyPiece(team, tx, ty)
{
    let enemy_piece = ai.getPiece(team.enemy, tx, ty);

    if (enemy_piece)
    {
        two.remove(enemy_piece);
        team.enemy.pieces.splice(team.enemy.pieces.indexOf(enemy_piece), 1);
        team.enemy.piece_selected = null;
    }
}


function setPiecePos(piece, tx, ty)
{    
    let px = tx*config.tile_size + config.tile_size/2;
    let py = ty*config.tile_size + config.tile_size/2;

    let t = 200 + Math.sqrt(
        Math.pow(piece.position.x - px, 2) + 
        Math.pow(piece.position.y - py, 2));

    const tween = new TWEEN.Tween(piece.position)
        .to({x: px, y: py}, t)
        .easing(TWEEN.Easing.Exponential.Out)
        .start();
}

function isInside(tx, ty)
{
    return (tx < config.tiles_per_row && ty < config.tiles_per_row && tx >= 0 && ty >= 0);
}

function setPieceSelected(team, piece)
{
    if (team.piece_selected)
    {
        const deselect = new TWEEN.Tween(team.piece_selected)
            .to({ linewidth: config.piece.stroke }, 100)
            .easing(TWEEN.Easing.Cubic.Out)
            .start();
        team.piece_selected = null;
    }

    if (piece)
    {
        const select = new TWEEN.Tween(piece)
            .to({ linewidth: config.piece.selected_stroke }, 100)
            .easing(TWEEN.Easing.Cubic.Out)
            .start();
        team.piece_selected = piece;
    }
}

function endGame(text)
{
    two.add(new Two.Text(text, two.width/2, two.height/2, { size: 32 }));
    winner_lock = true;
}

export { startup };
