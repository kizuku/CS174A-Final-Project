import {defs, tiny} from "./examples/common.js";

const{
    Vector, Vector3, vec, vec3, vec4, color, Shader, Matrix, Mat4, Light, Shape, Material, Scene, Texture,
} = tiny;

export class Text_Line extends Shape                
{                           // **Text_Line** embeds text in the 3D world, using a crude texture 
                            // method.  This Shape is made of a horizontal arrangement of quads.
                            // Each is textured over with images of ASCII characters, spelling 
                            // out a string.  Usage:  Instantiate the Shape with the desired
                            // character line width.  Then assign it a single-line string by calling
                            // set_string("your string") on it. Draw the shape on a material
                            // with full ambient weight, and text.png assigned as its texture 
                            // file.  For multi-line strings, repeat this process and draw with
                            // a different matrix.
  constructor( max_size )
    { super( "position", "normal", "texture_coord" );
      this.max_size = max_size;
      var object_transform = Mat4.identity();
      for( var i = 0; i < max_size; i++ )
      {                                       // Each quad is a separate Square instance:
        defs.Square.insert_transformed_copy_into( this, [], object_transform );
        object_transform.post_multiply( Mat4.translation( 1.5,0,0 ) );
      }
    }
  set_string( line, context )
    {           // set_string():  Call this to overwrite the texture coordinates buffer with new 
                // values per quad, which enclose each of the string's characters.
      this.arrays.texture_coord = [];
      for( var i = 0; i < this.max_size; i++ )
        {
          var row = Math.floor( ( i < line.length ? line.charCodeAt( i ) : ' '.charCodeAt() ) / 16 ),
              col = Math.floor( ( i < line.length ? line.charCodeAt( i ) : ' '.charCodeAt() ) % 16 );

          var skip = 3, size = 32, sizefloor = size - skip;
          var dim = size * 16,  
              left  = (col * size + skip) / dim,      top    = (row * size + skip) / dim,
              right = (col * size + sizefloor) / dim, bottom = (row * size + sizefloor + 5) / dim;

          this.arrays.texture_coord.push( ...Vector.cast( [ left,  1-bottom], [ right, 1-bottom ],
                                                          [ left,  1-top   ], [ right, 1-top    ] ) );
        }
      if( !this.existing )
        { this.copy_onto_graphics_card( context );
          this.existing = true;
        }
      else
        this.copy_onto_graphics_card( context, ["texture_coord"], false );
    }
}

export class FinalProject extends Scene {
    constructor() {
        super();

        this.shapes = {
            sphere: new defs.Subdivision_Sphere(4),
            cube: new defs.Cube(),
            text: new Text_Line(35)
        };

        this.materials = {
            test: new Material(new defs.Phong_Shader(),
                {ambient: .4, diffusivity: .6, color: color(1,1,1,1)}),
            text_image: new Material(new defs.Textured_Phong(), { ambient: 1, diffusivity: 0, specularity: 0,  texture: new Texture( "assets/text.png" ) })
        }

        this.initial_camera_location = Mat4.look_at(vec3(0, 10, 25), vec3(0, 0, 0), vec3(0, 1, 0));
        this.score = 0;
        this.counter = 0;
        this.playing = 0;
        this.game_start_time;

        //cube variables

        this.newcube_time = 0.0; //sets the next timestamp when a cube should be spawned
        this.cube_array = []; //stores cube matrixes between displays
        this.cube_size = 1; //CUBE SIZE CONSTANT HERE
        
        //starting location of the player sphere
        this.player_position = Mat4.identity().post_multiply(Mat4.translation(0, 0, 10));
        this.player_sphere_size = 1;

        //variables for sphere movement
        this.movement_amplitude = 7; //how much to move left and right by, would make this a constant but apparently classwide constants dont exist in js for some reason
        this.move_left = 0;
        this.move_right = 0;
        this.move_up = 0;
        this.move_down = 0;

    }

    make_control_panel() {
        // Draw the scene's buttons, setup their actions and keyboard shortcuts, and monitor live measurements.
        this.key_triggered_button("Start Game", ["c"], this.game_start);
        

        //keys for movement_amplitude
        this.key_triggered_button("Move Left", ["a"], () => this.move_left = 1, undefined, () => this.move_left = 0);
        this.key_triggered_button("Move Right", ["d"], () => this.move_right = 1, undefined, () => this.move_right = 0);
        this.key_triggered_button("Move Up", ["w"], () => this.move_up = 1, undefined, () => this.move_up = 0);
        this.key_triggered_button("Move Down", ["s"], () => this.move_down = 1, undefined, () => this.move_down = 0);
    }

