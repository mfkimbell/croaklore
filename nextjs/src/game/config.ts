// Board dimensions - change these to resize the game board
export const BOARD_CONFIG = {
	width: 12,  // Number of tiles horizontally
	height: 12, // Number of tiles vertically
};

// Performance settings - adjust these to balance quality vs performance
export const RENDER_CONFIG = {
	// Device Pixel Ratio: Controls render resolution
	// - 0.5 = Half resolution (fastest, blurry)
	// - 1.0 = Full resolution (balanced)
	// - 1.5 = High resolution (slower, sharper)
	// - 2.0 = Ultra resolution (slowest, crispest)
	dpr: [0.3, 1.5] as [number, number], // [min, max] - browser picks based on device performance
	
	// Antialiasing: Smooths jagged edges
	// - false = No smoothing (faster, pixelated edges)
	// - true = Smooth edges (slower, cleaner look)
	antialias: false,
	
	// Power Preference: Tells GPU how to prioritize
	// - "default" = Let browser decide (balanced)
	// - "high-performance" = Prioritize speed over battery
	// - "low-power" = Prioritize battery over speed
	powerPreference: "high-performance" as const,
};

export type BoardConfig = typeof BOARD_CONFIG;
export type RenderConfig = typeof RENDER_CONFIG;


