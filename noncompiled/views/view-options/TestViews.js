'use strict';

// TESTS FOR VARIOUS FIELDS 
// NOT TO BE INCLUDED IN PRODUCTION

window.ScalarWorldViewOptions = window.ScalarWorldViewOptions || {};
window.VectorWorldViewOptions = window.VectorWorldViewOptions || {};

// test for raster id placement
window.ScalarWorldViewOptions.ids = {
    scalar_raster_view_type: 'ColorscaleRasterViewResources',
    builtin_colorscale: 1, // heatmap
    scaling: true ,
    get_scalar_raster: function (crust) {
        return crust.grid.vertex_ids;
    }
};

// test for voronoi diagram used by grid.getNearestIds
// should look just like testViews.ids
window.ScalarWorldViewOptions.voronoi_ids = {
    scalar_raster_view_type: 'ColorscaleRasterViewResources',
    builtin_colorscale: 1, // heatmap
    scaling: true ,
    get_scalar_raster: function (crust) {
        return crust.grid.getNearestIds(crust.grid.pos);
    } 
};

// test for get_nearest_values - does it reconstruct the ids field after rotation?
// should look just like testViews.ids, but rotated
window.ScalarWorldViewOptions.id_rotated  = {
    scalar_raster_view_type: 'ColorscaleRasterViewResources',
    builtin_colorscale: 1, // heatmap
    scaling: true,
    get_scalar_raster: function (crust) {
        var ids = Float32Raster(crust.grid);
        Float32Raster.FromUint16Raster(crust.grid.vertex_ids, ids);
        var rotationMatrix = Matrix3x3.rotation_about_axis(1,0,0, 0.5);
        var pos = VectorField.mult_matrix(crust.grid.pos, rotationMatrix);
        return Float32Raster.get_nearest_values(ids, pos);
    }
  };

// test for Float32Raster.get_nearest_values()
// rotates the age field by a certain amount
window.ScalarWorldViewOptions.age_rotated  = {
    scalar_raster_view_type: 'ColorscaleRasterViewResources',
    builtin_colorscale: 1, // heatmap
    min: 250., max: 0.,  
    get_scalar_raster: function (crust, result) {
        var rotationMatrix = Matrix3x3.rotation_about_axis(1,0,0, 0.5);
        var pos = VectorField.mult_matrix(crust.grid.pos, rotationMatrix);
        test = Float32Raster.get_nearest_values(crust.age, pos, result);
        return test;
    } 
};

window.ScalarWorldViewOptions.eliptic_ids = {
    scalar_raster_view_type: 'ColorscaleRasterViewResources',
    builtin_colorscale: 1, // heatmap
    scaling: true,
    get_scalar_raster: function (crust) {
        var ids = Float32Raster(crust.grid);
        Float32Raster.FromUint16Raster(crust.grid.vertex_ids, ids);
        var pos = OrbitalMechanics.get_ecliptic_coordinates_raster_from_equatorial_coordinates_raster(
            crust.grid.pos,
            23.5/180*Math.PI,
            23.5/180*Math.PI
        );
        return Float32Raster.get_nearest_values(ids, pos);
    }
 };

// test for individual plate mask
window.ScalarWorldViewOptions.single_plate = {
    scalar_raster_view_type: 'ColorscaleRasterViewResources',
    builtin_colorscale: 1, // heatmap
    min: 0., max: 1.,  
    get_scalar_raster: function (world) {
        return world.plates[0].mask;
    } 
};

