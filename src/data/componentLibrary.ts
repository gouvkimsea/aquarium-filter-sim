import type { ComponentTemplate, EditorObject } from '../types/editor';

export const COMPONENT_TEMPLATES: ComponentTemplate[] = [
  // --- FILTERS ---
  {
    templateId: 'tpl-filter-hob',
    name: 'Hang-On-Back Filter (HOB)',
    category: 'filter',
    description: 'Multi-stage external cascade filter mounted to the rear glass rim.',
    iconName: 'Box',
    defaultDimensions: { x: 1.8, y: 1.6, z: 0.9 },
    defaultMaterial: {
      color: '#334155',
      opacity: 0.88,
      roughness: 0.25,
      metalness: 0.35,
      wireframe: false,
      transparent: true,
    },
    defaultParameters: {
      flowRateGPH: 150,
      motorStatus: true,
      mediaCapacityLiters: 2.2,
      bypassRiskPercent: 5,
    },
    specsSummary: '150 GPH • 3-Stage Tray • Rim-Mount',
  },
  {
    templateId: 'tpl-filter-canister',
    name: 'External Canister Filter',
    category: 'filter',
    description: 'High-capacity sealed pressurized canister filter with multi-basket stack.',
    iconName: 'Box',
    defaultDimensions: { x: 1.4, y: 2.2, z: 1.4 },
    defaultMaterial: {
      color: '#1e293b',
      opacity: 0.95,
      roughness: 0.3,
      metalness: 0.2,
      wireframe: false,
      transparent: false,
    },
    defaultParameters: {
      flowRateGPH: 350,
      motorStatus: true,
      mediaCapacityLiters: 6.5,
      bypassRiskPercent: 2,
    },
    specsSummary: '350 GPH • 4 Baskets • Pressurized',
  },
  {
    templateId: 'tpl-filter-sponge',
    name: 'Dual Bio-Sponge Filter',
    category: 'filter',
    description: 'Air-driven biological filter with dual cylindrical sponge pods.',
    iconName: 'Box',
    defaultDimensions: { x: 1.2, y: 1.8, z: 0.6 },
    defaultMaterial: {
      color: '#0284c7',
      opacity: 0.9,
      roughness: 0.9,
      metalness: 0.1,
      wireframe: false,
      transparent: false,
    },
    defaultParameters: {
      flowRateGPH: 60,
      motorStatus: true,
      mediaCapacityLiters: 0.8,
      bypassRiskPercent: 0,
    },
    specsSummary: '60 GPH • Air-Driven • Gentle Flow',
  },

  // --- FILTER MEDIA ---
  {
    templateId: 'tpl-media-sponge',
    name: 'Mechanical Sponge (30 PPI)',
    category: 'media',
    description: 'Porous polyurethane mechanical foam pad for trapping detritus.',
    iconName: 'Layers',
    defaultDimensions: { x: 0.35, y: 1.1, z: 0.7 },
    defaultMaterial: {
      color: '#2563eb',
      opacity: 0.95,
      roughness: 0.9,
      metalness: 0.1,
      wireframe: false,
      transparent: false,
    },
    defaultParameters: {
      mediaType: 'Mechanical',
      poreDensityPPI: 30,
      cloggingPercent: 12,
      cleanIntervalDays: 14,
    },
    specsSummary: 'Stage 1 • Coarse Mechanical • 30 PPI',
  },
  {
    templateId: 'tpl-media-ceramic',
    name: 'Bio-Ceramic Rings',
    category: 'media',
    description: 'Sintered glass ceramic cylinders with ultra-high porous surface area for nitrifiers.',
    iconName: 'Layers',
    defaultDimensions: { x: 0.38, y: 1.1, z: 0.7 },
    defaultMaterial: {
      color: '#cbd5e1',
      opacity: 1.0,
      roughness: 0.75,
      metalness: 0.05,
      wireframe: false,
      transparent: false,
    },
    defaultParameters: {
      mediaType: 'Biological',
      specificSurfaceAreaM2L: 850,
      bacteriaColonizationPercent: 88,
      cleanIntervalDays: 60,
    },
    specsSummary: 'Stage 2 • Biological • 850 m²/L',
  },
  {
    templateId: 'tpl-media-carbon',
    name: 'Activated Carbon Sachet',
    category: 'media',
    description: 'Acid-washed virgin bituminous coal carbon for tannin and chemical removal.',
    iconName: 'Layers',
    defaultDimensions: { x: 0.35, y: 1.1, z: 0.7 },
    defaultMaterial: {
      color: '#1e293b',
      opacity: 1.0,
      roughness: 0.95,
      metalness: 0.1,
      wireframe: false,
      transparent: false,
    },
    defaultParameters: {
      mediaType: 'Chemical',
      adsorptionCapacityMgG: 450,
      exhaustionPercent: 24,
      lifespanDays: 30,
    },
    specsSummary: 'Stage 3 • Chemical • 450 mg/g Capacity',
  },
  {
    templateId: 'tpl-media-purigen',
    name: 'Synthetic Polymer Resin',
    category: 'media',
    description: 'Macroporous synthetic polymer that adsorbs soluble organic compounds.',
    iconName: 'Layers',
    defaultDimensions: { x: 0.35, y: 1.0, z: 0.65 },
    defaultMaterial: {
      color: '#fef08a',
      opacity: 0.95,
      roughness: 0.6,
      metalness: 0.1,
      wireframe: false,
      transparent: false,
    },
    defaultParameters: {
      mediaType: 'Chemical Synthetic',
      adsorptionCapacityMgG: 620,
      exhaustionPercent: 10,
      lifespanDays: 90,
    },
    specsSummary: 'Premium Organic Scavenger • Reusable',
  },

  // --- PLUMBING & FLOW ---
  {
    templateId: 'tpl-plumbing-intake',
    name: 'Slotted Intake Tube',
    category: 'plumbing',
    description: 'Rigid acrylic suction tube with slotted debris guard basket.',
    iconName: 'Sliders',
    defaultDimensions: { x: 0.16, y: 2.8, z: 0.16 },
    defaultMaterial: {
      color: '#64748b',
      opacity: 0.7,
      roughness: 0.1,
      metalness: 0.3,
      wireframe: false,
      transparent: true,
    },
    defaultParameters: {
      diameterMm: 16,
      submergencePercent: 85,
      inletVelocityMs: 0.42,
    },
    specsSummary: '16mm Tube • Slotted Bottom Strainer',
  },
  {
    templateId: 'tpl-plumbing-spraybar',
    name: 'Surface Spray Bar',
    category: 'plumbing',
    description: 'Perforated horizontal distribution manifold for surface agitation.',
    iconName: 'Sliders',
    defaultDimensions: { x: 2.8, y: 0.12, z: 0.12 },
    defaultMaterial: {
      color: '#475569',
      opacity: 0.85,
      roughness: 0.2,
      metalness: 0.4,
      wireframe: false,
      transparent: true,
    },
    defaultParameters: {
      holeCount: 14,
      angleDegrees: 15,
      agitationRating: 'High',
    },
    specsSummary: '14-Jet Return • Aeration Agitation',
  },

  // --- AERATION ---
  {
    templateId: 'tpl-aeration-airstone',
    name: 'Micro-Pore Ceramic Air Stone',
    category: 'aeration',
    description: 'Submerged diffuser producing micro-fine oxygenation bubble plumes.',
    iconName: 'Droplets',
    defaultDimensions: { x: 0.6, y: 0.25, z: 0.35 },
    defaultMaterial: {
      color: '#0284c7',
      opacity: 0.9,
      roughness: 0.85,
      metalness: 0.1,
      wireframe: false,
      transparent: false,
    },
    defaultParameters: {
      airFlowLPM: 2.5,
      bubbleDensityPercent: 80,
      active: true,
    },
    specsSummary: '2.5 LPM • Submerged Micro-Diffuser',
  },

  // --- HARDSCAPE ---
  {
    templateId: 'tpl-hardscape-rock',
    name: 'Seiryu Aquascape Rock',
    category: 'hardscape',
    description: 'Natural rugged limestone boulder for aquatic hardscape layout.',
    iconName: 'Box',
    defaultDimensions: { x: 0.9, y: 0.8, z: 0.9 },
    defaultMaterial: {
      color: '#475569',
      opacity: 1.0,
      roughness: 0.9,
      metalness: 0.05,
      wireframe: false,
      transparent: false,
    },
    defaultParameters: {
      massKg: 4.8,
      mineralHardnessImpact: 'Slight GH Buffer',
    },
    specsSummary: 'Natural Hardscape • Textured Stone',
  },
];

