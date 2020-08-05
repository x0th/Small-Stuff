extern crate graphics;
extern crate piston;
extern crate glutin_window;
extern crate opengl_graphics;

use glutin_window::GlutinWindow as Window;
use opengl_graphics::{GlGraphics, OpenGL};
use piston::event_loop::{EventSettings, Events};
use piston::input::{RenderArgs, RenderEvent, UpdateArgs, UpdateEvent};
use piston::window::WindowSettings;
use std::fs::File;
use std::io::prelude::*;
use std::collections::HashMap;
use rand::Rng;

#[derive(Debug)]
enum State {
	Any,
	Def,
	Num(u32),
	Offset((i32, i32))
}

#[derive(Debug)]
struct Rule {
	curr_state: State,
	neighbors: Vec<(State, State)>,
	next_state: State
}

// @Improvement: bound rules to the board object
#[derive(Debug)]
struct Board<'a> {
	board: Vec<Vec<u32>>,
	num_of_states: u32,
	size: usize,
	// @Unused so far. Cubed, hexagonal, etc
	board_type: u32,
	colors: &'a HashMap<u32, [f32; 4]>
}

pub struct App {
    gl: GlGraphics,
    rotation: f64,
}

impl Rule {
	fn from_string(s: &str) -> Rule {
		let curr_state: State;
		let mut neighbors: Vec<(State, State)> = Vec::new();
		let next_state: State;

		let split: Vec<&str> = s.split("->").collect();
		
		if split[0] == "*" { curr_state = State::Any; }
		else               { curr_state = State::Num(split[0].parse().unwrap()); }

		let neighbor_split: Vec<&str> = split[1].split(";").collect();
		for n in neighbor_split {
			let s: Vec<&str> = n.split(":").collect();
			let mut s0 = State::Any;
			let mut s1 = State::Any;

			if s[0].contains("(") && s[0].contains(")") {
				let s2: Vec<&str> = s[0].split(|c| c == '(' || c == ')').collect::<Vec<&str>>()[1].split(",").collect();
				s0 = State::Offset((s2[1].parse().unwrap(), s2[0].parse().unwrap()));
			} else if s[0] != "*" {
				s0 = State::Num(s[0].parse().unwrap());
			}
			if s[1] != "*" { s1 = State::Num(s[1].parse().unwrap()); }
			
			neighbors.push((s0, s1));
		}

		if split[2] == "*" { next_state = State::Any; }
		else               { next_state = State::Num(split[2].parse().unwrap()); }
		
		Rule { curr_state: curr_state, neighbors: neighbors, next_state: next_state }
	}

	fn from_string_multiple(s: &str) -> Vec<Rule> {
		let mut v: Vec<Rule> = Vec::new();

		let stage1: Vec<&str> = s.split(" | ").collect();
		for s1 in stage1 {
			let build: Vec<&str> = s1.split("->").collect();
			let stage2: Vec<&str> = build[0].split('|').collect();
			for s2 in stage2 {
				v.push(Rule::from_string(&format!("{}->{}->{}", s2, build[1], build[2])));
			}
		}

		v
	}

	fn def_from_string(s: &str) -> Rule {
		let split: Vec<&str> = s.split("->").collect();
		Rule { curr_state: State::Num(split[0].parse().unwrap()), neighbors: vec![(State::Def, State::Def)], next_state: State::Num(split[1].parse().unwrap()) }
	}

	fn def_from_string_multiple(s: &str) -> Vec<Rule> {
		let mut v: Vec<Rule> = Vec::new();

		let stage1: Vec<&str> = s.split(" | ").collect();
		for s1 in stage1 {
			let build: Vec<&str> = s1.split("->").collect();
			let stage2: Vec<&str> = build[0].split('|').collect();
			for s2 in stage2 {
				v.push(Rule::def_from_string(&format!("{}->{}", s2, build[1])));
			}
		}

		v
	}

