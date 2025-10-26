/**
 * ECharts on-demand import configuration
 * Only imports the required chart types and components to reduce bundle size
 */

import * as echarts from 'echarts/core'

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

// Import features
import { LabelLayout, UniversalTransition } from 'echarts/features'

// Import renderer
import { CanvasRenderer } from 'echarts/renderers'

// Import 3D components from echarts-gl for location distribution
import { Bar3DChart, Scatter3DChart } from 'echarts-gl/charts'
import { Grid3DComponent, Geo3DComponent } from 'echarts-gl/components'

// Register all required components
echarts.use([
  // Chart types
  BarChart,
  LineChart,
  PieChart,
  MapChart,
  Bar3DChart,
  Scatter3DChart,
  
  // Components
  TitleComponent,
  TooltipComponent,
  GridComponent,
  LegendComponent,
  VisualMapComponent,
  DataZoomComponent,
  GeoComponent,
  Grid3DComponent,
  Geo3DComponent,
  
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

