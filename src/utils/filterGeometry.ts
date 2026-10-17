import type {
  Vector3D,
  UnitSystem,
  MetricUnit,
  EditorObject,
  FilterChamberInfo,
  ContainerGeometryConfig,
} from '../types/editor';

// ---------------------------------------------------------------------------
// 1. DIMENSION VALIDATION & LIMITS
// ---------------------------------------------------------------------------
export const CONTAINER_LIMITS = {
  minWidth: 0.4, // 40 cm / 400 mm
  maxWidth: 5.0, // 500 cm / 5000 mm
  minHeight: 0.3, // 30 cm / 300 mm
  maxHeight: 2.8, // 280 cm / 2800 mm
  minDepth: 0.3, // 30 cm / 300 mm
  maxDepth: 2.5, // 250 cm / 2500 mm
  wallThickness: 0.04,
  bottomThickness: 0.05,
};

export interface ValidationResult {
  valid: boolean;
  error?: string;
  clamped: Vector3D;
}

export function validateContainerDimensions(dim: Vector3D): ValidationResult {
  const isNum = (n: any) => typeof n === 'number' && !isNaN(n) && isFinite(n);

  if (!isNum(dim.x) || !isNum(dim.y) || !isNum(dim.z)) {
    return {
      valid: false,
      error: 'Dimensions must be valid finite numbers',
      clamped: {
        x: CONTAINER_LIMITS.minWidth,
        y: CONTAINER_LIMITS.minHeight,
        z: CONTAINER_LIMITS.minDepth,
      },
    };
  }

  const clampedX = Math.min(Math.max(dim.x, CONTAINER_LIMITS.minWidth), CONTAINER_LIMITS.maxWidth);
  const clampedY = Math.min(Math.max(dim.y, CONTAINER_LIMITS.minHeight), CONTAINER_LIMITS.maxHeight);
  const clampedZ = Math.min(Math.max(dim.z, CONTAINER_LIMITS.minDepth), CONTAINER_LIMITS.maxDepth);

  const isValid =
    dim.x >= CONTAINER_LIMITS.minWidth &&
    dim.x <= CONTAINER_LIMITS.maxWidth &&
    dim.y >= CONTAINER_LIMITS.minHeight &&
    dim.y <= CONTAINER_LIMITS.maxHeight &&
    dim.z >= CONTAINER_LIMITS.minDepth &&
    dim.z <= CONTAINER_LIMITS.maxDepth;

  let error: string | undefined;
  if (!isValid) {
    if (dim.x < CONTAINER_LIMITS.minWidth) error = `Width cannot be less than ${CONTAINER_LIMITS.minWidth * 100}cm`;
    else if (dim.x > CONTAINER_LIMITS.maxWidth) error = `Width exceeds maximum of ${CONTAINER_LIMITS.maxWidth * 100}cm`;
    else if (dim.y < CONTAINER_LIMITS.minHeight) error = `Height cannot be less than ${CONTAINER_LIMITS.minHeight * 100}cm`;
    else if (dim.y > CONTAINER_LIMITS.maxHeight) error = `Height exceeds maximum of ${CONTAINER_LIMITS.maxHeight * 100}cm`;
    else if (dim.z < CONTAINER_LIMITS.minDepth) error = `Depth cannot be less than ${CONTAINER_LIMITS.minDepth * 100}cm`;
    else if (dim.z > CONTAINER_LIMITS.maxDepth) error = `Depth exceeds maximum of ${CONTAINER_LIMITS.maxDepth * 100}cm`;
  }

  return {
    valid: isValid,
    error,
    clamped: {
      x: parseFloat(clampedX.toFixed(3)),
      y: parseFloat(clampedY.toFixed(3)),
      z: parseFloat(clampedZ.toFixed(3)),
    },
  };
}

// ---------------------------------------------------------------------------
// 2. UNIT CONVERSIONS & DISPLAY FORMATTING
// ---------------------------------------------------------------------------
export function toDisplayUnits(
  meters: number,
  unitSystem: UnitSystem,
  metricUnit: MetricUnit
): { value: number; unit: string; formatted: string } {
  if (unitSystem === 'imperial') {
    const val = meters * 39.3701;
    return {
      value: parseFloat(val.toFixed(1)),
      unit: 'in',
      formatted: `${val.toFixed(1)} in`,
    };
  }

  if (metricUnit === 'mm') {
    const val = meters * 1000;
    return {
      value: parseFloat(val.toFixed(0)),
      unit: 'mm',
      formatted: `${val.toFixed(0)} mm`,
    };
  }

  // Default metric: cm
  const val = meters * 100;
  return {
    value: parseFloat(val.toFixed(1)),
    unit: 'cm',
    formatted: `${val.toFixed(1)} cm`,
  };
}

