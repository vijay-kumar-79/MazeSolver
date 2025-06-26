# Maze Generator & Solver

A simple interactive web app to generate and solve mazes using various algorithms. Visualizes both maze generation and pathfinding step-by-step using D3.js and vanilla JavaScript.

## Live At
[Live Demo](https://vijay-kumar-79.github.io/PathFinder/)

## Features
- **Maze Generation Algorithms:**
  - Depth First Search (DFS)
  - Randomized Prim's Algorithm
  - Kruskal's Algorithm
- **Pathfinding Algorithms:**
  - Depth First Search (DFS)
  - Breadth First Search (BFS)
  - Greedy Best-First Search
  - A* Search
- **Visualization:**
  - Animated cell and wall coloring for each step
  - Adjustable animation speed (edit in code)
  - Clear and restart buttons
- **Responsive UI:**
  - Built with Bootstrap for basic layout
  - Custom CSS for dark mode and modern look

## How to Use
1. **Open `index.html` in your browser.**
2. **Select a maze generation algorithm** from the dropdown.
3. **Select a pathfinding algorithm** from the dropdown.
4. Click **Start** to generate and solve the maze.
5. Click **Clear** to reset and try again.

## Project Structure
```
maze-generator/
├── index.html         # Main HTML file
├── maze.js            # All maze logic and visualization
├── style.css          # Custom styles (dark mode)
```

## Customization
- **Grid Size:** Change `rows` and `cols` in `maze.js`.
- **Animation Speed:** Adjust `mazeGenerationSpeed` and `pathfindingSpeed` in `maze.js`.
- **Colors:** Edit the color constants at the top of `maze.js`.

## Dependencies
- [D3.js](https://d3js.org/) (via CDN)
- [Bootstrap 5](https://getbootstrap.com/) (via CDN)

## Credits
- Maze and pathfinding algorithms: classic implementations
- Visualization: D3.js

---
Enjoy exploring maze algorithms visually!
