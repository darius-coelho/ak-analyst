
import React from 'react';

import { Transition } from 'react-transition-group'

import "../../../../css/Core.css"
import "./css/Transformer.css"

const duration = 300;

const defaultStyle = {
  transition: `top ${duration}ms ease-in-out`,
  display: 'inline-block',
}

const renderTransform = ( width, onHide, onDelete, showTransform) => {
  return (t, index) => {
    var opacity = 0.5
    
    var attr = ""
    if(showTransform == "All") {
      attr = t["attr"] + ": "
    }
    
    if(t.enabled) {
      opacity=1.0
    }

    var innerStyle ={
      display: "inline-block",
      width: width,
      opacity: opacity
    }
    
    if(t.tType == "Filter" || t.tType == "Clamp") {
      const attrLbl = attr + t.tType
      const lb = "LB: " + (+t.lb).toFixed(2)
      const ub = "UB: " + (+t.ub).toFixed(2)
      return <div key={"transform"+index} className="listItem">
              <div className="listInnerItem" style={innerStyle}>            
                <label className="listLabel" title={attrLbl}>{attrLbl}</label>
                <label className="listContentRight" title={ub}>{ub}</label>
                <label className="listContentRight" title={lb}>{lb}</label>
              </div>              
              <i className="material-icons-outlined hiddenIcon"  onClick={() => onDelete(t.uid)}>clear</i>
              <i className="material-icons-outlined hiddenIcon"  onClick={() => onHide(t.uid)}>visibility_off</i>
            </div>
    }

    if(t.tType == "FilterDate") {
      const attrLbl = attr + "Filter"
      const lb = "LB: " + (t.lb);
      const ub = "UB: " + (t.ub);
      
      return <div key={"transform"+index} className="listItem">
              <div className="listInnerItem" style={innerStyle}>            
                <label className="listLabel" title={attrLbl}>{attrLbl}</label>
                <label className="listContentRight" title={ub}>{ub}</label>
                <label className="listContentRight" title={lb}>{lb}</label>
              </div>              
              <i className="material-icons-outlined hiddenIcon"  onClick={() => onDelete(t.uid)}>clear</i>
              <i className="material-icons-outlined hiddenIcon"  onClick={() => onHide(t.uid)}>visibility_off</i>
            </div>
    }
    
    if(t.tType == "FilterNom") {
      const attrLbl = attr + "Filter"
      // convert the list to string
      let filtLbl = `${t.filter_type} (${t.filter_cats.length}): `  + t.filter_cats
      return <div key={"transform"+index} className="listItem">
              <div className="listInnerItem" style={innerStyle}>            
                <label className="listLabel" title={attrLbl}>{attrLbl}</label>            
                <label className="listContentRight" title={filtLbl}>{filtLbl}</label>      
              </div>              
              <i className="material-icons-outlined hiddenIcon"  onClick={() => onDelete(t.uid)}>clear</i>
              <i className="material-icons-outlined hiddenIcon"  onClick={() => onHide(t.uid)}>visibility_off</i>
            </div>
    }
    
    if(t.tType == "Norm") {
      const attrLbl = attr + "Normalize"
      const lb = "LB: " + (+t.newmin).toFixed(2)
      const ub = "UB: " + (+t.newmax).toFixed(2)
      return <div key={"transform"+index} className="listItem">
              <div className="listInnerItem" style={innerStyle}>            
                <label className="listLabel" title={attrLbl}>{attrLbl}</label>
                <label className="listContentRight" title={ub}>{ub}</label>
                <label className="listContentRight" title={lb}>{lb}</label>
              </div>              
              <i className="material-icons-outlined hiddenIcon"  onClick={() => onDelete(t.uid)}>clear</i>
              <i className="material-icons-outlined hiddenIcon"  onClick={() => onHide(t.uid)}>visibility_off</i>
            </div>
    }
    
    if(t.tType == "Log") {
      const attrLbl = attr + "Log"
      const base = "Base: " + (+t.base).toFixed(2)
      return <div key={"transform"+index} className="listItem">
              <div className="listInnerItem" style={innerStyle}>            
                <label className="listLabel" title={attrLbl}>{attrLbl}</label>
                <label className="listContentRight" title={base}>{base}</label>
              </div>              
              <i className="material-icons-outlined hiddenIcon"  onClick={() => onDelete(t.uid)}>clear</i>
              <i className="material-icons-outlined hiddenIcon"  onClick={() => onHide(t.uid)}>visibility_off</i>
            </div>
    }

    if(t.tType == "Repl") {
      const attrLbl = attr + "Replace"      
      let replaceLbl = "New Category: " + t.new_val
      return <div key={"transform"+index} className="listItem">
              <div className="listInnerItem" style={innerStyle}>            
                <label className="listLabel" title={attrLbl}>{attrLbl}</label>
                <label className="listContentRight" title={replaceLbl}>{replaceLbl}</label>
              </div>              
              <i className="material-icons-outlined hiddenIcon"  onClick={() => onDelete(t.uid)}>clear</i>
              <i className="material-icons-outlined hiddenIcon"  onClick={() => onHide(t.uid)}>visibility_off</i>
            </div>
    }

    if(t.tType == "Missing") {
      const attrLbl = attr + "Missing value replacement"
      return <div key={"transform"+index} className="listItem">
              <div className="listInnerItem" style={innerStyle}>            
                <label className="listLabel" title={attrLbl}>{attrLbl}</label>
                <label className="listContentRight" title={t.method}>{t.method}</label>
              </div>              
              <i className="material-icons-outlined hiddenIcon"  onClick={() => onDelete(t.uid)}>clear</i>
              <i className="material-icons-outlined hiddenIcon"  onClick={() => onHide(t.uid)}>visibility_off</i>
            </div>
    }

    if(t.tType == "Missing-Drop") {
      const attrLbl = attr + "Missing value replacement"
      return <div key={"transform"+index} className="listItem">
              <div className="listInnerItem" style={innerStyle}>            
                <label className="listLabel" title={attrLbl}>{attrLbl}</label>
                <label className="listContentRight" title={"Drop"}>{"Drop"}</label>                
              </div>              
              <i className="material-icons-outlined hiddenIcon"  onClick={() => onDelete(t.uid)}>clear</i>
              <i className="material-icons-outlined hiddenIcon"  onClick={() => onHide(t.uid)}>visibility_off</i>
            </div>
    }

    if(t.tType == "Custom") {
      const attrLbl = attr + "Custom"
      return <div key={"transform"+index} className="listItem">
              <div className="listInnerItem" style={innerStyle}>            
                <label className="listLabel" title={attrLbl}>{attrLbl}</label>           
                <label className="listContentRight">{t.expr}</label>                
              </div>              
              <i className="material-icons-outlined hiddenIcon"  onClick={() => onDelete(t.uid)}>clear</i>
              <i className="material-icons-outlined hiddenIcon"  onClick={() => onHide(t.uid)}>visibility_off</i>
            </div>
    }

    if(t.tType == "Derived") {
      const attrLbl = attr + "Derived"
      return <div key={"transform"+index} className="listItem">
              <div className="listInnerItem" style={innerStyle}>            
                <label className="listLabel" title={attrLbl}>{attrLbl}</label>           
                <label className="listContentRight">{t.expr}</label>                
              </div>              
              <i className="material-icons-outlined hiddenIcon"  onClick={() => onDelete(t.uid)}>clear</i>
              <i className="material-icons-outlined hiddenIcon"  onClick={() => onHide(t.uid)}>visibility_off</i>
            </div>
    }

    if (t.tType === "CellSplit") {
      const attrLbl = attr + "Cell Split"
      const orderStatus = (t.ordered ? "Ordered" : "Unordered");
      const title = `type=${orderStatus}, delimiter='${t.delimiter}', `+
	    `strip='${t.strip}', quote='${t.quote}'`
      return (
	  <div key={"transform"+index} className="listItem">
          <div className="listInnerItem" style={innerStyle}>            
          <label className="listLabel" title={attrLbl}>{attrLbl}</label>
	  <label className="listContentRight" title={title}>{orderStatus}</label> 
          </div>
          <i className="material-icons-outlined hiddenIcon"  onClick={() => onDelete(t.uid)}>clear</i>
          <i className="material-icons-outlined hiddenIcon"  onClick={() => onHide(t.uid)}>visibility_off</i>
          </div>
      );
    }
    
    if(t.tType == "OHE") {
      const attrLbl = attr + "One Hot Encode"
      return (
	        <div key={"transform"+index} className="listItem">
            <div className="listInnerItem" style={innerStyle}>            
              <label className="listLabel" title={attrLbl}>{attrLbl}</label>                             
            </div>
            <i className="material-icons-outlined hiddenIcon"  onClick={() => onDelete(t.uid)}>clear</i>
          <i className="material-icons-outlined hiddenIcon"  onClick={() => onHide(t.uid)}>visibility_off</i>
          </div>
      );
    }

    if(t.tType == "Rank") {
      const attrLbl = attr + "Rank"
      return (
	        <div key={"transform"+index} className="listItem">
            <div className="listInnerItem" style={innerStyle}>            
              <label className="listLabel" title={attrLbl}>{attrLbl}</label>                            
            </div>
            <i className="material-icons-outlined hiddenIcon"  onClick={() => onDelete(t.uid)}>clear</i>
            <i className="material-icons-outlined hiddenIcon"  onClick={() => onHide(t.uid)}>visibility_off</i>
          </div>
      );
    }

    if(t.tType == "Dtype") {
      const attrLbl = attr + "Set Type"
      return (
	        <div key={"transform"+index} className="listItem">
            <div className="listInnerItem" style={innerStyle}>            
             <label className="listLabel" title={attrLbl}>{attrLbl}</label>
             <label className="listContentRight">{"Type: " + t.new_type}</label>
            </div>              
            <i className="material-icons-outlined hiddenIcon"  onClick={() => onDelete(t.uid)}>clear</i>
            <i className="material-icons-outlined hiddenIcon"  onClick={() => onHide(t.uid)}>visibility_off</i>
          </div>
      );
     }

    if(t.tType == "OrdinalOrder") {
      const attrLbl = attr + "Set Order"
      return (
        <div key={"transform"+index} className="listItem">
          <div className="listInnerItem" style={innerStyle}>
            <label className="listLabel" title={attrLbl}>{attrLbl}</label>
          </div>
          <i className="material-icons-outlined hiddenIcon"  onClick={() => onDelete(t.uid)}>clear</i>
          <i className="material-icons-outlined hiddenIcon"  onClick={() => onHide(t.uid)}>visibility_off</i>
        </div>
      );
    }
    
    return null
  };
};

