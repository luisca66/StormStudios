export class GameState {
  private currentFloor: number = 0;
  private totalErrors: number = 0;
  private maxFloorReached: number = 0;
  private isPerfect: boolean = true;

  constructor() {}

  public submitAnswer(isCorrect: boolean): void {
    if (isCorrect) {
      // Subir un piso, max 20
      this.currentFloor = Math.min(this.currentFloor + 1, 20);
      if (this.currentFloor > this.maxFloorReached) {
        this.maxFloorReached = this.currentFloor;
      }
    } else {
      // Bajar un piso, min 0
      this.currentFloor = Math.max(this.currentFloor - 1, 0);
      this.totalErrors++;
      this.isPerfect = false;
    }
  }

  public hasWon(): boolean {
    return this.currentFloor >= 20;
  }

  public getIsPerfect(): boolean { return this.isPerfect; }
  public getCurrentFloor() { return this.currentFloor; }
  public getTotalErrors() { return this.totalErrors; }
  public getMaxFloor() { return this.maxFloorReached; }
}
