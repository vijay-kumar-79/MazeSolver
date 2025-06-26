// Get references to DOM elements
const maze = document.getElementById("mazeSvg") // SVG element for drawing the maze
const mazeDiv = document.getElementById("mazeDiv") // Container div for the maze
const startButton = document.getElementById("startButton") // Start button
const clearButton = document.getElementById("clearButton") // Clear button

// Color palette for maze visualization
const athensGray = "#E4E8EC" // Visited cell color
const glacier = "#7BA6C2"    // In-progress cell color
const azure = "#396FB8"      // Path color
const stormGray = "#666C85"  // Explored node color
const mirage = "#1A1D30"     // Wall color
const pink = "#FFC0CB"       // Final path color

// Maze grid and cell properties
const [rows, cols] = [10, 16] // Number of rows and columns
const cellSize = 12           // Size of each cell in pixels
const wallWidth = Math.floor(cellSize / 3) // Wall thickness

// SVG canvas dimensions
const svgWidth = cols * cellSize + (cols + 1) * wallWidth
const svgHeight = rows * cellSize + (rows + 1) * wallWidth

// Start and end cell coordinates
const mazeStart = [0, 0]
const mazeEnd = [rows - 1, cols - 1]

// Animation speeds (ms)
const mazeGenerationSpeed = 30
const pathfindingSpeed = 30

// Global variables for maze state
let grid, walls, existingWalls, exploredNodes, path

// Cell class represents a single cell in the maze
class Cell {
	constructor(row, col) {
		this.row = row
		this.col = col
		this.x = this.col * cellSize + (this.col + 1) * wallWidth
		this.y = this.row * cellSize + (this.row + 1) * wallWidth
		this.wallIds = {
			top: getWallId(this.row, this.col, "top"),
			right: getWallId(this.row, this.col, "right"),
			bottom: getWallId(this.row, this.col, "bottom"),
			left: getWallId(this.row, this.col, "left"),
		}
		this.color = mirage
	}
}

// Initialize the grid as a 2D array of Cell objects
function initGrid() {
	let maze = []
	for (let row = 0; row < rows; row += 1) {
		let rowArray = []
		for (let col = 0; col < cols; col += 1) {
			rowArray.push(new Cell(row, col))
		}
		maze.push(rowArray)
	}

	return maze
}

// Generate a unique wall ID for a cell and wall side
function getWallId(x, y, wallSide) {
	let [x2, y2] = [x, y]

	if (wallSide === "top") x2 -= 1
	if (wallSide === "right") y2 += 1
	if (wallSide === "bottom") x2 += 1
	if (wallSide === "left") y2 -= 1

	const [[minX, minY], [maxX, maxY]] = [
		[x, y],
		[x2, y2],
	].sort((a, b) => a[0] - b[0] || a[1] - b[1])

	return `${minX},${minY}_${maxX},${maxY}`
}

// Get wall drawing data for a given wall side and cell position
function getWallData(variant, cellX, cellY) {
	const orientationData = {
		horizontal: {
			wActiveWidth: cellSize + wallWidth * 2,
			wActiveHeight: wallWidth,
			wInactiveWidth: cellSize,
			wInactiveHeight: wallWidth,
		},

		vertical: {
			wActiveWidth: wallWidth,
			wActiveHeight: cellSize + wallWidth * 2,
			wInactiveWidth: wallWidth,
			wInactiveHeight: cellSize,
		},
	}

	const wallData = {
		top: {
			wActiveX: cellX - wallWidth,
			wActiveY: cellY - wallWidth,
			wInactiveX: cellX,
			wInactiveY: cellY - wallWidth,
			...orientationData.horizontal,
		},

		right: {
			wActiveX: cellX + cellSize,
			wActiveY: cellY - wallWidth,
			wInactiveX: cellX + cellSize,
			wInactiveY: cellY,
			...orientationData.vertical,
		},

		bottom: {
			wActiveX: cellX - wallWidth,
			wActiveY: cellY + cellSize,
			wInactiveX: cellX,
			wInactiveY: cellY + cellSize,
			...orientationData.horizontal,
		},

		left: {
			wActiveX: cellX - wallWidth,
			wActiveY: cellY - wallWidth,
			wInactiveX: cellX - wallWidth,
			wInactiveY: cellY,
			...orientationData.vertical,
		},
	}

	return wallData[variant]
}

