export function getNearestValuesByProperty<T>(
  data: any[],
  property: keyof typeof data[0],
  target: number
) {
  let currentObj1 = data[0];
  let currentObj2 = data[data.length - 1];

  for (let i = 0; i < data.length; i++) {
    let obj = data[i];

    if (obj[property] <= target) {
      currentObj1 = obj;
    }
  }

  for (let i = data.length - 1; i >= 0; i--) {
    let obj = data[i];

    if (obj[property] >= target) {
      currentObj2 = obj;
    }
  }

  let foundValues = [] as any[];

  if (
    Math.abs(currentObj1[property] - target) ===
    Math.abs(currentObj2[property] - target)
  ) {
    foundValues = [currentObj1, currentObj2];
  } else if (
    Math.abs(currentObj1[property] - target) >
    Math.abs(currentObj2[property] - target)
  ) {
    foundValues = [currentObj2];
  } else if (
    Math.abs(currentObj1[property] - target) <
    Math.abs(currentObj2[property] - target)
  ) {
    foundValues = [currentObj1];
  } else {
    foundValues = [];
  }

  foundValues = [...new Set(foundValues)];

  return foundValues;
}