    game_start() {
        //decided to move this into a function because a number of states have to be reset to make sure everything works between restarting 
        if(this.playing) {
            this.playing = 0;
            return;
        }
        this.playing = 1;
        this.cube_array = []; //emptying the cube array
        this.newcube_time = 0;
        
    }



    cube_handler(context, program_state, model_transform) {
        //CONSTANTS FOR CUBES
        
        const spawn_cube_interval = 1; //Number of seconds between spawning cubes
        const spawn_cube_interval_decrease = 0; //TODO maybe, increase cube spawn rate, currently doesn't work
        
        //x bounds for spawning cubes
        const left_spawn_bound = -10;
        const right_spawn_bound = 10;
        //z position to spawn
        const spawn_z = -20;

        //y position for spawning, probably 0
        const spawn_y = 0;

        //z position to despawn at 
        const despawn_z = 20; //change this to >20 to avoid the despawn while in frame
        
        const initial_cube_speed = 5; //speed of cubes going down
        const cube_speed_acceperation = 0.1; //how much faster cubes go per seconds

        const t = (program_state.animation_time - this.game_start_time)/1000;
        const dt = program_state.animation_delta_time/1000;

        //beginning cube creation and what not
        //decide whether to spawn a new cube
        if(t >= this.newcube_time) {
            //spawn a new cube here and change time for new cube to be spawned
            //random location between left and right bounds
            let cube_spawn_location = Math.random() * (right_spawn_bound - left_spawn_bound) + left_spawn_bound;

            //set the matrix for everything here and put it into our list of cube matricies

            let new_cube_transform = model_transform.post_multiply(Mat4.translation(cube_spawn_location, spawn_y, spawn_z));
            this.cube_array.push(new_cube_transform);

            //increment new cubetime to prepare spawning new cube 
            this.newcube_time = t + spawn_cube_interval;
        }
        

        //draw cubes here
        var i;
        for(i = 0; i < this.cube_array.length; i++) {

            //first check collisions, if collided then stop
            if(this.collision_detection(this.player_position, this.cube_array[i])) {
                //collision detected, abort
                this.playing = 0;

                //TODO LOSE CONDITION HERE
            }
            let new_cube_transform = this.cube_array[i].copy();

            //scale the cube, this is why we need a copy, scaling after moving is a lot easier than dealing with the scaling
            new_cube_transform = new_cube_transform.post_multiply(Mat4.scale(this.cube_size, this.cube_size, this.cube_size));
            
            //draw cube
            this.shapes.cube.draw(context, program_state, new_cube_transform, this.materials.test.override({color: color(1, 1, 0, 1)}));
            

            //move the cube for the next loop
            this.cube_array[i] = this.cube_array[i].post_multiply(Mat4.translation(0,0, (initial_cube_speed + cube_speed_acceperation * t) * dt));
            
            //delete cube if out of bounds
            //apparently extracting a single element from a matrix is a pain, functionality should really be added to the library 

            if(this.cube_array[i][2][3] > despawn_z) {
                this.cube_array.splice(i, 1); //remove if out of bounds
            }
            
        }
        


    }

    move_sphere(program_state) {
        const dt = program_state.animation_delta_time/1000;
        const x_bounds = 10; //bounds where the sphere can move left and right by, centered around x=0

        const z_upper = 0; //upper z bound, say "upper" but less than lower since we view in -z direction, so decrease to increase
        const z_lower = 10;
        //bound won't be strict here, we just test if we already out of bounds, if a movement takes us further out of bounds we do not do it
        if(this.move_right) {
            if(this.player_position[0][3] < x_bounds) {
                this.player_position = this.player_position.post_multiply(Mat4.translation(this.movement_amplitude * dt, 0, 0));
            } 
        }
        if(this.move_left) {
            if(this.player_position[0][3] > -x_bounds) {
                this.player_position = this.player_position.post_multiply(Mat4.translation(-this.movement_amplitude * dt, 0, 0));
            }
        }

        if(this.move_up) {
            if(this.player_position[2][3] > z_upper) {
                this.player_position = this.player_position.post_multiply(Mat4.translation(0, 0, -this.movement_amplitude * dt));
            }
        }
        if(this.move_down) {
            if(this.player_position[2][3] < z_lower) {
                this.player_position = this.player_position.post_multiply(Mat4.translation(0, 0, this.movement_amplitude * dt));
            }
        }
    }

