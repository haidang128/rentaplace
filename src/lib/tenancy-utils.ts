/** Day number in the 30-day protection window (day 1 = move-in day). */
export function dayOfLoop(moveInDate: string): number {
  const moveIn = new Date(`${moveInDate}T00:00:00`);
  return Math.floor((Date.now() - moveIn.getTime()) / (24 * 60 * 60 * 1000)) + 1;
}