export const INITIAL_SCENE_OBJECTS: EditorObject[] = [
  // 1. Tank Glass Enclosure
  {
    id: 'obj-tank-enclosure',
    name: '75G Glass Tank Frame',
    category: 'structure',
    visible: true,
    locked: true,
    position: { x: 0, y: 0, z: 0 },
    dimensions: { x: 7.0, y: 3.8, z: 3.5 },
    material: {
      color: '#a0e9fd',
      opacity: 0.18,
      roughness: 0.05,
      metalness: 0.1,
      wireframe: false,
      transparent: true,
    },
    parameters: {
      capacityGallons: 71.3,
      capacityLiters: 270,
      glassThicknessMm: 12,
      rimless: false,
    },
  },

  // 2. Water Body Volume
  {
    id: 'obj-water-body',
    name: 'Aquarium Water Body',
    category: 'water',
    visible: true,
    position: { x: 0, y: 0, z: 0 },
    dimensions: { x: 6.88, y: 3.3, z: 3.38 },
    material: {
      color: '#00b4d8',
      opacity: 0.35,
      roughness: 0.08,
      metalness: 0.05,
      wireframe: false,
      transparent: true,
    },
    parameters: {
      temperatureC: 25.5,
      temperatureF: 78.0,
      clarityPercent: 94,
      fillLevelPercent: 92,
      waterVolumeLiters: 255,
    },
  },

  // 3. Substrate Bed
  {
    id: 'obj-substrate-bed',
    name: 'Riverbed Gravel Substrate',
    category: 'structure',
    visible: true,
    position: { x: 0, y: -1.75, z: 0 },
    dimensions: { x: 6.85, y: 0.25, z: 3.35 },
    material: {
      color: '#374151',
      opacity: 1.0,
      roughness: 0.85,
      metalness: 0.1,
      wireframe: false,
      transparent: false,
    },
    parameters: {
      depthCm: 5.5,
      grainSizeMm: '2-4mm',
      substrateType: 'Natural Dark River Sand',
    },
  },

  // 4. Transparent Filter Container - Bottom Plate
  {
    id: 'obj-filter-bottom-plate',
    name: 'Filter Container Bottom Plate',
    category: 'filter',
    visible: true,
    position: { x: 2.2, y: 0.62, z: -1.75 },
    dimensions: { x: 2.0, y: 0.05, z: 1.0 },
    material: {
      color: '#475569',
      opacity: 0.85,
      roughness: 0.2,
      metalness: 0.3,
      wireframe: false,
      transparent: true,
    },
    parameters: {
      thicknessMm: 6,
      materialType: 'High-Density Cast Acrylic',
    },
  },

  // 5. Transparent Filter Container - Front Wall
  {
    id: 'obj-filter-wall-front',
    name: 'Filter Front Transparent Wall',
    category: 'filter',
    visible: true,
    position: { x: 2.2, y: 1.4, z: -1.26 },
    dimensions: { x: 2.0, y: 1.5, z: 0.04 },
    material: {
      color: '#a0e9fd',
      opacity: 0.25,
      roughness: 0.05,
      metalness: 0.1,
      wireframe: false,
      transparent: true,
    },
    parameters: {
      opticalClarity: '99.2% UV-Stabilized Glass/Acrylic',
      thicknessMm: 4,
    },
  },

  // 6. Transparent Filter Container - Rear Wall
  {
    id: 'obj-filter-wall-back',
    name: 'Filter Rear Wall Panel',
    category: 'filter',
    visible: true,
    position: { x: 2.2, y: 1.4, z: -2.24 },
    dimensions: { x: 2.0, y: 1.5, z: 0.04 },
    material: {
      color: '#1e293b',
      opacity: 0.75,
      roughness: 0.25,
      metalness: 0.3,
      wireframe: false,
      transparent: true,
    },
    parameters: {
      mountBracketType: 'Hang-On Rim Clamp',
      thicknessMm: 5,
    },
  },

  // 7. Transparent Filter Container - Left Wall
  {
    id: 'obj-filter-wall-left',
    name: 'Filter Left Transparent Wall',
    category: 'filter',
    visible: true,
    position: { x: 1.22, y: 1.4, z: -1.75 },
    dimensions: { x: 0.04, y: 1.5, z: 0.96 },
    material: {
      color: '#a0e9fd',
      opacity: 0.25,
      roughness: 0.05,
      metalness: 0.1,
      wireframe: false,
      transparent: true,
    },
    parameters: {
      thicknessMm: 4,
    },
  },

  // 8. Transparent Filter Container - Right Wall
  {
    id: 'obj-filter-wall-right',
    name: 'Filter Right Transparent Wall',
    category: 'filter',
    visible: true,
    position: { x: 3.18, y: 1.4, z: -1.75 },
    dimensions: { x: 0.04, y: 1.5, z: 0.96 },
    material: {
      color: '#a0e9fd',
      opacity: 0.25,
      roughness: 0.05,
      metalness: 0.1,
      wireframe: false,
      transparent: true,
    },
    parameters: {
      thicknessMm: 4,
    },
  },

  // 9. Filter Chamber Baffle 1 (Intake to Bio underflow divider)
  {
    id: 'obj-filter-baffle-1',
    name: 'Chamber Baffle 1 (Underflow)',
    category: 'filter',
    visible: true,
    position: { x: 1.85, y: 1.5, z: -1.75 },
    dimensions: { x: 0.03, y: 1.25, z: 0.92 },
    material: {
      color: '#38bdf8',
      opacity: 0.45,
      roughness: 0.1,
      metalness: 0.1,
      wireframe: false,
      transparent: true,
    },
    parameters: {
      flowPath: 'Bottom Underflow Slot (15mm gap)',
      function: 'Directs mechanical filtrate into bio chamber floor',
    },
  },

  // 10. Filter Chamber Baffle 2 (Bio to Chemical overflow weir)
  {
    id: 'obj-filter-baffle-2',
    name: 'Chamber Baffle 2 (Weir Overflow)',
    category: 'filter',
    visible: true,
    position: { x: 2.55, y: 1.35, z: -1.75 },
    dimensions: { x: 0.03, y: 1.1, z: 0.92 },
    material: {
      color: '#38bdf8',
      opacity: 0.45,
      roughness: 0.1,
      metalness: 0.1,
      wireframe: false,
      transparent: true,
    },
    parameters: {
      flowPath: 'Top Overflow Cascading Weir',
      function: 'Maintains constant bio media water submersion level',
    },
  },

  // 11. Internal Filter Fluid Volume
  {
    id: 'obj-filter-water-interior',
    name: 'Internal Filter Fluid Stream',
    category: 'water',
    visible: true,
    position: { x: 2.2, y: 1.3, z: -1.75 },
    dimensions: { x: 1.9, y: 1.25, z: 0.9 },
    material: {
      color: '#00b4d8',
      opacity: 0.38,
      roughness: 0.05,
      metalness: 0.05,
      wireframe: false,
      transparent: true,
    },
    parameters: {
      internalVolumeLiters: 2.15,
      velocityMs: 0.18,
    },
  },

  // 12. Filter Intake Assembly
  {
    id: 'obj-intake-pipe',
    name: 'Filter Intake Assembly',
    category: 'plumbing',
    visible: true,
    position: { x: 1.55, y: 0.2, z: -1.45 },
    dimensions: { x: 0.16, y: 2.6, z: 0.16 },
    material: {
      color: '#64748b',
      opacity: 0.65,
      roughness: 0.1,
      metalness: 0.3,
      wireframe: false,
      transparent: true,
    },
    parameters: {
      suctionVelocityMs: 0.45,
      strainerCloggedPercent: 8,
    },
  },

  // 13. Stage 1: Mechanical Foam (Seated in Chamber 1)
  {
    id: 'obj-media-stage-1',
    name: 'Stage 1: Mechanical Foam (Chamber 1)',
    category: 'media',
    visible: true,
    position: { x: 1.55, y: 1.25, z: -1.75 },
    dimensions: { x: 0.48, y: 1.05, z: 0.82 },
    material: {
      color: '#2563eb',
      opacity: 0.95,
      roughness: 0.9,
      metalness: 0.1,
      wireframe: false,
      transparent: false,
    },
    parameters: {
      poreRatingPPI: 30,
      cloggedStatusPercent: 15,
      particleCaptureEfficiency: 92,
    },
  },

  // 14. Stage 2: Biological Rings (Seated in Chamber 2)
  {
    id: 'obj-media-stage-2',
    name: 'Stage 2: Bio-Ceramic Matrix (Chamber 2)',
    category: 'media',
    visible: true,
    position: { x: 2.2, y: 1.2, z: -1.75 },
    dimensions: { x: 0.58, y: 0.95, z: 0.82 },
    material: {
      color: '#cbd5e1',
      opacity: 1.0,
      roughness: 0.75,
      metalness: 0.05,
      wireframe: false,
      transparent: false,
    },
    parameters: {
      specificSurfaceAreaM2: 750,
      beneficialBacteriaColonization: 85,
      nitrificationCapacityMgHr: 18.5,
    },
  },

  // 15. Stage 3: Chemical Carbon (Seated in Chamber 3)
  {
    id: 'obj-media-stage-3',
    name: 'Stage 3: Chemical Carbon (Chamber 3)',
    category: 'media',
    visible: true,
    position: { x: 2.85, y: 1.2, z: -1.75 },
    dimensions: { x: 0.48, y: 0.95, z: 0.82 },
    material: {
      color: '#1e293b',
      opacity: 1.0,
      roughness: 0.95,
      metalness: 0.1,
      wireframe: false,
      transparent: false,
    },
    parameters: {
      adsorptionCapacityMgG: 450,
      saturationPercent: 28,
      tanninRemovalRate: 'Optimal',
    },
  },

  // 16. Waterfall Spillway Overflow Lip
  {
    id: 'obj-filter-spillway',
    name: 'Waterfall Return Spillway',
    category: 'plumbing',
    visible: true,
    position: { x: 2.2, y: 1.55, z: -1.15 },
    dimensions: { x: 0.85, y: 0.06, z: 0.3 },
    material: {
      color: '#475569',
      opacity: 0.9,
      roughness: 0.2,
      metalness: 0.5,
      wireframe: false,
      transparent: false,
    },
    parameters: {
      spillwayWidthCm: 18,
      cascadeType: 'Surface Oxygenating Waterfall',
    },
  },

  // 9. Aeration Air Stone
  {
    id: 'obj-air-stone',
    name: 'Submerged Aeration Diffuser',
    category: 'aeration',
    visible: true,
    position: { x: -2.0, y: -1.6, z: 0 },
    dimensions: { x: 0.6, y: 0.25, z: 0.35 },
    material: {
      color: '#0284c7',
      opacity: 0.9,
      roughness: 0.85,
      metalness: 0.1,
      wireframe: false,
      transparent: false,
    },
    parameters: {
      bubbleCount: 120,
      bubblePlumeActive: true,
      dissolvedOxygenSaturationPpm: 8.2,
    },
  },

  // 10. Decorative Hardscape Stone A
  {
    id: 'obj-stone-a',
    name: 'Seiryu Scape Rock Alpha',
    category: 'hardscape',
    visible: true,
    position: { x: -2.2, y: -1.55, z: -0.4 },
    dimensions: { x: 1.1, y: 1.1, z: 1.1 },
    material: {
      color: '#475569',
      opacity: 1.0,
      roughness: 0.9,
      metalness: 0.05,
      wireframe: false,
      transparent: false,
    },
    parameters: {
      weightKg: 5.2,
      texture: 'Chiseled Rugged',
    },
  },

  // 11. Decorative Hardscape Stone B
  {
    id: 'obj-stone-b',
    name: 'Seiryu Scape Rock Beta',
    category: 'hardscape',
    visible: true,
    position: { x: -1.4, y: -1.6, z: 0.3 },
    dimensions: { x: 0.76, y: 0.76, z: 0.76 },
    material: {
      color: '#64748b',
      opacity: 1.0,
      roughness: 0.85,
      metalness: 0.05,
      wireframe: false,
      transparent: false,
    },
    parameters: {
      weightKg: 2.8,
      texture: 'Weathered Slate',
    },
  },
];