// Wall class represents a wall between two cells
class Wall {
	constructor({ x: cellX, y: cellY, wallIds }, wallSide) {
		this.solid = true
		this.data = getWallData(wallSide, cellX, cellY)

		const {
			wActiveX: wallX,
			wActiveY: wallY,
			wActiveWidth: width,
			wActiveHeight: height,
		} = this.data

		this.x = wallX
		this.y = wallY
		this.width = width
		this.height = height

		this.class = "wall"
		this.id = wallIds[wallSide]
	}
	get color() {
		const [x1, y1, x2, y2] = this.id
			.split(RegExp("[,_]"))
			.map((n) => parseInt(n))

		const adjacentCells = [
			isCellValid(x1, y1, "cell"),
			isCellValid(x2, y2, "cell"),
		].filter((i) => typeof i === "object")

		const [colorOne, colorTwo] = [
			d3.color(adjacentCells[0]?.color),
			d3.color(adjacentCells[1]?.color),
		]

		const colorAverage =
			colorOne && colorTwo
				? d3
					.rgb(
						(colorOne.r + colorTwo.r) / 2,
						(colorOne.g + colorTwo.g) / 2,
						(colorOne.b + colorTwo.b) / 2
					)
					.formatHex()
				: colorOne
				? colorOne
				: colorTwo

		return this.solid ? mirage : colorAverage
	}

	// Set wall state (solid or removed)
	state(value) {
		const {
			wActiveX,
			wActiveY,
			wActiveWidth,
			wActiveHeight,
			wInactiveX,
			wInactiveY,
			wInactiveWidth,
			wInactiveHeight,
		} = this.data

		this.x = value ? wActiveX : wInactiveX
		this.y = value ? wActiveY : wInactiveY
		this.width = value ? wActiveWidth : wInactiveWidth
		this.height = value ? wActiveHeight : wInactiveHeight

		this.solid = value
	}
}

function initWalls() {
	walls = []

	existingWalls = new Set()

	grid.flat().forEach((d) => {
		const wallSides = ["top", "right", "bottom", "left"]
		wallSides.forEach((wallSide) => {
			const wall = new Wall(d, wallSide)
			if (!existingWalls.has(wall.id)) {
				existingWalls.add(wall.id)
				walls.push(wall)
			}
		})
	})

	return walls
}

function initExploredNodesArray() {
	return Array.from({ length: rows }, () =>
		Array.from({ length: cols }, () => false)
	)
}

function setup() {
	exploredNodes = initExploredNodesArray()
	grid = initGrid()
	walls = initWalls()
	path = []
	draw()
}

function draw() {
	const svg = d3
		.select("#mazeSvg")
		.attr("viewBox", `0 0 ${svgWidth} ${svgHeight}`)
		.attr("preserveAspectRatio", "xMidYMid meet")

	svg.selectAll(".cell")
		.data(grid.flat())
		.join("rect")
		.attr("class", "cell")
		.attr("id", (cell) => {
			return `cell_(${cell.row},${cell.col})`
		})
		.attr("x", (cell) => {
			return cell.x
		})
		.attr("y", (cell) => {
			return cell.y
		})
		.attr("width", cellSize)
		.attr("height", cellSize)
		.attr("fill", (d) => d.color)

	svg.selectAll(".wall")
		.data(walls)
		.join("rect")
		.attr("class", (d) => d.class)
		.attr("id", (d) => d.id)
		.attr("x", (d) => d.x)
		.attr("y", (d) => d.y)
		.attr("width", (d) => d.width)
		.attr("height", (d) => d.height)
		.attr("fill", (d) => d.color)
}

async function startAlgorithm(mazeAlgorithm, pathfindingAlgorithm) {
	startButton.disabled = true
	clearButton.disabled = true

	switch (mazeAlgorithm) {
		case "generateDepthFirstSearch":
			await depthFirstSearch()
			break
		case "generateRandomizedPrims":
			await randomizedPrims()
			break
		case "kruskalsAlgorithm":
			await kruskalsAlgorithm()
			break

		default:
			console.error("Please select a valid maze generation algorithm.")
			return
	}

	switch (pathfindingAlgorithm) {
		case "depthFirstSearch":
			await pathfindingDFS(mazeStart, mazeEnd)
			break
		case "breadthFirstSearch":
			await breadthFirstSearch(mazeStart, mazeEnd)
			break
		case "greedyBFS":
			await greedyBFS(mazeStart, mazeEnd)
			break
		case "aStar":
			await aStar(mazeStart, mazeEnd)
			break

		default:
			console.error("Please select a valid pathfinding algorithm.")
			return
	}

	clearButton.disabled = false
	draw()
}

