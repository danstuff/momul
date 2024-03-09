let config = {};

function startup(_config)
{
    config = _config;
}

function getPieceX(piece)
{
    return Math.floor(piece.position.x / config.tile_size);
}

function getPieceY(piece)
{
    return Math.floor(piece.position.y / config.tile_size);
}

function getPiece(team, tx, ty)
{
    for (let i in team.pieces)
    {
        let piece = team.pieces[i];
        if (tx == getPieceX(piece) && ty == getPieceY(piece))
        {
            return piece;
        }
    }
    return null;
}

function forEachTile(callback)
{
    for (let x = 0; x <= config.tiles_per_row; x++)
    {
        for (let y = 0; y <= config.tiles_per_row; y++)
        {
            let r = callback(x, y);
            if (r)
            {
                return r;
            }
        }
    }
}

function forEachPiece(team, callback)
{
    for (let i in team.pieces)
    {
        let r = callback(team.pieces[i]);
        if (r)
        {
            return r;
        }
    }
}

function forEach(array, callback)
{
    for (let i in array)
    {
        let r = callback(array[i]);
        if (r)
        {
            return r;
        }
    }
}

function isValidMove(team, piece, tx, ty)
{
    let px = getPieceX(piece);
    let py = getPieceY(piece);

    let dx = tx - px;
    let dy = ty - py;

    if (dx && dy)
    {
        /* Prevent moving diagonally */
        return false;
    }
    else if (dx == 0 && dy == 0)
    {
        /* Prevent moves that go nowhere */
        return false;
    }   
    else if (tx == team.goal_x && ty == team.goal_y)
    {
        /* Prevent overlapping own goal */
        return false;
    }
    else
    {
        /* Do a simple raycast to check for intersecting pieces */
        let x_step = dx ? dx / Math.abs(dx) : 0;
        let y_step = dy ? dy / Math.abs(dy) : 0;

        let x = px;
        let y = py;

        do
        {
            x += x_step;
            y += y_step;

            let mp = getPiece(team, x, y);
            let ep = getPiece(team.enemy, x, y);

            if (mp || (ep && (x != tx || y != ty)))
            {
                return false;
            }
        } while (x != tx || y != ty);

        return true;
    }
}

function isValidMul(team, piece, tx, ty)
{
    let px = getPieceX(piece);
    let py = getPieceY(piece);

    return (!getPiece(team, tx, ty) &&
        team.reserve_pieces > 0 &&
        (tx == px+1 || tx == px-1) &&
        (ty == py+1 || ty == py-1))
}

function isSafeSpace(team, tx, ty)
{
    // TODO
    let safe = true;
    forEachPiece(team.enemy, (piece) =>
    {
        if (isValidMove(team.enemy, piece, tx, ty) ||
            isValidMul(team.enemy, piece, tx, ty))
        {
            safe = false;
        }
    });
    return safe;
}

function onSameSide(pivot, a, b)
{
    return (a < pivot && b < pivot) || (a > pivot && b > pivot);
}

function isDefense(team, tx, ty)
{
    //TODO
    let defense = false;
    forEachPiece(team.enemy, (piece) =>
    {
        let goal_valid = isValidMove(team.enemy, piece, team.goal_x, team.goal_y) ||
            isValidMul(team.enemy, piece, team.goal_x, team.goal_y);

        let tile_valid = isValidMove(team.enemy, piece, team.goal_x, team.goal_y) ||
            isValidMul(team.enemy, piece, team.goal_x, team.goal_y);

        let same_side = onSameSide(getPieceX(piece), tx, team.goal_x) ||
            onSameSide(getPieceY(piece), ty, team.goal_y);
        
        if (goal_valid && tile_valid && same_side)
        {
            defense = true;
        }
    });
    return defense;
}

function manhattan(x0, y0, x1, y1)
{
    return Math.abs(x1-x0) + Math.abs(y1-y0);
}

function shuffle(array)
{
    /* Simple Fisher-Yates shuffle */
    let i = array.length;
    while (i > 0)
    {
        let j = Math.floor(Math.random() * i);
        i--;

        [array[i], array[j]] = [array[j], array[i]];
    }
}

function findBestMove(team)
{
    let candidates = 
    {
        a : [], /* Valid defense moves */
        b : [], /* Valid and safe attack moves */
        c : [], /* Valid and safe neutral moves */
        d : [], /* Remaining valid moves */
    }; 

    /* Search every piece and tile for valid moves */
    forEachPiece(team, (piece) =>
    {
        forEachTile((tx, ty) =>
        {
            if (isValidMove(team, piece, tx, ty) || 
                isValidMul(team, piece, tx, ty))
            {
                let move = [ getPieceX(piece), getPieceY(piece), tx, ty ];
                if (isDefense(team, tx, ty))
                {
                    candidates.a.push(move);
                }
                else if (isSafeSpace(team, tx, ty))
                {   
                    if (getPiece(team.enemy, tx, ty))
                    {
                        candidates.b.push(move);
                    }
                    else
                    {
                        candidates.c.push(move);
                    }
                }
                else
                {
                    candidates.d.push(move);
                }
            }
            
        });
    });

    /* Randomize moves */
    forEach(candidates, shuffle);

    /* Prioritize moves that get you closer to the enemy goal */
    forEach(candidates, (array) =>
    {
        function compare(a, b) 
        {
            return manhattan(team.enemy.goal_x, team.enemy.goal_y, a[2], a[3]) < 
                manhattan(team.enemy.goal_x, team.enemy.goal_y, b[2], b[3])
        }
        array.sort(compare);
    });

    /* Return first result out of all gathered moves */
    return forEach(candidates, (array) =>
    {
        if (array.length > 0)
        {
            return array[0];
        }
    });
}

export { startup, getPiece, forEachTile, isValidMove, isValidMul, findBestMove };
