import React, { useState } from 'react';

import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Form from 'react-bootstrap/Form'
import InputGroup from 'react-bootstrap/InputGroup'

import LineConfig from './configs/LineConfig';
import ScatterConfig from './configs/ScatterConfig';
import BalloonConfig from './configs/BalloonConfig';
import ParallelCoordsConfig from './configs/ParallelCoordsConfig';
import BarConfig from './configs/BarConfig';
import PieConfig from './configs/PieConfig';
import HistogramConfig from './configs/HistogramConfig';
import CorrelationConfig from './configs/CorrelationConfig';

import { getChartTypes, initializeConfig } from './Visualizer.prototype';

import HelpIcon from '../../../common/components/HelpIcon';

import "../../../../css/Core.css"
import "../../../../css/Spinners.css"
import  "./css/VizConfig.css"

function Configurator(props) {
  const { configBox, columns, types, config, setChartConfig } = props

  const chart = config.chart
  const numCols = columns.filter( d => types[d] == 'Numerical')
  const catCols = columns.filter( d => types[d] == 'Ordinal' || types[d] == 'Nominal')
  const dateCols = columns.filter( d => types[d] == "DateTime")

  /**
   * Initializes chart config when the chart type is changed.
   */
  const onChangeChart = (evt) => {
    const type = evt.target.value
    setChartConfig(
      initializeConfig(
        type,
        columns,
        numCols,
        catCols,
        dateCols
      )
    )
  }

  /**
   * Returns the appropriate chart config component based on chart type.
   * @param {string} type - chart type
   */
  const configSelect = (type) => {
    switch(type){
      case 'Line Chart':
        return <LineConfig columns={columns} types={types} config={config} setChartConfig={setChartConfig} />;
      case 'Scatterplot':
        return <ScatterConfig columns={columns} types={types} config={config} setChartConfig={setChartConfig} />;
      case 'Balloon Chart':
        return <BalloonConfig columns={catCols} types={types} config={config} setChartConfig={setChartConfig} />;      
      case 'Bar Chart': 
        return <BarConfig columns={columns} types={types} config={config} setChartConfig={setChartConfig} />;
      case 'Pie Chart':
        return <PieConfig columns={columns} types={types} config={config} setChartConfig={setChartConfig} />;
      case 'Histogram':
        return <HistogramConfig columns={columns} types={types} config={config} setChartConfig={setChartConfig} />;
      case 'Parallel Coordinates': 
        return <ParallelCoordsConfig columns={columns} types={types} config={config} setChartConfig={setChartConfig} />;
      case 'Correlation Plot':
        return <CorrelationConfig columns={numCols} types={types} config={config} setChartConfig={setChartConfig} />;  
      default: 
        return null;
    }
  }

  const charts = getChartTypes(columns, numCols, catCols, dateCols)

  return (
    <div className="contentdiv" style={configBox}>
      <label className="contentDivHead" title={"Configurator"}>Configurator</label>
      <HelpIcon
        content={
          `This panel contains the controls used to create a visualization for your data.
          You can select a base visualization (scatterplot or line chart) and then configure them with multiple options.`
        }
      />
      <Container style={{marginTop: 25, overflow: "auto", height: "calc(100% - 65px)"}}>
        <Row data-testid="baseChartOptions">
          <InputGroup size='sm' className="mb-3">
            <InputGroup.Text id="basic-addon2" style={{width: 160, height: 32}}>Base Chart</InputGroup.Text>
            <Form.Select
              aria-label="encoding"
              name="encoding"
              value={chart}
              onChange={onChangeChart} >
              {
                charts.map( d =>
                  <option
                    key={`opt-${d.chart}`}
                    style={{color: d.disabled ? "#cccccc" : "000000"}}
                    value={d.chart}
                    disabled={d.disabled}>
                      {d.chart}
                  </option>
                )
              }
            </Form.Select>
          </InputGroup>
        </Row>
        {configSelect(chart)}
      </Container>
    </div>
  );
}

export default Configurator;
