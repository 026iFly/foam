# Expert Priskalkylator - Dokumentation

## Översikt

Den nya expertkalkylatorn är en sofistikerad, multi-steg kalkylator som implementerar verklig byggfysik, daggpunktsanalys och svenska byggstandarder (BBR).

**URL:** http://localhost:3000/kalkylator-expert

## Funktioner

### 1. Multi-Steg Process

**Steg 1: Välj Byggnadsdelar**
- Yttervägg 🧱
- Tak/Vind 🏠
- Innervägg 🚪
- Golv mot mark ⬇️
- Kan välja flera delar samtidigt

**Steg 2: Konfigurera Varje Del**
För varje vald del:
- Ange yta i m²
- Välj önskad tjocklek (valfritt, annars beräknas minimum enligt BBR)
- För ytterväggar och tak: Ange om ångspärr finns installerad
- För innerväggar: Ingen ångspärr krävs

**Steg 3: Klimatinställningar**
- Välj klimatzon (4 zoner i Sverige):
  - Södra Sverige (Zon I): -16°C
  - Mellersta Sverige (Zon II): -20°C
  - Norra Sverige (Zon III): -26°C
  - Fjällområden (Zon IV): -30°C
- Inomhustemperatur (standard 21°C)
- Relativ luftfuktighet (standard 40%)

**Steg 4: Rekommendationer och Priser**
- Visar expert rekommendationer för varje del
- Daggpunktsanalys och kondensationsrisk
- Specifik lösning (closed-cell, open-cell, eller flash-and-batt)
- Totalkostnad uppdelad per del

### 2. Byggfysik och Beräkningar

#### Daggpunktsberäkning
```typescript
// Magnus formula för mättad ångtryck
dewPoint = calculateDewPoint(temperature, relativeHumidity)
```

Beräknar daggpunktstemperaturen baserat på:
- Inomhustemperatur
- Relativ luftfuktighet
- Används för att avgöra kondensationsrisk

#### BBR U-värden (Minimikrav)
```
Yttervägg: 0.18 W/(m²·K)
Tak: 0.13 W/(m²·K)
Golv mot mark: 0.15 W/(m²·K)
```

#### Materialkonstanter
**Slutencellsskum (DMJ-Spray500):**
- Lambda (λ): 0.024 W/(m·K)
- Sd-värde: 100 m (ångspärr)
- Densitet: 35 kg/m³

**Öppencellsskum (DmjSpray-501F):**
- Lambda (λ): 0.040 W/(m·K)
- Sd-värde: 0.3 m (ånggenomsläpplig)
- Densitet: 10 kg/m³

### 3. Intelligent Rekommendationslogik

#### För Ytterväggar och Tak

**UTAN ångspärr:**
```
Rekommendation: Slutencellsskum
Förklaring: Fungerar som både isolering och ångspärr.
Eliminerar behovet för separat ångspärr och luftspalt.
```

**MED ångspärr:**
```
Rekommendation: Flash-and-Batt
Lösning: 50mm slutencellsskum + resterande öppencellsskum
Förklaring: Ger lufttäthet och strukturförstärkning med closed-cell,
plus kostnadseffektiv isolering med open-cell.
```

**Alternativ med ångspärr:**
```
Rekommendation: Endast öppencellsskum
Förklaring: Med korrekt ångspärr kan öppencellsskum användas.
Kostnadseffektivt för hela tjockleken.
```

#### För Innerväggar
```
Rekommendation: Alltid öppencellsskum
Förklaring: Optimal ljuddämpning, inga fuktkrav.
```

### 4. Kondensationsriskanalys

För varje yttervägg och tak analyseras:

**LÅG RISK (Grön):**
- Slutencellsskum använt (ångspärr)
- Eller öppencellsskum med korrekt ångspärr
- Temperaturen sjunker inte under daggpunkten

**MEDEL RISK (Gul):**
- Öppencellsskum utan ångspärr
- Men ingen direkt kondensation beräknad
- Rekommendation att lägga till ångspärr

**HÖG RISK (Röd):**
- Öppencellsskum utan ångspärr
- Kondensation förväntas på specifikt djup
- VARNING: Kräver antingen ångspärr eller byte till closed-cell

### 5. Flash-and-Batt Teknik

Systemet rekommenderar automatiskt flash-and-batt när:
1. Ångspärr finns installerad
2. Total tjocklek > minimikrav enligt BBR
3. Kostnadsoptimering önskvärd

**Konfiguration:**
- 50mm slutencellsskum mot yttersidan
- Resterande tjocklek med öppencellsskum
- Kombinerar fördelarna från båda material

**Fördelar:**
- Lufttät konstruktion (från closed-cell)
- Strukturförstärkning
- Kostnadseffektiv total isolering
- Bättre än endast open-cell, billigare än endast closed-cell

