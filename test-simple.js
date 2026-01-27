// Simple test - just check what the backend calculation returns

const db = require('./lib/db.js');

// Get cost variables
const varsQuery = db.prepare('SELECT variable_key, variable_value FROM cost_variables').all();
const vars = {};
for (const v of varsQuery) {
  vars[v.variable_key] = v.variable_value;
}

console.log('🔍 DATABASE VALUES:\n');
console.log(`Closed cell density: ${vars.closed_density} kg/m³`);
console.log(`Closed cell material cost: ${vars.closed_material_cost} kr/kg`);
console.log(`Closed cell margin: ${vars.closed_margin}%`);
console.log(`Closed cell spray time: ${vars.closed_spray_time} h/m³`);
console.log(`Open cell density: ${vars.open_density} kg/m³`);
console.log(`Open cell material cost: ${vars.open_material_cost} kr/kg`);
console.log(`Open cell margin: ${vars.open_margin}%`);
console.log(`Open cell spray time: ${vars.open_spray_time} h/m³`);
console.log(`Setup hours: ${vars.setup_hours} h`);
console.log(`Personnel cost: ${vars.personnel_cost_per_hour} kr/h`);
console.log(`Safety margin: ${vars.condensation_safety_margin_c || 'NOT SET'}°C`);
console.log(`Foam switching hours: ${vars.foam_switching_hours || 'NOT SET'} h`);

// Test the calculation functions directly
const {
  calculateMinClosedCellThickness,
  recommendFoamConfiguration,
  analyzeCondensationRisk,
  calculateDewPoint,
} = require('./lib/foam-calculations.ts');

console.log('\n' + '='.repeat(70));
console.log('TEST 1: Auto-calculate thickness for wall');
console.log('='.repeat(70));

try {
  const config1 = recommendFoamConfiguration({
    buildingPart: 'yttervagg',
    hasVaporBarrier: true,
    indoorTemp: 21,
    outdoorTemp: -20,
    indoorRH: 0.40,
    // targetThickness: undefined (let it auto-calculate)
  });

  console.log('\n📊 RESULT:');
  console.log(`Configuration: ${config1.config}`);
  console.log(`Closed cell: ${config1.closedThickness}mm`);
  console.log(`Open cell: ${config1.openThickness}mm`);
  console.log(`Total: ${config1.totalThickness}mm`);
  console.log(`U-value: ${config1.uValue.toFixed(3)} W/m²K`);
  console.log(`\nExplanation: ${config1.explanation}`);

  // Check if 150mm
  if (config1.totalThickness === 150) {
    console.log('\n✓ CORRECT: Auto-calculates to 150mm closed-cell BBR minimum');
  } else if (config1.totalThickness === 200) {
    console.log('\n❌ ERROR: Still calculating 200mm (old bug!)');
  } else {
    console.log(`\n⚠️  Unexpected thickness: ${config1.totalThickness}mm`);
  }

} catch (err) {
  console.error('❌ Error:', err.message);
  console.error(err.stack);
}

console.log('\n' + '='.repeat(70));
console.log('TEST 2: 70mm closed cell - condensation analysis');
console.log('='.repeat(70));

