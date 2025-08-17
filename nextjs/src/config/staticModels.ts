export interface StaticModelConfig {
	modelUrl: string;
	// Tile coordinates (0..board-1). (0,0) is the first tile; (width-1,height-1) is the last.
	tileX: number;
	tileY: number;
	scale: number;
	rotation: number; // In radians
	height?: number; // Optional height offset in world units
	fitToTile?: number; // If provided, fit model's XZ to this fraction of a tile
}

export interface StaticModelGroup {
	models: StaticModelConfig[];
}

export const staticModels: Record<string, StaticModelGroup> = {
	rucks: { models: [] },
	rocks: {
		models: [
			{ modelUrl: '/models/rock2.glb', tileX: -2, tileY: -2, scale: 5, rotation: 0.5 }, // bottom-left outside
			{ modelUrl: '/models/rock3.glb', tileX: 14, tileY: 14, scale: 6, rotation: 2.1 }, // top-right outside
			{ modelUrl: '/models/rock2.glb', tileX: -2, tileY: 14, scale: 4, rotation: 1.2 }, // top-left outside
			{ modelUrl: '/models/rock2.glb', tileX: 14, tileY: -2, scale: 5, rotation: 3.8 }, // bottom-right outside
		]
	},
	reeds: {
		models: [
			{ modelUrl: '/models/reeds.gltf', tileX: 15, tileY: 6, scale: 3.5, rotation: 1.5 }, // right edge
			{ modelUrl: '/models/reeds.gltf', tileX: -3, tileY: 6, scale: 4, rotation: 4.7 }, // left edge
			{ modelUrl: '/models/reeds.gltf', tileX: 15, tileY: 2, scale: 3.8, rotation: 2.3 }, // right edge
		]
	},
	logs: {
		models: [
			{ modelUrl: '/models/log.glb', tileX: 6, tileY: -3, scale: 12, rotation: 0, height: -3.2 }, // Player 1 log (bottom, centered)
			{ modelUrl: '/models/log.glb', tileX: 6, tileY: 14, scale: 12, rotation: Math.PI, height: -3.2 }, // Player 2 log (top, centered, flipped 180°)
		]
	},
	handFrogs: {
		models: [
			// Bottom log tokens (facing board)
			{ modelUrl: '/models/Frog.gltf', tileX: 3, tileY: -3, scale: 1, rotation: 0, height: 1, fitToTile: 0.6 },
			{ modelUrl: '/models/Frog.gltf', tileX: 6, tileY: -3, scale: 1, rotation: 0, height: 1, fitToTile: 0.6 },
			{ modelUrl: '/models/Frog.gltf', tileX: 9, tileY: -3, scale: 1, rotation: 0, height: 1, fitToTile: 0.6 },
			// Top log tokens (facing down toward board)
			{ modelUrl: '/models/Frog.gltf', tileX: 3, tileY: 14, scale: 1, rotation: Math.PI, height: 1, fitToTile: 0.6 },
			{ modelUrl: '/models/Frog.gltf', tileX: 6, tileY: 14, scale: 1, rotation: Math.PI, height: 1, fitToTile: 0.6 },
			{ modelUrl: '/models/Frog.gltf', tileX: 9, tileY: 14, scale: 1, rotation: Math.PI, height: 1, fitToTile: 0.6 },
		]
	}
};