    collision_detection(sphere_matrix, cube_matrix) {
        //extract positions for ease of use
        let cube = vec3(cube_matrix[0][3], cube_matrix[1][3], cube_matrix[2][3]);
        let sphere = vec3(sphere_matrix[0][3], sphere_matrix[1][3], sphere_matrix[2][3]);

        //quick and dirty pythagorean theorem here to check if its close enough to require further checks

        let deltax = cube[0] - sphere[0];
        let deltay = cube[1] - sphere[1];
        let deltaz = cube[2] - sphere[2];
        

        //checking if distance between two centers is greater than sphere_radius + sqrt(2) * cube_radius, in which case no collision possible
        //quick and dirty, should rule out most objects
        let maxdist = this.player_sphere_size + Math.sqrt(2) * this.cube_size;
        if(deltax * deltax + deltay * deltay + deltaz * deltaz > maxdist * maxdist) {
            return false;
        }
        
        //now we do further checks
        //source for general idea of this collision https://stackoverflow.com/questions/27517250/sphere-cube-collision-detection-in-opengl
        //basically calculate point on sphere closest to cube center, and check if its inside. 

        //these deltas act as rays between the sphere and cube center, so I can find this point by manipulating that

        let delta = vec3(deltax, deltay, deltaz);

        delta.normalize();

        //scale by radius to find point

        delta.scale_by(this.player_sphere_size);

        let closestPoint = sphere.plus(delta);
        let cubeRadius = this.cube_size;
        //now check if we are within the cube
        
        //y checked last because y doesn't matter in this game 
        if(cube[0] - cubeRadius < closestPoint[0] && cube[0] + cubeRadius > closestPoint[0] &&
           cube[2] - cubeRadius < closestPoint[2] && cube[2] + cubeRadius > closestPoint[2] &&
           cube[1] - cubeRadius < closestPoint[1] && cube[1] + cubeRadius > closestPoint[1]) {
               return true;
           }
        return false;
        

    }

    //TODO cousins, we really should cleanup this display function, looks wack
    display(context, program_state) {
        // display():  Called once per frame of animation.
        // Setup -- This part sets up the scene's overall camera matrix, projection matrix, and lights:
        if (!context.scratchpad.controls) {
            // this.children.push(context.scratchpad.controls = new defs.Movement_Controls());
            // Define the global camera and projection matrices, which are stored in program_state.
            program_state.set_camera(this.initial_camera_location);
        }

        program_state.projection_transform = Mat4.perspective(
            Math.PI / 4, context.width / context.height, .1, 1000);

        const t = program_state.animation_time / 1000, dt = program_state.animation_delta_time / 1000;


        //fiat lux
        const light_position = vec4(0, 10, 5, 1);
        program_state.lights = [new Light(light_position, color(1, 1, 1, 1), 100)];

        //begin placing things
        let model_transform = Mat4.identity();
        model_transform = model_transform.post_multiply(Mat4.translation(0, 0, 5));
       

        //changed the sphere to spawn based on this.player_position
        //going to move the sphere before anything
        this.move_sphere(program_state);
        this.shapes.sphere.draw(context, program_state, this.player_position, this.materials.test.override({color: color(1, 1, 0, 1)}));

        let cube_transform = Mat4.identity().post_multiply(Mat4.translation(0, -3, -5)).post_multiply(Mat4.scale(20, 2, 30));
        this.shapes.cube.draw(context, program_state, cube_transform, this.materials.test.override({color: color(1, 0, 0, 1)}));
        
        let scoreboard_transform = Mat4.identity().post_multiply(Mat4.translation(-8, 8, -30));
        this.shapes.text.set_string("Score: " + this.score.toString(), context.context);
        this.shapes.text.draw(context, program_state, scoreboard_transform, this.materials.text_image);

        if (this.playing) {
            this.cube_handler(context, program_state, Mat4.identity());
            this.counter += 1; //TODO score currently tied to framerate, please use dt to detach it. 
            if (this.counter == 20) {
                this.counter = 0;
                this.score += 1;
            }
        }
        else {
            this.score = 0;
            this.game_start_time = program_state.animation_time; //just going to updat the animation_time here until the game starts so we have a start reference
            //has to be done because game_start doesn't have access to program_state unfortunately 
        }
    }
}