export function fromDisplayUnits(
  value: number,
  unitSystem: UnitSystem,
  metricUnit: MetricUnit
): number {
  if (unitSystem === 'imperial') {
    return value / 39.3701;
  }
  if (metricUnit === 'mm') {
    return value / 1000;
  }
  return value / 100;
}

export function formatVolume(liters: number, unitSystem: UnitSystem): string {
  if (unitSystem === 'imperial') {
    const gal = liters * 0.264172;
    return `${gal.toFixed(1)} gal`;
  }
  return `${liters.toFixed(1)} L`;
}

// ---------------------------------------------------------------------------
// 3. CHAMBER GEOMETRY & BOUNDARY CALCULATION
// ---------------------------------------------------------------------------
export function calculateChambers(
  container: EditorObject,
  allObjects: EditorObject[]
): ContainerGeometryConfig {
  const wallThick = CONTAINER_LIMITS.wallThickness;
  const bottomThick = CONTAINER_LIMITS.bottomThickness;

  const innerWidth = Math.max(0.1, container.dimensions.x - 2 * wallThick);
  const innerHeight = Math.max(0.1, container.dimensions.y - bottomThick);
  const innerDepth = Math.max(0.1, container.dimensions.z - 2 * wallThick);

  const leftInnerEdge = container.position.x - innerWidth / 2;
  const rightInnerEdge = container.position.x + innerWidth / 2;

  // Find dividers inside this container
  const dividers = allObjects
    .filter(
      (obj) =>
        obj.visible &&
        (obj.componentType === 'internal-divider' ||
          obj.id.includes('baffle') ||
          obj.name.toLowerCase().includes('divider') ||
          obj.name.toLowerCase().includes('baffle')) &&
        obj.id !== container.id
    )
    .sort((a, b) => a.position.x - b.position.x);

  const chambers: FilterChamberInfo[] = [];
  let prevX = leftInnerEdge;

  // Typical stage naming heuristic
  const stageNames = [
    'Mechanical / Intake',
    'Biological Matrix',
    'Chemical / Media',
    'Submersible Return Pump',
    'Auxiliary Polish Chamber',
  ];

  const assignedStages: FilterChamberInfo['assignedStage'][] = [
    'mechanical',
    'biological',
    'chemical',
    'pump',
  ];

  for (let i = 0; i <= dividers.length; i++) {
    const isLast = i === dividers.length;
    const divider = isLast ? null : dividers[i];
    const dividerHalfThick = divider ? Math.max(0.015, divider.dimensions.x / 2) : 0;
    const currentEndX = isLast ? rightInnerEdge : divider!.position.x - dividerHalfThick;

    const chamberWidth = Math.max(0.02, currentEndX - prevX);
    const usableHeight = innerHeight * 0.85; // typical working water fill level (85%)
    const volumeLiters = parseFloat((chamberWidth * usableHeight * innerDepth * 1000).toFixed(1));
    const volumeGallons = parseFloat((volumeLiters * 0.264172).toFixed(1));

    chambers.push({
      index: i + 1,
      name: `Chamber ${i + 1} (${stageNames[i] || 'Chamber Stage'})`,
      startX: parseFloat(prevX.toFixed(3)),
      endX: parseFloat(currentEndX.toFixed(3)),
      width: parseFloat(chamberWidth.toFixed(3)),
      height: parseFloat(usableHeight.toFixed(3)),
      depth: parseFloat(innerDepth.toFixed(3)),
      volumeLiters,
      volumeGallons,
      assignedStage: assignedStages[i] || 'mechanical',
    });

    if (divider) {
      prevX = divider.position.x + dividerHalfThick;
    }
  }

  const totalInternalVolumeLiters = parseFloat(
    chambers.reduce((sum, ch) => sum + ch.volumeLiters, 0).toFixed(1)
  );
  const totalInternalVolumeGallons = parseFloat(
    (totalInternalVolumeLiters * 0.264172).toFixed(1)
  );

  return {
    width: container.dimensions.x,
    height: container.dimensions.y,
    depth: container.dimensions.z,
    wallThickness: wallThick,
    bottomThickness: bottomThick,
    chambers,
    totalInternalVolumeLiters,
    totalInternalVolumeGallons,
  };
}