try {
  const config2 = recommendFoamConfiguration({
    buildingPart: 'yttervagg',
    hasVaporBarrier: true,
    indoorTemp: 21,
    outdoorTemp: -20,
    indoorRH: 0.40,
    targetThickness: 70,
  });

  const risk2 = analyzeCondensationRisk({
    indoorTemp: 21,
    outdoorTemp: -20,
    indoorRH: 0.40,
    insulationThickness: 70,
    foamType: 'closed_cell',
    hasVaporBarrier: true,
  });

  const dewPoint = calculateDewPoint(21, 0.40);

  console.log('\n📊 RESULT:');
  console.log(`Configuration: ${config2.config}`);
  console.log(`Thickness: ${config2.totalThickness}mm`);
  console.log(`Dew point: ${dewPoint.toFixed(1)}°C`);
  console.log(`Risk level: ${risk2.risk.toUpperCase()}`);
  console.log(`\nExplanation: ${risk2.explanation}`);

  // Extract temperature from explanation
  const tempMatch = risk2.explanation.match(/([-\d.]+)°C/);
  if (tempMatch) {
    console.log(`\nInterface temperature: ${tempMatch[0]}`);
    const temp = parseFloat(tempMatch[1]);
    const margin = temp - dewPoint;
    console.log(`Safety margin: ${margin.toFixed(1)}°C`);

    if (margin >= 2.0) {
      console.log('✓ Safety margin adequate (≥ 2.0°C)');
    } else if (margin > 0) {
      console.log('⚠️  Safety margin insufficient (< 2.0°C)');
    } else {
      console.log('❌ Below dew point - condensation will occur!');
    }
  }

} catch (err) {
  console.error('❌ Error:', err.message);
  console.error(err.stack);
}

console.log('\n' + '='.repeat(70));
console.log('TEST 3: 95mm closed cell - condensation analysis');
console.log('='.repeat(70));

try {
  const config3 = recommendFoamConfiguration({
    buildingPart: 'yttervagg',
    hasVaporBarrier: true,
    indoorTemp: 21,
    outdoorTemp: -20,
    indoorRH: 0.40,
    targetThickness: 95,
  });

  const risk3 = analyzeCondensationRisk({
    indoorTemp: 21,
    outdoorTemp: -20,
    indoorRH: 0.40,
    insulationThickness: 95,
    foamType: 'closed_cell',
    hasVaporBarrier: true,
  });

  const dewPoint = calculateDewPoint(21, 0.40);

  console.log('\n📊 RESULT:');
  console.log(`Configuration: ${config3.config}`);
  console.log(`Thickness: ${config3.totalThickness}mm`);
  console.log(`Dew point: ${dewPoint.toFixed(1)}°C`);
  console.log(`Risk level: ${risk3.risk.toUpperCase()}`);
  console.log(`\nExplanation: ${risk3.explanation}`);

  const tempMatch = risk3.explanation.match(/([-\d.]+)°C/);
  if (tempMatch) {
    console.log(`\nInterface temperature: ${tempMatch[0]}`);
  }

} catch (err) {
  console.error('❌ Error:', err.message);
  console.error(err.stack);
}

console.log('\n' + '='.repeat(70));
console.log('TEST 4: Compare 70mm vs 95mm');
console.log('='.repeat(70));

try {
  const risk70 = analyzeCondensationRisk({
    indoorTemp: 21,
    outdoorTemp: -20,
    indoorRH: 0.40,
    insulationThickness: 70,
    foamType: 'closed_cell',
    hasVaporBarrier: true,
  });

  const risk95 = analyzeCondensationRisk({
    indoorTemp: 21,
    outdoorTemp: -20,
    indoorRH: 0.40,
    insulationThickness: 95,
    foamType: 'closed_cell',
    hasVaporBarrier: true,
  });

  const temp70Match = risk70.explanation.match(/([-\d.]+)°C/);
  const temp95Match = risk95.explanation.match(/([-\d.]+)°C/);

  if (temp70Match && temp95Match) {
    const temp70 = parseFloat(temp70Match[1]);
    const temp95 = parseFloat(temp95Match[1]);

    console.log(`\n70mm interface temp: ${temp70.toFixed(1)}°C`);
    console.log(`95mm interface temp: ${temp95.toFixed(1)}°C`);
    console.log(`Difference: ${(temp95 - temp70).toFixed(1)}°C`);

    if (temp95 > temp70) {
      console.log('✓ Thicker insulation gives warmer interface (CORRECT)');
    } else if (temp95 === temp70) {
      console.log('❌ ERROR: Both thicknesses show SAME temperature!');
    } else {
      console.log('❌ ERROR: Thicker insulation shows COLDER interface!');
    }
  }

} catch (err) {
  console.error('❌ Error:', err.message);
}

console.log('\n✅ Testing complete!');
