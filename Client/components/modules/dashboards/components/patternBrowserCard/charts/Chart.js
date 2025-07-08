import React, { useState, useEffect, useContext } from 'react';
import axios from "axios"

import ScatterPlot from './ScatterPlot';
import ColumnChart from './ColumnChart'

import Form from 'react-bootstrap/Form';
import FormControl from 'react-bootstrap/FormControl';

import { isInRangeInt } from '../../../../utilities/utilities';

import AddressContext from '../../../../../AddressContext';

import { useInfoToastContext } from '../../../../common/components/InfoToastContext';

/**
 * Renders a switch to toggle data filtering
 * @param {bool} showOnlyFilter - The switch state
 * @param {string} onCheckChange - Function to toggle the switch state
 */
const ChartControls = (props) => {
  const {showOnlyFilter, onCheckChange, isSample, onIsSampleChange, nSample, setNSample} = props

  const [tmpSample, setTmpSample] = useState(nSample)

  /* Toggles the isSample flag */
  const onTmpSampleChange = (evt) => {
    setTmpSample(+evt.target.value)
  }

  const onSetSample = (evt) => {
    setNSample(tmpSample)
  }
  
  return(
    <div style={{width: 'fit-content', display: 'inline-block', marginTop: 8}}>
      <Form.Check
        type="switch"
        label="Only show points in filters"
        name="is_filter"
        className="optionLabel"
        style={{display: 'inline-block'}}
        checked={showOnlyFilter}
        onChange={onCheckChange} />
      <Form.Check
        type="switch"
        label="Data sampling"
        name="is_sample"
        className="optionLabel"
        style={{display: 'inline-block', margin:"0px 10px"}}
        checked={isSample}
        onChange={onIsSampleChange} />
      <FormControl
        defaultValue={tmpSample}
        name="nsamples"
        type="number"
        min={1}
        style={{
          color: isInRangeInt(tmpSample, 1, 'inf', 'include') ? "#000000" : "#e32222",
          display: "inline-block",
          lineHeight: 1,
          fontSize: ".8rem",
          padding: "0.2rem",
          width: 75,
        }}
        aria-label="header-row"
        aria-describedby="basic-addon2"
        data-testid="num-samples"
        disabled={!isSample}
        onChange={onTmpSampleChange}
      />
      {
        nSample != tmpSample
        ? <button className="coreButtonSmall" onClick={onSetSample} >{"Apply"}</button>
        : null
      }      
    </div>
  )
}

/**
 * Renders an approriate chart based on the data
 * @param {json} catLabels - Object that contains all categories in a nomial attribute
 * @param {string} targetType - The mining target type
 * @param {list} data - The data to be rendered
 * @param {string} X - The attribute to be shown on the x-axis
 * @param {string} Y - The attribute to be shown on the y-axis 
 * @param {list} filters - A list of filters to be applied to the data
 * @param {int} width - The chart width
 * @param {int} height - The chart height
 * @param {int} padding - The chart padding
 */
const Chart = (props) => {
  // get react context that stores the web address for the ak engine api
  const context = useContext(AddressContext);

  // get react context to set an info toast
  const addInfoToast = useInfoToastContext();

  const { catLabels, targetType, X, Y, filters,
	  xOptions, setSelectedAttr, width, height, padding } = props
   
  const [dataWait, setDataWait] = useState(false)
  const [showOnlyFilter, setShowOnlyFilter] = useState(false)
  const [isSample, setIsSample] = useState(true)
  const [nSample, setNSample] = useState(1000)
  const [chartData, setChartData] = useState(null)
  
  // Updates the chart data based on the showOnlyFilter
  useEffect(() => {
    let mounted = true;
    if(mounted && context.address) {
      const endPoint = context.address + "GetPlotData"
      const reqData = {
        X: X,
        Y: Y,
        targetType: targetType,
        filters: filters,      
        isSample: isSample,
        nSample: nSample
      }
      setDataWait(true)
      axios.post(endPoint, reqData, {withCredentials: true})
      .then((response) => {
        setDataWait(false)
        if(response.data){
          if(reqData.targetType=="numeric"){
            setChartData({
              ...response.data,
              inData: JSON.parse(response.data.inData),
              outData: JSON.parse(response.data.outData)
            })
          }
          else {
            setChartData(response.data)
          }        
        }
      })
      .catch(error => {
        console.log(error)
        addInfoToast(error.response.data.err, 'danger')
      });
    }
    return () => mounted = false;    
  }, [X, Y, filters, nSample, isSample])


  /* Toggles the showOnlyFilter flag */
  const onCheckChange = (evt) => {
    setShowOnlyFilter(!showOnlyFilter)
  }

  /* Toggles the isSample flag */
  const onIsSampleChange = (evt) => {
    setIsSample(!isSample)
  }

  const isYCat = catLabels.hasOwnProperty(Y) || targetType != 'numeric'

  const types = {
    [X]: catLabels.hasOwnProperty(X) ? 'Categorical' : 'Numerical',
    [Y]: catLabels.hasOwnProperty(Y) ? 'Categorical' : 'Numerical'
  }

  const loaderOverlay = <div style={{position: "absolute", width: width, height: height, marginLeft: `calc(50% - ${width/2}px)`}}>
                          <div className="loaderContainer" style={{border: "none"}}>
                            <div className="loaderBarA" style={{top: "40%"}} />
                          </div>
                        </div>
  
  return(
    <div style={{textAlign: "center", position: "relative"}}>
      {
        dataWait
        ? loaderOverlay
        : null
      }
      {
        isYCat
        ? <ColumnChart
            catLabels={catLabels}
            data={chartData}
            X={X}
            Y={Y}
            filters={filters}
            showOnlyFilter={showOnlyFilter}
            {...{width, height, padding, xOptions, setSelectedAttr}}
          />
        : <ScatterPlot
            chartData={chartData}
            types={types}
            X={X}
            Y={Y}
            filters={filters}
            showOnlyFilter={showOnlyFilter}
            {...{width, height, padding, xOptions, setSelectedAttr}}
          />
      } 
      <ChartControls 
        {...{
          showOnlyFilter,
          onCheckChange,
          isSample,
          onIsSampleChange,
          nSample,
          setNSample
        }}
      />
    </div>
  )
}

export default Chart;