// ---------------------------------------------------------------------------
// 4. DIVIDER AUTO-PLACEMENT (IN WIDEST CHAMBER)
// ---------------------------------------------------------------------------
export function getNewDividerPosition(
  container: EditorObject,
  allObjects: EditorObject[]
): { position: Vector3D; dimensions: Vector3D } {
  const config = calculateChambers(container, allObjects);

  // Find widest chamber to split
  let widest = config.chambers[0];
  for (const ch of config.chambers) {
    if (ch.width > widest.width) {
      widest = ch;
    }
  }

  const splitX = parseFloat(((widest.startX + widest.endX) / 2).toFixed(3));
  const innerDepth = Math.max(0.1, container.dimensions.z - 2 * CONTAINER_LIMITS.wallThickness);
  const innerHeight = Math.max(0.1, container.dimensions.y - CONTAINER_LIMITS.bottomThickness);

  return {
    position: {
      x: splitX,
      y: parseFloat((container.position.y + 0.05).toFixed(3)),
      z: parseFloat(container.position.z.toFixed(3)),
    },
    dimensions: {
      x: 0.04,
      y: parseFloat((innerHeight * 0.95).toFixed(3)),
      z: parseFloat((innerDepth * 0.98).toFixed(3)),
    },
  };
}

// ---------------------------------------------------------------------------
// 5. RESIZE CONTAINER WITH SAFE PROPORTIONAL DIVIDER PRESERVATION
// ---------------------------------------------------------------------------
export function resizeContainerAndDividers(
  container: EditorObject,
  allObjects: EditorObject[],
  newDimensions: Vector3D
): {
  updatedContainer: EditorObject;
  updatedDividers: EditorObject[];
  updatedInteriorVolume?: EditorObject;
} {
  const validation = validateContainerDimensions(newDimensions);
  const targetDim = validation.clamped;

  const oldDim = container.dimensions;
  const ratioX = targetDim.x / oldDim.x;

  const wallThick = CONTAINER_LIMITS.wallThickness;
  const bottomThick = CONTAINER_LIMITS.bottomThickness;
  const newInnerDepth = Math.max(0.1, targetDim.z - 2 * wallThick);
  const newInnerHeight = Math.max(0.1, targetDim.y - bottomThick);

  // Find internal dividers
  const dividers = allObjects.filter(
    (obj) =>
      obj.visible &&
      (obj.componentType === 'internal-divider' ||
        obj.id.includes('baffle') ||
        obj.name.toLowerCase().includes('divider') ||
        obj.name.toLowerCase().includes('baffle')) &&
      obj.id !== container.id
  );

  const updatedDividers = dividers.map((div) => {
    // Relative offset from container center
    const relX = div.position.x - container.position.x;
    const scaledRelX = relX * ratioX;

    // Clamp inside new container inner limits
    const maxRelX = targetDim.x / 2 - wallThick * 2;
    const clampedRelX = Math.max(-maxRelX, Math.min(maxRelX, scaledRelX));

    return {
      ...div,
      position: {
        x: parseFloat((container.position.x + clampedRelX).toFixed(3)),
        y: parseFloat((container.position.y + 0.05).toFixed(3)),
        z: container.position.z,
      },
      dimensions: {
        x: div.dimensions.x,
        y: parseFloat((newInnerHeight * 0.95).toFixed(3)),
        z: parseFloat((newInnerDepth * 0.98).toFixed(3)),
      },
    };
  });

  // Calculate new chambers & simulation metadata
  const updatedContainer: EditorObject = {
    ...container,
    dimensions: targetDim,
    parameters: {
      ...container.parameters,
      wallThicknessMm: wallThick * 1000,
      widthMm: targetDim.x * 1000,
      heightMm: targetDim.y * 1000,
      depthMm: targetDim.z * 1000,
      capacityLiters: parseFloat(
        (targetDim.x * targetDim.y * targetDim.z * 850).toFixed(1)
      ),
    },
  };

  // Also adjust internal fluid volume if present
  const interiorWater = allObjects.find(
    (o) => o.id === 'obj-filter-water-interior' || o.id.includes('filter-water')
  );

  let updatedInteriorVolume: EditorObject | undefined;
  if (interiorWater) {
    updatedInteriorVolume = {
      ...interiorWater,
      position: {
        x: container.position.x,
        y: parseFloat((container.position.y - 0.05).toFixed(3)),
        z: container.position.z,
      },
      dimensions: {
        x: parseFloat((targetDim.x - wallThick * 2).toFixed(3)),
        y: parseFloat((newInnerHeight * 0.85).toFixed(3)),
        z: parseFloat(newInnerDepth.toFixed(3)),
      },
      parameters: {
        ...interiorWater.parameters,
        internalVolumeLiters: parseFloat(
          ((targetDim.x - wallThick * 2) * newInnerHeight * 0.85 * newInnerDepth * 1000).toFixed(1)
        ),
      },
    };
  }

  return {
    updatedContainer,
    updatedDividers,
    updatedInteriorVolume,
  };
}