	fn read_from_file(path: String) -> (Vec<Rule>, Vec<Rule>) {
		let mut f = File::open(path).unwrap();
		let mut content = String::new();
		f.read_to_string(&mut content).unwrap();
		let lines = content.lines().collect::<Vec<&str>>();
		
		let mut rules: Vec<Rule> = Vec::new();
		let mut defaults: Vec<Rule> = Vec::new();

		// @Improvement instead of having 2 categories, make 1 that sorts the rules based on number of '->'
		let mut i = 0;
		while i < lines.len() {
			if &lines[i].trim() == &"@RULES" {
				i += 1;
				while i < lines.len() && &lines[i].trim() != &"" {
					if !lines[i].contains('#') {
						rules.append(&mut Rule::from_string_multiple(&lines[i].trim()));
					}

					i += 1;
				}
			} else if &lines[i].trim() == &"@DEFAULTS" {
				i += 1;
				while i < lines.len() && &lines[i].trim() != &"" {
					if !lines[i].contains('#') {
						defaults.append(&mut Rule::def_from_string_multiple(&lines[i].trim()));
					}

					i += 1;
				}
			}

			i += 1;
		}

		(rules, defaults)
	}
}

impl Board<'_> {
	// @Implement other board types
	fn new(size: usize, num_of_states: u32, board_type: u32, colors: &HashMap<u32, [f32; 4]>) -> Board {
		// Cubed board, the only option right now
		if board_type == 0 {
			let mut b = Vec::new();
			for s in 0..size { b.push(Vec::new()); for _s in 0..size { b[s].push(0); } }

			Board { board: b, num_of_states: num_of_states, size: size, board_type: 0, colors: colors }
		} else {
			panic!("Panic!!!");
		}
	}

	fn state_by_point(&self, point: (usize, usize)) -> u32 {
		self.board[point.0][point.1]
	}

	fn print(&self) {
		for h in 0..self.size {
			for w in 0..self.size {
				print!("{:?} ", self.board[h][w]);
			}
			println!("");
		}
	}

	fn get_eight_neighbors(point: (usize, usize), max: usize) -> Vec<(usize, usize)> {
		let mut v = Vec::new();
		for i in -1..2 {
			for j in -1..2 {
				if i == 0 && j == 0 { continue; }
				v.push(Board::get_point_by_offset(point, (i, j), max));
			}
		}
		v
	}

	// @Improvement: does not handle wraparound. Not need it now, maybe still do it for good practice?
	fn get_point_by_offset(point: (usize, usize), offset: (i32, i32), max: usize) -> (usize, usize) {
		let x: usize;
		let y: usize;

		if (point.0 as i32) + offset.0 < 0 {
			x = ((max + point.0) as i32 + offset.0 + 1) as usize;
		} else if ((point.0 as i32 + offset.0) as usize) > max {
			x = (offset.0 as usize) - (max - point.0 + 1);
		} else {
			x = (point.0 as i32 + offset.0) as usize;
		}
		if (point.1 as i32) + offset.1 < 0 {
			y = ((max + point.1) as i32 + offset.1 + 1) as usize;
		} else if ((point.1 as i32 + offset.1) as usize) > max {
			y = (offset.1 as usize) - (max - point.1 + 1) ;
		} else {
			y = (point.1 as i32 + offset.1) as usize;
		}
		(x, y)
	}
}

impl App {
    fn render(&mut self, args: &RenderArgs, b: &Board) {
        use graphics::*;

        const GRAY:  [f32; 4] = [220.0/255.0, 220.0/255.0, 220.0/255.0, 1.0];

        let square = rectangle::square(0.0, 0.0, args.window_size[0] / (b.size as f64) - 1.0);
        let _rotation = self.rotation;

        let (mut x, mut y) = (0.0, 0.0);

        self.gl.draw(args.viewport(), |c, gl| {
            clear(GRAY, gl);

		    for i in 0..b.size {
				for j in 0..b.size {
					x = (j as f64 / b.size as f64) * args.window_size[0];
					y = (i as f64 / b.size as f64) * args.window_size[1];

					let transform = c
	                .transform
	                .trans(x, y);

	                rectangle(*b.colors.get(&b.state_by_point((i, j))).unwrap(), square, transform, gl);
				}
        	}
        });
    }
}


fn parse_rule(neighbors: &Vec<(State, State)>, board: &Board, num_neighbors: &Vec<u32>, point: (usize, usize)) -> bool {
	let mut valid = true;
	for neighbor in neighbors {
		match neighbor.0 {
			State::Num(t) => {
				match neighbor.1 {
					State::Num(n) => {
						if num_neighbors[t as usize] != n { valid = false; break; }
					},
					State::Offset((_x, _y)) => {
						panic!("This should not happen.")
					},
					_             => {
						continue;
					}
				}
			},
			State::Offset(o) => {
				if let State::Num(n) = neighbor.1 {
					if board.state_by_point(Board::get_point_by_offset(point, o, board.size - 1)) != n { valid = false; break; }
				} else {
					continue;
				}
			},
			State::Any    => {
				match neighbor.1 {
					State::Num(n) => {
						if !num_neighbors.contains(&n) { valid = false; break; }
					},
					State::Offset((_x, _y)) => {
						panic!("This should not happen.");
					},
					_             => {
						continue;
					}
				}
			},
			_             => {
				continue;
			}
		}
	}
	valid
}

