# TypeScript Multiplayer Tag

This is a TypeScript multiplayer tag game project I created for my computer science final project in high school.

## Description

It's like tag and hot potato, or maybe even the cheese touch. You touch someone else to "tag" them or pass along the touch, and every 20 seconds the tagger gets eliminated.

## Features

- Real-time multiplayer gameplay
- Player movement and collision detection
- Tagging mechanics
- Chat functionality for players to communicate

## Install Server

1. Clone the repository:

    ```bash
    git clone https://github.com/XtraCube/ts-multiplayer-tag.git
    ```

2. Install dependencies:

    ```bash
    bun install
    ```

3. Build the project:

    ```bash
    bun run ./src/index.ts
    ```

4. Open your web browser and navigate to `http://localhost:3000` to play the game.

## Usage

- Use the arrow keys to move your player.
- Tag other players by colliding with them.
- Avoid being tagged by other players.
- The tagger gets eliminated every 20 seconds.

## Contributing

Contributions are welcome! If you find any bugs or have suggestions for improvements, please open an issue or submit a pull request.

## License

This project is licensed under the [MIT License](LICENSE).
