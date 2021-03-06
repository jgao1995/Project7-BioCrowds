const THREE = require('three');
import Grid from './grid.js'
import Agent from './agent.js'
import Marker from './marker.js'

export default class Crowd {
  constructor(renderengine, scenario) {
  	this.renderengine = renderengine;
  	this.markers = [];
  	this.agents = [];
  	this.board = new Grid(10.0, 100.0);
  	this.scenario = scenario;
  	this.debug = true;

  	this.create_agents();
  	this.populate_board();
  	this.create_markers();
  	this.renderengine.render_plane(100.0);
  	this.renderengine.render_agents(this.agents);
  	this.renderengine.render_markers(this.markers);
  }

  reset_board() {
  	this.agents = [];
  	this.debug = true;
  	this.board = new Grid(10.0, 100.0);
  	this.renderengine.clear_scene();
  }

  create_agents() {
  	var zero = new THREE.Vector3(0, 0, 0);
  	if (this.scenario === 'top-down') {
		// top row
		for (var i = 0; i < 10; i ++) {
			var pos = new THREE.Vector3(-49 + 10 * i, 1, 49);
			var goal = new THREE.Vector3(-49 + 10 * i, 1, -49);
			var color = (Math.random()*0xFFFFFF<<0);
			var agent = new Agent(i, pos, zero, goal, 2.0, color);
			this.agents.push(agent);
		}
		// bot row
		for (var i = 0; i < 10; i ++) {
			var pos = new THREE.Vector3(-49 + 10 * i, 1, -49);
			var goal = new THREE.Vector3(-49 + 10 * i, 1, 49);
			var color = (Math.random()*0xFFFFFF<<0);
			var agent = new Agent(i+10, pos, zero, goal, 2.0, color);
			this.agents.push(agent);
		}
	}
	else {
		for (var i = 0; i < 12; i++) {
			// perform rotation
			var x = Math.cos(Math.PI / 6 * i) * 30.0;
			var z = Math.sin(Math.PI / 6 * i) * 30.0;
			var pos = new THREE.Vector3(x, 1, z);
			var goal = new THREE.Vector3(-x, 1, -z);
			var color = (Math.random()*0xFFFFFF<<0);
			var agent = new Agent(i+10, pos, zero, goal, 2.0, color);
			this.agents.push(agent); 
		}
	}
  }

  populate_board() {
  	for (var i = 0; i < this.agents.length; i++) {
  		var agent = this.agents[i];
  		var gs = this.board.find_absolute_grid(agent.position.x, agent.position.z);
  		this.board.grid[gs.z][gs.x].add(agent);
  	}
  }

  create_markers() {
	for (var i = 0; i < 2000; i++) {
		var x = Math.random() * 98 - 49;
		var z = Math.random() * 98 - 49;
		var marker = new Marker(new THREE.Vector3(x, 0.5, z));
		this.markers.push(marker);
	}
  }

  /* 
	update() - for each agent in the crowd, the velocity is calculated based off of the markers that belongs to each agent. 
  */ 
  update() {
  	this.update_marker_ownership();
  	this.update_agent_velocities();
  	this.renderengine.update_agents(this.agents);
  	this.renderengine.update_markers(this.markers);
  	this.reset_ownership();
  }

  reset_ownership() {
  	for (var i = 0; i < this.agents.length; i++) {
  		this.agents[i].markers = [];
  	}

  	for (var i = 0; i < this.markers.length; i++) {
  		this.markers[i].owned = false;
  		this.markers[i].color = 0x000000;
  		this.markers[i].agent = null;
  	}
  }