fn state_from_rules(state: u32, board: &Board, num_neighbors: &Vec<u32>, point: (usize, usize), rules: &Vec<Rule>, default_return: &Vec<Rule>) -> u32 {
	for rule in rules {
		if let State::Num(r) = rule.curr_state {
			if r == state {
				if parse_rule(&rule.neighbors, board, num_neighbors, point) { if let State::Num(ret) = rule.next_state{ return ret; } }
			}
		} else if let State::Any = rule.curr_state {
			if parse_rule(&rule.neighbors, board, num_neighbors, point) { if let State::Num(ret) = rule.next_state{ return ret; } }
		}
	}
	
	for d in default_return {
		if let State::Num(st) = d.curr_state {
			if state == st {
				if let State::Num(ret) = d.next_state{ return ret; }
			}
		}
	}

	let (x, y) = point;
	panic!("No resolution for cell [{}, {}] found.", x, y);
}

fn next_state<'a>(b: &'a mut Board, rules: &'a Vec<Rule>, default_return: &'a Vec<Rule>) {
	let mut n = Board::new(b.size, b.num_of_states, b.board_type, b.colors);

	let mut num_neighbors: Vec<u32> = Vec::new();
	for _i in 0..b.num_of_states { num_neighbors.push(0); }
	for i in 0..b.size {
		for j in 0..b.size {
			let neighbors = Board::get_eight_neighbors((i, j), b.size - 1);
			for neighbor in neighbors {
				num_neighbors[b.state_by_point(neighbor) as usize] += 1;
			}

			n.board[i][j] = state_from_rules(b.state_by_point((i, j)), b, &num_neighbors, (i, j), rules, default_return);

			num_neighbors.clear(); for _i in 0..b.num_of_states { num_neighbors.push(0); }
		}
	}

	*b = n;
}

fn main() {
    let mut colors_life = HashMap::new();
    colors_life.insert(0, [0.0, 0.0, 0.0, 1.0]);
    colors_life.insert(1, [1.0, 1.0, 1.0, 1.0]);

    let mut colors_ant = HashMap::new();
    colors_ant.insert(1, [0.0, 0.0, 0.0, 1.0]);
    colors_ant.insert(0, [1.0, 1.0, 1.0, 1.0]);
    for i in 2..10 { colors_ant.insert(i, [0.0, 1.0, 0.0, 1.0]); }

    let mut colors_llrr_ant = HashMap::new();
    colors_llrr_ant.insert(0, [0.0, 0.0, 0.0, 1.0]);
    colors_llrr_ant.insert(1, [1.0, 0.0, 0.0, 1.0]);
    colors_llrr_ant.insert(2, [0.0, 1.0, 0.0, 1.0]);
    colors_llrr_ant.insert(3, [0.0, 0.0, 1.0, 1.0]);
    for i in 4..20 { colors_llrr_ant.insert(i, [1.0, 1.0, 1.0, 1.0]); }

    let mut b = Board::new(100, 10, 0, &colors_ant);
    b.board[50][50] = 2;

    let (rules, defaults) = Rule::read_from_file("../../../rules/ant.rules".to_string());

    //randomly fill the board, for life tests
   /* for i in 0..b.size {
    	for j in 0..b.size {
    		if rand::thread_rng().gen_range(0, 101) <= 50 {
    			b.board[i][j] = 1;
    		}
    	}
    }*/
    

    let opengl = OpenGL::V2_1;

    let mut window: Window = WindowSettings::new("cellular-automata", [800, 800])
        .graphics_api(opengl)
        .exit_on_esc(true)
        .build()
        .unwrap();

          let mut app = App {
        gl: GlGraphics::new(opengl),
        rotation: 0.0,
    };

     let mut events = Events::new(EventSettings::new());
    while let Some(e) = events.next(&mut window) {
        if let Some(args) = e.render_args() {
            app.render(&args, &b);
            next_state(&mut b, &rules, &defaults);
        }
    }
}
