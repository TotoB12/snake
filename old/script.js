const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const gridSize = 20;
const tileCount = canvas.width / gridSize;

let snake = [
    { x: Math.floor(tileCount / 2), y: Math.floor(tileCount / 2) },
];

let apple = {
    x: Math.floor(Math.random() * tileCount),
    y: Math.floor(Math.random() * tileCount),
};

let velocity = { x: 0, y: 0 };

function gameLoop() {
    update();
    draw();
    setTimeout(gameLoop, 100);
}

function update() {
    const head = { x: snake[0].x + velocity.x, y: snake[0].y + velocity.y };

    // Wall collision
    if (head.x < 0) head.x = tileCount - 1;
    if (head.x >= tileCount) head.x = 0;
    if (head.y < 0) head.y = tileCount - 1;
    if (head.y >= tileCount) head.y = 0;

    // Self collision
    for (let segment of snake) {
        if (head.x === segment.x && head.y === segment.y) {
            // Reset the game
            snake = [{ x: Math.floor(tileCount / 2), y: Math.floor(tileCount / 2) }];
            velocity = { x: 0, y: 0 };
            return;
        }
    }

    snake.unshift(head);

    // Apple collision
    if (head.x === apple.x && head.y === apple.y) {
        apple.x = Math.floor(Math.random() * tileCount);
        apple.y = Math.floor(Math.random() * tileCount);
    } else {
        snake.pop();
    }
}

function draw() {
    // Draw checkerboard background
    for (let y = 0; y < tileCount; y++) {
        for (let x = 0; x < tileCount; x++) {
            if ((x + y) % 2 === 0) {
                ctx.fillStyle = '#555'; // Darker grey
            } else {
                ctx.fillStyle = '#666'; // Lighter grey
            }
            ctx.fillRect(x * gridSize, y * gridSize, gridSize, gridSize);
        }
    }

    // Draw snake
    ctx.fillStyle = '#0f0';
    for (let segment of snake) {
        ctx.fillRect(
            segment.x * gridSize,
            segment.y * gridSize,
            gridSize - 2,
            gridSize - 2
        );
    }

    // Draw apple
    ctx.fillStyle = '#f00';
    ctx.fillRect(
        apple.x * gridSize,
        apple.y * gridSize,
        gridSize - 2,
        gridSize - 2
    );
}

document.addEventListener('keydown', (e) => {
    switch (e.key) {
        case 'ArrowLeft':
            if (velocity.x === 0) velocity = { x: -1, y: 0 };
            break;
        case 'ArrowUp':
            if (velocity.y === 0) velocity = { x: 0, y: -1 };
            break;
        case 'ArrowRight':
            if (velocity.x === 0) velocity = { x: 1, y: 0 };
            break;
        case 'ArrowDown':
            if (velocity.y === 0) velocity = { x: 0, y: 1 };
            break;
    }
});

gameLoop();
