/**
 * Type declarations for echarts-gl
 * Since echarts-gl doesn't provide official TypeScript definitions,
 * we declare the modules we need for our on-demand imports
 */

declare module 'echarts-gl/charts' {
  export const Bar3DChart: any
  export const Scatter3DChart: any
  export const Line3DChart: any
  export const Lines3DChart: any
  export const Scatter3DChart: any
  export const Surface3DChart: any
}

declare module 'echarts-gl/components' {
  export const Grid3DComponent: any
  export const Geo3DComponent: any
  export const Globe3DComponent: any
}