### 6. Prisberäkning

Kalkylatorn beräknar exakt pris för varje del:

```typescript
// För varje del
closedCost = area × (basePrice + thicknessAdjustment) × multiplier
openCost = area × (basePrice + thicknessAdjustment) × multiplier

totalExclVat = closedCost + openCost
totalInclVat = totalExclVat × 1.25 (25% moms)
```

**Tjockleksanpassning:**
- Closed-cell: +1.4 SEK per mm från närmaste standardtjocklek
- Open-cell: +1.1 SEK per mm från närmaste standardtjocklek

**Projekttypsmultiplikatorer:**
- Yttervägg: 1.2× (mer komplicerat)
- Tak/Vind: 1.0× (standard)
- Golv/Källare: 1.15× (kräver förberedelse)
- Krypgrund: 1.3× (svåråtkomligt)

### 7. Resultatpresentation

För varje del visas:

**Specifikation:**
- Slutencellsskum tjocklek (om applicerbart)
- Öppencellsskum tjocklek (om applicerbart)
- Total tjocklek
- Beräknat U-värde

**Kostnadsuppdelning:**
- Exkl. moms
- Moms (25%)
- Totalt inkl. moms

**Kondensationsanalys:**
- Risknivå (Låg/Medel/Hög)
- Förklaring och rekommendation
- Daggpunkt inomhus
- Kritiskt djup (om risk finns)

## Jämförelse: Enkel vs Expert Kalkylator

### Enkel Kalkylator
- Snabb uppskattning
- Ett projekt i taget
- Manuellt val av skumtyp
- Ingen fuktriskanalys
- Bra för snabba prisindikationer

### Expert Kalkylator
- Detaljerad multi-del analys
- Flera byggnadsdelar samtidigt
- Automatisk skumtypsrekommendation
- Daggpunktsanalys och kondensationsrisk
- BBR-kompatibla beräkningar
- Flash-and-batt rekommendationer
- Svensk byggstandard (BBR/PBL/REACH)
- Perfekt för seriösa offerter

## Användningsexempel

### Exempel 1: Yttervägg utan ångspärr

**Input:**
- Yttervägg, 80 m²
- Ingen ångspärr
- Klimatzon II (Mellersta Sverige, -20°C)
- 21°C inomhus, 40% RH

**Output:**
```
Rekommendation: Slutencellsskum 150mm
Kondensationsrisk: LÅG ✓
U-värde: 0.160 W/(m²·K) (uppfyller BBR 0.18)
Pris: ~48,000 kr inkl. moms
```

### Exempel 2: Tak med ångspärr

**Input:**
- Tak/Vind, 100 m²
- Ångspärr finns
- Önskad tjocklek: 200mm
- Klimatzon II

**Output:**
```
Rekommendation: Flash-and-batt
- 50mm slutencellsskum
- 150mm öppencellsskum
Total: 200mm

Kondensationsrisk: LÅG ✓
U-värde: 0.142 W/(m²·K) (uppfyller BBR 0.13)
Pris: ~45,000 kr inkl. moms

Förklaring: 50mm closed-cell ger lufttäthet och
struktur, 150mm open-cell ger kostnadseffektiv isolering.
```

### Exempel 3: Innervägg

**Input:**
- Innervägg, 30 m²
- 100mm tjocklek

**Output:**
```
Rekommendation: Öppencellsskum 100mm
Kondensationsanalys: Ej relevant (innervägg)
Ljuddämpning: Utmärkt
Pris: ~12,000 kr inkl. moms
```

## Teknisk Implementation

**Filer:**
- `/app/kalkylator-expert/page.tsx` - Expert kalkylatorns UI
- `/lib/foam-calculations.ts` - Byggfysikberäkningar och expertlogik
- `/api/pricing/route.ts` - Prisdatahämtning

**Dependencies:**
- React hooks för stegvis navigation
- TypeScript för type safety
- Fetch API för prisdataanrop

## Framtida Förbättringar

Möjliga tillägg:
1. PDF-export av rekommendationer
2. E-post funktionalitet för att skicka offerter
3. Sparade projekt i webbläsaren
4. Mer detaljerad U-värdesberäkning med skiktanalys
5. Visualisering av temperaturprofil genom väggen
6. Integration med väderd ata för exaktare utetemperaturer
7. Fler klimatzoner med regionspecifika värden

## Support och Dokumentation

För frågor om:
- **Byggfysik:** Se `docs/research/sprayisolering_sammanfattning.pdf`
- **Produktspecifikationer:** Se `docs/product-specs/`
- **Prisuppdateringar:** Använd admin dashboard på `/admin`