window.ScalarWorldViewOptions.guess_varying_surface_air_pressure_lat_effect = {
    scalar_raster_view_type: 'ColorscaleRasterViewResources',
    builtin_colorscale: 1, // heatmap
    min: -1., max: 1., 
    get_scalar_raster: function (world, effect, scratch) {
        var lat = Float32SphereRaster.latitude(world.grid.pos.y);
        AtmosphericModeling.guess_varying_surface_air_pressure_lat_effect(lat, effect);
        return effect;
    } 
};
window.ScalarWorldViewOptions.guess_varying_surface_air_pressure_land_effect = {
    scalar_raster_view_type: 'ColorscaleRasterViewResources',
    builtin_colorscale: 1, // heatmap
    min: -1., max: 1., 
    get_scalar_raster: function (world, effect, scratch) {
        var lat = Float32SphereRaster.latitude(world.grid.pos.y);
        AtmosphericModeling.guess_varying_surface_air_pressure_land_effect(world.displacement, lat, world.SEALEVEL, effect, scratch);
        return effect;
    }
};
var ANGULAR_SPEED = 1.e0;
window.ScalarWorldViewOptions.coriolis_effect = {
    get_scalar_raster: function (world) {
        var lat = Float32SphereRaster.latitude(world.grid.pos.y);
        var scratch = Float32Raster(world.grid);
        var pressure = AtmosphericModeling.guess_varying_surface_air_pressure_lat_effect(lat);
        var velocity = ScalarField.gradient(pressure);
        var coriolis_effect = AtmosphericModeling.guess_varying_surface_air_velocity_coriolis_effect(world.grid.pos, velocity, ANGULAR_SPEED)
        return coriolis_effect;
    } 
};





// test for the flood fill algorithm, AKA "magic wand select"
window.ScalarWorldViewOptions.flood_fill1 = {
    scalar_raster_view_type: 'ColorscaleRasterViewResources',
    builtin_colorscale: 1, // heatmap
    min: 1., max: 0.,
    get_scalar_raster: function (crust, flood_fill, scratch1) {
        // scratch represents pressure
        var pressure = scratch1;
        // flood_fill does double duty for performance reasons
        var scratch2 = flood_fill;
        var field = TectonicsModeling.get_asthenosphere_pressure(crust.subductability, pressure, scratch2);

        var gradient = ScalarField.gradient(pressure);
        var angular_velocity = VectorField.cross_vector_field(gradient, crust.grid.pos);
        var gradient = angular_velocity;
        
        var max_id = VectorRaster.max_id(gradient);
        var mask = Float32Raster(crust.grid, 1);
        var flood_fill = VectorRasterGraphics.magic_wand_select(gradient, max_id, mask);

        return flood_fill;
    }
};

// test for binary morphology
window.ScalarWorldViewOptions.flood_fill_white_top_hat = {
    scalar_raster_view_type: 'ColorscaleRasterViewResources',
    builtin_colorscale: 1, // heatmap
    min: 1., max: 0. ,
    get_scalar_raster: function (crust, flood_fill, scratch1) {
        // scratch represents pressure
        var pressure = scratch1;
        // flood_fill does double duty for performance reasons
        var scratch2 = flood_fill;
        var field = TectonicsModeling.get_asthenosphere_pressure(crust.subductability, pressure, scratch2);

        var gradient = ScalarField.gradient(field);
        var angular_velocity = VectorField.cross_vector_field(gradient, crust.grid.pos);
        var gradient = angular_velocity;
        
        var max_id = VectorRaster.max_id(gradient);
        var mask = Float32Raster(crust.grid, 1);
        var flood_fill = VectorRasterGraphics.magic_wand_select(gradient, max_id, mask);

        var white_top_hat = BinaryMorphology.white_top_hat(BinaryMorphology.to_binary(flood_fill), 5);
        return white_top_hat;
    }
};

// test for binary morphology
window.ScalarWorldViewOptions.flood_fill_black_top_hat = {
    scalar_raster_view_type: 'ColorscaleRasterViewResources',
    builtin_colorscale: 1, // heatmap
    min: 1., max: 0.,
    get_scalar_raster: function (crust, flood_fill, scratch1) {
        // scratch represents pressure
        var pressure = scratch1;
        // flood_fill does double duty for performance reasons
        var scratch2 = flood_fill;
        var field = TectonicsModeling.get_asthenosphere_pressure(crust.subductability, pressure, scratch2);
        var gradient = ScalarField.gradient(field);
        var angular_velocity = VectorField.cross_vector_field(gradient, crust.grid.pos);
        var gradient = angular_velocity;
        
        var max_id = VectorRaster.max_id(gradient);
        var mask = Float32Raster(crust.grid, 1);
        var flood_fill = VectorRasterGraphics.magic_wand_select(gradient, max_id, mask);

        var white_top_hat = BinaryMorphology.white_top_hat(BinaryMorphology.to_binary(flood_fill), 5);
        return white_top_hat;
    }
};