class Gouraud_Shader extends Shader {
    // This is a Shader using Phong_Shader as template
    // TODO: Modify the glsl coder here to create a Gouraud Shader (Planet 2)

    constructor(num_lights = 2) {
        super();
        this.num_lights = num_lights;
    }

    shared_glsl_code() {
        // ********* SHARED CODE, INCLUDED IN BOTH SHADERS *********
        return ` 
        precision mediump float;
        const int N_LIGHTS = ` + this.num_lights + `;
        uniform float ambient, diffusivity, specularity, smoothness;
        uniform vec4 light_positions_or_vectors[N_LIGHTS], light_colors[N_LIGHTS];
        uniform float light_attenuation_factors[N_LIGHTS];
        uniform vec4 shape_color;
        uniform vec3 squared_scale, camera_center;

        // Specifier "varying" means a variable's final value will be passed from the vertex shader
        // on to the next phase (fragment shader), then interpolated per-fragment, weighted by the
        // pixel fragment's proximity to each of the 3 vertices (barycentric interpolation).
        varying vec3 N, vertex_worldspace;
        varying vec4 vertexColor;
        // ***** PHONG SHADING HAPPENS HERE: *****                                       
        vec3 phong_model_lights( vec3 N, vec3 vertex_worldspace ){                                        
            // phong_model_lights():  Add up the lights' contributions.
            vec3 E = normalize( camera_center - vertex_worldspace );
            vec3 result = vec3( 0.0 );
            for(int i = 0; i < N_LIGHTS; i++){
                // Lights store homogeneous coords - either a position or vector.  If w is 0, the 
                // light will appear directional (uniform direction from all points), and we 
                // simply obtain a vector towards the light by directly using the stored value.
                // Otherwise if w is 1 it will appear as a point light -- compute the vector to 
                // the point light's location from the current surface point.  In either case, 
                // fade (attenuate) the light as the vector needed to reach it gets longer.  
                vec3 surface_to_light_vector = light_positions_or_vectors[i].xyz - 
                                               light_positions_or_vectors[i].w * vertex_worldspace;                                             
                float distance_to_light = length( surface_to_light_vector );

                vec3 L = normalize( surface_to_light_vector );
                vec3 H = normalize( L + E );
                // Compute the diffuse and specular components from the Phong
                // Reflection Model, using Blinn's "halfway vector" method:
                float diffuse  =      max( dot( N, L ), 0.0 );
                float specular = pow( max( dot( N, H ), 0.0 ), smoothness );
                float attenuation = 1.0 / (1.0 + light_attenuation_factors[i] * distance_to_light * distance_to_light );
                
                vec3 light_contribution = shape_color.xyz * light_colors[i].xyz * diffusivity * diffuse
                                                          + light_colors[i].xyz * specularity * specular;
                result += attenuation * light_contribution;
            }
            return result;
        } `;
    }

    vertex_glsl_code() {
        // ********* VERTEX SHADER *********
        return this.shared_glsl_code() + `
            attribute vec3 position, normal;                            
            // Position is expressed in object coordinates.
            
            uniform mat4 model_transform;
            uniform mat4 projection_camera_model_transform;
    
            void main(){                                                                   
                // The vertex's final resting place (in NDCS):
                gl_Position = projection_camera_model_transform * vec4( position, 1.0 );
                // The final normal vector in screen space.
                N = normalize( mat3( model_transform ) * normal / squared_scale);
                vertex_worldspace = ( model_transform * vec4( position, 1.0 ) ).xyz;
                // color calculation
                vec4 color = vec4(shape_color.xyz * ambient, shape_color.w);
                color.xyz += phong_model_lights(normalize(N), vertex_worldspace);
                vertexColor = color;
            } `;
    }

    fragment_glsl_code() {
        // ********* FRAGMENT SHADER *********
        // A fragment is a pixel that's overlapped by the current triangle.
        // Fragments affect the final image or get discarded due to depth.
        return this.shared_glsl_code() + `
            void main(){                                                           
                // Compute an initial (ambient) color:
                gl_FragColor = vertexColor;
            } `;
    }

    send_material(gl, gpu, material) {
        // send_material(): Send the desired shape-wide material qualities to the
        // graphics card, where they will tweak the Phong lighting formula.
        gl.uniform4fv(gpu.shape_color, material.color);
        gl.uniform1f(gpu.ambient, material.ambient);
        gl.uniform1f(gpu.diffusivity, material.diffusivity);
        gl.uniform1f(gpu.specularity, material.specularity);
        gl.uniform1f(gpu.smoothness, material.smoothness);
    }

