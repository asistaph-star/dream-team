export const getPositionClass = (pos: string, isAi: boolean): string => {
  const prefix = isAi ? 'a-' : 'h-';
  return `${prefix}${pos.toLowerCase()}`;
};