// test for binary morphology
window.ScalarWorldViewOptions.flood_fill_dilation = {
    scalar_raster_view_type: 'ColorscaleRasterViewResources',
    builtin_colorscale: 1, // heatmap
    min: 1., max: 0.,
    get_scalar_raster: function (crust, flood_fill, scratch1) {
        // scratch represents pressure
        var pressure = scratch1;
        // flood_fill does double duty for performance reasons
        var scratch2 = flood_fill;
        var field = TectonicsModeling.get_asthenosphere_pressure(crust.subductability, pressure, scratch2);
        var gradient = ScalarField.gradient(field);
        var angular_velocity = VectorField.cross_vector_field(gradient, crust.grid.pos);
        var gradient = angular_velocity;
        
        var max_id = VectorRaster.max_id(gradient);
        var mask = Float32Raster(crust.grid, 1);
        var flood_fill = VectorRasterGraphics.magic_wand_select(gradient, max_id, mask);

        var dilation = BinaryMorphology.dilation(BinaryMorphology.to_binary(flood_fill), 5);

        return BinaryMorphology.to_float(dilation);
    }
};
// test for binary morphology
window.ScalarWorldViewOptions.flood_fill_erosion = {
    scalar_raster_view_type: 'ColorscaleRasterViewResources',
    builtin_colorscale: 1, // heatmap
    min: 1., max: 0.,
    get_scalar_raster: function (crust, flood_fill, scratch1) {
        // scratch represents pressure
        var pressure = scratch1;
        // flood_fill does double duty for performance reasons
        var scratch2 = flood_fill;
        var field = TectonicsModeling.get_asthenosphere_pressure(crust.subductability, pressure, scratch2);
        var gradient = ScalarField.gradient(field);
        var angular_velocity = VectorField.cross_vector_field(gradient, crust.grid.pos);
        var gradient = angular_velocity;
        
        var max_id = VectorRaster.max_id(gradient);
        var mask = Float32Raster(crust.grid, 1);
        var flood_fill = VectorRasterGraphics.magic_wand_select(gradient, max_id, mask);

        var erosion = BinaryMorphology.erosion(BinaryMorphology.to_binary(flood_fill), crust.grid, 5);

        return BinaryMorphology.to_float(erosion);
    }
};
// test for binary morphology
window.ScalarWorldViewOptions.flood_fill_opening = {
    scalar_raster_view_type: 'ColorscaleRasterViewResources',
    builtin_colorscale: 1, // heatmap
    min: 1., max: 0.,
    get_scalar_raster: function (crust, flood_fill, scratch1) {
        // scratch represents pressure
        var pressure = scratch1;
        // flood_fill does double duty for performance reasons
        var scratch2 = flood_fill;
        var field = TectonicsModeling.get_asthenosphere_pressure(crust.subductability, pressure, scratch2);
        var gradient = ScalarField.gradient(field);
        var angular_velocity = VectorField.cross_vector_field(gradient, crust.grid.pos);
        var gradient = angular_velocity;
        
        var max_id = VectorRaster.max_id(gradient);
        var mask = Float32Raster(crust.grid, 1);
        var flood_fill = VectorRasterGraphics.magic_wand_select(gradient, max_id, mask);

        var opening = BinaryMorphology.opening(BinaryMorphology.to_binary(flood_fill), 5);

        return BinaryMorphology.to_float(opening);
    }
};
// test for binary morphology
window.ScalarWorldViewOptions.flood_fill_closing = {
    scalar_raster_view_type: 'ColorscaleRasterViewResources',
    builtin_colorscale: 1, // heatmap
    min: 1., max: 0. ,
    get_scalar_raster: function (crust, flood_fill, scratch1) {
        // scratch represents pressure
        var pressure = scratch1;
        // flood_fill does double duty for performance reasons
        var scratch2 = flood_fill;
        var field = TectonicsModeling.get_asthenosphere_pressure(crust.subductability, pressure, scratch2);
        var gradient = ScalarField.gradient(field);
        var angular_velocity = VectorField.cross_vector_field(gradient, crust.grid.pos);
        var gradient = angular_velocity;
        
        var max_id = VectorRaster.max_id(gradient);
        var mask = Float32Raster(crust.grid, 1);
        var flood_fill = VectorRasterGraphics.magic_wand_select(gradient, max_id, mask);

        var closing = BinaryMorphology.closing(BinaryMorphology.to_binary(flood_fill), 5);

        return BinaryMorphology.to_float(closing);
    }
};