startButton.addEventListener("click", () => {
	setup()
	const mazeAlgorithm = document.getElementById("mazeAlgorithmSelect").value
	const pathfindingAlgorithm = document.getElementById(
		"pathfindingAlgorithmSelect"
	).value
	startAlgorithm(mazeAlgorithm, pathfindingAlgorithm)
})

clearButton.addEventListener("click", () => {
	setup()
	startButton.disabled = false
})

function getRandomItem(array) {
	if (!Array.isArray(array)) {
		throw new Error("Input must be an array")
	}
	if (array.length === 0) {
		return -1
	}
	return array.splice(Math.floor(Math.random() * array.length), 1)[0]
}

function arrayIncludesCell(array, cell) {
	return array.some((item) => item[0] === cell[0] && item[1] === cell[1])
}

function isCellValid(row, col, expectation, visited) {
	const validRow = row >= 0 && row < rows
	const validCol = col >= 0 && col < cols
	const validCell = validRow && validCol

	if (expectation === "validity") return validCell

	if (validCell && expectation === "cell") return grid[row][col]

	if (validCell && expectation === "status")
		return exploredNodes[row][col] === visited

	return false
}

function getNeighbors(
	[row, col],
	expectation = null,
	visited = false,
	pathfinding = false
) {
	const neighbors = []
	const cell = grid[row][col]

	const directions = [
		{
			rowOffset: -1,
			colOffset: 0,
			wall: "top",
			valid: isCellValid(row - 1, col, expectation, visited),
		},
		{
			rowOffset: 0,
			colOffset: 1,
			wall: "right",
			valid: isCellValid(row, col + 1, expectation, visited),
		},
		{
			rowOffset: 1,
			colOffset: 0,
			wall: "bottom",
			valid: isCellValid(row + 1, col, expectation, visited),
		},
		{
			rowOffset: 0,
			colOffset: -1,
			wall: "left",
			valid: isCellValid(row, col - 1, expectation, visited),
		},
	]

	directions.forEach(({ rowOffset, colOffset, wall, valid }) => {
		const wallObj = walls.find((w) => w.id === cell.wallIds[wall])
		if (valid && (!pathfinding || !wallObj.solid)) {
			neighbors.push([row + rowOffset, col + colOffset])
		}
	})

	return neighbors
}

function setCellState(row, col, state) {
	if (row >= 0 && row < rows && col >= 0 && col < cols) {
		grid[row][col] = { ...grid[row][col], ...state }
	}
}

function removeWalls(row, col, nextRow, nextCol) {
	const x = row - nextRow
	const y = col - nextCol

	const wallIds = grid[row][col].wallIds

	let wallVariant = null

	if (x === 1) wallVariant = "top"
	if (y === -1) wallVariant = "right"
	if (x === -1) wallVariant = "bottom"
	if (y === 1) wallVariant = "left"

	walls.find((wall) => wall.id === wallIds[wallVariant]).state(false)
}

function reconstructPath(pathMap) {
	path = []
	let current = mazeEnd

	setCellState(current[0], current[1], { color: pink })

	while (current) {
		path.push(current)
		setCellState(current[0], current[1], { color: pink })
		current = pathMap.get(current.toString())
	}

	path = path.reverse()

	return path
}

function removeDuplicateCombinations(pairs) {
	const uniqueCombinations = new Set()

	pairs.forEach((pair) => {
		const sortedPair = pair.sort((a, b) => a[0] - b[0] || a[1] - b[1])

		uniqueCombinations.add(JSON.stringify(sortedPair))
	})
	return Array.from(uniqueCombinations).map((string) => JSON.parse(string))
}

function distance(firstRow, firstCol, secondRow, secondCol) {
	let rowDelta = secondRow - firstRow
	let colDelta = secondCol - firstCol
	return Math.sqrt(Math.pow(rowDelta, 2) + Math.pow(colDelta, 2))
}

async function depthFirstSearch() {
	let stack = [mazeStart]

	exploredNodes = initExploredNodesArray()

	while (stack.length > 0) {
		const [row, col] = stack.pop()
		exploredNodes[row][col] = true
		setCellState(row, col, { color: athensGray })

		draw()

		await new Promise((resolve) => setTimeout(resolve, mazeGenerationSpeed))

		const neighbors = getNeighbors([row, col], "status", false)

		if (!Array.isArray(neighbors) || !neighbors.length > 0) {
			setCellState(row, col, { color: azure })
			continue
		}

		const [nextRow, nextCol] = getRandomItem(neighbors)
		removeWalls(row, col, nextRow, nextCol)

		stack.push([row, col], [nextRow, nextCol])

		setCellState(row, col, { color: glacier })
		setCellState(nextRow, nextCol, { color: glacier })
	}
}