    send_gpu_state(gl, gpu, gpu_state, model_transform) {
        // send_gpu_state():  Send the state of our whole drawing context to the GPU.
        const O = vec4(0, 0, 0, 1), camera_center = gpu_state.camera_transform.times(O).to3();
        gl.uniform3fv(gpu.camera_center, camera_center);
        // Use the squared scale trick from "Eric's blog" instead of inverse transpose matrix:
        const squared_scale = model_transform.reduce(
            (acc, r) => {
                return acc.plus(vec4(...r).times_pairwise(r))
            }, vec4(0, 0, 0, 0)).to3();
        gl.uniform3fv(gpu.squared_scale, squared_scale);
        // Send the current matrices to the shader.  Go ahead and pre-compute
        // the products we'll need of the of the three special matrices and just
        // cache and send those.  They will be the same throughout this draw
        // call, and thus across each instance of the vertex shader.
        // Transpose them since the GPU expects matrices as column-major arrays.
        const PCM = gpu_state.projection_transform.times(gpu_state.camera_inverse).times(model_transform);
        gl.uniformMatrix4fv(gpu.model_transform, false, Matrix.flatten_2D_to_1D(model_transform.transposed()));
        gl.uniformMatrix4fv(gpu.projection_camera_model_transform, false, Matrix.flatten_2D_to_1D(PCM.transposed()));

        // Omitting lights will show only the material color, scaled by the ambient term:
        if (!gpu_state.lights.length)
            return;

        const light_positions_flattened = [], light_colors_flattened = [];
        for (let i = 0; i < 4 * gpu_state.lights.length; i++) {
            light_positions_flattened.push(gpu_state.lights[Math.floor(i / 4)].position[i % 4]);
            light_colors_flattened.push(gpu_state.lights[Math.floor(i / 4)].color[i % 4]);
        }
        gl.uniform4fv(gpu.light_positions_or_vectors, light_positions_flattened);
        gl.uniform4fv(gpu.light_colors, light_colors_flattened);
        gl.uniform1fv(gpu.light_attenuation_factors, gpu_state.lights.map(l => l.attenuation));
    }

    update_GPU(context, gpu_addresses, gpu_state, model_transform, material) {
        // update_GPU(): Define how to synchronize our JavaScript's variables to the GPU's.  This is where the shader
        // recieves ALL of its inputs.  Every value the GPU wants is divided into two categories:  Values that belong
        // to individual objects being drawn (which we call "Material") and values belonging to the whole scene or
        // program (which we call the "Program_State").  Send both a material and a program state to the shaders
        // within this function, one data field at a time, to fully initialize the shader for a draw.

        // Fill in any missing fields in the Material object with custom defaults for this shader:
        const defaults = {color: color(0, 0, 0, 1), ambient: 0, diffusivity: 1, specularity: 1, smoothness: 40};
        material = Object.assign({}, defaults, material);

        this.send_material(context, gpu_addresses, material);
        this.send_gpu_state(context, gpu_addresses, gpu_state, model_transform);
    }
}

class Ring_Shader extends Shader {
    update_GPU(context, gpu_addresses, graphics_state, model_transform, material) {
        // update_GPU():  Defining how to synchronize our JavaScript's variables to the GPU's:
        const [P, C, M] = [graphics_state.projection_transform, graphics_state.camera_inverse, model_transform],
            PCM = P.times(C).times(M);
        context.uniformMatrix4fv(gpu_addresses.projection_camera_model_transform, false,
            Matrix.flatten_2D_to_1D(PCM.transposed()));
    }

    shared_glsl_code() {
        // ********* SHARED CODE, INCLUDED IN BOTH SHADERS *********
        return `
        precision mediump float;
        varying vec4 point_position;
        varying vec4 center;
        `;
    }

    vertex_glsl_code() {
        // ********* VERTEX SHADER *********
        // TODO:  Complete the main function of the vertex shader (Extra Credit Part II).
        return this.shared_glsl_code() + `
        attribute vec3 position;
        uniform mat4 model_transform;
        uniform mat4 projection_camera_model_transform;
        
        void main(){
          
        }`;
    }

    fragment_glsl_code() {
        // ********* FRAGMENT SHADER *********
        // TODO:  Complete the main function of the fragment shader (Extra Credit Part II).
        return this.shared_glsl_code() + `
        void main(){
          
        }`;
    }
}