import React from 'react';
import "../../../../css/Core.css"
import "./css/PatternBrowser.css"

export default class Summary extends React.Component {

  render() {
    if(this.props.data == null) {
      return  <div className="placeholderText">Select a target variable and click mine patterns</div>
    }  

    const divStyle ={
      width: (this.props.width- 4*20) / 3,
      boxSizing: 'unset'
    }

    if(this.props.targetType == "binary"){
      // Compute counts of data items for target 1 and 0 over entire dataset
      const N1 = Math.round(this.props.defaultData.prob * this.props.defaultData.size);
      const N0 =  this.props.defaultData.size - N1;
      if(this.props.data.size == this.props.defaultData.size){
        
        return (
          <div>
            <div className="patternSummaryStatDiv" style={divStyle}>
              <label className="patternSummaryStatLabel">Count: </label>
             <label className="patternSummaryStatValue">{ this.props.data.size }</label>
            </div>
            <div className="patternSummaryStatDiv" style={divStyle}>
              <label className="patternSummaryStatLabel">Count 1:</label>
             <label className="patternSummaryStatValue">{ N1 }</label>            
            </div>
            <div className="patternSummaryStatDiv" style={divStyle}>
              <label className="patternSummaryStatLabel">Count 0:</label>
             <label className="patternSummaryStatValue">{ N0 }</label>            
            </div>
            <div className="patternSummaryStatDiv" style={{...divStyle, width: (this.props.width- 3*20)/2}}>
              <label className="patternSummaryStatLabel">Probability:</label>
             <label className="patternSummaryStatValue"> { (+this.props.data.prob).toFixed(2) } </label>           
            </div>
            <div className="patternSummaryStatDiv" style={{...divStyle, width: (this.props.width- 3*20)/2}}>
              <label className="patternSummaryStatLabel">Odds:</label>
             <label className="patternSummaryStatValue">{ (N1/N0).toFixed(2) }</label>            
            </div>
          </div>
        );
      }
      else{
        // Compute counts of data items for target 1 and 0 for selected pattern
        const sN1 = Math.round(this.props.data.prob * this.props.data.size);
        const sN0 =  this.props.data.size - sN1;
        
        // Compute difference between selected pattern and entire dataset
        var diff={
          N1: sN1-N1,
          N0: sN0-N0,
          prob: this.props.data.prob-this.props.defaultData.prob,
          odds: (sN1/sN0) - (N1/N0),
        }
  
        var color={
          N1: diff.N1 < 0 ? "#ce3f3f" : "#009a5e",
          N0: diff.N0 < 0 ? "#ce3f3f" : "#009a5e",
          prob: diff.prob < 0 ? "#ce3f3f" : "#009a5e",
          odds: diff.odds < 0 ? "#ce3f3f" : "#009a5e",
        }


        return <div>
                <div className="patternSummaryStatDiv" style={divStyle}>
                  <label className="patternSummaryStatLabel">Count: </label>
                  <label className="patternSummaryStatValue">{ this.props.data.size }</label>
                 <label className="patternSummaryStatDiff">{ (100*this.props.data.size/this.props.defaultData.size).toFixed(1) + "% of total" }</label>
                </div>
                <div className="patternSummaryStatDiv" style={divStyle}>
                  <label className="patternSummaryStatLabel">Count 1:</label>
                  <label className="patternSummaryStatValue">{(sN1).toFixed(2) }</label>            
                  <label className="patternSummaryStatDiff" style={{color: color.N1}}>
                    {
                      diff.N1 < 0
                      ? diff.N1.toFixed(1) 
                      : "+" + diff.N1.toFixed(1) 
                    }
                    </label>
                </div>
                <div className="patternSummaryStatDiv" style={divStyle}>
                  <label className="patternSummaryStatLabel">Count 0:</label>
                  <label className="patternSummaryStatValue">{ (sN0).toFixed(2) }</label>            
                  <label className="patternSummaryStatDiff" style={{color: color.N0}}>
                    {
                      diff.N0 < 0
                      ? diff.N0.toFixed(1) 
                      : "+" + diff.N0.toFixed(1) 
                    }
                    </label>
                </div>
                <div className="patternSummaryStatDiv" style={{...divStyle, width: (this.props.width- 3*20)/2}}>
                  <label className="patternSummaryStatLabel">Probability:</label>
                  <label className="patternSummaryStatValue"> { (+this.props.data.prob).toFixed(2) } </label> 
                  <label className="patternSummaryStatDiff" style={{color: color.prob}}>
                    {
                      diff.prob < 0
                      ? diff.prob.toFixed(2) 
                      : "+" + diff.prob.toFixed(2) 
                    }
                    </label>          
                </div>
                <div className="patternSummaryStatDiv" style={{...divStyle, width: (this.props.width- 3*20)/2}}>
                  <label className="patternSummaryStatLabel">Odds:</label>
                  <label className="patternSummaryStatValue">{ (sN1/sN0).toFixed(2) }</label> 
                  <label className="patternSummaryStatDiff" style={{color: color.odds}}>
                    {
                      diff.odds < 0
                      ? diff.odds.toFixed(2) 
                      : "+" + diff.odds.toFixed(2) 
                    }
                    </label>           
                </div>
                
              </div>
      }
      
    }

    if(this.props.data.size == this.props.defaultData.size){
      return (
        <div>
          <div className="patternSummaryStatDiv" style={divStyle}>
            <label className="patternSummaryStatLabel">Count: </label>
           <label className="patternSummaryStatValue">{ this.props.data.size }</label>
          </div>
          <div className="patternSummaryStatDiv" style={divStyle}>
            <label className="patternSummaryStatLabel">Mean:</label>
           <label className="patternSummaryStatValue">{(+this.props.data.mu).toFixed(2) }</label>            
          </div>
          <div className="patternSummaryStatDiv" style={divStyle}>
            <label className="patternSummaryStatLabel">Std. Dev.:</label>
           <label className="patternSummaryStatValue">{ (+this.props.data.sig).toFixed(2) }</label>            
          </div>
          <div className="patternSummaryStatDiv" style={divStyle}>
            <label className="patternSummaryStatLabel">Min:</label>
           <label className="patternSummaryStatValue"> { (+this.props.data.min).toFixed(2) } </label>           
          </div>
          <div className="patternSummaryStatDiv" style={divStyle}>
            <label className="patternSummaryStatLabel">Median:</label>
           <label className="patternSummaryStatValue">{ (+this.props.data.med).toFixed(2) }</label>            
          </div>
          <div className="patternSummaryStatDiv" style={divStyle}>
            <label className="patternSummaryStatLabel">Max:</label>
           <label className="patternSummaryStatValue">{ (+this.props.data.max).toFixed(2) }</label>            
          </div>
        </div>
      );
    }
    else{
      var diff={
        mu: this.props.data.mu-this.props.defaultData.mu,
        min: this.props.data.min-this.props.defaultData.min,
        max: this.props.data.max-this.props.defaultData.max,
        med: this.props.data.med-this.props.defaultData.med,
        sig: this.props.data.sig-this.props.defaultData.sig,
      }

      var color={
        mu: diff.mu < 0 ? "#ce3f3f" : "#009a5e",
        min: diff.min < 0 ? "#ce3f3f" : "#009a5e",
        max: diff.max < 0 ? "#ce3f3f" : "#009a5e",
        med: diff.med < 0 ? "#ce3f3f" : "#009a5e",
        sig: diff.sig < 0 ? "#ce3f3f" : "#009a5e",
      }

      return (
        <div>
          <div className="patternSummaryStatDiv" style={divStyle}>
            <label className="patternSummaryStatLabel">Count: </label>
           <label className="patternSummaryStatValue">{ this.props.data.size }</label>
           <label className="patternSummaryStatDiff">{ (100*this.props.data.size/this.props.defaultData.size).toFixed(1) + "% of total" }</label>
          </div>
          <div className="patternSummaryStatDiv" style={divStyle}>
            <label className="patternSummaryStatLabel">Mean:</label>
           <label className="patternSummaryStatValue">{(+this.props.data.mu).toFixed(2) }</label>            
           <label className="patternSummaryStatDiff" style={{color: color.mu}}>
             {
               diff.mu < 0
               ? diff.mu.toFixed(1) 
               : "+" + diff.mu.toFixed(1) 
             }
            </label>
          </div>
          <div className="patternSummaryStatDiv" style={divStyle}>
            <label className="patternSummaryStatLabel">Std. Dev.:</label>
           <label className="patternSummaryStatValue">{ (+this.props.data.sig).toFixed(2) }</label>            
           <label className="patternSummaryStatDiff" style={{color: color.sig}}>
             {
               diff.sig < 0
               ? diff.sig.toFixed(1) 
               : "+" + diff.sig.toFixed(1) 
             }
            </label>
          </div>
          <div className="patternSummaryStatDiv" style={divStyle}>
            <label className="patternSummaryStatLabel">Min:</label>
           <label className="patternSummaryStatValue"> { (+this.props.data.min).toFixed(2) } </label> 
           <label className="patternSummaryStatDiff" style={{color: color.min}}>
             {
               diff.min < 0
               ? diff.min.toFixed(1) 
               : "+" + diff.min.toFixed(1) 
             }
            </label>          
          </div>
          <div className="patternSummaryStatDiv" style={divStyle}>
            <label className="patternSummaryStatLabel">Median:</label>
           <label className="patternSummaryStatValue">{ (+this.props.data.med).toFixed(2) }</label> 
           <label className="patternSummaryStatDiff" style={{color: color.med}}>
             {
               diff.med < 0
               ? diff.med.toFixed(1) 
               : "+" + diff.med.toFixed(1) 
             }
            </label>           
          </div>
          <div className="patternSummaryStatDiv" style={divStyle}>
            <label className="patternSummaryStatLabel">Max:</label>
           <label className="patternSummaryStatValue">{ (+this.props.data.max).toFixed(2) }</label>        
           <label className="patternSummaryStatDiff" style={{color: color.max}}>
             {
               diff.max < 0
               ? diff.max.toFixed(1) 
               : "+" + diff.max.toFixed(1) 
             }
            </label>    
          </div>
        </div>
      );
    }
    
    
  }
}
