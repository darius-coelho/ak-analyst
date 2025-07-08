import React from 'react';
import ScatterPlotCorr from './ScatterPlotCorr'
import "../../../../../css/Core.css"
import "../css/Transformer.css"

const renderCorrelated = (selected, onSelect, deleted, onDelete) => {
  return (d, index) => {
    let color = "#e8e8e8"
    if(selected == d.name){
      color = "#86c7ff"
    }
    let opacity=1
    if(deleted.indexOf(d.name) >=0 ){
      opacity = 0.65
    }
    return(
      <div key={"corr"+index} style={{display: "inline-block", marginRight: 10, opacity: opacity}}>
        <div           
          className="attributeTypeOption" 
          style={{background: color, width:"auto", paddingRight: 8, paddingLeft:8, marginLeft:4}} 
          onClick={() => onSelect(d.name)} 
        >
          {d.name + " (" + d.val.toFixed(2) + ")"}
        </div>
        <i 
          className="material-icons-outlined hiddenIcon"  
          style={{verticalAlign: "middle", cursor: "pointer", fontSize: 16, color: "#949494"}} 
          onClick={() => onDelete([d.name])}
        >
          {opacity==1 ? "clear" : "add"}
        </i>
      </div>
    )
  };
};

export default class CorrelatedNotification extends React.Component {

  state={
    expand: false,
    selCorr: this.props.corr.length > 0 ? this.props.corr[0].name: null,  
    att: this.props.att   
  }

  static getDerivedStateFromProps(props, state) {
    if(props.attr != state.attr){
      if(props.corr.length>0){
        return({expand: false, selCorr: props.corr[0].name, attr: props.attr })
      }
      else{
        return({expand: false, selCorr: null, attr: props.attr })
      }      
    }
    return null
  }

  /**
  * Expand the warning to show the correlation plot 
  * and all correlated attributes
  */
  onExpand(){    
    let newState = {
      expand: !this.state.expand
    }
    if(this.state.selCorr == null){
      newState.selCorr = this.props.corr[0].name
    }
    this.setState(newState)
  }

  /**
  * Change the attribute on the y-axis of the
  * correlation plot
  */
  onSelectY(name) {
    this.setState({selCorr: name})
  }

  /**
  * Go to the preview of the selected attribute
  */
  goToAttr(){
    this.props.onJumpTo(this.state.selCorr)
  }
  
  /**
  * Drops all attributes in the correlated/collinear list
  * that have not been dropped  
  */
  dropAll(){    
    const deleted = this.props.deleted
    // get list of correlated/collinear attributes
    const attributes = this.props.corr.map((d) => d.name)
    // get those that have not been deleted
    const notDeleted = attributes.filter(d => !deleted.includes(d))
    this.props.onDelete(notDeleted)
  }

  render() {
    if(!this.props.hasCorr){
      return null
    }
    let warnText = this.props.type + " attributes detected"
    let icon = <div style={{ display: "inline-block", margin: 10, verticalAlign: "middle", cursor:"default"}}>
                  <i className="material-icons-round" style={{position: "absolute", color: "#000000"}}>warning_amber</i>
                  <i className="material-icons-round" style={{color: "#ebfb00"}}>warning</i>
               </div>
    if(this.props.type=="Correlated"){
        icon =  <div style={{ display: "inline-block", margin: 10, verticalAlign: "middle", cursor:"default"}}>
            <i className="material-icons" style={{color: "#7f8ae0"}}>info</i>
          </div>
    }
    
    let allDeleted = this.props.corr.every(d => this.props.deleted.includes(d.name));
    if(allDeleted){
        warnText = "All " + this.props.type + " attributes removed"
        icon =  <div style={{ display: "inline-block", margin: 10, verticalAlign: "middle", cursor:"default"}}>
                  <i className="material-icons" style={{color: "#7f8ae0"}}>info</i>
                </div>
    }      
    
    
    var buttonStyle = {position: "absolute", right: 5, margin: 10}
    const opacity = this.props.deleted.indexOf(this.state.selCorr) >=0 ? 0.5 : 1

    return (
      <div className="listInnerItem">
          {icon}
          <label className="listLabel">{warnText}</label>
          <button className="coreButton"  style={buttonStyle} onClick={this.onExpand.bind(this)} >{"Inspect"}</button>
          {
            this.state.expand
            ? <div style={{textAlign:"center"}}>
                <div  style={{display: "block", marginTop: 15}}>
                  <label style={{margin: 10, pad: 5, width: 80}}>{"Correlated: " }</label>
                  {this.props.corr.map(renderCorrelated(this.state.selCorr, this.onSelectY.bind(this), this.props.deleted, this.props.onDelete))}                      
                </div>
                <ScatterPlotCorr                        
                  data={this.props.data}
                  X={this.props.attr}
                  Y={this.state.selCorr}
                  orderings={this.props.orderings}
                  attrTypes={this.props.attrTypes}
                  width={this.props.width} 
                  height={2*this.props.width/3} 
                  padding={45} 
                  opacity={opacity}/>
                <button className="coreButton" onClick={this.goToAttr.bind(this)} >{"Go to attribute"}</button>
                <button className="coreButton" onClick={this.dropAll.bind(this)} >{"Drop All"}</button>
              </div>
            : null
          }
        </div>
      );
  }
}
