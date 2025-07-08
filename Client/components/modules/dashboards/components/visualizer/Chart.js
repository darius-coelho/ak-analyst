import React from 'react';
import { ContextMenu, MenuItem } from "react-contextmenu";

import LineChart from './charts/LineChart';
import ScatterPlot from './charts/ScatterPlot';
import BalloonPlot from './charts/BalloonPlot';
import ParallelCoords from './charts/ParallelCoords';
import BarChart from './charts/BarChart';
import PieChart from './charts/PieChart';
import Histogram from './charts/Histogram';
import CorrelationPlot from './charts/CorrelationPlot';

import { isConfigAligned } from './Visualizer.prototype';

import HelpIcon from '../../../common/components/HelpIcon';

import { downloadChart } from '../../../common/components/downloadChart';

import "../../../../css/Core.css"
import "../../../../css/Spinners.css"
import  "./css/VizConfig.css"


/** Shows a useful error message if the config is invalid.  */
function VizErrorMessage(props) {
  const { config } = props;
  let message = "Invalid Config. Please update config with valid parameters.";
  if (config.chart === "None") {
    message = "Please select a chart from the dropdown on the left.";
  }
  
  return (
      <div className='vizErrorMessage'>
        {message}
      </div>
  );
}

function Chart(props) {
  const { vizBox, columns, types, data, config } = props

  const { width, height, top, left } = vizBox

  const pad = 80

  const chartSelect = (type) => {
    switch(type){
      case 'Line Chart':
        return <LineChart
                data={data}
                types={types}
                X={config.x}
                Y={config.y}
                width={width }
                height={height-50}
                padding={pad}
              />;
      case 'Scatterplot':
        return <ScatterPlot
                data={data}
                types={types}
                X={config.x}
                Y={config.y}
                R={config.r}
                C={config.color}
                pointColor={config.pointColor}
                rSizeMin={config.rSizeMin}
                rSizeMax={config.rSizeMax}
                width={width }
                height={height-50}
                padding={pad}
              />;
      case 'Balloon Chart':
        return <BalloonPlot
                data={data}
                types={types}
                X={config.x}
                Y={config.y}
                pointColor={config.pointColor}
                rSizeMin={config.rSizeMin}
                rSizeMax={config.rSizeMax}
                width={width }
                height={height-50}
                padding={pad+40}
              />;
      case 'Parallel Coordinates':
        return <ParallelCoords
                data={data}
                types={types}
                attrs={config.attrs}
                lineColor={config.lineColor}
                lineThickness={config.lineThickness}
                width={width }
                height={height-50}
                padding={pad+40}
              />;
      case 'Bar Chart':
        return <BarChart
                data={data}
                types={types}
                X={config.x}
                Y={config.y}
                func={config.func}
                C={config.color}
                barColor={config.barColor}
                width={width}
                height={height-50}
                padding={pad+40}
                {...config}
               />;
      case 'Histogram':
        return <Histogram
                data={data}
                types={types}
                width={width}
                height={height-50}
                padding={pad+40}
                {...config}
              />;
      case 'Pie Chart':
        return <PieChart
                data={data}
                types={types}
                width={width}
                height={height-50}
                padding={pad+40}
                {...config}
              />;
      case 'Correlation Plot':
        return <CorrelationPlot
                data={data}
                types={types}                
                width={width }
                height={height-50}
                padding={pad+40}
                {...config}
              />;
      default:
        return null;
    }
  }

  const onDownloadChart = (e, data) => {
    const fname = `${data.name}.png`
    downloadChart(1, fname, data.tagClass)
  }

  return (
    <div className="contentdiv" style={vizBox}>
      <ContextMenu id="svg_context_menu">
        <MenuItem onClick={onDownloadChart}>
          Save
        </MenuItem>
        <MenuItem>
          Cancel
        </MenuItem>
      </ContextMenu>
      <label className="contentDivHead" title={"Visualizations"}>Visualizations</label>
      <HelpIcon
        content={
          `This panel displays the visualization you have configured.
          If a configuration is invalid, this panel will remain blank.`
        }
      />
      {
        isConfigAligned(config)
        ? chartSelect(config.chart)
        : <VizErrorMessage config={config} />
      }
    </div>
  );
}

export default Chart;