// test for image segmentation algorithm
window.ScalarWorldViewOptions.flood_fill8 = {
    scalar_raster_view_type: 'ColorscaleRasterViewResources',
    builtin_colorscale: 1, // heatmap
    min: 8., max: 0.,
    get_scalar_raster: function (crust, flood_fill, scratch1) {
        // scratch represents pressure
        var pressure = scratch1;
        // flood_fill does double duty for performance reasons
        var scratch2 = flood_fill;
        var field = TectonicsModeling.get_asthenosphere_pressure(crust.subductability, pressure, scratch2);
        var gradient = ScalarField.gradient(field);
        var angular_velocity = VectorField.cross_vector_field(gradient, crust.grid.pos);
        var gradient = angular_velocity;
        var plate_map = TectonicsModeling.get_plate_map(gradient, 7, 200);
        return plate_map;
    }
};

// test for image segmentation algorithm
window.ScalarWorldViewOptions.flood_fill8 = {
    scalar_raster_view_type: 'ColorscaleRasterViewResources',
    builtin_colorscale: 1, // heatmap
    min: 0., max: 1.,
    get_scalar_raster: function (crust, flood_fill, scratch1) {
        // scratch represents pressure
        var pressure = scratch1;
        // flood_fill does double duty for performance reasons
        var scratch2 = flood_fill;
        var field = TectonicsModeling.get_asthenosphere_pressure(crust.subductability, pressure, scratch2);
        var gradient = ScalarField.gradient(field);
        var angular_velocity = VectorField.cross_vector_field(gradient, crust.grid.pos);
        var gradient = angular_velocity;
        var plate_map = TectonicsModeling.get_plate_map(gradient, 7, 200);
        return plate_map;
    }
};

window.ScalarWorldViewOptions.daily_average_incident_radiation_fraction = {
    scalar_raster_view_type: 'ColorscaleRasterViewResources',
    builtin_colorscale: 1, // heatmap
    min: 0., max: 0.5,
    get_scalar_raster: function (crust) {
        var orbital_pos = OrbitalMechanics.get_eliptic_coordinate_sample(1, 0, world.meanAnomaly);
        var result = AtmosphericModeling.daily_average_incident_radiation_fraction(
            world.grid.pos,
            orbital_pos,
            Math.PI * 23.5/180,
        );
        return result;
    }
};

window.ScalarWorldViewOptions.temp2 = {
    scalar_raster_view_type: 'ColorscaleRasterViewResources',
    builtin_colorscale: 1, // heatmap
    min: -60., max: 30.,
    get_scalar_raster: function (crust) {
        var orbital_pos = OrbitalMechanics.get_eliptic_coordinate_sample(1, 0, world.meanAnomaly);
        var incident_radiation_fraction = AtmosphericModeling.daily_average_incident_radiation_fraction(
            world.grid.pos,
            orbital_pos,
            Math.PI * 23.5/180,
        );
        var temperature = AtmosphericModeling.black_body_equilibrium_temperature(1361, incident_radiation_fraction);

        //convert to celcius
        ScalarField.sub_scalar(temperature, 273.15, temperature);
        return temperature;
    }
};


// test for basic vector rendering
window.VectorWorldViewOptions.test = { 
    get_vector_raster: function (crust) {
        var vector = VectorRaster(crust.grid);
        for(var i=0, li = vector.length; i<li; i++){
            vector[i] = new THREE.Vector3(1,0,0); 
        }
        return crust.grid.pos;
    } 
};

window.VectorWorldViewOptions.asthenosphere_velocity = { 
    get_vector_raster: function (world, flood_fill, scratch1) {
        // scratch represents pressure
        var pressure = scratch1;
        // flood_fill does double duty for performance reasons
        var scratch2 = flood_fill;
        var field = TectonicsModeling.get_asthenosphere_pressure(world.subductability, pressure, scratch2);
        var gradient = ScalarField.gradient(field);
        return gradient;
    } 
};