async function randomizedPrims() {
	let stack = []

	exploredNodes = initExploredNodesArray()
	exploredNodes[mazeStart[0]][mazeStart[1]] = true
	setCellState(mazeStart[0], mazeStart[1], { color: azure })

	getNeighbors(mazeStart, "status", false).forEach((neighbor) => {
		const [row, col] = neighbor
		stack.push([row, col])
		setCellState(row, col, { color: glacier })
	})

	while (stack.length > 0) {
		const [row, col] = getRandomItem(stack)

		draw()

		const neighbors = getNeighbors([row, col], "status", true)

		const [nextRow, nextCol] = getRandomItem(neighbors)

		exploredNodes[row][col] = true
		setCellState(row, col, { color: azure })
		removeWalls(row, col, nextRow, nextCol)
		getNeighbors([row, col], "status", false).forEach((neighbor) => {
			if (!arrayIncludesCell(stack, neighbor)) {
				stack.push(neighbor)
				setCellState(neighbor[0], neighbor[1], { color: glacier })
			}
		})
		await new Promise((resolve) => setTimeout(resolve, mazeGenerationSpeed))
	}
}

async function kruskalsAlgorithm() {
	let coordinatePairs = []

	let setCount = rows * cols

	for (let row = 0; row < rows; row += 1) {
		for (let col = 0; col < cols; col += 1) {
			let neighbors = getNeighbors([row, col], "validity")
			neighbors.forEach((neighbor) =>
				coordinatePairs.push([
					[row, col],
					[neighbor[0], neighbor[1]],
				])
			)
			setCellState(row, col, { parent: [row, col], set: [[row, col]] })
		}
	}

	randomizedQueue = removeDuplicateCombinations(coordinatePairs)

	while (
		Array.isArray(randomizedQueue) &&
		randomizedQueue.length > 0 &&
		setCount > 1
	) {
		const [[row, col], [neighborRow, neighborCol]] =
			getRandomItem(randomizedQueue)
		const current = grid[row][col]
		const neighbor = grid[neighborRow][neighborCol]

		removeWalls(row, col, neighborRow, neighborCol)
		setCellState(neighborRow, neighborCol, { color: azure })
		setCellState(row, col, { color: azure })

		let currentDistance = distance(row, col, mazeStart[0], mazeStart[1])
		let neighborDistance = distance(
			neighborRow,
			neighborCol,
			mazeStart[0],
			mazeStart[1]
		)

		let currentParent = grid[current.parent[0]][current.parent[1]]
		let neighborParent = grid[neighbor.parent[0]][neighbor.parent[1]]

		if (currentDistance < neighborDistance) {
			neighborParent.set.forEach((cell) => {
				let [row, col] = cell
				grid[row][col].parent = current.parent
				currentParent.set.push(cell)
			})
			neighborParent.set = null
			setCount -= 1
		}
		if (currentDistance > neighborDistance) {
			currentParent.set.forEach((cell) => {
				let [row, col] = cell
				grid[row][col].parent = neighbor.parent
				neighborParent.set.push(cell)
			})
			currentParent.set = null
			setCount -= 1
		}

		randomizedQueue = randomizedQueue.filter((pair) => {
			const [[x, y], [r, c]] = pair
			return grid[x][y].parent !== grid[r][c].parent
		})
		draw()
		await new Promise((resolve) => setTimeout(resolve, mazeGenerationSpeed))
	}
}

async function pathfindingDFS(start, end) {
	let pathMap = new Map()

	let stack = [start]

	exploredNodes = initExploredNodesArray()

	while (Array.isArray(stack) && stack.length > 0) {
		const [row, col] = stack.pop()
		setCellState(row, col, { color: athensGray })

		draw()

		if (exploredNodes[row][col] === false) {
			exploredNodes[row][col] = true
		}

		if ([row, col].toString() === end.toString()) {
			setCellState(row, col, { color: stormGray })
			return reconstructPath(pathMap)
		}

		getNeighbors([row, col], "status", false, true).forEach((neighbor) => {
			let [neighborRow, neighborCol] = neighbor

			if (exploredNodes[neighborRow][neighborCol] === false) {
				exploredNodes[neighborRow][neighborCol] = true
				if (!arrayIncludesCell(stack, neighbor)) {
					stack.push([row, col])
					stack.push(neighbor)
				}
			}
		})

		const nextNode = stack[stack.length - 1]

		if (!pathMap.has(nextNode.toString())) {
			pathMap.set(nextNode.toString(), [row, col])
		}

		await new Promise((resolve) => setTimeout(resolve, pathfindingSpeed))
		setCellState(row, col, { color: stormGray })
	}
	console.error("No path found.")
	return false
}

