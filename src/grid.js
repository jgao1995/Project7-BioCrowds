const THREE = require('three');

// GRID IS ASSUMED TO BE A SQUARE
export default class Grid {
	constructor(agent_size, plane_size) {
		this.plane_size = plane_size;
		this.grid_cell_size = agent_size;
		this.grid_len = plane_size / agent_size;
		this.grid = [];
		while(this.grid.push(new Array(this.grid_len)) < this.grid_len);
		for (var i = 0; i < this.grid_len; i++) {
			for (var j = 0; j < this.grid_len; j++) {
				this.grid[i][j] = [];
			}
		}
	}

	// find_nearest_grid will be used by marker to ultimately find nearest 4 grid
	find_nearest_grid(ws_x, ws_z) {
		var tgs = this.ws_to_tgs(ws_x, ws_z);
		var gs_z = Math.round(tgs.z / this.grid_cell_size);
		var gs_x = Math.round(tgs.x / this.grid_cell_size);
		return {z: gs_z, x: gs_x};
	}

	// find_absolute_grid will be used by agent to demarcate it's exact grid location
	find_absolute_grid(ws_x, ws_z) {
		var tgs = this.ws_to_tgs(ws_x, ws_z);
		// console.log('tgs:', tgs);
		var gs_z = Math.floor(tgs.z / this.grid_cell_size);
		var gs_x = Math.floor(tgs.x / this.grid_cell_size);
		return {z: gs_z, x: gs_x};
	}

	// convert from world space to uniform grid space
	ws_to_tgs(ws_x, ws_z) {
		var half_plane_size = this.plane_size / 2.0;
		// perform translation
		var tgs_x = ws_x + 50.0;
		var tgs_z = ws_z + 50.0;
		return {x: tgs_x, z: tgs_z};
	}
}