export default class TransformList extends React.Component {
  state={
    showTransforms: 'All'
  }

  onToggleShow(){
    if(this.state.showTransforms == "Current"){
      this.setState({showTransforms:"All"})
    }
    else{
      this.setState({showTransforms:"Current"})
    }
  }

  render() {
    var transformations = []
    
    for(var i=0; i < this.props.transformations.length; i++){
      if(this.state.showTransforms == "Current" && this.props.transformations[i]["attr"] != this.props.attr){
        continue
      }      
      transformations.push(this.props.transformations[i])
      transformations[transformations.length-1].idx = i
    }

    return (
      <Transition in={true} timeout={duration} appear={true}>
        {(state) => (
          <div 
            className="contentInnerdiv" 
            style={{
              ...defaultStyle,
              top: this.props.top, 
              left: this.props.left, 
              width: this.props.width, 
              height: this.props.height,
              borderLeft: "1px solid #a1a1a1",
              borderTop: "1px solid #a1a1a1"
            }}>
            <div style={{position: "absolute", right: 0, margin: 5}}>
              <button className="coreButtonSmall" onClick={this.onToggleShow.bind(this)}>
                {"Show: " + this.state.showTransforms}
              </button>
              <button className="coreButtonSmall" onClick={this.props.onShow}>
                {this.props.show ? "Hide" : "Show"}
              </button>
            </div>
            <label className="contentDivSubHead">{"Transforms:"}</label>
            <div style={{marginTop: 10}}>
              {transformations.map(renderTransform(
                this.props.width-105, 
                this.props.onHideTransform, 
                this.props.onDeleteTransform, 
                this.state.showTransforms
              ))}
            </div>
          </div>
        )}
      </Transition>
    );
  }
}
