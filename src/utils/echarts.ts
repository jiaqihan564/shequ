/**
 * ECharts on-demand import configuration
 * Only imports the required chart types and components to reduce bundle size
 */

// Import required chart types
import { BarChart, LineChart, PieChart, MapChart } from 'echarts/charts'

// Import required components
import {
  TitleComponent,
  TooltipComponent,
  GridComponent,
  LegendComponent,
  VisualMapComponent,
  DataZoomComponent,
  GeoComponent
} from 'echarts/components'
import * as echarts from 'echarts/core'

// Import features
import { LabelLayout, UniversalTransition } from 'echarts/features'

// Import renderer
import { CanvasRenderer } from 'echarts/renderers'

// Register all required components
echarts.use([
  // Chart types
  BarChart,
  LineChart,
  PieChart,
  MapChart,

  // Components
  TitleComponent,
  TooltipComponent,
  GridComponent,
  LegendComponent,
  VisualMapComponent,
  DataZoomComponent,
  GeoComponent,

  // Features
  LabelLayout,
  UniversalTransition,

  // Renderer
  CanvasRenderer
])

// Export echarts core with all registered components
export default echarts

// Also export as named export for compatibility
export { echarts }

// Export graphic for LinearGradient usage
export const graphic = echarts.graphic