async function breadthFirstSearch(start, end) {
	let pathMap = new Map()
	let queue = [start]

	exploredNodes = initExploredNodesArray()

	while (Array.isArray(queue) && queue.length > 0) {
		const [row, col] = queue.shift()
		setCellState(row, col, { color: athensGray })

		draw()

		if (exploredNodes[row][col] === false) {
			exploredNodes[row][col] = true
		}

		if ([row, col].toString() === end.toString()) {
			setCellState(row, col, { color: stormGray })
			return reconstructPath(pathMap)
		}

		setCellState(row, col, { color: athensGray })

		getNeighbors([row, col], "status", false, true).forEach((neighbor) => {
			if (!arrayIncludesCell(queue, neighbor)) {
				queue.push(neighbor)
				setCellState(neighbor[0], neighbor[1], { color: glacier })
			}
			if (!pathMap.has(neighbor.toString())) {
				pathMap.set(neighbor.toString(), [row, col])
			}
		})

		await new Promise((resolve) => setTimeout(resolve, pathfindingSpeed))
		setCellState(row, col, { color: stormGray })
	}
	console.error("No path found.")
	return false
}

async function greedyBFS(start, end) {
	let pathMap = new Map()
	let queue = [start]

	exploredNodes = initExploredNodesArray()

	while (Array.isArray(queue) && queue.length > 0) {
		const [row, col] = queue.shift()
		setCellState(row, col, { color: athensGray })

		if (exploredNodes[row][col] === false) exploredNodes[row][col] = true

		if ([row, col].toString() === end.toString()) {
			setCellState(row, col, { color: stormGray })
			return reconstructPath(pathMap)
		}

		getNeighbors([row, col], "status", false, true).forEach((neighbor) => {
			const [neighborRow, neighborCol] = neighbor

			grid[neighborRow][neighborCol].distance ??=
				Math.abs(mazeEnd[0] - neighborRow) +
				Math.abs(mazeEnd[1] - neighborCol)

			queue.push(neighbor)
			setCellState(neighborRow, neighborCol, { color: glacier })

			queue.sort((a, b) => {
				const aDistance = grid[a[0]][a[1]].distance
				const bDistance = grid[b[0]][b[1]].distance

				return aDistance - bDistance
			})

			if (!pathMap.has(neighbor.toString())) {
				pathMap.set(neighbor.toString(), [row, col])
			}
		})
		draw()

		await new Promise((resolve) => setTimeout(resolve, pathfindingSpeed))

		setCellState(row, col, { color: stormGray })
	}
	console.error("No path found.")
	return false
}

async function aStar(start, end) {
	function heuristic([x, y], [endX, endY]) {
		return Math.abs(x - endX) + Math.abs(y - endY)
	}

	let pathMap = new Map()

	let openSet = [start]

	exploredNodes = initExploredNodesArray()

	grid[start[0]][start[1]].gScore ??= 0

	grid[start[0]][start[1]].fScore ??= heuristic(start, end)

	while (Array.isArray(openSet) && openSet.length > 0) {
		let [row, col] = openSet.shift()

		if (exploredNodes[row][col] === false) exploredNodes[row][col] = true

		const { gScore } = grid[row][col]

		setCellState(row, col, { color: athensGray })

		draw()

		if ([row, col].toString() === end.toString()) {
			setCellState(row, col, { color: stormGray })
			return reconstructPath(pathMap)
		}

		getNeighbors([row, col], "status", false, true).forEach(
			([nRow, nCol]) => {
				let { nGScore, nFScore } = grid[nRow][nCol]

				nGScore ??= Infinity
				nFScore ??= Infinity

				let tentativeGScore = gScore + 1
				if (tentativeGScore < nGScore) {
					pathMap.set([nRow, nCol].toString(), [row, col])
					nGScore = tentativeGScore
					nFScore = tentativeGScore + heuristic([nRow, nCol], end)

					setCellState(nRow, nCol, {
						gScore: nGScore,
						fScore: nFScore,
					})
					if (!openSet.includes([nRow, nCol])) {
						openSet.push([nRow, nCol])
						setCellState(nRow, nCol, {
							color: glacier,
						})
					}
				}
			}
		)

		openSet.sort(([aX, aY], [bX, bY]) => {
			return grid[aX][aY].fScore - grid[bX][bY].fScore
		})

		setCellState(row, col, { color: stormGray })
		await new Promise((resolve) => setTimeout(resolve, pathfindingSpeed))
	}
	console.error("No path found.")
	return false
}

setup()
