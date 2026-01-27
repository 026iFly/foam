const puppeteer = require('puppeteer');

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function testCalculator() {
  console.log('🚀 Starting Puppeteer test of calculator...\n');

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();

    // Navigate to calculator
    console.log('📍 Navigating to calculator...');
    await page.goto('http://localhost:3000/kalkylator-expert', {
      waitUntil: 'networkidle2',
      timeout: 10000
    });
    console.log('✓ Page loaded\n');

    // Test Scenario 1: Wall, no thickness specified, with vapor barrier
    console.log('='.repeat(70));
    console.log('TEST 1: Wall - No thickness specified, vapor barrier YES');
    console.log('='.repeat(70));

    await page.waitForSelector('button', { timeout: 5000 });

    // Click to start
    const startButtons = await page.$$('button');
    for (const button of startButtons) {
      const text = await page.evaluate(el => el.textContent, button);
      if (text.includes('Börja') || text.includes('Start')) {
        await button.click();
        break;
      }
    }

    await wait(1000);

    // Select Yttervägg (wall)
    const wallButton = await page.$$('label');
    for (const label of wallButton) {
      const text = await page.evaluate(el => el.textContent, label);
      if (text.includes('Yttervägg')) {
        await label.click();
        break;
      }
    }

    await wait(500);

    // Click next
    const nextButtons = await page.$$('button');
    for (const button of nextButtons) {
      const text = await page.evaluate(el => el.textContent, button);
      if (text.includes('Nästa')) {
        await button.click();
        break;
      }
    }

    await wait(1000);

    // Enter area: 30 m²
    const areaInput = await page.$('input[type="number"]');
    if (areaInput) {
      await areaInput.click({ clickCount: 3 });
      await areaInput.type('30');
    }

    await wait(500);

    // Leave thickness empty (skip it)

    // Find and click "Nej, men vi lägger det" for vapor barrier
    const vaporBarrierLabels = await page.$$('label');
    for (const label of vaporBarrierLabels) {
      const text = await page.evaluate(el => el.textContent, label);
      if (text.includes('Nej, men vi lägger det')) {
        await label.click();
        break;
      }
    }

    await wait(500);

    // Click next
    const next2Buttons = await page.$$('button');
    for (const button of next2Buttons) {
      const text = await page.evaluate(el => el.textContent, button);
      if (text.includes('Nästa')) {
        await button.click();
        break;
      }
    }

    await wait(1000);

    // Select climate zone II
    const zoneLabels = await page.$$('label');
    for (const label of zoneLabels) {
      const text = await page.evaluate(el => el.textContent, label);
      if (text.includes('Zon II')) {
        await label.click();
        break;
      }
    }

    await wait(500);

    // Keep default indoor conditions (21°C, 40% RH)

    // Click next to calculation
    const next3Buttons = await page.$$('button');
    for (const button of next3Buttons) {
      const text = await page.evaluate(el => el.textContent, button);
      if (text.includes('Nästa') || text.includes('Beräkna')) {
        await button.click();
        break;
      }
    }

    await wait(2000);

    // Extract results
    const results = await page.evaluate(() => {
      const body = document.body.innerText;
      return body;
    });

    console.log('Results extracted. Analyzing...\n');

    // Look for thickness recommendation
    const thicknessMatch = results.match(/(\d+)mm slutencellsskum/i) ||
                          results.match(/Total.*?(\d+)\s*mm/i) ||
                          results.match(/(\d+)\s*mm/);

    // Look for condensation risk
    const hasCondensation = results.includes('Kondensationsrisk');
    const riskLevel = results.match(/Kondensationsrisk:\s*(LÅG|MEDEL|HÖG)/i);

    // Look for dew point
    const dewPoint = results.match(/daggpunkt[^:]*:\s*([\d.]+)°C/i);

    // Look for interface temperature
    const interfaceTemp = results.match(/ytterytans temperatur.*?([-\d.]+)°C/i) ||
                         results.match(/gränsskiktet.*?([-\d.]+)°C/i);

    // Look for price
    const price = results.match(/([\d\s]+)\s*kr\s*inkl.*?moms/i);

    console.log('📊 RESULTS:');
    if (thicknessMatch) {
      console.log(`   Recommended thickness: ${thicknessMatch[1]}mm`);
    } else {
      console.log('   ⚠️  Could not find thickness recommendation');
    }

    if (riskLevel) {
      console.log(`   Condensation risk: ${riskLevel[1]}`);
    }

    if (dewPoint) {
      console.log(`   Dew point: ${dewPoint[1]}°C`);
    }

    if (interfaceTemp) {
      console.log(`   Interface/surface temp: ${interfaceTemp[1]}°C`);
    }

    if (price) {
      console.log(`   Price: ${price[1]} kr incl VAT`);
    }

    // Check if it makes sense
    console.log('\n✓ VALIDATION:');
    if (thicknessMatch) {
      const thickness = parseInt(thicknessMatch[1]);
      if (thickness > 200) {
        console.log('   ⚠️  WARNING: Thickness > 200mm seems excessive for auto-calculation');
      } else if (thickness >= 140 && thickness <= 160) {
        console.log('   ✓ Thickness ~150mm is expected for closed-cell BBR minimum');
      } else {
        console.log(`   ℹ️  Thickness ${thickness}mm - verifying if this is correct...`);
      }
    }

    if (dewPoint && interfaceTemp) {
      const dew = parseFloat(dewPoint[1]);
      const temp = parseFloat(interfaceTemp[1]);
      const margin = temp - dew;
      console.log(`   Temperature margin: ${margin.toFixed(1)}°C (should be ≥ 2.0°C)`);
      if (margin >= 2.0) {
        console.log('   ✓ Safety margin is adequate');
      } else if (margin >= 0) {
        console.log('   ⚠️  Safety margin too small!');
      } else {
        console.log('   ❌ Interface temperature BELOW dew point - condensation will occur!');
      }
    }

    // Save screenshot
    await page.screenshot({ path: '/tmp/calculator-test-1.png', fullPage: true });
    console.log('\n📸 Screenshot saved to /tmp/calculator-test-1.png');

    // Test Scenario 2: Same but with 70mm specified thickness
    console.log('\n' + '='.repeat(70));
    console.log('TEST 2: Wall - 70mm specified thickness');
    console.log('='.repeat(70));

    await page.reload({ waitUntil: 'networkidle2' });
    await wait(1000);

    // Repeat similar steps but this time specify 70mm thickness
    // (Simplified - clicking through the same flow)

    const start2Buttons = await page.$$('button');
    for (const button of start2Buttons) {
      const text = await page.evaluate(el => el.textContent, button);
      if (text.includes('Börja') || text.includes('Start')) {
        await button.click();
        break;
      }
    }

    await wait(1000);

    const wall2Button = await page.$$('label');
    for (const label of wall2Button) {
      const text = await page.evaluate(el => el.textContent, label);
      if (text.includes('Yttervägg')) {
        await label.click();
        break;
      }
    }

    await wait(500);

    const next4Buttons = await page.$$('button');
    for (const button of next4Buttons) {
      const text = await page.evaluate(el => el.textContent, button);
      if (text.includes('Nästa')) {
        await button.click();
        break;
      }
    }

    await wait(1000);

    // Enter area and thickness
    const inputs = await page.$$('input[type="number"]');
    if (inputs.length >= 2) {
      await inputs[0].click({ clickCount: 3 });
      await inputs[0].type('30');

      await inputs[1].click({ clickCount: 3 });
      await inputs[1].type('70');
    }

    await wait(500);

    const vapor2Labels = await page.$$('label');
    for (const label of vapor2Labels) {
      const text = await page.evaluate(el => el.textContent, label);
      if (text.includes('Nej, men vi lägger det')) {
        await label.click();
        break;
      }
    }

    await wait(500);

    const next5Buttons = await page.$$('button');
    for (const button of next5Buttons) {
      const text = await page.evaluate(el => el.textContent, button);
      if (text.includes('Nästa')) {
        await button.click();
        break;
      }
    }

    await wait(1000);

    const zone2Labels = await page.$$('label');
    for (const label of zone2Labels) {
      const text = await page.evaluate(el => el.textContent, label);
      if (text.includes('Zon II')) {
        await label.click();
        break;
      }
    }

    await wait(500);

    const calc2Buttons = await page.$$('button');
    for (const button of calc2Buttons) {
      const text = await page.evaluate(el => el.textContent, button);
      if (text.includes('Nästa') || text.includes('Beräkna')) {
        await button.click();
        break;
      }
    }

    await wait(2000);

    const results2 = await page.evaluate(() => {
      return document.body.innerText;
    });

    const dewPoint2 = results2.match(/daggpunkt[^:]*:\s*([\d.]+)°C/i);
    const interfaceTemp2 = results2.match(/ytterytans temperatur.*?([-\d.]+)°C/i) ||
                          results2.match(/gränsskiktet.*?([-\d.]+)°C/i);
    const riskLevel2 = results2.match(/Kondensationsrisk:\s*(LÅG|MEDEL|HÖG)/i);

    console.log('\n📊 RESULTS (70mm):');
    if (riskLevel2) {
      console.log(`   Condensation risk: ${riskLevel2[1]}`);
    }
    if (dewPoint2) {
      console.log(`   Dew point: ${dewPoint2[1]}°C`);
    }
    if (interfaceTemp2) {
      console.log(`   Interface temp: ${interfaceTemp2[1]}°C`);
    }

    if (dewPoint2 && interfaceTemp2) {
      const dew = parseFloat(dewPoint2[1]);
      const temp = parseFloat(interfaceTemp2[1]);
      const margin = temp - dew;
      console.log(`   Temperature margin: ${margin.toFixed(1)}°C`);

      if (margin < 2.0 && riskLevel2 && riskLevel2[1] === 'LÅG') {
        console.log('   ❌ ERROR: Risk marked as LOW but margin < 2.0°C!');
      } else if (margin >= 2.0 && riskLevel2 && riskLevel2[1] !== 'LÅG') {
        console.log('   ❌ ERROR: Risk marked as HIGH/MEDIUM but margin ≥ 2.0°C!');
      } else {
        console.log('   ✓ Risk level matches temperature margin');
      }
    }

    await page.screenshot({ path: '/tmp/calculator-test-2.png', fullPage: true });
    console.log('\n📸 Screenshot saved to /tmp/calculator-test-2.png');

    // Test Scenario 3: 95mm thickness
    console.log('\n' + '='.repeat(70));
    console.log('TEST 3: Wall - 95mm specified thickness');
    console.log('='.repeat(70));

    await page.reload({ waitUntil: 'networkidle2' });
    await wait(1000);

    // Quick navigation (abbreviated)
    const start3 = await page.$$('button');
    await start3[0].click();
    await wait(500);

    const wallLabels = await page.$$('label');
    for (const label of wallLabels) {
      const text = await page.evaluate(el => el.textContent, label);
      if (text.includes('Yttervägg')) {
        await label.click();
        break;
      }
    }
    await wait(300);

    const nextBtn = await page.$$('button');
    for (const btn of nextBtn) {
      const txt = await page.evaluate(el => el.textContent, btn);
      if (txt.includes('Nästa')) {
        await btn.click();
        break;
      }
    }
    await wait(500);

    const inputs3 = await page.$$('input[type="number"]');
    if (inputs3.length >= 2) {
      await inputs3[0].click({ clickCount: 3 });
      await inputs3[0].type('30');
      await inputs3[1].click({ clickCount: 3 });
      await inputs3[1].type('95');
    }

    const vaporLabels3 = await page.$$('label');
    for (const label of vaporLabels3) {
      const text = await page.evaluate(el => el.textContent, label);
      if (text.includes('Nej, men vi lägger det')) {
        await label.click();
        break;
      }
    }

    const nextBtn2 = await page.$$('button');
    for (const btn of nextBtn2) {
      const txt = await page.evaluate(el => el.textContent, btn);
      if (txt.includes('Nästa')) {
        await btn.click();
        break;
      }
    }
    await wait(500);

    const zoneLabels3 = await page.$$('label');
    for (const label of zoneLabels3) {
      const text = await page.evaluate(el => el.textContent, label);
      if (text.includes('Zon II')) {
        await label.click();
        break;
      }
    }

    const calcBtn = await page.$$('button');
    for (const btn of calcBtn) {
      const txt = await page.evaluate(el => el.textContent, btn);
      if (txt.includes('Beräkna') || txt.includes('Nästa')) {
        await btn.click();
        break;
      }
    }

    await wait(2000);

    const results3 = await page.evaluate(() => document.body.innerText);

    const dewPoint3 = results3.match(/daggpunkt[^:]*:\s*([\d.]+)°C/i);
    const interfaceTemp3 = results3.match(/ytterytans temperatur.*?([-\d.]+)°C/i) ||
                          results3.match(/gränsskiktet.*?([-\d.]+)°C/i);
    const riskLevel3 = results3.match(/Kondensationsrisk:\s*(LÅG|MEDEL|HÖG)/i);

    console.log('\n📊 RESULTS (95mm):');
    if (riskLevel3) {
      console.log(`   Condensation risk: ${riskLevel3[1]}`);
    }
    if (dewPoint3) {
      console.log(`   Dew point: ${dewPoint3[1]}°C`);
    }
    if (interfaceTemp3) {
      console.log(`   Interface temp: ${interfaceTemp3[1]}°C`);
    }

    if (dewPoint3 && interfaceTemp3) {
      const dew = parseFloat(dewPoint3[1]);
      const temp = parseFloat(interfaceTemp3[1]);
      const margin = temp - dew;
      console.log(`   Temperature margin: ${margin.toFixed(1)}°C`);
    }

    await page.screenshot({ path: '/tmp/calculator-test-3.png', fullPage: true });
    console.log('\n📸 Screenshot saved to /tmp/calculator-test-3.png');

    // Compare 70mm vs 95mm
    console.log('\n' + '='.repeat(70));
    console.log('COMPARISON: 70mm vs 95mm');
    console.log('='.repeat(70));

    if (interfaceTemp2 && interfaceTemp3) {
      const temp70 = parseFloat(interfaceTemp2[1]);
      const temp95 = parseFloat(interfaceTemp3[1]);

      console.log(`70mm interface temp: ${temp70.toFixed(1)}°C`);
      console.log(`95mm interface temp: ${temp95.toFixed(1)}°C`);

      if (temp95 > temp70) {
        console.log('✓ Thicker insulation gives warmer interface (correct)');
      } else if (temp95 === temp70) {
        console.log('❌ ERROR: Interface temperature is the SAME for different thicknesses!');
      } else {
        console.log('❌ ERROR: Thicker insulation gives COLDER interface (wrong!)');
      }
    }

    console.log('\n✅ Puppeteer testing complete!');

  } catch (error) {
    console.error('❌ Error during testing:', error.message);
    console.error(error.stack);
  } finally {
    await browser.close();
  }
}

testCalculator().catch(console.error);
