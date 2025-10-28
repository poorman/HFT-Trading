import { create } from 'zustand'

interface Execution {
  order_id: string
  client_order_id: string
  symbol: string
  side: string
  fill_price: number
  fill_qty: number
  timestamp: Date | string
}

interface Position {
  symbol: string
  quantity: number
  avg_price: number
  unrealized_pnl: number
  realized_pnl: number
}

interface ExecutionStore {
  executions: Execution[]
  addExecution: (execution: Execution) => void
  clearExecutions: () => void
}

interface PositionStore {
  positions: Position[]
  setPositions: (positions: Position[]) => void
  updatePosition: (symbol: string, position: Position) => void
}

export const useExecutionStore = create<ExecutionStore>((set) => ({
  executions: [],
  addExecution: (execution) =>
    set((state) => ({
      executions: [execution, ...state.executions].slice(0, 100), // Keep last 100
    })),
  clearExecutions: () => set({ executions: [] }),
}))

export const usePositionStore = create<PositionStore>((set) => ({
  positions: [],
  setPositions: (positions) => set({ positions }),
  updatePosition: (symbol, position) =>
    set((state) => {
      const existing = state.positions.findIndex((p) => p.symbol === symbol)
      if (existing >= 0) {
        const newPositions = [...state.positions]
        newPositions[existing] = position
        return { positions: newPositions }
      } else {
        return { positions: [...state.positions, position] }
      }
    }),
}))

