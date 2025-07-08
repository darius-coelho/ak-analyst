import React, { useState, useEffect } from 'react';

import NaviBar from '../../../common/components/NaviBar';
import Configurator from './Configurator';
import Chart from './Chart';

import "../../../../css/Core.css"
import "../../../../css/Spinners.css"

import mixpanel from 'mixpanel-browser';

function Visualizer(props) {
  const { data, columns, types, config } = props
  const charts = JSON.parse(JSON.stringify(config.charts))
  
  const pad = 10;

  const [dims, setDims] = useState({
    configBox: {
      width: 0.2*window.innerWidth,
      height: window.innerHeight - 3*pad - 40,
      top: pad,
      left: pad
    },
    vizBox: {
      width: window.innerWidth - 3*pad - 0.2*window.innerWidth,
      height: window.innerHeight - 2*pad,
      top: pad,
      left: 2*pad + 0.2*window.innerWidth
    }
 })

  useEffect(() => {
    mixpanel.track("Page View", {'name': 'visualizer'});
    
    function handleResize() {
      setDims({
        configBox: {
          width: 0.2*window.innerWidth,
          height: window.innerHeight - 2*pad - 35,
          top: pad + 35,
          left: pad
        },
        vizBox: {
          width: window.innerWidth - 3*pad - 0.2*window.innerWidth,
          height: window.innerHeight - 2*pad - 35,
          top: pad + 35,
          left: 2*pad + 0.2*window.innerWidth
        }
      })
    }

    window.addEventListener('resize', handleResize)
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, [])

  const [chartConfig, setChartConfig] = useState(charts.length > 0 ? {...charts[0]} :  {chart: "None"})

  const changeConfig = (newConfig) => {
    setChartConfig(newConfig)
  }

  const saveConfig = () => {
    props.setParams({
      ...config,
      charts: [chartConfig]
    })
  }

  return (
    <div>
      <Configurator
        configBox={dims.configBox}
        columns={columns}
        types={types}
        config={chartConfig}
        setChartConfig={changeConfig}
      />
      
      <Chart
        vizBox={dims.vizBox}
        data={data}
        config={chartConfig}
        columns={columns}
        types={types}
      />          

      <NaviBar
        backToData = {{pathname: "/main"}}
        onBack={saveConfig}
      />      
    </div>
  );
}

export default Visualizer;
