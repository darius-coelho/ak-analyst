import React from 'react';
import ScatterPlot from './ScatterPlot';
import BoxAndWhisker from './BoxWhisker';
import BarChart from './BarChart'
import BinaryHistogram from './BinaryHistogram'

const NumNumViz = (props) => {
  const { width, height, target, mean, shap, rawData, catLabels } = props

  return <ScatterPlot
            data={rawData}
            X={shap.attribute}
            Y={target}
            catLabels={catLabels}
            filter={shap.range}
            mu={+mean}
            width={width - 525}
            height={height - 5}
            padding={50}
          />
}

const CatNumViz = (props) => {
  const { width, height, target, mean, shap, rawData, catLabels } = props
  
  const attribute = shap.attribute;
  const range = shap.range.map(d=>`${d}`);  // convert to string type
  const data = rawData.map(d=>({...d, label: `${d.label}`}));
  
  const bwInRange = data.filter(d=>range.includes(`${d.label}`));
  const bwData = data.filter(d=>!range.includes(`${d.label}`)).concat(bwInRange);

  const filter = [bwInRange[0].label, bwInRange[bwInRange.length-1].label]
  
  return <BoxAndWhisker
          data={bwData}
          X={attribute}
          Y={target}
          filter={filter}
          mu_t={+mean}
          width={width - 525}
          height={height - 5}
          padding={50}
        />
}

const NumCatViz = (props) => {
  const { width, height, target, shap, rawData} = props  
  
  const adjRange = shap.range.map((d,i)=>{
    if (d === "-inf")  return rawData[0].division[0];
    if (d === "inf")  return rawData[0].division[rawData[0].division.length - 1];
    
    // NOTE: Need a better way of handling adjusting the range to the bar bounds.
    return +d; 
  }); 
 
  return <BinaryHistogram
          data={rawData} 
          X={shap.attribute}
          Y={target}
          filter={adjRange}
          width={width - 525}
          height={height - 5}
          padding={50}
        />
}

const CatCatViz = (props) => {
  const { width, height, target, prob, shap, rawData, catLabels } = props
  
  const attribute = shap.attribute;
  const catLabelsAttr = catLabels[attribute];
  
  const range = shap.range;
  const labelsInRange = catLabelsAttr.filter(d=>range.includes(d));
  const labels = catLabelsAttr.filter(d=>!range.includes(d)).concat(labelsInRange);
  const filter = [labelsInRange[0], labelsInRange[labelsInRange.length-1]];
  
  return <BarChart
          data={rawData}
          xattr={attribute}
          yattr={target}
          labels={labels}
          filter={filter}
          mu_t={+prob}
          width={width - 525}
          height={height - 5}
          padding={50}
        />
}

export default function GroupDetailViz(props) {  
  const { width, height, selectedIdx, dataWait } = props;
  const { data, rawData, target, targetType, catLabels } = props;

  if(selectedIdx == null || rawData == null){
    return (
      <div style={{position: "absolute", width: width - 520, height: height,  left: 501,  borderLeft: "1px #d0d0d0 solid", paddingLeft: 20}}>            
        <div className="placeholderText">
          {"Select an feature from the panel on the left"}
        </div>
      </div>
    );
  }

  if(dataWait){
    return (
      <div style={{position: "absolute", width: width - 520, height: height,  left: 501,  borderLeft: "1px #d0d0d0 solid", paddingLeft: 20}}>
        <div className="loaderContainer" style={{border: "none"}}>
          <div className="loaderBarA" style={{top: "40%"}} />
        </div>
      </div>
    );
  }

  const xType = Object.keys(catLabels).includes(data.shap[selectedIdx].attribute)
                ? "Cat"
                : "Num"

  const yType = targetType == "binary" ? "Cat" : "Num"

  const genChart = (type) => {
    switch(type){
      case "NumNum": 
        return (
          <NumNumViz
            width={width}
            height={height}
            target={target}
            mean={+data.mu}            
            catLabels={catLabels}
            shap={data.shap[selectedIdx]}
            rawData={rawData}         
          />
        );
      case "CatNum": 
        return (
          <CatNumViz
            width={width}
            height={height}
            target={target}
            mean={+data.mu}            
            catLabels={catLabels}
            shap={data.shap[selectedIdx]}
            rawData={rawData}         
          />
        );
      case "NumCat": 
        return (
          <NumCatViz
            width={width}
            height={height}
            target={target}             
            shap={data.shap[selectedIdx]}
            rawData={rawData}          
          />
        );
      case "CatCat": 
        return (
          <CatCatViz
            width={width}
            height={height}
            target={target}
            prob={data.prob}            
            catLabels={catLabels}
            shap={data.shap[selectedIdx]}
            rawData={rawData}          
          />
        );
      default:
        return (
          <div className="placeholderText">{"No visualization available"}</div>
        );
    }
  }

  return (
    <div style={{position: "absolute", width: width - 520, height: height,  left: 501,  borderLeft: "1px #d0d0d0 solid", paddingLeft: 20}}>            
      {genChart(xType+yType)}      
    </div>
  );
  
}
