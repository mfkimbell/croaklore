export interface StaticModelConfig {
	modelUrl: string;
	// Tile coordinates (0..board-1). (0,0) is the first tile; (width-1,height-1) is the last.
	tileX: number;
	tileY: number;
	scale: number;
	rotation: number; // In radians
}

export interface StaticModelGroup {
	models: StaticModelConfig[];
}

export const staticModels: Record<string, StaticModelGroup> = {
	rucks: { models: [] },
	rocks: {
		models: [
			{ modelUrl: '/models/rock2.glb', tileX: 0, tileY: 0, scale: 5, rotation: 0.5 }, // bottom-left
			{ modelUrl: '/models/rock3.glb', tileX: 7, tileY: 7, scale: 6, rotation: 2.1 }, // top-right (for 8x8)
			{ modelUrl: '/models/rock2.glb', tileX: 0, tileY: 7, scale: 4, rotation: 1.2 }, // top-left
		]
	},
	reeds: {
		models: [
			{ modelUrl: '/models/reeds.gltf', tileX: 7, tileY: 0, scale: 3, rotation: 0 },   // bottom-right
			{ modelUrl: '/models/reeds.gltf', tileX: 3, tileY: 0, scale: 3.5, rotation: 1.5 },
			{ modelUrl: '/models/reeds.gltf', tileX: 7, tileY: 3, scale: 3, rotation: 3.1 },
			{ modelUrl: '/models/reeds.gltf', tileX: 3, tileY: 7, scale: 4, rotation: 4.7 },
		]
	}
};