window.VectorWorldViewOptions.asthenosphere_angular_velocity = { 
    get_vector_raster: function (crust, flood_fill, scratch1) {
        // scratch represents pressure
        var pressure = scratch1;
        // flood_fill does double duty for performance reasons
        var scratch2 = flood_fill;
        var field = TectonicsModeling.get_asthenosphere_pressure(crust.subductability, pressure, scratch2);
        var gradient = ScalarField.gradient(field);
        var angular_velocity = VectorField.cross_vector_field(gradient, crust.grid.pos);
        // laplacian = VectorField.divergence(gradient);
        return angular_velocity;
    } 
};

window.VectorWorldViewOptions.averaged_angular_velocity = { 
    get_vector_raster: function (world, flood_fill, scratch1) {
        // scratch represents pressure
        var pressure = scratch1;
        // flood_fill does double duty for performance reasons
        var scratch2 = flood_fill;
        var field = TectonicsModeling.get_asthenosphere_pressure(world.subductability, pressure, scratch2);
        var gradient = ScalarField.gradient(field);
        var angular_velocity = VectorField.cross_vector_field(gradient, world.grid.pos);
        var gradient = angular_velocity;
        var plates = split(gradient, world.grid);

        var averaged_angular_velocity_field_sum = VectorField.DataFrame(world.grid, {x:0,y:0,z:0});
        for (var i=0, li=plates.length; i<li; ++i) {
            var flood_fill = plates[i];
            var averaged_angular_velocity = VectorDataset.weighted_average(angular_velocity, flood_fill);
            var averaged_angular_velocity_field = ScalarField.mult_vector(flood_fill, averaged_angular_velocity);
            VectorField.add_vector_field(averaged_angular_velocity_field_sum, averaged_angular_velocity_field, 
                averaged_angular_velocity_field_sum);
        }

        return averaged_angular_velocity_field_sum;
    } 
};

window.VectorWorldViewOptions.averaged_velocity = { 
    get_vector_raster: function (world) {
        var field = getSubductabilitySmoothed(world);
        var gradient = ScalarField.gradient(field);
        var angular_velocity = VectorField.cross_vector_field(gradient, world.grid.pos);
        var gradient = angular_velocity;
        var plates = split(gradient, world.grid);

        var averaged_angular_velocity_field_sum = VectorField.DataFrame(world.grid, {x:0,y:0,z:0});
        for (var i=0, li=plates.length; i<li; ++i) {
            var flood_fill = plates[i];
            var averaged_angular_velocity = VectorDataset.weighted_average(angular_velocity, flood_fill);
            var averaged_angular_velocity_field = ScalarField.mult_vector(flood_fill, averaged_angular_velocity);
            VectorField.add_vector_field(averaged_angular_velocity_field_sum, averaged_angular_velocity_field, 
                averaged_angular_velocity_field_sum);
        }

        var averaged_velocity = VectorField.cross_vector_field(world.grid.pos, averaged_angular_velocity_field_sum);
        return averaged_velocity;
    } 
};

window.VectorWorldViewOptions.averaged_velocity = { 
    get_vector_raster: function (world) {
        var field = getSubductabilitySmoothed(world);
        var gradient = ScalarField.gradient(field);
        var angular_velocity = VectorField.cross_vector_field(gradient, world.grid.pos);
        var gradient = angular_velocity;
        var plates = split(gradient, world.grid);

        var averaged_angular_velocity_field_sum = VectorField.DataFrame(world.grid, {x:0,y:0,z:0});
        for (var i=0, li=plates.length; i<li; ++i) {
            var flood_fill = plates[i];
            var averaged_angular_velocity = VectorDataset.weighted_average(angular_velocity, flood_fill);
            var averaged_angular_velocity_field = ScalarField.mult_vector(flood_fill, averaged_angular_velocity);
            VectorField.add_vector_field(averaged_angular_velocity_field_sum, averaged_angular_velocity_field, 
                averaged_angular_velocity_field_sum);
        }

        var averaged_velocity = VectorField.cross_vector_field(world.grid.pos, averaged_angular_velocity_field_sum);
        return averaged_velocity;
    } 
};