  update_marker_ownership() {
  	for (var i = 0; i < this.markers.length; i++) {
  		var marker = this.markers[i];
  		if (marker.owned) {
  			continue;
  		}
  		var ngs = this.board.find_nearest_grid(marker.position.x, marker.position.z);
  		var top_left = {x: ngs.x -1, z: ngs.z - 1};
  		var top = {x: ngs.x, z: ngs.z - 1};
  		var left = {x: ngs.x - 1, z: ngs.z};
  		var grid = this.board.grid;
  		var eligible_agents = [];
  		if (top_left.z > -1 && top_left.x > -1 && grid[top_left.z][top_left.x].size > 0) {
  			grid[top_left.z][top_left.x].forEach(function(agent) {
  				eligible_agents.push(agent);
  			});
  		}
  		if (top.z > -1 && top.x > -1 && grid[top.z][top.x].size > 0) {
  			grid[top.z][top.x].forEach(function(agent) {
  				eligible_agents.push(agent);
  			});
		}
  		if (left.z > -1 && left.x > -1 && grid[left.z][left.x].size > 0) {
  			grid[left.z][left.x].forEach(function(agent) {
  				eligible_agents.push(agent);
  			});
   		}
  		if (ngs.z > -1 && ngs.x > -1 && grid[ngs.z][ngs.x].size > 0) {
  			grid[ngs.z][ngs.x].forEach(function(agent) {
  				eligible_agents.push(agent);
  			});
   		}
  		this.assign_marker_to_agent(eligible_agents, marker);
  	}
  }

  assign_marker_to_agent(agents, marker) {
  	if (agents.length === 0) {
  		marker.color = 0x000000;
  		marker.owned = false;
  		marker.agent = null;
  		return;
  	}
  	var closest = {dist: marker.position.distanceTo(agents[0].position), agent: agents[0]};
  	agents.forEach(function(agent) {
  		var test_dist = marker.position.distanceTo(agent.position);
  		if (test_dist < closest.dist) {
  			closest.dist = test_dist;
  			closest.agent = agent;
  		}
  	});
  	marker.agent = closest.agent;
  	marker.color = closest.agent.color;
  	marker.owned = true;
  	closest.agent.markers.push(marker);
  	return;
  }

  update_agent_velocities() {
  	for (var i = 0; i < this.agents.length; i++) {
  		var agent = this.agents[i];
  		if (agent.position.distanceTo(agent.goal) > 8.0) {
	  		var old_gs = this.board.find_absolute_grid(agent.position.x, agent.position.z);

	  		// computing total marker influence
	  		var G = new THREE.Vector3().subVectors(agent.goal, agent.position)
	  		var total_weight = 0.0;
	  		var total_velocity = new THREE.Vector3(0, 0, 0);
	  		for (var j = 0; j < agent.markers.length; j++) {
	  			var marker = agent.markers[j];
	  			var m = new THREE.Vector3().subVectors(marker.position, agent.position);
	  			m.y = 0.0;
	  			var weight = (1.0 + m.dot(G) / (m.length() * G.length())) / (1.0 + m.length());
	  			total_weight += weight;
	  		}
	  		for (var j = 0; j < agent.markers.length; j++) {
	  			var marker = agent.markers[j];
	  			var m = new THREE.Vector3().subVectors(marker.position, agent.position);
	  			m.y = 0.0;
				var weight = (1.0 + m.dot(G) / (m.length() * G.length())) / (1.0 + m.length());
	  			total_velocity.add(m.multiplyScalar(weight / total_weight));
	  		}
	  		if (total_velocity.x < 0.1 || total_velocity.z < 0.1) {
	  			total_velocity.add(new THREE.Vector3(G.x, G.y, G.z).multiplyScalar(0.1));
	  		}
	  		agent.position.add(total_velocity.multiplyScalar(0.15));
	  		// check if the movement of this agent causes it to leave its current grid
			var agent_gs = this.board.find_absolute_grid(agent.position.x, agent.position.z);
			if (old_gs.x !== agent_gs.x || old_gs.z !== agent_gs.z) {
  				this.board.grid[old_gs.z][old_gs.x].delete(agent);
  				this.board.grid[agent_gs.z][agent_gs.x].add(agent);
			}
	  	}
  	}
  }
}